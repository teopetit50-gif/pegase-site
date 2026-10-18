/* factures_opendata.mjs — des factures PDF publiées en open data par des collectivités, déposées comme pièces FILED
   du client du banc, comme un client (session A4, 18/10/2026 ; chantier 3 du coordinateur, sur le modèle de
   dce_lorani.mjs de B5).

   Deux temps :
     node omega/banc/factures_opendata.mjs --chercher [requête…]
         interroge l'API de data.gouv.fr (jeux de données « factures », « mandats », « factures payées »), garde les
         ressources PDF, et écrit les candidates dans omega/banc/factures-opendata/CANDIDATES.tsv (à relire à la main :
         on ne garde dans SOURCE.tsv que de vraies factures, publiées sous licence ouverte).
     node omega/banc/factures_opendata.mjs [--voir]
         lit omega/banc/factures-opendata/SOURCE.tsv (colonnes : fichier, url, editeur, jeu, licence, sha256), télécharge
         chaque PDF s'il n'est pas déjà dans le dossier, vérifie son SHA-256 (renseigné : il doit correspondre ; vide :
         il est calculé et affiché pour être recopié dans SOURCE.tsv), puis le dépose sur le client du banc :
         Storage omega-clients/<client>/filed_document/<document>/<fichier>, puis public.filed_deposer_piece (source
         « depot »), au nom du gérant du banc. Le lecteur lit la pièce, FILED la contrôle.
         --voir : ce qui serait déposé, sans rien déposer.

   Garde-fous : au plus MAX_PIECES (50) pièces et MAX_MO (80) Mo par passage ; refus de tourner après HEURE_LIMITE
   (19:30 Z par défaut) ; rejouable (un fichier dont l'empreinte est déjà un document du banc n'est pas redéposé). Le
   coût de lecture se relève avec omega/banc/factures_opendata.sql (bloc 2) : le chantier s'arrête à 1 € — on dépose
   par paquets (MAX_PIECES=10) et l'on relève le coût entre deux paquets.
   Les PDF ne vont pas dans git : seuls SOURCE.tsv (avec les empreintes) et ce script y vont.

   Connexion : BANC_EMAIL / BANC_MOT_DE_PASSE (par défaut le gérant du banc), NEXT_PUBLIC_SUPABASE_URL et
   NEXT_PUBLIC_SUPABASE_ANON_KEY (par défaut la recette). Aucune valeur secrète n'est affichée. */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const DOSSIER = new URL('./factures-opendata/', import.meta.url).pathname;
mkdirSync(DOSSIER, { recursive: true });

const URL_SB = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').replace(/\/+$/, '');
const CLE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_a12GN1jHf0IJR4xcKvPTXw_NlPb51zl';
const EMAIL = process.env.BANC_EMAIL ?? 'gerant@banc-varelo.test';
const MOT = process.env.BANC_MOT_DE_PASSE ?? 'Recette-Omega-2026';
const CLIENT = 'cccccccc-0000-4000-8000-00000000000c';
const MAX_PIECES = Number(process.env.MAX_PIECES ?? 50);
const MAX_MO = Number(process.env.MAX_MO ?? 80);
const HEURE_LIMITE = process.env.HEURE_LIMITE ?? '19:30';

function limitePassee() {
  const [h, m] = HEURE_LIMITE.split(':').map(Number);
  const maintenant = new Date();
  return maintenant.getUTCHours() * 60 + maintenant.getUTCMinutes() >= h * 60 + m;
}
const sha256 = (octets) => createHash('sha256').update(octets).digest('hex');
const nomSur = (n) => n.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(0, 120);

/* ——— 1. Chercher ——— */
if (args[0] === '--chercher') {
  const requetes = args.length > 1 ? [args.slice(1).join(' ')] : ['factures payées', 'factures mandats', 'factures fournisseurs collectivité', 'mandats de paiement'];
  const lignes = ['fichier\turl\tediteur\tjeu\tlicence\tsha256'];
  const vues = new Set();
  for (const q of requetes) {
    const r = await fetch(`https://www.data.gouv.fr/api/1/datasets/?q=${encodeURIComponent(q)}&page_size=50`);
    if (!r.ok) { console.error(`data.gouv.fr : HTTP ${r.status} pour « ${q} »`); continue; }
    for (const jeu of (await r.json()).data ?? []) {
      for (const res of jeu.resources ?? []) {
        const pdf = (res.format ?? '').toLowerCase() === 'pdf' || /\.pdf(\?|$)/i.test(res.url ?? '');
        if (!pdf || vues.has(res.url)) continue;
        vues.add(res.url);
        lignes.push([nomSur(res.title || res.url.split('/').pop() || 'piece.pdf').replace(/(\.pdf)?$/i, '.pdf'), res.url,
          (jeu.organization?.name ?? '').replace(/\t/g, ' '), (jeu.title ?? '').replace(/\t/g, ' '), jeu.license ?? '', ''].join('\t'));
      }
    }
  }
  writeFileSync(join(DOSSIER, 'CANDIDATES.tsv'), lignes.join('\n') + '\n');
  console.log(`${lignes.length - 1} ressource(s) PDF candidates → factures-opendata/CANDIDATES.tsv (à trier à la main vers SOURCE.tsv).`);
  process.exit(0);
}

