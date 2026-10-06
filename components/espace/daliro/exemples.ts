/* ══════════════════════════════════════════════════════════════════════
   Le monde d'EXEMPLE de l'écran DALIRO (05/10/2026, session B6)

   Atelier Bertin (menuiserie-agencement, Lyon — l'entreprise fictive des
   trois écrans d'A3) tient deux chantiers : « Résidence Les Tilleuls »,
   ouvert, le même que le scénario réel joué par les tests pgTAP (marché
   vérifié, avenant à signer, passages confirmés ou non, facture de Dumont
   rattachée au lot 02) ; et « Maison Rolland — extension », en préparation,
   dont le marché est encore à vérifier (une ligne au montant faux, une sans
   lot). Les identifiants commencent par 0000… : rien ici ne peut être
   confondu avec une ligne de la base, et rien d'ici n'est jamais écrit en
   base. Les dates sont relatives au jour de la visite.
   ══════════════════════════════════════════════════════════════════════ */

import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI, YANIS, aujourdHui, ilYa } from "../exemples/socle";
import type { Avenant, Chantier, Controle, Lot, Marche, Passage, Prix, Tableau, Tiers } from "./types";

const id = (n: string) => `00000000-0000-4000-8000-00000000d${n.padStart(3, "0")}`;

export const TILLEULS = id("001");
export const ROLLAND = id("002");
const ENT_TIL = id("011");
const ENT_ROL = id("012");
const MO_LEFEVRE = id("021");
const DUMONT = id("022");
const ROCHAT = id("023");
const MRA = id("024");
const MO_ROLLAND = id("025");
const EQUIPE_A = id("031");
const LOT1 = id("041");
const LOT2 = id("042");
const LOT3 = id("043");
const LOTR1 = id("044");
const M1 = id("051");
const MR = id("052");
const L1 = id("061");
const L2 = id("062");
const L3 = id("063");
const L4 = id("064");
const L5 = id("065");
const L6 = id("066");
const LR1 = id("067");
const LR2 = id("068");
const LR3 = id("069");
const P1 = id("071");
const P2 = id("072");
const P3 = id("073");
const P4 = id("074");
const P5 = id("075");
const P7 = id("077");
export const AV1 = id("081");
export const AV2 = id("082");
export const PRIX_GC = id("091");
const PRIX_H = id("092");
const PRIX_FEN = id("093");
const PRIX_PORTE = id("094");
export const PRIX_DEPOSE = id("095");
const FACT_DUMONT = id("101");
export const FACT_MRA = id("102");

const TIERS: Tiers[] = [
  { id: MO_LEFEVRE, roles: ["maitre_ouvrage"], nom: "SCI Lefèvre Patrimoine", siren: "732829320", telephone: null, email: "contact@lefevre-patrimoine.test", canal: "email", commune: "Villeurbanne", corps_etat: [], departements: [], confirmer_passages: true, vigilance_attestation_le: null, vigilance_verifiee_le: null, actif: true, vigilance: "sans_objet" },
  { id: DUMONT, roles: ["sous_traitant"], nom: "Serrurerie Dumont", siren: "552100554", telephone: "+33612345601", email: "contact@dumont.test", canal: "whatsapp", commune: "Lyon", corps_etat: ["serrurerie"], departements: ["69", "01"], confirmer_passages: true, vigilance_attestation_le: aujourdHui(-20), vigilance_verifiee_le: ilYa(19), actif: true, vigilance: "a_jour" },
  { id: ROCHAT, roles: ["sous_traitant"], nom: "Métallerie Rochat", siren: "542107651", telephone: "+33612345602", email: null, canal: "sms", commune: "Caluire-et-Cuire", corps_etat: ["serrurerie"], departements: ["69"], confirmer_passages: true, vigilance_attestation_le: aujourdHui(-170), vigilance_verifiee_le: ilYa(160), actif: true, vigilance: "a_renouveler" },
  { id: MRA, roles: ["fournisseur"], nom: "Menuiseries Rhône-Alpes", siren: "775665011", telephone: null, email: "commandes@mra.test", canal: "email", commune: "Saint-Priest", corps_etat: [], departements: [], confirmer_passages: false, vigilance_attestation_le: null, vigilance_verifiee_le: null, actif: true, vigilance: "sans_objet" },
  { id: MO_ROLLAND, roles: ["maitre_ouvrage"], nom: "M. et Mme Rolland", siren: null, telephone: "+33698765432", email: null, canal: "sms", commune: "Grenoble", corps_etat: [], departements: [], confirmer_passages: true, vigilance_attestation_le: null, vigilance_verifiee_le: null, actif: true, vigilance: "sans_objet" },
];

