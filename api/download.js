import { load } from "cheerio";
import JSZip from "jszip";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";

const MAX_FILES = 80;
const MAX_FILE_BYTES = 2_500_000;
const MAX_TOTAL_BYTES = 12_000_000;
const TIMEOUT_MS = 9000;

function privateAddress(address) {
  if (net.isIPv4(address)) {
    const p = address.split(".").map(Number);
    return p[0] === 0 || p[0] === 10 || p[0] === 127 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || p[0] >= 224;
  }
  if (net.isIPv6(address)) {
    const a = address.toLowerCase();
    return a === "::" || a === "::1" || a.startsWith("fc") ||
      a.startsWith("fd") || a.startsWith("fe80:") || a.startsWith("::ffff:127.");
  }
  return true;
}

async function publicUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Enter a valid public website URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only public HTTP and HTTPS URLs are supported.");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private and local addresses cannot be downloaded.");
  }
  if (net.isIP(host)) {
    if (privateAddress(host)) throw new Error("Private and local addresses cannot be downloaded.");
  } else {
    let records;
    try { records = await dns.lookup(host, { all: true, verbatim: true }); }
    catch { throw new Error("A website host could not be resolved."); }
    if (!records.length || records.some((record) => privateAddress(record.address))) {
      throw new Error("The host does not resolve exclusively to public addresses.");
    }
  }
  url.hash = "";
  return url;
}

function zipPath(url, rootHost) {
  let pathname = decodeURIComponent(url.pathname || "/");
  if (pathname.endsWith("/")) pathname += "index.html";
  if (!path.posix.extname(pathname)) pathname += ".html";
  pathname = pathname.replace(/^\/+/, "").split("/").filter((part) => part && part !== "." && part !== "..").join("/");
  if (!pathname) pathname = "index.html";
  if (url.hostname.toLowerCase() !== rootHost.toLowerCase()) {
    pathname = "_external/" + url.hostname.replace(/[^a-z0-9.-]/gi, "_") + "/" + pathname;
  }
  return pathname.slice(0, 240);
}

function relativeZipPath(fromFile, targetFile) {
  let rel = path.posix.relative(path.posix.dirname(fromFile), targetFile);
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

function isPage(url) {
  return !/\.(?:css|js|mjs|cjs|json|xml|txt|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|pdf|zip|mp4|webm|mp3|wav|map)(?:$|\?)/i.test(url.pathname);
}

function addUrl(queue, value, base, type, rootHost) {
  try {
    const next = new URL(value, base);
    if (!["http:", "https:"].includes(next.protocol)) return;
    next.hash = "";
    const page = type === "page";
    if (page && next.hostname.toLowerCase() !== rootHost.toLowerCase()) return;
    if (page && !isPage(next)) return;
    queue.push({ url: next.href, type });
  } catch {}
}

function resourceUrls($, pageUrl, rootHost) {
  const found = [];
  const add = (value, type = "asset") => {
    if (value) addUrl(found, value, pageUrl, type, rootHost);
  };

  // Always prioritize application source and styles before image-heavy content.
  $("script[src]").each((_, el) => add($(el).attr("src")));
  $("link[href]").each((_, el) => {
    const $el = $(el);
    const rel = (($el.attr("rel") || "").toLowerCase());
    const as = (($el.attr("as") || "").toLowerCase());
    const href = $el.attr("href");
    if (/stylesheet|icon|preload|manifest|apple-touch-icon|modulepreload|font|import/.test(rel) ||
        ["style", "script", "font"].includes(as) ||
        /\.(?:css|js|mjs|cjs)(?:[?#]|$)/i.test(href || "")) add(href);
  });

  // Common lazy-loading attributes are often the only source of image URLs.
  $("img[src], source[src], video[src], video[poster], audio[src], iframe[src], input[type=image][src], img[data-src], img[data-lazy-src]").each((_, el) => {
    const $el = $(el);
    for (const attr of ["src", "poster", "data-src", "data-lazy-src"]) add($el.attr(attr));
  });
  $("img[srcset], source[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset") || "";
    for (const part of srcset.split(",")) {
      const candidate = part.trim().split(/\s+/)[0];
      if (candidate) add(candidate);
    }
  });

  // HTML pages come after core assets, so they cannot crowd out CSS or JS.
  $("a[href]").each((_, el) => add($(el).attr("href"), "page"));
  return found;
}

async function fetchRemote(start, signal) {
  let url = await publicUrl(start);
  for (let redirects = 0; redirects <= 4; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal,
      headers: { "user-agent": "FreeCode Site Exporter/1.0", "accept": "*/*" }
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("A website redirect was incomplete.");
      url = await publicUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) throw new Error("HTTP " + response.status);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_FILE_BYTES) throw new Error("File exceeds the per-file size limit");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_FILE_BYTES) throw new Error("File exceeds the per-file size limit");
    return { url, buffer, contentType: (response.headers.get("content-type") || "").toLowerCase() };
  }
  throw new Error("Too many redirects");
}

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
