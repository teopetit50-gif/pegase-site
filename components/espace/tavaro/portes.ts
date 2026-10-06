/* ══════════════════════════════════════════════════════════════════════
   Les portes TAVARO — côté navigateur, sous RLS (06/10/2026, session B2)

   Lecture : les tables loc_* du socle, telles que la RLS les montre à la
   personne connectée (ses agences, le réseau si elle est de la direction),
   plus demandes_validation (module tavaro) et le journal opposable.
   Écriture : UNIQUEMENT par les portes publiques — jamais d'UPDATE :
     loc_completer_contrat(p_contrat, p_valeurs jsonb) → jsonb
     loc_amender_contrat(p_contrat, p_type, p_retour_prevu_le, p_km_inclus, p_motif) → uuid
     loc_chiffrer_retour(p_contrat, p_retour jsonb) → uuid (la proposition)
     loc_marquer_litige(p_facture, p_motif) → void
     loc_marquer_reglee(p_facture, p_mode, p_le) → void
     loc_demander_avoir(p_facture, p_motif, p_montant_ttc) → uuid (l'avoir)
     loc_relancer_facture(p_facture) → jsonb (migration b2_02)
     loc_publier_bareme(p_libelle, p_date_effet, p_lignes jsonb) → uuid
     loc_retirer_bareme(p_bareme, p_motif) → void
     loc_anonymiser_locataire(p_locataire, p_motif) → jsonb
     loc_enregistrer_avis(p_valeurs jsonb) → jsonb (migration b2_03)
     loc_rattacher_avis(p_avis, p_contrat) → jsonb
     loc_designer_conducteur(p_avis, p_designation jsonb, p_mode, p_reference) → jsonb
     loc_classer_avis(p_avis, p_motif) → jsonb
     loc_etablir_etat(p_contrat, p_moment, p_valeurs jsonb) → uuid (migration b2_05)
     loc_signer_etat(p_etat, p_signataire, p_signature) → jsonb
     loc_constater_refus(p_etat, p_motif) → jsonb
     loc_lever_caution(p_contrat, p_motif) → jsonb
     loc_facture_electronique(p_facture) / loc_avoir_electronique(p_avoir) → jsonb (migration b2_06)
     loc_completer_locataire(p_locataire, p_valeurs jsonb) → jsonb
     loc_preparation_2027() → jsonb
   Deux exceptions, que le socle ouvre par une politique RLS au gérant
   seul : loc_reglages (INSERT/UPDATE) et loc_agences (INSERT/UPDATE).
   Signatures lues dans omega/SOCLE-EXTRAITS-TAVARO.sql ; si la base
   répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { assemblerDossiers } from "./exemples";
import type { FormeElectronique } from "./cii";
import type { Preparation } from "./FactureElectronique";
import type { Agence, Amendement, AvisContravention, Avoir, EtatDesLieux, Bareme, Categorie, Contrat, DemandeCourte, Dossier, Facture, LigneBareme, LigneFacture, LigneJournal, LigneProposition, Locataire, Proposition, Reglages, Retour, Role, Vehicule } from "./types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

export type Moi = { user_id: string; client_id: string; role: Role; email: string | null; entites: { id: string; nom: string }[] };

export async function monCompte(): Promise<Moi | null> {
  const supabase = createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error) throw new ErreurPorte(message(error));
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string; role: Role } | undefined;
  if (!c) return null;
  const e = await supabase.from("entites").select("id, nom").eq("client_id", c.client_id).order("principale", { ascending: false });
  return { user_id: auth.user.id, client_id: c.client_id, role: c.role, email: auth.user.email ?? null, entites: (e.data ?? []) as { id: string; nom: string }[] };
}

export type Monde = {
  dossiers: Dossier[];
  agences: (Agence & { nom?: string })[];
  categories: Categorie[];
  baremes: Bareme[];
  lignesBareme: LigneBareme[];
  reglages: Reglages | null;
  entites: { id: string; nom: string }[];
  /* les avis de contravention (b2_03) : vide sans erreur tant que la migration n'est pas posée */
  avis: AvisContravention[];
};

/* Tout le parking en une passe : les tables sont petites par client, et la RLS
   ne rend que ce que la personne a le droit de voir. */
