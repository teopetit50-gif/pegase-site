// Faux serveur AFNOR XP Z12-013 (service Flow + jeton OAuth2) : le bac à sable de l'ouvrier
// echange-pa, tant qu'aucune PA n'a ouvert de compte à Omega. Il répond comme une PA :
//   POST …/oauth/token                 grant_type=client_credentials
//   GET  …/flow/v1/healthcheck
//   POST …/flow/v1/flows               multipart flowInfo + file → 202 FullFlowInfo
//   POST …/flow/v1/flows/search        {limit, where: {updatedAfter, flowDirection, …}}
//   GET  …/flow/v1/flows/{flowId}?docType=Metadata|Original
// et, propre au bac à sable, pour simuler ce qu'une PA reçoit des autres :
//   POST …/_bac/entrant                {name, flowSyntax, flowType, contenu | contenu_base64, mime}
//                                      → un flux entrant (facture fournisseur, statut CDAR)
// Comportement simulé : un dépôt dont le fichier contient « REJET-BAC » est accusé en erreur
// (REJ_SEMAN) ; sinon accusé « Ok ». Rejouer le même trackingId rend le même flux.
// Ce n'est PAS une PA : aucune validation Factur-X / UBL / CDAR, aucun routage.

import type { Depot, FluxBac } from "./depot.ts";

export type Configuration = {
  depot: Depot;
  clientId: string;
  clientSecret: string;
  /** Clé HMAC des jetons (sans état : le jeton porte son expiration). */
  cleJetons: string;
  dureeJeton?: number;
  maintenant?: () => Date;
  nouvelId?: () => string;
};

const SYNTAXES = new Set(["CII", "UBL", "Factur-X", "CDAR", "FRR"]);
const PROFILS = new Set(["Basic", "CIUS", "Extended-CTC-FR"]);

function erreur(statut: number, code: string, message: string): Response {
  return Response.json({ errorCode: code, errorMessage: message }, {
    status: statut,
  });
}

