import { createHash } from "node:crypto";
import { load } from "cheerio";
import JSZip from "jszip";
import { publicUrl } from "./_lib/urlSafety.js";
import { fetchRemote } from "./_lib/fetchRemote.js";

const PAGE_LIMIT = 18, HTML_LIMIT = 2000000, RESOURCE_LIMIT = 48;
const RESOURCE_FILE_LIMIT = 380000, RESOURCE_TOTAL_LIMIT = 2000000, TIMEOUT = 25000;
const SKIP_PATH = /(?:logout|signout|delete|unsubscribe|wp-admin|wp-login)/i;
const PAGE_FILE_EXT = /\.(?:css|js|mjs|cjs|json|xml|txt|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|pdf|zip|mp4|webm|mp3|wav|map|wasm)$/i;

function absoluteUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
function sameSiteHost(candidate, host) {
  const a = String(candidate || "").toLowerCase().replace(/^www\./, "");
  const b = String(host || "").toLowerCase().replace(/^www\./, "");
  return Boolean(a && b && a === b);
}
function pageUrl(value, base, host) {
  const href = absoluteUrl(value, base);
  if (!href) return null;
  try {
    const url = new URL(href);
    if (!sameSiteHost(url.hostname, host) || SKIP_PATH.test(url.pathname) || PAGE_FILE_EXT.test(url.pathname)) return null;
    url.search = ""; url.hash = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.href;
  } catch { return null; }
}
function urls($, selector, attr, base) {
  return $(selector).map((_, el) => absoluteUrl($(el).attr(attr), base)).get().filter(Boolean);
}
function resourcePath(url) {
  let filename = "resource";
  try { filename = decodeURIComponent(new URL(url).pathname.split("/").pop() || "resource"); } catch {}
  filename = filename.replace(/[?#].*$/, "").replace(/[^a-z0-9._-]/gi, "_").slice(-80) || "resource";
  return "public/freecode-assets/" + createHash("sha256").update(url).digest("hex").slice(0, 12) + "-" + filename;
}
function kindOf(url, hint = "") {
  const path = new URL(url).pathname.toLowerCase();
  if (hint === "stylesheet" || /\.css$/i.test(path)) return "stylesheet";
  if (hint === "script" || /\.(?:js|mjs|cjs)$/i.test(path)) return "script";
  if (/\.(?:woff2?|ttf|otf|eot)$/i.test(path)) return "font";
  if (/\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/i.test(path)) return "image";
  if (/\.(?:mp4|webm|mp3|wav|ogg|m4a)$/i.test(path)) return "media";
  return hint || "other";
}
function cssUrls(css, base) {
  const out = [];
  const re = /url\(\s*(['"]?)(.*?)\1\s*\)|@import\s+(['"])(.*?)\3/gi;
  for (const m of css.matchAll(re)) {
    const raw = (m[2] || m[4] || "").trim();
    if (raw && !/^(?:data:|blob:|#|javascript:)/i.test(raw)) {
      const url = absoluteUrl(raw, base);
      if (url) out.push(url);
    }
  }
  return [...new Set(out)];
}
function rewriteCss(css, base, paths) {
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)|@import\s+(['"])(.*?)\3/gi, (whole, q, first, iq, imported) => {
    const raw = (first || imported || "").trim();
    if (!raw || /^(?:data:|blob:|#|javascript:)/i.test(raw)) return whole;
    const url = absoluteUrl(raw, base), local = url && paths.get(url);
    if (!local) return whole;
    const path = "/" + local.replace(/^public\//, "");
    return first !== undefined ? 'url("' + path + '")' : '@import "' + path + '"';
  });
}
function normaliseAssets($, base) {
  $("img[data-src],source[data-src],img[data-lazy-src],source[data-lazy-src],img[data-original],source[data-original]").each((_, el) => {
    const current = $(el).attr("src") || "";
    const lazy = $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("data-original");
    if (lazy && (!current || /^data:image\/(?:gif|png|webp);base64,/i.test(current))) $(el).attr("src", lazy);
  });
  $("img[data-srcset],source[data-srcset],img[data-lazy-srcset],source[data-lazy-srcset]").each((_, el) => {
    if (!$(el).attr("srcset")) {
      const lazySet = $(el).attr("data-srcset") || $(el).attr("data-lazy-srcset");
      if (lazySet) $(el).attr("srcset", lazySet);
    }
  });
  $("img[src],source[src],video[src],video[poster],audio[src],script[src],link[href]").each((_, el) => {
    for (const attr of ["src", "poster", "href"]) {
      const value = $(el).attr(attr);
      if (!value || /^(?:data:|blob:|javascript:|mailto:|tel:|#)/i.test(value)) continue;
      const url = absoluteUrl(value, base);
      if (url) $(el).attr(attr, url);
    }
  });
  $("img[srcset],source[srcset]").each((_, el) => {
    const value = $(el).attr("srcset");
    if (value) $(el).attr("srcset", value.split(",").map(part => {
      const p = part.trim().split(/\s+/), url = absoluteUrl(p[0], base);
      if (url) p[0] = url;
      return p.join(" ");
    }).join(", "));
  });
}
function textOf($, selector, limit = 120) {
  return $(selector).map((_, el) => $(el).text().replace(/\s+/g, " ").trim()).get().filter(Boolean).slice(0, limit);
}
function inspectPage($, page) {
  const interactions = [];
  const add = (type, el, selector, extra = {}) => {
    if (interactions.length >= 260) return;
    const $el = $(el);
    const label = ($el.attr("aria-label") || $el.attr("title") || $el.text() || $el.attr("alt") || "").replace(/\s+/g, " ").trim().slice(0, 160);
    interactions.push({
      type, label, selector,
      role: $el.attr("role") || null,
      href: $el.attr("href") || null,
      name: $el.attr("name") || null,
      inputType: $el.attr("type") || null,
      hasInlineHandler: Object.keys(el.attribs || {}).some(k => /^on(?:click|change|submit|input|keydown|keyup|pointer)/i.test(k)),
      dataAttributes: Object.keys(el.attribs || {}).filter(k => k.startsWith("data-")).slice(0, 8),
      ...extra
    });
  };
  $("a[href]").each((_, el) => add("link", el, "a"));
  $("button, input[type=button], input[type=submit], input[type=reset]").each((_, el) => add("button", el, el.name || "button"));
  $("input, select, textarea").each((_, el) => {
    const $el = $(el);
    if (/^(?:button|submit|reset|image)$/i.test($el.attr("type") || "")) return;
    add("form-control", el, el.name || el.tagName.toLowerCase(), {
      required: $el.is("[required]"),
      placeholder: ($el.attr("placeholder") || "").slice(0, 100),
      autocomplete: $el.attr("autocomplete") || null
    });
  });
  $("[role=button],[role=tab],[role=menuitem],[role=dialog],[role=switch],[role=checkbox],[role=radio],[role=combobox],[tabindex]").each((_, el) => {
    if (interactions.length < 260) add("aria-interaction", el, el.name || el.tagName.toLowerCase());
  });
  const cssText = $("style").map((_, el) => $(el).text()).get().join("\n");
  const styleAttributes = $("[style]").length;
  const headings = {};
  for (let level = 1; level <= 6; level++) headings["h" + level] = $("h" + level).length;
  const forms = $("form").map((_, el) => ({
    action: $(el).attr("action") || null,
    method: ($(el).attr("method") || "get").toLowerCase(),
    controls: $(el).find("input,select,textarea,button").length,
    hasFileInput: $(el).find('input[type="file"]').length > 0,
    hasPasswordInput: $(el).find('input[type="password"]').length > 0
  })).get().slice(0, 40);
  const navLabels = textOf($, "nav a, [role=navigation] a, header a", 80);
  const colors = [...new Set((cssText.match(/(?:^|[;{\s])(?:color|background(?:-color)?|border-color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]{1,80}\)|hsla?\([^)]{1,80}\)|[a-z]{3,20})/gi) || []).map(x => x.replace(/^.*?:\s*/, "").trim()))].slice(0, 24);
  const fontFamilies = [...new Set([...cssText.matchAll(/font-family\s*:\s*([^;}]{1,120})/gi)].map(m => m[1].trim()))].slice(0, 12);
  const cssVariables = [...new Set([...cssText.matchAll(/(--[a-z0-9_-]+)\s*:/gi)].map(m => m[1]))].slice(0, 80);
  const images = $("img").map((_, el) => ({ src: $(el).attr("src") || $(el).attr("data-src") || null, alt: ($(el).attr("alt") || "").slice(0, 180), hasAlt: Boolean($(el).attr("alt")) })).get().slice(0, 120);
  const scripts = $("script[src]").map((_, el) => $(el).attr("src")).get().slice(0, 80);
  return {
    headings, title: page.title, description: page.description,
    structure: { navs: $("nav,[role=navigation]").length, headers: $("header").length, footers: $("footer").length, mainLandmarks: $("main,[role=main]").length, sections: $("section").length, articles: $("article").length, divs: $("div").length, lists: $("ul,ol").length, tables: $("table").length },
    counts: { links: $("a[href]").length, buttons: $("button,input[type=button],input[type=submit],input[type=reset]").length, forms: $("form").length, formControls: $("input,select,textarea").length, images: $("img").length, videos: $("video").length, iframes: $("iframe").length, inlineStyleBlocks: $("style").length, inlineStyledElements: styleAttributes, externalScripts: scripts.length },
    navigationLabels: navLabels,
    forms,
    interactions: interactions.slice(0, 260),
    images,
    scripts,
    visualSignals: { colors, fontFamilies, cssVariables, hasDarkColorSignals: /(?:#(?:0[0-9a-f]{5}|1[0-9a-f]{5}|2[0-9a-f]{5})|rgb\(\s*[0-4]?\d\s*,\s*[0-4]?\d\s*,\s*[0-4]?\d)/i.test(cssText), hasResponsiveRules: /@media/i.test(cssText), hasAnimationRules: /@keyframes|animation\s*:/i.test(cssText) }
  };
}

function pageResources($, page) {
  normaliseAssets($, page.url);
  const found = [];
  for (const url of urls($, 'link[rel~="stylesheet"][href]', "href", page.url)) found.push({ url, kind: "stylesheet" });
  for (const url of urls($, "script[src]", "src", page.url)) found.push({ url, kind: "script" });
  for (const [selector, attr] of [["img[src]", "src"], ["source[src]", "src"], ["video[src]", "src"], ["audio[src]", "src"], ["video[poster]", "poster"], ["link[rel~='icon'][href]", "href"], ["link[rel~='preload'][href]", "href"], ["link[rel~='apple-touch-icon'][href]", "href"]]) {
    for (const url of urls($, selector, attr, page.url)) found.push({ url, kind: kindOf(url) });
  }
  $("*[style]").each((_, el) => cssUrls($(el).attr("style") || "", page.url).forEach(url => found.push({ url, kind: kindOf(url) })));
  cssUrls(page.inlineCss || "", page.url).forEach(url => found.push({ url, kind: kindOf(url) }));
  return found;
}
function rewriteHtml($, base, paths) {
  for (const [selector, attr] of [["img[src],source[src],video[src],audio[src]", "src"], ["video[poster]", "poster"], ["link[rel~='stylesheet'][href],link[rel~='icon'][href],link[rel~='apple-touch-icon'][href],link[rel~='preload'][href]", "href"]]) {
    $(selector).each((_, el) => {
      const url = absoluteUrl($(el).attr(attr), base), local = url && paths.get(url);
      if (local) $(el).attr(attr, "/" + local.replace(/^public\//, ""));
    });
  }
  $("img[srcset],source[srcset]").each((_, el) => {
    const value = $(el).attr("srcset");
    if (value) $(el).attr("srcset", value.split(",").map(part => {
      const p = part.trim().split(/\s+/), url = absoluteUrl(p[0], base), local = url && paths.get(url);
      if (local) p[0] = "/" + local.replace(/^public\//, "");
      return p.join(" ");
    }).join(", "));
  });
  $("*[style]").each((_, el) => {
    const value = $(el).attr("style");
    if (value) $(el).attr("style", rewriteCss(value, base, paths));
  });
}
async function getSitemap(start, host, signal) {
  const candidates = [new URL("/robots.txt", start).href, new URL("/sitemap.xml", start).href], found = [];
  for (let i = 0; i < candidates.length && i < 8; i++) {
    try {
      const r = await fetchRemote((await publicUrl(candidates[i])).href, signal);
      if (r.buffer.length > 700000) continue;
      const text = r.buffer.toString("utf8");
      if (/robots\.txt/i.test(candidates[i])) {
        for (const m of text.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) {
          const u = absoluteUrl(m[1], start);
          if (u && !candidates.includes(u) && candidates.length < 8) candidates.push(u);
        }
        continue;
      }
      const $ = load(text, { xmlMode: true });
      $("loc").each((_, el) => { if (found.length < 120) found.push($(el).text().trim()); });
    } catch {}
  }
  return [...new Set(found.map(u => pageUrl(u, start, host)).filter(Boolean))];
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Use POST to reconstruct a website." }); }
  const raw = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!raw || raw.length > 2048) return res.status(400).json({ error: "Enter a public website URL under 2,048 characters." });
  const input = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : "https://" + raw;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const start = await publicUrl(input), host = start.hostname;
    const queue = [start.href];
    // Discover sitemap routes in parallel with the first page fetch, not before it.
    const sitemapPromise = getSitemap(start, host, controller.signal).catch(() => []);
    const seen = new Set(), pages = [], failedPages = [];
    let htmlBytes = 0;
    while (queue.length && pages.length < PAGE_LIMIT && htmlBytes < HTML_LIMIT) {
      if (controller.signal.aborted) throw new Error("The website took too long to explore. Try a smaller site.");
      const candidate = pageUrl(queue.shift(), start, host);
      if (!candidate || seen.has(candidate)) continue;
      seen.add(candidate);
      try {
        const r = await fetchRemote((await publicUrl(candidate)).href, controller.signal);
        const contentLooksHtml = /^\s*(?:<!doctype\s+html|<html\b|<head\b|<body\b)/i.test(r.buffer.toString("utf8", 0, Math.min(r.buffer.length, 2048)));
        if (!/text\/html|application\/xhtml\+xml/i.test(r.contentType) && !contentLooksHtml) continue;
        if (htmlBytes + r.buffer.length > HTML_LIMIT) { failedPages.push({ url: candidate, reason: "HTML crawl size limit reached" }); break; }
        htmlBytes += r.buffer.length;
        const finalUrl = r.url.href, $ = load(r.buffer.toString("utf8"), { decodeEntities: false });
        const title = $("title").first().text().trim() || new URL(finalUrl).pathname || host;
        const description = $('meta[name="description"]').attr("content") || "";
        const language = $("html").attr("lang") || "en";
        const safeAttrs = (el) => Object.fromEntries(Object.entries(el?.attribs || {}).filter(([name]) => !/^on/i.test(name) && name.toLowerCase() !== "srcdoc"));
        const htmlAttrs = safeAttrs($("html").get(0));
        const bodyAttrs = safeAttrs($("body").get(0));
        const headMeta = $("head meta").map((_, el) => {
          const attrs = el.attribs || {};
          if ((!attrs.name && !attrs.property) || !attrs.content || /^viewport$/i.test(attrs.name || "")) return null;
          return { name: attrs.name || null, property: attrs.property || null, content: attrs.content };
        }).get().filter(Boolean).slice(0, 40);
        const inlineCss = $("style").map((_, el) => $(el).html() || "").get().join("\n\n");
        const route = new URL(finalUrl).pathname.replace(/\/+$/, "") || "/";
        const page = { route, url: finalUrl, title, description, language, htmlAttrs, bodyAttrs, headMeta, html: "", inlineCss, stylesheets: [], resources: [] };
        page.inspection = inspectPage($, page);
        page.resources = pageResources($, { url: finalUrl, inlineCss });
        const body = $("body").length ? $("body") : $.root();
        body.find("script,noscript,iframe,object,embed,portal,base").remove();
        body.find("*").each((_, el) => {
          for (const [name, value] of Object.entries({ ...el.attribs })) {
            const n = name.toLowerCase();
            if (n.startsWith("on") || n === "srcdoc" || (["href", "src", "action", "formaction"].includes(n) && /^\s*javascript:/i.test(value || ""))) $(el).removeAttr(name);
          }
        });
        normaliseAssets($, finalUrl);
        page.html = body.html() || "";
        page.stylesheets = page.resources.filter(r => r.kind === "stylesheet").map(r => r.url);
        pages.push(page);
        if (pages.length === 1) {
          const sitemapRoutes = await sitemapPromise;
          for (const route of sitemapRoutes) if (!seen.has(route) && !queue.includes(route) && queue.length < 160) queue.push(route);
        }
        $("a[href]").each((_, el) => {
          const value = $(el).attr("href");
          if (!value || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(value)) return;
          const next = pageUrl(value, finalUrl, host);
          if (next && !seen.has(next) && queue.length < 160 && !queue.includes(next)) queue.push(next);
        });
      } catch (e) { failedPages.push({ url: candidate, reason: e?.message || "Fetch failed" }); }
    }
    if (!pages.length) throw new Error("FreeCode could not retrieve a public HTML page from that URL.");

    const routes = new Set(pages.map(p => p.route)), resourceQueue = [], queued = new Set();
    const downloaded = new Map(), failedResources = [];
    let resourceBytes = 0;
    function enqueue(url, kind) {
      const absolute = absoluteUrl(url, start);
      if (!absolute || queued.has(absolute) || queued.size >= RESOURCE_LIMIT) return;
      queued.add(absolute); resourceQueue.push({ url: absolute, kind: kind || kindOf(absolute) });
    }
    pages.forEach(p => p.resources.forEach(r => enqueue(r.url, r.kind)));
    while (resourceQueue.length && downloaded.size < RESOURCE_LIMIT && resourceBytes < RESOURCE_TOTAL_LIMIT) {
      if (controller.signal.aborted) break;
      const batch = resourceQueue.splice(0, 4);
      const results = await Promise.all(batch.map(async (item) => {
        try {
          const safe = await publicUrl(item.url);
          const r = await fetchRemote(safe.href, controller.signal);
          return { item, r };
        } catch (error) {
          return { item, error };
        }
      }));
      for (const result of results) {
        const { item, r, error } = result;
        if (error) { failedResources.push({ url: item.url, kind: item.kind, reason: error?.message || "Fetch failed" }); continue; }
        if (r.buffer.length > RESOURCE_FILE_LIMIT) { failedResources.push({ url: item.url, kind: item.kind, reason: "Per-file size limit" }); continue; }
        if (resourceBytes + r.buffer.length > RESOURCE_TOTAL_LIMIT) { failedResources.push({ url: item.url, kind: item.kind, reason: "Total resource size limit" }); continue; }
        const contentType = r.contentType || "", kind = /text\/css/i.test(contentType) ? "stylesheet" : item.kind;
        const record = { url: item.url, finalUrl: r.url.href, kind, contentType, bytes: r.buffer.length, path: resourcePath(item.url), buffer: r.buffer };
        downloaded.set(item.url, record); resourceBytes += r.buffer.length;
        if (kind === "stylesheet" || /\.css(?:$|\?)/i.test(item.url)) cssUrls(r.buffer.toString("utf8"), r.url.href).forEach(u => enqueue(u, kindOf(u)));
      }
    }
    const localPaths = new Map([...downloaded].map(([url, r]) => [url, r.path]));
    for (const r of downloaded.values()) if (r.kind === "stylesheet" || /\.css(?:$|\?)/i.test(r.url)) r.buffer = Buffer.from(rewriteCss(r.buffer.toString("utf8"), r.finalUrl, localPaths));

    const zip = new JSZip();
    for (const r of downloaded.values()) {
      r.exportPath = r.kind === "script" ? "original-resources/" + r.path.split("/").pop() : r.path;
      zip.file(r.exportPath, r.buffer);
    }
    for (const page of pages) {
      const linkedCss = page.stylesheets.map(url => downloaded.get(url)).filter(resource => resource && (resource.kind === "stylesheet" || /text\/css/i.test(resource.contentType))).map(resource => resource.buffer.toString("utf8")).join("\n");
      const combinedCss = [page.inlineCss, linkedCss].filter(Boolean).join("\n");
      const colorDeclarations = [...new Set([...combinedCss.matchAll(/(?:^|[;{\s])(?:color|background(?:-color)?|border-color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]{1,80}\)|hsla?\([^)]{1,80}\)|[a-z]{3,20})/gi)].map(match => match[1]))].slice(0, 32);
      const fontFamilies = [...new Set([...combinedCss.matchAll(/font-family\s*:\s*([^;}]{1,120})/gi)].map(match => match[1].trim()))].slice(0, 16);
      const cssVariables = [...new Set([...combinedCss.matchAll(/(--[a-z0-9_-]+)\s*:/gi)].map(match => match[1]))].slice(0, 100);
      page.inspection.stylesheetAnalysis = {
        downloadedStylesheets: page.stylesheets.filter(url => downloaded.has(url)).length,
        cssBytesAnalyzed: Buffer.byteLength(combinedCss),
        colorDeclarations,
        fontFamilies,
        cssVariables,
        hasResponsiveRules: /@media/i.test(combinedCss),
        hasAnimationRules: /@keyframes|animation\s*:/i.test(combinedCss),
        hasDarkColorSignals: /(?:#(?:0[0-9a-f]{5}|1[0-9a-f]{5}|2[0-9a-f]{5})|rgb\(\s*[0-4]?\d\s*,\s*[0-4]?\d\s*,\s*[0-4]?\d)/i.test(combinedCss)
      };
    }

    const projectPages = pages.map(page => {
      const $ = load("<div>" + page.html + "</div>", { decodeEntities: false });
      rewriteHtml($, page.url, localPaths);
      $("a[href]").each((_, el) => {
        const value = $(el).attr("href");
        if (!value || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(value)) return;
        try {
          const target = new URL(value, page.url);
          if (!sameSiteHost(target.hostname, host)) return;
          const route = target.pathname.replace(/\/+$/, "") || "/";
          if (routes.has(route)) {
            $(el).attr("href", target.pathname + target.search + target.hash);
            $(el).removeAttr("target");
          } else {
            $(el).attr("href", target.href).attr("target", "_blank").attr("rel", "noopener noreferrer");
          }
        } catch {}
      });
      $("form").each((_, el) => {
        $(el).attr("action", "#").attr("data-freecode-form", "backend-unavailable");
      });
      const stylesheets = page.stylesheets.map(u => localPaths.get(u)).filter(Boolean).map(p => "/" + p.slice("public/".length));
      const htmlAttrs = { ...(page.htmlAttrs || {}) }, bodyAttrs = { ...(page.bodyAttrs || {}) };
      if (htmlAttrs.style) htmlAttrs.style = rewriteCss(htmlAttrs.style, page.url, localPaths);
      if (bodyAttrs.style) bodyAttrs.style = rewriteCss(bodyAttrs.style, page.url, localPaths);
      return { route: page.route, url: page.url, title: page.title, description: page.description, language: page.language, htmlAttrs, bodyAttrs, headMeta: page.headMeta, html: $("div").first().html() || "", inlineCss: rewriteCss(page.inlineCss, page.url, localPaths), stylesheets };
    });
    const report = {
      version: 5, source: start.href, createdAt: new Date().toISOString(),
      summary: { pagesCaptured: pages.length, pageLimit: PAGE_LIMIT, htmlBytes, resourcesDiscovered: queued.size, resourcesDownloaded: downloaded.size, resourceBytes, resourceLimit: RESOURCE_LIMIT, resourceBytesLimit: RESOURCE_TOTAL_LIMIT, failedPages: failedPages.length, failedResources: failedResources.length },
      pages: pages.map(p => ({ route: p.route, title: p.title, url: p.url, inspection: p.inspection, resources: p.resources.map(r => ({ url: r.url, kind: r.kind, downloaded: localPaths.has(r.url), localPath: localPaths.get(r.url) || null })) })),
      interactionAnalysis: { totalLinks: pages.reduce((n, p) => n + p.inspection.counts.links, 0), totalButtons: pages.reduce((n, p) => n + p.inspection.counts.buttons, 0), totalForms: pages.reduce((n, p) => n + p.inspection.counts.forms, 0), totalFormControls: pages.reduce((n, p) => n + p.inspection.counts.formControls, 0), pagesWithForms: pages.filter(p => p.inspection.counts.forms > 0).map(p => p.route), pagesWithVideo: pages.filter(p => p.inspection.counts.videos > 0).map(p => p.route), pagesWithIframe: pages.filter(p => p.inspection.counts.iframes > 0).map(p => p.route) },
      downloadedResources: [...downloaded.values()].map(({ url, finalUrl, kind, contentType, bytes, exportPath }) => ({ url, finalUrl, kind, contentType, bytes, path: exportPath })),
      failedPages, failedResources,
      limitations: [
        "Only publicly accessible HTTP(S) resources can be fetched; private, authenticated, blocked, or unavailable resources are not recovered.",
        "Public JavaScript files are inventoried and exported separately, but are not executed in the reconstruction.",
        "Server-side code, databases, API secrets, and private application behaviour cannot be recovered from public pages.",
        "The crawl is bounded by page, file-count, per-file, total-resource, and execution-time limits.",
        "Some sites block automated requests or require browser execution; inspect this report for missing resources.",
        "Interaction analysis is inferred from retrieved HTML and static CSS. It cannot observe runtime-only state, browser event listeners, API responses, or interactions that require login.",
        "Form submissions are intercepted in the export because the original site server or API cannot be recovered from public page files."
      ]
    };

    zip.file("package.json", JSON.stringify({ name: "freecode-reconstructed-website", private: true, version: "1.0.0", type: "module", scripts: { dev: "vite", build: "vite build", preview: "vite preview" }, dependencies: { "@vitejs/plugin-react": "^4.3.4", vite: "^6.0.5", react: "^18.3.1", "react-dom": "^18.3.1", "@vercel/analytics": "^1.5.0" } }, null, 2));
    zip.file("vite.config.js", 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()] });\n');
    zip.file("index.html", '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Reconstructed website</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>');
    zip.file("src/main.jsx", 'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport { Analytics } from "@vercel/analytics/react";\nimport App from "./App.jsx";\nimport "./styles.css";\ncreateRoot(document.getElementById("root")).render(<><App /><Analytics /></>);\n');
    zip.file("src/pages.js", "export const pages = " + JSON.stringify(projectPages).replace(/</g, "\\u003c") + ";\n");
    zip.file("src/App.jsx", [
      'import { useEffect, useMemo, useRef, useState } from "react";',
      'import { pages } from "./pages.js";',
      'function currentPath(){return window.location.pathname.replace(/\\/+$/, "")||"/"}',
      'function attrsOf(node){return Object.fromEntries([...node.attributes].map(a=>[a.name,a.value]))}',
      'function applyAttrs(node,base,next){[...node.attributes].forEach(a=>node.removeAttribute(a.name));Object.entries(base||{}).forEach(([k,v])=>node.setAttribute(k,v));Object.entries(next||{}).forEach(([k,v])=>node.setAttribute(k,v))}',
      'export default function App(){',
      ' const [path,setPath]=useState(currentPath);',
      ' const page=useMemo(()=>pages.find(p=>p.route===path)||pages.find(p=>p.route==="/")||pages[0],[path]);',
      ' const baseHtml=useRef(null),baseBody=useRef(null);',
      ' if(!baseHtml.current)baseHtml.current=attrsOf(document.documentElement);',
      ' if(!baseBody.current)baseBody.current=attrsOf(document.body);',
      " useEffect(()=>{const pop=()=>setPath(currentPath());const click=e=>{const control=e.target.closest(\"[aria-controls]\");if(control){const id=(control.getAttribute(\"aria-controls\")||\"\").split(/\\s+/)[0],panel=id&&document.getElementById(id);if(panel){if(control.getAttribute(\"role\")===\"tab\"){const list=control.closest('[role=\"tablist\"]');if(list)list.querySelectorAll('[role=\"tab\"][aria-controls]').forEach(tab=>{tab.setAttribute(\"aria-selected\",String(tab===control));tab.tabIndex=tab===control?0:-1});const group=panel.parentElement;if(group)group.querySelectorAll('[role=\"tabpanel\"]').forEach(item=>{item.hidden=item!==panel});panel.hidden=false}else{const wasOpen=control.getAttribute(\"aria-expanded\")===\"true\";control.setAttribute(\"aria-expanded\",String(!wasOpen));panel.hidden=wasOpen}}}const a=e.target.closest(\"a[href]\");if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target||a.hasAttribute(\"download\"))return;try{const u=new URL(a.href,location.href),route=u.pathname.replace(/\\/+$/,\"\")||\"/\";if(u.origin!==location.origin||!pages.some(p=>p.route===route))return;e.preventDefault();history.pushState({},\"\",u.pathname+u.search+u.hash);setPath(currentPath());scrollTo(0,0)}catch{}};const submit=e=>{const form=e.target.closest(\".reconstructed-page form\");if(!form)return;e.preventDefault();let note=form.querySelector(\"[data-freecode-form-note]\");if(!note){note=document.createElement(\"p\");note.dataset.freecodeFormNote=\"true\";note.setAttribute(\"role\",\"status\");note.className=\"freecode-form-note\";form.appendChild(note)}note.textContent=\"This form needs the original site server or API, which cannot be recovered from public page files.\"};addEventListener(\"popstate\",pop);document.addEventListener(\"click\",click);document.addEventListener(\"submit\",submit);return()=>{removeEventListener(\"popstate\",pop);document.removeEventListener(\"click\",click);document.removeEventListener(\"submit\",submit)}},[]);",
      ' useEffect(()=>{',
      '  document.title=page?.title||"Reconstructed website";',
      '  applyAttrs(document.documentElement,baseHtml.current,{...(page?.htmlAttrs||{}),lang:page?.htmlAttrs?.lang||page?.language||"en"});',
      '  applyAttrs(document.body,baseBody.current,page?.bodyAttrs||{});',
      '  document.querySelectorAll("[data-reconstruction-css],[data-reconstruction-meta]").forEach(n=>n.remove());',
      '  page?.headMeta?.forEach(meta=>{if(!meta.content||(!meta.name&&!meta.property))return;const node=document.createElement("meta");if(meta.name)node.name=meta.name;if(meta.property)node.setAttribute("property",meta.property);node.content=meta.content;node.dataset.reconstructionMeta="true";document.head.appendChild(node)});',
      '  page?.stylesheets?.forEach(href=>{const node=document.createElement("link");node.rel="stylesheet";node.href=href;node.dataset.reconstructionCss="true";document.head.appendChild(node)});',
      '  return()=>{document.querySelectorAll("[data-reconstruction-css],[data-reconstruction-meta]").forEach(n=>n.remove());applyAttrs(document.documentElement,baseHtml.current,baseHtml.current);applyAttrs(document.body,baseBody.current,baseBody.current)};',
      ' },[page]);',
      ' return page?<><style>{page.inlineCss||""}</style><div className="reconstructed-page" dangerouslySetInnerHTML={{__html:page.html}}/></>:<h1>Page not found</h1>;',
      '}'
    ].join("\n"));
    zip.file("src/styles.css", "*{box-sizing:border-box}html{min-height:100%;scroll-behavior:smooth}body{margin:0;min-width:320px}img,video,iframe{max-width:100%}.reconstructed-page{min-height:100vh}.reconstructed-page img{height:auto}.reconstructed-page a{cursor:pointer}.freecode-form-note{margin:.75rem 0 0;padding:.7rem .8rem;border:1px solid currentColor;border-radius:.5rem;font-size:.9rem;line-height:1.45}");
    zip.file("freecode-reconstruction-report.json", JSON.stringify(report, null, 2));
    zip.file("README.md", "# FreeCode reconstructed website\n\nGenerated from publicly accessible website resources.\n\n## Run\n\n1. Install Node.js.\n2. Run npm install.\n3. Run npm run dev.\n\n## Included\n\n- Captured page HTML and route metadata\n- Downloaded public stylesheets, images, fonts, icons, and media where accessible\n- Public JavaScript files saved separately under original-resources/ for inspection; they are not executed by this reconstruction\n- freecode-reconstruction-report.json (version 5) with route/resource inventory, page structure, linked-CSS design signals, form/button/link inventory, navigation clues, accessibility hints, and failed fetches\n\n## Limitations\n\nThis is a best-effort reconstruction, not a recovery of private source code or backend services. Form submissions are intercepted and explained rather than sent to the original site. Review the report for inaccessible resources and routes that need manual rebuilding.");
    const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="' + host.replace(/[^a-z0-9.-]/gi, "-") + '-freecode-reconstruction.zip"');
    res.setHeader("X-FreeCode-Pages", String(pages.length));
    res.setHeader("X-FreeCode-Stylesheets", String([...downloaded.values()].filter(r => r.kind === "stylesheet").length));
    res.setHeader("X-FreeCode-Assets", String(downloaded.size));
    res.setHeader("X-FreeCode-Failures", String(failedPages.length + failedResources.length));
    res.setHeader("X-FreeCode-Failed-Pages", String(failedPages.length));
    res.setHeader("X-FreeCode-Failed-Resources", String(failedResources.length));
    res.setHeader("X-FreeCode-Links", String(report.interactionAnalysis.totalLinks));
    res.setHeader("X-FreeCode-Buttons", String(report.interactionAnalysis.totalButtons));
    res.setHeader("X-FreeCode-Forms", String(report.interactionAnalysis.totalForms));
    return res.status(200).send(archive);
  } catch (error) {
    return res.status(502).json({ error: controller.signal.aborted ? "The website took too long to explore. Try a smaller site." : (error?.message || "FreeCode could not reconstruct this website.") });
  } finally { clearTimeout(timer); }
}
