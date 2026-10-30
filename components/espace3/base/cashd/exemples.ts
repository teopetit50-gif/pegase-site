/* ══════════════════════════════════════════════════════════════════════
   CASHD — le monde d'exemple (06/10/2026, session C2 ; 30/10/2026 : /espace3)

   Groupe Soléa (le même groupe fictif que les autres écrans) suit les
   créances clients de ses sociétés. Onze débiteurs, neuf sociétés émettrices.
   Le fait à retenir : Batimat Caraïbes (négoce BTP) doit 486 000 € à
   Soléa Import, Soléa Pièces et Brico Soléa Guadeloupe, dont 118 000 €
   échus à plus de 60 jours ; le plafond du groupe pour ce client est de
   400 000 € (250 000 + 80 000 + 70 000 €), dépassé sur les trois comptes.
   Les histoires des tests pgTAP (omega/tests/cashd/c2_00_jeu.sql) restent
   jouées : la SCCV Les Hauts de Schœlcher a 12 000 € échus depuis 45 jours,
   l'hôtel Les Alizés 24 000 € depuis 100 jours (avoir déduit), le SIRS
   Grande-Terre n'est pas échu, le garage Mondésir a reçu son rappel, les
   Transports Ricou sont en pause. Un virement de 18 450 € est arrivé sans
   référence.

   Dates RELATIVES au jour de la visite : un retard reste un retard demain.
   Identifiants en 0000… : rien ici ne se confond avec la base.
   ══════════════════════════════════════════════════════════════════════ */

import { AUTO_GP, BRICO_MQ, ENTITES, EXEMPLE_CLIENT_ID, IMPORT } from "../exemples/socle";
import { jourParis } from "./calcul";
import type { Compte, Fiche, Piece, Relance, ReglementEtat, Reglages, Suivi } from "./types";

/* les sociétés émettrices (socle.ts) */
const ENTITE = IMPORT;
const AUTO_MQ = ENTITES[9].id; /* Soléa Auto Martinique */
const LOCATION = ENTITES[10].id; /* Soléa Location */
const PIECES = ENTITES[11].id; /* Soléa Pièces */
const BRICO_GP = ENTITES[12].id; /* Brico Soléa Guadeloupe */
const MAISON = ENTITES[13].id; /* Maison Soléa */
const FROID = ENTITES[14].id; /* Soléa Froid */
const IMMO = ENTITES[16].id; /* Soléa Immobilier */

