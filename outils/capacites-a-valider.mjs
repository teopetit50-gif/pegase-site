/* ══════════════════════════════════════════════════════════════════════
   Le relevé de ce qui est écrit mais pas construit (14/09/2026)

   Les quatre catalogues de capacités des pages produit portent, ligne à
   ligne, un drapeau `atteste`. Décision de Teo du 14/09 : « pour l'instant
   le site ne va pas être en ligne, donc on peut mettre des trucs faux, on
   modifiera une fois qu'on le partagera ». Ce script est la contrepartie :
   il rend la liste exacte de ce qu'il faudra construire, retirer ou dater
   avant que quiconque voie ces pages.

   Usage, depuis la racine du banc :
     node outils/capacites-a-valider.mjs          → affiche le relevé
     node outils/capacites-a-valider.mjs --ecrire → réécrit CAPACITES-A-VALIDER.md

   Il lit les fichiers SOURCE, pas le rendu : une ligne commentée n'est pas
   comptée, et une ligne ajoutée sans drapeau fait échouer le script plutôt
   que de passer inaperçue.
   ══════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from "node:fs";

const MODULES = [
  { code: "FILED", route: "/offres/factures-fournisseurs", f: "lib/produits/capacites/factures.ts" },
  { code: "CASHD", route: "/offres/relances-impayes", f: "lib/produits/capacites/relances.ts" },
  { code: "RELOAD", route: "/offres/nouvelles-affaires", f: "lib/produits/capacites/reprise.ts" },
  { code: "FRONTD", route: "/offres/demandes-clients", f: "lib/produits/capacites/accueil.ts" },
];

/* Une ligne de capacité, telle qu'elle est écrite dans les catalogues :
   { t: "…", atteste: true }. On lit la source plutôt que d'importer le
   module, pour que ce script tourne sans compilation ni serveur. */
const LIGNE = /\{\s*t:\s*"((?:[^"\\]|\\.)*)"\s*,\s*atteste:\s*(true|false)\s*\}/g;
const FAMILLE = /nom:\s*"((?:[^"\\]|\\.)*)"\s*,\s*icone:/g;
const SANS_DRAPEAU = /\{\s*t:\s*"(?:[^"\\]|\\.)*"\s*\}/g;

let erreurs = 0;
const releve = [];

for (const m of MODULES) {
  const src = readFileSync(m.f, "utf8");

  const nus = src.match(SANS_DRAPEAU);
  if (nus) {
    console.error(`✗ ${m.f} : ${nus.length} ligne(s) sans drapeau \`atteste\``);
    erreurs += nus.length;
  }

  /* Les familles servent à ranger le relevé : on découpe la source aux
     bornes de chaque famille, puis on lit les lignes de chaque tranche. */
  const bornes = [...src.matchAll(FAMILLE)].map((x) => ({ nom: x[1], i: x.index }));
  const lignes = [...src.matchAll(LIGNE)].map((x) => ({
    t: x[1],
    atteste: x[2] === "true",
    i: x.index,
  }));

  const familles = bornes.map((b, k) => {
    const fin = k + 1 < bornes.length ? bornes[k + 1].i : Infinity;
    return { nom: b.nom, lignes: lignes.filter((l) => l.i > b.i && l.i < fin) };
  });

  const total = familles.reduce((n, f) => n + f.lignes.length, 0);
  const attestees = familles.reduce((n, f) => n + f.lignes.filter((l) => l.atteste).length, 0);
  releve.push({ ...m, familles, total, attestees });
}

const lignesTexte = [];
const dire = (s = "") => lignesTexte.push(s);

dire("# Capacités à valider avant tout partage du site");
dire();
dire(
  "> Relevé produit par `node outils/capacites-a-valider.mjs`. Ne pas le tenir à la main :",
);
dire("> il se régénère depuis les quatre catalogues.");
dire();
dire(
  "Chaque ligne cochée existe et se montre en démonstration. Chaque ligne **non cochée** est écrite sur la page sans être construite : elle doit être bâtie, retirée, ou marquée comme feuille de route datée avant que la page soit montrée à qui que ce soit.",
);
dire();

dire("| Module | Page | Capacités | Attestées | À trancher |");
dire("|---|---|---|---|---|");
for (const m of releve) {
  dire(
    `| ${m.code} | \`${m.route}\` | ${m.total} | ${m.attestees} | **${m.total - m.attestees}** |`,
  );
}
const T = releve.reduce((n, m) => n + m.total, 0);
const A = releve.reduce((n, m) => n + m.attestees, 0);
dire(`| **Total** | | **${T}** | **${A}** | **${T - A}** |`);
dire();

for (const m of releve) {
  dire(`## ${m.code} — \`${m.route}\``);
  dire();
  for (const f of m.familles) {
    const reste = f.lignes.filter((l) => !l.atteste);
    if (reste.length === 0) continue;
    dire(`**${f.nom}**`);
    dire();
    for (const l of reste) dire(`- [ ] ${l.t}`);
    dire();
  }
}

const sortie = lignesTexte.join("\n") + "\n";

if (process.argv.includes("--ecrire")) {
  writeFileSync("CAPACITES-A-VALIDER.md", sortie);
  console.log(`✓ CAPACITES-A-VALIDER.md réécrit — ${T - A} lignes à trancher sur ${T}.`);
} else {
  console.log(sortie);
}

process.exit(erreurs > 0 ? 1 : 0);
