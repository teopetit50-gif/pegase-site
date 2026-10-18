// QuickBooks Online, API comptable v3 (https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry).
//   POST /v3/company/{realm}/journalentry?minorversion=75&requestid=… {TxnDate, DocNumber, PrivateNote,
//   Line[{Amount, Description, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail{PostingType, AccountRef, Entity}}]}
//   Le paramètre requestid rend l'appel idempotent ; DocNumber (21 caractères) porte la clé de l'écriture, et une reprise
//   la cherche d'abord (select Id from JournalEntry where DocNumber = …).
//   Les comptes se retrouvent par leur numéro (select Id from Account where AcctNum = …) ; la ligne fournisseur porte le
//   fournisseur (Vendor, retrouvé par son nom, créé s'il manque), que QuickBooks exige sur un compte fournisseurs.

import type { Jetons } from "../jetons.ts";
import type { Ecriture, EtatEnvoi } from "../portes.ts";
import { appeler, type ClientEditeur, ErreurEditeur, type Issue, montant } from "./commun.ts";

export const URL_QBO = { production: "https://quickbooks.api.intuit.com", sandbox: "https://sandbox-quickbooks.api.intuit.com" };
const VERSION = "75";

/** Une chaîne dans une requête QuickBooks : apostrophe échappée. */
function lit(s: string): string {
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/** Le numéro de document : la clé, coupée à 21 caractères par la gauche si besoin (la fin, le numéro, reste). */
export function numeroDocument(cle: string): string {
  return cle.length <= 21 ? cle : cle.slice(cle.length - 21);
}

export class QuickBooks implements ClientEditeur {
  readonly nom = "quickbooks" as const;
  private readonly base: string;
  private readonly realm: string;
  private comptes = new Map<string, string>();
  private fournisseurs = new Map<string, string>();

  constructor(private readonly jetons: Jetons, parametres: Record<string, unknown>, private readonly fetchFn: typeof fetch = fetch, base?: string) {
    const realm = String(parametres.realm_id ?? "").trim();
    if (!realm) throw new ErreurEditeur("configuration", "QuickBooks : realm_id (identifiant de l'entreprise) absent des paramètres de la connexion.");
    this.realm = realm;
    this.base = base ?? (parametres.environnement === "sandbox" ? URL_QBO.sandbox : URL_QBO.production);
  }

  private url(chemin: string, extra = ""): string {
    return `${this.base}/v3/company/${encodeURIComponent(this.realm)}${chemin}?minorversion=${VERSION}${extra}`;
  }
  private requete<T>(q: string): Promise<{ QueryResponse?: Record<string, T[]> }> {
    return this.jetons.avec((j) =>
      appeler(this.fetchFn, this.url("/query", `&query=${encodeURIComponent(q)}`), { entetes: { Authorization: `Bearer ${j}` } }, "QuickBooks")
    );
  }
  private post<T>(chemin: string, json: unknown, extra = ""): Promise<T> {
    return this.jetons.avec((j) =>
      appeler<T>(this.fetchFn, this.url(chemin, extra), { methode: "POST", json, entetes: { Authorization: `Bearer ${j}` } }, "QuickBooks")
    );
  }

  async compte(numero: string): Promise<string> {
    const deja = this.comptes.get(numero);
    if (deja) return deja;
    const r = await this.requete<{ Id: string }>(`select Id from Account where AcctNum = ${lit(numero)}`);
    const id = r.QueryResponse?.Account?.[0]?.Id;
    if (!id) throw new ErreurEditeur("definitif", `Compte ${numero} absent de QuickBooks (numéros de compte activés ?) : à créer, puis l'écriture repart.`);
    this.comptes.set(numero, id);
    return id;
  }

  async fournisseur(nom: string): Promise<string> {
    const n = nom.slice(0, 100).trim();
    const deja = this.fournisseurs.get(n);
    if (deja) return deja;
    const r = await this.requete<{ Id: string }>(`select Id from Vendor where DisplayName = ${lit(n)}`);
    let id = r.QueryResponse?.Vendor?.[0]?.Id;
    if (!id) id = (await this.post<{ Vendor: { Id: string } }>("/vendor", { DisplayName: n })).Vendor.Id;
    this.fournisseurs.set(n, id);
    return id;
  }

  async retrouver(e: Ecriture, _envoi: EtatEnvoi | null): Promise<Issue | null> {
    const r = await this.requete<{ Id: string }>(`select Id from JournalEntry where DocNumber = ${lit(numeroDocument(e.cle))}`);
    const id = r.QueryResponse?.JournalEntry?.[0]?.Id;
    return id ? { idExterne: id } : null;
  }

  async envoyer(e: Ecriture): Promise<Issue> {
    const lignes = [];
    for (const l of e.lignes) {
      const debit = l.debit > 0;
      const detail: Record<string, unknown> = { PostingType: debit ? "Debit" : "Credit", AccountRef: { value: await this.compte(l.compte_num) } };
      if (l.comp_aux_num) detail.Entity = { Type: "Vendor", EntityRef: { value: await this.fournisseur(l.comp_aux_lib ?? l.comp_aux_num) } };
      lignes.push({
        Amount: Number(montant(debit ? l.debit : l.credit)),
        Description: l.libelle.slice(0, 4000),
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: detail,
      });
    }
    const r = await this.post<{ JournalEntry?: { Id: string } }>(
      "/journalentry",
      { TxnDate: e.date, DocNumber: numeroDocument(e.cle), PrivateNote: `${e.libelle} (${e.piece})`.slice(0, 4000), Line: lignes },
      `&requestid=${encodeURIComponent(e.cle)}`,
    );
    const id = r?.JournalEntry?.Id;
    if (!id) throw new ErreurEditeur("temporaire", "QuickBooks : réponse sans identifiant.");
    return { idExterne: id };
  }
}
