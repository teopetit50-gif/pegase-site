// deno-lint-ignore-file require-await
// Les doubles : des portes en mémoire, un Sirene et un VIES qui rendent ce
// qu'on leur a préparé. Ils enregistrent chaque appel. Aucun appel réseau.

import type { Travail } from "@partage/portes.ts";
import type { Complement, Demande, Notation, PortesIdentite, Registre, ResultatRegistre } from "../portes.ts";
import type { ReponseSirene, Sirene } from "../sirene.ts";
import type { Contexte } from "../verifier.ts";
import type { RegistreHmrc, ReponseHmrc } from "../hmrc.ts";
import type { RegistreUidCh, ReponseUidCh } from "../uid_ch.ts";
import type { ReponseVies, Vies } from "../vies.ts";

export const CLIENT_BANC = "cccccccc-0000-4000-8000-00000000000c";

export class PortesMemoire implements PortesIdentite {
  travaux: Travail[] = [];
  demandes = new Map<string, Demande>();
  appels: { porte: string; args: unknown[] }[] = [];
  notations: { verification: string; resultat: ResultatRegistre; preuve: Record<string, unknown>; source: string; complements: Complement[] }[] = [];
  finis: { id: number; resultat: unknown }[] = [];
  echoues: { id: number; erreur: string; reprendre: boolean }[] = [];
  battements: { module: string; genres: string[]; detail: unknown }[] = [];
  relances: number[] = [];
  aRelancer = 0;
  balayages: { jours: number; max: number }[] = [];
  aBalayer = 0;
  /** Pour simuler la règle de b7_04 : les refus de ces vérifications sont mis en doute. */
  douter = new Set<string>();
  /** Pour simuler une porte en panne. */
  panne: Partial<Record<keyof PortesIdentite, Error>> = {};

  private noterAppel(porte: keyof PortesIdentite, ...args: unknown[]) {
    this.appels.push({ porte, args });
    const p = this.panne[porte];
    if (p) throw p;
  }

  async prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string): Promise<Travail[]> {
    this.noterAppel("prendreTravaux", genres, nombre, bail, ouvrier);
    const pris = this.travaux.filter((t) => genres.includes(t.genre)).slice(0, nombre);
    this.travaux = this.travaux.filter((t) => !pris.includes(t));
    return pris;
  }
  async finirTravail(id: number, resultat: unknown): Promise<void> {
    this.noterAppel("finirTravail", id, resultat);
    this.finis.push({ id, resultat });
  }
  async echouerTravail(id: number, erreur: string, reprendre = true): Promise<"repris" | "echec"> {
    this.noterAppel("echouerTravail", id, erreur, reprendre);
    this.echoues.push({ id, erreur, reprendre });
    return reprendre ? "repris" : "echec";
  }
  async battreOuvrier(module: string, genres: string[], detail: unknown): Promise<number> {
    this.noterAppel("battreOuvrier", module, genres, detail);
    this.battements.push({ module, genres, detail });
    return 1;
  }
  async aVerifier(verification: string): Promise<Demande | null> {
    this.noterAppel("aVerifier", verification);
    return this.demandes.get(verification) ?? null;
  }
  async noter(
    verification: string,
    resultat: ResultatRegistre,
    preuve: Record<string, unknown>,
    source: string,
    complements: Complement[] = [],
  ): Promise<Notation> {
    this.noterAppel("noter", verification, resultat, preuve, source, complements);
    const d = this.demandes.get(verification);
    if (!d) throw new Error("Vérification inconnue.");
    if (d.repondu_le) return { verification, deja_repondue: true, complements: 0, recontrolees: 0, resultat: d.resultat, doute: false };
    const doute = resultat === "invalide" && this.douter.has(verification);
    const ecrit: ResultatRegistre = doute ? "indisponible" : resultat;
    d.repondu_le = "2026-10-05T10:00:01Z";
    d.resultat = ecrit;
    this.notations.push({ verification, resultat, preuve, source, complements });
    return { verification, deja_repondue: false, complements: complements.length, recontrolees: ecrit === "indisponible" ? 0 : 1, resultat: ecrit, doute };
  }
  async relancer(heures: number): Promise<number> {
    this.noterAppel("relancer", heures);
    this.relances.push(heures);
    return this.aRelancer;
  }
  async balayer(jours: number, max: number): Promise<number> {
    this.noterAppel("balayer", jours, max);
    this.balayages.push({ jours, max });
    return this.aBalayer;
  }
}

export class SireneFactice implements Sirene {
  readonly nom = "sirene-factice";
  reponses = new Map<string, ReponseSirene>();
  parDefaut: ReponseSirene = { etat: "indisponible", source: "sirene", preuve: {}, motif: "double sans réponse" };
  appels: string[] = [];
  panne: Error | null = null;
  async consulter(siren: string): Promise<ReponseSirene> {
    this.appels.push(siren);
    if (this.panne) throw this.panne;
    return this.reponses.get(siren) ?? this.parDefaut;
  }
}

