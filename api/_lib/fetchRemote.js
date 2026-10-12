import { publicUrl } from "./urlSafety.js";

export async function fetchRemote(start, signal) {
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

