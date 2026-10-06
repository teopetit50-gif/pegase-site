// Cegid Loop, API publique « Écritures comptables (import) » (fiche technique Cegid, assistanceloop) :
//   1. le fichier TRA, en-tête ***S5CLIJRLETE (client, journal, format étendu), est déposé à une URL lisible ;
//   2. POST import : en-têtes x-apikey (clé d'API) et Ocp-Apim-Subscription-Key (clé d'abonnement, obtenue auprès du
//      référent partenaire), corps {codeIbs: code du dossier, url: adresse du fichier} → accountingImportRequestId ;
//   3. GET statut de la demande : 1 en attente, 2 en cours d'intégration, 3 terminé avec succès, 4 terminé avec erreur.
// L'adresse de l'API et les chemins exacts ne sont publiés que dans le catalogue des API Cegid (accès partenaire) :
// ils viennent de l'environnement (CEGID_LOOP_URL, CEGID_LOOP_CHEMIN_IMPORT, CEGID_LOOP_CHEMIN_STATUT avec {id},
// CEGID_LOOP_CHAMP_URL), sans valeur inventée. À valider sur un dossier de démonstration Loop.

import type { Env, Jetons } from "../jetons.ts";
import type { Ecriture, EtatEnvoi, LigneEcriture } from "../portes.ts";
import { appeler, type ClientEditeur, ErreurEditeur, type Issue } from "./commun.ts";

/** Le dépôt du fichier et son adresse signée (Storage). */
export interface DepotSigne {
  deposer(chemin: string, contenu: string): Promise<void>;
  signer(chemin: string, secondes: number): Promise<string>;
}

