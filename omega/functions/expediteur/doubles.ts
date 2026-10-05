// Doubles des portes, de Brevo et du stockage pour les tests.

import type {
  EnvoiAEnvoyer,
  Portes,
  ReponseCommencer,
  ResultatEchecEnvoi,
  ResultatEchecTravail,
  Travail,
} from "./portes.ts";
import type { ClientBrevo, EmailBrevo, SmsBrevo } from "./brevo.ts";
import type { Stockage } from "./stockage.ts";
import type { Journal } from "./passage.ts";

export type AppelPorte = { porte: keyof Portes; args: unknown[] };

export class PortesDouble implements Portes {
  appels: AppelPorte[] = [];
  travaux: Travail[] = [];
  /** Réponse de commencer_envoi par uuid d'envoi ; absent → statut introuvable. */
  envois = new Map<string, ReponseCommencer>();
  secrets = new Map<string, string>();
  finis = new Map<number, Record<string, unknown>>();
  travauxEchoues = new Map<number, { erreur: string; reprendre: boolean }>();
  confirmes = new Map<string, string>();
  envoisEchoues = new Map<string, { erreur: string; definitif: boolean }>();
  battements: Record<string, unknown>[] = [];
  /** Pour simuler une porte qui tombe (toujours, ou n fois). */
  panne: Partial<Record<keyof Portes, Error>> = {};
  pannesRestantes: Partial<Record<keyof Portes, number>> = {};

  private noter(porte: keyof Portes, ...args: unknown[]) {
    this.appels.push({ porte, args });
    const restantes = this.pannesRestantes[porte];
    if (restantes !== undefined) {
      if (restantes > 0) {
        this.pannesRestantes[porte] = restantes - 1;
        throw new Error(`panne simulée de ${porte}`);
      }
      return;
    }
    const p = this.panne[porte];
    if (p) throw p;
  }
  // deno-lint-ignore require-await
  async prendreTravaux(
    genres: string[],
    nombre: number,
    bail: string,
    ouvrier: string,
  ) {
    this.noter("prendreTravaux", genres, nombre, bail, ouvrier);
    return this.travaux.slice(0, nombre);
  }
  // deno-lint-ignore require-await
  async finirTravail(id: number, resultat: Record<string, unknown>) {
    this.noter("finirTravail", id, resultat);
    this.finis.set(id, resultat);
  }
  // deno-lint-ignore require-await
  async echouerTravail(
    id: number,
    erreur: string,
    reprendre: boolean,
  ): Promise<ResultatEchecTravail> {
    this.noter("echouerTravail", id, erreur, reprendre);
    this.travauxEchoues.set(id, { erreur, reprendre });
    return reprendre ? "repris" : "echec";
  }
  // deno-lint-ignore require-await
  async battreOuvrier(
    module: string,
    genres: string[],
    detail: Record<string, unknown>,
    attendu: string,
  ) {
    this.noter("battreOuvrier", module, genres, detail, attendu);
    this.battements.push({ module, genres, detail, attendu });
    return 1;
  }
  // deno-lint-ignore require-await
  async commencerEnvoi(envoi: string): Promise<ReponseCommencer> {
    this.noter("commencerEnvoi", envoi);
    return this.envois.get(envoi) ?? { envoyer: false, statut: "introuvable" };
  }
  // deno-lint-ignore require-await
  async secretExpediteur(envoi: string) {
    this.noter("secretExpediteur", envoi);
    return this.secrets.get(envoi) ?? null;
  }
  // deno-lint-ignore require-await
  async confirmerEnvoi(envoi: string, reference: string) {
    this.noter("confirmerEnvoi", envoi, reference);
    this.confirmes.set(envoi, reference);
  }
  // deno-lint-ignore require-await
  async echouerEnvoi(
    envoi: string,
    erreur: string,
    definitif: boolean,
  ): Promise<ResultatEchecEnvoi> {
    this.noter("echouerEnvoi", envoi, erreur, definitif);
    this.envoisEchoues.set(envoi, { erreur, definitif });
    return definitif ? "echec" : "pret";
  }
}

export class BrevoDouble implements ClientBrevo {
  emails: EmailBrevo[] = [];
  sms: SmsBrevo[] = [];
  /** Clés API avec lesquelles le client a été fabriqué, dans l'ordre. */
  cles: string[] = [];
  erreur: Error | null = null;
  compteur = 0;
  // deno-lint-ignore require-await
  async envoyerEmail(message: EmailBrevo) {
    if (this.erreur) throw this.erreur;
    this.emails.push(message);
    return { messageId: `<${++this.compteur}@smtp-relay.mailin.fr>` };
  }
  // deno-lint-ignore require-await
  async envoyerSms(message: SmsBrevo) {
    if (this.erreur) throw this.erreur;
    this.sms.push(message);
    return {
      reference: `ref-${++this.compteur}`,
      messageId: 1000 + this.compteur,
    };
  }
}

export class StockageDouble implements Stockage {
  objets = new Map<string, Uint8Array>();
  // deno-lint-ignore require-await
  async lirePiece(piece: { id: string; chemin: string }) {
    const o = this.objets.get(piece.chemin);
    if (!o) throw new Error(`objet absent : ${piece.chemin}`);
    return o;
  }
}

export function journalMemoire(): Journal & { lignes: string[] } {
  const lignes: string[] = [];
  return {
    lignes,
    info: (m) => lignes.push(`info ${m}`),
    erreur: (m) => lignes.push(`erreur ${m}`),
  };
}

export const ENVOI = "11111111-1111-4111-8111-111111111111";

export function envoiExemple(
  partiel: Partial<EnvoiAEnvoyer> = {},
): EnvoiAEnvoyer {
  const id = partiel.envoi ?? ENVOI;
  return {
    envoyer: true,
    envoi: id,
    mode: "reel",
    module: "cashd",
    canal: "email",
    fournisseur: "brevo",
    expediteur: {
      identite: "relances@client.test",
      nom_affiche: "Client Test",
      repondre_a: "reponses@client.test",
      parametres: {},
      secret: false,
    },
    destinataire: {
      adresse: "destinataire@exemple.test",
      nom: "Destinataire Test",
      langue: "fr",
      professionnel: true,
    },
    sujet: "Relance de facture",
    corps: "Bonjour,\n\nVotre facture est en attente.",
    pieces: [],
    modele_externe: null,
    langue: "fr",
    parametres_modele: null,
    repondre_a: null,
    transactionnel: true,
    cle: id,
    objet: { type: "facture", id: "f1" },
    ...partiel,
  };
}

export function travailExemple(
  id: number,
  genre: string,
  envoi: string,
): Travail {
  return { id, genre, charge: { envoi }, cle: `envoi:${envoi}`, essais: 0 };
}
