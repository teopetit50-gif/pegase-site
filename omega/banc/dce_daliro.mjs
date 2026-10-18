/* dce_daliro.mjs — déposer des DCE publics réels comme devis Daliro du banc, comme un client (session B6, 18/10/2026),
   sur le modèle de dce_lorani.mjs (B5, worker-b5 4a0f968) : connecté comme le gérant du banc, clé publique, sous RLS.

   Les DCE : omega/banc/dce-reels/<neuf|renovation|vrd>/<dossier>/ (sources publiques légales, déposés par A1). Chaque
   dossier devient un marché « à vérifier » (référence DCE-<dossier>) sur le chantier de sa catégorie (« DCE réels — … »,
   posé par le bloc 1 de dce_daliro.sql). Ses DPGF / DQE / BPU / devis en PDF y sont téléversés (Storage omega-clients,
   <banc>/btp_marche/<marché>/<nom>) puis déposés par public.btp_deposer_devis (b6_33) : la pièce daliro_devis reçue lance
   la lecture (lecteur v38). Les CCTP, plans, RC… ne sont pas des devis : ils ne sont pas déposés ici.

   Coût : le gérant ne lit pas les coûts (travaux, consommations_ia : serveur seul). Le script attend la lecture de chaque
   pièce avant la suivante et ESTIME le coût à la page lue (COUT_PAGE_EUR, 0,04 € par défaut, prudent) ; il s'arrête dès
   que l'estimation atteint ARRET_EUR (2 €) ou à ARRET_HEURE (19 h 30 Z). Le coût exact : dce_daliro.sql, bloc 3. Le
   plafond du socle (5 € par jour, tous genres) arrête de toute façon les lectures du banc au-delà.
   Rejouable : une pièce déjà déposée sur son marché (même sha256) n'est pas redéposée, et son estimation est recomptée.

   usage : [DCE_RACINE=<dossier des DCE>] node omega/banc/dce_daliro.mjs [--voir]
     --voir : liste ce qui serait déposé, sans se connecter.
   Connexion : BANC_EMAIL / BANC_MOT_DE_PASSE (par défaut le gérant du banc), NEXT_PUBLIC_SUPABASE_URL et
   NEXT_PUBLIC_SUPABASE_ANON_KEY (par défaut la recette). Aucune valeur secrète n'est affichée. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const voir = process.argv.includes('--voir');
const RACINE = (process.env.DCE_RACINE ?? fileURLToPath(new URL('./dce-reels/', import.meta.url))).replace(/\/?$/, '/');
const URL_SB = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').replace(/\/+$/, '');
const CLE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_a12GN1jHf0IJR4xcKvPTXw_NlPb51zl';
const EMAIL = process.env.BANC_EMAIL ?? 'gerant@banc-varelo.test';
const MOT = process.env.BANC_MOT_DE_PASSE ?? 'Recette-Omega-2026';
const CLIENT = 'cccccccc-0000-4000-8000-00000000000c';
const ARRET_EUR = Number(process.env.ARRET_EUR ?? 2);
const ARRET_HEURE = new Date(process.env.ARRET_HEURE ?? `${new Date().toISOString().slice(0, 10)}T19:30:00Z`);
const COUT_PAGE_EUR = Number(process.env.COUT_PAGE_EUR ?? 0.04);
const MAX_PAR_DCE = Number(process.env.MAX_PAR_DCE ?? 4);
const MAX_MO = 20;
/* les VRD d'abord : leurs DPGF sont courts ; les CCTP-DPGF de rénovation sont plus longs */
const CATEGORIES = { vrd: 'DCE réels — VRD', renovation: 'DCE réels — rénovation', neuf: 'DCE réels — construction neuve' };
const DEVIS = /dpgf|\bdqe\b|\bbpu\b|devis|detail estimatif|decomposition du prix/;

