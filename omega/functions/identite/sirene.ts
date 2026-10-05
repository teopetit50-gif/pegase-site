// Le registre Sirene de l'INSEE : l'unité légale d'un SIREN (état administratif,
// dénomination, catégorie juridique, activité). Accès par la clé d'intégration du
// portail https://portail-api.insee.fr (secret SIRENE_API_KEY). Sans clé, ou si
// l'INSEE la refuse, repli sur l'annuaire public recherche-entreprises.api.gouv.fr
// (DINUM, sans clé, sans garantie) : la preuve dit d'où vient la réponse.

import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal } from "@partage/journal.ts";
import { normaliser, sirenValide } from "./coherence.ts";

export type EtatSirene = "actif" | "cesse" | "inconnu" | "indisponible";

export interface ReponseSirene {
  etat: EtatSirene;
  /** D'où vient la réponse : 'sirene' (INSEE) ou 'recherche-entreprises' (repli). */
  source: "sirene" | "recherche-entreprises";
  /** Ce que l'on garde comme preuve : rien de secret, et rien pour une unité non diffusible. */
  preuve: Record<string, unknown>;
  /** Pourquoi c'est indisponible (HTTP, réseau), pour le motif du travail. */
  motif?: string;
}

export interface Sirene {
  readonly nom: string;
  consulter(siren: string): Promise<ReponseSirene>;
}

const DELAI_MS = 10_000;

function sansNd(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return null;
  const v = String(valeur).trim();
  return v === "" || v === "[ND]" ? null : v;
}

/** L'API Sirene 3.11 de l'INSEE. */
export class SireneInsee implements Sirene {
  readonly nom = "sirene";
  constructor(
    private readonly cle: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly base = "https://api.insee.fr/api-sirene/3.11",
  ) {}

  async consulter(siren: string): Promise<ReponseSirene> {
    const s = normaliser(siren) ?? "";
    if (!/^[0-9]{9}$/.test(s)) {
      return { etat: "inconnu", source: "sirene", preuve: { siren: s, motif: "Un SIREN a neuf chiffres." } };
    }
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.base}/siren/${s}`, {
        headers: { "X-INSEE-Api-Key-Integration": this.cle, Accept: "application/json" },
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (e) {
      return { etat: "indisponible", source: "sirene", preuve: {}, motif: `Sirene injoignable : ${(e as Error).message}` };
    }
    const texte = await rep.text();
    if (rep.status === 404) {
      return { etat: "inconnu", source: "sirene", preuve: { siren: s, motif: "SIREN inconnu de Sirene.", consulte_le: new Date().toISOString() } };
    }
    if (rep.status === 401 || rep.status === 403) {
      // La clé est absente ou refusée : ce n'est pas une panne passagère, l'appelant choisit le repli.
      throw new ErreurOuvrier("PORTE_REFUSEE", `Sirene refuse la clé SIRENE_API_KEY (HTTP ${rep.status}).`, true);
    }
    if (!rep.ok) {
      return { etat: "indisponible", source: "sirene", preuve: {}, motif: `Sirene : HTTP ${rep.status} ${texte.slice(0, 200)}` };
    }
    let corps: Record<string, unknown>;
    try {
      corps = JSON.parse(texte);
    } catch {
      return { etat: "indisponible", source: "sirene", preuve: {}, motif: "Sirene : réponse illisible." };
    }
    return lireUniteLegale(s, corps);
  }
}

/** Lecture d'une réponse `/siren/{siren}` de l'INSEE : la période courante est la première (dateFin nulle). */
export function lireUniteLegale(siren: string, corps: Record<string, unknown>): ReponseSirene {
  const ul = (corps.uniteLegale ?? {}) as Record<string, unknown>;
  const periodes = (Array.isArray(ul.periodesUniteLegale) ? ul.periodesUniteLegale : []) as Record<string, unknown>[];
  const courante = periodes.find((p) => p.dateFin === null || p.dateFin === undefined) ?? periodes[0] ?? {};
  const etatAdmin = sansNd(courante.etatAdministratifUniteLegale);
  if (!etatAdmin) {
    return { etat: "indisponible", source: "sirene", preuve: {}, motif: "Sirene : unité légale sans état administratif." };
  }
  const diffusion = sansNd(ul.statutDiffusionUniteLegale) === "P" ? "partielle" : "totale";
  const denomination = sansNd(courante.denominationUniteLegale);
  const nom = sansNd(courante.nomUniteLegale);
  const prenom = sansNd(ul.prenom1UniteLegale) ?? sansNd(ul.prenomUsuelUniteLegale);
  const preuve: Record<string, unknown> = {
    registre: "sirene",
    siren,
    etat: etatAdmin === "A" ? "actif" : "cesse",
    diffusion,
    categorie_juridique: sansNd(courante.categorieJuridiqueUniteLegale),
    activite: sansNd(courante.activitePrincipaleUniteLegale),
    date_creation: sansNd(ul.dateCreationUniteLegale),
    depuis_le: sansNd(courante.dateDebut),
    consulte_le: new Date().toISOString(),
  };
  if (diffusion === "totale") {
    if (denomination) preuve.denomination = denomination;
    else if (nom) {
      preuve.denomination = [prenom, nom].filter(Boolean).join(" ");
      preuve.personne_physique = true;
    }
  } else {
    preuve.motif = "Unité non diffusible : l'INSEE ne rend ni nom ni adresse.";
  }
  if (etatAdmin !== "A") preuve.date_cessation = sansNd(courante.dateDebut);
  return { etat: etatAdmin === "A" ? "actif" : "cesse", source: "sirene", preuve };
}

/** L'annuaire des entreprises (DINUM), sans clé : le repli quand l'INSEE n'est pas branché. */
export class SireneRechercheEntreprises implements Sirene {
  readonly nom = "recherche-entreprises";
  constructor(private readonly fetchFn: typeof fetch = fetch, private readonly base = "https://recherche-entreprises.api.gouv.fr") {}

  async consulter(siren: string): Promise<ReponseSirene> {
    const s = normaliser(siren) ?? "";
    if (!/^[0-9]{9}$/.test(s)) {
      return { etat: "inconnu", source: "recherche-entreprises", preuve: { siren: s, motif: "Un SIREN a neuf chiffres." } };
    }
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.base}/search?q=${s}&page=1&per_page=5`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (e) {
      return { etat: "indisponible", source: "recherche-entreprises", preuve: {}, motif: `Annuaire injoignable : ${(e as Error).message}` };
    }
    const texte = await rep.text();
    if (!rep.ok) {
      return { etat: "indisponible", source: "recherche-entreprises", preuve: {}, motif: `Annuaire : HTTP ${rep.status} ${texte.slice(0, 200)}` };
    }
    let corps: { results?: Record<string, unknown>[] };
    try {
      corps = JSON.parse(texte);
    } catch {
      return { etat: "indisponible", source: "recherche-entreprises", preuve: {}, motif: "Annuaire : réponse illisible." };
    }
    const r = (corps.results ?? []).find((x) => String(x.siren ?? "") === s);
    if (!r) {
      return {
        etat: "inconnu",
        source: "recherche-entreprises",
        preuve: { siren: s, motif: "SIREN absent de l'annuaire des entreprises.", consulte_le: new Date().toISOString() },
      };
    }
    const etat = String(r.etat_administratif ?? "") === "A" ? "actif" : "cesse";
    const preuve: Record<string, unknown> = {
      registre: "sirene",
      siren: s,
      etat,
      diffusion: "totale",
      denomination: sansNd(r.nom_raison_sociale) ?? sansNd(r.nom_complet),
      categorie_juridique: sansNd(r.nature_juridique),
      activite: sansNd(r.activite_principale),
      date_creation: sansNd(r.date_creation),
      consulte_le: new Date().toISOString(),
      motif: "Réponse de l'annuaire des entreprises (repli sans clé INSEE).",
    };
    if (etat === "cesse") preuve.date_cessation = sansNd(r.date_fermeture);
    return { etat, source: "recherche-entreprises", preuve };
  }
}

