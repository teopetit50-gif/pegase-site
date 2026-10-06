// La connexion d'une messagerie par OAuth, côté navigateur (fonction `messagerie-oauth`,
// verify_jwt false : c'est Google qui y renvoie l'utilisateur).
//   GET …/google/debut?etat=<état>  : l'écran d'Omega (A3) a obtenu un état à usage unique par la
//        porte socle `messagerie_preparer` (membre connecté, client, fournisseur) ; on le vérifie
//        (messagerie_ouvrir) puis on renvoie vers le consentement Google.
//   GET …/google/retour?code&state   : échange du code, profil (adresse, curseur), puis
//        messagerie_enregistrer (jetons au Vault, état consommé, ligne expediteurs gmail) ; renvoi
//        vers l'écran. Si l'enregistrement tombe après l'échange, le jeton obtenu est révoqué.
// Aucun jeton n'apparaît dans une URL, un journal ou une page.

import type { Messagerie } from "./fournisseur.ts";
import type { Portes } from "./portes.ts";

export type DependancesOAuth = {
  portes: Portes;
  gmail: Messagerie | null;
  /** URL publique de la fonction, sans barre finale : …/functions/v1/messagerie-oauth */
  base: string;
  journal: { erreur(message: string, detail?: Record<string, unknown>): void };
};

function page(statut: number, titre: string, texte: string): Response {
  const echapper = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return new Response(
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width">` +
      `<title>${
        echapper(titre)
      }</title><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem">` +
      `<h1 style="font-size:1.4rem">${echapper(titre)}</h1><p>${
        echapper(texte)
      }</p></body></html>`,
    {
      status: statut,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

function redirection(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
}

/** Le renvoi vers l'écran n'accepte qu'une URL https (pas de redirection ouverte vers autre chose). */
function retourSur(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function creerOAuth(
  deps: DependancesOAuth,
): (req: Request) => Promise<Response> {
  const retourGoogle = `${deps.base}/google/retour`;
  return async (req) => {
    if (req.method !== "GET") return page(405, "Méthode non autorisée", "");
    const url = new URL(req.url);
    const route = url.pathname.replace(
      /^.*\/(google\/(?:debut|retour))\/?$/,
      "$1",
    );
    if (!deps.gmail) {
      return page(
        503,
        "Connexion indisponible",
        "L'application Google d'Omega n'est pas encore configurée.",
      );
    }

    if (route === "google/debut") {
      const etat = url.searchParams.get("etat") ?? "";
      if (!/^[A-Za-z0-9_-]{16,200}$/.test(etat)) {
        return page(
          400,
          "Lien invalide",
          "Relancez la connexion depuis Omega.",
        );
      }
      try {
        await deps.portes.ouvrir(etat);
      } catch {
        return page(
          400,
          "Lien expiré",
          "Ce lien de connexion n'est plus valable. Relancez la connexion depuis Omega.",
        );
      }
      return redirection(deps.gmail.urlConsentement(etat, retourGoogle));
    }

    if (route === "google/retour") {
      const etat = url.searchParams.get("state") ?? "";
      if (url.searchParams.get("error")) {
        return page(
          200,
          "Connexion annulée",
          "Aucune messagerie n'a été connectée. Vous pouvez fermer cette page.",
        );
      }
      const code = url.searchParams.get("code") ?? "";
      if (!code || !/^[A-Za-z0-9_-]{16,200}$/.test(etat)) {
        return page(
          400,
          "Retour invalide",
          "Relancez la connexion depuis Omega.",
        );
      }
      try {
        await deps.portes.ouvrir(etat);
      } catch {
        return page(
          400,
          "Lien expiré",
          "Ce lien de connexion n'est plus valable. Relancez la connexion depuis Omega.",
        );
      }
      let renouvellement: string | null = null;
      try {
        const c = await deps.gmail.echangerCode(code, retourGoogle);
        renouvellement = c.renouvellement;
        const p = await deps.gmail.profil(c.acces.jeton);
        const r = await deps.portes.enregistrer({
          etat,
          adresse: p.adresse,
          renouvellement: c.renouvellement,
          acces: c.acces.jeton,
          accesExpireLe: c.acces.expire_le,
          portees: c.portees,
          curseur: p.curseur,
        });
        const ecran = retourSur(r.retour_ecran);
        return ecran ? redirection(ecran) : page(
          200,
          "Messagerie connectée",
          `${p.adresse} est connectée à Omega. Vous pouvez fermer cette page.`,
        );
      } catch (e) {
        deps.journal.erreur("connexion Gmail impossible", {
          erreur: String((e as Error)?.message ?? e).slice(0, 300),
        });
        if (renouvellement) {
          await deps.gmail.revoquer(renouvellement).catch(() => {});
        }
        return page(
          502,
          "Connexion impossible",
          "La messagerie n'a pas pu être connectée. Réessayez dans un instant ; si cela persiste, prévenez Omega.",
        );
      }
    }
    return page(404, "Page introuvable", "");
  };
}
