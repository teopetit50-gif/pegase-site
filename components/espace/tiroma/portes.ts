/* ══════════════════════════════════════════════════════════════════════
   Les portes TIROMA — côté navigateur, sous RLS (05/10/2026, session B3)

   Lecture : les tables tiroma_* que les politiques du socle ouvrent au
   profil de la personne (cabinet, fauteuils, praticiens, membres, horaires,
   fermetures, règles, relevés, capacités, vocabulaire), puis les quatre
   portes de lecture métier posées par B3 (omega/modules/tiroma/migrations) :
     tiroma_creneaux_a_sauver(p_client, p_entite) → jsonb[]
     tiroma_plans_sans_rendez_vous(p_client, p_entite) → jsonb[]
     tiroma_avant_rendez_vous(p_client, p_entite, p_jours) → jsonb[]
     tiroma_charge_fauteuils(p_client, p_entite, p_jour) → jsonb   (titulaire)
   Écriture : par les portes publiques du socle,
     tiroma_installer_cabinet(p_client, p_entite, p_logiciel, p_perimetre, p_logiciel_version) → uuid
     tiroma_brancher_cabinet(p_client, p_entite, p_voie, p_libelle) → uuid
     tiroma_changer_mode(p_client, p_entite, p_mode)
     tiroma_noter_mutuelle(p_plan, p_statut, p_le, p_motif) → jsonb   (b3_07)
   et par les écritures que les politiques prévoient (le titulaire pose un
   fauteuil, un horaire, une fermeture, un profil ; classe le vocabulaire).
   Si la base répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type {
  Cabinet, CapaciteLue, Charge, Creneau, Dossier, Fauteuil, Fermeture, Horaire, Logiciel, Membre, PlanSansRdv, Praticien, Profil,
  Regles, Releve, TypeRdv, Verification,
} from "./types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

export type Compte = { user_id: string; email: string | null; client_id: string; role: string; entites: { id: string; nom: string; principale: boolean }[] };

export async function monCompte(): Promise<Compte | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  if (error) throw new ErreurPorte(message(error));
  const c = (data ?? [])[0] as { client_id: string; role: string } | undefined;
  if (!c) return null;
  const { data: ent } = await supabase.from("entites").select("id, nom, principale").eq("client_id", c.client_id).order("principale", { ascending: false }).order("nom");
  return { user_id: auth.user.id, email: auth.user.email ?? null, client_id: c.client_id, role: c.role, entites: (ent ?? []) as Compte["entites"] };
}

/** Les cabinets que la personne voit (RLS : les profils du cabinet le voient). */
export async function listerCabinets(compte: Compte): Promise<Cabinet[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("tiroma_cabinets").select("*").eq("client_id", compte.client_id).order("cree_le");
  if (error) throw new ErreurPorte(message(error));
  return ((data ?? []) as Cabinet[]).map((k) => ({ ...k, entite_nom: compte.entites.find((e) => e.id === k.entite_id)?.nom ?? k.entite_id.slice(0, 8) }));
}

export async function monProfil(cabinet: Cabinet, user_id: string): Promise<Profil | null> {
  const supabase = createClient();
  const { data } = await supabase.from("tiroma_profils").select("profil").eq("entite_id", cabinet.entite_id).eq("user_id", user_id).limit(1);
  const p = (data ?? [])[0] as { profil: Profil } | undefined;
  return p?.profil ?? null;
}

async function tableau<T>(table: string, entite_id: string, ordre?: string): Promise<T[]> {
  const supabase = createClient();
  let q = supabase.from(table).select("*").eq("entite_id", entite_id);
  if (ordre) q = q.order(ordre);
  const { data, error } = await q;
  if (error) throw new ErreurPorte(message(error));
  return (data ?? []) as T[];
}

async function rpc<T>(nom: string, args: Record<string, unknown>, repli: T): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return (data ?? repli) as T;
}

/** Tout le dossier d'un cabinet : ce que la personne a le droit de lire, et les quatre portes métier. */
export async function chargerDossier(cabinet: Cabinet, compte: Compte): Promise<{ dossier: Dossier; avis: string[] }> {
  const avis: string[] = [];
  const quiet = async <T,>(p: Promise<T>, repli: T, quoi: string): Promise<T> => {
    try {
      return await p;
    } catch (e) {
      avis.push(`${quoi} : ${e instanceof Error ? e.message : "la base n'a pas répondu"}`);
      return repli;
    }
  };
  const e = cabinet.entite_id;
  const c = cabinet.client_id;
  const [profil, fauteuils, praticiens, membres, horaires, fermetures, regles, releves, capacites, types, creneaux, plans, verifications] = await Promise.all([
    quiet(monProfil(cabinet, compte.user_id), null, "profil"),
    quiet(tableau<Fauteuil>("tiroma_fauteuils", e, "nom"), [], "fauteuils"),
    quiet(tableau<Praticien>("tiroma_praticiens", e, "nom_affiche"), [], "praticiens"),
    quiet(tableau<Membre>("tiroma_membres", e, "prenom"), [], "équipe"),
    quiet(tableau<Horaire>("tiroma_horaires", e, "jour"), [], "horaires"),
    quiet(tableau<Fermeture>("tiroma_fermetures", e, "debut"), [], "fermetures"),
    quiet(tableau<Regles>("tiroma_regles", e).then((r) => r[0] ?? null), null, "règles"),
    quiet(tableau<Releve>("tiroma_releves", e, "recu_le").then((r) => r.reverse().slice(0, 30)), [], "relevés"),
    quiet(tableau<CapaciteLue>("tiroma_capacites", e, "domaine"), [], "capacités"),
    quiet(tableau<TypeRdv>("tiroma_types_rdv", e, "libelle_source"), [], "vocabulaire"),
    quiet(rpc<Creneau[]>("tiroma_creneaux_a_sauver", { p_client: c, p_entite: e }, []), [], "créneaux à sauver"),
    quiet(rpc<PlanSansRdv[]>("tiroma_plans_sans_rendez_vous", { p_client: c, p_entite: e }, []), [], "plans sans rendez-vous"),
    quiet(rpc<Verification[]>("tiroma_avant_rendez_vous", { p_client: c, p_entite: e, p_jours: null }, []), [], "avant les rendez-vous"),
  ]);
  /* la charge des fauteuils est réservée au titulaire : on ne la demande que pour lui */
  const charge = profil === "titulaire" ? await quiet(rpc<Charge | null>("tiroma_charge_fauteuils", { p_client: c, p_entite: e, p_jour: null }, null), null, "charge des fauteuils") : null;
  return {
    dossier: { cabinet, profil, fauteuils, praticiens, membres, horaires, fermetures, regles, releves, capacites, types, creneaux, plans, verifications, charge },
    avis,
  };
}

