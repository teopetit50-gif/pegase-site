// Client Brevo : e-mail transactionnel (/v3/smtp/email) et SMS (/v3/transactionalSMS/sms).
// Aucun suivi d'ouverture ni de clic : le socle l'interdit. Le réglage se fait au
// niveau du compte Brevo (Transactionnel → Paramètres), voir NOTES-A2.md.

export type EmailBrevo = {
  sender: { email: string; name?: string };
  to: { email: string; name?: string }[];
  replyTo?: { email: string; name?: string };
  subject: string;
  htmlContent?: string;
  textContent?: string;
  attachment?: { name: string; content: string }[];
  headers?: Record<string, string>;
  tags?: string[];
};

export type SmsBrevo = {
  sender: string;
  recipient: string;
  content: string;
  type: "transactional" | "marketing";
  tag?: string;
  unicodeEnabled?: boolean;
};

export type RemiseEmail = { messageId: string };
export type RemiseSms = { reference: string; messageId: number | string };

export interface ClientBrevo {
  envoyerEmail(message: EmailBrevo): Promise<RemiseEmail>;
  envoyerSms(message: SmsBrevo): Promise<RemiseSms>;
}

export class ErreurBrevo extends Error {
  constructor(
    public readonly statut: number,
    public readonly corps: string,
    /** true : réessayer ne servira à rien (adresse invalide, requête mal formée). */
    public readonly definitif: boolean,
  ) {
    super(`Brevo HTTP ${statut} : ${corps.slice(0, 300)}`);
    this.name = "ErreurBrevo";
  }
}

/** 400 et 404 sont définitifs (contenu ou destinataire refusé) ; 401, 402, 429 et 5xx se réessaient. */
export function erreurDefinitive(statut: number): boolean {
  return statut === 400 || statut === 404 || statut === 405 || statut === 406;
}

export function clientBrevo(
  cleApi: string,
  fetchImpl: typeof fetch = fetch,
  base = "https://api.brevo.com/v3",
): ClientBrevo {
  async function poster<T>(chemin: string, corps: unknown): Promise<T> {
    const reponse = await fetchImpl(`${base}${chemin}`, {
      method: "POST",
      headers: {
        "api-key": cleApi,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(corps),
    });
    const texte = await reponse.text();
    if (!reponse.ok) {
      throw new ErreurBrevo(
        reponse.status,
        texte,
        erreurDefinitive(reponse.status),
      );
    }
    return JSON.parse(texte) as T;
  }
  return {
    envoyerEmail: (message) => poster<RemiseEmail>("/smtp/email", message),
    envoyerSms: (message) =>
      poster<RemiseSms>("/transactionalSMS/sms", message),
  };
}

/** Le corps est-il du HTML ? Heuristique : commence par une balise ou en contient plusieurs. */
export function corpsEstHtml(corps: string): boolean {
  const t = corps.trimStart();
  if (/^<(!doctype|html|body|div|p|table|h[1-6]|span)\b/i.test(t)) return true;
  const balises = t.match(/<\/?[a-z][a-z0-9]*(\s[^>]*)?>/gi);
  return (balises?.length ?? 0) >= 2;
}

const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€";

/** true si un caractère sort de l'alphabet GSM-7 : il faut alors l'encodage Unicode (UCS-2). */
export function necessiteUnicode(texte: string): boolean {
  for (const c of texte) if (!GSM7.includes(c)) return true;
  return false;
}

/** Numéro international sans « + » ni séparateurs, comme l'attend Brevo (ex. 33612345678). */
export function normaliserNumeroSms(adresse: string): string {
  const chiffres = adresse.replace(/[^\d+]/g, "");
  if (chiffres.startsWith("+")) return chiffres.slice(1);
  if (chiffres.startsWith("00")) return chiffres.slice(2);
  // Numéro français national (06…, 07…) : préfixe 33.
  if (/^0[1-9]\d{8}$/.test(chiffres)) return `33${chiffres.slice(1)}`;
  return chiffres;
}

/** Émetteur SMS : alphanumérique de 3 à 11 caractères, sinon le numéro. */
export function emetteurSms(
  nomAffiche: string | null,
  identite: string,
): string {
  if (nomAffiche) {
    const court = nomAffiche.replace(/[^A-Za-z0-9]/g, "").slice(0, 11);
    if (court.length >= 3) return court;
  }
  return normaliserNumeroSms(identite);
}
