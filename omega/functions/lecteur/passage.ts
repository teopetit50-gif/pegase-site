// Un passage de l'ouvrier : prendre jusqu'à cinq travaux, les lire l'un après
// l'autre dans le temps imparti, battre. Appelé chaque minute.

import { journal, messageDe } from "@partage/journal.ts";
import { analyserTravail, GENRE_ANALYSE } from "./analyse/travail.ts";
import { type Contexte, type Issue, lirePiece, versionLecteur } from "./lire_piece.ts";

export const MODULE = "lecteur";
/** Les lectures de pièces ; les lectures longues seulement si leurs portes sont branchées. */
export const GENRES = ["lecteur.lire"];
export function genresPour(ctx: Contexte): string[] {
  return ctx.portesAnalyse ? [...GENRES, GENRE_ANALYSE] : GENRES;
}

export interface OptionsPassage {
  nombre: number;
  bail: string;
  /** Au-delà, on ne commence plus de nouvelle lecture ; les travaux restants attendent la fin de leur bail. */
  budgetMs: number;
}

export const OPTIONS_PAR_DEFAUT: OptionsPassage = { nombre: 5, bail: "10 minutes", budgetMs: 110_000 };

export interface BilanPassage {
  pris: number;
  issues: Record<Issue, number>;
  reportes: number;
  /** Les lectures longues : issue → nombre. */
  analyses: Record<string, number>;
  duree_ms: number;
  version: string;
  ia_branchee: boolean;
  ocr: string | null;
  battus: number | null;
  erreur?: string;
}

export async function passage(ctx: Contexte, options: Partial<OptionsPassage> = {}): Promise<BilanPassage> {
  const o = { ...OPTIONS_PAR_DEFAUT, ...options };
  const debut = Date.now();
  const bilan: BilanPassage = {
    pris: 0,
    issues: { lue: 0, a_verifier: 0, a_classer: 0, rejetee: 0, echec: 0, ignore: 0, repris: 0, abandon: 0, erreur: 0 },
    reportes: 0,
    analyses: {},
    duree_ms: 0,
    version: versionLecteur(ctx.maintenant(), ctx.extracteur?.modele ?? null),
    ia_branchee: ctx.extracteur !== null,
    ocr: ctx.ocr?.nom ?? null,
    battus: null,
  };
  try {
    const genres = genresPour(ctx);
    const travaux = await ctx.portes.prendreTravaux(genres, o.nombre, o.bail, ctx.ouvrier);
    bilan.pris = travaux.length;
    for (const t of travaux) {
      if (Date.now() - debut > o.budgetMs) {
        bilan.reportes++;
        journal("alerte", "budget de temps épuisé : travail laissé à son bail", { travail: t.id });
        continue;
      }
      if (t.genre === GENRE_ANALYSE && ctx.portesAnalyse) {
        // Le temps qui reste au passage, moins une marge pour rendre l'état ; la suite au passage suivant.
        const reste = Math.max(5_000, o.budgetMs - (Date.now() - debut) - 15_000);
        const issue = await analyserTravail(
          { portes: { ...ctx.portesAnalyse, finirTravail: (id, r) => ctx.portes.finirTravail(id, r), echouerTravail: (id, e, rep) => ctx.portes.echouerTravail(id, e, rep) }, claude: ctx.claude ?? null, coffre: ctx.coffre ?? null, maintenant: ctx.maintenant },
          t,
          reste,
        );
        bilan.analyses[issue] = (bilan.analyses[issue] ?? 0) + 1;
        continue;
      }
      const issue = await lirePiece(ctx, t);
      bilan.issues[issue]++;
    }
  } catch (e) {
    bilan.erreur = messageDe(e);
    journal("erreur", "passage interrompu", { erreur: bilan.erreur });
  } finally {
    bilan.duree_ms = Date.now() - debut;
    try {
      bilan.battus = await ctx.portes.battreOuvrier(MODULE, genresPour(ctx), {
        version: bilan.version,
        pris: bilan.pris,
        issues: bilan.issues,
        reportes: bilan.reportes,
        ...(Object.keys(bilan.analyses).length ? { analyses: bilan.analyses } : {}),
        duree_ms: bilan.duree_ms,
        ia_branchee: bilan.ia_branchee,
        ocr: bilan.ocr,
        ...(bilan.erreur ? { erreur: bilan.erreur } : {}),
      });
    } catch (e) {
      journal("erreur", "battre_ouvrier a échoué", { erreur: messageDe(e) });
    }
  }
  journal("info", "passage terminé", { ...bilan });
  return bilan;
}
