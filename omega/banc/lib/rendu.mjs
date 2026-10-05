// Rendu PDF des factures du banc : plusieurs gabarits, pagination, pièce jointe Factur-X.
import { PDFDocument, StandardFonts, rgb, PDFName, PDFString, PDFHexString, AFRelationship } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { woffVersTtf } from './woff.mjs';
import { formaterIban, formaterSiret, formaterSiren } from './identifiants.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const A4 = [595.28, 841.89];
const MM = 2.8346;

export function euros(x, { signeDevise = true } = {}) {
  const neg = x < 0;
  const [ent, dec] = Math.abs(x).toFixed(2).split('.');
  const entG = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '-' : ''}${entG},${dec}${signeDevise ? ' €' : ''}`;
}
export function nombre(x) {
  if (Number.isInteger(x)) return String(x);
  const s = String(x).replace('.', ',');
  return s;
}
export function dateFr(iso) { if (!iso) return ''; const [a, m, j] = iso.split('-'); return `${j}/${m}/${a}`; }
export function tauxFr(t) { return `${String(t).replace('.', ',')} %`; }

function policeManuscrite(alea) {
  const choix = alea.choix([
    '@fontsource/caveat/files/caveat-latin-400-normal.woff',
    '@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff',
    '@fontsource/reenie-beanie/files/reenie-beanie-latin-400-normal.woff',
  ]);
  return woffVersTtf(fs.readFileSync(path.join(ICI, '..', 'node_modules', choix)));
}

class Toile {
  constructor(doc, polices, format = A4) {
    this.doc = doc; this.polices = polices; this.format = format;
    this.pages = []; this.nouvellePage();
  }
  nouvellePage() { this.page = this.doc.addPage(this.format); this.pages.push(this.page); this.y = this.format[1] - 15 * MM; return this.page; }
  get largeur() { return this.format[0]; }
  texte(t, x, y, o = {}) {
    const font = o.police ?? this.polices.normale; const size = o.taille ?? 9;
    const couleur = o.couleur ?? rgb(0.1, 0.1, 0.1);
    const s = String(t ?? '').replace(/ | /g, ' ');
    let xx = x;
    if (o.aligne === 'droite') xx = x - font.widthOfTextAtSize(s, size);
    if (o.aligne === 'centre') xx = x - font.widthOfTextAtSize(s, size) / 2;
    this.page.drawText(s, { x: xx, y, size, font, color: couleur, rotate: o.rotation });
    return font.widthOfTextAtSize(s, size);
  }
  largeurTexte(t, o = {}) { return (o.police ?? this.polices.normale).widthOfTextAtSize(String(t), o.taille ?? 9); }
  ligne(x1, y1, x2, y2, o = {}) { this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: o.epaisseur ?? 0.6, color: o.couleur ?? rgb(0.3, 0.3, 0.3), dashArray: o.pointille ? [2, 2] : undefined }); }
  rect(x, y, l, h, o = {}) { this.page.drawRectangle({ x, y, width: l, height: h, color: o.fond, borderColor: o.bord, borderWidth: o.bord ? (o.epaisseur ?? 0.6) : 0 }); }
  paragraphe(t, x, y, largeurMax, o = {}) {
    const mots = String(t).split(/\s+/); const taille = o.taille ?? 8; const police = o.police ?? this.polices.normale;
    let ligne = ''; let yy = y; const interligne = o.interligne ?? taille * 1.3;
    for (const m of mots) {
      const essai = ligne ? `${ligne} ${m}` : m;
      if (police.widthOfTextAtSize(essai, taille) > largeurMax && ligne) { this.texte(ligne, x, yy, o); yy -= interligne; ligne = m; }
      else ligne = essai;
    }
    if (ligne) { this.texte(ligne, x, yy, o); yy -= interligne; }
    return yy;
  }
}

async function chargerPolices(doc, famille) {
  const F = StandardFonts;
  const jeux = {
    helvetica: [F.Helvetica, F.HelveticaBold, F.HelveticaOblique],
    times: [F.TimesRoman, F.TimesRomanBold, F.TimesRomanItalic],
    courier: [F.Courier, F.CourierBold, F.CourierOblique],
  };
  const [n, g, i] = jeux[famille] ?? jeux.helvetica;
  return { normale: await doc.embedFont(n), grasse: await doc.embedFont(g), italique: await doc.embedFont(i) };
}

function blocAdresse(toile, partie, x, y, o = {}) {
  const taille = o.taille ?? 9;
  let yy = y;
  toile.texte(partie.raison_sociale, x, yy, { police: toile.polices.grasse, taille: taille + 1 }); yy -= taille * 1.4;
  toile.texte(partie.adresse, x, yy, { taille }); yy -= taille * 1.3;
  toile.texte(`${partie.code_postal} ${partie.ville}`, x, yy, { taille }); yy -= taille * 1.3;
  if (o.identifiants !== false) {
    if (partie.siret) { toile.texte(`SIRET ${formaterSiret(partie.siret)}`, x, yy, { taille: taille - 1 }); yy -= taille * 1.25; }
    if (partie.tva_intracom) { toile.texte(`TVA ${partie.tva_intracom}`, x, yy, { taille: taille - 1 }); yy -= taille * 1.25; }
  }
  return yy;
}

function piedLegal(toile, f, o = {}) {
  const taille = 6.5; const y0 = 12 * MM;
  const texte = `${f.fournisseur.raison_sociale} — ${f.fournisseur.adresse}, ${f.fournisseur.code_postal} ${f.fournisseur.ville} — SIREN ${formaterSiren(f.fournisseur.siren)}` +
    (f.fournisseur.tva_intracom ? ` — TVA ${f.fournisseur.tva_intracom}` : '') + ` — ${f.fournisseur.courriel} — ${f.fournisseur.telephone}`;
  toile.paragraphe(texte, 15 * MM, y0 + taille * 1.3, toile.largeur - 30 * MM, { taille, couleur: rgb(0.35, 0.35, 0.35) });
  if (o.numeroPage) toile.texte(o.numeroPage, toile.largeur - 15 * MM, y0 - 2, { taille, aligne: 'droite', couleur: rgb(0.35, 0.35, 0.35) });
}

function tableauLignes(toile, f, x, y, largeur, o = {}) {
  // Colonnes : code? | désignation | qté | unité | PU HT | remise? | TVA | montant HT
  const avecCode = o.avecCode ?? f.lignes.some((l) => l.code);
  const avecRemise = f.lignes.some((l) => l.remise_pct);
  const cols = [];
  if (avecCode) cols.push({ cle: 'code', titre: 'Réf.', l: 48, al: 'gauche' });
  cols.push({ cle: 'designation', titre: 'Désignation', l: 0, al: 'gauche' });
  cols.push({ cle: 'quantite', titre: 'Qté', l: 34, al: 'droite' });
  cols.push({ cle: 'unite', titre: 'U.', l: 34, al: 'gauche' });
  cols.push({ cle: 'prix_unitaire_ht', titre: 'P.U. HT', l: 52, al: 'droite' });
  if (avecRemise) cols.push({ cle: 'remise_pct', titre: 'Rem.', l: 32, al: 'droite' });
  cols.push({ cle: 'taux_tva', titre: 'TVA', l: 36, al: 'droite' });
  cols.push({ cle: 'montant_ht', titre: 'Montant HT', l: 64, al: 'droite' });
  const fixe = cols.reduce((s, c) => s + c.l, 0); cols.find((c) => c.l === 0).l = largeur - fixe;
  const taille = o.taille ?? 8.5; const h = taille * 1.9;
  const entete = () => {
    toile.rect(x, toile.y - h + 4, largeur, h, { fond: o.fondEntete ?? rgb(0.9, 0.9, 0.9) });
    let xx = x + 3;
    for (const c of cols) { toile.texte(c.titre, c.al === 'droite' ? xx + c.l - 6 : xx, toile.y - h + 9, { police: toile.polices.grasse, taille, aligne: c.al === 'droite' ? 'droite' : undefined }); xx += c.l; }
    toile.y -= h + 2;
  };
  toile.y = y; entete();
  let sousTotal = 0; let numeroPage = 1;
  f.lignes.forEach((l, i) => {
    if (toile.y < 55 * MM && o.pagine) {
      toile.texte(`Sous-total à reporter : ${euros(sousTotal)}`, x + largeur - 3, toile.y - 4, { taille, aligne: 'droite', police: toile.polices.italique });
      piedLegal(toile, f, { numeroPage: `Page ${numeroPage}` });
      numeroPage++; toile.nouvellePage(); toile.y -= 5 * MM;
      toile.texte(`${f.type_document === 'avoir' ? 'Avoir' : 'Facture'} ${f.numero} — suite`, x, toile.y, { police: toile.polices.grasse, taille: 10 }); toile.y -= 14;
      entete();
      toile.texte(`Report : ${euros(sousTotal)}`, x + largeur - 3, toile.y - 6, { taille, aligne: 'droite', police: toile.polices.italique }); toile.y -= h;
    }
    if (o.zebre && i % 2 === 1) toile.rect(x, toile.y - h + 5, largeur, h, { fond: rgb(0.965, 0.965, 0.965) });
    let xx = x + 3;
    for (const c of cols) {
      let v = l[c.cle];
      if (c.cle === 'prix_unitaire_ht') v = euros(v, { signeDevise: false });
      else if (c.cle === 'montant_ht') v = euros(v, { signeDevise: false });
      else if (c.cle === 'taux_tva') v = tauxFr(v);
      else if (c.cle === 'quantite') v = nombre(v);
      else if (c.cle === 'remise_pct') v = v ? `${v} %` : '';
      else if (c.cle === 'code') v = v ?? '';
      if (c.cle === 'designation') {
        const largeurDispo = c.l - 6;
        let s = String(v); while (toile.largeurTexte(s, { taille }) > largeurDispo && s.length > 4) s = s.slice(0, -2);
        v = s;
      }
      toile.texte(v, c.al === 'droite' ? xx + c.l - 6 : xx, toile.y - 4, { taille, aligne: c.al === 'droite' ? 'droite' : undefined });
      xx += c.l;
    }
    sousTotal += l.montant_ht;
    toile.y -= h;
    if (o.lignesSeparation) toile.ligne(x, toile.y + 6, x + largeur, toile.y + 6, { epaisseur: 0.3, couleur: rgb(0.8, 0.8, 0.8) });
  });
  toile.ligne(x, toile.y + 5, x + largeur, toile.y + 5, { epaisseur: 0.8 });
  return { numeroPage, cols };
}

function blocTotaux(toile, f, xDroite, y, o = {}) {
  const taille = o.taille ?? 9; let yy = y; const l = o.largeur ?? 170; const x = xDroite - l;
  const ligneT = (lib, val, gras = false) => {
    toile.texte(lib, x, yy, { taille, police: gras ? toile.polices.grasse : toile.polices.normale });
    toile.texte(val, xDroite, yy, { taille, aligne: 'droite', police: gras ? toile.polices.grasse : toile.polices.normale });
    yy -= taille * 1.5;
  };
  if (f.remise_globale) { ligneT('Total brut HT', euros(f.total_ht + f.remise_globale)); ligneT(`Remise ${f.remise_globale_pct} %`, `- ${euros(f.remise_globale)}`); }
  ligneT('Total HT', euros(f.total_ht));
  for (const t of f.tva) ligneT(`TVA ${tauxFr(t.taux)} sur ${euros(t.base)}`, euros(t.montant));
  if (f.tva.length > 1) ligneT('Total TVA', euros(f.total_tva));
  if (o.tableauTva) {
    yy -= 2;
    toile.texte('Base HT', x, yy, { taille: taille - 1, police: toile.polices.italique }); toile.texte('Taux', x + 70, yy, { taille: taille - 1, police: toile.polices.italique }); toile.texte('TVA', xDroite, yy, { taille: taille - 1, police: toile.polices.italique, aligne: 'droite' }); yy -= taille * 1.3;
    for (const t of f.tva) { toile.texte(euros(t.base), x, yy, { taille: taille - 1 }); toile.texte(tauxFr(t.taux), x + 70, yy, { taille: taille - 1 }); toile.texte(euros(t.montant), xDroite, yy, { taille: taille - 1, aligne: 'droite' }); yy -= taille * 1.3; }
    yy -= 2;
  }
  toile.rect(x - 4, yy - 4, l + 8, taille * 1.6, { fond: o.fondTtc ?? rgb(0.92, 0.92, 0.92) });
  ligneT('Total TTC', euros(f.total_ttc), true);
  if (f.acompte) { ligneT('Acompte versé', `- ${euros(f.acompte)}`); ligneT('NET À PAYER', euros(f.net_a_payer), true); }
  return yy;
}

function blocPaiement(toile, f, x, y, o = {}) {
  const taille = o.taille ?? 8; let yy = y;
  toile.texte(f.type_document === 'avoir' ? 'Remboursement' : 'Règlement', x, yy, { taille: taille + 1, police: toile.polices.grasse }); yy -= taille * 1.5;
  toile.texte(`Mode : ${f.mode_paiement}`, x, yy, { taille }); yy -= taille * 1.4;
  if (f.date_echeance) { toile.texte(`Échéance : ${dateFr(f.date_echeance)}`, x, yy, { taille }); yy -= taille * 1.4; }
  if (o.iban !== false) {
    toile.texte(`IBAN : ${formaterIban(f.fournisseur.iban)}`, x, yy, { taille }); yy -= taille * 1.4;
    toile.texte(`BIC : ${f.fournisseur.bic}`, x, yy, { taille }); yy -= taille * 1.4;
  }
  if (f.references.reference_paiement) { toile.texte(`Référence à rappeler : ${f.references.reference_paiement}`, x, yy, { taille }); yy -= taille * 1.4; }
  return yy;
}

function blocMentions(toile, f, x, y, largeur, o = {}) {
  let yy = y;
  for (const m of f.mentions) yy = toile.paragraphe(m, x, yy, largeur, { taille: o.taille ?? 6.8, couleur: rgb(0.3, 0.3, 0.3) });
  return yy;
}

// --- Gabarits -------------------------------------------------------------

export async function gabaritClassique(doc, f, alea, o = {}) {
  const polices = await chargerPolices(doc, o.famille ?? 'helvetica');
  const toile = new Toile(doc, polices);
  const marge = 15 * MM; const largeur = toile.largeur - 2 * marge;
  const titre = f.type_document === 'avoir' ? 'AVOIR' : 'FACTURE';
  toile.texte(f.fournisseur.raison_sociale.toUpperCase(), marge, toile.y - 10, { police: polices.grasse, taille: 15, couleur: o.couleur ?? rgb(0.12, 0.25, 0.45) });
  blocAdresse(toile, f.fournisseur, marge, toile.y - 26, { taille: 8.5, identifiants: false });
  toile.texte(`Tél. ${f.fournisseur.telephone} — ${f.fournisseur.courriel}`, marge, toile.y - 66, { taille: 7.5 });
  // Cartouche facture
  const cx = toile.largeur - marge - 210;
  toile.rect(cx, toile.y - 70, 210, 64, { bord: rgb(0.5, 0.5, 0.5) });
  toile.texte(titre, cx + 8, toile.y - 20, { police: polices.grasse, taille: 14 });
  toile.texte(`N° ${f.numero}`, cx + 8, toile.y - 36, { taille: 10, police: polices.grasse });
  toile.texte(`Date : ${dateFr(f.date_emission)}`, cx + 8, toile.y - 50, { taille: 9 });
  if (f.date_echeance) toile.texte(`Échéance : ${dateFr(f.date_echeance)}`, cx + 100, toile.y - 50, { taille: 9 });
  toile.texte(`Code client : ${f.client.code_client}`, cx + 8, toile.y - 63, { taille: 8 });
  // Client
  toile.y -= 95;
  toile.texte('Facturé à', cx, toile.y, { taille: 8, police: polices.italique });
  blocAdresse(toile, f.client, cx, toile.y - 13, { taille: 9 });
  let yGauche = toile.y;
  if (f.references.commande) { toile.texte(`Votre commande : ${f.references.commande}`, marge, yGauche, { taille: 8.5 }); yGauche -= 12; }
  if (f.references.bon_livraison) { toile.texte(`Bon de livraison : ${f.references.bon_livraison}`, marge, yGauche, { taille: 8.5 }); yGauche -= 12; }
  if (f.date_livraison) { toile.texte(`Date de livraison : ${dateFr(f.date_livraison)}`, marge, yGauche, { taille: 8.5 }); yGauche -= 12; }
  if (f.facture_rectifiee) { toile.texte(`Annule et remplace partiellement la facture ${f.facture_rectifiee}`, marge, yGauche, { taille: 8.5, police: polices.italique }); yGauche -= 12; }
  if (f.periode) { toile.texte(`Période : ${f.periode}`, marge, yGauche, { taille: 8.5 }); yGauche -= 12; }
  toile.y -= 75;
  const { numeroPage } = tableauLignes(toile, f, marge, toile.y, largeur, { pagine: true, zebre: o.zebre ?? true, taille: 8.5 });
  toile.y -= 14;
  if (toile.y < 95 * MM) { piedLegal(toile, f, { numeroPage: `Page ${numeroPage}` }); toile.nouvellePage(); toile.y -= 10 * MM; }
  const yTot = toile.y;
  blocTotaux(toile, f, toile.largeur - marge, yTot, { tableauTva: o.tableauTva });
  const yPai = blocPaiement(toile, f, marge, yTot, {});
  blocMentions(toile, f, marge, Math.min(yPai, toile.y - 90) - 10, largeur * 0.55);
  piedLegal(toile, f, { numeroPage: numeroPage > 1 ? `Page ${numeroPage}` : undefined });
  if (numeroPage > 1) {
    // Renumérote « Page i / n »
    const n = toile.pages.length;
    toile.pages.forEach((p, i) => { toile.page = p; toile.texte(`/ ${n}`, toile.largeur - 15 * MM + 2, 12 * MM - 2, { taille: 6.5, couleur: rgb(0.35, 0.35, 0.35) }); });
  }
  return toile.pages.length;
}

export async function gabaritModerne(doc, f, alea, o = {}) {
  const polices = await chargerPolices(doc, 'helvetica');
  const toile = new Toile(doc, polices);
  const marge = 14 * MM; const largeur = toile.largeur - 2 * marge;
  const accent = o.accent ?? rgb(0.05, 0.45, 0.4);
  toile.rect(0, toile.format[1] - 28 * MM, toile.largeur, 28 * MM, { fond: accent });
  toile.texte(f.fournisseur.raison_sociale, marge, toile.format[1] - 14 * MM, { police: polices.grasse, taille: 18, couleur: rgb(1, 1, 1) });
  toile.texte(`${f.fournisseur.adresse} · ${f.fournisseur.code_postal} ${f.fournisseur.ville} · ${f.fournisseur.courriel}`, marge, toile.format[1] - 21 * MM, { taille: 8, couleur: rgb(1, 1, 1) });
  const titre = f.type_document === 'avoir' ? 'Avoir' : 'Facture';
  toile.texte(`${titre} ${f.numero}`, toile.largeur - marge, toile.format[1] - 14 * MM, { police: polices.grasse, taille: 16, couleur: rgb(1, 1, 1), aligne: 'droite' });
  toile.texte(`émise le ${dateFr(f.date_emission)}`, toile.largeur - marge, toile.format[1] - 21 * MM, { taille: 8.5, couleur: rgb(1, 1, 1), aligne: 'droite' });
  toile.y = toile.format[1] - 40 * MM;
  // Trois colonnes d'infos
  const colL = largeur / 3;
  toile.texte('Client', marge, toile.y, { taille: 7.5, couleur: accent, police: polices.grasse });
  blocAdresse(toile, f.client, marge, toile.y - 12, { taille: 8.5 });
  toile.texte('Détails', marge + colL, toile.y, { taille: 7.5, couleur: accent, police: polices.grasse });
  let yy = toile.y - 12;
  const det = [['Date d\'échéance', dateFr(f.date_echeance)], ['Commande', f.references.commande], ['Livraison', dateFr(f.date_livraison)], ['Bon de livraison', f.references.bon_livraison], ['Période', f.periode]].filter((d) => d[1]);
  for (const [k, v] of det) { toile.texte(`${k} : ${v}`, marge + colL, yy, { taille: 8.5 }); yy -= 11.5; }
  toile.texte('Émetteur', marge + 2 * colL, toile.y, { taille: 7.5, couleur: accent, police: polices.grasse });
  yy = toile.y - 12;
  for (const t of [`SIRET ${formaterSiret(f.fournisseur.siret)}`, f.fournisseur.tva_intracom ? `TVA ${f.fournisseur.tva_intracom}` : null, `Tél. ${f.fournisseur.telephone}`].filter(Boolean)) { toile.texte(t, marge + 2 * colL, yy, { taille: 8.5 }); yy -= 11.5; }
  toile.y -= 80;
  const { numeroPage } = tableauLignes(toile, f, marge, toile.y, largeur, { pagine: true, fondEntete: rgb(0.9, 0.96, 0.95), lignesSeparation: true });
  toile.y -= 16;
  if (toile.y < 90 * MM) { piedLegal(toile, f, { numeroPage: `Page ${numeroPage}` }); toile.nouvellePage(); toile.y -= 10 * MM; }
  const yTot = toile.y;
  blocTotaux(toile, f, toile.largeur - marge, yTot, { fondTtc: rgb(0.9, 0.96, 0.95), largeur: 200 });
  const yPai = blocPaiement(toile, f, marge, yTot);
  blocMentions(toile, f, marge, Math.min(yPai, toile.y - 110) - 10, largeur * 0.55);
  piedLegal(toile, f);
  return toile.pages.length;
}

export async function gabaritSobre(doc, f, alea, o = {}) {
  const polices = await chargerPolices(doc, 'times');
  const toile = new Toile(doc, polices);
  const marge = 20 * MM; const largeur = toile.largeur - 2 * marge;
  toile.texte(f.fournisseur.raison_sociale, toile.largeur / 2, toile.y - 6, { police: polices.grasse, taille: 14, aligne: 'centre' });
  toile.texte(`${f.fournisseur.adresse}, ${f.fournisseur.code_postal} ${f.fournisseur.ville}`, toile.largeur / 2, toile.y - 20, { taille: 9, aligne: 'centre' });
  toile.texte(`SIRET ${formaterSiret(f.fournisseur.siret)}${f.fournisseur.tva_intracom ? ` — TVA intracommunautaire ${f.fournisseur.tva_intracom}` : ''}`, toile.largeur / 2, toile.y - 32, { taille: 8, aligne: 'centre' });
  toile.ligne(marge, toile.y - 40, toile.largeur - marge, toile.y - 40);
  toile.y -= 60;
  const titre = f.type_document === 'avoir' ? 'AVOIR' : 'FACTURE';
  toile.texte(`${titre} n° ${f.numero}`, marge, toile.y, { police: polices.grasse, taille: 12 });
  toile.texte(`${f.fournisseur.ville}, le ${dateFr(f.date_emission)}`, toile.largeur - marge, toile.y, { taille: 10, aligne: 'droite', police: polices.italique });
  toile.y -= 24;
  blocAdresse(toile, f.client, toile.largeur - marge - 200, toile.y, { taille: 9.5 });
  if (f.references.commande) toile.texte(`Suite à votre commande ${f.references.commande}${f.date_livraison ? `, livrée le ${dateFr(f.date_livraison)}` : ''}.`, marge, toile.y, { taille: 9.5 });
  if (f.facture_rectifiee) toile.texte(`Avoir sur facture ${f.facture_rectifiee}.`, marge, toile.y - 13, { taille: 9.5 });
  toile.y -= 70;
  const { numeroPage } = tableauLignes(toile, f, marge, toile.y, largeur, { pagine: true, fondEntete: rgb(1, 1, 1), lignesSeparation: true, taille: 9, avecCode: false });
  toile.y -= 14;
  if (toile.y < 90 * MM) { piedLegal(toile, f, { numeroPage: `Page ${numeroPage}` }); toile.nouvellePage(); toile.y -= 10 * MM; }
  const yTot = toile.y;
  blocTotaux(toile, f, toile.largeur - marge, yTot, { fondTtc: rgb(1, 1, 1), taille: 9.5, tableauTva: true });
  const yPai = blocPaiement(toile, f, marge, yTot, { taille: 8.5 });
  blocMentions(toile, f, marge, Math.min(yPai, toile.y - 120) - 12, largeur * 0.6, { taille: 7 });
  piedLegal(toile, f);
  return toile.pages.length;
}

export async function gabaritCourrier(doc, f, alea, o = {}) {
  // Style listing/matriciel : tout en Courier, cadres en caractères.
  const polices = await chargerPolices(doc, 'courier');
  const toile = new Toile(doc, polices);
  const marge = 12 * MM; const largeur = toile.largeur - 2 * marge; const t = 8.2; let y = toile.y;
  const L = (s, yy, o2 = {}) => toile.texte(s, marge, yy, { taille: t, ...o2 });
  L(f.fournisseur.raison_sociale.toUpperCase(), y, { police: polices.grasse, taille: 11 }); y -= 12;
  L(f.fournisseur.adresse.toUpperCase(), y); y -= 10; L(`${f.fournisseur.code_postal} ${f.fournisseur.ville.toUpperCase()}`, y); y -= 10;
  L(`SIRET ${f.fournisseur.siret}   ${f.fournisseur.tva_intracom ? 'TVA ' + f.fournisseur.tva_intracom : 'TVA NON APPLICABLE'}`, y); y -= 10;
  L(`TEL ${f.fournisseur.telephone}`, y); y -= 20;
  const titre = f.type_document === 'avoir' ? 'AVOIR' : 'FACTURE';
  L(`${titre} NO ${f.numero}      DATE ${dateFr(f.date_emission)}      ${f.date_echeance ? 'ECHEANCE ' + dateFr(f.date_echeance) : ''}`, y, { police: polices.grasse }); y -= 10;
  L(`CLIENT ${f.client.code_client}   ${f.client.raison_sociale.toUpperCase()}`, y); y -= 10;
  L(`       ${f.client.adresse.toUpperCase()} ${f.client.code_postal} ${f.client.ville.toUpperCase()}`, y); y -= 10;
  if (f.references.commande) { L(`VOTRE COMMANDE ${f.references.commande}${f.references.bon_livraison ? '   BL ' + f.references.bon_livraison : ''}`, y); y -= 10; }
  if (f.date_livraison) { L(`LIVRE LE ${dateFr(f.date_livraison)}`, y); y -= 10; }
  y -= 8;
  const sep = '-'.repeat(86);
  L(sep, y); y -= 10;
  L('REF      DESIGNATION                         QTE     PU HT   TVA   MONTANT HT', y, { police: polices.grasse }); y -= 10;
  L(sep, y); y -= 10;
  const pad = (s, n, d = false) => { s = String(s); return d ? s.padStart(n) : s.padEnd(n).slice(0, n); };
  let page = 1;
  for (const l of f.lignes) {
    if (y < 60 * MM) { L(`SUITE PAGE ${page + 1}`, y); piedLegal(toile, f, { numeroPage: `PAGE ${page}` }); toile.nouvellePage(); page++; y = toile.y - 10; L(sep, y); y -= 10; }
    L(`${pad(l.code ?? '', 8)} ${pad(l.designation.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(), 35)} ${pad(nombre(l.quantite), 7, true)} ${pad(euros(l.prix_unitaire_ht, { signeDevise: false }), 9, true)} ${pad(tauxFr(l.taux_tva).replace(' %', ''), 5, true)} ${pad(euros(l.montant_ht, { signeDevise: false }), 12, true)}`, y); y -= 10;
  }
  L(sep, y); y -= 14;
  if (f.remise_globale) { L(pad(`REMISE ${f.remise_globale_pct} %`, 60) + pad('-' + euros(f.remise_globale, { signeDevise: false }), 26, true), y); y -= 10; }
  L(pad('TOTAL HT', 60) + pad(euros(f.total_ht, { signeDevise: false }), 26, true), y); y -= 10;
  for (const tv of f.tva) { L(pad(`TVA ${tauxFr(tv.taux)} SUR ${euros(tv.base, { signeDevise: false })}`, 60) + pad(euros(tv.montant, { signeDevise: false }), 26, true), y); y -= 10; }
  L(pad('TOTAL TTC EUR', 60) + pad(euros(f.total_ttc, { signeDevise: false }), 26, true), y, { police: polices.grasse }); y -= 10;
  if (f.acompte) { L(pad('ACOMPTE RECU', 60) + pad('-' + euros(f.acompte, { signeDevise: false }), 26, true), y); y -= 10; L(pad('NET A PAYER EUR', 60) + pad(euros(f.net_a_payer, { signeDevise: false }), 26, true), y, { police: polices.grasse }); y -= 10; }
  y -= 10;
  L(`REGLEMENT ${f.mode_paiement.toUpperCase()}`, y); y -= 10;
  L(`IBAN ${formaterIban(f.fournisseur.iban)}  BIC ${f.fournisseur.bic}`, y); y -= 14;
  for (const m of f.mentions) y = toile.paragraphe(m.toUpperCase(), marge, y, largeur, { taille: 6.5 });
  piedLegal(toile, f, { numeroPage: page > 1 ? `PAGE ${page}` : undefined });
  return toile.pages.length;
}

export async function gabaritTicket(doc, f, alea, o = {}) {
  const largeurMm = o.largeurMm ?? 80;
  const hauteur = 215 + f.lignes.length * 18 + f.tva.length * 9 + (f.mode_paiement === 'Espèces' ? 18 : 9) + Math.min(f.mentions.length, 2) * 24;
  const polices = await chargerPolices(doc, 'courier');
  const toile = new Toile(doc, polices, [largeurMm * MM, hauteur]);
  const m = 4 * MM; const l = largeurMm * MM - 2 * m; const t = 7.2; let y = hauteur - 8 * MM;
  const C = (s, yy, o2 = {}) => toile.texte(s, largeurMm * MM / 2, yy, { taille: t, aligne: 'centre', ...o2 });
  const G = (s, yy, o2 = {}) => toile.texte(s, m, yy, { taille: t, ...o2 });
  const D = (s, yy, o2 = {}) => toile.texte(s, m + l, yy, { taille: t, aligne: 'droite', ...o2 });
  C(f.fournisseur.raison_sociale.toUpperCase(), y, { police: polices.grasse, taille: 8.5 }); y -= 10;
  C(f.fournisseur.adresse, y); y -= 9; C(`${f.fournisseur.code_postal} ${f.fournisseur.ville}`, y); y -= 9;
  C(`SIRET ${f.fournisseur.siret}`, y); y -= 9; if (f.fournisseur.tva_intracom) { C(`TVA ${f.fournisseur.tva_intracom}`, y); y -= 9; }
  C(`Tel ${f.fournisseur.telephone}`, y); y -= 14;
  C(`${dateFr(f.date_emission)} ${String(alea.entier(7, 20)).padStart(2, '0')}:${String(alea.entier(0, 59)).padStart(2, '0')}  Caisse ${alea.entier(1, 4)}  Ticket ${f.numero}`, y); y -= 9;
  C('FACTURE / TICKET DE CAISSE', y, { police: polices.grasse }); y -= 9;
  C(`Client : ${f.client.raison_sociale}`, y, { taille: 6.5 }); y -= 9;
  if (f.client.siret) { C(`SIRET client ${f.client.siret}`, y, { taille: 6.5 }); y -= 9; }
  G('-'.repeat(Math.floor(l / 4.3)), y); y -= 9;
  for (const li of f.lignes) {
    G(li.designation.slice(0, 30), y); y -= 8;
    G(`  ${nombre(li.quantite)} x ${euros(li.prix_unitaire_ht, { signeDevise: false })}  TVA ${tauxFr(li.taux_tva)}`, y, { taille: 6.5 }); D(euros(li.montant_ht * (1 + li.taux_tva / 100)), y); y -= 10;
  }
  G('-'.repeat(Math.floor(l / 4.3)), y); y -= 10;
  G('TOTAL HT', y); D(euros(f.total_ht), y); y -= 9;
  for (const tv of f.tva) { G(`TVA ${tauxFr(tv.taux)} (base ${euros(tv.base, { signeDevise: false })})`, y, { taille: 6.5 }); D(euros(tv.montant), y); y -= 9; }
  G('TOTAL TTC', y, { police: polices.grasse, taille: 9 }); D(euros(f.total_ttc), y, { police: polices.grasse, taille: 9 }); y -= 12;
  G(`${f.mode_paiement.toUpperCase()}`, y); D(euros(f.total_ttc), y); y -= 9;
  if (f.mode_paiement === 'Espèces') { const rendu = Math.ceil(f.total_ttc / 5) * 5; G('ESPECES RECUES', y); D(euros(rendu), y); y -= 9; G('RENDU', y); D(euros(rendu - f.total_ttc), y); y -= 9; }
  if (f.mode_paiement === 'Carte bancaire') { G(`CB ****${alea.chiffres(4)}  AUTO ${alea.chiffres(6)}`, y, { taille: 6.5 }); y -= 9; }
  y -= 6;
  for (const mt of f.mentions.slice(0, 2)) y = toile.paragraphe(mt, m, y, l, { taille: 5.8 });
  y -= 4; C('Merci de votre visite', y, { police: polices.italique }); y -= 9;
  C(`${alea.chiffres(13)}`, y, { taille: 6 });
  return 1;
}

export async function gabaritManuscrit(doc, f, alea, o = {}) {
  doc.registerFontkit(fontkit);
  const manuscrite = await doc.embedFont(Uint8Array.from(policeManuscrite(alea)));
  const polices = await chargerPolices(doc, 'helvetica');
  const toile = new Toile(doc, { normale: manuscrite, grasse: manuscrite, italique: manuscrite });
  const marge = 18 * MM; const largeur = toile.largeur - 2 * marge; const encre = rgb(0.1, 0.1, 0.35);
  const bloc = o.carnet ?? alea.chance(0.6);
  if (bloc) {
    // Carnet à souche pré-imprimé : lignes et en-tête imprimés en Helvetica, remplissage à la main.
    for (let yy = 40 * MM; yy < toile.format[1] - 70 * MM; yy += 8 * MM) toile.ligne(marge, yy, toile.largeur - marge, yy, { couleur: rgb(0.75, 0.8, 0.9), epaisseur: 0.5 });
    toile.texte(f.fournisseur.raison_sociale, marge, toile.y - 8, { police: polices.grasse, taille: 13 });
    toile.texte(`${f.fournisseur.adresse} — ${f.fournisseur.code_postal} ${f.fournisseur.ville}`, marge, toile.y - 22, { police: polices.normale, taille: 8.5 });
    toile.texte(`SIRET ${formaterSiret(f.fournisseur.siret)}${f.fournisseur.tva_intracom ? ' — TVA ' + f.fournisseur.tva_intracom : ' — TVA non applicable, art. 293 B du CGI'}`, marge, toile.y - 33, { police: polices.normale, taille: 8 });
    toile.texte('FACTURE', toile.largeur - marge - 150, toile.y - 10, { police: polices.grasse, taille: 16 });
    toile.texte('N°', toile.largeur - marge - 150, toile.y - 30, { police: polices.normale, taille: 9 });
    toile.texte('Date', toile.largeur - marge - 150, toile.y - 45, { police: polices.normale, taille: 9 });
    toile.texte(f.numero, toile.largeur - marge - 128, toile.y - 28, { taille: 15, couleur: encre });
    toile.texte(dateFr(f.date_emission), toile.largeur - marge - 128, toile.y - 44, { taille: 15, couleur: encre });
  } else {
    const ecrire = (s, x, y, taille) => toile.texte(s, x + alea.reel() * 2, y + alea.reel() * 2, { taille, couleur: encre });
    ecrire(f.fournisseur.raison_sociale, marge, toile.y - 6, 19);
    ecrire(`${f.fournisseur.adresse}, ${f.fournisseur.code_postal} ${f.fournisseur.ville}`, marge, toile.y - 26, 13);
    ecrire(`Siret ${f.fournisseur.siret}`, marge, toile.y - 42, 13);
    ecrire(`Facture n° ${f.numero}`, toile.largeur - marge - 180, toile.y - 6, 20);
    ecrire(`le ${dateFr(f.date_emission)}`, toile.largeur - marge - 180, toile.y - 28, 15);
  }
  toile.y -= 85;
  toile.texte(`Client : ${f.client.raison_sociale}`, marge, toile.y, { taille: 15, couleur: encre }); toile.y -= 18;
  toile.texte(`${f.client.adresse}, ${f.client.code_postal} ${f.client.ville}`, marge + 20, toile.y, { taille: 13, couleur: encre }); toile.y -= 30;
  for (const l of f.lignes) {
    const dx = alea.reel() * 6 - 3; const dy = alea.reel() * 3;
    toile.texte(`${nombre(l.quantite)} ${l.unite} ${l.designation}`, marge + dx, toile.y + dy, { taille: 14, couleur: encre });
    toile.texte(`${euros(l.prix_unitaire_ht, { signeDevise: false })} x`, toile.largeur - marge - 150 + dx, toile.y + dy, { taille: 13, couleur: encre });
    toile.texte(euros(l.montant_ht), toile.largeur - marge + dx, toile.y + dy, { taille: 14, couleur: encre, aligne: 'droite' });
    toile.y -= 22.7;
  }
  toile.y -= 10;
  toile.ligne(toile.largeur - marge - 200, toile.y + 6, toile.largeur - marge, toile.y + 4, { couleur: encre, epaisseur: 1 });
  toile.y -= 14;
  const T = (lib, val, taille = 15) => { toile.texte(lib, toile.largeur - marge - 200, toile.y, { taille, couleur: encre }); toile.texte(val, toile.largeur - marge, toile.y, { taille, couleur: encre, aligne: 'droite' }); toile.y -= 21; };
  T('Total HT', euros(f.total_ht));
  for (const tv of f.tva) T(tv.taux === 0 ? 'TVA : néant' : `TVA ${tauxFr(tv.taux)}`, tv.taux === 0 ? '' : euros(tv.montant));
  T('TOTAL TTC', euros(f.total_ttc), 18);
  toile.y -= 8;
  toile.texte(`Règlement ${f.mode_paiement.toLowerCase()}${f.date_echeance ? ' avant le ' + dateFr(f.date_echeance) : ''}`, marge, toile.y, { taille: 13, couleur: encre }); toile.y -= 18;
  if (o.iban !== false) { toile.texte(`IBAN ${formaterIban(f.fournisseur.iban)}`, marge, toile.y, { taille: 12, couleur: encre }); toile.y -= 18; }
  if (f.mentions[0].startsWith('TVA non applicable')) { toile.texte(f.mentions[0], marge, toile.y, { taille: 12, couleur: encre }); toile.y -= 18; }
  toile.texte(alea.choix(['Merci !', 'Bonne réception', 'Cordialement', 'À bientôt']), toile.largeur - marge - 120, toile.y - 10, { taille: 16, couleur: encre, rotation: undefined });
  return 1;
}

export async function creerDocument() {
  const doc = await PDFDocument.create();
  doc.setProducer('Banc Omega — générateur de factures fictives');
  doc.setCreator('omega/banc/generer-factures.mjs');
  return doc;
}

// Pièce jointe Factur-X : XML CII en pièce jointe « Alternative », métadonnées XMP minimales.
export function attacherFacturX(doc, xml, profil) {
  doc.attach(Buffer.from(xml, 'utf8'), 'factur-x.xml', {
    mimeType: 'text/xml',
    description: 'Factur-X XML invoice',
    creationDate: new Date('2026-01-01T00:00:00Z'),
    modificationDate: new Date('2026-01-01T00:00:00Z'),
    afRelationship: AFRelationship.Alternative,
  });
  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"><pdfaid:part>3</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance></rdf:Description>
<rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#"><fx:DocumentType>INVOICE</fx:DocumentType><fx:DocumentFileName>factur-x.xml</fx:DocumentFileName><fx:Version>1.0</fx:Version><fx:ConformanceLevel>${profil}</fx:ConformanceLevel></rdf:Description>
</rdf:RDF></x:xmpmeta>
<?xpacket end="w"?>`;
  const flux = doc.context.stream(Buffer.from(xmp, 'utf8'), { Type: 'Metadata', Subtype: 'XML' });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(flux));
}

export const GABARITS = { classique: gabaritClassique, moderne: gabaritModerne, sobre: gabaritSobre, courrier: gabaritCourrier, ticket: gabaritTicket, manuscrit: gabaritManuscrit };
export { PDFString, PDFHexString };
