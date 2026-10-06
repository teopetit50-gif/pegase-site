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

// ─── La passerelle « avis RPVA lu → délais » (b4_08) ───
// Après avoir lu une pièce chiffrée d'un dossier Tamila (et enregistré sa lecture, chiffrée), le lecteur pose l'avis :
//
//   const d = await dossierPourLecteur(cfg, piece.id);                 // dossier, n° RG chiffré, avis déjà posé ?
//   const avis = avisDepuisLecture(resultat.type_piece, resultat.valeurs);
//   if (avis && !d.avis_deja) {
//     const rgDossier = d.numero_rg ? new TextDecoder().decode(await dechiffrer(cleDossier, depuisHex(d.numero_rg))) : null;
//     await poserAvisLu(cfg, piece.id, avis, rgConcorde(avis.numeroRg, rgDossier));
//   }
//
// Seules les valeurs que tamila_avis_lu lit sortent du lecteur (dates, partie visée, rang) ; la porte refuse le reste.

export const TYPES_AVIS = [
  "rpva_avis_fixation",
  "rpva_avis_902",
  "rpva_declaration_appel",
  "rpva_conclusions",
  "rpva_appel_incident",
  "rpva_intervention",
  "rpva_ordonnance_mee",
  "rpva_avis_audience",
  "rpva_accuse_depot",
  "rpva_interruption",
] as const;
export type TypeAvis = typeof TYPES_AVIS[number];

const CLES_AVIS = ["date_avis", "date_audience", "date_cloture_previsible", "date_limite", "partie_visee", "rang", "depose_le"] as const;

/** Une valeur lue, au format de enregistrer_lecture (les seuls champs utiles ici). */
export interface ValeurLecture {
  champ: string;
  valeur: unknown;
  source: string;
  verifiee: boolean;
}

export interface AvisLu {
  type: TypeAvis;
  valeurs: Record<string, string | number>;
  confiance: "gabarit" | "modele";
  numeroRg: string | null;
}

/**
 * L'avis à poser, ou null si la pièce n'est pas un avis RPVA, ou si sa date (obligatoire) n'a pas été retrouvée sur la
 * page. Seules les valeurs VÉRIFIÉES (citation retrouvée) passent. Confiance « gabarit » si tout vient d'une règle fixe
 * (message e-barreau reconnu), « modele » dès qu'une valeur vient de l'IA.
 */
export function avisDepuisLecture(typePiece: string | null | undefined, valeurs: ValeurLecture[]): AvisLu | null {
  if (!typePiece || !(TYPES_AVIS as readonly string[]).includes(typePiece)) return null;
  const sortie: Record<string, string | number> = {};
  const sources = new Set<string>();
  for (const cle of CLES_AVIS) {
    const v = valeurs.find((x) => x.champ === cle && x.verifiee && x.valeur !== null && x.valeur !== "");
    if (!v) continue;
    if (cle === "rang") {
      const n = Number(v.valeur);
      if (Number.isInteger(n) && n >= 1 && n <= 99) sortie.rang = n;
    } else if (cle === "partie_visee") {
      if (["appelant", "intime", "intervenant"].includes(String(v.valeur))) sortie.partie_visee = String(v.valeur);
    } else if (cle === "date_audience" || cle === "depose_le") {
      if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(String(v.valeur))) sortie[cle] = String(v.valeur);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(v.valeur))) {
      sortie[cle] = String(v.valeur);
    }
    if (cle in sortie) sources.add(v.source);
  }
  if (!sortie.date_avis) return null;
  if (typePiece === "rpva_accuse_depot" && !sortie.depose_le) return null;
  const rg = valeurs.find((x) => x.champ === "numero_rg" && x.verifiee && typeof x.valeur === "string");
  return {
    type: typePiece as TypeAvis,
    valeurs: sortie,
    confiance: [...sources].every((s) => s === "regle" || s === "xml") ? "gabarit" : "modele",
    numeroRg: rg ? String(rg.valeur) : null,
  };
}

/** Le n° RG réduit à ses chiffres et séparateurs : « RG n° 26/04512 » = « 26/04512 ». */
export function normaliserRg(rg: string): string {
  return rg.replace(/^\s*(n°|no|rg|r\.g\.)\s*/gi, "").replace(/[^0-9/]/g, "").replace(/^\/+|\/+$/g, "");
}

/** La concordance du n° RG lu avec celui du dossier : null si l'un des deux manque (le socle le note « non vérifié »). */
export function rgConcorde(lu: string | null, dossier: string | null): boolean | null {
  if (!lu || !dossier) return null;
  const a = normaliserRg(lu), b = normaliserRg(dossier);
  if (!a || !b) return null;
  return a === b;
}

async function porteServeur<T>(cfg: { url: string; cleService: string }, nom: string, params: Record<string, unknown>, fetchFn: typeof fetch): Promise<T> {
  let rep: Response;
  try {
    rep = await fetchFn(`${cfg.url.replace(/\/+$/, "")}/rest/v1/rpc/${nom}`, {
      method: "POST",
      headers: { apikey: cfg.cleService, Authorization: `Bearer ${cfg.cleService}`, "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch (e) {
    throw new ErreurCleCoffre(503, "PORTE_INJOIGNABLE", (e as Error).message, true);
  }
  const corps = await rep.json().catch(() => null) as { code?: string; message?: string } | null;
  if (!rep.ok) {
    throw new ErreurCleCoffre(rep.status, corps?.code ?? "PORTE", corps?.message ?? `porte ${nom} ${rep.status}`, rep.status >= 500 || rep.status === 429);
  }
  return corps as T;
}

export interface DossierPourLecteur {
  piece: string;
  dossier: string;
  client: string;
  statut: string;
  /** le n° RG du dossier, CHIFFRÉ avec la clé du dossier (hexadécimal), ou null */
  numero_rg: string | null;
  avis_deja: boolean;
}

export function dossierPourLecteur(cfg: { url: string; cleService: string }, piece: string, fetchFn: typeof fetch = fetch): Promise<DossierPourLecteur> {
  return porteServeur<DossierPourLecteur>(cfg, "tamila_dossier_pour_lecteur", { p_piece: piece }, fetchFn);
}

export function poserAvisLu(
  cfg: { url: string; cleService: string },
  piece: string,
  avis: AvisLu,
  concorde: boolean | null,
  fetchFn: typeof fetch = fetch,
): Promise<{ avis: string; statut: string; effet: string; deja_lu?: boolean }> {
  return porteServeur(cfg, "tamila_avis_du_lecteur", {
    p_piece: piece,
    p_type: avis.type,
    p_valeurs: avis.valeurs,
    p_confiance: avis.confiance,
    p_rg_concorde: concorde,
  }, fetchFn);
}
