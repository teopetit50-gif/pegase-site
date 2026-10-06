// Le travail « lecteur.analyser » : une lecture longue d'un dossier, d'un bout à l'autre.
//
//   commencer_analyse(analyse) → le dossier (pièces, pages déjà lues, état d'un passage précédent) ;
//   analyser(…) dans le budget de temps du passage ;
//   terminer_analyse(analyse, résultat, version) : finie, partielle (plafond), en_cours (le socle remet un
//   travail pour le passage suivant) ou echec.
//
// Module chiffré (Tamila) : la clé du dossier vient du coffre (cle_piece sur l'une de ses pièces, c'est la même) ;
// les pages chiffrées sont ouvertes en mémoire ; le résultat ET l'état intermédiaire repartent chiffrés sous cette
// clé (format Tamila, base64). En clair ne restent que le type, le statut, les comptes par gravité, le coût et la
// version. Ni la clé, ni le texte, ni un titre ne sont journalisés.

import type { ClientClaude } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { rpc } from "@partage/portes.ts";
import type { ConfigSupabase, Travail } from "@partage/portes.ts";
import type { CoffreTamila } from "../coffre.ts";
import { chiffrerTexte, dechiffrerTexte } from "../coffre.ts";
import { analyser, type EtatAnalyse, type PieceDossier, type ResultatAnalyse, type TypeAnalyse } from "./moteur.ts";
import { TYPES_ANALYSE } from "./types_tamila.ts";

export const GENRE_ANALYSE = "lecteur.analyser";

/** Ce que commencer_analyse rend (voir omega/CONTRAT-ANALYSE.md). */
export interface DossierAnalyse {
  analyse: string;
  client: string;
  module: string;
  type: string;
  chiffrement: string | null;
  pieces: {
    piece: string;
    nom: string;
    role?: string | null;
    chiffrement?: string | null;
    pages: { n: number; texte?: string | null; texte_chiffre?: string | null }[];
  }[];
  /** L'état laissé par un passage précédent : en clair, ou chiffré (base64) pour un module chiffré. */
  etat?: EtatAnalyse | null;
  etat_chiffre?: string | null;
}

export interface ResultatTravailAnalyse {
  statut: "finie" | "partielle" | "en_cours" | "echec";
  type: string;
  comptes: { info: number; attention: number; critique: number };
  sans_source: number;
  pieces_lues: number;
  pieces_non_lues: string[];
  cout_eur: number;
  appels_ia: number;
  modele: string | null;
  motif?: string;
  /** En clair (module non chiffré) : le résultat complet, ou l'état à reprendre. */
  resultat?: ResultatAnalyse;
  etat?: EtatAnalyse;
  /** Module chiffré : les mêmes, chiffrés sous la clé du dossier (base64). */
  resultat_chiffre?: string;
  etat_chiffre?: string;
}

export interface PortesAnalyse {
  commencerAnalyse(analyse: string): Promise<DossierAnalyse | null>;
  terminerAnalyse(analyse: string, resultat: ResultatTravailAnalyse, version: string): Promise<unknown>;
  finirTravail(id: number, resultat: unknown): Promise<void>;
  echouerTravail(id: number, erreur: string, reprendre?: boolean): Promise<"repris" | "echec">;
}

export class PortesAnalyseRpc {
  constructor(private cfg: ConfigSupabase, private fetchFn: typeof fetch = fetch) {}
  async commencerAnalyse(analyse: string): Promise<DossierAnalyse | null> {
    const r = await rpc<DossierAnalyse | null>(this.cfg, this.fetchFn, "commencer_analyse", { p_analyse: analyse });
    return r && typeof r === "object" && typeof r.analyse === "string" ? r : null;
  }
  async terminerAnalyse(analyse: string, resultat: ResultatTravailAnalyse, version: string): Promise<unknown> {
    return await rpc(this.cfg, this.fetchFn, "terminer_analyse", { p_analyse: analyse, p_resultat: resultat, p_version: version.slice(0, 40) });
  }
}

export interface ContexteAnalyse {
  portes: PortesAnalyse;
  claude: ClientClaude | null;
  coffre: CoffreTamila | null;
  maintenant: () => Date;
  types?: Record<string, TypeAnalyse>;
}

function comptes(r: ResultatAnalyse) {
  const c = { info: 0, attention: 0, critique: 0 };
  for (const x of r.constats) c[x.gravite]++;
  return c;
}

export function versionAnalyse(maintenant: Date, modele: string | null): string {
  const court = (modele ?? "sans-ia").replace(/^(eu|us|global)\./, "").replace(/^anthropic\./, "").replace(/-\d{8}-v\d+:\d+$/, "");
  return `analyse/${maintenant.toISOString().slice(0, 10)}/${court}`.slice(0, 40);
}

