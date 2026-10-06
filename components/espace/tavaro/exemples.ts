/* ══════════════════════════════════════════════════════════════════════
   TAVARO d'exemple — le parking d'« Autoloc Bertin » (06/10/2026, B2)

   Un loueur fictif, deux agences (Lyon Part-Dieu, Grenoble), huit
   contrats à tous les états du parcours : en location, rendu à chiffrer,
   proposition devant l'agence, preuve manquante, facturé et envoyé,
   litige, réglé avec avoir, impayé relancé. Les identifiants commencent
   par 0000… : rien ici ne peut être confondu avec une ligne de la base,
   et rien d'ici n'est jamais écrit en base. Les dates sont relatives au
   jour de la visite (ilYa / dans), comme dans le monde d'exemple d'A3.
   « Vous » est le chef de l'agence de Lyon (valideur).
   ══════════════════════════════════════════════════════════════════════ */

import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI, dans, ilYa } from "../exemples/socle";
import type { Agence, Amendement, AvisContravention, Avoir, EtatDesLieux, Bareme, Categorie, Contrat, DemandeCourte, Dossier, Facture, LigneBareme, LigneFacture, LigneJournal, LigneProposition, Locataire, Proposition, Reglages, Vehicule } from "./types";

const C = EXEMPLE_CLIENT_ID;
const u = (p: string, n: number) => `00000000-0000-4000-8000-0000000${p}${n.toString(16).padStart(3, "0")}`;

export const PERSONNES_TAVARO: Record<string, { nom: string; role: string }> = {
  [EXEMPLE_MOI]: { nom: "Vous", role: "valideur" },
  "00000000-0000-4000-8000-0000000000a2": { nom: "Claire Morel", role: "gerant" },
  "00000000-0000-4000-8000-0000000000a3": { nom: "Yanis Dupré", role: "valideur" },
  "00000000-0000-4000-8000-0000000000a4": { nom: "Sofia Carvalho", role: "collaborateur" },
  "00000000-0000-4000-8000-0000000000a5": { nom: "Marc Lévy", role: "admin" },
};
export const CLAIRE = "00000000-0000-4000-8000-0000000000a2";
export const SOFIA = "00000000-0000-4000-8000-0000000000a4";

export function nomPersonneTavaro(id: string | null | undefined): string {
  if (!id) return "Système";
  return PERSONNES_TAVARO[id]?.nom ?? id.slice(0, 8);
}

export const AGENCES_EXEMPLE: (Agence & { nom: string })[] = [
  { id: u("ag", 1), entite_id: "00000000-0000-4000-8000-0000000000e1", code: "LYON", nom: "Autoloc Bertin — Lyon Part-Dieu", taux_tva: 20, actif: true },
  { id: u("ag", 2), entite_id: "00000000-0000-4000-8000-0000000000e2", code: "GRENOBLE", nom: "Autoloc Bertin — Grenoble", taux_tva: 20, actif: true },
];
export const LYON = AGENCES_EXEMPLE[0].entite_id;
export const GRENOBLE = AGENCES_EXEMPLE[1].entite_id;

export function nomAgence(entite_id: string | null | undefined, agences: { entite_id: string; nom?: string; code: string }[] = AGENCES_EXEMPLE): string {
  if (!entite_id) return "—";
  const a = agences.find((x) => x.entite_id === entite_id);
  return a ? (a.nom ?? a.code) : entite_id.slice(0, 8);
}

export const REGLAGES_EXEMPLE: Reglages = {
  tolerance_retard_min: 59,
  echeance_pro_jours: 30,
  tva_sur_debits: false,
  emetteur: { adresse: "18 rue de la Villette, 69003 Lyon", numero_tva: "FR75 512 345 679", rcs: "RCS Lyon 512 345 679", email: "facturation@autoloc-bertin.example" },
};

export const CATEGORIES_EXEMPLE: Categorie[] = [
  { id: u("ca", 1), code: "B", libelle: "Citadine" },
  { id: u("ca", 2), code: "C", libelle: "Compacte" },
  { id: u("ca", 3), code: "U", libelle: "Utilitaire 12 m³" },
];

export const BAREME_EXEMPLE: Bareme = { id: u("ba", 1), libelle: "Barème de remise en état 2026", date_effet: "2026-01-01", statut: "publie", publie_le: "2025-12-15T10:00:00Z", retire_le: null, motif_retrait: null };
export const BAREME_RETIRE_EXEMPLE: Bareme = { id: u("ba", 0), libelle: "Barème 2025", date_effet: "2025-01-01", statut: "retire", publie_le: "2024-12-10T10:00:00Z", retire_le: "2025-12-15T09:55:00Z", motif_retrait: "Remplacé par le barème 2026" };

const lb = (n: number, code: string, libelle: string, famille: LigneBareme["famille"], unite: LigneBareme["unite"], prix: number | null, regime: LigneBareme["regime_tva"], categorie: string | null = null): LigneBareme => ({
  id: u("bl", n), bareme_id: BAREME_EXEMPLE.id, code, libelle, famille, unite, prix_eur: prix, regime_tva: regime, taux_tva: regime === "taxable" ? 20 : null, categorie_id: categorie, nature: famille === "dommage" ? "dommage" : "frais", rang: n,
});
export const LIGNES_BAREME_EXEMPLE: LigneBareme[] = [
  lb(1, "CARBURANT_8E", "Carburant manquant, au huitième", "carburant", "huitieme", 12, "taxable"),
  lb(2, "CARBURANT_SERVICE", "Frais de service carburant", "carburant", "forfait", 15, "taxable"),
  lb(3, "KM_SUP", "Kilomètre au-delà du forfait", "kilometres", "km", 0.25, "taxable"),
  lb(4, "RETARD_JOUR", "Jour de retard entamé (au tarif du contrat)", "retard", "jour_entame", null, "taxable"),
  lb(5, "RAYURE_PORTIERE", "Rayure de portière", "dommage", "forfait", 180, "hors_champ"),
  lb(6, "PARE_CHOC", "Pare-chocs enfoncé", "dommage", "forfait", 950, "hors_champ"),
  lb(7, "JANTE", "Jante, sur devis carrossier", "dommage", "devis", null, "hors_champ"),
  lb(8, "PARE_BRISE", "Impact sur le pare-brise", "dommage", "forfait", 120, "hors_champ"),
  lb(9, "RETRO", "Rétroviseur cassé", "dommage", "forfait", 260, "hors_champ", CATEGORIES_EXEMPLE[2].id),
  lb(10, "NETTOYAGE", "Nettoyage approfondi", "nettoyage", "forfait", 60, "taxable"),
  lb(11, "FRAIS_DOSSIER", "Frais de dossier", "frais", "forfait", 25, "taxable"),
  lb(12, "CLE_PERDUE", "Clé perdue (refabrication)", "frais", "forfait", 190, "taxable"),
];

