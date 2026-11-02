#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   LORANI — capture d'une sous-page pour la superposition (02/11/2026)

   Consigne docs/refonte-metiers/cloud/COMMUN.md § 3.4 : chromium headless,
   deviceScaleFactor 1, thème sombre ou clair (colorScheme), même fenêtre
   que la capture de référence.

   node outils/lor-capture.mjs <url> <sortie.png> <largeur> <hauteur> <dark|light> [--clic <sélecteur>]… [--survol <sélecteur>] [--attente <ms>]

   La carte de l'espace 2 commence à x 304, y 48 (barre de 48, rail, sous-
   menu) ; celle de Linear à x 244, y 8 et fait 1188 × 856. Une fenêtre de
   1492 × 904 donne à la carte de l'espace 2 la largeur et la hauteur de
   celle de Linear : outils/lor-superpose.py découpe les deux au même cadre.
   ══════════════════════════════════════════════════════════════════════ */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const charger = () => {
  const req = createRequire(import.meta.url);
  try {
    return req("playwright");
  } catch {
    const global = execSync("npm root -g").toString().trim();
    return req(`${global}/playwright`);
  }
};
const { chromium } = charger();

const args = process.argv.slice(2);
const [url, sortie, largeur, hauteur, theme] = args;
const clics = [];
let survol = null;
let attente = 1200;
for (let i = 5; i < args.length; i++) {
  if (args[i] === "--clic") clics.push(args[++i]);
  else if (args[i] === "--survol") survol = args[++i];
  else if (args[i] === "--attente") attente = Number(args[++i]);
}

const navigateur = await chromium.launch();
const page = await navigateur.newPage({
  viewport: { width: Number(largeur), height: Number(hauteur) },
  deviceScaleFactor: 1,
  colorScheme: theme === "light" ? "light" : "dark",
});
await page.goto(url, { waitUntil: "networkidle", timeout: 180000 });
/* l'espace 2 suit le système quand aucun thème n'est choisi : on l'enlève */
await page.evaluate(() => document.documentElement.removeAttribute("data-v2-theme"));
for (const s of clics) {
  await page.click(s);
  await page.waitForTimeout(300);
}
if (survol) await page.hover(survol);
else await page.mouse.move(1, Number(hauteur) - 1);
await page.waitForTimeout(attente);
await page.screenshot({ path: sortie });
await navigateur.close();
