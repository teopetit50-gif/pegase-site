/* ══════════════════════════════════════════════════════════════════════
   Les portes FILED — côté navigateur, sous RLS (05/10/2026)

   Lecture : filed_documents (la liste), puis le DOSSIER d'un document
   (filed_factures, lignes, tva, controles, levees, fournisseur, ibans,
   rapprochement, historique, pièce + pages + valeurs) quand on l'ouvre.
   Écriture : UNIQUEMENT par les portes publiques — jamais d'UPDATE :
     filed_corriger_facture(p_facture, p_valeurs jsonb, p_motif) → text
     filed_confirmer_valeurs(p_facture, p_champs text[]) → text
     filed_lever_anomalie(p_facture, p_code, p_motif) → text
     filed_classer_document(p_document, p_nature, p_motif) → text
     filed_rattacher_fournisseur(p_facture, p_fournisseur, p_motif)
     filed_proposer_iban(p_fournisseur, p_iban, p_motif) → uuid
     filed_bloquer_fournisseur(p_fournisseur, p_bloquer bool, p_motif)
     filed_rattacher_commande(p_facture, p_commande, p_motif)
     filed_apparier_ligne(p_facture, p_facture_ligne, p_commande_ligne, p_motif)
     filed_confirmer_fournisseur(p_fournisseur, p_motif) → int (a4_10 :
       gérant, admin, valideur ; jamais le déposant de la pièce d'origine)
     filed_attester_identite(p_fournisseur, p_motif) (a4_10 : une personne
       atteste l'identité quand le registre se tait)
     identite_demander(p_client, p_registre, p_identifiant, p_fournisseur,
       p_force) → uuid (b7_02 : « revérifier » ; l'ouvrier identite répond
       en une à deux minutes et remplit le verdict du fournisseur)
     filed_deposer_piece(p_client, p_document, p_nom_fichier, p_mime,
       p_octets, p_sha256, p_chemin, p_entite, p_source, p_expediteur) → jsonb,
       le fichier étant d'abord mis dans le bucket omega-clients sous
       <client_id>/filed_document/<document_id>/<nom>.
   Signatures lues dans le message du coordinateur du 05/10 ; si la base
   répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { chargerFactureElectronique } from "./factureElectronique";
import type { Commande, DocumentFiled, DossierFiled, Facture, Fournisseur, IbanFournisseur, LigneCommande, MotifRefus, NatureDocument } from "../types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

export type Apercu = { document: DocumentFiled; facture: Facture | null; fournisseur: Fournisseur | null };

export async function chargerListe(): Promise<{ apercus: Apercu[]; motifs: MotifRefus[] }> {
  const supabase = createClient();
  const [docs, motifs] = await Promise.all([
    supabase.from("filed_documents").select("*").order("recu_le", { ascending: false }).limit(200),
    supabase.from("filed_motifs_refus").select("code, libelle, description"),
  ]);
  if (docs.error) throw new ErreurPorte(message(docs.error));
  const documents = (docs.data ?? []) as DocumentFiled[];
  const ids = documents.map((d) => d.id);
  let factures: Facture[] = [];
  let fournisseurs: Fournisseur[] = [];
  if (ids.length) {
    const f = await supabase.from("filed_factures").select("*").in("document_id", ids);
    factures = (f.data ?? []) as Facture[];
    const fids = Array.from(new Set(factures.map((x) => x.fournisseur_id).filter(Boolean))) as string[];
    if (fids.length) {
      const fo = await supabase.from("filed_fournisseurs").select("*").in("id", fids);
      fournisseurs = (fo.data ?? []) as Fournisseur[];
    }
  }
  return {
    apercus: documents.map((document) => {
      const facture = factures.filter((x) => x.document_id === document.id).sort((a, b) => b.version - a.version)[0] ?? null;
      return { document, facture, fournisseur: facture?.fournisseur_id ? fournisseurs.find((x) => x.id === facture.fournisseur_id) ?? null : null };
    }),
    motifs: (motifs.data ?? []) as MotifRefus[],
  };
}

export async function chargerDossier(a: Apercu): Promise<DossierFiled> {
  const supabase = createClient();
  const fid = a.facture?.id;
  const pid = a.document.piece_id;
  const [lignes, tva, controles, levees, ibans, rapp, hist, piece, pages, valeurs, appar] = await Promise.all([
    fid ? supabase.from("filed_factures_lignes").select("*").eq("facture_id", fid).order("rang") : null,
    fid ? supabase.from("filed_factures_tva").select("*").eq("facture_id", fid) : null,
    fid ? supabase.from("filed_controles").select("*").eq("facture_id", fid).eq("version", a.facture!.version).order("cree_le") : null,
    fid ? supabase.from("filed_levees").select("*").eq("facture_id", fid) : null,
    a.fournisseur ? supabase.from("filed_fournisseurs_ibans").select("*").eq("fournisseur_id", a.fournisseur.id) : null,
    fid ? supabase.from("filed_rapprochements").select("*").eq("facture_id", fid).order("cree_le", { ascending: false }).limit(1) : null,
    supabase.from("filed_historique").select("*").eq("document_id", a.document.id).order("survenu_le"),
    pid ? supabase.from("pieces").select("*").eq("id", pid).maybeSingle() : null,
    pid ? supabase.from("pieces_pages").select("n, texte, largeur, hauteur").eq("piece_id", pid).order("n") : null,
    pid ? supabase.from("pieces_valeurs").select("*").eq("piece_id", pid) : null,
    fid ? supabase.from("filed_appariements").select("facture_ligne_id, commande_ligne_id").eq("facture_id", fid) : null,
  ]);
  return {
    document: a.document,
    facture: a.facture,
    fournisseur: a.fournisseur,
    lignes: (lignes?.data ?? []) as DossierFiled["lignes"],
    tva: (tva?.data ?? []) as DossierFiled["tva"],
    controles: (controles?.data ?? []) as DossierFiled["controles"],
    levees: (levees?.data ?? []) as DossierFiled["levees"],
    ibans: (ibans?.data ?? []) as DossierFiled["ibans"],
    rapprochement: ((rapp?.data ?? [])[0] ?? null) as DossierFiled["rapprochement"],
    historique: (hist.data ?? []) as DossierFiled["historique"],
    piece: (piece?.data ?? null) as DossierFiled["piece"],
    pages: (pages?.data ?? []) as DossierFiled["pages"],
    valeurs: (valeurs?.data ?? []) as DossierFiled["valeurs"],
    appariements: (appar?.data ?? []) as DossierFiled["appariements"],
    origine_deposee_par: await deposantOrigine(a),
    reponses: await chargerReponses(a.document.id).catch(() => []),
    decoupage: await chargerDecoupage(a, (piece?.data ?? null) as { piece_mere_id?: string | null } | null).catch(() => null),
    ...(await chargerFactureElectronique(a.document.id, fid ?? null).catch(() => ({}))),
  };
}

/* les réponses préparées au fournisseur (public.filed_reponses, a4_38 : en production, migration absente du
   dépôt) ; aucune porte publique pour les préparer : lecture seule */