export const LOCATAIRES_EXEMPLE: Locataire[] = [
  { id: u("lo", 1), type: "particulier", nom: "Durand", prenom: "Marie", raison_sociale: null, email: "marie.durand@exemple.fr", telephone: "06 12 34 56 78", adresse: "3 rue des Lilas, 75011 Paris", anonymise_le: null },
  { id: u("lo", 2), type: "professionnel", nom: null, prenom: null, raison_sociale: "Transports Vial SARL", email: "compta@vial-transports.example", telephone: "04 76 00 00 00", adresse: "ZA des Îles, 38120 Saint-Égrève", anonymise_le: null },
  { id: u("lo", 3), type: "particulier", nom: "Nkemelu", prenom: "Adaeze", raison_sociale: null, email: "a.nkemelu@exemple.fr", telephone: null, adresse: "12 cours Lafayette, 69003 Lyon", anonymise_le: null },
  { id: u("lo", 4), type: "particulier", nom: "Berger", prenom: "Luc", raison_sociale: null, email: null, telephone: "07 00 00 00 00", adresse: "8 rue Pasteur, 38000 Grenoble", anonymise_le: null },
  { id: u("lo", 5), type: "particulier", nom: "Haddad", prenom: "Samir", raison_sociale: null, email: "s.haddad@exemple.fr", telephone: null, adresse: "45 avenue Berthelot, 69007 Lyon", anonymise_le: null },
  { id: u("lo", 6), type: "professionnel", nom: null, prenom: null, raison_sociale: "Studio Albane", email: "hello@studio-albane.example", telephone: null, adresse: "2 place Carnot, 69002 Lyon", anonymise_le: null },
  { id: u("lo", 7), type: "particulier", nom: "Roux", prenom: "Camille", raison_sociale: null, email: "camille.roux@exemple.fr", telephone: null, adresse: "1 rue Molière, 69006 Lyon", anonymise_le: null },
  { id: u("lo", 8), type: "particulier", nom: null, prenom: null, raison_sociale: null, email: null, telephone: null, adresse: null, anonymise_le: ilYa(40) },
];

export const VEHICULES_EXEMPLE: Vehicule[] = [
  { id: u("ve", 1), immatriculation: "GA-123-BC", modele: "Renault Clio V", categorie_id: CATEGORIES_EXEMPLE[0].id, energie: "essence", reservoir_l: 42, statut: "actif", km_dernier: 12650 },
  { id: u("ve", 2), immatriculation: "GH-456-DE", modele: "Peugeot 308", categorie_id: CATEGORIES_EXEMPLE[1].id, energie: "diesel", reservoir_l: 52, statut: "actif", km_dernier: 48210 },
  { id: u("ve", 3), immatriculation: "GK-789-FG", modele: "Renault Master L2H2", categorie_id: CATEGORIES_EXEMPLE[2].id, energie: "diesel", reservoir_l: 80, statut: "actif", km_dernier: 91030 },
  { id: u("ve", 4), immatriculation: "GM-321-HJ", modele: "Toyota Yaris", categorie_id: CATEGORIES_EXEMPLE[0].id, energie: "hybride", reservoir_l: 36, statut: "actif", km_dernier: 8020 },
  { id: u("ve", 5), immatriculation: "GP-654-KL", modele: "Citroën C3", categorie_id: CATEGORIES_EXEMPLE[0].id, energie: "essence", reservoir_l: 45, statut: "a_confirmer", km_dernier: null },
  { id: u("ve", 6), immatriculation: "GR-987-MN", modele: "Volkswagen Golf", categorie_id: CATEGORIES_EXEMPLE[1].id, energie: "diesel", reservoir_l: 50, statut: "actif", km_dernier: 33400 },
];

const contrat = (n: number, o: Partial<Contrat> & Pick<Contrat, "numero" | "entite_id" | "depart_le" | "retour_prevu_le">): Contrat => ({
  id: u("co", n), client_id: C, entite_retour_id: null, reservation_id: null, vehicule_id: null, categorie_id: null, locataire_id: null,
  retour_reel_le: null, km_depart: null, km_retour: null, km_inclus: null, km_inclus_jour: null, km_illimite: false, politique_carburant: "plein_contre_plein",
  seuil_charge_pct: null, tarif_jour_eur: 45, franchise_eur: 800, franchise_reduite_eur: null, rachat_franchise: false, options: null, depot_eur: 500,
  conditions_version: "CG-2026-01", statut: "ouvert", source: "export", piece_id: null, saisies: {}, avertissements: [], disparu_le: null,
  cree_le: o.depart_le, maj_le: o.depart_le, ...o,
});

