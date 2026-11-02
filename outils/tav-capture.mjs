// Captures des pages Tavaro pour la preuve 1:1 (02/11/2026).
// node outils/tav-capture.mjs <url> <sortie-prefixe> [largeurs=1440,390] [themes=sombre,clair] [--clic=<sélecteur>]
// 1440×900 (390×844) à deviceScaleFactor 1, colorScheme sombre / clair, source « exemple ».
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [url, sortie, l = "1440,390", t = "sombre,clair", ...reste] = process.argv.slice(2);
const clic = reste.find((x) => x.startsWith("--clic="))?.slice(7);
const navigateur = await chromium.launch();
for (const largeur of l.split(",").map(Number)) {
  for (const theme of t.split(",")) {
    const page = await navigateur.newPage({ viewport: { width: largeur, height: largeur === 390 ? 844 : 900 }, deviceScaleFactor: 1, colorScheme: theme === "sombre" ? "dark" : "light" });
    await page.addInitScript((th) => { try { localStorage.setItem("espace.source", "exemple"); localStorage.setItem("espace2.theme", th); } catch {} }, theme === "sombre" ? "sombre" : "clair");
    await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(1500);
    if (clic) { await page.click(clic); await page.waitForTimeout(600); }
    await page.mouse.move(1, 899);
    await page.screenshot({ path: `${sortie}-${largeur}-${theme}.png` });
    await page.close();
  }
}
await navigateur.close();
