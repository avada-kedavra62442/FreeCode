# FreeCode

**Turn Websites into Code at a Click.** Free, clean, and developer-friendly.

FreeCode is an independent FreeToolz project built with React and Vite. It extracts accessible HTML and CSS into editable frontend starting points and can package publicly reachable pages and linked assets into a ZIP archive.

## Stack

- React + Vite
- Vercel serverless functions
- Cheerio for HTML parsing
- JSZip for website archives
- HTML, CSS, React and Tailwind-oriented output modes
- Emerald-and-silver dark interface

## URL input

Enter a domain such as `example.com` or a complete `https://example.com` URL. FreeCode adds HTTPS when no protocol is supplied.

## ZIP export

After analyzing a website, choose **Download all files (.ZIP)**. The exporter follows links to pages on the same hostname and gathers reachable linked assets, including stylesheets, scripts, images, icons, and fonts where discovered. It preserves paths where possible and rewrites common HTML/CSS asset references for local use.

The public serverless export has safety and resource limits (up to 80 files, 1.2 MB per file, 12 MB total source data, and a short execution window). It is best-effort, not a guarantee that every file can be retrieved.

## Limitations

- Login-protected files, private repositories, server-side source code, blocked assets, and content generated only at runtime cannot be downloaded.
- Some websites depend on APIs, cookies, service workers, dynamic JavaScript, or complex build systems; their ZIP may need manual adjustments.
- External sites may block automated requests. Failed files are listed in `FREECODE-README.txt` inside the archive.
- This project does not use a paid AI API and does not promise a pixel-perfect clone.

## Local development

```bash
npm install
npm run dev
```

## Deploy

Import this repository into Vercel and use the default Vite build settings. Files in `api/` run as Node.js serverless functions.

## Principles

- No ads, paid feature walls, or mandatory accounts.
- Never run extracted website JavaScript inside the main application preview.
- Treat remote website content as untrusted input.
