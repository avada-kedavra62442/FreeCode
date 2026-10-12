import { useState } from "react";
import { ArrowDownToLine, Github, FolderTree, ShieldCheck } from "lucide-react";

export default function RepoImportPanel() {
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function importRepository(event) {
    event.preventDefault();
    setError("");
    const value = repoUrl.trim();
    let parsed;
    try { parsed = new URL(value); } catch { setError("Paste a full GitHub repository URL."); return; }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.hostname.toLowerCase() !== "github.com" || parts.length !== 2) {
      setError("Use a URL like https://github.com/owner/repository.");
      return;
    }
    setBusy(true);
    window.location.assign("/api/repository?url=" + encodeURIComponent(value));
    window.setTimeout(() => setBusy(false), 1500);
  }

  return <section className="repo-import-card" id="repository" aria-labelledby="repo-import-title">
    <div className="repo-import-icon"><Github size={20} /></div>
    <div className="repo-import-copy">
      <span className="repo-kicker">FULL SOURCE PROJECT</span>
      <h2 id="repo-import-title">Need the actual code files?</h2>
      <p>Enter a public GitHub repository to download its complete tracked project as a ZIP — including folders such as <code>src</code>, <code>api</code>, configuration files, and dotfiles. Not just the deployed <code>public</code> assets.</p>
      <form className="repo-import-form" onSubmit={importRepository}>
        <div className="repo-input-wrap"><Github size={17} /><input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repository" aria-label="Public GitHub repository URL" inputMode="url" autoComplete="url" /></div>
        <button type="submit" className="repo-import-button" disabled={busy}><ArrowDownToLine size={16} /> {busy ? "Opening download…" : "Get all source files"}</button>
      </form>
      {error && <p className="repo-import-error" role="alert">{error}</p>}
      <div className="repo-import-footnote"><ShieldCheck size={14} /> Public repositories only. Git history, private files, and generated dependencies such as <code>node_modules</code> are not included in GitHub's source archive.</div>
    </div>
    <div className="repo-import-aside"><FolderTree size={21} /><strong>Full folder structure</strong><span>Not only public assets</span></div>
  </section>;
}
