// La mesure de qualité du lecteur sur un corpus réel : pour chaque pièce, ce qui était attendu (saisi ou relu par une
// personne) contre ce que le lecteur a rangé dans pieces_valeurs. Champ par champ : juste, faux, manquant, inventé
// (une valeur lue là où l'attendu dit explicitement qu'il n'y en a pas : null). Le chiffre qui compte le plus est
// « vérifiée et fausse » : une valeur que le lecteur donne pour sûre alors qu'elle est fausse.
//
// Format d'un corpus (JSON) : {"corpus": "factures-pilote", "module": "filed", "pieces": [{"sha256": "…" | "fichier": "…",
//   "type_piece": "facture", "statut"?: "lue", "valeurs": {"numero": "F-1", "montant_ttc": 120, "fournisseur.iban": null}}]}
// — le même que banc/attendus, réduit à l'essentiel.

import { dateIso, nombreDepuisTexte } from "@partage/texte.ts";

export interface PieceAttendue {
  sha256?: string;
  fichier?: string;
  type_piece?: string;
  statut?: string;
  valeurs: Record<string, unknown>;
}

export interface Corpus {
  corpus: string;
  module: string;
  pieces: PieceAttendue[];
}

export interface ValeurRangee {
  champ: string;
  valeur: unknown;
  verifiee: boolean;
}

export interface PieceLue {
  type_piece: string | null;
  statut: string;
  valeurs: ValeurRangee[];
  cout_eur?: number | null;
}

export type Verdict = "juste" | "faux" | "manquant" | "invente" | "absent_juste";

export interface ResultatChamp {
  champ: string;
  attendu: unknown;
  lu: unknown;
  verifiee: boolean | null;
  verdict: Verdict;
}

export interface ResultatPiece {
  cle: string;
  type_attendu: string | null;
  type_lu: string | null;
  type_juste: boolean;
  statut: string | null;
  statut_attendu: string | null;
  champs: ResultatChamp[];
  cout_eur: number | null;
  /** La pièce n'a pas été trouvée en base (pas déposée, ou pas encore lue). */
  introuvable?: boolean;
}

const TOLERANCE = 0.005;

function texteNormal(v: unknown): string {
  return String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s.,;:'"’«»\-_/]+/g, " ").trim();
}

function egalScalaire(attendu: unknown, lu: unknown): boolean {
  if (typeof attendu === "number" || typeof lu === "number") {
    const a = nombreDepuisTexte(attendu);
    const b = nombreDepuisTexte(lu);
    return a !== null && b !== null && Math.abs(a - b) <= TOLERANCE;
  }
  if (typeof attendu === "boolean" || typeof lu === "boolean") return String(attendu) === String(lu);
  if (typeof attendu === "string" && /^\d{4}-\d{2}-\d{2}$/.test(attendu)) return dateIso(lu) === attendu || String(lu).startsWith(attendu);
  const a = texteNormal(attendu);
  const b = texteNormal(lu);
  // Les identifiants (SIREN, TVA, IBAN, n° de facture) se comparent sans espaces ni ponctuation.
  return a === b || a.replace(/ /g, "") === b.replace(/ /g, "");
}

/** Deux valeurs égales au sens du métier : nombres à 0,005 près, dates, textes sans casse ni accents, listes. */
export function egales(attendu: unknown, lu: unknown): boolean {
  if (Array.isArray(attendu)) {
    if (!Array.isArray(lu) || lu.length !== attendu.length) return false;
    if (attendu.every((x) => x === null || typeof x !== "object")) {
      // Une liste de textes ou de codes : même ensemble, ordre libre.
      const a = attendu.map(texteNormal).sort();
      const b = lu.map(texteNormal).sort();
      return a.every((x, i) => x === b[i]);
    }
    // Lignes, ventilation : élément par élément, sur les clés que l'attendu donne.
    return attendu.every((x, i) => egales(x, lu[i]));
  }
  if (attendu && typeof attendu === "object") {
    if (!lu || typeof lu !== "object") return false;
    return Object.entries(attendu as Record<string, unknown>).every(([k, v]) => egales(v, (lu as Record<string, unknown>)[k]));
  }
  return egalScalaire(attendu, lu);
}

