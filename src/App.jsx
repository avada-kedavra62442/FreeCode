import { ArrowRight, Braces, Check, Code2, Eye as EyeIcon, FileCode2, FolderTree, Github, Globe2, LockKeyhole, ShieldCheck, Sparkles, Zap } from "lucide-react";
import AppHeader from "./components/AppHeader.jsx";
import AppFooter from "./components/AppFooter.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import UrlAnalyzerForm from "./components/UrlAnalyzerForm.jsx";
import WorkspacePanel from "./components/WorkspacePanel.jsx";
import RepoImportPanel from "./components/RepoImportPanel.jsx";
import ReconstructionPanel from "./components/ReconstructionPanel.jsx";
import { useWebsiteWorkspace } from "./hooks/useWebsiteWorkspace.js";

function HomePage() {
  return <>
    <section className="home-hero">
      <div className="home-hero-glow" />
      <div className="hero-eyebrow"><Sparkles size={14} /> FREE WEBSITE CODE TOOLS</div>
      <h1>Your next build starts<br /><span>with understanding the code.</span></h1>
      <p className="home-hero-copy">Inspect a live website, explore its accessible front-end files, or grab the complete tracked source of a public GitHub project. A practical toolkit for curious developers — free, with no nonsense.</p>
      <div className="home-hero-actions"><a className="home-primary-cta" href="/traditional">Analyze a website <ArrowRight size={17} /></a><a className="home-secondary-cta" href="#how-it-works">See how it works</a></div>
      <div className="home-trust-row"><span><ShieldCheck size={15} /> Free to use</span><span><Code2 size={15} /> Editable output</span><span><LockKeyhole size={15} /> Isolated preview</span></div>
      <div className="hero-code-window" aria-label="Decorative code preview">
        <div className="hero-code-top"><div className="hero-window-dots"><i /><i /><i /></div><span><Braces size={13} /> project-start.jsx</span><span className="hero-code-badge">SOURCE READY</span></div>
        <div className="hero-code-lines"><p><span className="code-line-no">01</span><span className="code-purple">import</span> <span className="code-green">React</span> <span className="code-purple">from</span> <span className="code-amber">'react'</span><span>;</span></p><p><span className="code-line-no">02</span></p><p><span className="code-line-no">03</span><span className="code-purple">export default function</span> <span className="code-green">YourNextBuild</span>() {'{'}</p><p><span className="code-line-no">04</span>  <span className="code-purple">return</span> <span className="code-amber">'ideas into code'</span>;</p><p><span className="code-line-no">05</span>{'}'}</p></div>
        <div className="hero-code-bottom"><span><span className="hero-live-dot" /> Ready when you are</span><span>HTML · CSS · JS · REPOSITORIES</span></div>
      </div>
    </section>

    <section className="home-section home-intro" id="features">
      <div className="section-heading"><span>THREE WAYS TO START</span><h2>Start from the site.<br />Or start from the source.</h2><p>Analyze a live site, reconstruct its pages, or start from the original public repository.</p></div>
      <div className="home-feature-grid">
        <article className="home-feature-card"><div className="home-feature-icon"><Globe2 size={21} /></div><span className="home-card-label">01 / LIVE WEBSITE</span><h3>Explore what the browser can reach</h3><p>Analyze a public URL to inspect returned HTML, collect accessible CSS and assets, edit the extracted markup, and preview your changes safely.</p><ul><li><Check size={14} /> HTML and stylesheet extraction</li><li><Check size={14} /> Public linked asset collection</li><li><Check size={14} /> Editable code and live preview</li></ul><a href="/traditional">Analyze a website <ArrowRight size={15} /></a></article>
        <article className="home-feature-card"><div className="home-feature-icon"><Sparkles size={21} /></div><span className="home-card-label">02 / RECONSTRUCTION</span><h3>Rebuild the website you can see</h3><p>Explore linked routes, inspect page structure and public styles, then export a fresh React project built to preserve visual similarity.</p><ul><li><Check size={14} /> Route and sitemap discovery</li><li><Check size={14} /> Editable React project ZIP</li><li><Check size={14} /> Crawl report and limitations</li></ul><a href="/reconstruct">Reconstruct a website <ArrowRight size={15} /></a></article><article className="home-feature-card home-feature-highlight"><div className="home-feature-icon"><Github size={21} /></div><span className="home-card-label">03 / SOURCE REPOSITORY</span><h3>Get the real project files</h3><p>Use a public GitHub repository when you need the actual source tree — application code, API functions, configuration, and project folders.</p><ul><li><Check size={14} /> Full tracked repository archive</li><li><Check size={14} /> Source folders beyond <code>public</code></li><li><Check size={14} /> Preserved folder structure</li></ul><a href="/github">Import a GitHub project <ArrowRight size={15} /></a></article>
        <article className="home-feature-card"><div className="home-feature-icon"><FileCode2 size={21} /></div><span className="home-card-label">04 / HTML INSPECTOR</span><h3>Understand the page structure</h3><p>Inspect the HTML a public page actually serves and explore its accessible markup without pretending to recover private source files.</p><ul><li><Check size={14} /> Returned HTML markup</li><li><Check size={14} /> Page title and metadata</li><li><Check size={14} /> Browser-readable structure</li></ul><a href="/traditional">Inspect HTML <ArrowRight size={15} /></a></article>
        <article className="home-feature-card"><div className="home-feature-icon"><Braces size={21} /></div><span className="home-card-label">05 / CSS EXPLORER</span><h3>See the styling behind the page</h3><p>Collect accessible linked stylesheets and inline styles to understand how a public page is presented.</p><ul><li><Check size={14} /> Linked CSS discovery</li><li><Check size={14} /> Inline style inspection</li><li><Check size={14} /> Original public style references</li></ul><a href="/traditional">Explore styles <ArrowRight size={15} /></a></article>
        <article className="home-feature-card"><div className="home-feature-icon"><FolderTree size={21} /></div><span className="home-card-label">06 / ASSET COLLECTOR</span><h3>Gather public page assets</h3><p>Find browser-accessible images and linked resources associated with a public website or its source repository.</p><ul><li><Check size={14} /> Public asset references</li><li><Check size={14} /> Organized source archive</li><li><Check size={14} /> Preserved folder structure</li></ul><a href="/traditional">Collect assets <ArrowRight size={15} /></a></article>
        <article className="home-feature-card"><div className="home-feature-icon"><EyeIcon size={21} /></div><span className="home-card-label">07 / LIVE PREVIEW</span><h3>Inspect and refine your output</h3><p>Inspect editable output and preview supported changes on the dedicated tool page before exporting.</p><ul><li><Check size={14} /> tool page-based inspection</li><li><Check size={14} /> Editable markup</li><li><Check size={14} /> Isolated preview workflow</li></ul><a href="/traditional">Open the preview tool page <ArrowRight size={15} /></a></article>
        <article className="home-feature-card"><div className="home-feature-icon"><ShieldCheck size={21} /></div><span className="home-card-label">08 / SOURCE EXPORT</span><h3>Take the project with you</h3><p>Export gathered public resources or a public repository as a ZIP, with a clear distinction between captured output and original source.</p><ul><li><Check size={14} /> Downloadable ZIP output</li><li><Check size={14} /> Clear coverage report</li><li><Check size={14} /> No paid API requirement</li></ul><a href="/traditional">Export a project <ArrowRight size={15} /></a></article>
      </div>
      <div className="home-honesty-note"><ShieldCheck size={17} /><p><strong>A quick but important distinction:</strong> a deployed website does not reveal its private server code or original development files. For the full project, use the source repository or files you own and have permission to access.</p></div>
    </section>

    <section className="home-section home-steps" id="how-it-works">
      <div className="section-heading"><span>THE WORKFLOW</span><h2>Less guessing. More building.</h2><p>Get from a starting point to something you can actually inspect.</p></div>
      <div className="home-step-grid">
        <article><span>01</span><div><Globe2 size={19} /></div><h3>Choose your source</h3><p>Enter a public website URL or a public GitHub repository URL, depending on the files you need.</p></article>
        <article><span>02</span><div><FileCode2 size={19} /></div><h3>Inspect the output</h3><p>Read accessible page code on its dedicated tool page, or unpack the source archive to browse the complete tracked project.</p></article>
        <article><span>03</span><div><FolderTree size={19} /></div><h3>Keep the structure</h3><p>Download files in an organized ZIP instead of manually copying one asset at a time.</p></article>
      </div>
    </section>

    <section className="home-banner">
      <div className="home-banner-icon"><Zap size={23} /></div><div><span>YOUR NEXT STEP</span><h2>Explore a website. Reconstruct its pages. Start building.</h2><p>No mandatory paid AI APIs. Start with public pages and export an editable React project.</p></div><a href="/traditional">Choose a method <ArrowRight size={16} /></a>
    </section>
    <section className="home-section home-faq" id="faq">
      <div className="section-heading"><span>GOOD TO KNOW</span><h2>What FreeCode can — and cannot — retrieve.</h2><p>Clear expectations make for a better workflow.</p></div>
      <div className="faq-grid">
        <article><h3>Can FreeCode recreate the exact original website?</h3><p>It can get closer by discovering pages and reusing accessible styles and assets, but private backend code, scripts, login-only pages, and complex interactions cannot be guaranteed from a public URL.</p></article>
        <article><h3>What does reconstruction export?</h3><p>A new React project with discovered routes, captured page markup, inline styles, references to public stylesheets and assets, and a report describing coverage and limitations.</p></article>
        <article><h3>Does a repository archive include everything?</h3><p>It includes the repository's tracked files at its default branch, not Git history, private secrets, generated dependencies, or untracked local files.</p></article>
        <article><h3>Is FreeCode free?</h3><p>Yes. FreeCode is designed to be a useful, free-first tool without paid feature walls. Public website access and hosting limits still apply.</p></article>
      </div>
    </section>
  </>;
}

