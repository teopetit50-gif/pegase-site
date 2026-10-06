// La lecture « métier » longue : un dossier de N pièces déjà lues (leurs pages en texte), une question de métier
// (le type d'analyse), des constats cités pièce, page et lignes. Commune à tous les modules : chaque module ne
// déclare que ses types (consigne, codes de constat, schéma des « donnees », limites).
//
// Deux temps : une passe par pièce (ou par tranche de pages d'une grosse pièce) qui relève les constats, puis une
// passe de synthèse sur les seuls constats relevés (pas sur le texte) qui fusionne, croise les pièces et résume.
// Chaque citation est revérifiée contre le texte : le modèle ne peut rien affirmer qu'on ne retrouve pas.
// L'analyse avance par paliers : rendue « non finie » avec son état si le budget de temps est épuisé, elle
// reprend là où elle s'est arrêtée au passage suivant.

import { type ClientClaude, coutEur, type Usage } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { type Citation, indexerPages, type PageDossier, pageNumerotee, verifierCitation } from "./citations.ts";

export type Gravite = "info" | "attention" | "critique";

export interface Constat {
  code: string;
  titre: string;
  texte: string;
  gravite: Gravite;
  donnees: Record<string, unknown>;
  citations: Citation[];
  /** Au moins une citation vérifiée. */
  source?: boolean;
}

export interface TypeAnalyse {
  /** « module.nom », ex. tamila.chronologie */
  type: string;
  libelle: string;
  /** Ce que le modèle cherche, en français, pour ce métier. */
  consigne: string;
  /** Les codes de constat admis. */
  codes: string[];
  /** Le schéma JSON de « donnees » (propriétés propres au type). */
  schemaDonnees: Record<string, unknown>;
  /** La passe de synthèse croise les pièces (contradictions, chronologie unique…). */
  synthese: boolean;
  limites: { pieces: number; pages: number; pagesParPiece?: number; coutMaxEur: number };
  /** Le tri et les règles propres au type, appliqués aux constats finaux (ordre chronologique, numérotation…). */
  finaliser?: (constats: Constat[]) => Constat[];
}

export interface PieceDossier {
  piece: string;
  nom: string;
  /** Rôle dans le dossier, si le module le donne (planche, cctp, conclusions…). */
  role?: string;
  pages: { n: number; texte: string }[];
}

/** L'état d'une analyse entre deux passages : les tranches faites et les constats déjà relevés. */
export interface EtatAnalyse {
  tranches_faites: string[];
  constats: Constat[];
  usage: Usage;
  cout_eur: number;
  appels_ia: number;
}

export interface ResultatAnalyse {
  type: string;
  fini: boolean;
  /** finie ; partielle (plafond de coût atteint : des pièces n'ont pas été lues) ; en_cours (à reprendre). */
  statut: "finie" | "partielle" | "en_cours";
  /** Les pièces qu'une analyse partielle n'a pas lues. */
  pieces_non_lues: string[];
  resume?: string;
  constats: Constat[];
  pieces_lues: number;
  pages_lues: number;
  etat?: EtatAnalyse;
  couts: { appels_ia: number; tokens_entree: number; tokens_sortie: number; cout_eur: number; modele: string };
  /** Constats écartés faute de citation retrouvée (gardés à part, jamais présentés comme établis). */
  sans_source: number;
}

/** Une tranche de lecture : une pièce, ou une partie de ses pages si elle dépasse la taille d'un appel. */
interface Tranche {
  cle: string;
  piece: PieceDossier;
  pages: { n: number; texte: string }[];
}

export const CARACTERES_PAR_TRANCHE = 120_000;

export function trancher(pieces: PieceDossier[], max = CARACTERES_PAR_TRANCHE): Tranche[] {
  const tranches: Tranche[] = [];
  for (const p of pieces) {
    let courant: { n: number; texte: string }[] = [];
    let taille = 0;
    const pousser = () => {
      if (courant.length === 0) return;
      tranches.push({ cle: `${p.piece}:${courant[0].n}-${courant[courant.length - 1].n}`, piece: p, pages: courant });
      courant = [];
      taille = 0;
    };
    for (const pg of p.pages) {
      if (taille + pg.texte.length > max && courant.length > 0) pousser();
      courant.push(pg);
      taille += pg.texte.length;
    }
    pousser();
  }
  return tranches;
}

const REGLES = `Règles absolues :
1. Tu ne devines jamais. Chaque constat s'appuie sur au moins une citation : l'identifiant de la pièce, la page, les lignes [première, dernière] et l'extrait EXACT, recopié mot pour mot du texte (les numéros de ligne « 12| » ne font pas partie de l'extrait).
2. Les lignes sont numérotées dans le texte qu'on te donne ; cite celles où se trouve l'extrait.
3. Un constat que tu ne peux pas citer, tu ne le rends pas.
4. Tu écris en français, sobrement ; « titre » en une ligne, « texte » en deux ou trois phrases au plus.`;

