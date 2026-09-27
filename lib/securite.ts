/* ══════════════════════════════════════════════════════════════════════
   lib/securite.ts — les gardes communes des routes API (25/09/2026)

   Phase de sécurisation d'omegaai.fr. Les routes publiques qui ENVOIENT
   quelque chose (un e-mail, une session Stripe) passent toutes par les
   trois mêmes gardes, posées en tête du handler :

   1. origineRefusee(req) — un navigateur annonce d'où part la requête
      (`Sec-Fetch-Site`, et `Origin` sur un POST). Si c'est un autre site,
      on refuse : une page tierce ne doit pas pouvoir faire poster nos
      formulaires par le navigateur de ses visiteurs — c'est la façon de
      contourner une limite par adresse IP avec les adresses des autres.
      Un script sans navigateur n'envoie ni l'un ni l'autre : ce n'est pas
      une authentification, c'est un filtre contre l'abus par rebond.

   2. limiteDepassee(route, req, max, fenetreMs) — au plus `max` appels
      par adresse IP et par fenêtre, plus un plafond global par instance.
      Mémoire de l'instance : avec Fluid Compute, une instance chaude sert
      les appels successifs, ce qui arrête l'inondation naïve (un script
      qui boucle sur le formulaire). Ce n'est PAS une limite globale au
      sens strict — la règle du pare-feu Vercel la double quand elle est
      posée (docs/securite.md). L'IP vient de `x-forwarded-for`, que Vercel
      RÉÉCRIT à l'entrée : un client ne peut pas y glisser la sienne.

   3. lireJson(req, maxOctets) — lit le corps en texte, refuse au-delà de
      la taille permise, puis parse. `req.json()` avalerait tout ce qu'on
      lui envoie avant qu'on ait pu compter.
   ══════════════════════════════════════════════════════════════════════ */

import { SUPABASE_URL } from "@/lib/supabase/config";

const ORIGINES_SITE = new Set(["https://omegaai.fr", "https://www.omegaai.fr"]);

export function origineRefusee(req: Request): boolean {
  const provenance = req.headers.get("sec-fetch-site");
  if (provenance && provenance !== "same-origin" && provenance !== "none") return true;
  const origine = req.headers.get("origin");
  if (!origine) return false;
  let ici: string;
  try {
    ici = new URL(req.url).origin;
  } catch {
    return true;
  }
  return origine !== ici && !ORIGINES_SITE.has(origine);
}

export function adresseIp(req: Request): string {
  const transmise = req.headers.get("x-forwarded-for");
  if (transmise) return transmise.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "inconnue";
}

type Compteur = { debut: number; n: number };
const compteurs = new Map<string, Compteur>();
const PLAFOND_CLES = 20_000;

function compter(cle: string, fenetreMs: number, maintenant: number): number {
  if (compteurs.size > PLAFOND_CLES) compteurs.clear();
  const c = compteurs.get(cle);
  if (!c || maintenant - c.debut > fenetreMs) {
    compteurs.set(cle, { debut: maintenant, n: 1 });
    return 1;
  }
  c.n += 1;
  return c.n;
}

/* `plafondGlobal` : au plus tant d'appels sur la fenêtre pour TOUTE
   l'instance, toutes adresses confondues — une inondation distribuée
   (mille adresses, un appel chacune) ne doit pas épuiser le quota
   d'envoi d'e-mails dont dépendent les confirmations de rendez-vous. */
export function limiteDepassee(
  route: string,
  req: Request,
  max: number,
  fenetreMs: number,
  plafondGlobal?: number,
): boolean {
  const maintenant = Date.now();
  const parAdresse = compter(`${route}|${adresseIp(req)}`, fenetreMs, maintenant);
  if (parAdresse > max) return true;
  if (plafondGlobal !== undefined && compter(`${route}|*`, fenetreMs, maintenant) > plafondGlobal) {
    return true;
  }
  return false;
}

/* `undefined` = corps refusé (trop gros, illisible ou pas du JSON). Un
   JSON valide mais vide de sens (`null`, un tableau) passe : c'est au
   handler de vérifier la forme. */
export async function lireJson(req: Request, maxOctets: number): Promise<unknown> {
  const annonce = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(annonce) && annonce > maxOctets) return undefined;
  let brut: string;
  try {
    brut = await req.text();
  } catch {
    return undefined;
  }
  if (brut.length > maxOctets) return undefined;
  try {
    return JSON.parse(brut) as unknown;
  } catch {
    return undefined;
  }
}

/* 27/09/2026 — la porte des routes (suite de l'audit du 25/09, « agenda
   saturable »). reserver_audit sans compte et limiter_contact
   s'appelaient en direct depuis Internet avec la clé publique : une
   vingtaine d'appels fermaient la réservation sans compte pour la
   journée, une soixantaine le formulaire de contact. Les deux passent
   désormais par la fonction Edge « routes-site » (source :
   OMEGA/base-de-donnees/fonctions-edge/routes-site), et la base refuse
   l'appel direct.

   Les routes s'y présentent avec le jeton OIDC que Vercel remet à chaque
   fonction : la porte vérifie sa signature auprès de Vercel (projet
   pegase-site2, production), puis appelle la base avec ses propres
   droits. Aucun secret partagé à garder ni à faire tourner. Sans jeton
   (développement local), `appelPorte` rend `undefined` et la route fait
   l'appel d'avant — qui ne passe plus que tant que la base l'accepte. */
type ContexteVercel = { get?: () => { headers?: Record<string, string | undefined> } };

export function jetonVercel(req: Request): string | undefined {
  const contexte = (globalThis as unknown as Record<symbol, ContexteVercel | undefined>)[
    Symbol.for("@vercel/request-context")
  ];
  return (
    req.headers.get("x-vercel-oidc-token")?.trim() ||
    contexte?.get?.()?.headers?.["x-vercel-oidc-token"]?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    undefined
  );
}

export async function appelPorte(
  req: Request,
  action: "sante" | "reserver" | "limiter_contact",
  donnees: Record<string, unknown> = {},
): Promise<Response | undefined> {
  const jeton = jetonVercel(req);
  if (!jeton) return undefined;
  try {
    return await fetch(`${SUPABASE_URL}/functions/v1/routes-site`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-jeton-vercel": jeton },
      body: JSON.stringify({ action, ...donnees }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return undefined;
  }
}
