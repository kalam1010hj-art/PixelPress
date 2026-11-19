import { renderImage } from "./render.js";
self.onmessage = async ({ data: { file, id, settings } }) => {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    self.postMessage(
      await renderImage(
        bitmap,
        id,
        settings,
        file.type,
        (w, h) => new OffscreenCanvas(w, h),
      ),
    );
  } catch (error) {
    self.postMessage({ error: error.message });
  } finally {
    bitmap?.close();
  }
};
