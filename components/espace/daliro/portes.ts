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
     btp_rattacher_facture, btp_detacher_facture (b6_03) ;
     btp_accord_j2, btp_donner_accord_j2, btp_revoquer_accord_j2 (b6_08), btp_activer_accord_j2_seul (b6_09) ;
     btp_ouvrir_situation, btp_avancer_situation, btp_soumettre_situation, btp_valider_situation,
     btp_annuler_situation (b6_12) ;
     btp_prononcer_reception, btp_lever_reserve, btp_opposer_retenue, btp_liberer_retenue,
     btp_preparer_decompte, btp_envoyer_decompte, btp_repondre_decompte (b6_13) ;
     btp_noter_paiement, btp_fixer_echeance (b6_16) ;
     btp_heures_chantier (lecture), btp_pointer, btp_pointer_equipe, btp_poser_cout_horaire (b6_17) ;
     btp_proposer_recalage (lecture), btp_recaler, btp_terminer_passage (b6_19) ;
     btp_preparer_signature, btp_preuve_signature (b6_20 ; la page /signer/<jeton> appelle btp_lire_a_signer et
     btp_signer_sur_place sans compte) ;
     btp_meteo_chantier (lecture, b6_21) ;
     btp_appro_chantier (lecture), btp_ecrire_commande, btp_noter_commande, btp_noter_livraison, btp_annuler_commande (b6_22) ;
     btp_preparer_liste, btp_recevoir, btp_noter_retour (b6_23) ;
     btp_fil_chantier, btp_messages_a_ranger (lecture), btp_ranger_message, btp_ecarter_message, btp_avenant_depuis_message (b6_24) ;
     btp_avancement_photos (lecture, b6_25).
   Les tables sans porte (chantiers, lots, tiers, dépendances, acceptations)
   s'écrivent en direct, comme le socle le prévoit (politiques du bureau).
   Si la base répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { AccordJ2, Appro, AvancementPhotos, Chantier, FactureCandidate, HeuresChantier, MessageChantier, MeteoChantier, Recalage, Remplacant, RetourPointage, Tableau } from "./types";

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

/* L'accord permanent des confirmations J-2 (b6_08) : gérant et administrateurs seulement. */
export async function chargerAccordJ2(client: string): Promise<AccordJ2> {
  return rpc<AccordJ2>("btp_accord_j2", { p_client: client });
}
export async function donnerAccordJ2(client: string): Promise<AccordJ2> {
  return rpc<AccordJ2>("btp_donner_accord_j2", { p_client: client });
}
export async function revoquerAccordJ2(client: string, motif: string | null): Promise<AccordJ2> {
  return rpc<AccordJ2>("btp_revoquer_accord_j2", { p_client: client, p_motif: motif });
}
export async function activerAccordJ2Seul(client: string): Promise<AccordJ2> {
  return rpc<AccordJ2>("btp_activer_accord_j2_seul", { p_client: client });
}

/* Les situations de travaux (b6_12). */
export async function ouvrirSituation(chantier: string, periodeFin: string, tauxTva: number | null): Promise<string> {
  return rpc<string>("btp_ouvrir_situation", { p_chantier: chantier, p_periode_fin: periodeFin, p_taux_tva: tauxTva });
}
export async function avancerSituation(ligne: string, avancement: number): Promise<unknown> {
  return rpc("btp_avancer_situation", { p_ligne: ligne, p_avancement: avancement });
}
export async function soumettreSituation(situation: string): Promise<string> {
  return rpc<string>("btp_soumettre_situation", { p_situation: situation });
}
export async function validerSituation(situation: string): Promise<unknown> {
  return rpc("btp_valider_situation", { p_situation: situation });
}
export async function annulerSituation(situation: string, motif: string | null): Promise<unknown> {
  return rpc("btp_annuler_situation", { p_situation: situation, p_motif: motif });
}
/* b6_25 : l'avancement lu dans les photos, proposé (jamais appliqué seul) ; reprise par avancerSituation. */
export async function avancementPhotos(situation: string): Promise<AvancementPhotos> {
  return rpc<AvancementPhotos>("btp_avancement_photos", { p_situation: situation });
}

