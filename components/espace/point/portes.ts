/* ══════════════════════════════════════════════════════════════════════
   Les portes du point du matin — côté navigateur, sous RLS (05/10/2026)

   Lecture seule : points_du_jour (mes points, par jour), puis la porte
   lire_point(p_point uuid) → jsonb pour le contenu — c'est elle qui pose
   ouvert_le. Forme confirmée par le coordinateur (lot 19) :
     { id, jour, statut, heure 'HH:MM', fuseau, territoire, prevu_le, du_le,
       assemble_le, incomplet, motifs, canal, contenu, ouvert_le, envoi_id,
       version, expurge_le,
       sections: [{ rang, module, nom_module, entite_id, entite_nom, titre,
                    sante, incomplete, donnees_du,
                    lignes: [{ rang, texte, lien, gravite, objet_type, objet_id }] }] }
   apercu_point(p_client, p_user = null, p_jour = null) → jsonb fabrique un
   aperçu quand aucun point n'a été assemblé :
     { jour, fuseau, prevu_le, du_le, motifs,
       sections: [{ section_id, module, entite_id, entite_nom, titre, sante,
                    incomplete, donnees_du, ordre,
                    lignes: [{ rang, texte, lien, gravite, objet_type, objet_id,
                               gabarit, gabarit_version, valeurs }] }] }
   Toujours sections[].lignes[] ; une section sans ligne vaut « rien à
   signaler » (rang 0 à l'écran).
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

const n = (v: unknown, d = 0) => (typeof v === "number" ? v : Number(v ?? d) || d);
const t = (v: unknown) => (typeof v === "string" ? v : v == null ? null : String(v));

/* Les lignes d'un jsonb (lire_point ou apercu_point) : sections[].lignes[]. */
function lignesDepuis(j: unknown): LignePoint[] {
  if (!j || typeof j !== "object" || !Array.isArray((j as Brut).sections)) return [];
  const out: LignePoint[] = [];
  ((j as Brut).sections as Brut[]).forEach((s, i) => {
    const rangSection = n(s.rang ?? s.ordre, i + 1);
    const commun = {
      section_rang: rangSection,
      module: t(s.module),
      entite_nom: t(s.entite_nom),
      titre: t(s.titre) ?? t(s.nom_module) ?? `Section ${rangSection}`,
      sante: s.sante === true,
      section_incomplete: s.incomplete === true,
    };
    const lignes = Array.isArray(s.lignes) ? (s.lignes as Brut[]) : [];
    if (!lignes.length) {
      out.push({ id: `${rangSection}-0`, ...commun, rang: 0, texte: "Rien à signaler.", lien: null, gravite: null, objet_type: null, objet_id: null });
      return;
    }
    lignes.forEach((l, k) => {
      const g = t(l.gravite);
      out.push({
        id: `${rangSection}-${n(l.rang, k + 1)}`,
        ...commun,
        rang: n(l.rang, k + 1),
        texte: t(l.texte),
        lien: t(l.lien),
        gravite: g === "info" || g === "attention" || g === "critique" ? g : null,
        objet_type: t(l.objet_type),
        objet_id: t(l.objet_id),
      });
    });
  });
  return out;
}

/* L'en-tête d'un point tel que lire_point le rend, fusionné sur la ligne de points_du_jour. */
function enTeteDepuis(point: PointDuJour, j: unknown): PointDuJour {
  if (!j || typeof j !== "object") return point;
  const o = j as Brut;
  return {
    ...point,
    heure: t(o.heure) ?? point.heure,
    fuseau: t(o.fuseau) ?? point.fuseau,
    territoire: t(o.territoire) ?? point.territoire,
    incomplet: typeof o.incomplet === "boolean" ? o.incomplet : point.incomplet,
    motifs: Array.isArray(o.motifs) ? (o.motifs as unknown[]) : point.motifs,
    canal: (t(o.canal) as PointDuJour["canal"]) ?? point.canal,
    contenu: (t(o.contenu) as PointDuJour["contenu"]) ?? point.contenu,
    ouvert_le: t(o.ouvert_le) ?? point.ouvert_le,
    nb_sections: Array.isArray(o.sections) ? (o.sections as unknown[]).length : point.nb_sections,
  };
}

export async function lirePoint(point: PointDuJour): Promise<{ point: PointDuJour; lignes: LignePoint[]; motifs: unknown[] }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lire_point", { p_point: point.id });
  if (error) throw new ErreurPorte(message(error));
  const enTete = enTeteDepuis(point, data);
  return { point: enTete, lignes: lignesDepuis(data), motifs: enTete.motifs };
}

export async function apercuPoint(client_id: string, user_id: string, jour: string): Promise<{ lignes: LignePoint[]; motifs: unknown[]; fuseau: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("apercu_point", { p_client: client_id, p_user: user_id, p_jour: jour });
  if (error) throw new ErreurPorte(message(error));
  const o = (data && typeof data === "object" ? data : {}) as Brut;
  return { lignes: lignesDepuis(data), motifs: Array.isArray(o.motifs) ? (o.motifs as unknown[]) : [], fuseau: t(o.fuseau) };
}

export async function monCompte(): Promise<{ user_id: string; client_id: string } | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string } | undefined;
  return c ? { user_id: auth.user.id, client_id: c.client_id } : null;
}
