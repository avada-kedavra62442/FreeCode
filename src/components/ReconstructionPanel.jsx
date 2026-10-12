import { useState } from "react";
import { ArrowDownToLine, Eye, FileCode2, Globe2, LoaderCircle, Route, ShieldCheck, Sparkles } from "lucide-react";
import { saveBlob } from "../services/websiteService.js";
export default function ReconstructionPanel() {
 const [url,setUrl]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[report,setReport]=useState(null);
 async function reconstruct(event) {
  event.preventDefault(); setError(""); setReport(null); let normalized;
  try { const value=url.trim(); if(!value) throw new Error("Enter a public website URL first."); normalized=new URL(/^https?:\/\//i.test(value)?value:"https://"+value); if(!["http:","https:"].includes(normalized.protocol)) throw new Error("Only public HTTP and HTTPS websites are supported."); }
  catch(e){setError(e.message||"Enter a valid public website URL.");return;}
  setBusy(true);
  try {
   const response=await fetch("/api/reconstruct",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:normalized.href})});
   if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||"Could not reconstruct this website.");}
   const blob=await response.blob(); if(!blob.size||!/application\/zip/i.test(blob.type)) throw new Error("The server did not return a valid React project ZIP.");
   const details={pages:Number(response.headers.get("X-FreeCode-Pages")||0),stylesheets:Number(response.headers.get("X-FreeCode-Stylesheets")||0),assets:Number(response.headers.get("X-FreeCode-Assets")||0),failures:Number(response.headers.get("X-FreeCode-Failures")||0)};
   saveBlob(blob,normalized.hostname.replace(/[^a-z0-9.-]/gi,"-")+"-reconstructed-react.zip");setReport(details);
  } catch(e){setError(e.message||"Something went wrong during reconstruction.");} finally{setBusy(false);}
 }
 return <section className="reconstruction-card" id="reconstruct" aria-labelledby="reconstruction-title">
  <div className="reconstruction-card-top"><div className="reconstruction-icon"><Sparkles size={20}/></div><div><span className="repo-kicker">WEBSITE RECONSTRUCTION ENGINE</span><h2 id="reconstruction-title">Rebuild a website from its live pages</h2><p>Explore linked routes and generate a fresh React project designed to preserve the original appearance as closely as accessible HTML and public styles allow.</p></div></div>
  <form className="reconstruction-form" onSubmit={reconstruct}><label className="reconstruction-input"><Globe2 size={17}/><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" aria-label="Website to reconstruct" inputMode="url" autoComplete="url"/></label><button type="submit" className="reconstruction-button" disabled={busy}>{busy?<><LoaderCircle className="spin" size={16}/> Exploring pages…</>:<><Sparkles size={16}/> Reconstruct & export ZIP <ArrowDownToLine size={15}/></>}</button></form>
  {error&&<p className="reconstruction-error" role="alert">{error}</p>}
  {busy&&<div className="reconstruction-progress"><LoaderCircle className="spin" size={17}/><div><strong>Mapping routes and collecting page structure</strong><span>Checking robots.txt and sitemaps, then following same-site links. Small sites work best.</span></div></div>}
  {report&&<div className="reconstruction-report" role="status"><div className="reconstruction-report-title"><ShieldCheck size={18}/><div><strong>React project exported</strong><span>Your ZIP download should be ready.</span></div></div><div className="reconstruction-metrics"><span><Route size={15}/> {report.pages} pages</span><span><FileCode2 size={15}/> {report.stylesheets} stylesheets</span><span><Eye size={15}/> {report.assets} asset references</span></div>{report.failures>0&&<p>{report.failures} page(s) could not be retrieved. Check the reconstruction report inside the ZIP.</p>}</div>}
  <div className="reconstruction-limit"><ShieldCheck size={14}/><p><strong>Visual-first, honest output.</strong> Original public stylesheets and image URLs are preserved where discoverable; page HTML is converted into route-aware React data. Original scripts are omitted for safety, so dynamic behavior may need rebuilding. The ZIP includes a report listing discovered routes and limitations.</p></div>
 </section>;
}