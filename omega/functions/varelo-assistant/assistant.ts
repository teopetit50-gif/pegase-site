// L'assistant de l'espace, quand le groupe a Varelo (B1, 17/10/2026 ; accord de Teo du 17/10).
// Il répond sur les données du groupe, lues sous la session de la personne (public.grp_contexte, security
// invoker : la RLS ne lui montre que son périmètre ; chaque lecture au journal), en lecture seule, sans IBAN.
// Le modèle est celui du lecteur : l'abstraction commutable de _partage (API Anthropic ou Bedrock).
// Un plafond par client et par jour (public.grp_assistant_budget) ; chaque réponse et son coût au journal.

import { type ClientClaude, coutEur } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";

export type Message = { role: "user" | "assistant"; content: string };

export interface Dependances {
  /** L'identifiant de la personne, si le jeton est valide. */
  personne(jeton: string): Promise<string | null>;
  /** Le groupe Varelo de la personne (sous sa session), ou null. */
  clientVarelo(jeton: string): Promise<string | null>;
  /** Le budget IA du jour (clé de service). */
  budget(
    client: string,
  ): Promise<{ permis: boolean; depense_eur: number; plafond_eur: number }>;
  /** Le contexte du groupe, sous la session de la personne. */
  contexte(jeton: string, client: string): Promise<unknown>;
  /** La réponse et son coût au journal (clé de service). */
  noter(
    client: string,
    personne: string,
    cout: number,
    modele: string,
    fournisseur: string,
    entree: number,
    sortie: number,
  ): Promise<void>;
  claude: ClientClaude | null;
}

export type Resultat = {
  statut: number;
  corps: { reponse?: string; erreur?: string };
};

export const SYSTEME =
  `Tu es l'assistant de l'espace client Omega d'un groupe de sociétés qui utilise Varelo (référentiel du groupe, encours, contrats à dénoncer, réserves au transporteur, reportings, page du groupe, ventes des caisses, décisions à valider).
Tu réponds en français, clairement et brièvement, à une personne du groupe.
Tu disposes des DONNÉES DU GROUPE ci-dessous, lues pour cette personne et à son seul périmètre : appuie-toi uniquement sur elles pour tout chiffre, toute date, tout nom ; cite la société concernée. Si une donnée n'y est pas, dis-le et indique la carte de l'espace Varelo où la trouver. N'invente jamais rien.
Tu ne fais rien toi-même : tu ne valides, n'envoies et ne modifies rien ; pour agir, la personne passe par l'espace (file de validation, cartes Varelo).
Pour une question commerciale, de contrat avec Omega ou un problème technique, renvoie vers la page Aide ou contact@omegaai.fr.`;

const OUTIL = {
  name: "repondre",
  description: "La réponse à donner à la personne, en français.",
  schema: {
    type: "object",
    properties: {
      reponse: {
        type: "string",
        description:
          "La réponse, en texte simple (quelques paragraphes au plus).",
      },
    },
    required: ["reponse"],
  },
};

/** Les messages reçus : 20 au plus, 4 000 caractères chacun, du premier au dernier message de la personne. */
export function lireMessages(brut: unknown): Message[] | null {
  if (!Array.isArray(brut)) return null;
  const m = brut
    .filter((x): x is Message =>
      !!x && typeof x === "object" &&
      ((x as Message).role === "user" || (x as Message).role === "assistant") &&
      typeof (x as Message).content === "string" &&
      (x as Message).content.trim() !== ""
    )
    .slice(-20)
    .map((x) => ({ role: x.role, content: x.content.slice(0, 4000) }));
  /* la coupe à 20 peut commencer sur une réponse de l'assistant : on la retire */
  while (m.length && m[0].role !== "user") m.shift();
  if (!m.length || m[0].role !== "user" || m[m.length - 1].role !== "user") {
    return null;
  }
  return m;
}

export async function repondre(
  d: Dependances,
  jeton: string | null,
  brut: unknown,
): Promise<Resultat> {
  if (!jeton) {
    return {
      statut: 401,
      corps: { erreur: "Connectez-vous pour utiliser l'assistant." },
    };
  }
  const personne = await d.personne(jeton);
  if (!personne) {
    return {
      statut: 401,
      corps: { erreur: "Connectez-vous pour utiliser l'assistant." },
    };
  }
  const messages = lireMessages(brut);
  if (!messages) {
    return {
      statut: 400,
      corps: {
        erreur: "La conversation doit commencer et finir par votre message.",
      },
    };
  }
  const client = await d.clientVarelo(jeton);
  if (!client) {
    return {
      statut: 404,
      corps: { erreur: "Varelo n'est pas installé pour votre organisation." },
    };
  }
  if (!d.claude) {
    return {
      statut: 503,
      corps: { erreur: "L'assistant n'est pas encore branché." },
    };
  }
  const b = await d.budget(client);
  if (!b.permis) {
    return {
      statut: 429,
      corps: {
        erreur:
          `Le plafond d'IA du jour de votre organisation est atteint (${b.plafond_eur} €). L'assistant revient demain.`,
      },
    };
  }
  const donnees = await d.contexte(jeton, client);
  const conversation = messages.map((m) =>
    `${m.role === "user" ? "PERSONNE" : "ASSISTANT"} : ${m.content}`
  ).join("\n\n");
  let rep;
  try {
    rep = await d.claude.converse({
      system: SYSTEME,
      contenu: [{
        text: `DONNÉES DU GROUPE (JSON, lues le ${
          new Date().toISOString().slice(0, 10)
        }) :\n${JSON.stringify(donnees)}`,
      }, {
        text:
          `CONVERSATION :\n${conversation}\n\nRéponds au dernier message de la PERSONNE par l'outil « repondre ».`,
      }],
      outil: OUTIL,
      maxTokens: 2000,
    });
  } catch (e) {
    const code = e instanceof ErreurOuvrier ? e.code : "ERREUR_INTERNE";
    return {
      statut: code === "FOURNISSEUR_INDISPONIBLE" ? 503 : 502,
      corps: { erreur: "L'assistant n'a pas pu répondre. Réessayez." },
    };
  }
  const cout = coutEur(d.claude.prix, rep.usage);
  await d.noter(
    client,
    personne,
    cout,
    d.claude.modele,
    d.claude.fournisseur,
    rep.usage.tokens_entree,
    rep.usage.tokens_sortie,
  );
  const reponse = rep.entree && typeof rep.entree === "object" &&
      typeof (rep.entree as { reponse?: unknown }).reponse === "string"
    ? (rep.entree as { reponse: string }).reponse.trim()
    : "";
  if (!reponse) {
    return {
      statut: 502,
      corps: { erreur: "L'assistant n'a pas pu répondre. Réessayez." },
    };
  }
  return { statut: 200, corps: { reponse } };
}
