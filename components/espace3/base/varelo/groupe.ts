/* ══════════════════════════════════════════════════════════════════════
   Le groupe sur une page — VARELO (06/10/2026, B1)

   Formes décalquées de omega/modules/varelo/migrations/b1_08_groupe_page.sql :
   vue grp_groupe_page ; portes grp_deposer_balance et grp_regler_objectif.
   L'exemple calcule comme la vue : ventes = − Σ 70, résultat = − Σ (6, 7),
   trésorerie = Σ (51, 53) ; objectif au prorata des jours de l'exercice.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { AGENCE, AUTO_GP, BRICO_MQ, EXEMPLE_CLIENT_ID, IMPORT, LAMENTIN, SIEGE } from "../exemples/socle";
import { ErreurPorte } from "./portes";
import { AUTO_MQ, BRICO_GP, CAYENNE, DESTRELAND, FROID, GESTION, IMMOBILIER, LOCATION, MAISON, PIECES, PROXI, SOCIETES_EXEMPLE, TRANSIT } from "./exemples";

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

export const GABARIT_BALANCE_GENERALE = "compte;libelle;debit;credit\n707000;Ventes de marchandises;;9 640 000,00\n512000;Banque;830 000,00;";

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

/* ——— l'exemple : les dix-huit sociétés du Groupe Soléa, balances de fin de semaine dernière ——— */
const debutExercice = () => `${new Date().getFullYear() - (new Date().getMonth() === 0 && new Date().getDate() < 10 ? 1 : 0)}-01-01`;
export type BaseExemple = Parameters<typeof ligneDePage>[0];
/* une balance résumée : ventes (70), achats (60), personnel (64), autres charges (61), banque (512) */
const B = (entite_id: string, source: string, ventes: number, achats: number, personnel: number, autres: number, banque: number, n1: number | null, objectif: number | null, plancher: number | null, age = 6): BaseExemple => ({
  entite_id,
  arrete_le: ilYaJours(age),
  exercice_debut: debutExercice(),
  source,
  objectif,
  plancher,
  lignes: [
    { compte: "707000", solde: -ventes },
    ...(achats ? [{ compte: "607000", solde: achats }] : []),
    { compte: "641000", solde: personnel },
    { compte: "615000", solde: autres },
    { compte: "512000", solde: banque },
  ],
  n1: n1 === null ? null : [{ compte: "707000", solde: -n1 }],
});
export const BASES_EXEMPLE = (): BaseExemple[] => [
  B(SIEGE, "Sage 100 — balance générale", 9840000, 0, 4120000, 3980000, 14260000, 9410000, 11800000, 3000000),
  B(AGENCE, "Cegid — balance générale", 96420000, 72180000, 11940000, 6850000, 8310000, 93760000, 117000000, 4000000),
  B(LAMENTIN, "Cegid — balance générale", 88730000, 66900000, 11210000, 6420000, 6940000, 86950000, 108000000, 3500000),
  B(DESTRELAND, "Cegid — balance générale", 71160000, 53410000, 9020000, 5330000, 5480000, 69200000, 87000000, 3000000),
  B(CAYENNE, "Cegid — balance générale", 38640000, 29280000, 4960000, 2890000, 2410000, 36870000, 46500000, 1500000),
  B(PROXI, "Cegid — balance générale", 34120000, 25460000, 5140000, 2470000, 1870000, 33050000, 41000000, 1000000),
  /* Soléa Auto Guadeloupe recule : −11 % sur un an, sous l'objectif à date */
  B(AUTO_GP, "Logiciel de concession — balance", 41280000, 34650000, 4180000, 2110000, 2860000, 46390000, 58000000, 1500000),
  B(AUTO_MQ, "Logiciel de concession — balance", 36790000, 30520000, 3640000, 1820000, 2240000, 37410000, 45000000, 1200000),
  B(LOCATION, "Quadra — balance", 9380000, 2040000, 1930000, 3960000, 1110000, 8720000, null, null),
  B(PIECES, "Sage 100 — balance générale", 17920000, 12870000, 2210000, 1330000, 1380000, 17150000, 21500000, 600000),
  B(BRICO_MQ, "EBP — balance", 23910000, 16240000, 3870000, 2310000, 1940000, 24480000, 30000000, 800000),
  B(BRICO_GP, "EBP — balance", 26340000, 18020000, 4160000, 2490000, 2070000, 25610000, 32000000, 900000),
  /* Maison Soléa : encore au-dessus de son plancher de 250 000 €, plus pour longtemps (prévision : le 12 novembre) */
  B(MAISON, "EBP — balance", 14680000, 9870000, 2640000, 2360000, 271400, 15920000, 19000000, 250000),
  B(IMPORT, "Sage 100 — balance générale", 62840000, 51920000, 3460000, 3980000, 5120000, 60310000, 76000000, 2500000),
  B(FROID, "Sage 100 — balance générale", 6240000, 0, 1620000, 3650000, 980000, 5930000, 7600000, 300000),
  /* Soléa Transit tient sa comptabilité au tableur : sa dernière balance a plus d'un mois */
  B(TRANSIT, "Tableur de Soléa Transit", 4870000, 0, 980000, 3120000, 640000, 4410000, null, null, 37),
  B(IMMOBILIER, "Sage 100 — balance générale", 12610000, 0, 610000, 10100000, 3760000, 12180000, 15200000, 1500000),
  B(GESTION, "Sage 100 — balance générale", 5290000, 0, 3960000, 1060000, 820000, 5040000, 6400000, 250000),
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
