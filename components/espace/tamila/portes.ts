/* ══════════════════════════════════════════════════════════════════════
   Les portes Tamila — côté navigateur, sous RLS (05/10/2026, session B4)

   Lecture : les tables tamila_* (SELECT par politique), demandes_validation
   (les demandes Tamila en attente), annuaire(p_client). Les parties ne se
   lisent qu'après une lecture tracée : tamila_consulter(p_dossier) d'abord,
   trente minutes de fenêtre.
   Écriture : UNIQUEMENT par les portes publiques du socle (jamais d'INSERT
   ni d'UPDATE), signatures de omega/SOCLE-EXTRAITS-TAMILA.sql :
     tamila_installer(p_client)
     tamila_creer_dossier(p_client, p_dossier, p_reference, p_intitule, p_cle_fournisseur,
       p_cle_reference, p_cle_enveloppe, p_numero_rg, p_matiere, p_juridiction, p_territoire,
       p_mode, p_perso, p_audit_fin, p_responsable, p_entite) → uuid
     tamila_ajouter_partie / tamila_modifier_partie / tamila_retirer_partie
     tamila_ajouter_membre / tamila_retirer_membre
     tamila_declarer_appel(p_dossier, p_introduit_le, p_role, p_procedure, p_territoire) → uuid
     tamila_orienter_appel(p_dossier, p_procedure)
     tamila_poser_delai(p_dossier, p_regle, p_depart, p_residence) → uuid
     tamila_poser_date(p_dossier, p_echeance, p_acte, p_source) → uuid
     tamila_calculer_delai(p_regle, p_depart, p_territoire, p_residence) → jsonb
     tamila_decider(p_demande, p_decision, p_commentaire) → text
     tamila_corriger_delai / tamila_interrompre_delai / tamila_annuler_delai / tamila_declarer_acte
     tamila_ajouter_audience / tamila_changer_audience
     tamila_avis_lu(p_client, p_dossier, p_piece, p_type, p_valeurs, p_confiance, p_rg_concorde) → jsonb
     tamila_consulter(p_dossier, p_contexte) → timestamptz
     tamila_poser_muraille / tamila_demander_levee_muraille
     tamila_demander_export / tamila_demander_export_cabinet / tamila_telecharger_export
     tamila_demander_cloture / tamila_annuler_cloture / tamila_convertir_audit
     tamila_registre_hors_vue(p_client) → int
   Si la base répond autrement, l'écran montre son message tel quel.
   Les bytea partent en hexadécimal (« \x01… », chiffrement.ts).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Appel, Audience, Avis, CalculDelai, Cle, Delai, DemandeTamila, Dossier, DossierComplet, Export, Lecture, Membre, Muraille, Partie, Personne, RegleProcedure, Reglages } from "./types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export type Moi = { user_id: string; client_id: string; role: Personne["role"]; email: string | null };

export async function monCompte(): Promise<Moi | null> {
  const supabase = createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error) throw new ErreurPorte(message(error));
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string; role: Personne["role"] } | undefined;
  return c ? { user_id: auth.user.id, client_id: c.client_id, role: c.role, email: auth.user.email ?? null } : null;
}

export type Cabinet = {
  moi: Moi;
  installe: boolean;
  reglages: Reglages | null;
  dossiers: Dossier[];
  cles: Cle[];
  /* tous les délais et audiences visibles : les compteurs et la liste en ont besoin */
  delais: Delai[];
  audiences: Audience[];
  demandes: DemandeTamila[];
  personnes: Personne[];
  regles: RegleProcedure[];
  horsVue: number | null;
};

export async function chargerCabinet(): Promise<Cabinet> {
  const moi = await monCompte();
  if (!moi) throw new ErreurPorte("Aucune session ouverte.");
  const supabase = createClient();
  const [r, d, k, t, au, dem, an, co, rg] = await Promise.all([
    supabase.from("tamila_reglages").select("*").eq("client_id", moi.client_id).maybeSingle(),
    supabase.from("tamila_dossiers").select("*").order("cree_le", { ascending: false }).limit(300),
    supabase.from("tamila_cles").select("*"),
    supabase.from("tamila_delais").select("*").order("echeance_retenue"),
    supabase.from("tamila_audiences").select("*").order("date_heure"),
    supabase.from("demandes_validation").select("id, type_action, objet_id, resume, payload, statut, cree_le, roles_autorises").eq("module", "tamila").eq("statut", "en_attente"),
    supabase.rpc("annuaire", { p_client: moi.client_id }),
    supabase.from("comptes").select("user_id, role").eq("client_id", moi.client_id),
    supabase.from("tamila_regles_procedure").select("*").order("code"),
  ]);
  if (d.error) throw new ErreurPorte(message(d.error));
  const annuaire = (Array.isArray(an.data) ? an.data : []) as { user_id: string; nom?: string | null; email?: string | null; role?: string | null }[];
  const personnes: Personne[] = ((co.data ?? []) as { user_id: string; role: Personne["role"] }[]).map((c) => {
    const a = annuaire.find((x) => x.user_id === c.user_id);
    return { user_id: c.user_id, role: c.role, nom: a?.nom || a?.email || c.user_id.slice(0, 8) };
  });
  let horsVue: number | null = null;
  if (["gerant", "admin"].includes(moi.role)) {
    const { data } = await supabase.rpc("tamila_registre_hors_vue", { p_client: moi.client_id });
    horsVue = typeof data === "number" ? data : null;
  }
  return {
    moi,
    installe: !!r.data,
    reglages: (r.data ?? null) as Reglages | null,
    dossiers: (d.data ?? []) as Dossier[],
    cles: (k.data ?? []) as Cle[],
    delais: (t.data ?? []) as Delai[],
    audiences: (au.data ?? []) as Audience[],
    demandes: (dem.data ?? []) as DemandeTamila[],
    personnes,
    regles: (rg.data ?? []) as RegleProcedure[],
    horsVue,
  };
}

