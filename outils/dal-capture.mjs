// Preuve 1:1 des pages Daliro dans le conteneur cloud (02/11/2026) : capture d'une
// sous-page à 1440×900 (deviceScaleFactor 1) et à 390×844, thèmes sombre et clair.
// node outils/dal-capture.mjs <chemin> <prefixe-sortie> [--largeurs 1440,390] [--themes sombre,clair]
//   [--clic "<sélecteur>"] [--attente ms] [--pleine]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const drapeau = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const largeurs = opt("--largeurs", "1440,390").split(",").map(Number);
const themes = opt("--themes", "sombre,clair").split(",");
const clics = []; for (let c; (c = opt("--clic", null)); ) clics.push(c);
const attente = Number(opt("--attente", "600"));
const pleine = drapeau("--pleine");
const [chemin, sortie] = args;
const base = process.env.DAL_BASE || "http://localhost:3000";
const navigateur = await chromium.launch();
for (const l of largeurs) for (const t of themes) {
  const ctx = await navigateur.newContext({ viewport: { width: l, height: l === 390 ? 844 : 900 }, deviceScaleFactor: 1, colorScheme: t === "sombre" ? "dark" : "light" });
  await ctx.addInitScript((th) => { try { localStorage.setItem("espace2.theme", th); localStorage.setItem("espace.source", "exemple"); } catch {} }, t === "sombre" ? "sombre" : "clair");
  const p = await ctx.newPage();
  await p.goto(base + chemin, { waitUntil: "networkidle", timeout: 120000 });
  await p.evaluate(() => document.fonts.ready);
  for (const c of clics) { await p.click(c); await p.waitForTimeout(250); }
  await p.waitForTimeout(attente);
  await p.mouse.move(1, 899);
  const f = `${sortie}-${l}-${t}.png`;
  await p.screenshot({ path: f, fullPage: pleine });
  console.log(f);
  await ctx.close();
}
await navigateur.close();
