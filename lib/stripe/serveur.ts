import "server-only";
import Stripe from "stripe";

/* ══════════════════════════════════════════════════════════════════════
   Stripe côté SERVEUR — l'enregistrement du moyen de paiement (05/09/2026)

   Demande des associés du 05/09 : « enlève la mention paiement à
   l'installation, ça va porter à confusion ; je veux que le client entre
   son moyen de paiement et soit débité une fois l'installation
   terminée ». Le modèle arrêté le même jour, commun au site et au
   cockpit :
     · à la RÉSERVATION (site), le client ENREGISTRE sa carte ou son
       mandat SEPA sans rien payer — Stripe Checkout en mode « setup » ;
     · le PREMIER PRÉLÈVEMENT part quand l'agence clique « Finaliser
       l'installation » dans le cockpit (création de l'abonnement Stripe,
       hors de ce fichier) ;
     · le webhook Stripe vit sur le COCKPIT, pas ici.

   Ce fichier ne fait donc qu'UNE chose : ouvrir la page Stripe où le
   client enregistre son moyen de paiement (creerSessionEnregistrement).

   « server-only » : la clé secrète ne doit jamais partir dans un bundle
   navigateur — l'import fait échouer la compilation si un composant
   client tire ce module par erreur (Next l'alias sans installation, voir
   node_modules/next/dist/docs/…/05-server-and-client-components.md).

   SANS CLÉ (STRIPE_SECRET_KEY absente — c'est le cas aujourd'hui, aucune
   clé n'existe encore) : stripeDisponible() répond false et la route
   /api/paiement/setup renvoie 503 « paiement_indisponible ». Rien ne
   plante, le site dit au client que l'enregistrement en ligne n'est pas
   encore ouvert.

   Le client Stripe est PARESSEUX : construit au premier appel, jamais au
   chargement du module — un rendu de page qui n'a pas besoin de Stripe
   ne doit pas dépendre de la clé.

   apiVersion : celle du SDK installé (stripe@22.6.1 → « 2026-08-26.dahlia »,
   node_modules/stripe/cjs/apiVersion.js). Les types du SDK ne reflètent
   que cette version ; la figer ici évite qu'un changement de version par
   défaut du compte Stripe change le format des objets sous nos pieds.
   ══════════════════════════════════════════════════════════════════════ */

/* L'adresse publique du site, pour les retours de Stripe Checkout —
   NEXT_PUBLIC_SITE_URL sur Vercel, repli sur le domaine en production.
   (lib/site.ts a son propre repli, l'aperçu Vercel : ici on veut que
   Stripe ramène TOUJOURS sur le vrai domaine si la variable manque.) */
const URL_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://omegaai.fr").replace(/\/+$/, "");

/** La clé secrète est-elle posée ? Sans elle, « paiement indisponible »
    partout — jamais un crash. */
