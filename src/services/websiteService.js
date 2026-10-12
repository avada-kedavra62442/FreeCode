export function normalizeWebsiteUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) throw new Error("Paste a website URL to get started.");
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url;
  } catch {
    throw new Error("That URL doesn't look right. Enter a public website address.");
  }
}
async function responseError(response, fallback) {
  const result = await response.json().catch(() => ({}));
  return new Error(result.error || fallback);
}
export async function analyzeWebsite(url) {
  const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.href }) });
  if (!response.ok) throw await responseError(response, "We couldn't analyze that website.");
  return response.json();
}
export async function downloadWebsiteZip(url) {
  const response = await fetch("/api/download", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
  if (!response.ok) throw await responseError(response, "The website files could not be packaged.");
  const blob = await response.blob();
  if (!blob.size || !/application\/zip/i.test(blob.type)) throw new Error("The server did not return a valid ZIP archive.");
  const count = (key) => Number(response.headers.get(key) || 0);
  return { blob, report: { files: count("X-FreeCode-Files"), html: count("X-FreeCode-HTML"), css: count("X-FreeCode-CSS"), javascript: count("X-FreeCode-JS"), images: count("X-FreeCode-Images"), bytes: blob.size } };
}
export function saveBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2500);
}