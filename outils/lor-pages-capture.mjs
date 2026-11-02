#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   LORANI — captures des pages « Questions et réponses » et « À viser »
   pour la superposition, et recette aux cinq largeurs (02/11/2026).

   node outils/lor-pages-capture.mjs <base> <dossier>
     base : http://localhost:3100 (npx next dev -p 3100 lancé)
   Écrit <dossier>/<page>-<largeur>-<theme>.png et signale tout défilement
   de côté à 390 / 768 / 1024 / 1440 / 1700.

   Fenêtres de superposition : Plain (carte 1079 × 884 à x 353, y 8) →
   1391 × 940 (carte de l'espace 2 à x 304, y 48 ; marges 8 8 8 0) ;
   Linear (carte 1188 × 856 à x 244, y 8) → 1492 × 904 (lor-capture.mjs).
   ══════════════════════════════════════════════════════════════════════ */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [base = "http://localhost:3100", dossier = "/tmp/lor-captures"] = process.argv.slice(2);
const PAGES = [
  { nom: "questions", chemin: "/espace2/lorani/questions", sup: [1391, 948] },
  { nom: "questions-fil", chemin: "/espace2/lorani/questions?point=00000000-0000-4000-8000-00000000a202", sup: [1391, 948] },
  { nom: "a-viser", chemin: "/espace2/lorani/a-viser", sup: [1492, 904] },
];
const seules = process.env.PAGES ? process.env.PAGES.split(",") : null;
const b = await chromium.launch();
for (const p of PAGES.filter((x) => !seules || seules.includes(x.nom))) {
  for (const theme of ["dark", "light"]) {
    for (const [w, h, suffixe] of [[...p.sup, "sup"], [390, 844, "390"]]) {
      const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: theme });
      await page.goto(base + p.chemin, { waitUntil: "networkidle", timeout: 240000 });
      await page.evaluate(() => document.documentElement.removeAttribute("data-v2-theme"));
      await page.mouse.move(1, h - 1);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${dossier}/${p.nom}-${suffixe}-${theme === "dark" ? "sombre" : "clair"}.png` });
      await page.close();
    }
  }
  for (const w of [390, 768, 1024, 1440, 1700]) {
    const page = await b.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(base + p.chemin, { waitUntil: "networkidle", timeout: 240000 });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const trop = de.scrollWidth - de.clientWidth;
      let pire = null;
      if (trop > 0) for (const e of document.querySelectorAll("body *")) { const x = e.getBoundingClientRect(); if (x.right > de.clientWidth + 1 && (!pire || x.right > pire.r)) pire = { r: Math.round(x.right), c: e.className?.toString().slice(0, 60) }; }
      return { trop, pire };
    });
    console.log(p.nom, w, r.trop > 0 ? `DÉBORDE de ${r.trop} ${JSON.stringify(r.pire)}` : "sans défilement de côté");
    await page.close();
  }
}
await b.close();