const LOTS_TIL: Lot[] = [
  { id: LOT1, chantier_id: TILLEULS, code: "01", libelle: "Menuiseries extérieures", corps_etat: "menuiserie", corps_etat_libelle: "Menuiserie", rang: 1, execution: "client", tiers_id: null, equipe_id: EQUIPE_A, equipe_nom: "Pose A", exterieur: false, statut: "en_cours", acceptation: null },
  { id: LOT2, chantier_id: TILLEULS, code: "02", libelle: "Garde-corps", corps_etat: "serrurerie", corps_etat_libelle: "Serrurerie-métallerie", rang: 2, execution: "sous_traitant", tiers_id: DUMONT, tiers_nom: "Serrurerie Dumont", equipe_id: null, exterieur: true, statut: "a_venir", acceptation: "acceptee" },
  { id: LOT3, chantier_id: TILLEULS, code: "03", libelle: "Peinture des menuiseries", corps_etat: "peinture", corps_etat_libelle: "Peinture", rang: 3, execution: "autre_titulaire", tiers_id: null, equipe_id: null, exterieur: false, statut: "a_venir", acceptation: null },
];

const MARCHE_TIL: Marche = {
  id: M1, chantier_id: TILLEULS, reference: "M-2026-014", objet: "Menuiseries extérieures et garde-corps, 12 logements", date_signature: aujourdHui(-30), mode_prix: "forfait",
  retenue_taux: 0.05, retenue_base: "ht", retenue_caution: false, source: "saisie", piece_id: null, statut: "verifie", verifie_par: EXEMPLE_MOI, verifie_libelle: "Vous", verifie_le: ilYa(12),
  montant_ht_declare: 90625, total_ht_lignes: 90625,
  lignes: [
    { id: L6, marche_id: M1, lot_id: LOT1, ordre: 0, numero: "0.1", section: null, designation: "Installation de chantier", unite: "forfait", quantite: null, nature: "forfait", controle: "ok", ecart_accepte: false, ecart_motif: null, corrigee: false, prix_unitaire_ht: null, montant_ht: 2500, ecart: null },
    { id: L1, marche_id: M1, lot_id: LOT1, ordre: 1, numero: "1.1", section: "Menuiseries", designation: "Fenêtre bois-alu un vantail, vitrage 4/16/4 faible émissivité", unite: "u", quantite: 24, nature: "ouvrage", controle: "ok", ecart_accepte: false, ecart_motif: null, corrigee: true, prix_unitaire_ht: 1180, montant_ht: 28320, ecart: 0 },
    { id: L2, marche_id: M1, lot_id: LOT1, ordre: 2, numero: "1.2", section: "Menuiseries", designation: "Porte d'entrée palière, bloc-porte acier, serrure 3 points", unite: "u", quantite: 12, nature: "ouvrage", controle: "ok", ecart_accepte: false, ecart_motif: null, corrigee: true, prix_unitaire_ht: 2350, montant_ht: 28200, ecart: 0 },
    { id: L3, marche_id: M1, lot_id: LOT2, ordre: 3, numero: "2.1", section: "Garde-corps", designation: "Garde-corps acier laqué, hauteur 1,00 m", unite: "ml", quantite: 160, nature: "ouvrage", controle: "ok", ecart_accepte: false, ecart_motif: null, corrigee: false, prix_unitaire_ht: 142, montant_ht: 22720, ecart: 0 },
    { id: L4, marche_id: M1, lot_id: LOT2, ordre: 4, numero: "2.2", section: "Garde-corps", designation: "Main courante inox brossé", unite: "ml", quantite: 60, nature: "ouvrage", controle: "montant_faux", ecart_accepte: true, ecart_motif: "Remise négociée de 80 € sur la main courante, voir courriel du 12/09", corrigee: false, prix_unitaire_ht: 23, montant_ht: 1300, ecart: -80 },
    { id: L5, marche_id: M1, lot_id: LOT3, ordre: 5, numero: "3.1", section: "Peinture", designation: "Peinture des menuiseries, deux couches", unite: "m2", quantite: 410, nature: "ouvrage", controle: "ok", ecart_accepte: false, ecart_motif: null, corrigee: false, prix_unitaire_ht: 18.5, montant_ht: 7585, ecart: 0 },
  ],
  controles: [],
};

