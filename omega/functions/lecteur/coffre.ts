// Le coffre Tamila (B4, b4_05 et b4_08) : la clé du dossier d'une pièce chiffrée (« dossier:v1 »), demandée à la
// fonction tamila-coffre avec la clé de service ; le déchiffrement du fichier en mémoire ; la lecture rendue au
// socle CHIFFRÉE avec la même clé (enregistrer_lecture n'accepte rien en clair pour une pièce chiffrée) ; puis la
// passerelle « avis RPVA lu → délais », qui ne fait sortir que les dates, la partie visée et le rang.
// Le code du coffre est celui de B4, importé tel quel et figé à son commit : un seul format, un seul client.
// Ni la clé ni le clair ne sont journalisés ni gardés : la clé est effacée par lire_piece à la fin du travail.
//
// Format d'un chiffré rangé par le lecteur (pieces_pages.texte_chiffre, pieces_valeurs.chiffre) : celui de Tamila,
// 01 ‖ nonce 12 ‖ chiffré ‖ étiquette 16 (AES-256-GCM, clé du dossier), sur le texte UTF-8 de :
//   · une page : son texte ;
//   · une valeur : le JSON {"valeur": …, "texte": …, "boite": …, "controle": …} (les clés absentes sont omises).

import type { Depot, Telechargement } from "@partage/depot.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import type { PageLue, ResultatLecture, ValeurLue } from "@partage/portes.ts";
// URL complète plutôt qu'un alias : la coquille déployée ne mappe que @partage/, et ce commit de B4 est figé.
// deno-lint-ignore no-import-prefix
import { chiffrer } from "https://raw.githubusercontent.com/teopetit50-gif/pegase-site/2556214e4befd2c8ad09f9a65c95227e70571e06/omega/functions/tamila-coffre/aesgcm.ts";
// deno-lint-ignore no-import-prefix
import { depuisBase64, depuisHex, versBase64 } from "https://raw.githubusercontent.com/teopetit50-gif/pegase-site/2556214e4befd2c8ad09f9a65c95227e70571e06/omega/functions/tamila-coffre/octets.ts";
import {
  type AvisLu,
  avisDepuisLecture,
  type ClePiece,
  clePourPiece,
  dechiffrerPiece,
  dossierPourLecteur,
  type DossierPourLecteur,
  ErreurCleCoffre,
  poserAvisLu,
  rgConcorde,
  // deno-lint-ignore no-import-prefix
} from "https://raw.githubusercontent.com/teopetit50-gif/pegase-site/2556214e4befd2c8ad09f9a65c95227e70571e06/omega/functions/tamila-coffre/lecteur.ts";

export type { AvisLu, ClePiece, DossierPourLecteur };

export interface CoffreTamila {
  /** La clé de la pièce (scaleway) ou « local » quand le cabinet n'a pas de coffre serveur. */
  clePiece(piece: string): Promise<ClePiece>;
  /** Le dossier de la pièce : son n° RG chiffré (hex) et si l'avis est déjà posé (porte tamila_dossier_pour_lecteur). */
  dossier(piece: string): Promise<DossierPourLecteur>;
  /** Pose l'avis lu (porte tamila_avis_du_lecteur) ; idempotent côté socle. */
  poserAvis(piece: string, avis: AvisLu, concorde: boolean | null): Promise<{ avis: string; statut: string; effet: string; deja_lu?: boolean }>;
}

function erreurDuCoffre(e: unknown): unknown {
  if (e instanceof ErreurCleCoffre) {
    // Le message du coffre ne porte jamais la clé ; il est gardé court.
    return new ErreurOuvrier(e.reprendre ? "COFFRE_INDISPONIBLE" : "COFFRE_REFUSE", `${e.code} (${e.statut}) : ${e.message}`.slice(0, 300), e.reprendre);
  }
  return e;
}

export class CoffreRpc implements CoffreTamila {
  constructor(private cfg: { url: string; cleService: string }, private fetchFn: typeof fetch = fetch) {}
  async clePiece(piece: string): Promise<ClePiece> {
    try {
      return await clePourPiece(this.cfg, piece, this.fetchFn);
    } catch (e) {
      throw erreurDuCoffre(e);
    }
  }
  async dossier(piece: string): Promise<DossierPourLecteur> {
    try {
      return await dossierPourLecteur(this.cfg, piece, this.fetchFn);
    } catch (e) {
      throw erreurDuCoffre(e);
    }
  }
  async poserAvis(piece: string, avis: AvisLu, concorde: boolean | null) {
    try {
      return await poserAvisLu(this.cfg, piece, avis, concorde, this.fetchFn);
    } catch (e) {
      throw erreurDuCoffre(e);
    }
  }
}

/**
 * Un dépôt qui rend le fichier de la pièce déchiffré, une seule fois. La clé n'est PAS effacée ici : elle sert encore
 * à chiffrer la lecture et à déchiffrer le n° RG du dossier ; lire_piece l'efface à la fin du travail, quoi qu'il
 * arrive. Une clé qui n'ouvre pas le fichier (étiquette GCM fausse, octets altérés) est une panne définitive.
 */
