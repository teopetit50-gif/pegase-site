/* Recette du survol de la rangée d'arguments (/offres, 11/09/2026).

   Trois effets se déclenchent au survol d'une case de `features-hover`, et
   AUCUN ne se voit sur une capture : le lavis qui monte du bas, l'ergot qui
   passe de 24 à 36 px et vire au blanc, l'intitulé qui glisse de 8 px.

   Deux pièges, tous deux déjà payés ailleurs dans ce dossier :

   1. `Input.dispatchMouseEvent` ne suffit pas — Chrome headless sait que la
      souris est sur le nœud mais n'applique pas les règles `:hover`. On lit
      alors les valeurs de repos et on conclut « rien ne bouge ». La commande
      fiable est `CSS.forcePseudoState` (voir survol-boutons.mjs).
   2. En Tailwind v4, `translate-x-2` n'écrit PAS dans `transform` mais dans
      la propriété `translate`. Lire `transform` rend `none` sur une case qui
      bouge très bien — même famille de mensonge que l'échelle
      ([[tailwind-v4-echelle-hors-transform]]).

   usage : node outils/survol-arguments.mjs [url]
*/
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "http://localhost:3010/offres";
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "arguments" });
await s.aller(url);
/* 1,6 s et non 900 ms : les blocs `data-reveal` de la page ont leur propre
   transition d'apparition, et la premiere case mesuree rendait 0,78 au lieu
   de 1 — une valeur DE TRAJET, pas un effet qui ne tire pas. */
await s.dormir(1600);

await s.envoyer("DOM.enable", {});
await s.envoyer("CSS.enable", {});
const doc = await s.envoyer("DOM.getDocument", { depth: -1 });

const cases = await s.evaluer(
  `document.querySelectorAll('.group\\\\/arg').length`
);
if (!cases) {
  console.error("aucune case .group/arg — le composant n'est pas sur la page");
  await s.fermer();
  process.exit(1);
}

const lire = (i) =>
  s.evaluer(`(() => {
    const c = document.querySelectorAll('.group\\\\/arg')[${i}];
    const lavis = c.querySelector('[aria-hidden].bg-gradient-to-t');
    const ergot = c.querySelector('h3 > span[aria-hidden]');
    const titre = c.querySelector('h3 > span:not([aria-hidden])');
    const g = (e) => getComputedStyle(e);
    return {
      nom: titre.textContent.trim().slice(0, 26),
      lavis: Number(g(lavis).opacity).toFixed(2),
      ergot: Math.round(parseFloat(g(ergot).height)) + 'px',
      encre: g(ergot).backgroundColor,
      /* la propriete translate, PAS transform — cf. l'entete */
      glisse: g(titre).translate,
    };
  })()`);

let tout = true;
console.log(`${cases} cases · ${url}\n`);
console.log(`  ${"case".padEnd(27)} ${"lavis".padEnd(13)} ${"ergot".padEnd(13)} glisse`);

for (let i = 0; i < cases; i++) {
  const q = await s.envoyer("DOM.querySelectorAll", {
    nodeId: doc.result.root.nodeId,
    selector: ".group\\/arg",
  });
  const nodeId = q.result.nodeIds[i];

  const repos = await lire(i);
  await s.envoyer("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["hover"] });
  await s.dormir(700);
  const survol = await lire(i);
  await s.envoyer("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
  await s.dormir(250);

  const ok =
    Number(repos.lavis) < 0.05 &&
    Number(survol.lavis) > 0.9 &&
    parseFloat(survol.ergot) > parseFloat(repos.ergot) + 6 &&
    repos.encre !== survol.encre &&
    /px/.test(survol.glisse || "");
  if (!ok) tout = false;

  console.log(
    `  ${(ok ? "✓ " : "✗ ") + repos.nom.padEnd(25)} ${(repos.lavis + " → " + survol.lavis).padEnd(13)} ${(repos.ergot + " → " + survol.ergot).padEnd(13)} ${repos.glisse || "none"} → ${survol.glisse || "none"}`
  );
}

console.log(tout ? "\n✓ les trois effets tirent sur les quatre cases" : "\n✗ au moins une case reste inerte");
if (s.soucis.length) console.log(s.soucis.filter((x) => !/insights/.test(x)).slice(0, 2).join("\n"));
await s.fermer();
process.exit(tout ? 0 : 1);
