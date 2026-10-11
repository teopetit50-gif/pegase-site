/* ══════════════════════════════════════════════════════════════════════
   CASHD — le monde d'exemple (06/10/2026, session C2)

   Atelier Bertin (le même client fictif que les autres écrans) relance
   les impayés de ses propres clients. Cinq débiteurs, la même histoire que
   les tests pgTAP (omega/tests/cashd/c2_00_jeu.sql) : la SCI Lefèvre doit
   12 000 € échus depuis 45 jours, l'hôtel des Brotteaux 3 000 € depuis
   100 jours (avoir déduit), la mairie de Caluire n'est pas échue, les
   Peintures Giraud ont reçu leur rappel, la boulangerie Martin est en
   pause. Un virement de 1 850 € est arrivé sans référence.

   Dates RELATIVES au jour de la visite : un retard reste un retard demain.
   Identifiants en 0000… : rien ici ne se confond avec la base.
   ══════════════════════════════════════════════════════════════════════ */

import { EXEMPLE_CLIENT_ID } from "../exemples/socle";
import { jourParis } from "./calcul";
import type { Compte, Fiche, Piece, Relance, ReglementEtat, Reglages, Suivi } from "./types";

const ENTITE = "00000000-0000-4000-8000-0000000000e1";

function decale(jours: number): string {
  const d = new Date(`${jourParis()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

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
  seuil_direction: 2000,
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

const sci = compte(1, { reference: "C-LEFEVRE", nom: "SCI Lefèvre Patrimoine", secteur: "Immobilier", siren: "552100554", contact_facturation_nom: "Mme Lefèvre", contact_facturation_email: "compta@lefevre-patrimoine.fr", plafond_encours: 20000 });
const hotel = compte(2, { reference: "C-BROTTEAUX", nom: "Hôtel des Brotteaux", groupe: "Groupe Brotteaux", secteur: "Hôtellerie", contact_facturation_email: "factures@hotel-brotteaux.fr" });
const mairie = compte(3, { reference: "C-CALUIRE", nom: "Mairie de Caluire", secteur: "Collectivité", contact_facturation_email: "mandatement@caluire.fr" });
const giraud = compte(4, { reference: "C-GIRAUD", nom: "Peintures Giraud SARL", secteur: "Bâtiment", contact_facturation_nom: "M. Giraud", contact_facturation_email: "compta@peintures-giraud.fr" });
const martin = compte(5, { reference: "C-MARTIN", nom: "Boulangerie Martin", secteur: "Commerce", contact_facturation_email: "boulangerie.martin@orange.fr", statut: "pause", statut_motif: "Le gérant a appelé : paiement promis vendredi", statut_le: `${decale(-2)}T09:12:00Z` });

export const FICHES_EXEMPLE: Fiche[] = [
  {
    compte: sci,
    balance: null,
    pieces: [
      piece(11, sci.id, { numero: "F-2026-101", date_emission: decale(-75), echeance: decale(-45), montant_ttc: 12000 }),
      piece(12, sci.id, { numero: "F-2026-140", date_emission: decale(-10), echeance: decale(20), montant_ttc: 6000 }),
      piece(13, sci.id, { nature: "devis", numero: "D-2026-033", date_emission: decale(-5), montant_ttc: 8400, statut: "en_attente" }),
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
      piece(21, hotel.id, { numero: "F-2026-050", date_emission: decale(-130), echeance: decale(-100), montant_ttc: 3600, avoirs_imputes: 600 }),
      piece(22, hotel.id, { nature: "avoir", numero: "A-2026-007", date_emission: decale(-20), montant_ttc: 600, statut: "soldee", statut_motif: "avoir entièrement imputé" }),
    ],
    reglements: [],
    suivi: [suivi(id(21), { palier_atteint: "mise_en_demeure", palier_atteint_le: decale(0), derniere_relance_statut: "a_valider", etat_sequence: "sequence_terminee" })],
  },
  {
    compte: mairie,
    balance: null,
    pieces: [piece(31, mairie.id, { numero: "F-2026-150", date_emission: decale(-1), echeance: decale(29), montant_ttc: 2400 })],
    reglements: [],
    suivi: [suivi(id(31), { palier_suivant: "rappel", palier_suivant_le: decale(36) })],
  },
  {
    compte: giraud,
    balance: null,
    pieces: [piece(41, giraud.id, { numero: "F-2026-088", date_emission: decale(-55), echeance: decale(-25), montant_ttc: 1850 })],
    reglements: [],
    suivi: [suivi(id(41), { palier_atteint: "rappel", palier_atteint_le: decale(-18), derniere_relance_statut: "a_valider", palier_suivant: "relance", palier_suivant_le: decale(-4), etat_sequence: "en_cours" })],
  },
  {
    compte: martin,
    balance: null,
    pieces: [piece(51, martin.id, { numero: "F-2026-120", date_emission: decale(-42), echeance: decale(-12), montant_ttc: 960 })],
    reglements: [],
    suivi: [suivi(id(51), { palier_atteint: "rappel", palier_atteint_le: decale(-5), derniere_relance_statut: "a_valider", palier_suivant: "relance", palier_suivant_le: decale(9), etat_sequence: "pause" })],
  },
];

export const SANS_COMPTE_EXEMPLE: ReglementEtat[] = [
  { id: id(91), compte_id: null, compte: null, recu_le: decale(-1), montant: 1850, mode: "virement", reference: null, libelle: "VIR SEPA PEINT GIRAUD", statut: "actif", impute: 0, a_imputer: 1850 },
];

export const DERNIER_IMPORT_EXEMPLE = `${decale(0)}T05:41:00Z`;

const signature = "\n\nBien cordialement,\nAtelier Bertin — service comptable\n";

export const RELANCES_EXEMPLE: Relance[] = [
  {
    id: id(101), compte_id: sci.id, compte: sci.nom, jour: decale(0), nature: "facture", palier: "rappel", langue: "fr",
    destinataire_adresse: sci.contact_facturation_email, destinataire_nom: "Mme Lefèvre",
    sujet: "Atelier Bertin — rappel : facture F-2026-101 échue",
    corps: `Bonjour Mme Lefèvre,\n\nSauf erreur de notre part, la somme suivante reste due sur votre compte C-LEFEVRE, secteur Immobilier :\n  • Facture F-2026-101 du ${decale(-75).split("-").reverse().join("/")}, 12 000,00 € TTC, échue le ${decale(-45).split("-").reverse().join("/")} (45 jours de retard) : 12 000,00 € restant dus\n\nIl s'agit sans doute d'un simple oubli. Si le règlement est déjà parti, merci de ne pas tenir compte de ce message. Pour toute question sur cette facture, il vous suffit de répondre à ce courriel.${signature}`,
    montant: 12000, penalites: 0, indemnites: 40, statut: "a_valider", etat: "a_valider", motif: null, demande_id: id(201), envoi_id: id(301), envoye_le: null,
    pieces: [{ facture_id: id(11), numero: "F-2026-101", palier: "rappel", reste_du: 12000, retard_jours: 45, penalites: 179.75, indemnite: 40 }],
  },
  {
    id: id(102), compte_id: hotel.id, compte: hotel.nom, jour: decale(0), nature: "facture", palier: "mise_en_demeure", langue: "fr",
    destinataire_adresse: hotel.contact_facturation_email, destinataire_nom: hotel.nom,
    sujet: "Atelier Bertin — mise en demeure de payer 3 000,00 €",
    corps: `Bonjour Madame, Monsieur,\n\nMalgré nos précédentes relances, les sommes suivantes restent impayées (compte C-BROTTEAUX, secteur Hôtellerie) :\n  • Facture F-2026-050 du ${decale(-130).split("-").reverse().join("/")}, 3 600,00 € TTC, échue le ${decale(-100).split("-").reverse().join("/")} (100 jours de retard) : 3 000,00 € restant dus\n\nPar la présente, nous vous mettons en demeure de régler la somme de 3 000,00 € dans un délai de 8 jours à compter de la réception de ce courrier, soit au plus tard le ${decale(8).split("-").reverse().join("/")}.\nEn application des articles L441-10 et D441-5 du Code de commerce, sont également dues des pénalités de retard (99,86 € à ce jour) et une indemnité forfaitaire pour frais de recouvrement de 40,00 € par facture (40,00 € au total).\nÀ défaut de règlement dans ce délai, nous engagerons une procédure de recouvrement, sans autre avis.${signature}`,
    montant: 3000, penalites: 99.86, indemnites: 40, statut: "a_valider", etat: "a_valider", motif: null, demande_id: id(202), envoi_id: id(302), envoye_le: null,
    pieces: [{ facture_id: id(21), numero: "F-2026-050", palier: "mise_en_demeure", reste_du: 3000, retard_jours: 100, penalites: 99.86, indemnite: 40 }],
  },
  {
    id: id(103), compte_id: sci.id, compte: sci.nom, jour: decale(0), nature: "devis", palier: "devis_rappel", langue: "fr",
    destinataire_adresse: sci.contact_facturation_email, destinataire_nom: "Mme Lefèvre",
    sujet: "Atelier Bertin — votre devis D-2026-033",
    corps: `Bonjour Mme Lefèvre,\n\nNous vous avons adressé le devis suivant (compte C-LEFEVRE, secteur Immobilier) :\n  • Devis D-2026-033 du ${decale(-5).split("-").reverse().join("/")} : 8 400,00 €\n\nAvez-vous des questions, ou souhaitez-vous que nous l'ajustions ? Nous en parlerons volontiers.${signature}`,
    montant: 8400, penalites: 0, indemnites: 0, statut: "a_valider", etat: "a_valider", motif: null, demande_id: id(203), envoi_id: id(303), envoye_le: null,
    pieces: [{ facture_id: id(13), numero: "D-2026-033", palier: "devis_rappel", reste_du: 8400, retard_jours: 0, penalites: 0, indemnite: 0 }],
  },
  {
    id: id(104), compte_id: giraud.id, compte: giraud.nom, jour: decale(-18), nature: "facture", palier: "rappel", langue: "fr",
    destinataire_adresse: giraud.contact_facturation_email, destinataire_nom: "M. Giraud",
    sujet: "Atelier Bertin — rappel : facture F-2026-088 échue",
    corps: null, montant: 1850, penalites: 0, indemnites: 40, statut: "a_valider", etat: "envoyee", motif: null, demande_id: id(204), envoi_id: id(304),
    envoye_le: `${decale(-18)}T07:42:00Z`,
    pieces: [{ facture_id: id(41), numero: "F-2026-088", palier: "rappel", reste_du: 1850, retard_jours: 7, penalites: 0, indemnite: 40 }],
  },
  {
    id: id(105), compte_id: martin.id, compte: martin.nom, jour: decale(-5), nature: "facture", palier: "rappel", langue: "fr",
    destinataire_adresse: martin.contact_facturation_email, destinataire_nom: martin.nom,
    sujet: "Atelier Bertin — rappel : facture F-2026-120 échue",
    corps: null, montant: 960, penalites: 0, indemnites: 40, statut: "coupee", etat: "coupee", motif: "compte pause : Le gérant a appelé : paiement promis vendredi", demande_id: id(205), envoi_id: null, envoye_le: null,
    pieces: [{ facture_id: id(51), numero: "F-2026-120", palier: "rappel", reste_du: 960, retard_jours: 7, penalites: 0, indemnite: 40 }],
  },
];
