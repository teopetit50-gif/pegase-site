#!/usr/bin/env node
// omega/prod/assembler.mjs — étape 1 du dossier MISE-EN-PRODUCTION.md : assembler omega/prod/migrations/ à partir de
// la sortie de omega/prod/exporter.sql (jouée sur la RECETTE par le coordinateur) et du dépôt git.
// A5, 06/10/2026. Ne touche à aucune base : lit des fichiers JSON et le dépôt, écrit des fichiers.
//
// Usage :
//   node omega/prod/assembler.mjs [--cloture] [--forcer] [--projet=<ref>] omega/prod/sortie/page-*.json
//     --projet  : référence du projet cible des URL (défaut : production noepmkkplxshjbmqqxft ; la répétition passe la sienne).
//     --cloture : ajoute en dernier a5_01_private_execute.sql (étape C du dossier), lu sur origin/worker-a5.
//     --forcer  : écrit même si un contrôle de contenu échoue (déconseillé ; le manifeste le signale).
//
// Entrée : chaque page est le tableau JSON rendu par execute_sql (objets {version, name, decision, source, provenance,
// sql, octets}). La page 0 (sans texte) et les pages avec texte se fusionnent par version.
//
// Pour chaque ligne à emporter :
//   · source « depot » : la provenance nomme un ou plusieurs fichiers (branche, SHA, chemin) ; chaque fichier est lu par
//     `git show <sha>:<chemin>` (avec `git fetch origin <branche>` si le SHA manque), dans l'ordre de la provenance ;
//   · source « sql » : le texte de statements.
// Transformations, toujours notées dans l'en-tête et le manifeste :
//   · URL de la recette réécrite en production (ygwbgpowzlbdaajlsqkn → noepmkkplxshjbmqqxft : crons 19b, 19v, 19aa…) ;
//   · `create extension … pgtap` retiré (pgTAP ne va pas en production).
// Contrôles (refus, sauf --forcer) : donnée du banc, comptes de recette, clé publique de la recette, outillage de pose
// (depot_demander/depot_executer) ou de test (tests_en_tache, tester_sans_trace, schéma tests) dans un fichier emporté.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RECETTE = 'ygwbgpowzlbdaajlsqkn';
// Projet cible des URL réécrites : la production par défaut ; --projet=<ref> pour la répétition (sa branche ou sa copie).
const PROJET_ARG = process.argv.find((a) => a.startsWith('--projet='));
const PRODUCTION = PROJET_ARG ? PROJET_ARG.slice('--projet='.length) : 'noepmkkplxshjbmqqxft';
if (!/^[a-z]{20}$/.test(PRODUCTION)) { console.error(`--projet : référence de projet invalide (${PRODUCTION})`); process.exit(2); }
if (PRODUCTION === 'ygwbgpowzlbdaajlsqkn') { console.error('--projet : la recette ne peut pas être la cible'); process.exit(2); }
const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..', '..');
const SORTIE = process.env.OMEGA_SORTIE_MIGRATIONS || join(ICI, 'migrations');

const INTERDITS = [
  [/cccccccc-0000-4000-8000-00000000000c/i, 'client du banc'],
  [/banc-varelo\.test/i, 'compte de recette'],
  [/Recette-Omega-2026/, 'mot de passe de recette'],
  [/sb_publishable_[A-Za-z0-9_]+/, 'clé publique de la recette'],
  [/function\s+private\.(depot_demander|depot_executer)\b/i, 'outillage de pose de la recette'],
  [/function\s+private\.(tests_en_tache|tester_sans_trace)\b/i, 'outillage de test de la recette'],
  [/create\s+schema\s+(if\s+not\s+exists\s+)?tests\b/i, 'schéma tests'],
  [/\(\s*'environnement'\s*,\s*'recette'\s*\)/i, "réglage d'environnement de la recette (19ah_recette_seulement)"],
];