export const CONTRATS_EXEMPLE: Contrat[] = [
  /* 1 — rendu hier, retour à chiffrer */
  contrat(1, { numero: "C-2026-0412", entite_id: LYON, depart_le: ilYa(4, 9), retour_prevu_le: ilYa(1, 9), retour_reel_le: ilYa(1, 11), statut: "clos",
    vehicule_id: VEHICULES_EXEMPLE[0].id, categorie_id: CATEGORIES_EXEMPLE[0].id, locataire_id: LOCATAIRES_EXEMPLE[0].id, km_depart: 12000, km_retour: 12650, km_inclus: 600 }),
  /* 2 — proposition devant l'agence, prolongée d'un jour par vous */
  contrat(2, { numero: "C-2026-0398", entite_id: LYON, depart_le: ilYa(7, 9), retour_prevu_le: ilYa(4, 9), retour_reel_le: ilYa(2, 11, ), statut: "clos",
    vehicule_id: VEHICULES_EXEMPLE[1].id, categorie_id: CATEGORIES_EXEMPLE[1].id, locataire_id: LOCATAIRES_EXEMPLE[2].id, km_depart: 47800, km_retour: 48210, km_inclus: 300,
    saisies: { km_inclus: { par: SOFIA, le: ilYa(7, 10) } } }),
  /* 3 — preuve manquante : un pare-chocs sans photo */
  contrat(3, { numero: "C-2026-0377", entite_id: GRENOBLE, depart_le: ilYa(9, 14), retour_prevu_le: ilYa(5, 14), retour_reel_le: ilYa(5, 13), statut: "clos",
    vehicule_id: VEHICULES_EXEMPLE[2].id, categorie_id: CATEGORIES_EXEMPLE[2].id, locataire_id: LOCATAIRES_EXEMPLE[1].id, km_depart: 90400, km_retour: 91030, km_inclus_jour: 200, tarif_jour_eur: 95, franchise_eur: 1500 }),
  /* 4 — facturé, envoyé, la facture de dommages est en litige */
  contrat(4, { numero: "C-2026-0351", entite_id: LYON, depart_le: ilYa(16, 9), retour_prevu_le: ilYa(12, 9), retour_reel_le: ilYa(12, 9), statut: "clos",
    vehicule_id: VEHICULES_EXEMPLE[3].id, categorie_id: CATEGORIES_EXEMPLE[0].id, locataire_id: LOCATAIRES_EXEMPLE[4].id, km_depart: 7500, km_retour: 8020, km_inclus: 400 }),
  /* 5 — facturé, réglé par carte, un avoir partiel émis */
  contrat(5, { numero: "C-2026-0340", entite_id: LYON, depart_le: ilYa(21, 9), retour_prevu_le: ilYa(18, 9), retour_reel_le: ilYa(18, 10), statut: "clos",
    vehicule_id: VEHICULES_EXEMPLE[5].id, categorie_id: CATEGORIES_EXEMPLE[1].id, locataire_id: LOCATAIRES_EXEMPLE[6].id, km_depart: 33000, km_retour: 33400, km_inclus: 300 }),
  /* 6 — professionnel, facture envoyée, échéance dépassée, une relance partie */
  contrat(6, { numero: "C-2026-0322", entite_id: GRENOBLE, depart_le: ilYa(50, 8), retour_prevu_le: ilYa(45, 18), retour_reel_le: ilYa(45, 18), statut: "clos",
    vehicule_id: VEHICULES_EXEMPLE[2].id, categorie_id: CATEGORIES_EXEMPLE[2].id, locataire_id: LOCATAIRES_EXEMPLE[5].id, km_depart: 88900, km_retour: 90400, km_illimite: true, tarif_jour_eur: 95, franchise_eur: 1500 }),
  /* 7 — en location, retour dans deux jours */
  contrat(7, { numero: "C-2026-0430", entite_id: LYON, depart_le: ilYa(1, 15), retour_prevu_le: dans(2, 15), statut: "ouvert",
    vehicule_id: VEHICULES_EXEMPLE[4].id, categorie_id: CATEGORIES_EXEMPLE[0].id, locataire_id: LOCATAIRES_EXEMPLE[3].id, km_depart: 5100, km_inclus: null, franchise_eur: null, rachat_franchise: null,
    source: "pdf", avertissements: [{ code: "ecart_avec_le_logiciel", champ: "retour_prevu_le" }] }),
  /* 8 — rendu à l'heure, plein fait : rien à facturer */
  contrat(8, { numero: "C-2026-0299", entite_id: GRENOBLE, depart_le: ilYa(30, 9), retour_prevu_le: ilYa(28, 9), retour_reel_le: ilYa(28, 8), statut: "clos",
    vehicule_id: VEHICULES_EXEMPLE[1].id, categorie_id: CATEGORIES_EXEMPLE[1].id, locataire_id: LOCATAIRES_EXEMPLE[7].id, km_depart: 47500, km_retour: 47800, km_inclus: 400 }),
];

export const AMENDEMENTS_EXEMPLE: Amendement[] = [
  { id: u("am", 1), contrat_id: u("co", 2), type: "prolongation", retour_prevu_le: ilYa(3, 9), km_inclus: null, sans_frais: false, origine: "agence", motif: "Le client a demandé un jour de plus par téléphone.", accorde_par: EXEMPLE_MOI, accorde_le: ilYa(4, 8) },
  { id: u("am", 2), contrat_id: u("co", 6), type: "restitution_decalee", retour_prevu_le: ilYa(45, 18), km_inclus: null, sans_frais: true, origine: "assistance", motif: "Panne le dimanche : dépanneuse envoyée, retour décalé sans frais.", accorde_par: null, accorde_le: ilYa(46, 20) },
];

const prop = (n: number, o: Partial<Proposition> & Pick<Proposition, "contrat_id" | "entite_id" | "statut" | "total_ht" | "total_tva" | "total_ttc" | "total_frais_ttc" | "total_dommages_ttc" | "calculee_le">): Proposition => ({
  id: u("pr", n), version: 1, source: "saisie", bareme_id: BAREME_EXEMPLE.id, hors_bareme: false, non_contradictoire: false, entrees: {}, avertissements: [],
  calcul_retard: null, calcul_km: null, calcul_carburant: null, plafond_eur: 800, demande_id: null, calculee_par: SOFIA, ...o,
});

export const PROPOSITIONS_EXEMPLE: Proposition[] = [
  /* contrat 2 : 418,20 € à valider (la proposition type du scénario) */
  prop(2, { contrat_id: u("co", 2), entite_id: LYON, statut: "a_valider", total_ht: 378.5, total_tva: 39.7, total_ttc: 418.2, total_frais_ttc: 238.2, total_dommages_ttc: 180, calculee_le: ilYa(2, 12),
    entrees: { retour_reel_le: ilYa(2, 11), km_retour: 48210, carburant_depart_8: 8, carburant_retour_8: 5 }, demande_id: u("de", 2),
    calcul_retard: { retard_min: 1590, jours: 2, unite: "jour_entame", quantite: 2, prix_unitaire: 45, montant_ht: 90 },
    calcul_km: { parcourus: 410, inclus: 300, depassement: 110, unite: "km", quantite: 110, prix_unitaire: 0.25, montant_ht: 27.5 },
    calcul_carburant: { manquant: 3, unite: "huitieme", quantite: 3, prix_unitaire: 12, montant_ht: 36 } }),
  /* contrat 3 : preuve manquante */
  prop(3, { contrat_id: u("co", 3), entite_id: GRENOBLE, statut: "preuve_manquante", total_ht: 0, total_tva: 0, total_ttc: 0, total_frais_ttc: 0, total_dommages_ttc: 0, calculee_le: ilYa(5, 14), plafond_eur: 1500,
    entrees: { retour_reel_le: ilYa(5, 13), km_retour: 91030, carburant_depart_8: 8, carburant_retour_8: 8 },
    avertissements: [{ poste: "PARE_CHOC", code: "preuve_absente", bloquant: true }],
    calcul_retard: { retard_min: -60, montant_ht: 0, motif: "rendu_a_l_heure" }, calcul_km: { parcourus: 630, inclus: 800, depassement: 0, montant_ht: 0, motif: "dans_le_forfait" }, calcul_carburant: { manquant: 0, montant_ht: 0, motif: "niveau_rendu_suffisant" } }),
  /* contrat 4 : facturée */
  prop(4, { contrat_id: u("co", 4), entite_id: LYON, statut: "facturee", total_ht: 162.5, total_tva: 10.5, total_ttc: 173, total_frais_ttc: 63, total_dommages_ttc: 110, calculee_le: ilYa(12, 10), demande_id: u("de", 4),
    entrees: { retour_reel_le: ilYa(12, 9), km_retour: 8020, carburant_depart_8: 8, carburant_retour_8: 7 },
    calcul_km: { parcourus: 520, inclus: 400, depassement: 120, unite: "km", quantite: 120, prix_unitaire: 0.25, montant_ht: 30 }, calcul_carburant: { manquant: 1, unite: "huitieme", quantite: 1, prix_unitaire: 12, montant_ht: 12 }, calcul_retard: { retard_min: 0, montant_ht: 0, motif: "rendu_a_l_heure" } }),
  /* contrat 5 : facturée, réglée */
  prop(5, { contrat_id: u("co", 5), entite_id: LYON, statut: "facturee", total_ht: 345, total_tva: 33, total_ttc: 378, total_frais_ttc: 198, total_dommages_ttc: 180, calculee_le: ilYa(18, 11), demande_id: u("de", 5),
    entrees: { retour_reel_le: ilYa(18, 10), km_retour: 33400, carburant_depart_8: 8, carburant_retour_8: 2 },
    calcul_carburant: { manquant: 6, unite: "huitieme", quantite: 6, prix_unitaire: 12, montant_ht: 72 }, calcul_km: { parcourus: 400, inclus: 300, depassement: 100, unite: "km", quantite: 100, prix_unitaire: 0.25, montant_ht: 25 }, calcul_retard: { retard_min: 60, montant_ht: 0, motif: "dans_la_tolerance" } }),
  /* contrat 6 : facturée (pro), impayée */
  prop(6, { contrat_id: u("co", 6), entite_id: GRENOBLE, statut: "facturee", total_ht: 250, total_tva: 50, total_ttc: 300, total_frais_ttc: 300, total_dommages_ttc: 0, calculee_le: ilYa(45, 19), demande_id: u("de", 6), plafond_eur: 1500,
    entrees: { retour_reel_le: ilYa(45, 18), km_retour: 90400, carburant_depart_8: 8, carburant_retour_8: 3 },
    calcul_carburant: { manquant: 5, unite: "litre", quantite: 50, prix_unitaire: 1.9, frais_service: 15, montant_ht: 110 }, calcul_km: { montant_ht: 0, motif: "illimite" }, calcul_retard: { retard_min: 0, montant_ht: 0, motif: "rendu_a_l_heure" } }),
  /* contrat 8 : rien à facturer */
  prop(8, { contrat_id: u("co", 8), entite_id: GRENOBLE, statut: "rien_a_facturer", total_ht: 0, total_tva: 0, total_ttc: 0, total_frais_ttc: 0, total_dommages_ttc: 0, calculee_le: ilYa(28, 9),
    entrees: { retour_reel_le: ilYa(28, 8), km_retour: 47800, carburant_depart_8: 8, carburant_retour_8: 8 },
    calcul_retard: { retard_min: -60, montant_ht: 0, motif: "rendu_a_l_heure" }, calcul_km: { parcourus: 300, inclus: 400, depassement: 0, montant_ht: 0, motif: "dans_le_forfait" }, calcul_carburant: { manquant: 0, montant_ht: 0, motif: "niveau_rendu_suffisant" } }),
];

