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

export async function monClient(): Promise<{ user_id: string; client_id: string; email: string | null; entites: { id: string; nom: string }[] } | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string } | undefined;
  if (!c) return null;
  const e = await supabase.from("entites").select("id, nom").eq("client_id", c.client_id).order("principale", { ascending: false });
  return { user_id: auth.user.id, client_id: c.client_id, email: auth.user.email ?? null, entites: (e.data ?? []) as { id: string; nom: string }[] };
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

export const corrigerFacture = (p_facture: string, p_valeurs: Record<string, unknown>, p_motif: string) => rpc<string>("filed_corriger_facture", { p_facture, p_valeurs, p_motif });
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
export const apparierLigne = (p_facture: string, p_facture_ligne: string, p_commande_ligne: string, p_motif: string) => rpc("filed_apparier_ligne", { p_facture, p_facture_ligne, p_commande_ligne, p_motif });
