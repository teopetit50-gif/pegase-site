// Doubles pour les tests du dépôt : portes du socle en mémoire, bucket en mémoire.

import { sha256Hex } from "../reception/commun.ts";
import type {
  DepotFiled,
  DepotOuvert,
  Element,
  Noter,
  Portes,
} from "./portes.ts";

export const CLIENT = "33333333-3333-4333-8333-333333333333";
export const DEPOT = "66666666-6666-4666-8666-666666666666";
export const IDENTIFIANT = "depot-banc0001";
export const MOT_DE_PASSE = "0123456789abcdef0123456789abcdef";

export class PortesDouble implements Portes {
  elements = new Map<
    string,
    Element & { sha256: string | null; motif: string | null }
  >();
  depots: DepotFiled[] = [];
  ouvertures: { identifiant: string; ip: string | null }[] = [];
  module = "filed";
  filedEnPanne: string | null = null;

  async ouvrir(
    identifiant: string,
    empreinte: string,
    ip: string | null,
  ): Promise<DepotOuvert | null> {
    this.ouvertures.push({ identifiant, ip });
    if (
      identifiant !== IDENTIFIANT || empreinte !== await sha256Hex(MOT_DE_PASSE)
    ) return null;
    return {
      depot: DEPOT,
      client_id: CLIENT,
      entite_id: null,
      module: this.module,
      libelle: "Cabinet du banc",
    };
  }
  // deno-lint-ignore require-await
  async lister() {
    return [...this.elements.values()];
  }
  // deno-lint-ignore require-await
  async noter(_d: string, n: Noter) {
    this.elements.set(n.chemin, {
      chemin: n.chemin,
      dossier: n.dossier,
      octets: n.octets,
      etat: n.etat,
      reference: n.reference,
      recu_le: "2026-10-06T17:00:00.000Z",
      sha256: n.sha256,
      motif: n.motif,
    });
  }
  // deno-lint-ignore require-await
  async renommer(_d: string, de: string, vers: string) {
    const e = this.elements.get(de);
    if (!e || this.elements.has(vers)) return false;
    const enfants = [...this.elements.keys()].some((k) =>
      k.startsWith(de + "/")
    );
    if (!["dossier", "vide", "ignore"].includes(e.etat) || enfants) {
      return false;
    }
    this.elements.delete(de);
    this.elements.set(vers, { ...e, chemin: vers });
    return true;
  }
  // deno-lint-ignore require-await
  async deposerFiled(d: DepotFiled) {
    if (this.filedEnPanne) throw new Error(this.filedEnPanne);
    const deja = this.depots.find((x) => x.sha256 === d.sha256);
    this.depots.push(d);
    return {
      document: d.document,
      reference: `REC-2026-${String(this.depots.length).padStart(4, "0")}`,
      etat: deja ? "doublon" : "en_lecture",
    };
  }
}

export class StockageDouble {
  objets = new Map<string, { octets: Uint8Array; typeMime: string }>();
  // deno-lint-ignore require-await
  async deposer(
    chemin: string,
    octets: Uint8Array<ArrayBuffer>,
    typeMime: string,
  ) {
    this.objets.set(chemin, { octets, typeMime });
  }
}

export const journalMuet = { info() {}, erreur() {} };
