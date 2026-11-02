// Captures des pages TAMILA pour la preuve 1:1 (02/11/2026).
// node outils/tam-capture.mjs <url> <largeur> <sombre|clair> <sortie.png> [hauteur] [--action js]
// Fenêtre largeur×hauteur (900 à 1440, 844 à 390), deviceScaleFactor 1, colorScheme et thème
// d'espace2 posés avant le chargement (localStorage espace2.theme), données d'exemple.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [url, l, theme, sortie, h, ...reste] = process.argv.slice(2);
const largeur = Number(l);
const hauteur = Number(h) || (largeur <= 400 ? 844 : 900);
const iAction = reste.indexOf("--action");
const action = iAction >= 0 ? reste[iAction + 1] : null;
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, colorScheme: theme === "clair" ? "light" : "dark" });
await ctx.addInitScript((t) => {
  try {
    localStorage.setItem("espace2.theme", t === "clair" ? "clair" : "sombre");
    localStorage.setItem("espace.source", "exemple");
  } catch {}
}, theme);
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
if (action) {
  await page.evaluate(action);
  await page.waitForTimeout(500);
}
await page.screenshot({ path: sortie });
await nav.close();
console.log(sortie);
