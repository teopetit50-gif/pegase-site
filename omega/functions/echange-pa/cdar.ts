// Messages CDAR (UN/CEFACT Cross Domain Acknowledgement and Response, D22B) : le support des
// statuts de cycle de vie de la réforme. Fabrication d'un message de traitement (TypeCode 23)
// pour les statuts qu'une entreprise émet (204 à 212), et lecture tolérante d'un message reçu.
//
// ATTENTION : fabrication écrite d'après la description publique de la norme AFNOR
// XP Z12-012 (blocs ExchangedDocumentContext, ExchangedDocument, AcknowledgementDocument ;
// règles BR-FR-CDV-01 à 14), pas d'après le XSD lui-même. Avant le premier envoi réel, le
// message doit passer le XSD CDAR D22B et le Schematron BR-FR-CDV de la PA choisie
// (bac à sable). Le socle peut aussi fournir le CDAR tout fait (champ `chemin`) : l'ouvrier le
// dépose alors tel quel.

import { STATUTS_CYCLE_DE_VIE } from "./pa.ts";

const NS = {
  rsm:
    "urn:un:unece:uncefact:data:standard:CrossDomainAcknowledgementAndResponse:100",
  ram:
    "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
  udt: "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
  qdt: "urn:un:unece:uncefact:data:standard:QualifiedDataType:100",
};
/** Profil des échanges de cycle de vie entre plateformes (MDT-3). */
export const PROFIL_CDV = "urn:cpro.gouv.fr:1p0:CDV:invoice";

export type Partie = {
  /** SIREN (schéma 0002). */
  siren: string;
  nom?: string | null;
  /** Rôle UNTDID 3035 : BY acheteur, SE vendeur. */
  role: "BY" | "SE";
};

export type StatutAEmettre = {
  /** Identifiant du message, unique : l'id Omega du statut. */
  message: string;
  /** Horodatage du statut (ISO 8601). */
  emis_le: string;
  /** Code de cycle de vie, 200 à 213. */
  code: string;
  facture: {
    numero: string;
    /** AAAA-MM-JJ */
    date: string;
    /** UNTDID 1001 : 380 facture, 381 avoir, 386 acompte… */
    type_code?: string | null;
    /** SIREN de l'émetteur de la facture. */
    emetteur_siren: string;
  };
  emetteur: Partie;
  destinataire: Partie;
  motif?: { code: string; texte?: string | null } | null;
  /** Montant encaissé ou payé (obligatoire pour 212, BR-FR-CDV-14). */
  montant?: { valeur: string; devise: string } | null;
};

export class ErreurCdar extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurCdar";
  }
}

function echapper(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 2026-10-06T14:30:05Z → 20261006143005 (format 204). */
function horodatage204(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new ErreurCdar(`horodatage illisible : ${iso}`);
  }
  return d.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

/** 2026-10-06 → 20261006 (format 102). */
function date102(jour: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) {
    throw new ErreurCdar(`date de facture illisible : ${jour}`);
  }
  return jour.replace(/-/g, "");
}

function partie(balise: string, p: Partie): string {
  if (!/^\d{9}$/.test(p.siren)) {
    throw new ErreurCdar(`SIREN invalide : ${p.siren}`);
  }
  return `<ram:${balise}>` +
    `<ram:GlobalID schemeID="0002">${p.siren}</ram:GlobalID>` +
    (p.nom ? `<ram:Name>${echapper(p.nom)}</ram:Name>` : "") +
    `<ram:RoleCode>${p.role}</ram:RoleCode>` +
    `</ram:${balise}>`;
}

/** Règles vérifiées avant fabrication : celles qu'on peut tenir sans le XSD. */
export function verifierStatut(s: StatutAEmettre): void {
  const libelle = STATUTS_CYCLE_DE_VIE[s.code];
  if (!libelle) {
    throw new ErreurCdar(`code de cycle de vie inconnu : ${s.code}`);
  }
  if (!s.message?.trim()) {
    throw new ErreurCdar("identifiant de message absent (BR-FR-CDV-03)");
  }
  if (!s.facture?.numero?.trim()) {
    throw new ErreurCdar("numéro de facture absent (BR-FR-CDV-10)");
  }
  if (s.code === "212" && !s.montant) {
    throw new ErreurCdar("statut 212 sans montant encaissé (BR-FR-CDV-14)");
  }
  if (
    (s.code === "210" || s.code === "207" || s.code === "206") && !s.motif?.code
  ) {
    throw new ErreurCdar(`statut ${s.code} sans motif`);
  }
}

