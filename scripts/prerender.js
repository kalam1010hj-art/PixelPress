import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";
import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { createServer, loadEnv } from "vite";
import { tools, pages } from "../src/catalog.js";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const origin = new URL(
  env.SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL
      ? "https://" + env.VERCEL_PROJECT_PRODUCTION_URL
      : "http://localhost:4173"),
).origin;
const template = await readFile("dist/index.html", "utf8");
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const routes = [
  [
    "/",
    "Free Online Image Tools",
    "Convert, edit and optimize images locally with ten free browser tools.",
  ],
  ...tools.map((t) => [t.path, t.name, t.description]),
  ...Object.entries(pages).map(([key, [name, desc]]) => [
    "/" + key,
    name,
    desc,
  ]),
];
try {
  const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
  for (const [path, name, desc] of routes) {
    const title = escape(name + " | PixelPress"),
      url = escape(origin + path),
      description = escape(desc);
    const meta =
      '<meta name="description" content="' +
      description +
      '"><link rel="canonical" href="' +
      url +
      '"><meta property="og:type" content="website"><meta property="og:title" content="' +
      title +
      '"><meta property="og:description" content="' +
      description +
      '"><meta property="og:url" content="' +
      url +
      '"><script type="application/ld+json">' +
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": path.startsWith("/tools/") ? "WebApplication" : "WebPage",
        name,
        url: origin + path,
        description: desc,
        ...(path.startsWith("/tools/")
          ? {
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Web",
            }
          : {}),
      }).replace(/</g, "\\u003c") +
      "</script>";
    const content = renderToString(
      React.createElement(
        StaticRouter,
        { location: path },
        React.createElement(App),
      ),
    );
    const dir = "dist" + path;
    await mkdir(dir, { recursive: true });
    await writeFile(
      dir + "/index.html",
      template
        .replace("<title>PixelPress</title>", "<title>" + title + "</title>")
        .replace("<!--meta-->", () => meta)
        .replace("<!--content-->", () => content),
    );
  }
  await writeFile(
    "dist/sitemap.xml",
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      routes
        .map(([path]) => "<url><loc>" + escape(origin + path) + "</loc></url>")
        .join("") +
      "</urlset>",
  );
  await writeFile(
    "dist/robots.txt",
    "User-agent: *\nAllow: /\nSitemap: " + origin + "/sitemap.xml\n",
  );
} finally {
  await vite.close();
}

for (const size of [192, 512]) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.scale(size / 100, size / 100);
  ctx.fillStyle = "#244c42";
  ctx.fillRect(0, 0, 100, 100);
  // A pixel-shaped P centered in the maskable icon safe zone.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(32, 26, 10, 48);
  ctx.fillRect(42, 26, 18, 9);
  ctx.fillRect(60, 32, 9, 16);
  ctx.fillRect(42, 46, 18, 9);
  await writeFile(`dist/pixelpress-${size}.png`, canvas.toBuffer("image/png"));
}
