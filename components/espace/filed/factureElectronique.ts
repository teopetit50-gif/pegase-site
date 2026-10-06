/* ══════════════════════════════════════════════════════════════════════
   FILED — la facture électronique, son cycle de vie, ses écritures, le FEC
   (06/10/2026, d'après la fiche d'A4 : omega/FILED-ECRAN-A3.md, a4_15 à
   a4_18). Lecture sous RLS ou par les fonctions nommées ; écriture par les
   portes publiques seulement. Les messages d'erreur de la base sont écrits
   pour être montrés : l'écran les affiche tels quels.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { DossierFiled } from "../types";

export class ErreurBase extends Error {
  constructor(message: string, public code: string | null) {
    super(message);
  }
}
function erreur(e: unknown): ErreurBase {
  const o = (e ?? {}) as { message?: string; code?: string };
  return new ErreurBase(o.message ?? "La base n'a pas répondu.", o.code ?? null);
}

/* ——— 1. la provenance ——— */
export type Provenance = "structuree" | "lue" | "saisie";
export type Pastille = { cle: "electronique" | "structure" | "lue" | "saisie"; libelle: string; aide: string };

/* nulle avant le lot 9 : structurée si la pièce porte une valeur xml sur numero ou montant_ttc */
export function provenanceDe(d: DossierFiled): Provenance {
  const p = d.facture?.provenance;
  if (p === "structuree" || p === "lue" || p === "saisie") return p;
  const xml = d.valeurs.some((v) => v.source === "xml" && /(^|\.)(numero|montant_ttc|ttc)$/.test(v.champ));
  return xml ? "structuree" : "lue";
}

export function pastilleProvenance(d: DossierFiled): Pastille {
  const p = provenanceDe(d);
  if (p === "structuree" && d.recuePlateforme) return { cle: "electronique", libelle: "Facture électronique", aide: "Reçue par la plateforme agréée. Ses données viennent du fichier structuré et font foi." };
  if (p === "structuree") return { cle: "structure", libelle: "Fichier structuré", aide: "Factur-X, UBL ou CII reçu par un autre canal : ses données viennent du fichier et font foi." };
  if (p === "saisie") return { cle: "saisie", libelle: "Saisie", aide: "Saisie à la main, sans pièce lue." };
  return { cle: "lue", libelle: "Lue sur la pièce", aide: "Lue sur le PDF ou l'image ; chaque valeur est vérifiée sur la page citée." };
}

export const AIDE_FAIT_FOI = "Valeur du fichier structuré : elle fait foi. Pour la contester, refusez la facture ou ouvrez un litige.";

/* ——— 3. le cycle de vie ——— */
export type LigneCycle = {
  code: number;
  libelle: string;
  survenu_le: string;
  motif_code: string | null;
  motif_libelle: string | null;
  motif: string | null;
  montant: number | null;
  etat: "a_emettre" | "en_cours" | "emis" | "echec" | "sans_objet" | string;
  emis_le: string | null;
  sens: "emis" | "recu";
  erreur: string | null;
  obligatoire: boolean;
};

