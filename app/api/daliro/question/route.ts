import Anthropic from "@anthropic-ai/sdk";
import { utilisateurCourant } from "@/lib/supabase/server";

/* DALIRO : une question posée sur un chantier (06/11/2026, demande de Teo :
   « que l'API soit branchée derrière et que je puisse poser vraiment une
   question »).

   Le composeur de l'onglet Activité de la fiche chantier envoie la question
   et le chantier mis en texte (components/espace2/daliro/contexteChantier.ts,
   les données que la personne voit déjà : exemple ou base réelle lue sous
   sa session). L'API Claude répond en flux, mot à mot, à partir de ces
   seules données. Même modèle et même réglage que l'assistant de l'espace
   (app/api/assistant/route.ts) ; coût journalisé (« daliro.question.usage »).

   Ouvert sans session, pour montrer l'exemple en rendez-vous : le garde-fou
   est une limite par adresse (20 questions par quart d'heure, mémoire d'une
   instance), une question de 2 000 caractères au plus, un contexte de
   60 000, une réponse plafonnée. La clé vit dans ANTHROPIC_API_KEY. */

const MODELE = "claude-opus-5-5";
const PRIX = { entree: 4, sortie: 20, lectureCache: 0.2, ecritureCache: 5 };

const SYSTEME = `Tu es Daliro, l'assistant chantier d'une entreprise du bâtiment (gros œuvre, second œuvre, rénovation), souvent en Guadeloupe. Un conducteur de travaux, un chef d'équipe ou le gérant te pose une question sur UN chantier ; les données de ce chantier sont jointes (lots, planning des passages, points à régler, avenants, situations, factures, réception et réserves, messages du fil WhatsApp).
Réponds en français, comme un collègue du bureau d'études : franc, concret, bref. Le fait d'abord (qui, quoi, quand, combien), puis le détail utile, puis s'il le faut la prochaine action à faire.
Appuie-toi sur les données jointes : cite les dates, les noms des intervenants, les lots, les montants. Calcule si besoin (retards, reste à facturer, réserves ouvertes). N'invente jamais une donnée : si l'information n'est pas dans les données, dis-le en une phrase et indique où elle se trouverait (onglet Terrain, Argent, Réception, ou le fil).
Pour une question de métier générale (DTU, délais légaux, retenue de garantie, réception, avenant, sécurité), réponds avec tes connaissances en le signalant, sans te substituer à un avocat ni à un bureau de contrôle.
Tu lis seulement : tu ne modifies rien, n'envoies rien et ne contactes personne.
Écris en texte simple, sans Markdown : pas d'astérisques ni de dièses ; des tirets pour les listes ; dix lignes au plus sauf si on te demande un détail.`;

const client = new Anthropic();

/* garde-fou simple : la mémoire d'une instance, pas une vraie limite globale */
const appels = new Map<string, number[]>();
function tropDAppels(ip: string): boolean {
  const maintenant = Date.now();
  const recents = (appels.get(ip) ?? []).filter((t) => maintenant - t < 15 * 60_000);
  recents.push(maintenant);
  appels.set(ip, recents);
  return recents.length > 20;
}

type Echange = { question: string; reponse: string };

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
  if (tropDAppels(ip)) return Response.json({ erreur: "Beaucoup de questions d'affilée : réessayez dans quelques minutes." }, { status: 429 });

  let question = "";
  let contexte = "";
  let historique: Echange[] = [];
  try {
    const corps = (await req.json()) as { question?: unknown; contexte?: unknown; historique?: unknown };
    if (typeof corps.question === "string") question = corps.question.trim().slice(0, 2000);
    if (typeof corps.contexte === "string") contexte = corps.contexte.slice(0, 60_000);
    historique = (Array.isArray(corps.historique) ? corps.historique : [])
      .filter((e): e is Echange => !!e && typeof e.question === "string" && typeof e.reponse === "string" && e.reponse.trim() !== "")
      .slice(-6)
      .map((e) => ({ question: e.question.slice(0, 2000), reponse: e.reponse.slice(0, 4000) }));
  } catch {
    return Response.json({ erreur: "Requête illisible." }, { status: 400 });
  }
  if (question.length < 3) return Response.json({ erreur: "Écrivez votre question." }, { status: 400 });
  if (!contexte) return Response.json({ erreur: "Le chantier n'a pas été joint à la question." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ erreur: "Daliro n'est pas encore branché (clé API absente)." }, { status: 503 });

  const utilisateur = await utilisateurCourant().catch(() => null);
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...historique.flatMap((e) => [
      { role: "user" as const, content: e.question },
      { role: "assistant" as const, content: e.reponse },
    ]),
    { role: "user", content: question },
  ];

  const flux = client.beta.messages.stream({
    model: MODELE,
    max_tokens: 1500,
    /* une question courte sur un chantier : effort bas, réponse rapide et peu chère */
    output_config: { effort: "low" },
    /* si le modèle décline par prudence, l'API relance sur un autre modèle */
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    system: [
      { type: "text", text: SYSTEME },
      { type: "text", text: `Données du chantier :\n\n${contexte}` },
    ],
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
          (u.input_tokens * PRIX.entree + u.output_tokens * PRIX.sortie + (u.cache_read_input_tokens ?? 0) * PRIX.lectureCache + (u.cache_creation_input_tokens ?? 0) * PRIX.ecritureCache) / 1_000_000;
        console.log(
          JSON.stringify({
            evenement: "daliro.question.usage",
            utilisateur: utilisateur?.id ?? null,
            entreprise: utilisateur?.entreprise ?? null,
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
            ? "Daliro est très demandé : réessayez dans une minute."
            : e instanceof Anthropic.AuthenticationError
              ? "La clé de Daliro est refusée : prévenez Omega."
              : "Daliro n'a pas pu répondre. Réessayez.";
        console.error("daliro.question.erreur", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
        c.enqueue(encodeur.encode(`\n\n${message}`));
      } finally {
        c.close();
      }
    },
  });

  return new Response(corps, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
