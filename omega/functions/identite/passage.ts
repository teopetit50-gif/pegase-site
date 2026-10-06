// Un passage de l'ouvrier : relancer ce qui est resté indisponible, balayer les
// fournisseurs dont la vérification vieillit, prendre jusqu'à dix travaux, les
// vérifier l'un après l'autre dans le temps imparti, battre. Appelé chaque minute.

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
  /** Balayage : un fournisseur dont la dernière réponse a plus de balayageJours est revérifié, balayageMax par passage (0 = pas de balayage). */
  balayageJours: number;
  balayageMax: number;
}

export const OPTIONS_PAR_DEFAUT: OptionsPassage = { nombre: 10, bail: "5 minutes", budgetMs: 100_000, relanceHeures: 2, balayageJours: 90, balayageMax: 5 };

/** Les options lues dans l'environnement : IDENTITE_BALAYAGE_JOURS (90), IDENTITE_BALAYAGE_MAX (5 par passage, 0 pour couper). */
export function optionsDepuisEnv(env: { get(n: string): string | undefined }): Partial<OptionsPassage> {
  const o: Partial<OptionsPassage> = {};
  const sj = env.get("IDENTITE_BALAYAGE_JOURS")?.trim();
  const jours = sj ? Number(sj) : NaN;
  if (Number.isInteger(jours) && jours >= 1) o.balayageJours = jours;
  const sm = env.get("IDENTITE_BALAYAGE_MAX")?.trim();
  const max = sm ? Number(sm) : NaN;
  if (Number.isInteger(max) && max >= 0) o.balayageMax = Math.min(max, 500);
  return o;
}

export interface BilanPassage {
  pris: number;
  issues: Record<Issue, number>;
  reportes: number;
  relancees: number | null;
  balayees: number | null;
  duree_ms: number;
  version: string;
  sirene: string;
  vies: string;
  /** « hmrc » quand les identifiants HMRC sont posés, « absent » sinon. */
  hmrc: string;
  battus: number | null;
  erreur?: string;
}

export async function passage(ctx: Contexte, options: Partial<OptionsPassage> = {}): Promise<BilanPassage> {
  const o = { ...OPTIONS_PAR_DEFAUT, ...options };
  const debut = Date.now();
  const bilan: BilanPassage = {
    pris: 0,
    issues: { valide: 0, invalide: 0, indisponible: 0, doute: 0, cache: 0, ignore: 0, repris: 0, abandon: 0, erreur: 0 },
    reportes: 0,
    relancees: null,
    balayees: null,
    duree_ms: 0,
    version: versionIdentite(ctx.env, ctx.maintenant()),
    sirene: ctx.sirene.nom,
    vies: ctx.vies.nom,
    hmrc: ctx.hmrc ? ctx.hmrc.nom : "absent",
    battus: null,
  };
  try {
    try {
      bilan.relancees = await ctx.portes.relancer(o.relanceHeures);
    } catch (e) {
      journal("alerte", "identite_relancer a échoué : on continue", { erreur: messageDe(e) });
    }
    if (o.balayageMax > 0) {
      try {
        bilan.balayees = await ctx.portes.balayer(o.balayageJours, o.balayageMax);
      } catch (e) {
        journal("alerte", "identite_balayer a échoué : on continue", { erreur: messageDe(e) });
      }
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
        balayees: bilan.balayees,
        duree_ms: bilan.duree_ms,
        sirene: bilan.sirene,
        vies: bilan.vies,
        hmrc: bilan.hmrc,
        ...(bilan.erreur ? { erreur: bilan.erreur } : {}),
      });
    } catch (e) {
      journal("erreur", "battre_ouvrier a échoué", { erreur: messageDe(e) });
    }
  }
  journal("info", "passage terminé", { ...bilan });
  return bilan;
}
