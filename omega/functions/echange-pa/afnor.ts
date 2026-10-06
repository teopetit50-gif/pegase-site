// Adaptateur de l'API normalisée AFNOR XP Z12-013 (annexe A, service « Flow »), que les
// plateformes agréées exposent aux opérateurs de dématérialisation. Écrit d'après les
// modèles publics de la norme (FlowInfo, Flow, SearchFlowParams, Acknowledgement) tels que
// les reprend le SDK public factpulse/sdk-go, en attendant la recommandation d'A4.
// Aucun appel réel tant qu'aucun compte PA n'est ouvert : les tests passent par un fetch doublé.
//
// Chemins relatifs à PA_FLOW_URL (la racine du service Flow chez la PA, version comprise) :
//   POST {racine}/flows                multipart : flowInfo (JSON) + file
//   POST {racine}/flows/search         {limit, where: {updatedAfter, …}}
//   GET  {racine}/flows/{flowId}?docType=Original
//   GET  {racine}/healthcheck
// Authentification OAuth2 « client credentials » (PA_TOKEN_URL, PA_CLIENT_ID,
// PA_CLIENT_SECRET, PA_SCOPE facultatif), jeton gardé jusqu'à une minute avant expiration.

import {
  type Accuse,
  definitivePourStatut,
  type DetailAccuse,
  ErreurPA,
  type Fichier,
  type FluxADeposer,
  type FluxDepose,
  type FluxReleve,
  type PlateformeAgreee,
} from "./pa.ts";

export type ConfigurationAfnor = {
  racine: string;
  jetonUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string | null;
};

type Objet = Record<string, unknown>;

