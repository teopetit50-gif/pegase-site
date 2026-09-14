/* Recette du survol des trois portes (10/09/2026).
   Une capture d'écran ne prouve rien ici : la surbrillance n'existe qu'au
   survol, et le volet du navigateur intégré fige le rendu quand il est
   replié (opacité bloquée à 0, captures noires). On pilote donc un Chromium
   à part, on envoie un VRAI mouvement de souris sur chaque carte, et on lit
   la boîte du pavé — c'est son déplacement d'une carte à l'autre qui est la
   promesse à vérifier. */
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "https://omega-site-v3.vercel.app";
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, screencast: true, marque: "portes" });
await s.aller(url);

/* Amener la rangée dans la fenêtre AVANT de mesurer : `getBoundingClientRect`
   est relatif à la fenêtre, et un `Input.dispatchMouseEvent` à y = 1900 ne
   touche rien du tout.

   DEUX pièges enchaînés sur les premiers essais, aucun n'était un défaut du
   site : (1) pas de défilement du tout ; (2) puis un défilement visant
   `a[href="/offres/sur-mesure"]` — qui est d'abord le lien du MENU depuis
   qu'il y figure, pas la carte. On vise donc la carte par son libellé, le
   seul qui n'existe qu'ici. */
await s.evaluer(`
  [...document.querySelectorAll('a')].find(a => /Comment ça se cadre/.test(a.textContent))
    ?.scrollIntoView({ block: 'center', behavior: 'instant' })
`);
await s.dormir(1200);

const cartes = await s.evaluer(`
  [...document.querySelectorAll('a')]
    .filter(a => /Voir les quatre|Comment ça se cadre|Voir les modèles/.test(a.textContent))
    .map(a => { const r = a.getBoundingClientRect();
                return { nom: a.querySelector('span')?.textContent, x: r.x + r.width/2, y: r.y + r.height/2 }; })
`);
console.log("cartes trouvées :", cartes.map((c) => c.nom).join(" · "));

const lirePave = () => s.evaluer(`
  (() => { const p = [...document.querySelectorAll('span[aria-hidden]')]
             .find(e => getComputedStyle(e).backgroundColor === 'rgb(241, 240, 237)');
           if (!p) return null;
           const r = p.getBoundingClientRect();
           return { x: Math.round(r.x), largeur: Math.round(r.width), opacite: getComputedStyle(p).opacity }; })()
`);

console.log("au repos :", JSON.stringify(await lirePave()));
for (const c of cartes) {
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y, buttons: 0 });
  await s.dormir(700);
  console.log(`survol « ${c.nom} » →`, JSON.stringify(await lirePave()));
}
if (s.soucis.length) console.log("soucis :", s.soucis.slice(0, 5));
s.fermer();
