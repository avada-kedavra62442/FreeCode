export const FORMATS = [
  { id: "html", label: "HTML", detail: "Structure" },
  { id: "css", label: "CSS", detail: "Styles" },
  { id: "react", label: "React", detail: "Component" },
  { id: "tailwind", label: "Tailwind", detail: "Utilities" }
];

export function makeReactOutput(markup, title) {
  const safeTitle = String(title || "RecreatedPage").replace(/[^a-zA-Z0-9_$]/g, "") || "RecreatedPage";
  return 'import React from "react";\nimport "./styles.css";\n\nexport default function ' + safeTitle + '() {\n  const pageMarkup = ' + JSON.stringify(markup) + ';\n\n  return (\n    <main className="recreated-page" dangerouslySetInnerHTML={{ __html: pageMarkup }} />\n  );\n}\n';
}
export function makeTailwindOutput(markup) {
  return '<!-- Tailwind CSS starter. Review extracted CSS and replace it with utilities for a closer recreation. -->\n<div class="min-h-screen w-full bg-white text-slate-900">\n  <div class="mx-auto w-full">\n' + markup + '\n  </div>\n</div>\n';
}
export function buildPreviewDocument(markup, css) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box}html,body{margin:0;min-height:100%;}' + (css || "") + '</style></head><body>' + (markup || "") + '</body></html>';
}
export function prettyMarkup(markup) {
  return String(markup || "").replace(/>\s*</g, ">\n<").replace(/\n{3,}/g, "\n\n").trim();
}