const MARCHE_ROL: Marche = {
  id: MR, chantier_id: ROLLAND, reference: "D-2026-087", objet: "Extension bois : menuiseries et bardage", date_signature: aujourdHui(-4), mode_prix: "unitaire",
  retenue_taux: 0, retenue_base: "ttc", retenue_caution: false, source: "pdf", piece_id: null, statut: "a_verifier", verifie_par: null, verifie_libelle: null, verifie_le: null,
  montant_ht_declare: 23790, total_ht_lignes: 23790,
  lignes: [
    { id: LR1, marche_id: MR, lot_id: LOTR1, ordre: 1, numero: "1", section: null, designation: "Baie coulissante aluminium 3 vantaux", unite: "u", quantite: 2, nature: "ouvrage", controle: "ok", ecart_accepte: false, ecart_motif: null, corrigee: false, prix_unitaire_ht: 4850, montant_ht: 9700, ecart: 0 },
    { id: LR2, marche_id: MR, lot_id: LOTR1, ordre: 2, numero: "2", section: null, designation: "Bardage mélèze à claire-voie, pose comprise", unite: "m2", quantite: 86, nature: "ouvrage", controle: "montant_faux", ecart_accepte: false, ecart_motif: null, corrigee: false, prix_unitaire_ht: 145, montant_ht: 12420, ecart: -50 },
    { id: LR3, marche_id: MR, lot_id: null, ordre: 3, numero: "3", section: null, designation: "Évacuation des gravats", unite: "forfait", quantite: null, nature: "forfait", controle: "ok", ecart_accepte: false, ecart_motif: null, corrigee: false, prix_unitaire_ht: null, montant_ht: 1670, ecart: null },
  ],
  controles: [
    { ligne_id: LR2, ordre: 2, code: "montant_faux", bloquant: true, message: "Le montant n'est pas quantité × prix unitaire." },
    { ligne_id: LR3, ordre: 3, code: "sans_lot", bloquant: true, message: "Ligne rattachée à aucun lot du chantier." },
  ],
};

