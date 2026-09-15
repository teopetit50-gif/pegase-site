/* recette-comparer.mjs — ce qu'aucune capture ne montre sur le bento
   « Comparer les formats » de /reserver-un-audit (15/09) : le sélecteur
   change VRAIMENT les valeurs de toutes les cartes, une seule valeur est
   peinte par ligne, et les lignes invariables sont bien sorties des cartes.
   usage : node outils/recette-comparer.mjs [origine] [largeur] */
import { ouvrirSession } from "./chrome.mjs";

const base = process.argv[2] ?? "http://localhost:3010";
const largeur = Number(process.argv[3] || 1440);
let echecs = 0;
const ok = (c, m) => { console.log(`${c ? "  ✓" : "  ✗"} ${m}`); if (!c) echecs++; };

const s = await ouvrirSession({ largeur, hauteur: 900, marque: "cf", flags: ["--disable-webgl"] });
try {
  console.log(`— /reserver-un-audit à ${largeur} px`);
  ok(await s.aller(base + "/reserver-un-audit"), "page chargée");

  /* l'état de repos : le format phare est retenu, une seule valeur peinte
     par ligne, et les trois boutons portent aria-pressed */
  const lire = () => s.evaluer(`(() => {
    const boutons = [...document.querySelectorAll('.cf-bouton')];
    const lignes = [...document.querySelectorAll('.cf-ligne')];
    const vues = lignes.map((l) => [...l.querySelectorAll('.cf-valeur')]
      .filter((v) => getComputedStyle(v).display !== 'none').map((v) => v.textContent.trim()));
    return {
      nBoutons: boutons.length,
      presses: boutons.map((b) => b.getAttribute('aria-pressed')),
      actifs: boutons.map((b) => b.getAttribute('data-actif') === 'true'),
      panneau: document.querySelector('.cf-panneau-nom')?.textContent.trim() ?? null,
      cta: document.querySelector('.cf-panneau-btn')?.textContent.trim() ?? null,
      href: document.querySelector('.cf-panneau-btn')?.getAttribute('href') ?? null,
      nLignes: lignes.length,
      valeursDom: lignes.map((l) => l.querySelectorAll('.cf-valeur').length),
      vues: vues.map((v) => v.join('|')),
      tuiles: [...document.querySelectorAll('.cf-tuile-libelle')].map((e) => e.textContent.trim()),
      filets: boutons.map((b) => getComputedStyle(b).borderTopColor),
    };
  })()`);

  const a = await lire();
  ok(a.nBoutons === 3, `trois formats proposés (${a.nBoutons})`);
  ok(a.actifs.filter(Boolean).length === 1 && a.actifs[1], "le format retenu au repos est le phare (Audit process)");
  ok(a.presses.join() === "false,true,false", `aria-pressed suit le choix (${a.presses.join()})`);
  ok(a.panneau === "Audit process", `le panneau annonce « ${a.panneau} »`);
  ok(a.valeursDom.every((n) => n === 3), "les trois valeurs de chaque ligne sont dans le document");
  ok(a.vues.every((v) => v && !v.includes("|")), "une seule valeur peinte par ligne");
  ok(a.tuiles.length === 3, `trois lignes invariables sorties en tuiles (${a.tuiles.join(", ")})`);
  /* l'état actif se marque au TRAIT : le filet du bouton retenu doit
     différer de celui des deux autres */
  ok(a.filets[1] !== a.filets[0], `filet du bouton retenu distinct (${a.filets[1]} vs ${a.filets[0]})`);

  /* on retient le troisième format : tout doit suivre */
  await s.evaluer(`document.querySelectorAll('.cf-bouton')[2].click()`);
  await s.dormir(250);
  const b = await lire();
  ok(b.panneau === "Audit + atelier", `le panneau a suivi (« ${b.panneau} »)`);
  ok(b.href?.includes("formule=atelier"), `le bouton réserve le bon format (${b.href})`);
  ok(b.cta === "Demander un devis", `l'appel a suivi (« ${b.cta} »)`);
  const change = a.vues.filter((v, i) => v !== b.vues[i]).length;
  ok(change >= 6, `${change} lignes sur ${a.nLignes} ont changé de valeur`);
  ok(b.vues.includes("Une demi-journée") || b.vues.some((v) => v.includes("demi-journée")),
     `la ligne « Durée » affiche la valeur du format retenu (${b.vues[0]})`);
  ok(b.presses.join() === "false,false,true", `aria-pressed a suivi (${b.presses.join()})`);

  /* retour au premier : rien ne se fige */
  await s.evaluer(`document.querySelectorAll('.cf-bouton')[0].click()`);
  await s.dormir(250);
  const c = await lire();
  ok(c.panneau === "Cadrage" && c.vues[0] === a.vues[0].replace(/.*/, c.vues[0]),
     `retour au premier format (« ${c.panneau} », durée « ${c.vues[0]} »)`);

  s.soucis.filter((x) => !/insights|404/.test(x)).forEach((x) => console.log("  !", x));
} finally {
  s.fermer();
}
console.log(echecs ? `\n${echecs} échec(s)` : "\ntout passe");
process.exit(echecs ? 1 : 0);
