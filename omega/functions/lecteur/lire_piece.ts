// La lecture d'une pièce, de la prise du travail à son résultat. Tout chemin
// finit par une porte : finir_travail ou echouer_travail. Jamais d'exception
// qui sorte d'ici.

import type { Depot } from "@partage/depot.ts";
import { MOTIF_IA_NON_BRANCHEE } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal, messageDe } from "@partage/journal.ts";
import type { PageLue, Piece, Portes, ResultatLecture, StatutLecture, Travail, ValeurLue } from "@partage/portes.ts";
import { detecter, type Detection } from "./detecter.ts";
import type { EntreeIa, Extracteur, PageTranscrite, SortieIa } from "./ia.ts";
import { LIMITE_DOCUMENT_OCTETS } from "./ia.ts";
import { decouperSousLimite, PAGES_PAR_MORCEAU } from "./pdf_decouper.ts";
import type { Ocr } from "./ocr.ts";
import { analyserPdf, type PagePdf, pageSansTexte } from "./pdf.ts";
import { controlerPlafond } from "./plafond.ts";
import { champsPour, schemaPour } from "./schemas/modules.ts";
import { type BilanAvis, chiffrerLecture, type CoffreTamila, depotDechiffrant, poserAvisTamila } from "./coffre.ts";
import { lireCsv, lireXlsx } from "./tableur.ts";
import { valeurLignes, valeurVentilation, verifierValeurs } from "./verifier.ts";
import { estXmlFacture, lireXmlFacture } from "./xml_facture.ts";
import { concorder } from "./concordance.ts";

export interface Environnement {
  get(nom: string): string | undefined;
}

export interface Contexte {
  portes: Portes;
  depot: Depot;
  /** Le coffre Tamila ; absent = toute pièce chiffrée est close sans lecture. */
  coffre?: CoffreTamila | null;
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

/** Ce que les appels d'IA préalables (transcriptions par morceaux) ont déjà coûté. */
export interface Prealable {
  cout_eur: number;
  tokens_entree: number;
  tokens_sortie: number;
  appels_ia: number;
}

const SANS_PREALABLE: Prealable = { cout_eur: 0, tokens_entree: 0, tokens_sortie: 0, appels_ia: 0 };

interface Bilan {
  resultat: ResultatLecture;
  ia: SortieIa | null;
  cout_ocr: number;
  prealable?: Prealable;
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
    // Une pièce chiffrée : seule une pièce Tamila (« dossier:v1 ») d'un cabinet à coffre serveur se lit,
    // avec la clé de son dossier rendue par tamila-coffre et déchiffrée en mémoire au téléchargement.
    let ctxLecture = ctx;
    let cle: Uint8Array | null = null;
    if (piece.chiffrement) {
      const c = piece.chiffrement === "dossier:v1" && piece.module === "tamila" && ctx.coffre ? await ctx.coffre.clePiece(pieceId) : null;
      if (!c || c.fournisseur !== "scaleway") {
        // Sans coffre, la clé du dossier n'est jamais là : reprendre ne servirait à rien (cinq échecs par
        // pièce). Le travail est clos, la pièce reste « recue » ; le coffre la redemandera (NOTES-B4).
        await ctx.portes.finirTravail(travail.id, { ignore: "chiffree_sans_coffre", chiffrement: piece.chiffrement, statut: piece.statut });
        journal("info", "pièce chiffrée sans coffre, travail clos sans lecture", { ...trace, chiffrement: piece.chiffrement });
        return "ignore";
      }
      cle = c.cle;
      ctxLecture = { ...ctx, depot: depotDechiffrant(ctx.depot, cle) };
      journal("info", "clé de dossier reçue du coffre, déchiffrement en mémoire", { ...trace, chiffrement: piece.chiffrement });
    }
    try {
      if (!(await ctx.portes.commencerLecture(pieceId))) {
        await ctx.portes.finirTravail(travail.id, { ignore: "plus rien à lire", statut: piece.statut });
        journal("info", "pièce déjà lue ou détachée, travail ignoré", { ...trace, statut: piece.statut });
        return "ignore";
      }
      return await lireEtRendre(ctxLecture, travail, piece, trace, cle);
    } finally {
      // La clé ne survit pas au travail, même si le fichier n'a jamais été téléchargé.
      cle?.fill(0);
    }
  } catch (e) {
    return await echouer(ctx, travail, e, trace);
  }
}

