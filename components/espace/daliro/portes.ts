/* ══════════════════════════════════════════════════════════════════════
   Les portes DALIRO — côté navigateur, sous RLS (05/10/2026, session B6)

   Lecture : deux appels, public.btp_liste_chantiers() (la liste) et
   public.btp_tableau_chantier(p_chantier) (tout le chantier, b6_04), tous
   deux SECURITY INVOKER : la RLS du lecteur s'applique, les prix sont null
   sans le droit voir_prix. Écriture : UNIQUEMENT par les portes publiques,
   jamais d'UPDATE sur une table qui a une porte :
     btp_ecrire_marche, btp_ecrire_ligne, btp_accepter_ecart, btp_verifier_marche,
     btp_rouvrir_marche, btp_poser_prix, btp_valider_prix, btp_importer_passages,
     btp_proposer_dependances (socle) ;
     btp_ouvrir_avenant, btp_chiffrer_ligne_avenant, btp_retirer_ligne_avenant,
     btp_soumettre_avenant, btp_signer_avenant, btp_abandonner_avenant (b6_01) ;
     btp_repondre_confirmation, btp_proposer_remplacants (b6_02) ;
     btp_rattacher_facture, btp_detacher_facture (b6_03).
   Les tables sans porte (chantiers, lots, tiers, dépendances, acceptations)
   s'écrivent en direct, comme le socle le prévoit (politiques du bureau).
   Si la base répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Chantier, FactureCandidate, Remplacant, Tableau } from "./types";

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

export async function chargerListe(): Promise<Chantier[]> {
  const liste = await rpc<Chantier[] | null>("btp_liste_chantiers", {});
  return Array.isArray(liste) ? liste : [];
}

export async function chargerTableau(chantier: string): Promise<Tableau | null> {
  const t = await rpc<Tableau | null>("btp_tableau_chantier", { p_chantier: chantier });
  return t && typeof t === "object" ? t : null;
}

export async function monClient(): Promise<{ user_id: string; client_id: string; email: string | null; role: string } | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string; role: string } | undefined;
  if (!c) return null;
  return { user_id: auth.user.id, client_id: c.client_id, email: auth.user.email ?? null, role: c.role };
}

/* Les factures FILED du client qui ne sont rattachées à aucun chantier. */
export async function chargerFacturesCandidates(dejaRattachees: string[]): Promise<FactureCandidate[]> {
  const supabase = createClient();
  const f = await supabase.from("filed_factures").select("id, numero, date_emission, montant_ht, fournisseur_id, statut").neq("statut", "ecartee").order("date_emission", { ascending: false }).limit(200);
  if (f.error) throw new ErreurPorte(message(f.error));
  const factures = ((f.data ?? []) as { id: string; numero: string | null; date_emission: string | null; montant_ht: number | null; fournisseur_id: string | null; statut: string }[]).filter((x) => !dejaRattachees.includes(x.id));
  const fids = Array.from(new Set(factures.map((x) => x.fournisseur_id).filter(Boolean))) as string[];
  let fournisseurs: { id: string; nom: string; siren: string | null }[] = [];
  if (fids.length) {
    const fo = await supabase.from("filed_fournisseurs").select("id, nom, siren").in("id", fids);
    fournisseurs = (fo.data ?? []) as typeof fournisseurs;
  }
  return factures.map((x) => {
    const fo = fournisseurs.find((y) => y.id === x.fournisseur_id);
    return { id: x.id, numero: x.numero, date_emission: x.date_emission, montant_ht: x.montant_ht, fournisseur_nom: fo?.nom ?? null, fournisseur_siren: fo?.siren ?? null, statut: x.statut };
  });
}

