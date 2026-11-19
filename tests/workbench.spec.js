import { test, expect } from "@playwright/test";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { tools } from "../src/catalog.js";
const app = "http://pixelpress.test";
test.beforeEach(async ({ page }) => {
  await page.route(app + "/**", async (route) => {
    let file = path.join(
      process.cwd(),
      "dist",
      new URL(route.request().url()).pathname,
    );
    try {
      if ((await stat(file)).isDirectory())
        file = path.join(file, "index.html");
      await route.fulfill({ path: file });
    } catch {
      await route.fulfill({ status: 404, body: "Missing" });
    }
  });
});
async function fixture(page, mime, w = 80, h = 12) {
  const encoded = await page.evaluate(
    ({ mime, w, h }) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#cc3300";
      ctx.fillRect(w / 2, 0, w / 2, h);
      return c.toDataURL(mime).split(",")[1];
    },
    { mime, w, h },
  );
  return {
    name: "sample." + mime.split("/")[1],
    mimeType: mime,
    buffer: Buffer.from(encoded, "base64"),
  };
}
for (const t of tools)
  test(t.name + " exports a real file", async ({ page }) => {
    await page.goto(app + t.path);
    const input = page.locator("input[type=file]"),
      mime = t.id === "compress" ? "image/jpeg" : "image/png",
      source = await fixture(page, mime);
    await input.setInputFiles(source);
    await expect(page.getByText("Image ready.", { exact: true })).toBeVisible();
    if (t.id === "resize") await page.getByLabel("Width (px)").fill("40");
    if (t.id === "rotate")
      await page.getByLabel("Rotation (degrees)").selectOption("90");
    if (t.id === "watermark") {
      await page.getByLabel("Watermark text").fill("AZ");
      await page
        .getByLabel("Position", { exact: true })
        .selectOption("top-left");
    }
    if (t.id === "pdf") {
      await input.setInputFiles(await fixture(page, "image/png", 12, 80));
      await page.getByRole("button", { name: "Earlier" }).last().click();
      await page.getByLabel("Orientation").selectOption("landscape");
    }
    if (t.id === "crop")
      await expect(page.locator(".reactEasyCrop_CropArea")).toBeVisible();
    await page.getByRole("button", { name: /^Process image/ }).click();
    const link = page.getByRole("link", { name: "Download result" });
    await expect(link).toBeVisible();
    const pending = page.waitForEvent("download");
    await link.click();
    const download = await pending;
    expect(download.suggestedFilename()).toContain("sample-" + t.id);
    const data = await readFile(await download.path());
    if (t.id === "pdf") {
      const doc = await PDFDocument.load(data);
      expect(doc.getPageCount()).toBe(2);
      expect(doc.getPage(0).getWidth()).toBeGreaterThan(
        doc.getPage(0).getHeight(),
      );
    } else if (t.id === "base64") {
      expect(Buffer.from(data.toString().split(",")[1], "base64")).toEqual(
        source.buffer,
      );
    } else {
      const output = await page
        .locator('img[alt="Processed output"]')
        .evaluate(async (img) => {
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          return {
            w: c.width,
            h: c.height,
            p: [...ctx.getImageData(0, 0, 1, 1).data],
            alpha: [
              ...ctx.getImageData(0, 0, Math.floor(c.width / 2), c.height).data,
            ]
              .filter((_, i) => i % 4 === 3)
              .some((x) => x > 0),
          };
        });
      if (t.id === "jpg") {
        expect(output.p[0]).toBeGreaterThan(240);
        expect(data[0]).toBe(255);
      }
      if (t.id === "webp") expect(data.subarray(8, 12).toString()).toBe("WEBP");
      if (t.id === "png") expect(output.p[3]).toBe(0);
      if (t.id === "rotate") expect([output.w, output.h]).toEqual([12, 80]);
      if (t.id === "resize") expect([output.w, output.h]).toEqual([40, 6]);
      if (t.id === "crop") expect(output.w).toBe(output.h);
      if (t.id === "watermark") expect(output.alpha).toBeTruthy();
      if (t.id === "compress")
        await expect(page.getByText(/% (larger|saved)/)).toBeVisible();
    }
    await page.getByRole("button", { name: "Start again" }).click();
    await expect(link).toHaveCount(0);
  });
for (const width of [360, 1280])
  test("Directory and keyboard navigation at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(app);
    await page.keyboard.press("Tab");
    await expect(page.getByText("Skip to content")).toBeFocused();
    await page.getByLabel("Search image tools").fill("watermark");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.locator("#directory h3")).toHaveCount(1);
    await page.getByRole("button", { name: "Toggle dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });
test("Invalid image is recoverable", async ({ page }) => {
  await page.goto(app + "/tools/jpg");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("broken"),
    });
  await expect(page.getByRole("status")).toContainText("Unable to decode");
  await expect(
    page.getByRole("button", { name: "Choose image" }),
  ).toBeEnabled();
});
