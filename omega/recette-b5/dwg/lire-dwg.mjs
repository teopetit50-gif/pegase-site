// Essai B5 (06/10/2026), n° 6 du carnet : lecture d'un DWG par LibreDWG compilé en WebAssembly (@mlightcad/libredwg-web 0.7.15, GPL-3.0).
// usage : node lire-dwg.mjs <dossier où @mlightcad/libredwg-web est installé> <fichier.dwg> [sortie.svg]
// La bibliothèque n'est PAS une dépendance du site (licence GPL) : l'installer à part (npm i @mlightcad/libredwg-web dans un dossier jetable).
// Lecture d'un DWG par LibreDWG (WASM) : entités, calques, textes, cotes, blocs, SVG.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const [libs, fichier, sortieSvg] = process.argv.slice(2);
const require = createRequire(libs + '/package.json');
const { LibreDwg, Dwg_File_Type } = await import(libs + '/node_modules/@mlightcad/libredwg-web/dist/libredwg-web.js');
const t0 = Date.now();
const lib = await LibreDwg.create(libs + '/node_modules/@mlightcad/libredwg-web/wasm/');
const octets = readFileSync(fichier);
const ptr = lib.dwg_read_data(octets, Dwg_File_Type.DWG);
if (!ptr) { console.log('lecture impossible'); process.exit(1); }
const db = lib.convert(ptr);
const t1 = Date.now();
const types = {};
for (const e of db.entities) types[e.type] = (types[e.type] ?? 0) + 1;
const textes = db.entities.filter((e) => e.type === 'TEXT' || e.type === 'MTEXT').map((e) => (e.text ?? '').replace(/\s+/g, ' ').slice(0, 60)).filter(Boolean);
const cotes = db.entities.filter((e) => e.type === 'DIMENSION').map((e) => ({ mesure: e.measurement, texte: e.text, calque: e.layer }));
const attributs = db.entities.filter((e) => e.type === 'INSERT').flatMap((e) => (e.attribs ?? []).map((a) => `${a.tag}=${a.text}`)).slice(0, 10);
console.log(JSON.stringify({
  fichier: fichier.split('/').pop(), version: db.header?.ACADVER ?? db.header?.acadVersion, unites: db.header?.INSUNITS,
  lecture_ms: t1 - t0, entites: db.entities.length, types, calques: (db.tables?.LAYER?.entries ?? []).map((c) => c.name).slice(0, 15),
  blocs: (db.tables?.BLOCK_RECORD?.entries ?? []).length, textes: textes.slice(0, 8), nb_textes: textes.length,
  cotes: cotes.slice(0, 6), nb_cotes: cotes.length, attributs,
}, null, 1));
if (sortieSvg) {
  const t2 = Date.now();
  /* les droites infinies (XLINE, RAY) faussent l'emprise ; les tableaux font planter le convertisseur */
  const svg = lib.dwg_to_svg({ ...db, entities: db.entities.filter((e) => !['XLINE', 'RAY', 'ACAD_TABLE'].includes(e.type)) }).replace(/stroke-width="[^"]*"/g, 'stroke-width="0.15%"');
  writeFileSync(sortieSvg, svg);
  console.log(`svg : ${svg.length} octets en ${Date.now() - t2} ms`);
}
lib.dwg_free(ptr);
