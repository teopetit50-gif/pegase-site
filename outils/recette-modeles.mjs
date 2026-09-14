/* recette-modeles.mjs — ce qu'aucune capture de defile.mjs ne prouve sur
   /modeles refaite (14/09/2026) :
   · le hero parallaxe BOUGE au défilement (motion écoute le scroll natif ;
     si Lenis déplaçait le contenu par transform, tout resterait figé) ;
   · les puces filtrent la galerie (5 → 21 cartes), sans élargir la page ;
   · le survol d'une carte voile les autres (effet « focus ») ;
   · sous sm, les puces sont un rail qui défile, et la page reste à 390 px ;
   · les faisceaux de la boucle sont bien tracés (5 chemins + dégradés).
   usage : node outils/recette-modeles.mjs http://localhost:3010/modeles [dossier] */
import { writeFileSync, mkdirSync } from "node:fs";
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "http://localhost:3010/modeles";
const dossier = process.argv[3] ?? "captures-modeles";
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (cond, msg) => { console.log(`${cond ? "  ✓" : "  ✗"} ${msg}`); if (!cond) echecs++; };
const capture = async (s, nom) => {
  const { result } = await s.envoyer("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${dossier}/${nom}.png`, Buffer.from(result.data, "base64"));
};
const clic = async (s, x, y) => {
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
  await s.envoyer("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};
const centre = (s, sel, texte) => s.evaluer(`
  (() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})]
             .find(e => ${texte ? `e.textContent.includes(${JSON.stringify(texte)})` : "true"});
           if (!el) return null; const r = el.getBoundingClientRect();
           return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; })()`);

/* ═══════════ 1440 ═══════════ */
{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "modeles" });
  console.log("— 1440 × 900");
  ok(await s.aller(url), "page chargée");

  /* hero : le parallaxe bouge-t-il ? */
  const lireX = () => s.evaluer(`getComputedStyle(document.querySelector('.hd-carte')).transform`);
  const x0 = await lireX();
  /* Lenis lisse le défilement et le ressort de motion (stiffness 300) met
     ~1 s à suivre : à 900 ms on lisait encore « none » et on accusait le
     parallaxe. Une molette réelle en plus du scrollTo, et 1,5 s. */
  await s.evaluer("window.scrollTo(0, 700)");
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: 300 });
  await s.dormir(1500);
  const x1 = await lireX();
  ok(x0 !== x1, `hero : transform change au défilement (${x0} → ${x1})`);
  await capture(s, "1440-hero-defile");

  /* galerie : les puces */
  await s.evaluer("document.querySelector('#catalogue').scrollIntoView({block:'start', behavior:'instant'})");
  await s.dormir(1200);
  /* les 21 cartes sont TOUTES dans le HTML (la galerie ne vide pas le DOM
     au filtrage) : une carte masquée a une boîte nulle, pas un display:none
     sur elle-même — compter les boîtes, jamais les styles calculés */
  const visibles = () => s.evaluer(`[...document.querySelectorAll('.mg-carte')].filter(c => c.getClientRects().length > 0 && getComputedStyle(c).opacity === '1').length`);
  const n0 = await visibles();
  ok(n0 === 5, `catalogue par défaut : ${n0} cartes visibles (attendu 5)`);
  const p = await centre(s, "[role=radio]", "Tous les modèles");
  ok(!!p, "puce « Tous les modèles » trouvée");
  const hAvant = await s.evaluer("document.querySelector('#catalogue').getBoundingClientRect().height");
  await clic(s, p.x, p.y); await s.dormir(900);
  const n1 = await visibles();
  ok(n1 === 21, `après « Tous » : ${n1} cartes visibles (attendu 21)`);
  const hApres = await s.evaluer("document.querySelector('#catalogue').getBoundingClientRect().height");
  ok(hApres > hAvant, `le panneau grandit (${Math.round(hAvant)} → ${Math.round(hApres)} px)`);
  const deb = await s.evaluer("document.documentElement.scrollWidth - window.innerWidth");
  ok(deb === 0, `débordement horizontal ${deb}`);
  const coche = await s.evaluer(`document.querySelector('[role=radio][aria-checked=true]').textContent`);
  ok(/Tous/.test(coche), `puce cochée : ${coche}`);
  await capture(s, "1440-galerie-tous");

  /* focus : survol d'une carte */
  const p2 = await centre(s, "[role=radio]", "Vos clients");
  await clic(s, p2.x, p2.y); await s.dormir(900);
  /* viser la première carte VISIBLE (la première du DOM peut être masquée
     par le filtre : centre (0,0), la souris ne touche rien) */
  const c = await s.evaluer(`(() => { const el = [...document.querySelectorAll('.mg-carte')].find(c => c.getClientRects().length > 0);
      el.scrollIntoView({block:'center', behavior:'instant'}); const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await s.dormir(400);
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y, buttons: 0 });
  await s.dormir(700);
  const etat = await s.evaluer(`
    (() => { const cs = [...document.querySelectorAll('.mg-carte')].filter(c => c.getClientRects().length > 0);
             const sur = document.querySelector('.mg-carte:hover'); const autre = cs.find(c => c !== sur);
             return { hover: matchMedia('(hover: hover)').matches, survolee: !!sur, premiere: sur && getComputedStyle(sur).opacity, autre: autre && getComputedStyle(autre).opacity,
                      filtre: autre && getComputedStyle(autre).filter, translate: sur && (getComputedStyle(sur).translate || getComputedStyle(sur).transform) }; })()`);
  ok(etat.survolee && etat.premiere === "1" && Number(etat.autre) < 1, `survol : ${JSON.stringify(etat)}`);
  await capture(s, "1440-galerie-survol");

  /* boucle : faisceaux tracés */
  await s.evaluer("document.querySelector('.bf-svg')?.scrollIntoView({block:'center', behavior:'instant'})");
  await s.dormir(1500);
  const bf = await s.evaluer(`(() => { const svg = document.querySelector('.bf-svg'); if (!svg) return null;
      const paths = [...svg.querySelectorAll('path')]; return { n: paths.length, grads: svg.querySelectorAll('linearGradient').length,
      d0: paths[0]?.getAttribute('d')?.slice(0, 60), boite: svg.getBoundingClientRect().width }; })()`);
  ok(bf && bf.n >= 5 && bf.grads >= 5 && bf.boite > 0, `boucle : ${JSON.stringify(bf)}`);
  await capture(s, "1440-boucle");
  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
  s.fermer();
}

/* ═══════════ 390 ═══════════ */
{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: "modeles390" });
  console.log("— 390 × 844");
  ok(await s.aller(url), "page chargée");
  await s.evaluer("document.querySelector('#catalogue').scrollIntoView({block:'start', behavior:'instant'})");
  await s.dormir(1200);
  const rail = await s.evaluer(`(() => { const r = document.querySelector('.mg-puces'); const b = r.getBoundingClientRect();
     return { scroll: r.scrollWidth, client: r.clientWidth, x: Math.round(b.x), droite: Math.round(b.right), page: document.documentElement.scrollWidth,
              lignes: Math.round(b.height) }; })()`);
  ok(rail.scroll > rail.client, `rail des puces : ${rail.scroll} > ${rail.client} (défilable)`);
  ok(rail.lignes < 60, `rail sur une ligne (${rail.lignes} px de haut)`);
  ok(rail.page === 390, `page à ${rail.page} px de large (attendu 390)`);
  ok(rail.x <= 26 && rail.droite >= 364, `le rail va d'un bord du panneau à l'autre (${rail.x} → ${rail.droite})`);
  await capture(s, "390-puces-rail");
  await s.evaluer("document.querySelector('.mg-puces').scrollTo({left: 9999, behavior: 'instant'})"); await s.dormir(400);
  await capture(s, "390-puces-rail-fin");
  const p = await centre(s, "[role=radio]", "Tous les modèles");
  ok(!!p && p.x < 390, `puce « Tous » visible après défilement du rail (x=${p && Math.round(p.x)})`);
  if (p) { await clic(s, p.x, p.y); await s.dormir(900); }
  const n = await s.evaluer(`[...document.querySelectorAll('.mg-carte')].filter(c => getComputedStyle(c).opacity === '1').length`);
  ok(n === 21, `21 cartes après « Tous » sur mobile (${n})`);
  const deb = await s.evaluer("document.documentElement.scrollWidth - window.innerWidth");
  ok(deb === 0, `débordement horizontal ${deb}`);
  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
  s.fermer();
}
console.log(echecs ? `\n${echecs} échec(s)` : "\ntout passe");
process.exit(echecs ? 1 : 0);
