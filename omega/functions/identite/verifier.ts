// Un travail identite.verifier, de bout en bout : la demande par la porte, le
// cache, le registre (Sirene ou VIES), la cohérence, la réponse par la porte,
// le travail rendu. Jamais d'exception qui sorte sans avoir rendu le travail.

import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal, messageDe } from "@partage/journal.ts";
import type { Travail } from "@partage/portes.ts";
import { analyserTvaFr, nomsConcordent, normaliser, sirenValide } from "./coherence.ts";
import type { Complement, Demande, PortesIdentite, ResultatRegistre } from "./portes.ts";
import type { ReponseSirene, Sirene } from "./sirene.ts";
import { paysEtNumero, type Vies } from "./vies.ts";

export interface Contexte {
  portes: PortesIdentite;
  sirene: Sirene;
  vies: Vies;
  env: { get(n: string): string | undefined };
  maintenant: () => Date;
  ouvrier: string;
  /** Au-delà, une réponse en cache ne compte plus. */
  cacheJours: number;
}

export type Issue = "valide" | "invalide" | "indisponible" | "cache" | "ignore" | "repris" | "abandon" | "erreur";

export const CACHE_JOURS_PAR_DEFAUT = 30;

export function versionIdentite(env: { get(n: string): string | undefined }, maintenant: Date): string {
  const v = env.get("IDENTITE_VERSION")?.trim();
  return (v && v !== "" ? v : `identite/${maintenant.toISOString().slice(0, 10)}`).slice(0, 40);
}

interface Verdict {
  resultat: ResultatRegistre;
  preuve: Record<string, unknown>;
  source: string;
  complements: Complement[];
  /** Pour « indisponible » : la raison, qui devient le motif du report. */
  motif?: string;
}

/** Sirene : l'unité légale existe et n'est pas cessée. */
export async function verifierSirene(ctx: Contexte, siren: string): Promise<Verdict> {
  if (!sirenValide(siren)) {
    return {
      resultat: "invalide",
      source: "sirene",
      preuve: { registre: "sirene", siren, motif: "La clé du SIREN ne tombe pas juste : pas de consultation du registre." },
      complements: [],
    };
  }
  const r = await ctx.sirene.consulter(siren);
  return verdictSirene(r, siren);
}

function verdictSirene(r: ReponseSirene, siren: string): Verdict {
  switch (r.etat) {
    case "actif":
      return { resultat: "valide", source: r.source, preuve: r.preuve, complements: [] };
    case "cesse":
      return {
        resultat: "invalide",
        source: r.source,
        preuve: { ...r.preuve, motif: r.preuve.motif ?? "Entreprise cessée au registre Sirene." },
        complements: [],
      };
    case "inconnu":
      return { resultat: "invalide", source: r.source, preuve: { registre: "sirene", siren, ...r.preuve }, complements: [] };
    default:
      return { resultat: "indisponible", source: r.source, preuve: {}, complements: [], motif: r.motif ?? "Sirene indisponible." };
  }
}

/** VIES : le numéro est reconnu ; pour un numéro français, Sirene est consulté en plus sur le SIREN qu'il porte. */
export async function verifierVies(ctx: Contexte, tva: string, demande: Demande): Promise<Verdict> {
  const d = paysEtNumero(tva);
  if (!d) {
    return {
      resultat: "invalide",
      source: "vies",
      preuve: { registre: "vies", numero: tva, motif: "Pas un numéro de TVA de l'Union (deux lettres puis le numéro)." },
      complements: [],
    };
  }
  const r = await ctx.vies.consulter(d.pays, d.numero);
  if (r.etat === "indisponible") {
    return { resultat: "indisponible", source: "vies", preuve: {}, complements: [], motif: r.motif ?? "VIES indisponible." };
  }
  const preuve: Record<string, unknown> = { ...r.preuve };
  const complements: Complement[] = [];

  const fr = analyserTvaFr(tva);
  if (fr) {
    const coherence: Record<string, unknown> = { siren: fr.siren, cle_ok: fr.cle_ok, siren_cle_ok: fr.siren_ok };
    const sirenAttendu = normaliser(demande.fournisseur?.siren);
    if (sirenAttendu) coherence.siren_fournisseur_ok = sirenAttendu === fr.siren;
    if (fr.siren_ok) {
      // Sirene en plus : même entreprise, encore en vie ? Une panne de Sirene n'empêche pas la réponse de VIES.
      try {
        const s = await ctx.sirene.consulter(fr.siren);
        if (s.etat === "indisponible") {
          coherence.sirene = "indisponible";
        } else {
          const v = verdictSirene(s, fr.siren);
          complements.push({ registre: "sirene", identifiant: fr.siren, resultat: v.resultat, preuve: v.preuve, source: v.source });
          coherence.sirene = s.etat;
          const concordent = nomsConcordent(preuve.nom, s.preuve.denomination);
          if (concordent !== null) coherence.noms_concordent = concordent;
          if (r.etat === "invalide" && s.etat === "actif") {
            preuve.remarque = "SIREN actif à Sirene, numéro de TVA non reconnu par VIES : non assujetti probable (franchise en base) ou numéro récent.";
          }
          if (r.etat === "valide" && s.etat === "cesse") {
            preuve.remarque = "VIES reconnaît le numéro mais Sirene donne l'entreprise cessée : à regarder.";
          }
        }
      } catch (e) {
        coherence.sirene = "indisponible";
        journal("alerte", "Sirene en complément de VIES : échec ignoré", { erreur: messageDe(e) });
      }
    }
    preuve.coherence = coherence;
  }
  return { resultat: r.etat, source: "vies", preuve, complements };
}