const norme = (n) => n.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[_.\-]+/g, ' ');
const pdfs = (rep) => readdirSync(rep).flatMap((n) => { const p = join(rep, n); return statSync(p).isDirectory() ? pdfs(p) : /\.pdf$/i.test(n) ? [p] : []; });
const reference = (dossier) => `DCE-${norme(dossier).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 40);

/* ——— ce qui serait déposé ——— */
const plan = [];
for (const [cat, chantier] of Object.entries(CATEGORIES)) {
  const repCat = join(RACINE, cat);
  if (!existsSync(repCat)) continue;
  for (const dossier of readdirSync(repCat).filter((d) => statSync(join(repCat, d)).isDirectory()).sort()) {
    const devis = pdfs(join(repCat, dossier))
      .filter((p) => DEVIS.test(norme(p.slice(repCat.length))) && statSync(p).size <= MAX_MO * 1024 * 1024)
      .sort().slice(0, MAX_PAR_DCE);
    plan.push({ cat, chantier, dossier, reference: reference(dossier), devis });
  }
}
console.log(`— ${plan.length} DCE sous dce-reels/, ${plan.reduce((s, d) => s + d.devis.length, 0)} devis PDF retenus (au plus ${MAX_PAR_DCE} par DCE, ${MAX_MO} Mo chacun)`);
for (const d of plan) {
  console.log(`  ${d.cat}/${d.dossier} → ${d.reference} : ${d.devis.length ? '' : 'aucun DPGF/devis PDF'}`);
  for (const p of d.devis) console.log(`    · ${p.slice(RACINE.length)} — ${(statSync(p).size / 1048576).toFixed(2)} Mo`);
}
if (voir || !plan.some((d) => d.devis.length)) process.exit(0);

/* ——— connexion du gérant du banc ——— */
const jeton = await (async () => {
  const r = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: CLE, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: MOT }) });
  if (!r.ok) { console.error(`connexion refusée : HTTP ${r.status}`); process.exit(1); }
  return (await r.json()).access_token;
})();
const H = { apikey: CLE, Authorization: `Bearer ${jeton}` };
async function rest(methode, chemin, corps) {
  const r = await fetch(`${URL_SB}/rest/v1/${chemin}`, { method: methode, headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: corps === undefined ? undefined : JSON.stringify(corps) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${methode} ${chemin.split('?')[0]} : HTTP ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const FINIS = ['lue', 'a_verifier', 'a_classer', 'rejetee', 'echec'];

let estime = 0;
const bilan = [];
async function attendreLecture(piece) {
  const fin = Math.min(Date.now() + 10 * 60_000, ARRET_HEURE.getTime());
  for (;;) {
    const [p] = await rest('GET', `pieces?id=eq.${piece}&select=statut,type_piece,nb_pages`);
    if (FINIS.includes(p?.statut) || Date.now() > fin) return p;
    await dormir(20_000);
  }
}

dce: for (const d of plan.filter((x) => x.devis.length)) {
  const [chantier] = await rest('GET', `btp_chantiers?client_id=eq.${CLIENT}&nom=eq.${encodeURIComponent(d.chantier)}&select=id`);
  if (!chantier) { console.log(`  ✗ ${d.reference} : chantier « ${d.chantier} » absent (bloc 1 de dce_daliro.sql)`); continue; }
  let [marche] = await rest('GET', `btp_marches?client_id=eq.${CLIENT}&reference=eq.${d.reference}&select=id,statut`);
  if (!marche) {
    const id = await rest('POST', 'rpc/btp_ecrire_marche', { p_marche: null, p_chantier: chantier.id, p_champs: { reference: d.reference, objet: `DCE réel : ${d.dossier}`.slice(0, 200), mode_prix: 'unitaire', retenue_taux: 0 } });
    marche = { id, statut: 'a_verifier' };
    console.log(`— ${d.reference} : marché créé (${id})`);
  }
  const deja = await rest('GET', `pieces?client_id=eq.${CLIENT}&module=eq.daliro&objet_type=eq.btp_marche&objet_id=eq.${marche.id}&select=id,sha256`);
  for (const chemin of d.devis) {
    if (estime >= ARRET_EUR) { console.log(`— arrêt : ${estime.toFixed(2)} € estimés (seuil ${ARRET_EUR} €)`); break dce; }
    if (Date.now() >= ARRET_HEURE.getTime()) { console.log(`— arrêt : ${ARRET_HEURE.toISOString().slice(11, 16)} Z`); break dce; }
    const octets = readFileSync(chemin);
    const sha = createHash('sha256').update(octets).digest('hex');
    const nomLong = chemin.slice(chemin.lastIndexOf('/') + 1);
    const nom = nomLong.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-120);
    let piece = deja.find((p) => p.sha256 === sha)?.id;
    if (piece) console.log(`  · ${d.reference} : ${nomLong} déjà déposé (${piece})`);
    else {
      if (marche.statut !== 'a_verifier') { console.log(`  ✗ ${d.reference} : marché ${marche.statut}, devis non déposé`); continue dce; }
      const cle = `${CLIENT}/btp_marche/${marche.id}/${nom}`;
      const up = await fetch(`${URL_SB}/storage/v1/object/omega-clients/${cle}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/pdf', 'x-upsert': 'true' }, body: octets });
      if (!up.ok) { console.log(`  ✗ ${d.reference} : Storage refuse ${nomLong} : HTTP ${up.status} ${(await up.text()).slice(0, 200)}`); continue; }
      piece = await rest('POST', 'rpc/btp_deposer_devis', { p_marche: marche.id, p_nom_fichier: nomLong.slice(0, 200), p_mime: 'application/pdf', p_octets: octets.length, p_sha256: sha, p_chemin: cle });
      console.log(`  ✓ ${d.reference} : ${nomLong} → pièce ${piece} ; lecture…`);
    }
    const p = await attendreLecture(piece);
    const valeurs = await rest('GET', `pieces_valeurs?piece_id=eq.${piece}&champ=in.(lignes,montant_total_ht)&select=champ,valeur,verifiee`);
    const lignes = valeurs.find((v) => v.champ === 'lignes');
    const pages = Number(p?.nb_pages) || 0;
    estime += pages * COUT_PAGE_EUR;
    const ligne = { reference: d.reference, fichier: nomLong, statut: p?.statut, type: p?.type_piece, pages,
                    lignes: Array.isArray(lignes?.valeur) ? lignes.valeur.length : 0, verifiees: lignes?.verifiee === true,
                    total_ht: valeurs.find((v) => v.champ === 'montant_total_ht')?.valeur ?? null };
    bilan.push(ligne);
    console.log(`    ${ligne.statut}, ${ligne.type ?? '—'}, ${pages} p., ${ligne.lignes} lignes${ligne.verifiees ? ' vérifiées' : ''}, total HT ${ligne.total_ht ?? '—'} ; estimé cumulé ${estime.toFixed(2)} €`);
  }
}
console.log(`\n${bilan.length} devis relevés ; coût estimé ${estime.toFixed(2)} € (exact : dce_daliro.sql, bloc 3).`);
console.log(JSON.stringify(bilan));
