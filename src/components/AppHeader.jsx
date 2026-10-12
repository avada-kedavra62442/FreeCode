import InstallAppButton from "./InstallAppButton.jsx";
export default function AppHeader() {
  return <header className="topbar">
    <a className="brand" href="/" aria-label="FreeCode home"><span className="brand-icon"><img src="/favicon.svg" alt="" /></span><span className="brand-word">Free<span>Code</span></span><span className="brand-beta">BETA</span></a>
    <nav className="top-nav" aria-label="Main navigation"><a className="nav-active" href="#workspace">Workspace</a><a href="#how-it-works">How it works</a></nav>
    <div className="topbar-right"><span className="free-pill"><span /> Always free</span><InstallAppButton /></div>
  </header>;
}