export async function chargerDossier(d: Dossier, cle: Cle | null, consulter: boolean): Promise<DossierComplet> {
  const supabase = createClient();
  let consulteJusqu: string | null = null;
  if (consulter) {
    try {
      consulteJusqu = await rpc<string>("tamila_consulter", { p_dossier: d.id, p_contexte: "dossier" });
    } catch {
      consulteJusqu = null;
    }
  }
  const [p, a, t, au, av, m, mu, x, dem, le] = await Promise.all([
    supabase.from("tamila_parties").select("*").eq("dossier_id", d.id).order("cree_le"),
    supabase.from("tamila_appels").select("*").eq("dossier_id", d.id).maybeSingle(),
    supabase.from("tamila_delais").select("*").eq("dossier_id", d.id).order("echeance_retenue"),
    supabase.from("tamila_audiences").select("*").eq("dossier_id", d.id).order("date_heure"),
    supabase.from("tamila_avis").select("*").eq("dossier_id", d.id).order("date_avis", { ascending: false }),
    supabase.from("tamila_dossiers_membres").select("*").eq("dossier_id", d.id).order("ajoute_le"),
    supabase.from("tamila_murailles").select("*").eq("dossier_id", d.id),
    supabase.from("tamila_exports").select("*").eq("dossier_id", d.id).order("cree_le", { ascending: false }),
    supabase.from("demandes_validation").select("id, type_action, objet_id, resume, payload, statut, cree_le, roles_autorises").eq("module", "tamila").eq("objet_id", d.id).eq("statut", "en_attente"),
    supabase.rpc("tamila_journal_acces", { p_dossier: d.id }),
  ]);
  return {
    dossier: d,
    clair: null,
    cle,
    parties: (p.data ?? []) as Partie[],
    partiesClair: {},
    appel: (a.data ?? null) as Appel | null,
    delais: (t.data ?? []) as Delai[],
    audiences: (au.data ?? []) as Audience[],
    avis: (av.data ?? []) as Avis[],
    membres: (m.data ?? []) as Membre[],
    murailles: (mu.data ?? []) as Muraille[],
    exports: (x.data ?? []) as Export[],
    /* la porte tamila_journal_acces (migration b4_02) ; sans elle, la section reste vide */
    lectures: (Array.isArray(le.data) ? le.data : []) as Lecture[],
    demandes: (dem.data ?? []) as DemandeTamila[],
    consulteJusqu,
  };
}

/* ——— les portes d'écriture ——— */

export const installer = (p_client: string) => rpc<void>("tamila_installer", { p_client });

export type NouveauDossier = {
  p_client: string;
  p_dossier: string;
  p_reference: string;
  p_intitule: string;
  p_cle_fournisseur: "local";
  p_cle_reference: string;
  p_cle_enveloppe: string;
  p_numero_rg: string | null;
  p_matiere: string | null;
  p_juridiction: string | null;
  p_territoire: string | null;
  p_mode: "contentieux" | "dommage_corporel";
  p_perso: boolean;
  p_audit_fin: string | null;
  p_responsable: string | null;
};
export const creerDossier = (args: NouveauDossier) => rpc<string>("tamila_creer_dossier", args);

export const ajouterPartie = (p_dossier: string, p_nom: string, p_qualite: string, p_residence: string, p_role_procedure: string | null, p_courriels: string | null) =>
  rpc<string>("tamila_ajouter_partie", { p_dossier, p_nom, p_qualite, p_residence, p_role_procedure, p_courriels });
