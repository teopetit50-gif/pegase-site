// Un passage de l'ouvrier des exports : jusqu'à cinq travaux `releve.lire`,
// lus l'un après l'autre dans le temps imparti, puis le battement.

import { journal, messageDe } from "@partage/journal.ts";
import { type Contexte, type Issue, lireExport, versionLecteurExports } from "./lire_export.ts";

export const MODULE = "lecteur_exports";
export const GENRES = ["releve.lire"];

export interface OptionsPassage {
  nombre: number;
  bail: string;
  budgetMs: number;
}

export const OPTIONS_PAR_DEFAUT: OptionsPassage = { nombre: 5, bail: "10 minutes", budgetMs: 110_000 };

export interface BilanPassage {
  pris: number;
  issues: Record<Issue, number>;
  reportes: number;
  duree_ms: number;
  version: string;
  battus: number | null;
  erreur?: string;
}

export async function passage(ctx: Contexte, options: Partial<OptionsPassage> = {}): Promise<BilanPassage> {
  const o = { ...OPTIONS_PAR_DEFAUT, ...options };
  const debut = Date.now();
  const bilan: BilanPassage = {
    pris: 0,
    issues: { lu: 0, a_classer: 0, rejete: 0, echec: 0, ignore: 0, repris: 0, abandon: 0, erreur: 0 },
    reportes: 0,
    duree_ms: 0,
    version: versionLecteurExports(ctx.maintenant()),
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
      bilan.issues[await lireExport(ctx, t)]++;
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
        ...(bilan.erreur ? { erreur: bilan.erreur } : {}),
      });
    } catch (e) {
      journal("erreur", "battre_ouvrier a échoué", { erreur: messageDe(e) });
    }
  }
  journal("info", "passage terminé", { ...bilan });
  return bilan;
}
