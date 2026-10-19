/* ══════════════════════════════════════════════════════════════════════
   Les portes du référentiel du groupe — côté navigateur, sous RLS
   (05/10/2026, session B1). Signatures : omega/SOCLE-EXTRAITS-VARELO.sql.

   Lecture : grp_installations, grp_poles, grp_societes_vue,
   grp_referentiel_codes, grp_ref_objets, grp_ref_propositions,
   demandes_validation (module varelo), grp_etat_referentiel(p_client).
   Écriture : JAMAIS d'UPDATE là où une porte existe —
     grp_installer, grp_ajouter_societe, grp_deposer_codes,
     grp_demander_rapprochement, grp_rapprocher, grp_appliquer_decisions,
     grp_ecarter_proposition, grp_proposer_{nom,rattachement,fusion,
     detachement,scission}, grp_exporter_referentiel.
   Les seules écritures directes sont celles que le socle veut directes :
   INSERT grp_poles (politique gérant/admin). Approuver un lot se fait dans
   /espace/validations (INSERT approbations, écran d'A3).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { CodeRef, Contexte, DemandeRef, EtatReferentiel, Installation, Nature, Objet, Pole, Proposition, ResultatDepot, ResultatPassage, Societe } from "./types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

/* ——— la personne connectée : compte, équipes, entités ——— */
export async function chargerContexte(): Promise<Contexte> {
  const supabase = createClient();
  const { data: auth, error: erreurAuth } = await supabase.auth.getUser();
  if (erreurAuth) throw new ErreurPorte(message(erreurAuth));
  const user_id = auth.user?.id;
  if (!user_id) throw new ErreurPorte("Aucune session ouverte.");
  const { data: comptes, error } = await supabase.from("comptes").select("user_id, client_id, role, perimetre_total").eq("user_id", user_id).limit(1);
  if (error) throw new ErreurPorte(message(error));
  const compte = (comptes ?? [])[0] as { client_id: string; role: string; perimetre_total: boolean } | undefined;
  if (!compte) throw new ErreurPorte("Aucun compte rattaché à cette session.");
  const [q, m, e] = await Promise.all([
    supabase.from("equipes").select("id, cle, nom").eq("client_id", compte.client_id),
    supabase.from("equipes_membres").select("equipe_id, user_id").eq("client_id", compte.client_id).eq("user_id", user_id),
    supabase.from("entites").select("id, nom, principale").eq("client_id", compte.client_id).order("principale", { ascending: false }),
  ]);
  const noms_equipes: Contexte["noms_equipes"] = {};
  for (const x of (q.data ?? []) as { id: string; cle: string; nom: string }[]) noms_equipes[x.id] = { cle: x.cle, nom: x.nom };
  const equipes = ((m.data ?? []) as { equipe_id: string }[]).map((x) => noms_equipes[x.equipe_id]?.cle).filter((x): x is string => !!x);
  return {
    user_id,
    client_id: compte.client_id,
    role: compte.role,
    perimetre_total: compte.perimetre_total,
    equipes,
    noms_equipes,
    entites: (e.data ?? []) as Contexte["entites"],
  };
}

/* ——— lectures ——— */
export type Referentiel = {
  installation: Installation | null;
  poles: Pole[];
  societes: Societe[];
  codes: CodeRef[];
  objets: Objet[];
  propositions: Proposition[];
  demandes: DemandeRef[];
  etat: EtatReferentiel | null;
};

