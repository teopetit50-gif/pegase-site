// Un passage de l'ouvrier REPUT : prendre les travaux reput.preparer (déposés par l'abonnement
// reception.nouvelle → reput), rédiger chaque réponse, la déposer par la porte, battre. Appelé chaque
// minute : la réponse est prête dans la minute. Aucun contenu (ni la demande, ni la réponse) ne va
// au journal ni dans le résultat du travail : des identifiants, un sujet, des états, des jetons, un coût.

import type { ClientClaude } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal, messageDe } from "@partage/journal.ts";
import type { Travail } from "@partage/portes.ts";
import type { PortesReput } from "./portes_reput.ts";
import { estimer, rediger } from "./rediger.ts";

export const MODULE = "reput";
export const GENRES = ["reput.preparer"];
export const CLE_PLAFOND = "plafond_ia_jour_client";
export const PLAFOND_PAR_DEFAUT_EUR = 5;

export interface Contexte {
  portes: PortesReput;
  claude: ClientClaude | null;
  env: { get(n: string): string | undefined };
  maintenant: () => Date;
  ouvrier: string;
}

export type Issue = "preparee" | "ignore" | "repris" | "abandon" | "erreur";

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
  return `reput-reponse/${maintenant.toISOString().slice(0, 10)}/${modele ?? "sans-ia"}`;
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
  let demande: string | undefined;
  try {
    const reception = Number(t.charge.reception);
    if (!Number.isInteger(reception) || reception <= 0) {
      await ctx.portes.finirTravail(t.id, { ignore: "charge sans réception" });
      return "ignore";
    }
    if (typeof t.charge.module === "string" && t.charge.module !== MODULE) {
      await ctx.portes.finirTravail(t.id, { ignore: `réception du module ${t.charge.module}` });
      return "ignore";
    }
    const dossier = await ctx.portes.commencer(reception);
    if (dossier.statut !== "a_preparer" || !dossier.demande || !dossier.client) {
      await ctx.portes.finirTravail(t.id, { ignore: dossier.motif ?? dossier.statut, demande: dossier.demande ?? null });
      return "ignore";
    }
    demande = dossier.demande;
    if (!ctx.claude) {
      throw new ErreurOuvrier("IA_NON_BRANCHEE", "ni ANTHROPIC_API_KEY ni Bedrock : la réponse attend l'IA.");
    }
    await plafond(ctx, dossier.client, estimer(ctx.claude, dossier));
    const sortie = await rediger(ctx.claude, dossier);
    const depot = await ctx.portes.deposerReponse(demande, {
      ...sortie.redaction,
      modele: sortie.modele,
      tokens_entree: sortie.usage.tokens_entree,
      tokens_sortie: sortie.usage.tokens_sortie,
      cout_eur: sortie.cout_eur,
    }, version);
    await ctx.portes.finirTravail(t.id, {
      demande,
      reponse: depot.reponse ?? null,
      statut: depot.statut,
      sujet: depot.sujet ?? sortie.redaction.sujet,
      couverte: depot.couverte ?? sortie.redaction.couverte,
      controles: sortie.controles,
      envoi: depot.envoi ?? null,
      envoi_statut: depot.envoi_statut ?? null,
      verrou: depot.verrou ?? null,
      politique: depot.politique ?? null,
      modele: sortie.modele,
      tokens_entree: sortie.usage.tokens_entree,
      tokens_sortie: sortie.usage.tokens_sortie,
      cout_eur: sortie.cout_eur,
    });
    journal("info", "réponse préparée", {
      travail: t.id, demande, statut: depot.statut, sujet: depot.sujet, couverte: depot.couverte, cout_eur: sortie.cout_eur,
    });
    return "preparee";
  } catch (e) {
    const err = e instanceof ErreurOuvrier ? e : new ErreurOuvrier("ERREUR_INTERNE", messageDe(e));
    journal("alerte", "préparation rendue", { travail: t.id, demande: demande ?? null, code: err.code, reprendre: err.reprendre });
    try {
      const r = await ctx.portes.echouerTravail(t.id, err.motif, err.reprendre);
      if (r === "echec" && demande) await ctx.portes.marquerEchec(demande, err.motif);
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
    issues: { preparee: 0, ignore: 0, repris: 0, abandon: 0, erreur: 0 },
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
