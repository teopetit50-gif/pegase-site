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
     tamila_deposer_piece(p_dossier, p_nom_fichier, p_mime, p_octets, p_sha256, p_chemin, p_type_piece) → jsonb (b4_01)
     tamila_consulter(p_dossier, p_contexte) → timestamptz
     tamila_cle_dossier(p_dossier) → bytea (b4_03) ; tamila_journal_acces(p_dossier, p_depuis) (b4_02)
     tamila_poser_muraille / tamila_demander_levee_muraille
     tamila_demander_export / tamila_demander_export_cabinet / tamila_telecharger_export
     tamila_demander_cloture / tamila_annuler_cloture / tamila_convertir_audit
     tamila_registre_hors_vue(p_client) → int
     tamila_coffre_etat(p_client) → jsonb (b4_05) ; la fonction Edge « tamila-coffre » (actions activer,
       nouvelle_cle, cle_dossier, reenvelopper) au nom de la personne connectée : elle déballe les clés
       des dossiers d'un cabinet passé au coffre Scaleway, chaque déballage journalisé
     les honoraires (b4_06) : tamila_poser_convention, tamila_signer_convention, tamila_saisir_temps,
       tamila_annuler_temps, tamila_demander_provision, tamila_provision_recue, tamila_emettre_facture,
       tamila_facture_payee, tamila_annuler_facture ; lecture des tables tamila_conventions, tamila_temps,
       tamila_provisions, tamila_factures (RLS : qui voit le dossier)
     les conflits et la vigilance (b4_07) : tamila_index_cle, tamila_poser_index_cle, tamila_indexer_partie,
       tamila_controler_conflits, tamila_decider_conflit, tamila_poser_vigilance, tamila_conformite
     les avis reçus par courriel (b4_10) : lecture de tamila_avis_entrants et des réceptions (socle),
       tamila_rattacher_avis, tamila_ecarter_avis ; les pièces jointes se lisent au bucket
   Si la base répond autrement, l'écran montre son message tel quel.
   Les bytea partent en hexadécimal (« \x01… », chiffrement.ts).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Appel, Audience, Avis, CalculDelai, Cle, Conformite, EnteteFacture, ControleConflits, Convention, Delai, DemandeTamila, Dossier, DossierComplet, Export, Facture, Honoraires, Lecture, Membre, ModeHonoraires, ModeReglement, Muraille, NatureTemps, Partie, Personne, Piece, Provision, RegleProcedure, Reglages, Temps } from "./types";

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
  /* le coffre à clés du cabinet (b4_05) ; null si la porte n'existe pas sur cette base */
  coffre: EtatCoffre | null;
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
    /* sans nom ni courriel dans l'annuaire : « Vous » pour la personne connectée, sinon son rôle (jamais un identifiant brut) */
    const roles: Record<Personne["role"], string> = { gerant: "Associé gérant", admin: "Associé", valideur: "Avocat", collaborateur: "Assistant juridique", lecteur: "Stagiaire" };
    return { user_id: c.user_id, role: c.role, nom: a?.nom || a?.email?.split("@")[0] || (c.user_id === moi.user_id ? "Vous" : `${roles[c.role]} · ${c.user_id.slice(0, 4)}`) };
  });
  let horsVue: number | null = null;
  if (["gerant", "admin"].includes(moi.role)) {
    const { data } = await supabase.rpc("tamila_registre_hors_vue", { p_client: moi.client_id });
    horsVue = typeof data === "number" ? data : null;
  }
  const coffreCabinet = await etatCoffre(moi.client_id);
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
    coffre: coffreCabinet,
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
  const [p, a, t, au, av, m, mu, x, dem, le, pc] = await Promise.all([
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
    supabase.from("pieces").select("id, client_id, objet_id, nom_fichier, mime, octets, sha256, chemin, statut, type_piece, nb_pages, chiffrement, depose_par, recue_le, motif").eq("objet_type", "tamila_dossier").eq("objet_id", d.id).order("recue_le", { ascending: false }),
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
    pieces: (pc.data ?? []) as Piece[],
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
  p_cle_fournisseur: "local" | "scaleway";
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
/** L'enveloppe de la clé d'un dossier pour un membre qui n'est pas associé (migration b4_03) ; null sans porte ou sans clé active. */
/* ——— le coffre à clés (b4_05) ——— */
export type EtatCoffre = { statut: "local" | "bascule" | "scaleway"; region: string | null; dossiers_locaux: number; dossiers_scaleway: number };

/** null : la porte n'existe pas sur cette base (b4_05 non posée) ; l'écran reste en mode phrase. */
export async function etatCoffre(p_client: string): Promise<EtatCoffre | null> {
  try {
    return await rpc<EtatCoffre>("tamila_coffre_etat", { p_client });
  } catch {
    return null;
  }
}

const MESSAGES_COFFRE: Record<string, string> = {
  KM_ABSENT: "Le coffre n'est pas encore branché : les secrets Scaleway ne sont pas posés.",
  KM_INDISPONIBLE: "Le coffre Scaleway ne répond pas pour l'instant ; réessayez dans un moment.",
  CLE_FAUSSE: "Cette clé n'ouvre pas le dossier : la phrase n'est pas la bonne, rien n'a changé.",
};

/** Un geste du coffre (fonction Edge tamila-coffre), au nom de la personne connectée. */
export async function coffre<T>(action: "activer" | "nouvelle_cle" | "cle_dossier" | "reenvelopper" | "nouvelle_cle_index" | "cle_index", corps: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("tamila-coffre", { body: { action, ...corps } });
  if (error) {
    let detail: { erreur?: string; message?: string } = {};
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) detail = await ctx.json().catch(() => ({}));
    throw new ErreurPorte((detail.erreur && MESSAGES_COFFRE[detail.erreur]) || detail.message || "Le coffre n'a pas répondu.");
  }
  return data as T;
}

export const cleDossier = (p_dossier: string) => rpc<string | null>("tamila_cle_dossier", { p_dossier }).catch(() => null);

export const poserMuraille = (p_dossier: string, p_user: string, p_motif: string | null) => rpc<string>("tamila_poser_muraille", { p_dossier, p_user, p_motif });
export const demanderLeveeMuraille = (p_muraille: string) => rpc<string>("tamila_demander_levee_muraille", { p_muraille });

export const demanderExport = (p_dossier: string) => rpc<string>("tamila_demander_export", { p_dossier });

/** Le fichier CHIFFRÉ part au bucket omega-clients (politique INSERT des membres, lot 19o), puis la porte tamila_deposer_piece (b4_01). */
export async function televerser(chemin: string, octets: Uint8Array): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from("omega-clients").upload(chemin, new Blob([octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer], { type: "application/octet-stream" }), { upsert: false, contentType: "application/octet-stream" });
  if (error) throw new ErreurPorte(message(error));
}
export const deposerPiece = (p_dossier: string, p_nom_fichier: string, p_mime: string, p_octets: number, p_sha256: string, p_chemin: string, p_type_piece: string | null) =>
  rpc<{ piece_id: string; statut: string; deja: boolean }>("tamila_deposer_piece", { p_dossier, p_nom_fichier, p_mime, p_octets, p_sha256, p_chemin, p_type_piece });
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

