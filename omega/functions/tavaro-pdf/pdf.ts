// Le PDF d'une facture TAVARO (session B2, 06/10/2026) : A4, Helvetica, l'émetteur, le client, l'objet, les lignes,
// les totaux, les mentions (TVA, option sur les débits, échéance, pénalités pour un professionnel, mandat), et la liste
// des photos jointes au courriel. Plusieurs pages si les lignes débordent ; « page n / N » en pied.
// Les polices standard du PDF ne connaissent que le jeu WinAnsi : un caractère hors de ce jeu est remplacé (nettoyer).

import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import type { FactureAProduire } from "./portes.ts";

const A4 = { l: 595.28, h: 841.89 };
const MARGE = 48;
const NOIR = rgb(0.02, 0.02, 0.02);
const GRIS = rgb(0.42, 0.42, 0.46);
const FILET = rgb(0.85, 0.85, 0.87);

const eur = (n: number | null | undefined) =>
  n === null || n === undefined
    ? ""
    : `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
const date = (
  iso: string | null | undefined,
) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const nombre = (n: number) => String(Math.round(n * 1000) / 1000).replace(".", ",");
const UNITES: Record<string, string> = {
  huitieme: "huitième(s)",
  litre: "l",
  km: "km",
  jour_entame: "jour(s)",
  forfait: "forfait",
  devis: "devis",
};

/** Remplace ce que le jeu WinAnsi des polices standard ne sait pas écrire (espaces fines, symboles rares). */
export function nettoyer(texte: string, police: PDFFont): string {
  const base = String(texte ?? "").replace(/[   ]/g, " ").replace(/[‐‑]/g, "-").replace(/\r/g, "");
  let sortie = "";
  for (const c of base) {
    try {
      police.encodeText(c);
      sortie += c;
    } catch {
      sortie += "?";
    }
  }
  return sortie;
}

/** Coupe un texte en lignes qui tiennent dans la largeur. */
function couper(texte: string, police: PDFFont, taille: number, largeur: number): string[] {
  const lignes: string[] = [];
  for (const paragraphe of texte.split("\n")) {
    let courante = "";
    for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (police.widthOfTextAtSize(essai, taille) <= largeur) courante = essai;
      else {
        if (courante) lignes.push(courante);
        courante = mot;
        while (police.widthOfTextAtSize(courante, taille) > largeur && courante.length > 1) {
          let i = courante.length - 1;
          while (i > 1 && police.widthOfTextAtSize(courante.slice(0, i), taille) > largeur) i--;
          lignes.push(courante.slice(0, i));
          courante = courante.slice(i);
        }
      }
    }
    lignes.push(courante);
  }
  return lignes;
}

export async function composerPdf(f: FactureAProduire, contrat: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Facture ${f.reference}`);
  doc.setAuthor(String(f.emetteur?.nom ?? ""));
  doc.setSubject(`Location ${contrat}`);
  doc.setProducer("Omega — Tavaro");
  doc.setCreationDate(new Date(`${f.date_facture}T12:00:00Z`));
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);
  const largeur = A4.l - 2 * MARGE;
  const pages: PDFPage[] = [];
  let page = doc.addPage([A4.l, A4.h]);
  pages.push(page);
  let y = A4.h - MARGE;

  const ecrire = (
    t: string,
    x: number,
    o: { taille?: number; police?: PDFFont; couleur?: ReturnType<typeof rgb>; droite?: boolean } = {},
  ) => {
    const police = o.police ?? normal;
    const taille = o.taille ?? 9.5;
    const s = nettoyer(t, police);
    const px = o.droite ? x - police.widthOfTextAtSize(s, taille) : x;
    page.drawText(s, { x: px, y, size: taille, font: police, color: o.couleur ?? NOIR });
  };
  const paragraphe = (
    t: string,
    o: { taille?: number; police?: PDFFont; couleur?: ReturnType<typeof rgb>; x?: number; l?: number } = {},
  ) => {
    const police = o.police ?? normal;
    const taille = o.taille ?? 9;
    for (const l of couper(nettoyer(t, police), police, taille, o.l ?? largeur)) {
      place(taille + 3.5);
      ecrire(l, o.x ?? MARGE, { taille, police, couleur: o.couleur });
      y -= taille + 3.5;
    }
  };
  const place = (h: number) => {
    if (y - h < MARGE + 24) {
      page = doc.addPage([A4.l, A4.h]);
      pages.push(page);
      y = A4.h - MARGE;
    }
  };

  // L'en-tête : l'émetteur à gauche, la facture à droite.
  const e = f.emetteur ?? {};
  ecrire(String(e.nom ?? ""), MARGE, { taille: 14, police: gras });
  ecrire(`Facture ${f.reference}`, A4.l - MARGE, { taille: 14, police: gras, droite: true });
  y -= 18;
  const gauche = [
    e.adresse,
    e.siren ? `SIREN ${e.siren}` : null,
    e.rcs,
    e.numero_tva ? `TVA ${e.numero_tva}` : null,
    e.email,
    e.telephone,
  ].filter(Boolean) as string[];
  const droite = [
    `Date : ${date(f.date_facture)}`,
    `Échéance : ${f.echeance_le <= f.date_facture ? "à réception" : date(f.echeance_le)}`,
    `Location ${contrat}`,
  ];
  for (let i = 0; i < Math.max(gauche.length, droite.length); i++) {
    if (gauche[i]) ecrire(gauche[i], MARGE, { couleur: GRIS, taille: 8.5 });
    if (droite[i]) ecrire(droite[i], A4.l - MARGE, { taille: 9, droite: true });
    y -= 12;
  }
  y -= 10;

  // Le client.
  const d = f.destinataire ?? {};
  ecrire("Facturé à", MARGE, { taille: 8, couleur: GRIS });
  y -= 13;
  ecrire(String(d.raison_sociale || d.nom || "Client"), MARGE, { police: gras, taille: 10.5 });
  y -= 13;
  for (const l of [d.adresse, d.siren ? `SIREN ${d.siren}` : null, d.email].filter(Boolean) as string[]) {
    ecrire(l, MARGE, { taille: 9 });
    y -= 12;
  }
  y -= 8;
  if (f.mentions?.objet) {
    paragraphe(String(f.mentions.objet), { police: gras, taille: 10 });
    if (f.mentions?.restitution) {
      paragraphe(`Véhicule restitué le ${f.mentions.restitution}.`, { couleur: GRIS, taille: 8.5 });
    }
    y -= 6;
  }

  // Les lignes.
  const colonnes = { libelle: MARGE, quantite: MARGE + 240, pu: MARGE + 300, tva: MARGE + 358, ht: A4.l - MARGE };
  const entete = () => {
    place(22);
    page.drawRectangle({ x: MARGE, y: y - 5, width: largeur, height: 17, color: rgb(0.96, 0.96, 0.96) });
    ecrire("Désignation", colonnes.libelle + 4, { police: gras, taille: 8.5 });
    ecrire("Qté", colonnes.quantite + 40, { police: gras, taille: 8.5, droite: true });
    ecrire("P.U. HT", colonnes.pu + 50, { police: gras, taille: 8.5, droite: true });
    ecrire("TVA", colonnes.tva + 40, { police: gras, taille: 8.5, droite: true });
    ecrire("Montant HT", colonnes.ht - 4, { police: gras, taille: 8.5, droite: true });
    y -= 20;
  };
  entete();
  for (const li of f.lignes) {
    const libelle = couper(nettoyer(li.libelle, normal), normal, 9, 228);
    const h = libelle.length * 12 + 4;
    if (y - h < MARGE + 24) {
      place(10_000);
      entete();
    }
    libelle.forEach((t, i) => {
      ecrire(t, colonnes.libelle + 4, { taille: 9 });
      if (i === 0) {
        ecrire(
          `${nombre(li.quantite)}${li.unite && UNITES[li.unite] ? ` ${UNITES[li.unite]}` : ""}`,
          colonnes.quantite + 40,
          { taille: 9, droite: true },
        );
        ecrire(eur(li.prix_unitaire), colonnes.pu + 50, { taille: 9, droite: true });
        ecrire(li.regime_tva === "taxable" ? `${nombre(li.taux_tva ?? 0)} %` : "hors champ", colonnes.tva + 40, {
          taille: 8.5,
          droite: true,
        });
        ecrire(eur(li.montant_ht), colonnes.ht - 4, { taille: 9, droite: true });
      }
      y -= 12;
    });
    page.drawLine({ start: { x: MARGE, y: y + 6 }, end: { x: A4.l - MARGE, y: y + 6 }, thickness: 0.4, color: FILET });
    y -= 4;
  }

  // Les totaux.
  y -= 6;
  place(60);
  const totaux: [string, string, boolean][] = f.total_tva > 0
    ? [["Total HT", eur(f.total_ht), false], ["TVA", eur(f.total_tva), false], ["Total TTC", eur(f.total_ttc), true]]
    : [["Total", eur(f.total_ttc), true]];
  for (const [libelle, montant, fort] of totaux) {
    ecrire(libelle, A4.l - MARGE - 150, { police: fort ? gras : normal, taille: fort ? 11 : 9.5 });
    ecrire(montant, A4.l - MARGE - 4, { police: fort ? gras : normal, taille: fort ? 11 : 9.5, droite: true });
    y -= fort ? 16 : 13;
  }
  y -= 10;

  // Les mentions.
  const m = f.mentions ?? {};
  const mentions = [
    m.tva ? String(m.tva) : null,
    m.option_debits ? `${m.option_debits}.` : null,
    f.echeance_le <= f.date_facture ? "À régler à réception." : `À régler avant le ${date(f.echeance_le)}.`,
    f.a_debiter_avant
      ? `À débiter avant le ${date(f.a_debiter_avant)} en cas de débit sur la carte enregistrée.`
      : null,
    m.penalites ? String(m.penalites) : null,
    d.type === "professionnel" ? "Pas d'escompte pour paiement anticipé." : null,
    m.mandat ? String(m.mandat) : null,
    "Une contestation écrite adressée à l'agence suspend le recouvrement.",
  ].filter(Boolean) as string[];
  for (const t of mentions) paragraphe(t, { taille: 8.5, couleur: GRIS });
  if (Array.isArray(m.mentions_manquantes) && m.mentions_manquantes.length) {
    y -= 4;
    paragraphe(`Mentions à compléter par l'émetteur : ${(m.mentions_manquantes as string[]).join(", ")}.`, {
      taille: 8,
      couleur: rgb(0.6, 0.3, 0),
    });
  }
  if (f.photos.length) {
    y -= 8;
    paragraphe(`Photos datées jointes au courriel (${f.photos.length}) :`, { taille: 8.5, police: gras });
    for (const p of f.photos) {
      const nom = p.chemin.split("/").pop() ?? p.chemin;
      paragraphe(
        `• ${nom}${p.legende ? ` — ${p.legende}` : ""}${
          p.prise_le ? ` — prise le ${date(p.prise_le)} à ${p.prise_le.slice(11, 16)}` : ""
        }`,
        { taille: 8, couleur: GRIS },
      );
    }
  }

  // Le pied : la référence et la page.
  pages.forEach((pg, i) => {
    const t = nettoyer(`${f.reference} — page ${i + 1} / ${pages.length}`, normal);
    pg.drawText(t, {
      x: A4.l - MARGE - normal.widthOfTextAtSize(t, 7.5),
      y: MARGE - 14,
      size: 7.5,
      font: normal,
      color: GRIS,
    });
  });
  return await doc.save();
}
