// Client WhatsApp Cloud API (Meta, Graph v21.0) : canal « whatsapp », fournisseur « meta_whatsapp ».
// D'après la documentation de Meta (developers.facebook.com/docs/whatsapp/cloud-api, lue le 11/10/2026) :
//   · POST /{phone_number_id}/messages, jeton « Bearer » (META_ACCESS_TOKEN ou coffre), réponse
//     { messages: [{ id: "wamid…" }] } : le wamid est la référence de l'envoi, celle que les statuts
//     (sent, delivered, read, failed) reprennent dans le webhook ;
//   · un texte libre ne part que dans les 24 h qui suivent le dernier message du destinataire ; au-delà,
//     seul un modèle approuvé passe (erreur 131047) ;
//   · POST /{phone_number_id}/media (multipart : messaging_product, type, file) → { id } pour une pièce.
// Erreurs : { error: { message, type, code, error_subcode, fbtrace_id } }.

export type ComposantModele = Record<string, unknown>;

export type MessageWhatsApp =
  & { to: string }
  & (
    | { type: "text"; text: { body: string; preview_url: boolean } }
    | {
      type: "template";
      template: {
        name: string;
        language: { code: string };
        components?: ComposantModele[];
      };
    }
    | {
      type: "document";
      document: { id: string; filename: string; caption?: string };
    }
  );

export interface ClientWhatsApp {
  /** Téléverse une pièce, rend l'id du média. */
  televerser(octets: Uint8Array, mime: string, nom: string): Promise<string>;
  /** Envoie un message, rend le wamid. */
  envoyer(message: MessageWhatsApp): Promise<string>;
}

/** Codes Meta qui disent « réessayez plus tard » (débit, plafond, jeton à renouveler, panne passagère). */
const CODES_TRANSITOIRES = new Set([
  1, // erreur inconnue de l'API
  2, // service indisponible
  4, // trop d'appels de l'application
  17, // trop d'appels de l'utilisateur
  80007, // débit du compte WhatsApp Business
  130429, // débit de l'API Cloud
  131000, // erreur interne
  131016, // service surchargé
  131048, // plafond anti-spam
  131056, // trop de messages vers ce numéro
  133004, // serveur indisponible
  190, // jeton expiré ou révoqué : l'envoi attend un nouveau jeton
]);

export class ErreurMeta extends Error {
  constructor(
    public readonly statut: number,
    public readonly code: number | null,
    public readonly corps: string,
    public readonly definitif: boolean,
  ) {
    super(
      `Meta HTTP ${statut}${code !== null ? ` code ${code}` : ""} : ${
        corps.slice(0, 300)
      }`,
    );
    this.name = "ErreurMeta";
  }
}

/** 131047 (hors fenêtre de 24 h), 131026 (numéro injoignable), modèle inconnu… : la rejouer ne sert à rien. */
export function definitifMeta(statut: number, code: number | null): boolean {
  if (statut === 0 || statut >= 500 || statut === 429 || statut === 408) {
    return false;
  }
  if (code !== null && CODES_TRANSITOIRES.has(code)) return false;
  return statut >= 400;
}

export function clientWhatsApp(
  phoneNumberId: string,
  jeton: string,
  fetchImpl: typeof fetch = fetch,
  base = "https://graph.facebook.com/v21.0",
): ClientWhatsApp {
  const racine = `${base.replace(/\/+$/, "")}/${
    encodeURIComponent(phoneNumberId)
  }`;

  async function appeler(
    chemin: string,
    corps: BodyInit,
    json: boolean,
  ): Promise<Record<string, unknown>> {
    let r: Response;
    try {
      r = await fetchImpl(`${racine}${chemin}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jeton}`,
          ...(json ? { "Content-Type": "application/json" } : {}),
        },
        body: corps,
      });
    } catch (e) {
      throw new ErreurMeta(0, null, `réseau : ${String(e)}`, false);
    }
    const texte = await r.text();
    let o: Record<string, unknown> = {};
    try {
      o = JSON.parse(texte);
    } catch {
      // corps non JSON : traité plus bas
    }
    if (!r.ok) {
      const err = (o.error ?? {}) as Record<string, unknown>;
      const code = typeof err.code === "number" ? err.code : null;
      throw new ErreurMeta(
        r.status,
        code,
        texte,
        definitifMeta(r.status, code),
      );
    }
    return o;
  }

  return {
    async televerser(octets, mime, nom) {
      const type = mime || "application/octet-stream";
      const f = new FormData();
      f.set("messaging_product", "whatsapp");
      f.set("type", type);
      f.set("file", new File([octets as BlobPart], nom, { type }));
      const o = await appeler("/media", f, false);
      if (typeof o.id !== "string" || !o.id) {
        throw new ErreurMeta(
          200,
          null,
          `média sans id : ${JSON.stringify(o)}`,
          false,
        );
      }
      return o.id;
    },
    async envoyer(message) {
      const o = await appeler(
        "/messages",
        JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          ...message,
        }),
        true,
      );
      const id = (o.messages as { id?: unknown }[] | undefined)?.[0]?.id;
      if (typeof id !== "string" || !id) {
        throw new ErreurMeta(
          200,
          null,
          `message sans wamid : ${JSON.stringify(o)}`,
          false,
        );
      }
      return id;
    },
  };
}
