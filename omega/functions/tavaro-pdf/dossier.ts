// Le dossier de réponse à une contestation bancaire (session B2, 06/10/2026, migration b2_09) : ce que la banque lit
// pour trancher. Une lettre (qui conteste, quoi, pourquoi le débit est dû, la chronologie), le contrat et ses conditions,
// ce qui est facturé ligne par ligne face au barème, puis chaque état des lieux signé — relevés, dommages, signature,
// empreinte SHA-256 et photos datées intégrées — et les photos des dommages facturés.
// Les forces et faiblesses que Tavaro montre à l'agence n'y figurent pas : elles sont pour l'agence, pas pour la banque.
// Les photos JPEG et PNG sont intégrées tant qu'elles tiennent dans le budget ; les autres sont listées, à la demande.

import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import { couper, date, eur, nettoyer, nombre } from "./pdf.ts";
import type { DossierAProduire, EtatSigne, Photo } from "./portes.ts";

const A4 = { l: 595.28, h: 841.89 };
const MARGE = 48;
const NOIR = rgb(0.02, 0.02, 0.02);
const GRIS = rgb(0.42, 0.42, 0.46);
const FILET = rgb(0.85, 0.85, 0.87);
const FOND = rgb(0.96, 0.96, 0.96);

export const VUES: Record<string, string> = {
  avant: "Avant",
  arriere: "Arrière",
  flanc_gauche: "Flanc gauche",
  flanc_droit: "Flanc droit",
  compteur: "Compteur",
  jauge: "Jauge",
  interieur: "Intérieur",
};
const MODES: Record<string, string> = {
  carte: "carte bancaire",
  depot: "dépôt de garantie",
  comptoir: "au comptoir",
  virement: "virement",
  autre: "autre",
};
const REMISES: Record<string, string> = {
  delivered: "distribué au serveur du destinataire",
  opened: "ouvert par le destinataire",
  clicked: "ouvert par le destinataire",
};
const CAUTIONS: Record<string, string> = {
  empreinte_carte: "empreinte de carte",
  cheque: "chèque",
  especes: "espèces",
  virement: "virement",
  aucune: "aucune",
};

/** L'heure en France métropolitaine (les dates de la base sont en UTC). */
function heureLocale(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );
  } catch {
    return iso.slice(11, 16);
  }
}
/** La date en France métropolitaine (JJ/MM/AAAA). */
function jourLocal(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return date(iso);
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return date(iso);
  }
}
const quand = (
  iso: string | null | undefined,
) => (iso ? (iso.length > 10 ? `${jourLocal(iso)} à ${heureLocale(iso)}` : date(iso)) : "");
const zone = (z: string) => z.replace(/_/g, " ");

/** Les photos du dossier, dans l'ordre où elles paraissent (pour les lire une fois). */
export function photosDuDossier(d: DossierAProduire): string[] {
  const vus = new Set<string>();
  const ajouter = (p?: { chemin?: string }) => {
    if (p?.chemin && p.chemin.startsWith(`${d.client}/`)) vus.add(p.chemin);
  };
  for (const e of d.etats) {
    if (e.signature_chemin) ajouter({ chemin: e.signature_chemin });
    e.photos.forEach(ajouter);
    for (const dm of e.dommages) dm.preuves.forEach(ajouter);
  }
  for (const l of d.facture.lignes) l.preuves.forEach(ajouter);
  return [...vus];
}

type Images = Map<string, Uint8Array>;

