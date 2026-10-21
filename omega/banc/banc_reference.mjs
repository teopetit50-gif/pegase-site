/* banc_reference.mjs — le banc de référence FILED (session A4, 19/10/2026 ; lot a4_62, décision de Teo 15 h 22 Z).
   Une note par contrôle FILED et par champ du lecteur, sur des pièces et des cas dont on connaît la bonne réponse.

     node omega/banc/banc_reference.mjs --preparer
         télécharge les sources ouvertes dans omega/banc/reference/ (hors git, voir .gitignore), vérifie leurs
         empreintes (SOURCE.tsv), et écrit omega/banc/banc_reference_cas.sql : les cas et leurs bonnes réponses,
         à poser sur la recette après a4_62 (rejouable : « on conflict do update »).
     node omega/banc/banc_reference.mjs --deposer [--voir]
         dépose les six PDF synthétiques sur le client du banc (Storage puis public.filed_deposer_piece, au nom du
         gérant du banc, expéditeur « synthetique:djo33350 ») ; le lecteur les lit, FILED les contrôle.
         Rejouable : une pièce dont l'empreinte est déjà un document du banc n'est pas redéposée.
   Puis, sur la recette (service_role) :
         select private.filed_banc_rejouer('<lot ou SHA>', 'cccccccc-0000-4000-8000-00000000000c');
         select * from private.filed_banc_notes();

   Sources (licences lues par le bureau le 19/10/2026) :
     · djo33350/french-synthetic-document-test-samples (Hugging Face), CC BY 4.0 — « données synthétiques » :
       six PDF fictifs et leur vérité terrain (montants en centimes, taux en points de base). Seule l'édition
       gratuite est utilisée ; les éditions payantes ne sont pas achetées.
     · Einvoi, « Jeu de tests Factur-X 1.09.2 — TVA, montants, doublons et cohérence PDF/XML » (data.gouv.fr),
       Licence Ouverte 2.0 : 29 cas décrits (pas de fichier). Ceux qui portent sur un contrôle FILED sont traduits
       ci-dessous en scénarios (TRADUCTION) ; les autres restent au banc, marqués hors périmètre, avec la raison.
     · Les vraies pièces NOBAT : hors git. Le coordinateur remplit leurs bonnes réponses sur la recette.
   Écarté : osolmaz/invoice-fixture (pas de licence). canopynexus/factur-x (MIT) : outil de banc seulement, pour
   fabriquer des variantes à anomalie connue ; il n'entre ni dans ce script ni dans le produit. */
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const ICI = new URL('./', import.meta.url).pathname;
const DOSSIER = join(ICI, 'reference');
mkdirSync(DOSSIER, { recursive: true });
const sha256 = (o) => createHash('sha256').update(o).digest('hex');

const HF = 'https://huggingface.co/datasets/djo33350/french-synthetic-document-test-samples/resolve/main/samples';
const HF_DOCS = [
  ['construction', 'BT-01-D03'], ['construction', 'BT-07-D02'],
  ['ecommerce', 'EC-01-D03'], ['ecommerce', 'EC-07-D02'],
  ['restaurant', 'RE-01-D03'], ['restaurant', 'RE-07-D02'],
];
const EINVOI = 'https://static.data.gouv.fr/resources/jeu-de-tests-factur-x-1-09-2-tva-montants-doublons-et-coherence-pdf-xml/20260822-132030/einvoi-factur-x-coherence-cases-2026-v1.json';
const ATTR_HF = 'djo33350/French-Synthetic-Document-Test-Samples (Hugging Face), CC BY 4.0 — données synthétiques';
const ATTR_EINVOI = 'Einvoi, Jeu de tests Factur-X 1.09.2 (data.gouv.fr), Licence Ouverte 2.0 — cas traduit par A4';

async function telecharger(url, essais = 5) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i >= essais) throw new Error(`${url} : ${e.message}`);
      await new Promise((ok) => setTimeout(ok, 2000 * i));
    }
  }
}

// Le fichier local, téléchargé s'il manque ; son empreinte doit égaler celle de SOURCE.tsv quand elle y est.
const fSource = join(ICI, 'banc_reference_SOURCE.tsv');
const empreintes = new Map(existsSync(fSource)
  ? readFileSync(fSource, 'utf8').split('\n').slice(1).filter(Boolean).map((l) => { const [f, , s] = l.split('\t'); return [f, s]; })
  : []);
