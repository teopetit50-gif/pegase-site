#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   Vérifier l'aiguillage (29/10/2026, refonte des pages métiers)

   Chaque repère qu'un moteur écrit vers le dashboard doit trouver sa page :
   - chaque objet_type posé à côté d'un 'lien' dans une migration de
     omega/modules a sa règle dans components/espace2/aiguillage.ts ;
   - chaque « /espace/<x> » écrit par un moteur a sa page app/espace2/<x>.

   node outils/verifier-aiguillage.mjs          → la liste, code 1 s'il manque une règle
   À relancer après chaque nouvelle migration qui écrit un lien, et après
   chaque refonte d'une page métier.
   ══════════════════════════════════════════════════════════════════════ */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const racine = new URL("..", import.meta.url).pathname;

function fichiers(dossier) {
  const out = [];
  for (const nom of readdirSync(dossier)) {
    const p = join(dossier, nom);
    if (statSync(p).isDirectory()) out.push(...fichiers(p));
    else if (nom.endsWith(".sql")) out.push(p);
  }
  return out;
}

const ligneDe = (texte, i) => texte.slice(0, i).split("\n").length;

/* les règles de l'aiguillage : les clés du bloc REGLES */
const source = readFileSync(join(racine, "components/espace2/aiguillage.ts"), "utf8");
const bloc = source.slice(source.indexOf("export const REGLES"), source.indexOf("\n};", source.indexOf("export const REGLES")));
const regles = new Set([...bloc.matchAll(/^\s+([a-z_]+):/gm)].map((m) => m[1]));

const objets = new Map(); // objet_type → premier endroit
const dynamiques = []; // objet_type calculé : à relire à la main
const pages = new Map(); // /espace/<x> → premier endroit
const autres = new Map(); // objet_type nommé ailleurs (demandes à valider…) → premier endroit
const PREFIXES = /^(filed|cashd|offload|reput|btp|loc|lorani|tamila|tiroma|grp)_/;

for (const f of fichiers(join(racine, "omega/modules"))) {
  const t = readFileSync(f, "utf8");
  const ou = (i) => `${relative(racine, f)}:${ligneDe(t, i)}`;
  for (const m of t.matchAll(/'lien'\s*,/g)) {
    const apres = t.slice(m.index, m.index + 420);
    /* « 'objet_type', e ->> 'objet_type' » est calculé : la valeur vient d'une autre fonction */
    const lit = apres.match(/'objet_type'\s*,\s*'([a-z_]+)'/);
    if (lit && lit[1] !== "objet_id") {
      if (!objets.has(lit[1])) objets.set(lit[1], ou(m.index));
    } else if (/'objet_type'\s*,\s*[^'\s]/.test(apres)) dynamiques.push(ou(m.index));
  }
  for (const m of t.matchAll(/objet_type[^,;']{0,8}(?:,|=|:=)\s*'([a-z]+_[a-z_]+)'/g))
    if (PREFIXES.test(m[1]) && !autres.has(m[1])) autres.set(m[1], ou(m.index));
  for (const m of t.matchAll(/'\/espace\/([a-z0-9-]+)/g)) if (!pages.has(m[1])) pages.set(m[1], ou(m.index));
  /* les fonctions de lien de Lorani portent leur objet dans le nom */
  if (/lorani_lien_permis\(/.test(t) && !objets.has("lorani_permis")) objets.set("lorani_permis", relative(racine, f));
  if (/lorani_lien_projet\(/.test(t) && !objets.has("lorani_projets")) objets.set("lorani_projets", relative(racine, f));
  /* les objet_type calculés en amont (« 'tiroma_travaux_labo'::text as objet_type ») */
  for (const m of t.matchAll(/'([a-z_]+)'::text as objet_type/g)) if (!objets.has(m[1])) objets.set(m[1], ou(m.index));
}

let manque = 0;
console.log(`Objets écrits par les moteurs : ${objets.size}, règles dans l'aiguillage : ${regles.size}`);
for (const [type, ou] of [...objets].sort()) {
  const ok = regles.has(type);
  if (!ok) manque++;
  console.log(`  ${ok ? "ok      " : "MANQUE  "} ${type.padEnd(28)} ${ou}`);
}
console.log(`\nPages visées par les moteurs : ${pages.size}`);
for (const [page, ou] of [...pages].sort()) {
  const ok = existsSync(join(racine, "app/espace2", page));
  if (!ok) manque++;
  console.log(`  ${ok ? "ok      " : "MANQUE  "} /espace2/${page.padEnd(19)} ${ou}`);
}
const sansRegle = [...autres].filter(([type]) => !regles.has(type) && !objets.has(type)).sort();
if (sansRegle.length) {
  console.log(`\nAutres objet_type sans règle (demandes à valider…) : ils mènent à la page du module, à préciser à la refonte :`);
  for (const [type, ou] of sansRegle) console.log(`  ${type.padEnd(28)} ${ou}`);
}
if (dynamiques.length) {
  console.log(`\nobjet_type calculé (à relire à la main) :`);
  for (const ou of dynamiques) console.log(`  ${ou}`);
}
console.log(manque ? `\n${manque} repère(s) sans page.` : "\nChaque repère a sa page.");
process.exit(manque ? 1 : 0);
