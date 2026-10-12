import { ArrowRight, Globe2, Layers3, LoaderCircle, ShieldCheck, WandSparkles } from "lucide-react";
export default function UrlAnalyzerForm({ url, setUrl, analyze, busy, error }) {
  return <>
    <section className="url-card" aria-label="Analyze a website">
      <div className="url-card-top"><div className="url-card-icon"><Globe2 size={19} /></div><div><h2>Start with a website URL</h2><p>Enter a domain with or without https://. Works best with public websites.</p></div><span className="step-label">01 <span>/</span> INPUT</span></div>
      <form className="url-form" onSubmit={analyze}>
        <div className="url-input-wrap"><Globe2 size={18} /><input type="text" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="example.com or https://example.com" aria-label="Website URL" autoComplete="url" />{url && <button className="clear-url" type="button" onClick={() => setUrl("")} aria-label="Clear URL">×</button>}</div>
        <button className="analyze-button" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Analyzing…</> : <><WandSparkles size={17} /> Analyze website <ArrowRight size={16} /></>}</button>
      </form>
      {error && <div className="error-message" role="alert">{error}</div>}
      <div className="url-footnote"><ShieldCheck size={13} /> FreeCode never executes the source website's JavaScript in your preview.</div>
    </section>
    {busy && <div className="loading-panel"><div className="loading-orb"><Layers3 size={23} /></div><div><strong>Reading the page structure</strong><p>Fetching accessible HTML and stylesheets. This can take a few seconds.</p></div><LoaderCircle className="spin loading-spinner" size={20} /></div>}
  </>;
}