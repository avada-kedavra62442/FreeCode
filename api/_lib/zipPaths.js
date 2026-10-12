import path from "node:path";

export function zipPath(url, rootHost) {
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

export function relativeZipPath(fromFile, targetFile) {
  let rel = path.posix.relative(path.posix.dirname(fromFile), targetFile);
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

