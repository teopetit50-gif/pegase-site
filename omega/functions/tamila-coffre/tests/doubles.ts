// deno-lint-ignore-file require-await
// Les doubles : un faux Key Manager (vrai AES-GCM en mémoire, données associées vérifiées comme chez
// Scaleway) et des portes en mémoire qui imitent les règles de b4_05 (qui voit quoi, journal, issues).
// Aucun appel réseau.

import { chiffrer as chiffrerTamila } from "../aesgcm.ts";
import type { Contexte } from "../coffre.ts";
import { ErreurCoffre, type KeyManager } from "../keymanager.ts";
import { tampon, texte, versHex } from "../octets.ts";
import { type Activation, type AReenvelopper, ErreurPorte, type NouvelleCle, type PortesCoffre, type Remise } from "../portes.ts";

export const CLIENT = "cccccccc-0000-4000-8000-00000000000c";
export const GERANT = "jeton-gerant";
export const AVOCAT = "jeton-avocat";
export const VOISIN = "jeton-voisin";
export const UID: Record<string, string> = {
  [GERANT]: "11111111-1111-4111-8111-111111111111",
  [AVOCAT]: "22222222-2222-4222-8222-222222222222",
  [VOISIN]: "33333333-3333-4333-8333-333333333333",
};

export class FauxKeyManager implements KeyManager {
  readonly nom = "faux";
  cles = new Map<string, CryptoKey>();
  noms = new Map<string, string>();
  appels: { op: string; cle?: string; ad?: string; octets?: number }[] = [];
  panne: ErreurCoffre | null = null;

  constructor(readonly region = "fr-par") {}

  private verifier() {
    if (this.panne) throw this.panne;
  }

  async trouverOuCreerCle(nom: string): Promise<string> {
    this.appels.push({ op: "trouver_ou_creer" });
    this.verifier();
    const deja = this.noms.get(nom);
    if (deja) return deja;
    const id = crypto.randomUUID();
    this.noms.set(nom, id);
    this.cles.set(id, await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]));
    return id;
  }

  async chiffrer(cle: string, clair: Uint8Array, ad: string): Promise<Uint8Array> {
    this.appels.push({ op: "chiffrer", cle, ad, octets: clair.length });
    this.verifier();
    const k = this.cles.get(cle);
    if (!k) throw new ErreurCoffre("KM_REFUS", "Key Manager 404 : clé inconnue");
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: tampon(texte(ad)) }, k, tampon(clair)));
    const o = new Uint8Array(12 + ct.length);
    o.set(nonce);
    o.set(ct, 12);
    return o;
  }

  async dechiffrer(cle: string, chiffre: Uint8Array, ad: string): Promise<Uint8Array> {
    this.appels.push({ op: "dechiffrer", cle, ad, octets: chiffre.length });
    this.verifier();
    const k = this.cles.get(cle);
    if (!k) throw new ErreurCoffre("KM_REFUS", "Key Manager 404 : clé inconnue");
    try {
      return new Uint8Array(
        await crypto.subtle.decrypt({ name: "AES-GCM", iv: tampon(chiffre.slice(0, 12)), additionalData: tampon(texte(ad)) }, k, tampon(chiffre.slice(12))),
      );
    } catch {
      throw new ErreurCoffre("KM_REFUS", "Key Manager 400 : déchiffrement refusé");
    }
  }
}

interface DossierMemoire {
  id: string;
  fournisseur: "local" | "scaleway";
  reference: string;
  enveloppe: Uint8Array;
  temoin: Uint8Array;
  membres: Set<string>;
  responsable: string;
  pieces: Map<string, string>; // pièce → statut
}

export interface LigneJournal {
  id: number;
  dossier: string;
  piece: string | null;
  pour: string;
  demandeur: string | null;
  issue: string;
  detail: Record<string, unknown>;
}

const refus = (code: string, msg: string) => new ErreurPorte(code, msg, code === "42501" ? 403 : code === "55000" ? 409 : 400);

export class PortesMemoire implements PortesCoffre {
  coffre: { statut: "local" | "bascule" | "scaleway"; region: string | null; cle_maitre: string | null } = { statut: "local", region: null, cle_maitre: null };
  dossiers = new Map<string, DossierMemoire>();
  journal: LigneJournal[] = [];
  relances: string[] = [];

