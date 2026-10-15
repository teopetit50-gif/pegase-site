/* ══════════════════════════════════════════════════════════════════════
   Les analyses du parc — types et portes (06/10/2026, session B3, renfort
   sur Tavaro). Lectures par les portes de b3t_01 à b3t_03 :
     loc_vehicules_inactifs(p_client, p_entite) → jsonb
     loc_reservations_a_risque(p_client, p_entite, p_heures) → jsonb
     loc_montee_en_gamme(p_client, p_entite, p_heures) → jsonb
     loc_contrats_a_risque(p_client, p_entite) → jsonb
     loc_plan_de_flotte(p_client, p_mois, p_cible) → jsonb   (gérant, admin)
   Écriture : loc_noter_controle_conducteur(p_contrat, p_identite, p_permis,
   p_permis_recent) → uuid. Si la base répond autrement, l'écran montre son
   message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";

export type Niveau = "fort" | "moyen" | "faible";

export type VehiculeInactif = {
  vehicule_id: string;
  immatriculation: string;
  modele: string | null;
  categorie: string;
  categorie_libelle: string;
  entite_id: string;
  agence: string | null;
  au_parking_depuis: string;
  jours_parking: number;
  probabilite: number;
  niveau: Niveau;
  raison: string;
  action: { type: "transfert" | "montee_en_gamme" | "creux"; libelle: string; vers?: string };
};

export type ReservationRisque = {
  reservation_id: string;
  ref: string;
  depart_prevu_le: string;
  entite_id: string;
  agence: string | null;
  categorie: string | null;
  client: string;
  canal: string | null;
  vol: string | null;
  score: number;
  niveau: "fort" | "moyen";
  raisons: string[];
  action: string;
};

export type ContratRisque = {
  contrat_id: string;
  numero: string;
  depart_le: string;
  retour_prevu_le: string;
  entite_id: string;
  agence: string | null;
  client: string;
  vehicule: string | null;
  score: number;
  niveau: "fort" | "moyen";
  raisons: string[];
  controle: { identite: Conformite; permis: Conformite; permis_recent: boolean | null; le: string } | null;
  action: string;
};

export type Conformite = "conforme" | "non_conforme";

export type OffreMontee = {
  reservation_id: string;
  ref: string;
  depart_prevu_le: string;
  entite_id: string;
  agence: string | null;
  client: string;
  categorie: string;
  offre: { categorie_id: string; categorie: string; libelle: string; libres: number };
  score: number;
  raisons: string[];
};

export type LignePlan = {
  categorie_id: string;
  categorie: string;
  libelle: string;
  flotte: number;
  jours_loues: number;
  utilisation: number | null;
  pic: number;
  cible: number;
  acheter: number;
  vendre: number;
  deplacer: { vers: string; n: number }[];
  recevoir: number;
  a_vendre: string[];
  renouveler: number;
  raison: string;
};

export type PlanDeFlotte = {
  annee: number;
  periode: { du: string; au: string; mois: number };
  cible_utilisation: number;
  agences: { entite_id: string; agence: string; nom: string; categories: LignePlan[] }[];
  totaux: { acheter: number; vendre: number; deplacer: number; renouveler: number };
};

export type Analyses = {
  inactifs: { a_risque: number; vehicules: VehiculeInactif[] } | null;
  reservations: { reservations: ReservationRisque[] } | null;
  contrats: { a_risque: number; contrats: ContratRisque[] } | null;
  montee: { offres: OffreMontee[] } | null;
  plan: PlanDeFlotte | null;
};

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new Error(message(error));
  return data as T;
}

/** Les cinq lectures ; une lecture refusée (rôle) rend null sans casser les autres. */
export async function chargerAnalyses(client_id: string, plan: boolean): Promise<{ analyses: Analyses; erreurs: string[] }> {
  const erreurs: string[] = [];
  const doux = async <T,>(p: Promise<T>, quoi: string): Promise<T | null> => {
    try {
      return await p;
    } catch (e) {
      erreurs.push(`${quoi} : ${e instanceof Error ? e.message : "erreur"}`);
      return null;
    }
  };
  const [inactifs, reservations, contrats, montee, plan_] = await Promise.all([
    doux(rpc<Analyses["inactifs"]>("loc_vehicules_inactifs", { p_client: client_id, p_entite: null }), "véhicules inactifs"),
    doux(rpc<Analyses["reservations"]>("loc_reservations_a_risque", { p_client: client_id, p_entite: null, p_heures: 72 }), "réservations à risque"),
    doux(rpc<Analyses["contrats"]>("loc_contrats_a_risque", { p_client: client_id, p_entite: null }), "contrats à risque"),
    doux(rpc<Analyses["montee"]>("loc_montee_en_gamme", { p_client: client_id, p_entite: null, p_heures: 48 }), "montée en gamme"),
    plan ? doux(rpc<PlanDeFlotte>("loc_plan_de_flotte", { p_client: client_id, p_mois: 12, p_cible: 0.8 }), "plan de flotte") : Promise.resolve(null),
  ]);
  return { analyses: { inactifs, reservations, contrats, montee, plan: plan_ }, erreurs };
}

export async function noterControle(contrat_id: string, identite: Conformite, permis: Conformite, permis_recent: boolean | null): Promise<void> {
  await rpc<string>("loc_noter_controle_conducteur", { p_contrat: contrat_id, p_identite: identite, p_permis: permis, p_permis_recent: permis_recent });
}