const PASSAGES_TIL: Passage[] = [
  { id: P4, chantier_id: TILLEULS, lot_id: LOT2, lot_code: "02", lot_libelle: "Garde-corps", equipe_id: null, tiers_id: DUMONT, intervenant_type: "tiers", intervenant_lu: "Dumont Serrurerie SARL", intervenant_nom: "Serrurerie Dumont", rapprochement: "ressemblance", tache: "Relevé des cotes garde-corps", debut: aujourdHui(2), fin: aujourdHui(2), exterieur: true, statut: "prevu", confirmation: "confirmee", confirmation_le: ilYa(0, 8), source: "tableur", source_ref: "P4", version: 1,
    envoi: { id: id("251"), canal: "whatsapp", mode: "reel", statut: "envoye", verrou: null, cree_le: ilYa(1, 17), envoye_le: ilYa(1, 17), remise: "remis", remise_le: ilYa(1, 17) },
    confirmations: [
      { id: id("201"), passage_id: P4, evenement: "demandee", canal: "whatsapp", cle: "demande:P4", detail: {}, survenu_le: ilYa(1, 17) },
      { id: id("202"), passage_id: P4, evenement: "confirmee", canal: "whatsapp", cle: "wa:msg-0001", detail: { texte: "OK pour mercredi 7 h 30" }, survenu_le: ilYa(0, 8) },
    ] },
  { id: P7, chantier_id: TILLEULS, lot_id: LOT2, lot_code: "02", lot_libelle: "Garde-corps", equipe_id: null, tiers_id: DUMONT, intervenant_type: "tiers", intervenant_lu: "Serrurerie Dumont", intervenant_nom: "Serrurerie Dumont", rapprochement: "identique", tache: "Pose des platines", debut: aujourdHui(1), fin: aujourdHui(1), exterieur: true, statut: "prevu", confirmation: "sans_reponse", confirmation_le: ilYa(0, 17), source: "tableur", source_ref: "P7", version: 1,
    envoi: { id: id("252"), canal: "whatsapp", mode: "reel", statut: "envoye", verrou: null, cree_le: ilYa(2, 17), envoye_le: ilYa(2, 17), remise: null, remise_le: null },
    confirmations: [
      { id: id("203"), passage_id: P7, evenement: "demandee", canal: "whatsapp", cle: "demande:P7", detail: {}, survenu_le: ilYa(2, 17) },
      { id: id("204"), passage_id: P7, evenement: "sans_reponse", canal: null, cle: "sans_reponse:P7", detail: { remplacants: [{ tiers: ROCHAT, nom: "Métallerie Rochat", canal: "sms", vigilance: "a_renouveler" }] }, survenu_le: ilYa(0, 17) },
    ] },
  { id: P1, chantier_id: TILLEULS, lot_id: LOT1, lot_code: "01", lot_libelle: "Menuiseries extérieures", equipe_id: EQUIPE_A, tiers_id: null, intervenant_type: "equipe", intervenant_lu: "Pose A", intervenant_nom: "Pose A", rapprochement: "identique", tache: "Pose des fenêtres", debut: aujourdHui(4), fin: aujourdHui(11), exterieur: false, statut: "prevu", confirmation: "non_demandee", confirmation_le: null, source: "tableur", source_ref: "P1", version: 2, confirmations: [] },
  { id: P2, chantier_id: TILLEULS, lot_id: LOT2, lot_code: "02", lot_libelle: "Garde-corps", equipe_id: null, tiers_id: DUMONT, intervenant_type: "tiers", intervenant_lu: "Serrurerie Dumont", intervenant_nom: "Serrurerie Dumont", rapprochement: "identique", tache: "Pose des garde-corps", debut: aujourdHui(12), fin: aujourdHui(16), exterieur: true, statut: "prevu", confirmation: "declinee", confirmation_le: ilYa(0, 11), source: "tableur", source_ref: "P2", version: 1,
    envoi: { id: id("253"), canal: "whatsapp", mode: "reel", statut: "envoye", verrou: null, cree_le: ilYa(0, 9), envoye_le: ilYa(0, 9), remise: "remis", remise_le: ilYa(0, 9) },
    confirmations: [
      { id: id("205"), passage_id: P2, evenement: "demandee", canal: "whatsapp", cle: "demande:P2", detail: {}, survenu_le: ilYa(0, 9) },
      { id: id("206"), passage_id: P2, evenement: "declinee", canal: "whatsapp", cle: "wa:msg-0003", detail: { texte: "Impossible la semaine 42, équipe sur Vénissieux" }, survenu_le: ilYa(0, 11) },
    ] },
  { id: P3, chantier_id: TILLEULS, lot_id: LOT3, lot_code: "03", lot_libelle: "Peinture des menuiseries", equipe_id: null, tiers_id: null, intervenant_type: "inconnu", intervenant_lu: "Peintures Giraud", intervenant_nom: "Peintures Giraud", rapprochement: null, tache: "Peinture des menuiseries", debut: aujourdHui(18), fin: aujourdHui(22), exterieur: false, statut: "prevu", confirmation: "non_demandee", confirmation_le: null, source: "tableur", source_ref: "P3", version: 1, confirmations: [] },
  { id: P5, chantier_id: TILLEULS, lot_id: LOT1, lot_code: "01", lot_libelle: "Menuiseries extérieures", equipe_id: EQUIPE_A, tiers_id: null, intervenant_type: "equipe", intervenant_lu: null, intervenant_nom: "Pose A", rapprochement: "manuel", tache: "Réglages et finitions", debut: aujourdHui(30), fin: aujourdHui(31), exterieur: false, statut: "prevu", confirmation: "non_demandee", confirmation_le: null, source: "tableur", source_ref: "P5", version: 3, confirmations: [] },
];

