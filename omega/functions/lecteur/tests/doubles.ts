// deno-lint-ignore-file require-await
// Les doubles : des portes en mémoire, un dépôt en mémoire, une IA et un OCR
// qui rendent ce qu'on leur a préparé. Ils enregistrent chaque appel.

import type { Depot, Telechargement } from "@partage/depot.ts";
import type { Piece, Portes, ResultatLecture, Travail } from "@partage/portes.ts";
import type { ContextePiece, EntreeIa, Extracteur, MorceauATranscrire, PageTranscrite, SortieIa, SortieOutil, SortieTranscription } from "../ia.ts";
import type { Ocr, ResultatOcr } from "../ocr.ts";
import type { Contexte } from "../lire_piece.ts";

export class PortesMemoire implements Portes {
  travaux: Travail[] = [];
  pieces = new Map<string, Piece>();
  parametres = new Map<string, string>();
  consommation = new Map<string, number>();
  appels: { porte: string; args: unknown[] }[] = [];
  enregistrements: { piece: string; resultat: ResultatLecture; version: string }[] = [];
  finis: { id: number; resultat: unknown }[] = [];
  echoues: { id: number; erreur: string; reprendre: boolean }[] = [];
  battements: { module: string; genres: string[]; detail: unknown }[] = [];
  /** Pour simuler une porte en panne. */
  panne: Partial<Record<keyof Portes, Error>> = {};
  /** La porte de découpage : absente par défaut (comme avant qu'A4 la pose), un test la branche. */
  creerPiecesFilles?: Portes["creerPiecesFilles"];

  private noter(porte: keyof Portes, ...args: unknown[]) {
    this.appels.push({ porte, args });
    const p = this.panne[porte];
    if (p) throw p;
  }

  async prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string): Promise<Travail[]> {
    this.noter("prendreTravaux", genres, nombre, bail, ouvrier);
    const pris = this.travaux.filter((t) => genres.includes(t.genre)).slice(0, nombre);
    this.travaux = this.travaux.filter((t) => !pris.includes(t));
    return pris;
  }
  async finirTravail(id: number, resultat: unknown): Promise<void> {
    this.noter("finirTravail", id, resultat);
    this.finis.push({ id, resultat });
  }
  async echouerTravail(id: number, erreur: string, reprendre = true): Promise<"repris" | "echec"> {
    this.noter("echouerTravail", id, erreur, reprendre);
    this.echoues.push({ id, erreur, reprendre });
    return reprendre ? "repris" : "echec";
  }
  async commencerLecture(piece: string): Promise<boolean> {
    this.noter("commencerLecture", piece);
    const p = this.pieces.get(piece);
    if (!p || !p.objet_id || !["recue", "en_lecture"].includes(p.statut)) return false;
    p.statut = "en_lecture";
    return true;
  }
  async enregistrerLecture(piece: string, resultat: ResultatLecture, version: string) {
    this.noter("enregistrerLecture", piece, resultat, version);
    const p = this.pieces.get(piece);
    if (!p) throw new Error("Pièce introuvable.");
    if (p.statut !== "en_lecture") throw new Error(`La pièce n'est pas en lecture (statut ${p.statut}).`);
    // Pièce chiffrée : la règle de private.enregistrer_lecture, ni texte ni valeur en clair (et l'inverse).
    const brut = resultat as unknown as { pages: Record<string, unknown>[]; valeurs: Record<string, unknown>[] };
    if (p.chiffrement) {
      if (brut.pages.some((pg) => (pg.texte ?? "") !== "" || !pg.texte_chiffre)) throw new Error("Pièce chiffrée : ni texte ni valeur en clair (page).");
      if (brut.valeurs.some((v) => !v.chiffre || (v.valeur ?? null) !== null || v.texte !== undefined || v.boite !== undefined || v.controle !== undefined)) {
        throw new Error("Pièce chiffrée : ni texte ni valeur en clair (valeur).");
      }
    } else if (brut.pages.some((pg) => "texte_chiffre" in pg) || brut.valeurs.some((v) => "chiffre" in v)) {
      throw new Error("Pièce en clair : rien ne s'y écrit chiffré.");
    }
    // Les mêmes contrôles de forme que la base.
    for (const pg of resultat.pages) {
      if (!["natif", "ocr", "ocr_manuscrit", "vision"].includes(pg.methode)) throw new Error(`methode de page invalide : ${pg.methode}`);
      if (!(pg.n >= 1)) throw new Error("n de page < 1");
    }
    for (const v of resultat.valeurs) {
      if (!/^[a-z][a-z0-9_.]{1,79}$/.test(v.champ)) throw new Error(`champ invalide : ${v.champ}`);
      if (!["xml", "regle", "ia", "tableur"].includes(v.source)) throw new Error(`source invalide : ${v.source}`);
      if (v.controle && v.controle.length > 300) throw new Error("controle trop long");
    }
    if (resultat.motif && resultat.motif.length > 500) throw new Error("motif trop long");
    if (resultat.methode && !["natif", "ocr", "mixte", "xml", "tableur"].includes(resultat.methode)) throw new Error(`methode invalide : ${resultat.methode}`);
    if (version.length > 40) throw new Error("version trop longue");
    p.statut = resultat.statut;
    this.enregistrements.push({ piece, resultat, version });
    return { pages: resultat.pages.length, valeurs: resultat.valeurs.length, statut: resultat.statut };
  }
  async battreOuvrier(module: string, genres: string[], detail: unknown): Promise<number> {
    this.noter("battreOuvrier", module, genres, detail);
    this.battements.push({ module, genres, detail });
    return 1;
  }
  async lirePiece(id: string): Promise<Piece | null> {
    this.noter("lirePiece", id);
    return this.pieces.get(id) ?? null;
  }
  async consommationIaDuJour(client: string): Promise<number> {
    this.noter("consommationIaDuJour", client);
    return this.consommation.get(client) ?? 0;
  }
  async lireParametre(cle: string): Promise<string | null> {
    this.noter("lireParametre", cle);
    return this.parametres.get(cle) ?? null;
  }
}

