/* Recette du panneau plein écran (téléphone et tablette), 11/09/2026.

   Ce qu'il faut prouver depuis qu'il se replie :
   – CINQ rangées visibles au repos, pas onze, et donc AUCUN défilement ;
   – un appui sur une rubrique fait apparaître ses entrées, un appui sur une
     autre replie la première (une seule à la fois) ;
   – aucune entrée ne reste à `opacity: 0` — le défaut qui rendrait le menu
     vide sur fond opaque ;
   – le pied reste collé au bas de l'écran, et rien ne déborde en largeur.

   On APPUIE (clic), on ne survole pas : c'est un panneau tactile, et le
   survol n'y ouvre rien. */
import { ouvrirSession } from "./chrome.mjs";

const base = process.argv[2] ?? "http://localhost:3010";
const LARGEURS = process.argv[3] ? [Number(process.argv[3])] : [390, 768];

const ETAT =
  '(() => { const p = document.getElementById("menu-principal");' +
  ' const liste = p.querySelector("nav > div");' +
  ' const pied = p.querySelector("nav > div:last-child");' +
  ' const visible = (e) => !!e.offsetParent;' +
  ' const rangees = [...liste.children].map((n) => {' +
  '   const t = n.tagName === "A" ? n : n.querySelector("button");' +
  '   const sous = n.tagName === "A" ? [] : [...n.querySelectorAll("a")];' +
  '   return { nom: t.textContent.trim(), type: n.tagName === "A" ? "lien" : "rubrique",' +
  '     ouvert: t.getAttribute("aria-expanded") === "true",' +
  '     sousVisibles: sous.filter(visible).length, sousTotal: sous.length,' +
  '     pales: [...sous, t].filter((e) => visible(e) && getComputedStyle(e).opacity !== "1").length }; });' +
  ' return { visibilite: getComputedStyle(p).visibility,' +
  '   rangees, defile: Math.max(0, liste.scrollHeight - liste.clientHeight),' +
  '   piedBas: Math.round(pied.getBoundingClientRect().bottom), fenetre: innerHeight,' +
  '   debord: document.documentElement.scrollWidth - innerWidth }; })()';

const appui = async (s, x, y) => {
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
    await s.envoyer("Input.dispatchMouseEvent", {
      type, x, y, button: "left",
      clickCount: type === "mouseMoved" ? 0 : 1,
      buttons: type === "mousePressed" ? 1 : 0, pointerType: "mouse",
    });
  await s.dormir(500);
};

const centre = async (s, selecteur) =>
  s.evaluer(
    "(() => { const e = " + selecteur + ";" +
    " if (!e) return null; const r = e.getBoundingClientRect();" +
    " return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()",
  );

for (const largeur of LARGEURS) {
  const s = await ouvrirSession({ largeur, hauteur: 844, marque: "pan", flags: ["--disable-webgl"] });
  await s.aller(base + "/");
  /* plancher d'hydratation : un appui sur une page non hydratée ne fait rien */
  await s.dormir(4500);

  console.log(`\n─── panneau à ${largeur} px ───`);

  const b = await centre(s, 'document.querySelector(\'button[aria-controls="menu-principal"]\')');
  if (!b) {
    console.log("burger introuvable — le bandeau a-t-il pris la relève ?");
    s.fermer();
    continue;
  }
  await appui(s, b.x, b.y);
  await s.dormir(900);

  let e = await s.evaluer(ETAT);
  console.log(
    `ouvert=${e.visibilite}  ${e.rangees.length} rangées  défilement=${e.defile}` +
      `  pied à ${e.piedBas}/${e.fenetre}  débord=${e.debord}`,
  );
  console.log("  " + e.rangees.map((r) => `${r.nom}(${r.type})`).join("  ·  "));
  if (e.defile) console.log("  ⚠ LE PANNEAU DÉFILE AU REPOS");
  if (e.piedBas !== e.fenetre) console.log("  ⚠ PIED NON ANCRÉ");

  /* déplier chaque rubrique à tour de rôle */
  for (const r of e.rangees.filter((x) => x.type === "rubrique")) {
    const c = await centre(
      s,
      '[...document.querySelectorAll(\'#menu-principal button\')].find((b) => b.textContent.trim() === ' +
        JSON.stringify(r.nom) + ")",
    );
    await appui(s, c.x, c.y);
    e = await s.evaluer(ETAT);
    const moi = e.rangees.find((x) => x.nom === r.nom);
    const autres = e.rangees.filter((x) => x.type === "rubrique" && x.nom !== r.nom && x.sousVisibles);
    const pales = e.rangees.reduce((n, x) => n + x.pales, 0);
    console.log(
      `  appui « ${r.nom} » → ${moi.sousVisibles}/${moi.sousTotal} entrées visibles` +
        `  défilement=${e.defile}  débord=${e.debord}` +
        (moi.sousVisibles !== moi.sousTotal ? "  ⚠ ENTRÉES MANQUANTES" : "") +
        (autres.length ? "  ⚠ AUTRE RUBRIQUE RESTÉE OUVERTE : " + autres.map((a) => a.nom).join(", ") : "") +
        (pales ? `  ⚠ ${pales} ÉLÉMENT(S) À OPACITÉ < 1` : ""),
    );
  }

  const bruit = s.soucis.filter((m) => !/favicon|ERR_ABORTED|webpack-hmr/.test(m));
  if (bruit.length) console.log("  console :", bruit.slice(0, 3).join(" | "));
  s.fermer();
  await new Promise((r) => setTimeout(r, 300));
}
console.log("\nfini");
process.exit(0);
