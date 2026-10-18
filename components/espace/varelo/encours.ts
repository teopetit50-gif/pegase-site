/* ══════════════════════════════════════════════════════════════════════
   L'encours du groupe par tiers — VARELO, vague 3 (06/10/2026, B1)

   Formes décalquées de omega/modules/varelo/migrations/b1_04_encours_groupe.sql :
   vues grp_encours_courant, grp_encours_par_code, grp_encours_groupe ;
   table grp_encours_plafonds ; portes grp_deposer_encours et
   grp_regler_plafond. Le jeu d'exemple a la même forme, et le calcul de
   l'exemple (calculerGroupe) refait celui de la vue grp_encours_groupe.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { EXEMPLE_CLIENT_ID, SIEGE, AGENCE, ilYa } from "../exemples/socle";
import { ErreurPorte } from "./portes";
import { ANNECY, SOCIETES_EXEMPLE } from "./exemples";
import type { CodeRef, Objet } from "./types";

export type NatureEncours = "client" | "fournisseur";

/* grp_encours_courant */
export type DepotCourant = {
  depot_id: string;
  client_id: string;
  entite_id: string;
  societe: string;
  nature: NatureEncours;
  arrete_le: string;
  age_jours: number;
  lignes: number;
  total: number;
  echu: number;
  devise: string;
  source: string | null;
  depose_le: string;
};

/* grp_encours_par_code */
export type LigneEncours = {
  ligne_id: string;
  client_id: string;
  nature: NatureEncours;
  entite_id: string;
  societe: string;
  arrete_le: string;
  age_jours: number;
  code_local: string;
  code_id: string | null;
  nom_local: string | null;
  etat: CodeRef["etat"] | null;
  objet_id: string | null;
  code_groupe: string | null;
  nom_groupe: string | null;
  intragroupe: boolean;
  non_echu: number;
  echu_30: number;
  echu_60: number;
  echu_90: number;
  echu_plus: number;
  echu_autre: number;
  total: number;
  echu: number;
};

/* grp_encours_groupe */
export type EncoursGroupe = {
  client_id: string;
  nature: NatureEncours;
  objet_id: string;
  code_groupe: string;
  nom_groupe: string;
  intragroupe: boolean;
  societes: number;
  codes: number;
  total: number;
  non_echu: number;
  echu: number;
  echu_plus_90: number;
  plus_ancien_arrete: string;
  provisoire: boolean;
  plafond: number | null;
  plafond_echu: number | null;
  depasse: boolean;
};

/* grp_encours_plafonds */
export type Plafond = {
  client_id: string;
  objet_id: string;
  nature: "client";
  plafond: number;
  plafond_echu: number | null;
  actif: boolean;
  motif: string | null;
  regle_par: string | null;
  regle_le: string;
};

/* grp_deposer_encours → jsonb */
export type ResultatEncours = {
  depot: string;
  arrete_le: string;
  lus: number;
  retenus: number;
  total: number;
  echu: number;
  rejetes: { ligne: number; code: string | null; motif: string }[];
  codes_inscrits: number;
  codes_inconnus_sans_nom: number;
  controle?: { depassements: number; alertes_levees: number; alertes_closes: number };
};

/* au-delà, la balance d'une société est dite ancienne */
export const JOURS_FRAICHEUR = 7;

/* ——— la lecture d'une balance âgée : en-têtes reconnus ——— */
export const SYNONYMES_BALANCE: Record<string, string[]> = {
  code: ["code", "code_local", "code tiers", "code_tiers", "codetiers", "compte", "compte tiers", "compte auxiliaire", "ct_num", "code client", "code fournisseur", "numero", "numéro", "n°"],
  nom: ["nom", "libelle", "libellé", "raison sociale", "raison_sociale", "intitule", "intitulé", "ct_intitule", "denomination", "dénomination", "tiers"],
  siren: ["siren", "n° siren"],
  siret: ["siret", "n° siret"],
  tva: ["tva", "n° tva", "tva intracom", "tva intracommunautaire"],
  non_echu: ["non echu", "non échu", "non_echu", "a echoir", "à échoir", "a_echoir", "non echues", "non échues"],
  echu_30: ["echu_30", "1-30", "1 a 30", "1 à 30", "0-30", "0 a 30", "0 à 30", "< 30 j", "moins de 30 jours", "30 jours"],
  echu_60: ["echu_60", "31-60", "31 a 60", "31 à 60", "60 jours"],
  echu_90: ["echu_90", "61-90", "61 a 90", "61 à 90", "90 jours"],
  echu_plus: ["echu_plus", "> 90", ">90", "+90", "plus de 90", "plus de 90 jours", "> 90 j", "91 et plus", "au-dela de 90", "au-delà de 90"],
  echu: ["echu", "échu", "total echu", "total échu", "echues", "échues", "retard", "en retard"],
  total: ["total", "solde", "encours", "en-cours", "solde du", "solde dû", "montant", "montant du", "montant dû", "reste du", "reste dû"],
};

