#!/usr/bin/env node
// Génère le banc : cent factures fournisseurs fictives et variées, chacune avec son JSON de valeurs attendues.
// Usage : node generer-factures.mjs [--graine 2026] [--sortie factures]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerAlea } from './lib/alea.mjs';
import { creerFournisseurs, creerClients, composerFacture } from './lib/donnees.mjs';
import { GABARITS, creerDocument, attacherFacturX } from './lib/rendu.mjs';
import { facturXCii, ubl21 } from './lib/xml.mjs';
import { scanner, verifierOutils } from './lib/scan.mjs';
import { PDFDocument } from 'pdf-lib';

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
  for (const f of factures) pages += await GABARITS[gabarit](doc, f, alea, options);
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

fs.writeFileSync(path.join(SORTIE, 'INDEX.json'), JSON.stringify({ graine: GRAINE, genere_le: '2026-10-05', nombre: index.length, pieces: index }, null, 2) + '\n');
console.log(`\n${index.length} pièces écrites dans ${SORTIE}`);
if (index.length !== 100) { console.error('ATTENTION : le banc doit compter exactement 100 pièces'); process.exit(1); }