const ligne = (n: number, prop_id: string, rang: number, o: Partial<LigneProposition> & Pick<LigneProposition, "nature" | "famille" | "code" | "libelle" | "quantite" | "montant_ht">): LigneProposition => {
  const regime = o.regime_tva ?? (o.nature === "dommage" ? "hors_champ" : "taxable");
  const statut = o.statut ?? "chiffree";
  const ht = statut === "chiffree" ? o.montant_ht : 0;
  const tva = regime === "taxable" ? Math.round(ht * 20) / 100 : 0;
  return { id: u("pl", n), proposition_id: prop_id, rang, unite: "forfait", prix_unitaire: null, regime_tva: regime, taux_tva: regime === "taxable" ? 20 : null, montant_tva: tva, montant_ttc: Math.round((ht + tva) * 100) / 100, plafonnee: false, hors_bareme: false, calcul: {}, preuves: [{ photo: `retour/${o.code.toLowerCase()}.jpg` }], ...o, montant_ht: ht, statut };
};

export const LIGNES_EXEMPLE: LigneProposition[] = [
  ligne(1, u("pr", 2), 1, { nature: "frais", famille: "carburant", code: "CARBURANT_8E", libelle: "Carburant manquant, au huitième", unite: "huitieme", quantite: 3, prix_unitaire: 12, montant_ht: 36, preuves: [{ photo: "retour/jauge.jpg", prise_le: ilYa(2, 11) }] }),
  ligne(2, u("pr", 2), 2, { nature: "frais", famille: "kilometres", code: "KM_SUP", libelle: "Kilomètre au-delà du forfait", unite: "km", quantite: 110, prix_unitaire: 0.25, montant_ht: 27.5, preuves: [{ photo: "retour/compteur.jpg", prise_le: ilYa(2, 11) }] }),
  ligne(3, u("pr", 2), 3, { nature: "frais", famille: "retard", code: "RETARD_JOUR", libelle: "Jour de retard entamé (au tarif du contrat)", unite: "jour_entame", quantite: 2, prix_unitaire: 45, montant_ht: 90, preuves: [{ note: "retour enregistré à 11 h 30, prévu la veille 9 h" }] }),
  ligne(4, u("pr", 2), 4, { nature: "dommage", famille: "dommage", code: "RAYURE_PORTIERE", libelle: "Rayure de portière avant droite", unite: "forfait", quantite: 1, prix_unitaire: 180, montant_ht: 180, preuves: [{ photo: "retour/portiere-avant-droite.jpg", prise_le: ilYa(2, 11) }, { photo: "depart/portiere-avant-droite.jpg", prise_le: ilYa(7, 9) }] }),
  ligne(5, u("pr", 2), 5, { nature: "frais", famille: "nettoyage", code: "NETTOYAGE", libelle: "Nettoyage approfondi", quantite: 1, prix_unitaire: 60, montant_ht: 60, preuves: [{ photo: "retour/habitacle.jpg" }] }),
  ligne(6, u("pr", 3), 1, { nature: "dommage", famille: "dommage", code: "PARE_CHOC", libelle: "Pare-chocs enfoncé", quantite: 1, prix_unitaire: 950, montant_ht: 950, statut: "preuve_manquante", preuves: [] }),
  ligne(7, u("pr", 4), 1, { nature: "frais", famille: "carburant", code: "CARBURANT_8E", libelle: "Carburant manquant, au huitième", unite: "huitieme", quantite: 1, prix_unitaire: 12, montant_ht: 12 }),
  ligne(8, u("pr", 4), 2, { nature: "frais", famille: "kilometres", code: "KM_SUP", libelle: "Kilomètre au-delà du forfait", unite: "km", quantite: 120, prix_unitaire: 0.25, montant_ht: 30 }),
  ligne(9, u("pr", 4), 3, { nature: "frais", famille: "frais", code: "FRAIS_DOSSIER", libelle: "Frais de dossier", quantite: 1, prix_unitaire: 25, montant_ht: 10.5, preuves: [{ note: "forfait" }] }),
  ligne(10, u("pr", 4), 4, { nature: "dommage", famille: "dommage", code: "PARE_BRISE", libelle: "Impact sur le pare-brise", quantite: 1, prix_unitaire: 120, montant_ht: 110, plafonnee: false }),
  ligne(11, u("pr", 5), 1, { nature: "frais", famille: "carburant", code: "CARBURANT_8E", libelle: "Carburant manquant, au huitième", unite: "huitieme", quantite: 6, prix_unitaire: 12, montant_ht: 72 }),
  ligne(12, u("pr", 5), 2, { nature: "frais", famille: "kilometres", code: "KM_SUP", libelle: "Kilomètre au-delà du forfait", unite: "km", quantite: 100, prix_unitaire: 0.25, montant_ht: 25 }),
  ligne(13, u("pr", 5), 3, { nature: "frais", famille: "nettoyage", code: "NETTOYAGE", libelle: "Nettoyage approfondi", quantite: 1, prix_unitaire: 60, montant_ht: 60 }),
  ligne(14, u("pr", 5), 4, { nature: "frais", famille: "frais", code: "FRAIS_DOSSIER", libelle: "Frais de dossier", quantite: 1, prix_unitaire: 25, montant_ht: 8 }),
  ligne(15, u("pr", 5), 5, { nature: "dommage", famille: "dommage", code: "RAYURE_PORTIERE", libelle: "Rayure de portière arrière gauche", quantite: 1, prix_unitaire: 180, montant_ht: 180 }),
  ligne(16, u("pr", 6), 1, { nature: "frais", famille: "carburant", code: "CARBURANT_LITRE", libelle: "Gazole manquant, au litre", unite: "litre", quantite: 50, prix_unitaire: 1.9, montant_ht: 95 }),
  ligne(17, u("pr", 6), 2, { nature: "frais", famille: "carburant", code: "CARBURANT_SERVICE", libelle: "Frais de service carburant", quantite: 1, prix_unitaire: 15, montant_ht: 15 }),
  ligne(18, u("pr", 6), 3, { nature: "frais", famille: "frais", code: "CLE_PERDUE", libelle: "Clé perdue (refabrication)", quantite: 1, prix_unitaire: 190, montant_ht: 140, preuves: [{ note: "déclaration du conducteur" }] }),
];

