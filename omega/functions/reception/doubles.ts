// Doubles des portes et du stockage pour les tests de la réception.

import type { Boite, Canal, Depot, Portes, Reception } from "./portes.ts";
import type { Journal, Stockage } from "./commun.ts";

export const CLIENT = "22222222-2222-4222-8222-222222222222";

/** resoudre_boite connaît des boîtes ; deposer_reception est idempotente sur (client, canal, identifiant). */
export class PortesDouble implements Portes {
  boites = new Map<string, Boite>();
  receptions: Reception[] = [];
  private cles = new Map<string, number>();
  panne: Error | null = null;

  connaitre(canal: Canal, boite: string, client = CLIENT) {
    this.boites.set(`${canal}|${boite}`, {
      client_id: client,
      entite_id: null,
      module: null,
      expediteur_id: null,
    });
  }
  // deno-lint-ignore require-await
  async resoudreBoite(canal: Canal, boite: string) {
    if (this.panne) throw this.panne;
    return this.boites.get(`${canal}|${boite}`) ?? null;
  }
  // deno-lint-ignore require-await
  async deposerReception(r: Reception): Promise<Depot> {
    if (this.panne) throw this.panne;
    const cle = `${r.client}|${r.canal}|${r.identifiant}`;
    const existant = this.cles.get(cle);
    if (existant !== undefined) return { id: existant, nouvelle: false };
    this.receptions.push(r);
    const id = this.receptions.length;
    this.cles.set(cle, id);
    return { id, nouvelle: true };
  }
}

export class StockageDouble implements Stockage {
  objets = new Map<
    string,
    { octets: Uint8Array<ArrayBuffer>; typeMime: string }
  >();
  depots = 0;
  panne: Error | null = null;
  // deno-lint-ignore require-await
  async deposer(
    chemin: string,
    octets: Uint8Array<ArrayBuffer>,
    typeMime: string,
  ) {
    if (this.panne) throw this.panne;
    this.depots++;
    this.objets.set(chemin, { octets, typeMime });
  }
}

export function journalMemoire(): Journal & { lignes: string[] } {
  const lignes: string[] = [];
  return {
    lignes,
    info: (m) => lignes.push(`info ${m}`),
    erreur: (m) => lignes.push(`erreur ${m}`),
  };
}

export const MAINTENANT = new Date("2026-10-05T10:00:00Z");