async function chargerReponses(document: string): Promise<NonNullable<DossierFiled["reponses"]>> {
  const { data, error } = await createClient()
    .from("filed_reponses")
    .select("id, sorte, destinataire_adresse, destinataire_nom, sujet, corps, statut, demande_id, motif, prepare_le, decide_le")
    .eq("document_id", document)
    .order("prepare_le", { ascending: false });
  if (error) return [];
  return (data ?? []) as NonNullable<DossierFiled["reponses"]>;
}

/* la vue cabinet (public.filed_vue_ensemble, a4_52 : en production, migration absente du dépôt) */
export type DossierCabinet = { client_id: string; organisation: string; role: string; epingle: boolean; rang: number | null; pieces_mois: number; quota: number | null; etat_quota: string | null; bloquees: number; attente: number; a_completer: number; litiges: number; a_payer_30j: number; en_retard: number; dernier_recu_le: string | null; erreur: string | null };
export const vueEnsemble = () => rpc<DossierCabinet[]>("filed_vue_ensemble", {});

/* une pièce fille (a4_21, pieces.piece_mere_id) : le fichier d'origine et les
   documents nés du même fichier — lecture seule des tables pieces et filed_documents */
async function chargerDecoupage(a: Apercu, piece: { piece_mere_id?: string | null } | null): Promise<DossierFiled["decoupage"]> {
  const mereId = piece?.piece_mere_id;
  if (!mereId) return null;
  const supabase = createClient();
  const [mere, filles] = await Promise.all([
    supabase.from("pieces").select("nom_fichier, nb_pages").eq("id", mereId).maybeSingle(),
    supabase.from("pieces").select("id").eq("piece_mere_id", mereId),
  ]);
  if (!mere.data) return null;
  const ids = (filles.data ?? []).map((x: { id: string }) => x.id);
  const docs = ids.length ? await supabase.from("filed_documents").select("id, reference, piece_id").in("piece_id", ids) : null;
  return {
    mere: (mere.data as { nom_fichier: string }).nom_fichier,
    nb_pages: (mere.data as { nb_pages: number | null }).nb_pages,
    soeurs: ((docs?.data ?? []) as { id: string; reference: string }[]).filter((x) => x.id !== a.document.id).map((x) => ({ document_id: x.id, reference: x.reference })),
  };
}

