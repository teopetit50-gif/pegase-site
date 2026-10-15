/* ══════════════════════════════════════════════════════════════════════
   Les opérations d'un loueur (11/10/2026, session B2, migrations b2_12 à
   b2_16) : conformité et rappels du constructeur, contrôle du départ,
   transferts entre agences, péages en flux libre, sinistres, assistance,
   caution. Les types tels que la base les rend, l'exemple, et le contrôle
   du départ recalculé pour l'exemple (même règle que loc_controle_depart).
   ══════════════════════════════════════════════════════════════════════ */

import { dans, ilYa } from "../exemples/socle";
import { CATEGORIES_EXEMPLE, CONTRATS_EXEMPLE, GRENOBLE, LYON, VEHICULES_EXEMPLE } from "./exemples";

export type Critair = "0" | "1" | "2" | "3" | "4" | "5" | "non_classe";
export type Conformite = { vehicule_id: string; critair: Critair | null; critair_verifie_le: string | null; ct_valide_jusqu_au: string | null };
export type Rappel = { id: string; reference: string; constructeur: string | null; libelle: string; gravite: "immobilisant" | "a_planifier"; publie_le: string | null; cree_le: string };
export type RappelVehicule = { id: string; rappel_id: string; vehicule_id: string; statut: "a_faire" | "fait" | "non_concerne"; immobilisation_id: string | null; entretien_id: string | null; fait_le: string | null };
export type PointDepart = { code: string; niveau: "info" | "attention" | "bloquant"; message: string };

export type Transfert = {
  id: string; vehicule_id: string; categorie_id: string | null; origine_entite_id: string; destination_entite_id: string;
  pour_le: string; jour_pic: string; tournee: string; statut: "propose" | "valide" | "refuse" | "fait" | "annule";
  motif: { manque?: number; surplus?: number; immobilises_a_destination?: { vehicule: string; motif: string; retour_prevu: string | null }[] };
  fait_le: string | null; convoyeur: string | null;
};

export type Passage = {
  id: string; entite_id: string | null; operateur: string; portique: string | null; passe_le: string; immatriculation: string; vehicule_id: string | null;
  montant_eur: number; reference: string; payer_avant: string; statut: "a_payer" | "paye" | "refacture" | "a_la_charge_du_loueur";
  paye_le: string | null; paiement_reference: string | null; contrat_id: string | null; refacture_proposition_id: string | null; a_la_charge_motif: string | null;
};

export type NatureSinistre = "accident" | "vol" | "vandalisme" | "bris_de_glace" | "incendie" | "catastrophe_naturelle" | "autre";
export type Responsabilite = "locataire" | "tiers" | "partagee" | "inconnue";
export type StatutSinistre = "ouvert" | "expertise" | "reparation" | "recours" | "regle" | "clos";
export type Sinistre = {
  id: string; entite_id: string | null; contrat_id: string | null; vehicule_id: string; reference: string; survenu_le: string; lieu: string | null;
  nature: NatureSinistre; responsabilite: Responsabilite; description: string | null;
  tiers: { nom?: string; assureur?: string; assureur_adresse?: string; police?: string; immatriculation?: string; telephone?: string };
  statut: StatutSinistre; expert: { nom?: string }; montant_reparation_eur: number | null; franchise_eur: number | null; immobilisation_id: string | null;
  recours: { jours: number; tarif_moyen: number; part: number; montant: number; courrier: string; prepare_le: string; envoi: string | null; envoye_le: string | null } | null;
  regle_le: string | null; montant_recu_eur: number | null; historique: { le: string; statut: string; note?: string }[]; cree_le: string;
};

export type TypeIncident = "panne" | "accident" | "cle_perdue" | "crevaison" | "batterie" | "carburant" | "vol" | "autre";
export type ActionAssistance = "depanneuse" | "vehicule_remplacement" | "serrurier" | "conseil" | "transfert_humain";
export type LigneGrille = { id: string; type_incident: TypeIncident; action: ActionAssistance; prestataire: string | null; prestataire_telephone: string | null; delai_cible_min: number | null; consignes: string | null };
export type Incident = {
  id: string; entite_id: string | null; contrat_id: string | null; vehicule_id: string | null; canal: string; appelant_telephone: string | null;
  type_incident: TypeIncident; description: string | null; position: string | null; recu_le: string; action: ActionAssistance | null; prestataire: string | null;
  arrivee_estimee_le: string | null; statut: "ouvert" | "missionne" | "transfere" | "clos"; resume: string | null; sinistre_id: string | null;
};

