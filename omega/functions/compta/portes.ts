// Les portes de l'ouvrier COMPTA (lot a4_28) : la file des écritures à pousser, le secret de chaque connexion (au
// coffre), et la trace de chaque envoi (commencer avant l'appel, noter ou échouer après). Par la fonction rpc() du
// socle partagé ; jamais de lecture ni d'écriture directe dans une table.

import { type ConfigSupabase, rpc } from "@partage/portes.ts";

export type Editeur = "pennylane" | "quickbooks" | "cegid_loop";

export interface Connexion {
  id: string;
  editeur: Editeur;
  client_id: string;
  entite_id: string;
  /** Jamais de secret : realm_id, environnement, code_ibs, codes de journaux. */
  parametres: Record<string, unknown>;
}

export interface LigneEcriture {
  compte_num: string;
  compte_lib: string;
  comp_aux_num: string | null;
  comp_aux_lib: string | null;
  libelle: string;
  debit: number;
  credit: number;
  montant_devise: number | null;
  idevise: string | null;
}

export interface Ecriture {
  exercice_cle: string;
  ecriture_num: number;
  journal_code: string;
  journal_lib: string;
  date: string;
  piece: string;
  piece_date: string;
  libelle: string;
  origine: "facture" | "reglement";
  extourne_de: number | null;
  /** OMEGA-<exercice>-<journal>-<numéro> : unique, sert à retrouver l'écriture chez l'éditeur. */
  cle: string;
  lignes: LigneEcriture[];
}

export interface EtatEnvoi {
  etat: "en_cours" | "a_reprendre" | "envoye" | "refuse";
  tentatives: number;
  id_externe: string | null;
  commence_le: string | null;
}

export interface AEnvoyer {
  connexion: Connexion;
  ecriture: Ecriture;
  envoi: EtatEnvoi | null;
}

export interface PortesCompta {
  aEnvoyer(max: number): Promise<AEnvoyer[]>;
  secret(connexion: string): Promise<string | null>;
  poserSecret(connexion: string, secret: string): Promise<void>;
  commencer(connexion: string, exercice: string, num: number): Promise<{ reprise: boolean; tentatives: number }>;
  referencer(connexion: string, exercice: string, num: number, reference: string): Promise<void>;
  noter(connexion: string, exercice: string, num: number, idExterne: string): Promise<void>;
  echouer(connexion: string, exercice: string, num: number, erreur: string, definitif: boolean): Promise<"a_reprendre" | "refuse">;
  enPanne(connexion: string, erreur: string): Promise<void>;
  battre(detail: unknown): Promise<void>;
}

export class PortesComptaRpc implements PortesCompta {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchFn: typeof fetch = fetch) {}

  private appeler<T>(nom: string, params: Record<string, unknown>): Promise<T> {
    return rpc<T>(this.cfg, this.fetchFn, nom, params);
  }

  async aEnvoyer(max: number): Promise<AEnvoyer[]> {
    const r = await this.appeler<AEnvoyer[] | null>("compta_a_envoyer", { p_max: max });
    return (r ?? []).map((x) => ({
      ...x,
      ecriture: { ...x.ecriture, ecriture_num: Number(x.ecriture.ecriture_num), lignes: x.ecriture.lignes.map(numeriser) },
    }));
  }
  secret(connexion: string) {
    return this.appeler<string | null>("compta_secret", { p_connexion: connexion });
  }
  async poserSecret(connexion: string, secret: string) {
    await this.appeler<null>("compta_poser_secret", { p_connexion: connexion, p_secret: secret });
  }
  commencer(connexion: string, exercice: string, num: number) {
    return this.appeler<{ reprise: boolean; tentatives: number }>("compta_commencer_envoi", {
      p_connexion: connexion,
      p_exercice_cle: exercice,
      p_ecriture_num: num,
    });
  }
  async referencer(connexion: string, exercice: string, num: number, reference: string) {
    await this.appeler<null>("compta_reference_envoi", { p_connexion: connexion, p_exercice_cle: exercice, p_ecriture_num: num, p_reference: reference });
  }
  async noter(connexion: string, exercice: string, num: number, idExterne: string) {
    await this.appeler<null>("compta_noter_envoi", { p_connexion: connexion, p_exercice_cle: exercice, p_ecriture_num: num, p_id_externe: idExterne });
  }
  echouer(connexion: string, exercice: string, num: number, erreur: string, definitif: boolean) {
    return this.appeler<"a_reprendre" | "refuse">("compta_echouer_envoi", {
      p_connexion: connexion,
      p_exercice_cle: exercice,
      p_ecriture_num: num,
      p_erreur: erreur,
      p_definitif: definitif,
    });
  }
  async enPanne(connexion: string, erreur: string) {
    await this.appeler<null>("compta_connexion_en_panne", { p_connexion: connexion, p_erreur: erreur });
  }
  async battre(detail: unknown) {
    await this.appeler<number>("battre_ouvrier", { p_module: "filed", p_genres: ["filed.envoi_api"], p_detail: detail, p_attendu: "15 minutes" });
  }
}

function numeriser(l: LigneEcriture): LigneEcriture {
  return {
    ...l,
    debit: Number(l.debit),
    credit: Number(l.credit),
    montant_devise: l.montant_devise === null ? null : Number(l.montant_devise),
  };
}