/* ——— 2. Déposer ——— */
const voir = args[0] === '--voir';
if (!voir && limitePassee()) { console.error(`Après ${HEURE_LIMITE} Z : le chantier s'arrête, rien n'est déposé.`); process.exit(3); }
const fSource = join(DOSSIER, 'SOURCE.tsv');
if (!existsSync(fSource)) { console.error('factures-opendata/SOURCE.tsv absent : lancer --chercher, puis trier.'); process.exit(2); }
const [entete, ...corps] = readFileSync(fSource, 'utf8').split(/\r?\n/).filter((l) => l.trim());
const cols = entete.split('\t');
const sources = corps.map((l) => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v])));

const choisis = [];
let total = 0;
for (const s of sources) {
  if (choisis.length >= MAX_PIECES) break;
  const local = join(DOSSIER, s.fichier);
  let octets;
  if (existsSync(local)) octets = readFileSync(local);
  else {
    const r = await fetch(s.url);
    if (!r.ok) { console.log(`  ✗ téléchargement refusé : ${s.fichier} (HTTP ${r.status})`); continue; }
    octets = Buffer.from(await r.arrayBuffer());
    if (octets.subarray(0, 4).toString() !== '%PDF') { console.log(`  ✗ pas un PDF : ${s.fichier}`); continue; }
    writeFileSync(local, octets);
  }
  const empreinte = sha256(octets);
  if (s.sha256 && s.sha256 !== empreinte) { console.log(`  ✗ empreinte différente de SOURCE.tsv : ${s.fichier} (${empreinte})`); continue; }
  if (!s.sha256) console.log(`  · ${s.fichier} : sha256 ${empreinte} (à recopier dans SOURCE.tsv)`);
  if (total + octets.length > MAX_MO * 1048576) { console.log(`  · écarté (plafond ${MAX_MO} Mo) : ${s.fichier}`); continue; }
  choisis.push({ ...s, octets, empreinte });
  total += octets.length;
}
console.log(`— ${sources.length} source(s), ${choisis.length} retenue(s) (${(total / 1048576).toFixed(1)} Mo ; plafonds ${MAX_PIECES} pièces, ${MAX_MO} Mo)`);
if (voir || !choisis.length) process.exit(0);

const jeton = await (async () => {
  const r = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: CLE, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: MOT }) });
  if (!r.ok) { console.error(`connexion refusée : HTTP ${r.status}`); process.exit(1); }
  return (await r.json()).access_token;
})();
const H = { apikey: CLE, Authorization: `Bearer ${jeton}` };
async function rest(methode, chemin, corpsJson) {
  const r = await fetch(`${URL_SB}/rest/v1/${chemin}`, { method: methode, headers: { ...H, 'Content-Type': 'application/json' }, body: corpsJson === undefined ? undefined : JSON.stringify(corpsJson) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${methode} ${chemin.split('?')[0]} : HTTP ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

const deja = await rest('GET', `filed_documents?client_id=eq.${CLIENT}&select=id,sha256,reference`);
let n = 0;
for (const f of choisis) {
  if (limitePassee()) { console.log(`— ${HEURE_LIMITE} Z passé : arrêt.`); break; }
  const existant = deja.find((d) => d.sha256 === f.empreinte);
  if (existant) { console.log(`  · déjà déposée : ${f.fichier} (${existant.reference})`); continue; }
  const document = randomUUID();
  const chemin = `${CLIENT}/filed_document/${document}/${nomSur(f.fichier)}`;
  const up = await fetch(`${URL_SB}/storage/v1/object/omega-clients/${chemin}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: f.octets });
  if (!up.ok) { console.log(`  ✗ Storage refuse ${f.fichier} : HTTP ${up.status} ${(await up.text()).slice(0, 200)}`); continue; }
  const r = await rest('POST', 'rpc/filed_deposer_piece', {
    p_client: CLIENT, p_document: document, p_nom_fichier: f.fichier.slice(0, 200), p_mime: 'application/pdf', p_octets: f.octets.length,
    p_sha256: f.empreinte, p_chemin: chemin, p_entite: null, p_source: 'depot', p_expediteur: `opendata:${(f.editeur || 'collectivite').slice(0, 80)}`,
  });
  console.log(`  ✓ déposée : ${f.fichier} → ${r?.reference ?? r?.document ?? document}${r?.doublon_de ? ' (doublon reconnu)' : ''}`);
  n++;
}
console.log(`\n${n} pièce(s) déposée(s). Lecture, coût et écarts : omega/banc/factures_opendata.sql.`);
