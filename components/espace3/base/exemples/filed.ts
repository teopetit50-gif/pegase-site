/* FILED d'exemple — les factures fournisseurs reçues par le Groupe Soléa
   (05/10/2026, repris le 30/10/2026 pour /espace3 : dix-huit sociétés).
   Formes : components/espace/types.ts (= filed_documents, filed_factures,
   filed_controles, filed_levees, pieces, pieces_valeurs…).

   Les PIÈCES sont décrites par leurs valeurs lues (champ, texte, page,
   boîte en fractions de page) : la visionneuse d'exemple DESSINE la page à
   partir de ces valeurs — ce qui est surligné est exactement ce qui est
   cité. En base réelle, c'est l'image de la pièce (URL signée) qui prend
   la place du dessin, les boîtes sont les mêmes. */

import type { Commande, DossierFiled, Facture, LigneCommande, MotifRefus } from "../types";
import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI, ENTITES, SIEGE, AGENCE, LAMENTIN, AUTO_GP, IMPORT, BRICO_MQ, ilYa, dans, CLAIRE, SOFIA } from "./socle";

const C = EXEMPLE_CLIENT_ID;
const u = (p: string, n: number) => `00000000-0000-4000-8000-00000000${p}${n.toString(16).padStart(2, "0")}`;

/* les autres sociétés du groupe citées par les factures d'exemple */
const FROID = ENTITES[14].id;
const IMMO = ENTITES[16].id;

/* l'acheteur porté sur chaque facture : la société du groupe qui la reçoit */
const ACHETEURS: Record<string, { nom: string; siren: string; adresse: string }> = {
  [SIEGE]: { nom: "Soléa Holding SAS", siren: "842 015 337", adresse: "Immeuble Soléa, boulevard de Houelbourg, 97122 Baie-Mahault" },
  [AGENCE]: { nom: "Soléa Market Jarry SAS", siren: "842 015 402", adresse: "Centre commercial de Jarry, 97122 Baie-Mahault" },
  [LAMENTIN]: { nom: "Soléa Market Lamentin SAS", siren: "842 015 519", adresse: "Zone de la Lézarde, 97232 Le Lamentin" },
  [AUTO_GP]: { nom: "Soléa Auto Guadeloupe SAS", siren: "842 016 044", adresse: "Rue Alexander Fleming, ZI de Jarry, 97122 Baie-Mahault" },
  [IMPORT]: { nom: "Soléa Import SAS", siren: "842 016 127", adresse: "Zone portuaire de Jarry, 97122 Baie-Mahault" },
  [BRICO_MQ]: { nom: "Brico Soléa Martinique SAS", siren: "842 016 283", adresse: "Place d'Armes, 97232 Le Lamentin" },
  [FROID]: { nom: "Soléa Froid SAS", siren: "842 017 091", adresse: "Zone de Moudong Sud, 97122 Baie-Mahault" },
  [IMMO]: { nom: "Soléa Immobilier SAS", siren: "842 017 216", adresse: "Immeuble Soléa, boulevard de Houelbourg, 97122 Baie-Mahault" },
};
const acheteur = (entite: string) => ACHETEURS[entite] ?? ACHETEURS[SIEGE];

/* Les motifs officiels de refus (filed_motifs_refus) : les 40 codes de la
   plateforme de facturation électronique, transmis par le coordinateur le
   05/10 (lot 19). L'exemple les porte à l'identique ; en base réelle la
   table est lue telle quelle. */
export const MOTIFS_EXEMPLE: MotifRefus[] = [
  ["ADR_ERR", "Adresse de facturation électronique erronée"],
  ["ANNUL_ENC", "Encaissement non réalisé ou annulation d'encaissement"],
  ["ART_ERR", "Article facturé incorrect"],
  ["AUT_MOTIF_ERR_VALIDEUR", "Autre motif que « Erreur de valideur »"],
  ["AUTRE", "Autre"],
  ["CALCUL_ERR", "Erreur de calcul de la facture"],
  ["CMD_EJ_ERR", "Numéro de commande ou d'engagement incorrect ou manquant"],
  ["CODE_ROUTAGE_ERR", "Code de routage absent ou erroné"],
  ["CONTACT_ACHTR", "Autres : contacter votre acheteur"],
  ["CONTRAT_TERM", "Contrat terminé"],
  ["COORD_BANC_ERR", "Erreur de coordonnées bancaires"],
  ["CREANCIER_ERR", "Créancier inconnu ou différent de celui du marché ou de la commande"],
  ["DEST_ERR", "Erreur de destinataire"],
  ["DEST_INC", "Destinataire inconnu"],
  ["DOUBLE_FACT", "Données réglementaires F1 en doublon"],
  ["DOUBLON", "Facture en doublon (déjà émise ou reçue)"],
  ["EMMET_INC", "Émetteur inconnu"],
  ["ERR_VALIDEUR", "Mauvais valideur"],
  ["FACT_NON_CONFORME", "Facture non conforme à la commande"],
  ["JUSTIF_ABS", "Justificatif absent ou insuffisant"],
  ["LIVR_INCOMP", "Livraison incomplète ou non effectuée"],
  ["MARCHE_TERM", "Marché terminé"],
  ["MODPAI_ERR", "Modalités de paiement incorrectes"],
  ["MONTANT_ERR", "Montant de la facture erroné"],
  ["MONTANTTOTAL_ERR", "Montant total erroné"],
  ["NON_CONFORME", "Mention légale manquante"],
  ["PU_ERR", "Prix unitaires incorrects"],
  ["QTE_ERR", "Quantité facturée incorrecte"],
  ["QUALITE_ERR", "Qualité d'article livré incorrecte"],
  ["REF_CT_ABSENT", "Référence contractuelle nécessaire au traitement manquante"],
  ["REF_ERR", "Référence incorrecte"],
  ["REM_ERR", "Remise erronée"],
  ["ROUTAGE_ERR", "Erreur de routage"],
  ["SE_ERR", "Service destinataire incorrect"],
  ["SIRET_ERR", "SIRET erroné ou absent"],
  ["ST_CT_NON_DECLAR", "Sous-traitant ou cotraitant non déclaré"],
  ["SUPPR_COMP_AVOIR", "Suppression pour compensation d'avoirs"],
  ["TRANSAC_INC", "Transaction inconnue"],
  ["TRANSF_PMNT_REGIE", "Transfert pour paiement en régie"],
  ["TX_TVA_ERR", "Taux de TVA erroné"],
].map(([code, libelle]) => ({ code, libelle, description: null }));

/* ——— un gabarit de facture : les boîtes communes à toutes les factures
   dessinées (page A4 portrait, fractions de page) ——— */
type V = { champ: string; texte: string; valeur?: unknown; boite: [number, number, number, number]; verifiee?: boolean; confiance?: number; source?: "xml" | "regle" | "ia" | "tableur" | "humain" };

