#!/usr/bin/env node
// Vérifie la cohérence du banc : 100 pièces, identifiants valides par clé, totaux cohérents, PDF/XML lisibles, Factur-X joint.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName } from 'pdf-lib';
import { sirenValide, siretValide, tvaValide, ibanValide } from './lib/identifiants.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DOSSIER = path.resolve(ICI, process.argv[2] ?? 'factures');
const erreurs = [];
const err = (f, m) => erreurs.push(`${f} : ${m}`);
const arr = (x) => Math.round(x * 100) / 100;

const jsons = fs.readdirSync(DOSSIER).filter((n) => /^\d{3}-.*\.json$/.test(n)).sort();
const ATTENDU = 103; // 100 + 3 compléments du 5/10/2026
if (jsons.length !== ATTENDU) err('banc', `${jsons.length} fichiers attendus au lieu de ${ATTENDU}`);
const types = {}; const qualites = {};
for (const nom of jsons) {
  const a = JSON.parse(fs.readFileSync(path.join(DOSSIER, nom), 'utf8'));
  const piece = path.join(DOSSIER, a.fichier);
  if (!fs.existsSync(piece)) { err(nom, `pièce absente ${a.fichier}`); continue; }
  types[a.type] = (types[a.type] ?? 0) + 1; qualites[a.qualite] = (qualites[a.qualite] ?? 0) + 1;
  const octets = fs.readFileSync(piece);
  if (a.format === 'pdf') {
    if (!octets.subarray(0, 5).equals(Buffer.from('%PDF-'))) err(nom, 'pas un PDF');
    const doc = await PDFDocument.load(octets, { updateMetadata: false });
    if (doc.getPageCount() !== a.pages) err(nom, `pages ${doc.getPageCount()} ≠ attendu ${a.pages}`);
    if (a.type.startsWith('facturx')) {
      const noms = doc.catalog.lookup(PDFName.of('Names'));
      const ef = noms?.lookup(PDFName.of('EmbeddedFiles'));
      if (!ef) err(nom, 'Factur-X sans pièce jointe');
      if (!octets.includes('factur-x.xml')) err(nom, 'nom factur-x.xml introuvable');
    }
  } else {
    const texte = octets.toString('utf8');
    if (!texte.startsWith('<?xml')) err(nom, 'pas un XML');
    if (!texte.includes('urn:cen.eu:en16931:2017')) err(nom, 'UBL sans CustomizationID EN 16931');
    if (!texte.includes(`<cbc:ID>${a.factures[0].numero}</cbc:ID>`)) err(nom, 'numéro absent du XML');
  }
  if (!a.lisible) { if (a.factures.length) err(nom, 'illisible mais factures renseignées'); continue; }
  if (a.factures.length !== a.nb_factures) err(nom, 'nb_factures incohérent');
  for (const f of a.factures) {
    const francais = f.fournisseur.pays === 'FR' && f.fournisseur.type !== 'particulier';
    if (francais) {
      if (!sirenValide(f.fournisseur.siren)) err(nom, `SIREN fournisseur invalide ${f.fournisseur.siren}`);
      if (!siretValide(f.fournisseur.siret)) err(nom, `SIRET fournisseur invalide ${f.fournisseur.siret}`);
      if (!/^9\d{8}$/.test(f.fournisseur.siren)) err(nom, 'SIREN hors plage fictive 9xxxxxxxx');
    } else if (f.fournisseur.siren) err(nom, 'fournisseur étranger ou particulier avec un SIREN');
    if (f.fournisseur.tva_intracom && !tvaValide(f.fournisseur.tva_intracom)) err(nom, `TVA fournisseur invalide ${f.fournisseur.tva_intracom}`);
    if (f.fournisseur.iban) {
      if (!ibanValide(f.fournisseur.iban)) err(nom, `IBAN invalide ${f.fournisseur.iban}`);
      if (!/^FR\d{2}9\d{4}/.test(f.fournisseur.iban)) err(nom, 'IBAN hors plage fictive (code banque 9xxxx)');
    } else if (f.fournisseur.pays === 'FR') err(nom, 'fournisseur français sans IBAN');
    if (!/^9\d{8}$/.test(f.client.siren)) err(nom, 'SIREN client hors plage fictive 9xxxxxxxx');
    if (f.devise !== 'EUR' && !(f.taux_change > 0 && arr(f.total_ttc * f.taux_change) === f.total_ttc_eur)) err(nom, 'contre-valeur EUR incohérente');
    if (!sirenValide(f.client.siren) || !siretValide(f.client.siret) || !tvaValide(f.client.tva_intracom)) err(nom, 'identifiants client invalides');
    const brut = arr(f.lignes.reduce((s, l) => s + l.montant_ht, 0));
    if (arr(brut - (f.remise_globale ?? 0)) !== f.total_ht) err(nom, `total HT ${f.total_ht} ≠ lignes ${brut} - remise ${f.remise_globale ?? 0}`);
    const tvaSomme = arr(f.tva.reduce((s, t) => s + t.montant, 0));
    if (tvaSomme !== f.total_tva) err(nom, 'total TVA ≠ somme par taux');
    for (const t of f.tva) if (arr(t.base * t.taux / 100) !== t.montant) err(nom, `TVA ${t.taux} % mal calculée`);
    const baseSomme = arr(f.tva.reduce((s, t) => s + t.base, 0));
    if (Math.abs(baseSomme - f.total_ht) > 0.011 * f.tva.length) err(nom, `bases TVA ${baseSomme} ≠ HT ${f.total_ht}`);
    if (arr(f.total_ht + f.total_tva) !== f.total_ttc) err(nom, 'TTC ≠ HT + TVA');
    if (arr(f.total_ttc - (f.acompte ?? 0)) !== f.net_a_payer) err(nom, 'net à payer ≠ TTC - acompte');
    for (const l of f.lignes) {
      const attendu = arr(l.quantite * l.prix_unitaire_ht * (1 - l.remise_pct / 100));
      if (Math.abs(attendu - l.montant_ht) > 0.011) err(nom, `ligne « ${l.designation} » : ${l.montant_ht} ≠ ${attendu}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date_emission)) err(nom, 'date d\'émission mal formée');
    if (f.date_echeance && f.date_echeance < f.date_emission) err(nom, 'échéance avant émission');
    if (f.type_document === 'avoir' && f.total_ttc >= 0) err(nom, 'avoir avec TTC positif');
  }
}
// Aucun doublon de numéro chez un même fournisseur
const vus = new Set();
for (const nom of jsons) {
  const a = JSON.parse(fs.readFileSync(path.join(DOSSIER, nom), 'utf8'));
  for (const f of a.factures) { const cle = `${f.fournisseur.siren}/${f.numero}`; if (vus.has(cle)) err(nom, `numéro en double ${cle}`); vus.add(cle); }
}
console.log('Répartition par type :', types);
console.log('Répartition par qualité :', qualites);
if (erreurs.length) { console.error(`${erreurs.length} erreur(s) :\n` + erreurs.join('\n')); process.exit(1); }
console.log(`Banc cohérent : ${jsons.length} pièces, identifiants valides, totaux justes.`);
