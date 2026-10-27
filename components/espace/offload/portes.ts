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
     offload_noter_intervention (c4_07) ; lectures offload_echeances_tableau, offload_parc_compte ;
     offload_saisir_affaire, offload_retirer_affaire, offload_decider_affaire (c4_08) ;
     lectures offload_affaires_liste, offload_affaires_compte ;
     lectures offload_pilotage, offload_arretes_liste (c4_09) ;
     offload_ecrire_regle, offload_retirer_regle, offload_suspendre, offload_reprendre,
     offload_lever_verification, offload_rattacher_groupe (c4_10) ; lectures offload_garde_fous, offload_groupes ;
     lecture offload_restitution (c4_17) ; offload_regler (envoi_auto, sujets_auto), offload_donner_accord_auto,
     offload_revoquer_accord_auto, lecture offload_envoi_auto (c4_18) ; offload_effacer_compte (c4_19) ;
     lectures offload_valeur_par_segment, offload_restitution_tableur (c4_36, gérant et administrateur) ;
     offload_sortie (c4_42, c4_45), offload_effacer_module (c4_45) ; offload_regler_secteur, lecture offload_vocabulaire (c4_43) ;
     offload_regler_prospects (c4_44).
   La décision sur un message (valider, refuser) se prend dans « À valider »,
   l'écran commun des demandes de validation du socle.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { AffaireCompte, AffairesListe, Arrete, EcheanceLigne, EnvoiAuto, Fiche, GardeFous, Groupes, ParcCompte, Pilotage, RestitutionTableur, Secteur, Segment, Sortie, SujetAuto, Tableau, Vocabulaire } from "./types";

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

/* c4_08 — affaires restées en plan */
export async function chargerAffaires(): Promise<AffairesListe> {
  const l = await rpc<AffairesListe | null>("offload_affaires_liste", {});
  return l && typeof l === "object" && Array.isArray(l.affaires) ? l : { total: { affaires: 0, valeur_ht: 0, a_decider: 0, closes_sans_suite: 0 }, affaires: [] };
}

export async function chargerAffairesCompte(compte: string): Promise<AffaireCompte[]> {
  const l = await rpc<AffaireCompte[] | null>("offload_affaires_compte", { p_compte: compte });
  return Array.isArray(l) ? l : [];
}

export function saisirAffaire(compte: string, reference: string, disponibleLe: string, champs: { type: string; libelle?: string; valeur_ht?: number }) {
  return rpc<string>("offload_saisir_affaire", { p_compte: compte, p_reference: reference, p_disponible_le: disponibleLe, p_champs: champs });
}

export function retirerAffaire(affaire: string, retireLe: string | null) {
  return rpc<null>("offload_retirer_affaire", { p_affaire: affaire, p_retire_le: retireLe });
}

export type DecisionAffaire = "relancer" | "garder" | "retour_stock" | "sans_suite";

export function deciderAffaire(affaire: string, decision: DecisionAffaire, motif: string) {
  return rpc<null>("offload_decider_affaire", { p_affaire: affaire, p_decision: decision, p_motif: motif });
}

/* c4_09 — pilotage et arrêtés à date fixe */
export async function chargerPilotage(depuis: string | null): Promise<Pilotage | null> {
  const p = await rpc<Pilotage | null>("offload_pilotage", { p_depuis: depuis });
  return p && typeof p === "object" && Array.isArray(p.vagues) ? p : null;
}

export async function chargerArretes(): Promise<Arrete[]> {
  const l = await rpc<Arrete[] | null>("offload_arretes_liste", {});
  return Array.isArray(l) ? l : [];
}

/* c4_10 — règles en français, coupe-circuit, vérification, raison sociale mère */
export async function chargerGardeFous(): Promise<GardeFous | null> {
  const g = await rpc<GardeFous | null>("offload_garde_fous", {});
  return g && typeof g === "object" ? g : null;
}

export function ecrireRegle(client: string, texte: string) {
  return rpc<{ statut: string; reponse: string }>("offload_ecrire_regle", { p_client: client, p_texte: texte });
}

