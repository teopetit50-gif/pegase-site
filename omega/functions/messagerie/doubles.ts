// Doubles pour les tests de la messagerie : portes du socle, messagerie en mémoire, bucket.

import {
  type Acces,
  ErreurMessagerie,
  type Messagerie,
  type NomMessagerie,
  type Nouveautes,
} from "./fournisseur.ts";
import type {
  ConnexionActive,
  EnvoiAEnvoyer,
  Jetons,
  OuvertureOAuth,
  Portes,
  Reception,
  ReponseCommencer,
  Travail,
} from "./portes.ts";

export const CLIENT = "33333333-3333-4333-8333-333333333333";
export const CONNEXION = "44444444-4444-4444-8444-444444444444";
export const ENVOI = "55555555-5555-4555-8555-555555555555";

export class PortesDouble implements Portes {
  travaux: Travail[] = [];
  finis = new Map<number, Record<string, unknown>>();
  battements: Record<string, unknown>[] = [];
  envois = new Map<string, ReponseCommencer>();
  confirmes = new Map<string, string>();
  echoues = new Map<string, { erreur: string; definitif: boolean }>();
  receptions = new Map<string, Reception>();
  actives: ConnexionActive[] = [];
  jetonsParConnexion = new Map<string, Jetons>();
  curseurs = new Map<string, string[]>();
  aReconnecterMotifs = new Map<string, string>();
  etats = new Map<string, OuvertureOAuth>();
  enregistrements: Parameters<Portes["enregistrer"]>[0][] = [];
  oubliees: string[] = [];
  fournisseurOublie: NomMessagerie = "gmail";
  deposerEnPanneApres: number | null = null;

  // deno-lint-ignore require-await
  async prendreTravaux() {
    const t = this.travaux;
    this.travaux = [];
    return t;
  }
  // deno-lint-ignore require-await
  async finirTravail(id: number, r: Record<string, unknown>) {
    this.finis.set(id, r);
  }
  // deno-lint-ignore require-await
  async battreOuvrier(_m: string, _g: string[], d: Record<string, unknown>) {
    this.battements.push(d);
    return 1;
  }
  // deno-lint-ignore require-await
  async commencerEnvoi(envoi: string) {
    return this.envois.get(envoi) ??
      { envoyer: false as const, statut: "introuvable" };
  }
  // deno-lint-ignore require-await
  async confirmerEnvoi(envoi: string, reference: string) {
    this.confirmes.set(envoi, reference);
  }
  // deno-lint-ignore require-await
  async echouerEnvoi(envoi: string, erreur: string, definitif: boolean) {
    this.echoues.set(envoi, { erreur, definitif });
  }
  // deno-lint-ignore require-await
  async deposerReception(r: Reception) {
    if (
      this.deposerEnPanneApres !== null &&
      this.receptions.size >= this.deposerEnPanneApres
    ) {
      throw new Error("deposer_reception en panne");
    }
    const nouvelle = !this.receptions.has(r.identifiant);
    this.receptions.set(r.identifiant, r);
    return { id: this.receptions.size, nouvelle };
  }
  // deno-lint-ignore require-await
  async connexions() {
    return this.actives;
  }
  // deno-lint-ignore require-await
  async jetons(connexion: string) {
    const j = this.jetonsParConnexion.get(connexion);
    if (!j) throw new Error("connexion inconnue");
    return j;
  }
  // deno-lint-ignore require-await
  async poserAcces(
    connexion: string,
    acces: string,
    expireLe: string,
    renouvellement: string | null,
  ) {
    const j = this.jetonsParConnexion.get(connexion)!;
    this.jetonsParConnexion.set(connexion, {
      ...j,
      acces,
      acces_expire_le: expireLe,
      renouvellement: renouvellement ?? j.renouvellement,
    });
  }
  // deno-lint-ignore require-await
  async poserCurseur(connexion: string, curseur: string) {
    this.curseurs.set(connexion, [
      ...(this.curseurs.get(connexion) ?? []),
      curseur,
    ]);
  }
  // deno-lint-ignore require-await
  async aReconnecter(connexion: string, motif: string) {
    this.aReconnecterMotifs.set(connexion, motif);
  }
  // deno-lint-ignore require-await
  async ouvrir(etat: string) {
    const o = this.etats.get(etat);
    if (!o) throw new Error("état inconnu ou expiré");
    return o;
  }
  // deno-lint-ignore require-await
  async enregistrer(e: Parameters<Portes["enregistrer"]>[0]) {
    if (!this.etats.has(e.etat)) throw new Error("état consommé");
    this.etats.delete(e.etat);
    this.enregistrements.push(e);
    return {
      connexion: CONNEXION,
      retour_ecran: "https://omegaai.fr/espace/messagerie?connectee=1",
    };
  }
  // deno-lint-ignore require-await
  async oublier(connexion: string) {
    this.oubliees.push(connexion);
    const j = this.jetonsParConnexion.get(connexion);
    this.jetonsParConnexion.delete(connexion);
    return {
      renouvellement: j?.renouvellement ?? null,
      fournisseur: this.fournisseurOublie,
    };
  }
}