export async function analyserTravail(ctx: ContexteAnalyse, travail: Travail, budgetMs: number): Promise<"finie" | "partielle" | "en_cours" | "echec" | "ignore" | "repris" | "abandon" | "erreur"> {
  const id = typeof travail.charge?.analyse === "string" ? travail.charge.analyse : null;
  const trace = { travail: travail.id, analyse: id, client: travail.client_id };
  let cle: Uint8Array | null = null;
  try {
    if (!id) {
      await ctx.portes.finirTravail(travail.id, { ignore: "charge sans analyse" });
      return "ignore";
    }
    const d = await ctx.portes.commencerAnalyse(id);
    if (!d) {
      await ctx.portes.finirTravail(travail.id, { ignore: "plus rien à analyser" });
      return "ignore";
    }
    const t = (ctx.types ?? TYPES_ANALYSE)[d.type];
    const version = versionAnalyse(ctx.maintenant(), ctx.claude?.modele ?? null);
    const echec = async (motif: string) => {
      await ctx.portes.terminerAnalyse(id, {
        statut: "echec",
        type: d.type,
        comptes: { info: 0, attention: 0, critique: 0 },
        sans_source: 0,
        pieces_lues: 0,
        pieces_non_lues: d.pieces.map((p) => p.piece),
        cout_eur: 0,
        appels_ia: 0,
        modele: null,
        motif,
      }, version);
      await ctx.portes.finirTravail(travail.id, { statut: "echec", motif });
      return "echec" as const;
    };
    if (!t) return await echec(`type d'analyse inconnu : ${d.type}`);
    if (!ctx.claude) throw new ErreurOuvrier("IA_NON_BRANCHEE", "aucune IA branchée pour l'analyse", true);

    // Module chiffré : la clé du dossier, puis les pages et l'état ouverts en mémoire.
    const chiffre = d.chiffrement !== null && d.chiffrement !== undefined;
    if (chiffre) {
      const unePiece = d.pieces.find((p) => p.chiffrement) ?? d.pieces[0];
      if (!ctx.coffre || !unePiece) return await echec("dossier chiffré sans coffre serveur : la clé n'est pas disponible");
      const c = await ctx.coffre.clePiece(unePiece.piece);
      if (c.fournisseur !== "scaleway") return await echec("dossier chiffré sans coffre serveur : la clé n'est pas disponible");
      cle = c.cle;
    }
    const pieces: PieceDossier[] = [];
    for (const p of d.pieces) {
      const pages: { n: number; texte: string }[] = [];
      for (const pg of p.pages) {
        const texte = pg.texte_chiffre && cle ? await dechiffrerTexte(cle, pg.texte_chiffre) : (pg.texte ?? "");
        pages.push({ n: pg.n, texte });
      }
      pieces.push({ piece: p.piece, nom: p.nom, role: p.role ?? undefined, pages });
    }
    const etat = d.etat_chiffre && cle ? JSON.parse(await dechiffrerTexte(cle, d.etat_chiffre)) as EtatAnalyse : d.etat ?? undefined;

    const r = await analyser(ctx.claude, t, pieces, { budgetMs, etat });
    const sortie: ResultatTravailAnalyse = {
      statut: r.statut,
      type: t.type,
      comptes: comptes(r),
      sans_source: r.sans_source,
      pieces_lues: r.pieces_lues,
      pieces_non_lues: r.pieces_non_lues,
      cout_eur: r.couts.cout_eur,
      appels_ia: r.couts.appels_ia,
      modele: r.couts.modele,
    };
    if (r.statut === "en_cours") {
      if (cle) sortie.etat_chiffre = await chiffrerTexte(cle, JSON.stringify(r.etat));
      else sortie.etat = r.etat;
    } else if (cle) {
      sortie.resultat_chiffre = await chiffrerTexte(cle, JSON.stringify(r));
    } else {
      sortie.resultat = r;
    }
    await ctx.portes.terminerAnalyse(id, sortie, version);
    await ctx.portes.finirTravail(travail.id, {
      statut: r.statut,
      type: t.type,
      constats: r.constats.length,
      cout_eur: r.couts.cout_eur,
      appels_ia: r.couts.appels_ia,
      modele: r.couts.modele,
    });
    journal("info", "analyse rendue", { ...trace, type: t.type, statut: r.statut, constats: r.constats.length, cout_eur: r.couts.cout_eur });
    return r.statut;
  } catch (e) {
    const erreur = e instanceof ErreurOuvrier ? e : new ErreurOuvrier("ERREUR_INTERNE", messageDe(e), true);
    journal(erreur.code === "ERREUR_INTERNE" ? "erreur" : "alerte", `analyse interrompue : ${erreur.code}`, { ...trace, motif: erreur.message.slice(0, 300) });
    try {
      return (await ctx.portes.echouerTravail(travail.id, erreur.motif, erreur.reprendre)) === "repris" ? "repris" : "abandon";
    } catch {
      return "erreur";
    }
  } finally {
    cle?.fill(0);
  }
}