export const GABARIT_BALANCE = "code;nom;siren;non_echu;1-30;31-60;61-90;> 90\nC0211;HOTEL DES ALPES;849300181;30 000,00;10 000,00;;;8 000,00";

/* ——— l'exemple : les balances âgées clients et fournisseurs de l'atelier Bertin ——— */
const U = (fin: string) => `00000000-0000-4000-8000-0000000${fin}`;
const jour = (n: number) => ilYa(n).slice(0, 10);
const nomSoc = (id: string) => SOCIETES_EXEMPLE.find((s) => s.entite_id === id)?.nom ?? "Société";

export type BrutEncours = { id: string; nature: NatureEncours; entite: string; code: string; non_echu: number; e30?: number; e60?: number; e90?: number; eplus?: number; eautre?: number };

/* le dépôt courant de chaque société : arrêté, à quelle date */
export type ArreteExemple = { entite: string; nature: NatureEncours; age: number; source: string };
export const ARRETES_EXEMPLE: ArreteExemple[] = [
  { entite: SIEGE, nature: "client", age: 1, source: "Sage 100 — balance âgée clients" },
  { entite: AGENCE, nature: "client", age: 2, source: "EBP — échéancier clients" },
  { entite: ANNECY, nature: "client", age: 12, source: "Tableur de la menuiserie" },
  { entite: SIEGE, nature: "fournisseur", age: 1, source: "Sage 100 — balance âgée fournisseurs" },
  { entite: AGENCE, nature: "fournisseur", age: 2, source: "EBP — échéancier fournisseurs" },
];

export const LIGNES_BRUTES_EXEMPLE: BrutEncours[] = [
  /* Hôtel des Alpes : 48 000 au siège, 31 000 à Annecy → 79 000 pour le groupe, plafond 70 000 */
  { id: U("0l01"), nature: "client", entite: SIEGE, code: "C0211", non_echu: 30000, e30: 10000, eplus: 8000 },
  { id: U("0l02"), nature: "client", entite: ANNECY, code: "HDA", non_echu: 25000, e60: 6000 },
  { id: U("0l03"), nature: "client", entite: SIEGE, code: "C0304", non_echu: 12500 },
  { id: U("0l04"), nature: "client", entite: AGENCE, code: "GHS", non_echu: 7300, e30: 2500 },
  /* un code que le référentiel ne connaît pas encore */
  { id: U("0l05"), nature: "client", entite: AGENCE, code: "C-NOUV", non_echu: 640 },
  { id: U("0l06"), nature: "fournisseur", entite: SIEGE, code: "F0012", non_echu: 18400, e30: 3200 },
  { id: U("0l07"), nature: "fournisseur", entite: AGENCE, code: "SCJ", non_echu: 6100 },
  { id: U("0l08"), nature: "fournisseur", entite: SIEGE, code: "F0030", non_echu: 2250, e60: 900 },
  { id: U("0l09"), nature: "fournisseur", entite: SIEGE, code: "F0099", non_echu: 41000 },
];

export const PLAFONDS_EXEMPLE: Plafond[] = [
  { client_id: EXEMPLE_CLIENT_ID, objet_id: U("0c01"), nature: "client", plafond: 70000, plafond_echu: null, actif: true, motif: "Couverture de l'assurance-crédit", regle_par: null, regle_le: ilYa(30) },
  { client_id: EXEMPLE_CLIENT_ID, objet_id: U("0c03"), nature: "client", plafond: 25000, plafond_echu: 5000, actif: true, motif: null, regle_par: null, regle_le: ilYa(30) },
];