export async function chargerMonde(): Promise<Monde> {
  const supabase = createClient();
  const [contrats, agences, categories, baremes, lignesBareme, reglages, entites] = await Promise.all([
    supabase.from("loc_contrats").select("*").is("disparu_le", null).order("depart_le", { ascending: false }).limit(300),
    supabase.from("loc_agences").select("id, entite_id, code, taux_tva, actif"),
    supabase.from("loc_categories").select("id, code, libelle"),
    supabase.from("loc_baremes").select("*").order("date_effet", { ascending: false }),
    supabase.from("loc_bareme_lignes").select("*").order("rang"),
    supabase.from("loc_reglages").select("*").limit(1),
    supabase.from("entites").select("id, nom"),
  ]);
  const avisLus = await supabase.from("loc_avis_contravention").select("*").order("echeance_le").limit(500);
  if (contrats.error) throw new ErreurPorte(message(contrats.error));
  const liste = (contrats.data ?? []) as Contrat[];
  const ids = liste.map((c) => c.id);
  const vide = { data: [] as unknown[] };
  const [locataires, vehicules, amendements, propositions, factures, avoirs] = ids.length
    ? await Promise.all([
        supabase.from("loc_locataires").select("id, type, nom, prenom, raison_sociale, siren, email, telephone, adresse, anonymise_le").in("id", liste.map((c) => c.locataire_id).filter(Boolean) as string[]),
        supabase.from("loc_vehicules").select("id, immatriculation, modele, categorie_id, energie, reservoir_l, statut, km_dernier").in("id", liste.map((c) => c.vehicule_id).filter(Boolean) as string[]),
        supabase.from("loc_contrats_amendements").select("*").in("contrat_id", ids).order("accorde_le"),
        supabase.from("loc_propositions").select("*").in("contrat_id", ids).order("version"),
        supabase.from("loc_factures").select("*").in("contrat_id", ids).order("numero"),
        supabase.from("loc_avoirs").select("*").in("contrat_id", ids).order("cree_le"),
      ])
    : [vide, vide, vide, vide, vide, vide];
  const props = (propositions.data ?? []) as Proposition[];
  const facs = (factures.data ?? []) as Facture[];
  const avs = (avoirs.data ?? []) as Avoir[];
  const demandeIds = [...props.map((p) => p.demande_id), ...avs.map((a) => a.demande_id)].filter(Boolean) as string[];
  /* les états des lieux (b2_05) : vides sans erreur tant que la migration n'est pas posée */
  const etatsLus = ids.length ? await supabase.from("loc_etats_des_lieux").select("*").in("contrat_id", ids) : { data: [], error: null };
  const [lignes, lignesFactures, demandes, journal] = await Promise.all([
    props.length ? supabase.from("loc_proposition_lignes").select("*").in("proposition_id", props.map((p) => p.id)).order("rang") : vide,
    facs.length ? supabase.from("loc_facture_lignes").select("*").in("facture_id", facs.map((f) => f.id)).order("rang") : vide,
    demandeIds.length ? supabase.from("demandes_validation").select("id, type_action, statut, approbations_requises, roles_autorises, echeance, demandeur_id").in("id", demandeIds) : vide,
    /* le journal : lisible par la direction (politique du socle) ; pour les autres, la liste reste vide sans erreur */
    supabase.from("journal_opposable").select("*").like("action", "tavaro.%").order("survenu_le", { ascending: false }).limit(500).then((r) => ({ data: r.error ? [] : (r.data ?? []) })),
  ]);
  const journalLignes = ((journal as { data: unknown[] }).data as Record<string, unknown>[]).map((l) => ({
    id: (l.id as string) ?? crypto.randomUUID(),
    action: String(l.action ?? l.evenement ?? ""),
    objet_type: (l.objet_type as string) ?? null,
    objet_id: (l.objet_id as string) ?? null,
    donnees: ((l.donnees ?? l.detail ?? l.payload ?? {}) as Record<string, unknown>),
    survenu_le: String(l.survenu_le ?? l.cree_le ?? l.le ?? ""),
  })) as LigneJournal[];
  const dossiers = assemblerDossiers(liste, {
    locataires: (locataires.data ?? []) as Locataire[],
    vehicules: (vehicules.data ?? []) as Vehicule[],
    categories: (categories.data ?? []) as Categorie[],
    amendements: (amendements.data ?? []) as Amendement[],
    propositions: props,
    lignes: (lignes.data ?? []) as LigneProposition[],
    factures: facs,
    lignesFactures: (lignesFactures.data ?? []) as LigneFacture[],
    avoirs: avs,
    demandes: (demandes.data ?? []) as DemandeCourte[],
    journal: journalLignes,
    etats: etatsLus.error ? [] : ((etatsLus.data ?? []) as EtatDesLieux[]),
  });
  const ents = (entites.data ?? []) as { id: string; nom: string }[];
  return {
    dossiers,
    agences: ((agences.data ?? []) as Agence[]).map((a) => ({ ...a, nom: ents.find((e) => e.id === a.entite_id)?.nom })),
    categories: (categories.data ?? []) as Categorie[],
    baremes: (baremes.data ?? []) as Bareme[],
    lignesBareme: (lignesBareme.data ?? []) as LigneBareme[],
    reglages: ((reglages.data ?? [])[0] as Reglages | undefined) ?? null,
    entites: ents,
    avis: avisLus.error ? [] : ((avisLus.data ?? []) as AvisContravention[]),
  };
}

async function rpc<T = unknown>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export const completerContrat = (p_contrat: string, p_valeurs: Record<string, unknown>) => rpc<Record<string, unknown>>("loc_completer_contrat", { p_contrat, p_valeurs });
export const amenderContrat = (p_contrat: string, p_type: string, p_retour_prevu_le: string | null, p_km_inclus: number | null, p_motif: string | null) =>
  rpc<string>("loc_amender_contrat", { p_contrat, p_type, p_retour_prevu_le, p_km_inclus, p_motif });