export function stripeDisponible(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

function stripe(): Stripe {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error("paiement_indisponible");
  if (!client) {
    client = new Stripe(cle, { apiVersion: "2026-08-26.dahlia", typescript: true });
  }
  return client;
}

export type ParametresEnregistrement = {
  /* demandes_audit.id — devient client_reference_id de la session */
  demandeId: string;
  /* l'id auth Supabase — la clé de rattachement du customer Stripe */
  utilisateurId: string;
  email: string;
  /* « Prénom Nom », pour le nom du customer si l'entreprise manque */
  nom: string;
  entreprise?: string | null;
  /* demandes_audit.stripe_customer_id s'il est déjà connu (une session
     précédente) : on l'utilise avant toute recherche — l'index de
     recherche Stripe peut avoir une minute de retard, et deux clics
     rapprochés créeraient sinon deux customers */
  clientStripeId?: string | null;
};

/** Le customer Stripe de ce compte : retrouvé (id connu, puis
    metadata.utilisateur_id, puis e-mail), sinon créé. Un customer trouvé
    par e-mail SANS notre metadata la reçoit, pour être retrouvé par elle
    la prochaine fois. Relecture du 05/09 : un customer trouvé par e-mail
    qui porte DÉJÀ un autre utilisateur_id (ancien compte du même e-mail
    supprimé puis recréé, customer saisi à la main par l'agence pour un
    autre compte) n'est PAS adopté — il porte peut-être un moyen de
    paiement que ce compte n'a jamais enregistré, et que le cockpit
    débiterait à la finalisation. On crée un customer neuf, et on le
    journalise pour l'agence. */
async function trouverOuCreerClient(s: Stripe, p: ParametresEnregistrement): Promise<Stripe.Customer> {
  const nom = (p.entreprise ?? "").trim() || p.nom.trim() || undefined;

  if (p.clientStripeId) {
    try {
      const c = await s.customers.retrieve(p.clientStripeId);
      if (!c.deleted) return c;
    } catch {
      /* id inconnu de ce compte Stripe (clé de test ↔ clé réelle, par
         exemple) : on repart par la recherche */
    }
  }

  /* la valeur est un uuid — pas de quote à échapper dans la requête */
  const parMetadata = await s.customers.search({
    query: `metadata['utilisateur_id']:'${p.utilisateurId}'`,
    limit: 1,
  });
  if (parMetadata.data[0]) return parMetadata.data[0];

  const parEmail = await s.customers.search({
    query: `email:'${p.email.replace(/['\\]/g, "")}'`,
    limit: 1,
  });
  const parEmailTrouve = parEmail.data[0];
  if (parEmailTrouve) {
    const porteur = parEmailTrouve.metadata?.utilisateur_id ?? "";
    if (!porteur) {
      return s.customers.update(parEmailTrouve.id, {
        metadata: { utilisateur_id: p.utilisateurId },
      });
    }
    console.error(
      "[paiement/setup] customer",
      parEmailTrouve.id,
      "porte déjà un autre utilisateur_id pour cet e-mail : customer neuf créé pour",
      p.utilisateurId,
    );
  }

  return s.customers.create(
    {
      email: p.email,
      name: nom,
      metadata: { utilisateur_id: p.utilisateurId },
    },
    /* même compte, même minute → même customer, jamais deux */
    { idempotencyKey: `client:${p.utilisateurId}:${minuteCourante()}` },
  );
}

function minuteCourante(): number {
  return Math.floor(Date.now() / 60_000);
}

/** Ouvre une session Stripe Checkout en mode « setup » (carte ou
    prélèvement SEPA, en euros, en français) pour cette demande
    d'installation, et renvoie l'URL où envoyer le client. Rien n'est
    débité : la session n'enregistre qu'un moyen de paiement.

    Contrat commun site ↔ cockpit (05/09) : client_reference_id = id de la
    demande — c'est ce que le webhook du cockpit relit pour poser
    stripe_customer_id, stripe_payment_method_id, paiement_statut et
    moyen_paiement sur demandes_audit. Les retours ramènent sur /compte
    avec ?paiement=ok ou ?paiement=plus-tard.

    idempotencyKey « setup:<demande>:<minute> » : un double clic dans la
    même minute rend la MÊME session (même URL) au lieu d'en ouvrir deux ;
    une minute plus tard, une session neuve — la précédente a pu être
    fermée par le client. */
export async function creerSessionEnregistrement(p: ParametresEnregistrement): Promise<string> {
  const s = stripe();
  const customer = await trouverOuCreerClient(s, p);

  const session = await s.checkout.sessions.create(
    {
      mode: "setup",
      customer: customer.id,
      payment_method_types: ["card", "sepa_debit"],
      currency: "eur",
      locale: "fr",
      client_reference_id: p.demandeId,
      success_url: `${URL_SITE}/compte?paiement=ok`,
      cancel_url: `${URL_SITE}/compte?paiement=plus-tard`,
      /* recopié sur la session ET sur le SetupIntent : le webhook a la
         demande sous la main quel que soit l'objet qu'il regarde */
      metadata: { demande_id: p.demandeId, utilisateur_id: p.utilisateurId },
      setup_intent_data: {
        metadata: { demande_id: p.demandeId, utilisateur_id: p.utilisateurId },
      },
    },
    { idempotencyKey: `setup:${p.demandeId}:${minuteCourante()}` },
  );

  if (!session.url) throw new Error("session_sans_url");
  return session.url;
}