/* La réception, les réserves, la retenue, le décompte (b6_13). */
export async function prononcerReception(chantier: string, date: string, reserves: { description: string; lot_id?: string | null }[]): Promise<string> {
  return rpc<string>("btp_prononcer_reception", { p_chantier: chantier, p_date: date, p_reserves: reserves, p_piece: null });
}
export async function leverReserve(reserve: string): Promise<unknown> {
  return rpc("btp_lever_reserve", { p_reserve: reserve });
}
export async function opposerRetenue(reception: string, motif: string, date: string): Promise<unknown> {
  return rpc("btp_opposer_retenue", { p_reception: reception, p_motif: motif, p_date: date });
}
export async function libererRetenue(reception: string, accordMaitreOuvrage: boolean): Promise<unknown> {
  return rpc("btp_liberer_retenue", { p_reception: reception, p_accord_maitre_ouvrage: accordMaitreOuvrage });
}
export async function preparerDecompte(reception: string): Promise<unknown> {
  return rpc("btp_preparer_decompte", { p_reception: reception });
}
export async function envoyerDecompte(reception: string): Promise<unknown> {
  return rpc("btp_envoyer_decompte", { p_reception: reception });
}
export async function repondreDecompte(reception: string, accepte: boolean, motif: string | null): Promise<unknown> {
  return rpc("btp_repondre_decompte", { p_reception: reception, p_accepte: accepte, p_motif: motif });
}

/* L'encaissement des situations (b6_16). */
export async function noterPaiement(situation: string, montant: number, date: string, reference: string | null): Promise<unknown> {
  return rpc("btp_noter_paiement", { p_situation: situation, p_montant: montant, p_date: date, p_reference: reference });
}

/* b6_17 : les heures et la rentabilité */
export async function chargerHeures(chantier: string, lundi: string): Promise<HeuresChantier | null> {
  const h = await rpc<HeuresChantier | null>("btp_heures_chantier", { p_chantier: chantier, p_lundi: lundi });
  return h && typeof h === "object" ? h : null;
}

export async function pointer(chantier: string, intervenant: string, jour: string, heures: number, lot: string | null, note: string | null): Promise<RetourPointage> {
  return rpc<RetourPointage>("btp_pointer", { p_chantier: chantier, p_intervenant: intervenant, p_jour: jour, p_heures: heures, p_lot: lot, p_note: note });
}

export async function pointerEquipe(chantier: string, equipe: string, jour: string, heures: number, lot: string | null): Promise<{ pointes: number; alertes: string[] }> {
  return rpc("btp_pointer_equipe", { p_chantier: chantier, p_equipe: equipe, p_jour: jour, p_heures: heures, p_lot: lot });
}

export async function poserCoutHoraire(client: string, intervenant: string | null, cout: number, depuis: string): Promise<unknown> {
  return rpc("btp_poser_cout_horaire", { p_client: client, p_intervenant: intervenant, p_cout: cout, p_depuis: depuis });
}

/* b6_19 : le recalage du planning */
export async function proposerRecalage(passage: string, nouvelleFin: string): Promise<Recalage> {
  return rpc<Recalage>("btp_proposer_recalage", { p_passage: passage, p_nouvelle_fin: nouvelleFin });
}

export async function recaler(passage: string, nouvelleFin: string, motif: string | null): Promise<Recalage> {
  return rpc<Recalage>("btp_recaler", { p_passage: passage, p_nouvelle_fin: nouvelleFin, p_motif: motif });
}

export async function terminerPassage(passage: string, finReelle: string): Promise<unknown> {
  return rpc("btp_terminer_passage", { p_passage: passage, p_fin_reelle: finReelle });
}

/* b6_20 : la signature sur place */
export async function preparerSignature(avenant: string, heures: number): Promise<{ signature_id: string; jeton: string; lien: string; expire_le: string; empreinte: string }> {
  return rpc("btp_preparer_signature", { p_avenant: avenant, p_heures: heures });
}

