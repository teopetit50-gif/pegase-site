/* ══════════════════════════════════════════════════════════════════════
   Les portes OFFLOAD — côté navigateur, sous RLS (06/10/2026, session C4)

   Lecture : public.offload_tableau() (la liste, les compteurs, les
   messages à valider, les tâches) et public.offload_fiche(p_compte) (la
   fiche ouverte), toutes deux SECURITY INVOKER (c4_04). Écriture :
   UNIQUEMENT par les portes publiques, jamais d'écriture directe en table
   (les tables OFFLOAD n'en acceptent aucune) :
     offload_saisir_compte, offload_saisir_achat, offload_annuler_achat (c4_01) ;
     offload_recalculer (c4_02) ;
     offload_ouvrir_reprise, offload_noter_tache (c4_03) ;
     offload_changer_statut, offload_noter_contact, offload_trancher_rapprochement,
     offload_exclure, offload_lever_exclusion (c4_05) ;
     offload_noter_intervention (c4_07) ; lectures offload_echeances_tableau, offload_parc_compte.
   La décision sur un message (valider, refuser) se prend dans « À valider »,
   l'écran commun des demandes de validation du socle.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { EcheanceLigne, Fiche, ParcCompte, Tableau } from "./types";

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

export async function chargerTableau(): Promise<Tableau | null> {
  const t = await rpc<Tableau | null>("offload_tableau", {});
  return t && typeof t === "object" ? t : null;
}

export async function chargerFiche(compte: string): Promise<Fiche | null> {
  const f = await rpc<Fiche | null>("offload_fiche", { p_compte: compte });
  return f && typeof f === "object" ? f : null;
}

export function ouvrirReprise(compte: string) {
  return rpc<string>("offload_ouvrir_reprise", { p_compte: compte });
}

export function noterTache(tache: string, statut: "faite" | "abandonnee", compteRendu: string | null) {
  return rpc<null>("offload_noter_tache", { p_tache: tache, p_statut: statut, p_compte_rendu: compteRendu });
}

export function recalculer(client: string) {
  return rpc<unknown>("offload_recalculer", { p_client: client });
}

export function saisirAchat(compte: string, date: string, montantHt: number, reference: string | null, libelle: string | null, nature: string) {
  return rpc<string>("offload_saisir_achat", {
    p_compte: compte, p_date: date, p_montant: montantHt, p_reference: reference, p_libelle: libelle, p_nature: nature,
  });
}

export function annulerAchat(achat: string, motif: string) {
  return rpc<null>("offload_annuler_achat", { p_achat: achat, p_motif: motif });
}

export function saisirCompte(client: string, ref: string | null, nom: string, champs: Record<string, string>) {
  return rpc<string>("offload_saisir_compte", { p_client: client, p_entite: null, p_ref: ref, p_nom: nom, p_champs: champs });
}

export function changerStatut(compte: string, statut: "suivi" | "exclu", motif: string) {
  return rpc<null>("offload_changer_statut", { p_compte: compte, p_statut: statut, p_motif: motif });
}

export function noterContact(compte: string, le: string, canal: string, par: string | null, note: string | null) {
  return rpc<string>("offload_noter_contact", { p_compte: compte, p_le: le, p_canal: canal, p_par: par, p_note: note });
}

export function trancherRapprochement(rapprochement: string, accepter: boolean) {
  return rpc<null>("offload_trancher_rapprochement", { p_rapprochement: rapprochement, p_accepter: accepter });
}

/* c4_07 — échéances et parc */
export async function chargerEcheances(): Promise<EcheanceLigne[]> {
  const l = await rpc<EcheanceLigne[] | null>("offload_echeances_tableau", {});
  return Array.isArray(l) ? l : [];
}

export async function chargerParcCompte(compte: string): Promise<ParcCompte> {
  const p = await rpc<ParcCompte | null>("offload_parc_compte", { p_compte: compte });
  return p && typeof p === "object" ? p : { equipements: [], contrats: [] };
}

export function noterIntervention(equipement: string, le: string, nature: string, ailleurs: boolean, reference: string | null) {
  return rpc<string>("offload_noter_intervention", { p_equipement: equipement, p_le: le, p_nature: nature, p_ailleurs: ailleurs, p_reference: reference });
}
