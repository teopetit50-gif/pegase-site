/* ══════════════════════════════════════════════════════════════════════
   Les portes LORANI — côté navigateur, sous RLS (05/10/2026, session B5)

   Tout passe par le client Supabase du navigateur : la session de la
   personne, donc ses droits (private.lorani_voit_projet / lorani_ecrit_projet).
     · lecture : lorani_projets, lorani_permis (avec son calcul),
       lorani_permis_dates_lues, la vue lorani_echeances_permis,
       lorani_permis_recours, lorani_lots, lorani_intervenants,
       lorani_membres_projet, lorani_cas_rejet, pieces (module lorani),
       annuaire(p_client) pour les noms ;
     · dates lues : RPC lorani_confirmer_date_lue(p_id, p_valeurs, p_permis)
       → jsonb {permis, ecart, calcul} et lorani_ecarter_date_lue(p_id, p_motif) ;
     · décision implicite : RPC lorani_confirmer_decision_implicite(p_permis)
       → calcul ; jamais de decision = 'tacite' à la main (le trigger refuse) ;
     · saisir sur le permis (dates, décision expresse, délai notifié, cases) :
       UPDATE lorani_permis sous RLS — c'est le dessin du socle, les triggers
       gardent et recalculent ; ouvrir un permis, un projet : INSERT ;
     · recours : INSERT / UPDATE lorani_permis_recours (trigger : accordé
       seulement, pas avant la décision) ;
     · lots, intervenants, équipe : INSERT ;
     · déposer un courrier : fichier dans omega-clients sous
       <client>/lorani_projet/<projet>/<nom>, puis RPC lorani_deposer_piece
       (b5_01) ; la pièce part en lecture, la date lue revient dans la liste ;
     · le calcul pur, sans écrire : RPC lorani_calendrier_permis(p_faits, p_aujourdhui).
   Si la base répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Calcul, CasRejet, DateLue, Dossier, Echeance, Intervenant, Lot, MembreProjet, Permis, PieceProjet, Projet, Recours } from "./types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

type Compte = { user_id: string; client_id: string; role: string };

export async function monCompte(): Promise<Compte | null> {
  const supabase = createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error) throw new ErreurPorte(message(error));
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string; role: string } | undefined;
  return c ? { user_id: auth.user.id, client_id: c.client_id, role: c.role } : null;
}

export async function chargerDossier(): Promise<Dossier> {
  const supabase = createClient();
  const moi = await monCompte();
  if (!moi) throw new ErreurPorte("Aucune session ouverte : connectez-vous depuis le cockpit.");
  const [projets, permis, dates, echeances, recours, lots, intervenants, membres, cas, pieces, annuaire] = await Promise.all([
    supabase.from("lorani_projets").select("*").order("maj_le", { ascending: false }).limit(300),
    supabase.from("lorani_permis").select("*").order("cree_le", { ascending: false }).limit(600),
    supabase.from("lorani_permis_dates_lues").select("*").order("cree_le", { ascending: false }).limit(600),
    supabase.from("lorani_echeances_permis").select("*").limit(2000),
    supabase.from("lorani_permis_recours").select("*").order("date_recours").limit(600),
    supabase.from("lorani_lots").select("id, projet_id, numero, intitule, activites_requises").order("numero").limit(2000),
    supabase.from("lorani_intervenants").select("*").order("organisme").limit(2000),
    supabase.from("lorani_membres_projet").select("id, projet_id, user_id, role_projet").limit(2000),
    supabase.from("lorani_cas_rejet").select("code, article, libelle, source_url").order("code"),
    /* public.pieces date la réception (recue_le) ; l'écran la montre comme date de dépôt */
    supabase.from("pieces").select("id, objet_id, nom_fichier, mime, statut, type_piece, motif, source, recue_le").eq("module", "lorani").eq("objet_type", "lorani_projet").order("recue_le", { ascending: false }).limit(600),
    supabase.rpc("annuaire", { p_client: moi.client_id }),
  ]);
  /* le premier refus de la base est dit tel quel ; les lectures secondaires manquantes ne cachent pas les permis */
  for (const r of [projets, permis, dates]) if (r.error) throw new ErreurPorte(message(r.error));
  const noms: Record<string, string> = {};
  for (const p of (annuaire.data ?? []) as { user_id: string; nom: string }[]) noms[p.user_id] = p.nom;
  return {
    projets: (projets.data ?? []) as Projet[],
    permis: (permis.data ?? []) as Permis[],
    datesLues: (dates.data ?? []) as DateLue[],
    echeances: (echeances.data ?? []) as Echeance[],
    recours: (recours.data ?? []) as Recours[],
    lots: (lots.data ?? []) as Lot[],
    intervenants: (intervenants.data ?? []) as Intervenant[],
    membres: (membres.data ?? []) as MembreProjet[],
    casRejet: (cas.data ?? []) as CasRejet[],
    pieces: ((pieces.data ?? []) as (Omit<PieceProjet, "cree_le"> & { recue_le: string | null })[]).map(({ recue_le, ...x }) => ({ ...x, cree_le: recue_le ?? undefined })),
    noms,
    moi,
  };
}

