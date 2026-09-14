/* Recette des quatre animations de `bento-grid-01` (/offres, 11/09/2026).

   Elles tournent en boucle sur minuterie : une capture en fige une image et
   ne prouve rien — ni que ça bouge, ni que ça revient. On échantillonne
   donc le DOM à trois instants et on exige un CHANGEMENT.

   Piège de `chrome.mjs` : sans screencast le compositeur n'avance pas et
   tout reste à la valeur de montage. `ouvrirSession` le démarre par défaut,
   ne pas le couper ici.

   usage : node outils/anim-bento.mjs [url]
*/
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "http://localhost:3010/offres";
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "bento" });
await s.aller(url);
await s.dormir(1200);

/* la bande est haute dans la page : sans la faire entrer dans la fenetre,
   le whileInView des tuiles ne tire jamais et tout reste a opacite 0 */
await s.evaluer(`document.querySelector('.o-nuit').scrollIntoView({block:'center'})`);
await s.dormir(1200);

const sonde = () =>
  s.evaluer(`(() => {
    const nuit = document.querySelector('.o-nuit');
    const grille = nuit.querySelector('[class*="grid-cols-"][class*="gap-2"]');
    const coches = [...nuit.querySelectorAll('div[class*="rounded-lg"]')]
      .filter(e => e.querySelector('svg'));
    return {
      colonnes: grille ? (grille.className.match(/grid-cols-\\d/) || ['?'])[0] : 'absente',
      allumees: coches.filter(e => /0\\.2\\)|51, 51, 51/.test(getComputedStyle(e).backgroundColor)
                                  || getComputedStyle(e).backgroundColor.includes('0.2')).length,
      opaciteTuile: Number(getComputedStyle(nuit.querySelector('[class*="col-span-2"]')).opacity).toFixed(2),
      /* le SPAN de l'animation, pas le textContent de la bande : « Chèque
         TIC » figure aussi dans le paragraphe de la tuile, et le lire la
         rendait verte alors que le squelette pulsait pour toujours. */
      atterri: [...nuit.querySelectorAll('span')].some(e => e.textContent.trim() === 'Chèque TIC'),
    };
  })()`);

const t = [];
for (let i = 0; i < 3; i++) { t.push(await sonde()); await s.dormir(1300); }

console.log(`${url}\n`);
t.forEach((x, i) => console.log(`  t+${(i * 1.3).toFixed(1)}s  recomposition ${x.colonnes.padEnd(12)} coches allumees ${x.allumees}  tuile opacite ${x.opaciteTuile}  « Cheque TIC » ${x.atterri ? 'oui' : 'non'}`));

const bouge = new Set(t.map((x) => x.colonnes)).size > 1;
const compte = new Set(t.map((x) => x.allumees)).size > 1;
/* la DERNIERE mesure, pas toutes : l'entree `whileInView` dure une demi-
   seconde et le premier echantillon la surprend a 0,00 — c'est une valeur
   DE TRAJET. Exiger 0,9 sur les trois faisait echouer une tuile qui entre
   tres bien (0,00 → 0,10 → 1,00). Meme faux negatif que survol-arguments. */
const visible = Number(t[t.length - 1].opaciteTuile) > 0.9;
const libelle = t[t.length - 1].atterri;

console.log("");
console.log(`  ${bouge ? "✓" : "✗"} la grille se recompose`);
console.log(`  ${compte ? "✓" : "✗"} les validations s'allument une à une`);
console.log(`  ${visible ? "✓" : "✗"} les tuiles sont bien entrées (whileInView)`);
console.log(`  ${libelle ? "✓" : "✗"} « Chèque TIC » a atterri`);

const ok = bouge && compte && visible && libelle;
console.log(ok ? "\n✓ les quatre animations tirent" : "\n✗ au moins une animation reste inerte");
if (s.soucis.length) console.log(s.soucis.filter((x) => !/insights/.test(x)).slice(0, 2).join("\n"));
await s.fermer();
process.exit(ok ? 0 : 1);