export type DonneesEncours = { courants: DepotCourant[]; lignes: LigneEncours[]; plafonds: Plafond[] };

/* l'exemple sous la forme des vues, à partir des codes et objets du référentiel montré */
export function exempleEncours(codes: CodeRef[], objets: Objet[], plafonds: Plafond[], brutes: BrutEncours[] = LIGNES_BRUTES_EXEMPLE, arretes = ARRETES_EXEMPLE): DonneesEncours {
  const courants: DepotCourant[] = arretes.map((a, i) => {
    const l = brutes.filter((x) => x.entite === a.entite && x.nature === a.nature);
    const tot = l.reduce((s, x) => s + x.non_echu + (x.e30 ?? 0) + (x.e60 ?? 0) + (x.e90 ?? 0) + (x.eplus ?? 0) + (x.eautre ?? 0), 0);
    const ech = l.reduce((s, x) => s + (x.e30 ?? 0) + (x.e60 ?? 0) + (x.e90 ?? 0) + (x.eplus ?? 0) + (x.eautre ?? 0), 0);
    return { depot_id: U(`0d${(i + 10).toString(16)}`), client_id: EXEMPLE_CLIENT_ID, entite_id: a.entite, societe: nomSoc(a.entite), nature: a.nature, arrete_le: jour(a.age), age_jours: a.age, lignes: l.length, total: tot, echu: ech, devise: "EUR", source: a.source, depose_le: ilYa(a.age) };
  });
  const lignes: LigneEncours[] = brutes.flatMap((x) => {
    const d = courants.find((c) => c.entite_id === x.entite && c.nature === x.nature);
    if (!d) return [];
    const c = codes.find((k) => k.entite_id === x.entite && k.nature === x.nature && k.code_local === x.code) ?? null;
    const o = c?.objet_id ? (objets.find((k) => k.id === c.objet_id) ?? null) : null;
    const e = { echu_30: x.e30 ?? 0, echu_60: x.e60 ?? 0, echu_90: x.e90 ?? 0, echu_plus: x.eplus ?? 0, echu_autre: x.eautre ?? 0 };
    const echu = e.echu_30 + e.echu_60 + e.echu_90 + e.echu_plus + e.echu_autre;
    return [{ ligne_id: x.id, client_id: EXEMPLE_CLIENT_ID, nature: x.nature, entite_id: x.entite, societe: d.societe, arrete_le: d.arrete_le, age_jours: d.age_jours, code_local: x.code, code_id: c?.code_id ?? null, nom_local: c?.nom_local ?? null, etat: c?.etat ?? null, objet_id: o?.id ?? null, code_groupe: o?.code_groupe ?? null, nom_groupe: o?.nom_groupe ?? null, intragroupe: o?.intragroupe ?? false, non_echu: x.non_echu, ...e, total: x.non_echu + echu, echu }];
  });
  return { courants, lignes, plafonds };
}

/* le calcul de la vue grp_encours_groupe, sur des lignes courantes */
export function calculerGroupe(lignes: LigneEncours[], plafonds: Plafond[]): EncoursGroupe[] {
  const m = new Map<string, EncoursGroupe & { _soc: Set<string> }>();
  for (const l of lignes) {
    if (!l.objet_id) continue;
    let g = m.get(l.objet_id);
    if (!g) {
      const p = plafonds.find((x) => x.objet_id === l.objet_id && x.actif) ?? null;
      g = { client_id: l.client_id, nature: l.nature, objet_id: l.objet_id, code_groupe: l.code_groupe ?? "", nom_groupe: l.nom_groupe ?? "", intragroupe: l.intragroupe, societes: 0, codes: 0, total: 0, non_echu: 0, echu: 0, echu_plus_90: 0, plus_ancien_arrete: l.arrete_le, provisoire: false, plafond: p?.plafond ?? null, plafond_echu: p?.plafond_echu ?? null, depasse: false, _soc: new Set() };
      m.set(l.objet_id, g);
    }
    g._soc.add(l.entite_id);
    g.codes++;
    g.total += l.total;
    g.non_echu += l.non_echu;
    g.echu += l.echu;
    g.echu_plus_90 += l.echu_plus;
    if (l.arrete_le < g.plus_ancien_arrete) g.plus_ancien_arrete = l.arrete_le;
    if (l.etat === "propose") g.provisoire = true;
  }
  return [...m.values()].map(({ _soc, ...g }) => {
    const depasse = (g.plafond !== null && g.total > g.plafond) || (g.plafond_echu !== null && g.echu > g.plafond_echu);
    return { ...g, societes: _soc.size, depasse };
  });
}