function ToolPage({ mode }) {
  const workspace = useWebsiteWorkspace();
  const config = {
    traditional: { eyebrow: "TRADITIONAL EXTRACTION", title: <>Read the page.<br /><span>Collect its public files.</span></>, copy: "Fetch the original HTML response, discover public CSS and assets, edit the accessible markup, preview safely, and export the files.", component: <><UrlAnalyzerForm url={workspace.url} setUrl={workspace.setUrl} analyze={workspace.analyze} busy={workspace.busy} error={workspace.error} />{workspace.hasGenerated && workspace.page && <WorkspacePanel {...workspace} />}</> },
    github: { eyebrow: "GITHUB REPOSITORY METHOD", title: <>Get the source.<br /><span>Keep the real folder tree.</span></>, copy: "Download the tracked files from a public GitHub repository. This is the best option when you need the original project rather than a reconstruction.", component: <RepoImportPanel /> },
    reconstruct: { eyebrow: "WEBSITE RECONSTRUCTION", title: <>Study the website.<br /><span>Build a new project.</span></>, copy: "Discover accessible routes, capture public resources, inspect interface clues, and export a new React project with an honest coverage report.", component: <ReconstructionPanel /> }
  }[mode];
  return <section className="tool-page">
    <div className="workspace-route-hero">
      <div className="hero-eyebrow"><Sparkles size={14} /> {config.eyebrow}</div>
      <h1>{config.title}</h1>
      <p>{config.copy}</p>
      <div className="hero-trust"><span><ShieldCheck size={14} /> Free to use</span><span><Code2 size={14} /> Editable output</span><span><FolderTree size={14} /> Public sources only</span></div>
    </div>
    <div className="workspace-route-content">{config.component}
      {mode === "traditional" && <aside className="source-research-note"><strong>What “View Page Source” actually gives you</strong><p>In Chrome, right-click the page and choose <em>View Page Source</em> to inspect the original HTML response. For separate CSS, JavaScript, images and fonts, open DevTools → Sources and inspect the public resources the browser loaded. Neither method reveals private server code or the entire original project automatically.</p><p>FreeCode fetches what is publicly accessible; it cannot recover files the server never exposes.</p></aside>}
    </div>
    <div className="tool-switcher" aria-label="Choose another method">
      <a href="/traditional" className={mode === "traditional" ? "active" : ""}><Globe2 size={16}/> Traditional extraction</a>
      <a href="/github" className={mode === "github" ? "active" : ""}><Github size={16}/> GitHub repository</a>
      <a href="/reconstruct" className={mode === "reconstruct" ? "active" : ""}><Sparkles size={16}/> Reconstruction</a>
    </div>
  </section>;
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const mode = path === "/github" ? "github" : path === "/reconstruct" ? "reconstruct" : "traditional";
  const isTool = ["/traditional", "/github", "/reconstruct", "/workspace"].includes(path);
  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <AppHeader isWorkspace={isTool} />
    <main>{isTool ? <ToolPage mode={mode} /> : <HomePage />}</main>
    <AppFooter />
  </div>;
}