export async function composerDossier(
  d: DossierAProduire,
  images: Images,
): Promise<{ pdf: Uint8Array; pages: number; integrees: number }> {
  const k = d.contestation;
  const doc = await PDFDocument.create();
  doc.setTitle(`Contestation ${k.reference_banque} — dossier de réponse`);
  doc.setAuthor(String(d.emetteur?.nom ?? ""));
  doc.setSubject(`Facture ${d.facture.reference} — location ${d.contrat.numero}`);
  doc.setProducer("Omega — Tavaro");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);
  const fixe = await doc.embedFont(StandardFonts.Courier);
  const largeur = A4.l - 2 * MARGE;
  const pages: PDFPage[] = [];
  let page = doc.addPage([A4.l, A4.h]);
  pages.push(page);
  let y = A4.h - MARGE;
  let integrees = 0;

  const nouvellePage = () => {
    page = doc.addPage([A4.l, A4.h]);
    pages.push(page);
    y = A4.h - MARGE;
  };
  const place = (h: number) => {
    if (y - h < MARGE + 24) nouvellePage();
  };
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
    o: {
      taille?: number;
      police?: PDFFont;
      couleur?: ReturnType<typeof rgb>;
      x?: number;
      l?: number;
      interligne?: number;
    } = {},
  ) => {
    const police = o.police ?? normal;
    const taille = o.taille ?? 9.5;
    const pas = taille + (o.interligne ?? 3.5);
    for (const l of couper(nettoyer(t, police), police, taille, o.l ?? largeur - ((o.x ?? MARGE) - MARGE))) {
      place(pas);
      ecrire(l, o.x ?? MARGE, { taille, police, couleur: o.couleur });
      y -= pas;
    }
  };
  const titre = (t: string) => {
    place(40);
    y -= 8;
    ecrire(t, MARGE, { police: gras, taille: 12 });
    y -= 6;
    page.drawLine({ start: { x: MARGE, y }, end: { x: A4.l - MARGE, y }, thickness: 0.6, color: FILET });
    y -= 14;
  };
  const champs = (lignes: [string, string | null | undefined][]) => {
    for (const [libelle, valeur] of lignes) {
      if (!valeur) continue;
      const v = couper(nettoyer(valeur, normal), normal, 9.5, largeur - 150);
      place(v.length * 13);
      ecrire(libelle, MARGE, { couleur: GRIS, taille: 9 });
      v.forEach((t, i) => {
        if (i > 0) y -= 13;
        ecrire(t, MARGE + 150, { taille: 9.5 });
      });
      y -= 13;
    }
  };
  const puce = (t: string, o: { taille?: number; couleur?: ReturnType<typeof rgb> } = {}) => {
    const taille = o.taille ?? 9.5;
    const lignes = couper(nettoyer(t, normal), normal, taille, largeur - 14);
    lignes.forEach((l, i) => {
      place(taille + 4);
      if (i === 0) ecrire("•", MARGE + 2, { taille });
      ecrire(l, MARGE + 14, { taille, couleur: o.couleur });
      y -= taille + 4;
    });
  };

  const imageDe = async (chemin: string): Promise<PDFImage | null> => {
    const octets = images.get(chemin);
    if (!octets) return null;
    try {
      if (octets[0] === 0xff && octets[1] === 0xd8) return await doc.embedJpg(octets);
      if (octets[0] === 0x89 && octets[1] === 0x50) return await doc.embedPng(octets);
    } catch {
      return null;
    }
    return null;
  };
  /** Une grille de photos, deux par rang, légendées (vue, date et heure de prise). */
  const grille = async (photos: (Photo & { legende?: string })[]) => {
    const colonnes = 2;
    const ecart = 14;
    const cl = (largeur - ecart) / colonnes;
    const ch = cl * 0.72;
    const absentes: string[] = [];
    let col = 0;
    for (const p of photos) {
      const img = await imageDe(p.chemin);
      const legende = [
        p.legende ?? (p.vue ? VUES[p.vue] ?? p.vue : null),
        p.prise_le ? `prise le ${quand(p.prise_le)}` : null,
      ]
        .filter(Boolean).join(" — ");
      if (!img) {
        absentes.push(`${p.chemin.split("/").pop()}${legende ? ` (${legende})` : ""}`);
        continue;
      }
      if (col === 0) place(ch + 26);
      const x = MARGE + col * (cl + ecart);
      const r = Math.min(cl / img.width, ch / img.height);
      const w = img.width * r;
      const h = img.height * r;
      page.drawRectangle({ x, y: y - ch, width: cl, height: ch, color: FOND });
      page.drawImage(img, { x: x + (cl - w) / 2, y: y - ch + (ch - h) / 2, width: w, height: h });
      const sauve = y;
      y = y - ch - 11;
      ecrire(couper(nettoyer(legende, normal), normal, 8, cl)[0] ?? "", x, { taille: 8, couleur: GRIS });
      y = sauve;
      integrees++;
      col = (col + 1) % colonnes;
      if (col === 0) y -= ch + 22;
    }
    if (col !== 0) y -= ch + 22;
    if (absentes.length) {
      paragraphe(
        `Photos non intégrées à ce PDF (format ou taille), disponibles sur demande : ${absentes.join(" ; ")}.`,
        {
          taille: 8,
          couleur: GRIS,
        },
      );
    }
  };

  // ── La lettre ─────────────────────────────────────────────────────────
  const e = d.emetteur ?? {};
  ecrire(String(e.nom ?? ""), MARGE, { taille: 14, police: gras });
  ecrire("Dossier de réponse", A4.l - MARGE, { taille: 14, police: gras, droite: true });
  y -= 18;
  const gauche = [
    e.adresse,
    e.siren ? `SIREN ${e.siren}` : null,
    e.numero_tva ? `TVA ${e.numero_tva}` : null,
    e.email,
    e.telephone,
  ]
    .filter(Boolean) as string[];
  const droite = [
    `Contestation ${k.reference_banque}`,
    `Reçue le ${date(k.recue_le)}`,
    `Réponse avant le ${date(k.repondre_avant)}`,
  ];
  for (let i = 0; i < Math.max(gauche.length, droite.length); i++) {
    if (gauche[i]) ecrire(gauche[i], MARGE, { couleur: GRIS, taille: 8.5 });
    if (droite[i]) ecrire(droite[i], A4.l - MARGE, { taille: 9, droite: true });
    y -= 12;
  }
  y -= 12;
  ecrire("À l'attention du service des contestations", MARGE, { police: gras, taille: 10.5 });
  y -= 20;

  const loc = d.locataire ?? {};
  const nomLocataire = String(loc.raison_sociale || loc.nom || "le locataire");
  const debit = d.facture.regle_le
    ? `débité le ${quand(d.facture.regle_le)}${
      d.facture.mode_reglement ? ` (${MODES[d.facture.mode_reglement] ?? d.facture.mode_reglement})` : ""
    }`
    : "débité";
  paragraphe(
    `${nomLocataire} conteste le débit de ${eur(k.montant_eur)} au titre de notre facture ${d.facture.reference} du ${
      date(d.facture.date_facture)
    } (${
      eur(d.facture.total_ttc)
    } TTC, ${debit}), motif communiqué : « ${k.motif_banque} ». Nous contestons cette demande : la somme est due au titre du contrat de location ${d.contrat.numero}, que le locataire a accepté, et des constats signés au départ et au retour du véhicule.`,
  );
  y -= 6;

  titre("Chronologie");
  const depart = d.etats.find((x) => x.moment === "depart");
  const retour = d.etats.find((x) => x.moment === "retour");
  const v = d.contrat.vehicule;
  puce(
    `${quand(d.contrat.depart_le)} — départ du véhicule${
      v ? ` ${v.immatriculation}${v.modele ? ` (${v.modele})` : ""}` : ""
    }${d.contrat.km_depart !== undefined ? `, ${d.contrat.km_depart.toLocaleString("fr-FR")} km` : ""}.${
      depart ? ` ${resumeEtat(depart)}` : ""
    }`,
  );
  puce(
    `${quand(d.contrat.retour_reel_le ?? d.contrat.retour_prevu_le)} — retour du véhicule${
      d.contrat.km_retour !== undefined ? `, ${d.contrat.km_retour.toLocaleString("fr-FR")} km` : ""
    }.${retour ? ` ${resumeEtat(retour)}` : ""}`,
  );
  if (d.decision) {
    const autre = d.decision.approbations.some((a) => a.autre_que_la_saisie && a.decision.startsWith("approuv"));
    puce(
      `${quand(d.decision.decidee_le ?? d.decision.demandee_le)} — facture ${d.facture.reference} validée${
        autre ? " par une personne distincte de celle qui a constaté et chiffré le retour" : ""
      }${d.decision.approbations[0]?.role ? ` (${d.decision.approbations[0].role})` : ""}.`,
    );
  }
  if (d.envoi_facture) {
    puce(
      `${quand(d.envoi_facture.remise_le ?? d.envoi_facture.prepare_le)} — facture adressée au locataire par courriel${
        d.envoi_facture.remise && REMISES[d.envoi_facture.remise] ? ` (${REMISES[d.envoi_facture.remise]})` : ""
      }.`,
    );
  }
  if (d.facture.regle_le) puce(`${quand(d.facture.regle_le)} — ${debit.replace(/^débité/, "somme débitée")}.`);

  titre("Le contrat");
  const c = d.contrat;
  champs([
    ["Contrat", c.numero],
    ["Locataire", nomLocataire],
    ["Véhicule", v ? `${v.immatriculation}${v.modele ? ` — ${v.modele}` : ""}` : null],
    ["Période", `du ${quand(c.depart_le)} au ${quand(c.retour_reel_le ?? c.retour_prevu_le)}`],
    ["Conditions acceptées", c.conditions_version ? `version ${c.conditions_version}` : null],
    ["Franchise dommages", c.franchise_eur !== undefined ? eur(c.franchise_eur) : null],
    ["Franchise réduite", c.franchise_reduite_eur !== undefined ? eur(c.franchise_reduite_eur) : null],
    ["Rachat de franchise", c.rachat_franchise === undefined ? null : c.rachat_franchise ? "souscrit" : "non souscrit"],
    ["Dépôt de garantie", c.depot_eur !== undefined ? eur(c.depot_eur) : null],
    ["Contrat signé", c.piece ? `joint au courriel (${c.piece.nom})` : null],
  ]);

  titre("Ce qui est facturé, ligne par ligne");
  for (const l of d.facture.lignes) {
    place(30);
    const montant = eur(l.montant_ttc);
    const libelle = couper(nettoyer(l.libelle, gras), gras, 9.5, largeur - 90);
    libelle.forEach((t, i) => {
      place(13);
      ecrire(t, MARGE, { police: gras, taille: 9.5 });
      if (i === 0) ecrire(`${montant} TTC`, A4.l - MARGE, { police: gras, taille: 9.5, droite: true });
      y -= 13;
    });
    const details = [
      `${nombre(l.quantite)} × ${eur(l.prix_unitaire ?? null) || "—"}${l.unite ? ` (${l.unite})` : ""}`,
      l.bareme
        ? `barème publié : ${l.bareme.code} « ${l.bareme.libelle} », ${
          l.bareme.prix_eur === null ? "sur devis" : `${eur(l.bareme.prix_eur)} HT`
        } par ${l.bareme.unite}`
        : "hors barème : sur devis ou facture de réparation",
    ];
    if (l.calcul && Object.keys(l.calcul).length) {
      details.push(
        `calcul : ${
          Object.entries(l.calcul).filter(([, x]) => x !== null && typeof x !== "object").map(([cle, x]) =>
            `${cle.replace(/_/g, " ")} ${x}`
          ).join(", ")
        }`,
      );
    }
    for (const t of details) paragraphe(t, { taille: 8.5, couleur: GRIS, x: MARGE + 10 });
    y -= 6;
  }
  place(20);
  ecrire("Total de la facture", MARGE, { police: gras });
  ecrire(`${eur(d.facture.total_ttc)} TTC`, A4.l - MARGE, { police: gras, droite: true });
  y -= 13;
  if (k.montant_eur !== d.facture.total_ttc) {
    ecrire("Montant contesté", MARGE, {});
    ecrire(eur(k.montant_eur), A4.l - MARGE, { droite: true });
    y -= 13;
  }

  // ── Les états des lieux ──────────────────────────────────────────────
  for (const etat of [depart, retour].filter(Boolean) as EtatSigne[]) {
    nouvellePage();
    titre(`État des lieux de ${etat.moment === "depart" ? "départ" : "retour"} — ${quand(etat.releve_le)}`);
    champs([
      ["Kilométrage", etat.km !== undefined ? `${etat.km.toLocaleString("fr-FR")} km` : null],
      ["Carburant", etat.carburant_8 !== undefined ? `${etat.carburant_8} / 8` : null],
      ["Charge", etat.charge_pct !== undefined ? `${etat.charge_pct} %` : null],
      [
        "Dépôt de garantie",
        etat.caution_eur !== undefined
          ? `${eur(etat.caution_eur)}${
            etat.caution_mode ? ` (${CAUTIONS[etat.caution_mode] ?? etat.caution_mode})` : ""
          }`
          : null,
      ],
      ["Observations", etat.observations],
      [
        etat.statut === "signe" ? "Signé par" : "Refus de signer",
        etat.statut === "signe"
          ? `${etat.signataire_nom ?? ""}, le ${quand(etat.signe_le)}`
          : `constaté le ${quand(etat.refuse_le)} : ${etat.refus_motif ?? ""}`,
      ],
    ]);
    if (etat.empreinte) {
      place(13);
      ecrire("Empreinte SHA-256", MARGE, { couleur: GRIS, taille: 9 });
      ecrire(etat.empreinte, MARGE + 150, { police: fixe, taille: 7.5 });
      y -= 13;
      paragraphe(
        "L'empreinte est calculée au moment de la signature sur le contenu signé (relevés, photos, dommages, signataire) : toute modification ultérieure la rendrait fausse.",
        { taille: 8, couleur: GRIS },
      );
    }
    if (etat.signature_chemin) {
      const img = await imageDe(etat.signature_chemin);
      if (img) {
        const r = Math.min(200 / img.width, 70 / img.height);
        y -= 6;
        place(img.height * r + 18);
        ecrire("Signature", MARGE, { couleur: GRIS, taille: 9 });
        page.drawImage(img, {
          x: MARGE + 150,
          y: y - img.height * r + 9,
          width: img.width * r,
          height: img.height * r,
        });
        y -= img.height * r + 8;
        integrees++;
      }
    }
    if (etat.dommages.length) {
      y -= 4;
      paragraphe(
        etat.moment === "depart" ? "Dommages déjà notés au départ (non facturés)" : "Dommages constatés au retour",
        {
          police: gras,
          taille: 10,
        },
      );
      for (const dm of etat.dommages) {
        puce(`${zone(dm.zone)}${dm.code ? ` (${dm.code})` : ""} — ${dm.description}`, { taille: 9 });
      }
    } else {
      paragraphe(etat.moment === "depart" ? "Aucun dommage noté au départ." : "Aucun dommage noté au retour.", {
        taille: 9,
        couleur: GRIS,
      });
    }
    y -= 6;
    const photos: (Photo & { legende?: string })[] = [
      ...etat.photos,
      ...etat.dommages.flatMap((dm) => dm.preuves.map((p) => ({ ...p, legende: `Dommage ${zone(dm.zone)}` }))),
    ];
    if (photos.length) {
      paragraphe(`Photos (${photos.length})`, { police: gras, taille: 10 });
      y -= 4;
      await grille(photos);
    }
  }

  // ── Les photos des dommages facturés ─────────────────────────────────
  const preuves = d.facture.lignes.flatMap((l) => l.preuves.map((p) => ({ ...p, legende: l.libelle })));
  const dejaVues = new Set(
    d.etats.flatMap((x) => [...x.photos, ...x.dommages.flatMap((dm) => dm.preuves)]).map((p) => p.chemin),
  );
  const nouvelles = preuves.filter((p) => !dejaVues.has(p.chemin));
  if (nouvelles.length) {
    nouvellePage();
    titre("Photos jointes à la facture");
    await grille(nouvelles);
  }

  pages.forEach((pg, i) => {
    const t = nettoyer(
      `Contestation ${k.reference_banque} — facture ${d.facture.reference} — page ${i + 1} / ${pages.length}`,
      normal,
    );
    pg.drawText(t, {
      x: A4.l - MARGE - normal.widthOfTextAtSize(t, 7.5),
      y: MARGE - 14,
      size: 7.5,
      font: normal,
      color: GRIS,
    });
  });
  return { pdf: await doc.save(), pages: pages.length, integrees };
}

function resumeEtat(e: EtatSigne): string {
  const quoi = e.moment === "depart" ? "départ" : "retour";
  const n = e.photos.length;
  const photos = n ? `, ${n} photo${n > 1 ? "s" : ""} datée${n > 1 ? "s" : ""}` : "";
  const dommages = e.dommages.length
    ? `, ${e.dommages.length} dommage${e.dommages.length > 1 ? "s" : ""} noté${e.dommages.length > 1 ? "s" : ""}`
    : e.moment === "depart"
    ? ", aucun dommage noté"
    : "";
  return e.statut === "signe"
    ? `État des lieux de ${quoi} signé par ${e.signataire_nom ?? "le locataire"} le ${
      quand(e.signe_le)
    }${photos}${dommages}.`
    : `État des lieux de ${quoi} : le locataire a refusé de signer (${
      e.refus_motif ?? "sans motif"
    }), refus constaté le ${quand(e.refuse_le)}${photos}${dommages}.`;
}
