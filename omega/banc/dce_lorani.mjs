/* dce_lorani.mjs — déposer un DCE public réel comme pièces Lorani du banc, comme un client (session B5, 18/10/2026).

   Les DCE : omega/banc/dce-reels/<dossier>/ (téléchargés par A1 : un bâtiment neuf, une rénovation, des VRD). Chaque
   dossier devient un projet Lorani du client du banc (cccccccc-…-0c), créé s'il n'existe pas (référence BANC-DCE-<dossier>),
   au nom du gérant du banc ; chaque PDF y est déposé comme une pièce (Storage omega-clients puis lorani_deposer_piece,
   avec le type deviné du nom : CCTP, DPGF, plan, notice), que le lecteur lira ; puis un contrôle du dossier « en
   lecture » réunit les pièces : il se lance seul quand la dernière est lue (b5_16).

   Un dossier par passage, pour tenir le coût : au plus MAX_PIECES pièces (12 par défaut) et MAX_MO mégaoctets (60).
   Le coordinateur relève le coût de chaque passage (omega/banc/dce_lorani.sql, bloc 2) avant le suivant ; budget du
   chantier : 5 € au total. Rejouable : une pièce déjà déposée (même sha256 sur le projet) n'est pas redéposée.
   Mode essai : le banc a reglages_envois lorani en essai ; rien ne part vers un tiers.

   Le dossier peut porter un manifeste.json : { "nom", "nature", "adresse", "code_postal", "commune", "code_insee",
   "source", "fichiers": [{ "fichier", "type_piece", "role", "reference" }] } ; sans lui, les PDF du dossier sont pris
   dans l'ordre alphabétique et le type vient du nom.

   usage : node omega/banc/dce_lorani.mjs <dossier> [--voir]
     --voir : liste ce qui serait déposé (taille, type, rôle), sans rien déposer.
   Connexion : BANC_EMAIL / BANC_MOT_DE_PASSE (par défaut le gérant du banc), NEXT_PUBLIC_SUPABASE_URL et
   NEXT_PUBLIC_SUPABASE_ANON_KEY (par défaut la recette). Aucune valeur secrète n'est affichée. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const [dossier, option] = process.argv.slice(2);
if (!dossier) { console.error('usage : node omega/banc/dce_lorani.mjs <dossier> [--voir]'); process.exit(2); }
const voir = option === '--voir';
const RACINE = new URL('./dce-reels/', import.meta.url).pathname;
const REP = join(RACINE, dossier);
if (!existsSync(REP)) { console.error(`dossier introuvable : ${REP}`); process.exit(2); }

const URL_SB = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').replace(/\/+$/, '');
const CLE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_a12GN1jHf0IJR4xcKvPTXw_NlPb51zl';
const EMAIL = process.env.BANC_EMAIL ?? 'gerant@banc-varelo.test';
const MOT = process.env.BANC_MOT_DE_PASSE ?? 'Recette-Omega-2026';
const CLIENT = 'cccccccc-0000-4000-8000-00000000000c';
const MAX_PIECES = Number(process.env.MAX_PIECES ?? 12);
const MAX_MO = Number(process.env.MAX_MO ?? 60);
const REFERENCE = `BANC-DCE-${dossier.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`.slice(0, 40);

/* le type et le rôle au contrôle, devinés du nom du fichier */
function deviner(nom) {
  const n = nom.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_.\-]+/g, ' ');
  if (/\bcctp\b|clauses techniques/.test(n)) return { type_piece: 'lorani_cctp', role: 'cctp', reference: 'CCTP' };
  if (/\bdpgf\b|\bdqe\b|\bbpu\b|decomposition du prix|detail quantitatif/.test(n)) return { type_piece: 'lorani_dpgf', role: 'dpgf', reference: 'DPGF' };
  if (/notice/.test(n)) return { type_piece: 'lorani_notice', role: 'notice', reference: 'Notice' };
  if (/plan|facade|coupe|masse|niveau|\bpc ?\d|\bapd\b|\bpro\b|\bdce\b.*\bpl/.test(n)) return { type_piece: 'lorani_planche', role: 'planche', reference: null };
  return { type_piece: null, role: 'autre', reference: null };
}

const manifeste = existsSync(join(REP, 'manifeste.json')) ? JSON.parse(readFileSync(join(REP, 'manifeste.json'), 'utf8')) : {};
const fichiers = (manifeste.fichiers?.length
  ? manifeste.fichiers.map((f) => ({ ...deviner(f.fichier), ...f }))
  : readdirSync(REP).filter((f) => /\.pdf$/i.test(f)).sort().map((f) => ({ fichier: f, ...deviner(f) })))
  .map((f) => ({ ...f, chemin: join(REP, f.fichier), octets: statSync(join(REP, f.fichier)).size }));

