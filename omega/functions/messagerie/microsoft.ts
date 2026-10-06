// Adaptateur Microsoft 365 / Outlook.com (Microsoft Graph v1.0, plateforme d'identité Microsoft).
// Écrit d'après la documentation publique (6 octobre 2026) ; aucun appel réel tant que Teo n'a
// pas inscrit l'application (omega/GUIDE-MICROSOFT.md).
//   consentement : https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
//   jetons       : POST …/oauth2/v2.0/token (authorization_code, refresh_token) ; le jeton de
//                  renouvellement TOURNE : chaque renouvellement en rend un nouveau, reposé au Vault
//   profil       : GET /me?$select=mail,userPrincipalName
//   nouveautés   : GET /me/mailFolders/{dossier}/messages/delta?changeType=created
//                  (+ $filter=receivedDateTime ge … au premier tour) → @odata.nextLink / deltaLink
//   message brut : GET /me/messages/{id}/$value (MIME)
//   brouillon    : POST /me/messages, Content-Type text/plain, MIME en base64 (≈ 4 Mo au plus)
//   révocation   : aucun point de révocation pour une application tierce. On efface le Vault ;
//                  le client retire l'autorisation sur https://myapps.microsoft.com (compte pro)
//                  ou https://account.live.com/consent/Manage (compte personnel).
// Portées déléguées : offline_access, User.Read, Mail.ReadWrite (lecture + brouillons ; il n'y a
// pas chez Microsoft de portée « brouillons seulement »).
//
// Le curseur est une URL Graph (nextLink ou deltaLink), ou « depuis:<date ISO> » avant le premier
// tour. Seules les URL https://graph.microsoft.com/ sont suivies : le jeton ne part jamais ailleurs.

import {
  type Acces,
  ErreurMessagerie,
  type Messagerie,
} from "./fournisseur.ts";
import { octetsVersBase64 } from "./mime.ts";

const GRAPH = "https://graph.microsoft.com/v1.0";
const PREFIXE_GRAPH = "https://graph.microsoft.com/";

export const PORTEES_MICROSOFT = [
  "offline_access",
  "https://graph.microsoft.com/User.Read",
  "https://graph.microsoft.com/Mail.ReadWrite",
];
/** Portée sans laquelle la connexion ne sert à rien (relève et brouillons). */
const PORTEE_REQUISE = "mail.readwrite";

type Objet = Record<string, unknown>;

export type ConfigurationMicrosoft = {
  clientId: string;
  clientSecret: string;
  /** « common » : comptes professionnels et personnels. */
  tenant: string;
};

