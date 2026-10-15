// deno-lint-ignore-file require-await
// Les doubles : des portes en mémoire, un réseau qui rend ce qu'on lui a préparé (et note chaque appel), un dépôt
// en mémoire. Aucun appel réseau.

import type { DepotSigne } from "../editeurs/cegid_loop.ts";
import type { Contexte } from "../passage.ts";
import type { AEnvoyer, Ecriture, PortesCompta } from "../portes.ts";

export const CLIENT_BANC = "cccccccc-0000-4000-8000-00000000000c";
export const ENTITE_BANC = "eeeeeeee-0000-4000-8000-00000000000e";

export function ecriture(num = 12, extra: Partial<Ecriture> = {}): Ecriture {
  return {
    exercice_cle: "2026",
    ecriture_num: num,
    journal_code: "HA",
    journal_lib: "Achats",
    date: "2026-10-06",
    piece: "F-2026-103",
    piece_date: "2026-10-01",
    libelle: "Facture Papeterie Delorme F-2026-103",
    origine: "facture",
    extourne_de: null,
    cle: `OMEGA-2026-HA-${num}`,
    lignes: [
      {
        compte_num: "6061",
        compte_lib: "Fournitures",
        comp_aux_num: null,
        comp_aux_lib: null,
        libelle: "Facture Papeterie Delorme F-2026-103",
        debit: 100,
        credit: 0,
        montant_devise: null,
        idevise: null,
      },
      {
        compte_num: "44566",
        compte_lib: "TVA déductible",
        comp_aux_num: null,
        comp_aux_lib: null,
        libelle: "Facture Papeterie Delorme F-2026-103",
        debit: 20,
        credit: 0,
        montant_devise: null,
        idevise: null,
      },
      {
        compte_num: "401",
        compte_lib: "Fournisseurs",
        comp_aux_num: "DEL-01",
        comp_aux_lib: "Papeterie Delorme",
        libelle: "Facture Papeterie Delorme F-2026-103",
        debit: 0,
        credit: 120,
        montant_devise: null,
        idevise: null,
      },
    ],
    ...extra,
  };
}

export class PortesMemoire implements PortesCompta {
  file: AEnvoyer[] = [];
  secrets = new Map<string, string>();
  etats = new Map<string, { etat: string; tentatives: number; id_externe: string | null }>();
  notes: { connexion: string; cle: string; id: string }[] = [];
  references: { connexion: string; cle: string; ref: string }[] = [];
  echecs: { connexion: string; cle: string; erreur: string; definitif: boolean }[] = [];
  pannes: { connexion: string; erreur: string }[] = [];
  secretsPoses: { connexion: string; secret: string }[] = [];
  battements: unknown[] = [];

  private k(c: string, ex: string, n: number) {
    return `${c}/${ex}/${n}`;
  }
  async aEnvoyer(max: number) {
    return this.file.slice(0, max);
  }
  async secret(connexion: string) {
    return this.secrets.get(connexion) ?? null;
  }
  async poserSecret(connexion: string, secret: string) {
    this.secrets.set(connexion, secret);
    this.secretsPoses.push({ connexion, secret });
  }
  async commencer(connexion: string, ex: string, n: number) {
    const e = this.etats.get(this.k(connexion, ex, n));
    if (e?.etat === "envoye" || e?.etat === "refuse") throw new Error("Écriture déjà envoyée.");
    const tentatives = (e?.tentatives ?? 0) + 1;
    this.etats.set(this.k(connexion, ex, n), { etat: "en_cours", tentatives, id_externe: e?.id_externe ?? null });
    return { reprise: e !== undefined, tentatives };
  }
  async referencer(connexion: string, ex: string, n: number, ref: string) {
    this.etats.get(this.k(connexion, ex, n))!.id_externe = ref;
    this.references.push({ connexion, cle: this.k(connexion, ex, n), ref });
  }
  async noter(connexion: string, ex: string, n: number, id: string) {
    const e = this.etats.get(this.k(connexion, ex, n))!;
    e.etat = "envoye";
    e.id_externe = id;
    this.notes.push({ connexion, cle: this.k(connexion, ex, n), id });
  }
  async echouer(connexion: string, ex: string, n: number, erreur: string, definitif: boolean) {
    const e = this.etats.get(this.k(connexion, ex, n))!;
    e.etat = definitif || e.tentatives >= 8 ? "refuse" : "a_reprendre";
    this.echecs.push({ connexion, cle: this.k(connexion, ex, n), erreur, definitif });
    return e.etat as "a_reprendre" | "refuse";
  }
  async enPanne(connexion: string, erreur: string) {
    this.pannes.push({ connexion, erreur });
  }
  async battre(detail: unknown) {
    this.battements.push(detail);
  }
}

export interface Appel {
  methode: string;
  url: string;
  entetes: Record<string, string>;
  corps: string | null;
}
type Reponse = { statut?: number; json?: unknown; texte?: string };
type Regle = { methode: string; motif: RegExp; reponses: (Reponse | ((a: Appel) => Reponse))[] };

/** Un réseau en mémoire : chaque règle (méthode, motif d'URL) rend ses réponses dans l'ordre, la dernière ensuite. */
export class Reseau {
  appels: Appel[] = [];
  private regles: Regle[] = [];

  quand(methode: string, motif: RegExp, ...reponses: (Reponse | ((a: Appel) => Reponse))[]): this {
    this.regles.push({ methode, motif, reponses });
    return this;
  }

  fetch: typeof fetch = async (entree, init) => {
    const url = typeof entree === "string" ? entree : entree instanceof URL ? entree.toString() : entree.url;
    const methode = (init?.method ?? "GET").toUpperCase();
    const entetes = Object.fromEntries(new Headers(init?.headers).entries());
    const corps = init?.body === undefined || init?.body === null ? null : typeof init.body === "string" ? init.body : await new Response(init.body).text();
    const a: Appel = { methode, url, entetes, corps };
    this.appels.push(a);
    const r = this.regles.find((x) => x.methode === methode && x.motif.test(url));
    if (!r) return new Response(`aucune règle pour ${methode} ${url}`, { status: 599 });
    const brut = r.reponses.length > 1 ? r.reponses.shift()! : r.reponses[0];
    const rep = typeof brut === "function" ? brut(a) : brut;
    const texte = rep.texte ?? (rep.json === undefined ? "" : JSON.stringify(rep.json));
    return new Response(texte, { status: rep.statut ?? 200 });
  };

  vers(methode: string, motif: RegExp): Appel[] {
    return this.appels.filter((a) => a.methode === methode && motif.test(a.url));
  }
}

export class DepotMemoire implements DepotSigne {
  fichiers = new Map<string, string>();
  async deposer(chemin: string, contenu: string) {
    this.fichiers.set(chemin, contenu);
  }
  async signer(chemin: string, secondes: number) {
    return `https://depot.exemple/${chemin}?expire=${secondes}`;
  }
}

export function env(valeurs: Record<string, string> = {}) {
  return { get: (n: string) => valeurs[n] };
}

export function contexte(portes: PortesMemoire, reseau: Reseau, valeurs: Record<string, string> = {}, depot = new DepotMemoire()): Contexte {
  return {
    portes,
    env: env({ QBO_CLIENT_ID: "id-qbo", QBO_CLIENT_SECRET: "cle-qbo", PENNYLANE_CLIENT_ID: "id-pl", PENNYLANE_CLIENT_SECRET: "cle-pl", ...valeurs }),
    fetchFn: reseau.fetch,
    depot,
    maintenant: () => new Date("2026-10-06T10:00:00Z"),
    suiviLoop: { essais: 2, pauseMs: 0 },
  };
}
