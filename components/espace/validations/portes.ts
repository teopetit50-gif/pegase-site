/* ══════════════════════════════════════════════════════════════════════
   Les portes de la file de validation — côté navigateur, sous RLS (05/10/2026)

   Tout passe par le client Supabase du navigateur (lib/supabase/client) :
   la session de la personne connectée, donc ses droits, rien d'autre.
     · lecture : demandes_validation, approbations, delegations, comptes,
       entites (RLS : mes_clients(), perimetre_couvre, voit_objet) ;
     · décider : INSERT dans public.approbations (user_id = auth.uid()) —
       la base vérifie le rôle, la délégation et la séparation saisie /
       approbation (approbations_preparer), compte et fait avancer la
       demande (approbations_appliquer). Jamais d'UPDATE direct ;
     · modifier : RPC modifier_demande(p_demande, p_resume, p_montant,
       p_payload) → id de la nouvelle demande ;
     · déléguer : INSERT dans public.delegations (policy du délégant) ;
     · pièce jointe : bucket omega-clients, chemin
       <client_id>/demande_validation/<demande_id>/<nom> ; le chemin est
       cité dans le commentaire (approbations n'a pas de colonne pièce —
       demande au coordinateur, omega/NOTES-A3.md).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Approbation, Compte, Delegation, Demande, Entite } from "../types";

export type ContexteSocle = {
  user_id: string;
  compte: Compte | null;
  entites: Entite[];
  /* les comptes du même client — pour nommer qui décide et à qui déléguer */
  comptes: Compte[];
};

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return "La base n'a pas répondu.";
}

export async function chargerContexte(): Promise<ContexteSocle> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user_id = auth.user?.id;
  if (!user_id) throw new ErreurPorte("Aucune session ouverte.");
  const { data: comptes, error } = await supabase.from("comptes").select("user_id, client_id, role, perimetre_total");
  if (error) throw new ErreurPorte(message(error));
  const liste = (comptes ?? []) as Compte[];
  const compte = liste.find((c) => c.user_id === user_id) ?? null;
  let entites: Entite[] = [];
  if (compte) {
    const { data } = await supabase.from("entites").select("id, nom, principale").eq("client_id", compte.client_id).order("principale", { ascending: false });
    entites = (data ?? []) as Entite[];
  }
  return { user_id, compte, entites, comptes: liste };
}

export async function chargerFile(): Promise<{ demandes: Demande[]; approbations: Approbation[]; delegations: Delegation[] }> {
  const supabase = createClient();
  const [d, a, g] = await Promise.all([
    supabase.from("demandes_validation").select("*").order("cree_le", { ascending: false }).limit(300),
    supabase.from("approbations").select("*").order("decide_le", { ascending: false }).limit(1000),
    supabase.from("delegations").select("*").is("revoquee_le", null),
  ]);
  if (d.error) throw new ErreurPorte(message(d.error));
  return {
    demandes: (d.data ?? []) as Demande[],
    approbations: (a.data ?? []) as Approbation[],
    delegations: (g.data ?? []) as Delegation[],
  };
}

export async function decider(o: {
  demande: Demande;
  user_id: string;
  decision: "approuve" | "rejete";
  commentaire: string | null;
  au_nom_de?: Delegation | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("approbations").insert({
    demande_id: o.demande.id,
    client_id: o.demande.client_id,
    user_id: o.user_id,
    au_nom_de: o.au_nom_de?.delegant ?? null,
    delegation_id: o.au_nom_de?.id ?? null,
    decision: o.decision,
    commentaire: o.commentaire,
  });
  if (error) throw new ErreurPorte(message(error));
}

export async function modifier(o: { demande: Demande; resume: string; montant: number | null; payload: Record<string, unknown> }): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("modifier_demande", {
    p_demande: o.demande.id,
    p_resume: o.resume,
    p_montant: o.montant,
    p_payload: o.payload,
  });
  if (error) throw new ErreurPorte(message(error));
  return String(data);
}

export async function deleguer(o: {
  client_id: string;
  delegant: string;
  delegataire: string;
  module: string | null;
  entite_id: string | null;
  fin: string | null;
  motif: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("delegations").insert({
    client_id: o.client_id,
    delegant: o.delegant,
    delegataire: o.delegataire,
    module: o.module,
    entite_id: o.entite_id,
    fin: o.fin,
    motif: o.motif,
    cree_par: o.delegant,
  });
  if (error) throw new ErreurPorte(message(error));
}

export async function joindrePiece(o: { client_id: string; demande_id: string; fichier: File }): Promise<string> {
  const supabase = createClient();
  const nom = o.fichier.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const chemin = `${o.client_id}/demande_validation/${o.demande_id}/${Date.now()}-${nom}`;
  const { error } = await supabase.storage.from("omega-clients").upload(chemin, o.fichier, { upsert: false, contentType: o.fichier.type || undefined });
  if (error) throw new ErreurPorte(message(error));
  return chemin;
}