/* ——— les honoraires (b4_06) ——— */

/** null : les tables n'existent pas sur cette base (b4_06 non posée) ; la carte ne s'affiche pas. */
export async function chargerHonoraires(p_dossier: string): Promise<Honoraires | null> {
  const supabase = createClient();
  const [c, t, p, f] = await Promise.all([
    supabase.from("tamila_conventions").select("*").eq("dossier_id", p_dossier).order("cree_le", { ascending: false }),
    supabase.from("tamila_temps").select("*").eq("dossier_id", p_dossier).order("jour", { ascending: false }).order("cree_le", { ascending: false }),
    supabase.from("tamila_provisions").select("*").eq("dossier_id", p_dossier).order("demandee_le", { ascending: false }),
    supabase.from("tamila_factures").select("*").eq("dossier_id", p_dossier).order("cree_le", { ascending: false }),
  ]);
  if (c.error || t.error || p.error || f.error) return null;
  const conventions = (c.data ?? []) as Convention[];
  return {
    conventions,
    convention: conventions.find((x) => x.statut !== "resiliee") ?? null,
    temps: (t.data ?? []) as Temps[],
    provisions: (p.data ?? []) as Provision[],
    factures: (f.data ?? []) as Facture[],
  };
}

export const poserConvention = (p_dossier: string, p_mode: ModeHonoraires, p_taux_horaire_cents: number | null, p_forfait_cents: number | null, p_complement_pct: number | null, p_taux_tva: number, p_urgence: boolean) =>
  rpc<string>("tamila_poser_convention", { p_dossier, p_mode, p_taux_horaire_cents, p_forfait_cents, p_complement_pct, p_taux_tva, p_urgence });
export const signerConvention = (p_convention: string, p_signee_le: string, p_piece: string | null) => rpc<void>("tamila_signer_convention", { p_convention, p_signee_le, p_piece });
export const saisirTemps = (p_dossier: string, p_jour: string, p_minutes: number, p_nature: NatureTemps, p_description: string | null, p_facturable: boolean) =>
  rpc<string>("tamila_saisir_temps", { p_dossier, p_jour, p_minutes, p_nature, p_description, p_facturable });
export const annulerTemps = (p_temps: string) => rpc<void>("tamila_annuler_temps", { p_temps });
export const demanderProvision = (p_dossier: string, p_montant_ttc_cents: number) => rpc<string>("tamila_demander_provision", { p_dossier, p_montant_ttc_cents });
export const provisionRecue = (p_provision: string, p_recue_le: string, p_mode: ModeReglement) => rpc<void>("tamila_provision_recue", { p_provision, p_recue_le, p_mode });
export const emettreFacture = (p_dossier: string, p_jusqu_au: string, p_debours_cents: number, p_definitif: boolean) =>
  rpc<{ numero: string; total_ttc_cents: number; reste_du_cents: number }>("tamila_emettre_facture", { p_dossier, p_jusqu_au, p_debours_cents, p_definitif });
