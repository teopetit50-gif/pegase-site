import Anthropic from "@anthropic-ai/sdk";
import { utilisateurCourant } from "@/lib/supabase/server";
import { reponseVarelo } from "@/lib/varelo/assistant";

/* L'assistant de l'espace client (07/10/2026).

   Appelle l'API Claude (Anthropic) et renvoie la réponse en flux, mot à
   mot. Facturé à l'usage par Anthropic sur le compte d'Omega : chaque
   réponse journalise ses jetons et son coût (journaux Vercel, ligne
   « assistant.usage »), pour refacturer au client si besoin.

   Garde-fous : réservé aux comptes connectés (un visiteur ne dépense pas
   le crédit d'Omega), 20 messages d'historique au plus, 4 000 caractères
   par message, réponse plafonnée. La clé vit dans ANTHROPIC_API_KEY
   (Vercel → pegase-site2 → Environment Variables), jamais dans le code.

   30/10/2026 (demande de Teo : « qu'il puisse répondre à toutes les
   questions ») : le panneau joint le résumé des données que la personne
   voit dans son espace (components/espace2/assistant-contexte.tsx), lues
   sous sa session ; il entre dans le prompt système, après les consignes,
   plafonné à 80 000 caractères. Le cache garde ce bloc d'une question à
   l'autre de la même conversation. */

const MODELE = "claude-opus-5-5";
/* tarif Anthropic de Claude Opus 5.5, en dollars par million de jetons */
const PRIX = { entree: 4, sortie: 20, lectureCache: 0.2, ecritureCache: 5 };

const SYSTEME = `Tu es l'assistant de l'espace client Omega, un tableau de bord où une entreprise suit ses modules d'automatisation (FILED : factures fournisseurs reçues et à payer ; CASHD : créances clients et relances de paiement ; REPUT : demandes clients ; OFFLOAD : clients qui décrochent ; et un module propre à son métier).
Tu réponds en français, clairement et brièvement, à un employé de l'entreprise. Tu réponds à toutes ses questions : sur ses chiffres, sur l'utilisation de l'espace, et aussi les questions générales (rédiger un message, résumer un texte, expliquer une notion de gestion, organiser son travail).
Les données de l'espace que la personne voit sont jointes ci-dessous. Pour une question sur ses factures, ses clients, ses montants ou ses validations, réponds à partir de ces données : compte, additionne, trie, cite les noms et les montants. Donne le chiffre d'abord, puis le détail utile.
N'invente jamais de donnée : si l'information n'est pas dans les données jointes (module non chargé, REPUT, OFFLOAD, pièce précise), dis-le simplement et indique la page de l'espace où la trouver. Tu lis seulement : tu ne peux rien modifier, valider ni envoyer.
Écris en texte simple, sans Markdown : pas d'astérisques ni de dièses ; des tirets pour les listes.
Pour une question commerciale, de contrat ou un problème technique, renvoie vers Omega : page Aide, ou contact@omegaai.fr.`;

const client = new Anthropic();

type Entree = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return Response.json({ erreur: "Connectez-vous pour utiliser l'assistant." }, { status: 401 });

  let messages: Entree[];
  let contexte = "";
  try {
    const corps = (await req.json()) as { messages?: unknown; contexte?: unknown };
    if (typeof corps.contexte === "string") contexte = corps.contexte.slice(0, 80_000);
    messages = (Array.isArray(corps.messages) ? corps.messages : [])
      .filter((m): m is Entree => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  } catch {
    return Response.json({ erreur: "Requête illisible." }, { status: 400 });
  }
  if (!messages.length || messages[0].role !== "user" || messages[messages.length - 1].role !== "user") {
    return Response.json({ erreur: "La conversation doit commencer et finir par votre message." }, { status: 400 });
  }

  /* un groupe qui a Varelo : la réponse s'appuie sur ses données, lues sous la session de la personne (B1) */
  const varelo = await reponseVarelo(messages);
  if (varelo) return varelo;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ erreur: "L'assistant n'est pas encore branché (clé API absente)." }, { status: 503 });

  const flux = client.beta.messages.stream({
    model: MODELE,
    max_tokens: 4000,
    /* une conversation courte : effort bas, réponses rapides et peu chères */
    output_config: { effort: "low" },
    /* si le modèle décline par prudence, l'API relance sur un autre modèle */
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    system: contexte ? [{ type: "text", text: SYSTEME }, { type: "text", text: `Données de l'espace :\n\n${contexte}` }] : SYSTEME,
    messages,
  });

  const encodeur = new TextEncoder();
  const corps = new ReadableStream<Uint8Array>({
    async start(c) {
      try {
        flux.on("text", (t) => c.enqueue(encodeur.encode(t)));
        const fin = await flux.finalMessage();
        if (fin.stop_reason === "refusal") c.enqueue(encodeur.encode("\n\nJe ne peux pas répondre à cette demande."));
        const u = fin.usage;
        const cout =
          (u.input_tokens * PRIX.entree +
            u.output_tokens * PRIX.sortie +
            (u.cache_read_input_tokens ?? 0) * PRIX.lectureCache +
            (u.cache_creation_input_tokens ?? 0) * PRIX.ecritureCache) /
          1_000_000;
        console.log(
          JSON.stringify({
            evenement: "assistant.usage",
            utilisateur: utilisateur.id,
            entreprise: utilisateur.entreprise ?? null,
            modele: fin.model,
            entree: u.input_tokens,
            sortie: u.output_tokens,
            cache_lu: u.cache_read_input_tokens ?? 0,
            cout_usd: Number(cout.toFixed(6)),
          }),
        );
      } catch (e) {
        const message =
          e instanceof Anthropic.RateLimitError
            ? "L'assistant est très demandé : réessayez dans une minute."
            : e instanceof Anthropic.AuthenticationError
              ? "La clé de l'assistant est refusée : prévenez Omega."
              : "L'assistant n'a pas pu répondre. Réessayez.";
        console.error("assistant.erreur", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
        c.enqueue(encodeur.encode(`\n\n${message}`));
      } finally {
        c.close();
      }
    },
  });

  return new Response(corps, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
