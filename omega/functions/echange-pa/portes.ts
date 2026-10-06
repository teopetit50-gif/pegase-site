// Portes du socle pour l'échange avec la plateforme agréée. Les quatre premières sont celles de
// tous les ouvriers (prendre_travaux, finir_travail, echouer_travail, battre_ouvrier). Les portes
// `pa_*` sont celles de FILED, lot 11 (A4, omega/migrations/a4_18_filed_lot11_echange_pa.sql,
// posées sur la recette le 06/10) : FILED tient les achats, donc `pa_commencer_depot` refuse
// toujours (« non pris en charge ») et `pa_noter_depot` / `pa_echouer_depot` lèvent 0A000 ;
// une facture entrante se dépose en deux temps (pa_noter_flux, copie, pa_deposer_facture).
// Aucune écriture directe en table : tout passe par elles, en RPC, avec la clé de service.

import type { Syntaxe } from "./pa.ts";
import type { StatutAEmettre } from "./cdar.ts";

export type Travail = {
  id: number;
  genre: string;
  charge: Record<string, unknown>;
  cle?: string | null;
  client_id?: string | null;
  essais?: number | null;
};

/** pa_commencer_depot : la facture émise à déposer, ou le refus du socle. */
export type DepotRefuse = {
  deposer: false;
  statut: string;
  motif?: string | null;
};
export type DepotAFaire = {
  deposer: true;
  facture: string;
  client_id: string;
  /** trackingId : l'id Omega de la facture, clé d'idempotence côté PA. */
  suivi: string;
  nom: string;
  syntaxe: Syntaxe;
  profil?: string | null;
  regle?: string | null;
  /** Chemin du fichier (Factur-X, UBL, CII) dans le bucket omega-clients. */
  chemin: string;
  type_mime?: string | null;
};
export type ReponseDepot = DepotRefuse | DepotAFaire;

/** pa_commencer_statut : le statut de cycle de vie à émettre, ou le refus du socle. */
export type StatutRefuse = {
  envoyer: false;
  statut: string;
  motif?: string | null;
};
export type StatutAFaire = {
  envoyer: true;
  /** a4_18 : le code du statut (nombre), pas son id. */
  statut: string | number | null;
  client_id: string;
  suivi: string;
  /** CDAR déjà fabriqué par le socle (bucket) ; sinon l'ouvrier le fabrique depuis `cdar`. */
  chemin?: string | null;
  cdar?: StatutAEmettre | null;
};
export type ReponseStatut = StatutRefuse | StatutAFaire;

/**
 * Réponse de pa_noter_flux (a4_18). Pour une facture entrante rattachée à un client :
 * `etat` 'rattache', `chemin_cible` (où copier le fichier) et `document` ; l'ouvrier copie
 * puis appelle pa_deposer_facture(flux_id ?? id, octets). `sans_suite` avec `flux_id` : même
 * flux déjà rattaché sous une autre clé (c'est ce `flux_id` qu'on dépose). `depose` : fait.
 * `orphelin` / `ambigu` : aucun client, ou plusieurs, pour le SIREN de l'acheteur.
 */
export type FluxNote = {
  id: number | string;
  nouveau: boolean;
  etat?: string | null;
  client_id?: string | null;
  document?: string | null;
  chemin_cible?: string | null;
  flux_id?: number | string | null;
};

/** pa_noter_flux : tout ce que le relevé rapporte, idempotent sur `cle`. */
export type FluxANoter = {
  flux: string;
  sens: "entrant" | "sortant";
  type: string;
  syntaxe: string;
  suivi: string | null;
  accuse: string;
  maj_le: string;
  /** Document reçu déposé au bucket (flux entrants), null pour un accusé de nos dépôts. */
  chemin: string | null;
  sha256: string | null;
  detail: Record<string, unknown>;
  cle: string;
};

export interface Portes {
  prendreTravaux(
    genres: string[],
    nombre: number,
    bail: string,
    ouvrier: string,
  ): Promise<Travail[]>;
  finirTravail(id: number, resultat: Record<string, unknown>): Promise<void>;
  echouerTravail(
    id: number,
    erreur: string,
    reprendre: boolean,
  ): Promise<"repris" | "echec">;
  battreOuvrier(
    module: string,
    genres: string[],
    detail: Record<string, unknown>,
    attendu: string,
  ): Promise<number>;

  commencerDepot(facture: string): Promise<ReponseDepot>;
  /** Rejouable : même facture, même flux → rien de neuf. */
  noterDepot(
    facture: string,
    flux: string,
    deposeLe: string | null,
  ): Promise<void>;
  echouerDepot(
    facture: string,
    erreur: string,
    definitif: boolean,
  ): Promise<void>;

  commencerStatut(statut: string): Promise<ReponseStatut>;
  noterStatut(
    statut: string,
    flux: string,
    deposeLe: string | null,
  ): Promise<void>;
  echouerStatut(
    statut: string,
    erreur: string,
    definitif: boolean,
  ): Promise<void>;

