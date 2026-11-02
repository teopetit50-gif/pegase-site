// Mesure au style calculé d'une sous-page Daliro (02/11/2026) : pour chaque sélecteur,
// boîte (relative à la carte .dal-carte décalée sur l'origine de Linear 244,8) et styles utiles.
// node outils/dal-mesure.mjs <chemin> "<sel1>" "<sel2>" ... [--largeur 1440] [--theme sombre] [--clic sel]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const largeur = Number(opt("--largeur", "1440"));
const theme = opt("--theme", "sombre");
const clics = []; for (let c; (c = opt("--clic", null)); ) clics.push(c);
const brut = args.includes("--brut"); if (brut) args.splice(args.indexOf("--brut"), 1);
const [chemin, ...sels] = args;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: largeur, height: largeur === 390 ? 844 : 900 }, colorScheme: theme === "sombre" ? "dark" : "light" });
await ctx.addInitScript((th) => { try { localStorage.setItem("espace2.theme", th); localStorage.setItem("espace.source", "exemple"); } catch {} }, theme);
const p = await ctx.newPage();
await p.goto((process.env.DAL_BASE || "http://localhost:3000") + chemin, { waitUntil: "networkidle", timeout: 120000 });
for (const c of clics) { await p.click(c); await p.waitForTimeout(250); }
await p.waitForTimeout(300);
const r = await p.evaluate(({ sels, brut }) => {
  const carte = document.querySelector(".dal-carte")?.getBoundingClientRect();
  const ox = brut || !carte ? 0 : carte.left - 244, oy = brut || !carte ? 0 : carte.top - 8;
  const out = [];
  for (const s of sels) {
    const els = [...document.querySelectorAll(s)].slice(0, 6);
    if (!els.length) out.push(`${s} : ABSENT`);
    for (const e of els) {
      const q = e.getBoundingClientRect(), c = getComputedStyle(e);
      out.push(`${s} @${+(q.left - ox).toFixed(1)},${+(q.top - oy).toFixed(1)} ${+q.width.toFixed(1)}×${+q.height.toFixed(1)} | ${c.fontSize}/${c.fontWeight}/${c.lineHeight} ls ${c.letterSpacing} | c ${c.color} | bg ${c.backgroundColor} | p ${c.padding} | r ${c.borderRadius} | bd ${c.borderTopWidth} ${c.borderTopColor} | gap ${c.gap} | "${(e.textContent || "").trim().slice(0, 30)}"`);
    }
  }
  return out;
}, { sels, brut });
console.log(r.join("\n"));
await b.close();
