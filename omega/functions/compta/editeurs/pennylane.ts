// Pennylane, API v2 (https://pennylane.readme.io/v2.0/reference/postledgerentries).
//   POST /ledger_entries {date, label, journal_id, piece_number, ledger_entry_lines[{debit, credit, ledger_account_id, label}]}
//   (montants en chaînes, débits = crédits, 1 000 lignes au plus) ; portée OAuth ledger_entries:all.
//   GET /journals (id, code, label) ; GET /ledger_accounts?filter=[{"field":"number","operator":"eq","value":"…"}].
// Pas d'idempotence chez Pennylane : piece_number porte la clé OMEGA-… de l'écriture, et une reprise la cherche
// d'abord (GET /ledger_entries filtré sur piece_number). Le compte d'un fournisseur est 401 + son code (comme
// l'import fichier) ; absent, il est créé (POST /ledger_accounts). Un compte général absent est un refus : le plan
// comptable de Pennylane se règle à la main.

import { journal } from "@partage/journal.ts";
import type { Jetons } from "../jetons.ts";
import type { Ecriture, EtatEnvoi } from "../portes.ts";
import { appeler, type ClientEditeur, compteAuxiliaire, ErreurEditeur, type Issue, montant } from "./commun.ts";

export const URL_PENNYLANE = "https://app.pennylane.com/api/external/v2";

interface Liste<T> {
  items?: T[];
}
interface CompteP {
  id: number;
  number: string;
  label?: string;
  enabled?: boolean;
}

function elements<T>(r: Liste<T> | T[] | null): T[] {
  if (!r) return [];
  return Array.isArray(r) ? r : (r.items ?? []);
}

export class Pennylane implements ClientEditeur {
  readonly nom = "pennylane" as const;
  private journaux: Map<string, number> | null = null;
  private comptes = new Map<string, number>();

  constructor(
    private readonly jetons: Jetons,
    private readonly parametres: Record<string, unknown>,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly base: string = URL_PENNYLANE,
  ) {}

  private get<T>(chemin: string): Promise<T> {
    return this.jetons.avec((j) => appeler<T>(this.fetchFn, `${this.base}${chemin}`, { entetes: { Authorization: `Bearer ${j}` } }, "Pennylane"));
  }
  private post<T>(chemin: string, json: unknown): Promise<T> {
    return this.jetons.avec((j) =>
      appeler<T>(this.fetchFn, `${this.base}${chemin}`, { methode: "POST", json, entetes: { Authorization: `Bearer ${j}` } }, "Pennylane")
    );
  }

  /** Le journal Pennylane d'un code Omega (HA, BQ, CA), renommable par les paramètres de la connexion. */
  async journal(code: string): Promise<number> {
    if (!this.journaux) {
      this.journaux = new Map();
      for (const j of elements(await this.get<Liste<{ id: number; code: string }>>("/journals?limit=100"))) this.journaux.set(j.code.toUpperCase(), j.id);
    }
    const renomme = { HA: "journal_achats", BQ: "journal_banque", CA: "journal_caisse" }[code];
    const cible = String((renomme && this.parametres[renomme]) || code).toUpperCase();
    const id = this.journaux.get(cible);
    if (id === undefined) {
      throw new ErreurEditeur("definitif", `Journal ${cible} absent de Pennylane : à créer, ou à désigner dans les paramètres de la connexion.`);
    }
    return id;
  }

  async compte(numero: string, libelle: string, creer: boolean): Promise<number> {
    const deja = this.comptes.get(numero);
    if (deja !== undefined) return deja;
    const filtre = encodeURIComponent(JSON.stringify([{ field: "number", operator: "eq", value: numero }]));
    const trouves = elements(await this.get<Liste<CompteP>>(`/ledger_accounts?filter=${filtre}`)).filter((c) => c.number === numero && c.enabled !== false);
    let id = trouves[0]?.id;
    if (id === undefined) {
      if (!creer) throw new ErreurEditeur("definitif", `Compte ${numero} absent du plan comptable de Pennylane : à créer, puis l'écriture repart.`);
      const cree = await this.post<CompteP>("/ledger_accounts", { number: numero, label: libelle.slice(0, 200) });
      id = cree.id;
    }
    this.comptes.set(numero, id);
    return id;
  }

  async retrouver(e: Ecriture, _envoi: EtatEnvoi | null): Promise<Issue | null> {
    const filtre = encodeURIComponent(JSON.stringify([{ field: "piece_number", operator: "eq", value: e.cle }]));
    try {
      const r = elements(await this.get<Liste<{ id: number; piece_number?: string }>>(`/ledger_entries?filter=${filtre}`));
      const t = r.find((x) => x.piece_number === undefined || x.piece_number === e.cle);
      return t ? { idExterne: String(t.id) } : null;
    } catch (err) {
      // Un filtre refusé (400) ne doit pas bloquer : on le dit, et l'écriture repart avec sa clé en numéro de pièce.
      if (err instanceof ErreurEditeur && err.nature === "definitif") {
        journal("alerte", "Pennylane : recherche par piece_number refusée, reprise sans vérification", { cle: e.cle, erreur: err.message });
        return null;
      }
      throw err;
    }
  }

  async envoyer(e: Ecriture): Promise<Issue> {
    if (e.lignes.length > 1000) throw new ErreurEditeur("definitif", "Plus de 1 000 lignes : Pennylane n'en prend pas autant en une écriture.");
    const lignes = [];
    for (const l of e.lignes) {
      const aux = l.comp_aux_num ? compteAuxiliaire(l.compte_num, l.comp_aux_num) : null;
      lignes.push({
        debit: montant(l.debit),
        credit: montant(l.credit),
        ledger_account_id: await this.compte(aux ?? l.compte_num, aux ? (l.comp_aux_lib ?? aux) : l.compte_lib, aux !== null),
        label: l.libelle.slice(0, 200),
      });
    }
    const r = await this.post<{ id: number }>("/ledger_entries", {
      date: e.date,
      label: `${e.libelle}`.slice(0, 200),
      journal_id: await this.journal(e.journal_code),
      piece_number: e.cle,
      ledger_entry_lines: lignes,
    });
    if (!r || r.id === undefined) throw new ErreurEditeur("temporaire", "Pennylane : réponse sans identifiant.");
    return { idExterne: String(r.id) };
  }
}
