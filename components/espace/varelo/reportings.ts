/* ══════════════════════════════════════════════════════════════════════
   Les reportings dus — VARELO (06/10/2026, B1)

   Formes décalquées de omega/modules/varelo/migrations/b1_09_reportings.sql :
   tables grp_reportings, vue grp_reportings_dus ; portes
   grp_enregistrer_reporting, grp_marquer_reporting, grp_arreter_reporting.
   L'exemple crée les échéances comme private.grp_generer_echeances :
   périodes calendaires depuis le début du suivi, jusqu'à 45 jours devant.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { AGENCE, EXEMPLE_CLIENT_ID, EXEMPLE_MOI, SIEGE } from "../exemples/socle";
import { ErreurPorte } from "./portes";
import { ANNECY, SOCIETES_EXEMPLE } from "./exemples";

export type Periodicite = "hebdomadaire" | "mensuelle" | "trimestrielle" | "annuelle";
export type Canal = "portail" | "courriel" | "extranet" | "courrier" | "autre";
export type EtatEcheance = "en_retard" | "aujourdhui" | "semaine" | "a_venir" | "envoye" | "envoye_en_retard" | "dispense";

export type Obligation = {
  id: string;
  entite_id: string;
  destinataire: string;
  intitule: string;
  periodicite: Periodicite;
  delai_jours: number;
  debut: string;
  canal: Canal;
  responsable_id: string | null;
  actif: boolean;
};

/* une ligne de grp_reportings_dus */
export type Du = {
  id: string;
  client_id: string;
  reporting_id: string;
  entite_id: string;
  societe: string;
  destinataire: string;
  code_groupe: string | null;
  intitule: string;
  periodicite: Periodicite;
  delai_jours: number;
  canal: Canal;
  responsable_id: string | null;
  actif: boolean;
  periode_debut: string;
  periode_fin: string;
  echeance: string;
  jours_restants: number;
  statut: "a_faire" | "envoye" | "dispense";
  fait_le: string | null;
  note: string | null;
  etat: EtatEcheance;
};

export const LIBELLE_PERIODICITE: Record<Periodicite, string> = { hebdomadaire: "chaque semaine", mensuelle: "chaque mois", trimestrielle: "chaque trimestre", annuelle: "chaque année" };
export const LIBELLE_CANAL: Record<Canal, string> = { portail: "portail", courriel: "courriel", extranet: "extranet", courrier: "courrier", autre: "autre canal" };
export const LIBELLE_ETAT_DU: Record<EtatEcheance, { libelle: string; teinte: "rouge" | "ambre" | "bleu" | "gris" | "vert" }> = {
  en_retard: { libelle: "En retard", teinte: "rouge" },
  aujourdhui: { libelle: "Aujourd'hui", teinte: "rouge" },
  semaine: { libelle: "Dans la semaine", teinte: "ambre" },
  a_venir: { libelle: "À venir", teinte: "gris" },
  envoye: { libelle: "Envoyé", teinte: "vert" },
  envoye_en_retard: { libelle: "Envoyé en retard", teinte: "ambre" },
  dispense: { libelle: "Dispensé", teinte: "bleu" },
};

