/* ══════════════════════════════════════════════════════════════════════
   Les portes CASHD — côté navigateur, sous RLS (06/10/2026, session C2)

   Lecture : public.cashd_tableau(p_client) (encours, balance âgée, à
   rapprocher, devis), public.cashd_relances_du_jour(p_client) (les relances
   des trente derniers jours et leur état vu de la file), et pour un compte
   public.cashd_fiche_compte(p_compte) + la vue cashd_suivi. Toutes sous les
   droits de qui lit.
   Écriture : UNIQUEMENT par les portes (c2_01, c2_02) — cashd_importer,
   cashd_noter_reglement, cashd_lettrer, cashd_statut_compte, cashd_litige,
   cashd_preparer_maintenant. Aucune table de CASHD ne s'écrit en direct.
   Si la base répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Fiche, Proposition, Relance, StatutCompte, Suivi, Tableau } from "./types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

async function rpc<T = unknown>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export type MonClient = { user_id: string; client_id: string; role: string };

export async function monClient(): Promise<MonClient | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string; role: string } | undefined;
  return c ? { user_id: auth.user.id, client_id: c.client_id, role: c.role } : null;
}

export async function chargerTableau(client: string): Promise<Tableau> {
  const t = await rpc<Tableau | null>("cashd_tableau", { p_client: client });
  if (!t || typeof t !== "object") throw new ErreurPorte("Le tableau des impayés n'a pas pu être lu.");
  return t;
}

export async function chargerRelances(client: string): Promise<Relance[]> {
  const r = await rpc<Relance[] | null>("cashd_relances_du_jour", { p_client: client, p_jour: null });
  return Array.isArray(r) ? r : [];
}

export async function chargerFiche(compte: string): Promise<Fiche | null> {
  const supabase = createClient();
  const [f, s] = await Promise.all([
    rpc<Omit<Fiche, "suivi"> | null>("cashd_fiche_compte", { p_compte: compte }),
    supabase.from("cashd_suivi").select("facture_id, palier_atteint, palier_atteint_le, derniere_relance_statut, palier_suivant, palier_suivant_le, etat_sequence").eq("compte_id", compte),
  ]);
  if (!f) return null;
  if (s.error) throw new ErreurPorte(message(s.error));
  return { ...f, suivi: (s.data ?? []) as Suivi[] };
}

export async function chargerPropositions(reglement: string): Promise<Proposition[]> {
  const p = await rpc<Proposition[] | null>("cashd_propositions", { p_reglement: reglement });
  return Array.isArray(p) ? p : [];
}

export async function importer(o: { client: string; jeu: string; lignes: Record<string, string>[]; complet: boolean; fichier: string }) {
  return rpc<{ lignes: number; creees: number; modifiees: number; inchangees: number; soldees_par_absence: number; lettrees: number; ecartees: { ligne: number; motif: string }[] }>(
    "cashd_importer",
    { p_client: o.client, p_jeu: o.jeu, p_lignes: o.lignes, p_complet: o.complet, p_entite: null, p_fichier: o.fichier },
  );
}

export async function noterReglement(o: { client: string; compte: string | null; montant: number; date: string; reference: string | null; mode: string | null; facture: string | null }) {
  return rpc<{ reglement: string; imputations?: number; a_imputer: number; deja_note: boolean }>("cashd_noter_reglement", {
    p_client: o.client,
    p_compte: o.compte,
    p_montant: o.montant,
    p_date: o.date,
    p_reference: o.reference,
    p_mode: o.mode,
    p_facture: o.facture,
    p_entite: null,
  });
}

export async function lettrer(reglement: string, facture: string) {
  return rpc<{ imputation: string; a_imputer: number; reste_du: number }>("cashd_lettrer", { p_reglement: reglement, p_facture: facture, p_montant: null });
}

export async function changerStatut(compte: string, statut: StatutCompte, motif: string) {
  return rpc<{ statut: string; relances_coupees: number }>("cashd_statut_compte", { p_compte: compte, p_statut: statut, p_motif: motif });
}

export async function litige(facture: string, ouvrir: boolean, motif: string) {
  return rpc<{ statut: string; relances_coupees: number }>("cashd_litige", { p_facture: facture, p_ouvrir: ouvrir, p_motif: motif });
}

export async function preparerMaintenant(client: string) {
  return rpc<{ preparees: number; bloquees: number; coupees: number; mode_envoi: string | null }>("cashd_preparer_maintenant", { p_client: client });
}

/* ——— palier 4 (c2_03) ——— */

export async function poserEcheancier(facture: string, echeances: { echeance: string; montant: number }[], motif: string) {
  return rpc<{ echeances: number; echeance_suivie: string }>("cashd_poser_echeancier", { p_facture: facture, p_echeances: echeances, p_motif: motif });
}

export async function litigePartiel(facture: string, montant: number, motif: string) {
  return rpc<{ montant_conteste: number; reste_relancable: number; relances_coupees: number }>("cashd_litige_partiel", { p_facture: facture, p_montant: montant, p_motif: motif });
}

export async function dossier(compte: string, motif: "litige" | "assurance_credit" | "recouvrement") {
  return rpc<Record<string, unknown> | null>("cashd_dossier", { p_compte: compte, p_facture: null, p_motif: motif });
}

export async function proposerPlafond(compte: string) {
  return rpc<{ propose: number | null; facture_mensuel_moyen: number; delai_retenu_jours: number; factures_douze_mois: number; plafond_actuel: number | null } | null>("cashd_proposer_plafond", { p_compte: compte });
}

export async function fixerPlafond(compte: string, plafond: number | null, motif: string) {
  return rpc<{ plafond: number | null }>("cashd_fixer_plafond", { p_compte: compte, p_plafond: plafond, p_motif: motif });
}

export type Prevision = { a_30_jours: number; a_60_jours: number; au_dela: number; tenu_a_part: number };

export async function prevision(client: string): Promise<Prevision | null> {
  const p = await rpc<Prevision | null>("cashd_prevision", { p_client: client });
  return p && typeof p === "object" ? p : null;
}

export type Reponse = { palier: string; envoyees: number; suivies: number; taux_pct: number | null };
export type Arrete = { jour: string; balance: import("./types").Balance[]; totaux: { encours: number; echu: number; en_litige: number } };

export async function chargerPilotage(client: string): Promise<{ reponses: Reponse[]; arretes: Arrete[] }> {
  const supabase = createClient();
  const [r, a] = await Promise.all([
    supabase.from("cashd_reponses").select("palier, envoyees, suivies, taux_pct").eq("client_id", client),
    supabase.from("cashd_arretes").select("jour, balance, totaux").eq("client_id", client).order("jour", { ascending: false }).limit(6),
  ]);
  if (r.error) throw new ErreurPorte(message(r.error));
  if (a.error) throw new ErreurPorte(message(a.error));
  return { reponses: (r.data ?? []) as Reponse[], arretes: (a.data ?? []) as Arrete[] };
}