/* qui a déposé la pièce qui a fait naître le fournisseur (null si inconnu) */
async function deposantOrigine(a: Apercu): Promise<string | null> {
  const origine = a.fournisseur?.document_origine;
  if (!origine) return null;
  if (origine === a.document.id) return a.document.depose_par ?? null;
  const { data } = await createClient().from("filed_documents").select("depose_par").eq("id", origine).maybeSingle();
  return ((data as { depose_par?: string | null } | null)?.depose_par ?? null);
}

export async function chargerCommandes(): Promise<{ commandes: Commande[]; lignes: LigneCommande[] }> {
  const supabase = createClient();
  const c = await supabase.from("filed_commandes").select("id, numero, date_commande, devise, montant_ht, statut, fournisseur_id, reference_externe").neq("statut", "annulee").order("date_commande", { ascending: false }).limit(300);
  if (c.error) throw new ErreurPorte(message(c.error));
  const commandes = (c.data ?? []) as Commande[];
  let lignes: LigneCommande[] = [];
  if (commandes.length) {
    const l = await supabase.from("filed_commandes_lignes").select("id, commande_id, rang, designation, quantite, unite, prix_unitaire, montant_ht").in("commande_id", commandes.map((x) => x.id)).order("rang");
    lignes = (l.data ?? []) as LigneCommande[];
  }
  return { commandes, lignes };
}