export type StatutCaution = "demandee" | "preautorisee" | "capture_demandee" | "capturee" | "liberation_demandee" | "liberee" | "expiree" | "echec";
export type Caution = {
  id: string; entite_id: string; contrat_id: string; montant_eur: number; statut: StatutCaution; prestataire: string | null; reference_externe: string | null;
  expire_le: string | null; capture_demandee_eur: number | null; capture_eur: number | null; capture_facture_id: string | null; capture_motif: string | null; erreur: string | null; cree_le: string;
};

export type Operations = {
  conformite: Conformite[]; rappels: Rappel[]; rappelsVehicules: RappelVehicule[]; transferts: Transfert[]; passages: Passage[];
  sinistres: Sinistre[]; incidents: Incident[]; grille: LigneGrille[]; cautions: Caution[];
};
export const OPERATIONS_VIDES: Operations = { conformite: [], rappels: [], rappelsVehicules: [], transferts: [], passages: [], sinistres: [], incidents: [], grille: [], cautions: [] };

export const CRITAIR: Record<Critair, string> = { "0": "Crit'Air 0 (électrique)", "1": "Crit'Air 1", "2": "Crit'Air 2", "3": "Crit'Air 3", "4": "Crit'Air 4", "5": "Crit'Air 5", non_classe: "Non classé" };
export const NATURES_SINISTRE: Record<NatureSinistre, string> = {
  accident: "Accident", vol: "Vol", vandalisme: "Vandalisme", bris_de_glace: "Bris de glace", incendie: "Incendie", catastrophe_naturelle: "Catastrophe naturelle", autre: "Autre",
};
export const RESPONSABILITES: Record<Responsabilite, string> = { locataire: "Le locataire", tiers: "Le tiers", partagee: "Partagée", inconnue: "Pas encore établie" };
export const ETAPES_SINISTRE: Record<StatutSinistre, string> = { ouvert: "Ouvert", expertise: "Expertise", reparation: "Réparation", recours: "Recours", regle: "Réglé", clos: "Clos" };
export const TYPES_INCIDENT: Record<TypeIncident, string> = {
  panne: "Panne", accident: "Accident", cle_perdue: "Clé perdue", crevaison: "Crevaison", batterie: "Batterie", carburant: "Panne de carburant", vol: "Vol", autre: "Autre",
};
export const ACTIONS: Record<ActionAssistance, string> = {
  depanneuse: "Dépanneuse", vehicule_remplacement: "Véhicule de remplacement", serrurier: "Serrurier", conseil: "Conseil par téléphone", transfert_humain: "Passer à l'agence",
};
export const STATUTS_CAUTION: Record<StatutCaution, string> = {
  demandee: "préautorisation demandée", preautorisee: "préautorisée", capture_demandee: "capture demandée", capturee: "capturée",
  liberation_demandee: "libération demandée", liberee: "libérée", expiree: "expirée", echec: "échec",
};

const jour = (iso: string) => iso.slice(0, 10);