export const chiffrerRetour = (p_contrat: string, p_retour: Retour) => rpc<string>("loc_chiffrer_retour", { p_contrat, p_retour });
export const marquerLitige = (p_facture: string, p_motif: string) => rpc("loc_marquer_litige", { p_facture, p_motif });
export const marquerReglee = (p_facture: string, p_mode: string, p_le: string | null) => rpc("loc_marquer_reglee", p_le ? { p_facture, p_mode, p_le } : { p_facture, p_mode });
export const demanderAvoir = (p_facture: string, p_motif: string, p_montant_ttc: number | null) => rpc<string>("loc_demander_avoir", p_montant_ttc === null ? { p_facture, p_motif } : { p_facture, p_motif, p_montant_ttc });
export const relancerFacture = (p_facture: string) => rpc<Record<string, unknown>>("loc_relancer_facture", { p_facture });
export const publierBareme = (p_libelle: string, p_date_effet: string, p_lignes: Record<string, unknown>[]) => rpc<string>("loc_publier_bareme", { p_libelle, p_date_effet, p_lignes });
export const retirerBareme = (p_bareme: string, p_motif: string) => rpc("loc_retirer_bareme", { p_bareme, p_motif });
export const enregistrerAvis = (p_valeurs: Record<string, unknown>) => rpc<Record<string, unknown>>("loc_enregistrer_avis", { p_valeurs });
export const rattacherAvis = (p_avis: string, p_contrat: string) => rpc<Record<string, unknown>>("loc_rattacher_avis", { p_avis, p_contrat });
export const designerConducteur = (p_avis: string, p_designation: Record<string, unknown>, p_mode: string, p_reference: string | null) =>
  rpc<Record<string, unknown>>("loc_designer_conducteur", { p_avis, p_designation, p_mode, p_reference });
export const classerAvis = (p_avis: string, p_motif: string) => rpc<Record<string, unknown>>("loc_classer_avis", { p_avis, p_motif });
export const etablirEtat = (p_contrat: string, p_moment: "depart" | "retour", p_valeurs: Record<string, unknown>) => rpc<string>("loc_etablir_etat", { p_contrat, p_moment, p_valeurs });
export const signerEtat = (p_etat: string, p_signataire: string, p_signature: string | null) => rpc<Record<string, unknown>>("loc_signer_etat", { p_etat, p_signataire, p_signature });
export const constaterRefus = (p_etat: string, p_motif: string) => rpc<Record<string, unknown>>("loc_constater_refus", { p_etat, p_motif });
export const leverCaution = (p_contrat: string, p_motif: string | null) => rpc<Record<string, unknown>>("loc_lever_caution", { p_contrat, p_motif });
export const factureElectronique = (p_facture: string) => rpc<FormeElectronique>("loc_facture_electronique", { p_facture });
export const avoirElectronique = (p_avoir: string) => rpc<FormeElectronique>("loc_avoir_electronique", { p_avoir });
export const completerLocataire = (p_locataire: string, p_valeurs: Record<string, unknown>) => rpc<Record<string, unknown>>("loc_completer_locataire", { p_locataire, p_valeurs });
export const preparation2027 = () => rpc<Preparation>("loc_preparation_2027", {});
export const refacturerAvis = (p_avis: string) => rpc<Record<string, unknown>>("loc_refacturer_avis", { p_avis });
export const anonymiserLocataire = (p_locataire: string) => rpc<Record<string, unknown>>("loc_anonymiser_locataire", { p_locataire, p_motif: "demande" });

/* Les réglages du module : la seule écriture directe, ouverte par la RLS au gérant. */
export async function poserReglages(client_id: string, r: Partial<Reglages>): Promise<void> {
  const supabase = createClient();
  const existe = await supabase.from("loc_reglages").select("id").eq("client_id", client_id).limit(1);
  const id = (existe.data ?? [])[0]?.id as string | undefined;
  const q = id ? supabase.from("loc_reglages").update(r).eq("id", id) : supabase.from("loc_reglages").insert({ client_id, ...r });
  const { error } = await q;
  if (error) throw new ErreurPorte(message(error));
}

/* Une photo de retour part dans le bucket omega-clients sous
   <client>/loc_contrat/<contrat>/<nom> ; la porte reçoit son chemin dans les
   preuves. Si la politique Storage ne l'autorise pas encore (demande au
   coordinateur, 06/10), la base répond et l'écran le dit. */
export async function deposerPhoto(client_id: string, contrat_id: string, fichier: File): Promise<string> {
  const supabase = createClient();
  const nom = fichier.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const chemin = `${client_id}/loc_contrat/${contrat_id}/${Date.now()}-${nom}`;
  const envoi = await supabase.storage.from("omega-clients").upload(chemin, fichier, { upsert: false, contentType: fichier.type || "application/octet-stream" });
  if (envoi.error) throw new ErreurPorte(message(envoi.error));
  return chemin;
}