  /** Horodatage du dernier flux relevé (maj_le), null au premier passage. */
  curseur(): Promise<string | null>;
  poserCurseur(curseur: string): Promise<void>;
  noterFlux(f: FluxANoter): Promise<FluxNote>;
  /** Second temps d'une facture entrante, une fois le fichier copié à chemin_cible. Rejouable. */
  deposerFacture(fluxId: number | string, octets: number): Promise<void>;
}

export class ErreurPorte extends Error {
  constructor(
    public readonly porte: string,
    public readonly statut: number,
    public readonly corps: string,
  ) {
    super(`porte ${porte} : HTTP ${statut} ${corps.slice(0, 300)}`);
    this.name = "ErreurPorte";
  }
}

export type AppelRpc = (
  nom: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

export function rpcSupabase(
  url: string,
  cleService: string,
  fetchImpl: typeof fetch = fetch,
): AppelRpc {
  return async (nom, params) => {
    const reponse = await fetchImpl(`${url}/rest/v1/rpc/${nom}`, {
      method: "POST",
      headers: {
        apikey: cleService,
        Authorization: `Bearer ${cleService}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    const texte = await reponse.text();
    if (!reponse.ok) throw new ErreurPorte(nom, reponse.status, texte);
    if (texte === "" || texte === "null") return null;
    return JSON.parse(texte);
  };
}

export function portesSupabase(rpc: AppelRpc): Portes {
  return {
    async prendreTravaux(genres, nombre, bail, ouvrier) {
      const l = await rpc("prendre_travaux", {
        p_genres: genres,
        p_nombre: nombre,
        p_bail: bail,
        p_ouvrier: ouvrier,
      });
      return Array.isArray(l) ? (l as Travail[]) : [];
    },
    async finirTravail(id, resultat) {
      await rpc("finir_travail", { p_id: id, p_resultat: resultat });
    },
    async echouerTravail(id, erreur, reprendre) {
      const r = await rpc("echouer_travail", {
        p_id: id,
        p_erreur: erreur,
        p_reprendre: reprendre,
      });
      return r === "echec" ? "echec" : "repris";
    },
    async battreOuvrier(module, genres, detail, attendu) {
      const r = await rpc("battre_ouvrier", {
        p_module: module,
        p_genres: genres,
        p_detail: detail,
        p_attendu: attendu,
      });
      return typeof r === "number" ? r : 0;
    },
    async commencerDepot(facture) {
      const r = await rpc("pa_commencer_depot", { p_facture: facture });
      return r && typeof r === "object" ? r as ReponseDepot : {
        deposer: false,
        statut: "introuvable",
        motif: "pa_commencer_depot a rendu null",
      };
    },
    async noterDepot(facture, flux, deposeLe) {
      await rpc("pa_noter_depot", {
        p_facture: facture,
        p_flux: flux,
        p_depose_le: deposeLe,
      });
    },
    async echouerDepot(facture, erreur, definitif) {
      await rpc("pa_echouer_depot", {
        p_facture: facture,
        p_erreur: erreur.slice(0, 2000),
        p_definitif: definitif,
      });
    },
    async commencerStatut(statut) {
      const r = await rpc("pa_commencer_statut", { p_statut: statut });
      return r && typeof r === "object" ? r as ReponseStatut : {
        envoyer: false,
        statut: "introuvable",
        motif: "pa_commencer_statut a rendu null",
      };
    },
    async noterStatut(statut, flux, deposeLe) {
      await rpc("pa_noter_statut", {
        p_statut: statut,
        p_flux: flux,
        p_depose_le: deposeLe,
      });
    },
    async echouerStatut(statut, erreur, definitif) {
      await rpc("pa_echouer_statut", {
        p_statut: statut,
        p_erreur: erreur.slice(0, 2000),
        p_definitif: definitif,
      });
    },
    async curseur() {
      const r = await rpc("pa_curseur", {});
      return typeof r === "string" && r !== "" ? r : null;
    },
    async poserCurseur(curseur) {
      await rpc("pa_poser_curseur", { p_curseur: curseur });
    },
    async noterFlux(f) {
      const r = await rpc("pa_noter_flux", {
        p_flux: f.flux,
        p_sens: f.sens,
        p_type: f.type,
        p_syntaxe: f.syntaxe,
        p_suivi: f.suivi,
        p_accuse: f.accuse,
        p_maj_le: f.maj_le,
        p_chemin: f.chemin,
        p_sha256: f.sha256,
        p_detail: f.detail,
        p_cle: f.cle,
      }) as Partial<FluxNote> | null;
      return { ...(r ?? {}), id: r?.id ?? 0, nouveau: r?.nouveau === true };
    },
    async deposerFacture(fluxId, octets) {
      await rpc("pa_deposer_facture", { p_flux_id: fluxId, p_octets: octets });
    },
  };
}

export function portesDepuisEnvironnement(): Portes {
  const url = Deno.env.get("SUPABASE_URL");
  const cle = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !cle) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (fournis par Supabase à la fonction)",
    );
  }
  return portesSupabase(rpcSupabase(url, cle));
}
