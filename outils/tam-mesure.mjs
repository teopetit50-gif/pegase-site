// Mesure au getBoundingClientRect des éléments d'une page TAMILA, relativement à la carte (02/11/2026).
// node outils/tam-mesure.mjs <url> <largeur> <sélecteur>… (le 1er élément trouvé pour chaque sélecteur)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [url, l, ...sel] = process.argv.slice(2);
const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: Number(l), height: Number(l) <= 400 ? 844 : 900 } });
await page.addInitScript(() => localStorage.setItem("espace.source", "exemple"));
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(500);
const r = await page.evaluate((sel) => {
  const carte = document.querySelector(".tam-carte, .tamp-carte")?.getBoundingClientRect();
  return sel.map((s) => {
    const e = document.querySelector(s);
    if (!e) return `${s} : absent`;
    const b = e.getBoundingClientRect();
    const c = getComputedStyle(e);
    return `${s} : x ${(b.x - (carte?.x ?? 0)).toFixed(1)} y ${(b.y - (carte?.y ?? 0)).toFixed(1)} ${b.width.toFixed(1)}×${b.height.toFixed(1)} · ${c.fontSize}/${c.fontWeight}/${c.lineHeight} ${c.color}`;
  });
}, sel);
console.log(r.join("\n"));
await nav.close();
