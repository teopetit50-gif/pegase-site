/* Recette du FOND BLANC au survol des trois portes (14/09/2026).

   Une capture ne prouve rien : le blanc n'existe qu'au survol, et
   `element.matches(':hover')` ment dès qu'on n'a pas envoyé un vrai
   événement d'entrée — on pilote donc un Chromium à part et on pousse un
   `Input.dispatchMouseEvent` par point mesuré.

   Trois pièges, tous rencontrés ici :
   (1) L'accueil peint son fond en WebGL : sans `--disable-webgl`, le premier
       `Runtime.evaluate` ne rend jamais la main (voir chrome.mjs).
   (2) La rangée n'est rendue qu'à partir de `lg` (`hidden lg:block`) : à
       1024 px et moins, il n'y a rien à survoler et la sonde ne trouve rien.
   (3) Le survol est sous `@media (hover: hover)`. On le VÉRIFIE avant de
       conclure quoi que ce soit, sinon un fond resté gris se lit comme un
       défaut de CSS alors que c'est le harnais qui ne se présente pas comme
       une souris.
   (4) Le TOUT PREMIER `mouseMoved` de la session ne marque rien : il n'y a
       pas encore de position de pointeur, et la carte visée reste à
       `:hover` faux. D'où le passage par (10, 10) avant chaque point — ce
       qui sert aussi de retour au repos entre deux cartes.

   DEUX POINTS par carte, et c'est tout l'objet de la sonde : le centre de la
   carte, et la MARGE de 8 px du lien (son `p-2`), que la carte ne couvre
   pas. C'est là que `:hover` sur la carte seule ne suffisait pas — la
   surbrillance s'y allume déjà, puisqu'elle suit le `mouseenter` du LIEN. */
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "http://127.0.0.1:3111";
const s = await ouvrirSession({
  largeur: 1440, hauteur: 900, screencast: true,
  marque: "portes-fond", densite: 1, flags: ["--disable-webgl"],
});
await s.aller(url);

console.log("(hover: hover) :", await s.evaluer(`matchMedia('(hover: hover)').matches`));

/* Viser la carte par son libellé de lien — le seul texte qui n'existe qu'ici.
   « Voir les quatre » et « Voir les modèles » figurent aussi ailleurs sur la
   page, mais jamais dans un `a` qui contient une `.o-card-porte`. */
const AMENER = `
  [...document.querySelectorAll('a')]
    .find(a => a.querySelector('.o-card-porte'))
    ?.scrollIntoView({ block: 'center', behavior: 'instant' })`;
await s.evaluer(AMENER);
/* 1,8 s et non 900 ms : sur le build de production, les apparitions au
   défilement tiennent encore le thread principal, et le premier survol n'est
   alors traité qu'une demi-seconde après son envoi — on mesure la carte à
   t ≈ 0 de sa transition, donc encore grise, et on croit à un défaut. */
await s.dormir(1800);

const cartes = await s.evaluer(`
  [...document.querySelectorAll('a')]
    .filter(a => a.querySelector('.o-card-porte'))
    .map(a => {
      const l = a.getBoundingClientRect(), c = a.querySelector('.o-card-porte').getBoundingClientRect();
      return { nom: a.querySelector('span')?.textContent,
               centre: { x: Math.round(c.x + c.width / 2), y: Math.round(c.y + c.height / 2) },
               marge:  { x: Math.round(l.x + l.width / 2), y: Math.round(l.y + 3) } };
    })`);
console.log("cartes trouvées :", cartes.length, "—", cartes.map((c) => c.nom).join(" · "));
if (!cartes.length) { console.log("RIEN À SURVOLER (rangée sous `lg` ?)"); s.fermer(); process.exit(1); }

/* On lit la carte i, et le pavé de surbrillance (le seul span en #f1f0ed). */
const lire = (i) => s.evaluer(`
  (() => {
    const c = [...document.querySelectorAll('a')].filter(a => a.querySelector('.o-card-porte'))[${i}]
                .querySelector('.o-card-porte');
    const g = getComputedStyle(c);
    const p = [...document.querySelectorAll('span[aria-hidden]')]
                .find(e => getComputedStyle(e).backgroundColor === 'rgb(241, 240, 237)');
    return { fond: g.backgroundColor, filet: g.borderTopColor,
             ombre: g.boxShadow === 'none' ? 'aucune' : 'posée',
             survolee: c.matches(':hover'),
             pave: p ? Math.round(p.getBoundingClientRect().x) + ' px, opacité ' + getComputedStyle(p).opacity : 'éteint' };
  })()`);

const bouger = async (x, y) => {
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
  await s.dormir(900);
};

await bouger(10, 10);
console.log("au repos      :", JSON.stringify(await lire(0)));

for (let i = 0; i < cartes.length; i++) {
  const c = cartes[i];
  await bouger(c.centre.x, c.centre.y);
  console.log(`centre « ${c.nom} »`.padEnd(38), JSON.stringify(await lire(i)));
  await bouger(c.marge.x, c.marge.y);
  console.log(`marge  « ${c.nom} »`.padEnd(38), JSON.stringify(await lire(i)));
  await bouger(10, 10);
}

if (s.soucis.length) console.log("soucis :", s.soucis.slice(0, 5));
s.fermer();
