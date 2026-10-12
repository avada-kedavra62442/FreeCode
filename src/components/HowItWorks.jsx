import { ArrowDownToLine, Code2, Globe2 } from "lucide-react";
export default function HowItWorks() {
  return <section className="how-section" id="how-it-works"><div className="section-heading"><span>THE PROCESS</span><h2>From URL to editable code.</h2><p>A practical, free-first starting point for your next build.</p></div><div className="process-grid">
    <article className="process-card"><span className="process-number">01</span><div className="process-icon"><Globe2 size={20} /></div><h3>Enter a public URL</h3><p>FreeCode requests the page and checks which markup and styles are accessible.</p></article>
    <article className="process-card"><span className="process-number">02</span><div className="process-icon"><Code2 size={20} /></div><h3>Inspect and edit</h3><p>Switch between output views, edit code, and see supported changes in the preview.</p></article>
    <article className="process-card"><span className="process-number">03</span><div className="process-icon"><ArrowDownToLine size={20} /></div><h3>Download the site bundle</h3><p>Export code or package accessible website files into a ZIP.</p></article>
  </div></section>;
}