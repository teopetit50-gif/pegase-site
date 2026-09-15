/* Recette mobile d'un site entier : débordement, échelle typographique,
 * budget de lignes VUES, et blocs surdimensionnés.
 *
 * Trois questions de Teo (15/09/2026) :
 *   1. y a-t-il des bugs d'affichage ?      -> débordement horizontal + console
 *   2. des parties affichent trop de texte ? -> lignes vues par section
 *   3. des trucs trop zoomés ?               -> tailles de police et de bloc
 *
 * Usage : node outils/recette-mobile.mjs <largeur> [chemin ...]
 * Une session pour toutes les pages, une largeur par processus (pieges.md §6).
 */
import { ouvrirSession } from './chrome.mjs';

const BASE = process.env.BASE || 'https://omegaai.fr';
const largeur = Number(process.argv[2] || 390);
const chemins = process.argv.slice(3).length ? process.argv.slice(3) : [
  '/', '/offres', '/offres/relances-impayes', '/offres/factures-fournisseurs',
  '/offres/nouvelles-affaires', '/offres/demandes-clients', '/offres/sur-mesure',
  '/modeles', '/tarifs', '/tarifs/site', '/reserver-un-audit', '/reserver',
  '/installation', '/application', '/contact', '/integrations', '/vos-donnees',
  '/blog', '/blog/impayes-cout-attendre', '/connexion', '/commencer',
];

const SONDE = `(() => {
  const W = window.innerWidth;
  const lignes = (e, c) => {
    const lh = parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.4;
    const h = e.getBoundingClientRect().height;
    return h ? Math.round(h / lh) : 0;
  };
  const etiquette = (e) => {
    const t = (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 58);
    return t || '<' + e.tagName.toLowerCase() + (e.className && typeof e.className === 'string'
      ? '.' + e.className.split(' ').slice(0, 2).join('.') : '') + '>';
  };
  /* Un parent qui rogne volontairement (overflow hidden/clip/auto) rend le
     débordement de son enfant invisible : ce n'est pas un défaut. */
  const rogne = (e) => {
    for (let p = e.parentElement; p; p = p.parentElement) {
      const c = getComputedStyle(p);
      if (/hidden|clip|auto|scroll/.test(c.overflowX)) return true;
    }
    return false;
  };

  const deborde = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!e.getClientRects().length) continue;
    const c = getComputedStyle(e);
    if (c.position === 'fixed') continue;
    const r = e.getBoundingClientRect();
    const trop = Math.round(Math.max(r.right - W, -r.left));
    if (trop > 1 && !rogne(e)) deborde.push({ trop, w: Math.round(r.width), q: etiquette(e) });
  }

  /* Texte : taille, interligne, lignes vues. */
  const textes = [];
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('header,nav,footer')) continue;
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
    if (!e.getClientRects().length) continue;
    const c = getComputedStyle(e);
    if (c.display.startsWith('inline') || c.display === 'contents') continue;
    if (e.closest('details:not([open])') && !e.closest('summary')) continue;
    textes.push({
      t: e.tagName.toLowerCase(),
      px: Math.round(parseFloat(c.fontSize)),
      lh: Math.round(parseFloat(c.lineHeight) || 0),
      n: lignes(e, c),
      q: etiquette(e),
    });
  }

  /* Sections : hauteur et lignes vues. */
  const sections = [];
  document.querySelectorAll('main section, main > div > section, section').forEach((sec, i) => {
    if (sec.closest('header,footer')) return;
    const blocs = textes.filter((x) => false);
    let n = 0;
    for (const e of sec.querySelectorAll('*')) {
      if (![...e.childNodes].some((k) => k.nodeType === 3 && k.textContent.trim().length > 1)) continue;
      if (!e.getClientRects().length) continue;
      const c = getComputedStyle(e);
      if (c.display.startsWith('inline') || c.display === 'contents') continue;
      if (e.closest('details:not([open])') && !e.closest('summary')) continue;
      n += lignes(e, c);
    }
    sections.push({
      i,
      titre: (sec.querySelector('h1,h2,h3')?.textContent || '—').trim().replace(/\\s+/g, ' ').slice(0, 46),
      haut: Math.round(sec.getBoundingClientRect().height),
      n,
    });
  });

  /* Images et médias plus hauts qu'un demi-écran, ou plus larges que la colonne. */
  const medias = [];
  for (const e of document.querySelectorAll('img,svg,video,canvas,picture')) {
    if (e.closest('header,footer,nav')) continue;
    if (!e.getClientRects().length) continue;
    const r = e.getBoundingClientRect();
    if (r.height > window.innerHeight * 0.55 || r.width > W + 1)
      medias.push({ t: e.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height),
                    q: (e.getAttribute('alt') || e.getAttribute('src') || e.className?.baseVal || '').slice(0, 50) });
  }

  return {
    scrollW: document.documentElement.scrollWidth, W,
    haut: document.documentElement.scrollHeight,
    deborde: deborde.sort((a, b) => b.trop - a.trop).slice(0, 12),
    gros: textes.filter((x) => x.px >= 17 && x.n >= 2).sort((a, b) => b.px - a.px).slice(0, 12),
    longs: textes.filter((x) => x.n >= 5).sort((a, b) => b.n - a.n).slice(0, 12),
    titres: textes.filter((x) => /^h[123]$/.test(x.t)).sort((a, b) => b.px - a.px).slice(0, 6),
    sections: sections.sort((a, b) => b.n - a.n).slice(0, 6),
    lignesTotal: textes.reduce((a, b) => a + b.n, 0),
    medias: medias.slice(0, 8),
  };
})()`;

const s = await ouvrirSession({
  largeur, hauteur: 844, screencast: false, densite: 1,
  flags: ['--disable-webgl'], marque: 'mob' + largeur,
});

for (const c of chemins) {
  s.soucis.length = 0;
  const url = BASE + c;
  const ok = await s.aller(url, { plafond: 30 });
  if (!ok) { console.log(`\n### ${c} @${largeur} — PAGE ABSENTE`); continue; }
  const r = await s.evaluer(SONDE);
  if (!r) { console.log(`\n### ${c} @${largeur} — SONDE MUETTE`); continue; }
  console.log(`\n### ${c} @${largeur}  hauteur ${r.haut}px  ${r.lignesTotal} lignes de texte`);
  if (r.scrollW > r.W) console.log(`  !! DEBORDEMENT PAGE : scrollWidth ${r.scrollW} > ${r.W}`);
  for (const d of r.deborde) console.log(`  !! deborde +${d.trop}px (l=${d.w})  ${d.q}`);
  if (r.titres.length) console.log('  titres : ' + r.titres.map((t) => `${t.t} ${t.px}/${t.lh} (${t.n}l)`).join('  '));
  for (const g of r.gros) console.log(`  ZOOM ${g.t} ${g.px}/${g.lh} ${g.n}l  ${g.q}`);
  for (const l of r.longs) console.log(`  LONG ${l.t} ${l.px}px ${l.n}l  ${l.q}`);
  for (const x of r.sections) console.log(`  sect ${String(x.n).padStart(3)}l ${String(x.haut).padStart(5)}px  ${x.titre}`);
  for (const m of r.medias) console.log(`  media ${m.t} ${m.w}x${m.h}  ${m.q}`);
  if (s.soucis.length) console.log('  soucis : ' + s.soucis.slice(0, 3).join(' | '));
}
s.fermer();
