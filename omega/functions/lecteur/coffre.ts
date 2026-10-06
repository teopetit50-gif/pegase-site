// Le coffre Tamila (B4, b4_05) : la clé du dossier d'une pièce chiffrée (« dossier:v1 »), demandée à la
// fonction tamila-coffre avec la clé de service, puis le déchiffrement en mémoire au téléchargement.
// Le code du coffre est celui de B4, importé tel quel et figé à son commit : un seul format, un seul client.
// Ni la clé ni le clair ne sont journalisés ni gardés : la clé est effacée dès le fichier déchiffré.

import type { Depot, Telechargement } from "@partage/depot.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
// URL complète plutôt qu'un alias : la coquille déployée ne mappe que @partage/, et ce commit de B4 est figé.
// deno-lint-ignore no-import-prefix
import {
  type ClePiece,
  clePourPiece,
  ErreurCleCoffre,
  lirePieceChiffree,
} from "https://raw.githubusercontent.com/teopetit50-gif/pegase-site/e0c4bcc82b0f916018af94f7535df37c2abc913a/omega/functions/tamila-coffre/lecteur.ts";

export type { ClePiece };

export interface CoffreTamila {
  /** La clé de la pièce (scaleway) ou « local » quand le cabinet n'a pas de coffre serveur. */
  clePiece(piece: string): Promise<ClePiece>;
}

export class CoffreRpc implements CoffreTamila {
  constructor(private cfg: { url: string; cleService: string }, private fetchFn: typeof fetch = fetch) {}
  async clePiece(piece: string): Promise<ClePiece> {
    try {
      return await clePourPiece(this.cfg, piece, this.fetchFn);
    } catch (e) {
      if (e instanceof ErreurCleCoffre) {
        // Le message du coffre ne porte jamais la clé ; il est gardé court.
        throw new ErreurOuvrier(e.reprendre ? "COFFRE_INDISPONIBLE" : "COFFRE_REFUSE", `${e.code} (${e.statut}) : ${e.message}`.slice(0, 300), e.reprendre);
      }
      throw e;
    }
  }
}

/**
 * Un dépôt qui rend le fichier de la pièce déchiffré. La clé sert une fois : elle est effacée après le
 * premier téléchargement, réussi ou non. Une clé qui n'ouvre pas le fichier (étiquette GCM fausse, octets
 * altérés) est une panne définitive : pas de reprise.
 */
export function depotDechiffrant(depot: Depot, cle: Uint8Array): Depot {
  let servie = false;
  return {
    async telecharger(chemin: string): Promise<Telechargement> {
      if (servie) throw new ErreurOuvrier("ERREUR_INTERNE", "clé du coffre déjà consommée", false);
      servie = true;
      let t: Telechargement;
      try {
        t = await depot.telecharger(chemin);
      } catch (e) {
        cle.fill(0);
        throw e;
      }
      if (!t.present) {
        cle.fill(0);
        return t;
      }
      try {
        return { ...t, octets: await lirePieceChiffree(cle, t.octets) };
      } catch {
        throw new ErreurOuvrier("CHIFFRE_ILLISIBLE", "la clé du coffre n'ouvre pas le fichier chiffré (clé fausse ou fichier altéré)", false);
      }
    },
  };
}