const AVENANTS_TIL: Avenant[] = [
  { id: AV1, chantier_id: TILLEULS, marche_id: M1, numero: 1, objet: "Garde-corps supplémentaires sur les balcons du R+3 (12 ml), demandés par le maître d'ouvrage en visite",
    origine: { canal: "vocal", auteur: "Chef d'équipe Pose A", date: aujourdHui(-2), texte: "Lefèvre veut aussi des garde-corps au R+3, douze mètres." },
    statut: "soumis", demande_id: id("301"), demande_statut: "approuvee", piece_id: null, soumis_le: ilYa(1, 10), signe_le: null, signe_par: null, signe_libelle: null, motif: null, cree_le: ilYa(2, 15), nb_lignes: 2, montant_ht: 1884,
    lignes: [
      { id: id("311"), avenant_id: AV1, lot_id: LOT2, prix_id: PRIX_GC, ordre: 1, designation: "Garde-corps acier laqué, hauteur 1,00 m", unite: "ml", quantite: 12, sens: 1, nature: "ouvrage", origine_prix: "bibliotheque", prix_unitaire_ht: 142, montant_ht: 1704 },
      { id: id("312"), avenant_id: AV1, lot_id: LOT2, prix_id: null, ordre: 2, designation: "Dépose du garde-corps provisoire", unite: "ml", quantite: 12, sens: 1, nature: "ouvrage", origine_prix: "saisie", prix_unitaire_ht: 15, montant_ht: 180 },
    ] },
  { id: AV2, chantier_id: TILLEULS, marche_id: M1, numero: 2, objet: "Remplacement de deux fenêtres par des portes-fenêtres (logements 7 et 8)",
    origine: { canal: "photo", auteur: "Conducteur de travaux", date: aujourdHui(-1), texte: "Photo du mardi : les allèges des logements 7 et 8 sont déjà démolies." },
    statut: "brouillon", demande_id: null, demande_statut: null, piece_id: null, soumis_le: null, signe_le: null, signe_par: null, signe_libelle: null, motif: null, cree_le: ilYa(1, 9), nb_lignes: 1, montant_ht: -2360,
    lignes: [
      { id: id("321"), avenant_id: AV2, lot_id: LOT1, prix_id: PRIX_FEN, ordre: 1, designation: "Fenêtre bois-alu un vantail, vitrage 4/16/4 faible émissivité (moins-value)", unite: "u", quantite: 2, sens: -1, nature: "ouvrage", origine_prix: "bibliotheque", prix_unitaire_ht: 1180, montant_ht: -2360 },
    ] },
];

