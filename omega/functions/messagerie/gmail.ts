// Adaptateur Gmail (API Gmail v1, OAuth 2.0 de Google). Écrit d'après la documentation publique ;
// aucun appel réel tant que Teo n'a pas créé l'application Google (omega/GUIDE-GMAIL.md).
//   consentement : https://accounts.google.com/o/oauth2/v2/auth (access_type=offline, prompt=consent)
//   jetons       : POST https://oauth2.googleapis.com/token (authorization_code, refresh_token)
//   révocation   : POST https://oauth2.googleapis.com/revoke
//   profil       : GET  users/me/profile → emailAddress, historyId
//   nouveautés   : GET  users/me/history?startHistoryId=…&historyTypes=messageAdded&labelId=…
//   message brut : GET  users/me/messages/{id}?format=raw
//   brouillon    : POST users/me/drafts {message: {raw}}
// Portées : gmail.readonly (relevé) et gmail.compose (brouillons) — « restreintes » chez Google :
// vérification de l'application et évaluation de sécurité annuelle avant toute mise en production.

import {
  type Acces,
  ErreurMessagerie,
  type Messagerie,
} from "./fournisseur.ts";
import { base64url, depuisBase64url } from "./mime.ts";

export const PORTEES_GMAIL = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
];

const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const JETON = "https://oauth2.googleapis.com/token";

type Objet = Record<string, unknown>;

export type ConfigurationGoogle = { clientId: string; clientSecret: string };