function schemaConstats(t: TypeAnalyse): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      constats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            code: { type: "string", enum: t.codes },
            titre: { type: "string" },
            texte: { type: "string" },
            gravite: { type: "string", enum: ["info", "attention", "critique"] },
            donnees: { type: "object", ...t.schemaDonnees },
            citations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  piece: { type: "string" },
                  page: { type: "integer" },
                  lignes: { type: "array", items: { type: "integer" }, minItems: 2, maxItems: 2 },
                  extrait: { type: "string" },
                },
                required: ["piece", "page", "lignes", "extrait"],
              },
            },
          },
          required: ["code", "titre", "texte", "gravite", "citations"],
        },
      },
    },
    required: ["constats"],
  };
}

function schemaSynthese(t: TypeAnalyse): Record<string, unknown> {
  const s = schemaConstats(t) as { properties: Record<string, unknown>; required: string[] };
  return { type: "object", properties: { resume: { type: "string" }, ...s.properties }, required: ["resume", "constats"] };
}

function nettoyerConstats(brut: unknown, t: TypeAnalyse): Constat[] {
  const liste = (brut && typeof brut === "object" && Array.isArray((brut as { constats?: unknown }).constats)) ? (brut as { constats: unknown[] }).constats : [];
  const sortie: Constat[] = [];
  for (const x of liste) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.code !== "string" || !t.codes.includes(o.code)) continue;
    const citations = (Array.isArray(o.citations) ? o.citations : []).flatMap((c): Citation[] => {
      if (!c || typeof c !== "object") return [];
      const k = c as Record<string, unknown>;
      const l = Array.isArray(k.lignes) ? k.lignes.map(Number) : [];
      if (typeof k.piece !== "string" || !Number.isInteger(k.page) || typeof k.extrait !== "string") return [];
      return [{ piece: k.piece, page: k.page as number, lignes: [l[0] ?? 1, l[1] ?? l[0] ?? 1], extrait: k.extrait.slice(0, 2000) }];
    });
    sortie.push({
      code: o.code,
      titre: String(o.titre ?? "").slice(0, 200),
      texte: String(o.texte ?? "").slice(0, 2000),
      gravite: (["info", "attention", "critique"] as const).includes(o.gravite as Gravite) ? (o.gravite as Gravite) : "info",
      donnees: o.donnees && typeof o.donnees === "object" && !Array.isArray(o.donnees) ? (o.donnees as Record<string, unknown>) : {},
      citations,
    });
  }
  return sortie;
}

function verifierConstats(constats: Constat[], pages: Map<string, PageDossier>): Constat[] {
  return constats.map((c) => {
    const citations = c.citations.map((x) => verifierCitation(x, pages));
    return { ...c, citations, source: citations.some((x) => x.verifiee) };
  });
}

function ajouter(u: Usage, v: Usage): Usage {
  return { tokens_entree: u.tokens_entree + v.tokens_entree, tokens_sortie: u.tokens_sortie + v.tokens_sortie };
}

export interface OptionsAnalyse {
  /** Temps restant pour ce passage, en ms ; au-delà, l'analyse est rendue « non finie » avec son état. */
  budgetMs?: number;
  maintenant?: () => number;
  /** L'état laissé par le passage précédent. */
  etat?: EtatAnalyse;
}

