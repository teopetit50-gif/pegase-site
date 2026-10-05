// La lecture d'une pièce, de la prise du travail à son résultat. Tout chemin
// finit par une porte : finir_travail ou echouer_travail. Jamais d'exception
// qui sorte d'ici.

import type { Depot } from "@partage/depot.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal, messageDe } from "@partage/journal.ts";
import type { PageLue, Piece, Portes, ResultatLecture, StatutLecture, Travail, ValeurLue } from "@partage/portes.ts";
import { detecter, type Detection } from "./detecter.ts";
import type { EntreeIa, Extracteur, SortieIa } from "./ia.ts";
import type { Ocr } from "./ocr.ts";
import { analyserPdf, type PagePdf, pageSansTexte } from "./pdf.ts";
import { controlerPlafond } from "./plafond.ts";
import { type TypePiece, TYPES_PIECE } from "./schemas/facture.ts";
import { lireCsv, lireXlsx } from "./tableur.ts";
import { valeurLignes, valeurVentilation, verifierValeurs } from "./verifier.ts";
import { estXmlFacture, lireXmlFacture } from "./xml_facture.ts";

export interface Environnement {
  get(nom: string): string | undefined;
}

export interface Contexte {
  portes: Portes;
  depot: Depot;
  extracteur: Extracteur | null;
  ocr: Ocr | null;
  env: Environnement;
  maintenant: () => Date;
  ouvrier: string;
}

export type Issue = "lue" | "a_verifier" | "a_classer" | "rejetee" | "echec" | "ignore" | "repris" | "abandon" | "erreur";

export const SEUIL_TYPE_SUR = 0.6;
const MAX_TEXTE_PAGE = 200_000;

export function versionLecteur(maintenant: Date, modele: string | null): string {
  const jour = maintenant.toISOString().slice(0, 10);
  const court = (modele ?? "sans-ia").replace(/^(eu|us|global)\./, "").replace(/^anthropic\./, "").replace(/-\d{8}-v\d+:\d+$/, "");
  return `lecteur/${jour}/${court}`.slice(0, 40);
}

interface Bilan {
  resultat: ResultatLecture;
  ia: SortieIa | null;
  cout_ocr: number;
  decoupage?: { pages: number[]; type_piece?: string; numero?: string | null }[];
}

export async function lirePiece(ctx: Contexte, travail: Travail): Promise<Issue> {
  const pieceId = typeof travail.charge?.piece === "string" ? travail.charge.piece : null;
  const trace = { travail: travail.id, piece: pieceId, client: travail.client_id };
  try {
    if (!pieceId) {
      await ctx.portes.finirTravail(travail.id, { ignore: "charge sans pièce" });
      journal("alerte", "travail sans pièce, ignoré", trace);
      return "ignore";
    }
    const piece = await ctx.portes.lirePiece(pieceId);
    if (!piece) {
      await ctx.portes.finirTravail(travail.id, { ignore: "pièce introuvable" });
      journal("alerte", "pièce introuvable, travail ignoré", trace);
      return "ignore";
    }
    if (piece.chiffrement) {
      throw new ErreurOuvrier("CHIFFREMENT_NON_PRIS_EN_CHARGE", `pièce chiffrée (${piece.chiffrement}) : hors vague 1`, true);
    }
    if (!(await ctx.portes.commencerLecture(pieceId))) {
      await ctx.portes.finirTravail(travail.id, { ignore: "plus rien à lire", statut: piece.statut });
      journal("info", "pièce déjà lue ou détachée, travail ignoré", { ...trace, statut: piece.statut });
      return "ignore";
    }

    const bilan = await lire(ctx, piece);
    const modele = bilan.ia?.modele ?? null;
    const version = versionLecteur(ctx.maintenant(), modele);
    const enregistre = await ctx.portes.enregistrerLecture(pieceId, bilan.resultat, version);
    const cout = Math.round(((bilan.ia?.cout_eur ?? 0) + bilan.cout_ocr) * 1e6) / 1e6;
    await ctx.portes.finirTravail(travail.id, {
      pages: enregistre.pages,
      valeurs: enregistre.valeurs,
      statut: bilan.resultat.statut,
      type_piece: bilan.resultat.type_piece ?? null,
      methode: bilan.resultat.methode ?? null,
      modele,
      tokens_entree: bilan.ia?.usage.tokens_entree ?? 0,
      tokens_sortie: bilan.ia?.usage.tokens_sortie ?? 0,
      cout_eur: cout,
      ...(bilan.decoupage && bilan.decoupage.length > 1 ? { decoupage: bilan.decoupage } : {}),
    });
    journal("info", "pièce lue", {
      ...trace,
      statut: bilan.resultat.statut,
      type: bilan.resultat.type_piece,
      methode: bilan.resultat.methode,
      pages: enregistre.pages,
      valeurs: enregistre.valeurs,
      cout_eur: cout,
      version,
    });
    return bilan.resultat.statut;
  } catch (e) {
    return await echouer(ctx, travail, e, trace);
  }
}

