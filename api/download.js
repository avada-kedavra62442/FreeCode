import { load } from "cheerio";
import JSZip from "jszip";
import { publicUrl } from "./_lib/urlSafety.js";
import { zipPath, relativeZipPath } from "./_lib/zipPaths.js";
import { resourceUrls } from "./_lib/resourceDiscovery.js";
import { fetchRemote } from "./_lib/fetchRemote.js";

const MAX_FILES = 80;
const MAX_FILE_BYTES = 2_500_000;
const MAX_TOTAL_BYTES = 12_000_000;
const TIMEOUT_MS = 9000;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to download a website." });
  }

  const raw = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!raw || raw.length > 2048) return res.status(400).json({ error: "Enter a website URL under 2,048 characters." });
  const normalized = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : "https://" + raw;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const start = await publicUrl(normalized);
    const rootHost = start.hostname;
    const queue = [{ url: start.href, type: "page" }];
    const queued = new Set();
    const downloaded = new Map();
    const failures = [];
    let totalBytes = 0;

    while (queue.length && downloaded.size < MAX_FILES && totalBytes < MAX_TOTAL_BYTES) {
      queue.sort((a, b) => {
        const priority = (item) => {
          if (item.type === "page") return 1;
          const path = new URL(item.url).pathname;
          if (/\\.(?:css|js|mjs|cjs)(?:$)/i.test(path)) return 0;
          if (/\\.(?:woff2?|ttf|otf|eot)(?:$)/i.test(path)) return 2;
          if (/\\.(?:png|jpe?g|gif|webp|avif|svg|ico)(?:$)/i.test(path)) return 3;
          return 2;
        };
        return priority(a) - priority(b);
      });
      if (controller.signal.aborted) throw new Error("The site took too long to package. Try a smaller website.");
      const batch = [];
      while (queue.length && batch.length < 6 && downloaded.size + batch.length < MAX_FILES) {
        const item = queue.shift();
        if (!queued.has(item.url)) {
          queued.add(item.url);
          batch.push(item);
        }
      }
      if (!batch.length) continue;

      const results = await Promise.all(batch.map(async (item) => {
        try {
          const fetched = await fetchRemote(item.url, controller.signal);
          return { item, fetched };
        } catch (error) {
          return { item, error: error?.message || "Fetch failed" };
        }
      }));

      for (const result of results) {
        if (result.error) {
          failures.push(result.item.url);
          continue;
        }
        const { item, fetched } = result;
        if (totalBytes + fetched.buffer.byteLength > MAX_TOTAL_BYTES) {
          failures.push(item.url);
          continue;
        }
        totalBytes += fetched.buffer.byteLength;
        const finalUrl = fetched.url;
        const key = finalUrl.href;
        if (downloaded.has(key)) continue;
        let filePath = zipPath(finalUrl, rootHost);
        // Keep the main document and source files recognizable in the archive.
        if (item.type === "page" && (finalUrl.pathname === "/" || finalUrl.pathname === "")) {
          filePath = finalUrl.hostname.toLowerCase() === rootHost.toLowerCase()
            ? "index.html"
            : "_external/" + finalUrl.hostname.replace(/[^a-z0-9.-]/gi, "_") + "/index.html";
        } else if (/javascript|ecmascript/.test(fetched.contentType) && /\.html?$/i.test(filePath)) {
          filePath = filePath.replace(/\.html?$/i, ".js");
        } else if (fetched.contentType.includes("text/css") && /\.html?$/i.test(filePath)) {
          filePath = filePath.replace(/\.html?$/i, ".css");
        } else if (fetched.contentType.includes("text/html") && !/\.html?$/i.test(filePath)) {
          filePath += ".html";
        }
        downloaded.set(key, { url: finalUrl.href, path: filePath, buffer: fetched.buffer, contentType: fetched.contentType, type: item.type });

        const contentType = fetched.contentType;
        if (contentType.includes("text/html") || item.type === "page") {
          const html = fetched.buffer.toString("utf8");
          const $ = load(html);
          for (const discovered of resourceUrls($, finalUrl, rootHost)) {
            if (!queued.has(discovered.url) && downloaded.size + queue.length < MAX_FILES) queue.push(discovered);
          }
          const inlineStyles = $("style").map((_, el) => $(el).html() || "").get().join("\n");
          const cssRefs = [...html.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)].map((m) => m[2]).filter((s) => s && !s.startsWith("data:"));
          for (const ref of cssRefs) addUrl(queue, ref, finalUrl, "asset", rootHost);
          for (const match of html.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/gi)) addUrl(queue, match[1], finalUrl, "asset", rootHost);
          void inlineStyles;
        } else if (contentType.includes("text/css") || /\.css(?:$|\?)/i.test(finalUrl.pathname)) {
          const cssText = fetched.buffer.toString("utf8");
          for (const match of cssText.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
            if (match[2] && !match[2].startsWith("data:")) addUrl(queue, match[2], finalUrl, "asset", rootHost);
          }
          for (const match of cssText.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/gi)) addUrl(queue, match[1], finalUrl, "asset", rootHost);
        } else if (/javascript|ecmascript/.test(contentType) || /\.(?:m?js|cjs)(?:$|\?)/i.test(finalUrl.pathname)) {
          const jsText = fetched.buffer.toString("utf8");
          const patterns = [
            /\bimport\s*(?:\([^)]*?\)|[^;]*?from\s*)?["']([^"']+)["']/g,
            /\bexport\s+[^;]*?from\s*["']([^"']+)["']/g
          ];
          for (const importPattern of patterns) {
            for (const match of jsText.matchAll(importPattern)) {
              const ref = match[1];
              if (ref && (ref.startsWith(".") || ref.startsWith("/") || /^https?:\/\//i.test(ref))) {
                addUrl(queue, ref, finalUrl, "asset", rootHost);
              }
            }
          }
        }
      }
    }

    if (!downloaded.size) throw new Error("No downloadable public files were found.");
    const files = [...downloaded.values()];
    const urlToPath = new Map(files.map((file) => [file.url, file.path]));
    const zip = new JSZip();
    const counts = { html: 0, css: 0, javascript: 0, images: 0, fonts: 0, other: 0 };
    const categoryOf = (file) => {
      const type = file.contentType || "";
      const pathName = new URL(file.url).pathname;
      if (type.includes("text/html") || file.type === "page" || /\\.html?$/i.test(file.path)) return "html";
      if (type.includes("text/css") || /\\.css(?:$|\\?)/i.test(pathName) || /\\.css$/i.test(file.path)) return "css";
      if (/javascript|ecmascript/.test(type) || /\\.(?:m?js|cjs)(?:$|\\?)/i.test(pathName) || /\\.(?:m?js|cjs)$/i.test(file.path)) return "javascript";
      if (type.includes("image/") || /\\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/i.test(pathName)) return "images";
      if (/font|woff|ttf|otf/.test(type) || /\\.(?:woff2?|ttf|otf|eot)$/i.test(pathName)) return "fonts";
      return "other";
    };

    for (const file of files) {
      let content = file.buffer;
      if (file.contentType.includes("text/html") || /\.html?$/i.test(file.path)) {
        let html = content.toString("utf8");
        const $ = load(html, { decodeEntities: false });
        $("script[src], img[src], source[src], video[poster], audio[src], iframe[src], link[href], a[href]").each((_, el) => {
          const $el = $(el);
          for (const attr of ["src", "href", "poster"]) {
            const original = $el.attr(attr);
            if (!original) continue;
            try {
              const absolute = new URL(original, file.url).href;
              const target = urlToPath.get(absolute);
              if (target && (attr !== "href" || $el.is("link") || $el.is("a"))) {
                $el.attr(attr, relativeZipPath(file.path, target));
              }
            } catch {}
          }
        });
        html = $.html();
        content = Buffer.from(html, "utf8");
      } else if (file.contentType.includes("text/css") || /\.css$/i.test(file.path)) {
        let css = content.toString("utf8");
        css = css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (whole, quote, value) => {
          try {
            const target = urlToPath.get(new URL(value, file.url).href);
            return target ? "url(" + quote + relativeZipPath(file.path, target) + quote + ")" : whole;
          } catch { return whole; }
        });
        content = Buffer.from(css, "utf8");
      }
      counts[categoryOf(file)] += 1;
      zip.file(file.path, content);
    }

    zip.file("FREECODE-MANIFEST.json", JSON.stringify({
      generator: "FreeCode Website Exporter",
      requestedUrl: start.href,
      generatedAt: new Date().toISOString(),
      counts,
      sourceBytes: totalBytes,
      files: files.map((file) => ({ path: file.path, category: categoryOf(file), bytes: file.buffer.byteLength })),
      failedRequests: failures.slice(0, 100)
    }, null, 2));

    zip.file("FREECODE-README.txt",
      "FreeCode website export\n\n" +
      "Files included: " + files.length + "\n" +
      "HTML: " + counts.html + "\nCSS: " + counts.css + "\nJavaScript: " + counts.javascript + "\nImages: " + counts.images + "\nFonts: " + counts.fonts + "\n" +
      "Downloaded bytes before ZIP compression: " + totalBytes + "\n" +
      "Some links, dynamic resources, login-protected files, server-side code, and JavaScript-generated content may not be available. This export is best-effort.\n" +
      (failures.length ? "\nFiles that could not be fetched: " + failures.length + "\n" + failures.slice(0, 100).join("\n") + "\n" : "")
    );

    const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 5 } });
    const filename = rootHost.replace(/[^a-z0-9.-]/gi, "-") + "-website.zip";
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
    res.setHeader("Content-Length", String(archive.length));
    res.setHeader("X-FreeCode-Files", String(files.length));
    res.setHeader("X-FreeCode-HTML", String(counts.html));
    res.setHeader("X-FreeCode-CSS", String(counts.css));
    res.setHeader("X-FreeCode-JS", String(counts.javascript));
    res.setHeader("X-FreeCode-Images", String(counts.images));
    return res.status(200).send(archive);
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "The website took too long to package. Try a smaller public page."
      : (error?.message || "The website files could not be packaged.");
    return res.status(400).json({ error: message });
  } finally {
    clearTimeout(timer);
  }
}
