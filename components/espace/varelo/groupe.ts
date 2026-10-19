/* ══════════════════════════════════════════════════════════════════════
   Le groupe sur une page — VARELO (06/10/2026, B1)

   Formes décalquées de omega/modules/varelo/migrations/b1_08_groupe_page.sql :
   vue grp_groupe_page ; portes grp_deposer_balance et grp_regler_objectif.
   L'exemple calcule comme la vue : ventes = − Σ 70, résultat = − Σ (6, 7),
   trésorerie = Σ (51, 53) ; objectif au prorata des jours de l'exercice.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { AGENCE, EXEMPLE_CLIENT_ID, SIEGE } from "../exemples/socle";
import { ErreurPorte } from "./portes";
import { ANNECY, SOCIETES_EXEMPLE } from "./exemples";

/* une ligne de grp_groupe_page */
export type PageSociete = {
  client_id: string;
  entite_id: string;
  societe: string;
  pole_id: string | null;
  pole: string | null;
  depot_id: string;
  arrete_le: string;
  exercice_debut: string;
  age_jours: number;
  lignes: number;
  desequilibre: number;
  source: string | null;
  ventes: number;
  resultat: number;
  tresorerie: number;
  ventes_n1: number | null;
  arrete_n1: string | null;
  ecart_n1: number | null;
  ecart_n1_pct: number | null;
  ventes_objectif: number | null;
  objectif_a_date: number | null;
  ecart_objectif: number | null;
  tresorerie_plancher: number | null;
  sous_plancher: boolean;
};

export type LigneBalance = { compte: string; solde: number };

/* grp_deposer_balance → jsonb */
export type ResultatBalance = {
  depot: string;
  arrete_le: string;
  exercice_debut: string;
  lus: number;
  retenus: number;
  rejetes: { ligne: number; compte: string | null; motif: string }[];
  desequilibre: number;
  ventes: number;
  tresorerie: number;
  resultat: number;
};

export const SYNONYMES_BALANCE_GENERALE: Record<string, string[]> = {
  compte: ["compte", "n° compte", "numero de compte", "numéro de compte", "no compte", "compte general", "compte général", "cg_num", "comptenum", "num compte"],
  libelle: ["libelle", "libellé", "intitule", "intitulé", "intitule du compte", "intitulé du compte", "cg_intitule", "comptelib", "nom du compte"],
  debit: ["debit", "débit", "solde debit", "solde débit", "solde debiteur", "solde débiteur", "total debit", "total débit", "cumul debit", "cumul débit"],
  credit: ["credit", "crédit", "solde credit", "solde crédit", "solde crediteur", "solde créditeur", "total credit", "total crédit", "cumul credit", "cumul crédit"],
  solde: ["solde", "solde net", "solde final", "solde de cloture", "solde de clôture"],
};

export const GABARIT_BALANCE_GENERALE = "compte;libelle;debit;credit\n706000;Prestations de services;;80 000,00\n512000;Banque;15 000,00;";

/* ——— les calculs, comme la vue ——— */
export function agregats(lignes: LigneBalance[]) {
  let ventes = 0;
  let resultat = 0;
  let tresorerie = 0;
  for (const l of lignes) {
    if (l.compte.startsWith("70")) ventes -= l.solde;
    if (l.compte.startsWith("6") || l.compte.startsWith("7")) resultat -= l.solde;
    if (l.compte.startsWith("51") || l.compte.startsWith("53")) tresorerie += l.solde;
  }
  return { ventes, resultat, tresorerie };
}

const jourLocal = (s: string) => {
  const [a, m, j] = s.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, j);
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jours = (a: string, b: string) => Math.round((jourLocal(a).getTime() - jourLocal(b).getTime()) / 86400000);
const plusAn = (s: string, n: number) => {
  const d = jourLocal(s);
  d.setFullYear(d.getFullYear() + n);
  return iso(d);
};
export const ilYaJours = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};