export function comparerPiece(cle: string, attendu: PieceAttendue, lu: PieceLue | null): ResultatPiece {
  if (!lu) {
    return {
      cle,
      type_attendu: attendu.type_piece ?? null,
      type_lu: null,
      type_juste: false,
      statut: null,
      statut_attendu: attendu.statut ?? null,
      champs: Object.entries(attendu.valeurs).map(([champ, v]) => ({ champ, attendu: v, lu: null, verifiee: null, verdict: v === null ? "absent_juste" : "manquant" })),
      cout_eur: null,
      introuvable: true,
    };
  }
  const parChamp = new Map(lu.valeurs.map((v) => [v.champ, v]));
  const champs: ResultatChamp[] = Object.entries(attendu.valeurs).map(([champ, a]) => {
    const v = parChamp.get(champ);
    const valeurLue = v && v.valeur !== null && v.valeur !== undefined && v.valeur !== "" ? v.valeur : undefined;
    let verdict: Verdict;
    if (a === null) verdict = valeurLue === undefined ? "absent_juste" : "invente";
    else if (valeurLue === undefined) verdict = "manquant";
    else verdict = egales(a, valeurLue) ? "juste" : "faux";
    return { champ, attendu: a, lu: valeurLue ?? null, verifiee: v ? v.verifiee : null, verdict };
  });
  return {
    cle,
    type_attendu: attendu.type_piece ?? null,
    type_lu: lu.type_piece,
    type_juste: !attendu.type_piece || attendu.type_piece === lu.type_piece,
    statut: lu.statut,
    statut_attendu: attendu.statut ?? null,
    champs,
    cout_eur: lu.cout_eur ?? null,
  };
}

export interface Synthese {
  pieces: number;
  introuvables: number;
  types_justes: number;
  lues: number;
  attendus: number;
  justes: number;
  faux: number;
  manquants: number;
  inventes: number;
  /** Le piège : valeurs données pour vérifiées et pourtant fausses ou inventées. */
  verifiees_fausses: number;
  verifiees: number;
  /** juste / (juste + faux + inventé) : quand le lecteur rend une valeur, est-elle bonne ? */
  precision: number | null;
  /** juste / valeurs attendues non nulles : combien en trouve-t-il ? */
  rappel: number | null;
  /** parmi les valeurs vérifiées, part de justes. */
  precision_verifiees: number | null;
  cout_total_eur: number;
  cout_moyen_eur: number | null;
  /** Par champ : [justes, attendus non nuls, faux, vérifiées fausses]. */
  par_champ: Record<string, { justes: number; attendus: number; faux: number; verifiees_fausses: number }>;
}

const ratio = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 1000) / 1000);

export function synthese(resultats: ResultatPiece[]): Synthese {
  const s: Synthese = {
    pieces: resultats.length,
    introuvables: resultats.filter((r) => r.introuvable).length,
    types_justes: resultats.filter((r) => !r.introuvable && r.type_juste).length,
    lues: resultats.filter((r) => r.statut === "lue").length,
    attendus: 0,
    justes: 0,
    faux: 0,
    manquants: 0,
    inventes: 0,
    verifiees_fausses: 0,
    verifiees: 0,
    precision: null,
    rappel: null,
    precision_verifiees: null,
    cout_total_eur: 0,
    cout_moyen_eur: null,
    par_champ: {},
  };
  let verifieesJustes = 0;
  let couts = 0;
  for (const r of resultats) {
    if (r.cout_eur !== null) {
      s.cout_total_eur += r.cout_eur;
      couts++;
    }
    for (const c of r.champs) {
      const p = (s.par_champ[c.champ] ??= { justes: 0, attendus: 0, faux: 0, verifiees_fausses: 0 });
      if (c.attendu !== null) {
        s.attendus++;
        p.attendus++;
      }
      if (c.verdict === "juste") {
        s.justes++;
        p.justes++;
      }
      if (c.verdict === "faux") {
        s.faux++;
        p.faux++;
      }
      if (c.verdict === "manquant") s.manquants++;
      if (c.verdict === "invente") s.inventes++;
      if (c.verifiee) {
        s.verifiees++;
        if (c.verdict === "juste") verifieesJustes++;
        if (c.verdict === "faux" || c.verdict === "invente") {
          s.verifiees_fausses++;
          p.verifiees_fausses++;
        }
      }
    }
  }
  s.cout_total_eur = Math.round(s.cout_total_eur * 1e6) / 1e6;
  s.precision = ratio(s.justes, s.justes + s.faux + s.inventes);
  s.rappel = ratio(s.justes, s.attendus);
  s.precision_verifiees = ratio(verifieesJustes, s.verifiees);
  s.cout_moyen_eur = couts === 0 ? null : Math.round((s.cout_total_eur / couts) * 1e6) / 1e6;
  return s;
}

