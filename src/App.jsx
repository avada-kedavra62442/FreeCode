import { useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowRight, Braces, Check, ChevronDown, Code2,
  Copy, ExternalLink, Eye, FileCode2, Globe2, Layers3, LoaderCircle,
  Monitor, PanelRight, RefreshCw, ShieldCheck, Sparkles, WandSparkles
} from "lucide-react";

const FORMATS = [
  { id: "html", label: "HTML", detail: "Structure" },
  { id: "css", label: "CSS", detail: "Styles" },
  { id: "react", label: "React", detail: "Component" },
  { id: "tailwind", label: "Tailwind", detail: "Utilities" }
];

function escapeText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function makeReactOutput(markup, title) {
  const safeTitle = String(title || "RecreatedPage").replace(/[^a-zA-Z0-9_$]/g, "") || "RecreatedPage";
  return 'import React from "react";\nimport "./styles.css";\n\nexport default function ' + safeTitle + '() {\n  const pageMarkup = ' + JSON.stringify(markup) + ';\n\n  return (\n    <main className="recreated-page" dangerouslySetInnerHTML={{ __html: pageMarkup }} />\n  );\n}\n';
}

function makeTailwindOutput(markup) {
  return '<!-- Tailwind CSS starter. Original class names and layout are preserved where possible. -->\n' +
    '<!-- Review and replace extracted CSS with Tailwind utilities for a closer utility-first implementation. -->\n' +
    '<div class="min-h-screen w-full bg-white text-slate-900">\n' +
    '  <div class="mx-auto w-full">\n' + markup + '\n  </div>\n</div>\n';
}

function buildDocument(markup, css) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    '*,*::before,*::after{box-sizing:border-box}html,body{margin:0;min-height:100%;}' +
    (css || "") + '</style></head><body>' + (markup || "") + '</body></html>';
}

