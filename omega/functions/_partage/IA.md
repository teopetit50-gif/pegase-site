# L'IA dans les ouvriers et les assistants — mode d'emploi commun (A1, 17/10/2026)

Pour tout code Deno d'Omega qui appelle Claude : lecteur, et les assistants des modules (B1 Varelo, B6 Daliro, B2…).
Un seul fournisseur, un seul plafond, un seul compteur.

## 1. Le client

```ts
import { clientClaudeDepuisEnv } from "@partage/fournisseur_ia.ts";
import { coutEur } from "@partage/claude.ts";

const claude = clientClaudeDepuisEnv(Deno.env); // API Anthropic (ANTHROPIC_API_KEY), sinon Bedrock UE (identifiants AWS), sinon null
const rep = await claude!.converse({ system, contenu: [{ text }], outil: { name, description, schema }, maxTokens: 4000 });
const cout = coutEur(claude!.prix, rep.usage); // en euros
```

`converse` force un outil : la réponse est l'objet `rep.entree`, conforme au schéma.
- Sans clé, `clientClaudeDepuisEnv` rend `null`. L'assistant le dit (`MOTIF_IA_NON_BRANCHEE`) et n'invente pas de repli.
- « Lu en Europe, sans conservation » n'est vrai que sur Bedrock UE (voir CHIFFRAGE/lecteur.md).

## 2. Le plafond du jour, AVANT l'appel

```ts
import { controlerPlafond } from "@partage/plafond.ts";
await controlerPlafond(portes, Deno.env, client, estimationEur); // lève ErreurOuvrier PLAFOND_IA si dépassé
```

`portes` est tout objet qui a `lireParametre` et `consommationIaDuJour`, par exemple `PortesRpc` de `@partage/portes.ts`.
- Le plafond vaut le réglage `plafond_ia_jour_client`, sinon `PLAFOND_IA_JOUR_CLIENT_EUR`, sinon 5 €.
- Au-delà, on ne fait pas l'appel : on le dit à l'utilisateur, ou le travail est repris le lendemain.

## 3. Compter ce qu'on a dépensé, APRÈS l'appel

- **Dans un travail** (`travaux`) : mettre `cout_eur` au premier niveau du résultat de `finir_travail`, et seulement le coût de CE travail, jamais un cumul.
- **Hors travail** (assistant appelé depuis l'écran) : `rpc(cfg, fetch, "noter_consommation_ia", { p_client, p_module, p_source: "assistant.<nom>", p_cout_eur, p_detail: { appels: 1 } })`. La porte est réservée au `service_role` (socle 19ar).

`consommation_ia_jour` additionne les deux. C'est ce chiffre que le plafond compare.

## 4. Ce qui ne sort pas
Aucune clé, aucun texte de pièce, aucun nom dans les journaux (`@partage/journal.ts` ne journalise que des identifiants
et des comptes). Pour un module chiffré (Tamila), le contenu ne repart que chiffré.