const fac = (n: number, o: Partial<Facture> & Pick<Facture, "contrat_id" | "contrat_numero" | "proposition_id" | "nature" | "reference" | "emise_le" | "echeance_le" | "statut" | "total_ht" | "total_tva" | "total_ttc" | "destinataire">): Facture => ({
  id: u("fa", n), demande_id: u("de", n), date_facture: o.emise_le.slice(0, 10), a_debiter_avant: null, emetteur: { nom: "Autoloc Bertin", siren: "512345679", ...REGLAGES_EXEMPLE.emetteur },
  mentions: { mandat: "Facture établie par Omega au nom et pour le compte de Autoloc Bertin.", objet: o.nature === "frais" ? "Frais complémentaires de location" : "Dommages constatés à la restitution", contrat: o.contrat_numero, ...(o.nature === "dommages" ? { tva: "Indemnité hors du champ de la TVA (BOI-TVA-BASE-10-10-50, § 300)." } : {}) },
  regle_le: null, mode_reglement: null, litige_motif: null, envoi_id: u("en", n), relances: 0, relance_le: null, ...o,
});

const dest = (l: Locataire) => ({ type: l.type, nom: [l.prenom, l.nom].filter(Boolean).join(" "), raison_sociale: l.raison_sociale ?? "", adresse: l.adresse ?? "", email: l.email ?? "" });

export const FACTURES_EXEMPLE: Facture[] = [
  fac(41, { contrat_id: u("co", 4), contrat_numero: "C-2026-0351", proposition_id: u("pr", 4), nature: "frais", reference: "FA-2026-000118", emise_le: ilYa(12, 10), echeance_le: ilYa(12, 10).slice(0, 10), statut: "envoyee", total_ht: 52.5, total_tva: 10.5, total_ttc: 63, destinataire: dest(LOCATAIRES_EXEMPLE[4]), a_debiter_avant: ilYa(2).slice(0, 10) }),
  fac(42, { contrat_id: u("co", 4), contrat_numero: "C-2026-0351", proposition_id: u("pr", 4), nature: "dommages", reference: "FA-2026-000119", emise_le: ilYa(12, 10), echeance_le: ilYa(12, 10).slice(0, 10), statut: "litige", total_ht: 110, total_tva: 0, total_ttc: 110, destinataire: dest(LOCATAIRES_EXEMPLE[4]), litige_motif: "Le client écrit que l'impact sur le pare-brise était visible sur la photo de départ, angle avant gauche." }),
  fac(51, { contrat_id: u("co", 5), contrat_numero: "C-2026-0340", proposition_id: u("pr", 5), nature: "frais", reference: "FA-2026-000104", emise_le: ilYa(18, 11), echeance_le: ilYa(18, 11).slice(0, 10), statut: "reglee", total_ht: 165, total_tva: 33, total_ttc: 198, destinataire: dest(LOCATAIRES_EXEMPLE[6]), regle_le: ilYa(16, 9), mode_reglement: "carte" }),
  fac(52, { contrat_id: u("co", 5), contrat_numero: "C-2026-0340", proposition_id: u("pr", 5), nature: "dommages", reference: "FA-2026-000105", emise_le: ilYa(18, 11), echeance_le: ilYa(18, 11).slice(0, 10), statut: "reglee", total_ht: 180, total_tva: 0, total_ttc: 180, destinataire: dest(LOCATAIRES_EXEMPLE[6]), regle_le: ilYa(16, 9), mode_reglement: "carte" }),
  fac(61, { contrat_id: u("co", 6), contrat_numero: "C-2026-0322", proposition_id: u("pr", 6), nature: "frais", reference: "FA-2026-000071", emise_le: ilYa(45, 19), echeance_le: ilYa(15, 19).slice(0, 10), statut: "envoyee", total_ht: 250, total_tva: 50, total_ttc: 300, destinataire: dest(LOCATAIRES_EXEMPLE[5]), relances: 1, relance_le: ilYa(7, 9),
    mentions: { mandat: "Facture établie par Omega au nom et pour le compte de Autoloc Bertin.", objet: "Frais complémentaires de location", contrat: "C-2026-0322", penalites: "En cas de retard de paiement : pénalités au taux de la BCE majoré de 10 points, et indemnité forfaitaire de recouvrement de 40 € (C. com. L441-10)." } }),
];

const lf = (n: number, facture_id: string, rang: number, l: LigneProposition): LigneFacture => ({ id: u("fl", n), facture_id, rang, code: l.code, libelle: l.libelle, famille: l.famille, unite: l.unite, quantite: l.quantite, prix_unitaire: l.prix_unitaire, montant_ht: l.montant_ht, regime_tva: l.regime_tva, taux_tva: l.taux_tva, montant_tva: l.montant_tva, montant_ttc: l.montant_ttc, preuves: l.preuves });
export const LIGNES_FACTURES_EXEMPLE: LigneFacture[] = [
  lf(1, u("fa", 41), 1, LIGNES_EXEMPLE[6]), lf(2, u("fa", 41), 2, LIGNES_EXEMPLE[7]), lf(3, u("fa", 41), 3, LIGNES_EXEMPLE[8]),
  lf(4, u("fa", 42), 1, LIGNES_EXEMPLE[9]),
  lf(5, u("fa", 51), 1, LIGNES_EXEMPLE[10]), lf(6, u("fa", 51), 2, LIGNES_EXEMPLE[11]), lf(7, u("fa", 51), 3, LIGNES_EXEMPLE[12]), lf(8, u("fa", 51), 4, LIGNES_EXEMPLE[13]),
  lf(9, u("fa", 52), 1, LIGNES_EXEMPLE[14]),
  lf(10, u("fa", 61), 1, LIGNES_EXEMPLE[15]), lf(11, u("fa", 61), 2, LIGNES_EXEMPLE[16]), lf(12, u("fa", 61), 3, LIGNES_EXEMPLE[17]),
];

