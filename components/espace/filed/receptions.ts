/* ══════════════════════════════════════════════════════════════════════
   FILED — la boîte de réception : les courriels reçus (06/10/2026)

   Les courriels arrivent par la fonction `reception` (Brevo) et la porte
   `deposer_reception` dans public.receptions (canal email, boîte du client,
   module filed). Lecture seule, sous la politique « on voit les réceptions
   de son périmètre ». Aucune porte ne change le statut d'une réception
   côté client : l'écran consulte, il ne marque rien.

   Une pièce jointe devenue document FILED se retrouve par rapprochement :
   document de source « courriel », même expéditeur, même nom de fichier,
   reçu à deux jours près (filed_documents ne cite pas la réception).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";

export type PieceRecue = { nom: string; mime: string | null; taille: number | null; chemin: string | null };
export type StatutReception = "nouvelle" | "lue" | "traitee" | "ignoree" | "indesirable";
export type Reception = {
  id: number;
  entite_id: string | null;
  boite: string;
  identifiant_externe: string;
  de_adresse: string | null;
  de_nom: string | null;
  sujet: string | null;
  corps: string | null;
  pieces: PieceRecue[];
  detail: Record<string, unknown>;
  statut: StatutReception;
  recu_le: string;
};
export type DocumentCourriel = { id: string; reference: string | null; nom_fichier: string; expediteur: string | null; recu_le: string; etat: string };
export type VueBoite = { receptions: Reception[]; documents: DocumentCourriel[]; boites: string[] };

export const STATUTS_RECEPTION: Record<StatutReception, { libelle: string; teinte: "bleu" | "gris" | "vert" | "rouge" }> = {
  nouvelle: { libelle: "Nouveau", teinte: "bleu" },
  lue: { libelle: "Lu", teinte: "gris" },
  traitee: { libelle: "Traité", teinte: "vert" },
  ignoree: { libelle: "Ignoré", teinte: "gris" },
  indesirable: { libelle: "Indésirable", teinte: "rouge" },
};

const COLONNES = "id, entite_id, boite, identifiant_externe, de_adresse, de_nom, sujet, corps, pieces, detail, statut, recu_le";

export async function chargerBoite(): Promise<VueBoite> {
  const supabase = createClient();
  const [r, d, e] = await Promise.all([
    supabase.from("receptions").select(COLONNES).eq("canal", "email").eq("module", "filed").order("recu_le", { ascending: false }).limit(200),
    supabase.from("filed_documents").select("id, reference, nom_fichier, expediteur, recu_le, etat").eq("source", "courriel").order("recu_le", { ascending: false }).limit(500),
    /* l'adresse de la boîte : lisible des gérants et admins seulement (expediteurs) */
    supabase.from("expediteurs").select("identite, module, parametres").eq("canal", "email").eq("module", "filed"),
  ]);
  if (r.error) throw new Error(r.error.message);
  const receptions = ((r.data ?? []) as Reception[]).map((x) => ({ ...x, pieces: Array.isArray(x.pieces) ? x.pieces : [], detail: x.detail ?? {} }));
  const boites = new Set<string>(((e.data ?? []) as { identite: string }[]).map((x) => x.identite.toLowerCase()));
  for (const x of receptions) boites.add(x.boite.toLowerCase());
  return { receptions, documents: (d.data ?? []) as DocumentCourriel[], boites: Array.from(boites).sort() };
}

const JOURS_2 = 2 * 24 * 3600 * 1000;
/* le document FILED né d'une pièce jointe, s'il existe */
export function documentDe(r: Reception, p: PieceRecue, documents: DocumentCourriel[]): DocumentCourriel | null {
  const de = r.de_adresse?.toLowerCase() ?? null;
  const t = new Date(r.recu_le).getTime();
  return (
    documents.find((d) => d.nom_fichier === p.nom && (d.expediteur?.toLowerCase() ?? null) === de && Math.abs(new Date(d.recu_le).getTime() - t) <= JOURS_2) ?? null
  );
}

/* les pièces écartées par la réception (taille, type) : detail.pieces_ignorees */
export function piecesIgnorees(r: Reception): { nom: string; raison: string }[] {
  const v = r.detail?.pieces_ignorees;
  if (!Array.isArray(v)) return [];
  return v.map((x) => {
    if (typeof x === "string") return { nom: x, raison: "" };
    const o = (x ?? {}) as Record<string, unknown>;
    return { nom: String(o.nom ?? o.name ?? "pièce"), raison: String(o.raison ?? o.motif ?? o.erreur ?? "") };
  });
}

export async function lienPiece(chemin: string): Promise<string> {
  const { data, error } = await createClient().storage.from("omega-clients").createSignedUrl(chemin, 600);
  if (error || !data?.signedUrl) throw new Error(error?.message === "Object not found" ? "Le fichier n'est pas dans le stockage." : (error?.message ?? "Lien indisponible."));
  return data.signedUrl;
}

export function taille(octets: number | null): string {
  if (octets === null || octets === undefined) return "";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`;
  return `${(octets / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}