/* ——— les dates, comme la base ——— */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jourLocal = (s: string) => {
  const [a, m, j] = s.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, j);
};
const plusJours = (s: string, n: number) => {
  const d = jourLocal(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const ecart = (a: string, b: string) => Math.round((jourLocal(a).getTime() - jourLocal(b).getTime()) / 86400000);
export const aujourdhui = () => iso(new Date());

export function debutPeriode(p: Periodicite, jour: string): string {
  const d = jourLocal(jour);
  if (p === "hebdomadaire") {
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return iso(d);
  }
  if (p === "mensuelle") return iso(new Date(d.getFullYear(), d.getMonth(), 1));
  if (p === "trimestrielle") return iso(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1));
  return iso(new Date(d.getFullYear(), 0, 1));
}
export function suivante(p: Periodicite, debut: string): string {
  const d = jourLocal(debut);
  if (p === "hebdomadaire") return plusJours(debut, 7);
  if (p === "mensuelle") return iso(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  if (p === "trimestrielle") return iso(new Date(d.getFullYear(), d.getMonth() + 3, 1));
  return iso(new Date(d.getFullYear() + 1, 0, 1));
}

export type Fait = { statut: "envoye" | "dispense"; fait_le: string; note: string | null };

/* les échéances d'une obligation, et leur état */
export function echeances(o: Obligation, faits: Record<string, Fait>, jusqua = plusJours(aujourdhui(), 45)): Du[] {
  const out: Du[] = [];
  const jour = aujourdhui();
  let d = debutPeriode(o.periodicite, o.debut);
  for (let k = 0; k < 400; k++) {
    const fin = plusJours(suivante(o.periodicite, d), -1);
    const ech = plusJours(fin, o.delai_jours);
    if (ech > jusqua) break;
    if (fin >= o.debut) {
      const id = `${o.id}:${d}`;
      const f = faits[id];
      const reste = ecart(ech, jour);
      const etat: EtatEcheance = f?.statut === "dispense" ? "dispense" : f?.statut === "envoye" ? (f.fait_le > ech ? "envoye_en_retard" : "envoye") : reste < 0 ? "en_retard" : reste === 0 ? "aujourdhui" : reste <= 7 ? "semaine" : "a_venir";
      out.push({ id, client_id: EXEMPLE_CLIENT_ID, reporting_id: o.id, entite_id: o.entite_id, societe: SOCIETES_EXEMPLE.find((s) => s.entite_id === o.entite_id)?.nom ?? "Société", destinataire: o.destinataire, code_groupe: null, intitule: o.intitule, periodicite: o.periodicite, delai_jours: o.delai_jours, canal: o.canal, responsable_id: o.responsable_id, actif: o.actif, periode_debut: d, periode_fin: fin, echeance: ech, jours_restants: reste, statut: f?.statut ?? "a_faire", fait_le: f?.fait_le ?? null, note: f?.note ?? null, etat });
    }
    d = suivante(o.periodicite, d);
  }
  return out;
}

/* ——— l'exemple : ce que l'atelier Bertin doit à ses marques, à sa banque, à son franchiseur ——— */
const U = (fin: string) => `00000000-0000-4000-8000-0000000${fin}`;
export const OBLIGATIONS_EXEMPLE = (): Obligation[] => [
  { id: U("0r01"), entite_id: SIEGE, destinataire: "Fabricant Alpicuisine", intitule: "Ventes et stock du mois", periodicite: "mensuelle", delai_jours: 10, debut: plusJours(aujourdhui(), -70), canal: "portail", responsable_id: EXEMPLE_MOI, actif: true },
  { id: U("0r02"), entite_id: AGENCE, destinataire: "Banque du Dauphiné", intitule: "Covenants et trésorerie", periodicite: "trimestrielle", delai_jours: 30, debut: plusJours(aujourdhui(), -200), canal: "courriel", responsable_id: null, actif: true },
  { id: U("0r03"), entite_id: ANNECY, destinataire: "Réseau Menuisiers de France", intitule: "Chiffre d'affaires de la semaine", periodicite: "hebdomadaire", delai_jours: 2, debut: plusJours(aujourdhui(), -16), canal: "extranet", responsable_id: null, actif: true },
];
/* le premier mois du siège a été envoyé, en retard */
export const FAITS_EXEMPLE = (): Record<string, Fait> => {
  const o = OBLIGATIONS_EXEMPLE()[0];
  const premiere = echeances(o, {})[0];
  return premiere ? { [premiere.id]: { statut: "envoye", fait_le: plusJours(premiere.echeance, 3), note: "Déposé sur le portail" } } : {};
};

/* ——— base réelle ——— */
function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

export async function chargerDus(client_id: string): Promise<Du[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("grp_reportings_dus").select("*").eq("client_id", client_id).order("echeance").limit(3000);
  if (error) throw new ErreurPorte(message(error));
  return (data ?? []) as Du[];
}

async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export const enregistrerReporting = (client_id: string, entite_id: string, champs: Record<string, unknown>) =>
  rpc<string>("grp_enregistrer_reporting", { p_client: client_id, p_entite: entite_id, p_champs: champs, p_reporting: null });
export const marquerReporting = (echeance_id: string, statut: "envoye" | "dispense", date: string, note: string | null) =>
  rpc<{ en_retard: boolean }>("grp_marquer_reporting", { p_echeance: echeance_id, p_statut: statut, p_date: date, p_note: note });
export const arreterReporting = (reporting_id: string, motif: string | null) => rpc<null>("grp_arreter_reporting", { p_reporting: reporting_id, p_motif: motif });