function valeurs(pieceId: string, liste: V[]) {
  return liste.map((v, i) => ({
    id: `${pieceId.slice(0, -2)}${(i + 1).toString(16).padStart(2, "0")}`.replace(/^0000/, "0001"),
    champ: v.champ,
    valeur: v.valeur ?? v.texte,
    texte: v.texte,
    page: 1,
    boite: { x: v.boite[0], y: v.boite[1], l: v.boite[2], h: v.boite[3] },
    source: v.source ?? "ia",
    confiance: v.confiance ?? 0.97,
    verifiee: v.verifiee ?? false,
  }));
}

function facture(
  n: number,
  o: {
    fournisseur: { nom: string; siren: string; tva: string; adresse: string; iban: string; code: string; statut?: "a_confirmer" | "actif" | "bloque" | "refuse" };
    numero: string;
    emission: string;
    echeance: string;
    ht: number;
    tva: number;
    ttc: number;
    taux: number;
    lignes: { designation: string; quantite: number; unite: string; pu: number; commande_ligne?: string }[];
    nature?: "facture" | "avoir";
    verifiees?: boolean;
    entite?: string;
  },
) {
  const pieceId = u("ee", n);
  const ach = acheteur(o.entite ?? SIEGE);
  const vals: V[] = [
    { champ: "fournisseur.nom", texte: o.fournisseur.nom, boite: [0.07, 0.06, 0.4, 0.035], verifiee: o.verifiees },
    { champ: "fournisseur.siren", texte: `SIREN ${o.fournisseur.siren}`, valeur: o.fournisseur.siren, boite: [0.07, 0.1, 0.22, 0.022], verifiee: o.verifiees, source: "regle" },
    { champ: "fournisseur.tva", texte: o.fournisseur.tva, boite: [0.07, 0.125, 0.22, 0.022], verifiee: o.verifiees, source: "regle" },
    { champ: "facture.numero", texte: o.numero, boite: [0.62, 0.13, 0.31, 0.03], verifiee: o.verifiees },
    { champ: "facture.date_emission", texte: o.emission, boite: [0.62, 0.165, 0.31, 0.025], verifiee: o.verifiees },
    { champ: "facture.echeance", texte: o.echeance, boite: [0.62, 0.19, 0.31, 0.025], verifiee: o.verifiees, confiance: 0.86 },
    { champ: "acheteur.nom", texte: ach.nom, boite: [0.07, 0.24, 0.35, 0.03], verifiee: true },
    { champ: "totaux.ht", texte: euro(o.ht), valeur: o.ht, boite: [0.72, 0.655, 0.21, 0.028], verifiee: o.verifiees, source: "regle" },
    { champ: "totaux.tva", texte: euro(o.tva), valeur: o.tva, boite: [0.72, 0.688, 0.21, 0.028], verifiee: o.verifiees, source: "regle" },
    { champ: "totaux.ttc", texte: euro(o.ttc), valeur: o.ttc, boite: [0.72, 0.724, 0.21, 0.034], verifiee: o.verifiees, source: "regle" },
    { champ: "paiement.iban", texte: o.fournisseur.iban, boite: [0.07, 0.86, 0.5, 0.028], verifiee: o.verifiees, confiance: 0.91 },
  ];
  o.lignes.forEach((l, i) => {
    vals.push({ champ: `lignes.${i + 1}.designation`, texte: l.designation, boite: [0.07, 0.4 + i * 0.045, 0.45, 0.03] });
    vals.push({ champ: `lignes.${i + 1}.montant_ht`, texte: euro(l.quantite * l.pu), valeur: l.quantite * l.pu, boite: [0.78, 0.4 + i * 0.045, 0.15, 0.03], source: "regle" });
  });
  const fac: Facture = {
    id: u("fa", n),
    document_id: u("dd", n),
    nature: o.nature ?? "facture",
    version: 1,
    numero: o.numero,
    date_emission: isoFr(o.emission),
    date_reception: null,
    echeance_lue: isoFr(o.echeance),
    devise: "EUR",
    montant_ht: o.ht,
    montant_tva: o.tva,
    montant_ttc: o.ttc,
    net_a_payer: o.ttc,
    regime_tva: "normal",
    fournisseur_id: u("ff", n),
    fournisseur_identification: "siren",
    fournisseur_lu: { nom: o.fournisseur.nom, siren: o.fournisseur.siren, tva: o.fournisseur.tva, adresse: o.fournisseur.adresse },
    acheteur_lu: { nom: ach.nom, siren: ach.siren, adresse: ach.adresse },
    iban: o.fournisseur.iban.replace(/\s+/g, ""),
    refs: {},
    mentions: {},
    champs_douteux: [],
    statut: "a_valider",
    anomalies: [],
    nb_bloquants: 0,
    nb_attention: 0,
    controle_le: ilYa(0, 7),
    commande_id: null,
    avoir_de: null,
  };
  return {
    facture: fac,
    piece: {
      id: pieceId,
      nom_fichier: `${o.fournisseur.code.toLowerCase()}-${o.numero.replace(/[^A-Za-z0-9-]/g, "")}.pdf`,
      mime: "application/pdf",
      chemin: `${C}/filed_document/${u("dd", n)}/facture.pdf`,
      nb_pages: 1,
      statut: "lue",
      type_piece: o.nature === "avoir" ? "avoir" : "facture",
      methode: "natif",
    },
    pages: [{ n: 1, texte: "", largeur: 595, hauteur: 842 }],
    valeurs: valeurs(pieceId, vals),
    fournisseur: {
      id: u("ff", n),
      code: o.fournisseur.code,
      nom: o.fournisseur.nom,
      siren: o.fournisseur.siren,
      siret: null,
      tva: o.fournisseur.tva,
      pays: "FR",
      statut: o.fournisseur.statut ?? "actif",
      regime_tva: "normal",
    },
    lignes: o.lignes.map((l, i) => ({
      id: u("11", n * 10 + i),
      rang: i + 1,
      designation: l.designation,
      quantite: l.quantite,
      unite: l.unite,
      prix_unitaire: l.pu,
      remise: null,
      montant_ht: Math.round(l.quantite * l.pu * 100) / 100,
      taux_tva: o.taux,
      commande_ligne: l.commande_ligne ?? null,
    })),
    tva: [{ id: u("22", n), categorie: "S", taux: o.taux, base: o.ht, montant: o.tva }],
  };
}

function euro(v: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
}
function isoFr(d: string): string {
  const [j, m, a] = d.split("/");
  return `${a}-${m}-${j}`;
}
function fr(iso: string): string {
  const d = new Date(iso);
  return `${`${d.getDate()}`.padStart(2, "0")}/${`${d.getMonth() + 1}`.padStart(2, "0")}/${d.getFullYear()}`;
}

/* Les fournisseurs d'exemple du groupe (fictifs) : transitaire, emballages,
   informatique, électricité, imprimerie, pneumatiques, transport, audit. */
