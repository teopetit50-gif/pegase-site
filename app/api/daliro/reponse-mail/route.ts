import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { utilisateurCourant } from "@/lib/supabase/server";

/* DALIRO : la réponse à un mail reçu, écrite d'avance (07/11/2026, demande
   de Teo : « on doit lui faciliter la vie un maximum, il doit juste avoir un
   truc genre valider l'envoi ou modifier ; le back-end ce sera Claude avec
   des harness conçues pour le moteur Daliro — pas que pour les devis, pour
   tous les trucs »).

   La page Mails (components/espace2/daliro/Mails.tsx, encart
   ./ReponsePrete.tsx) envoie ici le mail ouvert (expéditeur, objet, texte,
   pièces, réponses déjà faites) et, s'il est rattaché à un chantier, le
   chantier mis en texte (components/espace2/daliro/contexteChantier.ts).
   L'API Claude décide d'abord s'il y a une réponse à envoyer (un relevé de
   compte ou des photos d'équipe n'en appellent pas), puis l'écrit, prête à
   partir : objet, texte signé, et la courte liste de ce que la personne
   doit vérifier avant d'envoyer (une date proposée, un montant). La règle
   de conduite par type d'expéditeur (client, fournisseur, sous-traitant,
   bureau de contrôle, maître d'ouvrage, administration, assurance, équipe)
   est la harness du moteur, ci-dessous. Une consigne libre de la personne
   (« dis-lui que non, pas avant janvier ») refait la réponse dans ce sens.

   Ouvert sans session, pour l'exemple en rendez-vous : même garde-fou que
   /api/daliro/question (30 réponses par quart d'heure et par adresse,
   mémoire d'une instance), un mail de 20 000 caractères au plus, un
   chantier de 24 000. Coût journalisé (« daliro.reponse_mail.usage »). La
   clé vit dans ANTHROPIC_API_KEY. */

const MODELE = "claude-opus-5-5";
const PRIX = { entree: 4, sortie: 20, lectureCache: 0.2, ecritureCache: 5 };

