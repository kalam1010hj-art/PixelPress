import React, { useState, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import { UploadCloud, Download } from "lucide-react";
import { inspect, bytes, processFiles, types } from "./process.js";
import css from "./style.module.css";
const defaults = {
  quality: 82,
  background: "#ffffff",
  angle: 0,
  flipX: false,
  flipY: false,
  text: "PixelPress",
  font: 36,
  color: "#ffffff",
  opacity: 75,
  position: "bottom-right",
  page: "A4",
  pageW: 210,
  pageH: 297,
  orientation: "portrait",
  raw: false,
  locked: true,
};
function Field({ label, children }) {
  return (
    <label className={css.field}>
      {label}
      {children}
    </label>
  );
}
export default function Workspace({ id }) {
  const [items, setItems] = useState([]),
    [s, settings] = useState(defaults),
    [result, setResult] = useState(null),
    [msg, message] = useState(""),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 }),
    [zoom, setZoom] = useState(1),
    [ratio, setRatio] = useState("Free"),
    [free, setFree] = useState(1);
  const bag = useRef(new Set()),
    alive = useRef(true),
    lock = useRef(false),
    input = useRef();
  useEffect(() => {
    alive.current = true;
    const urls = bag.current;
    return () => {
      alive.current = false;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);
  function track(url) {
    bag.current.add(url);
    return url;
  }
  function release(url) {
    if (url) {
      URL.revokeObjectURL(url);
      bag.current.delete(url);
    }
  }
  function clearResult() {
    release(result?.url);
    setResult(null);
    message("");
  }
  function change(values) {
    clearResult();
    settings((old) => ({ ...old, ...values }));
  }
  function reset() {
    for (const item of items) release(item.url);
    clearResult();
    setItems([]);
    settings(defaults);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setRatio("Free");
    setFree(1);
  }
  async function add(files) {
    if (!files.length || lock.current) return;
    lock.current = true;
    setBusy(true);
    message("Reading images…");
    const added = [];
    try {
      if (
        (id !== "pdf" && files.length !== 1) ||
        (id === "pdf" && items.length + files.length > 12)
      )
        throw Error(
          id === "pdf"
            ? "Choose up to 12 pages."
            : "Choose one image at a time.",
        );
      let pixels =
        id === "pdf" ? items.reduce((n, i) => n + i.width * i.height, 0) : 0;
      for (const file of files) {
        const item = await inspect(file, id);
        added.push(item);
        pixels += item.width * item.height;
        if (pixels > 32000000)
          throw Error("Choose a batch below 32 megapixels in total.");
      }
      if (!alive.current) return;
      if (id !== "pdf") reset();
      else clearResult();
      added.forEach((i) => track(i.url));
      setItems(id === "pdf" ? [...items, ...added] : added);
      settings((old) => ({
        ...old,
        width: added[0].width,
        height: added[0].height,
        font: Math.max(1, Math.round(added[0].width / 16)),
      }));
      message("Image ready.");
    } catch (e) {
      added.forEach((i) => release(i.url));
      if (alive.current) message(e.message);
    } finally {
      if (!alive.current) added.forEach((i) => release(i.url));
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const first = items[0];
  function dimension(key, value) {
    const other = key === "width" ? "height" : "width";
    change({
      [key]: value,
      ...(s.locked && value
        ? {
            [other]: Math.max(
              1,
              Math.round((value * first[other]) / first[key]),
            ),
          }
        : {}),
    });
  }
  async function run(e) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    clearResult();
    message("Processing…");
    try {
      const out = await processFiles(items, id, s);
      if (!alive.current) return;
      const ext = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
        "text/plain": "txt",
      }[out.blob.type];
      setResult({
        ...out,
        url: track(URL.createObjectURL(out.blob)),
        name: first.file.name.replace(/\.[^.]+$/, "") + "-" + id + "." + ext,
      });
      message("Export ready.");
    } catch (e) {
      if (alive.current) message(e.message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const field = (key, label, type = "text", props = {}) => (
    <Field label={label}>
      <input
        type={type}
        value={s[key]}
        onChange={(e) => change({ [key]: e.target.value })}
        required
        {...props}
      />
    </Field>
  );
  const select = (key, label, options) => (
    <Field label={label}>
      <select
        value={s[key]}
        onChange={(e) => change({ [key]: e.target.value })}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
  const check = (key, label) => (
    <label>
      <input
        type="checkbox"
        checked={s[key]}
        onChange={(e) => change({ [key]: e.target.checked })}
      />{" "}
      {label}
    </label>
  );
  function reorder(i, d) {
    clearResult();
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setItems(next);
  }
  return (
    <div className={css.workspace} aria-busy={busy}>
      <fieldset disabled={busy}>
        <div
          className={css.drop}
          data-active={drag}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            add([...e.dataTransfer.files]);
          }}
        >
          <UploadCloud />
          <strong>
            {first && id === "pdf"
              ? "Add more pages"
              : "Drop your image" + (id === "pdf" ? "s" : "") + " here"}
          </strong>
          <span>
            {id === "compress"
              ? "JPG or WebP"
              : "JPG, PNG, WebP, GIF, BMP or AVIF"}{" "}
            · 12 MiB per file
          </span>
          <input
            ref={input}
            hidden
            type="file"
            multiple={id === "pdf"}
            accept={
              id === "compress" ? "image/jpeg,image/webp" : types.join(",")
            }
            onChange={(e) => {
              add([...e.target.files]);
              e.target.value = "";
            }}
          />
          <button type="button" onClick={() => input.current.click()}>
            Choose {id === "pdf" ? "images" : "image"}
          </button>
        </div>
        {first && (
          <form onSubmit={run}>
            <div className={css.previewList}>
              {items.map((item, i) => (
                <div key={item.url}>
                  <img
                    src={item.url}
                    alt={"Input preview of " + item.file.name}
                  />
                  <div>
                    <strong>{item.file.name}</strong>
                    <p>
                      {item.width} × {item.height} px · {bytes(item.file.size)}
                    </p>
                    {id === "pdf" && (
                      <>
                        <button
                          type="button"
                          disabled={!i}
                          onClick={() => reorder(i, -1)}
                        >
                          Earlier
                        </button>{" "}
                        <button
                          type="button"
                          disabled={i === items.length - 1}
                          onClick={() => reorder(i, 1)}
                        >
                          Later
                        </button>{" "}
                        <button
                          type="button"
                          onClick={() => {
                            clearResult();
                            release(item.url);
                            setItems(items.filter((x) => x !== item));
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {id === "crop" && (
              <div className={css.crop}>
                <Cropper
                  image={first.url}
                  crop={crop}
                  zoom={zoom}
                  aspect={ratio === "Free" ? free : Number(ratio)}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, area) => {
                    settings((old) => ({ ...old, area }));
                    setResult((old) => {
                      release(old?.url);
                      return null;
                    });
                  }}
                />
              </div>
            )}
            <div className={css.controls}>
              {["jpg", "webp", "compress"].includes(id) &&
                field("quality", "Quality · " + s.quality + "%", "range", {
                  min: 1,
                  max: 100,
                })}
              {id === "jpg" && field("background", "Background color", "color")}
              {id === "resize" && (
                <>
                  {["width", "height"].map((k) => (
                    <Field
                      key={k}
                      label={k === "width" ? "Width (px)" : "Height (px)"}
                    >
                      <input
                        type="number"
                        min="1"
                        max="16384"
                        required
                        value={s[k]}
                        onChange={(e) => dimension(k, e.target.value)}
                      />
                    </Field>
                  ))}
                  {check("locked", "Lock aspect ratio")}
                  <Field label="Preset width">
                    <select
                      value=""
                      onChange={(e) => dimension("width", e.target.value)}
                    >
                      <option value="">Select width</option>
                      {[320, 640, 1080, 1920].map((n) => (
                        <option key={n} value={n}>
                          {n} px
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              {id === "crop" && (
                <>
                  <Field label="Frame ratio">
                    <select
                      value={ratio}
                      onChange={(e) => setRatio(e.target.value)}
                    >
                      {[
                        ["Free", "Free"],
                        [1, "1:1"],
                        [4 / 3, "4:3"],
                        [16 / 9, "16:9"],
                      ].map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {ratio === "Free" && (
                    <Field label="Frame proportions">
                      <input
                        type="number"
                        min=".05"
                        max="20"
                        step="any"
                        value={free}
                        onChange={(e) =>
                          setFree(
                            Math.max(
                              0.05,
                              Math.min(20, Number(e.target.value)),
                            ),
                          )
                        }
                      />
                    </Field>
                  )}
                  <Field label="Zoom">
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step=".01"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                    />
                  </Field>
                </>
              )}
              {id === "rotate" && (
                <>
                  {select("angle", "Rotation (degrees)", [0, 90, 180, 270])}
                  {check("flipX", "Flip horizontally")}
                  {check("flipY", "Flip vertically")}
                </>
              )}
              {id === "watermark" && (
                <>
                  {field("text", "Watermark text", "text", { maxLength: 180 })}
                  {field("font", "Font size (px)", "number", {
                    min: 1,
                    max: 16384,
                  })}
                  {field("opacity", "Opacity · " + s.opacity + "%", "range", {
                    min: 1,
                    max: 100,
                  })}
                  {field("color", "Text color", "color")}
                  {select("position", "Position", [
                    "bottom-right",
                    "bottom-left",
                    "center",
                    "top-right",
                    "top-left",
                  ])}
                </>
              )}
              {id === "pdf" && (
                <>
                  {select("page", "Page size", ["A4", "Custom"])}
                  {select("orientation", "Orientation", [
                    "portrait",
                    "landscape",
                  ])}
                  {s.page === "Custom" && (
                    <>
                      {field("pageW", "Page width (mm)", "number", {
                        min: 10,
                        max: 1000,
                        step: "any",
                      })}
                      {field("pageH", "Page height (mm)", "number", {
                        min: 10,
                        max: 1000,
                        step: "any",
                      })}
                    </>
                  )}
                </>
              )}
              {id === "base64" &&
                check("raw", "Raw Base64 (omit data URL prefix)")}
            </div>
            <div className={css.actions}>
              <button className={css.primary}>
                Process image{id === "pdf" ? "s" : ""}
              </button>
              <button type="button" onClick={reset}>
                Start again
              </button>
            </div>
          </form>
        )}
      </fieldset>
      <div role="status" className={css.status}>
        {msg}
      </div>
      {result && (
        <div className={css.result}>
          <h2>Your result</h2>
          {result.text ? (
            <>
              <textarea
                aria-label="Encoded text preview"
                readOnly
                value={result.text.slice(0, 4096)}
              />
              <p>
                {result.text.length.toLocaleString()} characters · preview shows
                up to 4,096
              </p>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result.text);
                    message("Copied to clipboard.");
                  } catch {
                    message(
                      "Clipboard unavailable. Download the text file instead.",
                    );
                  }
                }}
              >
                Copy full text
              </button>
            </>
          ) : result.pages ? (
            <>
              <p>{result.pages} page(s)</p>
              <object
                data={result.url}
                type="application/pdf"
                aria-label="PDF preview"
              >
                <p>Download to view this PDF on your device.</p>
              </object>
            </>
          ) : (
            <>
              <img src={result.url} alt="Processed output" />
              <p>
                {result.width} × {result.height} px
              </p>
            </>
          )}
          <p>
            Output {bytes(result.blob.size)}
            {id === "compress" &&
              " · Original " +
                bytes(first.file.size) +
                " · " +
                (result.blob.size <= first.file.size
                  ? ((1 - result.blob.size / first.file.size) * 100).toFixed(
                      1,
                    ) + "% saved"
                  : ((result.blob.size / first.file.size - 1) * 100).toFixed(
                      1,
                    ) + "% larger")}
          </p>
          <a className={css.primary} href={result.url} download={result.name}>
            <Download size={18} /> Download result
          </a>
        </div>
      )}
    </div>
  );
}
