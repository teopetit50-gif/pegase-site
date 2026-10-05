// L'extraction structurée par Claude sur Bedrock. Trois entrées possibles :
// du texte (pages natives, OCR, tableur), un PDF entier (pages sans texte,
// lecture visuelle), une image (photo, scan, ticket). Une seule sortie : le
// résultat de l'outil « lire_piece », au schéma FILED.

import { base64, type ClientBedrock, coutEur, type Usage } from "@partage/bedrock.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import type { FormatImage } from "./detecter.ts";
import { SCHEMA_OUTIL_LECTURE, SCHEMA_OUTIL_TRANSCRIPTION, type TypePiece } from "./schemas/facture.ts";
import type { LigneBrute, ValeurBrute } from "./verifier.ts";

export type EntreeIa =
  | { mode: "texte"; pages: { n: number; texte: string }[] }
  | { mode: "document"; octets: Uint8Array; nbPages: number }
  | { mode: "image"; octets: Uint8Array; format: FormatImage };

/** Ce que l'outil rend, tel quel, avant vérification. */
export interface SortieOutil {
  lisible: boolean;
  motif?: string;
  type_piece: TypePiece | string;
  confiance_type: number;
  manuscrit?: boolean;
  pages?: { n: number; texte: string; confiance?: number; manuscrit?: boolean }[];
  valeurs: ValeurBrute[];
  lignes?: LigneBrute[];
  tva_ventilation?: LigneBrute[];
  decoupage?: { pages: number[]; type_piece?: string; numero?: string | null }[];
}

export interface SortieIa {
  brut: SortieOutil;
  usage: Usage;
  modele: string;
  cout_eur: number;
}

export interface ContextePiece {
  nom_fichier: string;
  mime: string;
  module: string;
}

export interface PageTranscrite {
  n: number;
  texte: string;
  confiance?: number;
  manuscrit?: boolean;
}

export interface SortieTranscription {
  pages: PageTranscrite[];
  usage: Usage;
  modele: string;
  cout_eur: number;
}

export interface MorceauATranscrire {
  octets: Uint8Array;
  /** Numéro, dans le document complet, de la première et de la dernière page du morceau. */
  debut: number;
  fin: number;
}

export interface Extracteur {
  readonly modele: string;
  /** Coût estimé en euros avant d'appeler, pour le plafond. */
  estimer(e: EntreeIa): number;
  extraire(e: EntreeIa, piece: ContextePiece): Promise<SortieIa>;
  /** Transcription seule d'un morceau de PDF sans texte (gros documents). */
  transcrire(m: MorceauATranscrire, piece: ContextePiece): Promise<SortieTranscription>;
}

export const LIMITE_DOCUMENT_OCTETS = 4_500_000; // Bedrock Converse : 4,5 Mo par document.
export const LIMITE_IMAGE_OCTETS = 3_750_000;

export const CONSIGNE_SYSTEME =
  `Tu es le lecteur d'Omega, une plateforme qui lit les pièces comptables des PME françaises (factures, avoirs, bons de commande, bons de livraison, devis, relevés, contrats, attestations d'assurance, tickets).

Règles absolues :
1. Tu ne devines jamais. Chaque valeur rendue est accompagnée de sa citation EXACTE, copiée caractère pour caractère du document (ponctuation, espaces, virgules comprises), et du numéro de la page où elle se trouve. Si une information n'est pas écrite dans le document, tu ne la rends pas.
2. Les montants se rendent en nombre avec le point décimal (1234.56), les dates en AAAA-MM-JJ, les mentions en booléen. La citation garde la forme imprimée (« 1 234,56 € », « 05/03/2026 »).
3. Les montants de tête (montant_ht, montant_tva, montant_ttc, net_a_payer) sont ceux du TOTAL du document, pas d'une ligne.
4. Le fournisseur est l'émetteur du document ; l'acheteur, son destinataire. Un SIREN a 9 chiffres, un SIRET 14, un numéro de TVA français commence par FR.
5. Si le fichier contient plusieurs documents distincts (plusieurs factures à la suite), tu décris le PREMIER dans les valeurs et tu rends le découpage complet dans « decoupage », avec les pages de chacun.
6. Si le document est vide, flou ou illisible au point qu'aucune valeur ne peut être citée, tu rends lisible = false avec un motif court.
7. Si le document est lisible mais n'est pas une pièce de gestion (photo quelconque, courrier sans montant), tu rends type_piece = "autre" avec un motif court.
8. Quand le document t'est fourni en image ou en PDF sans texte, tu rends d'abord dans « pages » la transcription fidèle et complète de chaque page, dans l'ordre de lecture, sans corriger ni compléter. Les citations des valeurs doivent se retrouver mot pour mot dans cette transcription. Indique manuscrit = true si l'essentiel est écrit à la main.
9. Tu réponds uniquement par l'outil lire_piece, en français.`;

function consigneTexte(pages: { n: number; texte: string }[], piece: ContextePiece): string {
  const corps = pages.map((p) => `===== Page ${p.n} =====\n${p.texte}`).join("\n\n");
  return `Fichier : ${piece.nom_fichier} (${piece.mime}), module ${piece.module}. Voici le texte du document, page par page. Lis-le et rends l'outil lire_piece.\n\n${corps}`;
}

export class ExtracteurBedrock implements Extracteur {
  constructor(private readonly client: ClientBedrock) {}

  get modele(): string {
    return this.client.modele;
  }