function texte(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function accuseDepuis(statut: unknown): Accuse {
  if (statut === "Ok") return "ok";
  if (statut === "Error") return "erreur";
  return "en_attente";
}

function detailsDepuis(ack: unknown): DetailAccuse[] {
  const details = (ack as Objet | null)?.details;
  if (!Array.isArray(details)) return [];
  return details.map((d) => {
    const o = (d ?? {}) as Objet;
    return {
      niveau: texte(o.level),
      element: texte(o.item),
      code: texte(o.reasonCode),
      message: texte(o.reasonMessage),
    };
  });
}

/** Un `Flow` de la norme vers le vocabulaire de l'ouvrier. */
export function fluxDepuisAfnor(f: Objet): FluxReleve {
  const ack = f.acknowledgement as Objet | undefined;
  return {
    flux: String(f.flowId ?? ""),
    suivi: texte(f.trackingId),
    nom: String(f.name ?? ""),
    sens: f.flowDirection === "In" ? "entrant" : "sortant",
    type: String(f.flowType ?? ""),
    syntaxe: String(f.flowSyntax ?? ""),
    profil: texte(f.flowProfile),
    regle: texte(f.processingRule),
    depose_le: String(f.submittedAt ?? ""),
    maj_le: String(f.updatedAt ?? f.submittedAt ?? ""),
    accuse: accuseDepuis(ack?.status),
    details: detailsDepuis(ack),
  };
}

export function plateformeAfnor(
  config: ConfigurationAfnor,
  fetchImpl: typeof fetch = fetch,
  maintenant: () => number = Date.now,
): PlateformeAgreee {
  const racine = config.racine.replace(/\/+$/, "");
  let jeton: { valeur: string; expire: number } | null = null;

  async function appel(
    chemin: string,
    init: RequestInit,
    geste: string,
  ): Promise<Response> {
    let reponse: Response;
    try {
      reponse = await fetchImpl(`${racine}${chemin}`, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${await jetonAcces()}`,
        },
      });
    } catch (e) {
      if (e instanceof ErreurPA) throw e;
      throw new ErreurPA(0, `${geste} : réseau : ${String(e)}`, false);
    }
    if (reponse.status === 401) jeton = null; // jeton refusé : on en redemandera un
    if (!reponse.ok) {
      const corps = (await reponse.text()).slice(0, 500);
      throw new ErreurPA(
        reponse.status,
        `${geste} : HTTP ${reponse.status} ${corps}`,
        definitivePourStatut(reponse.status),
      );
    }
    return reponse;
  }

  async function jetonAcces(): Promise<string> {
    if (jeton && jeton.expire > maintenant()) return jeton.valeur;
    const corps = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
    if (config.scope) corps.set("scope", config.scope);
    let r: Response;
    try {
      r = await fetchImpl(config.jetonUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: corps,
      });
    } catch (e) {
      throw new ErreurPA(0, `jeton OAuth2 : réseau : ${String(e)}`, false);
    }
    if (!r.ok) {
      // Identifiants refusés : à corriger par un humain, jamais une raison d'abandonner la facture.
      throw new ErreurPA(
        r.status,
        `jeton OAuth2 : HTTP ${r.status} ${(await r.text()).slice(0, 300)}`,
        false,
      );
    }
    const j = await r.json() as Objet;
    const valeur = texte(j.access_token);
    if (!valeur) {
      throw new ErreurPA(r.status, "jeton OAuth2 : access_token absent", false);
    }
    const duree = typeof j.expires_in === "number" ? j.expires_in : 300;
    jeton = { valeur, expire: maintenant() + Math.max(0, duree - 60) * 1000 };
    return valeur;
  }

  return {
    nom: "afnor",

    async deposer(f: FluxADeposer): Promise<FluxDepose> {
      const info: Objet = {
        trackingId: f.suivi,
        name: f.nom,
        flowSyntax: f.syntaxe,
      };
      if (f.profil) info.flowProfile = f.profil;
      if (f.regle) info.processingRule = f.regle;
      info.sha256 = await sha256Hex(f.octets);
      const formulaire = new FormData();
      formulaire.append(
        "flowInfo",
        new Blob([JSON.stringify(info)], { type: "application/json" }),
      );
      formulaire.append(
        "file",
        new Blob([f.octets], { type: f.typeMime }),
        f.nom,
      );
      const r = await appel(
        "/flows",
        { method: "POST", body: formulaire },
        "dépôt",
      );
      const j = await r.json().catch(() => ({})) as Objet;
      const flux = texte(j.flowId);
      if (!flux) {
        // Accepté sans identifiant : on ne peut pas le suivre, on le traite comme une panne
        // passagère ; le trackingId rend le second dépôt reconnaissable par la PA.
        throw new ErreurPA(r.status, "dépôt : réponse sans flowId", false);
      }
      return {
        flux,
        depose_le: texte(j.submittedAt),
        sha256: texte(j.sha256) ?? (info.sha256 as string),
      };
    },

    async relever(depuis, limite) {
      const where: Objet = {};
      if (depuis) where.updatedAfter = depuis.toISOString();
      const r = await appel("/flows/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: limite, where }),
      }, "relevé");
      const j = await r.json() as Objet;
      const resultats = Array.isArray(j.results) ? j.results as Objet[] : [];
      return resultats.map(fluxDepuisAfnor)
        .filter((f) => f.flux !== "")
        .sort((a, b) => a.maj_le.localeCompare(b.maj_le));
    },

    async telecharger(flux): Promise<Fichier> {
      const r = await appel(
        `/flows/${encodeURIComponent(flux)}?docType=Original`,
        { method: "GET" },
        "téléchargement",
      );
      return {
        octets: new Uint8Array(await r.arrayBuffer()),
        typeMime: r.headers.get("content-type")?.split(";")[0].trim() ||
          "application/octet-stream",
      };
    },

    async sante() {
      try {
        await appel("/healthcheck", { method: "GET" }, "santé");
        return true;
      } catch {
        return false;
      }
    },
  };
}

export async function sha256Hex(
  octets: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", octets);
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Configuration lue dans l'environnement ; null tant que la PA n'est pas branchée. */
export function configurationAfnorDepuisEnvironnement():
  | ConfigurationAfnor
  | null {
  const lire = (n: string) => Deno.env.get(n)?.trim() || null;
  const racine = lire("PA_FLOW_URL");
  const jetonUrl = lire("PA_TOKEN_URL");
  const clientId = lire("PA_CLIENT_ID");
  const clientSecret = lire("PA_CLIENT_SECRET");
  if (!racine || !jetonUrl || !clientId || !clientSecret) return null;
  return { racine, jetonUrl, clientId, clientSecret, scope: lire("PA_SCOPE") };
}