function zone(s: string | null | undefined, n: number): string {
  return (s ?? "").replace(/[\r\n\t]+/g, " ").slice(0, n).padEnd(n, " ");
}
function zoneMontant(n: number, largeur: number): string {
  return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",").padStart(largeur, " ");
}
function jjmmaaaa(iso: string): string {
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}${m}${a}`;
}
/** Pose une valeur à sa position (1 = premier caractère) dans une ligne fixe. */
function poser(ligne: string, position: number, valeur: string): string {
  const l = ligne.padEnd(position - 1 + valeur.length, " ");
  return l.slice(0, position - 1) + valeur + l.slice(position - 1 + valeur.length);
}

/**
 * Le TRA étendu d'une écriture. Les 222 premières positions sont celles du format standard (journal, date, nature,
 * général, type, auxiliaire, référence, libellé, mode de paiement, échéance, sens, montant, type d'écriture, n° de
 * pièce, devise, taux, code montant…) ; le format étendu y ajoute, parmi les zones obligatoires : date de création
 * (266), nature des à-nouveaux (302, N), TVA sur encaissements (386, -), état de lettrage (1021 : AL pour un tiers,
 * RI sinon). Régime, code TVA et TPF (387, 390, 393) sont laissés vides : à confirmer sur un dossier Loop.
 */
export function traEtendu(e: Ecriture, societe: string, maintenant: Date): string {
  const aujourdhui = jjmmaaaa(maintenant.toISOString());
  const entete = "***S5CLIJRLETE" + " ".repeat(3) + "01011970" + "01011970" + "007" + " ".repeat(5) +
    aujourdhui + maintenant.toISOString().slice(11, 16).replace(":", "") + zone("Omega", 35) + zone(societe, 35) + " ".repeat(4 + 6 + 3 + 8) + "001";
  const nature = e.origine === "reglement" ? "RF" : e.lignes.some((l) => l.compte_num.startsWith("40") && l.debit > 0) ? "AF" : "FF";
  const lignes = e.lignes.map((l: LigneEcriture) => {
    let x = zone(e.journal_code, 3) + jjmmaaaa(e.date) + nature + zone(l.compte_num, 17) + (l.comp_aux_num ? "X" : " ") + zone(l.comp_aux_num, 17) +
      zone(e.piece, 35) + zone(l.libelle, 35) + " ".repeat(3) + " ".repeat(8) + (l.debit > 0 ? "D" : "C") +
      zoneMontant(l.debit > 0 ? l.debit : l.credit, 20) + "N" + String(e.ecriture_num).slice(-8).padStart(8, " ") + " ".repeat(3) + " ".repeat(10) + "E--" +
      " ".repeat(20 + 20 + 3 + 2 + 2);
    x = poser(x, 223, zone(e.cle, 35)); // référence externe : la clé Omega
    x = poser(x, 266, aujourdhui);
    x = poser(x, 302, "N  ");
    x = poser(x, 386, "-");
    x = poser(x, 1021, l.comp_aux_num ? "AL " : "RI ");
    return x;
  });
  return [entete, ...lignes].join("\r\n") + "\r\n";
}

export class CegidLoop implements ClientEditeur {
  readonly nom = "cegid_loop" as const;
  private readonly base: string;
  private readonly cheminImport: string;
  private readonly cheminStatut: string;
  private readonly champUrl: string;
  private readonly codeIbs: string;

  constructor(
    private readonly jetons: Jetons,
    private readonly parametres: Record<string, unknown>,
    env: Env,
    private readonly depot: DepotSigne,
    private readonly client: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly maintenant: () => Date = () => new Date(),
    /** Suivi de la demande dans le même passage : nombre de lectures du statut et pause entre deux (ms). */
    private readonly suivi: { essais: number; pauseMs: number } = { essais: 3, pauseMs: 2000 },
  ) {
    const base = env.get("CEGID_LOOP_URL");
    const imp = env.get("CEGID_LOOP_CHEMIN_IMPORT");
    const stat = env.get("CEGID_LOOP_CHEMIN_STATUT");
    if (!base || !imp || !stat) {
      throw new ErreurEditeur(
        "configuration",
        "Cegid Loop : CEGID_LOOP_URL, CEGID_LOOP_CHEMIN_IMPORT et CEGID_LOOP_CHEMIN_STATUT sont à poser (catalogue des API Cegid).",
      );
    }
    this.base = base.replace(/\/+$/, "");
    this.cheminImport = imp;
    this.cheminStatut = stat;
    this.champUrl = env.get("CEGID_LOOP_CHAMP_URL") || "url";
    this.codeIbs = String(parametres.code_ibs ?? "").trim();
    if (!this.codeIbs) throw new ErreurEditeur("configuration", "Cegid Loop : code du dossier (code_ibs) absent des paramètres.");
  }

  private async entetes(): Promise<Record<string, string>> {
    const s = await this.jetons.lire();
    if (!s.api_key || !s.subscription_key) throw new ErreurEditeur("jeton", "Cegid Loop : api_key et subscription_key attendues au coffre.");
    return { "x-apikey": s.api_key, "Ocp-Apim-Subscription-Key": s.subscription_key };
  }

  private async statut(demande: string): Promise<number> {
    const r = await appeler<{ status?: number | string; statut?: number | string }>(
      this.fetchFn,
      `${this.base}${this.cheminStatut.replace("{id}", encodeURIComponent(demande))}`,
      { entetes: await this.entetes() },
      "Cegid Loop",
    );
    return Number(r?.status ?? r?.statut);
  }

  /** Suit une demande : son issue si elle est finie, sinon « en attente ». */
  private async suivre(demande: string): Promise<Issue> {
    for (let i = 0; i < Math.max(1, this.suivi.essais); i++) {
      if (i > 0 && this.suivi.pauseMs > 0) await new Promise((r) => setTimeout(r, this.suivi.pauseMs));
      const s = await this.statut(demande);
      if (s === 3) return { idExterne: `loop:${demande}` };
      if (s === 4) throw new ErreurEditeur("definitif", `Cegid Loop : import ${demande} terminé avec erreur (voir l'historique des imports du dossier).`);
    }
    return { enAttente: `loop:${demande}` };
  }

  retrouver(_e: Ecriture, envoi: EtatEnvoi | null): Promise<Issue | null> {
    const ref = envoi?.id_externe;
    if (!ref?.startsWith("loop:")) return Promise.resolve(null);
    return this.suivre(ref.slice(5));
  }

  async envoyer(e: Ecriture): Promise<Issue> {
    const chemin = `${this.client}/filed_compta/cegid_loop/${e.cle}.tra`;
    await this.depot.deposer(chemin, traEtendu(e, String(this.parametres.societe ?? ""), this.maintenant()));
    const url = await this.depot.signer(chemin, 24 * 3600);
    const r = await appeler<{ accountingImportRequestId?: string | number }>(
      this.fetchFn,
      `${this.base}${this.cheminImport}`,
      { methode: "POST", json: { codeIbs: this.codeIbs, [this.champUrl]: url }, entetes: await this.entetes() },
      "Cegid Loop",
    );
    const demande = r?.accountingImportRequestId;
    if (demande === undefined || demande === null || demande === "") {
      throw new ErreurEditeur("temporaire", "Cegid Loop : réponse sans accountingImportRequestId.");
    }
    return await this.suivre(String(demande));
  }
}
