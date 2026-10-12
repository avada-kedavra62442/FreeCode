import { useMemo, useState } from "react";
import { buildPreviewDocument, makeReactOutput, makeTailwindOutput, prettyMarkup } from "../lib/codeFormats.js";
import { analyzeWebsite as requestAnalysis, downloadWebsiteZip, normalizeWebsiteUrl, saveBlob } from "../services/websiteService.js";

export function useWebsiteWorkspace() {
  const [url, setUrl] = useState("");
  const [activeFormat, setActiveFormat] = useState("html");
  const [page, setPage] = useState(null);
  const [markup, setMarkup] = useState("");
  const [css, setCss] = useState("");
  const [codeOverrides, setCodeOverrides] = useState({});
  const [busy, setBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [exportReport, setExportReport] = useState(null);
  const output = useMemo(() => {
    if ((activeFormat === "react" || activeFormat === "tailwind") && codeOverrides[activeFormat] !== undefined) return codeOverrides[activeFormat];
    if (activeFormat === "css") return css || "/* No CSS was extracted from this page. */";
    if (activeFormat === "react") return makeReactOutput(markup, page?.title);
    if (activeFormat === "tailwind") return makeTailwindOutput(markup);
    return prettyMarkup(markup);
  }, [activeFormat, codeOverrides, css, markup, page]);
  const previewDocument = useMemo(() => buildPreviewDocument(markup, css), [markup, css]);

  async function analyze(event) {
    event?.preventDefault();
    let normalized;
    try { normalized = normalizeWebsiteUrl(url); } catch (caught) { setError(caught.message); return; }
    setBusy(true); setError(""); setPage(null); setHasGenerated(false); setExportReport(null); setCodeOverrides({});
    try {
      const result = await requestAnalysis(normalized);
      setPage(result.page || { url: normalized.href, title: normalized.hostname });
      setMarkup(prettyMarkup(result.html || "")); setCss(result.css || ""); setActiveFormat("html"); setHasGenerated(true);
    } catch (caught) { setError(caught.message || "Something went wrong while analyzing this website."); }
    finally { setBusy(false); }
  }
  async function downloadAllFiles() {
    if (!page?.url || zipBusy) return;
    setZipBusy(true); setError(""); setExportReport(null);
    try {
      const { blob, report } = await downloadWebsiteZip(page.url);
      const hostname = new URL(page.url).hostname.replace(/[^a-z0-9.-]/gi, "-") || "website";
      saveBlob(blob, hostname + "-freecode.zip"); setExportReport(report);
    } catch (caught) { setError(caught.message || "Could not download the website ZIP."); }
    finally { setZipBusy(false); }
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(output); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError("Clipboard access was blocked. Select the code and copy it manually."); }
  }
  function downloadCode() {
    const extension = ({ html: "html", css: "css", react: "jsx", tailwind: "html" })[activeFormat] || "txt";
    const mime = activeFormat === "css" ? "text/css" : "text/plain";
    saveBlob(new Blob([output], { type: mime + ";charset=utf-8" }), "freecode-" + activeFormat + "." + extension);
  }
  return { url, setUrl, activeFormat, setActiveFormat, page, markup, setMarkup, css, setCss, codeOverrides, setCodeOverrides, busy, zipBusy, error, setError, copied, showPreview, setShowPreview, hasGenerated, exportReport, output, previewDocument, analyze, downloadAllFiles, copyCode, downloadCode };
}