/* ——— le marché (socle) ——— */
export const ecrireMarche = (p_marche: string | null, p_chantier: string | null, p_champs: Record<string, unknown>) => rpc<string>("btp_ecrire_marche", { p_marche, p_chantier, p_champs });
export const ecrireLigne = (p_ligne: string | null, p_marche: string | null, p_champs: Record<string, unknown>) => rpc<string>("btp_ecrire_ligne", { p_ligne, p_marche, p_champs });
export const accepterEcart = (p_ligne: string, p_motif: string) => rpc("btp_accepter_ecart", { p_ligne, p_motif });
export const verifierMarche = (p_marche: string) => rpc<Record<string, unknown>>("btp_verifier_marche", { p_marche });
export const rouvrirMarche = (p_marche: string, p_motif: string) => rpc("btp_rouvrir_marche", { p_marche, p_motif });
export const poserPrix = (p_client: string, p_designation: string, p_unite: string, p_prix_unitaire: number, p_corps_etat: string | null) => rpc<string>("btp_poser_prix", { p_client, p_designation, p_unite, p_prix_unitaire, p_corps_etat });
export const validerPrix = (p_prix: string, p_prix_unitaire: number | null) => rpc<string>("btp_valider_prix", { p_prix, p_prix_unitaire });
export const importerPassages = (p_chantier: string, p_source: string, p_lignes: unknown[], p_complet: boolean) => rpc<Record<string, number>>("btp_importer_passages", { p_chantier, p_source, p_lignes, p_complet });
export const proposerDependances = (p_chantier: string) => rpc<number>("btp_proposer_dependances", { p_chantier });

/* ——— les avenants (b6_01) ——— */
export const ouvrirAvenant = (p_chantier: string, p_objet: string, p_origine: Record<string, unknown>) => rpc<string>("btp_ouvrir_avenant", { p_chantier, p_objet, p_origine });
export const chiffrerLigneAvenant = (o: { p_avenant: string; p_quantite: number; p_prix?: string | null; p_lot?: string | null; p_designation?: string | null; p_unite?: string | null; p_prix_unitaire?: number | null; p_sens?: 1 | -1 }) =>
  rpc<string>("btp_chiffrer_ligne_avenant", { p_prix: null, p_lot: null, p_designation: null, p_unite: null, p_prix_unitaire: null, p_sens: 1, ...o });
export const retirerLigneAvenant = (p_ligne: string) => rpc("btp_retirer_ligne_avenant", { p_ligne });
export const soumettreAvenant = (p_avenant: string) => rpc<string>("btp_soumettre_avenant", { p_avenant });
export const signerAvenant = (p_avenant: string, p_piece: string | null, p_date: string) => rpc<Record<string, unknown>>("btp_signer_avenant", { p_avenant, p_piece, p_date });
export const abandonnerAvenant = (p_avenant: string, p_motif: string) => rpc("btp_abandonner_avenant", { p_avenant, p_motif });

/* ——— la confirmation J-2 (b6_02) ——— */
export const repondreConfirmation = (p_passage: string, p_reponse: "confirmee" | "declinee", p_cle: string, p_detail: Record<string, unknown>) => rpc<boolean>("btp_repondre_confirmation", { p_passage, p_reponse, p_cle, p_detail });
export const proposerRemplacants = (p_passage: string) => rpc<Remplacant[]>("btp_proposer_remplacants", { p_passage });

/* ——— les factures (b6_03) ——— */
export const rattacherFacture = (p_facture: string, p_chantier: string, p_lot: string | null, p_motif: string | null) => rpc<string>("btp_rattacher_facture", { p_facture, p_chantier, p_lot, p_motif });
export const detacherFacture = (p_facture: string, p_motif: string) => rpc("btp_detacher_facture", { p_facture, p_motif });

/* ——— écritures directes prévues par le socle (politiques du bureau) ——— */
export async function confirmerDependance(id: string, confirmee: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("btp_dependances").update({ confirmee }).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function changerStatutChantier(id: string, statut: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("btp_chantiers").update({ statut }).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function noterAcceptation(o: { id?: string; client_id: string; chantier_id: string; tiers_id: string; statut: string; mode: string; paiement_direct: boolean }): Promise<void> {
  const supabase = createClient();
  if (o.id) {
    const { error } = await supabase.from("btp_acceptations").update({ statut: o.statut }).eq("id", o.id);
    if (error) throw new ErreurPorte(message(error));
  } else {
    const { error } = await supabase.from("btp_acceptations").insert({ client_id: o.client_id, chantier_id: o.chantier_id, tiers_id: o.tiers_id, mode: o.mode, paiement_direct: o.paiement_direct, statut: o.statut });
    if (error) throw new ErreurPorte(message(error));
  }
}
