/* Recette du survol des deux lueurs de l'accueil (11/09/2026).
   `CartesLueur` (section garanties) allume un LISERÉ, `BentoLueur` (section
   « à lire ») une NAPPE. Aucune capture ne les montre : les deux n'existent
   que sous le pointeur, et le volet du navigateur intégré fige le rendu
   quand il est replié. On pilote donc un Chromium à part, on envoie de VRAIS
   mouvements de souris à deux endroits de la même carte, et on lit la
   position de la lueur — c'est son DÉPLACEMENT entre les deux points qui est
   la promesse à vérifier, pas sa présence.

   L'accueil peint son fond en WebGL : sans `--disable-webgl`, le premier
   Runtime.evaluate ne rend jamais la main.

   DEUX pièges, aucun n'était un défaut du site :
   (1) `a[href="/blog/facturation-electronique-2026"]` désigne D'ABORD le
       bouton de la section « échéance », qui mène au même article. On vise
       donc la tuile par ce qu'elle est la seule à contenir : sa lueur.
   (2) Une attente de 500 ms lisait l'opacité à 0,08 sur une transition de
       500 ms : en headless, la page n'avance que de quelques trames par
       seconde. Il faut laisser une bonne seconde, sinon on croit à une
       lueur éteinte alors qu'elle est en train de s'allumer.
*/
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "http://localhost:3010/";
const s = await ouvrirSession({ largeur: 1440, hauteur: 900, screencast: true,
                                densite: 1, flags: ["--disable-webgl"], marque: "lueur" });
await s.aller(url);

/* ── 1 · le liseré des cartes de garantie ─────────────────────────── */
await s.evaluer(`
  document.querySelector('a[href="/tarifs#cheque-tic"].group')
    ?.scrollIntoView({ block: 'center', behavior: 'instant' })`);
await s.dormir(900);

const boite = await s.evaluer(`
  (() => { const a = document.querySelector('a[href="/tarifs#cheque-tic"].group');
           if (!a) return null; const r = a.getBoundingClientRect();
           return { x: Math.round(r.x), y: Math.round(r.y),
                    w: Math.round(r.width), h: Math.round(r.height) }; })()`);
if (!boite) { console.log("carte de garantie introuvable"); s.fermer(); process.exit(1); }

const lireDisque = () => s.evaluer(`
  (() => { const a = document.querySelector('a[href="/tarifs#cheque-tic"].group');
           const d = a?.querySelector('span.rounded-full');
           if (!d) return null; const c = getComputedStyle(d);
           /* Tailwind v4 pose l'echelle et la translation sur les
              proprietes INDIVIDUELLES scale / translate, pas sur transform :
              lire .transform renvoie matrix(1,0,0,1,0,0) sur un element
              pourtant bien mis a l'echelle, et on croit l'effet mort.
              (Pas d'accent grave ici : on est dans un gabarit de chaine.) */
           return { gauche: d.style.left, haut: d.style.top, opacite: c.opacity,
                    echelle: c.scale, decalage: c.translate }; })()`);

console.log("\n── liseré (carte « Financement ») ──");
console.log("au repos        :", JSON.stringify(await lireDisque()));
for (const [nom, fx, fy] of [["coin haut-gauche", 0.15, 0.15], ["coin bas-droit", 0.85, 0.85]]) {
  await s.envoyer("Input.dispatchMouseEvent",
    { type: "mouseMoved", x: boite.x + boite.w * fx, y: boite.y + boite.h * fy, buttons: 0 });
  await s.dormir(1400);
  console.log(`souris ${nom.padEnd(16)}:`, JSON.stringify(await lireDisque()));
}

/* ── 2 · la nappe des tuiles d'articles ───────────────────────────── */
await s.evaluer(`
  [...document.querySelectorAll('a[href="/blog/facturation-electronique-2026"]')]
    .find(a => a.querySelector('span.pointer-events-none'))
    ?.scrollIntoView({ block: 'center', behavior: 'instant' })`);
await s.dormir(900);

const tuile = await s.evaluer(`
  (() => { const a = [...document.querySelectorAll('a[href="/blog/facturation-electronique-2026"]')]
             .find(x => x.querySelector('span.pointer-events-none'));
           if (!a) return null; const r = a.getBoundingClientRect();
           return { x: Math.round(r.x), y: Math.round(r.y),
                    w: Math.round(r.width), h: Math.round(r.height) }; })()`);

const lireNappe = () => s.evaluer(`
  (() => { const a = [...document.querySelectorAll('a[href="/blog/facturation-electronique-2026"]')]
             .find(x => x.querySelector('span.pointer-events-none'));
           const n = a?.querySelector('span.pointer-events-none');
           if (!n) return null;
           return { fond: (n.style.background || '(aucun)').slice(0, 62),
                    opacite: getComputedStyle(n).opacity }; })()`);

console.log("\n── nappe (grande tuile « Facturation électronique ») ──");
console.log("au repos        :", JSON.stringify(await lireNappe()));
for (const [nom, fx, fy] of [["coin haut-gauche", 0.2, 0.2], ["coin bas-droit", 0.8, 0.8]]) {
  await s.envoyer("Input.dispatchMouseEvent",
    { type: "mouseMoved", x: tuile.x + tuile.w * fx, y: tuile.y + tuile.h * fy, buttons: 0 });
  await s.dormir(1400);
  console.log(`souris ${nom.padEnd(16)}:`, JSON.stringify(await lireNappe()));
}

if (s.soucis.length) console.log("\nsoucis :", s.soucis.slice(0, 5));
s.fermer();
