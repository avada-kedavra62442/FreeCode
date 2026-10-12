import { load } from "cheerio";
import dns from "node:dns/promises";
import net from "node:net";

const MAX_HTML_BYTES = 1_500_000;
const MAX_CSS_BYTES = 500_000;
const TIMEOUT_MS = 12000;

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const p = address.split(".").map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || p[0] >= 224;
  }
  if (net.isIPv6(address)) {
    const value = address.toLowerCase();
    return value === "::1" || value === "::" || value.startsWith("fc") ||
      value.startsWith("fd") || value.startsWith("fe80:") || value.startsWith("::ffff:127.");
  }
  return true;
}

async function validatePublicUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("Enter a valid website URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS websites are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("For safety, private and local addresses cannot be analyzed.");
  }
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("For safety, private and local addresses cannot be analyzed.");
  } else {
    let records;
    try { records = await dns.lookup(hostname, { all: true, verbatim: true }); }
    catch { throw new Error("We could not resolve that website. Check the URL and try again."); }
    if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
      throw new Error("That hostname does not resolve exclusively to public addresses.");
    }
  }
  return url;
}

async function readLimited(response, maxBytes) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("The website response is too large to analyze.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("The website response is too large to analyze.");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(all);
}

async function fetchText(url, maxBytes, signal) {
  const response = await fetch(url, {
    redirect: "manual",
    signal,
    headers: {
      "user-agent": "FreeCode Website Analyzer/1.0 (+https://github.com/avada-kedavra62442/FreeCode)",
      "accept": "text/html, text/css;q=0.9, */*;q=0.1"
    }
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("The website returned an unsupported redirect.");
    const next = new URL(location, url);
    if (next.hostname !== new URL(url).hostname) {
      throw new Error("This website redirects to another host. Enter the final destination URL instead.");
    }
    if (!["http:", "https:"].includes(next.protocol)) throw new Error("Unsupported redirect protocol.");
    return fetchText(next, maxBytes, signal);
  }
  if (!response.ok) throw new Error("The website responded with HTTP " + response.status + ".");
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (!type.includes("text/html") && !type.includes("text/css") && !type.includes("text/plain")) {
    throw new Error("That URL did not return a readable HTML or CSS document.");
  }
  return readLimited(response, maxBytes);
}

function cleanMarkup($) {
  $("script, noscript, iframe, object, embed, portal, base").remove();
  $("*").each((_, element) => {
    const attrs = { ...element.attribs };
    for (const [key, value] of Object.entries(attrs)) {
      const name = key.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc" || name === "nonce" ||
          ((name === "href" || name === "src" || name === "action" || name === "formaction") &&
            /^\s*javascript:/i.test(value || ""))) {
        $(element).removeAttr(key);
      }
    }
  });
  return $("body").html() || $.root().html() || "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to analyze a website." });
  }

  try {
    const rawUrl = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!rawUrl || rawUrl.length > 2048) return res.status(400).json({ error: "Enter a website URL under 2,048 characters." });
    const url = await validatePublicUrl(rawUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let html;
    try { html = await fetchText(url, MAX_HTML_BYTES, controller.signal); }
    finally { clearTimeout(timer); }

    const $ = load(html);
    const title = $("title").first().text().trim() || url.hostname;
    const description = $('meta[name="description"]').attr("content") || "";
    const pageLanguage = $("html").attr("lang") || "en";
    const originalBody = cleanMarkup($);
    const inlineCss = $("style").map((_, element) => $(element).html() || "").get().join("\n\n");
    const stylesheetUrls = $('link[rel~="stylesheet"][href]').map((_, element) => {
      try { return new URL($(element).attr("href"), url).href; } catch { return null; }
    }).get().filter(Boolean).slice(0, 8);

    const cssChunks = [inlineCss];
    for (const stylesheetUrl of stylesheetUrls) {
      try {
        const cssUrl = await validatePublicUrl(stylesheetUrl);
        const controllerCss = new AbortController();
        const timerCss = setTimeout(() => controllerCss.abort(), 5000);
        try { cssChunks.push(await fetchText(cssUrl, MAX_CSS_BYTES, controllerCss.signal)); }
        finally { clearTimeout(timerCss); }
      } catch {
        cssChunks.push("/* A linked stylesheet could not be retrieved: " + stylesheetUrl.replace(/\*|\//g, "") + " */");
      }
    }

    const stylesheet = cssChunks.filter(Boolean).join("\n\n");
    const images = $("img").map((_, element) => {
      const src = $(element).attr("src") || $(element).attr("data-src") || "";
      try { return new URL(src, url).href; } catch { return ""; }
    }).get().filter(Boolean).slice(0, 80);

    const sanitizedHtml = originalBody
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
      .slice(0, 900000);

    return res.status(200).json({
      ok: true,
      page: { url: url.href, title, description, language: pageLanguage },
      html: sanitizedHtml,
      css: stylesheet.slice(0, 500000),
      stats: {
        htmlCharacters: sanitizedHtml.length,
        cssCharacters: stylesheet.length,
        imageCount: images.length,
        stylesheetCount: stylesheetUrls.length
      },
      note: "This is a best-effort extraction of publicly accessible HTML and styles. JavaScript-rendered content, blocked assets, and protected pages may be missing."
    });
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "The website took too long to respond. Try again or use a simpler public page."
      : (error?.message || "The website could not be analyzed.");
    return res.status(400).json({ error: message });
  }
}
