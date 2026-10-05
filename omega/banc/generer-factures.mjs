#!/usr/bin/env node
// Génère le banc : cent factures fournisseurs fictives et variées, chacune avec son JSON de valeurs attendues.
// Usage : node generer-factures.mjs [--graine 2026] [--sortie factures]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerAlea } from './lib/alea.mjs';
import { creerFournisseurs, creerClients, composerFacture } from './lib/donnees.mjs';
import { GABARITS, creerDocument, attacherFacturX, definirDevise } from './lib/rendu.mjs';
import { arrondir } from './lib/donnees.mjs';
import { ibanFictif, bicFictif } from './lib/identifiants.mjs';
import { facturXCii, ubl21 } from './lib/xml.mjs';
import { euros } from './lib/rendu.mjs';
import { scanner, verifierOutils } from './lib/scan.mjs';
import { PDFDocument, rgb } from 'pdf-lib';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const lireArg = (nom, defaut) => { const i = args.indexOf(`--${nom}`); return i >= 0 ? args[i + 1] : defaut; };
const GRAINE = Number(lireArg('graine', 2026));
const SORTIE = path.resolve(ICI, lireArg('sortie', 'factures'));

verifierOutils();
fs.mkdirSync(SORTIE, { recursive: true });
for (const n of fs.readdirSync(SORTIE)) if (/^\d{3}-/.test(n)) fs.rmSync(path.join(SORTIE, n));

const alea = creerAlea(GRAINE);
const FOURNISSEURS = creerFournisseurs(alea);
const CLIENTS = creerClients(alea);
const compteurs = new Map();
const prochainNumero = (f) => { const n = (compteurs.get(f.id) ?? alea.entier(10, 400)) + alea.entier(1, 9); compteurs.set(f.id, n); return n; };
const index = [];
let numero = 0;

function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function rendre(gabarit, factures, options = {}) {
  const doc = await creerDocument();
  let pages = 0;
  definirDevise(factures[0].devise);
  for (const f of factures) pages += await GABARITS[gabarit](doc, f, alea, options);
  definirDevise('EUR');
  if (options.facturx) attacherFacturX(doc, facturXCii(factures[0], options.facturx), options.facturx);
  doc.setTitle(`${factures[0].type_document === 'avoir' ? 'Avoir' : 'Facture'} ${factures[0].numero}`);
  doc.setAuthor(factures[0].fournisseur.raison_sociale);
  return { pdf: await doc.save(), pages };
}

async function publier({ type, gabarit, factures, pdf, xml, pages, qualite, difficultes, lisible = true, extra = {} }) {
  numero++;
  const prefixe = String(numero).padStart(3, '0');
  const nomBase = `${prefixe}-${type}-${slug(gabarit ?? 'xml')}-${slug(factures[0].fournisseur.raison_sociale.split(' ')[0])}`;
  const fichier = `${nomBase}.${xml ? 'xml' : 'pdf'}`;
  if (xml) fs.writeFileSync(path.join(SORTIE, fichier), xml, 'utf8'); else fs.writeFileSync(path.join(SORTIE, fichier), pdf);
  const attendu = {
    fichier, format: xml ? 'xml' : 'pdf', type, gabarit: gabarit ?? null, qualite: qualite ?? 'native', pages: xml ? null : pages,
    lisible, nb_factures: lisible ? factures.length : 0,
    factures: lisible ? factures : [],
    difficultes: difficultes ?? [],
    ...extra,
    graine: GRAINE, genere_par: 'omega/banc/generer-factures.mjs',
  };
  if (!lisible) attendu.verite_non_attendue = { note: 'Valeurs réelles du document avant dégradation ; le lecteur doit refuser de lire, pas deviner.', factures };
  fs.writeFileSync(path.join(SORTIE, `${nomBase}.json`), JSON.stringify(attendu, null, 2) + '\n', 'utf8');
  index.push({ numero: prefixe, fichier, type, gabarit: gabarit ?? null, qualite: attendu.qualite, pages: attendu.pages, nb_factures: attendu.nb_factures, lisible, total_ttc: lisible ? factures.map((f) => f.total_ttc) : null });
  process.stdout.write(`${fichier}\n`);
}

