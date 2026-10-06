// Doubles pour les tests de l'échange PA : portes du socle, plateforme agréée, bucket.

import type {
  FluxANoter,
  FluxNote,
  Portes,
  ReponseDepot,
  ReponseStatut,
  Travail,
} from "./portes.ts";
import {
  ErreurPA,
  type Fichier,
  type FluxADeposer,
  type FluxDepose,
  type FluxReleve,
  type PlateformeAgreee,
} from "./pa.ts";
import type { Stockage } from "./stockage.ts";

export const CLIENT = "33333333-3333-4333-8333-333333333333";
export const FACTURE = "11111111-1111-4111-8111-111111111111";
export const STATUT = "22222222-2222-4222-8222-222222222222";

export function travail(
  id: number,
  genre: string,
  charge: Record<string, unknown>,
): Travail {
  return { id, genre, charge, client_id: CLIENT, essais: 0 };
}

export class PortesDouble implements Portes {
  travaux: Travail[] = [];
  depots = new Map<string, ReponseDepot>();
  statuts = new Map<string, ReponseStatut>();
  finis = new Map<number, Record<string, unknown>>();
  notesDepot = new Map<string, string>();
  notesStatut = new Map<string, string>();
  echecs = new Map<string, { erreur: string; definitif: boolean }>();
  flux = new Map<string, FluxANoter>();
  curseurActuel: string | null = null;
  battements: Record<string, unknown>[] = [];
  /** Nombre d'échecs à simuler sur pa_noter_depot / pa_noter_statut. */
  noterEnPanne = 0;
  /** pa_noter_flux tombe sur ce flux. */
  fluxEnPanne: string | null = null;

  // deno-lint-ignore require-await
  async prendreTravaux() {
    const t = this.travaux;
    this.travaux = [];
    return t;
  }
  // deno-lint-ignore require-await
  async finirTravail(id: number, resultat: Record<string, unknown>) {
    this.finis.set(id, resultat);
  }
  // deno-lint-ignore require-await
  async echouerTravail() {
    return "repris" as const;
  }
  // deno-lint-ignore require-await
  async battreOuvrier(
    _m: string,
    _g: string[],
    detail: Record<string, unknown>,
  ) {
    this.battements.push(detail);
    return 1;
  }
  // deno-lint-ignore require-await
  async commencerDepot(facture: string) {
    return this.depots.get(facture) ??
      { deposer: false as const, statut: "introuvable" };
  }
  // deno-lint-ignore require-await
  async noterDepot(facture: string, flux: string) {
    if (this.noterEnPanne > 0) {
      this.noterEnPanne--;
      throw new Error("pa_noter_depot en panne");
    }
    this.notesDepot.set(facture, flux);
  }
  // deno-lint-ignore require-await
  async echouerDepot(facture: string, erreur: string, definitif: boolean) {
    this.echecs.set(facture, { erreur, definitif });
  }
  // deno-lint-ignore require-await
  async commencerStatut(statut: string) {
    return this.statuts.get(statut) ??
      { envoyer: false as const, statut: "introuvable" };
  }
  // deno-lint-ignore require-await
  async noterStatut(statut: string, flux: string) {
    if (this.noterEnPanne > 0) {
      this.noterEnPanne--;
      throw new Error("pa_noter_statut en panne");
    }
    this.notesStatut.set(statut, flux);
  }
  // deno-lint-ignore require-await
  async echouerStatut(statut: string, erreur: string, definitif: boolean) {
    this.echecs.set(statut, { erreur, definitif });
  }
  // deno-lint-ignore require-await
  async curseur() {
    return this.curseurActuel;
  }
  // deno-lint-ignore require-await
  async poserCurseur(c: string) {
    this.curseurActuel = c;
  }
  /** SIREN de l'acheteur → client, comme filed_pa_trouver_client. */
  clientsParSiren = new Map<string, string>();
  /** Réponses rendues par pa_noter_flux, par clé. */
  reponses = new Map<string, FluxNote>();
  /** pa_deposer_facture : id du flux → octets annoncés. */
  facturesDeposees = new Map<string, number>();
  deposerFactureEnPanne = 0;
  private prochainId = 1;

