// Client AR24 : lettre recommandée électronique (LRE), canal « lre », fournisseur « ar24 ».
// D'après la documentation publique d'AR24 (developers.ar24.fr/doc, lue le 11/10/2026) :
//   · chaque appel porte token et date (« YYYY-MM-DD hh:mm:ss », heure de Paris, valable 10 minutes) et un en-tête
//     « signature » = AES-256-CBC(date), clé = les 32 premiers caractères de hex(SHA-256(clé privée)), IV = les 16
//     premiers caractères de hex(SHA-256(hex(SHA-256(clé privée)))), sortie en base64 (comme openssl_encrypt de PHP) ;
//   · une réponse réussie est chiffrée : AES-256-CBC, clé = 32 premiers caractères de hex(SHA-256(date + clé privée)),
//     même IV ; une erreur ne l'est pas ;
//   · POST /api/attachment (multipart : file, id_user) → file_id ; POST /api/mail (id_user, to_email, dest_statut,
//     to_firstname/to_lastname ou to_company, content, attachment[i], eidas, ref_dossier…) → result.id.
// Sans authentification eIDAS (OTP), une LRE eIDAS reste un brouillon « to_valid » à valider par l'expéditeur sur
// AR24 dans les 7 jours : c'est voulu (une mise en demeure garde une main humaine), voir NOTES-A2.

export type AccesAr24 = { token: string; clePrivee: string };

export type MailAr24 = {
  id_user: string;
  to_email: string;
  dest_statut: "particulier" | "professionnel";
  to_firstname?: string;
  to_lastname?: string;
  to_company?: string;
  content: string;
  eidas: "0" | "1";
  ref_dossier?: string;
  ref_client?: string;
  /** URL appelée par AR24 à chaque changement d'état (sinon celle réglée chez AR24). */
  webhook?: string;
  pieces: string[];
};

export interface ClientAr24 {
  televerser(
    idUser: string,
    nom: string,
    octets: Uint8Array,
    mime: string,
  ): Promise<string>;
  envoyer(mail: MailAr24): Promise<{ id: string; statut: string | null }>;
  /** GET /mail?id= : l'objet LRE tel qu'AR24 le connaît (statut, dates, preuves). */
  lire(id: string): Promise<Record<string, unknown>>;
}

export class ErreurAr24 extends Error {
  constructor(
    public readonly statut: number,
    public readonly corps: string,
    public readonly definitif: boolean,
  ) {
    super(`AR24 HTTP ${statut} : ${corps.slice(0, 300)}`);
    this.name = "ErreurAr24";
  }
}

const enc = new TextEncoder();

async function hexSha256(texte: string): Promise<string> {
  const h = new Uint8Array(
    await crypto.subtle.digest("SHA-256", enc.encode(texte)),
  );
  return Array.from(h, (o) => o.toString(16).padStart(2, "0")).join("");
}

function base64(octets: Uint8Array): string {
  let s = "";
  for (const o of octets) s += String.fromCharCode(o);
  return btoa(s);
}

/** Clé et IV « à la PHP » : des caractères hexadécimaux pris comme octets. */
async function cleEtIv(
  clePrivee: string,
  graine: string,
): Promise<{ cle: CryptoKey; iv: Uint8Array<ArrayBuffer> }> {
  const hashe = await hexSha256(clePrivee);
  const iv = enc.encode((await hexSha256(hashe)).slice(0, 16));
  const brute = enc.encode((await hexSha256(graine)).slice(0, 32));
  const cle = await crypto.subtle.importKey(
    "raw",
    brute,
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"],
  );
  return { cle, iv };
}

export async function signatureAr24(
  date: string,
  clePrivee: string,
): Promise<string> {
  const { cle, iv } = await cleEtIv(clePrivee, clePrivee);
  return base64(
    new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-CBC", iv },
        cle,
        enc.encode(date),
      ),
    ),
  );
}

/** L'inverse de dechiffrerAr24 (ce que fait le serveur d'AR24) : sert aux doubles de test. */
export async function chiffrerAr24(
  clair: string,
  date: string,
  clePrivee: string,
): Promise<string> {
  const { cle, iv } = await cleEtIv(clePrivee, date + clePrivee);
  return base64(
    new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-CBC", iv },
        cle,
        enc.encode(clair),
      ),
    ),
  );
}

export async function dechiffrerAr24(
  chiffre: string,
  date: string,
  clePrivee: string,
): Promise<string> {
  const { cle, iv } = await cleEtIv(clePrivee, date + clePrivee);
  const octets = Uint8Array.from(atob(chiffre.trim()), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(
    await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cle, octets),
  );
}

