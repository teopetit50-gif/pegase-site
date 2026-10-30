/* ══════════════════════════════════════════════════════════════════════
   D'une demande de validation à son dossier FILED (06/10/2026)

   Une demande du module FILED nomme son objet (objet_type, objet_id) : la
   facture, le document, le fournisseur ou l'IBAN. Le lien ouvre
   /espace/filed?objet=<type>:<id> ; l'écran FILED retrouve le document à
   ouvrir (pour un fournisseur ou un IBAN : sa facture la plus récente).
   ══════════════════════════════════════════════════════════════════════ */

import type { Apercu } from "./portes";

export type Cible = { type: "facture" | "document" | "fournisseur"; id: string };

export function lienDossierFiled(objet_type: string | null, objet_id: string | null, payload: Record<string, unknown> | null): string | null {
  if (!objet_type || !objet_id) return null;
  if (objet_type === "filed_facture") return `/espace/filed?objet=facture:${encodeURIComponent(objet_id)}`;
  if (objet_type === "filed_document") return `/espace/filed?objet=document:${encodeURIComponent(objet_id)}`;
  if (objet_type === "filed_fournisseur") return `/espace/filed?objet=fournisseur:${encodeURIComponent(objet_id)}`;
  if (objet_type === "filed_iban" && typeof payload?.fournisseur === "string") return `/espace/filed?objet=fournisseur:${encodeURIComponent(payload.fournisseur)}`;
  return null;
}

export function lireCible(recherche: string): Cible | null {
  const brut = new URLSearchParams(recherche).get("objet");
  const m = brut?.match(/^(facture|document|fournisseur):(.+)$/);
  return m ? { type: m[1] as Cible["type"], id: m[2] } : null;
}

/* le document à ouvrir ; une facture se reconnaît à son identifiant ou à la
   référence de son document (les demandes d'exemple citent « R2026-… ») */
export function trouverCible(apercus: Apercu[], c: Cible): Apercu | null {
  if (c.type === "document") return apercus.find((a) => a.document.id === c.id || a.document.reference === c.id) ?? null;
  if (c.type === "facture") return apercus.find((a) => a.facture?.id === c.id || a.document.reference === c.id) ?? null;
  return (
    apercus
      .filter((a) => a.fournisseur?.id === c.id || a.facture?.fournisseur_id === c.id)
      .sort((a, b) => new Date(b.document.recu_le).getTime() - new Date(a.document.recu_le).getTime())[0] ?? null
  );
}