async function sha256Hex(fichier: File): Promise<string> {
  const empreinte = await crypto.subtle.digest("SHA-256", await fichier.arrayBuffer());
  return Array.from(new Uint8Array(empreinte)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Déposer un document depuis l'espace : le fichier dans le bucket, puis la
   porte du module qui crée le document (numéroté) et sa pièce, et dépose
   le travail de lecture. Elle rend {document, reference, piece, etat,
   doublon_de} (coordinateur, 05/10) : la référence sert au message, et un
   `doublon_de` dit que le fichier était déjà connu. */
export type Depot = { document_id: string; reference: string | null; etat: string | null; doublon_de: string | null };

export async function deposerDocument(o: { client_id: string; entite_id: string | null; fichier: File; expediteur: string | null }): Promise<Depot> {
  const supabase = createClient();
  const document_id = crypto.randomUUID();
  const nom = o.fichier.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const mime = o.fichier.type || "application/octet-stream";
  const chemin = `${o.client_id}/filed_document/${document_id}/${nom}`;
  const envoi = await supabase.storage.from("omega-clients").upload(chemin, o.fichier, { upsert: false, contentType: mime });
  if (envoi.error) throw new ErreurPorte(message(envoi.error));
  const resultat = await rpc<Record<string, unknown>>("filed_deposer_piece", {
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
  const r = resultat && typeof resultat === "object" ? resultat : {};
  const texte = (v: unknown) => (typeof v === "string" ? v : null);
  return { document_id: texte(r.document) ?? document_id, reference: texte(r.reference), etat: texte(r.etat), doublon_de: texte(r.doublon_de) };
}

export async function monClient(): Promise<{ user_id: string; client_id: string; email: string | null; role: string | null; entites: { id: string; nom: string; siren?: string | null }[] } | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string; role: string | null } | undefined;
  if (!c) return null;
  const e = await supabase.from("entites").select("id, nom, siren").eq("client_id", c.client_id).order("principale", { ascending: false });
  /* le SIREN n'est peut-être pas lisible : on retombe sur id et nom */
  const ent = e.error ? await supabase.from("entites").select("id, nom").eq("client_id", c.client_id).order("principale", { ascending: false }) : e;
  return { user_id: auth.user.id, client_id: c.client_id, email: auth.user.email ?? null, role: c.role ?? null, entites: (ent.data ?? []) as { id: string; nom: string; siren?: string | null }[] };
}

export async function chargerFournisseurs(): Promise<Fournisseur[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("filed_fournisseurs").select("*").order("nom").limit(500);
  if (error) throw new ErreurPorte(message(error));
  return (data ?? []) as Fournisseur[];
}

/* La vue « Fournisseurs » : tous les fournisseurs, leurs IBAN, leurs
   factures (avec la référence du document), et qui a déposé la pièce
   d'origine de chacun (il ne le confirme pas). */
export type FactureDuFournisseur = {
  id: string;
  numero: string | null;
  statut: Facture["statut"];
  nature: Facture["nature"];
  montant_ttc: number | null;
  net_a_payer: number | null;
  devise: string;
  date_emission: string | null;
  echeance_lue: string | null;
  iban: string | null;
  fournisseur_id: string | null;
  reference: string | null;
};
export type VueFournisseurs = { fournisseurs: Fournisseur[]; ibans: IbanFournisseur[]; factures: FactureDuFournisseur[]; deposants: Record<string, string | null> };

export async function chargerVueFournisseurs(): Promise<VueFournisseurs> {
  const supabase = createClient();
  const [fo, ib, fa] = await Promise.all([
    supabase.from("filed_fournisseurs").select("*").order("nom").limit(1000),
    supabase.from("filed_fournisseurs_ibans").select("id, fournisseur_id, iban_masque, statut, propose_le").limit(2000),
    supabase.from("filed_factures").select("id, numero, statut, nature, montant_ttc, net_a_payer, devise, date_emission, echeance_lue, iban, fournisseur_id, document_id, version").not("fournisseur_id", "is", null).order("date_emission", { ascending: false }).limit(1000),
  ]);
  if (fo.error) throw new ErreurPorte(message(fo.error));
  const fournisseurs = (fo.data ?? []) as Fournisseur[];
  const lignes = (fa.data ?? []) as (Omit<FactureDuFournisseur, "reference"> & { document_id: string; version: number })[];
  /* une facture par document : sa dernière version */
  const parDocument = new Map<string, (typeof lignes)[number]>();
  for (const l of lignes) if ((parDocument.get(l.document_id)?.version ?? -1) < l.version) parDocument.set(l.document_id, l);
  const origines = fournisseurs.map((f) => f.document_origine).filter(Boolean) as string[];
  const docIds = Array.from(new Set([...parDocument.keys(), ...origines]));
  const docs = docIds.length ? await supabase.from("filed_documents").select("id, reference, depose_par").in("id", docIds) : null;
  const doc = new Map(((docs?.data ?? []) as { id: string; reference: string; depose_par: string | null }[]).map((d) => [d.id, d]));
  return {
    fournisseurs,
    ibans: (ib.data ?? []) as IbanFournisseur[],
    factures: Array.from(parDocument.values()).map((f) => ({ id: f.id, numero: f.numero, statut: f.statut, nature: f.nature ?? "facture", montant_ttc: f.montant_ttc, net_a_payer: f.net_a_payer, devise: f.devise ?? "EUR", date_emission: f.date_emission, echeance_lue: f.echeance_lue, iban: f.iban, fournisseur_id: f.fournisseur_id, reference: doc.get(f.document_id)?.reference ?? null })),
    deposants: Object.fromEntries(fournisseurs.map((f) => [f.id, f.document_origine ? (doc.get(f.document_origine)?.depose_par ?? null) : null])),
  };
}

async function rpc<T = unknown>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

/* 26/10/2026 (a4_92, a4_94) : les factures refusées, leur motif et le geste qui reste ; le classement sans suite
   (gérant, admin, valideur, motif de 5 caractères au moins ; la facture reste refusée, rien n'est effacé). */
export type Refusee = {
  facture_id: string;
  reference: string | null;
  numero: string | null;
  fournisseur: string | null;
  montant_ttc: number | null;
  refusee_le: string | null;
  motif: string;
  reprise: "a_faire" | "proposee" | "impossible" | "aucune";
  reprise_motif: string | null;
  corriger_avant: string | null;
  classee_le: string | null;
  classee_motif: string | null;
  geste: string;
};
export const chargerRefusees = (p_client: string, p_avec_classees: boolean) => rpc<Refusee[]>("filed_factures_refusees", { p_client, p_entite: null, p_avec_classees });
export const classerRefusee = (p_facture: string, p_motif: string) => rpc<string>("filed_classer_refusee", { p_facture, p_motif });

export const corrigerFacture =(p_facture: string, p_valeurs: Record<string, unknown>, p_motif: string) => rpc<string>("filed_corriger_facture", { p_facture, p_valeurs, p_motif });
export const confirmerValeurs = (p_facture: string, p_champs: string[]) => rpc<string>("filed_confirmer_valeurs", { p_facture, p_champs });
export const leverAnomalie = (p_facture: string, p_code: string, p_motif: string) => rpc<string>("filed_lever_anomalie", { p_facture, p_code, p_motif });
export const classerDocument = (p_document: string, p_nature: NatureDocument, p_motif: string) => rpc<string>("filed_classer_document", { p_document, p_nature, p_motif });
export const rattacherFournisseur = (p_facture: string, p_fournisseur: string, p_motif: string) => rpc("filed_rattacher_fournisseur", { p_facture, p_fournisseur, p_motif });
export const proposerIban = (p_fournisseur: string, p_iban: string, p_motif: string) => rpc<string>("filed_proposer_iban", { p_fournisseur, p_iban, p_motif });
export const bloquerFournisseur = (p_fournisseur: string, p_bloquer: boolean, p_motif: string) => rpc("filed_bloquer_fournisseur", { p_fournisseur, p_bloquer, p_motif });
export const rattacherCommande = (p_facture: string, p_commande: string, p_motif: string) => rpc("filed_rattacher_commande", { p_facture, p_commande, p_motif });
export const confirmerFournisseur = (p_fournisseur: string, p_motif: string) => rpc<number>("filed_confirmer_fournisseur", { p_fournisseur, p_motif: p_motif || null });
export const attesterIdentite = (p_fournisseur: string, p_motif: string) => rpc("filed_attester_identite", { p_fournisseur, p_motif });
export const demanderVerification = (p_client: string, p_registre: "sirene" | "vies", p_identifiant: string, p_fournisseur: string) =>
  rpc<string>("identite_demander", { p_client, p_registre, p_identifiant, p_fournisseur, p_force: true });
/* a4_15 : le paiement d'une facture validée. filed_etat_paiement est une
   lecture sous RLS ; sa forme (objet ou ligne de table) est normalisée. */
export type EtatPaiement = { du: number; regle: number; reste: number; etat: "a_payer" | "partielle" | "payee"; dernier_le: string | null; nb_reglements: number };
export const MOYENS_PAIEMENT = ["virement", "prelevement", "cheque", "carte", "especes", "compensation", "autre"] as const;
export type MoyenPaiement = (typeof MOYENS_PAIEMENT)[number];
export async function etatPaiement(p_facture: string): Promise<EtatPaiement | null> {
  const r = await rpc<unknown>("filed_etat_paiement", { p_facture });
  const o = (Array.isArray(r) ? r[0] : r) as Record<string, unknown> | null | undefined;
  if (!o || typeof o !== "object") return null;
  const n = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));
  return { du: n(o.du), regle: n(o.regle), reste: n(o.reste), etat: (o.etat as EtatPaiement["etat"]) ?? "a_payer", dernier_le: (o.dernier_le as string | null) ?? null, nb_reglements: n(o.nb_reglements) };
}
export const noterPaiement = (o: { facture: string; date: string | null; montant: number | null; moyen: MoyenPaiement | null; reference: string | null }) =>
  rpc<string>("filed_noter_paiement", { p_facture: o.facture, p_date: o.date, p_montant: o.montant, p_moyen: o.moyen, p_reference: o.reference });
