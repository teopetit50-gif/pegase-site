// VARELO — preuve 1:1 (02/11/2026) : capture une sous-page de /espace2/varelo à la taille
// des captures de référence (1440×900 ou 390×844, deviceScaleFactor 1), en données
// d'exemple, thème sombre ou clair, et note la place de la carte `.var-carte`.
//
// node outils/var-capture.mjs <route> <sombre|clair> <largeur> <sortie.png> [--action "js"]
//   ex. node outils/var-capture.mjs /espace2/varelo sombre 1440 /tmp/x.png
// Variable BASE : http://localhost:3100 par défaut (npx next dev -p 3100).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const [route, theme, largeur, sortie, ...reste] = process.argv.slice(2);
const i = reste.indexOf("--action");
const action = i >= 0 ? reste[i + 1] : null;
const base = process.env.BASE || "http://localhost:3100";
const l = Number(largeur);
const h = l <= 400 ? 844 : 900;

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: 1, colorScheme: theme === "clair" ? "light" : "dark" });
await ctx.addInitScript((t) => {
  try {
    localStorage.setItem("espace2.theme", t);
    localStorage.setItem("espace.source", "exemple");
  } catch {}
}, theme);
const page = await ctx.newPage();
await page.goto(base + route, { waitUntil: "networkidle", timeout: 180000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
if (action) {
  await page.evaluate(action);
  await page.waitForTimeout(500);
}
const carte = await page.evaluate(() => {
  const c = document.querySelector(".var-carte");
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, l: r.width, h: r.height };
});
await page.screenshot({ path: sortie });
console.log(JSON.stringify({ sortie, carte }));
await nav.close();
