// Les portes de l'assistant « questions » de DALIRO, en plus de celles de tout ouvrier (prendre, finir, échouer,
// battre, lire_parametre, consommation_ia_jour) : btp_question_commencer, btp_question_deposer, btp_question_echec
// (migration b6_36). Toutes réservées à la clé de service.

import { type ConfigSupabase, type Portes, PortesRpc, rpc } from "@partage/portes.ts";

/** Le contexte figé quand la question a été posée, avec les droits de la personne (b6_36). */
export interface Contexte {
  /** btp_tableau_chantier, sans bibliothèque ni annuaire ; prix masqués sans voir_prix. */
  tableau: Record<string, unknown> | null;
  /** Les 40 derniers messages du fil du chantier, du plus ancien au plus récent. */
  fil: { recu_le: string; canal: string; de: string | null; texte: string; pieces: number }[];
  aujourdhui: string;
}

export interface Dossier {
  statut: "a_repondre" | "ignore" | "deja";
  motif?: string;
  etat?: string;
  question?: string;
  client?: string;
  texte?: string;
  voit_prix?: boolean;
  contexte?: Contexte;
}

/** Ce que le modèle rend, contrôlé, et ce qu'on y ajoute pour la porte. */
export interface ResultatQuestion {
  reponse: string;
  couverte: boolean;
  sources: string[];
  raison?: string;
  modele: string;
  tokens_entree: number;
  tokens_sortie: number;
  cout_eur: number;
}

export interface PortesQuestions extends Pick<Portes, "prendreTravaux" | "finirTravail" | "echouerTravail" | "battreOuvrier" | "consommationIaDuJour" | "lireParametre"> {
  commencer(question: string): Promise<Dossier>;
  deposer(question: string, resultat: ResultatQuestion, version: string): Promise<{ statut: string }>;
  marquerEchec(question: string, motif: string): Promise<void>;
}

export class PortesQuestionsRpc extends PortesRpc implements PortesQuestions {
  constructor(private readonly config: ConfigSupabase, private readonly fetchR: typeof fetch = fetch) {
    super(config, fetchR);
  }

  async commencer(question: string): Promise<Dossier> {
    return await rpc<Dossier>(this.config, this.fetchR, "btp_question_commencer", { p_question: question });
  }

  async deposer(question: string, resultat: ResultatQuestion, version: string): Promise<{ statut: string }> {
    return await rpc<{ statut: string }>(this.config, this.fetchR, "btp_question_deposer", {
      p_question: question,
      p_resultat: resultat,
      p_version: version.slice(0, 80),
    });
  }

  async marquerEchec(question: string, motif: string): Promise<void> {
    await rpc<unknown>(this.config, this.fetchR, "btp_question_echec", { p_question: question, p_motif: motif.slice(0, 500) });
  }
}