export const AVOIRS_EXEMPLE: Avoir[] = [
  { id: u("av", 1), facture_id: u("fa", 51), facture_reference: "FA-2026-000104", contrat_id: u("co", 5), contrat_numero: "C-2026-0340", motif: "Le nettoyage était dû à une fuite du lave-glace, pas au client.", total: false, montant_ht: 60, montant_tva: 12, montant_ttc: 72, statut: "emis", demande_id: u("de", 51), demande_par: SOFIA, reference: "AV-2026-000007", emis_le: ilYa(15, 16), date_avoir: ilYa(15).slice(0, 10), envoye_le: ilYa(15, 16), cree_le: ilYa(15, 14) },
];

export const DEMANDES_EXEMPLE: DemandeCourte[] = [
  { id: u("de", 2), type_action: "facture.envoyer", statut: "en_attente", approbations_requises: 1, roles_autorises: ["gerant", "admin", "valideur"], echeance: dans(0, 23), demandeur_id: SOFIA },
  { id: u("de", 4), type_action: "facture.envoyer", statut: "executee", approbations_requises: 1, roles_autorises: ["gerant", "admin", "valideur"], echeance: ilYa(12, 23), demandeur_id: SOFIA },
  { id: u("de", 5), type_action: "facture.envoyer", statut: "executee", approbations_requises: 1, roles_autorises: ["gerant", "admin", "valideur"], echeance: ilYa(18, 23), demandeur_id: SOFIA },
  { id: u("de", 6), type_action: "facture.envoyer", statut: "executee", approbations_requises: 1, roles_autorises: ["gerant", "admin", "valideur"], echeance: ilYa(45, 23), demandeur_id: EXEMPLE_MOI },
  { id: u("de", 51), type_action: "avoir.emettre", statut: "executee", approbations_requises: 1, roles_autorises: ["gerant", "admin"], echeance: ilYa(13, 14), demandeur_id: SOFIA },
];

const j = (n: number, action: string, objet_type: string, objet_id: string, survenu_le: string, donnees: Record<string, unknown> = {}): LigneJournal => ({ id: u("jo", n), action, objet_type, objet_id, donnees, survenu_le });
export const JOURNAL_EXEMPLE: LigneJournal[] = [
  j(1, "tavaro.bareme_publie", "loc_baremes", BAREME_EXEMPLE.id, "2025-12-15T10:00:00Z", { libelle: BAREME_EXEMPLE.libelle, lignes: 12 }),
  j(2, "tavaro.proposition_calculee", "loc_propositions", u("pr", 2), ilYa(2, 12), { contrat: u("co", 2), numero: "C-2026-0398", version: 1, statut: "calculee", total_ttc: 418.2, par: SOFIA }),
  j(3, "tavaro.demande_deposee", "loc_propositions", u("pr", 2), ilYa(2, 12), { contrat: u("co", 2), demande: u("de", 2), montant: 418.2, saisi_par: SOFIA }),
  j(4, "tavaro.proposition_calculee", "loc_propositions", u("pr", 3), ilYa(5, 14), { contrat: u("co", 3), numero: "C-2026-0377", version: 1, statut: "preuve_manquante", par: SOFIA }),
  j(5, "tavaro.proposition_calculee", "loc_propositions", u("pr", 4), ilYa(12, 10), { contrat: u("co", 4), numero: "C-2026-0351", version: 1, statut: "calculee", total_ttc: 173, par: SOFIA }),
  j(6, "tavaro.demande_deposee", "loc_propositions", u("pr", 4), ilYa(12, 10), { contrat: u("co", 4), demande: u("de", 4), montant: 173 }),
  j(7, "tavaro.proposition_validee", "loc_propositions", u("pr", 4), ilYa(12, 14), { contrat: u("co", 4), demande: u("de", 4), decideurs: [EXEMPLE_MOI], montant: 173 }),
  j(8, "tavaro.facture_emise", "loc_factures", u("fa", 41), ilYa(12, 14), { contrat: u("co", 4), reference: "FA-2026-000118", nature: "frais", total_ttc: 63 }),
  j(9, "tavaro.facture_emise", "loc_factures", u("fa", 42), ilYa(12, 14), { contrat: u("co", 4), reference: "FA-2026-000119", nature: "dommages", total_ttc: 110 }),
  j(10, "tavaro.facture_envoyee", "loc_propositions", u("pr", 4), ilYa(12, 14), { contrat: u("co", 4), factures: "FA-2026-000118 et FA-2026-000119", mode: "reel" }),
  j(11, "tavaro.facture_litige", "loc_factures", u("fa", 42), ilYa(9, 16), { contrat: u("co", 4), reference: "FA-2026-000119", motif: "Impact visible sur la photo de départ" }),
  j(12, "tavaro.proposition_validee", "loc_propositions", u("pr", 5), ilYa(18, 15), { contrat: u("co", 5), demande: u("de", 5), decideurs: [EXEMPLE_MOI], montant: 378 }),
  j(13, "tavaro.facture_emise", "loc_factures", u("fa", 51), ilYa(18, 15), { contrat: u("co", 5), reference: "FA-2026-000104", nature: "frais", total_ttc: 198 }),
  j(14, "tavaro.facture_emise", "loc_factures", u("fa", 52), ilYa(18, 15), { contrat: u("co", 5), reference: "FA-2026-000105", nature: "dommages", total_ttc: 180 }),
  j(15, "tavaro.facture_reglee", "loc_factures", u("fa", 51), ilYa(16, 9), { contrat: u("co", 5), reference: "FA-2026-000104", mode: "carte", montant: 198 }),
  j(16, "tavaro.facture_reglee", "loc_factures", u("fa", 52), ilYa(16, 9), { contrat: u("co", 5), reference: "FA-2026-000105", mode: "carte", montant: 180 }),
  j(17, "tavaro.avoir_demande", "loc_avoirs", u("av", 1), ilYa(15, 14), { contrat: u("co", 5), facture: u("fa", 51), reference: "FA-2026-000104", montant_ttc: 72, saisi_par: SOFIA }),
  j(18, "tavaro.avoir_emis", "loc_avoirs", u("av", 1), ilYa(15, 16), { contrat: u("co", 5), reference: "AV-2026-000007", montant_ttc: 72, facture_reference: "FA-2026-000104", decideurs: [CLAIRE] }),
  j(19, "tavaro.facture_emise", "loc_factures", u("fa", 61), ilYa(45, 19), { contrat: u("co", 6), reference: "FA-2026-000071", nature: "frais", total_ttc: 300 }),
  j(20, "tavaro.facture_envoyee", "loc_propositions", u("pr", 6), ilYa(45, 19), { contrat: u("co", 6), factures: "FA-2026-000071", mode: "reel" }),
  j(21, "tavaro.facture_relancee", "loc_factures", u("fa", 61), ilYa(7, 9), { contrat: u("co", 6), reference: "FA-2026-000071", relance: 1, origine: "cron", reste_du: 300 }),
  j(22, "tavaro.proposition_calculee", "loc_propositions", u("pr", 8), ilYa(28, 9), { contrat: u("co", 8), numero: "C-2026-0299", version: 1, statut: "rien_a_facturer", par: SOFIA }),
];