const KARUKERA = { nom: "Karukera Transit SARL", siren: "512 448 101", tva: "FR 45 512448101", adresse: "Zone portuaire de Jarry, 97122 Baie-Mahault", iban: "FR76 3000 4000 0512 3456 7890 143", code: "KARUKERA" };
const EMBALLAGES = { nom: "Antilles Emballages SAS", siren: "398 772 541", tva: "FR 48 398772541", adresse: "Rue Ferdinand Forest, ZI de Jarry, 97122 Baie-Mahault", iban: "FR76 1010 7006 0100 0203 0450 183", code: "ANTEMB" };
const NUMERIQUE = { nom: "Antilles Numérique Services", siren: "833 110 257", tva: "FR 71 833110257", adresse: "Immeuble Les Hauts de Californie, 97232 Le Lamentin", iban: "FR76 1820 6000 7865 4321 0987 612", code: "ANS" };
const LAFLEUR = { nom: "Imprimerie Lafleur SAS", siren: "421 937 053", tva: "FR 68 421937053", adresse: "12 rue Frébault, 97110 Pointe-à-Pitre", iban: "FR76 1009 6180 1100 0456 7812 044", code: "LAFLEUR" };
const EDF = { nom: "EDF Archipel Guadeloupe", siren: "552 081 317", tva: "FR 03 552081317", adresse: "Boulevard de Bergevin, 97110 Pointe-à-Pitre", iban: "FR76 3000 3030 2000 0500 0123 456", code: "EDFARCH" };

function doc(n: number, o: Partial<DossierFiled["document"]> & { reference: string; nom_fichier: string; recu_le: string; etat: DossierFiled["document"]["etat"] }): DossierFiled["document"] {
  return {
    id: u("dd", n),
    client_id: C,
    entite_id: SIEGE,
    piece_id: u("ee", n),
    source: "courriel",
    expediteur: null,
    nature: "facture",
    nature_source: "lecteur",
    doublon_de: null,
    motif: null,
    lu_le: o.recu_le,
    traite_le: null,
    ...o,
  };
}

const hist = (etape: string, message: string, quand: string, acteur: string | null = null, detail: Record<string, unknown> = {}) => ({
  id: `${etape}-${quand}`,
  etape,
  message,
  detail,
  acteur_type: acteur ? ("utilisateur" as const) : ("systeme" as const),
  acteur_libelle: acteur,
  survenu_le: quand,
});

const ctrl = (
  factureId: string,
  code: string,
  gravite: "bloquant" | "attention" | "info",
  resultat: "ok" | "anomalie" | "levee",
  message: string,
  motif_officiel: string | null = null,
  preuve: Record<string, unknown> = {},
  levee_id: string | null = null,
) => ({
  id: `${factureId}-${code}`,
  facture_id: factureId,
  version: 1,
  code,
  famille: code.split(".")[0],
  gravite,
  resultat,
  message,
  motif_officiel,
  preuve,
  cle: "",
  levee_id,
});

