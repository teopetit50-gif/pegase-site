/* CASHD — le délai de règlement, compte par compte (03/11/2026).
   Le site promet « Votre encours est classé par ancienneté, avec le délai moyen de règlement », « Le délai
   moyen de règlement se mesure compte par compte » et un ton qui « se cale sur l'historique de paiement ».
   La vue public.cashd_delais_reglement (c2_03, lecture ouverte aux comptes du client) le calcule sur les
   factures payées des douze derniers mois ; aucune page ne la lisait. */

import { createClient } from "@/lib/supabase/client";

export type DelaiReglement = {
  compte_id: string;
  nom: string;
  delai_moyen_jours: number | null;
  retard_moyen_jours: number | null;
  delai_recent_jours: number | null;
  factures_payees: number;
  retard_actuel_jours: number;
};

export async function chargerDelais(client: string): Promise<DelaiReglement[]> {
  const { data, error } = await createClient()
    .from("cashd_delais_reglement")
    .select("compte_id, nom, delai_moyen_jours, retard_moyen_jours, delai_recent_jours, factures_payees, retard_actuel_jours")
    .eq("client_id", client)
    .order("delai_moyen_jours", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DelaiReglement[];
}

/* l'exemple : l'historique des comptes d'Atelier Bertin sur douze mois (les identifiants de FICHES_EXEMPLE) */
const id = (n: number) => `00000000-0000-4000-8000-0000000c2${String(n).padStart(3, "0")}`;
export const DELAIS_EXEMPLE: DelaiReglement[] = [
  { compte_id: id(7), nom: "Restaurant Le Comptoir", delai_moyen_jours: 71.5, retard_moyen_jours: 41.5, delai_recent_jours: null, factures_payees: 4, retard_actuel_jours: 96 },
  { compte_id: id(3), nom: "Mairie de Caluire", delai_moyen_jours: 52, retard_moyen_jours: 22, delai_recent_jours: 49, factures_payees: 9, retard_actuel_jours: 25 },
  { compte_id: id(1), nom: "SCI Lefèvre Patrimoine", delai_moyen_jours: 44.2, retard_moyen_jours: 14.2, delai_recent_jours: 58, factures_payees: 11, retard_actuel_jours: 45 },
  { compte_id: id(4), nom: "Peintures Giraud SARL", delai_moyen_jours: 38.6, retard_moyen_jours: 8.6, delai_recent_jours: 34, factures_payees: 7, retard_actuel_jours: 100 },
  { compte_id: id(2), nom: "Hôtel des Brotteaux", delai_moyen_jours: 31, retard_moyen_jours: 1, delai_recent_jours: 29.5, factures_payees: 14, retard_actuel_jours: 0 },
  { compte_id: id(6), nom: "Alpine Retreats Ltd", delai_moyen_jours: 27.3, retard_moyen_jours: 0, delai_recent_jours: 26, factures_payees: 6, retard_actuel_jours: 12 },
  { compte_id: id(5), nom: "Boulangerie Martin", delai_moyen_jours: 22.4, retard_moyen_jours: 0.8, delai_recent_jours: 36, factures_payees: 18, retard_actuel_jours: 15 },
];

/* la moyenne pondérée par le nombre de factures payées */
export function delaiGlobal(lignes: DelaiReglement[]): number | null {
  const avec = lignes.filter((l) => l.delai_moyen_jours !== null && l.factures_payees > 0);
  const n = avec.reduce((t, l) => t + l.factures_payees, 0);
  return n ? Math.round((avec.reduce((t, l) => t + Number(l.delai_moyen_jours) * l.factures_payees, 0) / n) * 10) / 10 : null;
}

/* une phrase d'historique pour la fiche du compte */
export function phraseHistorique(d: DelaiReglement | undefined): string | null {
  if (!d || !d.factures_payees || d.delai_moyen_jours === null) return null;
  const j = (v: number) => `${String(Math.round(v * 10) / 10).replace(".", ",")} j`;
  const recent = d.delai_recent_jours !== null ? ` ; ces trois derniers mois, ${j(Number(d.delai_recent_jours))}` : "";
  return `Paie en ${j(Number(d.delai_moyen_jours))} en moyenne sur ${d.factures_payees} facture${d.factures_payees > 1 ? "s" : ""} payée${d.factures_payees > 1 ? "s" : ""} en douze mois${recent}, ${d.retard_moyen_jours ? `${j(Number(d.retard_moyen_jours))} de retard moyen` : "sans retard"}.`;
}