const SYSTEME = `Tu es Daliro, le moteur de bureau d'une entreprise du bâtiment en Guadeloupe (gros œuvre, second œuvre, rénovation). Tu lis un mail arrivé sur la boîte de l'entreprise et tu écris la réponse que le gérant ou le conducteur de travaux enverra. Il la relit et clique « Envoyer » : elle doit être juste, complète et prête, sans rien à retoucher dans le cas courant.

D'abord, décide s'il y a une réponse à envoyer (repondre = true ou false) :
- Oui pour une question, une demande, une relance, une facture ou situation reçue, une confirmation attendue, un compte rendu qui appelle une remarque, une plainte, un retard annoncé, une demande de devis.
- Non pour une pure information qui n'attend rien (relevé de compte sans question, attestation disponible, photos de fin de journée d'un chef d'équipe, consigne générale déjà traitée, accusé automatique). Dans ce cas, dis en une phrase (pourquoi) ce que la personne a à faire à la place, s'il y a quelque chose (classer, payer, transmettre).

Règles par type d'expéditeur :
- Client (particulier ou pro) : rassurer sans minimiser, dire ce qu'on fait et quand (un passage, une visite, un appel), qui vient. Une fissure, une infiltration, une malfaçon signalée : on vient voir, on ne diagnostique pas par mail. Une demande de supplément ou de modification : on dit si c'est possible et qu'on envoie le chiffrage, sans donner un prix. Une demande de devis : on remercie, on propose un rendez-vous pour le métré et on demande ce qui manque (photos, adresse exacte, créneau).
- Fournisseur : confirmer ou refuser clairement (livraison, créneau, quantités), rappeler l'accès et les horaires du chantier, demander le bon de livraison ; un retard de fabrication : accuser réception, demander une date ferme et les conséquences sur le planning, dire qu'on réorganise.
- Sous-traitant : une facture ou situation : accuser réception, dire qu'elle est transmise à la vérification et rappeler le délai de paiement contractuel sans en inventer un (« selon les conditions du contrat ») ; une coordination de passage : confirmer le créneau ou en proposer un, nommer le lot et ce qui doit être prêt avant.
- Bureau de contrôle, coordonnateur SPS : ton technique et précis ; accuser réception de l'avis, dire ce qu'on transmet (plans, PPSPS, fiches), proposer un créneau pour la visite, lister les points d'attention repris.
- Maître d'ouvrage, maître d'œuvre, architecte : ton formel ; confirmer la réunion ou le compte rendu, relever un point à corriger si le mail le demande, confirmer qui sera présent.
- Administration, mairie, DEAL : formel, court, accuser réception et dire ce qui est mis en place.
- Assurance : accuser réception, demander ce qui manque le cas échéant.
- Équipe (chef d'équipe, salarié) : court, direct, tutoiement si le mail tutoie ; remercier, dire la suite.

Comment écrire :
- En français, au vouvoiement sauf pour l'équipe, ton d'un artisan sérieux : direct, chaleureux, pas de jargon commercial, pas de formules creuses. Entre 4 et 12 lignes. « Bonjour » + le nom ou le prénom tel qu'il signe, et une signature « Bien cordialement, » puis « L'équipe travaux » sur la ligne suivante. Pas de Markdown : pas d'astérisques, pas de dièses, pas de puces ; des phrases, des retours à la ligne entre les paragraphes.
- Réponds à chaque question posée dans le mail, dans l'ordre. Reprends les faits du mail (date, numéro de bon, nom du chantier, montant cité) : c'est ce qui montre qu'on l'a lu.
- Appuie-toi sur les données du chantier quand elles sont jointes (planning des passages, lots, équipes, points à régler) : cite une date ou un intervenant qui s'y trouve. N'invente jamais une donnée : pas de prix, pas d'horaire ni de date d'intervention qui ne soient ni dans le mail ni dans le chantier. Quand il faut proposer un créneau sans en avoir, propose-le au conditionnel et mets-le dans a_verifier.
- Ne t'engage jamais sur un montant, un délai de paiement chiffré ou une responsabilité (« c'est bien lié à nos travaux ») : on constate, on vient voir, on chiffre après.
- L'objet : « Re: » suivi de l'objet du mail reçu, raccourci s'il est long.
- a_verifier : zéro à trois choses courtes que la personne doit confirmer avant d'envoyer (un créneau proposé, une personne nommée, un document promis). Rien d'évident. Vide si tout vient du mail ou des données.
- pourquoi : une phrase de dix mots au plus qui dit ce que fait la réponse (« Confirme la livraison et rappelle l'accès au chantier »).

Si une consigne de la personne est jointe, elle prime sur tout le reste : la réponse dit ce que la consigne demande, avec le même ton.
Si le mail est vide ou illisible, repondre = false et pourquoi le dit.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["repondre", "pourquoi", "objet", "corps", "a_verifier"],
  properties: {
    repondre: { type: "boolean" },
    pourquoi: { type: "string" },
    objet: { type: "string" },
    corps: { type: "string" },
    a_verifier: { type: "array", items: { type: "string" } },
  },
};

const Reponse = z.object({
  repondre: z.boolean(),
  pourquoi: z.string(),
  objet: z.string(),
  corps: z.string(),
  a_verifier: z.array(z.string()),
});

const Entree = z.object({
  mail: z.object({
    de_nom: z.string().max(200).default(""),
    de_adresse: z.string().max(200).default(""),
    objet: z.string().max(500).default(""),
    corps: z.string().max(20_000).default(""),
    categorie: z.string().max(40).default(""),
    priorite: z.number().int().min(0).max(4).default(0),
    recu_le: z.string().max(40).default(""),
    pieces: z.array(z.string().max(200)).max(20).default([]),
    reponses: z.array(z.string().max(4000)).max(10).default([]),
  }),
  chantier: z.string().max(24_000).nullable().default(null),
  consigne: z.string().max(1000).default(""),
});

const CATEGORIES: Record<string, string> = {
  client: "Client",
  moa: "Maître d'ouvrage",
  moe: "Maître d'œuvre / architecte",
  fournisseur: "Fournisseur",
  soustraitant: "Sous-traitant",
  controle: "Bureau de contrôle / coordonnateur SPS",
  administration: "Administration",
  assurance: "Assurance",
  equipe: "Équipe (interne)",
};
const PRIORITES = ["sans priorité", "basse", "normale", "haute", "urgente"];

const client = new Anthropic();

/* garde-fou simple : la mémoire d'une instance, pas une vraie limite globale */
const appels = new Map<string, number[]>();
function tropDAppels(ip: string): boolean {
  const maintenant = Date.now();
  const recents = (appels.get(ip) ?? []).filter((t) => maintenant - t < 15 * 60_000);
  recents.push(maintenant);
  appels.set(ip, recents);
  return recents.length > 30;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
  if (tropDAppels(ip)) return Response.json({ erreur: "Beaucoup de réponses d'affilée : réessayez dans quelques minutes." }, { status: 429 });

  let entree: z.infer<typeof Entree>;
  try {
    entree = Entree.parse(await req.json());
  } catch {
    return Response.json({ erreur: "Requête illisible." }, { status: 400 });
  }
  const { mail, chantier, consigne } = entree;
  if (!mail.corps.trim() && !mail.objet.trim()) return Response.json({ erreur: "Le mail est vide : rien à quoi répondre." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ erreur: "Daliro n'est pas encore branché (clé API absente)." }, { status: 503 });

  const utilisateur = await utilisateurCourant().catch(() => null);
  const auj = new Date().toISOString().slice(0, 10);
  const texte = [
    `Aujourd'hui : ${auj}`,
    `Boîte de l'entreprise : contact@entreprise-exemple.fr`,
    "",
    "MAIL REÇU",
    `De : ${mail.de_nom || "(sans nom)"} <${mail.de_adresse || "adresse inconnue"}>`,
    `Type d'expéditeur : ${CATEGORIES[mail.categorie] ?? mail.categorie ?? "inconnu"}`,
    `Priorité : ${PRIORITES[mail.priorite] ?? "normale"}`,
    mail.recu_le ? `Reçu le : ${mail.recu_le}` : null,
    `Objet : ${mail.objet || "(sans objet)"}`,
    mail.pieces.length ? `Pièces jointes : ${mail.pieces.join(", ")}` : "Pièces jointes : aucune",
    "",
    mail.corps.trim() || "(message sans texte)",
    ...(mail.reponses.length ? ["", "RÉPONSES DÉJÀ ENVOYÉES À CE MAIL (du plus ancien au plus récent) :", ...mail.reponses.map((r) => `- « ${r} »`)] : []),
    ...(chantier ? ["", "DONNÉES DU CHANTIER RATTACHÉ :", chantier] : ["", "Ce mail n'est rattaché à aucun chantier."]),
    ...(consigne.trim() ? ["", `CONSIGNE DE LA PERSONNE POUR CETTE RÉPONSE : ${consigne.trim()}`] : []),
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  try {
    const fin = await client.beta.messages.create({
      model: MODELE,
      max_tokens: 4000,
      /* une réponse courte à un mail : effort bas, réponse rapide et peu chère */
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      /* si le modèle décline par prudence, l'API relance sur un autre modèle */
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system: SYSTEME,
      messages: [{ role: "user", content: texte }],
    });

    const u = fin.usage;
    const cout =
      (u.input_tokens * PRIX.entree + u.output_tokens * PRIX.sortie + (u.cache_read_input_tokens ?? 0) * PRIX.lectureCache + (u.cache_creation_input_tokens ?? 0) * PRIX.ecritureCache) / 1_000_000;
    console.log(
      JSON.stringify({
        evenement: "daliro.reponse_mail.usage",
        utilisateur: utilisateur?.id ?? null,
        entreprise: utilisateur?.entreprise ?? null,
        modele: fin.model,
        entree: u.input_tokens,
        sortie: u.output_tokens,
        cache_lu: u.cache_read_input_tokens ?? 0,
        cout_usd: Number(cout.toFixed(6)),
      }),
    );

    if (fin.stop_reason === "refusal") return Response.json({ erreur: "Daliro ne peut pas répondre à ce mail." }, { status: 422 });
    if (fin.stop_reason === "max_tokens") throw new Error("réponse coupée");
    const brut = fin.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const lu = Reponse.safeParse(JSON.parse(brut));
    if (!lu.success) throw new Error("réponse hors schéma");
    const objetRecu = mail.objet.trim();
    const objet = lu.data.objet.trim() || (objetRecu ? (/^re\s*:/i.test(objetRecu) ? objetRecu : `Re: ${objetRecu}`) : "Re: votre message");
    return Response.json({
      repondre: lu.data.repondre,
      pourquoi: lu.data.pourquoi.trim(),
      objet,
      corps: lu.data.corps.replace(/\r\n/g, "\n").trim(),
      a_verifier: lu.data.a_verifier.map((x) => x.trim()).filter(Boolean).slice(0, 3),
    });
  } catch (e) {
    const message =
      e instanceof Anthropic.RateLimitError
        ? "Daliro est très demandé : réessayez dans une minute."
        : e instanceof Anthropic.AuthenticationError
          ? "La clé de Daliro est refusée : prévenez Omega."
          : "Daliro n'a pas pu écrire la réponse. Réessayez.";
    console.error("daliro.reponse_mail.erreur", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return Response.json({ erreur: message }, { status: 502 });
  }
}