export const facturePayee = (p_facture: string, p_payee_le: string, p_mode: ModeReglement) => rpc<void>("tamila_facture_payee", { p_facture, p_payee_le, p_mode });
export const annulerFacture = (p_facture: string, p_motif: string) => rpc<void>("tamila_annuler_facture", { p_facture, p_motif });

/* ——— conflits d'intérêts et vigilance (b4_07) ——— */

/** null : la porte n'existe pas sur cette base (b4_07 non posée) ; la carte ne s'affiche pas. */
export async function conformite(p_dossier: string): Promise<Conformite | null> {
  try {
    return await rpc<Conformite>("tamila_conformite", { p_dossier });
  } catch {
    return null;
  }
}
export const indexCle = (p_client: string) => rpc<{ fournisseur: "local" | "scaleway"; reference: string; enveloppe: string | null } | null>("tamila_index_cle", { p_client });
export const poserIndexCle = (p_client: string, p_enveloppe: string) => rpc<void>("tamila_poser_index_cle", { p_client, p_reference: null, p_enveloppe });
export const indexerPartie = (p_partie: string, p_empreintes: string[]) => rpc<number>("tamila_indexer_partie", { p_partie, p_empreintes });
export const controlerConflits = (p_client: string, p_dossier: string | null, p_qualite: string, p_empreintes: string[]) =>
  rpc<ControleConflits>("tamila_controler_conflits", { p_client, p_dossier, p_qualite, p_empreintes });
export const deciderConflit = (p_controle: string, p_decision: string, p_motif: string) => rpc<void>("tamila_decider_conflit", { p_controle, p_decision, p_motif });
export const poserVigilance = (p_dossier: string, p_assujetti: boolean, p_activite: string | null, p_identification_le: string | null, p_identification_piece: string | null, p_beneficiaire_effectif_le: string | null, p_risque: string | null) =>
  rpc<void>("tamila_poser_vigilance", { p_dossier, p_assujetti, p_activite, p_identification_le, p_identification_piece, p_beneficiaire_effectif_le, p_risque });

/* ——— l'en-tête des factures du cabinet (b4_09) ——— */
export const poserEnteteFacture = (p_client: string, p_entete: EnteteFacture) => rpc<EnteteFacture>("tamila_poser_entete_facture", { p_client, p_entete });

/* ——— les avis RPVA reçus par courriel, à rattacher (b4_10) ——— */
export type PieceRecue = { nom: string; mime: string; taille: number; chemin: string };
export type AvisEntrant = {
  id: string;
  reception_id: number;
  recu_le: string;
  type_suppose: string | null;
  nb_pieces: number;
  statut: "a_rattacher" | "rattache" | "ecarte" | "expire";
  expire_le: string;
  /* la réception (socle, RLS) : en clair le temps du rattachement */
  reception: { sujet: string | null; corps: string | null; de_nom: string | null; de_adresse: string | null; pieces: PieceRecue[] } | null;
};

/** null : la table n'existe pas sur cette base (b4_10 non posée) ; la file ne s'affiche pas. */
export async function chargerAvisEntrants(): Promise<AvisEntrant[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("tamila_avis_entrants").select("id, reception_id, recu_le, type_suppose, nb_pieces, statut, expire_le")
    .eq("statut", "a_rattacher").order("recu_le", { ascending: false }).limit(50);
  if (error) return null;
  const lignes = (data ?? []) as Omit<AvisEntrant, "reception">[];
  if (!lignes.length) return [];
  const { data: recs } = await supabase.from("receptions").select("id, sujet, corps, de_nom, de_adresse, pieces").in("id", lignes.map((l) => l.reception_id));
  const par = new Map(((recs ?? []) as { id: number; sujet: string | null; corps: string | null; de_nom: string | null; de_adresse: string | null; pieces: PieceRecue[] }[]).map((r) => [r.id, r]));
  return lignes.map((l) => {
    const r = par.get(l.reception_id);
    return { ...l, reception: r ? { sujet: r.sujet, corps: r.corps, de_nom: r.de_nom, de_adresse: r.de_adresse, pieces: Array.isArray(r.pieces) ? r.pieces : [] } : null };
  });
}

export async function telecharger(chemin: string): Promise<Uint8Array> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("omega-clients").download(chemin);
  if (error || !data) throw new ErreurPorte(error ? message(error) : "Pièce jointe introuvable au bucket.");
  return new Uint8Array(await data.arrayBuffer());
}
export const rattacherAvis = (p_entrant: string, p_dossier: string, p_pieces: string[]) => rpc<{ pieces: number }>("tamila_rattacher_avis", { p_entrant, p_dossier, p_pieces });
export const ecarterAvis = (p_entrant: string, p_motif: string) => rpc<void>("tamila_ecarter_avis", { p_entrant, p_motif });
