/* Budget de texte VU, section par section — pas en signes, en LIGNES.
 *
 * Le compte en signes ment sur une page à accordéons : une FAQ de 2 100
 * signes repliée dans des <details> n'occupe que six lignes à l'écran.
 * Ce script mesure ce que le visiteur voit réellement : hauteur rendue de
 * chaque section, nombre de lignes de texte, et les blocs de 4 lignes et
 * plus — ceux qui font basculer une carte en paragraphe.
 *
 * PIÈGE (relevé le 11/09/2026) : le contenu d'un <details> REPLIÉ garde un
 * offsetParent dans Chrome (content-visibility, pas display:none) et se fait
 * compter. Une FAQ de six questions ressortait à 49 lignes vues au lieu de 6,
 * et devenait le premier « mur » de la page — alors qu'elle n'en est pas un.
 * D'où le filtre sur `details:not([open])`.
 *
 * Usage : node outils/lignes-sections.mjs <url> [largeur]
 * L'accueil peint son fond en WebGL : --disable-webgl est posé d'office,
 * sans quoi le premier Runtime.evaluate ne rend jamais la main.
 */
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2] || 'http://localhost:3010/';
const largeur = Number(process.argv[3] || 1440);

const s = await ouvrirSession({
  largeur, hauteur: 900, screencast: false, densite: 1,
  flags: ['--disable-webgl'], marque: 'lignes',
});
if (!await s.aller(url)) { console.error('page absente'); s.fermer(); process.exit(1); }

const res = await s.evaluer(`(() => {
  const lignes = (e) => {
    const c = getComputedStyle(e);
    const lh = parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.4;
    const h = e.getBoundingClientRect().height;
    return h ? Math.round(h / lh) : 0;
  };
  const out = [];
  document.querySelectorAll('section').forEach((sec, i) => {
    /* Tout élément qui porte DIRECTEMENT du texte, quel que soit son nom.
       Une liste de balises (h1..h4, p, li) laissait passer les composants
       qui écrivent en <span> parce qu'ils vivent dans un <a> : la section
       « à lire » ressortait à 3 lignes vues au lieu de 13, et le gain
       annoncé était faux. Le filtre sur les enfants texte directs évite
       aussi de compter un parent ET ses enfants. */
    const porteurs = [...sec.querySelectorAll('*')].filter((e) => {
      if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1))
        return false;
      /* ...et seulement s'il fait BLOC. Un <span> en ligne occupe une
         portion d'une ligne déjà comptée sur son parent : le compter à son
         tour gonflait la page de 245 à 411 lignes, et la citation peinte
         mot à mot (un span par mot) pesait à elle seule 50 lignes. */
      const d = getComputedStyle(e).display;
      return d && !d.startsWith('inline') && d !== 'contents' && d !== 'none';
    });
    const blocs = porteurs
      .filter((e) => e.offsetParent !== null && e.textContent.trim().length > 1
                     && !e.closest('details:not([open]) > *:not(summary)')
                     && !(e.closest('details:not([open])') && !e.closest('summary')))
      .map((e) => ({ t: e.tagName.toLowerCase(), n: lignes(e),
                     s: e.textContent.trim().replace(/\\s+/g,' ').slice(0, 58) }));
    const titre = (sec.querySelector('h1,h2')?.textContent || blocs[0]?.s || '—')
      .trim().replace(/\\s+/g,' ').slice(0, 46);
    out.push({
      i, titre,
      haut: Math.round(sec.getBoundingClientRect().height),
      lignes: blocs.reduce((a, b) => a + b.n, 0),
      gros: blocs.filter((b) => b.n >= 4).map((b) => b.n + 'l ' + b.s),
    });
  });
  return out;
})()`);

console.log(`\n=== ${url} @ ${largeur}px ===`);
console.log(`  #  haut   lignes  section`);
let tl = 0, th = 0;
for (const r of res) {
  tl += r.lignes; th += r.haut;
  console.log(`${String(r.i).padStart(3)} ${String(r.haut).padStart(5)}px ${String(r.lignes).padStart(6)}  ${r.titre}`);
  for (const g of r.gros) console.log(`                     · ${g}`);
}
console.log(`TOTAL ${th}px, ${tl} lignes de texte`);
if (s.soucis.length) console.log('\nsoucis :', s.soucis.slice(0, 5));
s.fermer();
