# PixelPress

PixelPress is a static React + Vite image workbench. It converts images to JPG, PNG, WebP, PDF and Base64, compresses JPG/WebP, resizes, crops, rotates/flips, and applies text watermarks. Files are decoded on the device. The app uses no backend, remote fonts, analytics or advertising SDK.

## Local development

Use Node 22 or newer. Run `npm ci` and `npm run dev`. To preview optimized, prerendered output, run `npm run build` followed by `npm run preview`.

## Verify

```sh
npm run lint
npm run test:processing
npm run build
npx playwright install chromium
npm test
```

The processing suite exercises real encoded image bytes, PDF pages and Base64 round trips. Playwright exercises the production output, generated input files, real downloads, keyboard focus, small and large viewports and invalid uploads. Set CHROMIUM_PATH to use an existing Chromium executable.

## Deploy to Vercel

1. Import the PixelPress GitHub repository. Choose Vite and the repository root.
2. Use npm ci for installation, npm run build for the build command, and dist for output.
3. Set SITE_URL to the final HTTPS origin in the production environment and rebuild. Vercel's VERCEL_PROJECT_PRODUCTION_URL is the fallback. Local builds default to http://localhost:4173.
4. Merge the feature branch after review, then deploy main. Check a direct tool URL, /robots.txt and /sitemap.xml on the production domain.

Prerendering emits 16 HTML documents with titles, descriptions, canonical URLs, Open Graph metadata and structured data. Each tool has a guide, two FAQs and related links. The interactive editor loads separately, and PDF generation loads pdf-lib on demand.

## Project layout

- src/catalog.js defines tool routes, editorial content, FAQs and policy pages.
- src/App.jsx and src/style.module.css implement navigation, directory, accessible controls, theme and layout.
- src/Workspace.jsx owns upload validation, tool controls, ordering, previews and object URL cleanup.
- src/process.js, src/render.js and src/worker.js implement encoding, transformations, PDF assembly and text export.
- scripts/prerender.js builds the HTML, robots and XML sitemap.

## Limits and privacy

Each input is limited to 12 MiB, 16 megapixels, and 16,384 pixels per side. A PDF can contain up to 12 images and 32 megapixels combined. The browser must support decoding the source format. Editing rasterizes one frame and can discard metadata. Base64 preserves the original bytes. Crop, resize, rotate and watermark export PNG. PDF pages embed JPEGs on white backgrounds. Recompressing can produce a larger file. Small devices can exhaust memory before the stated limits.

## Advertising and support

AdPlacement reserves a footer area away from the workspace. It renders its supplied content only when approval and consent flags are both enabled. Before enabling ads, configure the approved publisher and slot, connect the applicable consent provider, size the placement for the chosen creative, and update the privacy notice. No publisher ID or ad script is included. The contact page links to the project issue tracker.