const vues = [];
async function fichier(nom, url) {
  const local = join(DOSSIER, nom);
  const octets = existsSync(local) ? readFileSync(local) : await telecharger(url);
  if (!existsSync(local)) writeFileSync(local, octets);
  const e = sha256(octets);
  if (empreintes.get(nom) && empreintes.get(nom) !== e) throw new Error(`empreinte différente de banc_reference_SOURCE.tsv : ${nom} (${e})`);
  vues.push([nom, url, e]);
  return octets;
}

/* ——— Einvoi → FILED. Un cas : le scénario joué à blanc et les contrôles attendus. Les montants qu'Einvoi ne donne
   pas (« complété par A4 ») sont choisis cohérents avec le cas ; ils ne changent pas ce que le cas éprouve. ——— */
// Devis ↔ facture (décision du bureau, 19/10 : proposé et confirmé par une personne, jamais seul) : sans personne, le
// contrôle n'est jamais « ok ». Proposé discordant → attention (à vérifier) ; proposé concordant → info (à confirmer).
const PROPOSE = { resultat: 'anomalie', gravites: ['attention'] };
const PROPOSE_CONCORDANT = { resultat: 'anomalie', gravites: ['info'] };
const sain = { 'famille:montant': { resultat: 'pas_anomalie' }, 'lecture.complete': { resultat: 'ok' } };
const fx = (o = {}) => ({ numero: 'BANC-FX-001', date: -10, ht: 100, tva: 20, ttc: 120, ventilation: [{ taux: 20, base: 100, montant: 20 }], ...o });
const TRADUCTION = {
  'COH-FXC-001': { f: [fx({ ht: 1560.46, tva: 303.33, ttc: 1863.79, ventilation: [] })], c: sain },
  'COH-FXC-002': { f: [fx({ tva: 19, ttc: 119, ventilation: [{ taux: 20, base: 100, montant: 19 }] })],
                   c: { 'tva.ventilation': { resultat: 'anomalie' } }, note: 'TVA de la ventilation ≠ base × taux (BR-CO-17).' },
  'COH-FXC-003': { f: [fx({ ht: 1559.46, tva: 311.89, ttc: 1871.35, lignes: [1560.46], ventilation: [] })],
                   c: { 'montant.lignes': { resultat: 'anomalie' } }, note: 'TVA et TTC complétés par A4.' },
  'COH-FXC-004': { f: [fx({ ttc: 121 })], c: { 'montant.coherence': { resultat: 'anomalie' } } },
  'COH-FXC-005': { f: [fx({ devise: 'USD', ht: 95, tva: 19, ttc: 114, prepaye: 14, arrondi: 0.01, net: 100, ventilation: [] })],
                   c: { 'montant.net_a_payer': { resultat: 'anomalie', gravites: ['attention', 'bloquant'] }, 'montant.devise': { resultat: 'present' } },
                   note: 'Net à payer 100 au lieu de 114 − 14 + 0,01 d’arrondi = 100,01 (BR-CO-16). HT et TVA complétés par A4.' },
  'COH-FXC-008': { f: [fx({ numero: null })], c: { 'lecture.complete': { resultat: 'anomalie' } } },
  'COH-FXC-009': { f: [fx({ date: null })], c: { 'lecture.complete': { resultat: 'anomalie' } } },
  'COH-FXC-010': { f: [fx({ echeance: -20 })], c: { 'date.echeance': { resultat: 'anomalie' } } },
  'COH-FXC-011': { f: [fx(), fx()], c: { 'doublon.exact': { resultat: 'anomalie' } }, note: 'Deux fichiers identiques : même numéro, date et montant.' },
  'COH-FXC-012': { f: [fx({ source: 'courriel' }), fx({ source: 'depot' })], c: { 'doublon.exact': { resultat: 'anomalie' } } },
  'COH-FXC-013': { f: [fx(), fx({ ttc: 121, tva: 21, ventilation: [{ taux: 20, base: 100, montant: 21 }] })],
                   c: { 'doublon.exact': { resultat: 'anomalie' } }, note: 'Même identité, TTC 120 puis 121.' },
  'COH-FXC-015': { f: [fx({ ht: 1560.46, tva: 303.33, ttc: 1863.79, ventilation: [] })], c: sain },
  'COH-FXC-016': { f: [fx({ fournisseur: false })], c: { 'lecture.complete': { resultat: 'anomalie' } } },
  'BENCH-PDF-CREDIT-NOTE': { f: [fx({ nature: 'avoir', numero: 'BANC-AV-001', ht: 200, tva: 40, ttc: 240, ventilation: [{ taux: 20, base: 200, montant: 40 }] })],
                             c: sain, note: 'Montants complétés par A4.' },
  'BENCH-UBL-CREDIT-NOTE': { f: [fx({ nature: 'avoir', numero: 'BANC-AV-002', ht: 200, tva: 40, ttc: 240, ventilation: [{ taux: 20, base: 200, montant: 40 }] })],
                             c: sain, note: 'Montants complétés par A4.' },
  'BENCH-FACTUR-X-VALID': { f: [fx()], c: sain },
  'BENCH-PDF-VISUAL-DUPLICATE': { f: [fx(), fx()], c: { 'doublon.exact': { resultat: 'anomalie' } } },
  'BENCH-PDF-AMOUNT-CONFLICT': { f: [fx(), fx({ ttc: 121, tva: 21, ventilation: [{ taux: 20, base: 100, montant: 21 }] })], c: { 'doublon.exact': { resultat: 'anomalie' } } },
  'BENCH-DATE-CONFLICT': { f: [fx({ date: -12 }), fx({ date: -10 })], c: { 'famille:doublon': { resultat: 'anomalie' } },
                           note: 'Même numéro, dates différentes : doublon exact ou probable, l’un ou l’autre.' },
  'BENCH-MULTICHANNEL-COPY': { f: [fx({ source: 'courriel' }), fx({ source: 'depot' })], c: { 'doublon.exact': { resultat: 'anomalie' } } },
  'COMPAT-FX1092-19': { f: [fx({ date: null })], c: { 'lecture.complete': { resultat: 'anomalie' } } },
};
const HORS = {
  'COH-FXC-006': 'Devise absente : filed_factures.devise vaut EUR par défaut, l’absence ne se voit plus après le lecteur. À décider (lecteur A1 ou FILED).',
  'COH-FXC-007': 'Devise d’un montant ≠ devise de la facture : FILED ne garde qu’une devise par facture ; contrôle du lecteur ou de l’import XML.',
  'COH-FXC-014': 'TTC du PDF ≠ TTC du XML embarqué : comparaison faite à la lecture (A1), pas dans les contrôles FILED.',
  'COMPAT-FX1092-03': 'Lisibilité d’un CII antérieur : lecteur / import XML.',
  'COMPAT-FX1092-14': 'Contradiction PDF / XML : lecteur (A1).',
  'COMPAT-FX1092-17': 'Avoir reconnu comme avoir : type de pièce rendu par le lecteur (A1).',
  'COMPAT-FX1092-20': 'XML hostile refusé avant lecture : lecteur / import XML.',
  'LIFECYCLE-REGULARIZED-001': 'Rejet relié à sa version corrigée : cycle de vie PA (a4_18), pas encore au banc.',
};