async function echouer(ctx: Contexte, travail: Travail, e: unknown, trace: Record<string, unknown>): Promise<Issue> {
  const erreur = e instanceof ErreurOuvrier ? e : new ErreurOuvrier("ERREUR_INTERNE", messageDe(e), true);
  journal(erreur.code === "ERREUR_INTERNE" ? "erreur" : "alerte", `lecture interrompue : ${erreur.code}`, { ...trace, motif: erreur.message });
  try {
    const sort = await ctx.portes.echouerTravail(travail.id, erreur.motif, erreur.reprendre);
    return sort === "repris" ? "repris" : "abandon";
  } catch (e2) {
    journal("erreur", "echouer_travail a lui-même échoué", { ...trace, erreur: messageDe(e2) });
    return "erreur";
  }
}

// ---------------------------------------------------------------------------

/** Une pièce qui se lira sans IA (XML Factur-X / UBL nu) : on la télécharge même si Bedrock n'est pas branché. */
export function sembleXml(piece: Pick<Piece, "mime" | "nom_fichier">): boolean {
  return /xml/i.test(piece.mime) || /\.xml$/i.test(piece.nom_fichier);
}

async function lire(ctx: Contexte, piece: Piece): Promise<Bilan> {
  const contexte = { nom_fichier: piece.nom_fichier, mime: piece.mime, module: piece.module };
  // Sans IA, inutile de télécharger ce qu'on ne saura pas lire : on le dit tout de suite.
  if (!ctx.extracteur && !sembleXml(piece)) exigerIa(ctx);
  const tele = await ctx.depot.telecharger(piece.chemin);
  if (!tele.present) {
    return echec(`Fichier absent du dépôt (${piece.chemin}).`);
  }
  const octets = tele.octets;
  if (octets.length === 0) return echec("Fichier vide.");
  const det = detecter(octets, piece.mime, piece.nom_fichier);

  switch (det.famille) {
    case "xml":
      return lireXml(new TextDecoder().decode(octets), []);
    case "pdf":
      return await lirePdf(ctx, piece, octets, contexte);
    case "image":
      return await lireImage(ctx, piece, octets, det, contexte);
    case "tableur":
      return await lireTableur(ctx, piece, octets, det, contexte);
    case "texte": {
      const texte = new TextDecoder().decode(octets);
      if (estXmlFacture(texte)) return lireXml(texte, []);
      const pages: PageLue[] = [{ n: 1, methode: "natif", texte: texte.slice(0, MAX_TEXTE_PAGE), confiance: 1 }];
      return await extraireDepuisTexte(ctx, piece, pages, null, "natif", contexte, 0);
    }
    default:
      return rejet(`Format non pris en charge (${piece.mime}, ${piece.nom_fichier}).`);
  }
}

function echec(motif: string): Bilan {
  return { resultat: { statut: "echec", motif: motif.slice(0, 500), pages: [], valeurs: [] }, ia: null, cout_ocr: 0 };
}

function rejet(motif: string): Bilan {
  return { resultat: { statut: "rejetee", motif: motif.slice(0, 500), pages: [], valeurs: [] }, ia: null, cout_ocr: 0 };
}

function lireXml(xml: string, pagesPdf: PageLue[]): Bilan {
  const lu = lireXmlFacture(xml);
  if (!lu) return echec("XML reconnu mais ni Factur-X (CII) ni UBL : structure inconnue.");
  const pages: PageLue[] = pagesPdf.length > 0 ? pagesPdf : [{ n: 1, methode: "natif", texte: xml.slice(0, MAX_TEXTE_PAGE), confiance: 1 }];
  const cles = ["numero", "date", "montant_ttc", "fournisseur.nom"];
  const manquants = cles.filter((c) => !lu.valeurs.some((v) => v.champ === c && v.verifiee));
  const statut: StatutLecture = manquants.length === 0 ? "lue" : "a_verifier";
  return {
    resultat: {
      statut,
      type_piece: lu.type_piece,
      confiance_type: 1,
      methode: "xml",
      nb_pages: pages.length,
      motif: manquants.length > 0 ? `Champs absents du XML ${lu.norme.toUpperCase()} : ${manquants.join(", ")}.` : undefined,
      pages,
      valeurs: lu.valeurs,
    },
    ia: null,
    cout_ocr: 0,
  };
}

function exigerIa(ctx: Contexte): Extracteur {
  if (!ctx.extracteur) {
    throw new ErreurOuvrier(
      "IA_NON_BRANCHEE",
      "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY ou BEDROCK_MODEL_ID absente : l'extraction attend que Bedrock soit branché.",
      true,
    );
  }
  return ctx.extracteur;
}

