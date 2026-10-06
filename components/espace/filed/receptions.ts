/* ══════════════════════════════════════════════════════════════════════
   FILED — la boîte de réception : les courriels reçus (06/10/2026)

   Les courriels arrivent par la fonction `reception` (Brevo) et la porte
   `deposer_reception` dans public.receptions (canal email, boîte du client,
   module filed). Lecture sous la politique « on voit les réceptions de son
   périmètre » ; le statut se change par reception_marquer (socle 19am).

   Une pièce jointe devenue document FILED se retrouve par rapprochement :
   document de source « courriel », même expéditeur, même nom de fichier,
   reçu à deux jours près (filed_documents ne cite pas la réception).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";

export type PieceRecue = { nom: string; mime: string | null; taille: number | null; chemin: string | null };
export type StatutReception = "nouvelle" | "lue" | "traitee" | "ignoree" | "indesirable";
export type Canal = "email" | "whatsapp" | "sms" | "formulaire";
export type Reception = {
  id: number;
  entite_id: string | null;
  module: string | null;
  canal: Canal;
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

const COLONNES = "id, entite_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, sujet, corps, pieces, detail, statut, recu_le";

/* « filed » : la boîte de FILED (courriels, module filed) ;
   « toutes » : toutes les demandes reçues, tous canaux, SAUF le module tiroma
   (réponses de patients : données de santé, elles restent dans leur écran) */
export type Portee = "filed" | "toutes";
export const MODULES_EXCLUS = ["tiroma"];

export async function chargerBoite(portee: Portee = "filed"): Promise<VueBoite> {
  const supabase = createClient();
  let q = supabase.from("receptions").select(COLONNES).order("recu_le", { ascending: false }).limit(300);
  q = portee === "filed" ? q.eq("canal", "email").eq("module", "filed") : q.or(`module.is.null,module.not.in.(${MODULES_EXCLUS.join(",")})`);
  let e = supabase.from("expediteurs").select("identite, module, canal, parametres");
  e = portee === "filed" ? e.eq("canal", "email").eq("module", "filed") : e.eq("parametres->>usage", "reception");
  const [r, d, x] = await Promise.all([
    q,
    supabase.from("filed_documents").select("id, reference, nom_fichier, expediteur, recu_le, etat").eq("source", "courriel").order("recu_le", { ascending: false }).limit(500),
    /* l'adresse des boîtes : lisible des gérants et admins seulement (expediteurs) */
    e,
  ]);
  if (r.error) throw new Error(r.error.message);
  const receptions = ((r.data ?? []) as Reception[]).map((y) => ({ ...y, pieces: Array.isArray(y.pieces) ? y.pieces : [], detail: y.detail ?? {} }));
  const boites = new Set<string>(((x.data ?? []) as { identite: string; module: string | null }[]).filter((y) => !MODULES_EXCLUS.includes(y.module ?? "")).map((y) => y.identite.toLowerCase()));
  for (const y of receptions) boites.add(y.boite.toLowerCase());
  return { receptions, documents: (d.data ?? []) as DocumentCourriel[], boites: Array.from(boites).sort() };
}

export const CANAUX: Record<Canal, string> = { email: "Courriel", whatsapp: "WhatsApp", sms: "SMS", formulaire: "Formulaire du site" };

/* les champs d'un formulaire ou d'un message : le détail, sans les clés techniques */
const TECHNIQUES = new Set(["module", "entite_id", "envoi_id", "en_reponse_a", "fil", "langue", "pieces_ignorees", "message_id", "headers", "brut", "ip", "user_agent"]);
export function champsDe(r: Reception): [string, string][] {
  return Object.entries(r.detail ?? {})
    .filter(([k, v]) => !TECHNIQUES.has(k) && v !== null && v !== "" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean"))
    .map(([k, v]) => [k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), String(v)] as [string, string])
    .slice(0, 20);
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

/* public.reception_marquer (socle 19am) : « lue », « ecartee » (statut ignoree) ou
   « nouvelle », par qui peut lire la réception ; une réception traitée ou
   indésirable ne se remarque pas ; journal reception.marquee */
export type Marque = "lue" | "ecartee" | "nouvelle";
export async function marquerReception(id: number, statut: Marque): Promise<StatutReception> {
  const { data, error } = await createClient().rpc("reception_marquer", { p_reception: id, p_statut: statut });
  if (error) throw new Error(error.message);
  return data as StatutReception;
}
