# FreeCode

**Turn Websites into Code at a Click.** Free, clean, and developer-friendly.

FreeCode is an independent FreeToolz project built with React and Vite, designed to inspect publicly accessible websites and turn their available HTML and CSS into editable frontend starting points.

## Stack

- React + Vite
- Vercel serverless function for same-origin website analysis
- Cheerio for HTML parsing
- HTML, CSS, React and Tailwind-oriented output modes
- Emerald-and-silver dark interface

## Local development

```bash
npm install
npm run dev
```

## Deploy

Import this repository into Vercel and use the default Vite build settings. The `api/analyze.js` function runs as a Vercel Node.js function.

## Current limitations

- Analysis is best-effort and limited to publicly accessible HTML and stylesheets.
- Websites that require login, block automated requests, or render most of their content in client-side JavaScript may not reconstruct accurately.
- External fonts, images, scripts, and complex interactions may need manual adjustments.
- This project does not use a paid AI API. Generated code is a reconstruction starting point, not a guarantee of a pixel-perfect clone.

## Principles

- No ads, paid feature walls, or mandatory accounts.
- Never run extracted website JavaScript inside the main application.
- Treat remote website content as untrusted input.