/** La lecture proprement dite, une fois la pièce à soi (et son dépôt déchiffrant pour une pièce chiffrée). */
async function lireEtRendre(ctx: Contexte, travail: Travail, piece: Piece, trace: Record<string, unknown>, cle: Uint8Array | null): Promise<Issue> {
  const pieceId = piece.id;
  const dechiffree = cle !== null;
  const bilan = await lire(ctx, piece);
  const modele = bilan.ia?.modele ?? null;
  const version = versionLecteur(ctx.maintenant(), modele);
  // Une pièce chiffrée se rend chiffrée : rien de son contenu n'entre en clair en base.
  const aEnregistrer = cle ? await chiffrerLecture(bilan.resultat, cle) : bilan.resultat;
  const enregistre = await ctx.portes.enregistrerLecture(pieceId, aEnregistrer, version);
  // Un avis RPVA lu pose ses délais (b4_08). Un échec ici ne défait pas la lecture, déjà enregistrée : il est dit dans
  // le résultat du travail et journalisé, l'avis reste à saisir à la main.
  let avis: BilanAvis | { avis: "erreur"; erreur: string } | undefined;
  if (cle && piece.module === "tamila" && ctx.coffre && ["lue", "a_verifier"].includes(bilan.resultat.statut)) {
    try {
      avis = await poserAvisTamila(ctx.coffre, pieceId, bilan.resultat, cle);
    } catch (e) {
      const code = e instanceof ErreurOuvrier ? e.code : "ERREUR_INTERNE";
      avis = { avis: "erreur", erreur: code };
      journal("alerte", "avis RPVA lu mais non posé : à saisir à la main", { ...trace, erreur: code });
    }
  }
  const prealable = bilan.prealable ?? SANS_PREALABLE;
  const cout = Math.round(((bilan.ia?.cout_eur ?? 0) + bilan.cout_ocr + prealable.cout_eur) * 1e6) / 1e6;
  await ctx.portes.finirTravail(travail.id, {
    pages: enregistre.pages,
    valeurs: enregistre.valeurs,
    statut: bilan.resultat.statut,
    type_piece: bilan.resultat.type_piece ?? null,
    methode: bilan.resultat.methode ?? null,
    modele,
    tokens_entree: (bilan.ia?.usage.tokens_entree ?? 0) + prealable.tokens_entree,
    tokens_sortie: (bilan.ia?.usage.tokens_sortie ?? 0) + prealable.tokens_sortie,
    appels_ia: (bilan.ia ? 1 : 0) + prealable.appels_ia,
    cout_eur: cout,
    ...(bilan.decoupage && bilan.decoupage.length > 1
      ? { decoupage: bilan.decoupage.map((d) => (dechiffree ? { pages: d.pages, type_piece: d.type_piece } : d)) }
      : {}),
    ...(dechiffree ? { dechiffree: true } : {}),
    ...(avis ? { avis_rpva: avis } : {}),
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

function lireXml(xml: string, pagesPdf: PageLue[], pdfBrut: PagePdf[] = []): Bilan {
  const lu = lireXmlFacture(xml);
  if (!lu) return echec("XML reconnu mais ni Factur-X (CII) ni UBL : structure inconnue.");
  const pages: PageLue[] = pagesPdf.length > 0 ? pagesPdf : [{ n: 1, methode: "natif", texte: xml.slice(0, MAX_TEXTE_PAGE), confiance: 1 }];
  const cles = ["numero", "date", "montant_ttc", "fournisseur.nom"];
  const manquants = cles.filter((c) => !lu.valeurs.some((v) => v.champ === c && v.verifiee));
  const statut: StatutLecture = manquants.length === 0 ? "lue" : "a_verifier";
  // Factur-X : le XML fait foi ; chaque valeur clé est rapprochée du PDF visible, les écarts sont notés.
  const { valeurs, divergences } = pagesPdf.length > 0 ? concorder(lu.valeurs, pagesPdf, pdfBrut) : { valeurs: lu.valeurs, divergences: [] };
  const motifs = [
    manquants.length > 0 ? `Champs absents du XML ${lu.norme.toUpperCase()} : ${manquants.join(", ")}.` : "",
    divergences.length > 0 ? `Non retrouvés dans le PDF visible (le XML fait foi) : ${divergences.join(", ")}.` : "",
  ].filter((m) => m !== "");
  return {
    resultat: {
      statut,
      type_piece: lu.type_piece,
      confiance_type: 1,
      methode: "xml",
      nb_pages: pages.length,
      motif: motifs.length > 0 ? motifs.join(" ").slice(0, 500) : undefined,
      pages,
      valeurs,
    },
    ia: null,
    cout_ocr: 0,
  };
}

function exigerIa(ctx: Contexte): Extracteur {
  if (!ctx.extracteur) {
    throw new ErreurOuvrier("IA_NON_BRANCHEE", MOTIF_IA_NON_BRANCHEE, true);
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
    if (estXmlFacture(xml)) return lireXml(xml, pagesNatives, analyse.pages);
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
  const methode = sansTexte.length === analyse.pages.length ? "ocr" : "mixte";
  if (octets.length <= LIMITE_DOCUMENT_OCTETS && analyse.nbPages <= PAGES_PAR_MORCEAU) {
    const ia = await appelerIa(ctx, piece, { mode: "document", octets, nbPages: analyse.nbPages }, contexte);
    return assembler(ia, analyse.pages, pagesNatives, methode, 0, piece.module);
  }
  return await lirePdfParMorceaux(ctx, piece, octets, analyse.pages, analyse.nbPages, methode, contexte);
}

/** Gros PDF sans texte : transcription morceau par morceau, puis extraction sur le texte réuni. */
async function lirePdfParMorceaux(
  ctx: Contexte,
  piece: Piece,
  octets: Uint8Array,
  pagesPdf: PagePdf[],
  nbPages: number,
  methode: "ocr" | "mixte",
  contexte: { nom_fichier: string; mime: string; module: string },
): Promise<Bilan> {
  const ia = exigerIa(ctx);
  // Le plafond se contrôle une fois, sur le coût de toute la lecture : transcriptions, puis extraction.
  const estimation = ia.estimer({ mode: "document", octets, nbPages }) +
    ia.estimer({ mode: "texte", pages: pagesPdf.map((p) => ({ n: p.n, texte: " ".repeat(3000) })) });
  await controlerPlafond(ctx.portes, ctx.env, piece.client_id, estimation);

  let morceaux;
  try {
    morceaux = await decouperSousLimite(octets, nbPages, LIMITE_DOCUMENT_OCTETS);
  } catch (e) {
    return echec(`PDF indécoupable : ${messageDe(e, 200)}`);
  }
  if (!morceaux) return echec("Une page du PDF dépasse à elle seule 4,5 Mo : lecture visuelle impossible.");

  const prealable: Prealable = { ...SANS_PREALABLE };
  const transcrites = new Map<number, PageTranscrite>();
  const natives = new Map(pagesPdf.map((p) => [p.n, p]));
  for (const m of morceaux) {
    let aTranscrire = false;
    for (let n = m.morceau.debut; n <= m.morceau.fin; n++) {
      const p = natives.get(n);
      if (!p || pageSansTexte(p)) aTranscrire = true;
    }
    if (!aTranscrire) continue;
    const t = await ia.transcrire({ octets: m.octets, debut: m.morceau.debut, fin: m.morceau.fin }, contexte);
    prealable.cout_eur += t.cout_eur;
    prealable.tokens_entree += t.usage.tokens_entree;
    prealable.tokens_sortie += t.usage.tokens_sortie;
    prealable.appels_ia++;
    for (const p of t.pages) transcrites.set(p.n, p);
  }
  const pages: PageLue[] = [];
  for (let n = 1; n <= nbPages; n++) {
    const p = natives.get(n);
    if (p && !pageSansTexte(p)) {
      pages.push({ n, methode: "natif", texte: p.texte.slice(0, MAX_TEXTE_PAGE), confiance: 1, largeur: p.largeur, hauteur: p.hauteur });
      continue;
    }
    const t = transcrites.get(n);
    pages.push({
      n,
      methode: t?.manuscrit ? "ocr_manuscrit" : "vision",
      texte: (t?.texte ?? "").slice(0, MAX_TEXTE_PAGE),
      confiance: t ? (typeof t.confiance === "number" ? t.confiance : 0.8) : 0,
      largeur: p?.largeur,
      hauteur: p?.hauteur,
    });
  }
  return await extraireDepuisTexte(ctx, piece, pages, pagesPdf, methode, contexte, 0, prealable);
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
  return assembler(ia, null, [], "ocr", 0, piece.module);
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
  prealable: Prealable = SANS_PREALABLE,
): Promise<Bilan> {
  if (pages.every((p) => p.texte.replace(/\s+/g, "") === "")) {
    return { ...echec("Aucun texte lisible sur les pages."), cout_ocr: coutOcr, prealable };
  }
  const ia = await appelerIa(ctx, piece, { mode: "texte", pages: pages.map((p) => ({ n: p.n, texte: p.texte })) }, contexte);
  return { ...assembler(ia, pagesPdf, pages, methode, coutOcr, piece.module), prealable };
}

/** Du résultat brut de l'IA au résultat de lecture : pages, valeurs vérifiées, statut. */
export function assembler(
  ia: SortieIa,
  pagesPdf: PagePdf[] | null,
  pagesConnues: PageLue[],
  methode: "natif" | "ocr" | "mixte" | "tableur",
  coutOcr: number,
  module: string | null = "filed",
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

  const schema = schemaPour(module);
  const typeDeclare = schema.types.find((t) => t.type === brut.type_piece);
  const type_piece = typeDeclare ? typeDeclare.type : "autre";
  const verif = verifierValeurs(brut.valeurs, pages, pagesPdf, "ia", champsPour(module), typeDeclare?.cles ?? []);
  const valeurs: ValeurLue[] = [...verif.valeurs];
  if (schema.lignes) {
    const lignes = valeurLignes(brut.lignes, pages);
    if (lignes) valeurs.push(lignes);
    const ventilation = valeurVentilation(brut.tva_ventilation, pages);
    if (ventilation) valeurs.push(ventilation);
  }

  let statut: StatutLecture;
  let motif: string | undefined;
  if (!typeDeclare || brut.confiance_type < SEUIL_TYPE_SUR) {
    statut = "a_classer";
    motif = brut.motif ||
      (!typeDeclare
        ? `Type de pièce non reconnu pour le module ${schema.module} : une personne le tranche.`
        : `Type « ${type_piece} » incertain (${Math.round(brut.confiance_type * 100)} %) : une personne le tranche.`);
  } else if (typeDeclare.cles.length > 0) {
    if (verif.clesDouteuses.length === 0) statut = "lue";
    else {
      statut = "a_verifier";
      motif = `À vérifier : ${verif.clesDouteuses.join(", ")}.`;
    }
  } else {
    statut = typeDeclare.lueSansValeur || valeurs.some((v) => v.verifiee) ? "lue" : "a_verifier";
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
