// Un passage de l'ouvrier COMPTA : prendre les écritures à pousser (les plus anciennes d'abord), et pour chacune :
// noter l'envoi en cours, chercher d'abord chez l'éditeur si un essai a déjà eu lieu, sinon envoyer, puis noter
// l'identifiant de l'éditeur (ou la demande en attente, pour Cegid Loop). Une panne de jeton ou de configuration
// arrête la connexion (une personne est prévenue) ; un rejet de l'écriture la refuse ; le reste est repris.

import { journal, messageDe } from "@partage/journal.ts";
import type { DepotSigne } from "./editeurs/cegid_loop.ts";
import { CegidLoop } from "./editeurs/cegid_loop.ts";
import { type ClientEditeur, ErreurEditeur } from "./editeurs/commun.ts";
import { Pennylane } from "./editeurs/pennylane.ts";
import { QuickBooks } from "./editeurs/quickbooks.ts";
import { type Env, Jetons } from "./jetons.ts";
import type { Connexion, PortesCompta } from "./portes.ts";

export interface Contexte {
  portes: PortesCompta;
  env: Env;
  fetchFn: typeof fetch;
  depot: DepotSigne;
  maintenant: () => Date;
  /** Le suivi d'une demande Cegid Loop dans le passage (tests : sans pause). */
  suiviLoop?: { essais: number; pauseMs: number };
}

export interface BilanPassage {
  pris: number;
  envoyees: number;
  retrouvees: number;
  en_attente: number;
  refusees: number;
  a_reprendre: number;
  connexions_en_panne: number;
  ignorees: number;
  reportees: number;
  duree_ms: number;
  erreur?: string;
}

export function fabriquer(ctx: Contexte, c: Connexion): ClientEditeur {
  const jetons = new Jetons(c.id, c.editeur, ctx.portes, ctx.env, ctx.fetchFn, ctx.maintenant);
  switch (c.editeur) {
    case "pennylane":
      return new Pennylane(jetons, c.parametres, ctx.fetchFn, ctx.env.get("PENNYLANE_URL") || undefined);
    case "quickbooks":
      return new QuickBooks(jetons, c.parametres, ctx.fetchFn, ctx.env.get("QBO_URL") || undefined);
    case "cegid_loop":
      return new CegidLoop(jetons, c.parametres, ctx.env, ctx.depot, c.client_id, ctx.fetchFn, ctx.maintenant, ctx.suiviLoop);
    default:
      throw new ErreurEditeur("configuration", `Éditeur inconnu : ${String((c as { editeur: unknown }).editeur)}`);
  }
}

export async function passage(ctx: Contexte, options: { max?: number; budgetMs?: number } = {}): Promise<BilanPassage> {
  const max = options.max ?? 20;
  const budget = options.budgetMs ?? 100_000;
  const debut = Date.now();
  const b: BilanPassage = {
    pris: 0,
    envoyees: 0,
    retrouvees: 0,
    en_attente: 0,
    refusees: 0,
    a_reprendre: 0,
    connexions_en_panne: 0,
    ignorees: 0,
    reportees: 0,
    duree_ms: 0,
  };
  const clients = new Map<string, ClientEditeur>();
  const enPanne = new Set<string>();
  try {
    const file = await ctx.portes.aEnvoyer(max);
    b.pris = file.length;
    for (const item of file) {
      const { connexion: c, ecriture: e } = item;
      if (Date.now() - debut > budget) {
        b.reportees++;
        continue;
      }
      if (enPanne.has(c.id)) {
        b.ignorees++;
        continue;
      }
      let essai: { reprise: boolean; tentatives: number };
      try {
        essai = await ctx.portes.commencer(c.id, e.exercice_cle, e.ecriture_num);
      } catch (err) {
        // Déjà envoyée par un autre passage, connexion suspendue entre-temps : rien à faire ici.
        journal("info", "compta : écriture non commencée", { connexion: c.id, cle: e.cle, erreur: messageDe(err) });
        b.ignorees++;
        continue;
      }
      try {
        let client = clients.get(c.id);
        if (!client) {
          client = fabriquer(ctx, c);
          clients.set(c.id, client);
        }
        let issue = essai.reprise ? await client.retrouver(e, item.envoi) : null;
        if (issue && "idExterne" in issue) b.retrouvees++;
        if (!issue) issue = await client.envoyer(e);
        if ("idExterne" in issue) {
          await ctx.portes.noter(c.id, e.exercice_cle, e.ecriture_num, issue.idExterne);
          b.envoyees++;
        } else {
          await ctx.portes.referencer(c.id, e.exercice_cle, e.ecriture_num, issue.enAttente);
          b.en_attente++;
        }
      } catch (err) {
        const message = messageDe(err);
        const nature = err instanceof ErreurEditeur ? err.nature : "temporaire";
        if (nature === "jeton" || nature === "configuration") {
          await ctx.portes.enPanne(c.id, message);
          enPanne.add(c.id);
          b.connexions_en_panne++;
          await ctx.portes.echouer(c.id, e.exercice_cle, e.ecriture_num, message, false);
        } else {
          const etat = await ctx.portes.echouer(c.id, e.exercice_cle, e.ecriture_num, message, nature === "definitif");
          if (etat === "refuse") b.refusees++;
          else b.a_reprendre++;
        }
        journal(nature === "temporaire" ? "info" : "alerte", "compta : envoi en échec", {
          connexion: c.id,
          editeur: c.editeur,
          cle: e.cle,
          nature,
          erreur: message,
        });
      }
    }
  } catch (err) {
    b.erreur = messageDe(err);
    journal("erreur", "compta : passage interrompu", { erreur: b.erreur });
  }
  b.duree_ms = Date.now() - debut;
  try {
    await ctx.portes.battre(b);
  } catch (err) {
    journal("alerte", "compta : battement impossible", { erreur: messageDe(err) });
  }
  return b;
}