export const quand = (iso: string) => {
  const d = new Date(iso);
  const j = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${j} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`;
};

export function texteEtat(l: LigneCycle): { texte: string; teinte: "rouge" | "gris" | null } {
  if (l.sens === "recu") return { texte: "Reçu du fournisseur", teinte: null };
  if (l.etat === "a_emettre") return { texte: "À transmettre au fournisseur", teinte: null };
  if (l.etat === "en_cours") return { texte: "Transmission en cours", teinte: null };
  if (l.etat === "emis") return { texte: `Transmis au fournisseur le ${l.emis_le ? quand(l.emis_le) : "—"}`, teinte: null };
  if (l.etat === "echec") return { texte: `Non transmis : ${l.erreur ?? "erreur non précisée"}`, teinte: "rouge" };
  if (l.etat === "sans_objet") return { texte: "Noté (facture reçue hors plateforme : rien à transmettre)", teinte: "gris" };
  return { texte: l.etat, teinte: null };
}

/* ——— 4. le litige ——— */
export type Litige = { id: string; ouvert_le: string; motif: string; clos_le: string | null; issue: string | null };
export type MotifLitige = { code: string; libelle: string };

/* les motifs normalisés du statut 207 (a4_16) — l'exemple et le repli si la lecture échoue */
export const MOTIFS_207: MotifLitige[] = [
  { code: "CALCUL_ERR", libelle: "Erreur de calcul" },
  { code: "CONTRAT_TERM", libelle: "Contrat terminé" },
  { code: "DEST_ERR", libelle: "Destinataire erroné" },
  { code: "EMMET_INC", libelle: "Émetteur inconnu" },
  { code: "DOUBLON", libelle: "Facture en double" },
  { code: "NON_CONFORME", libelle: "Mention légale manquante, facture non conforme" },
  { code: "MONTANTTOTAL_ERR", libelle: "Montant total erroné" },
  { code: "TX_TVA_ERR", libelle: "Taux de TVA erroné" },
  { code: "TRANSAC_INC", libelle: "Transaction inconnue" },
];

/* ——— 6. les écritures ——— */
export type Ecriture = {
  journal_code: string;
  journal_lib: string;
  ecriture_num: number;
  ecriture_date: string;
  compte_num: string;
  compte_lib: string;
  comp_aux_num: string | null;
  debit: number;
  credit: number;
  ecriture_let: string | null;
  date_let: string | null;
};

/* ——— lecture d'un dossier : ce que la facture électronique ajoute ——— */
export async function chargerFactureElectronique(documentId: string, factureId: string | null): Promise<Pick<DossierFiled, "recuePlateforme" | "cycle" | "litiges" | "ecritures">> {
  const supabase = createClient();
  const [flux, cycle, sens, statuts, litiges, ecritures] = await Promise.all([
    supabase.from("filed_pa_flux").select("id").eq("document_id", documentId).eq("sens", "entrant").eq("etat", "depose").limit(1),
    factureId ? supabase.rpc("filed_cycle_vie_facture", { p_facture: factureId }) : null,
    factureId ? supabase.from("filed_cycle_vie").select("code, survenu_le, sens, erreur").eq("facture_id", factureId).order("survenu_le").order("id") : null,
    supabase.from("filed_cycle_vie_statuts").select("code, obligatoire"),
    factureId ? supabase.from("filed_litiges").select("id, ouvert_le, motif, clos_le, issue").eq("facture_id", factureId).order("ouvert_le", { ascending: false }) : null,
    factureId ? supabase.from("filed_ecritures").select("journal_code, journal_lib, ecriture_num, ecriture_date, compte_num, compte_lib, comp_aux_num, debit, credit, ecriture_let, date_let").eq("facture_id", factureId).order("ecriture_num").order("id") : null,
  ]);
  const obligatoires = new Set(((statuts.data ?? []) as { code: number; obligatoire: boolean }[]).filter((s) => s.obligatoire).map((s) => s.code));
  const lignesSens = (sens?.data ?? []) as { code: number; survenu_le: string; sens: "emis" | "recu"; erreur: string | null }[];
  const utilises = new Set<number>();
  const lignes = ((cycle?.data ?? []) as Omit<LigneCycle, "sens" | "erreur" | "obligatoire">[]).map((l) => {
    /* le sens et l'erreur sont dans filed_cycle_vie : on rapproche par (code, survenu_le) */
    const i = lignesSens.findIndex((x, k) => !utilises.has(k) && x.code === l.code && new Date(x.survenu_le).getTime() === new Date(l.survenu_le).getTime());
    if (i >= 0) utilises.add(i);
    const s = i >= 0 ? lignesSens[i] : null;
    return { ...l, montant: l.montant === null ? null : Number(l.montant), sens: s?.sens ?? "emis", erreur: s?.erreur ?? null, obligatoire: obligatoires.has(l.code) } as LigneCycle;
  });
  return {
    recuePlateforme: (flux.data ?? []).length > 0,
    cycle: lignes,
    litiges: (litiges?.data ?? []) as Litige[],
    ecritures: ((ecritures?.data ?? []) as Ecriture[]).map((e) => ({ ...e, debit: Number(e.debit), credit: Number(e.credit) })),
  };
}

export async function chargerMotifsLitige(): Promise<MotifLitige[]> {
  const { data, error } = await createClient().from("filed_cycle_vie_motifs").select("code, libelle, statuts").order("libelle");
  if (error || !data?.length) return MOTIFS_207;
  return (data as (MotifLitige & { statuts: number[] })[]).filter((m) => m.statuts?.includes(207)).map(({ code, libelle }) => ({ code, libelle }));
}

async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(nom, args);
  if (error) throw erreur(error);
  return data as T;
}

/* le motif normalisé est lu en tête du texte : « CODE : texte » (sans code, AUTRE) */
export const ouvrirLitige = (p_facture: string, code: string | null, texte: string) =>
  rpc<string>("filed_ouvrir_litige", { p_facture, p_motif: code ? `${code} : ${texte.trim()}` : texte.trim() });
export const cloreLitige = (p_litige: string, p_issue: string) => rpc<void>("filed_clore_litige", { p_litige, p_issue });
export const comptabiliserFacture = (p_facture: string, p_motif: string | null) => rpc<unknown>("filed_comptabiliser_facture", { p_facture, p_motif });

/* ——— 7. l'export FEC ——— */
export type ExportFec = {
  nom_fichier: string;
  encodage: string;
  separateur: string;
  contenu: string;
  lignes: number;
  ecritures: number;
  total_debit: number;
  total_credit: number;
  equilibre: boolean;
  ecritures_desequilibrees: number;
  du: string;
  au: string;
  empreinte: string;
};
export const exporterFec = (o: { client: string; entite: string; exercice: string | null; du: string | null; au: string | null }) =>
  rpc<ExportFec>("filed_exporter_fec", { p_client: o.client, p_entite: o.entite, p_exercice: o.exercice, p_du: o.du, p_au: o.au });

/* télécharger le contenu TEL QUEL (fins de ligne CRLF comprises), en UTF-8 */
export function telecharger(nom: string, contenu: string) {
  const blob = new Blob([contenu], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const SOUS_TITRE_FEC =
  "Ce fichier contient les écritures d'achats tenues par FILED (journaux Achats, Banque, Caisse). Il ne remplace pas le FEC complet de votre comptabilité : transmettez-le à votre expert-comptable, qui l'intègre au sien.";

/* ——— 8. les comptes de FILED ——— */
export type RoleCompte = "fournisseurs" | "tva_deductible_abs" | "tva_deductible_immo" | "banque" | "caisse";
export const COMPTES_SYSTEME: { role: RoleCompte; libelle: string; numero: string; defaut: string }[] = [
  { role: "fournisseurs", libelle: "Compte fournisseurs", numero: "401", defaut: "Fournisseurs" },
  { role: "tva_deductible_abs", libelle: "TVA déductible sur biens et services", numero: "44566", defaut: "TVA déductible sur autres biens et services" },
  { role: "tva_deductible_immo", libelle: "TVA déductible sur immobilisations", numero: "44562", defaut: "TVA déductible sur immobilisations" },
  { role: "banque", libelle: "Banque", numero: "512", defaut: "Banque" },
  { role: "caisse", libelle: "Caisse", numero: "530", defaut: "Caisse" },
];
export const reglerCompte = (o: { client: string; role: RoleCompte; numero: string; libelle: string }) =>
  rpc<void>("filed_regler_compte_systeme", { p_client: o.client, p_role: o.role, p_numero: o.numero, p_libelle: o.libelle });