/* ——— 1. R2026-000014 — Antilles Emballages (Soléa Market Jarry) : tout passe ——— */
const f14 = facture(14, {
  fournisseur: EMBALLAGES,
  numero: "AE-2026-1187",
  emission: fr(ilYa(4)),
  echeance: fr(dans(26)),
  ht: 3840,
  tva: 326.4,
  ttc: 4166.4,
  taux: 8.5,
  lignes: [
    { designation: "Cartons de préparation 600 × 400 × 400 — palette de 400", quantite: 6, unite: "palette", pu: 412 },
    { designation: "Film étirable 23 µ — rouleau de 300 m", quantite: 90, unite: "rouleau", pu: 15.2 },
  ],
  verifiees: true,
  entite: AGENCE,
});
const D14: DossierFiled = {
  document: doc(14, { reference: "R2026-000014", nom_fichier: "facture-AE-2026-1187.pdf", recu_le: ilYa(4, 10), etat: "integre", expediteur: "compta@antilles-emballages.fr", traite_le: ilYa(4, 10), entite_id: AGENCE }),
  ...f14,
  controles: [
    ctrl(f14.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent et unique chez ce fournisseur."),
    ctrl(f14.facture.id, "mentions.date_present", "bloquant", "ok", "Date d'émission lisible."),
    ctrl(f14.facture.id, "fournisseur.siren_valide", "bloquant", "ok", "SIREN valide (clé de Luhn) et actif au registre.", null, { siren: "398772541" }),
    ctrl(f14.facture.id, "fournisseur.iban_connu", "bloquant", "ok", "IBAN identique à celui validé le 12/03/2026.", null, { iban_masque: "FR76 •••• 0183" }),
    ctrl(f14.facture.id, "tva.coherence", "bloquant", "ok", "3 840,00 € × 8,5 % = 326,40 € : la TVA correspond.", null, { base: 3840, taux: 8.5, attendu: 326.4, lu: 326.4 }),
    ctrl(f14.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC, au centime."),
    ctrl(f14.facture.id, "lignes.somme", "attention", "ok", "La somme des lignes (3 840,00 €) égale le total HT."),
    ctrl(f14.facture.id, "doublon.numero_fournisseur", "bloquant", "ok", "Aucune autre facture AE-2026-1187 reçue."),
    ctrl(f14.facture.id, "echeance.delai_legal", "info", "ok", "Échéance à 30 jours : dans le délai légal (60 jours max)."),
  ],
  levees: [],
  ibans: [{ id: u("ib", 14), fournisseur_id: f14.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 0183", statut: "valide", propose_le: ilYa(200) }],
  appariements: [],
  rapprochement: { id: u("rp", 14), commande_id: null, mode: "aucun", nb_lignes: 2, nb_appariees: 0, nb_sans_commande: 2, ecart_prix: 0, ecart_quantite: 0, deja_facture: 0, non_recu: 0, ecart_montant: null },
  historique: [
    hist("reception", "Reçue par courriel de compta@antilles-emballages.fr.", ilYa(4, 10)),
    hist("lecture", "Lue en 6 s — PDF natif, 1 page, 15 valeurs.", ilYa(4, 10)),
    hist("controles", "9 contrôles passés, 0 anomalie.", ilYa(4, 10)),
    hist("integration", "Intégrée : demande de paiement créée dans la file de validation.", ilYa(4, 10)),
  ],
};
/* approuvée dans la file (demande « Payer la facture R2026-000014 ») : validée, à payer.
   C'est aussi la facture ÉLECTRONIQUE de l'exemple : reçue par la plateforme agréée, ses
   valeurs viennent du fichier structuré (source xml, sans page ni boîte) et font foi. */
D14.facture!.statut = "validee";
D14.facture!.provenance = "structuree";
D14.recuePlateforme = true;
D14.valeurs = D14.valeurs.map((v) => (/^(fournisseur|facture|totaux|paiement|acheteur)\./.test(v.champ) ? { ...v, source: "xml" as const, confiance: 1, verifiee: true, page: null, boite: null } : v));
D14.cycle = [
  { code: 204, libelle: "Prise en charge", survenu_le: ilYa(4, 10), motif_code: null, motif_libelle: null, motif: null, montant: null, etat: "emis", emis_le: ilYa(4, 10), sens: "emis", erreur: null, obligatoire: false },
  { code: 205, libelle: "Approuvée", survenu_le: ilYa(3, 15), motif_code: null, motif_libelle: null, motif: null, montant: null, etat: "a_emettre", emis_le: null, sens: "emis", erreur: null, obligatoire: false },
];
D14.ecritures = [];
D14.litiges = [];

/* ——— 2. R2026-000009 — Karukera Transit (Soléa Import) : IBAN changé → bloquée ——— */
const f09 = facture(9, {
  fournisseur: { ...KARUKERA, statut: "actif" },
  numero: "KT-2026-0412",
  emission: fr(ilYa(9)),
  echeance: fr(dans(21)),
  ht: 33180,
  tva: 2820.3,
  ttc: 36000.3,
  taux: 8.5,
  lignes: [
    { designation: "Fret maritime Le Havre → Pointe-à-Pitre — conteneur 40 pieds", quantite: 6, unite: "conteneur", pu: 4950, commande_ligne: "BC-2026-0064/1" },
    { designation: "Formalités de dédouanement — un dossier par conteneur", quantite: 6, unite: "dossier", pu: 380, commande_ligne: "BC-2026-0064/2" },
    { designation: "Manutention portuaire et livraison à l'entrepôt", quantite: 1, unite: "forfait", pu: 1200, commande_ligne: "BC-2026-0064/3" },
  ],
  entite: IMPORT,
});
f09.facture.statut = "bloquee";
f09.facture.anomalies = ["fournisseur.iban_connu", "tva.arrondi"];
f09.facture.nb_bloquants = 1;
f09.facture.nb_attention = 1;
f09.facture.champs_douteux = ["paiement.iban"];
f09.facture.commande_id = u("bc", 64);
const D09: DossierFiled = {
  document: doc(9, { reference: "R2026-000009", nom_fichier: "Facture_KT-2026-0412.pdf", recu_le: ilYa(9, 14), etat: "a_traiter", expediteur: "facturation@karukera-transit.fr", entite_id: IMPORT }),
  ...f09,
  controles: [
    ctrl(f09.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent."),
    ctrl(f09.facture.id, "mentions.date_present", "bloquant", "ok", "Date d'émission lisible."),
    ctrl(f09.facture.id, "fournisseur.siren_valide", "bloquant", "ok", "SIREN valide et actif au registre."),
    ctrl(
      f09.facture.id,
      "fournisseur.iban_connu",
      "bloquant",
      "anomalie",
      "L'IBAN porté sur la facture (FR76 3000 •••• 0143) n'est pas celui validé pour Karukera Transit (FR76 1027 •••• 0183). Confirmer par téléphone au numéro connu avant toute levée.",
      "COORD_BANC_ERR",
      { iban_lu: "FR76 3000 •••• 0143", iban_connu: "FR76 1027 •••• 0183", page: 1, champ: "paiement.iban" },
    ),
    ctrl(f09.facture.id, "tva.coherence", "bloquant", "ok", "33 180,00 € × 8,5 % = 2 820,30 € : la TVA correspond."),
    ctrl(f09.facture.id, "tva.arrondi", "attention", "anomalie", "La TVA de la ligne 3 (102,00 €) est arrondie différemment du total ; écart de 0,00 € après recalcul — à confirmer.", "CALCUL_ERR", { ligne: 3, attendu: 102, lu: 102 }),
    ctrl(f09.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC."),
    ctrl(f09.facture.id, "rapprochement.commande_citee", "attention", "ok", "La facture cite BC-2026-0064 ; commande acceptée le 02/09.", null, { commande: "BC-2026-0064" }),
    ctrl(f09.facture.id, "rapprochement.prix_ligne", "attention", "ok", "3 lignes appariées, prix identiques à la commande."),
    ctrl(f09.facture.id, "doublon.numero_fournisseur", "bloquant", "ok", "Aucune autre facture KT-2026-0412 (R2026-000010 est marquée doublon de celle-ci)."),
  ],
  levees: [],
  ibans: [
    { id: u("ib", 9), fournisseur_id: f09.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 0183", statut: "valide", propose_le: ilYa(300) },
    { id: u("ib", 19), fournisseur_id: f09.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 0143", statut: "propose", propose_le: ilYa(9, 14) },
  ],
  appariements: [
    { facture_ligne_id: u("11", 90), commande_ligne_id: u("cl", 1) },
    { facture_ligne_id: u("11", 91), commande_ligne_id: u("cl", 2) },
    { facture_ligne_id: u("11", 92), commande_ligne_id: u("cl", 3) },
  ],
  rapprochement: { id: u("rp", 9), commande_id: u("bc", 64), mode: "lignes", nb_lignes: 3, nb_appariees: 3, nb_sans_commande: 0, ecart_prix: 0, ecart_quantite: 0, deja_facture: 0, non_recu: 0, ecart_montant: 0 },
  historique: [
    hist("reception", "Reçue par courriel de facturation@karukera-transit.fr.", ilYa(9, 14)),
    hist("lecture", "Lue en 8 s — PDF natif, 1 page, 17 valeurs.", ilYa(9, 14)),
    hist("controles", "10 contrôles : 1 anomalie bloquante (IBAN), 1 à vérifier (arrondi TVA).", ilYa(9, 14)),
    hist("blocage", "Facture bloquée : IBAN non reconnu. Un nouvel IBAN est proposé pour Karukera Transit, en attente de décision.", ilYa(9, 14)),
    hist("demande", "Demande de levée créée par Patrick Bellay — 2 approbations requises.", ilYa(0, 10), "Patrick Bellay"),
  ],
};

/* ——— 3. R2026-000011 — Antilles Numérique (Soléa Market Lamentin) : écart de prix avec la commande → litige ——— */
const f11 = facture(11, {
  fournisseur: NUMERIQUE,
  numero: "ANS-26-00931",
  emission: fr(ilYa(6)),
  echeance: fr(dans(24)),
  ht: 35280,
  tva: 2998.8,
  ttc: 38278.8,
  taux: 8.5,
  lignes: [
    { designation: "Terminal de caisse tactile 15 pouces", quantite: 24, unite: "pièce", pu: 1290, commande_ligne: "BC-2026-0077/1" },
    { designation: "Imprimante de tickets thermique", quantite: 24, unite: "pièce", pu: 180, commande_ligne: "BC-2026-0077/2" },
  ],
  entite: LAMENTIN,
});
f11.facture.statut = "a_valider";
f11.facture.anomalies = ["rapprochement.prix_ligne"];
f11.facture.nb_attention = 1;
f11.facture.commande_id = u("bc", 77);
const D11: DossierFiled = {
  document: doc(11, { reference: "R2026-000011", nom_fichier: "ANS-26-00931.pdf", recu_le: ilYa(6, 9), etat: "a_traiter", expediteur: "facturation@antilles-numerique.fr", entite_id: LAMENTIN }),
  ...f11,
  controles: [
    ctrl(f11.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent."),
    ctrl(f11.facture.id, "fournisseur.siren_valide", "bloquant", "ok", "SIREN valide et actif."),
    ctrl(f11.facture.id, "fournisseur.iban_connu", "bloquant", "ok", "IBAN identique à celui validé."),
    ctrl(f11.facture.id, "tva.coherence", "bloquant", "ok", "35 280,00 € × 8,5 % = 2 998,80 €."),
    ctrl(f11.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC."),
    ctrl(
      f11.facture.id,
      "rapprochement.prix_ligne",
      "attention",
      "anomalie",
      "Ligne 1 : 1 290,00 € facturés contre 1 240,00 € sur la commande BC-2026-0077 (+ 50,00 € × 24 = + 1 200,00 €). Ligne 2 conforme.",
      "PU_ERR",
      { commande: "BC-2026-0077", ligne: 1, prix_commande: 1240, prix_facture: 1290, ecart_total: 1200 },
    ),
    ctrl(f11.facture.id, "rapprochement.quantite_ligne", "attention", "ok", "Quantités identiques à la commande (24 et 24)."),
    ctrl(f11.facture.id, "doublon.numero_fournisseur", "bloquant", "ok", "Aucune autre facture ANS-26-00931."),
  ],
  levees: [],
  ibans: [{ id: u("ib", 11), fournisseur_id: f11.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 7612", statut: "valide", propose_le: ilYa(120) }],
  appariements: [
    { facture_ligne_id: u("11", 110), commande_ligne_id: u("cl", 4) },
    { facture_ligne_id: u("11", 111), commande_ligne_id: u("cl", 5) },
  ],
  rapprochement: { id: u("rp", 11), commande_id: u("bc", 77), mode: "lignes", nb_lignes: 2, nb_appariees: 2, nb_sans_commande: 0, ecart_prix: 1200, ecart_quantite: 0, deja_facture: 0, non_recu: 0, ecart_montant: 1200 },
  historique: [
    hist("reception", "Reçue par courriel de facturation@antilles-numerique.fr.", ilYa(6, 9)),
    hist("lecture", "Lue en 5 s — PDF natif, 1 page.", ilYa(6, 9)),
    hist("controles", "8 contrôles : 1 écart avec la commande (prix ligne 1).", ilYa(6, 9)),
    hist("litige", "Mise en litige : écart de 1 200,00 € signalé au fournisseur.", ilYa(5, 11), "Hélène Laurent"),
  ],
};

/* ——— 4. R2026-000012 — avoir Karukera Transit ——— */
const f12 = facture(12, {
  fournisseur: KARUKERA,
  numero: "AV-2026-0031",
  emission: fr(ilYa(2)),
  echeance: fr(ilYa(2)),
  ht: 1200,
  tva: 102,
  ttc: 1302,
  taux: 8.5,
  nature: "avoir",
  lignes: [{ designation: "Annulation « Manutention portuaire » — déjà comprise dans le forfait fret", quantite: 1, unite: "forfait", pu: 1200 }],
  entite: IMPORT,
});
f12.facture.avoir_de = f09.facture.id;
const D12: DossierFiled = {
  document: doc(12, { reference: "R2026-000012", nom_fichier: "Avoir_AV-2026-0031.pdf", recu_le: ilYa(2, 16), etat: "a_traiter", nature: "avoir", expediteur: "facturation@karukera-transit.fr", entite_id: IMPORT }),
  ...f12,
  controles: [
    ctrl(f12.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro d'avoir présent."),
    ctrl(f12.facture.id, "avoir.facture_corrigee", "attention", "ok", "L'avoir cite KT-2026-0412, retrouvée (R2026-000009).", null, { facture: "KT-2026-0412" }),
    ctrl(f12.facture.id, "tva.coherence", "bloquant", "ok", "1 200,00 € × 8,5 % = 102,00 €."),
    ctrl(f12.facture.id, "fournisseur.iban_connu", "bloquant", "ok", "Pas de paiement : un avoir ne porte pas d'IBAN exigible."),
  ],
  levees: [],
  ibans: [],
  appariements: [],
  rapprochement: null,
  historique: [
    hist("reception", "Reçu par courriel de facturation@karukera-transit.fr.", ilYa(2, 16)),
    hist("lecture", "Lu en 4 s — avoir reconnu, rattaché à KT-2026-0412.", ilYa(2, 16)),
    hist("controles", "4 contrôles passés.", ilYa(2, 16)),
  ],
};

/* ——— 5. R2026-000010 — doublon de R2026-000009 ——— */
const D10: DossierFiled = {
  document: doc(10, { reference: "R2026-000010", nom_fichier: "Facture_KT-2026-0412 (1).pdf", recu_le: ilYa(8, 8), etat: "doublon", doublon_de: u("dd", 9), expediteur: "facturation@karukera-transit.fr", motif: "Même fournisseur, même numéro, même empreinte que R2026-000009.", traite_le: ilYa(8, 8), entite_id: IMPORT }),
  facture: null,
  lignes: [],
  tva: [],
  controles: [],
  levees: [],
  fournisseur: null,
  ibans: [],
  appariements: [],
  rapprochement: null,
  piece: { id: u("ee", 10), nom_fichier: "Facture_KT-2026-0412 (1).pdf", mime: "application/pdf", chemin: `${C}/filed_document/${u("dd", 10)}/doublon.pdf`, nb_pages: 1, statut: "lue", type_piece: "facture", methode: "natif" },
  pages: [{ n: 1, texte: "", largeur: 595, hauteur: 842 }],
  valeurs: [],
  historique: [
    hist("reception", "Reçue par courriel (renvoi).", ilYa(8, 8)),
    hist("doublon", "Écartée : doublon de R2026-000009 (même SHA-256).", ilYa(8, 8), null, { doublon_de: "R2026-000009" }),
  ],
};

/* ——— 6. R2026-000013 — à classer (le lecteur hésite), Soléa Immobilier ——— */
const D13: DossierFiled = {
  document: doc(13, { reference: "R2026-000013", nom_fichier: "scan_20261001_0932.pdf", recu_le: ilYa(3, 9), etat: "a_classer", nature: null, nature_source: null, source: "depot", expediteur: null, depose_par: EXEMPLE_MOI, entite_id: IMMO, motif: "Le lecteur hésite entre devis et bon de commande (confiance 0,52)." } as never),
  facture: null,
  lignes: [],
  tva: [],
  controles: [],
  levees: [],
  fournisseur: null,
  ibans: [],
  appariements: [],
  rapprochement: null,
  piece: { id: u("ee", 13), nom_fichier: "scan_20261001_0932.pdf", mime: "application/pdf", chemin: `${C}/filed_document/${u("dd", 13)}/scan.pdf`, nb_pages: 2, statut: "a_classer", type_piece: null, methode: "ocr" },
  pages: [
    { n: 1, texte: "CLIMATISATION ANTILLES SERVICES\nDevis n° D-2026-218\n\nRemplacement de 4 centrales de climatisation\nGalerie du centre commercial — fourniture et pose\n\nTotal HT 48 500,00 €\nTVA 8,5 % 4 122,50 €\nTotal TTC 52 622,50 €\n\nBon pour accord : ____________", largeur: 595, hauteur: 842 },
    { n: 2, texte: "Conditions générales de vente\n\nAcompte de 30 % à la commande.\nSolde à la réception des travaux.\nDélai : 8 semaines après acceptation.", largeur: 595, hauteur: 842 },
  ],
  valeurs: [
    { id: u("1e", 1), champ: "document.type", valeur: "devis", texte: "Devis n° D-2026-218", page: 1, boite: { x: 0.07, y: 0.12, l: 0.35, h: 0.03 }, source: "ia", confiance: 0.52, verifiee: false },
    { id: u("1e", 2), champ: "totaux.ttc", valeur: 52622.5, texte: "Total TTC 52 622,50 €", page: 1, boite: { x: 0.07, y: 0.5, l: 0.4, h: 0.03 }, source: "ia", confiance: 0.88, verifiee: false },
  ],
  historique: [
    hist("reception", "Déposé depuis l'espace par vous.", ilYa(3, 9), "Vous"),
    hist("lecture", "Lu par OCR — 2 pages, confiance 0,52 sur la nature.", ilYa(3, 9)),
    hist("a_classer", "À classer : devis ou bon de commande ?", ilYa(3, 9)),
  ],
};

/* ——— 7. R2026-000015 — en lecture (Soléa Froid) ——— */
const D15: DossierFiled = {
  document: doc(15, { reference: "R2026-000015", nom_fichier: "facture-octobre.pdf", recu_le: ilYa(0, 8), etat: "en_lecture", nature: null, nature_source: null, expediteur: "facturation@caraibes-froid-services.fr", lu_le: null, entite_id: FROID }),
  facture: null,
  lignes: [],
  tva: [],
  controles: [],
  levees: [],
  fournisseur: null,
  ibans: [],
  appariements: [],
  rapprochement: null,
  piece: { id: u("ee", 15), nom_fichier: "facture-octobre.pdf", mime: "application/pdf", chemin: `${C}/filed_document/${u("dd", 15)}/facture-octobre.pdf`, nb_pages: null, statut: "en_lecture", type_piece: null, methode: null },
  pages: [],
  valeurs: [],
  historique: [hist("reception", "Reçue par courriel de facturation@caraibes-froid-services.fr.", ilYa(0, 8)), hist("lecture", "Lecture en cours…", ilYa(0, 8))],
};

/* ——— 8. R2026-000008 — EDF Archipel Guadeloupe (Soléa Market Jarry), classée, payée ——— */
const f08 = facture(8, {
  fournisseur: EDF,
  numero: "2026-09-00421",
  emission: fr(ilYa(20)),
  echeance: fr(ilYa(5)),
  ht: 27498.69,
  tva: 2337.39,
  ttc: 29836.08,
  taux: 8.5,
  lignes: [{ designation: "Fourniture d'électricité — septembre 2026, 186 400 kWh", quantite: 186400, unite: "kWh", pu: 0.147525 }],
  verifiees: true,
  entite: AGENCE,
});
const D08: DossierFiled = {
  document: doc(8, { reference: "R2026-000008", nom_fichier: "EDF-2026-09-00421.pdf", recu_le: ilYa(20, 7), etat: "classe", expediteur: "factures@edf-archipel.fr", traite_le: ilYa(7, 10), entite_id: AGENCE }),
  ...f08,
  controles: [
    ctrl(f08.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent."),
    ctrl(f08.facture.id, "fournisseur.iban_connu", "bloquant", "ok", "IBAN identique à celui validé."),
    ctrl(f08.facture.id, "tva.coherence", "bloquant", "ok", "27 498,69 € × 8,5 % = 2 337,39 €."),
    ctrl(f08.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC."),
    ctrl(f08.facture.id, "lignes.somme", "attention", "levee", "La somme des lignes (27 498,66 €) diffère du total HT de 0,03 € (arrondi du prix unitaire).", "CALCUL_ERR", { ecart: 0.03 }, u("lv", 8)),
  ],
  levees: [{ id: u("lv", 8), code: "lignes.somme", cle: "", motif: "Arrondi du prix du kWh à six décimales — écart de 3 centimes, sans incidence.", leve_par: CLAIRE, leve_le: ilYa(19, 11), leve_par_nom: "Hélène Laurent" }],
  ibans: [{ id: u("ib", 8), fournisseur_id: f08.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 3456", statut: "valide", propose_le: ilYa(400) }],
  appariements: [],
  rapprochement: null,
  historique: [
    hist("reception", "Reçue par courriel de factures@edf-archipel.fr.", ilYa(20, 7)),
    hist("controles", "5 contrôles : 1 à vérifier (somme des lignes).", ilYa(20, 7)),
    hist("levee", "Anomalie « lignes.somme » levée : arrondi du kWh.", ilYa(19, 11), "Hélène Laurent"),
    hist("integration", "Intégrée : demande de paiement créée.", ilYa(19, 11)),
    hist("paiement", "Virement exécuté (demande approuvée par vous).", ilYa(7, 10), "Vous"),
    hist("classement", "Classée.", ilYa(7, 10)),
  ],
};
D08.facture!.statut = "a_valider";

/* ——— 9. R2026-000016 — Imprimerie Lafleur : fournisseur nouveau, à confirmer ———
   Les prospectus de la campagne Toussaint de Soléa Market Jarry. Déposée par
   Maëva Rosan (marketing) : une autre personne confirme le fournisseur
   (filed_confirmer_fournisseur). Son identité est déjà confirmée par VIES. */
const f16 = facture(16, {
  fournisseur: { ...LAFLEUR, statut: "a_confirmer" },
  numero: "IL-2026-1187",
  emission: fr(ilYa(1)),
  echeance: fr(dans(29)),
  ht: 2560,
  tva: 217.6,
  ttc: 2777.6,
  taux: 8.5,
  lignes: [{ designation: "Prospectus Toussaint A4 recto verso, 40 000 exemplaires", quantite: 40000, unite: "pièce", pu: 0.064 }],
  verifiees: true,
  entite: AGENCE,
});
f16.facture.statut = "bloquee";
f16.facture.anomalies = ["fournisseur.a_confirmer"];
f16.facture.nb_bloquants = 1;
const D16: DossierFiled = {
  document: doc(16, { reference: "R2026-000016", nom_fichier: "IL-2026-1187.pdf", recu_le: ilYa(1, 10), etat: "a_traiter", source: "depot", expediteur: "maeva.rosan@groupe-solea.fr", depose_par: SOFIA, entite_id: AGENCE }),
  ...f16,
  fournisseur: {
    ...f16.fournisseur,
    document_origine: u("dd", 16),
    identite_verifiee_le: ilYa(1, 10),
    identite_source: "vies",
    identite_verdict: { resultat: "valide", registre: "vies", identifiant: "FR68421937053", preuve: { nom: "IMPRIMERIE LAFLEUR", adresse: "12 RUE FREBAULT 97110 POINTE-A-PITRE" } },
  },
  controles: [
    ctrl(f16.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent."),
    ctrl(f16.facture.id, "identite.registre", "attention", "ok", "Identité confirmée par VIES le " + fr(ilYa(1)) + "."),
    ctrl(f16.facture.id, "fournisseur.a_confirmer", "bloquant", "anomalie", "Fournisseur nouveau (IMPRIMERIE LAFLEUR SAS) : une personne confirme qu'il s'agit bien d'un fournisseur du groupe.", null, { fournisseur: "Imprimerie Lafleur SAS" }),
    ctrl(f16.facture.id, "tva.coherence", "bloquant", "ok", "2 560,00 € × 8,5 % = 217,60 €."),
    ctrl(f16.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC."),
  ],
  levees: [],
  ibans: [{ id: u("ib", 16), fournisseur_id: f16.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 2044", statut: "propose", propose_le: ilYa(1, 10) }],
  appariements: [],
  rapprochement: null,
  origine_deposee_par: SOFIA,
  historique: [
    hist("reception", "Déposée depuis l'espace par Maëva Rosan.", ilYa(1, 10), "Maëva Rosan"),
    hist("lecture", "Lue en 4 s — PDF natif, 1 page.", ilYa(1, 10)),
    hist("controles", "5 contrôles : fournisseur nouveau, à confirmer.", ilYa(1, 10)),
    hist("identite", "Identité confirmée par VIES (IMPRIMERIE LAFLEUR).", ilYa(1, 10)),
  ],
};

/* ——— 10. R2026-000017 — Pneus Services Caraïbes (Soléa Auto Guadeloupe) : identifiants lus, non retenus ———
   Le lecteur a lu un SIREN et une TVA dont les clés sont fausses (comme sur
   la première vraie facture du banc) : ils restent sous
   fournisseur_lu.non_verifie, la fiche est « sans identifiant ». */
const PNEUS = { nom: "Pneus Services Caraïbes", siren: "519 803 417", tva: "FR 45 519803417", adresse: "Rue de la Chapelle, ZI de Jarry, 97122 Baie-Mahault", iban: "FR76 1027 8073 0000 0204 1180 125", code: "PSC" };
const f17 = facture(17, {
  fournisseur: { ...PNEUS, statut: "a_confirmer" },
  numero: "PSC-26-0098",
  emission: fr(ilYa(2)),
  echeance: fr(dans(28)),
  ht: 2534.4,
  tva: 215.42,
  ttc: 2749.82,
  taux: 8.5,
  lignes: [{ designation: "Pneumatiques 215/60 R17 — atelier", quantite: 32, unite: "pièce", pu: 79.2 }],
  verifiees: true,
  entite: AUTO_GP,
});
f17.facture.statut = "bloquee";
f17.facture.anomalies = ["fournisseur.a_confirmer", "identite.siren"];
f17.facture.nb_bloquants = 1;
f17.facture.nb_attention = 1;
f17.facture.fournisseur_lu = { nom: PNEUS.nom, adresse: PNEUS.adresse, non_verifie: { siren: "519803417", tva: "FR45519803417" } };
f17.valeurs = f17.valeurs.map((v) => (v.champ === "fournisseur.siren" || v.champ === "fournisseur.tva" ? { ...v, verifiee: false, source: "ia" as const, confiance: 0.88 } : v));
const D17: DossierFiled = {
  document: doc(17, { reference: "R2026-000017", nom_fichier: "PSC-26-0098.pdf", recu_le: ilYa(2, 9), etat: "a_traiter", expediteur: "facturation@pneus-services-caraibes.fr", entite_id: AUTO_GP }),
  ...f17,
  fournisseur: { ...f17.fournisseur, siren: null, tva: null, document_origine: u("dd", 17) },
  controles: [
    ctrl(f17.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent."),
    ctrl(f17.facture.id, "identite.siren", "attention", "anomalie", "SIREN lu (519803417) non vérifié : sa clé est invalide.", null, { non_verifie: "519803417" }),
    ctrl(f17.facture.id, "fournisseur.a_confirmer", "bloquant", "anomalie", "Fournisseur nouveau (PNEUS SERVICES CARAÏBES) : une personne le confirme avant tout paiement."),
    ctrl(f17.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC."),
  ],
  levees: [],
  ibans: [],
  appariements: [],
  rapprochement: null,
  origine_deposee_par: null,
  historique: [
    hist("reception", "Reçue par courriel de facturation@pneus-services-caraibes.fr.", ilYa(2, 9)),
    hist("lecture", "Lue en 5 s — PDF natif, 1 page ; SIREN et TVA lus, clés invalides.", ilYa(2, 9)),
    hist("controles", "4 contrôles : fournisseur nouveau, SIREN non vérifié.", ilYa(2, 9)),
  ],
};

/* ——— 11 et 12. Deux factures validées, à payer : l'une en retard, l'autre
   sans IBAN connu (pour l'écran « À payer ») ——— */
function validee(n: number, o: { fournisseur: typeof EMBALLAGES; numero: string; emission: string; echeance: string; ht: number; designation: string; iban: boolean; expediteur: string; entite: string }): DossierFiled {
  const tva = Math.round(o.ht * 8.5) / 100;
  const f = facture(n, { fournisseur: o.fournisseur, numero: o.numero, emission: o.emission, echeance: o.echeance, ht: o.ht, tva, ttc: Math.round((o.ht + tva) * 100) / 100, taux: 8.5, lignes: [{ designation: o.designation, quantite: 1, unite: "forfait", pu: o.ht }], verifiees: true, entite: o.entite });
  f.facture.statut = "validee";
  if (!o.iban) f.facture.iban = null;
  return {
    document: doc(n, { reference: `R2026-0000${n}`, nom_fichier: `${o.numero}.pdf`, recu_le: ilYa(12, 9), etat: "integre", expediteur: o.expediteur, traite_le: ilYa(10, 11), entite_id: o.entite }),
    ...f,
    controles: [ctrl(f.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC.")],
    levees: [],
    ibans: o.iban ? [{ id: u("ib", n), fournisseur_id: f.fournisseur.id, iban_masque: masque(o.fournisseur.iban), statut: "valide", propose_le: ilYa(300) }] : [],
    appariements: [],
    rapprochement: null,
    historique: [
      hist("reception", `Reçue par courriel de ${o.expediteur}.`, ilYa(12, 9)),
      hist("validee", "Validée par 1 personne(s) : classée, empreinte au journal.", ilYa(10, 11)),
    ],
  };
}
function masque(iban: string) {
  const c = iban.replace(/\s+/g, "");
  return `${c.slice(0, 4)} •••• •••• •••• ${c.slice(-4)}`;
}
const LUBIN = { nom: "Transports Lubin", siren: "734 205 180", tva: "FR 80 734205180", adresse: "ZI de la Lézarde, 97232 Le Lamentin", iban: "FR76 1468 9000 0100 2233 4455 618", code: "LUBIN" };
const DARCY = { nom: "Cabinet Darcy & Associés, commissaires aux comptes", siren: "488 102 633", tva: "FR 82 488102633", adresse: "Immeuble Le Patio, Grand Camp, 97139 Les Abymes", iban: "", code: "DARCY" };
const D18 = validee(18, { fournisseur: LUBIN, numero: "TR-2026-0712", emission: fr(ilYa(35)), echeance: fr(ilYa(5)), ht: 12600, designation: "Transport de marchandises — 18 rotations port de Fort-de-France ↔ magasin du Lamentin", iban: true, expediteur: "compta@transports-lubin.fr", entite: BRICO_MQ });
/* Lubin : lue sur le PDF, transmise à la comptabilité, payée en partie */
D18.facture!.statut = "comptabilisee";
D18.cycle = [
  { code: 204, libelle: "Prise en charge", survenu_le: ilYa(12, 9), motif_code: null, motif_libelle: null, motif: null, montant: null, etat: "sans_objet", emis_le: null, sens: "emis", erreur: null, obligatoire: false },
  { code: 205, libelle: "Approuvée", survenu_le: ilYa(10, 11), motif_code: null, motif_libelle: null, motif: null, montant: null, etat: "sans_objet", emis_le: null, sens: "emis", erreur: null, obligatoire: false },
  { code: 211, libelle: "Paiement transmis", survenu_le: ilYa(2, 10), motif_code: null, motif_libelle: null, motif: null, montant: 5000, etat: "sans_objet", emis_le: null, sens: "emis", erreur: null, obligatoire: false },
];
D18.ecritures = [
  { journal_code: "HA", journal_lib: "Achats", ecriture_num: 41, ecriture_date: isoFr(fr(ilYa(10))), compte_num: "6241", compte_lib: "Transports sur achats", comp_aux_num: null, debit: 12600, credit: 0, ecriture_let: null, date_let: null },
  { journal_code: "HA", journal_lib: "Achats", ecriture_num: 41, ecriture_date: isoFr(fr(ilYa(10))), compte_num: "44566", compte_lib: "TVA déductible sur autres biens et services", comp_aux_num: null, debit: 1071, credit: 0, ecriture_let: null, date_let: null },
  { journal_code: "HA", journal_lib: "Achats", ecriture_num: 41, ecriture_date: isoFr(fr(ilYa(10))), compte_num: "401", compte_lib: "Fournisseurs", comp_aux_num: "LUBIN", debit: 0, credit: 13671, ecriture_let: null, date_let: null },
  { journal_code: "BQ", journal_lib: "Banque", ecriture_num: 57, ecriture_date: isoFr(fr(ilYa(2))), compte_num: "401", compte_lib: "Fournisseurs", comp_aux_num: "LUBIN", debit: 5000, credit: 0, ecriture_let: null, date_let: null },
  { journal_code: "BQ", journal_lib: "Banque", ecriture_num: 57, ecriture_date: isoFr(fr(ilYa(2))), compte_num: "512", compte_lib: "Banque", comp_aux_num: null, debit: 0, credit: 5000, ecriture_let: null, date_let: null },
];
const D19 = validee(19, { fournisseur: DARCY, numero: "CD-26-118", emission: fr(ilYa(25)), echeance: fr(dans(3)), ht: 18500, designation: "Honoraires — audit intermédiaire des comptes du groupe au 30/09", iban: false, expediteur: "cabinet@darcy-associes.fr", entite: SIEGE });

/* Les commandes connues (filed_commandes) et leurs lignes : celles que les
   factures d'exemple citent, plus une ouverte sans facture. */
export const COMMANDES_EXEMPLE: Commande[] = [
  { id: u("bc", 64), numero: "BC-2026-0064", date_commande: isoFr(fr(ilYa(34))), devise: "EUR", montant_ht: 33180, statut: "ouverte", fournisseur_id: u("ff", 9), reference_externe: null },
  { id: u("bc", 77), numero: "BC-2026-0077", date_commande: isoFr(fr(ilYa(12))), devise: "EUR", montant_ht: 34080, statut: "ouverte", fournisseur_id: u("ff", 11), reference_externe: null },
  { id: u("bc", 80), numero: "BC-2026-0080", date_commande: isoFr(fr(ilYa(3))), devise: "EUR", montant_ht: 48500, statut: "ouverte", fournisseur_id: null, reference_externe: "Devis D-2026-218" },
];
export const LIGNES_COMMANDE_EXEMPLE: LigneCommande[] = [
  { id: u("cl", 1), commande_id: u("bc", 64), rang: 1, designation: "Fret maritime Le Havre → Pointe-à-Pitre, conteneur 40 pieds", quantite: 6, unite: "conteneur", prix_unitaire: 4950, montant_ht: 29700 },
  { id: u("cl", 2), commande_id: u("bc", 64), rang: 2, designation: "Formalités de dédouanement", quantite: 6, unite: "dossier", prix_unitaire: 380, montant_ht: 2280 },
  { id: u("cl", 3), commande_id: u("bc", 64), rang: 3, designation: "Manutention portuaire et livraison à l'entrepôt", quantite: 1, unite: "forfait", prix_unitaire: 1200, montant_ht: 1200 },
  { id: u("cl", 4), commande_id: u("bc", 77), rang: 1, designation: "Terminal de caisse tactile 15 pouces", quantite: 24, unite: "pièce", prix_unitaire: 1240, montant_ht: 29760 },
  { id: u("cl", 5), commande_id: u("bc", 77), rang: 2, designation: "Imprimante de tickets thermique", quantite: 24, unite: "pièce", prix_unitaire: 180, montant_ht: 4320 },
  { id: u("cl", 6), commande_id: u("bc", 80), rang: 1, designation: "Remplacement de 4 centrales de climatisation — galerie, fourniture et pose", quantite: 1, unite: "forfait", prix_unitaire: 48500, montant_ht: 48500 },
];

export const DOSSIERS_EXEMPLE: DossierFiled[] = [D15, D16, D17, D09, D18, D19, D11, D13, D12, D14, D10, D08];

/* Les fournisseurs d'exemple pour « rattacher » : les six connus. */
export const FOURNISSEURS_EXEMPLE = [D14, D09, D11, D08, D16, D17].map((d) => d.fournisseur!);

export { SOFIA as EXEMPLE_SOFIA };