/** Traite un travail et le rend toujours (fini ou échoué). */
export async function verifierTravail(ctx: Contexte, t: Travail): Promise<Issue> {
  const debut = Date.now();
  const version = versionIdentite(ctx.env, ctx.maintenant());
  const verification = typeof t.charge.verification === "string" ? t.charge.verification : null;
  let issue: Issue = "erreur";
  let registre: string | null = null;
  let source: string | null = null;
  try {
    if (!verification) {
      await ctx.portes.finirTravail(t.id, { ignore: "charge sans verification" });
      return (issue = "ignore");
    }
    const d = await ctx.portes.aVerifier(verification);
    if (!d) {
      await ctx.portes.finirTravail(t.id, { ignore: "vérification introuvable" });
      return (issue = "ignore");
    }
    registre = d.registre;
    if (d.repondu_le) {
      await ctx.portes.finirTravail(t.id, { ignore: "déjà répondue", resultat: d.resultat });
      return (issue = "ignore");
    }
    const force = t.charge.force === true;
    if (!force && d.cache && d.cache.resultat !== "indisponible" && d.cache.age_jours < ctx.cacheJours) {
      const n = await ctx.portes.noter(d.id, d.cache.resultat, {
        ...d.cache.preuve,
        verifie_par: version,
        cache_du: d.cache.verifie_le,
        source_initiale: d.cache.source,
      }, "cache");
      source = "cache";
      await ctx.portes.finirTravail(t.id, { resultat: d.cache.resultat, source: "cache", cache_du: d.cache.verifie_le, recontrolees: n.recontrolees, version });
      return (issue = "cache");
    }

    const v = d.registre === "sirene" ? await verifierSirene(ctx, d.identifiant) : await verifierVies(ctx, d.identifiant, d);
    source = v.source;
    if (v.resultat === "indisponible") {
      if (t.essais < t.essais_max) {
        throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", v.motif ?? "registre indisponible", true);
      }
      // Dernier essai : on écrit « indisponible », le travail est fait, la relance rouvrira la demande dans deux heures.
      await ctx.portes.noter(d.id, "indisponible", { registre: d.registre, motif: v.motif ?? "registre indisponible", verifie_par: version }, v.source);
      await ctx.portes.finirTravail(t.id, { resultat: "indisponible", source: v.source, motif: v.motif, version });
      return (issue = "indisponible");
    }
    const n = await ctx.portes.noter(d.id, v.resultat, { ...v.preuve, verifie_par: version }, v.source, v.complements);
    await ctx.portes.finirTravail(t.id, {
      resultat: v.resultat,
      source: v.source,
      complements: n.complements,
      recontrolees: n.recontrolees,
      deja_repondue: n.deja_repondue,
      version,
    });
    return (issue = v.resultat);
  } catch (e) {
    const err = e instanceof ErreurOuvrier ? e : new ErreurOuvrier("ERREUR_INTERNE", messageDe(e), true);
    try {
      const sort = await ctx.portes.echouerTravail(t.id, err.motif, err.reprendre);
      issue = sort === "echec" ? "abandon" : "repris";
    } catch (e2) {
      journal("erreur", "echouer_travail a échoué", { travail: t.id, erreur: messageDe(e2) });
      issue = "erreur";
    }
    journal(err.code === "FOURNISSEUR_INDISPONIBLE" ? "alerte" : "erreur", "vérification reportée", { travail: t.id, code: err.code, erreur: err.message });
    return issue;
  } finally {
    // Jamais d'identifiant ni de nom dans le journal : l'id de la vérification suffit pour retrouver la ligne.
    journal("info", "vérification traitée", { travail: t.id, verification, registre, issue, source, duree_ms: Date.now() - debut });
  }
}
