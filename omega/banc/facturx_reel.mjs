/* facturx_reel.mjs — un VRAI Factur-X déposé comme pièce FILED du banc, puis lu par le lecteur en ligne
   (session A1, 06/10/2026). Pas un test : rien n'est annulé. Rejouable : si le même fichier (même sha256)
   est déjà une pièce FILED du banc, il n'est pas redéposé (il deviendrait un doublon), on contrôle celle-là.

   La pièce : omega/functions/lecteur/banc/publics/EN16931_Einfach.pdf, PDF/A-3 Factur-X EN16931 avec XML
   joint factur-x.xml (exemple FeRD, via mustangproject, Apache-2.0 ; voir le LISEZMOI du dossier).

   Parcours : fichier → Storage omega-clients/<client>/filed_document/<document>/<nom>, puis filed_deposer_piece ;
   le socle dépose lecteur.lire ; le lecteur (cron chaque minute) lit. Le script attend 6 minutes au plus,
   puis contrôle :
     · la pièce est « lue », facture, méthode xml, et le travail lecteur.lire est « fait » avec 0 appel IA ;
     · la consommation IA du jour du banc n'a pas bougé (consommation_ia_jour avant / après) ;
     · chaque valeur est en source xml, confiance 1, une ligne par champ, lignes et ventilation en tableaux ;
     · montant_ttc = 529.87, page 2, avec une boîte, contrôle « concorde avec le PDF page 2 » ;
     · aucune divergence XML / PDF dans le motif de la pièce.

   usage : SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node omega/banc/facturx_reel.mjs [session-gerant.json]
   Avec une session (cookie Supabase du gérant, comme les scripts de recette d'A3/B5), le dépôt se fait en son nom ;
   sans, en serveur. Les contrôles lisent toujours avec la clé de service. Aucune valeur secrète n'est affichée. */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const URL_SB = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!URL_SB || !CLE) { console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires'); process.exit(2); }
const CLIENT = 'cccccccc-0000-4000-8000-00000000000c'; // Groupe Sogexal (banc)
const FICHIER = new URL('../functions/lecteur/banc/publics/EN16931_Einfach.pdf', import.meta.url);
const NOM = 'EN16931_Einfach_facturx.pdf';
const session = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : null;

let echecs = 0;
const ok = (c, m) => { console.log(`${c ? '  ✓' : '  ✗'} ${m}`); if (!c) echecs++; };
const service = { apikey: CLE, Authorization: `Bearer ${CLE}` };
const auteur = session?.access_token ? { apikey: CLE, Authorization: `Bearer ${session.access_token}` } : service;

async function rpc(nom, corps, entetes = service) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nom}`, { method: 'POST', headers: { ...entetes, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${nom} : HTTP ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
async function lire(table, requete) {
  const r = await fetch(`${URL_SB}/rest/v1/${table}?${requete}`, { headers: service });
  if (!r.ok) throw new Error(`${table} : HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const octets = readFileSync(FICHIER);
const sha = createHash('sha256').update(octets).digest('hex');
console.log(`— la pièce : ${NOM}, ${octets.length} octets, sha256 ${sha.slice(0, 12)}…`);

const iaAvant = Number(await rpc('consommation_ia_jour', { p_client: CLIENT }));
console.log(`  · consommation IA du jour avant : ${iaAvant} €`);

let [piece] = await lire('pieces', `client_id=eq.${CLIENT}&module=eq.filed&sha256=eq.${sha}&select=id,statut&order=recue_le.asc&limit=1`);
if (piece) {
  console.log(`  · déjà déposée (pièce ${piece.id}, ${piece.statut}) : pas de nouveau dépôt, on contrôle celle-là`);
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
  ok(!!r?.piece && r.etat === 'en_lecture', `document ${r?.reference} créé, pièce ${r?.piece}, état ${r?.etat}`);
  piece = { id: r.piece };
}

