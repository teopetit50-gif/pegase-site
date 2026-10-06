// Le coffre Tamila : il déballe une clé de dossier côté serveur, pour le lecteur ou pour un membre
// habilité, et il enveloppe (nouvelle clé, ré-enveloppement local → scaleway). Il ne décide d'aucun
// droit : chaque geste commence par une porte de b4_05, qui refuse ou rend l'enveloppe, et journalise.
// Il ne garde rien : la clé de dossier n'existe qu'en mémoire, le temps d'une requête, et n'est jamais
// écrite au journal de la fonction.

import { LONGUEUR_CLE, ouvre } from "./aesgcm.ts";
import { ErreurCoffre, type KeyManager, nomCleMaitre } from "./keymanager.ts";
import { depuisBase64, depuisHex, versBase64, versHex } from "./octets.ts";
import { ErreurPorte, type PortesCoffre, type Remise } from "./portes.ts";

export type Appelant = { type: "serveur" } | { type: "personne"; jeton: string };

export interface Demande {
  action?: unknown;
  client?: unknown;
  dossier?: unknown;
  piece?: unknown;
  cle?: unknown;
}

export interface Reponse {
  statut: number;
  corps: Record<string, unknown>;
}

export interface Contexte {
  portes: PortesCoffre;
  /** null : les secrets SCALEWAY_* ne sont pas posés ; le coffre répond 503 sans rien tenter. */
  km: KeyManager | null;
  journal: (niveau: "info" | "alerte" | "erreur", message: string, detail?: Record<string, unknown>) => void;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REFERENCE = /^scaleway:([a-z]{2}-[a-z]{3}):([0-9a-f-]{36})$/;

const refus = (statut: number, code: string, message: string): Reponse => ({ statut, corps: { erreur: code, message } });

function uuid(v: unknown): string | null {
  return typeof v === "string" && UUID.test(v) ? v : null;
}

/** La clé maître et la région qu'une référence de tamila_cles désigne. */
export function lireReference(reference: string): { region: string; cleMaitre: string } {
  const m = REFERENCE.exec(reference);
  if (!m) throw new ErreurCoffre("KM_REPONSE", "référence de clé illisible");
  return { region: m[1], cleMaitre: m[2] };
}

function kmPour(ctx: Contexte, region: string): KeyManager {
  if (!ctx.km) throw new ErreurCoffre("KM_ABSENT", "coffre non configuré : SCALEWAY_SECRET_KEY et SCALEWAY_PROJECT_ID absentes");
  if (ctx.km.region !== region) throw new ErreurCoffre("KM_ABSENT", `la clé maître est en ${region}, le coffre est réglé sur ${ctx.km.region}`);
  return ctx.km;
}

function versReponse(e: unknown, ctx: Contexte, action: string): Reponse {
  if (e instanceof ErreurPorte) return refus(e.http, `porte_${e.sqlstate}`, e.message);
  if (e instanceof ErreurCoffre) {
    ctx.journal(e.code === "KM_ABSENT" ? "alerte" : "erreur", `coffre : ${action} impossible`, { code: e.code, motif: e.message });
    return refus(e.code === "KM_REFUS" ? 502 : 503, e.code, e.message);
  }
  ctx.journal("erreur", `coffre : ${action} en erreur`, { motif: (e as Error)?.message ?? String(e) });
  return refus(500, "ERREUR_INTERNE", "erreur interne du coffre");
}

/** Déballe l'enveloppe remise par une porte, conclut la remise au journal, rend la clé (32 octets). */
async function deballer(ctx: Contexte, remise: Remise): Promise<Uint8Array> {
  if (!remise.journal || !remise.reference || !remise.enveloppe) throw new ErreurCoffre("KM_REPONSE", "remise incomplète");
  try {
    const { region, cleMaitre } = lireReference(remise.reference);
    const cle = await kmPour(ctx, region).dechiffrer(cleMaitre, depuisHex(remise.enveloppe), remise.dossier);
    if (cle.length !== LONGUEUR_CLE) {
      cle.fill(0);
      throw new ErreurCoffre("KM_REPONSE", "le déballage n'a pas rendu une clé de 32 octets");
    }
    await ctx.portes.conclure(remise.journal, "deballe", {});
    return cle;
  } catch (e) {
    await ctx.portes.conclure(remise.journal, "echec", { code: e instanceof ErreurCoffre ? e.code : "ERREUR_INTERNE" }).catch(() => {});
    throw e;
  }
}

export async function traiter(ctx: Contexte, appelant: Appelant, d: Demande): Promise<Reponse> {
  const action = typeof d.action === "string" ? d.action : "";
  const pourServeur = action === "cle_piece";
  if (!["activer", "nouvelle_cle", "cle_dossier", "cle_piece", "reenvelopper"].includes(action)) {
    return refus(400, "ACTION_INCONNUE", "action attendue : activer, nouvelle_cle, cle_dossier, cle_piece ou reenvelopper");
  }
  if (pourServeur !== (appelant.type === "serveur")) {
    return refus(
      403,
      "APPELANT_REFUSE",
      pourServeur ? "cle_piece est réservée au lecteur (clé de service)" : "ce geste se fait au nom d'une personne connectée",
    );
  }
  try {
    switch (action) {
      case "activer":
        return await activer(ctx, (appelant as { jeton: string }).jeton, d);
      case "nouvelle_cle":
        return await nouvelleCle(ctx, (appelant as { jeton: string }).jeton, d);
      case "cle_dossier":
        return await cleDossier(ctx, (appelant as { jeton: string }).jeton, d);
      case "cle_piece":
        return await clePiece(ctx, d);
      default:
        return await reenvelopper(ctx, (appelant as { jeton: string }).jeton, d);
    }
  } catch (e) {
    return versReponse(e, ctx, action);
  }
}

// Le gérant passe son cabinet au coffre : la base prouve qu'il est gérant, le Key Manager crée (ou retrouve)
// la clé maître du cabinet, le serveur la pose.
async function activer(ctx: Contexte, jeton: string, d: Demande): Promise<Reponse> {
  const client = uuid(d.client);
  if (!client) return refus(400, "CLIENT_ILLISIBLE", "client attendu (uuid)");
  const a = await ctx.portes.demanderActivation(jeton, client);
  if (a.statut !== "local" && a.cle_maitre) return { statut: 200, corps: { statut: a.statut, deja: true } };
  if (!ctx.km) throw new ErreurCoffre("KM_ABSENT", "coffre non configuré : SCALEWAY_SECRET_KEY et SCALEWAY_PROJECT_ID absentes");
  const cleMaitre = await ctx.km.trouverOuCreerCle(nomCleMaitre(client), "Omega Tamila : clé maître du cabinet (enveloppe les clés de dossier)");
  const r = await ctx.portes.activer(client, ctx.km.region, cleMaitre, a.par);
  ctx.journal("info", "coffre activé", { client, statut: r.statut, dossiers_locaux: r.dossiers_locaux ?? null });
  return { statut: 200, corps: { statut: r.statut, deja: r.deja, dossiers_locaux: r.dossiers_locaux ?? 0 } };
}

// Une clé pour un dossier qui va s'ouvrir : tirée ici, enveloppée sous la clé maître avec l'identifiant
// du dossier en données associées, rendue au navigateur avec son enveloppe.
async function nouvelleCle(ctx: Contexte, jeton: string, d: Demande): Promise<Reponse> {
  const client = uuid(d.client);
  if (!client) return refus(400, "CLIENT_ILLISIBLE", "client attendu (uuid)");
  const n = await ctx.portes.pourNouvelleCle(jeton, client);
  const cle = crypto.getRandomValues(new Uint8Array(LONGUEUR_CLE));
  try {
    const enveloppe = await kmPour(ctx, n.region).chiffrer(n.cle_maitre, cle, n.dossier);
    await ctx.portes.conclure(n.journal, "emise", {});
    return {
      statut: 200,
      corps: { dossier: n.dossier, fournisseur: "scaleway", reference: n.reference, enveloppe: versHex(enveloppe), cle: versBase64(cle) },
    };
  } catch (e) {
    await ctx.portes.conclure(n.journal, "echec", { code: e instanceof ErreurCoffre ? e.code : "ERREUR_INTERNE" }).catch(() => {});
    throw e;
  } finally {
    cle.fill(0);
  }
}

// Un membre qui voit le dossier : la clé, déballée.
async function cleDossier(ctx: Contexte, jeton: string, d: Demande): Promise<Reponse> {
  const dossier = uuid(d.dossier);
  if (!dossier) return refus(400, "DOSSIER_ILLISIBLE", "dossier attendu (uuid)");
  const piece = d.piece == null ? null : uuid(d.piece);
  if (d.piece != null && !piece) return refus(400, "PIECE_ILLISIBLE", "pièce attendue (uuid)");
  const remise = await ctx.portes.pourMembre(jeton, dossier, piece);
  if (!remise) return refus(409, "CLE_INACTIVE", "le dossier n'a plus de clé active");
  if (remise.fournisseur === "local") return { statut: 200, corps: { dossier, fournisseur: "local" } };
  const cle = await deballer(ctx, remise);
  try {
    return { statut: 200, corps: { dossier, fournisseur: "scaleway", cle: versBase64(cle) } };
  } finally {
    cle.fill(0);
  }
}

// Le lecteur, pour une pièce à lire.
async function clePiece(ctx: Contexte, d: Demande): Promise<Reponse> {
  const piece = uuid(d.piece);
  if (!piece) return refus(400, "PIECE_ILLISIBLE", "pièce attendue (uuid)");
  const remise = await ctx.portes.pourLecteur(piece);
  if (remise.fournisseur === "local") return { statut: 200, corps: { piece, dossier: remise.dossier, fournisseur: "local" } };
  const cle = await deballer(ctx, remise);
  try {
    ctx.journal("info", "clé déballée pour le lecteur", { piece, dossier: remise.dossier, journal: remise.journal });
    return { statut: 200, corps: { piece, dossier: remise.dossier, fournisseur: "scaleway", cle: versBase64(cle) } };
  } finally {
    cle.fill(0);
  }
}

// Le ré-enveloppement : la personne qui a la phrase a déballé la clé dans son navigateur et l'envoie ; le
// coffre vérifie qu'elle ouvre le témoin du dossier (étiquette GCM), l'enveloppe sous la clé maître, et le
// serveur pose la nouvelle enveloppe. Aucune pièce n'est touchée : la clé reste la même.
async function reenvelopper(ctx: Contexte, jeton: string, d: Demande): Promise<Reponse> {
  const dossier = uuid(d.dossier);
  if (!dossier) return refus(400, "DOSSIER_ILLISIBLE", "dossier attendu (uuid)");
  let cle: Uint8Array;
  try {
    cle = typeof d.cle === "string" ? depuisBase64(d.cle) : new Uint8Array();
  } catch {
    cle = new Uint8Array();
  }
  try {
    if (cle.length !== LONGUEUR_CLE) return refus(400, "CLE_ILLISIBLE", "clé attendue : 32 octets en base64");
    const a = await ctx.portes.aReenvelopper(jeton, dossier);
    if (a.deja) return { statut: 200, corps: { dossier, deja: true } };
    if (!a.journal || !a.temoin || !a.region || !a.cle_maitre) throw new ErreurCoffre("KM_REPONSE", "demande de ré-enveloppement incomplète");
    if (!(await ouvre(cle, depuisHex(a.temoin)))) {
      await ctx.portes.conclure(a.journal, "refuse", { motif: "temoin" });
      return refus(422, "CLE_FAUSSE", "cette clé n'ouvre pas le dossier : rien n'est changé");
    }
    let enveloppe: Uint8Array;
    try {
      enveloppe = await kmPour(ctx, a.region).chiffrer(a.cle_maitre, cle, dossier);
    } catch (e) {
      await ctx.portes.conclure(a.journal, "echec", { code: e instanceof ErreurCoffre ? e.code : "ERREUR_INTERNE" }).catch(() => {});
      throw e;
    }
    const r = await ctx.portes.reenveloppe(a.journal, versHex(enveloppe));
    ctx.journal("info", "clé de dossier ré-enveloppée", { dossier, pieces_relancees: r.pieces_relancees, dossiers_locaux: r.dossiers_locaux });
    return { statut: 200, corps: { dossier, deja: false, statut: r.statut, pieces_relancees: r.pieces_relancees, dossiers_locaux: r.dossiers_locaux } };
  } finally {
    cle.fill(0);
  }
}