/* ——— les dossiers assemblés ——— */
export function assemblerDossiers(contrats: Contrat[], o: {
  locataires: Locataire[]; vehicules: Vehicule[]; categories: Categorie[]; amendements: Amendement[]; propositions: Proposition[]; lignes: LigneProposition[];
  factures: Facture[]; lignesFactures: LigneFacture[]; avoirs: Avoir[]; demandes: DemandeCourte[]; journal: LigneJournal[]; etats?: EtatDesLieux[];
}): Dossier[] {
  return contrats.map((contrat) => {
    const propositions = o.propositions.filter((p) => p.contrat_id === contrat.id);
    const factures = o.factures.filter((f) => f.contrat_id === contrat.id);
    const ids = new Set<string>([contrat.id, ...propositions.map((p) => p.id), ...factures.map((f) => f.id)]);
    const avoirs = o.avoirs.filter((a) => a.contrat_id === contrat.id);
    avoirs.forEach((a) => ids.add(a.id));
    const demandeIds = new Set([...propositions.map((p) => p.demande_id), ...avoirs.map((a) => a.demande_id)].filter(Boolean) as string[]);
    return {
      contrat,
      locataire: o.locataires.find((l) => l.id === contrat.locataire_id) ?? null,
      vehicule: o.vehicules.find((v) => v.id === contrat.vehicule_id) ?? null,
      categorie: o.categories.find((c) => c.id === contrat.categorie_id) ?? null,
      amendements: o.amendements.filter((a) => a.contrat_id === contrat.id),
      propositions,
      lignes: o.lignes.filter((l) => propositions.some((p) => p.id === l.proposition_id)),
      factures,
      lignesFactures: o.lignesFactures.filter((l) => factures.some((f) => f.id === l.facture_id)),
      avoirs,
      demandes: o.demandes.filter((d) => demandeIds.has(d.id)),
      journal: o.journal.filter((l) => (l.objet_id && ids.has(l.objet_id)) || (typeof l.donnees.contrat === "string" && ids.has(l.donnees.contrat))).sort((a, b) => a.survenu_le.localeCompare(b.survenu_le)),
      etats: (o.etats ?? []).filter((e) => e.contrat_id === contrat.id),
    };
  });
}

/* ——— les états des lieux (b2_05) : le départ signé de la Clio avec une rayure déjà là et une caution prise ; le départ
   signé de la Yaris (C-2026-0351, en litige : le pare-brise n'y figure pas) ; le départ et le retour signés de la Golf,
   caution levée ; le départ signé du contrat en cours. ——— */
const vues = (n: number, quand: string) => ["avant", "arriere", "flanc_gauche", "flanc_droit", "compteur", "jauge"].map((vue) => ({ vue, chemin: `${C}/loc_contrat/${u("co", n)}/${vue}.jpg`, prise_le: quand }));
const etat = (n: number, contrat: number, o: Partial<EtatDesLieux> & Pick<EtatDesLieux, "moment" | "releve_le" | "entite_id">): EtatDesLieux => ({
  id: u("ed", n), client_id: C, contrat_id: u("co", contrat), statut: "signe", km: null, carburant_8: 8, charge_pct: null, photos: vues(contrat, o.releve_le), dommages: [],
  observations: null, caution_eur: null, caution_mode: null, caution_reference: null, caution_statut: null, caution_levee_le: null, caution_motif: null,
  signataire_nom: null, signature_chemin: null, signe_le: o.releve_le, empreinte: null, refus_motif: null, refuse_le: null, etabli_par: SOFIA, cree_le: o.releve_le, ...o,
});
export const ETATS_EXEMPLE: EtatDesLieux[] = [
  etat(1, 1, { moment: "depart", entite_id: LYON, releve_le: ilYa(4, 9), km: 12000, signataire_nom: "Marie Durand", empreinte: "3f2a9c41d07be6a15c88e2f0b4d93a7e61c5f08b2d4e7a9c13f6b80d52e4a7c9",
    caution_eur: 800, caution_mode: "empreinte_carte", caution_reference: "AUT-448812", caution_statut: "prise",
    dommages: [{ zone: "flanc_droit", code: "RAYURE_PORTIERE", description: "Rayure de 6 cm sur la portière arrière droite", preuves: [{ chemin: `${C}/loc_contrat/${u("co", 1)}/rayure-depart.jpg`, prise_le: ilYa(4, 9) }] }] }),
  etat(4, 4, { moment: "depart", entite_id: LYON, releve_le: ilYa(16, 9), km: 7500, signataire_nom: "Samir Haddad", empreinte: "a81c07f3e95d2b46c0f1e8a7d3b5926e4c0a1f7d8e2b3c95a6f04d7e1b8c2a39",
    caution_eur: 500, caution_mode: "empreinte_carte", caution_reference: "AUT-440190", caution_statut: "prise", observations: "Pare-brise contrôlé : aucun impact." }),
  etat(5, 5, { moment: "depart", entite_id: LYON, releve_le: ilYa(21, 9), km: 33000, signataire_nom: "Camille Roux", empreinte: "5be0c2a9f41d73e8b6a05c9d2e7f13b84a6c0d95e2f17b3a8c4d60e9f2a1b7c5",
    caution_eur: 800, caution_mode: "empreinte_carte", caution_reference: "AUT-437720", caution_statut: "levee", caution_levee_le: ilYa(16, 9), caution_motif: "Factures réglées par carte." }),
  etat(6, 5, { moment: "retour", entite_id: LYON, releve_le: ilYa(18, 10), km: 33400, carburant_8: 2, signataire_nom: "Camille Roux", empreinte: "c4d81e2a07f9b35d6e0a1c8f72b4e93d5a6f0c1e8b2d7a94f3c05e6b1d8a2f70" }),
  etat(7, 7, { moment: "depart", entite_id: LYON, releve_le: ilYa(1, 15), km: 5100, signataire_nom: "Luc Berger", empreinte: "e09b4c7a21d58f36a0c2e1b9d7f4a83c65e0b2d1f9a7c48e3b6d05a2c1f8e9b4",
    caution_eur: 800, caution_mode: "cheque", caution_reference: "Chèque n° 0046612", caution_statut: "prise" }),
];

