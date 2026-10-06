// Les jetons d'une connexion. Le secret est au coffre (porte compta_secret) sous forme JSON :
//   OAuth (QuickBooks, Pennylane) : {access_token, refresh_token, expires_at}
//   jeton d'entreprise Pennylane (bac à sable) : {api_token}
//   Cegid Loop : {api_key, subscription_key}
// Un jeton OAuth expiré (ou refusé d'un 401) est renouvelé une fois ; le nouveau couple repart au coffre aussitôt,
// car QuickBooks change le jeton de renouvellement à chaque usage.

import { appeler, ErreurEditeur } from "./editeurs/commun.ts";
import type { Editeur, PortesCompta } from "./portes.ts";

export interface Secret {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  api_token?: string;
  api_key?: string;
  subscription_key?: string;
}

export interface Env {
  get(n: string): string | undefined;
}

/** Les adresses de renouvellement. QuickBooks : documentation Intuit OAuth 2.0 ; Pennylane : à confirmer en bac à sable. */
export const URL_JETON: Record<"quickbooks" | "pennylane", string> = {
  quickbooks: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  pennylane: "https://app.pennylane.com/oauth/token",
};

export class Jetons {
  private secret: Secret | null = null;

  constructor(
    private readonly connexion: string,
    private readonly editeur: Editeur,
    private readonly portes: PortesCompta,
    private readonly env: Env,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly maintenant: () => Date = () => new Date(),
  ) {}

  async lire(): Promise<Secret> {
    if (this.secret) return this.secret;
    const brut = await this.portes.secret(this.connexion);
    if (!brut) throw new ErreurEditeur("jeton", "Aucun secret au coffre pour cette connexion : l'autorisation est à donner.");
    try {
      this.secret = JSON.parse(brut) as Secret;
    } catch {
      throw new ErreurEditeur("jeton", "Secret illisible au coffre (JSON attendu).");
    }
    return this.secret;
  }

  /** Le jeton d'accès à présenter (Bearer), renouvelé s'il expire dans la minute. */
  async acces(): Promise<string> {
    const s = await this.lire();
    if (s.api_token) return s.api_token;
    if (!s.access_token) throw new ErreurEditeur("jeton", "Le secret ne porte pas de jeton d'accès.");
    const expire = s.expires_at ? Date.parse(s.expires_at) : NaN;
    if (Number.isFinite(expire) && expire - this.maintenant().getTime() < 60_000) return (await this.renouveler()).access_token!;
    return s.access_token;
  }

  async renouveler(): Promise<Secret> {
    const s = await this.lire();
    if (this.editeur === "cegid_loop" || s.api_token || !s.refresh_token) {
      throw new ErreurEditeur("jeton", "Jeton refusé et rien pour le renouveler : l'autorisation est à redonner.");
    }
    const ed = this.editeur as "quickbooks" | "pennylane";
    const prefixe = ed === "quickbooks" ? "QBO" : "PENNYLANE";
    const id = this.env.get(`${prefixe}_CLIENT_ID`);
    const cle = this.env.get(`${prefixe}_CLIENT_SECRET`);
    if (!id || !cle) throw new ErreurEditeur("configuration", `${prefixe}_CLIENT_ID ou ${prefixe}_CLIENT_SECRET absente : jeton non renouvelable.`);
    let r: { access_token: string; refresh_token?: string; expires_in?: number };
    try {
      r = await appeler(this.fetchFn, URL_JETON[ed], {
        methode: "POST",
        entetes: ed === "quickbooks" ? { Authorization: `Basic ${btoa(`${id}:${cle}`)}` } : {},
        formulaire: ed === "quickbooks"
          ? { grant_type: "refresh_token", refresh_token: s.refresh_token }
          : { grant_type: "refresh_token", refresh_token: s.refresh_token, client_id: id, client_secret: cle },
      }, `${ed} (jeton)`);
    } catch (e) {
      // invalid_grant (400) : l'autorisation est retirée ou le jeton de renouvellement a expiré.
      if (e instanceof ErreurEditeur && e.nature === "definitif") throw new ErreurEditeur("jeton", e.message, e.statut);
      throw e;
    }
    const nouveau: Secret = {
      access_token: r.access_token,
      refresh_token: r.refresh_token ?? s.refresh_token,
      expires_at: new Date(this.maintenant().getTime() + (r.expires_in ?? 3600) * 1000).toISOString(),
    };
    await this.portes.poserSecret(this.connexion, JSON.stringify(nouveau));
    this.secret = nouveau;
    return nouveau;
  }

  /** Un appel avec le jeton ; sur 401, un renouvellement et un seul nouvel essai. */
  async avec<T>(f: (jeton: string) => Promise<T>): Promise<T> {
    try {
      return await f(await this.acces());
    } catch (e) {
      if (!(e instanceof ErreurEditeur) || e.nature !== "jeton" || e.statut !== 401) throw e;
      const s = await this.renouveler();
      return await f(s.access_token!);
    }
  }
}