const BIBLIOTHEQUE: Prix[] = [
  { id: PRIX_GC, designation: "Garde-corps acier laqué, hauteur 1,00 m", unite: "ml", corps_etat: "serrurerie", origine: "marche", ligne_marche_id: L3, date_prix: aujourdHui(-30), statut: "valide", prix_unitaire_ht: 142 },
  { id: PRIX_FEN, designation: "Fenêtre bois-alu un vantail, vitrage 4/16/4 faible émissivité", unite: "u", corps_etat: "menuiserie", origine: "marche", ligne_marche_id: L1, date_prix: aujourdHui(-30), statut: "valide", prix_unitaire_ht: 1180 },
  { id: PRIX_PORTE, designation: "Porte d'entrée palière, bloc-porte acier, serrure 3 points", unite: "u", corps_etat: "menuiserie", origine: "marche", ligne_marche_id: L2, date_prix: aujourdHui(-30), statut: "propose", prix_unitaire_ht: 2350 },
  { id: PRIX_H, designation: "Heure de pose menuisier", unite: "h", corps_etat: "menuiserie", origine: "saisie", ligne_marche_id: null, date_prix: aujourdHui(-10), statut: "valide", prix_unitaire_ht: 50 },
  { id: PRIX_DEPOSE, designation: "Dépose du garde-corps provisoire", unite: "ml", corps_etat: "serrurerie", origine: "saisie", ligne_marche_id: null, date_prix: aujourdHui(-1), statut: "propose", prix_unitaire_ht: 15 },
  { id: id("096"), designation: "Peinture des menuiseries, deux couches", unite: "m2", corps_etat: "peinture", origine: "marche", ligne_marche_id: L5, date_prix: aujourdHui(-30), statut: "propose", prix_unitaire_ht: 18.5 },
];

const CONTROLES_TIL: Controle[] = [
  { chantier_id: TILLEULS, objet_type: "btp_passages", objet_id: P3, code: "passage_a_ranger", gravite: "attention", message: "Passage du " + fr(aujourdHui(18)) + " au " + fr(aujourdHui(22)) + " : « Peintures Giraud » ne désigne personne de l'annuaire, ou plusieurs." },
  { chantier_id: TILLEULS, objet_type: "btp_lots", objet_id: LOT3, code: "lot_sans_executant", gravite: "attention", message: "Lot 03 Peinture des menuiseries : l'entreprise qui l'exécute n'est pas désignée." },
  { chantier_id: TILLEULS, objet_type: "btp_dependances", objet_id: id("401"), code: "dependance_non_respectee", gravite: "attention", message: "« Relevé des cotes garde-corps » commence le " + fr(aujourdHui(2)) + ", avant le " + fr(aujourdHui(12)) + " : « Pose des fenêtres » finit le " + fr(aujourdHui(11)) + "." },
  { chantier_id: TILLEULS, objet_type: "btp_chantiers", objet_id: TILLEULS, code: "chantier_sans_coordonnees", gravite: "info", message: "Résidence Les Tilleuls : adresse non localisée ; pas de météo, ni de rattachement par la position." },
];

const CONTROLES_ORGA: Controle[] = [
  { chantier_id: null, objet_type: "btp_tiers", objet_id: ROCHAT, code: "vigilance_a_renouveler", gravite: "info", message: "Métallerie Rochat : attestation de vigilance à renouveler dans les quinze jours (C. trav. D8222-5)." },
];

function fr(iso: string): string {
  const [, m, j] = iso.split("-");
  return `${j}/${m}`;
}

const CHANTIER_TIL: Chantier = {
  id: TILLEULS, client_id: EXEMPLE_CLIENT_ID, entite_id: ENT_TIL, nom: "Résidence Les Tilleuls", reference: "TIL-2026", adresse: "14 rue des Tilleuls", code_postal: "69100", commune: "Villeurbanne",
  departement: "69", territoire: "metropole", zone_tva: "metropole", regime_tva: "normal", maitre_ouvrage_type: "professionnel", nature_marche: "prive", place_client: "titulaire",
  maitre_ouvrage_id: MO_LEFEVRE, maitre_oeuvre_id: null, donneur_ordre_id: null, conducteur_id: YANIS, statut: "ouvert", date_debut: aujourdHui(-14), date_fin_prevue: aujourdHui(106), date_reception: null,
  ouvert_le: ilYa(14), cree_le: ilYa(40), etape: { etape: 1, etapes: 3, lot_id: LOT1, lot_libelle: "Menuiseries extérieures", avancement_pct: 33 },
  maitre_ouvrage_nom: "SCI Lefèvre Patrimoine", nb_lots: 3, nb_bloquants: 0, nb_attention: 3, marche_verifie: true,
  prochain_passage: { id: P7, debut: aujourdHui(1), fin: aujourdHui(1), tache: "Pose des platines", confirmation: "sans_reponse", intervenant_type: "tiers", intervenant_nom: "Serrurerie Dumont" },
  nb_avenants_en_cours: 2, nb_avenants_signes: 0,
};

