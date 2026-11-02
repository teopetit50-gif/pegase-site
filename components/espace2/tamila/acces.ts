/* ══════════════════════════════════════════════════════════════════════
   TAMILA — les accès du cabinet (02/11/2026, PAGES-MANQUANTES.md :
   « Le journal indique qui a consulté quel dossier… l'exporter à tout
   moment »). Lectures seules, portes existantes, aucune migration ;
   components/espace/tamila/portes.ts n'est pas touché.

   · Journal des accès : rpc tamila_journal_acces(p_dossier) (b4_02), une
     fois par dossier dont on est responsable ou associé. ATTENTION : la
     porte trace elle-même une lecture « journal » du dossier lu ; lire le
     journal de tout le cabinet ajoute donc une ligne par dossier. L'écran
     le dit et demande confirmation avant.
   · Journal du coffre : table tamila_coffre_journal (b4_05), lisible des
     associés seuls (RLS) ; aucune trace en plus.
   · Adresse de transfert e-barreau : table expediteurs (socle, b4_10 :
     canal email, module tamila), lisible des gérants et admins (RLS).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";

export type LigneJournal = { dossier: string; user_id: string; lu_le: string; contexte: string | null };
export type LigneCoffre = { id: number; dossier_id: string; pour: string; demandeur: string | null; issue: string; demande_le: string; conclu_le: string | null };

export async function lireJournalCabinet(dossiers: string[]): Promise<{ lignes: LigneJournal[]; refuses: number }> {
  const supabase = createClient();
  const lignes: LigneJournal[] = [];
  let refuses = 0;
  for (const d of dossiers) {
    const { data, error } = await supabase.rpc("tamila_journal_acces", { p_dossier: d });
    if (error) {
      refuses++;
      continue;
    }
    for (const l of (data ?? []) as { user_id: string; lu_le: string; contexte: string | null }[]) lignes.push({ dossier: d, ...l });
  }
  return { lignes: lignes.sort((a, b) => (a.lu_le < b.lu_le ? 1 : -1)), refuses };
}

export async function lireJournalCoffre(): Promise<LigneCoffre[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("tamila_coffre_journal").select("id, dossier_id, pour, demandeur, issue, demande_le, conclu_le").order("demande_le", { ascending: false }).limit(500);
  return error ? null : ((data ?? []) as LigneCoffre[]);
}

export async function adresseTransfert(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("expediteurs").select("identite").eq("canal", "email").eq("module", "tamila").limit(1);
  if (error || !data?.length) return null;
  return (data[0] as { identite: string }).identite;
}

export const POUR: Record<string, string> = { membre: "Clé remise à un membre", lecteur: "Clé remise au lecteur (pièce)", reenveloppement: "Ré-enveloppement", nouvelle_cle: "Nouvelle clé" };
export const ISSUE: Record<string, string> = { demande: "Demandée", deballe: "Déballée", emise: "Émise", reenveloppe: "Ré-enveloppée", refuse: "Refusée", echec: "Échec" };