/** « YYYY-MM-DD hh:mm:ss » à l'heure de Paris (le serveur d'AR24). */
export function dateAr24(instant: Date): string {
  const p = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${v("year")}-${v("month")}-${v("day")} ${v("hour")}:${v("minute")}:${
    v("second")
  }`;
}

/** 4xx (sauf 408 et 429) : la requête est fausse, la rejouer ne sert à rien. */
function definitif(statut: number): boolean {
  return statut >= 400 && statut < 500 && statut !== 408 && statut !== 429 &&
    statut !== 401;
}

export function clientAr24(
  acces: AccesAr24,
  fetchImpl: typeof fetch = fetch,
  base = "https://sandbox.ar24.fr/api",
  maintenant: () => Date = () => new Date(),
): ClientAr24 {
  const racine = base.replace(/\/+$/, "");

  async function appeler(
    chemin: string,
    champs: Record<string, string | Blob>,
    methode: "POST" | "GET" = "POST",
  ): Promise<Record<string, unknown>> {
    const date = dateAr24(maintenant());
    const signature = await signatureAr24(date, acces.clePrivee);
    let url = `${racine}${chemin}`;
    let corps: FormData | undefined;
    if (methode === "GET") {
      const q = new URLSearchParams({ token: acces.token, date });
      for (const [k, v] of Object.entries(champs)) {
        if (typeof v === "string") q.set(k, v);
      }
      url += `?${q}`;
    } else {
      corps = new FormData();
      corps.set("token", acces.token);
      corps.set("date", date);
      for (const [k, v] of Object.entries(champs)) {
        if (v instanceof Blob) corps.set(k, v, (v as File).name ?? "piece");
        else corps.set(k, v);
      }
    }
    let r: Response;
    try {
      r = await fetchImpl(url, {
        method: methode,
        headers: { signature },
        ...(corps ? { body: corps } : {}),
      });
    } catch (e) {
      throw new ErreurAr24(0, `réseau : ${String(e)}`, false);
    }
    const texte = (await r.text()).trim();
    if (!r.ok) throw new ErreurAr24(r.status, texte, definitif(r.status));
    // Une erreur métier revient en clair (JSON « status: ERROR ») ; un succès revient chiffré.
    let clair = texte;
    if (!texte.startsWith("{")) {
      try {
        clair = await dechiffrerAr24(texte, date, acces.clePrivee);
      } catch {
        throw new ErreurAr24(
          r.status,
          "réponse illisible (déchiffrement impossible)",
          false,
        );
      }
    }
    let o: Record<string, unknown>;
    try {
      o = JSON.parse(clair);
    } catch {
      throw new ErreurAr24(
        r.status,
        `réponse non JSON : ${clair.slice(0, 200)}`,
        false,
      );
    }
    if (o.status !== "SUCCESS") {
      throw new ErreurAr24(r.status, JSON.stringify(o).slice(0, 500), true);
    }
    return (o.result ?? {}) as Record<string, unknown>;
  }

  return {
    async televerser(idUser, nom, octets, mime) {
      const fichier = new File([octets as BlobPart], nom, {
        type: mime || "application/octet-stream",
      });
      const r = await appeler("/attachment", {
        id_user: idUser,
        file: fichier,
      });
      const id = r.file_id ?? r.id;
      if (id === undefined || id === null) {
        throw new ErreurAr24(
          200,
          `pièce sans file_id : ${JSON.stringify(r)}`,
          false,
        );
      }
      return String(id);
    },
    async envoyer(m) {
      const champs: Record<string, string> = {
        id_user: m.id_user,
        to_email: m.to_email,
        dest_statut: m.dest_statut,
        content: m.content,
        eidas: m.eidas,
      };
      if (m.to_firstname) champs.to_firstname = m.to_firstname;
      if (m.to_lastname) champs.to_lastname = m.to_lastname;
      if (m.to_company) champs.to_company = m.to_company;
      if (m.ref_dossier) champs.ref_dossier = m.ref_dossier;
      if (m.ref_client) champs.ref_client = m.ref_client;
      if (m.webhook) champs.webhook = m.webhook;
      m.pieces.forEach((id, i) => (champs[`attachment[${i}]`] = id));
      const r = await appeler("/mail", champs);
      if (r.id === undefined || r.id === null) {
        throw new ErreurAr24(200, `LRE sans id : ${JSON.stringify(r)}`, false);
      }
      return {
        id: String(r.id),
        statut: typeof r.status === "string" ? r.status : null,
      };
    },
    async lire(id) {
      return await appeler("/mail", { id }, "GET");
    },
  };
}