console.log('— attendre le lecteur (cron chaque minute), 6 minutes au plus');
const debut = Date.now();
let p;
while (Date.now() - debut < 6 * 60 * 1000) {
  [p] = await lire('pieces', `id=eq.${piece.id}&select=id,statut,type_piece,methode,nb_pages,motif,version_lecteur`);
  console.log(`  · ${Math.round((Date.now() - debut) / 1000)} s : ${p?.statut}`);
  if (p && !['recue', 'en_lecture'].includes(p.statut)) break;
  await dormir(20000);
}
ok(p?.statut === 'lue', `pièce lue (statut ${p?.statut}, version ${p?.version_lecteur})`);
ok(p?.type_piece === 'facture' && p?.methode === 'xml', `facture lue par son XML (type ${p?.type_piece}, méthode ${p?.methode})`);
ok(!p?.motif, p?.motif ? `motif : ${p.motif}` : 'aucune divergence XML / PDF ni champ manquant');

const [t] = await lire('travaux', `genre=eq.lecteur.lire&charge->>piece=eq.${piece.id}&select=id,etat,resultat,essais&order=id.desc&limit=1`);
ok(t?.etat === 'fait', `travail ${t?.id} fait (${t?.essais} essai·s)`);
ok((t?.resultat?.appels_ia ?? -1) === 0 && !t?.resultat?.modele && Number(t?.resultat?.cout_eur ?? -1) === 0,
  `aucun appel au modèle : appels_ia ${t?.resultat?.appels_ia}, modèle ${t?.resultat?.modele ?? 'aucun'}, coût ${t?.resultat?.cout_eur} €`);

const iaApres = Number(await rpc('consommation_ia_jour', { p_client: CLIENT }));
ok(iaApres === iaAvant, `consommation IA du jour inchangée (${iaAvant} € → ${iaApres} €)`);

const valeurs = await lire('pieces_valeurs', `piece_id=eq.${piece.id}&select=champ,valeur,page,boite,source,confiance,verifiee,controle`);
const champs = valeurs.map((v) => v.champ);
ok(valeurs.length >= 10, `${valeurs.length} valeurs enregistrées`);
ok(champs.length === new Set(champs).size, 'une ligne par champ');
ok(valeurs.every((v) => v.source === 'xml' && Number(v.confiance) === 1), 'toutes en source xml, confiance 1');
const v = Object.fromEntries(valeurs.map((x) => [x.champ, x]));
ok(Array.isArray(v.lignes?.valeur) && v.lignes.valeur.length === 2, `lignes : tableau jsonb de ${v.lignes?.valeur?.length} lignes`);
ok(Array.isArray(v['tva.ventilation']?.valeur) && v['tva.ventilation'].valeur.length === 2, 'ventilation de TVA : tableau jsonb à deux taux');
ok(v.numero?.valeur === '471102', `numéro ${v.numero?.valeur}`);
ok(Number(v.montant_ht?.valeur) === 473 && Number(v.montant_tva?.valeur) === 56.87, `HT ${v.montant_ht?.valeur}, TVA ${v.montant_tva?.valeur}`);
ok(Number(v.montant_ttc?.valeur) === 529.87 && v.montant_ttc?.page === 2 && !!v.montant_ttc?.boite && /concorde avec le PDF page 2/.test(v.montant_ttc?.controle ?? ''),
  `TTC ${v.montant_ttc?.valeur}, page ${v.montant_ttc?.page}, boîte ${v.montant_ttc?.boite ? 'oui' : 'non'}, « ${v.montant_ttc?.controle} »`);

const [doc] = await lire('filed_documents', `piece_id=eq.${piece.id}&select=reference,etat`);
console.log(`  · côté FILED (A4) : document ${doc?.reference ?? '?'}, état ${doc?.etat ?? '?'}`);

console.log(echecs === 0 ? '\nTout est conforme.' : `\n${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
