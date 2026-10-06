// Quel Claude ? L'API Anthropic en direct dès que ANTHROPIC_API_KEY est posée,
// AWS Bedrock sinon, rien si aucun des deux (→ IA_NON_BRANCHEE).

import { ClientAnthropic, configAnthropicDepuisEnv } from "./anthropic.ts";
import { ClientBedrock, configBedrockDepuisEnv } from "./bedrock.ts";
import type { ClientClaude } from "./claude.ts";

export function clientClaudeDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): ClientClaude | null {
  const anthropic = configAnthropicDepuisEnv(env);
  if (anthropic) return new ClientAnthropic(anthropic);
  const bedrock = configBedrockDepuisEnv(env);
  if (bedrock) return new ClientBedrock(bedrock);
  return null;
}