/** L'INSEE d'abord ; si la clé manque ou est refusée, l'annuaire. */
export class SireneAvecRepli implements Sirene {
  readonly nom: string;
  private cleRefusee = false;
  constructor(private readonly insee: Sirene | null, private readonly repli: Sirene | null) {
    this.nom = insee ? (repli ? "sirene+repli" : "sirene") : repli ? "repli" : "aucun";
  }

  async consulter(siren: string): Promise<ReponseSirene> {
    if (this.insee && !this.cleRefusee) {
      try {
        return await this.insee.consulter(siren);
      } catch (e) {
        if (!(e instanceof ErreurOuvrier) || e.code !== "PORTE_REFUSEE" || !this.repli) throw e;
        this.cleRefusee = true;
        journal("alerte", "Sirene refuse la clé : repli sur l'annuaire des entreprises pour ce passage", { erreur: e.message });
      }
    }
    if (this.repli) return await this.repli.consulter(siren);
    return { etat: "indisponible", source: "sirene", preuve: {}, motif: "Aucun registre Sirene branché (SIRENE_API_KEY absente, repli coupé)." };
  }
}

export function sireneDepuisEnv(env: { get(n: string): string | undefined }, fetchFn: typeof fetch = fetch): SireneAvecRepli {
  const cle = env.get("SIRENE_API_KEY")?.trim();
  const repli = (env.get("SIRENE_REPLI") ?? "oui").toLowerCase() !== "non";
  return new SireneAvecRepli(cle ? new SireneInsee(cle, fetchFn) : null, repli ? new SireneRechercheEntreprises(fetchFn) : null);
}

/** Garde-fou avant tout appel : un SIREN à clé fausse ne se demande pas à un registre. */
export function sirenInterrogeable(siren: string): boolean {
  return sirenValide(siren);
}