export function gmail(
  config: ConfigurationGoogle,
  fetchImpl: typeof fetch = fetch,
  maintenant: () => number = Date.now,
): Messagerie {
  async function appel(
    url: string,
    init: RequestInit,
    geste: string,
  ): Promise<Response> {
    let r: Response;
    try {
      r = await fetchImpl(url, init);
    } catch (e) {
      throw new ErreurMessagerie(
        "TRANSITOIRE",
        `${geste} : réseau : ${String(e)}`,
      );
    }
    if (r.ok) return r;
    const corps = (await r.text()).slice(0, 400);
    if (r.status === 401) {
      throw new ErreurMessagerie(
        "TRANSITOIRE",
        `${geste} : jeton d'accès refusé (401)`,
        401,
      );
    }
    if (r.status === 429 || r.status >= 500) {
      throw new ErreurMessagerie(
        "TRANSITOIRE",
        `${geste} : HTTP ${r.status} ${corps}`,
        r.status,
      );
    }
    throw new ErreurMessagerie(
      "DEFINITIVE",
      `${geste} : HTTP ${r.status} ${corps}`,
      r.status,
    );
  }

  async function jeton(
    params: Record<string, string>,
    geste: string,
  ): Promise<Objet> {
    let r: Response;
    try {
      r = await fetchImpl(JETON, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          ...params,
        }),
      });
    } catch (e) {
      throw new ErreurMessagerie(
        "TRANSITOIRE",
        `${geste} : réseau : ${String(e)}`,
      );
    }
    const j = await r.json().catch(() => ({})) as Objet;
    if (r.ok) return j;
    // invalid_grant : jeton de renouvellement révoqué ou expiré (7 jours en mode « Test »).
    if (j.error === "invalid_grant") {
      throw new ErreurMessagerie(
        "JETON_REVOQUE",
        `${geste} : ${j.error_description ?? "invalid_grant"}`,
        r.status,
      );
    }
    if (r.status >= 500 || r.status === 429) {
      throw new ErreurMessagerie(
        "TRANSITOIRE",
        `${geste} : HTTP ${r.status}`,
        r.status,
      );
    }
    // invalid_client, unauthorized_client… : l'application Google elle-même est mal réglée.
    throw new ErreurMessagerie(
      "DEFINITIVE",
      `${geste} : ${String(j.error ?? r.status)} ${
        String(j.error_description ?? "")
      }`.trim(),
      r.status,
    );
  }

  const acces = (j: Objet): Acces => {
    const valeur = typeof j.access_token === "string" ? j.access_token : "";
    if (!valeur) {
      throw new ErreurMessagerie(
        "TRANSITOIRE",
        "réponse de jeton sans access_token",
      );
    }
    const duree = typeof j.expires_in === "number" ? j.expires_in : 3600;
    return {
      jeton: valeur,
      expire_le: new Date(maintenant() + duree * 1000).toISOString(),
    };
  };

  const auth = (a: string) => ({ Authorization: `Bearer ${a}` });

  return {
    nom: "gmail",
    portees: PORTEES_GMAIL,

    urlConsentement(etat, retour) {
      const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      u.searchParams.set("client_id", config.clientId);
      u.searchParams.set("redirect_uri", retour);
      u.searchParams.set("response_type", "code");
      u.searchParams.set("scope", PORTEES_GMAIL.join(" "));
      u.searchParams.set("access_type", "offline");
      u.searchParams.set("prompt", "consent");
      u.searchParams.set("include_granted_scopes", "true");
      u.searchParams.set("state", etat);
      return u.toString();
    },

    async echangerCode(code, retour) {
      const j = await jeton({
        grant_type: "authorization_code",
        code,
        redirect_uri: retour,
      }, "échange du code");
      const renouvellement = typeof j.refresh_token === "string"
        ? j.refresh_token
        : "";
      if (!renouvellement) {
        // Sans refresh_token, impossible de relever en tâche de fond : on refuse la connexion.
        throw new ErreurMessagerie(
          "DEFINITIVE",
          "Google n'a pas rendu de jeton de renouvellement (consentement hors ligne refusé ?)",
        );
      }
      const portees = typeof j.scope === "string" ? j.scope.split(" ") : [];
      for (const p of PORTEES_GMAIL) {
        if (!portees.includes(p)) {
          throw new ErreurMessagerie(
            "DEFINITIVE",
            `portée non accordée : ${p}`,
          );
        }
      }
      return { acces: acces(j), renouvellement, portees };
    },

    async renouveler(renouvellement) {
      return acces(
        await jeton({
          grant_type: "refresh_token",
          refresh_token: renouvellement,
        }, "renouvellement"),
      );
    },

    async profil(a) {
      const j =
        await (await appel(`${API}/profile`, { headers: auth(a) }, "profil"))
          .json() as Objet;
      return {
        adresse: String(j.emailAddress ?? "").toLowerCase(),
        curseur: String(j.historyId ?? ""),
      };
    },

    async nouveautes(a, curseur, etiquette) {
      const messages: { id: string; curseur: string }[] = [];
      const vus = new Set<string>();
      let page: string | null = null;
      let dernier = curseur;
      for (let n = 0; n < 20; n++) {
        const u = new URL(`${API}/history`);
        u.searchParams.set("startHistoryId", curseur);
        u.searchParams.set("historyTypes", "messageAdded");
        u.searchParams.set("labelId", etiquette);
        u.searchParams.set("maxResults", "500");
        if (page) u.searchParams.set("pageToken", page);
        let r: Response;
        try {
          r = await appel(u.toString(), { headers: auth(a) }, "historique");
        } catch (e) {
          // 404 sur l'historique : le startHistoryId est trop ancien.
          if (e instanceof ErreurMessagerie && e.statut === 404) {
            throw new ErreurMessagerie(
              "CURSEUR_PERIME",
              "historique Gmail expiré pour ce curseur",
              404,
            );
          }
          throw e;
        }
        const j = await r.json() as Objet;
        for (
          const h of (Array.isArray(j.history) ? j.history : []) as Objet[]
        ) {
          const enregistrement = typeof h.id === "string" ? h.id : null;
          for (
            const ajout of (Array.isArray(h.messagesAdded)
              ? h.messagesAdded
              : []) as Objet[]
          ) {
            const m = ajout.message as Objet | undefined;
            const id = typeof m?.id === "string" ? m.id : null;
            const etiquettes = Array.isArray(m?.labelIds)
              ? m!.labelIds as string[]
              : [];
            // Brouillons et messages envoyés par la boîte elle-même : pas des réceptions.
            if (
              !id || vus.has(id) || etiquettes.includes("DRAFT") ||
              etiquettes.includes("SENT")
            ) {
              continue;
            }
            vus.add(id);
            messages.push({ id, curseur: enregistrement ?? curseur });
          }
        }
        if (typeof j.historyId === "string") dernier = j.historyId;
        page = typeof j.nextPageToken === "string" ? j.nextPageToken : null;
        if (!page) break;
      }
      return { messages, curseur: dernier };
    },

    async lireBrut(a, id) {
      const r = await appel(
        `${API}/messages/${encodeURIComponent(id)}?format=raw`,
        { headers: auth(a) },
        "lecture du message",
      );
      const j = await r.json() as Objet;
      if (typeof j.raw !== "string") {
        throw new ErreurMessagerie(
          "DEFINITIVE",
          `message ${id} sans contenu brut`,
        );
      }
      return depuisBase64url(j.raw);
    },

    async creerBrouillon(a, brut) {
      const r = await appel(`${API}/drafts`, {
        method: "POST",
        headers: { ...auth(a), "Content-Type": "application/json" },
        body: JSON.stringify({ message: { raw: base64url(brut) } }),
      }, "brouillon");
      const j = await r.json() as Objet;
      const m = j.message as Objet | undefined;
      if (typeof j.id !== "string") {
        throw new ErreurMessagerie(
          "TRANSITOIRE",
          "brouillon créé sans identifiant",
        );
      }
      return {
        brouillon: j.id,
        message: typeof m?.id === "string" ? m.id : null,
      };
    },

    async revoquer(t) {
      const r = await fetchImpl("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: t }),
      }).catch((e) => {
        throw new ErreurMessagerie(
          "TRANSITOIRE",
          `révocation : réseau : ${String(e)}`,
        );
      });
      // 400 invalid_token : déjà révoqué, c'est le résultat voulu.
      if (!r.ok && r.status !== 400) {
        throw new ErreurMessagerie(
          "TRANSITOIRE",
          `révocation : HTTP ${r.status}`,
          r.status,
        );
      }
      await r.body?.cancel();
    },
  };
}

export function configurationGoogleDepuisEnvironnement():
  | ConfigurationGoogle
  | null {
  const id = Deno.env.get("GOOGLE_CLIENT_ID")?.trim();
  const secret = Deno.env.get("GOOGLE_CLIENT_SECRET")?.trim();
  return id && secret ? { clientId: id, clientSecret: secret } : null;
}