const GABARITS_NATIFS = ['classique', 'moderne', 'sobre', 'courrier'];
const fournisseurHorsTicket = () => alea.choix(FOURNISSEURS.filter((f) => !['alimentaire', 'garage'].includes(f.metier)));
const fournisseurMetier = (...metiers) => alea.choix(FOURNISSEURS.filter((f) => metiers.includes(f.metier)));

// 1) 37 factures natives variées ------------------------------------------------
for (let i = 0; i < 37; i++) {
  const four = i % 9 === 0 ? fournisseurMetier('energie', 'telecom') : fournisseurHorsTicket();
  const client = alea.choix(CLIENTS);
  const options = { compteur: prochainNumero(four), nbLignes: alea.entier(1, 7) };
  const difficultes = [];
  if (i % 4 === 1) { options.remise = alea.choix([2, 5, 10]); difficultes.push('remise globale'); }
  if (i % 5 === 2) { options.acompte = alea.choix([0.3, 0.4, 0.5]); difficultes.push('acompte déduit : net à payer différent du TTC'); }
  if (i % 6 === 3) { options.port = alea.choix([8.5, 12, 19.9]); difficultes.push('frais de port en ligne séparée'); }
  if (i % 7 === 4) { options.remisesLignes = true; difficultes.push('remises par ligne'); }
  if (i % 11 === 5) { options.ecoPart = alea.choix([0.5, 1.2, 3]); difficultes.push('éco-participation'); }
  if (four.metier === 'energie' || four.metier === 'telecom') { options.periode = `du 01/${String(alea.entier(1, 8)).padStart(2, '0')}/2026 au 30/${String(alea.entier(1, 8)).padStart(2, '0')}/2026`; options.dateLivraison = false; difficultes.push('période de consommation, pas de date de livraison'); }
  const f = composerFacture(alea, four, client, options);
  if (f.tva.length > 1) difficultes.push('plusieurs taux de TVA');
  if (four.regime_tva === 'franchise') difficultes.push('franchise en base : TVA à zéro, pas de n° intracom');
  const gabarit = GABARITS_NATIFS[i % GABARITS_NATIFS.length];
  const { pdf, pages } = await rendre(gabarit, [f], { zebre: alea.chance(0.5), tableauTva: alea.chance(0.3), famille: gabarit === 'classique' && alea.chance(0.3) ? 'times' : undefined });
  await publier({ type: 'natif', gabarit, factures: [f], pdf, pages, difficultes });
}

// 2) 3 avoirs ---------------------------------------------------------------------
for (let i = 0; i < 3; i++) {
  const four = fournisseurHorsTicket();
  const f = composerFacture(alea, four, alea.choix(CLIENTS), { compteur: prochainNumero(four), nbLignes: alea.entier(1, 3), avoir: true });
  const gabarit = GABARITS_NATIFS[(i + 1) % 4];
  const { pdf, pages } = await rendre(gabarit, [f]);
  await publier({ type: 'avoir', gabarit, factures: [f], pdf, pages, difficultes: ['avoir : montants négatifs, référence à la facture rectifiée', 'pas de date d\'échéance'] });
}

// 3) 15 scannés de qualité variable ------------------------------------------------
const QUALITES_SCAN = ['bonne', 'bonne', 'bonne', 'bonne', 'bonne', 'moyenne', 'moyenne', 'moyenne', 'moyenne', 'moyenne', 'moyenne', 'faible', 'faible', 'faible', 'faible'];
for (const [i, qualite] of alea.melange(QUALITES_SCAN).entries()) {
  const four = fournisseurHorsTicket();
  const options = { compteur: prochainNumero(four), nbLignes: alea.entier(1, 8) };
  if (alea.chance(0.3)) options.remise = 5;
  if (alea.chance(0.2)) options.acompte = 0.3;
  const f = composerFacture(alea, four, alea.choix(CLIENTS), options);
  const gabarit = GABARITS_NATIFS[i % 4];
  const natif = await rendre(gabarit, [f]);
  const { pdf, pages } = await scanner(natif.pdf, qualite, alea);
  await publier({ type: 'scanne', gabarit, factures: [f], pdf, pages, qualite, difficultes: [`numérisation de qualité ${qualite} : pas de couche texte, rotation, bruit${qualite === 'faible' ? ', flou et taches' : ''}`] });
}

