import { ArrowRight } from "lucide-react";
import InstallAppButton from "./InstallAppButton.jsx";
export default function AppHeader({ isWorkspace = false }) {
  return <header className="topbar">
    <a className="brand" href="/" aria-label="FreeCode home"><span className="brand-icon"><img src="/favicon.svg" alt="" /></span><span className="brand-word">Free<span>Code</span></span><span className="brand-beta">BETA</span></a>
    <nav className="top-nav" aria-label="Main navigation"><a className={isWorkspace ? "nav-active" : ""} href="/workspace">Workspace</a><a href={isWorkspace ? "/#how-it-works" : "#how-it-works"}>How it works</a><a href={isWorkspace ? "/#features" : "#features"}>Features</a></nav>
    <div className="topbar-right"><span className="free-pill"><span /> Always free</span>{isWorkspace ? <a className="header-home-link" href="/">Home <ArrowRight size={13} /></a> : <InstallAppButton />}</div>
  </header>;
}
