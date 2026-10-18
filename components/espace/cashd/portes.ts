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
import type { Fiche, Gabarits, PalierValidation, Proposition, Relance, RelanceCommande, StatutCompte, Suivi, Tableau } from "./types";

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

/* ——— c2_04 : les textes, les réglages des relances, trois gestes de la fiche ——— */

export async function chargerGabarits(client: string): Promise<Gabarits> {
  const g = await rpc<Gabarits | null>("cashd_gabarits", { p_client: client });
  if (!g || !Array.isArray(g.gabarits)) throw new ErreurPorte("Les textes n'ont pas pu être lus.");
  return g;
}

export async function ecrireGabarit(o: { client: string; cle: string; langue: string; variante: number; sujet: string; corps: string; actif: boolean }) {
  return rpc<{ id: string }>("cashd_ecrire_gabarit", {
    p_client: o.client, p_cle: o.cle, p_langue: o.langue, p_variante: o.variante, p_sujet: o.sujet, p_corps: o.corps, p_actif: o.actif,
  });
}

export async function reglerRelances(client: string, champs: Record<string, unknown>) {
  return rpc<Record<string, unknown>>("cashd_regler_relances", { p_client: client, p_champs: champs });
}

export async function attendreCommande(facture: string, email: string | null, nom: string | null, motif: string | null) {
  return rpc<{ attente_commande_le: string | null; relances_coupees: number }>("cashd_attendre_commande", { p_facture: facture, p_email: email, p_nom: nom, p_motif: motif });
}

export async function deciderSolde(facture: string, decision: "abandonne" | "reclame" | null, motif: string) {
  return rpc<{ decision: string | null; relances_coupees: number }>("cashd_decider_solde", { p_facture: facture, p_decision: decision, p_motif: motif });
}

export async function consignerAccord(devis: string, note: string, le: string | null) {
  return rpc<{ statut: string; accord_oral_le: string; relances_coupees: number }>("cashd_consigner_accord", { p_devis: devis, p_note: note, p_le: le });
}

export async function chargerRelancesCommande(client: string): Promise<RelanceCommande[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cashd_relances_commande")
    .select("id, facture_id, compte_id, jour, destinataire_adresse, destinataire_nom, sujet, corps, statut, motif")
    .eq("client_id", client)
    .order("jour", { ascending: false })
    .limit(20);
  if (error) throw new ErreurPorte(message(error));
  return (data ?? []) as RelanceCommande[];
}

/* ——— c2_05 : trancher une réponse lue, joindre une pièce ——— */

export async function trancherReponse(reponse: string, accepter: boolean, motif: string | null) {
  return rpc<{ statut: string; proposition: string; effets: number }>("cashd_trancher_reponse", { p_reponse: reponse, p_accepter: accepter, p_motif: motif });
}

/* Le fichier part dans le stockage de l'organisation (omega-clients/<client>/cashd/<facture>/…), puis la porte le rattache. */
export async function joindrePiece(client: string, facture: string, nature: string, fichier: File) {
  const supabase = createClient();
  const nom = fichier.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-120);
  const chemin = `${client}/cashd/${facture}/${Date.now()}-${nom}`;
  const { error } = await supabase.storage.from("omega-clients").upload(chemin, fichier, { upsert: false, contentType: fichier.type || undefined });
  if (error) throw new ErreurPorte(message(error));
  return rpc<{ id: string }>("cashd_joindre_piece", { p_facture: facture, p_nature: nature, p_chemin: chemin, p_nom: fichier.name, p_actif: true });
}

/* ——— c2_06 : qui valide selon le montant (gérant seulement) ——— */
export async function reglerValidation(client: string, paliers: PalierValidation[]) {
  return rpc<{ paliers: PalierValidation[] | null; regles: string[] }>("cashd_regler_validation", { p_client: client, p_paliers: paliers });
}

/* ——— c2_08 : le portefeuille par chargé (gérant seulement) ——— */
export async function reglerPortefeuille(client: string, actif: boolean) {
  return rpc<{ portefeuille_par_charge: boolean; comptes_sans_charge: number }>("cashd_regler_portefeuille", { p_client: client, p_actif: actif });
}

/* ——— c2_09 : la ligne d'une facture ou d'un devis dans la langue du compte ——— */
export async function ecrireLigne(client: string, langue: string, nature: "facture" | "devis", modele: string | null, actif: boolean) {
  return rpc<{ id: string }>("cashd_ecrire_ligne", { p_client: client, p_langue: langue, p_nature: nature, p_modele: modele, p_actif: actif });
}

/* ——— c2_11 : la relance validée, envoyée à la main ——— */
export async function noterEnvoiMain(relance: string, canal: string, note: string | null) {
  return rpc<{ id: string; canal: string; envoye_le: string }>("cashd_noter_envoi_main", { p_relance: relance, p_canal: canal, p_le: null, p_note: note });
}
