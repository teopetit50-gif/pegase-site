"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — les lectures de la page « Avant les rendez-vous »
   (/espace2/tiroma/avant, 02/11/2026, docs/refonte-metiers/PAGES-MANQUANTES.md)

   Rien n'est écrit en base ; portes inchangées (components/espace/tiroma/
   portes.ts), aucune migration. Trois lectures, toutes sous RLS :
     · la porte existante tiroma_avant_rendez_vous(p_client, p_entite,
       p_jours) (b3_04) avec p_jours = 7 pour la semaine (le dossier du
       layout la lit déjà avec p_jours = null, soit labo_verif_jours, J-2) ;
     · les fiches que les vérifications nomment, pour le volet de droite :
       tiroma_travaux_labo (« on voit les travaux des patients qu'on
       voit »), tiroma_ententes_odf (même règle) et tiroma_stock (famille
       implant, « l'équipe voit le stock ») — les implants des chirurgies
       rapprochés du stock.
   En exemple : la semaine et les fiches d'un cabinet fictif (patients
   inventés), autant de lignes que la référence remplie (Linear, Triage :
   16 éléments).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { aujourdHui, dans, ilYa } from "@/components/espace/exemples/socle";
import type { Cabinet, Verification } from "@/components/espace/tiroma/types";

export type TravailLabo = {
  id: string;
  laboratoire: string | null;
  type_travail: string | null;
  envoye_le: string | null;
  retour_attendu_le: string | null;
  revenu_le: string | null;
  statut: "attendu" | "en_fabrication" | "revenu" | "annule";
  source: string;
};
export type EntenteOdf = {
  id: string;
  demande_le: string | null;
  accord_le: string | null;
  accord_par_silence: boolean;
  debut_le: string | null;
  semestre_courant: number | null;
  semestre_fin_le: string | null;
  statut: string;
};
export type LigneStock = {
  id: string;
  marque: string | null;
  reference: string;
  diametre_mm: number | null;
  longueur_mm: number | null;
  quantite: number;
  seuil: number | null;
  lot: string | null;
  peremption: string | null;
};
export type Fiches = { labo: Record<string, TravailLabo>; odf: Record<string, EntenteOdf>; stock: LigneStock[] | null };

const message = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "La base n'a pas répondu.");

/** La semaine (p_jours = 7) par la porte b3_04. */
export async function chargerSemaine(cabinet: Cabinet): Promise<Verification[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("tiroma_avant_rendez_vous", { p_client: cabinet.client_id, p_entite: cabinet.entite_id, p_jours: 7 });
  if (error) throw new Error(message(error));
  return (data ?? []) as Verification[];
}

