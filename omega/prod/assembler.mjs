#!/usr/bin/env node
// omega/prod/assembler.mjs — étape 1 du dossier MISE-EN-PRODUCTION.md : assembler omega/prod/migrations/ à partir de
// la sortie de omega/prod/exporter.sql (jouée sur la RECETTE par le coordinateur) et du dépôt git.
// A5, 06/10/2026. Ne touche à aucune base : lit des fichiers JSON et le dépôt, écrit des fichiers.
//
// Usage :
//   node omega/prod/assembler.mjs [--cloture] [--forcer] omega/prod/sortie/page-*.json
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
const PRODUCTION = 'noepmkkplxshjbmqqxft';
const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..', '..');
const SORTIE = join(ICI, 'migrations');

const INTERDITS = [
  [/cccccccc-0000-4000-8000-00000000000c/i, 'client du banc'],
  [/banc-varelo\.test/i, 'compte de recette'],
  [/Recette-Omega-2026/, 'mot de passe de recette'],
  [/sb_publishable_[A-Za-z0-9_]+/, 'clé publique de la recette'],
  [/function\s+private\.(depot_demander|depot_executer)\b/i, 'outillage de pose de la recette'],
  [/function\s+private\.(tests_en_tache|tester_sans_trace)\b/i, 'outillage de test de la recette'],
  [/create\s+schema\s+(if\s+not\s+exists\s+)?tests\b/i, 'schéma tests'],
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
function lireNote(texte) {
  const avertissements = [];
  const jetons = [];
  const re = /(omega\/[^\s'",;()]+\.sql)|([A-Za-z0-9_]+\.sql)|\b([ab]\d)_(\d{2})\s*(?:\.\.|…|à|-)\s*(?:[ab]\d_)?(\d{2})\b|\b([ab]\d_\d{2})(?:_v\d+)?\b|\b(worker-[a-z0-9]+|main)\b|\b([0-9a-f]{7,40})\b/g;
  for (const m of texte.matchAll(re)) {
    if (m[1]) jetons.push({ type: 'chemin', val: m[1], pos: m.index });
    else if (m[2]) jetons.push({ type: 'fichier', val: m[2], pos: m.index });
    else if (m[3]) { for (let i = Number(m[4]); i <= Number(m[5]); i++) jetons.push({ type: 'lot', val: `${m[3]}_${String(i).padStart(2, '0')}`, pos: m.index }); }
    else if (m[6]) {
      // « test a4_08 vert », « tests b5_* » : le nom désigne un test, pas une migration à emporter.
      if (/\btests?\b[\s:]*$/i.test(texte.slice(Math.max(0, m.index - 12), m.index))) avertissements.push(`${m[6]} cité comme test : ignoré`);
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
  for (const j of utiles) {
    const avant = shas.filter((x) => x.pos < j.pos).pop();
    const apres = shas.find((x) => x.pos > j.pos);
    let sha = (avant || apres || {}).val;
    let branche = (branches.filter((x) => x.pos < j.pos).pop() || branches[0] || {}).val || null;
    if (!sha && branche) { sha = `origin/${branche}`; avertissements.push(`${j.val} : aucun SHA, pointe de ${branche} prise`); }
    if (!sha) { avertissements.push(`${j.val} : ni SHA ni branche`); continue; }
    const tous = arbre(sha);
    let chemins;
    if (j.type === 'chemin') chemins = tous.includes(j.val) ? [j.val] : [];
    else if (j.type === 'fichier') chemins = tous.filter((c) => c.endsWith('/' + j.val));
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
      } else if (l.source === 'note' || l.source === 'depot') {
        const { fichiers, avertissements } = lireNote(l.provenance || '');
        notesLigne.push(...avertissements);
        const migrations = fichiers.filter((f) => !f.test);
        if (fichiers.length > 0 && migrations.length === 0) {
          manifeste.push({ version, name: l.name, decision: 'exclure: pose de tests (omega/tests/)', source: l.source, fichier: '—',
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
  console.log(`${manifeste.filter((m) => m.decision === 'emporter').length} fichier(s) écrit(s) dans omega/prod/migrations/ ; manifeste : omega/prod/migrations/MANIFESTE.md`);
}

principal();
