import dns from "node:dns/promises";
import net from "node:net";

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

export async function publicUrl(value) {
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

