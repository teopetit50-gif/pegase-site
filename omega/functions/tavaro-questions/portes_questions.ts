// Les portes des Questions (b2_20), en plus de celles de tout ouvrier (prendre, finir, échouer, battre, lire_parametre,
// consommation_ia_jour) : loc_question_commencer, loc_question_lire, loc_question_repondre, loc_question_echec.
// Toutes réservées à la clé de service.

import { type ConfigSupabase, type Portes, PortesRpc, rpc } from "@partage/portes.ts";

export interface Lecture {
  lecture: string;
  parametres: Record<string, string>;
  rend: string;
}

export interface Dossier {
  statut: "a_traiter" | "ignore" | "deja";
  motif?: string;
  question?: string;
  client?: string;
  texte?: string;
  agence?: string | null;
  organisation?: string | null;
  aujourdhui?: string;
  catalogue?: Lecture[];
}

export interface Reponse {
  reponse: string;
  chiffres: { libelle: string; valeur: string }[];
  cause?: string;
  decision?: string;
}

export interface Meta {
  modele: string;
  tokens_entree: number;
  tokens_sortie: number;
  cout_eur: number;
}

export interface PortesQuestions extends Pick<Portes, "prendreTravaux" | "finirTravail" | "echouerTravail" | "battreOuvrier" | "consommationIaDuJour" | "lireParametre"> {
  commencer(question: string): Promise<Dossier>;
  lire(question: string, lecture: string, parametres: Record<string, unknown>): Promise<unknown>;
  repondre(question: string, reponse: Reponse, meta: Meta): Promise<void>;
  echec(question: string, motif: string): Promise<void>;
}

export class PortesQuestionsRpc extends PortesRpc implements PortesQuestions {
  constructor(private readonly config: ConfigSupabase, private readonly fetchQ: typeof fetch = fetch) {
    super(config, fetchQ);
  }
  async commencer(question: string): Promise<Dossier> {
    return await rpc<Dossier>(this.config, this.fetchQ, "loc_question_commencer", { p_question: question });
  }
  async lire(question: string, lecture: string, parametres: Record<string, unknown>): Promise<unknown> {
    return await rpc<unknown>(this.config, this.fetchQ, "loc_question_lire", { p_question: question, p_lecture: lecture, p_parametres: parametres });
  }
  async repondre(question: string, reponse: Reponse, meta: Meta): Promise<void> {
    await rpc<unknown>(this.config, this.fetchQ, "loc_question_repondre", { p_question: question, p_reponse: reponse, p_meta: meta });
  }
  async echec(question: string, motif: string): Promise<void> {
    await rpc<unknown>(this.config, this.fetchQ, "loc_question_echec", { p_question: question, p_motif: motif.slice(0, 500) });
  }
}