/**
 * Messagerie en mémoire (Gmail par défaut) : boîte de messages bruts, historique programmable,
 * brouillons gardés. En « microsoft », le jeton de renouvellement tourne et rien n'est révocable.
 */
export class GmailDouble implements Messagerie {
  readonly portees = ["gmail.readonly", "gmail.compose"];
  readonly etiquetteParDefaut: string;
  readonly revocationDistante: boolean;
  etiquettesDemandees: string[] = [];
  constructor(readonly nom: NomMessagerie = "gmail") {
    this.etiquetteParDefaut = nom === "gmail" ? "INBOX" : "inbox";
    this.revocationDistante = nom === "gmail";
  }
  renouvellements = 0;
  renouvellementRefuse = false;
  historique: Nouveautes = { messages: [], curseur: "100" };
  historiquePerime = false;
  messages = new Map<string, Uint8Array<ArrayBuffer>>();
  brouillons: { acces: string; brut: string }[] = [];
  revoques: string[] = [];
  profilCurseur = "500";

  urlConsentement(etat: string, retour: string) {
    return `https://accounts.google.test/consent?state=${etat}&redirect_uri=${
      encodeURIComponent(retour)
    }`;
  }
  // deno-lint-ignore require-await
  async echangerCode(code: string) {
    if (code !== "code-valide-0123456789") {
      throw new ErreurMessagerie("DEFINITIVE", "code refusé");
    }
    return {
      acces: { jeton: "acces-1", expire_le: "2026-10-06T17:00:00Z" },
      renouvellement: "renouv-1",
      portees: this.portees,
    };
  }
  // deno-lint-ignore require-await
  async renouveler(): Promise<Acces> {
    if (this.renouvellementRefuse) {
      throw new ErreurMessagerie("JETON_REVOQUE", "invalid_grant");
    }
    this.renouvellements++;
    return {
      jeton: `acces-neuf-${this.renouvellements}`,
      expire_le: "2026-10-06T17:00:00Z",
      ...(this.nom === "microsoft"
        ? { renouvellement: `renouv-tourne-${this.renouvellements}` }
        : {}),
    };
  }
  // deno-lint-ignore require-await
  async profil() {
    return { adresse: "compta@banc.test", curseur: this.profilCurseur };
  }
  // deno-lint-ignore require-await
  async nouveautes(_a: string, _c: string, etiquette: string) {
    this.etiquettesDemandees.push(etiquette);
    if (this.historiquePerime) {
      throw new ErreurMessagerie("CURSEUR_PERIME", "404");
    }
    return this.historique;
  }
  // deno-lint-ignore require-await
  async lireBrut(_a: string, id: string) {
    const m = this.messages.get(id);
    if (!m) {
      throw new ErreurMessagerie(
        "DEFINITIVE",
        `message ${id} introuvable`,
        404,
      );
    }
    return m;
  }
  // deno-lint-ignore require-await
  async creerBrouillon(acces: string, brut: Uint8Array) {
    this.brouillons.push({ acces, brut: new TextDecoder().decode(brut) });
    return {
      brouillon: `r-${this.brouillons.length}`,
      message: `m-${this.brouillons.length}`,
    };
  }
  // deno-lint-ignore require-await
  async revoquer(jeton: string) {
    this.revoques.push(jeton);
  }
}

export class StockageDouble {
  objets = new Map<string, { octets: Uint8Array; typeMime: string }>();
  // deno-lint-ignore require-await
  async deposer(
    chemin: string,
    octets: Uint8Array<ArrayBuffer>,
    typeMime: string,
  ) {
    this.objets.set(chemin, { octets, typeMime });
  }
  // deno-lint-ignore require-await
  async lirePiece(p: { id: string; chemin: string }) {
    const o = this.objets.get(p.chemin);
    if (!o) throw new Error(`${p.chemin} absent`);
    return o.octets;
  }
}

export const journalMuet = { info() {}, erreur() {} };

export function envoiGmail(
  partiel: Partial<EnvoiAEnvoyer> = {},
): EnvoiAEnvoyer {
  return {
    envoyer: true,
    envoi: ENVOI,
    mode: "reel",
    module: "tavaro",
    canal: "email",
    fournisseur: "gmail",
    expediteur: {
      identite: "compta@banc.test",
      nom_affiche: "Comptabilité Banc",
      repondre_a: null,
      parametres: { connexion: CONNEXION },
      secret: false,
    },
    destinataire: {
      adresse: "client@exemple.test",
      nom: "Élodie Martin",
      langue: "fr",
      professionnel: true,
    },
    sujet: "Votre facture d'octobre",
    corps: "Bonjour,\nVoici votre facture.\nCordialement",
    pieces: [],
    modele_externe: null,
    langue: "fr",
    parametres_modele: null,
    repondre_a: null,
    transactionnel: true,
    cle: ENVOI,
    objet: null,
    ...partiel,
  };
}
