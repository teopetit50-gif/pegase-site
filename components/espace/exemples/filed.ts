/* FILED d'exemple — les documents reçus d'Atelier Bertin (05/10/2026).
   Formes : components/espace/types.ts (= filed_documents, filed_factures,
   filed_controles, filed_levees, pieces, pieces_valeurs…).

   Les PIÈCES sont décrites par leurs valeurs lues (champ, texte, page,
   boîte en fractions de page) : la visionneuse d'exemple DESSINE la page à
   partir de ces valeurs — ce qui est surligné est exactement ce qui est
   cité. En base réelle, c'est l'image de la pièce (URL signée) qui prend
   la place du dessin, les boîtes sont les mêmes. */

import type { Commande, DossierFiled, Facture, LigneCommande, MotifRefus } from "../types";
import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI, SIEGE, AGENCE, ilYa, dans, CLAIRE, SOFIA } from "./socle";

const C = EXEMPLE_CLIENT_ID;
const u = (p: string, n: number) => `00000000-0000-4000-8000-00000000${p}${n.toString(16).padStart(2, "0")}`;

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
  },
) {
  const pieceId = u("ee", n);
  const vals: V[] = [
    { champ: "fournisseur.nom", texte: o.fournisseur.nom, boite: [0.07, 0.06, 0.4, 0.035], verifiee: o.verifiees },
    { champ: "fournisseur.siren", texte: `SIREN ${o.fournisseur.siren}`, valeur: o.fournisseur.siren, boite: [0.07, 0.1, 0.22, 0.022], verifiee: o.verifiees, source: "regle" },
    { champ: "fournisseur.tva", texte: o.fournisseur.tva, boite: [0.07, 0.125, 0.22, 0.022], verifiee: o.verifiees, source: "regle" },
    { champ: "facture.numero", texte: o.numero, boite: [0.62, 0.13, 0.31, 0.03], verifiee: o.verifiees },
    { champ: "facture.date_emission", texte: o.emission, boite: [0.62, 0.165, 0.31, 0.025], verifiee: o.verifiees },
    { champ: "facture.echeance", texte: o.echeance, boite: [0.62, 0.19, 0.31, 0.025], verifiee: o.verifiees, confiance: 0.86 },
    { champ: "acheteur.nom", texte: "Atelier Bertin SAS", boite: [0.07, 0.24, 0.35, 0.03], verifiee: true },
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
    acheteur_lu: { nom: "Atelier Bertin SAS", siren: "842 015 337", adresse: "18 rue des Charpentiers, 69007 Lyon" },
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

const ROUX = { nom: "Métallerie Roux SARL", siren: "512 448 109", tva: "FR 41 512448109", adresse: "ZI des Bruyères, 69800 Saint-Priest", iban: "FR76 3000 4000 0512 3456 7890 143", code: "ROUX" };
const DURAND = { nom: "Papeterie Durand", siren: "398 772 540", tva: "FR 22 398772540", adresse: "4 place Bellecour, 69002 Lyon", iban: "FR76 1027 8060 0100 0203 0450 183", code: "DURAND" };
const TECHPRO = { nom: "TechPro Informatique", siren: "833 110 254", tva: "FR 65 833110254", adresse: "12 rue de la République, 38000 Grenoble", iban: "FR76 1820 6000 7865 4321 0987 612", code: "TECHPRO" };
const VIDAL = { nom: "Imprimerie Vidal SAS", siren: "421 937 058", tva: "FR 83 421937058", adresse: "7 rue Juiverie, 69005 Lyon", iban: "FR76 1009 6180 1100 0456 7812 044", code: "VIDAL" };
const EDL = { nom: "Électricité de Lyon", siren: "552 081 317", tva: "FR 03 552081317", adresse: "22 avenue Jean Jaurès, 69007 Lyon", iban: "FR76 3000 3030 2000 0500 0123 456", code: "EDL" };

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

/* ——— 1. R2026-000014 — Papeterie Durand : tout passe ——— */
const f14 = facture(14, {
  fournisseur: DURAND,
  numero: "PD-2026-1187",
  emission: fr(ilYa(4)),
  echeance: fr(dans(26)),
  ht: 405.17,
  tva: 81.03,
  ttc: 486.2,
  taux: 20,
  lignes: [
    { designation: "Papier A4 80 g — carton de 5 ramettes", quantite: 12, unite: "carton", pu: 24.9 },
    { designation: "Toner imprimante HP 59X", quantite: 1, unite: "pièce", pu: 106.37 },
  ],
  verifiees: true,
});
const D14: DossierFiled = {
  document: doc(14, { reference: "R2026-000014", nom_fichier: "facture-PD-2026-1187.pdf", recu_le: ilYa(4, 10), etat: "integre", expediteur: "compta@papeterie-durand.fr", traite_le: ilYa(4, 10) }),
  ...f14,
  controles: [
    ctrl(f14.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent et unique chez ce fournisseur."),
    ctrl(f14.facture.id, "mentions.date_present", "bloquant", "ok", "Date d'émission lisible."),
    ctrl(f14.facture.id, "fournisseur.siren_valide", "bloquant", "ok", "SIREN valide (clé de Luhn) et actif au registre.", null, { siren: "398772540" }),
    ctrl(f14.facture.id, "fournisseur.iban_connu", "bloquant", "ok", "IBAN identique à celui validé le 12/03/2026.", null, { iban_masque: "FR76 •••• 0183" }),
    ctrl(f14.facture.id, "tva.coherence", "bloquant", "ok", "405,17 € × 20 % = 81,03 € : la TVA correspond.", null, { base: 405.17, taux: 20, attendu: 81.03, lu: 81.03 }),
    ctrl(f14.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC, au centime."),
    ctrl(f14.facture.id, "lignes.somme", "attention", "ok", "La somme des lignes (405,17 €) égale le total HT."),
    ctrl(f14.facture.id, "doublon.numero_fournisseur", "bloquant", "ok", "Aucune autre facture PD-2026-1187 reçue."),
    ctrl(f14.facture.id, "echeance.delai_legal", "info", "ok", "Échéance à 30 jours : dans le délai légal (60 jours max)."),
  ],
  levees: [],
  ibans: [{ id: u("ib", 14), fournisseur_id: f14.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 0183", statut: "valide", propose_le: ilYa(200) }],
  appariements: [],
  rapprochement: { id: u("rp", 14), commande_id: null, mode: "aucun", nb_lignes: 2, nb_appariees: 0, nb_sans_commande: 2, ecart_prix: 0, ecart_quantite: 0, deja_facture: 0, non_recu: 0, ecart_montant: null },
  historique: [
    hist("reception", "Reçue par courriel de compta@papeterie-durand.fr.", ilYa(4, 10)),
    hist("lecture", "Lue en 6 s — PDF natif, 1 page, 15 valeurs.", ilYa(4, 10)),
    hist("controles", "9 contrôles passés, 0 anomalie.", ilYa(4, 10)),
    hist("integration", "Intégrée : demande de paiement créée dans la file de validation.", ilYa(4, 10)),
  ],
};
D14.facture!.statut = "a_valider";

/* ——— 2. R2026-000009 — Métallerie Roux : IBAN changé → bloquée ——— */
const f09 = facture(9, {
  fournisseur: { ...ROUX, statut: "actif" },
  numero: "MR-2026-0412",
  emission: fr(ilYa(9)),
  echeance: fr(dans(21)),
  ht: 10400,
  tva: 2080,
  ttc: 12480,
  taux: 20,
  lignes: [
    { designation: "Garde-corps acier thermolaqué — 24 ml", quantite: 24, unite: "ml", pu: 310, commande_ligne: "BC-2026-0064/1" },
    { designation: "Pose sur site — 2 compagnons, 3 jours", quantite: 6, unite: "jour", pu: 490, commande_ligne: "BC-2026-0064/2" },
    { designation: "Déplacement et levage", quantite: 1, unite: "forfait", pu: 20, commande_ligne: "BC-2026-0064/3" },
  ],
});
f09.facture.statut = "bloquee";
f09.facture.anomalies = ["fournisseur.iban_connu", "tva.arrondi"];
f09.facture.nb_bloquants = 1;
f09.facture.nb_attention = 1;
f09.facture.champs_douteux = ["paiement.iban"];
f09.facture.commande_id = u("bc", 64);
const D09: DossierFiled = {
  document: doc(9, { reference: "R2026-000009", nom_fichier: "Facture_MR-2026-0412.pdf", recu_le: ilYa(9, 14), etat: "a_traiter", expediteur: "facturation@metallerie-roux.fr" }),
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
      "L'IBAN porté sur la facture (FR76 3000 •••• 0143) n'est pas celui validé pour Métallerie Roux (FR76 1027 •••• 0183). Confirmer par téléphone au numéro connu avant toute levée.",
      "COORD_BANC_ERR",
      { iban_lu: "FR76 3000 •••• 0143", iban_connu: "FR76 1027 •••• 0183", page: 1, champ: "paiement.iban" },
    ),
    ctrl(f09.facture.id, "tva.coherence", "bloquant", "ok", "10 400,00 € × 20 % = 2 080,00 € : la TVA correspond."),
    ctrl(f09.facture.id, "tva.arrondi", "attention", "anomalie", "La TVA de la ligne 3 (4,00 €) est arrondie différemment du total ; écart de 0,00 € après recalcul — à confirmer.", "CALCUL_ERR", { ligne: 3, attendu: 4, lu: 4 }),
    ctrl(f09.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC."),
    ctrl(f09.facture.id, "rapprochement.commande_citee", "attention", "ok", "La facture cite BC-2026-0064 ; commande acceptée le 02/09.", null, { commande: "BC-2026-0064" }),
    ctrl(f09.facture.id, "rapprochement.prix_ligne", "attention", "ok", "3 lignes appariées, prix identiques à la commande."),
    ctrl(f09.facture.id, "doublon.numero_fournisseur", "bloquant", "ok", "Aucune autre facture MR-2026-0412 (R2026-000010 est marquée doublon de celle-ci)."),
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
    hist("reception", "Reçue par courriel de facturation@metallerie-roux.fr.", ilYa(9, 14)),
    hist("lecture", "Lue en 8 s — PDF natif, 1 page, 17 valeurs.", ilYa(9, 14)),
    hist("controles", "10 contrôles : 1 anomalie bloquante (IBAN), 1 à vérifier (arrondi TVA).", ilYa(9, 14)),
    hist("blocage", "Facture bloquée : IBAN non reconnu. Un nouvel IBAN est proposé pour Métallerie Roux, en attente de décision.", ilYa(9, 14)),
    hist("demande", "Demande de levée créée par Sofia Carvalho — 2 approbations requises.", ilYa(0, 10), "Sofia Carvalho"),
  ],
};

/* ——— 3. R2026-000011 — TechPro : écart de prix avec la commande → litige ——— */
const f11 = facture(11, {
  fournisseur: TECHPRO,
  numero: "TP-26-00931",
  emission: fr(ilYa(6)),
  echeance: fr(dans(24)),
  ht: 7680,
  tva: 1536,
  ttc: 9216,
  taux: 20,
  lignes: [
    { designation: "Poste de travail Dell OptiPlex 7020", quantite: 12, unite: "pièce", pu: 590, commande_ligne: "BC-2026-0077/1" },
    { designation: "Écran 27'' Dell P2723", quantite: 12, unite: "pièce", pu: 50, commande_ligne: "BC-2026-0077/2" },
  ],
});
f11.facture.statut = "a_valider";
f11.facture.anomalies = ["rapprochement.prix_ligne"];
f11.facture.nb_attention = 1;
f11.facture.commande_id = u("bc", 77);
const D11: DossierFiled = {
  document: doc(11, { reference: "R2026-000011", nom_fichier: "TP-26-00931.pdf", recu_le: ilYa(6, 9), etat: "a_traiter", expediteur: "billing@techpro-informatique.fr", entite_id: AGENCE }),
  ...f11,
  controles: [
    ctrl(f11.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent."),
    ctrl(f11.facture.id, "fournisseur.siren_valide", "bloquant", "ok", "SIREN valide et actif."),
    ctrl(f11.facture.id, "fournisseur.iban_connu", "bloquant", "ok", "IBAN identique à celui validé."),
    ctrl(f11.facture.id, "tva.coherence", "bloquant", "ok", "7 680,00 € × 20 % = 1 536,00 €."),
    ctrl(f11.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC."),
    ctrl(
      f11.facture.id,
      "rapprochement.prix_ligne",
      "attention",
      "anomalie",
      "Ligne 1 : 590,00 € facturés contre 560,00 € sur la commande BC-2026-0077 (+ 30,00 € × 12 = + 360,00 €). Ligne 2 conforme.",
      "PU_ERR",
      { commande: "BC-2026-0077", ligne: 1, prix_commande: 560, prix_facture: 590, ecart_total: 360 },
    ),
    ctrl(f11.facture.id, "rapprochement.quantite_ligne", "attention", "ok", "Quantités identiques à la commande (12 et 12)."),
    ctrl(f11.facture.id, "doublon.numero_fournisseur", "bloquant", "ok", "Aucune autre facture TP-26-00931."),
  ],
  levees: [],
  ibans: [{ id: u("ib", 11), fournisseur_id: f11.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 7612", statut: "valide", propose_le: ilYa(120) }],
  appariements: [
    { facture_ligne_id: u("11", 110), commande_ligne_id: u("cl", 4) },
    { facture_ligne_id: u("11", 111), commande_ligne_id: u("cl", 5) },
  ],
  rapprochement: { id: u("rp", 11), commande_id: u("bc", 77), mode: "lignes", nb_lignes: 2, nb_appariees: 2, nb_sans_commande: 0, ecart_prix: 360, ecart_quantite: 0, deja_facture: 0, non_recu: 0, ecart_montant: 360 },
  historique: [
    hist("reception", "Reçue par courriel de billing@techpro-informatique.fr.", ilYa(6, 9)),
    hist("lecture", "Lue en 5 s — PDF natif, 1 page.", ilYa(6, 9)),
    hist("controles", "8 contrôles : 1 écart avec la commande (prix ligne 1).", ilYa(6, 9)),
    hist("litige", "Mise en litige : écart de 360,00 € signalé au fournisseur.", ilYa(5, 11), "Yanis Dupré"),
  ],
};

/* ——— 4. R2026-000012 — avoir Métallerie Roux ——— */
const f12 = facture(12, {
  fournisseur: ROUX,
  numero: "AV-2026-0031",
  emission: fr(ilYa(2)),
  echeance: fr(ilYa(2)),
  ht: 20,
  tva: 4,
  ttc: 24,
  taux: 20,
  nature: "avoir",
  lignes: [{ designation: "Annulation « Déplacement et levage » — facturé par erreur", quantite: 1, unite: "forfait", pu: 20 }],
});
f12.facture.avoir_de = f09.facture.id;
const D12: DossierFiled = {
  document: doc(12, { reference: "R2026-000012", nom_fichier: "Avoir_AV-2026-0031.pdf", recu_le: ilYa(2, 16), etat: "a_traiter", nature: "avoir", expediteur: "facturation@metallerie-roux.fr" }),
  ...f12,
  controles: [
    ctrl(f12.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro d'avoir présent."),
    ctrl(f12.facture.id, "avoir.facture_corrigee", "attention", "ok", "L'avoir cite MR-2026-0412, retrouvée (R2026-000009).", null, { facture: "MR-2026-0412" }),
    ctrl(f12.facture.id, "tva.coherence", "bloquant", "ok", "20,00 € × 20 % = 4,00 €."),
    ctrl(f12.facture.id, "fournisseur.iban_connu", "bloquant", "ok", "Pas de paiement : un avoir ne porte pas d'IBAN exigible."),
  ],
  levees: [],
  ibans: [],
  appariements: [],
  rapprochement: null,
  historique: [
    hist("reception", "Reçu par courriel de facturation@metallerie-roux.fr.", ilYa(2, 16)),
    hist("lecture", "Lu en 4 s — avoir reconnu, rattaché à MR-2026-0412.", ilYa(2, 16)),
    hist("controles", "4 contrôles passés.", ilYa(2, 16)),
  ],
};

/* ——— 5. R2026-000010 — doublon de R2026-000009 ——— */
const D10: DossierFiled = {
  document: doc(10, { reference: "R2026-000010", nom_fichier: "Facture_MR-2026-0412 (1).pdf", recu_le: ilYa(8, 8), etat: "doublon", doublon_de: u("dd", 9), expediteur: "facturation@metallerie-roux.fr", motif: "Même fournisseur, même numéro, même empreinte que R2026-000009.", traite_le: ilYa(8, 8) }),
  facture: null,
  lignes: [],
  tva: [],
  controles: [],
  levees: [],
  fournisseur: null,
  ibans: [],
  appariements: [],
  rapprochement: null,
  piece: { id: u("ee", 10), nom_fichier: "Facture_MR-2026-0412 (1).pdf", mime: "application/pdf", chemin: `${C}/filed_document/${u("dd", 10)}/doublon.pdf`, nb_pages: 1, statut: "lue", type_piece: "facture", methode: "natif" },
  pages: [{ n: 1, texte: "", largeur: 595, hauteur: 842 }],
  valeurs: [],
  historique: [
    hist("reception", "Reçue par courriel (renvoi).", ilYa(8, 8)),
    hist("doublon", "Écartée : doublon de R2026-000009 (même SHA-256).", ilYa(8, 8), null, { doublon_de: "R2026-000009" }),
  ],
};

/* ——— 6. R2026-000013 — à classer (le lecteur hésite) ——— */
const D13: DossierFiled = {
  document: doc(13, { reference: "R2026-000013", nom_fichier: "scan_20261001_0932.pdf", recu_le: ilYa(3, 9), etat: "a_classer", nature: null, nature_source: null, source: "depot", expediteur: null, depose_par: EXEMPLE_MOI, motif: "Le lecteur hésite entre devis et bon de commande (confiance 0,52)." } as never),
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
    { n: 1, texte: "MENUISERIE GIRAUD\nDevis n° D-2026-218\n\nAgencement comptoir d'accueil — chêne massif\nFourniture et pose\n\nTotal HT 4 850,00 €\nTVA 20 % 970,00 €\nTotal TTC 5 820,00 €\n\nBon pour accord : ____________", largeur: 595, hauteur: 842 },
    { n: 2, texte: "Conditions générales de vente\n\nAcompte de 30 % à la commande.\nSolde à la réception des travaux.\nDélai : 6 semaines après acceptation.", largeur: 595, hauteur: 842 },
  ],
  valeurs: [
    { id: u("1e", 1), champ: "document.type", valeur: "devis", texte: "Devis n° D-2026-218", page: 1, boite: { x: 0.07, y: 0.12, l: 0.35, h: 0.03 }, source: "ia", confiance: 0.52, verifiee: false },
    { id: u("1e", 2), champ: "totaux.ttc", valeur: 5820, texte: "Total TTC 5 820,00 €", page: 1, boite: { x: 0.07, y: 0.5, l: 0.4, h: 0.03 }, source: "ia", confiance: 0.88, verifiee: false },
  ],
  historique: [
    hist("reception", "Déposé depuis l'espace par vous.", ilYa(3, 9), "Vous"),
    hist("lecture", "Lu par OCR — 2 pages, confiance 0,52 sur la nature.", ilYa(3, 9)),
    hist("a_classer", "À classer : devis ou bon de commande ?", ilYa(3, 9)),
  ],
};

/* ——— 7. R2026-000015 — en lecture ——— */
const D15: DossierFiled = {
  document: doc(15, { reference: "R2026-000015", nom_fichier: "facture-octobre.pdf", recu_le: ilYa(0, 8), etat: "en_lecture", nature: null, nature_source: null, expediteur: "contact@verreries-lyonnaises.fr", lu_le: null }),
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
  historique: [hist("reception", "Reçue par courriel de contact@verreries-lyonnaises.fr.", ilYa(0, 8)), hist("lecture", "Lecture en cours…", ilYa(0, 8))],
};

/* ——— 8. R2026-000008 — Électricité de Lyon, classée, payée ——— */
const f08 = facture(8, {
  fournisseur: EDL,
  numero: "2026-08-00421",
  emission: fr(ilYa(20)),
  echeance: fr(ilYa(5)),
  ht: 1915.33,
  tva: 383.07,
  ttc: 2298.4,
  taux: 20,
  lignes: [{ designation: "Fourniture d'électricité — août 2026, 14 320 kWh", quantite: 14320, unite: "kWh", pu: 0.13375 }],
  verifiees: true,
});
const D08: DossierFiled = {
  document: doc(8, { reference: "R2026-000008", nom_fichier: "EDL-2026-08-00421.pdf", recu_le: ilYa(20, 7), etat: "classe", expediteur: "factures@electricite-lyon.fr", traite_le: ilYa(7, 10) }),
  ...f08,
  controles: [
    ctrl(f08.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent."),
    ctrl(f08.facture.id, "fournisseur.iban_connu", "bloquant", "ok", "IBAN identique à celui validé."),
    ctrl(f08.facture.id, "tva.coherence", "bloquant", "ok", "1 915,33 € × 20 % = 383,07 €."),
    ctrl(f08.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC."),
    ctrl(f08.facture.id, "lignes.somme", "attention", "levee", "La somme des lignes (1 915,30 €) diffère du total HT de 0,03 € (arrondi du prix unitaire).", "CALCUL_ERR", { ecart: 0.03 }, u("lv", 8)),
  ],
  levees: [{ id: u("lv", 8), code: "lignes.somme", cle: "", motif: "Arrondi du prix du kWh à cinq décimales — écart de 3 centimes, sans incidence.", leve_par: CLAIRE, leve_le: ilYa(19, 11), leve_par_nom: "Claire Morel" }],
  ibans: [{ id: u("ib", 8), fournisseur_id: f08.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 3456", statut: "valide", propose_le: ilYa(400) }],
  appariements: [],
  rapprochement: null,
  historique: [
    hist("reception", "Reçue par courriel de factures@electricite-lyon.fr.", ilYa(20, 7)),
    hist("controles", "5 contrôles : 1 à vérifier (somme des lignes).", ilYa(20, 7)),
    hist("levee", "Anomalie « lignes.somme » levée : arrondi du kWh.", ilYa(19, 11), "Claire Morel"),
    hist("integration", "Intégrée : demande de paiement créée.", ilYa(19, 11)),
    hist("paiement", "Virement exécuté (demande approuvée par vous).", ilYa(7, 10), "Vous"),
    hist("classement", "Classée.", ilYa(7, 10)),
  ],
};
D08.facture!.statut = "a_valider";

/* ——— 9. R2026-000016 — Imprimerie Vidal : fournisseur nouveau, à confirmer ———
   Déposée par Sofia Carvalho : une autre personne confirme le fournisseur
   (filed_confirmer_fournisseur). Son identité est déjà confirmée par VIES. */
const f16 = facture(16, {
  fournisseur: { ...VIDAL, statut: "a_confirmer" },
  numero: "IV-2026-1187",
  emission: fr(ilYa(1)),
  echeance: fr(dans(29)),
  ht: 640,
  tva: 128,
  ttc: 768,
  taux: 20,
  lignes: [{ designation: "Brochures A5, 16 pages, 500 exemplaires", quantite: 500, unite: "pièce", pu: 1.28 }],
  verifiees: true,
});
f16.facture.statut = "bloquee";
f16.facture.anomalies = ["fournisseur.a_confirmer"];
f16.facture.nb_bloquants = 1;
const D16: DossierFiled = {
  document: doc(16, { reference: "R2026-000016", nom_fichier: "IV-2026-1187.pdf", recu_le: ilYa(1, 10), etat: "a_traiter", source: "depot", expediteur: "sofia.carvalho@atelier-bertin.fr", depose_par: SOFIA }),
  ...f16,
  fournisseur: {
    ...f16.fournisseur,
    document_origine: u("dd", 16),
    identite_verifiee_le: ilYa(1, 10),
    identite_source: "vies",
    identite_verdict: { resultat: "valide", registre: "vies", identifiant: "FR83421937058", preuve: { nom: "IMPRIMERIE VIDAL", adresse: "7 RUE JUIVERIE 69005 LYON" } },
  },
  controles: [
    ctrl(f16.facture.id, "mentions.numero_present", "bloquant", "ok", "Numéro de facture présent."),
    ctrl(f16.facture.id, "identite.registre", "attention", "ok", "Identité confirmée par VIES le " + fr(ilYa(1)) + "."),
    ctrl(f16.facture.id, "fournisseur.a_confirmer", "bloquant", "anomalie", "Fournisseur nouveau (IMPRIMERIE VIDAL SAS) : une personne confirme qu'il s'agit bien d'un fournisseur de l'entreprise.", null, { fournisseur: "Imprimerie Vidal SAS" }),
    ctrl(f16.facture.id, "tva.coherence", "bloquant", "ok", "640,00 € × 20 % = 128,00 €."),
    ctrl(f16.facture.id, "totaux.ht_tva_ttc", "bloquant", "ok", "HT + TVA = TTC."),
  ],
  levees: [],
  ibans: [{ id: u("ib", 16), fournisseur_id: f16.fournisseur.id, iban_masque: "FR76 •••• •••• •••• 2044", statut: "propose", propose_le: ilYa(1, 10) }],
  appariements: [],
  rapprochement: null,
  origine_deposee_par: SOFIA,
  historique: [
    hist("reception", "Déposée depuis l'espace par Sofia Carvalho.", ilYa(1, 10), "Sofia Carvalho"),
    hist("lecture", "Lue en 4 s — PDF natif, 1 page.", ilYa(1, 10)),
    hist("controles", "5 contrôles : fournisseur nouveau, à confirmer.", ilYa(1, 10)),
    hist("identite", "Identité confirmée par VIES (IMPRIMERIE VIDAL).", ilYa(1, 10)),
  ],
};

/* Les commandes connues (filed_commandes) et leurs lignes : celles que les
   factures d'exemple citent, plus une ouverte sans facture. */
export const COMMANDES_EXEMPLE: Commande[] = [
  { id: u("bc", 64), numero: "BC-2026-0064", date_commande: isoFr(fr(ilYa(34))), devise: "EUR", montant_ht: 10400, statut: "ouverte", fournisseur_id: u("ff", 9), reference_externe: null },
  { id: u("bc", 77), numero: "BC-2026-0077", date_commande: isoFr(fr(ilYa(12))), devise: "EUR", montant_ht: 7320, statut: "ouverte", fournisseur_id: u("ff", 11), reference_externe: null },
  { id: u("bc", 80), numero: "BC-2026-0080", date_commande: isoFr(fr(ilYa(3))), devise: "EUR", montant_ht: 4850, statut: "ouverte", fournisseur_id: null, reference_externe: "Devis D-2026-218" },
];
export const LIGNES_COMMANDE_EXEMPLE: LigneCommande[] = [
  { id: u("cl", 1), commande_id: u("bc", 64), rang: 1, designation: "Garde-corps acier thermolaqué", quantite: 24, unite: "ml", prix_unitaire: 310, montant_ht: 7440 },
  { id: u("cl", 2), commande_id: u("bc", 64), rang: 2, designation: "Pose sur site", quantite: 6, unite: "jour", prix_unitaire: 490, montant_ht: 2940 },
  { id: u("cl", 3), commande_id: u("bc", 64), rang: 3, designation: "Déplacement et levage", quantite: 1, unite: "forfait", prix_unitaire: 20, montant_ht: 20 },
  { id: u("cl", 4), commande_id: u("bc", 77), rang: 1, designation: "Poste de travail Dell OptiPlex 7020", quantite: 12, unite: "pièce", prix_unitaire: 560, montant_ht: 6720 },
  { id: u("cl", 5), commande_id: u("bc", 77), rang: 2, designation: "Écran 27'' Dell P2723", quantite: 12, unite: "pièce", prix_unitaire: 50, montant_ht: 600 },
  { id: u("cl", 6), commande_id: u("bc", 80), rang: 1, designation: "Agencement comptoir d'accueil — chêne massif, fourniture et pose", quantite: 1, unite: "forfait", prix_unitaire: 4850, montant_ht: 4850 },
];

export const DOSSIERS_EXEMPLE: DossierFiled[] = [D15, D16, D09, D11, D13, D12, D14, D10, D08];

/* Les fournisseurs d'exemple pour « rattacher » : les cinq connus. */
export const FOURNISSEURS_EXEMPLE = [D14, D09, D11, D08, D16].map((d) => d.fournisseur!);

export { SOFIA as EXEMPLE_SOFIA };
