import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { utilisateurCourant } from "@/lib/supabase/server";
import { BIBLIOTHEQUE_PRIX, prixParRef } from "@/components/espace2/daliro/bibliothequePrix";

/* DALIRO : une dictée devient un devis (06/11/2026, demande de Teo : « tu
   mets un bouton, je clique, ça transcrit à l'écrit, ensuite ça me fait le
   devis dicté »).

   La page « Dicter un devis » (components/espace2/daliro/DicterDevis.tsx)
   transcrit la voix dans le navigateur et envoie ici le texte. L'API Claude
   reconnaît le client, l'adresse et les ouvrages avec leurs quantités, et
   rattache chaque ouvrage à une référence de la bibliothèque de prix
   (components/espace2/daliro/bibliothequePrix.ts) — ou à aucune. Le prix
   d'une ligne rattachée est posé ici, depuis la bibliothèque. Pour l'exemple
   (Teo, 06/11 : « peu importe ce qu'il dit, je veux un devis comme si on le
   faisait vraiment, sans écrire estimé »), une ligne sans référence prend le
   prix proposé par le modèle au tarif courant en Guadeloupe et s'affiche
   comme une ligne de la bibliothèque ; une dictée floue donne quand même un
   devis complet. Bibliothèque et entreprise sont celles de l'exemple.

   Ouvert sans session, pour l'exemple en rendez-vous : même garde-fou que
   /api/daliro/question (10 devis par quart d'heure et par adresse, mémoire
   d'une instance), une dictée de 4 000 caractères au plus. Coût journalisé
   (« daliro.devis.usage »). La clé vit dans ANTHROPIC_API_KEY. */

const MODELE = "claude-opus-5-5";
const PRIX = { entree: 4, sortie: 20, lectureCache: 0.2, ecritureCache: 5 };

const BIBLIOTHEQUE = BIBLIOTHEQUE_PRIX.map((p) => `${p.ref} | ${p.designation} | ${p.unite} | ${p.corps}`).join("\n");

const SYSTEME = `Tu es Daliro, l'assistant d'une entreprise du bâtiment en Guadeloupe. Un conducteur de travaux ou un chef d'équipe vient de dicter, sur place, ce qu'il faut mettre dans un devis. Tu reçois la transcription brute de sa voix (ponctuation approximative, nombres parfois en lettres, mots mal reconnus possibles).
Ton travail : en tirer un devis propre et complet, quoi qu'on te dicte. C'est une démonstration : il ne doit jamais rester vide ni bloqué.
- client : le nom tel qu'il est dit (« M. Lacroix », « Mme Thomas », « SCI Les Flamboyants ») ; « Client à préciser » s'il n'est pas dit.
- adresse : le lieu dit (quartier, section, commune) ; « Adresse à préciser » s'il n'est pas dit.
- telephone : seulement s'il est dicté, sinon null.
- titre : l'objet des travaux en une ligne courte, à la manière « Terrasse carrelée de 22 m² à l'arrière de la maison ».
- lignes : un ouvrage par ligne, dans l'ordre logique du chantier. Pour chacun, la quantité et l'unité dites (m², ml, u, forfait) ; si la quantité n'est pas dite, une quantité réaliste qui découle de la dictée (une surface citée plus haut, une pièce de taille courante) ou 1 forfait.
- ref : la référence de la bibliothèque de prix qui correspond VRAIMENT à l'ouvrage (même ouvrage, même unité). Si aucune ne correspond, ref vaut null. Ne force jamais une correspondance approximative (un garde-corps en bois n'est pas un garde-corps aluminium).
- prix_estime : le prix unitaire HT en euros, au tarif courant d'une entreprise du bâtiment en Guadeloupe, fourniture et pose comprises. Toujours rempli, même quand ref est posée (il ne servira alors pas).
- designation : reprends le libellé de la bibliothèque quand ref est posée ; sinon écris un libellé clair et professionnel, comme dans un vrai devis.
Si la dictée est floue ou incomplète, complète avec les ouvrages qu'un artisan mettrait normalement pour ce travail (dépose, préparation, fourniture et pose, finitions), sans en rajouter inutilement : entre 3 et 12 lignes en général.
Si la dictée ne parle pas de travaux du tout, fais le devis d'un petit rafraîchissement de pièce (peinture, sol, électricité) et dis-le dans le titre.
Ne refuse pas et ne pose pas de question : renvoie toujours un devis.

Bibliothèque de prix (ref | désignation | unité | corps d'état) :
${BIBLIOTHEQUE}`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["titre", "client", "adresse", "telephone", "lignes"],
  properties: {
    titre: { type: "string" },
    client: { type: "string" },
    adresse: { type: "string" },
    telephone: { anyOf: [{ type: "string" }, { type: "null" }] },
    lignes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["designation", "unite", "quantite", "ref", "prix_estime"],
        properties: {
          designation: { type: "string" },
          unite: { type: "string" },
          quantite: { type: "number" },
          ref: { anyOf: [{ type: "string" }, { type: "null" }] },
          prix_estime: { type: "number" },
        },
      },
    },
  },
};