export function depotDechiffrant(depot: Depot, cle: Uint8Array): Depot {
  let servie = false;
  return {
    async telecharger(chemin: string): Promise<Telechargement> {
      if (servie) throw new ErreurOuvrier("ERREUR_INTERNE", "fichier chiffré déjà servi", false);
      servie = true;
      const t = await depot.telecharger(chemin);
      if (!t.present) return t;
      try {
        return { ...t, octets: await dechiffrerPiece(cle, t.octets) };
      } catch {
        throw new ErreurOuvrier("CHIFFRE_ILLISIBLE", "la clé du coffre n'ouvre pas le fichier chiffré (clé fausse ou fichier altéré)", false);
      }
    },
  };
}

const utf8 = new TextEncoder();

/** Un texte chiffré sous la clé du dossier, au format Tamila, en base64. */
export async function chiffrerTexte(cle: Uint8Array, texte: string): Promise<string> {
  return versBase64(await chiffrer(cle, utf8.encode(texte)));
}

/** L'inverse ; accepte le base64 ou l'hexadécimal « \\x… » d'un bytea rendu par PostgREST. */
export async function dechiffrerTexte(cle: Uint8Array, chiffre: string): Promise<string> {
  const octets = chiffre.startsWith("\\x") ? depuisHex(chiffre) : depuisBase64(chiffre);
  return new TextDecoder().decode(await dechiffrerPiece(cle, octets));
}

/** Les motifs que le lecteur écrit lui-même (noms de champs, jamais de contenu) ; les autres sont remplacés. */
function motifSansClair(r: ResultatLecture): string | undefined {
  if (!r.motif) return undefined;
  if (/^(À vérifier : [a-z0-9_., ]+\.|Type de pièce non reconnu pour le module [a-z_]+ : une personne le tranche\.|Type « [a-z0-9_]+ » incertain \(\d+ %\) : une personne le tranche\.)$/.test(r.motif)) {
    return r.motif;
  }
  return {
    lue: undefined,
    a_verifier: "À vérifier sur la pièce.",
    a_classer: "Type de pièce incertain : une personne le tranche.",
    rejetee: "Pièce refusée.",
    echec: "Pièce chiffrée illisible après déchiffrement.",
  }[r.statut];
}

/**
 * La lecture telle qu'enregistrer_lecture l'accepte pour une pièce chiffrée : pages en texte_chiffre, valeurs en
 * chiffre (valeur, citation, boîte et contrôle dedans), motif ramené à une phrase sans contenu de la pièce.
 * Les numéros de page, méthodes, sources, confiances et « vérifiée » restent en clair (ils ne disent rien du dossier).
 */
export async function chiffrerLecture(r: ResultatLecture, cle: Uint8Array): Promise<ResultatLecture> {
  const pages = await Promise.all(r.pages.map(async (p: PageLue) => {
    const { texte, ...reste } = p;
    return { ...reste, texte: "", texte_chiffre: versBase64(await chiffrer(cle, utf8.encode(texte ?? ""))) } as PageLue;
  }));
  const valeurs = await Promise.all(r.valeurs.map(async (v: ValeurLue) => {
    const clair: Record<string, unknown> = { valeur: v.valeur };
    if (v.texte !== undefined) clair.texte = v.texte;
    if (v.boite !== undefined) clair.boite = v.boite;
    if (v.controle !== undefined) clair.controle = v.controle;
    return {
      champ: v.champ,
      valeur: null,
      page: v.page,
      source: v.source,
      confiance: v.confiance,
      verifiee: v.verifiee,
      chiffre: versBase64(await chiffrer(cle, utf8.encode(JSON.stringify(clair)))),
    } as unknown as ValeurLue;
  }));
  return { ...r, pages, valeurs, motif: motifSansClair(r) };
}

export interface BilanAvis {
  /** posé, déjà posé, ou pourquoi rien n'a été posé */
  avis: "pose" | "deja" | "pas_un_avis" | "date_absente";
  effet?: string;
  statut?: string;
  rg_concorde?: boolean | null;
}

/**
 * La passerelle « avis RPVA lu → délais » (b4_08), une fois la lecture enregistrée : seules les valeurs VÉRIFIÉES
 * que tamila_avis_lu lit sortent (dates, partie visée, rang) ; le n° RG du dossier est déchiffré en mémoire pour
 * la concordance, jamais gardé.
 */
export async function poserAvisTamila(coffre: CoffreTamila, pieceId: string, r: ResultatLecture, cle: Uint8Array): Promise<BilanAvis> {
  const avis = avisDepuisLecture(r.type_piece, r.valeurs);
  if (!avis) {
    return { avis: r.type_piece && r.type_piece.startsWith("rpva_") ? "date_absente" : "pas_un_avis" };
  }
  const d = await coffre.dossier(pieceId);
  if (d.avis_deja) return { avis: "deja" };
  let rgDossier: string | null = null;
  if (d.numero_rg) {
    try {
      rgDossier = new TextDecoder().decode(await dechiffrerPiece(cle, depuisHex(d.numero_rg)));
    } catch {
      rgDossier = null; // un RG illisible laisse la concordance « non vérifiée », jamais « concorde »
    }
  }
  const concorde = rgConcorde(avis.numeroRg, rgDossier);
  const pose = await coffre.poserAvis(pieceId, avis, concorde);
  return { avis: pose.deja_lu ? "deja" : "pose", effet: pose.effet, statut: pose.statut, rg_concorde: concorde };
}
