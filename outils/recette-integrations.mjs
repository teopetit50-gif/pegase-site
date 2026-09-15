/* recette-integrations.mjs — ce qu'aucune capture ne prouve sur /integrations
   refaite (14/09/2026) : les puces filtrent la grille sans rien retirer du
   HTML, le rail du raccordement se REMPLIT au défilement (et est plein sans
   JavaScript), le lavis des cartes système glisse au survol, l'orbite tourne.
   usage : node outils/recette-integrations.mjs [url] [dossier] */
import { writeFileSync, mkdirSync } from "node:fs";
import { ouvrirSession } from "./chrome.mjs";

const url = process.argv[2] ?? "http://localhost:3010/integrations";
const dossier = process.argv[3] ?? "captures-integrations";
mkdirSync(dossier, { recursive: true });
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? "  ✓" : "  ✗"} ${m}`); if (!c) echecs++; };
const capture = async (s, nom) => {
  const { result } = await s.envoyer("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${dossier}/${nom}.png`, Buffer.from(result.data, "base64"));
};
const clic = async (s, x, y) => {
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
  await s.envoyer("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};

{
  const s = await ouvrirSession({ largeur: 1440, hauteur: 900, marque: "integr" });
  console.log("— 1440 × 900");
  ok(await s.aller(url), "page chargée");

  /* ── l'orbite tourne (animation CSS : lire l'animation-name calculé) */
  const orb = await s.evaluer(`(() => { const e = document.querySelector('.orb-bloc [class*="satellite"], .orb-bloc > span:nth-child(4)');
    const c = e && getComputedStyle(e); if (!c) return null;
    return { nom: c.animationName, duree: c.animationDuration, n: document.querySelectorAll('.orb-bloc span[role="img"], .orb-bloc svg').length }; })()`);
  ok(orb && /orb-/.test(orb.nom), `orbite animée : ${JSON.stringify(orb)}`);

  /* ── les puces filtrent SANS retirer du HTML */
  await s.evaluer(`document.querySelector('.go-puces').scrollIntoView({block:'center', behavior:'instant'})`);
  await s.dormir(1200);
  const dansLeHtml = await s.evaluer(`document.querySelectorAll('.go-carte').length`);
  ok(dansLeHtml === 28, `les 28 cartes sont dans le DOM (${dansLeHtml})`);
  const visibles = () => s.evaluer(`[...document.querySelectorAll('.go-carte')].filter(c => c.getClientRects().length > 0).length`);
  const n0 = await visibles();
  const libelle0 = await s.evaluer(`document.querySelector('.go-puce[aria-checked=true]').textContent`);
  ok(n0 > 0 && n0 < 28, `famille « ${libelle0} » : ${n0} cartes visibles`);
  const pTous = await s.evaluer(`(() => { const b = [...document.querySelectorAll('.go-puce')].find(e => /Tous/.test(e.textContent));
    const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()`);
  await clic(s, pTous.x, pTous.y); await s.dormir(900);
  const n1 = await visibles();
  ok(n1 === 28, `puce « Tous » : ${n1} cartes visibles (attendu 28)`);
  const deb = await s.evaluer("document.documentElement.scrollWidth - window.innerWidth");
  ok(deb === 0, `débordement horizontal ${deb}`);
  await capture(s, "1440-grille-tous");

  /* ── le rail du raccordement se remplit */
  await s.evaluer(`document.querySelector('.frs-cadre').scrollIntoView({block:'end', behavior:'instant'})`);
  await s.dormir(1400);
  const p1 = await s.evaluer(`getComputedStyle(document.querySelector('.frs-cadre')).getPropertyValue('--frs-p').trim()`);
  await s.evaluer(`window.scrollBy(0, 700)`); await s.dormir(1600);
  const p2 = await s.evaluer(`getComputedStyle(document.querySelector('.frs-cadre')).getPropertyValue('--frs-p').trim()`);
  ok(p1 !== p2, `rail : le remplissage change au défilement (${p1} → ${p2})`);
  const jalons = await s.evaluer(`[...document.querySelectorAll('.frs-jalon-on')].map(e => getComputedStyle(e).opacity)`);
  ok(jalons.length === 4, `quatre jalons, opacités ${JSON.stringify(jalons)}`);
  await capture(s, "1440-frise");

  /* ── le lavis des cartes système glisse */
  await s.evaluer(`document.querySelector('.csy-carte').scrollIntoView({block:'center', behavior:'instant'})`);
  await s.dormir(1200);
  const c1 = await s.evaluer(`(() => { const e = document.querySelectorAll('.csy-carte')[0].getBoundingClientRect();
    return { x: e.x + e.width/2, y: e.y + e.height/2 }; })()`);
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: c1.x, y: c1.y, buttons: 0 });
  await s.dormir(800);
  const lavis1 = await s.evaluer(`(() => { const l = document.querySelector('.csy-lavis'); if (!l) return null;
    const r = l.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; })()`);
  const c3 = await s.evaluer(`(() => { const e = document.querySelectorAll('.csy-carte')[2].getBoundingClientRect();
    return { x: e.x + e.width/2, y: e.y + e.height/2 }; })()`);
  await s.envoyer("Input.dispatchMouseEvent", { type: "mouseMoved", x: c3.x, y: c3.y, buttons: 0 });
  await s.dormir(900);
  const lavis2 = await s.evaluer(`(() => { const l = document.querySelector('.csy-lavis'); if (!l) return null;
    const r = l.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; })()`);
  ok(lavis1 && lavis2 && lavis1.x !== lavis2.x, `lavis : glisse de x=${lavis1?.x} à x=${lavis2?.x}`);
  await capture(s, "1440-systemes-survol");
  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
  s.fermer();
}

{
  const s = await ouvrirSession({ largeur: 390, hauteur: 844, marque: "integr390" });
  console.log("— 390 × 844");
  ok(await s.aller(url), "page chargée");
  await s.evaluer(`document.querySelector('.go-puces').scrollIntoView({block:'center', behavior:'instant'})`);
  await s.dormir(1200);
  const rail = await s.evaluer(`(() => { const r = document.querySelector('.go-puces'); const b = r.getBoundingClientRect();
    return { scroll: r.scrollWidth, client: r.clientWidth, h: Math.round(b.height), page: document.documentElement.scrollWidth }; })()`);
  ok(rail.scroll > rail.client, `rail des puces défilable (${rail.scroll} > ${rail.client})`);
  ok(rail.h < 60, `rail sur une ligne (${rail.h} px)`);
  ok(rail.page === 390, `page à ${rail.page} px`);
  const orbDeb = await s.evaluer(`(() => { const o = document.querySelector('.orb-bloc'); const r = o.getBoundingClientRect();
    return { x: Math.round(r.x), droite: Math.round(r.right), page: document.documentElement.scrollWidth }; })()`);
  ok(orbDeb.x >= 0 && orbDeb.droite <= 390, `orbite dans l'écran (${orbDeb.x} → ${orbDeb.droite})`);
  await capture(s, "390-puces");
  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
  s.fermer();
}
console.log(echecs ? `\n${echecs} échec(s)` : "\ntout passe");
process.exit(echecs ? 1 : 0);