export const modifierPartie = (p_partie: string, p_residence: string | null, p_qualite: string | null, p_role_procedure: string | null) =>
  rpc<void>("tamila_modifier_partie", { p_partie, p_nom: null, p_qualite, p_residence, p_role_procedure, p_courriels: null });
export const retirerPartie = (p_partie: string) => rpc<void>("tamila_retirer_partie", { p_partie });

export const ajouterMembre = (p_dossier: string, p_user: string, p_role: string, p_jusqu_au: string | null) => rpc<void>("tamila_ajouter_membre", { p_dossier, p_user, p_role, p_jusqu_au });
export const retirerMembre = (p_dossier: string, p_user: string) => rpc<void>("tamila_retirer_membre", { p_dossier, p_user });

export const declarerAppel = (p_dossier: string, p_introduit_le: string, p_role: string, p_procedure: string, p_territoire: string | null) =>
  rpc<string>("tamila_declarer_appel", { p_dossier, p_introduit_le, p_role, p_procedure, p_territoire });
export const orienterAppel = (p_dossier: string, p_procedure: string) => rpc<void>("tamila_orienter_appel", { p_dossier, p_procedure });

export const calculerDelai = (p_regle: string, p_depart: string, p_territoire: string, p_residence: string) =>
  rpc<CalculDelai>("tamila_calculer_delai", { p_regle, p_depart, p_territoire, p_residence });
export const poserDelai = (p_dossier: string, p_regle: string, p_depart: string, p_residence: string | null) => rpc<string>("tamila_poser_delai", { p_dossier, p_regle, p_depart, p_residence });
export const poserDate = (p_dossier: string, p_echeance: string, p_acte: string, p_source: string) => rpc<string>("tamila_poser_date", { p_dossier, p_echeance, p_acte, p_source });
export const decider = (p_demande: string, p_decision: "approuve" | "rejete", p_commentaire: string | null) => rpc<string>("tamila_decider", { p_demande, p_decision, p_commentaire });
export const corrigerDelai = (p_delai: string, p_echeance: string, p_motif: string) => rpc<void>("tamila_corriger_delai", { p_delai, p_echeance, p_motif });
export const interrompreDelai = (p_delai: string, p_motif: string, p_depuis: string) => rpc<void>("tamila_interrompre_delai", { p_delai, p_motif, p_depuis });
export const annulerDelai = (p_delai: string, p_motif: string) => rpc<void>("tamila_annuler_delai", { p_delai, p_motif });
export const declarerActe = (p_delai: string, p_depose_le: string, p_piece: string | null) => rpc<void>("tamila_declarer_acte", { p_delai, p_depose_le, p_piece });

export const ajouterAudience = (p_dossier: string, p_date_heure: string, p_nature: string, p_juridiction: string | null, p_chambre: string | null, p_avocat: string | null, p_heure_connue: boolean) =>
  rpc<string>("tamila_ajouter_audience", { p_dossier, p_date_heure, p_nature, p_juridiction, p_chambre, p_avocat, p_heure_connue });
export const changerAudience = (p_audience: string, p_statut: string, p_renvoi_le: string | null) => rpc<string>("tamila_changer_audience", { p_audience, p_statut, p_renvoi_le });

export const avisLu = (p_client: string, p_dossier: string, p_type: string, p_valeurs: Record<string, unknown>) =>
  rpc<Record<string, unknown>>("tamila_avis_lu", { p_client, p_dossier, p_piece: null, p_type, p_valeurs, p_confiance: "gabarit", p_rg_concorde: null });

export const consulter = (p_dossier: string, p_contexte = "dossier") => rpc<string>("tamila_consulter", { p_dossier, p_contexte });

export const poserMuraille = (p_dossier: string, p_user: string, p_motif: string | null) => rpc<string>("tamila_poser_muraille", { p_dossier, p_user, p_motif });
export const demanderLeveeMuraille = (p_muraille: string) => rpc<string>("tamila_demander_levee_muraille", { p_muraille });

export const demanderExport = (p_dossier: string) => rpc<string>("tamila_demander_export", { p_dossier });
export const demanderExportCabinet = (p_client: string) => rpc<string>("tamila_demander_export_cabinet", { p_client });
export const telechargerExport = (p_export: string) => rpc<string>("tamila_telecharger_export", { p_export });

export const demanderCloture = (p_dossier: string) => rpc<string>("tamila_demander_cloture", { p_dossier });
export const annulerCloture = (p_dossier: string) => rpc<void>("tamila_annuler_cloture", { p_dossier });
export const convertirAudit = (p_dossier: string) => rpc<void>("tamila_convertir_audit", { p_dossier });

/** L'URL signée d'une archive, depuis le navigateur (politique Storage SELECT des membres). */
export async function urlArchive(chemin: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("omega-clients").createSignedUrl(chemin, 600);
  if (error) throw new ErreurPorte(message(error));
  return data.signedUrl;
}