async function appelerIa(ctx: Contexte, piece: Piece, entree: EntreeIa, contexte: { nom_fichier: string; mime: string; module: string }): Promise<SortieIa> {
  const ia = exigerIa(ctx);
  await controlerPlafond(ctx.portes, ctx.env, piece.client_id, ia.estimer(entree));
  return await ia.extraire(entree, contexte);
}

async function lirePdf(ctx: Contexte, piece: Piece, octets: Uint8Array, contexte: { nom_fichier: string; mime: string; module: string }): Promise<Bilan> {
  let analyse;
  try {
    analyse = await analyserPdf(octets);
  } catch (e) {
    return echec(`PDF illisible : ${messageDe(e, 200)}`);
  }
  if (analyse.nbPages === 0) return echec("PDF sans page.");

  const pagesNatives: PageLue[] = analyse.pages.map((p) => ({
    n: p.n,
    methode: "natif",
    texte: p.texte.slice(0, MAX_TEXTE_PAGE),
    confiance: 1,
    largeur: p.largeur,
    hauteur: p.hauteur,
  }));

  // Factur-X / ZUGFeRD : le XML joint fait foi, sans IA.
  const pj = analyse.piecesJointes.find((p) => /factur-?x|zugferd|xrechnung|\.xml$/i.test(p.nom));
  if (pj) {
    const xml = new TextDecoder().decode(pj.octets);
    if (estXmlFacture(xml)) return lireXml(xml, pagesNatives);
  }

  const sansTexte = analyse.pages.filter(pageSansTexte);
  if (sansTexte.length === 0) {
    return await extraireDepuisTexte(ctx, piece, pagesNatives, analyse.pages, "natif", contexte, 0);
  }

  // Des pages sans texte : OCR si un service est branché, sinon lecture visuelle par Claude.
  exigerIa(ctx);
  if (ctx.ocr) {
    const ocr = await ctx.ocr.reconnaitre(octets, "pdf");
    const parNumero = new Map(ocr.pages.map((p) => [p.n, p]));
    const pages: PageLue[] = analyse.pages.map((p) => {
      if (!pageSansTexte(p)) return { n: p.n, methode: "natif", texte: p.texte.slice(0, MAX_TEXTE_PAGE), confiance: 1, largeur: p.largeur, hauteur: p.hauteur };
      const o = parNumero.get(p.n);
      return { n: p.n, methode: "ocr", texte: (o?.texte ?? "").slice(0, MAX_TEXTE_PAGE), confiance: o ? 0.9 : 0, largeur: p.largeur, hauteur: p.hauteur };
    });
    const methode = sansTexte.length === analyse.pages.length ? "ocr" : "mixte";
    return await extraireDepuisTexte(ctx, piece, pages, analyse.pages, methode, contexte, ocr.cout_eur);
  }
  const ia = await appelerIa(ctx, piece, { mode: "document", octets, nbPages: analyse.nbPages }, contexte);
  return assembler(ia, analyse.pages, pagesNatives, sansTexte.length === analyse.pages.length ? "ocr" : "mixte", 0);
}

async function lireImage(
  ctx: Contexte,
  piece: Piece,
  octets: Uint8Array,
  det: Detection,
  contexte: { nom_fichier: string; mime: string; module: string },
): Promise<Bilan> {
  exigerIa(ctx);
  if (ctx.ocr) {
    const ocr = await ctx.ocr.reconnaitre(octets, "image", det.formatImage);
    const pages: PageLue[] = ocr.pages.length > 0
      ? ocr.pages.map((p) => ({ n: p.n, methode: "ocr", texte: p.texte.slice(0, MAX_TEXTE_PAGE), confiance: 0.9, largeur: p.largeur, hauteur: p.hauteur }))
      : [{ n: 1, methode: "ocr", texte: "", confiance: 0 }];
    return await extraireDepuisTexte(ctx, piece, pages, null, "ocr", contexte, ocr.cout_eur);
  }
  const ia = await appelerIa(ctx, piece, { mode: "image", octets, format: det.formatImage ?? "jpeg" }, contexte);
  return assembler(ia, null, [], "ocr", 0);
}

async function lireTableur(
  ctx: Contexte,
  piece: Piece,
  octets: Uint8Array,
  det: Detection,
  contexte: { nom_fichier: string; mime: string; module: string },
): Promise<Bilan> {
  let feuilles;
  try {
    feuilles = det.formatTableur === "xlsx" ? await lireXlsx(octets) : lireCsv(new TextDecoder().decode(octets));
  } catch (e) {
    return echec(`Tableur illisible : ${messageDe(e, 200)}`);
  }
  if (feuilles.length === 0 || feuilles.every((f) => f.texte.trim() === "")) return echec("Tableur vide.");
  const pages: PageLue[] = feuilles.map((f, i) => ({ n: i + 1, methode: "natif", texte: `[${f.nom}]\n${f.texte}`.slice(0, MAX_TEXTE_PAGE), confiance: 1 }));
  return await extraireDepuisTexte(ctx, piece, pages, null, "tableur", contexte, 0);
}