export const apparierLigne = (p_facture: string, p_facture_ligne: string, p_commande_ligne: string, p_motif: string) => rpc("filed_apparier_ligne", { p_facture, p_facture_ligne, p_commande_ligne, p_motif });

/* Le pilotage (a4_06) : l'engagé du mois par société, fournisseur et centre de coût, et le délai de traitement
   de la réception au classement. Deux portes en lecture, ouvertes aux lecteurs du client. */
export type LigneEngage = { entite_id: string | null; entite: string | null; fournisseur_id: string | null; fournisseur: string; centre_id: string | null; centre: string; nb_factures: number; montant_ht: number; montant_ttc: number };
export type DelaiTraitement = { nb_factures: number; delai_moyen_jours: number | null; delai_median_jours: number | null; delai_max_jours: number | null };
export const engageMois = (p_client: string, p_mois: string) => rpc<LigneEngage[]>("filed_engage_mois", { p_client, p_mois });
export const delaiTraitement = async (p_client: string) => ((await rpc<DelaiTraitement[]>("filed_delai_traitement", { p_client })) ?? [])[0] ?? null;

/* 04/11 — La piste d'audit et la vérification d'archive (a4_05, promesse FILED n° 48) : deux portes en lecture,
   ouvertes au gérant, à l'admin, au valideur et au collaborateur qui voient la pièce.
     filed_piste_audit(p_facture) → table (survenu_le, source, etape, message, acteur, detail) : réception,
       historique, contrôles, demandes et décisions, imputations, archives, lignes du journal opposable ;
     filed_verifier_archive(p_facture) → jsonb : { archivee, integre, version, version_courante, empreinte_archive,
       empreinte_recalculee, journal, journal_porte_empreinte, archive_le } ou { archivee: false, motif }. */
