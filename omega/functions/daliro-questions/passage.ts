// Un passage de l'ouvrier « questions » de DALIRO : prendre les travaux daliro.question (déposés par
// btp_poser_question), répondre à chacune, déposer la réponse par la porte, battre. Appelé chaque minute.
// Aucun contenu (ni la question, ni la réponse) ne va au journal ni dans le résultat du travail : des
// identifiants, des états, des jetons, un coût. Le plafond d'IA est celui du lecteur et de REPUT
// (plafond_ia_jour_client, consommation_ia_jour compte daliro.question depuis b6_36).

import type { ClientClaude } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal, messageDe } from "@partage/journal.ts";
import type { Travail } from "@partage/portes.ts";
import type { PortesQuestions } from "./portes_questions.ts";
import { estimer, repondre } from "./repondre.ts";

export const MODULE = "daliro";
export const GENRES = ["daliro.question"];
export const CLE_PLAFOND = "plafond_ia_jour_client";
export const PLAFOND_PAR_DEFAUT_EUR = 5;

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

export const OPTIONS_PAR_DEFAUT: OptionsPassage = { nombre: 10, bail: "5 minutes", budgetMs: 50_000 };

export function versionOuvrier(maintenant: Date, modele: string | null): string {
  return `daliro-questions/${maintenant.toISOString().slice(0, 10)}/${modele ?? "sans-ia"}`;
}

async function plafond(ctx: Contexte, client: string, estimation: number): Promise<void> {
  const p = await ctx.portes.lireParametre(CLE_PLAFOND);
  let max = p === null ? NaN : Number(String(p).replace(",", "."));
  if (!Number.isFinite(max)) {
    const e = ctx.env.get("PLAFOND_IA_JOUR_CLIENT_EUR");
    max = e === undefined ? PLAFOND_PAR_DEFAUT_EUR : Number(e.replace(",", "."));
    if (!Number.isFinite(max)) max = PLAFOND_PAR_DEFAUT_EUR;
  }
  const consomme = await ctx.portes.consommationIaDuJour(client);
  if (max <= 0 || consomme + estimation > max) {
    throw new ErreurOuvrier("PLAFOND_IA", `plafond ${max.toFixed(2)} € par jour : ${consomme.toFixed(4)} € consommés, ${estimation.toFixed(4)} € estimés.`);
  }
}

export async function traiter(ctx: Contexte, t: Travail, version: string): Promise<Issue> {
  let question: string | undefined;
  try {
    const q = t.charge.question;
    if (typeof q !== "string" || !/^[0-9a-f-]{36}$/i.test(q)) {
      await ctx.portes.finirTravail(t.id, { ignore: "charge sans question" });
      return "ignore";
    }
    const dossier = await ctx.portes.commencer(q);
    if (dossier.statut !== "a_repondre" || !dossier.client) {
      await ctx.portes.finirTravail(t.id, { ignore: dossier.motif ?? dossier.etat ?? dossier.statut, question: q });
      return "ignore";
    }
    question = q;
    if (!ctx.claude) {
      throw new ErreurOuvrier("IA_NON_BRANCHEE", "ni ANTHROPIC_API_KEY ni Bedrock : la question attend l'IA.");
    }
    await plafond(ctx, dossier.client, estimer(ctx.claude, dossier));
    const sortie = await repondre(ctx.claude, dossier);
    const depot = await ctx.portes.deposer(question, {
      ...sortie.reponse,
      modele: sortie.modele,
      tokens_entree: sortie.usage.tokens_entree,
      tokens_sortie: sortie.usage.tokens_sortie,
      cout_eur: sortie.cout_eur,
    }, version);
    await ctx.portes.finirTravail(t.id, {
      question,
      statut: depot.statut,
      couverte: sortie.reponse.couverte,
      controles: sortie.controles,
      modele: sortie.modele,
      tokens_entree: sortie.usage.tokens_entree,
      tokens_sortie: sortie.usage.tokens_sortie,
      cout_eur: sortie.cout_eur,
    });
    journal("info", "question répondue", { travail: t.id, question, couverte: sortie.reponse.couverte, cout_eur: sortie.cout_eur });
    return "repondue";
  } catch (e) {
    const err = e instanceof ErreurOuvrier ? e : new ErreurOuvrier("ERREUR_INTERNE", messageDe(e));
    journal("alerte", "question rendue", { travail: t.id, question: question ?? null, code: err.code, reprendre: err.reprendre });
    try {
      const r = await ctx.portes.echouerTravail(t.id, err.motif, err.reprendre);
      if (r === "echec" && question) await ctx.portes.marquerEchec(question, err.motif);
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
