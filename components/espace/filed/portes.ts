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
   Signatures lues dans le message du coordinateur du 05/10 ; si la base
   répond autrement, l'écran montre son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { DocumentFiled, DossierFiled, Facture, Fournisseur, MotifRefus, NatureDocument } from "../types";

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
  const [lignes, tva, controles, levees, ibans, rapp, hist, piece, pages, valeurs] = await Promise.all([
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
  };
}

export async function chargerFournisseurs(): Promise<Fournisseur[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("filed_fournisseurs").select("*").order("nom").limit(500);
  if (error) throw new ErreurPorte(message(error));
  return (data ?? []) as Fournisseur[];
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