/* ——— les écritures ——— */

export async function installerCabinet(a: { client_id: string; entite_id: string; logiciel: Logiciel; perimetre: "cabinet" | "praticien"; version: string | null; user_id: string }): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("tiroma_installer_cabinet", {
    p_client: a.client_id, p_entite: a.entite_id, p_logiciel: a.logiciel, p_perimetre: a.perimetre, p_logiciel_version: a.version,
  });
  if (error) throw new ErreurPorte(message(error));
  /* le gérant qui installe se donne le profil de titulaire : sans lui, il ne verrait pas son cabinet */
  const prof = await supabase.from("tiroma_profils").insert({ client_id: a.client_id, user_id: a.user_id, entite_id: a.entite_id, profil: "titulaire" });
  if (prof.error) throw new ErreurPorte(`Le cabinet est installé, mais le profil de titulaire n'a pas pu être posé : ${message(prof.error)}`);
  return data as string;
}

export async function brancherCabinet(cabinet: Cabinet, voie: "exports" | "api" | "passerelle" | "interface" = "exports"): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("tiroma_brancher_cabinet", { p_client: cabinet.client_id, p_entite: cabinet.entite_id, p_voie: voie, p_libelle: null });
  if (error) throw new ErreurPorte(message(error));
  return data as string;
}

export async function changerMode(cabinet: Cabinet, mode: "a_blanc" | "reel"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("tiroma_changer_mode", { p_client: cabinet.client_id, p_entite: cabinet.entite_id, p_mode: mode });
  if (error) throw new ErreurPorte(message(error));
}

export async function changerStatut(cabinet: Cabinet, statut: "actif" | "coupe" | "clos"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tiroma_cabinets").update({ statut }).eq("id", cabinet.id);
  if (error) throw new ErreurPorte(message(error));
}

export async function ajouterFauteuil(cabinet: Cabinet, f: { nom: string; capacites: string[]; objectif: number | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tiroma_fauteuils").insert({ client_id: cabinet.client_id, entite_id: cabinet.entite_id, nom: f.nom, capacites: f.capacites, objectif_occupation: f.objectif });
  if (error) throw new ErreurPorte(message(error));
}

export async function ajouterHoraire(cabinet: Cabinet, h: { jour: number; debut: string; fin: string; fauteuil_id: string | null; praticien_id: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tiroma_horaires").insert({ client_id: cabinet.client_id, entite_id: cabinet.entite_id, ...h });
  if (error) throw new ErreurPorte(message(error));
}

export async function retirerHoraire(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tiroma_horaires").delete().eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function ajouterFermeture(cabinet: Cabinet, f: { debut: string; fin: string; nature: Fermeture["nature"]; fauteuil_id: string | null; praticien_id: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tiroma_fermetures").insert({ client_id: cabinet.client_id, entite_id: cabinet.entite_id, ...f });
  if (error) throw new ErreurPorte(message(error));
}

export async function ajouterPraticien(cabinet: Cabinet, p: { nom_affiche: string; metier: Praticien["metier"] }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tiroma_praticiens").insert({ client_id: cabinet.client_id, entite_id: cabinet.entite_id, ...p });
  if (error) throw new ErreurPorte(message(error));
}

export async function classerType(t: TypeRdv, v: { famille: TypeRdv["famille"]; statut: "propose" | "valide"; necessite_labo: boolean; chirurgie: boolean; exige_assistante: boolean; duree_defaut_min: number | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tiroma_types_rdv").update(v).eq("id", t.id);
  if (error) throw new ErreurPorte(message(error));
}

/* b3_07 : l'assistante ou le titulaire note la demande et la réponse de la mutuelle (l'export ne les porte pas). */
export async function noterMutuelle(plan_id: string, statut: PlanSansRdv["mutuelle_statut"], le: string | null, motif: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("tiroma_noter_mutuelle", { p_plan: plan_id, p_statut: statut, p_le: le, p_motif: motif });
  if (error) throw new ErreurPorte(message(error));
}

export async function reglerRegles(r: Regles, v: Partial<Regles>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tiroma_regles").update(v).eq("id", r.id);
  if (error) throw new ErreurPorte(message(error));
}
