/* ══════════════════════════════════════════════════════════════════════
   Les portes du point du matin — côté navigateur, sous RLS (05/10/2026)

   Lecture seule : points_du_jour (mes points, par jour), puis la porte
   lire_point(p_point uuid) → jsonb pour le contenu — c'est elle qui pose
   ouvert_le. Si le jsonb ne porte pas les lignes sous une forme connue
   (clé `lignes` ou `sections[].lignes`), on retombe sur la lecture directe
   de points_du_jour_lignes. apercu_point(p_client, p_user, p_jour) → jsonb
   fabrique un aperçu quand aucun point n'a été assemblé pour le jour.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { LignePoint, PointDuJour } from "../types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

export async function listerPoints(): Promise<PointDuJour[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("points_du_jour").select("*").order("jour", { ascending: false }).limit(60);
  if (error) throw new ErreurPorte(message(error));
  return (data ?? []) as PointDuJour[];
}

type Brut = Record<string, unknown>;

/* Les lignes d'un jsonb de lire_point, sous les deux formes qu'on sait lire. */
function lignesDepuis(j: unknown): LignePoint[] | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Brut;
  const liste = Array.isArray(o.lignes) ? (o.lignes as Brut[]) : null;
  if (liste) return liste.map(normaliser);
  if (Array.isArray(o.sections)) {
    const out: LignePoint[] = [];
    (o.sections as Brut[]).forEach((s, i) => {
      const lg = Array.isArray(s.lignes) ? (s.lignes as Brut[]) : Array.isArray(s.items) ? (s.items as Brut[]) : [];
      if (!lg.length) out.push(normaliser({ ...s, section_rang: s.rang ?? i + 1, rang: 0, titre: s.titre, texte: s.texte ?? "Rien à signaler." }));
      lg.forEach((l, k) => out.push(normaliser({ titre: s.titre, module: s.module, section_incomplete: s.incomplete, ...l, section_rang: s.rang ?? i + 1, rang: l.rang ?? k + 1 })));
    });
    return out;
  }
  return null;
}

function normaliser(b: Brut): LignePoint {
  const n = (v: unknown, d = 0) => (typeof v === "number" ? v : Number(v ?? d) || d);
  const t = (v: unknown) => (typeof v === "string" ? v : v == null ? null : String(v));
  const g = t(b.gravite);
  return {
    id: t(b.id) ?? `${n(b.section_rang)}-${n(b.rang)}-${Math.random().toString(16).slice(2)}`,
    section_rang: n(b.section_rang, 1),
    rang: n(b.rang),
    module: t(b.module),
    entite_nom: t(b.entite_nom),
    titre: t(b.titre),
    sante: b.sante === true,
    section_incomplete: b.section_incomplete === true,
    texte: t(b.texte),
    lien: t(b.lien),
    gravite: g === "info" || g === "attention" || g === "critique" ? g : null,
    objet_type: t(b.objet_type),
    objet_id: t(b.objet_id),
  };
}

export async function lirePoint(point: PointDuJour): Promise<{ lignes: LignePoint[]; brut: unknown }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lire_point", { p_point: point.id });
  if (error) throw new ErreurPorte(message(error));
  const lignes = lignesDepuis(data);
  if (lignes) return { lignes, brut: data };
  const direct = await supabase.from("points_du_jour_lignes").select("*").eq("point_id", point.id).order("section_rang").order("rang");
  if (direct.error) throw new ErreurPorte(message(direct.error));
  return { lignes: (direct.data ?? []).map((x) => normaliser(x as Brut)), brut: data };
}

export async function apercuPoint(client_id: string, user_id: string, jour: string): Promise<{ lignes: LignePoint[]; brut: unknown }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("apercu_point", { p_client: client_id, p_user: user_id, p_jour: jour });
  if (error) throw new ErreurPorte(message(error));
  return { lignes: lignesDepuis(data) ?? [], brut: data };
}

export async function monCompte(): Promise<{ user_id: string; client_id: string } | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string } | undefined;
  return c ? { user_id: auth.user.id, client_id: c.client_id } : null;
}
