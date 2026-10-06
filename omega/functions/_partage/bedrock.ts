// Claude sur AWS Bedrock, API Converse, région européenne. Les identifiants et
// le modèle viennent de l'environnement de la fonction ; s'ils manquent, le
// client n'existe pas (null). Second choix derrière l'API Anthropic en direct
// (voir claude.ts et anthropic.ts).

import { signerRequete } from "./aws_sigv4.ts";
import { base64, type BlocContenu, type ClientClaude, coutEur, type DemandeConverse, nombreOu, type Prix, type ReponseConverse, type Usage } from "./claude.ts";
import { ErreurOuvrier } from "./erreurs.ts";

export { base64, coutEur };
export type { BlocContenu, DemandeConverse, ReponseConverse, Usage };

export interface ConfigBedrock extends Prix {
  region: string;
  modelId: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export const REGION_PAR_DEFAUT = "eu-central-1";

/** Prix publics Bedrock (USD / million de jetons) par famille de modèle, à défaut d'un réglage. */
export function prixParDefaut(modelId: string): { entree: number; sortie: number } {
  const m = modelId.toLowerCase();
  if (m.includes("haiku")) return { entree: 1, sortie: 5 };
  if (m.includes("opus-4-1") || m.includes("opus-4-0") || m.includes("opus-4-2025")) return { entree: 15, sortie: 75 };
  if (m.includes("opus")) return { entree: 5, sortie: 25 };
  return { entree: 3, sortie: 15 }; // Sonnet et inconnus.
}

export function configBedrockDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): ConfigBedrock | null {
  const accessKeyId = env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = env.get("AWS_SECRET_ACCESS_KEY");
  const modelId = env.get("BEDROCK_MODEL_ID");
  if (!accessKeyId || !secretAccessKey || !modelId) return null;
  const region = env.get("AWS_REGION") || REGION_PAR_DEFAUT;
  const defaut = prixParDefaut(modelId);
  return {
    region,
    modelId,
    accessKeyId,
    secretAccessKey,
    sessionToken: env.get("AWS_SESSION_TOKEN") || undefined,
    prixEntreeUsdMtok: nombreOu(env.get("BEDROCK_PRIX_ENTREE_USD_MTOK"), defaut.entree),
    prixSortieUsdMtok: nombreOu(env.get("BEDROCK_PRIX_SORTIE_USD_MTOK"), defaut.sortie),
    tauxUsdEur: nombreOu(env.get("TAUX_USD_EUR"), 0.92),
  };
}

export class ClientBedrock implements ClientClaude {
  readonly fournisseur = "bedrock" as const;
  constructor(public readonly cfg: ConfigBedrock, private readonly fetchFn: typeof fetch = fetch) {}

  get modele(): string {
    return this.cfg.modelId;
  }

  get prix(): Prix {
    return this.cfg;
  }

  async converse(d: DemandeConverse): Promise<ReponseConverse> {
    const url = `https://bedrock-runtime.${this.cfg.region}.amazonaws.com/model/${encodeURIComponent(this.cfg.modelId)}/converse`;
    const corps = JSON.stringify({
      system: [{ text: d.system }],
      messages: [{ role: "user", content: d.contenu }],
      inferenceConfig: { maxTokens: d.maxTokens ?? 8192, temperature: 0 },
      toolConfig: {
        tools: [{ toolSpec: { name: d.outil.name, description: d.outil.description, inputSchema: { json: d.outil.schema } } }],
        toolChoice: { tool: { name: d.outil.name } },
      },
    });
    const entetes = await signerRequete(
      {
        method: "POST",
        url,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: corps,
        service: "bedrock",
        region: this.cfg.region,
      },
      this.cfg,
    );
    let rep: Response;
    try {
      rep = await this.fetchFn(url, { method: "POST", headers: entetes, body: corps });
    } catch (e) {
      throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `Bedrock injoignable : ${(e as Error).message}`);
    }
    const texte = await rep.text();
    if (!rep.ok) {
      const extrait = texte.slice(0, 300);
      if (rep.status === 429 || rep.status >= 500) {
        throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `Bedrock HTTP ${rep.status} : ${extrait}`);
      }
      if (rep.status === 401 || rep.status === 403) {
        throw new ErreurOuvrier("IA_NON_BRANCHEE", `Bedrock refuse les identifiants (HTTP ${rep.status}) : ${extrait}`);
      }
      throw new ErreurOuvrier("ERREUR_INTERNE", `Bedrock HTTP ${rep.status} : ${extrait}`);
    }
    const json = JSON.parse(texte);
    const blocs: BlocContenu[] = json?.output?.message?.content ?? [];
    const outil = blocs.find((b): b is { toolUse: { toolUseId: string; name: string; input: unknown } } => "toolUse" in b);
    if (!outil) {
      throw new ErreurOuvrier("ERREUR_INTERNE", `Bedrock n'a pas rendu l'outil attendu (stopReason ${json?.stopReason}).`);
    }
    return {
      entree: outil.toolUse.input,
      usage: { tokens_entree: Number(json?.usage?.inputTokens ?? 0), tokens_sortie: Number(json?.usage?.outputTokens ?? 0) },
      stopReason: String(json?.stopReason ?? ""),
    };
  }
}