/** Les fiches nommées par les vérifications (lecture seule, RLS). */
export async function lireFiches(cabinet: Cabinet, verifs: Verification[]): Promise<Fiches> {
  const supabase = createClient();
  const ids = (t: string) => [...new Set(verifs.filter((v) => v.objet_type === t && v.objet_id).map((v) => v.objet_id as string))];
  const idsLabo = ids("tiroma_travaux_labo");
  const idsOdf = ids("tiroma_ententes_odf");
  const avecImplant = verifs.some((v) => v.nature === "implant");
  const [labo, odf, stock] = await Promise.all([
    idsLabo.length
      ? supabase.from("tiroma_travaux_labo").select("id, laboratoire, type_travail, envoye_le, retour_attendu_le, revenu_le, statut, source").in("id", idsLabo)
      : Promise.resolve({ data: [], error: null }),
    idsOdf.length
      ? supabase.from("tiroma_ententes_odf").select("id, demande_le, accord_le, accord_par_silence, debut_le, semestre_courant, semestre_fin_le, statut").in("id", idsOdf)
      : Promise.resolve({ data: [], error: null }),
    avecImplant
      ? supabase.from("tiroma_stock").select("id, marque, reference, diametre_mm, longueur_mm, quantite, seuil, lot, peremption").eq("entite_id", cabinet.entite_id).eq("famille", "implant").order("reference")
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const r of [labo, odf, stock]) if (r.error) throw new Error(message(r.error));
  return {
    labo: Object.fromEntries(((labo.data ?? []) as TravailLabo[]).map((w) => [w.id, w])),
    odf: Object.fromEntries(((odf.data ?? []) as EntenteOdf[]).map((o) => [o.id, o])),
    stock: (stock.data as LigneStock[] | null) ?? null,
  };
}

/* ——— l'exemple ——— */

const jj = (n: number) => new Date(dans(n)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
const date = (n: number) => new Date(dans(n)).toLocaleDateString("fr-FR");

/** La semaine du cabinet fictif : les vérifications à J-2 du dossier, plus celles des jours 3 à 7. */
export function semaineExemple(j2: Verification[]): Verification[] {
  const plus: Verification[] = [
    { nature: "labo", gravite: "critique", quand: aujourdHui(3), rendez_vous_id: "rdv-20", patient_id: "pa-20", patient_nom: "Odile Marchand", texte: `Bridge — pose : le travail n'est pas revenu du laboratoire, attendu le ${jj(2)} (pose le ${jj(3)}).`, objet_type: "tiroma_travaux_labo", objet_id: "w-3" },
    { nature: "implant", gravite: "critique", quand: aujourdHui(4), rendez_vous_id: "rdv-21", patient_id: "pa-21", patient_nom: "Raymond Gaspard", texte: `Implant — chirurgie le ${jj(4)} : 2 référence(s) d'implant sous le seuil (NB-4.3-10, NB-5.0-08).`, objet_type: "tiroma_stock", objet_id: null },
    { nature: "devis_expire", gravite: "critique", quand: aujourdHui(5), rendez_vous_id: null, patient_id: "pa-22", patient_nom: "Sandrine Fleury", texte: `Le devis D-2026-0377 (1640 €) expire le ${date(5)} : passé la date, il faudra le refaire.`, objet_type: "tiroma_plans", objet_id: "pl-11" },
    { nature: "labo", gravite: "attention", quand: aujourdHui(5), rendez_vous_id: "rdv-22", patient_id: "pa-23", patient_nom: "Yves Lebrun", texte: `Inlay-core — pose : aucune fiche de laboratoire connue pour la pose du ${jj(5)}.`, objet_type: "tiroma_travaux_labo", objet_id: null },
    { nature: "odf_semestre", gravite: "attention", quand: aujourdHui(6), rendez_vous_id: null, patient_id: "pa-24", patient_nom: "Léa Moreau", texte: `Orthodontie : le semestre 3 se termine le ${date(6)} ; le suivant n'est pas posé.`, objet_type: "tiroma_ententes_odf", objet_id: "o-2" },
    { nature: "implant", gravite: "attention", quand: aujourdHui(6), rendez_vous_id: "rdv-23", patient_id: "pa-25", patient_nom: "Henri Castel", texte: `Implant — chirurgie le ${jj(6)} : 1 référence(s) d'implant sous le seuil (NB-4.3-10).`, objet_type: "tiroma_stock", objet_id: null },
    { nature: "mutuelle_attente", gravite: "attention", quand: aujourdHui(-24), rendez_vous_id: null, patient_id: "pa-7", patient_nom: "Nadège Hilaire", texte: `Réponse de la mutuelle attendue depuis le ${new Date(ilYa(24)).toLocaleDateString("fr-FR")} pour le devis D-2026-0501 (24 jours).`, objet_type: "tiroma_plans", objet_id: "pl-3" },
    { nature: "interruption", gravite: "attention", quand: aujourdHui(-48), rendez_vous_id: null, patient_id: "pa-26", patient_nom: "Bernadette Roux", texte: `Traitement interrompu : la séance 2 de « Bridge 34-36 — essayage » est faite depuis le ${new Date(ilYa(48)).toLocaleDateString("fr-FR")}, la suivante n'est pas posée (48 jours).`, objet_type: "tiroma_plans", objet_id: "pl-12" },
    { nature: "devis_sans_reponse", gravite: "attention", quand: aujourdHui(-19), rendez_vous_id: null, patient_id: "pa-27", patient_nom: "Thierry Joubert", texte: `Devis D-2026-0522 présenté le ${new Date(ilYa(19)).toLocaleDateString("fr-FR")}, sans réponse depuis 19 jours.`, objet_type: "tiroma_plans", objet_id: "pl-13" },
    { nature: "labo", gravite: "info", quand: aujourdHui(4), rendez_vous_id: "rdv-24", patient_id: "pa-28", patient_nom: "Paulette Girard", texte: "Couronne — pose : le travail est revenu du laboratoire (couronne zircone 46).", objet_type: "tiroma_travaux_labo", objet_id: "w-4" },
  ];
  const rang = { critique: 1, attention: 2, info: 3 } as const;
  return [...j2, ...plus].sort((a, b) => rang[a.gravite] - rang[b.gravite] || (a.quand ?? "9").localeCompare(b.quand ?? "9") || a.nature.localeCompare(b.nature));
}

export const FICHES_EXEMPLE: Fiches = {
  labo: {
    "w-1": { id: "w-1", laboratoire: "Laboratoire Corail", type_travail: "Couronne céramo-métallique 14", envoye_le: aujourdHui(-9), retour_attendu_le: aujourdHui(-1), revenu_le: null, statut: "en_fabrication", source: "logiciel" },
    "w-2": { id: "w-2", laboratoire: "Laboratoire Corail", type_travail: "Couronne céramo-métallique 16", envoye_le: aujourdHui(-12), retour_attendu_le: aujourdHui(-2), revenu_le: aujourdHui(-1), statut: "revenu", source: "logiciel" },
    "w-3": { id: "w-3", laboratoire: "Prothèses du Lamentin", type_travail: "Bridge 3 éléments 34-36", envoye_le: aujourdHui(-10), retour_attendu_le: aujourdHui(2), revenu_le: null, statut: "attendu", source: "saisie" },
    "w-4": { id: "w-4", laboratoire: "Prothèses du Lamentin", type_travail: "Couronne zircone 46", envoye_le: aujourdHui(-8), retour_attendu_le: aujourdHui(0), revenu_le: aujourdHui(0), statut: "revenu", source: "logiciel" },
  },
  odf: {
    "o-1": { id: "o-1", demande_le: aujourdHui(-160), accord_le: aujourdHui(-145), accord_par_silence: false, debut_le: null, semestre_courant: null, semestre_fin_le: null, statut: "accordee" },
    "o-2": { id: "o-2", demande_le: aujourdHui(-560), accord_le: aujourdHui(-545), accord_par_silence: true, debut_le: aujourdHui(-540), semestre_courant: 3, semestre_fin_le: aujourdHui(6), statut: "commencee" },
  },
  stock: [
    { id: "s-1", marque: "Nobel", reference: "NB-3.5-10", diametre_mm: 3.5, longueur_mm: 10, quantite: 6, seuil: 2, lot: "L2408", peremption: aujourdHui(400) },
    { id: "s-2", marque: "Nobel", reference: "NB-4.3-10", diametre_mm: 4.3, longueur_mm: 10, quantite: 1, seuil: 2, lot: "L2411", peremption: aujourdHui(320) },
    { id: "s-3", marque: "Nobel", reference: "NB-4.3-13", diametre_mm: 4.3, longueur_mm: 13, quantite: 4, seuil: 2, lot: "L2502", peremption: aujourdHui(510) },
    { id: "s-4", marque: "Nobel", reference: "NB-5.0-08", diametre_mm: 5, longueur_mm: 8, quantite: 0, seuil: 1, lot: "L2409", peremption: aujourdHui(280) },
  ],
};
