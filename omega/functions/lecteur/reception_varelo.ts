// Varelo (B1, b1_11) : un bon de livraison lu pré-remplit la réception, par la porte grp_enregistrer_reception, qui
// calcule la date limite de la protestation au transporteur. Seules les valeurs VÉRIFIÉES sur la pièce sortent ;
// sans transporteur ni date de livraison vérifiés, ou sans société connue, rien n'est posé (la raison est dite).
// La société : l'objet de la pièce (objet_type « grp_societes », objet_id = l'entité). Un échec ne défait pas la
// lecture, déjà enregistrée : il est dit dans le résultat du travail, la réception reste à saisir à la main.

import { type ConfigSupabase, rpc } from "@partage/portes.ts";
import type { Piece, ResultatLecture, ValeurLue } from "@partage/portes.ts";
import { MODES_TRANSPORT, reserveVague } from "./schemas/varelo.ts";

export interface PortesVarelo {
  enregistrerReception(client: string, entite: string, champs: Record<string, unknown>): Promise<{ reception?: string; statut?: string; echeance?: string }>;
}

export class PortesVareloRpc implements PortesVarelo {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchFn: typeof fetch = fetch) {}
  async enregistrerReception(client: string, entite: string, champs: Record<string, unknown>) {
    return await rpc<{ reception?: string; statut?: string; echeance?: string }>(this.cfg, this.fetchFn, "grp_enregistrer_reception", {
      p_client: client,
      p_entite: entite,
      p_champs: champs,
    }) ?? {};
  }
}

export type BilanReception =
  | { reception: "posee"; id?: string; statut?: string; echeance?: string }
  | { reception: "non_posee"; raison: "societe_inconnue" | "transporteur_non_verifie" | "date_non_verifiee" | "date_future" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function verifiee(valeurs: ValeurLue[], champ: string): unknown {
  const v = valeurs.find((x) => x.champ === champ && x.verifiee);
  return v ? v.valeur : undefined;
}

/** Les champs de grp_enregistrer_reception tirés de la lecture, ou la raison de ne rien poser. */
export function champsReception(
  piece: Pick<Piece, "id" | "objet_type" | "objet_id">,
  r: ResultatLecture,
  aujourdhui: string,
): { entite: string; champs: Record<string, unknown> } | { raison: Extract<BilanReception, { reception: "non_posee" }>["raison"] } {
  const entite = piece.objet_type === "grp_societes" && piece.objet_id && UUID.test(piece.objet_id) ? piece.objet_id : null;
  if (!entite) return { raison: "societe_inconnue" };
  const transporteur = verifiee(r.valeurs, "transporteur");
  if (typeof transporteur !== "string" || transporteur.trim() === "") return { raison: "transporteur_non_verifie" };
  const date = verifiee(r.valeurs, "date_livraison");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { raison: "date_non_verifiee" };
  if (date > aujourdhui) return { raison: "date_future" };

  const champs: Record<string, unknown> = { date_reception: date, transporteur: transporteur.trim().slice(0, 200), piece_id: piece.id };
  const mode = verifiee(r.valeurs, "mode");
  if (typeof mode === "string" && (MODES_TRANSPORT as readonly string[]).includes(mode)) champs.mode = mode;
  const document = verifiee(r.valeurs, "document_transport");
  if (typeof document === "string" && document.trim() !== "") champs.document_transport = document.trim().slice(0, 80);
  const expediteur = verifiee(r.valeurs, "expediteur");
  const siren = verifiee(r.valeurs, "expediteur_siren");
  if (typeof expediteur === "string" && expediteur.trim() !== "") {
    champs.expediteur = (typeof siren === "string" && /^\d{9}$/.test(siren) ? `${expediteur.trim()} (SIREN ${siren})` : expediteur.trim()).slice(0, 200);
  }
  const annonces = verifiee(r.valeurs, "colis_annonces");
  const recus = verifiee(r.valeurs, "colis_recus");
  if (Number.isInteger(annonces)) champs.colis_attendus = annonces;
  if (Number.isInteger(recus)) champs.colis_recus = recus;
  const manquant = Number.isInteger(annonces) && Number.isInteger(recus) && (recus as number) < (annonces as number);
  const reserves = verifiee(r.valeurs, "reserves_ecrites");
  // « Sous réserve de déballage » ne vaut pas réserve : ni recopiée dans la lettre, ni comptée comme avarie.
  const reserve = typeof reserves === "string" && !reserveVague(reserves) ? reserves.trim().slice(0, 1000) : null;
  if (reserve) champs.reserves_sur_bon = reserve;
  if (manquant || reserve) {
    // Une réserve précise sans colis manquant est traitée comme une avarie : la livraison part « à examiner »,
    // une personne confirme. Jamais classée conforme sur la foi de la lecture quand le bon porte une réserve.
    champs.manquant = manquant;
    champs.avarie = !manquant;
    const parts = ["Lu sur le bon de livraison, à confirmer :"];
    if (manquant) parts.push(`${annonces} colis annoncés, ${recus} reçus.`);
    if (reserve) parts.push(`Réserves écrites sur le bon : « ${reserve} ».`);
    champs.constat = parts.join(" ").slice(0, 2000);
  }
  return { entite, champs };
}

/** Pose la réception d'un bon de livraison Varelo lu. */
export async function poserReception(portes: PortesVarelo, piece: Pick<Piece, "id" | "client_id" | "objet_type" | "objet_id">, r: ResultatLecture, aujourdhui: string): Promise<BilanReception> {
  const c = champsReception(piece, r, aujourdhui);
  if ("raison" in c) return { reception: "non_posee", raison: c.raison };
  const pose = await portes.enregistrerReception(piece.client_id, c.entite, c.champs);
  return { reception: "posee", id: pose.reception, statut: pose.statut, echeance: pose.echeance };
}