/* Le contrôle du départ, comme la porte loc_controle_depart (b2_12) : Crit'Air, rappel en cours, contrôle technique. */
export function controleDepart(o: Operations, vehicule: { id: string; immatriculation: string } | null, retourPrevu: string, aujourdhui = jour(new Date().toISOString())): PointDepart[] {
  if (!vehicule) return [{ code: "vehicule", niveau: "attention", message: "Aucun véhicule n'est encore affecté à ce contrat." }];
  const x = o.conformite.find((c) => c.vehicule_id === vehicule.id) ?? null;
  const points: PointDepart[] = [];
  if (!x?.critair) points.push({ code: "critair", niveau: "attention", message: `La classe Crit'Air de ${vehicule.immatriculation} n'est pas connue : vérifiez la vignette sur le pare-brise avant le départ.` });
  else if (x.critair === "non_classe") points.push({ code: "critair", niveau: "attention", message: `${vehicule.immatriculation} n'a pas de vignette Crit'Air : il ne peut pas circuler dans les zones à faibles émissions qui l'exigent. Dites-le au client.` });
  else points.push({ code: "critair", niveau: "info", message: `Vignette Crit'Air ${x.critair} : rappelez-la au client s'il entre dans une zone à faibles émissions (Paris, Lyon, Grenoble…).` });
  for (const rv of o.rappelsVehicules.filter((r) => r.vehicule_id === vehicule.id && r.statut === "a_faire")) {
    const r = o.rappels.find((y) => y.id === rv.rappel_id);
    if (!r) continue;
    points.push({ code: "rappel", niveau: r.gravite === "immobilisant" ? "bloquant" : "attention",
      message: `Rappel du constructeur ${r.reference} en cours : ${r.libelle}.${r.gravite === "immobilisant" ? " Le véhicule ne doit pas partir : changez de véhicule." : ""}` });
  }
  const ct = x?.ct_valide_jusqu_au ?? null;
  if (ct && (ct < aujourdhui || ct <= jour(retourPrevu))) {
    const d = ct.split("-").reverse().join("/");
    points.push(ct < aujourdhui
      ? { code: "controle_technique", niveau: "bloquant", message: `Le contrôle technique de ${vehicule.immatriculation} a expiré le ${d} : le véhicule ne doit pas partir.` }
      : { code: "controle_technique", niveau: "attention", message: `Le contrôle technique de ${vehicule.immatriculation} expire le ${d}, avant le retour prévu : changez de véhicule ou avancez le contrôle.` });
  }
  return points;
}

/* ——— l'exemple : Autoloc Bertin, Lyon et Grenoble ——— */
const u = (p: string, n: number) => `00000000-0000-4000-8000-0000000${p}${n.toString(16).padStart(3, "0")}`;
const V = VEHICULES_EXEMPLE;
const ouvert = CONTRATS_EXEMPLE[6];

