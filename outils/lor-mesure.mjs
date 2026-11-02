#!/usr/bin/env node
/* LORANI — mesurer des éléments d'une sous-page (getBoundingClientRect et style calculé), 02/11/2026.
   node outils/lor-mesure.mjs <url> <largeur> <hauteur> <dark|light> <sélecteur>…
   Les x et y sont donnés depuis le coin de la carte (x 304, y 48 dans l'espace 2) pour se lire contre le relevé. */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const req = createRequire(import.meta.url);
let pw;
try { pw = req("playwright"); } catch { pw = req(`${execSync("npm root -g").toString().trim()}/playwright`); }
const [url, l, h, theme, ...sels] = process.argv.slice(2);
const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: +l, height: +h }, deviceScaleFactor: 1, colorScheme: theme === "light" ? "light" : "dark" });
await p.goto(url, { waitUntil: "networkidle", timeout: 180000 });
await p.waitForTimeout(800);
for (const s of sels) {
  const r = await p.evaluate((s) => [...document.querySelectorAll(s)].slice(0, 3).map((e) => {
    const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
    return `${Math.round((r.x - 304) * 10) / 10},${Math.round((r.y - 48) * 10) / 10} ${Math.round(r.width * 10) / 10}x${Math.round(r.height * 10) / 10} fs ${c.fontSize} lh ${c.lineHeight} gap ${c.columnGap} gtc ${c.gridTemplateColumns.slice(0, 80)}`;
  }), s);
  console.log(s, "→", r.join(" | ") || "absent");
}
await b.close();
