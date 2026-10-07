import Anthropic from "@anthropic-ai/sdk";
import { utilisateurCourant } from "@/lib/supabase/server";

/* L'assistant de l'espace client (07/10/2026).

   Appelle l'API Claude (Anthropic) et renvoie la réponse en flux, mot à
   mot. Facturé à l'usage par Anthropic sur le compte d'Omega : chaque
   réponse journalise ses jetons et son coût (journaux Vercel, ligne
   « assistant.usage »), pour refacturer au client si besoin.

   Garde-fous : réservé aux comptes connectés (un visiteur ne dépense pas
   le crédit d'Omega), 20 messages d'historique au plus, 4 000 caractères
   par message, réponse plafonnée. La clé vit dans ANTHROPIC_API_KEY
   (Vercel → pegase-site2 → Environment Variables), jamais dans le code. */

const MODELE = "claude-opus-5-5";
/* tarif Anthropic de Claude Opus 5.5, en dollars par million de jetons */
const PRIX = { entree: 4, sortie: 20, lectureCache: 0.2, ecritureCache: 5 };

const SYSTEME = `Tu es l'assistant de l'espace client Omega, un tableau de bord où une entreprise suit ses modules d'automatisation (FILED : factures reçues et à payer ; CASHD : relances de paiement ; REPUT : demandes clients ; OFFLOAD : clients qui décrochent ; et un module propre à son métier).
Tu réponds en français, clairement et brièvement, à un employé de l'entreprise : comment utiliser l'espace, rédiger un message, résumer un texte qu'il colle, organiser son travail.
Tu n'as PAS accès aux données de l'entreprise (factures, clients, chiffres) : si on te demande un chiffre ou un dossier précis, dis-le simplement et indique la page de l'espace où le trouver. N'invente jamais de donnée.
Pour une question commerciale, de contrat ou un problème technique, renvoie vers Omega : page Aide, ou contact@omegaai.fr.`;

const client = new Anthropic();

type Entree = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return Response.json({ erreur: "Connectez-vous pour utiliser l'assistant." }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ erreur: "L'assistant n'est pas encore branché (clé API absente)." }, { status: 503 });

  let messages: Entree[];
  try {
    const corps = (await req.json()) as { messages?: unknown };
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

  const flux = client.beta.messages.stream({
    model: MODELE,
    max_tokens: 4000,
    /* une conversation courte : effort bas, réponses rapides et peu chères */
    output_config: { effort: "low" },
    /* si le modèle décline par prudence, l'API relance sur un autre modèle */
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    system: SYSTEME,
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
