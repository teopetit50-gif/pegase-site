// Les pannes qu'un ouvrier sait nommer. Chacune devient un echouer_travail
// avec son motif en tête de message : « IA_NON_BRANCHEE : … ».

export type CodeOuvrier =
  | "IA_NON_BRANCHEE"
  | "FOURNISSEUR_INDISPONIBLE"
  | "PLAFOND_IA"
  | "CHIFFREMENT_NON_PRIS_EN_CHARGE"
  /** Le coffre Tamila (ou son Key Manager) ne répond pas : repris. */
  | "COFFRE_INDISPONIBLE"
  /** Le coffre refuse la clé (pièce plus à lire, dossier fermé) : définitif. */
  | "COFFRE_REFUSE"
  /** La clé rendue par le coffre n'ouvre pas le fichier chiffré : définitif. */
  | "CHIFFRE_ILLISIBLE"
  /** Une porte refuse l'ouvrier (401/403) : droits du socle à poser, rien à relire. */
  | "PORTE_REFUSEE"
  | "ERREUR_INTERNE";

export class ErreurOuvrier extends Error {
  constructor(
    public readonly code: CodeOuvrier,
    message: string,
    /** false = définitif, le travail passe en échec sans nouvel essai. */
    public readonly reprendre: boolean = true,
  ) {
    super(message);
    this.name = "ErreurOuvrier";
  }

  /** Le texte posé dans travaux.erreur : le code d'abord, pour les tableaux de bord. */
  get motif(): string {
    return `${this.code} : ${this.message}`.slice(0, 2000);
  }
}
