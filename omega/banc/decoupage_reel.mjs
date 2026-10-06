/* decoupage_reel.mjs — la preuve du découpage : un VRAI fichier de trois factures déposé comme UNE pièce FILED du
   banc ; le lecteur en ligne la lit, garde la première facture et crée deux pièces filles (porte filed_creer_pieces_filles
   d'A4, a4_21), que le socle fait lire à leur tour (session A1, 06/10/2026). Pas un test : rien n'est annulé.
   Rejouable : si le même fichier (même sha256) est déjà une pièce FILED du banc, on contrôle celle-là.

   La pièce : omega/banc/trois_factures.pdf (PDF natif, trois pages, trois factures fictives de trois fournisseurs ;
   régénérable par deno run -A omega/functions/lecteur/banc/trois_factures.ts).

   Contrôles (8 minutes d'attente au plus) :
     · la mère est lue, facture BAN-2026-0101 ;
     · deux pièces filles (piece_mere_id = la mère), pages 2 et 3, chacune avec son document FILED ;
     · chaque fille est lue à son tour : BAN-2026-0102 (TTC 300) et BAN-2026-0103 (TTC 96) ;
     · le travail de la mère dit filles = 2 pièces créées (serveur seulement).
   L'IA est appelée (PDF natif, lecture par le modèle) : quelques centimes.

   usage : comme facturx_reel.mjs —
     SUPABASE_URL=… SUPABASE_ANON_KEY=… node omega/banc/decoupage_reel.mjs <session-gerant.json>
     ou SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node omega/banc/decoupage_reel.mjs
   Aucune valeur secrète n'est affichée. */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const URL_SB = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CLE_ANON = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const CLIENT = 'cccccccc-0000-4000-8000-00000000000c'; // Groupe Sogexal (banc)
const FICHIER = new URL('./trois_factures.pdf', import.meta.url);
const NOM = 'trois_factures_banc.pdf';
const session = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : null;
if (!URL_SB || !(CLE_SERVICE || (CLE_ANON && session?.access_token))) {
  console.error('il faut SUPABASE_URL et soit SUPABASE_SERVICE_ROLE_KEY, soit SUPABASE_ANON_KEY avec une session du gérant');
  process.exit(2);
}

let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
/* Qui agit et qui lit : le gérant s'il y a une session (RLS : il voit les pièces, valeurs et documents de son
   organisation), le serveur sinon. Le serveur seul lit les travaux et la consommation IA. */
const auteur = session?.access_token
  ? { apikey: CLE_ANON || CLE_SERVICE, Authorization: `Bearer ${session.access_token}` }
  : { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}` };
const service = CLE_SERVICE ? { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}` } : null;
const lecteurDonnees = service ?? auteur;

async function rpc(nom, corps, entetes = lecteurDonnees) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nom}`, { method: 'POST', headers: { ...entetes, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${nom} : HTTP ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
async function lire(table, requete) {
  const r = await fetch(`${URL_SB}/rest/v1/${table}?${requete}`, { headers: lecteurDonnees });
  if (!r.ok) throw new Error(`${table} : HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const octets = readFileSync(FICHIER);
const sha = createHash('sha256').update(octets).digest('hex');
console.log(`— la pièce : ${NOM}, ${octets.length} octets, sha256 ${sha.slice(0, 12)}…`);