const lit = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const js = (o) => `${lit(JSON.stringify(o))}::jsonb`;
const cas = (o) => `  (${[o.code, o.source, o.licence, o.attribution, o.genre, o.sha, o.lie_a, o.intitule].map(lit).join(', ')}, ${js(o.champs ?? {})}, ${js(o.controles ?? {})}, ${o.scenario ? js(o.scenario) : 'null'}, ${lit(o.note)})`;

if (args[0] === '--preparer') {
  const lignes = [];
  // 1. Hugging Face : les PDF (déposés plus tard) et leur vérité terrain.
  for (const [dom, id] of HF_DOCS) {
    const pdf = await fichier(`${id}.pdf`, `${HF}/${dom}/pdf/${id}.pdf`);
    const v = JSON.parse((await fichier(`${id}.json`, `${HF}/${dom}/ground_truth/${id}.json`)).toString('utf8'));
    if (!v.synthetic_data) throw new Error(`${id} : synthetic_data absent`);
    const p = v.printed_totals;
    const e = (c) => Math.round(c) / 100;
    const constats = v.integrity.expected_findings;
    const controles = { 'montant.coherence': { resultat: constats.includes('printed_total_mismatch') ? 'anomalie' : 'pas_anomalie' },
                        'tva.ventilation': { resultat: constats.includes('wrong_vat_amount') ? 'anomalie' : 'pas_anomalie' } };
    if (!constats.length) controles['famille:montant'] = { resultat: 'pas_anomalie' };
    lignes.push(cas({
      code: `HF-${id}`, source: 'hf_djo33350', licence: 'CC BY 4.0', attribution: ATTR_HF, genre: 'piece', sha: sha256(pdf),
      intitule: `${v.document_type_label} ${v.document_number} (${constats.length ? constats.join(', ') : 'cas propre'})`,
      champs: {
        numero: v.document_number, date: v.issue_date, montant_ht: e(p.ht_cents), montant_tva: e(p.vat_cents), montant_ttc: e(p.ttc_cents),
        'fournisseur.nom': v.seller.legal_name, lignes: { nombre: v.line_items.length },
        'tva.ventilation': p.vat_breakdown.map((t) => ({ taux: t.rate_basis_points / 100, base: e(t.base_cents), montant: e(t.tax_cents) })),
      },
      controles,
      note: constats.includes('duplicate_invoice_number')
        ? 'Doublon de numéro avec une pièce hors de l’échantillon gratuit : le doublon lui-même n’est pas jouable ici.' : null,
    }));
  }
  // 2. Einvoi : les cas, traduits ou gardés hors périmètre.
  const einvoi = JSON.parse((await fichier('einvoi-factur-x-coherence-cases-2026-v1.json', EINVOI)).toString('utf8'));
  for (const x of einvoi) {
    const t = TRADUCTION[x.case_id];
    const base = { code: `EINVOI-${x.case_id}`, source: 'einvoi', licence: 'Licence Ouverte 2.0', attribution: ATTR_EINVOI,
                   intitule: `${x.scenario} (${x.expected_status}${x.expected_anomalies ? ' : ' + x.expected_anomalies : ''})` };
    if (t) lignes.push(cas({ ...base, genre: 'scenario', scenario: { factures: t.f }, controles: t.c, note: t.note ?? null }));
    else lignes.push(cas({ ...base, genre: 'hors_perimetre', note: HORS[x.case_id] ?? 'Non traduit : à classer.' }));
  }
  // 3. Le devis et la facture d'un même fournisseur (dossier NOBAT) : cas attendu, empreintes posées par le coordinateur.
  lignes.push(cas({ code: 'NOBAT-DOSSIER1-DEVIS', source: 'nobat', licence: 'pièce client (recette)', attribution: null, genre: 'piece',
    intitule: 'Devis du dossier 1 (même fournisseur que la facture du dossier 1)', note: 'Empreinte et champs remplis par le coordinateur sur la recette.' }));
  lignes.push(cas({ code: 'NOBAT-DOSSIER1-FACTURE', source: 'nobat', licence: 'pièce client (recette)', attribution: null, genre: 'piece',
    lie_a: 'NOBAT-DOSSIER1-DEVIS', intitule: 'Facture du dossier 1 : devis du même fournisseur, aucun article en commun',
    controles: { 'rapprochement.devis': PROPOSE },
    note: 'Attendu : FILED propose le devis du même fournisseur, à confirmer, sans le rapprocher (aucun article en commun ; '
        + 'aujourd’hui : « Sans commande : rien à rapprocher »). Empreinte et champs remplis par le coordinateur sur la recette.' }));
  // 4. Devis ↔ facture, en scénario : articles différents → proposé à confirmer ; mêmes articles → rapproché.
  const devis = (lignes, ttc) => ({ document: 'devis', numero: 'BANC-DV-001', date: -30, ttc, lignes });
  lignes.push(cas({ code: 'OMEGA-DEVIS-ARTICLES-DIFFERENTS', source: 'omega', licence: 'A4', attribution: null, genre: 'scenario',
    intitule: 'Devis et facture du même fournisseur, aucun article en commun : proposé à confirmer, pas rapproché',
    scenario: { factures: [
      devis([{ designation: 'Disques à tronçonner', montant: 60 }, { designation: 'Traceurs de chantier', montant: 40 },
             { designation: 'Pointes', montant: 25.92 }], 151.10),
      fx({ numero: 'BANC-FA-001', ht: 123.96, tva: 24.79, ttc: 148.75, lignes: [{ designation: 'Chaussures de sécurité (5 paires)', montant: 123.96 }],
           ventilation: [{ taux: 20, base: 123.96, montant: 24.79 }] })] },
    controles: { 'rapprochement.devis': PROPOSE },
    note: 'Modèle du dossier NOBAT 1, montants voisins (151,10 / 148,75 €), articles sans rapport : le devis est proposé, '
        + 'à vérifier (attention) ; une personne confirme ou écarte (a4_66).' }));
  lignes.push(cas({ code: 'OMEGA-DEVIS-MEMES-ARTICLES', source: 'omega', licence: 'A4', attribution: null, genre: 'scenario',
    intitule: 'Devis et facture du même fournisseur, mêmes articles, même montant : proposé, concordant, à confirmer',
    scenario: { factures: [
      devis([{ designation: 'Disques à tronçonner', montant: 60 }, { designation: 'Pointes', montant: 40 }], 120),
      fx({ numero: 'BANC-FA-002', lignes: [{ designation: 'Disques à tronçonner', montant: 60 }, { designation: 'Pointes', montant: 40 }] })] },
    controles: { 'rapprochement.devis': PROPOSE_CONCORDANT },
    note: 'Le pendant du cas précédent : concordant, mais jamais rapproché sans une personne (décision du bureau, 19/10).' }));

  const sql = `-- banc_reference_cas.sql — les cas du banc de référence FILED (a4_62), écrit par omega/banc/banc_reference.mjs --preparer.
-- Ne pas modifier à la main : relancer le script. À poser après a4_62. Rejouable : un cas existant est remis à jour,
-- sauf l'empreinte et les bonnes réponses des cas « nobat », que le coordinateur remplit sur la recette.
-- ${ATTR_HF}.
-- ${ATTR_EINVOI}.
insert into private.filed_banc_cas (code, source, licence, attribution, genre, piece_sha256, lie_a, intitule, champs_attendus, controles_attendus, scenario, note)
values
${lignes.join(',\n')}
on conflict (code) do update
  set source = excluded.source, licence = excluded.licence, attribution = excluded.attribution, genre = excluded.genre,
      piece_sha256 = case when excluded.source = 'nobat' then private.filed_banc_cas.piece_sha256 else excluded.piece_sha256 end,
      lie_a = excluded.lie_a, intitule = excluded.intitule,
      champs_attendus = case when excluded.source = 'nobat' then private.filed_banc_cas.champs_attendus else excluded.champs_attendus end,
      controles_attendus = excluded.controles_attendus, scenario = excluded.scenario, note = excluded.note, maj_le = now();
`;
  writeFileSync(join(ICI, 'banc_reference_cas.sql'), sql);
  writeFileSync(fSource, ['fichier\turl\tsha256', ...vues.map((v) => v.join('\t'))].join('\n') + '\n');
  console.log(`${lignes.length} cas → omega/banc/banc_reference_cas.sql ; ${vues.length} fichiers, empreintes dans banc_reference_SOURCE.tsv.`);
  process.exit(0);
}

