/** Recette de contraste d'UNE page à UNE largeur — « rien de blanc sur blanc ».
 *
 *    node contraste.mjs <url> <largeur> [selecteur-de-portee]
 *
 * Pourquoi ce script existe : une page qu'on fait passer du sombre au clair
 * casse en silence. Un texte resté blanc ne lève aucune erreur, ne casse
 * aucune mise en page — il DISPARAÎT, et on ne le voit que si on regarde
 * précisément le bon écran au bon palier. Une capture ne le montre pas non
 * plus : il n'y a rien à voir.
 *
 * On mesure donc, plutôt que de regarder :
 *
 *  · TEXTE — pour chaque élément qui porte du texte, la couleur d'encre
 *    effective (alpha compris) contre le premier fond OPAQUE trouvé en
 *    remontant ses ancêtres, et le rapport de contraste WCAG. Sous 3:1 c'est
 *    signalé ; sous 1,6:1 c'est « invisible ».
 *  · SURFACES — pour chaque bloc qui porte un fond, l'écart avec le fond
 *    qu'il recouvre. Un écart quasi nul ET aucune bordure = une carte qui
 *    n'existe pas à l'écran.
 *
 * Un processus Chrome par appel et un RECHARGEMENT par largeur : mesurer
 * après un redimensionnement donne des valeurs fausses.
 */
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2];
const largeur = Number(process.argv[3] || 1440);
const portee = process.argv[4] || 'body';
if (!url) { console.error('usage: node contraste.mjs <url> <largeur> [portée]'); process.exit(1); }

