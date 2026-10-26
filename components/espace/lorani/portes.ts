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
       RPC lorani_lancer_controle(p_controle), UPDATE lorani_constats (statut, motif) ;
     · PLU depuis l'adresse (b5_17) : RPC lorani_chercher_plu(p_projet), puis
       lorani_suivre_plu(p_projet) jusqu'à « trouvé » (la base appelle l'IGN) ;
     · décennales (b5_18) : INSERT / UPDATE lorani_attestations (le trigger contrôle),
       UPDATE lorani_lots.activites_requises, UPDATE lorani_projets.ouverture_chantier ;
     · OS et réserves (b5_19) : INSERT / UPDATE lorani_ordres_service, lorani_reserves ;
       UPDATE lorani_marches.delai_execution_jours, lorani_projets.reception_le ;
     · comptes rendus (b5_20) : INSERT / UPDATE lorani_comptes_rendus, lorani_points
       (statut diffuse = contenu figé par le socle) ;
     · DOE (b5_21) : RPC lorani_preparer_doe(p_projet), UPDATE lorani_doe.
     · offres (b5_26) : INSERT lorani_consultations ; RPC lorani_analyser_offres(p_consultation),
       lorani_attribuer_offre(p_offre, p_motif) ; UPDATE lorani_offres (écarter, avec motif).
     · listes de l'agence (b5_60) : RPC lorani_liste_enregistrer(p_client, p_liste, p_nom, p_description,
       p_natures, p_phases, p_points), lorani_liste_activer(p_liste, p_actif) ; gérant et admins.
     · révision BT (b5_34) : lecture lorani_ref_index_series, lorani_ref_index, lorani_situations.revision ;
       UPDATE lorani_marches.revision_idbank / revision_mois_zero / revision_partie_fixe (la base recalcule) ;
     · avenants (b5_50) : INSERT lorani_avenants, UPDATE statut (signe : la base l'intègre au marché ; abandonne + motif) ;
     · pièces de chantier lues (b5_51) : lecture lorani_lectures_chantier ; RPC lorani_confirmer_lecture_chantier(
       p_lecture, p_marche, p_valeurs) et lorani_ecarter_lecture_chantier(p_lecture, p_motif).
   Si la base répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { ListeAgence, PointListe, VersionListe, Attestation, CompteRendu, Consultation, Offre, OrdreService, PieceDoe, Point, Reserve, Calcul, CasRejet, Constat, Plu, Controle, ControlePiece, DateLue, Dossier, Echeance, Honoraire, Intervenant, Lot, Marche, MembreProjet, Permis, PieceProjet, Projet, Recours, Situation, Temps, Visa, Avenant, IndexSerie, IndexValeur, LectureChantier, Revision } from "./types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

type Compte = { user_id: string; client_id: string; role: string };

/* L'organisation de l'écran. Un compte peut appartenir à plusieurs organisations (comptes) : la RLS laisse alors lire les
   lignes de toutes. On en retient une, toujours la même : celle que l'adresse désigne (?organisation=<id>) si le compte en
   est membre, sinon une organisation d'architectes (clients.secteur = 'archi'), sinon le plus ancien compte. Chaque
   lecture de chargerDossier est ensuite filtrée sur elle, et les écritures partent sous elle. */
export async function monCompte(): Promise<Compte | null> {
  const supabase = createClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error) throw new ErreurPorte(message(error));
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id, role, cree_le").eq("user_id", auth.user.id).order("cree_le").limit(50);
  const comptes = (data ?? []) as { client_id: string; role: string }[];
  if (!comptes.length) return null;
  let c = comptes[0];
  if (comptes.length > 1) {
    const voulue = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("organisation") : null;
    const { data: orgs } = await supabase.from("clients").select("id, secteur").in("id", comptes.map((x) => x.client_id));
    const archi = new Set(((orgs ?? []) as { id: string; secteur: string | null }[]).filter((o) => o.secteur === "archi").map((o) => o.id));
    c = comptes.find((x) => x.client_id === voulue) ?? comptes.find((x) => archi.has(x.client_id)) ?? comptes[0];
  }
  return { user_id: auth.user.id, client_id: c.client_id, role: c.role };
}

