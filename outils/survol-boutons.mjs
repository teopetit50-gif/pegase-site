/* Recette du survol des boutons (11/09/2026).

   La mécanique reprise de `flow-button` n'existe QU'au survol — un cercle
   d'encre qui éclôt, le rayon qui passe de 100 px à 12 px, le libellé qui
   bascule en négatif. Aucune capture statique ne le montre.

   ⚠ LE PIÈGE, et il coûte une heure : `Input.dispatchMouseEvent` ne suffit
   pas. Le nœud entre bien dans `document.querySelectorAll(':hover')` — le
   navigateur SAIT que la souris est dessus — mais Chrome headless
   n'applique pas pour autant les règles de style `:hover`. On mesure donc
   les valeurs de repos et on conclut « rien ne bouge » alors que tout va
   bien. La commande fiable est `CSS.forcePseudoState`, qui force l'état
   côté moteur de style.

   Second piège, celui de `chrome.mjs` : sans `screencast`, le compositeur
   n'avance pas et toutes les transitions restent à leur valeur de départ.
   `ouvrirSession` le démarre par défaut — ne pas le couper ici.

   usage : node outils/survol-boutons.mjs [url] [sélecteur] [libellé attendu]
*/
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "http://localhost:3010/";
const selecteur = process.argv[3] ?? ".o-btn--primary";

const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "boutons" });
await s.aller(url);
await s.dormir(900);

await s.envoyer("DOM.enable", {});
await s.envoyer("CSS.enable", {});
const doc = await s.envoyer("DOM.getDocument", { depth: -1 });
const q = await s.envoyer("DOM.querySelector", {
  nodeId: doc.result.root.nodeId,
  selector: selecteur,
});
const nodeId = q.result.nodeId;
if (!nodeId) {
  console.error(`Aucun élément « ${selecteur} » sur ${url}`);
  await s.fermer();
  process.exit(1);
}

const lire = async () =>
  s.evaluer(`(() => {
    const b = document.querySelector(${JSON.stringify(selecteur)});
    const c = getComputedStyle(b), av = getComputedStyle(b, '::before');
    return {
      libelle: b.textContent.trim().slice(0, 32),
      rayon: parseFloat(c.borderRadius).toFixed(1) + 'px',
      libelleCouleur: c.color,
      bordure: c.borderTopColor,
      cercle: Math.round(parseFloat(av.width)) + 'px',
      opacite: Number(av.opacity).toFixed(2),
      encre: av.backgroundColor,
    };
  })()`);

const repos = await lire();
await s.envoyer("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["hover"] });
/* les transitions de la source vont jusqu'à 800 ms ; on laisse 1,4 s pour
   lire une valeur d'arrivée et non un point du trajet */
await s.dormir(1400);
const survol = await lire();

console.log(`« ${repos.libelle} »   ${selecteur}   sur ${url}`);
console.log(`  ${"".padEnd(10)} ${"rayon".padEnd(9)} ${"cercle".padEnd(8)} ${"opac.".padEnd(6)} libellé`);
const l = (n, o) =>
  `  ${n.padEnd(10)} ${o.rayon.padEnd(9)} ${o.cercle.padEnd(8)} ${o.opacite.padEnd(6)} ${o.libelleCouleur}`;
console.log(l("repos", repos));
console.log(l("survol", survol));

const ok =
  parseFloat(survol.rayon) < parseFloat(repos.rayon) - 50 &&
  parseFloat(survol.cercle) > 250 &&
  Number(survol.opacite) > 0.9;
console.log(ok ? "\n✓ le cercle éclôt et la pastille devient carré adouci" : "\n✗ RIEN NE BOUGE au survol");
if (s.soucis.length) console.log(s.soucis.filter((x) => !/insights/.test(x)).slice(0, 2).join("\n"));
await s.fermer();
process.exit(ok ? 0 : 1);
