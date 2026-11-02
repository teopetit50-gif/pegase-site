"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — Réglages › Accès et rôles, Journal des accès (02/11/2026)

   Lecture seule, sur les tables existantes du socle (aucune porte nouvelle,
   aucune écriture, aucune migration) :
     · public.tiroma_profils — qui a quel profil sur quel centre. RLS : le
       gérant voit les profils de ses entités, chacun voit le sien ;
     · public.comptes — le rôle dans l'organisation (gérant, admin…). RLS :
       chacun lit son compte, gérants et admins ceux de l'organisation ;
     · public.journal_opposable — le journal opposable du socle (chaîné par
       empreintes, immuable), filtré sur Tiroma : actions « tiroma.* » écrites
       par les portes (private.journaliser_module) et traces des tables
       « tiroma_* ». RLS : gérants et administrateurs seulement ; pour les
       autres la lecture revient vide, sans erreur.
   Promesses du site : « Droits d'accès par rôle », « Les accès sont
   journalisés ».
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Profil } from "@/components/espace/tiroma/types";

export type ProfilLu = {
  id: string;
  user_id: string;
  entite_id: string;
  profil: Profil;
  praticien_id: string | null;
  membre_id: string | null;
  cree_le: string;
  maj_le: string;
  role_organisation: string | null;
  /* l'exemple seulement : un nom pour un compte sans praticien ni membre lié (en base, les comptes n'ont pas de nom) */
  libelle?: string;
};

export type EntreeJournal = {
  id: number;
  survenu_le: string;
  entite_id: string | null;
  acteur_type: "utilisateur" | "operateur" | "systeme";
  acteur_id: string | null;
  acteur_libelle: string | null;
  action: string;
  objet_type: string;
  objet_id: string | null;
  donnees: Record<string, unknown>;
};

export async function lireProfils(client_id: string): Promise<ProfilLu[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("tiroma_profils").select("id, user_id, entite_id, profil, praticien_id, membre_id, cree_le, maj_le").eq("client_id", client_id).order("cree_le");
  if (error) throw new Error(error.message);
  const profils = (data ?? []) as Omit<ProfilLu, "role_organisation">[];
  const ids = [...new Set(profils.map((p) => p.user_id))];
  const roles = new Map<string, string>();
  if (ids.length) {
    const { data: comptes } = await supabase.from("comptes").select("user_id, role").eq("client_id", client_id).in("user_id", ids);
    for (const c of (comptes ?? []) as { user_id: string; role: string }[]) roles.set(c.user_id, c.role);
  }
  return profils.map((p) => ({ ...p, role_organisation: roles.get(p.user_id) ?? null }));
}

/* les 300 dernières entrées Tiroma ; une lecture refusée (hors gérant / admin) revient vide */
export async function lireJournalTiroma(client_id: string): Promise<{ entrees: EntreeJournal[]; lisible: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("journal_opposable")
    .select("id, survenu_le, entite_id, acteur_type, acteur_id, acteur_libelle, action, objet_type, objet_id, donnees")
    .eq("client_id", client_id)
    .or("action.like.tiroma.%,objet_type.like.tiroma_%")
    .order("id", { ascending: false })
    .limit(300);
  if (error) return { entrees: [], lisible: false };
  return { entrees: (data ?? []) as EntreeJournal[], lisible: true };
}

/* l'action en clair (actions écrites par les portes de Tiroma, b3_07 à b3_22) */
const ACTIONS: Record<string, string> = {
  "tiroma.mutuelle_notee": "Mutuelle notée sur un plan",
  "tiroma.regles_alignees": "Règles alignées sur un centre",
  "tiroma.appel_note": "Appel noté",
  "tiroma.attente_ajoutee": "Patient inscrit en liste d'attente",
  "tiroma.attente_retiree": "Patient retiré de la liste d'attente",
  "tiroma.contact_note": "Moyen de contact noté, avec l'accord du patient",
  "tiroma.contact_retire": "Moyen de contact retiré",
  "tiroma.absence_membre_notee": "Absence de l'équipe notée",
  "tiroma.absence_membre_close": "Absence de l'équipe close",
  "tiroma.connecteur_active": "Logiciel branché",
  "tiroma.releve_termine": "Relevé du logiciel appliqué",
  "tiroma.releve_douteux": "Relevé douteux retenu",
  "tiroma.releve_en_retard": "Relevé en retard",
  "tiroma.reprise_initiale": "Reprise initiale du logiciel",
  "tiroma.reponse_rappel": "Réponse d'un patient à un rappel",
  "tiroma.point_matin": "Point du matin déposé",
  "tiroma.export_donnees": "Données du cabinet exportées",
  "tiroma.purge": "Purge des données anciennes",
};
const OPERATIONS: Record<string, string> = { insert: "ajout", update: "modification", delete: "suppression", INSERT: "ajout", UPDATE: "modification", DELETE: "suppression" };
const TABLES: Record<string, string> = {
  tiroma_profils: "profil", tiroma_cabinets: "cabinet", tiroma_fauteuils: "fauteuil", tiroma_praticiens: "praticien", tiroma_membres: "membre de l'équipe",
  tiroma_horaires: "horaire", tiroma_fermetures: "fermeture", tiroma_types_rdv: "type de rendez-vous", tiroma_regles: "règles du cabinet", tiroma_plans: "plan",
  tiroma_liste_attente: "liste d'attente", tiroma_contacts: "moyen de contact", tiroma_appels: "appel", tiroma_absences_membres: "absence de l'équipe",
};