async function extraireDepuisTexte(
  ctx: Contexte,
  piece: Piece,
  pages: PageLue[],
  pagesPdf: PagePdf[] | null,
  methode: "natif" | "ocr" | "mixte" | "tableur",
  contexte: { nom_fichier: string; mime: string; module: string },
  coutOcr: number,
): Promise<Bilan> {
  if (pages.every((p) => p.texte.replace(/\s+/g, "") === "")) {
    return { ...echec("Aucun texte lisible sur les pages."), cout_ocr: coutOcr };
  }
  const ia = await appelerIa(ctx, piece, { mode: "texte", pages: pages.map((p) => ({ n: p.n, texte: p.texte })) }, contexte);
  return assembler(ia, pagesPdf, pages, methode, coutOcr);
}

/** Du résultat brut de l'IA au résultat de lecture : pages, valeurs vérifiées, statut. */
export function assembler(
  ia: SortieIa,
  pagesPdf: PagePdf[] | null,
  pagesConnues: PageLue[],
  methode: "natif" | "ocr" | "mixte" | "tableur",
  coutOcr: number,
): Bilan {
  const brut = ia.brut;
  // Les pages : celles qu'on connaît (texte natif, OCR), complétées par la transcription de l'IA pour les autres.
  const parNumero = new Map(pagesConnues.map((p) => [p.n, p]));
  const pages: PageLue[] = [...pagesConnues];
  for (const t of brut.pages ?? []) {
    const existante = parNumero.get(t.n);
    const methodePage = t.manuscrit || brut.manuscrit ? "ocr_manuscrit" : "vision";
    if (!existante) {
      const p: PageLue = {
        n: t.n,
        methode: methodePage,
        texte: t.texte.slice(0, MAX_TEXTE_PAGE),
        confiance: typeof t.confiance === "number" ? t.confiance : 0.8,
      };
      pages.push(p);
      parNumero.set(t.n, p);
    } else if (existante.texte.replace(/\s+/g, "").length < 20 && t.texte.trim() !== "") {
      existante.methode = methodePage;
      existante.texte = t.texte.slice(0, MAX_TEXTE_PAGE);
      existante.confiance = typeof t.confiance === "number" ? t.confiance : 0.8;
    }
  }
  pages.sort((a, b) => a.n - b.n);
  if (pages.length === 0) pages.push({ n: 1, methode: "vision", texte: "", confiance: 0 });

  if (!brut.lisible) {
    return {
      resultat: { statut: "echec", motif: (brut.motif || "Document illisible.").slice(0, 500), methode, nb_pages: pages.length, pages, valeurs: [] },
      ia,
      cout_ocr: coutOcr,
    };
  }

  const verif = verifierValeurs(brut.valeurs, pages, pagesPdf);
  const valeurs: ValeurLue[] = [...verif.valeurs];
  const lignes = valeurLignes(brut.lignes, pages);
  if (lignes) valeurs.push(lignes);
  const ventilation = valeurVentilation(brut.tva_ventilation, pages);
  if (ventilation) valeurs.push(ventilation);

  const type_piece: TypePiece = (TYPES_PIECE as readonly string[]).includes(brut.type_piece) ? (brut.type_piece as TypePiece) : "autre";
  let statut: StatutLecture;
  let motif: string | undefined;
  if (type_piece === "autre" || brut.confiance_type < SEUIL_TYPE_SUR) {
    statut = "a_classer";
    motif = brut.motif ||
      (type_piece === "autre"
        ? "Type de pièce non reconnu : une personne le tranche."
        : `Type « ${type_piece} » incertain (${Math.round(brut.confiance_type * 100)} %) : une personne le tranche.`);
  } else if (type_piece === "facture" || type_piece === "avoir") {
    if (verif.clesDouteuses.length === 0) statut = "lue";
    else {
      statut = "a_verifier";
      motif = `À vérifier : ${verif.clesDouteuses.join(", ")}.`;
    }
  } else {
    statut = valeurs.some((v) => v.verifiee) ? "lue" : "a_verifier";
    if (statut === "a_verifier") motif = "Aucune valeur n'a pu être vérifiée sur la pièce.";
  }

  return {
    resultat: {
      statut,
      type_piece,
      confiance_type: brut.confiance_type,
      methode,
      nb_pages: pages.length,
      motif: motif?.slice(0, 500),
      pages,
      valeurs,
    },
    ia,
    cout_ocr: coutOcr,
    decoupage: brut.decoupage,
  };
}