let choisis = [];
let total = 0;
for (const f of fichiers) {
  if (choisis.length >= MAX_PIECES) break;
  if (total + f.octets > MAX_MO * 1024 * 1024) continue;
  choisis.push(f);
  total += f.octets;
}
console.log(`— ${dossier} : ${fichiers.length} PDF, ${choisis.length} retenus (${(total / 1048576).toFixed(1)} Mo ; plafonds ${MAX_PIECES} pièces, ${MAX_MO} Mo)`);
for (const f of choisis) console.log(`  · ${f.fichier} — ${(f.octets / 1048576).toFixed(2)} Mo — ${f.type_piece ?? 'type au lecteur'} — rôle ${f.role}${f.reference ? ` (${f.reference})` : ''}`);
for (const f of fichiers.filter((x) => !choisis.includes(x))) console.log(`  · écarté (plafond) : ${f.fichier}`);
if (voir || !choisis.length) process.exit(0);

/* ——— connexion du gérant du banc ——— */
const jeton = await (async () => {
  const r = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: CLE, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: MOT }) });
  if (!r.ok) { console.error(`connexion refusée : HTTP ${r.status}`); process.exit(1); }
  return (await r.json()).access_token;
})();
const H = { apikey: CLE, Authorization: `Bearer ${jeton}` };
async function rest(methode, chemin, corps, entetes = {}) {
  const r = await fetch(`${URL_SB}/rest/v1/${chemin}`, { method: methode, headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation', ...entetes }, body: corps === undefined ? undefined : JSON.stringify(corps) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${methode} ${chemin.split('?')[0]} : HTTP ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

/* ——— le projet ——— */
let [projet] = await rest('GET', `lorani_projets?client_id=eq.${CLIENT}&reference=eq.${REFERENCE}&select=id,nom`);
if (!projet) {
  [projet] = await rest('POST', 'lorani_projets', {
    client_id: CLIENT, reference: REFERENCE, nom: (manifeste.nom ?? `DCE réel — ${dossier} (banc)`).slice(0, 160),
    nature: manifeste.nature ?? 'autre', adresse: manifeste.adresse ?? null, code_postal: manifeste.code_postal ?? null,
    commune: manifeste.commune ?? null, code_insee: manifeste.code_insee ?? null, parcelles: [], marche_public: true,
  });
  console.log(`— projet créé : ${projet.nom} (${projet.id})`);
} else {
  console.log(`— projet existant : ${projet.nom} (${projet.id})`);
}

/* ——— les pièces ——— */
const deja = await rest('GET', `pieces?client_id=eq.${CLIENT}&module=eq.lorani&objet_type=eq.lorani_projet&objet_id=eq.${projet.id}&select=id,sha256,nom_fichier`);
const deposees = [];
for (const f of choisis) {
  const octets = readFileSync(f.chemin);
  const sha = createHash('sha256').update(octets).digest('hex');
  const existante = deja.find((p) => p.sha256 === sha);
  if (existante) { console.log(`  · déjà déposée : ${f.fichier} (${existante.id})`); deposees.push({ ...f, piece: existante.id }); continue; }
  const nom = basename(f.fichier).normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(0, 120);
  const chemin = `${CLIENT}/lorani_projet/${projet.id}/${Date.now()}-${nom}`;
  const up = await fetch(`${URL_SB}/storage/v1/object/omega-clients/${chemin}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: octets });
  if (!up.ok) { console.log(`  ✗ Storage refuse ${f.fichier} : HTTP ${up.status} ${(await up.text()).slice(0, 200)}`); continue; }
  const piece = await rest('POST', 'rpc/lorani_deposer_piece', {
    p_projet: projet.id, p_nom_fichier: f.fichier.slice(0, 200), p_mime: 'application/pdf', p_octets: octets.length, p_sha256: sha, p_chemin: chemin, p_type_piece: f.type_piece,
  });
  console.log(`  ✓ déposée : ${f.fichier} → pièce ${piece}`);
  deposees.push({ ...f, piece });
}

/* ——— le contrôle du dossier, « en lecture » : il se lance seul quand la dernière pièce est lue ——— */
const croisables = deposees.filter((f) => f.role !== 'autre');
if (croisables.length >= 2) {
  let [controle] = await rest('GET', `lorani_controles?projet_id=eq.${projet.id}&intitule=eq.DCE%20r%C3%A9el&select=id,statut`);
  if (!controle) {
    [controle] = await rest('POST', 'lorani_controles', { client_id: CLIENT, projet_id: projet.id, intitule: 'DCE réel', indice: 'A' });
    console.log(`— contrôle « DCE réel » créé (${controle.id})`);
  }
  const lies = await rest('GET', `lorani_controle_pieces?controle_id=eq.${controle.id}&select=piece_id`);
  const nouvelles = croisables.filter((f) => !lies.some((l) => l.piece_id === f.piece));
  if (nouvelles.length) {
    await rest('POST', 'lorani_controle_pieces', nouvelles.map((f) => ({ client_id: CLIENT, projet_id: projet.id, controle_id: controle.id, piece_id: f.piece, role: f.role, reference: f.reference ?? f.fichier.replace(/\.pdf$/i, '').slice(0, 40) })));
  }
  console.log(`  · ${croisables.length} pièces au contrôle ; il passe seul à la lecture de la dernière`);
} else {
  console.log('— moins de deux pièces croisables : pas de contrôle');
}
console.log(`\n${deposees.length} pièce(s) sur le projet ${REFERENCE}. Relevé et coût : omega/banc/dce_lorani.sql, bloc 2.`);
