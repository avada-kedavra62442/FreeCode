import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const source = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");
const icons = [
  ["apple-touch-icon.png", 180],
  ["apple-touch-icon-120.png", 120],
  ["apple-touch-icon-152.png", 152],
  ["apple-touch-icon-167.png", 167],
  ["apple-touch-icon-180.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["favicon-32.png", 32],
  ["favicon-16.png", 16],
];

for (const [filename, size] of icons) {
  const png = new Resvg(source, {
    fitTo: { mode: "width", value: size },
  }).render().asPng();
  await writeFile(new URL(`../public/${filename}`, import.meta.url), png);
}

console.log(`Generated ${icons.length} FreeCode icons from public/favicon.svg`);