/* ——— les dates lues ——— */

export async function confirmerDateLue(id: string, valeurs: Record<string, unknown> | null, permis: string | null): Promise<{ permis: string; ecart?: string; calcul?: Calcul }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lorani_confirmer_date_lue", { p_id: id, p_valeurs: valeurs, p_permis: permis });
  if (error) throw new ErreurPorte(message(error));
  return (data ?? {}) as { permis: string; ecart?: string; calcul?: Calcul };
}

export async function ecarterDateLue(id: string, motif: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_ecarter_date_lue", { p_id: id, p_motif: motif });
  if (error) throw new ErreurPorte(message(error));
}

/* ——— la décision implicite ——— */

export async function confirmerDecisionImplicite(permis: string): Promise<Calcul> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lorani_confirmer_decision_implicite", { p_permis: permis });
  if (error) throw new ErreurPorte(message(error));
  return data as Calcul;
}

/* ——— le permis ——— */

export type SaisiePermis = Partial<
  Pick<
    Permis,
    | "date_depot"
    | "numero"
    | "date_demande_pieces"
    | "date_pieces_fournies"
    | "delai_notifie_mois"
    | "date_notification_delai"
    | "decision"
    | "date_decision"
    | "date_affichage"
    | "secteur_protege"
    | "immeuble_inscrit_mh"
    | "erp_autorisation"
    | "igh"
    | "evaluation_environnementale"
    | "cas_rejet"
    | "actif"
    | "intitule"
    | "type_autorisation"
    | "pieces_demandees"
  >
>;

export async function saisirPermis(id: string, valeurs: SaisiePermis): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_permis").update(valeurs).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function ouvrirPermis(v: { client_id: string; projet_id: string; type_autorisation: Permis["type_autorisation"]; intitule: string | null; numero: string | null; date_depot: string | null }): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from("lorani_permis").insert(v).select("id").single();
  if (error) throw new ErreurPorte(message(error));
  return (data as { id: string }).id;
}

export async function ouvrirProjet(v: { client_id: string; nom: string; reference: string | null; adresse: string | null; code_postal: string | null; commune: string | null; code_insee: string | null; parcelles: string[]; nature: Projet["nature"]; marche_public: boolean }): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from("lorani_projets").insert(v).select("id").single();
  if (error) throw new ErreurPorte(message(error));
  return (data as { id: string }).id;
}

/* ——— les recours ——— */

export async function saisirRecours(v: { client_id: string; permis_id: string; nature: Recours["nature"]; date_recours: string; auteur: string | null }): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from("lorani_permis_recours").insert(v).select("id").single();
  if (error) throw new ErreurPorte(message(error));
  return (data as { id: string }).id;
}

export async function clore_recours(id: string, issue: Recours["issue"], date_issue: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_permis_recours").update({ issue, date_issue }).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— le dossier : lots, intervenants, équipe ——— */

export async function ajouterLot(v: { client_id: string; projet_id: string; numero: string; intitule: string }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_lots").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function ajouterIntervenant(v: { client_id: string; projet_id: string; nature: Intervenant["nature"]; organisme: string; contact: string | null; email: string | null; telephone: string | null; siren: string | null; lot_id: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_intervenants").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function ajouterMembre(v: { client_id: string; projet_id: string; user_id: string; role_projet: MembreProjet["role_projet"] }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_membres_projet").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— déposer un courrier de la mairie ——— */

async function sha256(f: File): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
  return Array.from(new Uint8Array(h))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function deposerCourrier(client_id: string, projet_id: string, fichier: File, type_piece: string | null): Promise<string> {
  const supabase = createClient();
  const nom = fichier.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "courrier.pdf";
  const chemin = `${client_id}/lorani_projet/${projet_id}/${Date.now()}-${nom}`;
  const envoi = await supabase.storage.from("omega-clients").upload(chemin, fichier, { contentType: fichier.type || "application/octet-stream", upsert: false });
  if (envoi.error) throw new ErreurPorte(message(envoi.error));
  const { data, error } = await supabase.rpc("lorani_deposer_piece", {
    p_projet: projet_id,
    p_nom_fichier: fichier.name.slice(0, 200),
    p_mime: fichier.type || "application/octet-stream",
    p_octets: fichier.size,
    p_sha256: await sha256(fichier),
    p_chemin: chemin,
    p_type_piece: type_piece,
  });
  if (error) throw new ErreurPorte(message(error));
  return data as string;
}

/* ——— le calcul pur, celui que l'écran montre avant de saisir ——— */

export async function calendrier(faits: Record<string, unknown>): Promise<Calcul> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lorani_calendrier_permis", { p_faits: faits, p_aujourdhui: null });
  if (error) throw new ErreurPorte(message(error));
  return data as Calcul;
}
