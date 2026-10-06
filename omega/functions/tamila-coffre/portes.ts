// Les portes du coffre (migration b4_05) : les seules voies vers la base. Deux façons d'appeler :
//   · au nom de la personne qui a appelé le coffre (son jeton, la clé publique du projet) : la base
//     décide si elle a le droit (gérant, membre du dossier, associé…) — le coffre ne décide de rien ;
//   · au nom du serveur (clé de service) : activer, remettre au lecteur, conclure, poser l'enveloppe.

export class ErreurPorte extends Error {
  constructor(readonly sqlstate: string, message: string, readonly http: number) {
    super(message);
    this.name = "ErreurPorte";
  }
}

export type Fournisseur = "local" | "scaleway";

export interface Activation {
  client: string;
  par: string;
  statut: "local" | "bascule" | "scaleway";
  region: string | null;
  cle_maitre: string | null;
}

export interface NouvelleCle {
  client: string;
  dossier: string;
  journal: number;
  region: string;
  cle_maitre: string;
  reference: string;
}

/** Ce que rendent tamila_coffre_pour_membre et tamila_coffre_pour_lecteur. */
export interface Remise {
  dossier: string;
  piece?: string;
  fournisseur: Fournisseur;
  journal?: number;
  reference?: string;
  enveloppe?: string;
}

export interface AReenvelopper {
  dossier: string;
  deja: boolean;
  journal?: number;
  region?: string;
  cle_maitre?: string;
  temoin?: string;
}

export interface PortesCoffre {
  // au nom de la personne
  demanderActivation(jeton: string, client: string): Promise<Activation>;
  pourNouvelleCle(jeton: string, client: string): Promise<NouvelleCle>;
  pourMembre(jeton: string, dossier: string, piece: string | null): Promise<Remise | null>;
  aReenvelopper(jeton: string, dossier: string): Promise<AReenvelopper>;
  // au nom du serveur
  activer(client: string, region: string, cleMaitre: string, par: string): Promise<{ statut: string; deja: boolean; dossiers_locaux?: number }>;
  pourLecteur(piece: string): Promise<Remise>;
  conclure(journal: number, issue: "deballe" | "emise" | "refuse" | "echec", detail?: Record<string, unknown>): Promise<void>;
  reenveloppe(journal: number, enveloppeHex: string): Promise<{ dossier: string; pieces_relancees: number; dossiers_locaux: number; statut: string }>;
}

export interface ConfigSupabase {
  url: string;
  cleService: string;
  clePublique: string;
}

const HTTP_DE: Record<string, number> = { "42501": 403, "55000": 409, "22023": 400, "P0002": 404, "23514": 409, "PGRST202": 501 };

export class PortesCoffreRpc implements PortesCoffre {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchFn: typeof fetch = fetch) {}

  private async rpc<T>(nom: string, params: Record<string, unknown>, jeton: string | null): Promise<T> {
    const cle = jeton ? this.cfg.clePublique : this.cfg.cleService;
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.cfg.url.replace(/\/+$/, "")}/rest/v1/rpc/${nom}`, {
        method: "POST",
        headers: { apikey: cle, Authorization: `Bearer ${jeton ?? cle}`, "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    } catch (e) {
      throw new ErreurPorte("08006", `porte ${nom} injoignable : ${(e as Error).message}`, 503);
    }
    const brut = await rep.text();
    if (!rep.ok) {
      let code = "XX000", message = brut.slice(0, 300);
      try {
        const j = JSON.parse(brut) as { code?: string; message?: string };
        code = j.code ?? code;
        message = j.message ?? message;
      } catch { /* corps non JSON : le statut suffit */ }
      throw new ErreurPorte(code, message, HTTP_DE[code] ?? (rep.status === 401 ? 401 : rep.status >= 500 ? 502 : 400));
    }
    return (brut ? JSON.parse(brut) : null) as T;
  }

  demanderActivation(jeton: string, client: string) {
    return this.rpc<Activation>("tamila_coffre_demander_activation", { p_client: client }, jeton);
  }
  pourNouvelleCle(jeton: string, client: string) {
    return this.rpc<NouvelleCle>("tamila_coffre_pour_nouvelle_cle", { p_client: client }, jeton);
  }
  pourMembre(jeton: string, dossier: string, piece: string | null) {
    return this.rpc<Remise | null>("tamila_coffre_pour_membre", { p_dossier: dossier, p_piece: piece }, jeton);
  }
  aReenvelopper(jeton: string, dossier: string) {
    return this.rpc<AReenvelopper>("tamila_coffre_a_reenvelopper", { p_dossier: dossier }, jeton);
  }
  activer(client: string, region: string, cleMaitre: string, par: string) {
    return this.rpc<{ statut: string; deja: boolean; dossiers_locaux?: number }>("tamila_coffre_activer", {
      p_client: client,
      p_region: region,
      p_cle_maitre: cleMaitre,
      p_par: par,
    }, null);
  }
  pourLecteur(piece: string) {
    return this.rpc<Remise>("tamila_coffre_pour_lecteur", { p_piece: piece }, null);
  }
  async conclure(journal: number, issue: "deballe" | "emise" | "refuse" | "echec", detail: Record<string, unknown> = {}) {
    await this.rpc<null>("tamila_coffre_conclure", { p_journal: journal, p_issue: issue, p_detail: detail }, null);
  }
  reenveloppe(journal: number, enveloppeHex: string) {
    return this.rpc<{ dossier: string; pieces_relancees: number; dossiers_locaux: number; statut: string }>("tamila_coffre_reenveloppe", {
      p_journal: journal,
      p_enveloppe: `\\x${enveloppeHex}`,
    }, null);
  }
}