if (args[0] === '--deposer') {
  const voir = args.includes('--voir');
  const URL_SB = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwbgpowzlbdaajlsqkn.supabase.co').replace(/\/+$/, '');
  const CLE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_a12GN1jHf0IJR4xcKvPTXw_NlPb51zl';
  const CLIENT = 'cccccccc-0000-4000-8000-00000000000c';
  const pdfs = HF_DOCS.map(([dom, id]) => ({ nom: `${id}.pdf`, url: `${HF}/${dom}/pdf/${id}.pdf` }));
  for (const p of pdfs) p.octets = await fichier(p.nom, p.url);
  console.log(pdfs.map((p) => `  · ${p.nom} ${sha256(p.octets)}`).join('\n'));
  if (voir) process.exit(0);
  const r = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: CLE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.BANC_EMAIL ?? 'gerant@banc-varelo.test', password: process.env.BANC_MOT_DE_PASSE ?? 'Recette-Omega-2026' }) });
  if (!r.ok) { console.error(`connexion refusée : HTTP ${r.status}`); process.exit(1); }
  const H = { apikey: CLE, Authorization: `Bearer ${(await r.json()).access_token}` };
  const rest = async (m, chemin, corps) => {
    const x = await fetch(`${URL_SB}/rest/v1/${chemin}`, { method: m, headers: { ...H, 'Content-Type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps) });
    const t = await x.text();
    if (!x.ok) throw new Error(`${m} ${chemin.split('?')[0]} : HTTP ${x.status} ${t.slice(0, 300)}`);
    return t ? JSON.parse(t) : null;
  };
  const deja = await rest('GET', `filed_documents?client_id=eq.${CLIENT}&select=sha256,reference`);
  for (const p of pdfs) {
    const e = sha256(p.octets);
    const d = deja.find((x) => x.sha256 === e);
    if (d) { console.log(`  · déjà déposée : ${p.nom} (${d.reference})`); continue; }
    const document = randomUUID();
    const chemin = `${CLIENT}/filed_document/${document}/${p.nom}`;
    const up = await fetch(`${URL_SB}/storage/v1/object/omega-clients/${chemin}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: p.octets });
    if (!up.ok) { console.log(`  ✗ Storage refuse ${p.nom} : HTTP ${up.status}`); continue; }
    const res = await rest('POST', 'rpc/filed_deposer_piece', { p_client: CLIENT, p_document: document, p_nom_fichier: p.nom, p_mime: 'application/pdf',
      p_octets: p.octets.length, p_sha256: e, p_chemin: chemin, p_entite: null, p_source: 'depot', p_expediteur: 'synthetique:djo33350' });
    console.log(`  ✓ déposée : ${p.nom} → ${res?.reference ?? document}`);
  }
  process.exit(0);
}

console.error('Usage : node omega/banc/banc_reference.mjs --preparer | --deposer [--voir]');
process.exit(2);
