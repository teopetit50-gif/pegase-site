// Doubles des portes, de Brevo et du stockage pour les tests.

import type {
  EnvoiARemettre,
  Portes,
  ResultatEchec,
  Travail,
} from "./portes.ts";
import type { ClientBrevo, EmailBrevo, SmsBrevo } from "./brevo.ts";
import type { Stockage } from "./stockage.ts";
import type { Journal } from "./passage.ts";

export type AppelPorte = { porte: string; args: unknown[] };

export class PortesDouble implements Portes {
  appels: AppelPorte[] = [];
  travaux: Travail[] = [];
  envois = new Map<string, EnvoiARemettre>();
  finis = new Map<number, Record<string, unknown>>();
  echoues = new Map<number, { erreur: string; reprendre: boolean }>();
  battements: Record<string, unknown>[] = [];
  /** Pour simuler une porte qui tombe. */
  panne: Partial<Record<keyof Portes, Error>> = {};

  private noter(porte: keyof Portes, ...args: unknown[]) {
    this.appels.push({ porte, args });
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
  ): Promise<ResultatEchec> {
    this.noter("echouerTravail", id, erreur, reprendre);
    this.echoues.set(id, { erreur, reprendre });
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
  async envoiARemettre(envoi: string) {
    this.noter("envoiARemettre", envoi);
    return this.envois.get(envoi) ?? null;
  }
}

export class BrevoDouble implements ClientBrevo {
  emails: EmailBrevo[] = [];
  sms: SmsBrevo[] = [];
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
  async lirePiece(
    piece: { id: string; chemin?: string | null; url?: string | null },
  ) {
    const cle = piece.chemin ?? piece.url ?? "";
    const o = this.objets.get(cle);
    if (!o) throw new Error(`objet absent : ${cle}`);
    return o;
  }
}

export const journalMuet: Journal = { info: () => {}, erreur: () => {} };

export function journalMemoire(): Journal & { lignes: string[] } {
  const lignes: string[] = [];
  return {
    lignes,
    info: (m) => lignes.push(`info ${m}`),
    erreur: (m) => lignes.push(`erreur ${m}`),
  };
}

export function envoiExemple(
  partiel: Partial<EnvoiARemettre> = {},
): EnvoiARemettre {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    client_id: "22222222-2222-4222-8222-222222222222",
    module: "cashd",
    canal: "email",
    statut: "pret",
    essais: 0,
    reference_externe: null,
    cle_idempotence: "cashd:relance:1",
    destinataire: {
      adresse: "destinataire@exemple.test",
      nom: "Destinataire Test",
      langue: "fr",
      fuseau: "Europe/Paris",
      territoire: "FR",
    },
    expediteur: {
      id: "33333333-3333-4333-8333-333333333333",
      identite: "essais@omegaai.fr",
      nom_affiche: "Omega — essais",
      repondre_a: "reponses@omegaai.fr",
      fournisseur: "brevo",
      parametres: {},
    },
    repondre_a: null,
    sujet: "Relance de facture",
    corps: "Bonjour,\n\nVotre facture est en attente.",
    transactionnel: true,
    donnees_sante: false,
    pieces: [],
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
