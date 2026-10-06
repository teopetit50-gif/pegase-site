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
     · le calcul pur, sans écrire : RPC lorani_calendrier_permis(p_faits, p_aujourdhui) ;
     · contrôle du dossier (b5_16) : INSERT lorani_controles + lorani_controle_pieces,
       RPC lorani_lancer_controle(p_controle), UPDATE lorani_constats (statut, motif).
   Si la base répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Calcul, CasRejet, Constat, Controle, ControlePiece, DateLue, Dossier, Echeance, Honoraire, Intervenant, Lot, Marche, MembreProjet, Permis, PieceProjet, Projet, Recours, Situation, Temps, Visa } from "./types";

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
  const [projets, permis, dates, echeances, recours, lots, intervenants, membres, cas, pieces, annuaire, honoraires, temps, marches, situations, visas, controles, controlePieces, constats] = await Promise.all([
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
    supabase.from("pieces").select("id, objet_id, nom_fichier, mime, statut, type_piece, motif, source, chemin, recue_le").eq("module", "lorani").eq("objet_type", "lorani_projet").order("recue_le", { ascending: false }).limit(600),
    supabase.rpc("annuaire", { p_client: moi.client_id }),
    /* b5_12 : absentes tant que la migration n'est pas posée ; l'écran montre alors des honoraires vides */
    supabase.from("lorani_honoraires").select("id, projet_id, element, intitule, montant_ht, heures_prevues, statut, achevee_le, facturee_le").limit(3000),
    supabase.from("lorani_temps").select("id, projet_id, honoraire_id, membre, jour, heures, note").order("jour", { ascending: false }).limit(5000),
    /* b5_13 : absentes tant que la migration n'est pas posée ; le chantier est alors vide */
    supabase.from("lorani_marches").select("id, projet_id, lot_id, titulaire, montant_ht, avenants_ht, retenue_pct, delai_verification_jours, actif").limit(2000),
    supabase.from("lorani_situations").select("id, projet_id, marche_id, numero, mois, cumul_ht, recue_le, a_viser_avant, statut, cumul_admis_ht, observation, visee_le").order("numero").limit(5000),
    supabase.from("lorani_visas").select("id, projet_id, lot_id, document, indice, recu_le, commande_le, delai_visa_jours, a_viser_avant, avis, observation, vise_le").order("recu_le", { ascending: false }).limit(5000),
    /* b5_16 : absentes tant que la migration n'est pas posée ; le contrôle du dossier est alors vide */
    supabase.from("lorani_controles").select("id, projet_id, intitule, indice, precedent_id, statut, lance_le, constats_nb, cree_le").order("cree_le", { ascending: false }).limit(1000),
    supabase.from("lorani_controle_pieces").select("id, controle_id, piece_id, role, reference").limit(10000),
    supabase.from("lorani_constats").select("id, controle_id, nature, gravite, grandeur, objet, titre, correction, article, valeurs, statut, motif, precedent_id, corrige_au_controle, decide_par, decide_le").limit(10000),
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
    honoraires: ((honoraires.data ?? []) as Honoraire[]).map((h) => ({ ...h, montant_ht: Number(h.montant_ht), heures_prevues: Number(h.heures_prevues) })),
    temps: ((temps.data ?? []) as Temps[]).map((t) => ({ ...t, heures: Number(t.heures) })),
    marches: ((marches.data ?? []) as Marche[]).map((m) => ({ ...m, montant_ht: Number(m.montant_ht), avenants_ht: Number(m.avenants_ht), retenue_pct: Number(m.retenue_pct) })),
    situations: ((situations.data ?? []) as Situation[]).map((x) => ({ ...x, cumul_ht: Number(x.cumul_ht), cumul_admis_ht: x.cumul_admis_ht === null ? null : Number(x.cumul_admis_ht) })),
    visas: (visas.data ?? []) as Visa[],
    controles: (controles.data ?? []) as Controle[],
    controlePieces: (controlePieces.data ?? []) as ControlePiece[],
    constats: (constats.data ?? []) as Constat[],
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

/* ——— les honoraires (b5_12) ——— */

export async function poserHonoraire(v: { client_id: string; projet_id: string; element: string; intitule: string | null; montant_ht: number; heures_prevues: number }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_honoraires").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function changerHonoraire(id: string, valeurs: Partial<Pick<Honoraire, "montant_ht" | "heures_prevues" | "statut">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_honoraires").update(valeurs).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function saisirTemps(v: { client_id: string; projet_id: string; honoraire_id: string; jour: string; heures: number; note: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_temps").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— le chantier (b5_13) ——— */

export async function poserMarche(v: { client_id: string; projet_id: string; lot_id: string; titulaire: string; montant_ht: number; avenants_ht: number; retenue_pct: number }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_marches").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function recevoirSituation(v: { client_id: string; projet_id: string; marche_id: string; numero: number; mois: string; cumul_ht: number; recue_le: string }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_situations").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function viserSituation(id: string, v: { statut: "visee" | "rectifiee"; cumul_admis_ht: number | null; observation: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_situations").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function recevoirDocument(v: { client_id: string; projet_id: string; lot_id: string | null; document: string; indice: string; recu_le: string; commande_le: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_visas").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function rendreVisa(id: string, v: { avis: "vso" | "vao" | "ref"; observation: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_visas").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}


/* ——— le contrôle du dossier (b5_16) ——— */

export async function preparerControle(
  v: { client_id: string; projet_id: string; intitule: string; indice: string; precedent_id: string | null },
  pieces: { piece_id: string; role: ControlePiece["role"]; reference: string | null }[],
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from("lorani_controles").insert(v).select("id").single();
  if (error) throw new ErreurPorte(message(error));
  const id = (data as { id: string }).id;
  const { error: e2 } = await supabase.from("lorani_controle_pieces").insert(pieces.map((p) => ({ ...p, client_id: v.client_id, projet_id: v.projet_id, controle_id: id })));
  if (e2) throw new ErreurPorte(message(e2));
  return id;
}

export async function lancerControle(id: string): Promise<{ constats: number; bloquants: number; corriges: number; reconduits: number }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lorani_lancer_controle", { p_controle: id });
  if (error) throw new ErreurPorte(message(error));
  return data as { constats: number; bloquants: number; corriges: number; reconduits: number };
}

export async function deciderConstat(id: string, v: { statut: Constat["statut"]; motif: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_constats").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

/* les octets d'une pièce, par un lien signé de dix minutes (le rapport du contrôle en rend les pages citées) */
export async function octetsPiece(chemin: string): Promise<Uint8Array> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("omega-clients").createSignedUrl(chemin, 600);
  if (error || !data?.signedUrl) throw new ErreurPorte(message(error));
  const r = await fetch(data.signedUrl);
  if (!r.ok) throw new ErreurPorte(`Fichier illisible (${r.status}).`);
  return new Uint8Array(await r.arrayBuffer());
}