  estimer(e: EntreeIa): number {
    let entree = 2500; // la consigne et le schéma
    if (e.mode === "texte") entree += Math.ceil(e.pages.reduce((s, p) => s + p.texte.length, 0) / 3.5);
    else if (e.mode === "document") entree += e.nbPages * 1800;
    else entree += 1800;
    return coutEur(this.client.cfg, { tokens_entree: entree, tokens_sortie: 2500 });
  }

  async extraire(e: EntreeIa, piece: ContextePiece): Promise<SortieIa> {
    const contenu = [];
    if (e.mode === "texte") {
      contenu.push({ text: consigneTexte(e.pages, piece) });
    } else if (e.mode === "document") {
      if (e.octets.length > LIMITE_DOCUMENT_OCTETS) {
        throw new ErreurOuvrier("ERREUR_INTERNE", `document de ${e.octets.length} octets : au-delà des 4,5 Mo de la lecture visuelle`, false);
      }
      contenu.push({ document: { format: "pdf" as const, name: "piece", source: { bytes: base64(e.octets) } } });
      contenu.push({
        text:
          `Fichier : ${piece.nom_fichier} (${piece.mime}), module ${piece.module}, ${e.nbPages} page(s) sans texte extractible. Transcris chaque page dans « pages », puis rends l'outil lire_piece.`,
      });
    } else {
      if (e.octets.length > LIMITE_IMAGE_OCTETS) {
        throw new ErreurOuvrier("ERREUR_INTERNE", `image de ${e.octets.length} octets : au-delà des 3,75 Mo de la lecture visuelle`, false);
      }
      contenu.push({ image: { format: e.format, source: { bytes: base64(e.octets) } } });
      contenu.push({
        text:
          `Fichier : ${piece.nom_fichier} (${piece.mime}), module ${piece.module}. Une image : transcris-la dans « pages » (page 1), puis rends l'outil lire_piece.`,
      });
    }
    const rep = await this.client.converse({
      system: CONSIGNE_SYSTEME,
      contenu,
      outil: {
        name: "lire_piece",
        description: "Rend la lecture structurée de la pièce : nature, pages transcrites s'il y a lieu, valeurs citées, lignes, ventilation de TVA, découpage.",
        schema: SCHEMA_OUTIL_LECTURE,
      },
      maxTokens: 16000,
    });
    const brut = normaliserSortie(rep.entree);
    return { brut, usage: rep.usage, modele: this.modele, cout_eur: coutEur(this.client.cfg, rep.usage) };
  }

  async transcrire(m: MorceauATranscrire, piece: ContextePiece): Promise<SortieTranscription> {
    if (m.octets.length > LIMITE_DOCUMENT_OCTETS) {
      throw new ErreurOuvrier("ERREUR_INTERNE", `morceau de ${m.octets.length} octets : au-delà des 4,5 Mo de la lecture visuelle`, false);
    }
    const rep = await this.client.converse({
      system: CONSIGNE_SYSTEME,
      contenu: [
        { document: { format: "pdf", name: "morceau", source: { bytes: base64(m.octets) } } },
        {
          text:
            `Fichier : ${piece.nom_fichier} (${piece.mime}), module ${piece.module}. Ce PDF est un MORCEAU d'un document plus long : ses pages sont les pages ${m.debut} à ${m.fin} du document complet. Transcris fidèlement chaque page, numérotée de ${m.debut} à ${m.fin}, et rends l'outil transcrire_pages.`,
        },
      ],
      outil: { name: "transcrire_pages", description: "Rend la transcription page par page d'un morceau de document.", schema: SCHEMA_OUTIL_TRANSCRIPTION },
      maxTokens: 16000,
    });
    const o = (rep.entree && typeof rep.entree === "object" ? rep.entree : {}) as { pages?: unknown };
    const pages = (Array.isArray(o.pages) ? (o.pages as PageTranscrite[]) : [])
      .filter((p) => p && typeof p === "object" && typeof p.texte === "string")
      .map((p, i) => ({ ...p, n: Number.isInteger(p.n) && p.n >= m.debut && p.n <= m.fin ? p.n : m.debut + i }));
    return { pages, usage: rep.usage, modele: this.modele, cout_eur: coutEur(this.client.cfg, rep.usage) };
  }
}

/** Le modèle rend parfois des formes approchantes : on les remet d'équerre sans rien inventer. */
export function normaliserSortie(x: unknown): SortieOutil {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const tableau = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const conf = Number(o.confiance_type);
  return {
    lisible: o.lisible !== false,
    motif: typeof o.motif === "string" ? o.motif.slice(0, 500) : undefined,
    type_piece: typeof o.type_piece === "string" ? o.type_piece : "autre",
    confiance_type: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0,
    manuscrit: o.manuscrit === true,
    pages: tableau<{ n: number; texte: string; confiance?: number; manuscrit?: boolean }>(o.pages)
      .filter((p) => p && typeof p === "object" && typeof p.texte === "string")
      .map((p, i) => ({ ...p, n: Number.isInteger(p.n) && p.n >= 1 ? p.n : i + 1 })),
    valeurs: tableau<ValeurBrute>(o.valeurs).filter((v) => v && typeof v === "object"),
    lignes: tableau<LigneBrute>(o.lignes),
    tva_ventilation: tableau<LigneBrute>(o.tva_ventilation),
    decoupage: tableau<{ pages: number[]; type_piece?: string; numero?: string | null }>(o.decoupage).filter((d) =>
      d && Array.isArray(d.pages) && d.pages.length > 0
    ),
  };
}