// 4) 8 multi-pages ------------------------------------------------------------------
for (let i = 0; i < 8; i++) {
  const four = fournisseurMetier('materiaux', 'quincaillerie', 'electricite', 'bureau', 'medical', 'alimentaire');
  const gabarit = GABARITS_NATIFS[i % 4];
  const options = { compteur: prochainNumero(four), nbLignes: gabarit === 'courrier' ? alea.entier(72, 95) : alea.entier(34, 78), remisesLignes: alea.chance(0.5) };
  if (alea.chance(0.5)) options.remise = alea.choix([2, 3, 5]);
  const f = composerFacture(alea, four, alea.choix(CLIENTS), options);
  const natif = await rendre(gabarit, [f], { zebre: true });
  const difficultes = [`${natif.pages} pages, report de sous-total entre les pages`, 'totaux sur la dernière page'];
  let sortie = natif; let qualite;
  if (i >= 6) { qualite = i === 6 ? 'moyenne' : 'bonne'; sortie = await scanner(natif.pdf, qualite, alea); difficultes.push(`numérisé (qualité ${qualite})`); }
  await publier({ type: 'multi-pages', gabarit, factures: [f], pdf: sortie.pdf, pages: sortie.pages, qualite, difficultes });
}

// 5) 5 fichiers contenant plusieurs factures ---------------------------------------
for (let i = 0; i < 5; i++) {
  const nb = alea.entier(2, 3);
  const memeFournisseur = alea.chance(0.5);
  const fourBase = fournisseurHorsTicket();
  const factures = [];
  for (let k = 0; k < nb; k++) {
    const four = memeFournisseur ? fourBase : fournisseurHorsTicket();
    factures.push(composerFacture(alea, four, alea.choix(CLIENTS), { compteur: prochainNumero(four), nbLignes: alea.entier(1, 6), remise: alea.chance(0.3) ? 5 : 0 }));
  }
  const gabarit = GABARITS_NATIFS[(i + 2) % 4];
  const natif = await rendre(gabarit, factures);
  let sortie = natif; let qualite;
  const difficultes = [`${nb} factures ${memeFournisseur ? 'du même fournisseur' : 'de fournisseurs différents'} dans un seul fichier : découper avant de lire`];
  if (i === 4) { qualite = 'moyenne'; sortie = await scanner(natif.pdf, qualite, alea); difficultes.push('lot numérisé en une fois'); }
  await publier({ type: 'multi-factures', gabarit, factures, pdf: sortie.pdf, pages: sortie.pages, qualite, difficultes });
}

// 6) 8 Factur-X --------------------------------------------------------------------
for (let i = 0; i < 8; i++) {
  const four = fournisseurHorsTicket();
  const avoir = i === 7;
  const f = composerFacture(alea, four, alea.choix(CLIENTS), { compteur: prochainNumero(four), nbLignes: alea.entier(1, 6), remise: i % 3 === 1 ? 5 : 0, acompte: i === 2 ? 0.3 : 0, avoir });
  const profil = i < 3 ? 'BASIC' : 'EN 16931';
  const gabarit = GABARITS_NATIFS[i % 4];
  const { pdf, pages } = await rendre(gabarit, [f], { facturx: profil });
  await publier({ type: avoir ? 'facturx-avoir' : 'facturx', gabarit, factures: [f], pdf, pages, difficultes: [`Factur-X profil ${profil} : lire le XML joint (factur-x.xml), le PDF n'est qu'une vue`, 'le XML fait foi en cas d\'écart avec la vue'], extra: { facturx: { profil, piece_jointe: 'factur-x.xml', type_code: avoir ? '381' : '380' } } });
}

// 7) 6 UBL 2.1 ---------------------------------------------------------------------
for (let i = 0; i < 6; i++) {
  const four = fournisseurHorsTicket();
  const avoir = i === 5;
  const f = composerFacture(alea, four, alea.choix(CLIENTS), { compteur: prochainNumero(four), nbLignes: alea.entier(1, 5), remise: i === 1 ? 10 : 0, avoir });
  await publier({ type: avoir ? 'ubl-avoir' : 'ubl', gabarit: null, factures: [f], xml: ubl21(f), difficultes: [`UBL 2.1 ${avoir ? 'CreditNote' : 'Invoice'} (EN 16931) : XML seul, sans PDF`], extra: { ubl: { racine: avoir ? 'CreditNote' : 'Invoice', customization: 'urn:cen.eu:en16931:2017' } } });
}

