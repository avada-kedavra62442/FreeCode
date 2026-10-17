export default function AppFooter() {
  return <footer className="ft-universal-footer">
    <div className="ft-footer-main">
      <div className="ft-footer-brand-block">
        <a className="ft-footer-brand" href="/" aria-label="FreeCode home"><img className="ft-footer-mark" src="/favicon.svg" alt="" aria-hidden="true"/><span>Free<span className="ft-footer-accent">Code</span><small>FREE TOOLZ PROJECT</small></span></a>
        <p>Useful software. Without the nonsense.</p><span className="ft-footer-status">● Building useful things</span>
      </div>
      <div className="ft-footer-column"><b>Products</b><a href="/">FreeCode</a><a href="https://free-toolz.vercel.app/">FreeToolz hub ↗</a></div>
      <div className="ft-footer-column"><b>Tools &amp; information</b><a href="/#tools">Explore tools</a><a href="/#privacy">Privacy &amp; local processing</a><a href="mailto:aarav.krish62442@gmail.com?subject=FreeCode%20Feedback">Feedback</a></div>
      <div className="ft-footer-column"><b>Connect</b><a href="https://github.com/avada-kedavra62442/FreeCode" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="mailto:aarav.krish62442@gmail.com">Email ↗</a><a href="https://www.linkedin.com/in/aarav-krish-665702440/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></div>
    </div><div className="ft-footer-bottom"><span>© {new Date().getFullYear()} FreeToolz · FreeCode</span><span>FREE FOREVER · NO ADS · NO PAYWALLS</span></div>
  </footer>;
}