export function retirerRegle(regle: string) {
  return rpc<null>("offload_retirer_regle", { p_regle: regle });
}

export function suspendre(client: string, motif: string) {
  return rpc<number>("offload_suspendre", { p_client: client, p_motif: motif });
}

export function reprendre(client: string, motif: string) {
  return rpc<null>("offload_reprendre", { p_client: client, p_motif: motif });
}

export function leverVerification(compte: string, motif: string) {
  return rpc<null>("offload_lever_verification", { p_compte: compte, p_motif: motif });
}

export async function chargerGroupes(): Promise<Groupes> {
  const g = await rpc<Groupes | null>("offload_groupes", {});
  return g && typeof g === "object" && Array.isArray(g.groupes) ? g : { groupes: [], a_rattacher: [] };
}

export function rattacherGroupe(comptes: string[], groupe: string | null) {
  return rpc<number>("offload_rattacher_groupe", { p_comptes: comptes, p_groupe: groupe });
}

export function chargerEnvoiAuto(client: string) {
  return rpc<EnvoiAuto>("offload_envoi_auto", { p_client: client });
}

export function reglerEnvoiAuto(client: string, reglages: { envoi_auto?: boolean; sujets_auto?: SujetAuto[] }) {
  return rpc<unknown>("offload_regler", { p_client: client, p_reglages: reglages });
}

export function donnerAccordAuto(client: string) {
  return rpc<EnvoiAuto>("offload_donner_accord_auto", { p_client: client });
}

export function revoquerAccordAuto(client: string, motif: string | null) {
  return rpc<EnvoiAuto>("offload_revoquer_accord_auto", { p_client: client, p_motif: motif });
}

export function restituer(client: string) {
  return rpc<Record<string, unknown>>("offload_restitution", { p_client: client });
}

export function effacerCompte(compte: string, motif: string) {
  return rpc<{ compte: string; efface_le: string; deja: boolean }>("offload_effacer_compte", { p_compte: compte, p_motif: motif });
}

/* c4_36 — la valeur en jeu par segment ; la restitution complète en fichiers CSV, un par famille */
export async function chargerSegments(client: string): Promise<Segment[]> {
  const l = await rpc<Segment[] | null>("offload_valeur_par_segment", { p_client: client });
  return Array.isArray(l) ? l : [];
}

export async function restituerTableur(client: string): Promise<RestitutionTableur> {
  const r = await rpc<RestitutionTableur | null>("offload_restitution_tableur", { p_client: client });
  return r && typeof r === "object" && r.fichiers && typeof r.fichiers === "object" ? r : { format: "csv", fichiers: {} };
}

/* c4_42 — la sortie : l'arrêt, rien en suspens, la restitution ; l'effacement passe par le socle */
export async function sortir(client: string, motif: string): Promise<Sortie> {
  return rpc<Sortie>("offload_sortie", { p_client: client, p_motif: motif });
}

/* c4_45 — l'effacement du seul OFFLOAD, après la sortie, confirmé par le nom exact de l'organisation */
export function effacerModule(client: string, confirmation: string) {
  return rpc<{ objets: number; lignes: Record<string, number>; garde: string }>("offload_effacer_module", { p_client: client, p_confirmation: confirmation });
}

/* c4_43 — le vocabulaire du secteur */
export async function chargerVocabulaire(client: string): Promise<Vocabulaire | null> {
  const v = await rpc<Vocabulaire | null>("offload_vocabulaire", { p_client: client });
  return v && typeof v === "object" ? v : null;
}

export function reglerSecteur(client: string, secteur: Secteur | null) {
  return rpc<Vocabulaire>("offload_regler_secteur", { p_client: client, p_secteur: secteur });
}

/* c4_44 — la reprise des prospects qui n'ont pas abouti */
export function reglerProspects(client: string, actifs: boolean) {
  return rpc<{ prospects_actifs: boolean }>("offload_regler_prospects", { p_client: client, p_actifs: actifs });
}
