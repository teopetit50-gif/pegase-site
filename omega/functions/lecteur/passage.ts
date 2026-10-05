// Un passage de l'ouvrier : prendre jusqu'à cinq travaux, les lire l'un après
// l'autre dans le temps imparti, battre. Appelé chaque minute.

import { journal, messageDe } from "@partage/journal.ts";
import { type Contexte, type Issue, lirePiece, versionLecteur } from "./lire_piece.ts";

export const MODULE = "lecteur";
export const GENRES = ["lecteur.lire"];

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
    duree_ms: 0,
    version: versionLecteur(ctx.maintenant(), ctx.extracteur?.modele ?? null),
    ia_branchee: ctx.extracteur !== null,
    ocr: ctx.ocr?.nom ?? null,
    battus: null,
  };
  try {
    const travaux = await ctx.portes.prendreTravaux(GENRES, o.nombre, o.bail, ctx.ouvrier);
    bilan.pris = travaux.length;
    for (const t of travaux) {
      if (Date.now() - debut > o.budgetMs) {
        bilan.reportes++;
        journal("alerte", "budget de temps épuisé : travail laissé à son bail", { travail: t.id });
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
      bilan.battus = await ctx.portes.battreOuvrier(MODULE, GENRES, {
        version: bilan.version,
        pris: bilan.pris,
        issues: bilan.issues,
        reportes: bilan.reportes,
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