let [mere] = await lire('pieces', `client_id=eq.${CLIENT}&module=eq.filed&sha256=eq.${sha}&piece_mere_id=is.null&select=id,statut&order=recue_le.asc&limit=1`);
if (mere) {
  console.log(`  · déjà déposée (pièce ${mere.id}, ${mere.statut}) : pas de nouveau dépôt, on contrôle celle-là`);
} else {
  console.log('— dépôt : Storage puis filed_deposer_piece');
  const document = randomUUID();
  const chemin = `${CLIENT}/filed_document/${document}/${NOM}`;
  const up = await fetch(`${URL_SB}/storage/v1/object/omega-clients/${chemin}`, {
    method: 'POST',
    headers: { ...auteur, 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
    body: octets,
  });
  ok(up.ok, up.ok ? `fichier rangé sous ${chemin}` : `Storage refuse le fichier : HTTP ${up.status} ${(await up.text()).slice(0, 200)}`);
  if (!up.ok) process.exit(1);
  const r = await rpc('filed_deposer_piece', {
    p_client: CLIENT, p_document: document, p_nom_fichier: NOM, p_mime: 'application/pdf', p_octets: octets.length, p_sha256: sha, p_chemin: chemin,
  }, auteur);
  ok(!!r?.piece, `document ${r?.reference} créé, pièce ${r?.piece}, état ${r?.etat}`);
  mere = { id: r.piece };
}

const enCours = (p) => !p || ['recue', 'en_lecture'].includes(p.statut);
const valeur = async (piece, champ) => (await lire('pieces_valeurs', `piece_id=eq.${piece}&champ=eq.${champ}&select=valeur`))[0]?.valeur;

console.log('— attendre la lecture de la mère, puis ses filles et leurs lectures (8 minutes au plus)');
const debut = Date.now();
let m, filles = [];
while (Date.now() - debut < 8 * 60 * 1000) {
  [m] = await lire('pieces', `id=eq.${mere.id}&select=id,statut,type_piece,nb_pages,motif,version_lecteur`);
  filles = await lire('pieces', `piece_mere_id=eq.${mere.id}&select=id,statut,type_piece,nom_fichier,objet_id&order=nom_fichier.asc`);
  console.log(`  · ${Math.round((Date.now() - debut) / 1000)} s : mère ${m?.statut}, filles ${filles.map((f) => f.statut).join(', ') || 'aucune'}`);
  if (!enCours(m) && filles.length >= 2 && filles.every((f) => !enCours(f))) break;
  await dormir(20000);
}
ok(m?.statut === 'lue' && m?.type_piece === 'facture', `mère lue : ${m?.statut}, ${m?.type_piece}, ${m?.nb_pages} pages, version ${m?.version_lecteur}`);
ok((await valeur(mere.id, 'numero')) === 'BAN-2026-0101', `la mère garde la première facture : ${await valeur(mere.id, 'numero')}`);
ok(filles.length === 2, `${filles.length} pièces filles (attendu 2) : ${filles.map((f) => f.nom_fichier).join(', ')}`);
const attendues = [['BAN-2026-0102', 300], ['BAN-2026-0103', 96]];
for (const [i, f] of filles.entries()) {
  const [num, ttc] = attendues[i] ?? [];
  const n = await valeur(f.id, 'numero');
  const t = Number(await valeur(f.id, 'montant_ttc'));
  ok(f.statut === 'lue' && n === num && t === ttc, `fille ${f.nom_fichier} : ${f.statut}, ${f.type_piece}, n° ${n}, TTC ${t} (attendu ${num}, ${ttc})`);
  const [d] = await lire('filed_documents', `piece_id=eq.${f.id}&select=reference,etat`);
  ok(!!d, `fille ${f.nom_fichier} : document FILED ${d?.reference ?? 'absent'}, état ${d?.etat ?? '?'}`);
}
if (service) {
  const [t] = await lire('travaux', `genre=eq.lecteur.lire&charge->>piece=eq.${mere.id}&select=id,etat,resultat&order=id.desc&limit=1`);
  ok(Array.isArray(t?.resultat?.filles) && t.resultat.filles.length === 2, `travail de la mère ${t?.id} : filles = ${JSON.stringify(t?.resultat?.filles ?? t?.resultat?.filles_raison ?? null).slice(0, 200)}`);
  console.log(`  · coût de la lecture de la mère : ${t?.resultat?.cout_eur} €`);
} else {
  console.log(`  · le travail de la mère (résultat filles) se lit avec la clé de service ; pièce mère ${mere.id}`);
}

console.log(echecs === 0 ? '\nTout est conforme.' : `\n${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