function git(...args) {
  return execFileSync('git', args, { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function commitPresent(sha) {
  try { git('cat-file', '-e', `${sha}^{commit}`); return true; } catch { return false; }
}

function lireAuSha(sha, chemin) {
  if (!estCommit(sha)) throw new Error(`commit ${sha} introuvable`);
  return git('show', `${sha}:${chemin}`);
}

// Fichiers corrigés depuis leur pose sur la recette (relevé du coordinateur, 06/10) : la production prend la version
// corrigée. Clé : chemin ; valeur : SHA de remplacement et raison.
const REMPLACEMENTS = {
  'omega/migrations/a4_14_filed_lot7_cle_valeurs_humaines.sql': { sha: '7c29802', raison: 'A4 a corrigé le fichier (EXECUTE des contrôles FILED)' },
  'omega/modules/tamila/migrations/b4_05_tamila_coffre.sql': { sha: 'dc24eec', raison: 'B4 a corrigé les grants (outils du coffre)' },
};

// Notes de pose qui ne désignent pas une migration du dépôt (relevé A5 du 22/10 sur l'export du coordinateur) : un fichier
// hors de migrations/, ou une exclusion motivée (réglage ou donnée propres à la recette, simple rappel).
const MANUELS = {
  tamila_b4_06_note: { exclure: 'rappel : b4_06 déjà enregistré à sa propre version' },
  recette_pa_bac_a_sable: { exclure: 'propre à la recette (bac à sable de la plateforme agréée, cron d\'échange de recette)' },
  messagerie_gmail_branche: { exclure: 'réglage de recette (fournisseur Gmail branché avec les secrets de la recette) : décision de production à part' },
  meta_whatsapp_branche: { exclure: 'réglage de recette seulement (secrets Meta de la recette)' },
  offload_omega_personnes_morales: { exclure: 'données : import OFFLOAD d\'Omega sur la recette' },
  a4_accord_sceau_banc: { exclure: 'données du banc (accord du sceau proposé par le gérant du banc)' },
  cashd_nobat_banc: { exclure: 'données du banc (essai NOBAT de CASHD)' },
  cashd_nobat_v2: { exclure: 'données du banc (essai NOBAT de CASHD, rejoué)' },
  // 25/10 : la production a déjà tamila_m10 et m10b, à l'identique (empreintes du 25/10) ; m10b supprime une fonction
  // (tamila_porte_delais) qu'elle n'a jamais eue : le rejouer échoue.
  tamila_m10b_porte_etroite: { exclure: 'déjà en production, à l\'identique (relevé du 25/10)' },
  daliro_taux_penalites_2026s2: { fichiers: [{ sha: '66f5ec6', chemin: 'omega/modules/daliro/reglages/taux_penalites_2026s2.sql' }] },
};

// 25/10 : lots POSÉS sur la recette SANS ligne dans schema_migrations (ses objets y sont, l'export ne les voyait pas ; la
// répétition du 25/10 échouait sur leurs tables). Fichier du dépôt au SHA de son dernier commit, version = l'heure UTC de
// ce commit (avant les lots qui en dépendent). Repérés en croisant les fichiers des branches et le relevé de la recette.
const RATTRAPES = [
  { version: '20261006145007', nom: 'b1_04_encours_groupe', sha: '786017e83c', chemin: 'omega/modules/varelo/migrations/b1_04_encours_groupe.sql' },
  { version: '20261006145030', nom: 'b2_03_avis_contravention', sha: '7e97d91a90', chemin: 'omega/modules/tavaro/migrations/b2_03_avis_contravention.sql' },
  { version: '20261006145031', nom: 'b2_04_designation_conservation', sha: '7e97d91a90', chemin: 'omega/modules/tavaro/migrations/b2_04_designation_conservation.sql' },
  { version: '20261006145403', nom: 'b4_07_tamila_conflits', sha: '875e83f883', chemin: 'omega/modules/tamila/migrations/b4_07_tamila_conflits.sql' },
  { version: '20261006145514', nom: 'a4_16b_filed_lot9_droits_meme_valeur', sha: '00eeeeb12f', chemin: 'omega/migrations/a4_16b_filed_lot9_droits_meme_valeur.sql' },
  { version: '20261006145515', nom: 'a4_17_filed_lot10_ecritures_fec', sha: '00eeeeb12f', chemin: 'omega/migrations/a4_17_filed_lot10_ecritures_fec.sql' },
  { version: '20261006145904', nom: 'b3_12c_droits_appelant', sha: '453e33283f', chemin: 'omega/modules/tiroma/migrations/b3_12c_droits_appelant.sql' },
  { version: '20261006151003', nom: 'b6_13_reception', sha: 'ed60ed2b78', chemin: 'omega/modules/daliro/migrations/b6_13_reception.sql' },
  { version: '20261006151004', nom: 'b6_14_tableau_correctif', sha: 'ed60ed2b78', chemin: 'omega/modules/daliro/migrations/b6_14_tableau_correctif.sql' },
  { version: '20261006151304', nom: 'b3_13_pilotage', sha: '80465b04dd', chemin: 'omega/modules/tiroma/migrations/b3_13_pilotage.sql' },
  { version: '20261006151642', nom: 'b6_15_point_matin', sha: '81a7b0461d', chemin: 'omega/modules/daliro/migrations/b6_15_point_matin.sql' },
  { version: '20261006151812', nom: 'b1_05_contrats_groupe', sha: 'd36967609b', chemin: 'omega/modules/varelo/migrations/b1_05_contrats_groupe.sql' },
  { version: '20261006152118', nom: 'b2_05_etats_des_lieux', sha: '36bd54f81e', chemin: 'omega/modules/tavaro/migrations/b2_05_etats_des_lieux.sql' },
  { version: '20261006154255', nom: 'b5_12_honoraires_phases', sha: '7515fbdd78', chemin: 'omega/modules/lorani/migrations/b5_12_honoraires_phases.sql' },
  { version: '20261006154622', nom: 'a4_18_filed_lot11_echange_pa', sha: '52100b4999', chemin: 'omega/migrations/a4_18_filed_lot11_echange_pa.sql' },
  { version: '20261011150902', nom: 'c2_07_liens', sha: '5526abb348', chemin: 'omega/modules/cashd/migrations/c2_07_liens.sql' },
  { version: '20261015122308', nom: 'b3t_05_couts_plan_de_flotte', sha: 'eb5b4cd267', chemin: 'omega/modules/tavaro/migrations/b3t_05_couts_plan_de_flotte.sql' },
  { version: '20261015131728', nom: 'b5_33_retenue_avance_penalites', sha: 'b340e3ed5a', chemin: 'omega/modules/lorani/migrations/b5_33_retenue_avance_penalites.sql' },
  { version: '20261018212801', nom: 'c3_12_indicateurs_services', sha: 'c13ea951b9', chemin: 'omega/modules/reput/migrations/c3_12_indicateurs_services.sql' },
  { version: '20261018213105', nom: 'c3_13_envoi_automatique', sha: '70b2e5039e', chemin: 'omega/modules/reput/migrations/c3_13_envoi_automatique.sql' },
];

const arbres = new Map();
function arbre(sha) {
  if (!arbres.has(sha)) arbres.set(sha, git('ls-tree', '-r', '--name-only', sha, 'omega').split('\n').filter(Boolean));
  return arbres.get(sha);
}

let recupere = false;
function estCommit(sha) {
  if (commitPresent(sha)) return true;
  if (!recupere) { recupere = true; try { git('fetch', '--quiet', 'origin'); } catch { /* hors ligne : on garde ce qu'on a */ } }
  return commitPresent(sha);
}

// Une note de pose → la liste ordonnée des fichiers, chacun avec le SHA qui le précède (sinon le premier qui le suit).
// Reconnaît : un chemin complet « omega/…/x.sql », un nom de fichier « b3_08_heures_locales.sql », un nom de lot
// « b5_06 », « a4_13 », une plage « b6_01..b6_04 », et le cas du socle « 19ab » quand le chemin est donné.
// Rend { fichiers, avertissements } ; un fichier de omega/tests/ est rendu avec test = true (exclu par l'appelant).
function lireNote(texte, nom = '') {
  const avertissements = [];
  const jetons = [];
  const re = /(omega\/[^\s'",;()]+\.sql)|([A-Za-z0-9_]+\.sql)|\b([abc]\d)_(\d{2})\s*(?:\.\.|…|à|-)\s*(?:[abc]\d_)?(\d{2})\b|\b([abc]\d_\d{2}[a-z]?|19[a-z]{1,2})(?:_v\d+)?\b|\b(worker-[a-z0-9]+|main)\b|\b([0-9a-f]{7,40})\b/g;
  for (const m of texte.matchAll(re)) {
    if (m[1]) jetons.push({ type: 'chemin', val: m[1], pos: m.index });
    else if (m[2]) jetons.push({ type: 'fichier', val: m[2], pos: m.index });
    else if (m[3]) { for (let i = Number(m[4]); i <= Number(m[5]); i++) jetons.push({ type: 'lot', val: `${m[3]}_${String(i).padStart(2, '0')}`, pos: m.index }); }
    else if (m[6]) {
      // « test a4_08 vert », « tests b5_* » : le nom désigne un test, pas une migration à emporter.
      const avantTok = texte.slice(Math.max(0, m.index - 60), m.index);
      const apresTok = texte.slice(m.index + m[0].length).split('\n')[0];
      // « test a4_08 », « tests c4_25, c4_27 » : des tests ; « a4_73 tests verts », « 19ax test 66 vert » : un état.
      if (/\btests?\b[\s:]*(?:[a-z]\d_\d{2}[a-z]?\s*(?:,|\+|et)\s*)*$/i.test(avantTok)) avertissements.push(`${m[6]} cité comme test : ignoré`);
      else if (/^[\s/a-z0-9_]*?\btests?\b[^\n]*?\b(verts?|rouges?)\b/i.test(apresTok) || /^\s*:\s*test_/i.test(apresTok)) avertissements.push(`${m[6]} cité pour un état de test : ignoré`);
      else jetons.push({ type: 'lot', val: m[6], pos: m.index });
    }
    else if (m[7]) jetons.push({ type: 'branche', val: m[7], pos: m.index });
    else if (m[8]) jetons.push({ type: 'sha', val: m[8], pos: m.index });
  }
  const shas = jetons.filter((j) => j.type === 'sha' && estCommit(j.val));
  const branches = jetons.filter((j) => j.type === 'branche');
  const vus = new Set();
  const fichiers = [];
  const nomsExplicites = jetons.filter((x) => x.type === 'chemin' || x.type === 'fichier').map((x) => x.val.split('/').pop());
  const utiles = jetons.filter((x) => ['chemin', 'fichier'].includes(x.type)
    || (x.type === 'lot' && !nomsExplicites.some((n) => n.startsWith(x.val + '_') || n === x.val + '.sql')));
  // 22/10 : « posé depuis le dépôt : <sha> » sans fichier ni lot cité : le nom de la version est celui du fichier
  // (suffixe _v2, _v3 retiré : la version corrigée du même fichier, au SHA de la note).
  if (utiles.length === 0 && nom && shas.length) {
    utiles.push({ type: 'nom', val: nom.replace(/_v\d+$/, ''), pos: shas[shas.length - 1].pos - 1 });
  }
  for (const j of utiles) {
    const avant = shas.filter((x) => x.pos < j.pos).pop();
    const apres = shas.find((x) => x.pos > j.pos);
    const suite = texte.slice(j.pos).match(/^[^\s(]*\s*\([^)]*?\b([0-9a-f]{7,40})\b/);
    const entre = suite && estCommit(suite[1]) ? suite[1] : null;
    const candidats = [entre, avant && avant.val, apres && apres.val].filter(Boolean);
    let sha = candidats[0];
    // 25/10 : « c3_36….sql @ <sha1> (reposé) ; omega/…/a4_79….sql @ <sha2> » : un chemin prend le premier SHA qui le porte.
    if (candidats.length > 1 && j.type === 'chemin') sha = candidats.find((c) => arbre(c).includes(j.val)) || sha;
    if (candidats.length > 1 && j.type !== 'chemin') {
      const trouve = candidats.find((c) => arbre(c).some((x) => x.includes('/migrations/') && (x.split('/').pop().startsWith(j.val + '_') || x.split('/').pop() === j.val + '.sql' || x.endsWith('/' + j.val))));
      if (trouve) sha = trouve;
    }
    let branche = (branches.filter((x) => x.pos < j.pos).pop() || branches[0] || {}).val || null;
    if (!sha && branche) { sha = `origin/${branche}`; avertissements.push(`${j.val} : aucun SHA, pointe de ${branche} prise`); }
    if (!sha) { avertissements.push(`${j.val} : ni SHA ni branche`); continue; }
    const tous = arbre(sha);
    let chemins;
    if (j.type === 'chemin') chemins = tous.includes(j.val) ? [j.val] : [];
    else if (j.type === 'fichier') chemins = tous.filter((c) => c.endsWith('/' + j.val));
    else if (j.type === 'nom') {
      chemins = tous.filter((c) => c.includes('/migrations/') && c.split('/').pop() === j.val + '.sql');
      if (chemins.length === 0) {
        const lot = (j.val.match(/^(19[a-z]{1,2}|a5_\d{2}|[a-z]\d_\d{2}[a-z]?)(?=_|$)/) || [])[1];
        if (lot) chemins = tous.filter((c) => c.includes('/migrations/') && (c.split('/').pop().startsWith(lot + '_') || c.split('/').pop() === lot + '.sql'));
        if (chemins.length) avertissements.push(`${j.val} : fichier trouvé par le lot ${lot}`);
      }
    }
    else chemins = tous.filter((c) => c.includes('/migrations/') && (c.split('/').pop().startsWith(j.val + '_') || c.split('/').pop() === j.val + '.sql'));
    if (j.type !== 'chemin' && chemins.length > 1) chemins = chemins.filter((c) => c.includes('/migrations/'));
    if (chemins.length !== 1) { avertissements.push(`${j.val} @ ${sha} : ${chemins.length} fichier(s) trouvé(s)`); continue; }
    const chemin = chemins[0];
    if (vus.has(chemin)) continue;
    vus.add(chemin);
    const r = REMPLACEMENTS[chemin];
    if (r && sha !== r.sha) {
      avertissements.push(`${chemin} : ${sha} remplacé par ${r.sha} (${r.raison})`);
      sha = r.sha;
      if (!estCommit(sha)) { avertissements.push(`${r.sha} introuvable`); continue; }
    }
    fichiers.push({ sha, branche, chemin, test: chemin.startsWith('omega/tests/') });
  }
  return { fichiers, avertissements };
}

// Découpe un texte SQL en instructions, en respectant chaînes '…' (et E'…'), identifiants "…", dollar-quotes $tag$…$tag$
// et commentaires -- / /* */. Chaque morceau garde ses commentaires de tête et son point-virgule.
function decouper(sql) {
  const morceaux = [];
  let debut = 0;
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const suiv = sql[i + 1];
    if (c === '-' && suiv === '-') { const f = sql.indexOf('\n', i); i = f < 0 ? sql.length : f + 1; continue; }
    if (c === '/' && suiv === '*') { const f = sql.indexOf('*/', i + 2); i = f < 0 ? sql.length : f + 2; continue; }
    if (c === "'") {
      const echap = i > 0 && /[eE]/.test(sql[i - 1]) && !/[A-Za-z0-9_]/.test(sql[i - 2] || ' ');
      i++;
      while (i < sql.length) {
        if (echap && sql[i] === '\\') { i += 2; continue; }
        if (sql[i] === "'") { if (sql[i + 1] === "'") { i += 2; continue; } i++; break; }
        i++;
      }
      continue;
    }
    if (c === '"') { const f = sql.indexOf('"', i + 1); i = f < 0 ? sql.length : f + 1; continue; }
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m && !/[A-Za-z0-9_]/.test(sql[i - 1] || ' ')) {
        const f = sql.indexOf(m[0], i + m[0].length);
        i = f < 0 ? sql.length : f + m[0].length;
        continue;
      }
    }
    if (c === ';') { morceaux.push(sql.slice(debut, i + 1)); debut = i + 1; }
    i++;
  }
  if (sql.slice(debut).trim()) morceaux.push(sql.slice(debut));
  return morceaux;
}

// Instructions d'une requête récupérée qui n'ont pas leur place en production.
const A_RETIRER = [
  [/^\s*(insert\s+into|update)\s+supabase_migrations\.schema_migrations\b/i, 'ligne de schema_migrations (db push écrit la sienne)'],
  [/private\.(depot_demander|depot_executer)\b/i, 'outillage de pose de la recette (depot_*)'],
  [/cccccccc-0000-4000-8000-00000000000c/i, 'donnée du client du banc'],
  [/banc-varelo\.test/i, 'comptes de recette du banc'],
];

// 25/10 (répétition du 25/10 sur le relevé de la production) : retirés de TOUTES les sources, instruction de tête seulement
// (jamais un corps de fonction) : un appel de tests (pgTAP n'est pas en production) et la vérification de 18d, réservée au
// rôle serveur, qui échoue sous postgres.
const A_RETIRER_PARTOUT = [
  [/^\s*select\b[^;]*\bruntests\s*\(/i, 'appel de tests pgTAP (pgTAP ne va pas en production)'],
  [/^\s*select\s+public\.resoudre_boite\s*\(/i, 'contrôle de pose réservé au rôle serveur'],
];

function nettoyer(sql) {
  const retirees = [];
  const gardees = [];
  for (const m of decouper(sql)) {
    const sansCommentaires = m.replace(/^(\s*--[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*/g, '');
    // Les règles portent sur l'instruction seule : une note en commentaire qui cite depot_* ne doit rien retirer.
    const regle = A_RETIRER.find(([re]) => re.test(sansCommentaires));
    if (regle) retirees.push(`${regle[1]} : ${sansCommentaires.trim().replace(/\s+/g, ' ').slice(0, 90)}`);
    else gardees.push(m);
  }
  return { texte: gardees.join(''), retirees };
}

const RECUPERE = join(ICI, 'recupere');
function fichierRecupere(version) {
  if (!existsSync(RECUPERE)) return null;
  const f = readdirSync(RECUPERE).find((x) => x.startsWith(version + '_') && x.endsWith('.sql'));
  return f ? join(RECUPERE, f) : null;
}

function slug(nom) {
  return nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

function transformer(texte) {
  const notes = [];
  const nUrl = texte.split(RECETTE).length - 1;
  if (nUrl > 0) {
    texte = texte.split(RECETTE).join(PRODUCTION);
    notes.push(`URL de la recette réécrite en production (${nUrl} fois)`);
  }
  const partout = [];
  texte = decouper(texte).filter((m) => {
    const tete = m.replace(/^(\s*--[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*/g, '');
    const regle = A_RETIRER_PARTOUT.find(([re]) => re.test(tete));
    if (regle) partout.push(`retiré : ${regle[1]} : ${tete.trim().replace(/\s+/g, ' ').slice(0, 90)}`);
    return !regle;
  }).join('');
  notes.push(...partout);
  const avant = texte;
  texte = texte.replace(/^[ \t]*create\s+extension\s+(if\s+not\s+exists\s+)?pgtap\b[^;]*;[ \t]*$/gim,
    '-- (assembler.mjs) extension pgtap retirée : pgTAP ne va pas en production.');
  if (texte !== avant) notes.push('create extension pgtap retiré');
  return { texte, notes };
}

function controler(texte) {
  return INTERDITS.filter(([re]) => re.test(texte)).map(([, motif]) => motif);
}

function lirePages(chemins) {
  const parVersion = new Map();
  for (const chemin of chemins) {
    let donnees = JSON.parse(readFileSync(chemin, 'utf8'));
    if (!Array.isArray(donnees)) donnees = donnees.rows || donnees.result || donnees.data || [];
    for (const l of donnees) {
      const v = String(l.version);
      const deja = parVersion.get(v) || { tranches: {} };
      const { sql, partie, ...reste } = l;
      const fusion = { ...deja, ...Object.fromEntries(Object.entries(reste).filter(([, x]) => x !== null && x !== undefined)) };
      if (typeof sql === 'string') fusion.tranches = { ...deja.tranches, [Number(partie) || 1]: sql };
      parVersion.set(v, fusion);
    }
  }
  // Les tranches se recollent dans l'ordre ; il les faut toutes (parties), sinon le texte reste absent.
  for (const l of parVersion.values()) {
    const n = Number(l.parties) || 1;
    const t = l.tranches || {};
    const presentes = Object.keys(t).length;
    if (presentes === n) l.sql = Array.from({ length: n }, (_, i) => t[i + 1]).join('');
    else if (presentes > 0) l.tranchesManquantes = `${presentes}/${n} tranche(s)`;
  }
  return [...parVersion.values()].sort((a, b) => String(a.version).localeCompare(String(b.version)));
}

function principal() {
  const args = process.argv.slice(2);
  const cloture = args.includes('--cloture');
  const forcer = args.includes('--forcer');
  const pages = args.filter((a) => !a.startsWith('--'));
  if (pages.length === 0) {
    console.error('Usage : node omega/prod/assembler.mjs [--cloture] [--forcer] omega/prod/sortie/page-*.json');
    process.exit(2);
  }
  const lignes = lirePages(pages);
  for (const r of RATTRAPES) lignes.push({ version: r.version, name: r.nom + '_rattrape', decision: 'emporter', source: 'rattrape', rattrape: r });
  lignes.sort((a, b) => String(a.version).localeCompare(String(b.version)));
  mkdirSync(SORTIE, { recursive: true });
  const manifeste = [];
  const erreurs = [];
  const aReconstruire = [];
  let derniere = '0';

  for (const l of lignes) {
    const version = String(l.version);
    if (version > derniere) derniere = version;
    if (l.decision !== 'emporter') {
      manifeste.push({ version, name: l.name, decision: l.decision || '?', source: l.source || '?', fichier: '—', notes: [] });
      continue;
    }
    let texte;
    let origine;
    const notesLigne = [];
    try {
      const recupere = fichierRecupere(version);
      if (recupere) {
        const { texte: propre, retirees } = nettoyer(readFileSync(recupere, 'utf8'));
        texte = propre;
        origine = `requête retrouvée dans le fil de la session coordinateur : omega/prod/recupere/${recupere.split('/').pop()}`;
        notesLigne.push(...retirees.map((r) => 'retiré : ' + r));
      } else if (l.rattrape) {
        const r = l.rattrape;
        texte = `-- ═══ ${r.chemin} @ ${r.sha}\n${lireAuSha(r.sha, r.chemin)}`;
        origine = `dépôt, lot posé sur la recette sans ligne schema_migrations (rattrapé le 25/10) : ${r.sha} ${r.chemin}`;
        notesLigne.push(`rattrapé : ${r.chemin.split('/').pop()} @ ${r.sha} (posé sur la recette sans ligne schema_migrations)`);
      } else if (MANUELS[l.name] && MANUELS[l.name].exclure) {
        manifeste.push({ version, name: l.name, decision: 'exclure: ' + MANUELS[l.name].exclure, source: l.source, fichier: '—', notes: [] });
        continue;
      } else if (MANUELS[l.name]) {
        const fs = MANUELS[l.name].fichiers;
        texte = fs.map((f) => `-- ═══ ${f.chemin} @ ${f.sha}\n${lireAuSha(f.sha, f.chemin)}`).join('\n\n');
        origine = 'dépôt (relevé A5) : ' + fs.map((f) => `${f.sha} ${f.chemin}`).join(' ; ');
        notesLigne.push('fichiers : ' + fs.map((f) => `${f.chemin.split('/').pop()} @ ${f.sha}`).join(', '));
      } else if (l.source === 'note' || l.source === 'depot') {
        const { fichiers, avertissements } = lireNote(l.provenance || '', l.name || '');
        notesLigne.push(...avertissements);
        // 19ah_recette_seulement (environnement = recette) ne part jamais en production, même cité dans une note.
        const recetteSeule = fichiers.filter((f) => /recette_seulement/i.test(f.chemin));
        if (recetteSeule.length) notesLigne.push(`exclu (propre à la recette) : ${recetteSeule.map((f) => f.chemin).join(', ')}`);
        const migrations = fichiers.filter((f) => !f.test && !/recette_seulement/i.test(f.chemin));
        if (fichiers.length > 0 && migrations.length === 0) {
          manifeste.push({ version, name: l.name, decision: recetteSeule.length ? 'exclure: propre à la recette (19ah)' : 'exclure: pose de tests (omega/tests/)', source: l.source, fichier: '—',
                           notes: fichiers.map((f) => `${f.chemin} @ ${f.sha}`) });
          continue;
        }
        if (migrations.length === 0) {
          aReconstruire.push(`${version} ${l.name}`);
          manifeste.push({ version, name: l.name, decision: 'À RECONSTRUIRE', source: l.source, fichier: '—',
                           notes: [`note sans fichier : ${JSON.stringify((l.provenance || '').slice(0, 160))}`, ...avertissements] });
          continue;
        }
        if (migrations.length < fichiers.length) notesLigne.push(`fichiers de tests ignorés : ${fichiers.filter((f) => f.test).map((f) => f.chemin).join(', ')}`);
        texte = migrations.map((f) => `-- ═══ ${f.chemin} @ ${f.sha}\n${lireAuSha(f.sha, f.chemin)}`).join('\n\n');
        origine = 'dépôt : ' + migrations.map((f) => `${f.sha} ${f.chemin}`).join(' ; ');
        notesLigne.unshift('fichiers : ' + migrations.map((f) => `${f.chemin.split('/').pop()} @ ${f.sha}`).join(', '));
      } else {
        if (l.tranchesManquantes) throw new Error(`texte incomplet : ${l.tranchesManquantes} reçue(s)`);
        if (typeof l.sql !== 'string' || l.sql.length === 0) throw new Error('texte absent : rejouer la page avec avec_texte = true');
        texte = l.sql;
        origine = 'statements de la recette';
      }
    } catch (e) {
      erreurs.push(`${version} ${l.name} : ${e.message}`);
      manifeste.push({ version, name: l.name, decision: 'ERREUR', source: l.source, fichier: '—', notes: [e.message] });
      continue;
    }
    const { texte: final, notes: notesTransfo } = transformer(texte);
    const notes = [...notesLigne, ...notesTransfo];
    const refus = controler(final);
    if (refus.length && !forcer) {
      erreurs.push(`${version} ${l.name} : contenu refusé (${refus.join(', ')})`);
      manifeste.push({ version, name: l.name, decision: 'REFUSÉ', source: l.source, fichier: '—', notes: refus });
      continue;
    }
    const nom = `${version}_${slug(l.name)}.sql`;
    const entete = [
      `-- ${version} ${l.name}`,
      `-- Source : ${origine}.`,
      `-- Assemblé par omega/prod/assembler.mjs pour la production (${PRODUCTION}). Transformations : ${notes.length ? notes.join(' ; ') : 'aucune'}.`,
      ...(refus.length ? [`-- ATTENTION (--forcer) : ${refus.join(', ')}`] : []),
      '',
    ].join('\n');
    const contenu = entete + final.replace(/\s*$/, '\n');
    writeFileSync(join(SORTIE, nom), contenu);
    manifeste.push({ version, name: l.name, decision: 'emporter', source: l.source, fichier: nom,
                     sha256: createHash('sha256').update(contenu).digest('hex').slice(0, 16), notes: [...notes, ...refus.map((r) => 'ATTENTION ' + r)] });
  }

  if (cloture) {
    // Étape C : a5_01 rejouée en dernier, une seconde après la dernière version de la recette.
    const v = String(BigInt(derniere) + 1n);
    const texte = git('show', 'origin/worker-a5:omega/migrations/a5_01_private_execute.sql');
    const sha = git('rev-parse', '--short', 'origin/worker-a5').trim();
    const nom = `${v}_a5_01_cloture.sql`;
    const contenu = `-- ${v} a5_01_cloture\n-- Source : dépôt worker-a5 ${sha} omega/migrations/a5_01_private_execute.sql (étape C du dossier).\n\n` + texte;
    writeFileSync(join(SORTIE, nom), contenu);
    manifeste.push({ version: v, name: 'a5_01_cloture', decision: 'emporter', source: 'depot', fichier: nom,
                     sha256: createHash('sha256').update(contenu).digest('hex').slice(0, 16), notes: ['étape C'] });
    // Puis le réglage d'environnement de la production : sans lui, rien ne distingue la production de la recette, et
    // le déclencheur de 19ah (essai_donnees_fictives) s'appuie dessus. Contrôlé par garde_fous.sql.
    const ve = String(BigInt(v) + 1n);
    const nomE = `${ve}_environnement_production.sql`;
    const contenuE = `-- ${ve} environnement_production\n-- Source : assembler.mjs --cloture (A5). Pose environnement = 'production' dans private.reglages.\n\n` +
      `do $$\nbegin\n  update private.reglages set valeur = 'production' where cle = 'environnement';\n` +
      `  if not found then insert into private.reglages (cle, valeur) values ('environnement', 'production'); end if;\nend $$;\n`;
    writeFileSync(join(SORTIE, nomE), contenuE);
    manifeste.push({ version: ve, name: 'environnement_production', decision: 'emporter', source: 'assembleur', fichier: nomE,
                     sha256: createHash('sha256').update(contenuE).digest('hex').slice(0, 16), notes: ['étape C, après a5_01'] });
  }

  const lignesManif = [
    '# Manifeste des migrations de production (assemblé, non posé)',
    '',
    `Assemblé par \`omega/prod/assembler.mjs\` depuis ${pages.length} page(s) de \`omega/prod/exporter.sql\` (recette ${RECETTE}).`,
    `Fichiers écrits : ${manifeste.filter((m) => m.decision === 'emporter').length} ; exclus : ${manifeste.filter((m) => m.decision.startsWith('exclure')).length} ; à reconstruire : ${aReconstruire.length} ; erreurs : ${erreurs.length}.`,
    '',
    '| Version | Nom | Décision | Source | Fichier | sha256 (16) | Notes |',
    '|---|---|---|---|---|---|---|',
    ...manifeste.map((m) => `| ${m.version} | \`${m.name}\` | ${m.decision} | ${m.source} | ${m.fichier === '—' ? '—' : '`' + m.fichier + '`'} | ${m.sha256 || '—'} | ${(m.notes || []).join(' ; ') || ''} |`),
    '',
  ];
  writeFileSync(join(SORTIE, 'MANIFESTE.md'), lignesManif.join('\n'));

  const presents = existsSync(SORTIE) ? readdirSync(SORTIE).filter((f) => f.endsWith('.sql')) : [];
  const attendus = new Set(manifeste.map((m) => m.fichier));
  const orphelins = presents.filter((f) => !attendus.has(f));
  if (orphelins.length) console.error(`Fichiers présents mais absents de cet assemblage (à relire) : ${orphelins.join(', ')}`);
  if (aReconstruire.length) console.error(`${aReconstruire.length} ligne(s) à reconstruire (note sans fichier) :\n  ` + aReconstruire.join('\n  '));
  if (erreurs.length) {
    console.error(`${erreurs.length} erreur(s) :\n  ` + erreurs.join('\n  '));
    process.exit(1);
  }
  if (aReconstruire.length) process.exitCode = 3;
  console.log(`${manifeste.filter((m) => m.decision === 'emporter').length} fichier(s) écrit(s) dans ${SORTIE} ; manifeste : ${join(SORTIE, 'MANIFESTE.md')}`);
}

principal();
