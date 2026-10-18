/* dce_daliro.mjs — chantier 2 de B6 (18/10/2026) : le bloc 2 de omega/banc/dce_daliro.sql. Pour chacun des trois DCE
   réels d'omega/banc/dce-reels/ (neuf, rénovation, VRD), prend LE DPGF ou devis en PDF, le téléverse dans omega-clients
   sous <banc>/btp_marche/<marché>/<nom>, puis appelle public.btp_deposer_devis (b6_33) : la pièce daliro_devis est
   reçue et le socle demande la lecture (lecteur v38). Attend ensuite les lectures, 10 minutes au plus, et dit, par
   devis : statut, lignes lues, vérifiées, total HT, coût. Rien n'est envoyé à personne. Rejouable : un fichier déjà
   déposé sur son marché (même sha256) n'est pas redéposé.

   Le choix du fichier, par DCE : sous dce-reels/, un dossier ou un nom qui contient neuf | reno | vrd ; parmi ses PDF,
   ceux dont le nom dit DPGF, DQE, BPU, devis ou détail estimatif ; le premier par ordre alphabétique. Un PDF de plus
   de 20 Mo est écarté (coût). Le script refuse de déposer si la consommation d'IA du banc dépasse déjà 2 € ce jour.

   usage : SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node omega/banc/dce_daliro.mjs [--sans-attente]
   Aucune valeur secrète n'est affichée. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_SB = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CLIENT = 'cccccccc-0000-4000-8000-00000000000c'; // Groupe Sogexal (banc)
const RACINE = fileURLToPath(new URL('./dce-reels/', import.meta.url));
const SEUIL_EUR = 2;
const MAX_OCTETS = 20 * 1024 * 1024;
const DCE = [
  { reference: 'DCE-NEUF', motif: /neuf|construction/i },
  { reference: 'DCE-RENO', motif: /r[ée]no/i },
  { reference: 'DCE-VRD', motif: /vrd|voirie|r[ée]seaux/i },
];
const DEVIS = /dpgf|dqe|bpu|devis|d[ée]tail[ _-]*estimatif/i;

if (!URL_SB || !CLE) { console.error('il faut SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }
const entetes = { apikey: CLE, Authorization: `Bearer ${CLE}` };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function rpc(nom, corps) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nom}`, { method: 'POST', headers: { ...entetes, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${nom} : HTTP ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
async function lire(table, requete) {
  const r = await fetch(`${URL_SB}/rest/v1/${table}?${requete}`, { headers: entetes });
  if (!r.ok) throw new Error(`${table} : HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
function fichiers(dossier) {
  return readdirSync(dossier).flatMap((n) => { const p = join(dossier, n); return statSync(p).isDirectory() ? fichiers(p) : [p]; });
}
const nomSur = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-120);

let tous;
try { tous = fichiers(RACINE).filter((p) => /\.pdf$/i.test(p)); }
catch { console.error(`rien sous ${RACINE} : les DCE d'A1 ne sont pas encore là`); process.exit(2); }

const consomme = Number(await rpc('consommation_ia_jour', { p_client: CLIENT })) || 0;
console.log(`— consommation d'IA du banc ce jour : ${consomme.toFixed(4)} €`);
if (consomme > SEUIL_EUR) { console.error(`au-delà de ${SEUIL_EUR} € : rien n'est déposé`); process.exit(3); }

const deposees = [];
for (const d of DCE) {
  const [marche] = await lire('btp_marches', `client_id=eq.${CLIENT}&reference=eq.${d.reference}&select=id,statut`);
  if (!marche) { console.log(`  ✗ ${d.reference} : marché absent (jouer le bloc 1 de dce_daliro.sql)`); continue; }
  const choix = tous.filter((p) => d.motif.test(relative(RACINE, p)) && DEVIS.test(basename(p)) && statSync(p).size <= MAX_OCTETS).sort()[0];
  if (!choix) { console.log(`  ✗ ${d.reference} : aucun DPGF/devis PDF trouvé sous dce-reels/`); continue; }
  const octets = readFileSync(choix);
  const sha = createHash('sha256').update(octets).digest('hex');
  const nom = nomSur(basename(choix));
  const deja = await lire('pieces', `client_id=eq.${CLIENT}&module=eq.daliro&objet_type=eq.btp_marche&objet_id=eq.${marche.id}&sha256=eq.${sha}&select=id,statut`);
  if (deja.length) { console.log(`  · ${d.reference} : ${nom} déjà déposé (${deja[0].statut})`); deposees.push({ ...d, piece: deja[0].id, nom }); continue; }
  const chemin = `${CLIENT}/btp_marche/${marche.id}/${nom}`;
  const up = await fetch(`${URL_SB}/storage/v1/object/omega-clients/${chemin}`, { method: 'POST', headers: { ...entetes, 'Content-Type': 'application/pdf', 'x-upsert': 'true' }, body: octets });
  if (!up.ok) { console.log(`  ✗ ${d.reference} : téléversement HTTP ${up.status} ${(await up.text()).slice(0, 200)}`); continue; }
  const piece = await rpc('btp_deposer_devis', { p_marche: marche.id, p_nom_fichier: nom, p_mime: 'application/pdf', p_octets: octets.length, p_sha256: sha, p_chemin: chemin });
  console.log(`  ✓ ${d.reference} : ${relative(RACINE, choix)} → pièce ${piece} (${octets.length} octets, sha256 ${sha.slice(0, 12)}…)`);
  deposees.push({ ...d, piece, nom });
}

if (process.argv.includes('--sans-attente') || !deposees.length) process.exit(deposees.length ? 0 : 1);
console.log('— attente des lectures (10 minutes au plus)');
const fin = Date.now() + 10 * 60_000;
let restantes = deposees;
while (restantes.length && Date.now() < fin) {
  await dormir(20_000);
  const etats = await lire('pieces', `id=in.(${restantes.map((p) => p.piece).join(',')})&select=id,statut`);
  restantes = restantes.filter((p) => ['recue', 'en_lecture'].includes(etats.find((e) => e.id === p.piece)?.statut));
}
let total = 0;
for (const p of deposees) {
  const [piece] = await lire('pieces', `id=eq.${p.piece}&select=statut,type_piece,nb_pages`);
  const valeurs = await lire('pieces_valeurs', `piece_id=eq.${p.piece}&champ=in.(lignes,montant_total_ht)&select=champ,valeur,verifiee`);
  const lignes = valeurs.find((v) => v.champ === 'lignes');
  const totalHt = valeurs.find((v) => v.champ === 'montant_total_ht')?.valeur ?? null;
  const travaux = await lire('travaux', `genre=like.lecteur.*&charge->>piece=eq.${p.piece}&select=resultat`);
  const cout = travaux.reduce((s, t) => s + (Number(t.resultat?.cout_eur) || 0), 0);
  total += cout;
  console.log(`  ${p.reference} : ${piece.statut}, ${piece.type_piece ?? '—'}, ${piece.nb_pages ?? '?'} p., ${Array.isArray(lignes?.valeur) ? lignes.valeur.length : 0} lignes${lignes?.verifiee ? ' vérifiées' : ''}, total HT ${totalHt ?? '—'}, ${cout.toFixed(4)} €`);
}
console.log(`— coût total : ${total.toFixed(4)} € ${total <= 5 ? '(≤ 5 €)' : '(AU-DELÀ DE 5 €)'}`);