export function actionEnClair(e: Pick<EntreeJournal, "action" | "objet_type">): string {
  if (ACTIONS[e.action]) return ACTIONS[e.action];
  if (e.action.startsWith("tiroma.")) return e.action.slice(7).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  const op = OPERATIONS[e.action.split(".").pop() ?? e.action] ?? e.action;
  const table = TABLES[e.objet_type] ?? e.objet_type.replace(/^tiroma_/, "").replace(/_/g, " ");
  return `${op[0].toUpperCase()}${op.slice(1)} : ${table}`;
}

export const PROFILS: Record<Profil, { libelle: string; voit: string }> = {
  titulaire: { libelle: "Titulaire", voit: "tout le cabinet : charge des fauteuils, objectifs, pilotage, synthèse, règles communes, export des données ; règle le cabinet" },
  collaborateur: { libelle: "Collaborateur", voit: "créneaux, plans, appels, liste d'attente, ses demi-journées vides (son agenda seulement) ; pas la charge des fauteuils" },
  assistante: { libelle: "Assistante", voit: "créneaux, plans, appels, liste d'attente, équipe absente, réinscription ; pas la charge ni le pilotage" },
  direction: { libelle: "Direction", voit: "chiffres du centre : synthèse, pilotage, réinscription sans nom ; ni appels, ni rappels, ni liste d'attente en écriture" },
};

const ROLES: Record<string, string> = { gerant: "gérant", admin: "administrateur", valideur: "valideur", collaborateur: "collaborateur", lecteur: "lecteur" };
export const roleEnClair = (r: string | null) => (r ? (ROLES[r] ?? r) : "rôle inconnu");

/* l'exemple : un journal et des profils fictifs pour le cabinet des Flamboyants */
export function exempleAcces(entite_id: string, noms: { praticiens: { id: string; nom: string }[]; membres: { id: string; nom: string }[] }): { profils: ProfilLu[]; journal: EntreeJournal[] } {
  const il = (j: number, h: number, m = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - j);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const p = (n: number, profil: Profil, praticien: string | null, membre: string | null, role: string, depuis: number): ProfilLu => ({
    id: `pr-${n}`, user_id: u(n), entite_id, profil, praticien_id: praticien, membre_id: membre, cree_le: il(depuis, 9), maj_le: il(depuis, 9), role_organisation: role,
  });
  const [p1, p2] = noms.praticiens;
  const [m1, m2] = noms.membres;
  const profils = [
    p(1, "titulaire", p1?.id ?? null, null, "gerant", 40),
    p(2, "collaborateur", p2?.id ?? null, null, "collaborateur", 38),
    p(3, "assistante", null, m1?.id ?? null, "collaborateur", 38),
    p(4, "assistante", null, m2?.id ?? null, "collaborateur", 30),
    { ...p(5, "direction", null, null, "admin", 21), libelle: "Direction du groupe" },
  ];
  const qui = (n: number) => (n === 1 ? p1?.nom : n === 2 ? p2?.nom : n === 3 ? m1?.nom : n === 4 ? m2?.nom : "Direction du groupe") ?? "Utilisateur";
  const e = (id: number, j: number, h: number, m: number, acteur: number | null, action: string, objet_type: string, objet_id: string | null, donnees: Record<string, unknown> = {}): EntreeJournal => ({
    id, survenu_le: il(j, h, m), entite_id, acteur_type: acteur ? "utilisateur" : "systeme", acteur_id: acteur ? u(acteur) : null, acteur_libelle: acteur ? qui(acteur) : "Omega", action, objet_type, objet_id, donnees,
  });
  const journal = [
    e(912, 0, 8, 41, 3, "tiroma.appel_note", "tiroma_appels", "ap-118", { issue: "rappeler", motif: "plan" }),
    e(911, 0, 7, 42, null, "tiroma.releve_termine", "tiroma_releves", "r-0", { mode: "courant" }),
    e(910, 0, 7, 0, null, "tiroma.point_matin", "points_sections", null),
    e(909, 1, 18, 2, null, "tiroma.reponse_rappel", "tiroma_reponses_rappels", "rp-1", { reponse: "confirme" }),
    e(908, 1, 16, 10, 3, "tiroma.appel_note", "tiroma_appels", "ap-117", { issue: "message", motif: "plan" }),
    e(907, 2, 11, 20, 1, "tiroma.mutuelle_notee", "tiroma_plans", "pl-3", { statut: "demandee" }),
    e(906, 3, 11, 5, 3, "tiroma.appel_note", "tiroma_appels", "ap-112", { issue: "rappeler", motif: "controle" }),
    e(905, 3, 9, 30, 4, "tiroma.attente_ajoutee", "tiroma_liste_attente", "at-3"),
    e(904, 4, 17, 45, 1, "tiroma.absence_membre_notee", "tiroma_absences_membres", "ab-1", { motif: "formation" }),
    e(903, 4, 12, 31, null, "tiroma.releve_douteux", "tiroma_releves", "r-2"),
    e(902, 5, 10, 0, 1, "tiroma.regles_alignees", "tiroma_regles", "rg-1", { centres: 1 }),
    e(901, 12, 14, 12, 3, "tiroma.contact_note", "tiroma_contacts", "ct-1", { source: "oral" }),
    e(900, 21, 9, 0, 1, "update", "tiroma_profils", "pr-5"),
  ];
  return { profils, journal };
}
