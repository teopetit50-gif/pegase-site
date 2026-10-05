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
     · pièce jointe (lot 19, 05/10) : approbations.piece_id → public.pieces.
       Pour une demande du module FILED, le fichier est déposé par la porte
       du module, filed_deposer_piece, après envoi dans le bucket
       omega-clients sous <client_id>/filed_document/<document_id>/<nom> ;
       l'identifiant de pièce rendu est posé sur l'approbation. Pour les
       autres modules (dépôt générique au lot 20), le fichier part sous
       <client_id>/demande_validation/<demande_id>/<nom> et son chemin est
       cité dans le commentaire — toléré jusque-là.
     · qui est qui : public.annuaire(p_client) → user_id, nom, email, role,
       réservée aux membres de l'organisation.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Approbation, Compte, Delegation, Demande, Entite, Personne } from "../types";

export type ContexteSocle = {
  user_id: string;
  compte: Compte | null;
  entites: Entite[];
  /* les comptes du même client — pour nommer qui décide et à qui déléguer */
  comptes: Compte[];
  /* l'annuaire de l'organisation (lot 19) ; vide si la porte manque */
  annuaire: Personne[];
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
  let annuaire: Personne[] = [];
  if (compte) {
    const [e, a] = await Promise.all([
      supabase.from("entites").select("id, nom, principale").eq("client_id", compte.client_id).order("principale", { ascending: false }),
      supabase.rpc("annuaire", { p_client: compte.client_id }),
    ]);
    entites = (e.data ?? []) as Entite[];
    annuaire = (Array.isArray(a.data) ? a.data : []) as Personne[];
  }
  return { user_id, compte, entites, comptes: liste, annuaire };
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
  piece_id?: string | null;
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
    piece_id: o.piece_id ?? null,
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

async function sha256Hex(fichier: File): Promise<string> {
  const empreinte = await crypto.subtle.digest("SHA-256", await fichier.arrayBuffer());
  return Array.from(new Uint8Array(empreinte)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Le résultat d'une pièce jointe : soit un identifiant de pièce (porte du
   module), soit le chemin Storage à citer dans le commentaire. */
export type PieceJointe = { piece_id: string | null; chemin: string };

export async function joindrePiece(o: { demande: Demande; client_id: string; entite_id: string | null; fichier: File; expediteur: string | null }): Promise<PieceJointe> {
  const supabase = createClient();
  const nom = o.fichier.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const mime = o.fichier.type || "application/octet-stream";

  if (o.demande.module === "filed") {
    const document_id = crypto.randomUUID();
    const chemin = `${o.client_id}/filed_document/${document_id}/${nom}`;
    const envoi = await supabase.storage.from("omega-clients").upload(chemin, o.fichier, { upsert: false, contentType: mime });
    if (envoi.error) throw new ErreurPorte(message(envoi.error));
    const { data, error } = await supabase.rpc("filed_deposer_piece", {
      p_client: o.client_id,
      p_document: document_id,
      p_nom_fichier: nom,
      p_mime: mime,
      p_octets: o.fichier.size,
      p_sha256: await sha256Hex(o.fichier),
      p_chemin: chemin,
      p_entite: o.entite_id,
      p_source: "depot",
      p_expediteur: o.expediteur,
    });
    if (error) throw new ErreurPorte(message(error));
    const r = (data ?? {}) as Record<string, unknown>;
    const piece_id = typeof r.piece_id === "string" ? r.piece_id : typeof r.piece === "string" ? r.piece : null;
    return { piece_id, chemin };
  }

  const chemin = `${o.client_id}/demande_validation/${o.demande.id}/${Date.now()}-${nom}`;
  const { error } = await supabase.storage.from("omega-clients").upload(chemin, o.fichier, { upsert: false, contentType: mime });
  if (error) throw new ErreurPorte(message(error));
  return { piece_id: null, chemin };
}