export async function chargerReferentiel(client_id: string): Promise<Referentiel> {
  const supabase = createClient();
  const [i, p, s, c, o, q, d, e] = await Promise.all([
    supabase.from("grp_installations").select("*").eq("client_id", client_id).limit(1),
    supabase.from("grp_poles").select("*").eq("client_id", client_id).order("ordre").order("nom"),
    supabase.from("grp_societes_vue").select("*").eq("client_id", client_id).order("nom"),
    supabase.from("grp_referentiel_codes").select("*").eq("client_id", client_id).order("code_groupe").order("societe").limit(5000),
    supabase.from("grp_ref_objets").select("*").eq("client_id", client_id).eq("statut", "actif").order("nature").order("numero").limit(5000),
    supabase.from("grp_ref_propositions").select("*").eq("client_id", client_id).order("cree_le", { ascending: false }).limit(1000),
    supabase.from("demandes_validation").select("*").eq("client_id", client_id).eq("module", "varelo").order("cree_le", { ascending: false }).limit(300),
    supabase.rpc("grp_etat_referentiel", { p_client: client_id }),
  ]);
  /* l'installation absente n'est pas une erreur : l'écran propose d'installer */
  for (const r of [p, s, c, o, q, d]) if (r.error) throw new ErreurPorte(message(r.error));
  return {
    installation: ((i.data ?? [])[0] as Installation | undefined) ?? null,
    poles: (p.data ?? []) as Pole[],
    societes: (s.data ?? []) as Societe[],
    codes: (c.data ?? []) as CodeRef[],
    objets: (o.data ?? []) as Objet[],
    propositions: (q.data ?? []) as Proposition[],
    demandes: (d.data ?? []) as DemandeRef[],
    etat: e.error ? null : ((e.data ?? null) as EtatReferentiel | null),
  };
}

/* ——— écritures, toutes par une porte ——— */
async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export const installer = (client_id: string) => rpc<{ installe: boolean; regles_posees: number }>("grp_installer", { p_client: client_id });

export async function creerPole(client_id: string, cle: string, nom: string, ordre: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("grp_poles").insert({ client_id, cle, nom, ordre });
  if (error) throw new ErreurPorte(message(error));
}

export const ajouterSociete = (a: { client_id: string; nom: string; siren: string | null; territoire: string; pole_id: string | null; logiciel: string | null; nomenclature: string | null }) =>
  rpc<string>("grp_ajouter_societe", { p_client: a.client_id, p_nom: a.nom, p_siren: a.siren, p_territoire: a.territoire, p_pole: a.pole_id, p_logiciel: a.logiciel, p_nomenclature: a.nomenclature });

export const deposerCodes = (client_id: string, entite_id: string, nature: Nature, lignes: Record<string, string>[], source: string | null) =>
  rpc<ResultatDepot>("grp_deposer_codes", { p_client: client_id, p_entite: entite_id, p_nature: nature, p_lignes: lignes, p_source: source });

export const demanderPassage = (client_id: string, complet: boolean) => rpc<number>("grp_demander_rapprochement", { p_client: client_id, p_complet: complet });
export const lancerPassage = (client_id: string, complet: boolean) => rpc<ResultatPassage>("grp_rapprocher", { p_client: client_id, p_complet: complet });
export const appliquerDecisions = (client_id: string) => rpc<Record<string, number>>("grp_appliquer_decisions", { p_client: client_id });

export const ecarterProposition = (proposition_id: string, motif: string | null) => rpc<null>("grp_ecarter_proposition", { p_proposition: proposition_id, p_motif: motif });

export const proposerNom = (objet_id: string, nom: string, raison: string | null) => rpc<string>("grp_proposer_nom", { p_objet: objet_id, p_nom: nom, p_raison: raison });
export const proposerRattachement = (code_id: string, objet_cible: string, raison: string | null) => rpc<string>("grp_proposer_rattachement", { p_code: code_id, p_objet_cible: objet_cible, p_raison: raison });
export const proposerFusion = (objet_source: string, objet_cible: string, raison: string | null) => rpc<string>("grp_proposer_fusion", { p_objet_source: objet_source, p_objet_cible: objet_cible, p_raison: raison });
export const proposerDetachement = (code_id: string, raison: string | null) => rpc<string>("grp_proposer_detachement", { p_code: code_id, p_raison: raison });
export const proposerScission = (objet_id: string, codes: string[], raison: string | null) => rpc<string>("grp_proposer_scission", { p_objet: objet_id, p_codes: codes, p_raison: raison });

export const exporter = (client_id: string, nature: Nature) => rpc<string>("grp_exporter_referentiel", { p_client: client_id, p_nature: nature });