  private uid(jeton: string): string {
    const u = UID[jeton];
    if (!u) throw refus("42501", "jeton inconnu");
    return u;
  }

  /** Un dossier local : la clé est enveloppée « sous la phrase » (octets d'essai), le témoin est un vrai chiffré. */
  async ajouterDossier(id: string, cle: Uint8Array, membres: string[], fournisseur: "local" | "scaleway" = "local", enveloppe?: Uint8Array) {
    this.dossiers.set(id, {
      id,
      fournisseur,
      reference: fournisseur === "local" ? `cabinet:${id}` : `scaleway:${this.coffre.region}:${this.coffre.cle_maitre}`,
      enveloppe: enveloppe ?? new Uint8Array(77).fill(0xab),
      temoin: await chiffrerTamila(cle, texte("2026-0412")),
      membres: new Set(membres),
      responsable: membres[0],
      pieces: new Map(),
    });
  }

  private noter(dossier: string, piece: string | null, pour: string, demandeur: string | null): number {
    const id = this.journal.length + 1;
    this.journal.push({ id, dossier, piece, pour, demandeur, issue: "demande", detail: {} });
    return id;
  }

  async demanderActivation(jeton: string, client: string): Promise<Activation> {
    if (jeton !== GERANT) throw refus("42501", "Le coffre d'un cabinet s'active par son gérant.");
    return { client, par: this.uid(jeton), statut: this.coffre.statut, region: this.coffre.region, cle_maitre: this.coffre.cle_maitre };
  }

  async activer(_client: string, region: string, cleMaitre: string, par: string) {
    if (par !== UID[GERANT]) throw refus("42501", "Le coffre d'un cabinet s'active par son gérant.");
    if (this.coffre.statut !== "local") return { statut: this.coffre.statut, deja: true };
    const locaux = [...this.dossiers.values()].filter((d) => d.fournisseur === "local").length;
    this.coffre = { statut: locaux > 0 ? "bascule" : "scaleway", region, cle_maitre: cleMaitre };
    return { statut: this.coffre.statut, deja: false, dossiers_locaux: locaux };
  }

  async pourNouvelleCle(jeton: string, _client: string): Promise<NouvelleCle> {
    const u = this.uid(jeton);
    if (jeton === VOISIN) throw refus("42501", "Vous ne pouvez pas ouvrir de dossier dans ce cabinet.");
    if (this.coffre.statut === "local") throw refus("55000", "Ce cabinet chiffre sous sa phrase.");
    const dossier = crypto.randomUUID();
    return {
      client: CLIENT,
      dossier,
      journal: this.noter(dossier, null, "nouvelle_cle", u),
      region: this.coffre.region!,
      cle_maitre: this.coffre.cle_maitre!,
      reference: `scaleway:${this.coffre.region}:${this.coffre.cle_maitre}`,
    };
  }

  async pourMembre(jeton: string, dossier: string, piece: string | null): Promise<Remise | null> {
    const u = this.uid(jeton);
    const d = this.dossiers.get(dossier);
    if (!d || !d.membres.has(jeton)) throw refus("42501", "Ce dossier ne vous est pas ouvert.");
    if (d.fournisseur === "local") return { dossier, fournisseur: "local" };
    return { dossier, fournisseur: "scaleway", journal: this.noter(dossier, piece, "membre", u), reference: d.reference, enveloppe: versHex(d.enveloppe) };
  }

  async pourLecteur(piece: string): Promise<Remise> {
    const d = [...this.dossiers.values()].find((x) => x.pieces.has(piece));
    if (!d) throw refus("P0002", "Pièce introuvable.");
    if (!["recue", "en_lecture"].includes(d.pieces.get(piece)!)) throw refus("55000", "Cette pièce n'est pas à lire.");
    if (d.fournisseur === "local") return { piece, dossier: d.id, fournisseur: "local" };
    return {
      piece,
      dossier: d.id,
      fournisseur: "scaleway",
      journal: this.noter(d.id, piece, "lecteur", null),
      reference: d.reference,
      enveloppe: versHex(d.enveloppe),
    };
  }