export function microsoft(
  config: ConfigurationMicrosoft,
  fetchImpl: typeof fetch = fetch,
  maintenant: () => number = Date.now,
): Messagerie {
  const identite = `https://login.microsoftonline.com/${
    encodeURIComponent(config.tenant)
  }/oauth2/v2.0`;

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
      r = await fetchImpl(`${identite}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: PORTEES_MICROSOFT.join(" "),
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
    // invalid_grant : jeton expiré (90 jours d'inactivité), révoqué, mot de passe changé ;
    // interaction_required : consentement retiré ou accès conditionnel. Un humain doit reconnecter.
    if (j.error === "invalid_grant" || j.error === "interaction_required") {
      throw new ErreurMessagerie(
        "JETON_REVOQUE",
        `${geste} : ${String(j.error)} ${
          String(j.error_description ?? "").split("\r\n")[0]
        }`.trim(),
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
    // invalid_client (secret faux ou expiré), unauthorized_client… : l'application est mal réglée.
    throw new ErreurMessagerie(
      "DEFINITIVE",
      `${geste} : ${String(j.error ?? r.status)} ${
        String(j.error_description ?? "").split("\r\n")[0]
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
    const duree = typeof j.expires_in === "number"
      ? j.expires_in
      : Number(j.expires_in) || 3600;
    const a: Acces = {
      jeton: valeur,
      expire_le: new Date(maintenant() + duree * 1000).toISOString(),
    };
    if (typeof j.refresh_token === "string" && j.refresh_token) {
      a.renouvellement = j.refresh_token;
    }
    return a;
  };

  const auth = (a: string) => ({ Authorization: `Bearer ${a}` });

  return {
    nom: "microsoft",
    portees: PORTEES_MICROSOFT,
    etiquetteParDefaut: "inbox",
    revocationDistante: false,

    urlConsentement(etat, retour) {
      const u = new URL(`${identite}/authorize`);
      u.searchParams.set("client_id", config.clientId);
      u.searchParams.set("response_type", "code");
      u.searchParams.set("redirect_uri", retour);
      u.searchParams.set("response_mode", "query");
      u.searchParams.set("scope", PORTEES_MICROSOFT.join(" "));
      u.searchParams.set("state", etat);
      // Le client choisit la boîte à connecter, même s'il est déjà connecté à un autre compte.
      u.searchParams.set("prompt", "select_account");
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
        throw new ErreurMessagerie(
          "DEFINITIVE",
          "Microsoft n'a pas rendu de jeton de renouvellement (portée offline_access refusée ?)",
        );
      }
      const portees = typeof j.scope === "string"
        ? j.scope.split(" ").filter(Boolean)
        : [];
      // Microsoft rend les portées sous forme courte ou longue selon le compte.
      if (
        !portees.some((p) =>
          p.toLowerCase().replace(/^.*\//, "") === PORTEE_REQUISE
        )
      ) {
        throw new ErreurMessagerie(
          "DEFINITIVE",
          "portée non accordée : Mail.ReadWrite",
        );
      }
      const a = acces(j);
      delete a.renouvellement;
      return { acces: a, renouvellement, portees };
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
      const j = await (await appel(
        `${GRAPH}/me?$select=mail,userPrincipalName`,
        { headers: auth(a) },
        "profil",
      )).json() as Objet;
      const adresse = typeof j.mail === "string" && j.mail
        ? j.mail
        : String(j.userPrincipalName ?? "");
      return {
        adresse: adresse.toLowerCase(),
        curseur: `depuis:${new Date(maintenant()).toISOString()}`,
      };
    },

    async nouveautes(a, curseur, dossier) {
      let url: string;
      if (curseur.startsWith("depuis:")) {
        const depuis = new Date(curseur.slice(7));
        if (isNaN(depuis.getTime())) {
          throw new ErreurMessagerie("CURSEUR_PERIME", "curseur illisible");
        }
        const u = new URL(
          `${GRAPH}/me/mailFolders/${
            encodeURIComponent(dossier)
          }/messages/delta`,
        );
        u.searchParams.set("changeType", "created");
        u.searchParams.set("$select", "id,isDraft,receivedDateTime");
        u.searchParams.set(
          "$filter",
          `receivedDateTime ge ${depuis.toISOString()}`,
        );
        url = u.toString();
      } else if (curseur.startsWith(PREFIXE_GRAPH)) {
        url = curseur;
      } else {
        throw new ErreurMessagerie("CURSEUR_PERIME", "curseur illisible");
      }

      const messages: { id: string; curseur: string }[] = [];
      const vus = new Set<string>();
      for (let n = 0; n < 20; n++) {
        let r: Response;
        try {
          r = await appel(url, {
            headers: { ...auth(a), Prefer: "odata.maxpagesize=50" },
          }, "delta");
        } catch (e) {
          // 410 Gone (resyncRequired) : le jeton delta a expiré ; 404 : dossier disparu.
          if (
            e instanceof ErreurMessagerie &&
            (e.statut === 410 ||
              (e.statut === 400 && /syncstate|resync/i.test(e.message)))
          ) {
            throw new ErreurMessagerie(
              "CURSEUR_PERIME",
              "jeton delta Microsoft expiré",
              e.statut,
            );
          }
          throw e;
        }
        const j = await r.json() as Objet;
        for (
          const m of (Array.isArray(j.value) ? j.value : []) as Objet[]
        ) {
          const id = typeof m.id === "string" ? m.id : null;
          // Retraits du dossier et brouillons : pas des réceptions.
          if (!id || "@removed" in m || m.isDraft === true || vus.has(id)) {
            continue;
          }
          vus.add(id);
          // Reprendre à cette page redonne ce message : deposer_reception est idempotente.
          messages.push({ id, curseur: url });
        }
        const suivant = j["@odata.nextLink"];
        const fin = j["@odata.deltaLink"];
        if (typeof fin === "string" && fin.startsWith(PREFIXE_GRAPH)) {
          return { messages, curseur: fin };
        }
        if (typeof suivant !== "string" || !suivant.startsWith(PREFIXE_GRAPH)) {
          throw new ErreurMessagerie(
            "TRANSITOIRE",
            "réponse delta sans nextLink ni deltaLink",
          );
        }
        url = suivant;
      }
      // Beaucoup de pages : on reprendra au prochain passage là où on s'est arrêté.
      return { messages, curseur: url };
    },

    async lireBrut(a, id) {
      const r = await appel(
        `${GRAPH}/me/messages/${encodeURIComponent(id)}/$value`,
        { headers: auth(a) },
        "lecture du message",
      );
      return new Uint8Array(await r.arrayBuffer());
    },

    async creerBrouillon(a, brut) {
      const r = await appel(`${GRAPH}/me/messages`, {
        method: "POST",
        headers: { ...auth(a), "Content-Type": "text/plain" },
        body: octetsVersBase64(brut),
      }, "brouillon");
      const j = await r.json() as Objet;
      if (typeof j.id !== "string") {
        throw new ErreurMessagerie(
          "TRANSITOIRE",
          "brouillon créé sans identifiant",
        );
      }
      return {
        brouillon: j.id,
        message: typeof j.internetMessageId === "string"
          ? j.internetMessageId
          : null,
      };
    },

    revoquer() {
      // Rien à appeler : voir l'en-tête. Le Vault est déjà vidé par messagerie_oublier.
      return Promise.resolve();
    },
  };
}

export function configurationMicrosoftDepuisEnvironnement():
  | ConfigurationMicrosoft
  | null {
  const id = Deno.env.get("MICROSOFT_CLIENT_ID")?.trim();
  const secret = Deno.env.get("MICROSOFT_CLIENT_SECRET")?.trim();
  const tenant = Deno.env.get("MICROSOFT_TENANT")?.trim() || "common";
  return id && secret ? { clientId: id, clientSecret: secret, tenant } : null;
}
