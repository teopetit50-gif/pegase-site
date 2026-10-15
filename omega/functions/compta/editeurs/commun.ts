// Ce que partagent les trois clients d'éditeur : la nature d'une erreur, l'appel HTTP qui la classe, et le contrat
// d'un client (retrouver une écriture déjà poussée, en pousser une).

import type { Ecriture, Editeur, EtatEnvoi } from "../portes.ts";

/**
 * temporaire : réseau, 429, 5xx, l'éditeur réfléchit encore → à reprendre ;
 * definitif : l'éditeur rejette l'écriture (compte inconnu, données invalides) → refusée, une personne décide ;
 * jeton : 401 après renouvellement, autorisation retirée → la connexion s'arrête ;
 * configuration : il manque un paramètre ou une variable d'environnement → la connexion s'arrête.
 */
export type NatureErreur = "temporaire" | "definitif" | "jeton" | "configuration";

export class ErreurEditeur extends Error {
  constructor(public readonly nature: NatureErreur, message: string, public readonly statut: number | null = null) {
    super(message);
    this.name = "ErreurEditeur";
  }
}

/** Ce que rend un envoi : l'identifiant chez l'éditeur, ou une demande encore en traitement (éditeur asynchrone). */
export type Issue = { idExterne: string } | { enAttente: string };

export interface ClientEditeur {
  readonly nom: Editeur;
  /** L'écriture est-elle déjà chez l'éditeur (essai précédent abouti) ? Son identifiant, ou null. */
  retrouver(e: Ecriture, envoi: EtatEnvoi | null): Promise<Issue | null>;
  envoyer(e: Ecriture): Promise<Issue>;
}

export interface Requete {
  methode?: "GET" | "POST";
  entetes?: Record<string, string>;
  json?: unknown;
  formulaire?: Record<string, string>;
}

/** Un appel HTTP qui rend le JSON, ou lève une ErreurEditeur classée d'après le statut. */
export async function appeler<T>(fetchFn: typeof fetch, url: string, r: Requete = {}, quoi = "éditeur"): Promise<T> {
  const entetes: Record<string, string> = { Accept: "application/json", ...(r.entetes ?? {}) };
  let corps: string | undefined;
  if (r.json !== undefined) {
    entetes["Content-Type"] = "application/json";
    corps = JSON.stringify(r.json);
  } else if (r.formulaire) {
    entetes["Content-Type"] = "application/x-www-form-urlencoded";
    corps = new URLSearchParams(r.formulaire).toString();
  }
  let rep: Response;
  try {
    rep = await fetchFn(url, { method: r.methode ?? (corps === undefined ? "GET" : "POST"), headers: entetes, body: corps });
  } catch (e) {
    throw new ErreurEditeur("temporaire", `${quoi} injoignable : ${(e as Error).message}`);
  }
  const texte = await rep.text();
  if (!rep.ok) {
    const extrait = texte.slice(0, 400);
    if (rep.status === 401) throw new ErreurEditeur("jeton", `${quoi} : HTTP 401 ${extrait}`, 401);
    if (rep.status === 429 || rep.status >= 500) throw new ErreurEditeur("temporaire", `${quoi} : HTTP ${rep.status} ${extrait}`, rep.status);
    throw new ErreurEditeur("definitif", `${quoi} : HTTP ${rep.status} ${extrait}`, rep.status);
  }
  if (texte === "") return null as T;
  try {
    return JSON.parse(texte) as T;
  } catch {
    throw new ErreurEditeur("temporaire", `${quoi} : réponse illisible ${texte.slice(0, 200)}`, rep.status);
  }
}

/** Un montant en chaîne à deux décimales, point décimal. */
export function montant(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/** Le compte d'un fournisseur : 401 + son code, en lettres et chiffres (comme l'export a4_25). */
export function compteAuxiliaire(compte: string, aux: string): string {
  return compte.slice(0, 3) + aux.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