export function fabriquerCdar(s: StatutAEmettre): string {
  verifierStatut(s);
  const libelle = STATUTS_CYCLE_DE_VIE[s.code];
  const statutDoc = s.motif || s.montant
    ? "<ram:SpecifiedDocumentStatus>" +
      (s.motif
        ? `<ram:ReasonCode>${echapper(s.motif.code)}</ram:ReasonCode>`
        : "") +
      (s.motif?.texte
        ? `<ram:Reason>${echapper(s.motif.texte.slice(0, 1000))}</ram:Reason>`
        : "") +
      (s.montant
        ? "<ram:SpecifiedDocumentCharacteristic><ram:TypeCode>MEN</ram:TypeCode>" +
          `<ram:ValueAmount currencyID="${echapper(s.montant.devise)}">${
            echapper(s.montant.valeur)
          }</ram:ValueAmount></ram:SpecifiedDocumentCharacteristic>`
        : "") +
      "</ram:SpecifiedDocumentStatus>"
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rsm:CrossDomainAcknowledgementAndResponse xmlns:rsm="${NS.rsm}" xmlns:ram="${NS.ram}" xmlns:udt="${NS.udt}" xmlns:qdt="${NS.qdt}">` +
    "<rsm:ExchangedDocumentContext>" +
    `<ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${PROFIL_CDV}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>` +
    "</rsm:ExchangedDocumentContext>" +
    "<rsm:ExchangedDocument>" +
    `<ram:ID>${echapper(s.message)}</ram:ID>` +
    `<ram:Name>${echapper(libelle)}</ram:Name>` +
    `<ram:IssueDateTime><udt:DateTimeString format="204">${
      horodatage204(s.emis_le)
    }</udt:DateTimeString></ram:IssueDateTime>` +
    partie("SenderTradeParty", s.emetteur) +
    partie("RecipientTradeParty", s.destinataire) +
    "</rsm:ExchangedDocument>" +
    "<rsm:AcknowledgementDocument>" +
    "<ram:MultipleReferencesIndicator><udt:Indicator>false</udt:Indicator></ram:MultipleReferencesIndicator>" +
    "<ram:TypeCode>23</ram:TypeCode>" +
    `<ram:IssueDateTime><udt:DateTimeString format="204">${
      horodatage204(s.emis_le)
    }</udt:DateTimeString></ram:IssueDateTime>` +
    "<ram:ReferenceReferencedDocument>" +
    `<ram:IssuerAssignedID>${
      echapper(s.facture.numero)
    }</ram:IssuerAssignedID>` +
    `<ram:TypeCode>${echapper(s.facture.type_code ?? "380")}</ram:TypeCode>` +
    `<ram:FormattedIssueDateTime><qdt:DateTimeString format="102">${
      date102(s.facture.date)
    }</qdt:DateTimeString></ram:FormattedIssueDateTime>` +
    `<ram:ProcessConditionCode>${s.code}</ram:ProcessConditionCode>` +
    `<ram:ProcessCondition>${echapper(libelle)}</ram:ProcessCondition>` +
    `<ram:IssuerTradeParty><ram:GlobalID schemeID="0002">${
      echapper(s.facture.emetteur_siren)
    }</ram:GlobalID></ram:IssuerTradeParty>` +
    statutDoc +
    "</ram:ReferenceReferencedDocument>" +
    "</rsm:AcknowledgementDocument>" +
    "</rsm:CrossDomainAcknowledgementAndResponse>\n";
}

/** Ce qu'on retient d'un CDAR reçu ; le document entier est gardé au bucket. */
export type CdarLu = {
  message: string | null;
  code: string | null;
  libelle: string | null;
  facture: string | null;
  motif: string | null;
};

function premier(xml: string, balise: string): string | null {
  const m = xml.match(
    new RegExp(
      `<(?:[A-Za-z0-9_]+:)?${balise}(?:\\s[^>]*)?>([^<]*)</(?:[A-Za-z0-9_]+:)?${balise}>`,
    ),
  );
  return m ? m[1].trim() : null;
}

/** Lecture tolérante (préfixes quelconques), sans validation : le socle tranche. */
export function lireCdar(xml: string): CdarLu {
  const echange = xml.match(
    /<(?:\w+:)?ExchangedDocument>([\s\S]*?)<\/(?:\w+:)?ExchangedDocument>/,
  );
  const code = premier(xml, "ProcessConditionCode");
  return {
    message: echange ? premier(echange[1], "ID") : null,
    code,
    libelle: code ? STATUTS_CYCLE_DE_VIE[code] ?? null : null,
    facture: premier(xml, "IssuerAssignedID"),
    motif: premier(xml, "ReasonCode"),
  };
}
