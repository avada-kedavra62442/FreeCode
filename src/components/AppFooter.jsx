import { FaGithub, FaEnvelope, FaLinkedin } from "react-icons/fa";

const OWNER_GITHUB = "https://github.com/avada-kedavra62442/";
const FREEPDF_URL = "https://free-pdf-delta.vercel.app/";
const EMAIL = "aarav.krish62442@gmail.com";
const LINKEDIN = "https://www.linkedin.com/in/aarav-krish-665702440/";

export default function AppFooter() {
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-brand-block">
        <a className="footer-brand-row" href="/" aria-label="FreeCode home"><img className="footer-favicon" src="/favicon.svg" alt="" aria-hidden="true" /><span className="footer-brand-name">Free<span>Code</span></span></a>
        <p className="footer-tagline">Useful software.<br />Without the nonsense.</p>
        <div className="footer-status"><span className="footer-status-dot" />Building useful things</div>
        <div className="footer-socials">
          <a className="footer-social-link" href={OWNER_GITHUB} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub"><FaGithub /></a>
          <a className="footer-social-link" href={`mailto:${EMAIL}`} aria-label="Email" title="Email"><FaEnvelope /></a>
          <a className="footer-social-link" href={LINKEDIN} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><FaLinkedin /></a>
        </div>
      </div>
      <div className="footer-column"><span className="footer-heading">PRODUCTS</span><a href="/">FreeCode home</a><a href="/workspace">FreeCode workspace</a><a href={FREEPDF_URL} target="_blank" rel="noopener noreferrer">FreePDF ↗</a></div>
      <div className="footer-column"><span className="footer-heading">EXPLORE</span><a href="/#features">Features</a><a href="/#how-it-works">How it works</a><a href="/#faq">FAQs</a></div>
      <div className="footer-column"><span className="footer-heading">MORE</span><a href={`mailto:${EMAIL}?subject=FreeCode%20Feedback`}>Send feedback</a><a href={OWNER_GITHUB} target="_blank" rel="noopener noreferrer">Developer profile ↗</a><span className="footer-note">Free tools. No paywalls. No nonsense.</span></div>
    </div>
    <div className="footer-bottom"><span>© 2026 FreeCode. All rights reserved.</span><span className="footer-line" /><span>BUILT FOR THE WEB · BUILT TO BE USEFUL</span></div>
  </footer>;
}
