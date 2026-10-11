// Ce qui est commun aux deux façons d'appeler Claude : l'API Anthropic en
// direct (ANTHROPIC_API_KEY) ou AWS Bedrock (identifiants AWS). Le lecteur ne
// connaît que l'interface ClientClaude ; le fournisseur se choisit ici, à
// partir de l'environnement : Anthropic d'abord, Bedrock sinon, rien si aucun.

export interface Usage {
  tokens_entree: number;
  tokens_sortie: number;
}

export interface Prix {
  /** Prix en dollars par million de jetons. */
  prixEntreeUsdMtok: number;
  prixSortieUsdMtok: number;
  tauxUsdEur: number;
}

export function coutEur(p: Prix, u: Usage): number {
  const usd = (u.tokens_entree * p.prixEntreeUsdMtok + u.tokens_sortie * p.prixSortieUsdMtok) / 1_000_000;
  return Math.round(usd * p.tauxUsdEur * 1_000_000) / 1_000_000;
}

/** Blocs de contenu, dans la forme de fil de Bedrock Converse ; le client Anthropic les traduit. */
export type BlocContenu =
  | { text: string }
  | { document: { format: "pdf" | "csv" | "txt" | "xlsx"; name: string; source: { bytes: string } } }
  | { image: { format: "png" | "jpeg" | "gif" | "webp"; source: { bytes: string } } }
  | { toolUse: { toolUseId: string; name: string; input: unknown } };

export interface OutilConverse {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface DemandeConverse {
  system: string;
  contenu: BlocContenu[];
  outil: OutilConverse;
  maxTokens?: number;
}

export interface ReponseConverse {
  /** L'entrée de l'outil, telle que rendue par le modèle. */
  entree: unknown;
  usage: Usage;
  stopReason: string;
}

export interface ClientClaude {
  readonly fournisseur: "anthropic" | "bedrock";
  readonly modele: string;
  readonly prix: Prix;
  converse(d: DemandeConverse): Promise<ReponseConverse>;
}

export function base64(o: Uint8Array): string {
  let s = "";
  const bloc = 0x8000;
  for (let i = 0; i < o.length; i += bloc) s += String.fromCharCode(...o.subarray(i, i + bloc));
  return btoa(s);
}

export function nombreOu(n: string | undefined, d: number): number {
  const v = Number(n);
  return n !== undefined && n !== "" && Number.isFinite(v) && v >= 0 ? v : d;
}

/** Le message d'IA_NON_BRANCHEE : il cite les deux options. */
export const MOTIF_IA_NON_BRANCHEE =
  "aucune IA branchée : ni ANTHROPIC_API_KEY (API Anthropic en direct), ni AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / BEDROCK_MODEL_ID (Bedrock) ; l'extraction attend l'une des deux.";