  async conclure(journal: number, issue: "deballe" | "emise" | "refuse" | "echec", detail: Record<string, unknown> = {}) {
    const l = this.journal.find((j) => j.id === journal);
    if (!l) throw refus("P0002", "Remise introuvable.");
    if (l.issue !== "demande") throw refus("55000", "Cette remise a déjà son issue.");
    if ((issue === "emise" && l.pour !== "nouvelle_cle") || (l.pour === "nouvelle_cle" && !["emise", "echec"].includes(issue))) {
      throw refus("22023", "Une demande de nouvelle clé se conclut en clé émise ou en échec.");
    }
    l.issue = issue;
    l.detail = { ...l.detail, ...detail };
  }

  async aReenvelopper(jeton: string, dossier: string): Promise<AReenvelopper> {
    const u = this.uid(jeton);
    const d = this.dossiers.get(dossier);
    if (!d || !d.membres.has(jeton) || (jeton !== GERANT && d.responsable !== jeton)) throw refus("42501", "Ré-enveloppement refusé.");
    if (this.coffre.statut === "local") throw refus("55000", "Le coffre du cabinet n'est pas activé.");
    if (d.fournisseur !== "local") return { dossier, deja: true };
    return {
      dossier,
      deja: false,
      journal: this.noter(dossier, null, "reenveloppement", u),
      region: this.coffre.region!,
      cle_maitre: this.coffre.cle_maitre!,
      temoin: versHex(d.temoin),
    };
  }

  index: { fournisseur: "local" | "scaleway"; enveloppe: string; reference: string } | null = null;

  async demanderIndex(jeton: string, client: string) {
    const u = this.uid(jeton);
    if (jeton !== GERANT) throw refus("42501", "La clé d'index du cabinet est demandée par son gérant.");
    if (this.coffre.statut === "local") throw refus("55000", "Ce cabinet chiffre sous sa phrase.");
    if (this.index) throw refus("55000", "Le cabinet a déjà sa clé d'index.");
    return {
      client,
      journal: this.noter(client, null, "membre", u),
      region: this.coffre.region!,
      cle_maitre: this.coffre.cle_maitre!,
      reference: `scaleway:${this.coffre.region}:${this.coffre.cle_maitre}`,
    };
  }

  async poserIndex(journal: number, enveloppeHex: string) {
    const l = this.journal.find((j) => j.id === journal);
    if (!l || l.issue !== "demande") throw refus("55000", "Demande de clé d'index introuvable ou close.");
    this.index = { fournisseur: "scaleway", enveloppe: enveloppeHex, reference: `scaleway:${this.coffre.region}:${this.coffre.cle_maitre}` };
    l.issue = "emise";
  }

  async indexPourMembre(jeton: string, client: string) {
    const u = this.uid(jeton);
    if (jeton === VOISIN) throw refus("42501", "La clé d'index se remet à une personne du cabinet.");
    if (!this.index) return null;
    if (this.index.fournisseur === "local") return { fournisseur: "local" as const };
    return {
      fournisseur: "scaleway" as const,
      journal: this.noter(client, null, "membre", u),
      reference: this.index.reference,
      enveloppe: this.index.enveloppe,
    };
  }

  async reenveloppe(journal: number, enveloppeHex: string) {
    const l = this.journal.find((j) => j.id === journal && j.pour === "reenveloppement");
    if (!l) throw refus("P0002", "Demande introuvable.");
    if (l.issue !== "demande") throw refus("55000", "Cette demande a déjà son issue.");
    const d = this.dossiers.get(l.dossier)!;
    d.fournisseur = "scaleway";
    d.reference = `scaleway:${this.coffre.region}:${this.coffre.cle_maitre}`;
    d.enveloppe = Uint8Array.from(enveloppeHex.match(/../g)!.map((h) => parseInt(h, 16)));
    l.issue = "reenveloppe";
    const relancees = [...d.pieces].filter(([, s]) => s === "recue").map(([p]) => p);
    this.relances.push(...relancees);
    const locaux = [...this.dossiers.values()].filter((x) => x.fournisseur === "local").length;
    if (locaux === 0) this.coffre.statut = "scaleway";
    return { dossier: d.id, pieces_relancees: relancees.length, dossiers_locaux: locaux, statut: this.coffre.statut };
  }
}

export function contexte(km: KeyManager | null = new FauxKeyManager()) {
  const portes = new PortesMemoire();
  const lignes: { niveau: string; message: string; detail?: Record<string, unknown> }[] = [];
  const ctx: Contexte = { portes, km, journal: (niveau, message, detail) => lignes.push({ niveau, message, detail }) };
  return { ctx, portes, km: km as FauxKeyManager | null, lignes };
}
