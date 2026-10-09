/* ══════════════════════════════════════════════════════════════════════
   Les données du pilotage interne (09/10/2026)

   Lues côté serveur avec la session de la personne connectée : la base
   n'ouvre omega_pages et omega_lignes qu'aux adresses de omega_admins
   (fonction omega_est_admin, RLS). Sans droit, les requêtes reviennent
   vides — la page ne s'affiche de toute façon pas (app/omega/layout).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/server";
import type { Ligne } from "@/components/omega/Tableaux";

export async function estAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("omega_est_admin");
  return !error && data === true;
}

export async function lirePage(slug: string): Promise<{ titre: string; contenu: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("omega_pages").select("titre, contenu").eq("slug", slug).maybeSingle();
  return data ?? null;
}

export async function lireLignes(): Promise<Ligne[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("omega_lignes").select("id, tableau, ordre, donnees").order("ordre");
  return (data ?? []) as Ligne[];
}
