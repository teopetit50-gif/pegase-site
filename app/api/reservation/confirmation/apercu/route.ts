import { composerConfirmation } from "@/lib/mail/confirmation";

/* ══════════════════════════════════════════════════════════════════════
   GET /api/reservation/confirmation/apercu — relire le mail sans l'envoyer
   (16/09/2026)

   « Montre-moi le modèle de mail » : plutôt qu'une maquette recopiée à la
   main — qui dérive au premier changement et finit par mentir — cette
   route rend le mail RÉEL, composé par le même module que l'envoi
   (lib/mail/confirmation.ts). Ce qu'on regarde ici est, au caractère
   près, ce qui arrive chez le client.

   En local : npm run dev, puis
     http://localhost:3000/api/reservation/confirmation/apercu
     http://localhost:3000/api/reservation/confirmation/apercu?cas=devis
     http://localhost:3000/api/reservation/confirmation/apercu?format=texte

   ⚠ DÉVELOPPEMENT SEULEMENT. En production la route répond 404 : elle
   n'expose rien de sensible (le contenu est fixe, les valeurs sont
   inventées), mais une URL d'aperçu sur un site public finit toujours par
   se retrouver quelque part, et ce n'est pas une page du site.

   La date d'exemple est FIXE et écrite en dur. Un `new Date()` ferait
   varier l'aperçu d'un jour à l'autre : on relit une mise en forme, pas
   un calendrier, et une valeur qui bouge empêche de comparer deux
   captures à une semaine d'écart.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

/* Mercredi 23 septembre 2026, 10 h 30 en Guadeloupe (UTC−4) */
const CRENEAU_EXEMPLE = "2026-09-23T14:30:00.000Z";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Introuvable", { status: 404 });
  }

  const url = new URL(req.url);
  const devis = url.searchParams.get("cas") === "devis";

  const mail = composerConfirmation(
    devis
      ? { prenom: "Claire", formule: "atelier", creneauISO: null, dureeMin: null }
      : { prenom: "Marc", formule: "diagnostic", creneauISO: CRENEAU_EXEMPLE, dureeMin: 30 },
  );

  if (url.searchParams.get("format") === "texte") {
    return new Response(`Objet : ${mail.sujet}\n\n${mail.texte}`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(mail.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
