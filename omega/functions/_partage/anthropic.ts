// Claude par l'API Anthropic en direct : POST https://api.anthropic.com/v1/messages,
// en-têtes x-api-key et anthropic-version. Même contrat que le client Bedrock :
// un seul outil, une seule réponse structurée. Choisi dès que ANTHROPIC_API_KEY
// est posée (décision de Teo pour la recette, 05/10/2026).
//
// Contraintes de l'API sur les modèles récents (Sonnet 5.5, Opus 5.5…) : un
// choix d'outil forcé (`any` / `tool`) et une température non par défaut
// renvoient 400. On passe donc par `tool_choice: auto` et la consigne, sans
// température ; l'effort règle la profondeur de réflexion.

import { type ClientClaude, type DemandeConverse, nombreOu, type Prix, type ReponseConverse } from "./claude.ts";
import { ErreurOuvrier } from "./erreurs.ts";

export interface ConfigAnthropic extends Prix {
  cle: string;
  modelId: string;
  /** low | medium | high | xhigh | max, ou "" pour ne rien envoyer (modèles sans effort). */
  effort: string;
  version: string;
}

export const MODELE_ANTHROPIC_PAR_DEFAUT = "claude-sonnet-5-5";
export const VERSION_API_ANTHROPIC = "2023-06-01";

/** Prix publics de l'API Anthropic (USD / million de jetons) par modèle. */
export function prixParDefautAnthropic(modelId: string): { entree: number; sortie: number } {
  const m = modelId.toLowerCase();
  if (m.includes("haiku")) return { entree: 1, sortie: 5 };
  if (m.includes("fable") || m.includes("mythos")) return { entree: 10, sortie: 50 };
  if (m.includes("opus-5-5")) return { entree: 4, sortie: 20 };
  if (m.includes("opus")) return { entree: 5, sortie: 25 };
  if (m.includes("sonnet-4")) return { entree: 3, sortie: 15 };
  return { entree: 2, sortie: 10 }; // Sonnet 5 / 5.5 et inconnus.
}

export function configAnthropicDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): ConfigAnthropic | null {
  const cle = env.get("ANTHROPIC_API_KEY");
  if (!cle) return null;
  const modelId = env.get("ANTHROPIC_MODEL_ID") || MODELE_ANTHROPIC_PAR_DEFAUT;
  const defaut = prixParDefautAnthropic(modelId);
  const effort = env.get("ANTHROPIC_EFFORT");
  return {
    cle,
    modelId,
    effort: effort === undefined ? "medium" : effort === "aucun" ? "" : effort,
    version: env.get("ANTHROPIC_VERSION") || VERSION_API_ANTHROPIC,
    prixEntreeUsdMtok: nombreOu(env.get("ANTHROPIC_PRIX_ENTREE_USD_MTOK"), defaut.entree),
    prixSortieUsdMtok: nombreOu(env.get("ANTHROPIC_PRIX_SORTIE_USD_MTOK"), defaut.sortie),
    tauxUsdEur: nombreOu(env.get("TAUX_USD_EUR"), 0.92),
  };
}

type BlocAnthropic =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

const MIME_DOCUMENT: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv",
  txt: "text/plain",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Les blocs de la forme Bedrock vers la forme Messages API ; les documents et images avant le texte. */
export function traduireContenu(contenu: DemandeConverse["contenu"]): BlocAnthropic[] {
  const pieces: BlocAnthropic[] = [];
  const textes: BlocAnthropic[] = [];
  for (const b of contenu) {
    if ("text" in b) textes.push({ type: "text", text: b.text });
    else if ("document" in b) {
      pieces.push({
        type: "document",
        source: { type: "base64", media_type: MIME_DOCUMENT[b.document.format] ?? "application/pdf", data: b.document.source.bytes },
      });
    } else if ("image" in b) {
      pieces.push({ type: "image", source: { type: "base64", media_type: `image/${b.image.format}`, data: b.image.source.bytes } });
    }
  }
  return [...pieces, ...textes];
}

export class ClientAnthropic implements ClientClaude {
  readonly fournisseur = "anthropic" as const;
  constructor(public readonly cfg: ConfigAnthropic, private readonly fetchFn: typeof fetch = fetch) {}

  get modele(): string {
    return this.cfg.modelId;
  }

  get prix(): Prix {
    return this.cfg;
  }

  async converse(d: DemandeConverse): Promise<ReponseConverse> {
    const corps: Record<string, unknown> = {
      model: this.cfg.modelId,
      max_tokens: d.maxTokens ?? 16000,
      system: `${d.system}\n\nTu réponds UNIQUEMENT en appelant l'outil ${d.outil.name}, une seule fois, sans texte avant ni après.`,
      tools: [{ name: d.outil.name, description: d.outil.description, input_schema: d.outil.schema }],
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      messages: [{ role: "user", content: traduireContenu(d.contenu) }],
    };
    if (this.cfg.effort) corps.output_config = { effort: this.cfg.effort };

    let rep: Response;
    try {
      rep = await this.fetchFn("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": this.cfg.cle, "anthropic-version": this.cfg.version, "content-type": "application/json" },
        body: JSON.stringify(corps),
      });
    } catch (e) {
      throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `API Anthropic injoignable : ${(e as Error).message}`);
    }
    const texte = await rep.text();
    if (!rep.ok) {
      const extrait = texte.slice(0, 300);
      if (rep.status === 429 || rep.status === 529 || rep.status >= 500) {
        throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `API Anthropic HTTP ${rep.status} : ${extrait}`);
      }
      if (rep.status === 401 || rep.status === 403) {
        throw new ErreurOuvrier("IA_NON_BRANCHEE", `API Anthropic refuse la clé (HTTP ${rep.status}) : ${extrait}`);
      }
      throw new ErreurOuvrier("ERREUR_INTERNE", `API Anthropic HTTP ${rep.status} : ${extrait}`);
    }
    const json = JSON.parse(texte) as {
      content?: { type: string; name?: string; input?: unknown }[];
      stop_reason?: string;
      stop_details?: { category?: string; explanation?: string };
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const usage = { tokens_entree: Number(json.usage?.input_tokens ?? 0), tokens_sortie: Number(json.usage?.output_tokens ?? 0) };
    if (json.stop_reason === "refusal") {
      throw new ErreurOuvrier(
        "ERREUR_INTERNE",
        `le modèle a décliné la lecture (${json.stop_details?.category ?? "sans catégorie"}) : ${json.stop_details?.explanation ?? ""}`.slice(0, 500),
      );
    }
    const outil = (json.content ?? []).find((b) => b.type === "tool_use" && b.name === d.outil.name);
    if (!outil) {
      throw new ErreurOuvrier("ERREUR_INTERNE", `le modèle n'a pas rendu l'outil ${d.outil.name} (stop_reason ${json.stop_reason ?? "inconnu"}).`);
    }
    return { entree: outil.input, usage, stopReason: String(json.stop_reason ?? "") };
  }
}
