// Cherche ce qui fait défiler une page TAMILA de côté (02/11/2026) : largeur du document et éléments qui dépassent
// la fenêtre. node outils/tam-deborde.mjs <url> <largeur>
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const [url, l] = process.argv.slice(2);
const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: Number(l), height: 844 } });
await page.addInitScript(() => localStorage.setItem("espace.source", "exemple"));
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(500);
console.log(
  await page.evaluate(() => {
    const d = document.documentElement;
    const out = [`scrollWidth ${d.scrollWidth} clientWidth ${d.clientWidth}`];
    for (const e of document.querySelectorAll("body *")) {
      const r = e.getBoundingClientRect();
      if (r.right > d.clientWidth + 1 && r.width > 0 && out.length < 16) out.push(`${e.tagName.toLowerCase()}.${String(e.className).split(" ").slice(0, 2).join(".")} droite ${Math.round(r.right)} largeur ${Math.round(r.width)}`);
    }
    return out.join("\n");
  }),
);
await nav.close();