export type PreuveSignature = {
  signature_id: string; statut: "ouverte" | "signee" | "annulee"; empreinte: string; expire_le: string; prepare_le: string;
  signataire_nom: string | null; signataire_qualite: string | null; trace: string | null; trace_empreinte: string | null;
  appareil: string | null; signee_le: string | null; preuve_empreinte: string | null; annulee_motif: string | null;
};

export async function preuveSignature(avenant: string): Promise<PreuveSignature | null> {
  return rpc<PreuveSignature | null>("btp_preuve_signature", { p_avenant: avenant });
}

/* b6_21 : la météo du chantier */
export async function chargerMeteo(chantier: string): Promise<MeteoChantier | null> {
  const m = await rpc<MeteoChantier | null>("btp_meteo_chantier", { p_chantier: chantier });
  return m && typeof m === "object" ? m : null;
}

/* b6_22 : l'approvisionnement */
export async function chargerAppro(chantier: string): Promise<Appro | null> {
  const a = await rpc<Appro | null>("btp_appro_chantier", { p_chantier: chantier });
  return a && typeof a === "object" ? a : null;
}

export async function ecrireCommande(commande: string | null, chantier: string, champs: Record<string, unknown>): Promise<string> {
  return rpc<string>("btp_ecrire_commande", { p_commande: commande, p_chantier: chantier, p_champs: champs });
}

export async function noterCommande(commande: string, livraisonPrevue: string, commandeeLe: string, reference: string | null): Promise<unknown> {
  return rpc("btp_noter_commande", { p_commande: commande, p_livraison_prevue: livraisonPrevue, p_commandee_le: commandeeLe, p_reference: reference });
}

export async function noterLivraison(commande: string, livreeLe: string, complete: boolean, note: string | null): Promise<unknown> {
  return rpc("btp_noter_livraison", { p_commande: commande, p_livree_le: livreeLe, p_complete: complete, p_note: note });
}

export async function annulerCommande(commande: string, motif: string): Promise<unknown> {
  return rpc("btp_annuler_commande", { p_commande: commande, p_motif: motif });
}

/* b6_23 : la liste depuis le devis, les bons de livraison, les retours */
export async function preparerListe(chantier: string): Promise<{ creees: number; deja: number }> {
  return rpc("btp_preparer_liste", { p_chantier: chantier });
}

export async function recevoir(commande: string, livreeLe: string, quantite: number | null, bon: string | null, note: string | null): Promise<{ rapprochement: string; etat: string; ecart: number | null }> {
  return rpc("btp_recevoir", { p_commande: commande, p_livree_le: livreeLe, p_quantite: quantite, p_bon_reference: bon, p_piece: null, p_note: note });
}

export async function noterRetour(commande: string, renduLe: string | null, retourPrevu: string | null): Promise<unknown> {
  return rpc("btp_noter_retour", { p_commande: commande, p_rendu_le: renduLe, p_retour_prevu: retourPrevu });
}

/* b6_24 : le fil du chantier */
export async function chargerFil(chantier: string): Promise<MessageChantier[]> {
  const f = await rpc<MessageChantier[] | null>("btp_fil_chantier", { p_chantier: chantier, p_nombre: 50 });
  return Array.isArray(f) ? f : [];
}

export async function messagesARanger(client: string): Promise<MessageChantier[]> {
  const f = await rpc<MessageChantier[] | null>("btp_messages_a_ranger", { p_client: client });
  return Array.isArray(f) ? f : [];
}

export async function rangerMessage(message: string, chantier: string): Promise<unknown> {
  return rpc("btp_ranger_message", { p_message: message, p_chantier: chantier });
}

export async function ecarterMessage(message: string, motif: string | null): Promise<unknown> {
  return rpc("btp_ecarter_message", { p_message: message, p_motif: motif });
}

export async function avenantDepuisMessage(message: string, objet: string): Promise<string> {
  return rpc<string>("btp_avenant_depuis_message", { p_message: message, p_objet: objet });
}
