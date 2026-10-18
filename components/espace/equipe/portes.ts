/* ══════════════════════════════════════════════════════════════════════
   Équipe — qui a accès à l'organisation, avec quel rôle, sur quelles
   sociétés (15/10/2026, A3 ; CHIFFRAGE/espace.md §§ 1.4 à 1.6)

   Lecture : public.annuaire(p_client) (nom, adresse, rôle), comptes
   (perimetre_total), comptes_entites (sociétés visibles), entites.
   Écriture, sous RLS (gérants et admins ; seul un gérant touche un gérant ;
   le déclencheur garder_un_gerant refuse de retirer le dernier gérant) :
     · ajouter : public.rattacher_membre(p_client, p_email, p_role) — la
       personne doit déjà avoir un compte Omega (sinon « Aucun compte pour
       cette adresse. ») : l'invitation par courriel n'existe pas encore ;
     · changer le rôle : UPDATE comptes.role ;
     · retirer : DELETE comptes ;
     · périmètre : UPDATE comptes.perimetre_total, INSERT / DELETE
       comptes_entites.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";

export type Role = "gerant" | "admin" | "valideur" | "collaborateur" | "lecteur";
export const ROLES: { cle: Role; libelle: string; peut: string }[] = [
  { cle: "gerant", libelle: "Gérant", peut: "Tout, y compris nommer un autre gérant, exporter et préparer la sortie." },
  { cle: "admin", libelle: "Administrateur", peut: "Gère l'équipe (sauf les gérants), lit le journal, exporte les données." },
  { cle: "valideur", libelle: "Valideur", peut: "Approuve, refuse ou modifie les demandes que les règles lui confient." },
  { cle: "collaborateur", libelle: "Collaborateur", peut: "Dépose, saisit et suit ; ne valide pas." },
  { cle: "lecteur", libelle: "Lecteur", peut: "Consulte, sans rien changer." },
];
export const libelleRole = (r: string) => ROLES.find((x) => x.cle === r)?.libelle ?? r;

export type Membre = { user_id: string; nom: string; email: string | null; role: Role; perimetre_total: boolean; entites: string[] };
export type Societe = { id: string; nom: string };
export type VueEquipe = { membres: Membre[]; societes: Societe[]; client: string; moi: string; monRole: Role | null };

const message = (e: { message?: string } | null) => e?.message ?? "La base n'a pas répondu.";

export async function chargerEquipe(): Promise<VueEquipe | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: c } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  const compte = (c ?? [])[0] as { client_id: string; role: Role } | undefined;
  if (!compte) return null;
  const [a, p, ce, en] = await Promise.all([
    supabase.rpc("annuaire", { p_client: compte.client_id }),
    supabase.from("comptes").select("user_id, perimetre_total").eq("client_id", compte.client_id),
    supabase.from("comptes_entites").select("user_id, entite_id").eq("client_id", compte.client_id),
    supabase.from("entites").select("id, nom").eq("client_id", compte.client_id).order("principale", { ascending: false }),
  ]);
  if (a.error) throw new Error(message(a.error));
  const total = new Map(((p.data ?? []) as { user_id: string; perimetre_total: boolean }[]).map((x) => [x.user_id, x.perimetre_total]));
  const parUser = new Map<string, string[]>();
  for (const x of (ce.data ?? []) as { user_id: string; entite_id: string }[]) parUser.set(x.user_id, [...(parUser.get(x.user_id) ?? []), x.entite_id]);
  const membres = ((a.data ?? []) as { user_id: string; nom: string; email: string | null; role: Role }[]).map((m) => ({
    ...m,
    perimetre_total: total.get(m.user_id) ?? true,
    entites: parUser.get(m.user_id) ?? [],
  }));
  return { membres, societes: (en.data ?? []) as Societe[], client: compte.client_id, moi: auth.user.id, monRole: compte.role };
}

export async function ajouterMembre(client: string, email: string, role: Role): Promise<void> {
  const { error } = await createClient().rpc("rattacher_membre", { p_client: client, p_email: email.trim(), p_role: role });
  if (error) throw new Error(message(error));
}

/* une écriture sous RLS qui ne touche aucune ligne n'est pas une erreur pour PostgREST : on le dit */
async function exiger(r: { error: { message?: string } | null; data: unknown[] | null }, refus: string) {
  if (r.error) throw new Error(message(r.error));
  if (!r.data || r.data.length === 0) throw new Error(refus);
}

export async function changerRole(client: string, user: string, role: Role): Promise<void> {
  const r = await createClient().from("comptes").update({ role }).eq("client_id", client).eq("user_id", user).select("user_id");
  await exiger(r, "Vos droits ne permettent pas ce changement (seul un gérant touche un gérant).");
}

export async function retirerMembre(client: string, user: string): Promise<void> {
  const r = await createClient().from("comptes").delete().eq("client_id", client).eq("user_id", user).select("user_id");
  await exiger(r, "Vos droits ne permettent pas de retirer cette personne.");
}

/* toutes les sociétés, ou une liste : le total d'abord, puis les lignes de comptes_entites */
export async function reglerPerimetre(client: string, user: string, total: boolean, entites: string[], avant: string[]): Promise<void> {
  const supabase = createClient();
  const r = await supabase.from("comptes").update({ perimetre_total: total }).eq("client_id", client).eq("user_id", user).select("user_id");
  await exiger(r, "Vos droits ne permettent pas de changer ce périmètre.");
  if (total) return;
  const ajout = entites.filter((e) => !avant.includes(e));
  const retrait = avant.filter((e) => !entites.includes(e));
  if (ajout.length) {
    const { error } = await supabase.from("comptes_entites").insert(ajout.map((entite_id) => ({ client_id: client, user_id: user, entite_id })));
    if (error) throw new Error(message(error));
  }
  if (retrait.length) {
    const { error } = await supabase.from("comptes_entites").delete().eq("client_id", client).eq("user_id", user).in("entite_id", retrait);
    if (error) throw new Error(message(error));
  }
}
