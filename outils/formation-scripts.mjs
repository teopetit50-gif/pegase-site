// Tire docs/formation/SCRIPTS.md (le prompteur de Teo) du catalogue des vidéos
// de la formation : components/espace2/formation/videos.ts.
// Usage : node outils/formation-scripts.mjs   (Node 22.6 ou plus : lit le TypeScript directement)
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(racine, "components/espace2/formation/videos.ts");

/* le catalogue est lu dans un Node séparé, avec la lecture du TypeScript activée */
const lu = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", `import(${JSON.stringify("file://" + source)}).then((m) => process.stdout.write(JSON.stringify(m.VIDEOS)))`],
  { encoding: "utf8" },
);
if (lu.status !== 0) {
  process.stderr.write(lu.stderr);
  process.exit(1);
}
const VIDEOS = JSON.parse(lu.stdout);

const PAGES = {
  guide: "Guide de démarrage",
  principes: "Comment marche Omega",
  "premiere-semaine": "Votre première semaine",
  filed: "FILED",
  cashd: "CASHD",
  reput: "REPUT",
  offload: "OFFLOAD",
  espace: "Votre espace au quotidien",
  reseau: "Le Réseau Omega",
  daliro: "DALIRO",
  lorani: "LORANI",
  tavaro: "TAVARO",
  tiroma: "TIROMA",
  tamila: "TAMILA",
  varelo: "VARELO",
};

const fiches = Object.entries(VIDEOS);
const ecrites = fiches.filter(([, f]) => f.etapes?.length);
const tournees = fiches.filter(([, f]) => f.tournee);

let md = `# Formation Omega : scripts des vidéos

> Fichier produit par \`node outils/formation-scripts.mjs\` à partir de
> \`components/espace2/formation/videos.ts\`. Ne pas le modifier à la main.

${fiches.length} vidéos au catalogue, ${ecrites.length} scripts écrits, ${tournees.length} tournées.

## Pour tourner

- Filmez **omegaai.fr/espace2 sans être connecté** : c'est l'entreprise d'exemple, aucune vraie donnée n'apparaît.
- Écran de 1440 × 900 ou plus, thème sombre, zoom du navigateur à 100 %.
- Un geste par vidéo, du premier clic au résultat. Le texte « À dire » est un guide : dites-le avec vos mots.
- Déposez le fichier (MP4 ou MOV) sur Drive, Dropbox ou WeTransfer et collez le lien sur la ligne de la vidéo dans /omega → Formation, avec son identifiant.

`;

for (const [page, nom] of Object.entries(PAGES)) {
  const ici = fiches.filter(([, f]) => f.page === page);
  if (!ici.length) continue;
  md += `## ${nom}\n\n`;
  for (const [id, f] of ici) {
    const etat = f.tournee ? "tournée" : f.etapes?.length ? "à tourner" : "script à écrire";
    md += `### ${f.titre}\n\nIdentifiant : \`${id}\` · ${etat}`;
    if (f.depart) md += ` · départ : https://omegaai.fr${f.depart}`;
    md += "\n\n";
    if (f.objectif) md += `*Objectif : ${f.objectif}*\n\n`;
    if (f.etapes?.length) {
      md += "| # | À l'écran | À dire |\n|---|---|---|\n";
      f.etapes.forEach((e, i) => {
        md += `| ${i + 1} | ${e.ecran.replace(/\|/g, "\\|")} | ${e.dire.replace(/\|/g, "\\|")} |\n`;
      });
      md += "\n";
    }
  }
}

const sortie = join(racine, "docs/formation/SCRIPTS.md");
writeFileSync(sortie, md);
console.log(`${sortie} : ${fiches.length} vidéos, ${ecrites.length} scripts.`);

/* L'import du catalogue dans le tableau « formation » de /omega (omega_lignes).
   C'est une écriture en base de production : le fichier est PRÉPARÉ ici, il ne
   s'exécute qu'avec l'accord de Teo (docs/formation/QUESTIONS-POUR-TEO.md).
   Une vidéo déjà importée (même « Identifiant ») n'est pas recréée. */
const q = (t) => "'" + String(t).replace(/'/g, "''") + "'";
let sql = `-- Produit par node outils/formation-scripts.mjs : NE PAS EXÉCUTER sans l'accord de Teo.
-- Importe le catalogue des vidéos de la formation dans /omega → Formation.
begin;
`;
fiches.forEach(([id, f], i) => {
  const script = (f.etapes ?? []).map((e, n) => `${n + 1}. À l'écran : ${e.ecran}\nÀ dire : ${e.dire}`).join("\n\n");
  const donnees = {
    Identifiant: id,
    Module: PAGES[f.page] ?? f.page,
    Vidéo: f.titre,
    Statut: f.tournee ? "En ligne" : f.etapes?.length ? "À tourner" : "Script à écrire",
    /* la clé lue et écrite par components/omega/Formation.tsx (« y » n'est que dans le libellé affiché) */
    "Ce qu'on apprend": f.objectif ?? "",
    Script: (f.depart ? `Départ : https://omegaai.fr${f.depart}\n\n` : "") + script,
    Durée: f.tournee ? `${Math.round(f.tournee.duree / 60)} min` : "",
    Lien: "",
  };
  sql += `insert into omega_lignes (tableau, ordre, donnees)
select 'formation', ${1000 + i}, ${q(JSON.stringify(donnees))}::jsonb
where not exists (select 1 from omega_lignes where tableau = 'formation' and donnees->>'Identifiant' = ${q(id)});
`;
});
sql += "commit;\n";
const fichierSql = join(racine, "docs/formation/import-omega-lignes.sql");
writeFileSync(fichierSql, sql);
console.log(`${fichierSql} : ${fiches.length} lignes préparées (non exécutées).`);