function decale(jours: number): string {
  const d = new Date(`${jourParis()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

/* la date d'une pièce, écrite à la française (JJ/MM/AAAA) */
const fr = (jours: number) => decale(jours).split("-").reverse().join("/");

function id(n: number): string {
  return `00000000-0000-4000-8000-0000000c2${String(n).padStart(3, "0")}`;
}

export const REGLAGES_EXEMPLE: Reglages = {
  client_id: EXEMPLE_CLIENT_ID,
  mode: "essai",
  delai_paiement_jours: 30,
  taux_penalites: 0.1215,
  indemnite_forfaitaire: 40,
  seuil_relance: 0,
  seuil_direction: 50000,
  heure_relances: "07:00:00",
};

function compte(n: number, c: Partial<Compte> & Pick<Compte, "reference" | "nom">): Compte {
  return {
    id: id(n),
    client_id: EXEMPLE_CLIENT_ID,
    entite_id: ENTITE,
    groupe: null,
    secteur: null,
    siren: null,
    langue: "fr",
    contact_facturation_nom: null,
    contact_facturation_email: null,
    contact_commercial_email: null,
    plafond_encours: null,
    reciproque: false,
    statut: "actif",
    statut_motif: null,
    statut_le: null,
    ...c,
  };
}

function piece(n: number, compteId: string, p: Partial<Piece> & Pick<Piece, "numero" | "date_emission" | "montant_ttc">): Piece {
  return {
    id: id(n),
    compte_id: compteId,
    nature: "facture",
    echeance: null,
    statut: "ouverte",
    statut_motif: null,
    regle: 0,
    avoirs_imputes: 0,
    reste_du: 0,
    jours_ecoules: 0,
    retard_jours: 0,
    tranche: null,
    ...p,
  };
}

function suivi(factureId: string, s: Partial<Suivi>): Suivi {
  return { facture_id: factureId, palier_atteint: null, palier_atteint_le: null, derniere_relance_statut: null, palier_suivant: null, palier_suivant_le: null, etat_sequence: "pas_encore_relancee", ...s };
}

/* ——— les débiteurs ——— */
const sccv = compte(1, { reference: "C-SCHOELCHER", nom: "SCCV Les Hauts de Schœlcher", entite_id: BRICO_MQ, secteur: "Promotion immobilière", siren: "912450771", contact_facturation_nom: "Mme Lagier", contact_facturation_email: "compta@hauts-schoelcher.fr", plafond_encours: 60000 });
const hotel = compte(2, { reference: "C-ALIZES", nom: "Hôtel Les Alizés", entite_id: FROID, groupe: "Alizés Hôtels & Résidences", secteur: "Hôtellerie", contact_facturation_email: "factures@hotel-lesalizes.fr" });
const sirs = compte(3, { reference: "C-SIRS-GT", nom: "SIRS Grande-Terre (restauration scolaire)", entite_id: IMPORT, secteur: "Collectivité", contact_facturation_email: "mandatement@sirs-grandeterre.fr" });
const garage = compte(4, { reference: "C-MONDESIR", nom: "Garage Mondésir Automobiles", entite_id: PIECES, secteur: "Garage", contact_facturation_nom: "M. Mondésir", contact_facturation_email: "compta@garage-mondesir.fr" });
const ricou = compte(5, { reference: "C-RICOU", nom: "Transports Ricou & Fils", entite_id: LOCATION, secteur: "Transport", contact_facturation_email: "gestion@transports-ricou.fr", statut: "pause", statut_motif: "Le gérant a appelé : paiement promis vendredi", statut_le: `${decale(-2)}T09:12:00Z` });
/* Batimat Caraïbes : un client, trois sociétés du groupe, un plafond groupe de 400 000 € */
const batimatSI = compte(6, { reference: "C-BATIMAT-SI", nom: "Batimat Caraïbes — Soléa Import", entite_id: IMPORT, groupe: "Batimat Caraïbes", secteur: "BTP — négoce de matériaux", siren: "784120336", contact_facturation_nom: "M. Célestine", contact_facturation_email: "compta@batimat-caraibes.fr", contact_commercial_email: "achats@batimat-caraibes.fr", plafond_encours: 250000 });
const batimatSP = compte(7, { reference: "C-BATIMAT-SP", nom: "Batimat Caraïbes — Soléa Pièces", entite_id: PIECES, groupe: "Batimat Caraïbes", secteur: "BTP — négoce de matériaux", siren: "784120336", contact_facturation_nom: "M. Célestine", contact_facturation_email: "compta@batimat-caraibes.fr", plafond_encours: 80000 });
const batimatBG = compte(8, { reference: "C-BATIMAT-BG", nom: "Batimat Caraïbes — Brico Soléa Guadeloupe", entite_id: BRICO_GP, groupe: "Batimat Caraïbes", secteur: "BTP — négoce de matériaux", siren: "784120336", contact_facturation_nom: "M. Célestine", contact_facturation_email: "compta@batimat-caraibes.fr", plafond_encours: 70000 });
const clinique = compte(9, { reference: "C-FLAMBOYANTS", nom: "Clinique des Flamboyants", entite_id: AUTO_MQ, secteur: "Santé", contact_facturation_nom: "Mme Rosette", contact_facturation_email: "fournisseurs@clinique-flamboyants.fr" });
const anse = compte(10, { reference: "C-ANSE-CARAIBE", nom: "Résidence hôtelière Anse Caraïbe", entite_id: MAISON, groupe: "Alizés Hôtels & Résidences", secteur: "Hôtellerie", contact_facturation_nom: "M. Bonheur", contact_facturation_email: "comptabilite@anse-caraibe.fr", plafond_encours: 200000 });
const carbet = compte(11, { reference: "C-CARBET", nom: "Le Carbet Gourmand SARL (cellule 14)", entite_id: IMMO, secteur: "Restauration — locataire", contact_facturation_email: "lecarbetgourmand@orange.fr" });
const flotte = compte(12, { reference: "C-ARCHIPEL-BTP", nom: "Archipel Travaux Publics", entite_id: AUTO_GP, secteur: "BTP", contact_facturation_nom: "Mme Jean-Baptiste", contact_facturation_email: "compta@archipel-tp.fr", plafond_encours: 150000 });

export const FICHES_EXEMPLE: Fiche[] = [
  {
    compte: sccv,
    balance: null,
    pieces: [
      piece(11, sccv.id, { numero: "BM-2026-0731", date_emission: decale(-75), echeance: decale(-45), montant_ttc: 12000 }),
      piece(12, sccv.id, { numero: "BM-2026-0866", date_emission: decale(-10), echeance: decale(20), montant_ttc: 38900 }),
      piece(13, sccv.id, { nature: "devis", numero: "BM-D-2026-0144", date_emission: decale(-5), montant_ttc: 126400, statut: "en_attente" }),
    ],
    reglements: [],
    suivi: [
      suivi(id(11), { palier_atteint: "rappel", palier_atteint_le: decale(0), derniere_relance_statut: "a_valider", palier_suivant: "relance", palier_suivant_le: decale(5), etat_sequence: "en_cours" }),
      suivi(id(12), { palier_suivant: "rappel", palier_suivant_le: decale(27) }),
      suivi(id(13), { palier_atteint: "devis_rappel", palier_atteint_le: decale(0), derniere_relance_statut: "a_valider", palier_suivant: "devis_relance", palier_suivant_le: decale(5), etat_sequence: "en_cours" }),
    ],
  },
  {
    compte: hotel,
    balance: null,
    pieces: [
      piece(21, hotel.id, { numero: "SF-2026-0094", date_emission: decale(-130), echeance: decale(-100), montant_ttc: 28800, avoirs_imputes: 4800 }),
      piece(22, hotel.id, { nature: "avoir", numero: "SF-AV-2026-007", date_emission: decale(-20), montant_ttc: 4800, statut: "soldee", statut_motif: "avoir entièrement imputé" }),
    ],
    reponses_lues: [{ id: id(901), relance_id: id(202), lecture: "promesse", indice: "le virement a ete effectue", proposition: "pause", statut: "proposee", cree_le: `${decale(0)}T08:12:00Z` }],
    pieces_jointes: [],
    reglements: [],
    suivi: [suivi(id(21), { palier_atteint: "mise_en_demeure", palier_atteint_le: decale(0), derniere_relance_statut: "a_valider", etat_sequence: "sequence_terminee" })],
  },
  {
    compte: sirs,
    balance: null,
    pieces: [piece(31, sirs.id, { numero: "SI-2026-0702", date_emission: decale(-1), echeance: decale(29), montant_ttc: 42600 })],
    reglements: [],
    suivi: [suivi(id(31), { palier_suivant: "rappel", palier_suivant_le: decale(36) })],
  },
  {
    compte: garage,
    balance: null,
    pieces: [piece(41, garage.id, { numero: "SP-2026-0288", date_emission: decale(-55), echeance: decale(-25), montant_ttc: 18450 })],
    reglements: [],
    suivi: [suivi(id(41), { palier_atteint: "rappel", palier_atteint_le: decale(-18), derniere_relance_statut: "a_valider", palier_suivant: "relance", palier_suivant_le: decale(-4), etat_sequence: "en_cours" })],
  },
  {
    compte: ricou,
    balance: null,
    pieces: [piece(51, ricou.id, { numero: "SL-2026-0452", date_emission: decale(-42), echeance: decale(-12), montant_ttc: 9860 })],
    reglements: [],
    suivi: [suivi(id(51), { palier_atteint: "rappel", palier_atteint_le: decale(-5), derniere_relance_statut: "a_valider", palier_suivant: "relance", palier_suivant_le: decale(9), etat_sequence: "pause" })],
  },
  {
    /* Batimat Caraïbes chez Soléa Import : 312 000 €, dont 74 000 € à 72 jours */
    compte: batimatSI,
    balance: null,
    pieces: [
      piece(61, batimatSI.id, { numero: "SI-2026-0412", date_emission: decale(-102), echeance: decale(-72), montant_ttc: 74000 }),
      piece(62, batimatSI.id, { numero: "SI-2026-0538", date_emission: decale(-78), echeance: decale(-48), montant_ttc: 96000 }),
      piece(63, batimatSI.id, { numero: "SI-2026-0601", date_emission: decale(-55), echeance: decale(-25), montant_ttc: 82000 }),
      piece(64, batimatSI.id, { numero: "SI-2026-0688", date_emission: decale(-20), echeance: decale(10), montant_ttc: 60000 }),
    ],
    reglements: [],
    suivi: [
      suivi(id(61), { palier_atteint: "relance", palier_atteint_le: decale(0), derniere_relance_statut: "a_valider", palier_suivant: "mise_en_demeure", palier_suivant_le: decale(10), etat_sequence: "en_cours" }),
      suivi(id(62), { palier_atteint: "relance", palier_atteint_le: decale(0), derniere_relance_statut: "a_valider", palier_suivant: "mise_en_demeure", palier_suivant_le: decale(10), etat_sequence: "en_cours" }),
      suivi(id(63), { palier_atteint: "rappel", palier_atteint_le: decale(-17), derniere_relance_statut: "envoyee", palier_suivant: "relance", palier_suivant_le: decale(3), etat_sequence: "en_cours" }),
      suivi(id(64), { palier_suivant: "rappel", palier_suivant_le: decale(17) }),
    ],
  },
  {
    /* Batimat Caraïbes chez Soléa Pièces : 96 000 €, dont 26 000 € à 95 jours */
    compte: batimatSP,
    balance: null,
    pieces: [
      piece(71, batimatSP.id, { numero: "SP-2026-0217", date_emission: decale(-125), echeance: decale(-95), montant_ttc: 26000 }),
      piece(72, batimatSP.id, { numero: "SP-2026-0305", date_emission: decale(-60), echeance: decale(-30), montant_ttc: 38000 }),
      piece(73, batimatSP.id, { numero: "SP-2026-0371", date_emission: decale(-15), echeance: decale(15), montant_ttc: 32000 }),
    ],
    reglements: [],
    suivi: [
      suivi(id(71), { palier_atteint: "mise_en_demeure", palier_atteint_le: decale(0), derniere_relance_statut: "a_valider", etat_sequence: "sequence_terminee" }),
      suivi(id(72), { palier_atteint: "rappel", palier_atteint_le: decale(-22), derniere_relance_statut: "envoyee", palier_suivant: "relance", palier_suivant_le: decale(2), etat_sequence: "en_cours" }),
      suivi(id(73), { palier_suivant: "rappel", palier_suivant_le: decale(22) }),
    ],
  },
  {
    /* Batimat Caraïbes chez Brico Soléa Guadeloupe : 78 000 €, dont 18 000 € à 68 jours */
    compte: batimatBG,
    balance: null,
    pieces: [
      piece(81, batimatBG.id, { numero: "BG-2026-1184", date_emission: decale(-98), echeance: decale(-68), montant_ttc: 18000 }),
      piece(82, batimatBG.id, { numero: "BG-2026-1302", date_emission: decale(-50), echeance: decale(-20), montant_ttc: 27500 }),
      piece(83, batimatBG.id, { numero: "BG-2026-1377", date_emission: decale(-12), echeance: decale(18), montant_ttc: 32500 }),
    ],
    reglements: [],
    suivi: [
      suivi(id(81), { palier_atteint: "relance", palier_atteint_le: decale(0), derniere_relance_statut: "a_valider", palier_suivant: "mise_en_demeure", palier_suivant_le: decale(10), etat_sequence: "en_cours" }),
      suivi(id(82), { palier_atteint: "rappel", palier_atteint_le: decale(-12), derniere_relance_statut: "envoyee", palier_suivant: "relance", palier_suivant_le: decale(8), etat_sequence: "en_cours" }),
      suivi(id(83), { palier_suivant: "rappel", palier_suivant_le: decale(25) }),
    ],
  },
  {
    /* quatre véhicules de service livrés ; un aménagement manquant est contesté */
    compte: clinique,
    balance: null,
    pieces: [piece(91, clinique.id, { numero: "AM-2026-0219", date_emission: decale(-40), echeance: decale(-10), montant_ttc: 112400, montant_conteste: 18600 })],
    reglements: [],
    suivi: [suivi(id(91), { palier_suivant: "rappel", palier_suivant_le: decale(4) })],
  },
  {
    compte: anse,
    balance: null,
    pieces: [
      piece(101, anse.id, { numero: "ME-2026-0318", date_emission: decale(-68), echeance: decale(-38), montant_ttc: 142000 }),
      piece(102, anse.id, { numero: "ME-2026-0402", date_emission: decale(-18), echeance: decale(12), montant_ttc: 46500 }),
    ],
    reglements: [],
    suivi: [
      suivi(id(101), { palier_atteint: "rappel", palier_atteint_le: decale(-6), derniere_relance_statut: "envoyee", palier_suivant: "relance", palier_suivant_le: decale(8), etat_sequence: "en_cours" }),
      suivi(id(102), { palier_suivant: "rappel", palier_suivant_le: decale(19) }),
    ],
  },
  {
    /* les loyers d'une cellule du centre commercial */
    compte: carbet,
    balance: null,
    pieces: [
      piece(111, carbet.id, { numero: "SIM-2026-0907", date_emission: decale(-61), echeance: decale(-56), montant_ttc: 7200 }),
      piece(112, carbet.id, { numero: "SIM-2026-1007", date_emission: decale(-31), echeance: decale(-26), montant_ttc: 7200 }),
    ],
    reglements: [],
    suivi: [
      suivi(id(111), { palier_atteint: "relance", palier_atteint_le: decale(-9), derniere_relance_statut: "envoyee", palier_suivant: "mise_en_demeure", palier_suivant_le: decale(6), etat_sequence: "en_cours" }),
      suivi(id(112), { palier_atteint: "rappel", palier_atteint_le: decale(-9), derniere_relance_statut: "envoyee", palier_suivant: "relance", palier_suivant_le: decale(6), etat_sequence: "en_cours" }),
    ],
  },
  {
    compte: flotte,
    balance: null,
    pieces: [
      piece(121, flotte.id, { numero: "AG-2026-0533", date_emission: decale(-24), echeance: decale(6), montant_ttc: 138600 }),
      piece(122, flotte.id, { nature: "devis", numero: "AG-D-2026-0091", date_emission: decale(-12), montant_ttc: 94200, statut: "en_attente" }),
    ],
    reglements: [],
    suivi: [
      suivi(id(121), { palier_suivant: "rappel", palier_suivant_le: decale(13) }),
      suivi(id(122), { palier_suivant: "devis_rappel", palier_suivant_le: decale(2) }),
    ],
  },
];

export const SANS_COMPTE_EXEMPLE: ReglementEtat[] = [
  { id: id(191), compte_id: null, compte: null, recu_le: decale(-1), montant: 18450, mode: "virement", reference: null, libelle: "VIR SEPA GARAGE MONDESIR", statut: "actif", impute: 0, a_imputer: 18450 },
];

export const DERNIER_IMPORT_EXEMPLE = `${decale(0)}T05:41:00Z`;

/* la signature : le service comptable de la société qui a émis la facture */
const signature = (societe: string) => `\n\nBien cordialement,\n${societe} — service comptable\n`;

export const RELANCES_EXEMPLE: Relance[] = [
  {
    id: id(101), compte_id: sccv.id, compte: sccv.nom, jour: decale(0), nature: "facture", palier: "rappel", langue: "fr",
    destinataire_adresse: sccv.contact_facturation_email, destinataire_nom: "Mme Lagier",
    sujet: "Brico Soléa Martinique — rappel : facture BM-2026-0731 échue",
    corps: `Bonjour Mme Lagier,\n\nSauf erreur de notre part, la somme suivante reste due sur votre compte C-SCHOELCHER, secteur Promotion immobilière :\n  • Facture BM-2026-0731 du ${fr(-75)}, 12 000,00 € TTC, échue le ${fr(-45)} (45 jours de retard) : 12 000,00 € restant dus\n\nIl s'agit sans doute d'un simple oubli. Si le règlement est déjà parti, merci de ne pas tenir compte de ce message. Pour toute question sur cette facture, il vous suffit de répondre à ce courriel.${signature("Brico Soléa Martinique")}`,
    montant: 12000, penalites: 0, indemnites: 40, statut: "a_valider", etat: "a_valider", motif: null, demande_id: id(201), envoi_id: id(301), envoye_le: null,
    pieces: [{ facture_id: id(11), numero: "BM-2026-0731", palier: "rappel", reste_du: 12000, retard_jours: 45, penalites: 179.75, indemnite: 40 }],
  },
  {
    id: id(102), compte_id: hotel.id, compte: hotel.nom, jour: decale(0), nature: "facture", palier: "mise_en_demeure", langue: "fr",
    destinataire_adresse: hotel.contact_facturation_email, destinataire_nom: hotel.nom,
    sujet: "Soléa Froid — mise en demeure de payer 24 000,00 €",
    corps: `Bonjour Madame, Monsieur,\n\nMalgré nos précédentes relances, les sommes suivantes restent impayées (compte C-ALIZES, secteur Hôtellerie) :\n  • Facture SF-2026-0094 du ${fr(-130)}, 28 800,00 € TTC, échue le ${fr(-100)} (100 jours de retard) : 24 000,00 € restant dus\n\nPar la présente, nous vous mettons en demeure de régler la somme de 24 000,00 € dans un délai de 8 jours à compter de la réception de ce courrier, soit au plus tard le ${fr(8)}.\nEn application des articles L441-10 et D441-5 du Code de commerce, sont également dues des pénalités de retard (798,90 € à ce jour) et une indemnité forfaitaire pour frais de recouvrement de 40,00 € par facture (40,00 € au total).\nÀ défaut de règlement dans ce délai, nous engagerons une procédure de recouvrement, sans autre avis.${signature("Soléa Froid")}`,
    montant: 24000, penalites: 798.9, indemnites: 40, statut: "a_valider", etat: "a_valider", motif: null, demande_id: id(202), envoi_id: id(302), envoye_le: null,
    pieces: [{ facture_id: id(21), numero: "SF-2026-0094", palier: "mise_en_demeure", reste_du: 24000, retard_jours: 100, penalites: 798.9, indemnite: 40 }],
  },
  {
    id: id(103), compte_id: sccv.id, compte: sccv.nom, jour: decale(0), nature: "devis", palier: "devis_rappel", langue: "fr",
    destinataire_adresse: sccv.contact_facturation_email, destinataire_nom: "Mme Lagier",
    sujet: "Brico Soléa Martinique — votre devis BM-D-2026-0144",
    corps: `Bonjour Mme Lagier,\n\nNous vous avons adressé le devis suivant (compte C-SCHOELCHER, secteur Promotion immobilière) :\n  • Devis BM-D-2026-0144 du ${fr(-5)} : 126 400,00 €\n\nAvez-vous des questions, ou souhaitez-vous que nous l'ajustions ? Nous en parlerons volontiers.${signature("Brico Soléa Martinique")}`,
    montant: 126400, penalites: 0, indemnites: 0, statut: "a_valider", etat: "a_valider", motif: null, demande_id: id(203), envoi_id: id(303), envoye_le: null,
    pieces: [{ facture_id: id(13), numero: "BM-D-2026-0144", palier: "devis_rappel", reste_du: 126400, retard_jours: 0, penalites: 0, indemnite: 0 }],
  },
  {
    id: id(104), compte_id: garage.id, compte: garage.nom, jour: decale(-18), nature: "facture", palier: "rappel", langue: "fr",
    destinataire_adresse: garage.contact_facturation_email, destinataire_nom: "M. Mondésir",
    sujet: "Soléa Pièces — rappel : facture SP-2026-0288 échue",
    corps: null, montant: 18450, penalites: 0, indemnites: 40, statut: "a_valider", etat: "envoyee", motif: null, demande_id: id(204), envoi_id: id(304),
    envoye_le: `${decale(-18)}T07:42:00Z`,
    pieces: [{ facture_id: id(41), numero: "SP-2026-0288", palier: "rappel", reste_du: 18450, retard_jours: 7, penalites: 0, indemnite: 40 }],
  },
  {
    id: id(105), compte_id: ricou.id, compte: ricou.nom, jour: decale(-5), nature: "facture", palier: "rappel", langue: "fr",
    destinataire_adresse: ricou.contact_facturation_email, destinataire_nom: ricou.nom,
    sujet: "Soléa Location — rappel : facture SL-2026-0452 échue",
    corps: null, montant: 9860, penalites: 0, indemnites: 40, statut: "coupee", etat: "coupee", motif: "compte pause : Le gérant a appelé : paiement promis vendredi", demande_id: id(205), envoi_id: null, envoye_le: null,
    pieces: [{ facture_id: id(51), numero: "SL-2026-0452", palier: "rappel", reste_du: 9860, retard_jours: 7, penalites: 0, indemnite: 40 }],
  },
  {
    // Validée ce matin, à envoyer soi-même (envoi du module coupé) : le geste « Noter l'envoi à la main » (c2_11).
    id: id(106), compte_id: garage.id, compte: garage.nom, jour: decale(0), nature: "facture", palier: "relance", langue: "fr",
    destinataire_adresse: garage.contact_facturation_email, destinataire_nom: "M. Mondésir",
    sujet: "Soléa Pièces — relance : 18 450,00 € restent dus",
    corps: `Bonjour M. Mondésir,\n\nMalgré notre précédent rappel, la somme suivante reste impayée sur votre compte C-MONDESIR, secteur Garage :\n  • Facture SP-2026-0288 du ${fr(-55)}, 18 450,00 € TTC, échue le ${fr(-25)} (25 jours de retard) : 18 450,00 € restant dus\n\nTotal restant dû : 18 450,00 €. Nous vous remercions de procéder au règlement au plus tard le ${fr(8)}.\nNous vous rappelons que tout retard de paiement rend exigibles une indemnité forfaitaire pour frais de recouvrement de 40,00 € par facture et des pénalités de retard (Code de commerce, art. L441-10).\nSi vous contestez tout ou partie de ces montants, merci de nous l'écrire pour que nous l'examinions.${signature("Soléa Pièces")}`,
    montant: 18450, penalites: 0, indemnites: 40, statut: "a_valider", etat: "validee", motif: null, demande_id: id(206), envoi_id: null, envoye_le: null,
    pieces: [{ facture_id: id(41), numero: "SP-2026-0288", palier: "relance", reste_du: 18450, retard_jours: 25, penalites: 0, indemnite: 40 }],
  },
  {
    /* Batimat Caraïbes, Soléa Import : au-dessus du seuil de 50 000 €, la direction valide */
    id: id(107), compte_id: batimatSI.id, compte: batimatSI.nom, jour: decale(0), nature: "facture", palier: "relance", langue: "fr",
    destinataire_adresse: batimatSI.contact_facturation_email, destinataire_nom: "M. Célestine",
    sujet: "Soléa Import — relance : 170 000,00 € restent dus",
    corps: `Bonjour M. Célestine,\n\nMalgré notre précédent rappel, les sommes suivantes restent impayées sur votre compte C-BATIMAT-SI, secteur BTP — négoce de matériaux :\n  • Facture SI-2026-0412 du ${fr(-102)}, 74 000,00 € TTC, échue le ${fr(-72)} (72 jours de retard) : 74 000,00 € restant dus\n  • Facture SI-2026-0538 du ${fr(-78)}, 96 000,00 € TTC, échue le ${fr(-48)} (48 jours de retard) : 96 000,00 € restant dus\n\nTotal restant dû : 170 000,00 €. Compte tenu du montant en jeu, merci de nous indiquer dès à présent la date de règlement prévue, au plus tard le ${fr(8)}.\nSi un règlement en plusieurs fois vous aide, répondez-nous : nous pouvons convenir d'un échéancier.\nNous vous rappelons que tout retard de paiement rend exigibles une indemnité forfaitaire pour frais de recouvrement de 40,00 € par facture et des pénalités de retard (Code de commerce, art. L441-10).${signature("Soléa Import")}`,
    montant: 170000, penalites: 0, indemnites: 80, statut: "a_valider", etat: "a_valider", motif: null, demande_id: id(207), envoi_id: id(307), envoye_le: null,
    pieces: [
      { facture_id: id(61), numero: "SI-2026-0412", palier: "relance", reste_du: 74000, retard_jours: 72, penalites: 1773.57, indemnite: 40 },
      { facture_id: id(62), numero: "SI-2026-0538", palier: "relance", reste_du: 96000, retard_jours: 48, penalites: 1533.9, indemnite: 40 },
    ],
  },
  {
    id: id(108), compte_id: batimatSP.id, compte: batimatSP.nom, jour: decale(0), nature: "facture", palier: "mise_en_demeure", langue: "fr",
    destinataire_adresse: batimatSP.contact_facturation_email, destinataire_nom: "M. Célestine",
    sujet: "Soléa Pièces — mise en demeure de payer 26 000,00 €",
    corps: `Bonjour M. Célestine,\n\nMalgré nos précédentes relances, les sommes suivantes restent impayées (compte C-BATIMAT-SP, secteur BTP — négoce de matériaux) :\n  • Facture SP-2026-0217 du ${fr(-125)}, 26 000,00 € TTC, échue le ${fr(-95)} (95 jours de retard) : 26 000,00 € restant dus\n\nPar la présente, nous vous mettons en demeure de régler la somme de 26 000,00 € dans un délai de 8 jours à compter de la réception de ce courrier, soit au plus tard le ${fr(8)}.\nEn application des articles L441-10 et D441-5 du Code de commerce, sont également dues des pénalités de retard (822,21 € à ce jour) et une indemnité forfaitaire pour frais de recouvrement de 40,00 € par facture (40,00 € au total).\nÀ défaut de règlement dans ce délai, nous engagerons une procédure de recouvrement, sans autre avis.${signature("Soléa Pièces")}`,
    montant: 26000, penalites: 822.21, indemnites: 40, statut: "a_valider", etat: "a_valider", motif: null, demande_id: id(208), envoi_id: id(308), envoye_le: null,
    pieces: [{ facture_id: id(71), numero: "SP-2026-0217", palier: "mise_en_demeure", reste_du: 26000, retard_jours: 95, penalites: 822.21, indemnite: 40 }],
  },
  {
    id: id(109), compte_id: batimatBG.id, compte: batimatBG.nom, jour: decale(0), nature: "facture", palier: "relance", langue: "fr",
    destinataire_adresse: batimatBG.contact_facturation_email, destinataire_nom: "M. Célestine",
    sujet: "Brico Soléa Guadeloupe — relance : 18 000,00 € restent dus",
    corps: `Bonjour M. Célestine,\n\nMalgré notre précédent rappel, la somme suivante reste impayée sur votre compte C-BATIMAT-BG, secteur BTP — négoce de matériaux :\n  • Facture BG-2026-1184 du ${fr(-98)}, 18 000,00 € TTC, échue le ${fr(-68)} (68 jours de retard) : 18 000,00 € restant dus\n\nTotal restant dû : 18 000,00 €. Nous vous remercions de procéder au règlement au plus tard le ${fr(8)}.\nNous vous rappelons que tout retard de paiement rend exigibles une indemnité forfaitaire pour frais de recouvrement de 40,00 € par facture et des pénalités de retard (Code de commerce, art. L441-10).\nSi vous contestez tout ou partie de ces montants, merci de nous l'écrire pour que nous l'examinions.${signature("Brico Soléa Guadeloupe")}`,
    montant: 18000, penalites: 0, indemnites: 40, statut: "a_valider", etat: "a_valider", motif: null, demande_id: id(209), envoi_id: id(309), envoye_le: null,
    pieces: [{ facture_id: id(81), numero: "BG-2026-1184", palier: "relance", reste_du: 18000, retard_jours: 68, penalites: 407.44, indemnite: 40 }],
  },
  {
    id: id(110), compte_id: anse.id, compte: anse.nom, jour: decale(-6), nature: "facture", palier: "rappel", langue: "fr",
    destinataire_adresse: anse.contact_facturation_email, destinataire_nom: "M. Bonheur",
    sujet: "Maison Soléa — rappel : facture ME-2026-0318 échue",
    corps: null, montant: 142000, penalites: 0, indemnites: 40, statut: "a_valider", etat: "envoyee", motif: null, demande_id: id(210), envoi_id: id(310),
    envoye_le: `${decale(-6)}T07:38:00Z`,
    pieces: [{ facture_id: id(101), numero: "ME-2026-0318", palier: "rappel", reste_du: 142000, retard_jours: 32, penalites: 0, indemnite: 40 }],
  },
];
