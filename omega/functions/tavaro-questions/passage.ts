// Un passage de l'ouvrier des Questions : prendre les travaux tavaro.question (déposés par loc_poser_question),
// choisir les lectures, les faire par la porte, répondre, déposer la réponse, battre. Sous le plafond d'IA du jour du
// client, commun à tous les ouvriers (_partage/plafond.ts, voir _partage/IA.md) ; le coût va dans cout_eur du travail.
// Aucun contenu (ni la question, ni la réponse, ni les chiffres lus) ne va au journal
// ni dans le résultat du travail : des identifiants, des noms de lectures, des jetons, un coût.

import { type ClientClaude, coutEur } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { controlerPlafond } from "@partage/plafond.ts";
import type { Travail } from "@partage/portes.ts";
import type { PortesQuestions } from "./portes_questions.ts";
import { choisir, estimer, repondre } from "./repondre.ts";

export const MODULE = "tavaro";
export const GENRES = ["tavaro.question"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Contexte {
  portes: PortesQuestions;
  claude: ClientClaude | null;
  env: { get(n: string): string | undefined };
  maintenant: () => Date;
  ouvrier: string;
}

export type Issue = "repondue" | "ignore" | "repris" | "abandon" | "erreur";

export interface BilanPassage {
  pris: number;
  issues: Record<Issue, number>;
  reportes: number;
  duree_ms: number;
  version: string;
  ia_branchee: boolean;
  battus: number | null;
  erreur?: string;
}

export interface OptionsPassage {
  nombre: number;
  bail: string;
  budgetMs: number;
}

export const OPTIONS_PAR_DEFAUT: OptionsPassage = { nombre: 5, bail: "5 minutes", budgetMs: 50_000 };

export function versionOuvrier(maintenant: Date, modele: string | null): string {
  return `tavaro-questions/${maintenant.toISOString().slice(0, 10)}/${modele ?? "sans-ia"}`;
}

export async function traiter(ctx: Contexte, t: Travail, version: string): Promise<Issue> {
  const question = typeof t.charge.question === "string" ? t.charge.question : "";
  try {
    if (!UUID.test(question)) {
      await ctx.portes.finirTravail(t.id, { ignore: "charge sans question" });
      return "ignore";
    }
    const d = await ctx.portes.commencer(question);
    if (d.statut !== "a_traiter" || !d.client || !d.texte) {
      await ctx.portes.finirTravail(t.id, { ignore: d.motif ?? d.statut, question });
      return "ignore";
    }
    if (!ctx.claude) throw new ErreurOuvrier("IA_NON_BRANCHEE", "ni ANTHROPIC_API_KEY ni Bedrock : la question attend l'IA.");
    await controlerPlafond(ctx.portes, ctx.env, d.client, estimer(ctx.claude, d));
    const c = await choisir(ctx.claude, d);
    const lus = [];
    for (const x of c.choix) lus.push({ ...x, resultat: await ctx.portes.lire(question, x.lecture, x.parametres) });
    const r = await repondre(ctx.claude, d, lus);
    const usage = { tokens_entree: c.usage.tokens_entree + r.usage.tokens_entree, tokens_sortie: c.usage.tokens_sortie + r.usage.tokens_sortie };
    const cout_eur = coutEur(ctx.claude.prix, usage);
    const meta = { modele: ctx.claude.modele, ...usage, cout_eur };
    await ctx.portes.repondre(question, r.reponse, meta);
    await ctx.portes.finirTravail(t.id, {
      question, statut: "repondue", lectures: lus.map((l) => l.lecture), ecartees: c.ecartees, controles: r.controles, version, ...meta,
    });
    journal("info", "question répondue", { travail: t.id, question, lectures: lus.map((l) => l.lecture), controles: r.controles, cout_eur });
    return "repondue";
  } catch (e) {
    const err = e instanceof ErreurOuvrier ? e : new ErreurOuvrier("ERREUR_INTERNE", messageDe(e));
    journal("alerte", "question rendue", { travail: t.id, question: question || null, code: err.code, reprendre: err.reprendre });
    try {
      const r = await ctx.portes.echouerTravail(t.id, err.motif, err.reprendre);
      if (r === "echec" && UUID.test(question)) await ctx.portes.echec(question, err.motif);
      return r === "echec" ? "abandon" : "repris";
    } catch (e2) {
      journal("erreur", "echouer_travail impossible : le bail expirera", { travail: t.id, erreur: messageDe(e2) });
      return "erreur";
    }
  }
}

export async function passage(ctx: Contexte, options: Partial<OptionsPassage> = {}): Promise<BilanPassage> {
  const o = { ...OPTIONS_PAR_DEFAUT, ...options };
  const debut = Date.now();
  const bilan: BilanPassage = {
    pris: 0,
    issues: { repondue: 0, ignore: 0, repris: 0, abandon: 0, erreur: 0 },
    reportes: 0,
    duree_ms: 0,
    version: versionOuvrier(ctx.maintenant(), ctx.claude?.modele ?? null),
    ia_branchee: ctx.claude !== null,
    battus: null,
  };
  try {
    const travaux = await ctx.portes.prendreTravaux(GENRES, o.nombre, o.bail, ctx.ouvrier);
    bilan.pris = travaux.length;
    for (const t of travaux) {
      if (Date.now() - debut > o.budgetMs) {
        bilan.reportes++;
        continue;
      }
      bilan.issues[await traiter(ctx, t, bilan.version)]++;
    }
  } catch (e) {
    bilan.erreur = messageDe(e);
    journal("erreur", "passage interrompu", { erreur: bilan.erreur });
  } finally {
    bilan.duree_ms = Date.now() - debut;
    try {
      bilan.battus = await ctx.portes.battreOuvrier(MODULE, GENRES, {
        version: bilan.version, pris: bilan.pris, issues: bilan.issues, reportes: bilan.reportes,
        duree_ms: bilan.duree_ms, ia_branchee: bilan.ia_branchee, ...(bilan.erreur ? { erreur: bilan.erreur } : {}),
      });
    } catch (e) {
      journal("erreur", "battre_ouvrier a échoué", { erreur: messageDe(e) });
    }
  }
  journal("info", "passage terminé", { ...bilan });
  return bilan;
}