export const DOSSIERS_EXEMPLE: Dossier[] = assemblerDossiers(CONTRATS_EXEMPLE, {
  locataires: LOCATAIRES_EXEMPLE, vehicules: VEHICULES_EXEMPLE, categories: CATEGORIES_EXEMPLE, amendements: AMENDEMENTS_EXEMPLE,
  propositions: PROPOSITIONS_EXEMPLE, lignes: LIGNES_EXEMPLE, factures: FACTURES_EXEMPLE, lignesFactures: LIGNES_FACTURES_EXEMPLE,
  avoirs: AVOIRS_EXEMPLE, demandes: DEMANDES_EXEMPLE, journal: JOURNAL_EXEMPLE, etats: ETATS_EXEMPLE,
});

/* ——— les avis de contravention (b2_03) : un à désigner bientôt (société), un à désigner, un à rapprocher en urgence,
   un désigné, un classé, un désigné il y a plus d'un an dont l'identité est effacée (b2_04). L'échéance est la date d'envoi plus 45 jours, comme la base la calcule. ——— */
const jourIso = (iso: string) => iso.slice(0, 10);
const plus = (jour: string, n: number) => new Date(Date.parse(jour + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const avis = (n: number, o: Partial<AvisContravention> & Pick<AvisContravention, "numero_avis" | "immatriculation" | "infraction_le" | "avis_envoye_le" | "statut">): AvisContravention => ({
  id: u("pv", n), client_id: C, entite_id: null, vehicule_id: null, lieu: null, nature: null, montant_eur: null, recu_le: o.avis_envoye_le,
  echeance_le: plus(o.avis_envoye_le, 45), contrat_id: null, locataire_id: null, rapprochement: null, candidats: 0, designation: null,
  mode_designation: null, reference_designation: null, designe_le: null, designe_par: null, hors_delai: null, motif_classement: null,
  classe_le: null, classe_par: null, source: "saisie", cree_par: SOFIA, cree_le: o.avis_envoye_le + "T09:00:00Z", ...o,
});
export const AVIS_EXEMPLE: AvisContravention[] = [
  avis(1, { numero_avis: "2026 0819 4471 02", immatriculation: VEHICULES_EXEMPLE[2].immatriculation, infraction_le: ilYa(48, 11), avis_envoye_le: jourIso(ilYa(40)), recu_le: jourIso(ilYa(37)),
    lieu: "A48, Voreppe", nature: "Excès de vitesse inférieur à 20 km/h (limite 110)", montant_eur: 135, statut: "a_designer", entite_id: GRENOBLE,
    vehicule_id: VEHICULES_EXEMPLE[2].id, contrat_id: u("co", 6), locataire_id: LOCATAIRES_EXEMPLE[5].id, rapprochement: "auto", candidats: 1 }),
  avis(2, { numero_avis: "2026 0917 1023 88", immatriculation: VEHICULES_EXEMPLE[5].immatriculation, infraction_le: ilYa(20, 17), avis_envoye_le: jourIso(ilYa(12)), recu_le: jourIso(ilYa(9)),
    lieu: "Lyon 3e, cours Gambetta", nature: "Franchissement de feu rouge", montant_eur: 135, statut: "a_designer", entite_id: LYON,
    vehicule_id: VEHICULES_EXEMPLE[5].id, contrat_id: u("co", 5), locataire_id: LOCATAIRES_EXEMPLE[6].id, rapprochement: "auto", candidats: 1 }),
  avis(3, { numero_avis: "2026 0822 5530 17", immatriculation: VEHICULES_EXEMPLE[3].immatriculation, infraction_le: ilYa(46, 8), avis_envoye_le: jourIso(ilYa(43)), recu_le: jourIso(ilYa(3)),
    lieu: "Villeurbanne, boulevard du 11-Novembre", nature: "Stationnement gênant", montant_eur: 35, statut: "a_rapprocher", entite_id: LYON, vehicule_id: VEHICULES_EXEMPLE[3].id }),
  avis(4, { numero_avis: "2026 0924 0310 45", immatriculation: VEHICULES_EXEMPLE[3].immatriculation, infraction_le: ilYa(14, 10), avis_envoye_le: jourIso(ilYa(9)), recu_le: jourIso(ilYa(6)),
    lieu: "A43, Saint-Quentin-Fallavier", nature: "Excès de vitesse inférieur à 20 km/h (limite 90)", montant_eur: 68, statut: "designe", entite_id: LYON,
    vehicule_id: VEHICULES_EXEMPLE[3].id, contrat_id: u("co", 4), locataire_id: LOCATAIRES_EXEMPLE[4].id, rapprochement: "auto", candidats: 1,
    designation: { type: "personne", nom: "Haddad", prenom: "Samir", date_naissance: "1979-11-04", lieu_naissance: "Marseille", adresse: "45 avenue Berthelot, 69007 Lyon", permis_numero: "790469200123" },
    mode_designation: "antai_en_ligne", reference_designation: "DES-2026-118842", designe_le: ilYa(2, 10), designe_par: EXEMPLE_MOI, hors_delai: false }),
  avis(5, { numero_avis: "2026 0801 7712 30", immatriculation: VEHICULES_EXEMPLE[1].immatriculation, infraction_le: ilYa(60, 7), avis_envoye_le: jourIso(ilYa(55)), recu_le: jourIso(ilYa(50)),
    lieu: "Grenoble, rocade sud", nature: "Excès de vitesse inférieur à 20 km/h (limite 90)", montant_eur: 68, statut: "classe", entite_id: GRENOBLE, vehicule_id: VEHICULES_EXEMPLE[1].id,
    motif_classement: "Usurpation de plaque : la photo du radar montre une autre voiture, la Peugeot était au parc. Requête en exonération envoyée à l'ANTAI avec le dépôt de plainte.", classe_le: ilYa(48, 15), classe_par: CLAIRE }),
  avis(6, { numero_avis: "2025 0812 6604 51", immatriculation: VEHICULES_EXEMPLE[0].immatriculation, infraction_le: ilYa(400, 16), avis_envoye_le: jourIso(ilYa(395)), recu_le: jourIso(ilYa(392)),
    lieu: "A7, Vienne", nature: "Excès de vitesse inférieur à 20 km/h (limite 130)", montant_eur: 135, statut: "designe", entite_id: LYON, vehicule_id: VEHICULES_EXEMPLE[0].id,
    rapprochement: "auto", candidats: 1, designation: { type: "personne", effacee_le: ilYa(20, 3) }, designation_effacee_le: ilYa(20, 3),
    mode_designation: "antai_en_ligne", reference_designation: "DES-2025-074410", designe_le: ilYa(385, 10), designe_par: CLAIRE, hors_delai: false }),
];