export class DepotMemoire implements Depot {
  fichiers = new Map<string, Uint8Array>();
  telechargements = 0;
  /** L'écriture au dépôt : absente par défaut, un test la branche. */
  deposer?: Depot["deposer"];
  async telecharger(chemin: string): Promise<Telechargement> {
    this.telechargements++;
    const o = this.fichiers.get(chemin);
    return o ? { present: true, octets: o, mime: null } : { present: false };
  }
}

export class ExtracteurFactice implements Extracteur {
  readonly modele = "eu.anthropic.claude-sonnet-4-5-20250929-v1:0";
  prochaine: SortieOutil | null = null;
  appels: { entree: EntreeIa; piece: ContextePiece }[] = [];
  estimation = 0.01;
  /** La transcription rendue pour une page donnée (gros documents lus par morceaux). */
  transcription: (n: number) => PageTranscrite = (n) => ({ n, texte: `Page ${n} transcrite`, confiance: 0.9 });
  morceaux: MorceauATranscrire[] = [];
  estimer(): number {
    return this.estimation;
  }
  async transcrire(m: MorceauATranscrire): Promise<SortieTranscription> {
    this.morceaux.push(m);
    const pages: PageTranscrite[] = [];
    for (let n = m.debut; n <= m.fin; n++) pages.push(this.transcription(n));
    return { pages, usage: { tokens_entree: 20000, tokens_sortie: 3000 }, modele: this.modele, cout_eur: 0.0966 };
  }
  async extraire(entree: EntreeIa, piece: ContextePiece): Promise<SortieIa> {
    this.appels.push({ entree, piece });
    if (!this.prochaine) throw new Error("le double de l'IA n'a rien à rendre");
    return { brut: this.prochaine, usage: { tokens_entree: 1200, tokens_sortie: 400 }, modele: this.modele, cout_eur: 0.00884 };
  }
}

export class OcrFactice implements Ocr {
  readonly nom = "ocr-factice";
  prochaine: ResultatOcr = { pages: [], cout_eur: 0.00092, fournisseur: "ocr-factice" };
  appels = 0;
  async reconnaitre(): Promise<ResultatOcr> {
    this.appels++;
    return this.prochaine;
  }
}

export function envFactice(valeurs: Record<string, string> = {}) {
  return { get: (n: string) => valeurs[n] };
}

export function pieceDeTest(id: string, nom_fichier: string, mime: string, extra: Partial<Piece> = {}): Piece {
  return {
    id,
    client_id: "cccccccc-0000-4000-8000-00000000000c",
    module: "filed",
    objet_type: "filed_document",
    objet_id: "dddddddd-0000-4000-8000-000000000001",
    source: "depot",
    nom_fichier,
    mime,
    octets: 0,
    sha256: "0".repeat(64),
    chemin: `cccccccc-0000-4000-8000-00000000000c/filed_document/dddddddd-0000-4000-8000-000000000001/${nom_fichier}`,
    statut: "recue",
    chiffrement: null,
    ...extra,
  };
}

export function travailDeTest(id: number, piece: string): Travail {
  return {
    id,
    client_id: "cccccccc-0000-4000-8000-00000000000c",
    module: "filed",
    genre: "lecteur.lire",
    charge: { piece },
    cle: `piece:${piece}`,
    essais: 1,
    essais_max: 5,
  };
}

export function contexteDeTest(options: { ia?: ExtracteurFactice | null; ocr?: OcrFactice | null; env?: Record<string, string> } = {}): {
  ctx: Contexte;
  portes: PortesMemoire;
  depot: DepotMemoire;
  ia: ExtracteurFactice | null;
} {
  const portes = new PortesMemoire();
  const depot = new DepotMemoire();
  const ia = options.ia === undefined ? new ExtracteurFactice() : options.ia;
  const ctx: Contexte = {
    portes,
    depot,
    extracteur: ia,
    ocr: options.ocr ?? null,
    env: envFactice(options.env),
    maintenant: () => new Date("2026-10-05T10:00:00Z"),
    ouvrier: "lecteur-test",
  };
  return { ctx, portes, depot, ia };
}