const CHANTIER_ROL: Chantier = {
  id: ROLLAND, client_id: EXEMPLE_CLIENT_ID, entite_id: ENT_ROL, nom: "Maison Rolland — extension", reference: "ROL-2026", adresse: "8 chemin des Vignes", code_postal: "38000", commune: "Grenoble",
  departement: "38", territoire: "metropole", zone_tva: "metropole", regime_tva: "normal", maitre_ouvrage_type: "particulier", nature_marche: "prive", place_client: "titulaire",
  maitre_ouvrage_id: MO_ROLLAND, maitre_oeuvre_id: null, donneur_ordre_id: null, conducteur_id: null, statut: "preparation", date_debut: aujourdHui(21), date_fin_prevue: aujourdHui(60), date_reception: null,
  ouvert_le: null, cree_le: ilYa(5), etape: { etape: 0, etapes: 1, lot_id: null, lot_libelle: null, avancement_pct: 0 },
  maitre_ouvrage_nom: "M. et Mme Rolland", nb_lots: 1, nb_bloquants: 1, nb_attention: 0, marche_verifie: false, prochain_passage: null, nb_avenants_en_cours: 0, nb_avenants_signes: 0,
};

export const TABLEAUX_EXEMPLE: Record<string, Tableau> = {
  [TILLEULS]: {
    chantier: CHANTIER_TIL,
    reglages: { formule: "chantiers", quota_chantiers: 20, quota_comptes_bureau: 5 },
    voit_prix: true,
    lots: LOTS_TIL,
    marches: [MARCHE_TIL],
    controles: CONTROLES_TIL,
    controles_organisation: CONTROLES_ORGA,
    passages: PASSAGES_TIL,
    dependances: [
      { id: id("401"), chantier_id: TILLEULS, amont_id: P1, aval_id: P4, delai_min_jours: 0, origine: "gabarit", confirmee: true, amont_tache: "Pose des fenêtres", aval_tache: "Relevé des cotes garde-corps" },
      { id: id("402"), chantier_id: TILLEULS, amont_id: P1, aval_id: P2, delai_min_jours: 0, origine: "gabarit", confirmee: true, amont_tache: "Pose des fenêtres", aval_tache: "Pose des garde-corps" },
      { id: id("403"), chantier_id: TILLEULS, amont_id: P2, aval_id: P3, delai_min_jours: 1, origine: "gabarit", confirmee: false, amont_tache: "Pose des garde-corps", aval_tache: "Peinture des menuiseries" },
    ],
    acceptations: [{ id: id("501"), chantier_id: TILLEULS, tiers_id: DUMONT, tiers_nom: "Serrurerie Dumont", mode: "lettre", statut: "acceptee", paiement_direct: false, demandee_le: aujourdHui(-25), decidee_le: aujourdHui(-18) }],
    avenants: AVENANTS_TIL,
    factures: [
      { id: id("601"), facture_id: FACT_DUMONT, document_id: id("611"), chantier_id: TILLEULS, lot_id: LOT2, lot_code: "02", lot_libelle: "Garde-corps", marche_id: M1, statut: "rattachee", motif: "Situation n° 1 des garde-corps", fournisseur_siren: "552100554", fournisseur_id: id("621"), fournisseur_nom: "Serrurerie Dumont", facture_numero: "D-2026-118", facture_nature: "facture", facture_statut: "a_valider", document_reference: "R2026-000012", date_emission: aujourdHui(-2), echeance_lue: aujourdHui(28), montant_ht: 9940, montant_ttc: 11928, rattache_libelle: "Vous", cree_le: ilYa(1, 16) },
    ],
    debourse: [
      { lot_id: LOT1, code: "01", libelle: "Menuiseries extérieures", execution: "client", tiers_id: null, lot_statut: "en_cours", nb_factures: 0, engage_marche_ht: 59020, engage_avenants_ht: 0, facture_ht: 0, reste_ht: 59020 },
      { lot_id: LOT2, code: "02", libelle: "Garde-corps", execution: "sous_traitant", tiers_id: DUMONT, lot_statut: "a_venir", nb_factures: 1, engage_marche_ht: 24020, engage_avenants_ht: 0, facture_ht: 9940, reste_ht: 14080 },
      { lot_id: LOT3, code: "03", libelle: "Peinture des menuiseries", execution: "autre_titulaire", tiers_id: null, lot_statut: "a_venir", nb_factures: 0, engage_marche_ht: 7585, engage_avenants_ht: 0, facture_ht: 0, reste_ht: 7585 },
    ],
    tiers: TIERS,
    equipes: [{ id: EQUIPE_A, nom: "Pose A" }],
    bibliotheque: BIBLIOTHEQUE,
  },
  [ROLLAND]: {
    chantier: CHANTIER_ROL,
    reglages: { formule: "chantiers", quota_chantiers: 20, quota_comptes_bureau: 5 },
    voit_prix: true,
    lots: [{ id: LOTR1, chantier_id: ROLLAND, code: "01", libelle: "Menuiseries et bardage", corps_etat: "menuiserie", corps_etat_libelle: "Menuiserie", rang: 1, execution: "client", tiers_id: null, equipe_id: EQUIPE_A, equipe_nom: "Pose A", exterieur: true, statut: "a_venir", acceptation: null }],
    marches: [MARCHE_ROL],
    controles: [
      { chantier_id: ROLLAND, objet_type: "btp_marches", objet_id: MR, code: "marche_a_verifier", gravite: "bloquant", message: "Marché D-2026-087 : à vérifier ligne à ligne avant tout chiffrage." },
      { chantier_id: ROLLAND, objet_type: "btp_chantiers", objet_id: ROLLAND, code: "chantier_sans_coordonnees", gravite: "info", message: "Maison Rolland — extension : adresse non localisée ; pas de météo, ni de rattachement par la position." },
    ],
    controles_organisation: CONTROLES_ORGA,
    passages: [],
    dependances: [],
    acceptations: [],
    avenants: [],
    factures: [],
    debourse: [{ lot_id: LOTR1, code: "01", libelle: "Menuiseries et bardage", execution: "client", tiers_id: null, lot_statut: "a_venir", nb_factures: 0, engage_marche_ht: 0, engage_avenants_ht: 0, facture_ht: 0, reste_ht: 0 }],
    tiers: TIERS,
    equipes: [{ id: EQUIPE_A, nom: "Pose A" }],
    bibliotheque: BIBLIOTHEQUE,
  },
};

export const LISTE_EXEMPLE: Chantier[] = [CHANTIER_TIL, CHANTIER_ROL];

/* Les factures FILED d'exemple pas encore rattachées (dialogue « Rattacher une facture »). */
export const FACTURES_CANDIDATES_EXEMPLE = [
  { id: FACT_MRA, numero: "F-45812", date_emission: aujourdHui(-3), montant_ht: 14260, fournisseur_nom: "Menuiseries Rhône-Alpes", fournisseur_siren: "775665011", statut: "a_valider" },
  { id: id("103"), numero: "2026-0917", date_emission: aujourdHui(-6), montant_ht: 2310, fournisseur_nom: "Loca-Nacelles Lyon", fournisseur_siren: "401234565", statut: "a_completer" },
];
