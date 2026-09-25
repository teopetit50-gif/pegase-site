/** Sonde des bandes latérales — 25/09/2026.
 *
 *  Teo : « c'est pas pleine page, va chercher tous les bugs comme ça ».
 *  PageShell bridait <main> à 1440 px sur un fond `bg-panel` NOIR : au-delà
 *  de 1440, toute section qui ne sortait pas du cadre laissait deux bandes
 *  noires sur les côtés (capture de Teo : « Se combine avec » des secteurs).
 *
 *  Oracle : le PIXEL PEINT, pas le style calculé. Plusieurs pages peignent
 *  leur gouttière par une ombre géante écrêtée (factures.css, note C) : une
 *  `box-shadow` n'est ni un fond ni un élément, et `elementsFromPoint` y
 *  rend le fond noir de PageShell sur une gouttière parfaitement blanche.
 *  On défile donc la page et, à chaque écran, on photographie quatre
 *  colonnes d'un pixel : les deux bords de la fenêtre (x = 2, W − 3) et,
 *  à la même hauteur, l'intérieur de l'ancienne colonne de 1440
 *  (x = (W − 1440)/2 + 4 et son symétrique). Une bande, c'est un bord
 *  quasi noir à côté d'un intérieur clair, sur 40 px de haut au moins.
 *
 *    node outils/sonde-bandes.mjs                        → toutes les pages
 *    node outils/sonde-bandes.mjs /secteurs/btp /tarifs  → celles-là
 *    CSS='main{max-width:none}' node outils/sonde-bandes.mjs
 *        → essaie un correctif sur la page EN LIGNE avant de le coder
 */
import { inflateSync } from 'node:zlib';
import { ouvrirSession } from './chrome.mjs';

const BASE = process.env.BASE || 'https://omegaai.fr';
const W = Number(process.env.LARGEUR || 1920);
const H = 1000;
const CSS = process.env.CSS || '';

const PAGES = [
  '/', '/offres', '/offres/relances-impayes', '/offres/nouvelles-affaires',
  '/offres/demandes-clients', '/offres/factures-fournisseurs', '/offres/sur-mesure',
  '/secteurs', '/secteurs/btp', '/secteurs/avocats', '/secteurs/architectes',
  '/secteurs/location-automobile', '/secteurs/dentaire', '/secteurs/distribution',
  '/modeles', '/tarifs', '/tarifs/site', '/integrations', '/installation',
  '/vos-donnees', '/contact', '/reserver', '/reserver-un-audit', '/commencer',
  '/blog', '/blog/impayes-cout-attendre',
];

/* Décodeur PNG minimal (8 bits, RGB ou RGBA, sans entrelacement) — ce que
   rend `Page.captureScreenshot`. Rend une liste de [r, g, b] par ligne. */
function colonne(png) {
  let p = 8, larg = 0, haut = 0, type = 0;
  const idat = [];
  while (p < png.length) {
    const n = png.readUInt32BE(p), t = png.toString('ascii', p + 4, p + 8);
    const d = png.subarray(p + 8, p + 8 + n);
    if (t === 'IHDR') { larg = d.readUInt32BE(0); haut = d.readUInt32BE(4); type = d[9]; }
    if (t === 'IDAT') idat.push(d);
    p += 12 + n;
  }
  const bpp = type === 6 ? 4 : 3, ligne = larg * bpp;
  const brut = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(haut * ligne);
  for (let y = 0; y < haut; y++) {
    const f = brut[y * (ligne + 1)];
    for (let i = 0; i < ligne; i++) {
      const v = brut[y * (ligne + 1) + 1 + i];
      const a = i >= bpp ? px[y * ligne + i - bpp] : 0;
      const b = y ? px[(y - 1) * ligne + i] : 0;
      const c = i >= bpp && y ? px[(y - 1) * ligne + i - bpp] : 0;
      let pr = 0;
      if (f === 1) pr = a; else if (f === 2) pr = b; else if (f === 3) pr = (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
        pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * ligne + i] = (v + pr) & 255;
    }
  }
  return Array.from({ length: haut }, (_, y) => [px[y * ligne], px[y * ligne + 1], px[y * ligne + 2]]);
}

const s = await ouvrirSession({ largeur: W, hauteur: H, densite: 1,
                                flags: ['--disable-webgl'], marque: 'bandes' });
const photo = async (x, y) => colonne(Buffer.from((await s.envoyer('Page.captureScreenshot',
  { format: 'png', clip: { x, y, width: 1, height: H, scale: 1 } })).result.data, 'base64'));

const noir = ([r, g, b]) => r < 20 && g < 20 && b < 20;
const clair = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b > 90;
const gouttiere = (W - 1440) / 2;

const chemins = process.argv.slice(2).length ? process.argv.slice(2) : PAGES;
let propres = 0;
for (const c of chemins) {
  if (!(await s.aller(BASE + c))) { console.log(`?? ${c} — la page n'a pas chargé`); continue; }
  if (CSS) {
    await s.evaluer(`(() => { const st = document.createElement('style');
      st.textContent = ${JSON.stringify(CSS)}; document.head.append(st);
      dispatchEvent(new Event('resize')); })()`);
    await s.dormir(500);
  }
  const total = await s.evaluer('document.documentElement.scrollHeight');
  const touches = [];                     // [y du document, côté]
  for (let y0 = 0; y0 < total; y0 += H - 120) {
    await s.evaluer(`window.scrollTo({ top: ${y0}, behavior: 'instant' })`);
    await s.dormir(250);
    const sy = await s.evaluer('scrollY');
    for (const [cote, xb, xi] of [['g', 2, gouttiere + 4], ['d', W - 3, W - gouttiere - 5]]) {
      const bord = await photo(xb, sy), dedans = await photo(xi, sy);
      for (let y = 0; y < H; y++) if (noir(bord[y]) && clair(dedans[y])) touches.push([sy + y, cote]);
    }
    if (sy + H >= total) break;
  }
  /* plages continues d'au moins 40 px, nommées par la section au centre */
  const plages = [];
  for (const [y, cote] of touches.sort((a, b) => a[0] - b[0])) {
    const der = plages[plages.length - 1];
    if (der && y - der.fin <= 2) { der.fin = y; der.cotes.add(cote); }
    else plages.push({ debut: y, fin: y, cotes: new Set([cote]) });
  }
  const vraies = plages.filter((p) => p.fin - p.debut >= 40);
  if (!vraies.length) { propres++; console.log(`✓ ${c}`); continue; }
  console.log(`✗ ${c}  (hauteur ${total})`);
  for (const p of vraies) {
    const nom = await s.evaluer(`(() => {
      window.scrollTo({ top: ${p.debut} - 200, behavior: 'instant' });
      const e = document.elementFromPoint(innerWidth / 2, ${p.debut} - scrollY + 20);
      const sec = e && (e.closest('section') || e);
      if (!sec) return '?';
      const t = sec.querySelector('h1,h2,h3')?.textContent.trim().slice(0, 50) || '';
      return sec.tagName.toLowerCase() + (sec.id ? '#' + sec.id : '') + '.'
        + String(sec.className?.baseVal ?? sec.className).split(/\\s+/).slice(0, 2).join('.')
        + (t ? ' « ' + t + ' »' : '');
    })()`);
    console.log(`   y ${p.debut}–${p.fin} [${[...p.cotes].join('')}]  ${nom}`);
  }
}
console.log(`\n${propres}/${chemins.length} pages sans bande à ${W} px${CSS ? ' (CSS injecté)' : ''}`);
s.fermer();
process.exit(0);
