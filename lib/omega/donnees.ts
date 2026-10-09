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
  const { data } = await supabase.from("omega_lignes").select("id, tableau, ordre, donnees, maj").order("ordre");
  return (data ?? []) as Ligne[];
}

/* ——— la liste de prospection (09/10/2026) : ≈ 12 000 établissements,
   lus par page de 50, filtrés côté base ——— */
export type Prospect = {
  id: number;
  departement: string;
  secteur: string;
  moteurs: string[];
  entreprise: string;
  enseigne: string | null;
  commune: string | null;
  dirigeant: string | null;
  effectif: string | null;
  telephone: string | null;
  courriel: string | null;
  site: string | null;
  personne_physique: boolean;
  statut: string;
  note: string | null;
};
export type Secteur = { secteur: string; moteurs: string[]; total: number; avec_tel: number; contactes: number };
export type FiltresProspects = { secteur?: string; q?: string; tel?: string; statut?: string; page?: string };
export const PAR_PAGE = 50;

export async function lireProspects(f: FiltresProspects) {
  const supabase = await createClient();
  const page = Math.max(1, Number(f.page) || 1);
  let req = supabase
    .from("omega_prospects")
    .select("id, departement, secteur, moteurs, entreprise, enseigne, commune, dirigeant, effectif, telephone, courriel, site, personne_physique, statut, note", { count: "exact" });
  if (f.secteur) req = req.eq("secteur", f.secteur);
  if (f.statut) req = req.eq("statut", f.statut);
  if (f.tel === "1") req = req.not("telephone", "is", null);
  if (f.q) {
    const q = f.q.replace(/[%,()]/g, " ").trim();
    if (q) req = req.or(`entreprise.ilike.%${q}%,enseigne.ilike.%${q}%,commune.ilike.%${q}%,dirigeant.ilike.%${q}%`);
  }
  const { data, count } = await req
    .order("telephone", { ascending: true, nullsFirst: false })
    .order("entreprise")
    .range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1);
  const { data: secteurs } = await supabase.from("omega_prospects_secteurs").select("secteur, moteurs, total, avec_tel, contactes").order("total", { ascending: false });
  return { lignes: (data ?? []) as Prospect[], total: count ?? 0, page, secteurs: (secteurs ?? []) as Secteur[] };
}

/* l'activité d'appel sur la liste : la date de chaque prospect dont le statut a bougé */
export async function lireContacts(): Promise<{ contacts: string[]; secteurs: Secteur[] }> {
  const supabase = await createClient();
  const [{ data: c }, { data: s }] = await Promise.all([
    supabase.from("omega_prospects").select("maj").neq("statut", "À contacter").order("maj", { ascending: false }).limit(5000),
    supabase.from("omega_prospects_secteurs").select("secteur, moteurs, total, avec_tel, contactes").order("total", { ascending: false }),
  ]);
  return { contacts: (c ?? []).map((x) => x.maj as string), secteurs: (s ?? []) as Secteur[] };
}

/* ——— les contacts suivis et leur journal d'échanges (09/10/2026) ——— */
export type Contact = {
  id: number;
  nom: string;
  entreprise: string | null;
  role: string | null;
  type: string;
  telephone: string | null;
  courriel: string | null;
  commune: string | null;
  secteur: string | null;
  etape: string;
  source: string | null;
  prochaine_action: string | null;
  prochaine_date: string | null;
  note: string | null;
  maj: string;
};
export type Echange = { id: number; contact_id: number; quand: string; canal: string; resume: string };

export async function lireContactsSuivis(): Promise<{ contacts: Contact[]; echanges: Echange[] }> {
  const supabase = await createClient();
  const [{ data: c }, { data: e }] = await Promise.all([
    supabase.from("omega_contacts").select("id, nom, entreprise, role, type, telephone, courriel, commune, secteur, etape, source, prochaine_action, prochaine_date, note, maj").order("prochaine_date", { ascending: true, nullsFirst: false }),
    supabase.from("omega_echanges").select("id, contact_id, quand, canal, resume").order("quand", { ascending: false }).limit(2000),
  ]);
  return { contacts: (c ?? []) as Contact[], echanges: (e ?? []) as Echange[] };
}