export type LignePiste = { survenu_le: string; source: string; etape: string; message: string; acteur: string | null; detail: Record<string, unknown> | null };
export type VerificationArchive = {
  archivee: boolean;
  integre?: boolean | null;
  motif?: string;
  version?: number;
  version_courante?: number;
  empreinte_archive?: string;
  empreinte_recalculee?: string;
  journal?: number | null;
  journal_porte_empreinte?: boolean;
  archive_le?: string;
};
export const pisteAudit = async (p_facture: string) => (await rpc<LignePiste[]>("filed_piste_audit", { p_facture })) ?? [];
export const verifierArchive = (p_facture: string) => rpc<VerificationArchive>("filed_verifier_archive", { p_facture });

/* 04/11 — L'imputation d'une facture (filed_imputations, filed_plan_comptable, filed_centres_cout, a4_01) et son
   exercice (filed_factures_exercices, a4_02), en lecture sous RLS (promesses FILED n° 37 et 45). */
export type ImputationLue = { rang: number; compte: string; compte_libelle: string | null; centre: string | null; centre_libelle: string | null; montant_ht: number | null; statut: string; origine: string; confiance: number | null; mention: string | null };
export type ExerciceLu = { libelle: string | null; orientee: boolean; mention: string | null };
export async function chargerImputation(p_facture: string): Promise<{ lignes: ImputationLue[]; exercice: ExerciceLu | null }> {
  const supabase = createClient();
  const [im, ex] = await Promise.all([
    supabase
      .from("filed_imputations")
      .select("rang, montant_ht, statut, origine, confiance, mention, compte:filed_plan_comptable(numero, libelle), centre:filed_centres_cout(code, libelle)")
      .eq("facture_id", p_facture)
      .in("statut", ["proposee", "validee"])
      .order("rang"),
    supabase.from("filed_factures_exercices").select("exercice_id, orientee, mention").eq("facture_id", p_facture).maybeSingle(),
  ]);
  if (im.error) throw new ErreurPorte(message(im.error));
  const un = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));
  const lignes = ((im.data ?? []) as Record<string, unknown>[]).map((l) => {
    const c = un(l.compte as { numero: string; libelle: string } | null);
    const k = un(l.centre as { code: string; libelle: string } | null);
    return {
      rang: Number(l.rang ?? 1),
      compte: c?.numero ?? "—",
      compte_libelle: c?.libelle ?? null,
      centre: k?.code ?? null,
      centre_libelle: k?.libelle ?? null,
      montant_ht: l.montant_ht === null || l.montant_ht === undefined ? null : Number(l.montant_ht),
      statut: String(l.statut ?? ""),
      origine: String(l.origine ?? ""),
      confiance: l.confiance === null || l.confiance === undefined ? null : Number(l.confiance),
      mention: (l.mention as string | null) ?? null,
    };
  });
  let exercice: ExerciceLu | null = null;
  const e = ex.data as { exercice_id: string | null; orientee: boolean; mention: string | null } | null;
  if (e) {
    const lib = e.exercice_id ? await supabase.from("filed_exercices").select("libelle").eq("id", e.exercice_id).maybeSingle() : null;
    exercice = { libelle: (lib?.data as { libelle: string } | null)?.libelle ?? null, orientee: !!e.orientee, mention: e.mention ?? null };
  }
  return { lignes, exercice };
}

