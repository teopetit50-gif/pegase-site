// Les portes de REPUT, en plus de celles de tout ouvrier (prendre, finir, échouer, battre,
// lire_parametre, consommation_ia_jour) : reput_commencer, reput_deposer_reponse,
// reput_marquer_echec (migration c3_02). Toutes réservées à la clé de service.

import { type ConfigSupabase, type Portes, PortesRpc, rpc } from "@partage/portes.ts";

export interface Fiche {
  id: string;
  sujet: string;
  genre: string;
  titre: string;
  contenu: string;
  langue: string;
  source: string;
  valide_du?: string;
  valide_au?: string | null;
}

export interface Sujet {
  code: string;
  libelle: string;
  description: string | null;
  autorisable: boolean;
}

export interface Base {
  organisation: string | null;
  installe: boolean;
  reglages: {
    signature: string;
    formule_appel: string;
    formule_politesse: string;
    ton: "vouvoiement" | "tutoiement";
    mention_automatisee: string | null;
    langues: string[];
    actif: boolean;
  } | null;
  sujets: Sujet[];
  fiches: Fiche[];
}

export interface Dossier {
  statut: "a_preparer" | "ignore" | "deja";
  motif?: string;
  demande?: string;
  client?: string;
  reception?: {
    id: number;
    canal: string;
    de_nom: string | null;
    sujet: string | null;
    corps: string;
    langue: string | null;
    recu_le: string;
    pieces: number;
    en_reponse_a: boolean;
  };
  canal_reponse?: string | null;
  base?: Base;
}

/** Ce que le modèle rend, contrôlé, et ce qu'on y ajoute pour la porte. */
export interface ResultatReponse {
  sujet: string;
  langue: string;
  urgence: boolean;
  couverte: boolean;
  sources: string[];
  corps: string;
  appel?: string;
  politesse?: string;
  objet?: string;
  raison?: string;
  modele: string;
  tokens_entree: number;
  tokens_sortie: number;
  cout_eur: number;
}

export interface Depot {
  statut: string;
  demande: string;
  reponse?: string;
  sujet?: string;
  couverte?: boolean;
  type_action?: string;
  envoi?: string | null;
  envoi_statut?: string | null;
  verrou?: string | null;
  politique?: string | null;
  erreur?: string | null;
}

export interface PortesReput extends Pick<Portes, "prendreTravaux" | "finirTravail" | "echouerTravail" | "battreOuvrier" | "consommationIaDuJour" | "lireParametre"> {
  commencer(reception: number): Promise<Dossier>;
  deposerReponse(demande: string, resultat: ResultatReponse, version: string): Promise<Depot>;
  marquerEchec(demande: string, motif: string): Promise<void>;
}

export class PortesReputRpc extends PortesRpc implements PortesReput {
  constructor(private readonly config: ConfigSupabase, private readonly fetchR: typeof fetch = fetch) {
    super(config, fetchR);
  }

  async commencer(reception: number): Promise<Dossier> {
    return await rpc<Dossier>(this.config, this.fetchR, "reput_commencer", { p_reception: reception });
  }

  async deposerReponse(demande: string, resultat: ResultatReponse, version: string): Promise<Depot> {
    return await rpc<Depot>(this.config, this.fetchR, "reput_deposer_reponse", {
      p_demande: demande,
      p_resultat: resultat,
      p_version: version.slice(0, 80),
    });
  }

  async marquerEchec(demande: string, motif: string): Promise<void> {
    await rpc<unknown>(this.config, this.fetchR, "reput_marquer_echec", { p_demande: demande, p_motif: motif.slice(0, 500) });
  }
}