// 8) 8 tickets de caisse -----------------------------------------------------------
for (let i = 0; i < 8; i++) {
  const four = fournisseurMetier('alimentaire', 'garage', 'bureau', 'quincaillerie');
  const f = composerFacture(alea, four, alea.choix(CLIENTS), { compteur: prochainNumero(four), nbLignes: alea.entier(2, 9) });
  f.mode_paiement = alea.choix(['Espèces', 'Carte bancaire', 'Carte bancaire']);
  f.date_echeance = f.date_emission; f.references.commande = null; f.references.bon_livraison = null; f.date_livraison = f.date_emission;
  const natif = await rendre('ticket', [f], { largeurMm: alea.choix([58, 80, 80]) });
  let sortie = natif; let qualite;
  const difficultes = ['ticket de caisse : montants lignes en TTC, totaux HT/TVA en pied, pas d\'IBAN'];
  if (i >= 4) { qualite = ['bonne', 'moyenne', 'faible', 'moyenne'][i - 4]; sortie = await scanner(natif.pdf, qualite, alea, { couleurPapier: '#f3f1ea' }); difficultes.push(`ticket photographié/numérisé (qualité ${qualite})`); }
  await publier({ type: 'ticket', gabarit: 'ticket', factures: [f], pdf: sortie.pdf, pages: sortie.pages, qualite, difficultes, extra: { lignes_affichees_en: 'TTC' } });
}

// 9) 6 manuscrites -------------------------------------------------------------------
for (let i = 0; i < 6; i++) {
  const four = alea.choix(FOURNISSEURS.filter((f) => ['EI', 'EURL'].includes(f.forme) || ['menuiserie', 'peinture', 'vitrerie', 'plomberie'].includes(f.metier)));
  const f = composerFacture(alea, four, alea.choix(CLIENTS), { compteur: prochainNumero(four), nbLignes: alea.entier(1, 5), sansTva: i === 5 });
  f.references = { commande: null, bon_livraison: null, reference_paiement: null }; f.date_livraison = null;
  const natif = await rendre('manuscrit', [f], { carnet: i % 3 !== 2, iban: i % 2 === 0 });
  const qualite = ['moyenne', 'faible', 'moyenne', 'bonne', 'faible', 'moyenne'][i];
  const sortie = await scanner(natif.pdf, qualite, alea, { couleurPapier: '#f6f2e8' });
  await publier({ type: 'manuscrite', gabarit: 'manuscrit', factures: [f], pdf: sortie.pdf, pages: sortie.pages, qualite, difficultes: [`facture manuscrite ${i % 3 !== 2 ? 'sur carnet pré-imprimé' : 'sur feuille libre'}, numérisée (qualité ${qualite})`, i % 2 === 0 ? 'IBAN écrit à la main' : 'aucun IBAN sur le document', ...(i === 5 ? ['TVA non applicable (art. 293 B)'] : [])] });
}

// 10) 3 natives à difficulté particulière -------------------------------------------
{
  const four = fournisseurMetier('energie');
  const f = composerFacture(alea, four, CLIENTS[0], { compteur: prochainNumero(four), nbLignes: 6, periode: 'du 01/03/2026 au 31/05/2026', dateLivraison: false });
  const { pdf, pages } = await rendre('moderne', [f], { tableauTva: true });
  await publier({ type: 'natif', gabarit: 'moderne', factures: [f], pdf, pages, difficultes: ['facture d\'énergie : période de consommation, trois taux de TVA, quantités en kWh et m3 avec prix unitaires à 4 décimales'] });
}
{
  const four = fournisseurMetier('materiaux', 'electricite', 'plomberie');
  const f = composerFacture(alea, four, CLIENTS[4], { compteur: prochainNumero(four), nbLignes: 4, autoliquidation: true });
  const { pdf, pages } = await rendre('classique', [f]);
  await publier({ type: 'natif', gabarit: 'classique', factures: [f], pdf, pages, difficultes: ['autoliquidation de la TVA (sous-traitance) : TVA à zéro avec n° intracom présent, mention obligatoire'] });
}
{
  const four = fournisseurMetier('conseil', 'informatique');
  const f = composerFacture(alea, four, CLIENTS[2], { compteur: prochainNumero(four), nbLignes: 3, acompte: 0.5, remise: 3 });
  const { pdf, pages } = await rendre('sobre', [f]);
  await publier({ type: 'natif', gabarit: 'sobre', factures: [f], pdf, pages, difficultes: ['acompte de 50 % déduit et remise globale : trois montants différents (HT, TTC, net à payer)'] });
}

