import { dimensions, renderImage } from "./render.js";
export const types = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
];
export const bytes = (n) =>
  n < 1024
    ? n + " B"
    : n < 1048576
      ? (n / 1024).toFixed(1) + " KiB"
      : (n / 1048576).toFixed(2) + " MiB";
export async function inspect(file, id) {
  if (
    !(id === "compress" ? ["image/jpeg", "image/webp"] : types).includes(
      file.type,
    )
  )
    throw Error(
      "Unsupported format. Choose a file type listed in the upload area.",
    );
  if (!file.size || file.size > 12 * 1048576)
    throw Error("Choose a nonempty image up to 12 MiB.");
  const url = URL.createObjectURL(file),
    img = new Image();
  try {
    img.src = url;
    await img.decode();
    dimensions(img.naturalWidth, img.naturalHeight);
    return {
      file,
      url,
      img,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch {
    URL.revokeObjectURL(url);
    throw Error(
      "Unable to decode this image within the 16 megapixel and 16,384 px limits.",
    );
  }
}
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
export async function processFiles(items, id, s) {
  const item = items[0];
  if (id === "base64") {
    const url = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(Error("File read failed."));
      r.readAsDataURL(item.file);
    });
    const text = s.raw ? url.slice(url.indexOf(",") + 1) : url;
    return { text, blob: new Blob([text], { type: "text/plain" }) };
  }
  if (id === "pdf") {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    let [w, h] =
      s.page === "A4" ? [210, 297] : [Number(s.pageW), Number(s.pageH)];
    if (![w, h].every((n) => Number.isFinite(n) && n >= 10 && n <= 1000))
      throw Error("Page sides must be between 10 and 1,000 mm.");
    if ((s.orientation === "landscape") !== w > h) [w, h] = [h, w];
    w *= 72 / 25.4;
    h *= 72 / 25.4;
    for (const item of items) {
      const { blob } = await renderImage(
        item.img,
        "jpg",
        { background: "#ffffff", quality: 90 },
        item.file.type,
        canvas,
      );
      const embedded = await doc.embedJpg(await blob.arrayBuffer()),
        page = doc.addPage([w, h]),
        scale = Math.min(w / embedded.width, h / embedded.height);
      const width = embedded.width * scale,
        height = embedded.height * scale;
      page.drawImage(embedded, {
        width,
        height,
        x: (w - width) / 2,
        y: (h - height) / 2,
      });
    }
    return {
      blob: new Blob([await doc.save()], { type: "application/pdf" }),
      pages: items.length,
    };
  }
  if (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap === "function"
  ) {
    const worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    try {
      return await new Promise((resolve, reject) => {
        worker.onmessage = ({ data }) =>
          data.error ? reject(Error(data.error)) : resolve(data);
        worker.onerror = () => reject(Error("Image worker failed."));
        worker.postMessage({ file: item.file, id, settings: s });
      });
    } catch {
      /* Some browsers support canvas encoders only on the main thread. */
    } finally {
      worker.terminate();
    }
  }
  return renderImage(item.img, id, s, item.file.type, canvas);
}