export const OPERATIONS_EXEMPLE: Operations = {
  conformite: [
    { vehicule_id: V[0].id, critair: "1", critair_verifie_le: jour(ilYa(90)), ct_valide_jusqu_au: jour(dans(400)) },
    { vehicule_id: V[1].id, critair: "2", critair_verifie_le: jour(ilYa(90)), ct_valide_jusqu_au: jour(dans(12)) },
    { vehicule_id: V[2].id, critair: "2", critair_verifie_le: jour(ilYa(200)), ct_valide_jusqu_au: jour(dans(150)) },
    { vehicule_id: V[3].id, critair: "1", critair_verifie_le: jour(ilYa(30)), ct_valide_jusqu_au: null },
  ],
  rappels: [
    { id: u("rc", 1), reference: "RC-2026-118", constructeur: "Renault", libelle: "Fixation du siège passager à resserrer", gravite: "a_planifier", publie_le: jour(ilYa(6)), cree_le: ilYa(5) },
  ],
  rappelsVehicules: [
    { id: u("rv", 1), rappel_id: u("rc", 1), vehicule_id: V[4].id, statut: "a_faire", immobilisation_id: null, entretien_id: null, fait_le: null },
  ],
  transferts: [
    { id: u("tr", 1), vehicule_id: V[3].id, categorie_id: CATEGORIES_EXEMPLE[0].id, origine_entite_id: LYON, destination_entite_id: GRENOBLE, pour_le: dans(2, 18), jour_pic: jour(dans(3)),
      tournee: "Lyon Part-Dieu → Grenoble · samedi", statut: "propose", motif: { manque: 2, surplus: 3, immobilises_a_destination: [] }, fait_le: null, convoyeur: null },
    { id: u("tr", 2), vehicule_id: V[0].id, categorie_id: CATEGORIES_EXEMPLE[0].id, origine_entite_id: LYON, destination_entite_id: GRENOBLE, pour_le: dans(2, 18), jour_pic: jour(dans(3)),
      tournee: "Lyon Part-Dieu → Grenoble · samedi", statut: "propose", motif: { manque: 2, surplus: 3, immobilises_a_destination: [{ vehicule: "GP-654-KL", motif: "carrosserie", retour_prevu: dans(5) }] }, fait_le: null, convoyeur: null },
  ],
  passages: [
    { id: u("pp", 1), entite_id: LYON, operateur: "APRR", portique: "A43 — Flux libre de Saint-Quentin", passe_le: ilYa(1, 16), immatriculation: V[4].immatriculation, vehicule_id: V[4].id,
      montant_eur: 4.8, reference: "APRR-77120", payer_avant: dans(2, 16), statut: "a_payer", paye_le: null, paiement_reference: null, contrat_id: ouvert.id, refacture_proposition_id: null, a_la_charge_motif: null },
    { id: u("pp", 2), entite_id: LYON, operateur: "Sanef", portique: "A13 — Boulay", passe_le: ilYa(5, 11), immatriculation: V[0].immatriculation, vehicule_id: V[0].id,
      montant_eur: 3.6, reference: "SANEF-40981", payer_avant: ilYa(2, 11), statut: "paye", paye_le: ilYa(4), paiement_reference: "CB-0931", contrat_id: CONTRATS_EXEMPLE[0].id, refacture_proposition_id: null, a_la_charge_motif: null },
  ],
  sinistres: [
    { id: u("si", 1), entite_id: GRENOBLE, contrat_id: CONTRATS_EXEMPLE[2].id, vehicule_id: V[1].id, reference: "SIN-2026-0007", survenu_le: ilYa(8, 17), lieu: "Rond-point du Rondeau, Grenoble",
      nature: "accident", responsabilite: "tiers", description: "Choc arrière à l'arrêt, constat amiable signé par les deux conducteurs.",
      tiers: { nom: "M. Garnier", assureur: "Assurances du Dauphiné", assureur_adresse: "recours@assurances-dauphine.invalid", police: "AD-55102" },
      statut: "expertise", expert: { nom: "Cabinet Expertis" }, montant_reparation_eur: 1240.5, franchise_eur: null, immobilisation_id: null, recours: null, regle_le: null, montant_recu_eur: null,
      historique: [{ le: ilYa(8, 18), statut: "ouvert" }, { le: ilYa(6), statut: "expertise", note: "Rendez-vous de l'expert jeudi" }], cree_le: ilYa(8, 18) },
  ],
  incidents: [
    { id: u("in", 1), entite_id: LYON, contrat_id: ouvert.id, vehicule_id: V[4].id, canal: "telephone", appelant_telephone: "+33612345678", type_incident: "crevaison", description: "Pneu avant droit à plat",
      position: "A7, aire de Saint-Rambert", recu_le: ilYa(0, 8), action: "depanneuse", prestataire: "Dépannage Rhône-Alpes", arrivee_estimee_le: dans(0, 9), statut: "missionne", resume: "Client en sécurité sur l'aire, dépanneuse en route.", sinistre_id: null },
  ],
  grille: [
    { id: u("ga", 1), type_incident: "panne", action: "depanneuse", prestataire: "Dépannage Rhône-Alpes", prestataire_telephone: "04 72 00 00 00", delai_cible_min: 45, consignes: null },
    { id: u("ga", 2), type_incident: "crevaison", action: "depanneuse", prestataire: "Dépannage Rhône-Alpes", prestataire_telephone: "04 72 00 00 00", delai_cible_min: 45, consignes: "Pas de roue de secours sur les Clio : dépanneuse directe." },
    { id: u("ga", 3), type_incident: "accident", action: "transfert_humain", prestataire: null, prestataire_telephone: null, delai_cible_min: null, consignes: "Vérifier que personne n'est blessé, appeler le 112 sinon." },
  ],
  cautions: [
    { id: u("ca", 1), entite_id: LYON, contrat_id: ouvert.id, montant_eur: 800, statut: "preautorisee", prestataire: "à choisir", reference_externe: "pi_exemple_1", expire_le: dans(6),
      capture_demandee_eur: null, capture_eur: null, capture_facture_id: null, capture_motif: null, erreur: null, cree_le: ilYa(1, 15) },
  ],
};