async function hmacHex(cle: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(cle),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const s = await crypto.subtle.sign(
    "HMAC",
    k,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(s), (b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(octets: Uint8Array<ArrayBuffer>): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", octets);
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Type de flux sortant selon la syntaxe : une facture client, ou son cycle de vie. */
function typeSortant(syntaxe: string): string {
  return syntaxe === "CDAR" ? "CustomerInvoiceLC" : "CustomerInvoice";
}

export function creerBacASable(
  c: Configuration,
): (req: Request) => Promise<Response> {
  const maintenant = c.maintenant ?? (() => new Date());
  const nouvelId = c.nouvelId ?? (() => crypto.randomUUID());
  const duree = c.dureeJeton ?? 3600;

  async function jetonValide(req: Request): Promise<boolean> {
    const m = (req.headers.get("authorization") ?? "").match(
      /^Bearer\s+(\d+)\.([0-9a-f]{64})$/i,
    );
    if (!m) return false;
    if (Number(m[1]) * 1000 < maintenant().getTime()) return false;
    return egal(m[2].toLowerCase(), await hmacHex(c.cleJetons, m[1]));
  }

  async function jeton(req: Request): Promise<Response> {
    const corps = new URLSearchParams(await req.text());
    if (corps.get("grant_type") !== "client_credentials") {
      return Response.json({ error: "unsupported_grant_type" }, {
        status: 400,
      });
    }
    if (
      !egal(corps.get("client_id") ?? "", c.clientId) ||
      !egal(corps.get("client_secret") ?? "", c.clientSecret)
    ) {
      return Response.json({ error: "invalid_client" }, { status: 401 });
    }
    const exp = String(Math.floor(maintenant().getTime() / 1000) + duree);
    return Response.json({
      access_token: `${exp}.${await hmacHex(c.cleJetons, exp)}`,
      token_type: "Bearer",
      expires_in: duree,
    });
  }

  async function deposer(req: Request): Promise<Response> {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return erreur(
        400,
        "BAD_REQUEST",
        "multipart/form-data attendu (flowInfo, file)",
      );
    }
    const brut = form.get("flowInfo");
    const fichier = form.get("file");
    if (!brut || !(fichier instanceof Blob)) {
      return erreur(400, "BAD_REQUEST", "flowInfo et file sont obligatoires");
    }
    let info: Record<string, unknown>;
    try {
      info = JSON.parse(typeof brut === "string" ? brut : await brut.text());
    } catch {
      return erreur(400, "BAD_REQUEST", "flowInfo n'est pas du JSON");
    }
    const nom = typeof info.name === "string" ? info.name : "";
    const syntaxe = String(info.flowSyntax ?? "");
    if (!nom) return erreur(400, "BAD_REQUEST", "flowInfo.name obligatoire");
    if (!SYNTAXES.has(syntaxe)) {
      return erreur(400, "BAD_REQUEST", `flowSyntax inconnue : ${syntaxe}`);
    }
    if (
      info.flowProfile !== undefined && !PROFILS.has(String(info.flowProfile))
    ) {
      return erreur(
        400,
        "BAD_REQUEST",
        `flowProfile inconnu : ${info.flowProfile}`,
      );
    }
    const octets = new Uint8Array(await fichier.arrayBuffer());
    if (octets.length === 0) return erreur(400, "BAD_REQUEST", "fichier vide");
    if (octets.length > 10 * 1024 * 1024) {
      return erreur(
        413,
        "PAYLOAD_TOO_LARGE",
        "10 Mo au plus dans le bac à sable",
      );
    }
    const sha = await sha256Hex(octets);
    if (typeof info.sha256 === "string" && info.sha256.toLowerCase() !== sha) {
      return erreur(400, "BAD_REQUEST", "sha256 ne correspond pas au fichier");
    }
    const suivi = typeof info.trackingId === "string"
      ? info.trackingId
      : undefined;
    if (suivi) {
      const deja = (await c.depot.listerFlux()).find((f) =>
        f.flowDirection === "Out" && f.trackingId === suivi
      );
      if (deja) return Response.json(infoComplete(deja), { status: 202 });
    }
    const quand = maintenant().toISOString();
    const rejet = new TextDecoder().decode(octets).includes("REJET-BAC");
    const flux: FluxBac = {
      flowId: nouvelId(),
      trackingId: suivi,
      name: nom,
      processingRule: typeof info.processingRule === "string"
        ? info.processingRule
        : "B2B",
      flowSyntax: syntaxe,
      flowProfile: typeof info.flowProfile === "string"
        ? info.flowProfile
        : undefined,
      sha256: sha,
      submittedAt: quand,
      updatedAt: quand,
      flowType: typeSortant(syntaxe),
      processingRuleSource: typeof info.processingRule === "string"
        ? "Input"
        : "Computed",
      flowDirection: "Out",
      acknowledgement: rejet
        ? {
          status: "Error",
          details: [{
            level: "Error",
            item: "BT-1",
            reasonCode: "REJ_SEMAN",
            reasonMessage: "rejet simulé par le bac à sable (REJET-BAC)",
          }],
        }
        : { status: "Ok" },
      mime: fichier.type || "application/octet-stream",
    };
    await c.depot.ecrireFichier(flux.flowId, octets, flux.mime);
    await c.depot.ecrireFlux(flux);
    return Response.json(infoComplete(flux), { status: 202 });
  }

  async function chercher(req: Request): Promise<Response> {
    let p: { limit?: number; where?: Record<string, unknown> };
    try {
      p = await req.json();
    } catch {
      return erreur(400, "BAD_REQUEST", "corps JSON attendu");
    }
    const w = p.where ?? {};
    const limite = Math.min(Math.max(Number(p.limit ?? 25), 1), 1000);
    const apres = typeof w.updatedAfter === "string"
      ? Date.parse(w.updatedAfter)
      : null;
    const avant = typeof w.updatedBefore === "string"
      ? Date.parse(w.updatedBefore)
      : null;
    const sens = Array.isArray(w.flowDirection)
      ? w.flowDirection as string[]
      : null;
    const types = Array.isArray(w.flowType) ? w.flowType as string[] : null;
    const resultats = (await c.depot.listerFlux())
      .filter((f) => apres === null || Date.parse(f.updatedAt) > apres)
      .filter((f) => avant === null || Date.parse(f.updatedAt) <= avant)
      .filter((f) => !sens || sens.includes(f.flowDirection))
      .filter((f) => !types || types.includes(f.flowType))
      .filter((f) =>
        typeof w.trackingId !== "string" || f.trackingId === w.trackingId
      )
      .filter((f) =>
        typeof w.ackStatus !== "string" ||
        f.acknowledgement.status === w.ackStatus
      )
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .slice(0, limite)
      .map(fluxPublic);
    return Response.json({ limit: limite, filters: w, results: resultats });
  }

  async function telecharger(id: string, url: URL): Promise<Response> {
    const f = await c.depot.lireFlux(id);
    if (!f) return erreur(404, "NOT_FOUND", `flux ${id} inconnu`);
    const forme = url.searchParams.get("docType") ?? "Metadata";
    if (forme === "Metadata") return Response.json(fluxPublic(f));
    if (forme !== "Original") {
      return erreur(
        404,
        "NOT_FOUND",
        `docType ${forme} non produit par le bac à sable`,
      );
    }
    const octets = await c.depot.lireFichier(id);
    if (!octets) {
      return erreur(404, "NOT_FOUND", `fichier du flux ${id} absent`);
    }
    return new Response(octets, { headers: { "Content-Type": f.mime } });
  }

  async function entrant(req: Request): Promise<Response> {
    let p: Record<string, unknown>;
    try {
      p = await req.json();
    } catch {
      return erreur(400, "BAD_REQUEST", "corps JSON attendu");
    }
    const syntaxe = String(p.flowSyntax ?? "UBL");
    if (!SYNTAXES.has(syntaxe)) {
      return erreur(400, "BAD_REQUEST", `flowSyntax inconnue : ${syntaxe}`);
    }
    const octets = typeof p.contenu_base64 === "string"
      ? Uint8Array.from(atob(p.contenu_base64), (ch) => ch.charCodeAt(0))
      : new TextEncoder().encode(String(p.contenu ?? ""));
    if (octets.length === 0) return erreur(400, "BAD_REQUEST", "contenu vide");
    const quand = maintenant().toISOString();
    const flux: FluxBac = {
      flowId: nouvelId(),
      name: String(
        p.name ?? (syntaxe === "CDAR" ? "statut.xml" : "facture.xml"),
      ),
      processingRule: "B2B",
      flowSyntax: syntaxe,
      sha256: await sha256Hex(octets as Uint8Array<ArrayBuffer>),
      submittedAt: quand,
      updatedAt: quand,
      flowType: String(
        p.flowType ??
          (syntaxe === "CDAR" ? "CustomerInvoiceLC" : "SupplierInvoice"),
      ),
      processingRuleSource: "Computed",
      flowDirection: "In",
      acknowledgement: { status: "Ok" },
      mime: String(
        p.mime ??
          (syntaxe === "Factur-X" ? "application/pdf" : "application/xml"),
      ),
    };
    await c.depot.ecrireFichier(
      flux.flowId,
      octets as Uint8Array<ArrayBuffer>,
      flux.mime,
    );
    await c.depot.ecrireFlux(flux);
    return Response.json(fluxPublic(flux), { status: 201 });
  }

  return async (req: Request) => {
    const url = new URL(req.url);
    const chemin = url.pathname;
    const i = chemin.search(/\/(oauth\/token|flow\/v1\/|_bac\/)/);
    const route = i >= 0 ? chemin.slice(i) : chemin;
    try {
      if (route === "/oauth/token" && req.method === "POST") {
        return await jeton(req);
      }
      if (!(await jetonValide(req))) {
        return erreur(401, "UNAUTHORIZED", "jeton absent, faux ou expiré");
      }
      if (route === "/flow/v1/healthcheck" && req.method === "GET") {
        return Response.json({ status: "UP", bac_a_sable: true });
      }
      if (route === "/flow/v1/flows" && req.method === "POST") {
        return await deposer(req);
      }
      if (route === "/flow/v1/flows/search" && req.method === "POST") {
        return await chercher(req);
      }
      const m = route.match(/^\/flow\/v1\/flows\/([^/]+)$/);
      if (m && req.method === "GET") {
        return await telecharger(decodeURIComponent(m[1]), url);
      }
      if (route === "/_bac/entrant" && req.method === "POST") {
        return await entrant(req);
      }
      return erreur(404, "NOT_FOUND", `${req.method} ${route}`);
    } catch (e) {
      return erreur(
        500,
        "INTERNAL",
        String((e as Error)?.message ?? e).slice(0, 300),
      );
    }
  };
}

/** Le flux tel que la norme le rend (sans le champ propre au bac à sable). */
function fluxPublic(f: FluxBac): Omit<FluxBac, "mime"> {
  const { mime: _mime, ...reste } = f;
  return reste;
}

function infoComplete(f: FluxBac) {
  return {
    flowId: f.flowId,
    submittedAt: f.submittedAt,
    trackingId: f.trackingId,
    name: f.name,
    processingRule: f.processingRule,
    flowSyntax: f.flowSyntax,
    flowProfile: f.flowProfile,
    sha256: f.sha256,
  };
}