/* 04/11 — Les centres de coût et ce qui leur est imputé, pour Comptabilité (promesse FILED n° 45) */
export type CentreLu = { code: string; libelle: string; actif: boolean; nb_factures: number; montant_ht: number; nb_validees: number };
export async function chargerCentres(p_client: string): Promise<CentreLu[]> {
  const supabase = createClient();
  const [cs, im] = await Promise.all([
    supabase.from("filed_centres_cout").select("id, code, libelle, actif").eq("client_id", p_client).order("code"),
    supabase.from("filed_imputations").select("facture_id, centre_id, montant_ht, statut").eq("client_id", p_client).in("statut", ["proposee", "validee"]),
  ]);
  if (cs.error) throw new ErreurPorte(message(cs.error));
  const lignes = (im.data ?? []) as { facture_id: string; centre_id: string | null; montant_ht: number; statut: string }[];
  return ((cs.data ?? []) as { id: string; code: string; libelle: string; actif: boolean }[]).map((c) => {
    const l = lignes.filter((x) => x.centre_id === c.id);
    return {
      code: c.code,
      libelle: c.libelle,
      actif: c.actif,
      nb_factures: new Set(l.map((x) => x.facture_id)).size,
      montant_ht: Math.round(l.reduce((s, x) => s + Number(x.montant_ht ?? 0), 0) * 100) / 100,
      nb_validees: new Set(l.filter((x) => x.statut === "validee").map((x) => x.facture_id)).size,
    };
  });
}