export async function analyser(client: ClientClaude, t: TypeAnalyse, pieces: PieceDossier[], options: OptionsAnalyse = {}): Promise<ResultatAnalyse> {
  const nbPages = pieces.reduce((n, p) => n + p.pages.length, 0);
  const tropLongue = t.limites.pagesParPiece !== undefined ? pieces.find((p) => p.pages.length > t.limites.pagesParPiece!) : undefined;
  if (tropLongue) {
    throw new ErreurOuvrier("ERREUR_INTERNE", `pièce trop longue pour ${t.type} : ${tropLongue.pages.length} pages (limite ${t.limites.pagesParPiece})`, false);
  }
  if (pieces.length > t.limites.pieces || nbPages > t.limites.pages) {
    throw new ErreurOuvrier(
      "ERREUR_INTERNE",
      `dossier trop grand pour ${t.type} : ${pieces.length} pièces / ${nbPages} pages (limite ${t.limites.pieces} / ${t.limites.pages})`,
      false,
    );
  }
  const maintenant = options.maintenant ?? Date.now;
  const fin = maintenant() + (options.budgetMs ?? Infinity);
  const pages = indexerPages(pieces.flatMap((p) => p.pages.map((pg) => ({ piece: p.piece, n: pg.n, texte: pg.texte }))));
  const etat: EtatAnalyse = structuredClone(options.etat ?? { tranches_faites: [], constats: [], usage: { tokens_entree: 0, tokens_sortie: 0 }, cout_eur: 0, appels_ia: 0 });
  const appel = async (system: string, texte: string, outil: { name: string; description: string; schema: Record<string, unknown> }) => {
    if (etat.cout_eur >= t.limites.coutMaxEur) {
      throw new ErreurOuvrier("PLAFOND_IA", `plafond de l'analyse atteint (${etat.cout_eur.toFixed(4)} € / ${t.limites.coutMaxEur} €)`, false);
    }
    const r = await client.converse({ system, contenu: [{ text: texte }], outil, maxTokens: 16000 });
    etat.usage = ajouter(etat.usage, r.usage);
    etat.cout_eur = Math.round((etat.cout_eur + coutEur(client.prix, r.usage)) * 1e6) / 1e6;
    etat.appels_ia++;
    return r.entree;
  };
  const systeme = `Tu es le lecteur d'Omega. Analyse demandée : ${t.libelle}.\n\n${t.consigne}\n\n${REGLES}\n\nCodes de constat admis : ${t.codes.join(", ")}.`;

  // 1. Une passe par tranche. Le plafond de coût atteint, on s'arrête : l'analyse est « partielle ».
  const tranches = trancher(pieces);
  let partielle = false;
  for (const tr of tranches) {
    if (etat.tranches_faites.includes(tr.cle)) continue;
    if (maintenant() > fin) return rendu(t, client, pieces, nbPages, etat, false);
    const texte = `Pièce « ${tr.piece.nom} »${tr.piece.role ? ` (${tr.piece.role})` : ""}, identifiant ${tr.piece.piece}.\n\n` +
      tr.pages.map((p) => `=== Page ${p.n} ===\n${pageNumerotee(p.texte)}`).join("\n\n");
    let brut: unknown;
    try {
      brut = await appel(systeme, texte, { name: "rendre_constats", description: "Rend les constats relevés dans cette pièce, chacun cité.", schema: schemaConstats(t) });
    } catch (e) {
      if (e instanceof ErreurOuvrier && e.code === "PLAFOND_IA") {
        partielle = true;
        break;
      }
      throw e;
    }
    etat.constats.push(...verifierConstats(nettoyerConstats(brut, t), pages));
    etat.tranches_faites.push(tr.cle);
  }
  const lues = new Set(etat.tranches_faites.map((c) => c.split(":")[0]));
  const nonLues = partielle ? pieces.map((p) => p.piece).filter((p) => !lues.has(p) || tranches.some((tr) => tr.piece.piece === p && !etat.tranches_faites.includes(tr.cle))) : [];

  // 2. La synthèse, sur les constats relevés (pas sur le texte).
  let resume: string | undefined;
  let constats = etat.constats;
  if (t.synthese && !partielle && etat.constats.length > 0) {
    if (maintenant() > fin) return rendu(t, client, pieces, nbPages, etat, false);
    const liste = etat.constats.filter((c) => c.source).map((c, i) => ({ n: i + 1, ...c }));
    const brut = await appel(
      `${systeme}\n\nTu reçois les constats déjà relevés pièce par pièce, avec leurs citations vérifiées. Fusionne les doublons, croise les pièces (contradictions, ordre des événements), et rends la liste finale avec un résumé de cinq lignes au plus. Tu ne cites QUE des citations présentes dans la liste reçue, recopiées telles quelles.`,
      JSON.stringify({ pieces: pieces.map((p) => ({ piece: p.piece, nom: p.nom, role: p.role })), constats: liste }),
      { name: "rendre_synthese", description: "Rend la synthèse et la liste finale des constats.", schema: schemaSynthese(t) },
    );
    resume = typeof (brut as { resume?: unknown })?.resume === "string" ? String((brut as { resume: string }).resume).slice(0, 3000) : undefined;
    constats = verifierConstats(nettoyerConstats(brut, t), pages);
  }
  const r = rendu(t, client, pieces, nbPages, { ...etat, constats }, true, t.finaliser);
  return { ...r, resume, statut: partielle ? "partielle" : "finie", pieces_non_lues: nonLues };
}

function rendu(
  t: TypeAnalyse,
  client: ClientClaude,
  _pieces: PieceDossier[],
  nbPages: number,
  etat: EtatAnalyse,
  fini: boolean,
  finaliser?: (c: Constat[]) => Constat[],
): ResultatAnalyse {
  const sources = etat.constats.filter((c) => c.source);
  return {
    type: t.type,
    fini,
    statut: fini ? "finie" : "en_cours",
    pieces_non_lues: [],
    constats: fini ? (finaliser ? finaliser(sources) : sources) : [],
    pieces_lues: new Set(etat.tranches_faites.map((c) => c.split(":")[0])).size,
    pages_lues: nbPages,
    ...(fini ? {} : { etat }),
    couts: { appels_ia: etat.appels_ia, tokens_entree: etat.usage.tokens_entree, tokens_sortie: etat.usage.tokens_sortie, cout_eur: etat.cout_eur, modele: client.modele },
    sans_source: etat.constats.length - sources.length,
  };
}