function prettyMarkup(markup) {
  return String(markup || "")
    .replace(/>\s*</g, ">\n<")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function App() {
  const [url, setUrl] = useState("");
  const [activeFormat, setActiveFormat] = useState("html");
  const [page, setPage] = useState(null);
  const [markup, setMarkup] = useState("");
  const [css, setCss] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);

  const output = useMemo(() => {
    if (activeFormat === "css") return css || "/* No CSS was extracted from this page. */";
    if (activeFormat === "react") return makeReactOutput(markup, page?.title);
    if (activeFormat === "tailwind") return makeTailwindOutput(markup);
    return prettyMarkup(markup);
  }, [activeFormat, css, markup, page]);

  const previewDocument = useMemo(() => buildDocument(markup, css), [markup, css]);

  function selectFormat(format) {
    setActiveFormat(format);
    setCode("");
    setCopied(false);
  }

  async function analyzeWebsite(event) {
    event?.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a website URL to get started.");
      return;
    }
    let normalized;
    try {
      normalized = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed);
      if (!["http:", "https:"].includes(normalized.protocol)) throw new Error();
    } catch {
      setError("That URL doesn't look right. Enter a full public website address.");
      return;
    }
    setBusy(true);
    setError("");
    setPage(null);
    setHasGenerated(false);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized.href })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We couldn't analyze that website.");
      setPage(result.page || { url: normalized.href, title: normalized.hostname });
      setMarkup(prettyMarkup(result.html || ""));
      setCss(result.css || "");
      setActiveFormat("html");
      setHasGenerated(true);
    } catch (caught) {
      setError(caught.message || "Something went wrong while analyzing this website.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access was blocked. Select the code and copy it manually.");
    }
  }

  function downloadCode() {
    const extensions = { html: "html", css: "css", react: "jsx", tailwind: "html" };
    const mime = activeFormat === "css" ? "text/css" : "text/plain";
    const blob = new Blob([output], { type: mime + ";charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "freecode-" + activeFormat + "." + extensions[activeFormat];
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="FreeCode home">
          <span className="brand-icon"><img src="/favicon.svg" alt="" /></span>
          <span className="brand-word">Free<span>Code</span></span>
          <span className="brand-beta">BETA</span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <a className="nav-active" href="#workspace">Workspace</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="topbar-right">
          <span className="free-pill"><span /> Always free</span>
          <a className="github-link" href="https://github.com/avada-kedavra62442/FreeCode" target="_blank" rel="noreferrer" aria-label="FreeCode on GitHub">
            <ExternalLink size={15} />
          </a>
        </div>
      </header>

      <main>
        <section className="hero" id="workspace">
          <div className="hero-eyebrow"><Sparkles size={14} /> THE WEBSITE-TO-CODE WORKSPACE</div>
          <h1>See a website.<br /><span>Build its starting point.</span></h1>
          <p className="hero-copy">Paste a public URL. FreeCode extracts accessible markup and styles, then gives you editable code, a live preview, and a clean place to start building.</p>
          <div className="hero-trust">
            <span><ShieldCheck size={14} /> No paid APIs</span>
            <span><Code2 size={14} /> Editable output</span>
            <span><Eye size={14} /> Live preview</span>
          </div>
        </section>

        <section className="url-card" aria-label="Analyze a website">
          <div className="url-card-top">
            <div className="url-card-icon"><Globe2 size={19} /></div>
            <div>
              <h2>Start with a website URL</h2>
              <p>Works best with public pages that don't require a login.</p>
            </div>
            <span className="step-label">01 <span>/</span> INPUT</span>
          </div>
          <form className="url-form" onSubmit={analyzeWebsite}>
            <div className="url-input-wrap">
              <Globe2 size={18} />
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                aria-label="Website URL"
                autoComplete="url"
              />
              {url && <button className="clear-url" type="button" onClick={() => setUrl("")} aria-label="Clear URL">×</button>}
            </div>
            <button className="analyze-button" type="submit" disabled={busy}>
              {busy ? <><LoaderCircle className="spin" size={17} /> Analyzing…</> : <><WandSparkles size={17} /> Analyze website <ArrowRight size={16} /></>}
            </button>
          </form>
          {error && <div className="error-message" role="alert">{error}</div>}
          <div className="url-footnote"><ShieldCheck size={13} /> FreeCode never executes the source website's JavaScript in your preview.</div>
        </section>

        {busy && (
          <div className="loading-panel">
            <div className="loading-orb"><Layers3 size={23} /></div>
            <div><strong>Reading the page structure</strong><p>Fetching accessible HTML and stylesheets. This can take a few seconds.</p></div>
            <LoaderCircle className="spin loading-spinner" size={20} />
          </div>
        )}

        {hasGenerated && page && (
          <section className="workspace-panel">
            <div className="workspace-heading">
              <div className="workspace-title">
                <div className="workspace-icon"><FileCode2 size={19} /></div>
                <div><h2>Your code workspace</h2><p>Extracted from <a href={page.url} target="_blank" rel="noreferrer">{page.title || page.url} <ExternalLink size={12} /></a></p></div>
              </div>
              <div className="workspace-actions">
                <button className="subtle-button" type="button" onClick={() => setShowPreview(!showPreview)}><PanelRight size={15} /> {showPreview ? "Hide preview" : "Show preview"}</button>
                <button className="subtle-button" type="button" onClick={analyzeWebsite}><RefreshCw size={15} /> Re-analyze</button>
              </div>
            </div>
            <div className="stats-row">
              <div><span>HTML</span><strong>{(page.htmlCharacters ?? markup.length).toLocaleString()} <small>chars</small></strong></div>
              <div><span>CSS</span><strong>{css.length.toLocaleString()} <small>chars</small></strong></div>
              <div><span>PAGE</span><strong className="page-status"><span /> Analyzed</strong></div>
            </div>
            <div className={"editor-layout " + (!showPreview ? "editor-only" : "")}>
              <div className="code-panel">
                <div className="editor-toolbar">
                  <div className="format-tabs" role="tablist" aria-label="Code output format">
                    {FORMATS.map((format) => (
                      <button key={format.id} type="button" role="tab" aria-selected={activeFormat === format.id} className={"format-tab " + (activeFormat === format.id ? "selected" : "")} onClick={() => selectFormat(format.id)}>
                        {format.id === "html" ? <Braces size={14} /> : format.id === "css" ? <Layers3 size={14} /> : <Code2 size={14} />}
                        {format.label}
                      </button>
                    ))}
                  </div>
                  <div className="editor-toolbar-actions">
                    <button type="button" className="icon-button" onClick={copyCode} title="Copy code" aria-label="Copy code">{copied ? <Check size={15} /> : <Copy size={15} />}</button>
                    <button type="button" className="download-button" onClick={downloadCode}><ArrowDownToLine size={15} /> Export</button>
                  </div>
                </div>
                <div className="editor-meta"><span className="file-dot" /> <span>freecode-{activeFormat}.{activeFormat === "react" ? "jsx" : activeFormat === "css" ? "css" : "html"}</span><span className="editable-label">EDITABLE</span></div>
                <textarea
                  className="code-editor"
                  spellCheck="false"
                  aria-label={activeFormat + " code editor"}
                  value={output}
                  onChange={(event) => {
                    if (activeFormat === "css") setCss(event.target.value);
                    else if (activeFormat === "html") setMarkup(event.target.value);
                    else setCode(event.target.value);
                  }}
                />
                <div className="editor-footer"><span><span className="status-dot" /> Changes stay in this workspace</span><span>{output.length.toLocaleString()} characters</span></div>
              </div>
              {showPreview && (
                <div className="preview-panel">
                  <div className="preview-toolbar">
                    <div className="preview-label"><Monitor size={15} /> LIVE PREVIEW</div>
                    <div className="preview-window-dots"><i /><i /><i /></div>
                    <button className="icon-button" type="button" onClick={() => setShowPreview(false)} title="Close preview" aria-label="Close preview"><ChevronDown size={15} /></button>
                  </div>
                  <div className="preview-address"><ShieldCheck size={12} /><span>Isolated preview · scripts disabled</span></div>
                  <iframe title="Generated website preview" className="preview-frame" sandbox="" srcDoc={previewDocument} />
                </div>
              )}
            </div>
            <div className="workspace-note"><ShieldCheck size={15} /><p><strong>A useful starting point, not a perfect clone.</strong> Protected pages, JavaScript-rendered content, dynamic interactions, and some assets may not be captured. Review the generated code before using it.</p></div>
          </section>
        )}

        <section className="how-section" id="how-it-works">
          <div className="section-heading"><span>THE PROCESS</span><h2>From URL to editable code.</h2><p>A practical, free-first starting point for your next build.</p></div>
          <div className="process-grid">
            <article className="process-card"><span className="process-number">01</span><div className="process-icon"><Globe2 size={20} /></div><h3>Enter a public URL</h3><p>Give FreeCode a website address. It requests the page and checks which markup and styles are accessible.</p></article>
            <article className="process-card"><span className="process-number">02</span><div className="process-icon"><Code2 size={20} /></div><h3>Inspect and edit</h3><p>Switch between output views, edit the extracted code, and see supported changes in the preview.</p></article>
            <article className="process-card"><span className="process-number">03</span><div className="process-icon"><ArrowDownToLine size={20} /></div><h3>Export your starting point</h3><p>Copy or download the code and continue building in your own project.</p></article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="footer-brand" href="/"><img src="/favicon.svg" alt="" /><span>Free<span>Code</span></span></a>
        <p>Useful software. Without the nonsense.</p>
        <div className="footer-right"><span>Made for builders</span><span className="footer-separator">·</span><span>Free forever, by design</span></div>
      </footer>
    </div>
  );
}
