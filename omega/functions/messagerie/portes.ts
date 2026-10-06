// Portes du socle pour les messageries connectées. Existantes : prendre_travaux, finir_travail,
// echouer_travail, battre_ouvrier, commencer_envoi, confirmer_envoi, echouer_envoi,
// deposer_reception. Les portes `messagerie_*` sont PROPOSÉES par A2 (contrat dans
// omega/NOTES-A2.md, « Messageries connectées ») : à écrire côté socle, jetons au Vault, jamais
// en clair dans une table, jamais rendus à authenticated.

import type { EnvoiAEnvoyer, ReponseCommencer } from "../expediteur/portes.ts";
import type { Reception } from "../reception/portes.ts";

export type { EnvoiAEnvoyer, Reception, ReponseCommencer };

export type Travail = {
  id: number;
  genre: string;
  charge: Record<string, unknown>;
  client_id?: string | null;
};

/** Une connexion active à relever. */
export type ConnexionActive = {
  connexion: string;
  client_id: string;
  fournisseur: "gmail" | "microsoft";
  adresse: string;
  /** Étiquette Gmail (INBOX par défaut) ou dossier Microsoft relevé. */
  etiquette: string | null;
  curseur: string | null;
};

export type Jetons = {
  acces: string | null;
  acces_expire_le: string | null;
  renouvellement: string;
};

export type OuvertureOAuth = {
  client_id: string;
  fournisseur: "gmail" | "microsoft";
  retour_ecran: string | null;
};

export interface Portes {
  prendreTravaux(
    genres: string[],
    nombre: number,
    bail: string,
    ouvrier: string,
  ): Promise<Travail[]>;
  finirTravail(id: number, resultat: Record<string, unknown>): Promise<void>;
  battreOuvrier(
    module: string,
    genres: string[],
    detail: Record<string, unknown>,
    attendu: string,
  ): Promise<number>;

  commencerEnvoi(envoi: string): Promise<ReponseCommencer>;
  confirmerEnvoi(envoi: string, reference: string): Promise<void>;
  echouerEnvoi(
    envoi: string,
    erreur: string,
    definitif: boolean,
  ): Promise<void>;
  deposerReception(r: Reception): Promise<{ id: number; nouvelle: boolean }>;

  connexions(fournisseur: string): Promise<ConnexionActive[]>;
  jetons(connexion: string): Promise<Jetons>;
  /**
   * Repose le jeton d'accès ; `renouvellement` remplace celui du Vault quand le fournisseur
   * l'a fait tourner (Microsoft), null sinon.
   */
  poserAcces(
    connexion: string,
    acces: string,
    expireLe: string,
    renouvellement: string | null,
  ): Promise<void>;
  poserCurseur(connexion: string, curseur: string): Promise<void>;
  aReconnecter(connexion: string, motif: string): Promise<void>;
  /** Vérifie l'état OAuth (usage unique, quelques minutes) sans le consommer. */
  ouvrir(etat: string): Promise<OuvertureOAuth>;
  enregistrer(e: {
    etat: string;
    adresse: string;
    renouvellement: string;
    acces: string;
    accesExpireLe: string;
    portees: string[];
    curseur: string;
  }): Promise<{ connexion: string; retour_ecran: string | null }>;
  /** Rend le jeton de renouvellement à révoquer (et son fournisseur) et l'efface du Vault. */
  oublier(connexion: string): Promise<{
    renouvellement: string | null;
    fournisseur: "gmail" | "microsoft" | null;
  }>;
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
    const r = await fetchImpl(`${url}/rest/v1/rpc/${nom}`, {
      method: "POST",
      headers: {
        apikey: cleService,
        Authorization: `Bearer ${cleService}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    const texte = await r.text();
    if (!r.ok) throw new ErreurPorte(nom, r.status, texte);
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
      return Array.isArray(l) ? l as Travail[] : [];
    },
    async finirTravail(id, resultat) {
      await rpc("finir_travail", { p_id: id, p_resultat: resultat });
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
    async commencerEnvoi(envoi) {
      const r = await rpc("commencer_envoi", { p_envoi: envoi });
      return r && typeof r === "object" ? r as ReponseCommencer : {
        envoyer: false,
        statut: "introuvable",
        motif: "commencer_envoi a rendu null",
      };
    },
    async confirmerEnvoi(envoi, reference) {
      await rpc("confirmer_envoi", {
        p_envoi: envoi,
        p_reference: reference.slice(0, 300),
      });
    },
    async echouerEnvoi(envoi, erreur, definitif) {
      await rpc("echouer_envoi", {
        p_envoi: envoi,
        p_erreur: erreur.slice(0, 2000),
        p_definitif: definitif,
      });
    },
    async deposerReception(r) {
      const d = await rpc("deposer_reception", {
        p_client: r.client,
        p_canal: r.canal,
        p_boite: r.boite,
        p_identifiant: r.identifiant,
        p_de: r.de,
        p_de_nom: r.deNom,
        p_sujet: r.sujet,
        p_corps: r.corps,
        p_corps_html: r.corpsHtml,
        p_pieces: r.pieces,
        p_detail: r.detail,
        p_recu_le: r.recuLe,
      }) as { id: number; nouvelle: boolean };
      return { id: Number(d?.id ?? 0), nouvelle: d?.nouvelle === true };
    },
    async connexions(fournisseur) {
      const l = await rpc("messagerie_connexions", {
        p_fournisseur: fournisseur,
      });
      return Array.isArray(l) ? l as ConnexionActive[] : [];
    },
    async jetons(connexion) {
      return await rpc("messagerie_jetons", {
        p_connexion: connexion,
      }) as Jetons;
    },
    async poserAcces(connexion, acces, expireLe, renouvellement) {
      await rpc("messagerie_poser_acces", {
        p_connexion: connexion,
        p_acces: acces,
        p_expire_le: expireLe,
        p_renouvellement: renouvellement,
      });
    },
    async poserCurseur(connexion, curseur) {
      await rpc("messagerie_poser_curseur", {
        p_connexion: connexion,
        p_curseur: curseur,
      });
    },
    async aReconnecter(connexion, motif) {
      await rpc("messagerie_a_reconnecter", {
        p_connexion: connexion,
        p_motif: motif.slice(0, 500),
      });
    },
    async ouvrir(etat) {
      return await rpc("messagerie_ouvrir", { p_etat: etat }) as OuvertureOAuth;
    },
    async enregistrer(e) {
      return await rpc("messagerie_enregistrer", {
        p_etat: e.etat,
        p_adresse: e.adresse,
        p_renouvellement: e.renouvellement,
        p_acces: e.acces,
        p_acces_expire_le: e.accesExpireLe,
        p_portees: e.portees,
        p_curseur: e.curseur,
      }) as { connexion: string; retour_ecran: string | null };
    },
    async oublier(connexion) {
      const r = await rpc("messagerie_oublier", { p_connexion: connexion }) as {
        renouvellement?: string | null;
        fournisseur?: string | null;
      } | null;
      const f = r?.fournisseur;
      return {
        renouvellement: r?.renouvellement ?? null,
        fournisseur: f === "gmail" || f === "microsoft" ? f : null,
      };
    },
  };
}

export function portesDepuisEnvironnement(): Portes {
  const url = Deno.env.get("SUPABASE_URL");
  const cle = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !cle) {
    throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis");
  }
  return portesSupabase(rpcSupabase(url, cle));
}