const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1).replace(".", ",")} %`);
const court = (v: unknown) => {
  const t = typeof v === "string" ? v : JSON.stringify(v);
  return (t ?? "").replace(/\|/g, "/").slice(0, 60);
};

/** Le rapport lisible : la synthèse, le tableau par champ, puis chaque écart. Aucune valeur n'est affichée pour un champ juste. */
export function rapport(corpus: Corpus, resultats: ResultatPiece[], quand: string): string {
  const s = synthese(resultats);
  const lignes = [
    `# Mesure du lecteur — corpus « ${corpus.corpus} » (${corpus.module})`,
    "",
    `Mesuré le ${quand}. ${s.pieces} pièces, ${s.introuvables} introuvables en base, ${s.lues} « lue », type juste ${s.types_justes}/${s.pieces - s.introuvables}.`,
    "",
    `- **Précision** (une valeur rendue est-elle juste ?) : ${pct(s.precision)} — ${s.justes} justes, ${s.faux} fausses, ${s.inventes} inventées.`,
    `- **Rappel** (combien de valeurs attendues trouvées ?) : ${pct(s.rappel)} — ${s.manquants} manquantes sur ${s.attendus}.`,
    `- **Vérifiées et fausses** (le piège) : ${s.verifiees_fausses} sur ${s.verifiees} vérifiées — précision des vérifiées ${pct(s.precision_verifiees)}.`,
    `- **Coût** : ${s.cout_total_eur.toFixed(4).replace(".", ",")} € au total, ${s.cout_moyen_eur === null ? "—" : s.cout_moyen_eur.toFixed(4).replace(".", ",") + " €"} par pièce.`,
    "",
    "| Champ | Justes / attendus | Fausses | Vérifiées fausses |",
    "|---|---|---|---|",
    ...Object.entries(s.par_champ).sort(([a], [b]) => a.localeCompare(b)).map(([c, p]) => `| \`${c}\` | ${p.justes} / ${p.attendus} | ${p.faux} | ${p.verifiees_fausses} |`),
    "",
    "## Écarts",
    "",
  ];
  const ecarts = resultats.flatMap((r) => [
    ...(r.introuvable ? [`- ${r.cle} : **introuvable en base** (pas déposée, ou pas encore lue).`] : []),
    ...(!r.introuvable && !r.type_juste ? [`- ${r.cle} : type lu \`${r.type_lu}\`, attendu \`${r.type_attendu}\`.`] : []),
    ...(!r.introuvable && r.statut_attendu && r.statut !== r.statut_attendu ? [`- ${r.cle} : statut \`${r.statut}\`, attendu \`${r.statut_attendu}\`.`] : []),
    ...r.champs.filter((c) => c.verdict === "faux" || c.verdict === "invente" || (c.verdict === "manquant" && !r.introuvable)).map((c) =>
      `- ${r.cle} · \`${c.champ}\` : ${c.verdict}${c.verifiee ? " **(vérifiée)**" : ""} — attendu « ${court(c.attendu)} », lu « ${court(c.lu)} »`
    ),
  ]);
  lignes.push(...(ecarts.length > 0 ? ecarts : ["Aucun écart."]));
  return lignes.join("\n") + "\n";
}

/** Un squelette d'attendu à corriger par une personne : les valeurs lues, à relire sur la pièce une à une. */
export function squelette(corpus: string, module: string, lus: { sha256: string; nom: string; lu: PieceLue }[]): Corpus {
  return {
    corpus,
    module,
    pieces: lus.map(({ sha256, nom, lu }) => ({
      sha256,
      fichier: nom,
      type_piece: lu.type_piece ?? undefined,
      valeurs: Object.fromEntries(lu.valeurs.map((v) => [v.champ, v.valeur])),
    })),
  };
}
