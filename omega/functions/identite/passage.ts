// Un passage de l'ouvrier : relancer ce qui est resté indisponible, prendre
// jusqu'à dix travaux, les vérifier l'un après l'autre dans le temps imparti,
// battre. Appelé chaque minute.

import { journal, messageDe } from "@partage/journal.ts";
import { type Contexte, type Issue, verifierTravail, versionIdentite } from "./verifier.ts";

export const MODULE = "identite";
export const GENRES = ["identite.verifier"];

export interface OptionsPassage {
  nombre: number;
  bail: string;
  /** Au-delà, on ne commence plus de vérification ; les travaux restants attendent la fin de leur bail. */
  budgetMs: number;
  /** Les « indisponible » plus vieux que ça sont rouverts. */
  relanceHeures: number;
}

export const OPTIONS_PAR_DEFAUT: OptionsPassage = { nombre: 10, bail: "5 minutes", budgetMs: 100_000, relanceHeures: 2 };

export interface BilanPassage {
  pris: number;
  issues: Record<Issue, number>;
  reportes: number;
  relancees: number | null;
  duree_ms: number;
  version: string;
  sirene: string;
  vies: string;
  battus: number | null;
  erreur?: string;
}

export async function passage(ctx: Contexte, options: Partial<OptionsPassage> = {}): Promise<BilanPassage> {
  const o = { ...OPTIONS_PAR_DEFAUT, ...options };
  const debut = Date.now();
  const bilan: BilanPassage = {
    pris: 0,
    issues: { valide: 0, invalide: 0, indisponible: 0, cache: 0, ignore: 0, repris: 0, abandon: 0, erreur: 0 },
    reportes: 0,
    relancees: null,
    duree_ms: 0,
    version: versionIdentite(ctx.env, ctx.maintenant()),
    sirene: ctx.sirene.nom,
    vies: ctx.vies.nom,
    battus: null,
  };
  try {
    try {
      bilan.relancees = await ctx.portes.relancer(o.relanceHeures);
    } catch (e) {
      journal("alerte", "identite_relancer a échoué : on continue", { erreur: messageDe(e) });
    }
    const travaux = await ctx.portes.prendreTravaux(GENRES, o.nombre, o.bail, ctx.ouvrier);
    bilan.pris = travaux.length;
    for (const t of travaux) {
      if (Date.now() - debut > o.budgetMs) {
        bilan.reportes++;
        journal("alerte", "budget de temps épuisé : travail laissé à son bail", { travail: t.id });
        continue;
      }
      const issue = await verifierTravail(ctx, t);
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
        relancees: bilan.relancees,
        duree_ms: bilan.duree_ms,
        sirene: bilan.sirene,
        vies: bilan.vies,
        ...(bilan.erreur ? { erreur: bilan.erreur } : {}),
      });
    } catch (e) {
      journal("erreur", "battre_ouvrier a échoué", { erreur: messageDe(e) });
    }
  }
  journal("info", "passage terminé", { ...bilan });
  return bilan;
}