export function ligneDePage(base: { entite_id: string; arrete_le: string; exercice_debut: string; lignes: LigneBalance[]; source: string | null; n1: LigneBalance[] | null; objectif: number | null; plancher: number | null }): PageSociete {
  const s = SOCIETES_EXEMPLE.find((x) => x.entite_id === base.entite_id);
  const a = agregats(base.lignes);
  const n1 = base.n1 ? agregats(base.n1).ventes : null;
  const duree = Math.max(jours(plusAn(base.exercice_debut, 1), base.exercice_debut), 1);
  const aDate = base.objectif === null ? null : Math.round((base.objectif * (jours(base.arrete_le, base.exercice_debut) + 1)) / duree * 100) / 100;
  return {
    client_id: EXEMPLE_CLIENT_ID,
    entite_id: base.entite_id,
    societe: s?.nom ?? "Société",
    pole_id: s?.pole_id ?? null,
    pole: s?.pole ?? null,
    depot_id: `${base.entite_id}-${base.arrete_le}`,
    arrete_le: base.arrete_le,
    exercice_debut: base.exercice_debut,
    age_jours: jours(iso(new Date()), base.arrete_le),
    lignes: base.lignes.length,
    desequilibre: Math.round(base.lignes.reduce((t, l) => t + l.solde, 0) * 100) / 100,
    source: base.source,
    ventes: a.ventes,
    resultat: a.resultat,
    tresorerie: a.tresorerie,
    ventes_n1: n1,
    arrete_n1: n1 === null ? null : plusAn(base.arrete_le, -1),
    ecart_n1: n1 === null ? null : a.ventes - n1,
    ecart_n1_pct: n1 === null || n1 === 0 ? null : Math.round(((a.ventes - n1) / Math.abs(n1)) * 1000) / 10,
    ventes_objectif: base.objectif,
    objectif_a_date: aDate,
    ecart_objectif: aDate === null ? null : a.ventes - aDate,
    tresorerie_plancher: base.plancher,
    sous_plancher: base.plancher !== null && a.tresorerie < base.plancher,
  };
}

/* ——— l'exemple : l'atelier Bertin à la fin du mois dernier ——— */
const debutExercice = () => `${new Date().getFullYear() - (new Date().getMonth() === 0 && new Date().getDate() < 10 ? 1 : 0)}-01-01`;
export type BaseExemple = Parameters<typeof ligneDePage>[0];
export const BASES_EXEMPLE = (): BaseExemple[] => [
  { entite_id: SIEGE, arrete_le: ilYaJours(6), exercice_debut: debutExercice(), source: "Sage 100 — balance générale", objectif: 1450000, plancher: 60000,
    lignes: [{ compte: "706000", solde: -812000 }, { compte: "701000", solde: -244000 }, { compte: "607000", solde: 498000 }, { compte: "641000", solde: 391000 }, { compte: "512000", solde: 148300 }, { compte: "530000", solde: 1200 }],
    n1: [{ compte: "706000", solde: -775000 }, { compte: "701000", solde: -210000 }] },
  { entite_id: AGENCE, arrete_le: ilYaJours(6), exercice_debut: debutExercice(), source: "EBP — balance", objectif: 520000, plancher: 25000,
    lignes: [{ compte: "706000", solde: -298500 }, { compte: "604000", solde: 121000 }, { compte: "641000", solde: 142000 }, { compte: "512000", solde: 31400 }, { compte: "519000", solde: -12900 }],
    n1: null },
  { entite_id: ANNECY, arrete_le: ilYaJours(37), exercice_debut: debutExercice(), source: "Tableur de la menuiserie", objectif: null, plancher: null,
    lignes: [{ compte: "701000", solde: -366000 }, { compte: "601000", solde: 205000 }, { compte: "641000", solde: 118000 }, { compte: "512000", solde: 52700 }],
    n1: [{ compte: "701000", solde: -402000 }] },
];

/* ——— base réelle ——— */
function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}
const NOMBRES: (keyof PageSociete)[] = ["age_jours", "lignes", "desequilibre", "ventes", "resultat", "tresorerie", "ventes_n1", "ecart_n1", "ecart_n1_pct", "ventes_objectif", "objectif_a_date", "ecart_objectif", "tresorerie_plancher"];

export async function chargerPage(client_id: string): Promise<PageSociete[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("grp_groupe_page").select("*").eq("client_id", client_id).order("societe");
  if (error) throw new ErreurPorte(message(error));
  return ((data ?? []) as PageSociete[]).map((r) => {
    const o: Record<string, unknown> = { ...r };
    for (const k of NOMBRES) if (o[k] !== null && o[k] !== undefined) o[k] = Number(o[k]);
    return o as PageSociete;
  });
}

async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export const deposerBalance = (client_id: string, entite_id: string, arrete_le: string, exercice_debut: string | null, lignes: Record<string, string>[], source: string | null) =>
  rpc<ResultatBalance>("grp_deposer_balance", { p_client: client_id, p_entite: entite_id, p_arrete: arrete_le, p_exercice_debut: exercice_debut, p_lignes: lignes, p_source: source });

export const reglerObjectif = (client_id: string, entite_id: string, exercice_debut: string, ventes_objectif: number | null, tresorerie_plancher: number | null, motif: string | null) =>
  rpc<unknown>("grp_regler_objectif", { p_client: client_id, p_entite: entite_id, p_exercice_debut: exercice_debut, p_ventes_objectif: ventes_objectif, p_tresorerie_plancher: tresorerie_plancher, p_motif: motif });
