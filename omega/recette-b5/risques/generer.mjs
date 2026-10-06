// Lorani, b5_24 — fabrique les fichiers de données des risques (omega/modules/lorani/donnees/b5_24_*.sql) depuis les
// données ouvertes. Rejouable : `node omega/recette-b5/risques/generer.mjs [--sismique <France_zonage_sismique.dbf>]`.
//   · GASPAR (risques recensés par commune, DDRM) : https://files.georisques.fr/GASPAR/gaspar.zip, mis à jour chaque
//     semaine — à relancer pour rafraîchir ; seuls les fichiers « libelles » et « risques » changent alors.
//   · Radon (arrêté du 27 juin 2018, ASN) : radon.csv sur data.gouv.fr.
//   · Sismicité (décret 2010-1255) : la table attributaire du « Zonage sismique de la France » (data.gouv.fr, zip de
//     129 Mo) ; le zonage ne change pas, on ne la relit que si on passe --sismique.
// Chaque fichier appelle private.lorani_ref_charger(nom, lignes, source, version) ; 150 Ko au plus par fichier.
import { inflateRawSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(ICI, "../../modules/lorani/donnees");
const GASPAR = "https://files.georisques.fr/GASPAR/gaspar.zip";
const RADON = "https://static.data.gouv.fr/resources/connaitre-le-potentiel-radon-de-ma-commune/20190506-174309/radon.csv";
const SISMIQUE = "https://static.data.gouv.fr/resources/zonage-sismique-de-la-france-1/20180730-100725/France_zonage_sismique.zip";
const PLAFOND = 150_000;
const INSEE = /^[0-9][0-9AB][0-9]{3}$/;

async function telecharger(url) {
  for (let essai = 1; ; essai++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (essai >= 5) throw new Error(`${url} : ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 2000 * essai));
    }
  }
}

// Lecture d'un zip par son répertoire central (méthodes 0 et 8).
function lireZip(buf) {
  let fin = buf.length - 22;
  while (fin >= 0 && buf.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error("zip illisible");
  const n = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  const fichiers = new Map();
  for (let i = 0; i < n; i++) {
    const methode = buf.readUInt16LE(p + 10), taille = buf.readUInt32LE(p + 20);
    const ln = buf.readUInt16LE(p + 28), le = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nom = buf.subarray(p + 46, p + 46 + ln).toString("utf8");
    fichiers.set(nom, () => {
      const debut = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const brut = buf.subarray(debut, debut + taille);
      return methode === 0 ? brut : inflateRawSync(brut);
    });
    p += 46 + ln + le + lc;
  }
  return fichiers;
}

// Table attributaire d'un shapefile (dBase III).
function lireDbf(buf, encodage = "latin1") {
  const n = buf.readUInt32LE(4), lh = buf.readUInt16LE(8), lr = buf.readUInt16LE(10);
  const champs = [];
  for (let p = 32; buf[p] !== 0x0d; p += 32) champs.push({ nom: buf.subarray(p, p + 11).toString("latin1").replace(/\0.*$/s, ""), l: buf[p + 16] });
  const lignes = [];
  for (let i = 0; i < n; i++) {
    let p = lh + i * lr + 1;
    const o = {};
    for (const c of champs) { o[c.nom] = new TextDecoder(encodage).decode(buf.subarray(p, p + c.l)).trim(); p += c.l; }
    lignes.push(o);
  }
  return lignes;
}

function ecrire(nom, lignes, source, version) {
  const paquets = [];
  let courant = [], taille = 0;
  for (const l of lignes) {
    if (l.includes("$l$")) throw new Error(`ligne interdite : ${l}`);
    if (taille + l.length + 1 > PLAFOND && courant.length) { paquets.push(courant); courant = []; taille = 0; }
    courant.push(l); taille += l.length + 1;
  }
  if (courant.length) paquets.push(courant);
  const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
  paquets.forEach((p, i) => {
    const fichier = join(SORTIE, `b5_24_${nom}_${String(i + 1).padStart(2, "0")}.sql`);
    writeFileSync(fichier, `-- Lorani b5_24 — référentiel « ${nom} », lot ${i + 1}/${paquets.length} (${p.length} lignes). Généré par omega/recette-b5/risques/generer.mjs.\n`
      + `-- Source : ${source} (${version}). Licence ouverte Etalab.\n`
      + `select private.lorani_ref_charger(${q(nom)}, $l$\n${p.join("\n")}\n$l$, ${q(source)}, ${q(version)});\n`);
    console.log(`${fichier.replace(/.*omega\//, "omega/")} : ${p.length} lignes`);
  });
}

const args = process.argv.slice(2);
mkdirSync(SORTIE, { recursive: true });

// GASPAR : libellés et risques par commune.
{
  const zip = lireZip(await telecharger(GASPAR));
  const nom = [...zip.keys()].find((k) => /^ddrm_risq_gaspar_.*\.csv$/.test(k));
  if (!nom) throw new Error("ddrm_risq_gaspar absent de gaspar.zip");
  const version = nom.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? "?";
  const texte = zip.get(nom)().toString("utf8").replace(/^﻿/, "");
  const [entete, ...lignes] = texte.split(/\r?\n/).filter(Boolean);
  const cols = entete.split(";");
  const iC = cols.indexOf("cod_commune"), iL = cols.indexOf("lib_risque"), iN = cols.indexOf("num_risque");
  const libelles = new Map(), communes = new Map();
  for (const l of lignes) {
    const c = l.split(";");
    const insee = c[iC]?.trim(), num = c[iN]?.trim(), lib = c[iL]?.trim();
    if (!INSEE.test(insee ?? "") || !/^[0-9A-Z]{2,6}$/.test(num ?? "") || !lib) continue;
    libelles.set(num, lib.replaceAll(";", ","));
    if (!communes.has(insee)) communes.set(insee, new Set());
    communes.get(insee).add(num);
  }
  const triNum = (a, b) => a.length - b.length || a.localeCompare(b);
  ecrire("libelles", [...libelles].sort((a, b) => triNum(a[0], b[0])).map(([n, l]) => `${n};${l}`), `${GASPAR} (${nom})`, version);
  ecrire("risques", [...communes].sort((a, b) => a[0].localeCompare(b[0])).map(([i, s]) => `${i};${[...s].sort(triNum).join(",")}`), `${GASPAR} (${nom})`, version);
}

// Radon.
{
  const texte = (await telecharger(RADON)).toString("utf8").replace(/^﻿/, "");
  const [entete, ...lignes] = texte.split(/\r?\n/).filter(Boolean);
  const cols = entete.split(";");
  const iI = cols.indexOf("insee_com"), iC = cols.indexOf("classe_potentiel");
  const vu = new Map();
  for (const l of lignes) {
    const c = l.split(";");
    if (INSEE.test(c[iI] ?? "") && /^[123]$/.test(c[iC] ?? "")) vu.set(c[iI], c[iC]);
  }
  ecrire("radon", [...vu].sort((a, b) => a[0].localeCompare(b[0])).map(([i, k]) => `${i};${k}`), RADON, "arrêté du 27 juin 2018");
}

// Sismicité : seulement sur demande (fichier de 129 Mo, zonage inchangé depuis 2011).
const iS = args.indexOf("--sismique");
if (iS >= 0) {
  const vu = new Map();
  for (const o of lireDbf(readFileSync(args[iS + 1]))) {
    const m = o.Sismicite?.match(/^([1-5])\s*-\s*(.+)$/);
    if (INSEE.test(o.insee ?? "") && m) vu.set(o.insee, `${m[1]};${m[1]} - ${m[2].trim()}`);
  }
  ecrire("sismicite", [...vu].sort((a, b) => a[0].localeCompare(b[0])).map(([i, z]) => `${i};${z}`), SISMIQUE, "décret n° 2010-1255 du 22 octobre 2010");
}