const s = await ouvrirSession({ largeur, marque: 'contraste' });
try {
  const pret = await s.aller(url);
  if (!pret) { console.log(`── ${largeur}px : page jamais prête`); process.exit(1); }

  const rapport = await s.evaluer(`(()=>{
    const racine = document.querySelector(${JSON.stringify(portee)});
    if (!racine) return { erreur: 'portée introuvable' };

    /* getComputedStyle ne rend pas toujours du rgb() : une couleur déclarée
       en oklch/lab est sérialisée telle quelle. On la fait PEINDRE et on
       relit le pixel — même parade que l'entête caméléon du site. */
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const memo = new Map();
    const rgba = (c) => {
      if (!c) return [0,0,0,0];
      if (memo.has(c)) return memo.get(c);
      let v = [0,0,0,0];
      const m = c.match(/^rgba?\\(([^)]+)\\)/);
      if (m) {
        const n = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
        v = [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
      } else if (c !== 'transparent') {
        ctx.clearRect(0,0,1,1); ctx.fillStyle = '#000'; ctx.fillStyle = c;
        ctx.fillRect(0,0,1,1); const d = ctx.getImageData(0,0,1,1).data;
        v = [d[0], d[1], d[2], d[3]/255];
      }
      memo.set(c, v); return v;
    };
    const poser = (av, ar) => {   // av sur ar
      const a = av[3];
      return [ av[0]*a + ar[0]*(1-a), av[1]*a + ar[1]*(1-a), av[2]*a + ar[2]*(1-a), 1 ];
    };
    const lum = (p) => {
      const f = (u) => { u /= 255; return u <= 0.04045 ? u/12.92 : Math.pow((u+0.055)/1.055, 2.4); };
      return 0.2126*f(p[0]) + 0.7152*f(p[1]) + 0.0722*f(p[2]);
    };
    const ratio = (a, b) => {
      const x = lum(a), y = lum(b);
      return (Math.max(x,y) + 0.05) / (Math.min(x,y) + 0.05);
    };
    /* Le fond réellement vu sous un élément : on empile les fonds semi-
       opaques rencontrés en remontant, jusqu'au premier fond plein. */
    const fondDe = (el) => {
      const pile = [];
      for (let n = el; n; n = n.parentElement) {
        const c = rgba(getComputedStyle(n).backgroundColor);
        if (c[3] > 0) { pile.push(c); if (c[3] >= 0.999) break; }
      }
      let f = [255,255,255,1];
      for (let i = pile.length - 1; i >= 0; i--) f = poser(pile[i], f);
      return f;
    };

    const visible = (el) => {
      const c = getComputedStyle(el);
      if (c.visibility === 'hidden' || c.display === 'none') return false;
      if (parseFloat(c.opacity) < 0.06) return false;
      for (let n = el.parentElement; n; n = n.parentElement) {
        const p = getComputedStyle(n);
        if (p.display === 'none' || p.visibility === 'hidden') return false;
        if (parseFloat(p.opacity) < 0.06) return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };

    const textes = [], surfaces = [];
    for (const el of racine.querySelectorAll('*')) {
      if (!visible(el)) continue;
      const c = getComputedStyle(el);

      /* ── le texte propre à l'élément (pas celui de ses enfants) ── */
      const propre = [...el.childNodes]
        .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
      if (propre.length > 1 && c.webkitTextFillColor !== 'transparent'
          && c.getPropertyValue('-webkit-text-fill-color') !== 'rgba(0, 0, 0, 0)') {
        const fond = fondDe(el);
        const encre = poser(rgba(c.color), fond);
        const r = ratio(encre, fond);
        if (r < 3) textes.push({
          r: Math.round(r*100)/100,
          taille: Math.round(parseFloat(c.fontSize)),
          couleur: c.color, fond: 'rgb(' + fond.slice(0,3).map(Math.round).join(',') + ')',
          texte: propre.slice(0, 46),
          ou: el.tagName.toLowerCase() + '.' + (el.className.toString().split(' ')[0] || ''),
        });
      }

      /* ── les surfaces : une carte qui ne se détache de rien ── */
      const bg = rgba(c.backgroundColor);
      const r0 = el.getBoundingClientRect();
      if (bg[3] > 0.02 && r0.width > 60 && r0.height > 24 && el.parentElement) {
        const dessous = fondDe(el.parentElement);
        const dessus = poser(bg, dessous);
        const ecart = Math.max(...[0,1,2].map((i) => Math.abs(dessus[i] - dessous[i])));
        const bord = ['Top','Right','Bottom','Left'].some((s) => {
          const w = parseFloat(c['border' + s + 'Width']);
          return w > 0 && rgba(c['border' + s + 'Color'])[3] > 0.03;
        }) || (c.boxShadow && c.boxShadow !== 'none') || (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0);
        if (ecart < 2 && !bord) surfaces.push({
          ecart: Math.round(ecart*10)/10,
          couleur: c.backgroundColor,
          taille: Math.round(r0.width) + '×' + Math.round(r0.height),
          ou: el.tagName.toLowerCase() + '.' + (el.className.toString().split(' ').slice(0,2).join('.') || ''),
        });
      }
    }
    return { textes, surfaces };
  })()`);

  console.log(`\n══ ${largeur}px ══ ${url}`);
  if (rapport.erreur) { console.log('  ', rapport.erreur); }
  else {
    const t = rapport.textes.sort((a,b) => a.r - b.r);
    console.log(`  TEXTE sous 3:1 — ${t.length}`);
    for (const x of t) {
      const marque = x.r < 1.6 ? '✖ INVISIBLE' : (x.r < 2.2 ? '⚠ très faible' : '· faible   ');
      console.log(`    ${marque} ${String(x.r).padStart(5)}:1  ${String(x.taille).padStart(2)}px  ${x.couleur} sur ${x.fond}`);
      console.log(`                        « ${x.texte} »  ${x.ou}`);
    }
    const s2 = rapport.surfaces;
    console.log(`  SURFACES indiscernables (écart < 2/255 ET sans bord ni ombre) — ${s2.length}`);
    for (const x of s2) console.log(`    écart ${x.ecart}  ${x.couleur}  ${x.taille}  ${x.ou}`);
  }
  const soucis = s.soucis;
  if (soucis.length) { console.log('  incidents :'); for (const x of new Set(soucis)) console.log('   ', x); }
} finally { await s.fermer(); }
