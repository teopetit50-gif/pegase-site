import { createClient, utilisateurCourant } from "@/lib/supabase/server";
import { creerSessionEnregistrement, stripeDisponible } from "@/lib/stripe/serveur";

/* ══════════════════════════════════════════════════════════════════════
   POST /api/paiement/setup — ouvrir l'enregistrement du moyen de paiement
   (05/09/2026)

   Corps : { demande: "<uuid de demandes_audit>" }.
   Réponse : { url } — la page Stripe Checkout (mode setup) où le client
   enregistre sa carte ou son mandat SEPA ; le navigateur y va par
   window.location.assign. Rien n'est débité (voir lib/stripe/serveur.ts).

   Appelée par PriseDeCreneau (étape « fait » de /installation) et par la
   carte d'abonnement de /compte.

   GARDES, dans l'ordre :
     401 connexion_requise    — pas de session vérifiée (getClaims via
                                utilisateurCourant, comme /compte) ;
     400 demande_invalide     — corps absent, pas JSON, ou pas un uuid ;
     503 paiement_indisponible — STRIPE_SECRET_KEY absente : l'enregis-
                                trement en ligne n'est pas encore ouvert ;
     404 demande_inconnue     — la demande n'est pas à CE compte : lue par
                                rpc mes_demandes() (utilisateur_id =
                                auth.uid(), security definer), jamais par
                                un select libre ;
     403 statut_incompatible  — pas une installation (parcours reglage),
                                ou un statut hors confirme|a_traiter|honore
                                (annulée, no_show) ;
     403 deja_preleve         — le premier prélèvement est passé : le
                                moyen de paiement ne se ré-enregistre pas
                                par cette porte (l'agence gère dans Stripe) ;
     502 stripe_erreur        — Stripe a refusé ou ne répond pas.
   Un seul format d'erreur, { erreur: "<code>" } : le client traduit
   (ERREURS_ABONNEMENT, lib/abonnement.ts) et n'affiche jamais un message
   brut.

   Route Handler Next 16 (node_modules/next/dist/docs/01-app/01-getting-
   started/15-route-handlers.md) : Request/Response Web standard, corps lu
   par request.json(), statut posé par Response.json(corps, { status }).
   Un POST n'est jamais mis en cache. La route n'est PAS dans le matcher
   de proxy.ts (et ne doit pas y entrer : proxy.ts n'est pas à modifier) :
   la session est lue dans les cookies par createClient() de
   lib/supabase/server, qui sait la rafraîchir depuis un Route Handler.
   ══════════════════════════════════════════════════════════════════════ */

const STATUTS_OUVERTS = ["confirme", "a_traiter", "honore"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* les colonnes de demandes_audit que cette route lit — mes_demandes()
   renvoie la ligne entière, les colonnes Stripe du 05/09 comprises (ou
   absentes si la migration n'est pas passée : on les traite comme nulles) */
type Ligne = {
  id: string;
  parcours: string;
  statut: string;
  prenom: string | null;
  nom: string | null;
  entreprise: string | null;
  stripe_customer_id?: string | null;
  paiement_statut?: string | null;
};

function erreur(code: string, status: number) {
  return Response.json({ erreur: code }, { status });
}

export async function POST(request: Request) {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return erreur("connexion_requise", 401);

  let corps: unknown = null;
  try {
    corps = await request.json();
  } catch {
    /* corps absent ou pas JSON : traité juste en dessous */
  }
  const demandeId =
    corps && typeof corps === "object" && typeof (corps as { demande?: unknown }).demande === "string"
      ? (corps as { demande: string }).demande.trim()
      : "";
  if (!UUID.test(demandeId)) return erreur("demande_invalide", 400);

  if (!stripeDisponible()) return erreur("paiement_indisponible", 503);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mes_demandes");
  if (error) return erreur("base_indisponible", 502);
  const demande = ((data ?? []) as Ligne[]).find((d) => d.id === demandeId);
  if (!demande) return erreur("demande_inconnue", 404);
  if (demande.parcours !== "reglage" || !STATUTS_OUVERTS.includes(demande.statut)) {
    return erreur("statut_incompatible", 403);
  }
  if (demande.paiement_statut === "preleve") return erreur("deja_preleve", 403);

  try {
    const url = await creerSessionEnregistrement({
      demandeId,
      utilisateurId: utilisateur.id,
      email: utilisateur.email,
      nom: [demande.prenom, demande.nom].filter(Boolean).join(" ").trim(),
      entreprise: demande.entreprise,
      clientStripeId: demande.stripe_customer_id ?? null,
    });
    return Response.json({ url });
  } catch (e) {
    /* la cause reste dans les journaux du serveur ; le client ne voit
       qu'un code — jamais un message Stripe brut */
    console.error("[paiement/setup]", e instanceof Error ? e.message : e);
    return erreur("stripe_erreur", 502);
  }
}