  // deno-lint-ignore require-await
  async noterFlux(f: FluxANoter): Promise<FluxNote> {
    if (this.fluxEnPanne === f.flux) throw new Error("pa_noter_flux en panne");
    const deja = this.reponses.get(f.cle);
    if (deja) return { ...deja, nouveau: false };
    this.flux.set(f.cle, f);
    const id = this.prochainId++;
    let r: FluxNote = { id, nouveau: true, etat: "note" };
    const statut = f.syntaxe === "CDAR" || /LC$/.test(f.type);
    if (f.sens === "entrant" && !statut) {
      const client = this.clientsParSiren.get(
        String(f.detail.acheteur_siren ?? ""),
      );
      r = client
        ? {
          id,
          nouveau: true,
          etat: "rattache",
          client_id: client,
          document: `doc-${id}`,
          chemin_cible: `${client}/filed_document/doc-${id}/${
            f.chemin?.split("/").pop()
          }`,
        }
        : { id, nouveau: true, etat: "orphelin" };
    }
    this.reponses.set(f.cle, r);
    return r;
  }
  // deno-lint-ignore require-await
  async deposerFacture(fluxId: number | string, octets: number) {
    if (this.deposerFactureEnPanne > 0) {
      this.deposerFactureEnPanne--;
      throw new Error("pa_deposer_facture en panne");
    }
    this.facturesDeposees.set(String(fluxId), octets);
    for (const r of this.reponses.values()) {
      if (String(r.id) === String(fluxId)) r.etat = "depose";
    }
  }
}

/** Plateforme en mémoire : garde les dépôts, rend des flux programmés au relevé. */
export class PlateformeDouble implements PlateformeAgreee {
  readonly nom = "double";
  depots: (FluxADeposer & { flux: string })[] = [];
  aRelever: FluxReleve[] = [];
  documents = new Map<string, Fichier>();
  erreur: ErreurPA | null = null;
  depuisDemandes: (Date | null)[] = [];

  // deno-lint-ignore require-await
  async deposer(f: FluxADeposer): Promise<FluxDepose> {
    if (this.erreur) throw this.erreur;
    // Idempotence de la PA sur le trackingId : un second dépôt rend le même flux.
    const deja = this.depots.find((d) => d.suivi === f.suivi);
    if (deja) {
      return {
        flux: deja.flux,
        depose_le: "2026-10-06T10:00:00Z",
        sha256: null,
      };
    }
    const flux = `flux-${this.depots.length + 1}`;
    this.depots.push({ ...f, flux });
    return { flux, depose_le: "2026-10-06T10:00:00Z", sha256: null };
  }
  // deno-lint-ignore require-await
  async relever(depuis: Date | null) {
    this.depuisDemandes.push(depuis);
    return this.aRelever.filter((f) =>
      !depuis || Date.parse(f.maj_le) > depuis.getTime()
    );
  }
  // deno-lint-ignore require-await
  async telecharger(flux: string) {
    const d = this.documents.get(flux);
    if (!d) throw new ErreurPA(404, `flux ${flux} inconnu`, true);
    return d;
  }
  // deno-lint-ignore require-await
  async sante() {
    return true;
  }
}

export class StockageDouble implements Stockage {
  objets = new Map<
    string,
    { octets: Uint8Array<ArrayBuffer>; typeMime: string }
  >();
  // deno-lint-ignore require-await
  async lire(chemin: string) {
    const o = this.objets.get(chemin);
    if (!o) throw new Error(`${chemin} absent du bucket`);
    return o.octets;
  }
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

export function fluxReleve(
  p: Partial<FluxReleve> & { flux: string; maj_le: string },
): FluxReleve {
  return {
    suivi: null,
    nom: `${p.flux}.xml`,
    sens: "entrant",
    type: "SupplierInvoice",
    syntaxe: "UBL",
    profil: null,
    regle: "B2B",
    depose_le: p.maj_le,
    accuse: "ok",
    details: [],
    ...p,
  };
}