/* ——— base réelle ——— */
function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

const nombre = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));

export async function chargerEncours(client_id: string): Promise<{ donnees: DonneesEncours; groupe: EncoursGroupe[] }> {
  const supabase = createClient();
  const [c, l, g, p] = await Promise.all([
    supabase.from("grp_encours_courant").select("*").eq("client_id", client_id).order("societe"),
    supabase.from("grp_encours_par_code").select("*").eq("client_id", client_id).limit(10000),
    supabase.from("grp_encours_groupe").select("*").eq("client_id", client_id).order("total", { ascending: false }).limit(2000),
    supabase.from("grp_encours_plafonds").select("*").eq("client_id", client_id),
  ]);
  for (const r of [c, l, g, p]) if (r.error) throw new ErreurPorte(message(r.error));
  /* numeric arrive en chaîne ou en nombre selon la taille : on le relit en nombre */
  const montants = <T extends Record<string, unknown>>(x: T, cles: string[]): T => {
    const o: Record<string, unknown> = { ...x };
    for (const k of cles) if (o[k] !== null && o[k] !== undefined) o[k] = nombre(o[k]);
    return o as T;
  };
  return {
    donnees: {
      courants: ((c.data ?? []) as DepotCourant[]).map((x) => montants(x, ["total", "echu", "age_jours", "lignes"])),
      lignes: ((l.data ?? []) as LigneEncours[]).map((x) => montants(x, ["non_echu", "echu_30", "echu_60", "echu_90", "echu_plus", "echu_autre", "total", "echu", "age_jours"])),
      plafonds: ((p.data ?? []) as Plafond[]).map((x) => montants(x, ["plafond", "plafond_echu"])),
    },
    groupe: ((g.data ?? []) as EncoursGroupe[]).map((x) => montants(x, ["total", "non_echu", "echu", "echu_plus_90", "plafond", "plafond_echu", "societes", "codes"])),
  };
}

async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export const deposerEncours = (client_id: string, entite_id: string, nature: NatureEncours, arrete_le: string, lignes: Record<string, string>[], source: string | null) =>
  rpc<ResultatEncours>("grp_deposer_encours", { p_client: client_id, p_entite: entite_id, p_nature: nature, p_arrete: arrete_le, p_lignes: lignes, p_source: source });

export const reglerPlafond = (objet_id: string, plafond: number | null, plafond_echu: number | null, motif: string | null) =>
  rpc<{ depasse: boolean; total: number; plafond: number | null }>("grp_regler_plafond", { p_objet: objet_id, p_plafond: plafond, p_plafond_echu: plafond_echu, p_motif: motif });

/* « 1 234,56 », « 1.234,56 », « 12,50- », « (7) » → nombre ; vide → null ; illisible → NaN
   (même règle que private.grp_montant, pour l'aperçu et l'exemple) */
export function lireMontant(v: string | undefined): number | null {
  let s = (v ?? "").trim();
  if (!s) return null;
  s = s.replace(/[\s  €]|EUR/gi, "");
  let negatif = false;
  if (/^\(.*\)$/.test(s)) {
    negatif = true;
    s = s.slice(1, -1);
  } else if (/-$/.test(s)) {
    negatif = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith("-")) {
    negatif = !negatif;
    s = s.slice(1);
  } else if (s.startsWith("+")) s = s.slice(1);
  const v1 = s.lastIndexOf(",");
  const p1 = s.lastIndexOf(".");
  if (v1 >= 0 && p1 >= 0) s = v1 > p1 ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (v1 >= 0) s = s.replace(/,/g, ".");
  if (!/^[0-9]+(\.[0-9]+)?$/.test(s)) return Number.NaN;
  const n = Math.round(Number(s) * 100) / 100;
  return negatif ? -n : n;
}
