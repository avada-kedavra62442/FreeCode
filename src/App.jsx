import { Code2, Eye, ShieldCheck, Sparkles } from "lucide-react";
import AppHeader from "./components/AppHeader.jsx";
import AppFooter from "./components/AppFooter.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import UrlAnalyzerForm from "./components/UrlAnalyzerForm.jsx";
import WorkspacePanel from "./components/WorkspacePanel.jsx";
import { useWebsiteWorkspace } from "./hooks/useWebsiteWorkspace.js";

export default function App() {
  const workspace = useWebsiteWorkspace();
  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <AppHeader />
    <main>
      <section className="hero" id="workspace">
        <div className="hero-eyebrow"><Sparkles size={14} /> THE WEBSITE-TO-CODE WORKSPACE</div>
        <h1>See a website.<br /><span>Build its starting point.</span></h1>
        <p className="hero-copy">Enter a public website URL. FreeCode extracts editable code and can bundle accessible pages and assets into a ZIP so you can inspect the site files.</p>
        <div className="hero-trust"><span><ShieldCheck size={14} /> No paid APIs</span><span><Code2 size={14} /> Editable output</span><span><Eye size={14} /> Live preview</span></div>
      </section>
      <UrlAnalyzerForm url={workspace.url} setUrl={workspace.setUrl} analyze={workspace.analyze} busy={workspace.busy} error={workspace.error} />
      {workspace.hasGenerated && workspace.page && <WorkspacePanel {...workspace} />}
      <HowItWorks />
    </main>
    <AppFooter />
  </div>;
}