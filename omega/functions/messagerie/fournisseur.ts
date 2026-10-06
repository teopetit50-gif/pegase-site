// Interface d'une messagerie connectée par OAuth (Gmail, Microsoft 365).
// L'ouvrier ne connaît qu'elle. Quatre usages :
//   renouveler le jeton d'accès (jeton de renouvellement gardé au Vault par le socle) ;
//   relever les messages arrivés depuis un curseur (→ réceptions) ;
//   lire un message brut (RFC 5322) ;
//   déposer un brouillon (« le message reste un brouillon dans votre outil ») ;
// plus la révocation, et l'échange du code OAuth à la connexion.

export type Acces = {
  jeton: string;
  expire_le: string;
  /**
   * Nouveau jeton de renouvellement quand le fournisseur le fait tourner à chaque usage
   * (Microsoft) : à reposer au Vault à la place de l'ancien. Absent chez Google.
   */
  renouvellement?: string;
};

export type NomMessagerie = "gmail" | "microsoft";

export type Nouveautes = {
  /**
   * Messages arrivés, du plus ancien au plus récent, chacun avec le curseur à poser une fois
   * déposé : un passage interrompu reprend juste après le dernier message déposé.
   */
  messages: { id: string; curseur: string }[];
  /** Curseur à poser quand tout est déposé (ou quand il n'y a rien). */
  curseur: string;
};

export type Profil = { adresse: string; curseur: string };

export type Connexion = {
  acces: Acces;
  renouvellement: string;
  portees: string[];
};

export interface Messagerie {
  readonly nom: NomMessagerie;
  /** Portées OAuth demandées à la connexion. */
  readonly portees: string[];
  /** Étiquette (Gmail) ou dossier (Microsoft) relevé quand la connexion n'en précise pas. */
  readonly etiquetteParDefaut: string;
  /**
   * Le fournisseur sait-il révoquer un jeton à la demande ? Google oui ; Microsoft non (aucun
   * point de révocation pour une application tierce) : on efface le Vault, et le client retire
   * l'autorisation depuis son compte Microsoft.
   */
  readonly revocationDistante: boolean;
  urlConsentement(etat: string, retour: string): string;
  echangerCode(code: string, retour: string): Promise<Connexion>;
  renouveler(renouvellement: string): Promise<Acces>;
  profil(acces: string): Promise<Profil>;
  /** Messages arrivés depuis `curseur` dans l'étiquette / le dossier relevé. */
  nouveautes(
    acces: string,
    curseur: string,
    etiquette: string,
  ): Promise<Nouveautes>;
  lireBrut(acces: string, id: string): Promise<Uint8Array<ArrayBuffer>>;
  creerBrouillon(
    acces: string,
    brut: Uint8Array,
  ): Promise<{ brouillon: string; message: string | null }>;
  revoquer(jeton: string): Promise<void>;
}

/**
 * JETON_REVOQUE : le jeton de renouvellement est refusé (révoqué, expiré, mot de passe changé) ;
 *   la connexion passe « à reconnecter », un humain doit refaire le consentement.
 * CURSEUR_PERIME : l'historique demandé n'existe plus (Gmail le garde environ une semaine,
 *   Microsoft rend 410 sur un jeton delta expiré) ;
 *   on repart du curseur courant, rien n'est réimporté en masse.
 * DEFINITIVE : la requête est fausse (400, 404 d'un message…), la rejouer ne sert à rien.
 * TRANSITOIRE : réseau, 429, 5xx.
 */
export type CodeErreur =
  | "JETON_REVOQUE"
  | "CURSEUR_PERIME"
  | "DEFINITIVE"
  | "TRANSITOIRE";

export class ErreurMessagerie extends Error {
  constructor(
    public readonly code: CodeErreur,
    message: string,
    public readonly statut = 0,
  ) {
    super(`${code} : ${message}`);
    this.name = "ErreurMessagerie";
  }
}
