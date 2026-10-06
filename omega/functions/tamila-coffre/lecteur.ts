// Pour le LECTEUR (A1) : demander au coffre la clé du dossier d'une pièce Tamila, puis la déchiffrer.
// À brancher dans omega/functions/lecteur/lire_piece.ts à la place de « chiffree_sans_coffre » :
//
//   if (piece.chiffrement === "dossier:v1" && piece.module === "tamila") {
//     const c = await clePourPiece({ url, cleService }, piece.id);
//     if (c.fournisseur === "local") → finirTravail({ ignore: "chiffree_sans_coffre" })   (comme aujourd'hui)
//     sinon : octets = await dechiffrerPiece(c.cle, octetsDuBucket) ; c.cle.fill(0) ; lire comme une pièce en clair.
//   }
//
// Erreurs : ErreurCleCoffre.reprendre dit si le travail doit être repris (coffre ou Key Manager
// indisponible) ou clos en échec (pièce plus à lire, dossier fermé, clé fausse).

import { dechiffrer } from "./aesgcm.ts";
import { depuisBase64 } from "./octets.ts";

export { dechiffrer as dechiffrerPiece } from "./aesgcm.ts";

export class ErreurCleCoffre extends Error {
  constructor(readonly statut: number, readonly code: string, message: string, readonly reprendre: boolean) {
    super(message);
    this.name = "ErreurCleCoffre";
  }
}

export type ClePiece = { fournisseur: "local" } | { fournisseur: "scaleway"; cle: Uint8Array; dossier: string };

export async function clePourPiece(cfg: { url: string; cleService: string }, piece: string, fetchFn: typeof fetch = fetch): Promise<ClePiece> {
  let rep: Response;
  try {
    rep = await fetchFn(`${cfg.url.replace(/\/+$/, "")}/functions/v1/tamila-coffre`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.cleService}`, apikey: cfg.cleService, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cle_piece", piece }),
    });
  } catch (e) {
    throw new ErreurCleCoffre(503, "COFFRE_INJOIGNABLE", (e as Error).message, true);
  }
  const corps = await rep.json().catch(() => ({})) as { fournisseur?: string; cle?: string; dossier?: string; erreur?: string; message?: string };
  if (!rep.ok) {
    throw new ErreurCleCoffre(rep.status, corps.erreur ?? "COFFRE", corps.message ?? `coffre ${rep.status}`, rep.status >= 500 || rep.status === 429);
  }
  if (corps.fournisseur === "local") return { fournisseur: "local" };
  if (corps.fournisseur !== "scaleway" || !corps.cle || !corps.dossier) throw new ErreurCleCoffre(502, "COFFRE_REPONSE", "réponse du coffre illisible", true);
  return { fournisseur: "scaleway", cle: depuisBase64(corps.cle), dossier: corps.dossier };
}

/** Raccourci : la pièce en clair, la clé effacée aussitôt. */
export async function lirePieceChiffree(cle: Uint8Array, chiffre: Uint8Array): Promise<Uint8Array> {
  try {
    return await dechiffrer(cle, chiffre);
  } finally {
    cle.fill(0);
  }
}
