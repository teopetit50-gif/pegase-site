/* Défauts visibles d'une page à une largeur : textes rognés par un ancêtre,
   textes qui sortent de la fenêtre, textes qui se chevauchent.
   Lancé sur la référence puis sur notre page : ce que nous avons en plus,
   ce sont nos défauts (la référence en a quelques-uns à elle).

   usage : node outils/sx/defauts.mjs <url> <largeur> [sortie.json]          */
import { writeFileSync } from 'node:fs';
import { ouvrirSession } from '../chrome.mjs';

const [url, l = '390', sortie] = process.argv.slice(2);
const largeur = Number(l);
const s = await ouvrirSession({ largeur, hauteur: largeur < 600 ? 844 : 900, marque: 'defauts', densite: 1 });
const EXPR = `(async () => {
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  await dormir(1500);
  const H = () => document.documentElement.scrollHeight;
  for (let y = 0; y < H(); y += Math.round(innerHeight * 0.5)) { scrollTo(0, y); await dormir(220); }
  scrollTo(0, 0); await dormir(900);
  for (const a of document.getAnimations()) {
    try { const t = a.effect.getComputedTiming(); if (t.iterations === Infinity || t.endTime === Infinity) { a.pause(); a.currentTime = 0; } else a.finish(); } catch (e) {}
  }
  await dormir(400);
  const W = innerWidth;
  const visible = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
  const textes = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.nodeValue.trim();
    if (!t || t.length < 2) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,svg,.sr-only,[aria-hidden="true"]')) continue;
    if (el.closest('.sr-only')) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const rects = [...r.getClientRects()].filter((q) => q.width > 1 && q.height > 1);
    if (!rects.length || !visible(el)) continue;
    const b = r.getBoundingClientRect();
    textes.push({ t: t.slice(0, 50), el, rects, b: { l: b.left, r: b.right, t: b.top + scrollY, bo: b.bottom + scrollY } });
  }
  const rognes = [], dehors = [], chevauche = [];
  for (const x of textes) {
    if (x.b.r > W + 1 || x.b.l < -1) dehors.push({ t: x.t, l: Math.round(x.b.l), r: Math.round(x.b.r), y: Math.round(x.b.t) });
    for (let e = x.el; e && e !== document.body; e = e.parentElement) {
      const c = getComputedStyle(e);
      if (/(hidden|clip|auto|scroll)/.test(c.overflowX + c.overflowY) || c.textOverflow === 'ellipsis') {
        const a = e.getBoundingClientRect();
        const hors = Math.max(a.left - x.b.l, x.b.r - a.right, a.top - (x.b.t - scrollY), (x.b.bo - scrollY) - a.bottom);
        const coupeX = x.el.scrollWidth > x.el.clientWidth + 1 && getComputedStyle(x.el).textOverflow === 'ellipsis';
        if (hors > 2 || coupeX) { rognes.push({ t: x.t, de: Math.round(hors), par: (e.className && e.className.baseVal === undefined ? e.className : '').toString().slice(0, 40), y: Math.round(x.b.t) }); }
        break;
      }
    }
  }
  textes.sort((a, b) => a.b.t - b.b.t);
  for (let i = 0; i < textes.length; i++) for (let j = i + 1; j < textes.length && textes[j].b.t < textes[i].b.bo; j++) {
    const A = textes[i], B = textes[j];
    if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
    let aire = 0;
    for (const p of A.rects) for (const q of B.rects) {
      const dx = Math.min(p.right, q.right) - Math.max(p.left, q.left), dy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (dx > 2 && dy > 3) aire += dx * dy;
    }
    if (aire > 30) chevauche.push({ a: A.t, b: B.t, aire: Math.round(aire), y: Math.round(A.b.t) });
  }
  return { hauteur: H(), largeurPage: document.documentElement.scrollWidth, n: textes.length, rognes, dehors, chevauche };
})()`;
try {
  if (!await s.aller(url)) { console.log('⚠ page jamais prête'); process.exit(1); }
  const r = await s.evaluer(EXPR);
  if (sortie) writeFileSync(sortie, JSON.stringify(r, null, 1));
  console.log(`${url} @${largeur} : ${r.n} textes, page ${r.largeurPage}×${r.hauteur}`);
  console.log(`rognés ${r.rognes.length} · hors fenêtre ${r.dehors.length} · chevauchements ${r.chevauche.length}`);
  for (const x of r.rognes) console.log('  ROGNÉ    y=' + x.y, '«' + x.t + '»', 'de', x.de, 'par', x.par);
  for (const x of r.dehors) console.log('  DEHORS   y=' + x.y, '«' + x.t + '»', x.l, '→', x.r);
  for (const x of r.chevauche) console.log('  CHEVAUCHE y=' + x.y, '«' + x.a + '» × «' + x.b + '»', x.aire + 'px²');
} finally { s.fermer(); }
process.exit(0);
