export function dimensions(w, h) {
  if (
    ![w, h].every((n) => Number.isInteger(n) && n > 0 && n <= 16384) ||
    w * h > 16000000
  )
    throw Error(
      "Use positive whole dimensions within 16 megapixels and 16,384 pixels per side.",
    );
}
export async function renderImage(source, id, s, type, makeCanvas) {
  const origW = source.naturalWidth || source.width,
    origH = source.naturalHeight || source.height;
  const crop =
    id === "crop" ? s.area : { x: 0, y: 0, width: origW, height: origH };
  if (!crop) throw Error("Position the crop frame before exporting.");
  let w = id === "resize" ? Number(s.width) : crop.width,
    h = id === "resize" ? Number(s.height) : crop.height;
  if (id === "rotate" && s.angle % 180) [w, h] = [h, w];
  dimensions(w, h);
  const canvas = makeCanvas(w, h);
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas memory is unavailable. Try a smaller image.");
    const mime =
      { jpg: "image/jpeg", webp: "image/webp", compress: type }[id] ||
      "image/png";
    if (mime === "image/jpeg") {
      ctx.fillStyle = s.background || "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    if (id === "rotate") {
      ctx.translate(w / 2, h / 2);
      ctx.scale(s.flipX ? -1 : 1, s.flipY ? -1 : 1);
      ctx.rotate((s.angle * Math.PI) / 180);
      ctx.drawImage(source, -origW / 2, -origH / 2);
    } else {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        source,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        w,
        h,
      );
    }
    if (id === "watermark") {
      if (!s.text.trim()) throw Error("Enter watermark text.");
      ctx.font = "bold " + s.font + "px sans-serif";
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.opacity / 100;
      const center = s.position === "center",
        right = s.position.endsWith("right"),
        top = s.position.startsWith("top");
      const pad = Math.min(w, h) * 0.035;
      ctx.textAlign = center ? "center" : right ? "right" : "left";
      ctx.textBaseline = center ? "middle" : top ? "top" : "bottom";
      ctx.fillText(
        s.text,
        center ? w / 2 : right ? w - pad : pad,
        center ? h / 2 : top ? pad : h - pad,
        w - 2 * pad,
      );
    }
    const blob = canvas.convertToBlob
      ? await canvas.convertToBlob({ type: mime, quality: s.quality / 100 })
      : await new Promise((resolve) =>
          canvas.toBlob(resolve, mime, s.quality / 100),
        );
    if (blob?.type !== mime)
      throw Error(
        "This browser cannot export that format. Try another format or browser.",
      );
    return { blob, width: w, height: h };
  } finally {
    canvas.width = canvas.height = 1;
  }
}