// 11) 1 illisible ---------------------------------------------------------------------
{
  const four = fournisseurHorsTicket();
  const f = composerFacture(alea, four, alea.choix(CLIENTS), { compteur: prochainNumero(four), nbLignes: 4 });
  const natif = await rendre('classique', [f]);
  const { pdf, pages } = await scanner(natif.pdf, 'illisible', alea);
  await publier({ type: 'illisible', gabarit: 'classique', factures: [f], pdf, pages, qualite: 'illisible', lisible: false, difficultes: ['document illisible : le lecteur doit le signaler comme tel et ne rien inventer'], extra: { attendu: 'refus_de_lecture' } });
}

// 12) Compléments demandés par le coordinateur le 5/10 : devise étrangère, facture d'acompte pure, note de frais -------
{
  // 101 — fournisseur étranger, facture en USD, sans TVA française, contre-valeur EUR indiquée
  const fourUS = { id: 900, raison_sociale: 'Harbor & Pike Instruments LLC', forme: 'LLC', metier: 'informatique', siren: null, siret: null, tva_intracom: null,
    adresse: '2140 Marlowe Avenue, Suite 400', code_postal: 'DE 19801', ville: 'Wilmington', pays: 'US', iban: null, bic: null,
    telephone: '+1 302 555 0147', courriel: 'billing@harborpike.example', capital: null, rcs: null, prefixe_numero: 'INV-', style_numero: 2, regime_tva: 'etranger' };
  const f = composerFacture(alea, fourUS, CLIENTS[4], { compteur: 7310, nbLignes: 2, sansTva: true, dateLivraison: false });
  f.devise = 'USD'; f.taux_change = 0.921; f.total_ttc_eur = arrondir(f.total_ttc * f.taux_change);
  f.fournisseur = { raison_sociale: fourUS.raison_sociale, siren: null, siret: null, tva_intracom: null, identifiant_etranger: 'EIN 98-7654321', adresse: fourUS.adresse, code_postal: fourUS.code_postal, ville: fourUS.ville, pays: 'US',
    iban: null, bic: null, coordonnees_bancaires: { 'Bank': 'First Meridian Bank (fictive)', 'ABA routing': '021000089', 'Account': '4471 0092 3351', 'SWIFT': 'FMBKUS33XXX' }, courriel: fourUS.courriel, telephone: fourUS.telephone };
  f.mentions = ['Amounts in US dollars (USD). VAT not charged: services supplied to a VAT-registered business in France — reverse charge by the recipient (art. 283-2 CGI).', 'Montants en dollars américains. TVA non facturée : prestation auto-liquidée par le preneur français. Contre-valeur EUR indicative au cours du jour de facturation.', 'Payment due within 30 days by international wire transfer. Please quote the invoice number.'];
  f.mode_paiement = 'Virement international (wire)';
  f.references = { commande: 'PO-2026-0188', bon_livraison: null, reference_paiement: f.numero };
  const { pdf, pages } = await rendre('moderne', [f], { accent: rgb(0.18, 0.2, 0.45) });
  await publier({ type: 'natif-devise', gabarit: 'moderne', factures: [f], pdf, pages, difficultes: ['facture en USD d\'un fournisseur étranger : pas de SIREN ni de TVA française, pas d\'IBAN (ABA + SWIFT), montants au format anglo-saxon, autoliquidation par le preneur', 'contre-valeur EUR indicative : total_ttc est en USD, total_ttc_eur est le montant en euros'], extra: { devise: 'USD', taux_change: f.taux_change, total_ttc_eur: f.total_ttc_eur } });
}
{
  // 102 — facture d'acompte pure : 30 % d'un devis, une seule ligne, TVA sur l'acompte
  const four = fournisseurMetier('menuiserie');
  const montantDevisHt = 8400; const pct = 30; const acompteHt = arrondir(montantDevisHt * pct / 100);
  const f = composerFacture(alea, four, CLIENTS[0], { compteur: prochainNumero(four), nbLignes: 1, dateLivraison: false });
  f.type_document = 'facture_acompte';
  f.lignes = [{ designation: `Acompte ${pct} % devis D-2026-0412 (total HT ${euros(montantDevisHt)})`, quantite: 1, unite: 'forfait', prix_unitaire_ht: acompteHt, remise_pct: 0, taux_tva: 10, montant_ht: acompteHt, code: null }];
  f.total_ht = acompteHt; f.tva = [{ taux: 10, base: acompteHt, montant: arrondir(acompteHt * 0.10) }]; f.total_tva = f.tva[0].montant; f.total_ttc = arrondir(acompteHt + f.total_tva); f.net_a_payer = f.total_ttc;
  f.remise_globale = null; f.remise_globale_pct = null; f.acompte = null;
  f.acompte_sur = { devis: 'D-2026-0412', montant_devis_ht: montantDevisHt, pourcentage: pct, solde_a_facturer_ht: arrondir(montantDevisHt - acompteHt) };
  f.mentions = ['Facture d\'acompte : la TVA est exigible à l\'encaissement de l\'acompte (art. 269-2 c CGI). Le solde fera l\'objet d\'une facture définitive reprenant cet acompte en déduction.', 'Travaux de rénovation d\'un local professionnel : TVA à 10 % (attestation simplifiée à fournir).', ...f.mentions.slice(-2)];
  f.references = { commande: 'D-2026-0412', bon_livraison: null, reference_paiement: f.numero };
  const { pdf, pages } = await rendre('classique', [f], { tableauTva: true });
  await publier({ type: 'facture-acompte', gabarit: 'classique', factures: [f], pdf, pages, difficultes: ['facture d\'acompte pure : une seule ligne, 30 % d\'un devis dont le montant figure dans le libellé ; ne pas confondre le montant du devis avec le HT facturé', 'TVA 10 % sur l\'acompte, exigible à l\'encaissement'], extra: { acompte_sur: f.acompte_sur } });
}
{
  // 103 — note de frais d'un salarié : lignes en TTC, justificatifs en page 2, numérisée
  const client = CLIENTS[4];
  const iban = ibanFictif(alea);
  const depenses = [
    { date: '2026-09-14', heure: '07:42', nature: 'Transport', designation: 'Train Paris – Lyon, 2e classe, aller', emetteur: 'Rail Express (fictif)', lieu: 'Gare de Lyon', montant_ttc: 78.00, taux_tva: 10, paiement: 'CB ****2210' },
    { date: '2026-09-14', heure: '13:05', nature: 'Repas', designation: 'Déjeuner client — 2 couverts', emetteur: 'Brasserie du Quai (fictive)', lieu: 'Lyon 2e', montant_ttc: 49.80, taux_tva: 10, paiement: 'CB ****2210' },
    { date: '2026-09-14', heure: '22:30', nature: 'Hébergement', designation: 'Hôtel 1 nuit, chambre simple', emetteur: 'Hôtel des Arcades (fictif)', lieu: 'Lyon 1er', montant_ttc: 112.00, taux_tva: 10, paiement: 'CB ****2210' },
    { date: '2026-09-15', heure: '08:15', nature: 'Transport', designation: 'Taxi hôtel – client', emetteur: 'Taxis Lumière (fictif)', lieu: 'Lyon', montant_ttc: 31.00, taux_tva: 10, paiement: 'Espèces' },
    { date: '2026-09-15', heure: '17:50', nature: 'Péage', designation: 'Péage A6 retour (véhicule de service)', emetteur: 'Autoroutes du Centre (fictif)', lieu: 'Villefranche', montant_ttc: 14.20, taux_tva: 20, paiement: 'Badge' },
    { date: '2026-09-15', heure: '18:40', nature: 'Fournitures', designation: 'Câble HDMI pour la présentation', emetteur: 'Papeterie Marcenac SARL', lieu: 'Lyon 7e', montant_ttc: 9.90, taux_tva: 20, paiement: 'CB ****2210' },
  ].map((d) => { const ht = arrondir(d.montant_ttc / (1 + d.taux_tva / 100)); return { ...d, quantite: 1, unite: 'u', prix_unitaire_ht: ht, remise_pct: 0, montant_ht: ht, montant_tva: arrondir(d.montant_ttc - ht), code: null }; });
  const parTaux = new Map(); for (const d of depenses) parTaux.set(d.taux_tva, arrondir((parTaux.get(d.taux_tva) ?? 0) + d.montant_ht));
  const tva = [...parTaux.entries()].sort((a, b) => b[0] - a[0]).map(([taux, base]) => ({ taux, base, montant: arrondir(depenses.filter((d) => d.taux_tva === taux).reduce((s2, d) => s2 + d.montant_tva, 0)) }));
  const totalHt = arrondir(depenses.reduce((s2, d) => s2 + d.montant_ht, 0)); const totalTva = arrondir(tva.reduce((s2, t) => s2 + t.montant, 0));
  const totalTtc = arrondir(depenses.reduce((s2, d) => s2 + d.montant_ttc, 0));
  const f = {
    type_document: 'note_de_frais', numero: 'NF-2026-09-017', facture_rectifiee: null, date_emission: '2026-09-18', date_echeance: '2026-10-18', date_livraison: null, periode: 'du 14/09/2026 au 15/09/2026', devise: 'EUR',
    fournisseur: { raison_sociale: 'Camille Delorme-Vasseur (salarié·e) — note de frais', type: 'particulier', siren: null, siret: null, tva_intracom: null, adresse: '—', code_postal: client.code_postal, ville: client.ville, pays: 'FR', iban, bic: bicFictif(alea), courriel: 'c.delorme-vasseur@essai.invalid', telephone: null },
    client: { raison_sociale: client.raison_sociale, siren: client.siren, siret: client.siret, tva_intracom: client.tva_intracom, adresse: client.adresse, code_postal: client.code_postal, ville: client.ville, pays: 'FR', code_client: null },
    salarie: { initiales: 'C. D.-V.', service: 'Études et chantiers', objet: 'Rendez-vous client à Lyon (projet rue Camille-Verdier)', matricule: 'S-0142' },
    lignes: depenses, remise_globale_pct: null, remise_globale: null, total_ht: totalHt, tva, total_tva: totalTva, total_ttc: totalTtc, acompte: null, net_a_payer: totalTtc,
    mode_paiement: 'Remboursement par virement sur le compte du salarié', references: { commande: null, bon_livraison: null, reference_paiement: 'NF-2026-09-017' },
    mentions: ['Note de frais interne : les montants des lignes sont TTC, la TVA n\'est récupérable que sur les justificatifs qui la mentionnent (pas sur le taxi payé en espèces sans facture).'],
  };
  // TTC - HT - TVA : l'arrondi par ligne peut créer un centime d'écart ; on le porte sur la plus grosse base.
  const ecart = arrondir(totalTtc - totalHt - totalTva);
  if (ecart !== 0) { const g = tva.reduce((a, b) => (b.base > a.base ? b : a)); g.base = arrondir(g.base + ecart); f.total_ht = arrondir(f.total_ht + ecart); for (const d of depenses) { if (d.taux_tva === g.taux) { d.montant_ht = arrondir(d.montant_ht + ecart); d.prix_unitaire_ht = d.montant_ht; break; } } }
  const natif = await rendre('note_de_frais', [f]);
  const { pdf, pages } = await scanner(natif.pdf, 'bonne', alea);
  await publier({ type: 'note-de-frais', gabarit: 'note_de_frais', factures: [f], pdf, pages, qualite: 'bonne', difficultes: ['note de frais d\'un salarié, pas une facture fournisseur : l\'émetteur est une personne (pas de SIREN), le bénéficiaire du remboursement est le salarié', 'lignes en TTC avec taux de TVA par ligne ; justificatifs en page 2 (six petits reçus)', 'numérisée (qualité bonne)'], extra: { lignes_affichees_en: 'TTC', salarie: f.salarie } });
}

fs.writeFileSync(path.join(SORTIE, 'INDEX.json'), JSON.stringify({ graine: GRAINE, genere_le: '2026-10-05', nombre: index.length, pieces: index }, null, 2) + '\n');
console.log(`\n${index.length} pièces écrites dans ${SORTIE}`);
const ATTENDU = 103; // 100 pièces du banc initial + 3 compléments demandés par le coordinateur le 5/10/2026
if (index.length !== ATTENDU) { console.error(`ATTENTION : le banc doit compter exactement ${ATTENDU} pièces`); process.exit(1); }
