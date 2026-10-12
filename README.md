# FreeCode

**Turn Websites into Code at a Click.** Free, clean, and developer-friendly.

FreeCode is an independent FreeToolz project built with React, Vite, and Vercel serverless functions. It extracts accessible HTML/CSS into editable frontend starting points and can bundle public pages and linked assets into a ZIP.

## Project structure

- `src/components/` — header, URL form, workspace editor, install instructions, process section, and footer
- `src/hooks/` — workspace state and actions
- `src/lib/` — code-format and preview helpers
- `src/services/` — analysis requests and file downloads
- `src/styles/` — mobile and install UI styles
- `api/` — serverless analysis and website-export endpoints

## ZIP export

The exporter prioritizes linked CSS and JavaScript, follows JavaScript module imports and CSS asset references where accessible, and then collects pages and images within free serverless limits. Every ZIP includes `FREECODE-MANIFEST.json` and `FREECODE-README.txt` listing included files and failed requests. The workspace reports file counts for HTML, CSS, JavaScript, and images.

The exporter is best-effort. It cannot recover private server-side source code, login-protected files, or content that only appears after client-side JavaScript executes. Some sites block automated downloads, and large sites may exceed the free execution or archive limits.

## Install FreeCode on Android and iPhone/iPad

FreeCode is configured as a Progressive Web App (PWA) and is served over HTTPS by Vercel.

- **Android:** open FreeCode in Chrome or a supported browser and choose **Install app** or **Add to Home screen**. The in-app Install button uses the browser prompt when available.
- **iPhone/iPad:** open FreeCode in Safari, tap **Share**, choose **Add to Home Screen**, then tap **Add**.

The app shell can be cached for launch, but analysis and ZIP export require an internet connection. PWA installation is not the same as publishing a separate listing in Google Play or Apple's App Store; those would require a separate packaging and submission workflow.

## Local development

```bash
npm install
npm run dev
npm run build
```

## Deploy

Import this repository into Vercel and use the default Vite build settings. Files in `api/` run as Node.js serverless functions.

## Principles

- No ads, paid feature walls, or mandatory accounts.
- Never run extracted website JavaScript inside the main application preview.
- Treat remote website content as untrusted input.
