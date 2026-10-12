import { load } from "cheerio";

function isPage(url) {
  return !/\.(?:css|js|mjs|cjs|json|xml|txt|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|pdf|zip|mp4|webm|mp3|wav|map)(?:$|\?)/i.test(url.pathname);
}

export function addUrl(queue, value, base, type, rootHost) {
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

export function resourceUrls($, pageUrl, rootHost) {
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