export class ViesFactice implements Vies {
  readonly nom = "vies-factice";
  reponses = new Map<string, ReponseVies>();
  parDefaut: ReponseVies = { etat: "indisponible", preuve: {}, motif: "double sans réponse" };
  appels: { pays: string; numero: string }[] = [];
  async consulter(pays: string, numero: string): Promise<ReponseVies> {
    this.appels.push({ pays, numero });
    return this.reponses.get(pays + numero) ?? this.parDefaut;
  }
}

/** Le registre IDE suisse (pas encore branché sur verifier.ts). */
export class UidChFactice implements RegistreUidCh {
  readonly nom = "uid_ch-factice";
  reponses = new Map<string, ReponseUidCh>();
  parDefaut: ReponseUidCh = { etat: "indisponible", preuve: {}, motif: "double sans réponse" };
  appels: { uid: string; tva: boolean }[] = [];
  async consulter(uid: string, tva: boolean): Promise<ReponseUidCh> {
    this.appels.push({ uid, tva });
    return this.reponses.get(uid) ?? this.parDefaut;
  }
}

/** HMRC « Check a UK VAT number » (pas encore branché sur verifier.ts). */
export class HmrcFactice implements RegistreHmrc {
  readonly nom = "hmrc-factice";
  reponses = new Map<string, ReponseHmrc>();
  parDefaut: ReponseHmrc = { etat: "indisponible", preuve: {}, motif: "double sans réponse" };
  appels: string[] = [];
  async consulter(vrn: string): Promise<ReponseHmrc> {
    this.appels.push(vrn);
    return this.reponses.get(vrn) ?? this.parDefaut;
  }
}

export function envFactice(valeurs: Record<string, string> = {}) {
  return { get: (n: string) => valeurs[n] };
}

export function sireneActif(siren: string, denomination = "ATELIER DURAND SAS"): ReponseSirene {
  return {
    etat: "actif",
    source: "sirene",
    preuve: {
      registre: "sirene",
      siren,
      etat: "actif",
      diffusion: "totale",
      denomination,
      categorie_juridique: "5710",
      activite: "43.32A",
      date_creation: "2015-03-01",
    },
  };
}

export function viesValide(pays: string, numero: string, nom = "SAS ATELIER DURAND"): ReponseVies {
  return {
    etat: "valide",
    preuve: { registre: "vies", pays, numero, etat: "valide", nom, adresse: "1 RUE DE LA PAIX 75002 PARIS", consulte_le: "2026-10-05T10:00:00Z" },
  };
}

export function demandeDeTest(id: string, registre: Registre, identifiant: string, extra: Partial<Demande> = {}): Demande {
  return {
    id,
    client_id: CLIENT_BANC,
    fournisseur_id: "ffffffff-0000-4000-8000-000000000001",
    registre,
    identifiant,
    demande_le: "2026-10-05T09:59:00Z",
    repondu_le: null,
    resultat: null,
    fournisseur: { id: "ffffffff-0000-4000-8000-000000000001", pays: "FR", siren: null, tva: null, statut: "a_confirmer" },
    cache: null,
    ...extra,
  };
}

export function travailDeTest(id: number, verification: string, extra: Partial<Travail> = {}): Travail {
  return {
    id,
    client_id: CLIENT_BANC,
    module: "filed",
    genre: "identite.verifier",
    charge: { verification, registre: "sirene", identifiant: "x" },
    cle: `verification:${verification}`,
    essais: 1,
    essais_max: 5,
    ...extra,
  };
}

export function contexteDeTest(options: { env?: Record<string, string>; cacheJours?: number } = {}): {
  ctx: Contexte;
  portes: PortesMemoire;
  sirene: SireneFactice;
  vies: ViesFactice;
  uidCh: UidChFactice;
  hmrc: HmrcFactice;
} {
  const portes = new PortesMemoire();
  const sirene = new SireneFactice();
  const vies = new ViesFactice();
  const uidCh = new UidChFactice();
  const hmrc = new HmrcFactice();
  const ctx: Contexte = {
    portes,
    sirene,
    vies,
    env: envFactice(options.env),
    maintenant: () => new Date("2026-10-05T10:00:00Z"),
    ouvrier: "identite-test",
    cacheJours: options.cacheJours ?? 30,
    uidCh,
    hmrc,
  };
  return { ctx, portes, sirene, vies, uidCh, hmrc };
}

/** Capture ce que le journal écrit pendant une fonction, pour vérifier qu'aucune donnée n'y passe. */
export async function capturerJournal(fn: () => Promise<void>): Promise<string[]> {
  const lignes: string[] = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...a: unknown[]) => lignes.push(a.map(String).join(" "));
  console.warn = console.log;
  console.error = console.log;
  try {
    await fn();
  } finally {
    console.log = orig.log;
    console.warn = orig.warn;
    console.error = orig.error;
  }
  return lignes;
}