const Reponse = z.object({
  titre: z.string(),
  client: z.string(),
  adresse: z.string(),
  telephone: z.string().nullable(),
  lignes: z.array(z.object({ designation: z.string(), unite: z.string(), quantite: z.number(), ref: z.string().nullable(), prix_estime: z.number() })),
});

const client = new Anthropic();

/* garde-fou simple : la mémoire d'une instance, pas une vraie limite globale */
const appels = new Map<string, number[]>();
function tropDAppels(ip: string): boolean {
  const maintenant = Date.now();
  const recents = (appels.get(ip) ?? []).filter((t) => maintenant - t < 15 * 60_000);
  recents.push(maintenant);
  appels.set(ip, recents);
  return recents.length > 10;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
  if (tropDAppels(ip)) return Response.json({ erreur: "Beaucoup de devis d'affilée : réessayez dans quelques minutes." }, { status: 429 });

  let vocal = "";
  try {
    const corps = (await req.json()) as { vocal?: unknown };
    if (typeof corps.vocal === "string") vocal = corps.vocal.trim().slice(0, 4000);
  } catch {
    return Response.json({ erreur: "Requête illisible." }, { status: 400 });
  }
  if (vocal.length < 3) return Response.json({ erreur: "La dictée est vide : parlez, puis faites le devis." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ erreur: "Daliro n'est pas encore branché (clé API absente)." }, { status: 503 });

  const utilisateur = await utilisateurCourant().catch(() => null);
  try {
    const fin = await client.beta.messages.create({
      model: MODELE,
      max_tokens: 8000,
      /* une extraction courte : effort bas, réponse rapide et peu chère */
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      /* si le modèle décline par prudence, l'API relance sur un autre modèle */
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system: SYSTEME,
      messages: [{ role: "user", content: `Transcription de la dictée :\n\n${vocal}` }],
    });

    const u = fin.usage;
    const cout =
      (u.input_tokens * PRIX.entree + u.output_tokens * PRIX.sortie + (u.cache_read_input_tokens ?? 0) * PRIX.lectureCache + (u.cache_creation_input_tokens ?? 0) * PRIX.ecritureCache) / 1_000_000;
    console.log(
      JSON.stringify({
        evenement: "daliro.devis.usage",
        utilisateur: utilisateur?.id ?? null,
        entreprise: utilisateur?.entreprise ?? null,
        modele: fin.model,
        entree: u.input_tokens,
        sortie: u.output_tokens,
        cache_lu: u.cache_read_input_tokens ?? 0,
        cout_usd: Number(cout.toFixed(6)),
      }),
    );

    if (fin.stop_reason === "refusal") return Response.json({ erreur: "Daliro ne peut pas faire ce devis." }, { status: 422 });
    const texte = fin.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const lu = Reponse.safeParse(JSON.parse(texte));
    if (!lu.success) throw new Error("réponse hors schéma");

    /* le prix de la bibliothèque d'abord ; sinon celui du modèle, présenté pareil (exemple) */
    const lignes = lu.data.lignes
      .filter((l) => l.designation.trim() && l.quantite > 0)
      .slice(0, 40)
      .map((l) => {
        const p = prixParRef(l.ref);
        const prix = Number.isFinite(l.prix_estime) && l.prix_estime > 0 ? Math.round(l.prix_estime) : null;
        return p
          ? { designation: p.designation, unite: p.unite, quantite: l.quantite, prix: p.prix, origine: "bibliotheque" as const }
          : { designation: l.designation, unite: l.unite, quantite: l.quantite, prix, origine: prix === null ? ("a_chiffrer" as const) : ("bibliotheque" as const) };
      });
    return Response.json({ titre: lu.data.titre, client: lu.data.client, adresse: lu.data.adresse, telephone: lu.data.telephone, lignes });
  } catch (e) {
    const message =
      e instanceof Anthropic.RateLimitError
        ? "Daliro est très demandé : réessayez dans une minute."
        : e instanceof Anthropic.AuthenticationError
          ? "La clé de Daliro est refusée : prévenez Omega."
          : "Daliro n'a pas pu faire le devis. Réessayez.";
    console.error("daliro.devis.erreur", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return Response.json({ erreur: message }, { status: 502 });
  }
}