export async function chargerDossier(): Promise<Dossier> {
  const supabase = createClient();
  const moi = await monCompte();
  if (!moi) throw new ErreurPorte("Aucune session ouverte : connectez-vous depuis le cockpit.");
  const [projets, permis, dates, echeances, recours, lots, intervenants, membres, cas, pieces, annuaire, honoraires, temps, marches, situations, visas, controles, controlePieces, constats, plu, attestations, ordresService, reserves, comptesRendus, points, doe, consultations, offres, listes, listeVersions, avenants, lecturesChantier, indexSeries, indexValeurs] = await Promise.all([
    supabase.from("lorani_projets").select("*").eq("client_id", moi.client_id).order("maj_le", { ascending: false }).limit(300),
    supabase.from("lorani_permis").select("*").eq("client_id", moi.client_id).order("cree_le", { ascending: false }).limit(600),
    supabase.from("lorani_permis_dates_lues").select("*").eq("client_id", moi.client_id).order("cree_le", { ascending: false }).limit(600),
    supabase.from("lorani_echeances_permis").select("*").eq("client_id", moi.client_id).limit(2000),
    supabase.from("lorani_permis_recours").select("*").eq("client_id", moi.client_id).order("date_recours").limit(600),
    supabase.from("lorani_lots").select("id, projet_id, numero, intitule, activites_requises").eq("client_id", moi.client_id).order("numero").limit(2000),
    supabase.from("lorani_intervenants").select("*").eq("client_id", moi.client_id).order("organisme").limit(2000),
    supabase.from("lorani_membres_projet").select("id, projet_id, user_id, role_projet").eq("client_id", moi.client_id).limit(2000),
    supabase.from("lorani_cas_rejet").select("code, article, libelle, source_url").order("code"),
    /* public.pieces date la réception (recue_le) ; l'écran la montre comme date de dépôt */
    supabase.from("pieces").select("id, objet_id, nom_fichier, mime, statut, type_piece, motif, source, chemin, recue_le").eq("client_id", moi.client_id).eq("module", "lorani").eq("objet_type", "lorani_projet").order("recue_le", { ascending: false }).limit(600),
    supabase.rpc("annuaire", { p_client: moi.client_id }),
    /* b5_12 : absentes tant que la migration n'est pas posée ; l'écran montre alors des honoraires vides */
    supabase.from("lorani_honoraires").select("id, projet_id, element, intitule, montant_ht, heures_prevues, statut, achevee_le, facturee_le").eq("client_id", moi.client_id).limit(3000),
    supabase.from("lorani_temps").select("id, projet_id, honoraire_id, membre, jour, heures, note").eq("client_id", moi.client_id).order("jour", { ascending: false }).limit(5000),
    /* b5_13 : absentes tant que la migration n'est pas posée ; le chantier est alors vide */
    supabase.from("lorani_marches").select("*").eq("client_id", moi.client_id).limit(2000),
    supabase.from("lorani_situations").select("id, projet_id, marche_id, numero, mois, cumul_ht, recue_le, a_viser_avant, statut, cumul_admis_ht, observation, visee_le, avancement_declare, avancement_constate, avancement_cr, retenue_deduite_ht, avance_remboursee_ht, penalites_ht, montants, revision").eq("client_id", moi.client_id).order("numero").limit(5000),
    supabase.from("lorani_visas").select("id, projet_id, lot_id, document, indice, recu_le, commande_le, delai_visa_jours, a_viser_avant, avis, observation, vise_le").eq("client_id", moi.client_id).order("recu_le", { ascending: false }).limit(5000),
    /* b5_16 : absentes tant que la migration n'est pas posée ; le contrôle du dossier est alors vide */
    /* « * » : la colonne changements (b5_28) quand elle existe */
    supabase.from("lorani_controles").select("*").eq("client_id", moi.client_id).order("cree_le", { ascending: false }).limit(1000),
    supabase.from("lorani_controle_pieces").select("id, controle_id, piece_id, role, reference").eq("client_id", moi.client_id).limit(10000),
    supabase.from("lorani_constats").select("id, controle_id, nature, gravite, grandeur, objet, titre, correction, article, valeurs, statut, motif, precedent_id, corrige_au_controle, decide_par, decide_le").eq("client_id", moi.client_id).limit(10000),
    /* b5_17 : absente tant que la migration n'est pas posée ; le PLU est alors « non cherché » */
    supabase.from("lorani_plu").select("*").eq("client_id", moi.client_id).limit(1000),
    /* b5_18 : absente tant que la migration n'est pas posée ; les assurances sont alors vides */
    supabase.from("lorani_attestations").select("id, projet_id, intervenant_id, lot_id, piece_id, assureur, numero_police, assure, siren, activites, debut, fin, plafond_eur, statut, constats, verifie_le").eq("client_id", moi.client_id).limit(5000),
    /* b5_19 : absentes tant que la migration n'est pas posée */
    supabase.from("lorani_ordres_service").select("id, projet_id, marche_id, numero, nature, objet, emis_le, notifie_le, montant_ht, delai_jours, statut, reserves_entreprise, reserves_jusquau").eq("client_id", moi.client_id).order("numero").limit(5000),
    supabase.from("lorani_reserves").select("id, projet_id, lot_id, marche_id, numero, intitule, localisation, origine, constatee_le, lever_avant, statut, levee_le, motif").eq("client_id", moi.client_id).order("numero").limit(10000),
    /* b5_20 : absentes tant que la migration n'est pas posée */
    supabase.from("lorani_comptes_rendus").select("id, projet_id, numero, visite_le, presents, notes, avancement, avancement_lots, prochaine_visite, statut, diffuse_le, contenu").eq("client_id", moi.client_id).order("numero").limit(5000),
    supabase.from("lorani_points").select("id, projet_id, lot_id, intervenant_id, nature, texte, echeance, statut, reponse, repondu_le, ouvert_au_cr, clos_au_cr, cree_le, maj_le").eq("client_id", moi.client_id).order("cree_le").limit(20000),
    /* b5_21 : absente tant que la migration n'est pas posée */
    supabase.from("lorani_doe").select("id, projet_id, lot_id, nature, intitule, statut, piece_id, recu_le, motif").eq("client_id", moi.client_id).limit(20000),
    /* b5_26 : absentes tant que la migration n'est pas posée ; l'analyse des offres est alors vide */
    supabase.from("lorani_consultations").select("id, projet_id, lot_id, intitule, dpgf_piece_id, estimation_ht, seuil_ecart_pct, date_limite, statut, offre_retenue, tableau, analysee_le, cree_le").eq("client_id", moi.client_id).order("cree_le", { ascending: false }).limit(2000),
    supabase.from("lorani_offres").select("id, projet_id, consultation_id, piece_id, intervenant_id, entreprise, siren, montant_ht, montant_calcule_ht, montant_comparable_ht, rang, ecart_estimation_pct, reserves, constats, statut, motif, recue_le").eq("client_id", moi.client_id).limit(10000),
    /* b5_60 : absentes tant que la migration n'est pas posée ; l'agence n'a alors aucune liste */
    supabase.from("lorani_listes").select("id, nom, description, natures, phases, actif, version, points_nb, maj_le").eq("client_id", moi.client_id).order("nom").limit(50),
    supabase.from("lorani_liste_versions").select("id, liste_id, version, points, enregistre_par, enregistre_le").eq("client_id", moi.client_id).order("version", { ascending: false }).limit(2000),
    /* b5_50, b5_51 : absentes tant que les migrations ne sont pas posées ; b5_34 : le référentiel des index */
    supabase.from("lorani_avenants").select("id, projet_id, marche_id, numero, objet, montant_ht, statut, signe_le, integre_le, piece_id, motif").eq("client_id", moi.client_id).order("numero").limit(5000),
    supabase.from("lorani_lectures_chantier").select("id, projet_id, piece_id, nature, marche_id, valeurs, citations, constats, statut, poses, motif, cree_le").eq("client_id", moi.client_id).order("cree_le", { ascending: false }).limit(2000),
    supabase.from("lorani_ref_index_series").select("idbank, code, libelle, releve_le, erreur").order("code").limit(200),
    supabase.from("lorani_ref_index").select("idbank, mois, valeur, qualite").order("mois", { ascending: false }).limit(5000),
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
    marches: ((marches.data ?? []) as Marche[]).map((m) => ({ ...m, montant_ht: Number(m.montant_ht), avenants_ht: Number(m.avenants_ht), retenue_pct: Number(m.retenue_pct), revision_partie_fixe: m.revision_partie_fixe === undefined ? undefined : Number(m.revision_partie_fixe) })),
    situations: ((situations.data ?? []) as Situation[]).map((x) => ({ ...x, cumul_ht: Number(x.cumul_ht), cumul_admis_ht: x.cumul_admis_ht === null ? null : Number(x.cumul_admis_ht), revision: (x.revision ?? {}) as Revision })),
    visas: (visas.data ?? []) as Visa[],
    controles: (controles.data ?? []) as Controle[],
    controlePieces: (controlePieces.data ?? []) as ControlePiece[],
    constats: (constats.data ?? []) as Constat[],
    ordresService: ((ordresService.data ?? []) as OrdreService[]).map((x) => ({ ...x, montant_ht: Number(x.montant_ht) })),
    reserves: (reserves.data ?? []) as Reserve[],
    comptesRendus: (comptesRendus.data ?? []) as CompteRendu[],
    points: (points.data ?? []) as Point[],
    doe: (doe.data ?? []) as PieceDoe[],
    consultations: ((consultations.data ?? []) as Consultation[]).map((x) => ({ ...x, estimation_ht: nombre(x.estimation_ht), seuil_ecart_pct: Number(x.seuil_ecart_pct) })),
    offres: ((offres.data ?? []) as Offre[]).map((x) => ({ ...x, montant_ht: nombre(x.montant_ht), montant_calcule_ht: nombre(x.montant_calcule_ht), montant_comparable_ht: nombre(x.montant_comparable_ht), ecart_estimation_pct: nombre(x.ecart_estimation_pct) })),
    avenants: ((avenants.data ?? []) as Avenant[]).map((x) => ({ ...x, montant_ht: Number(x.montant_ht) })),
    lecturesChantier: (lecturesChantier.data ?? []) as LectureChantier[],
    indexSeries: (indexSeries.data ?? []) as IndexSerie[],
    indexValeurs: ((indexValeurs.data ?? []) as IndexValeur[]).map((x) => ({ ...x, valeur: Number(x.valeur) })),
    attestations: ((attestations.data ?? []) as Attestation[]).map((x) => ({ ...x, plafond_eur: x.plafond_eur === null ? null : Number(x.plafond_eur) })),
    /* « * » : les colonnes de b5_23 (servitudes, risques) quand elles existent ; la géométrie et les identifiants d'appel ne servent pas à l'écran */
    plu: ((plu.data ?? []) as (Plu & { geom?: unknown; complements?: unknown })[]).map((brut) => {
      const x = { ...brut };
      delete x.geom;
      delete x.complements;
      return { ...x, point_score: x.point_score === null ? null : Number(x.point_score) };
    }),
    pieces: ((pieces.data ?? []) as (Omit<PieceProjet, "cree_le"> & { recue_le: string | null })[]).map(({ recue_le, ...x }) => ({ ...x, cree_le: recue_le ?? undefined })),
    listes: (listes.data ?? []) as ListeAgence[],
    listeVersions: ((listeVersions.data ?? []) as VersionListe[]).map((v) => ({ ...v, points: v.points.map((x) => ({ ...x, seuil: x.seuil === undefined ? undefined : Number(x.seuil) })) })),
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

export async function poserMarche(v: { client_id: string; projet_id: string; lot_id: string; titulaire: string; montant_ht: number; avenants_ht: number; retenue_pct: number; avance_pct: number; penalite_jour_ht: number | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_marches").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function recevoirSituation(v: { client_id: string; projet_id: string; marche_id: string; numero: number; mois: string; cumul_ht: number; recue_le: string; retenue_deduite_ht: number | null; avance_remboursee_ht: number | null; penalites_ht: number | null }): Promise<void> {
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

/* ——— le PLU depuis l'adresse (b5_17) ——— */

export async function chercherPlu(projet: string): Promise<Plu> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lorani_chercher_plu", { p_projet: projet });
  if (error) throw new ErreurPorte(message(error));
  return data as Plu;
}

export async function suivrePlu(projet: string): Promise<Plu | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lorani_suivre_plu", { p_projet: projet });
  if (error) throw new ErreurPorte(message(error));
  return (data ?? null) as Plu | null;
}

/* ——— les décennales (b5_18) ——— */

export type SaisieAttestation = Pick<Attestation, "intervenant_id" | "assureur" | "numero_police" | "activites" | "debut" | "fin" | "plafond_eur">;

export async function saisirAttestation(v: SaisieAttestation & { client_id: string; projet_id: string; entite_id: string }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_attestations").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function corrigerAttestation(id: string, v: Partial<SaisieAttestation>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_attestations").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function changerActivitesLot(id: string, activites: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_lots").update({ activites_requises: activites }).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function poserOuvertureChantier(projet: string, date: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_projets").update({ ouverture_chantier: date }).eq("id", projet);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— les ordres de service, les réserves, la réception (b5_19) ——— */

export async function emettreOs(v: { client_id: string; entite_id: string; projet_id: string; marche_id: string; nature: OrdreService["nature"]; objet: string; emis_le: string; notifie_le: string | null; montant_ht: number; delai_jours: number }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_ordres_service").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function changerOs(id: string, v: Partial<Pick<OrdreService, "statut" | "reserves_entreprise" | "notifie_le">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_ordres_service").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function poserDelaiMarche(id: string, jours: number | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_marches").update({ delai_execution_jours: jours }).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function constaterReserve(v: { client_id: string; entite_id: string; projet_id: string; lot_id: string | null; intitule: string; localisation: string | null; origine: Reserve["origine"]; constatee_le: string; lever_avant: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_reserves").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function changerReserve(id: string, v: Partial<Pick<Reserve, "statut" | "motif" | "lever_avant" | "levee_le">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_reserves").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function poserReception(projet: string, date: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_projets").update({ reception_le: date }).eq("id", projet);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— les comptes rendus de chantier et leurs points (b5_20) ——— */

export async function creerCompteRendu(v: { client_id: string; entite_id: string; projet_id: string; visite_le: string; presents: CompteRendu["presents"]; notes: string | null; avancement: string | null; avancement_lots: Record<string, number>; prochaine_visite: string | null }): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from("lorani_comptes_rendus").insert(v).select("id").single();
  if (error) throw new ErreurPorte(message(error));
  return (data as { id: string }).id;
}

export async function majCompteRendu(id: string, v: Partial<Pick<CompteRendu, "visite_le" | "presents" | "notes" | "avancement" | "avancement_lots" | "prochaine_visite" | "statut">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_comptes_rendus").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

export async function ajouterPoints(v: { client_id: string; entite_id: string; projet_id: string; lot_id: string | null; intervenant_id: string | null; nature: Point["nature"]; texte: string; echeance: string | null; ouvert_au_cr: string | null }[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_points").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function majPoint(id: string, v: Partial<Pick<Point, "statut" | "reponse" | "echeance">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_points").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— l'analyse des offres (b5_26) ——— */

const nombre = (v: number | string | null) => (v === null || v === undefined ? null : Number(v));

export async function ouvrirConsultation(v: { client_id: string; projet_id: string; lot_id: string; intitule: string; estimation_ht: number | null; seuil_ecart_pct: number; date_limite: string | null; dpgf_piece_id: string | null }): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from("lorani_consultations").insert(v).select("id").single();
  if (error) throw new ErreurPorte(message(error));
  return (data as { id: string }).id;
}

/* ——— suspendre ou reprendre un contrôle (b5_29) ——— */

export async function suspendreControle(controle: string, motif: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_suspendre_controle", { p_controle: controle, p_motif: motif });
  if (error) throw new ErreurPorte(message(error));
}

export async function reprendreControle(controle: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_reprendre_controle", { p_controle: controle });
  if (error) throw new ErreurPorte(message(error));
}

/* b5_31 : les réglages des contrôles d'un projet ; réservé au gérant, à l'admin, au chef de projet */
/* b5_60 : enregistrer une liste de l'agence (nulle = nouvelle) ; chaque enregistrement fait la version suivante */
export async function enregistrerListe(client: string, liste: string | null, v: { nom: string; description: string | null; natures: string[]; phases: string[]; points: PointListe[] }): Promise<{ liste: string; version: number; points: PointListe[]; deja?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lorani_liste_enregistrer", { p_client: client, p_liste: liste, p_nom: v.nom, p_description: v.description, p_natures: v.natures, p_phases: v.phases, p_points: v.points });
  if (error) throw new ErreurPorte(message(error));
  return data as { liste: string; version: number; points: PointListe[]; deja?: boolean };
}
export async function activerListe(liste: string, actif: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_liste_activer", { p_liste: liste, p_actif: actif });
  if (error) throw new ErreurPorte(message(error));
}

export async function reglerControles(projet: string, tolerances: Record<string, number>, coupees: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_regler_controles", { p_projet: projet, p_tolerances: tolerances, p_familles_coupees: coupees });
  if (error) throw new ErreurPorte(message(error));
}

/* b5_30 : qui décide des constats d'un contrôle (nul = toute l'équipe) ; réservé au gérant, à l'admin, au chef de projet */
export async function choisirDecideur(controle: string, personne: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_choisir_decideur", { p_controle: controle, p_personne: personne });
  if (error) throw new ErreurPorte(message(error));
}

export async function analyserOffres(consultation: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_analyser_offres", { p_consultation: consultation });
  if (error) throw new ErreurPorte(message(error));
}

export async function attribuerOffre(offre: string, motif: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_attribuer_offre", { p_offre: offre, p_motif: motif });
  if (error) throw new ErreurPorte(message(error));
}

export async function ecarterOffre(offre: string, motif: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_offres").update({ statut: "ecartee", motif }).eq("id", offre);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— le DOE (b5_21) ——— */

export async function preparerDoe(projet: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lorani_preparer_doe", { p_projet: projet });
  if (error) throw new ErreurPorte(message(error));
  return Number(data ?? 0);
}

export async function majDoe(id: string, v: Partial<Pick<PieceDoe, "statut" | "piece_id" | "motif" | "recu_le">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_doe").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— la révision des prix (b5_34) ——— */

export async function poserRevision(id: string, v: { revision_idbank: string | null; revision_mois_zero: string | null; revision_partie_fixe: number }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_marches").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— les avenants (b5_50) ——— */

export async function preparerAvenant(v: { client_id: string; entite_id: string; projet_id: string; marche_id: string; objet: string; montant_ht: number; statut: "a_signer" | "signe"; signe_le: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_avenants").insert(v);
  if (error) throw new ErreurPorte(message(error));
}

export async function changerAvenant(id: string, v: { statut: "signe"; signe_le: string } | { statut: "abandonne"; motif: string }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("lorani_avenants").update(v).eq("id", id);
  if (error) throw new ErreurPorte(message(error));
}

/* ——— les pièces de chantier lues (b5_51) ——— */

export async function confirmerLectureChantier(id: string, marche: string | null, valeurs: Record<string, unknown> | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_confirmer_lecture_chantier", { p_lecture: id, p_marche: marche, p_valeurs: valeurs });
  if (error) throw new ErreurPorte(message(error));
}

export async function ecarterLectureChantier(id: string, motif: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("lorani_ecarter_lecture_chantier", { p_lecture: id, p_motif: motif });
  if (error) throw new ErreurPorte(message(error));
}
