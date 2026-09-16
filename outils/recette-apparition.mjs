/** Recette de l'apparition des sections de l'accueil (16/09/2026).
 *
 *  Ce que la sonde doit prouver, et dans cet ordre :
 *   1. le texte n'est JAMAIS perdu — après un passage complet de la page,
 *      chaque bloc et chaque mot animé est à l'opacité 1 ;
 *   2. ça anime vraiment — au moins un bloc a été vu `arme` avant sa venue
 *      dans la fenêtre (sinon l'attribut n'est jamais posé et la page est
 *      simplement statique, ce qui passerait le test 1 sans rien montrer) ;
 *   3. l'attribut est RETIRÉ ensuite (aucun `filter` résiduel) ;
 *   4. ni débordement horizontal, ni erreur de console.
 *
 *  `--disable-webgl` : le fond Silk de l'accueil gèle la sonde autrement.
 */
import { ouvrirSession } from './chrome.mjs';

const url = process.argv[2] || 'http://localhost:3210/';
const largeur = Number(process.argv[3] || 1440);
const hauteur = largeur < 768 ? 844 : 900;

const s = await ouvrirSession({ largeur, hauteur, densite: 1, marque: 'apparition',
                                flags: ['--disable-webgl'] });

const ok = await s.aller(url);
if (!ok) { console.log(`${largeur}  PAGE NON CHARGÉE`); s.fermer(); process.exit(1); }

const compte = await s.evaluer(`JSON.stringify({
  mots: document.querySelectorAll('.o-app-mot').length,
  blocs: document.querySelectorAll('.o-app-bloc').length,
  armes: document.querySelectorAll('[data-app="arme"]').length,
})`);

/* descente par paliers d'un tiers de fenêtre, comme un visiteur */
let vusEnCours = 0;
const h = await s.evaluer('document.body.scrollHeight');
for (let y = 0; y < h; y += Math.round(hauteur / 3)) {
  await s.evaluer(`window.scrollTo(0, ${y})`);
  await s.dormir(120);
  vusEnCours += await s.evaluer(`document.querySelectorAll('[data-app="joue"]').length`);
}
await s.evaluer(`window.scrollTo(0, ${h})`);
await s.dormir(1600);

/* remonter en haut et laisser finir : rien ne doit rester caché */
await s.evaluer('window.scrollTo(0, 0)');
await s.dormir(400);

const bilan = await s.evaluer(`(() => {
  const pale = [];
  for (const el of document.querySelectorAll('.o-app-mot, .o-app-bloc')) {
    const c = getComputedStyle(el);
    if (parseFloat(c.opacity) < 0.99) pale.push((el.className || el.tagName) + ' :: ' + (el.textContent || '').trim().slice(0, 40));
  }
  return JSON.stringify({
    pale: pale.slice(0, 8),
    nPale: pale.length,
    restants: document.querySelectorAll('[data-app]').length,
    debordement: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  });
})()`);

const c = JSON.parse(compte), b = JSON.parse(bilan);
const erreurs = s.soucis.filter((x) => !/favicon|analytics|insights/i.test(x));
console.log(
  `${String(largeur).padStart(4)}  mots ${String(c.mots).padStart(3)}  blocs ${String(c.blocs).padStart(2)}` +
  `  armés ${String(c.armes).padStart(2)}  joués ${String(vusEnCours).padStart(3)}` +
  `  pâles ${b.nPale}  data-app restants ${b.restants}  débord ${b.debordement}px  erreurs ${erreurs.length}`
);
if (b.nPale) console.log('      PÂLES :', b.pale.join(' | '));
if (erreurs.length) console.log('      ', erreurs.slice(0, 4).join('\n       '));
s.fermer();
process.exit(0);
