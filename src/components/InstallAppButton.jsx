import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [appleMobile, setAppleMobile] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || "";
    setAppleMobile(/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setInstalled(window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true);
    const onPrompt = (event) => { event.preventDefault(); setPromptEvent(event); };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (installed) return null;
  async function install() {
    if (promptEvent) { await promptEvent.prompt(); await promptEvent.userChoice; setPromptEvent(null); }
    else setHelpOpen(true);
  }
  return <>
    <button className="install-app-button" type="button" onClick={install} aria-label="Install FreeCode">{promptEvent ? <Download size={14} /> : <Smartphone size={14} />} <span>Install</span></button>
    {helpOpen && <div className="install-help-backdrop" onClick={() => setHelpOpen(false)}>
      <section className="install-help" role="dialog" aria-modal="true" aria-labelledby="install-help-title" onClick={(event) => event.stopPropagation()}>
        <button className="install-help-close" type="button" onClick={() => setHelpOpen(false)} aria-label="Close install instructions"><X size={17} /></button>
        <div className="install-help-icon"><Smartphone size={22} /></div><h2 id="install-help-title">Install FreeCode</h2>
        {appleMobile ? <ol><li>Open this site in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> icon.</li><li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li></ol> : <ol><li>Open FreeCode in Chrome or a supported browser.</li><li>Open the browser menu.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li></ol>}
        <p>The app shell may open from your home screen, but website analysis and ZIP export need internet access.</p>
      </section>
    </div>}
  </>;
}