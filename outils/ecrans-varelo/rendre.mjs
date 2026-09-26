/* Photographie les écrans de ecrans.html, un par un, à la densité 2.

     node outils/ecrans-varelo/rendre.mjs [nom…]

   Chaque plan de travail `[data-ecran="nom"]` est isolé (?seul=nom), la
   fenêtre prend sa taille CSS exacte, et la capture sort en PNG (fond
   transparent pour les écrans marqués `data-transparent`), puis en WebP
   dans public/secteurs-groupes/ecrans/<nom>.webp. Chromium : celui de
   Playwright, piloté en CDP brut (voir la skill methode-site, chrome.mjs).
   Sans argument : tous les écrans. */
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ouvrirSession } from "./chrome.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(ICI, "../../public/secteurs-groupes/ecrans");
const TMP = join(ICI, ".rendus");
mkdirSync(SORTIE, { recursive: true });
mkdirSync(TMP, { recursive: true });

const html = readFileSync(join(ICI, "ecrans.html"), "utf8");
const tous = [...html.matchAll(/data-ecran="([^"]+)"/g)].map((m) => m[1]);
const voulus = process.argv.slice(2).length ? process.argv.slice(2) : tous;

const s = await ouvrirSession({ largeur: 1600, hauteur: 1000, marque: "ecrans" });
try {
  for (const nom of voulus) {
    await s.envoyer("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 2, mobile: false });
    await s.envoyer("Page.navigate", { url: `file://${join(ICI, "ecrans.html")}?seul=${nom}` });
    let dim = null;
    for (let i = 0; i < 40 && !dim; i++) {
      await s.dormir(250);
      dim = await s.evaluer(`(async () => {
        const e = document.querySelector('[data-ecran="${nom}"]');
        if (!e || document.readyState !== 'complete') return null;
        await document.fonts.ready;
        const imgs = [...e.querySelectorAll('img')];
        if (imgs.some(i => !i.complete)) return null;
        const r = e.getBoundingClientRect();
        return { l: r.width, h: r.height, t: e.hasAttribute('data-transparent') };
      })()`);
    }
    if (!dim) { console.log("⚠", nom, "introuvable"); continue; }
    await s.envoyer("Emulation.setDeviceMetricsOverride", { width: Math.ceil(dim.l), height: Math.ceil(dim.h), deviceScaleFactor: 2, mobile: false });
    await s.envoyer("Emulation.setDefaultBackgroundColorOverride", { color: dim.t ? { r: 0, g: 0, b: 0, a: 0 } : { r: 255, g: 255, b: 255, a: 1 } });
    await s.dormir(500);
    const c = await s.envoyer("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: dim.l, height: dim.h, scale: 1 },
    });
    const png = join(TMP, `${nom}.png`);
    writeFileSync(png, Buffer.from(c.result.data, "base64"));
    const webp = join(SORTIE, `${nom}.webp`);
    execFileSync("python3", ["-c", `
from PIL import Image
im = Image.open(${JSON.stringify(png)})
im.save(${JSON.stringify(webp)}, 'WEBP', quality=86, method=6)
print(im.size, im.mode)`], { stdio: "inherit" });
    console.log(nom, "→", webp.replace(ICI + "/../../", ""));
  }
} finally {
  s.fermer();
}
if (existsSync(TMP) && !process.env.GARDER) rmSync(TMP, { recursive: true, force: true });
