// RÉCEPTION — fonction Edge à déployer avec verify_jwt = false (Brevo, Meta et le site
// n'envoient pas de JWT Supabase ; chaque entrée porte sa propre authentification).
//   POST /reception/brevo       e-mail entrant Brevo (jeton bearer BREVO_WEBHOOK_JETON)
//   GET  /reception/whatsapp    vérification Meta (META_VERIFY_TOKEN)
//   POST /reception/whatsapp    messages WhatsApp (X-Hub-Signature-256 avec META_APP_SECRET)
//   POST /reception/formulaire  formulaire du site (HMAC FORMULAIRE_SECRET)

import { portesDepuisEnvironnement } from "./portes.ts";
import { stockageSupabase } from "./commun.ts";
import { piecesBrevo, traiterBrevoEntrant } from "./brevo_entrant.ts";
import { graphMeta, traiterWhatsApp } from "./whatsapp.ts";
import { traiterFormulaire } from "./formulaire.ts";

const journal = {
  info: (message: string, detail?: Record<string, unknown>) =>
    console.log(`[reception] ${message}`, detail ? JSON.stringify(detail) : ""),
  erreur: (message: string, detail?: Record<string, unknown>) =>
    console.error(
      `[reception] ${message}`,
      detail ? JSON.stringify(detail) : "",
    ),
};

const env = (nom: string) => Deno.env.get(nom)?.trim() || null;

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const entree = url.pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  const url_supabase = env("SUPABASE_URL") ?? "";
  const cleService = env("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const socle = {
    portes: portesDepuisEnvironnement(),
    stockage: stockageSupabase(url_supabase, cleService),
    journal,
  };

  switch (entree) {
    case "brevo": {
      const cleBrevo = env("BREVO_API_KEY");
      return traiterBrevoEntrant(req, {
        ...socle,
        jeton: env("BREVO_WEBHOOK_JETON"),
        pieces: cleBrevo ? piecesBrevo(cleBrevo) : null,
      });
    }
    case "whatsapp": {
      const jetonAcces = env("META_ACCESS_TOKEN");
      const { reponse, traitement } = await traiterWhatsApp(req, {
        ...socle,
        jetonVerification: env("META_VERIFY_TOKEN"),
        secretApp: env("META_APP_SECRET"),
        graph: jetonAcces ? graphMeta(jetonAcces) : null,
      });
      if (traitement) {
        const suivi = traitement.then(
          (issues) => journal.info("notification WhatsApp traitée", { issues }),
          (e) =>
            journal.erreur("notification WhatsApp en erreur", {
              erreur: String(e),
            }),
        );
        if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(suivi);
        else await suivi;
      }
      return reponse;
    }
    case "formulaire":
      return traiterFormulaire(req, {
        ...socle,
        secret: env("FORMULAIRE_SECRET"),
        boite: env("FORMULAIRE_BOITE") ?? undefined,
      });
    default:
      return new Response(
        JSON.stringify({
          erreur: "entrée inconnue : brevo, whatsapp ou formulaire",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
  }
});
