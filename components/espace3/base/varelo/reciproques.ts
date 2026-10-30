/* ══════════════════════════════════════════════════════════════════════
   Les comptes réciproques intragroupe — VARELO, vague 3 (06/10/2026, B1)

   Formes décalquées de omega/modules/varelo/migrations/b1_06_reciproques.sql :
   vue grp_reciproques ; portes grp_justifier_ecart et
   grp_exporter_reciproques. L'exemple reprend les flux internes du
   Groupe Soléa : marchandises de Soléa Import et de Soléa Froid vers les
   magasins, loyers de Soléa Immobilier, frais de siège de la holding.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { AGENCE, EXEMPLE_CLIENT_ID, IMPORT, LAMENTIN, SIEGE, ilYa } from "../exemples/socle";
import { ErreurPorte } from "./portes";
import { DESTRELAND, FROID, IMMOBILIER, SOCIETES_EXEMPLE, TRANSIT } from "./exemples";

export type EtatReciproque = "concorde" | "ecart" | "justifie" | "dates_differentes" | "manque_creancier" | "manque_debiteur";
export type CategorieEcart = "en_transit" | "change" | "litige" | "decalage_periode" | "erreur_saisie" | "autre";

/* une ligne de grp_reciproques */
export type Reciproque = {
  client_id: string;
  creancier_id: string;
  creancier: string;
  debiteur_id: string;
  debiteur: string;
  creance: number | null;
  dette: number | null;
  ecart: number;
  arrete_creancier: string | null;
  arrete_debiteur: string | null;
  codes_creancier: number;
  codes_debiteur: number;
  justification_id: string | null;
  categorie: CategorieEcart | null;
  motif: string | null;
  justifie_le: string | null;
  justifie_par: string | null;
  etat: EtatReciproque;
};

export const CATEGORIES_ECART: { cle: CategorieEcart; libelle: string }[] = [
  { cle: "en_transit", libelle: "Facture ou règlement en transit" },
  { cle: "decalage_periode", libelle: "Décalage de période" },
  { cle: "litige", libelle: "Litige ou avoir contesté" },
  { cle: "change", libelle: "Écart de change" },
  { cle: "erreur_saisie", libelle: "Erreur de saisie à corriger" },
  { cle: "autre", libelle: "Autre" },
];

export const LIBELLE_ETAT_RECIPROQUE: Record<EtatReciproque, { libelle: string; teinte: "vert" | "ambre" | "rouge" | "gris" | "bleu" }> = {
  concorde: { libelle: "Concorde", teinte: "vert" },
  ecart: { libelle: "Écart à expliquer", teinte: "rouge" },
  justifie: { libelle: "Écart justifié", teinte: "bleu" },
  dates_differentes: { libelle: "Arrêtés différents", teinte: "ambre" },
  manque_creancier: { libelle: "Créance non déposée", teinte: "gris" },
  manque_debiteur: { libelle: "Dette non reconnue", teinte: "ambre" },
};

/* ——— l'exemple ——— */
const nom = (id: string) => SOCIETES_EXEMPLE.find((s) => s.entite_id === id)?.nom ?? "Société";
const jour = (n: number) => ilYa(n).slice(0, 10);
const R = (creancier: string, debiteur: string, creance: number | null, dette: number | null, ac: number | null, ad: number | null, etat: EtatReciproque, extra: Partial<Reciproque> = {}): Reciproque => ({
  client_id: EXEMPLE_CLIENT_ID,
  creancier_id: creancier,
  creancier: nom(creancier),
  debiteur_id: debiteur,
  debiteur: nom(debiteur),
  creance,
  dette,
  ecart: (creance ?? 0) - (dette ?? 0),
  arrete_creancier: ac === null ? null : jour(ac),
  arrete_debiteur: ad === null ? null : jour(ad),
  codes_creancier: creance === null ? 0 : 1,
  codes_debiteur: dette === null ? 0 : 1,
  justification_id: null,
  categorie: null,
  motif: null,
  justifie_le: null,
  justifie_par: null,
  etat,
  ...extra,
});

export const RECIPROQUES_EXEMPLE: Reciproque[] = [
  /* Soléa Import facture Soléa Market Lamentin : 37 500 € d'écart, un conteneur pas encore entré chez le magasin */
  R(IMPORT, LAMENTIN, 1102400, 1064900, 1, 1, "ecart"),
  R(IMPORT, AGENCE, 1284600, 1284600, 1, 1, "concorde"),
  R(IMPORT, DESTRELAND, 948300, 948300, 1, 1, "concorde"),
  R(IMMOBILIER, AGENCE, 96000, 96000, 1, 1, "concorde"),
  /* Soléa Froid a arrêté sa balance il y a douze jours, Jarry hier */
  R(FROID, AGENCE, 86300, 86300, 12, 1, "dates_differentes"),
  /* les frais de siège de Soléa Transit : sa balance au tableur ne les porte pas encore */
  R(SIEGE, TRANSIT, 42000, null, 1, null, "manque_debiteur"),
];

/* ——— base réelle ——— */
function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function chargerReciproques(client_id: string): Promise<Reciproque[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("grp_reciproques").select("*").eq("client_id", client_id).order("creancier").order("debiteur");
  if (error) throw new ErreurPorte(message(error));
  return ((data ?? []) as Reciproque[]).map((r) => ({ ...r, creance: n(r.creance), dette: n(r.dette), ecart: Number(r.ecart) }));
}

async function rpc<T>(nom_: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom_, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export const justifierEcart = (client_id: string, creancier_id: string, debiteur_id: string, categorie: CategorieEcart, motif: string) =>
  rpc<string>("grp_justifier_ecart", { p_client: client_id, p_creancier: creancier_id, p_debiteur: debiteur_id, p_categorie: categorie, p_motif: motif });

export const exporterReciproques = (client_id: string) => rpc<string>("grp_exporter_reciproques", { p_client: client_id });

/* le CSV de l'exemple, au même format que la porte */
export function csvExemple(l: Reciproque[]): string {
  const cell = (v: string | null) => {
    if (v == null) return "";
    const s = /^[=+@\t\r]/.test(v) || /^-[^0-9 ]/.test(v) ? `'${v}` : v;
    return /[;"\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const m = (v: number | null) => (v === null ? "" : v.toFixed(2).replace(".", ","));
  const d = (v: string | null) => (v ? v.split("-").reverse().join("/") : "");
  return ["creancier;debiteur;creance;arrete_creancier;dette;arrete_debiteur;ecart;etat;categorie;motif", ...[...l].sort((a, b) => a.creancier.localeCompare(b.creancier) || a.debiteur.localeCompare(b.debiteur)).map((r) => [cell(r.creancier), cell(r.debiteur), m(r.creance), d(r.arrete_creancier), m(r.dette), d(r.arrete_debiteur), m(r.ecart), r.etat, r.categorie ?? "", cell(r.motif ?? "")].join(";"))].join("\n");
}
