// Les pannes qu'un ouvrier sait nommer. Chacune devient un echouer_travail
// avec son motif en tête de message : « IA_NON_BRANCHEE : … ».

export type CodeOuvrier =
  | "IA_NON_BRANCHEE"
  | "FOURNISSEUR_INDISPONIBLE"
  | "PLAFOND_IA"
  | "CHIFFREMENT_NON_PRIS_EN_CHARGE"
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
