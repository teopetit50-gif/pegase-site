// Doublures : des portes en mémoire et un Claude qui rend, appel après appel, des entrées d'outil écrites d'avance.

import type { ClientClaude, DemandeConverse, ReponseConverse } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import type { Travail } from "@partage/portes.ts";
import type { Contexte } from "../passage.ts";
import type { Dossier, Lecture, Meta, PortesQuestions, Reponse } from "../portes_questions.ts";

export const Q = "aaaaaaaa-0000-4000-8000-000000000001";
export const CATALOGUE: Lecture[] = [
  { lecture: "factures_mois", parametres: { mois: "AAAA-MM" }, rend: "facturé" },
  { lecture: "retours_non_factures", parametres: { jours: "1 à 90" }, rend: "retours sans facture" },
  { lecture: "peages", parametres: { jours: "1 à 90" }, rend: "péages" },
];

export function dossier(texte = "Combien de retours ne sont pas encore facturés ?"): Dossier {
  return { statut: "a_traiter", question: Q, client: "cccccccc-0000-4000-8000-00000000000c", texte, agence: "Lyon", organisation: "Autoloc", aujourdhui: "2026-10-17", catalogue: CATALOGUE };
}

export class ClaudeFaux implements ClientClaude {
  readonly fournisseur = "anthropic" as const;
  readonly modele = "claude-essai";
  readonly prix = { prixEntreeUsdMtok: 2, prixSortieUsdMtok: 10, tauxUsdEur: 1 };
  demandes: DemandeConverse[] = [];
  constructor(private readonly sorties: (unknown | (() => never))[]) {}
  converse(d: DemandeConverse): Promise<ReponseConverse> {
    this.demandes.push(d);
    const s = this.sorties.shift();
    if (typeof s === "function") return Promise.resolve().then(s as () => never);
    return Promise.resolve({ entree: s, usage: { tokens_entree: 1000, tokens_sortie: 100 }, stopReason: "tool_use" });
  }
}

export class PortesFausses implements PortesQuestions {
  travaux: Travail[] = [];
  finis: { id: number; resultat: unknown }[] = [];
  echoues: { id: number; erreur: string; reprendre: boolean }[] = [];
  lectures: { lecture: string; parametres: Record<string, unknown> }[] = [];
  reponses: { question: string; reponse: Reponse; meta: Meta }[] = [];
  echecs: string[] = [];
  battements = 0;
  consomme = 0;
  plafond: string | null = null;
  dossiers = new Map<string, Dossier>();
  resultats: Record<string, unknown> = { retours_non_factures: { jours: 30, nombre: 3, plus_anciens: [{ contrat: "C-2026-0412", rendu_le: "02/10", chiffrage: "pas_chiffre" }] } };
  definitif = false;

  prendreTravaux(): Promise<Travail[]> { return Promise.resolve(this.travaux.splice(0)); }
  finirTravail(id: number, resultat: unknown): Promise<void> { this.finis.push({ id, resultat }); return Promise.resolve(); }
  echouerTravail(id: number, erreur: string, reprendre = true): Promise<"repris" | "echec"> {
    this.echoues.push({ id, erreur, reprendre });
    return Promise.resolve(this.definitif || !reprendre ? "echec" : "repris");
  }
  battreOuvrier(): Promise<number> { this.battements++; return Promise.resolve(1); }
  consommationIaDuJour(): Promise<number> { return Promise.resolve(this.consomme); }
  lireParametre(): Promise<string | null> { return Promise.resolve(this.plafond); }
  commencer(question: string): Promise<Dossier> { return Promise.resolve(this.dossiers.get(question) ?? { statut: "ignore", motif: "question introuvable" }); }
  lire(_q: string, lecture: string, parametres: Record<string, unknown>): Promise<unknown> {
    this.lectures.push({ lecture, parametres });
    return Promise.resolve(this.resultats[lecture] ?? {});
  }
  repondre(question: string, reponse: Reponse, meta: Meta): Promise<void> { this.reponses.push({ question, reponse, meta }); return Promise.resolve(); }
  echec(question: string): Promise<void> { this.echecs.push(question); return Promise.resolve(); }
}

export function travail(id: number, question: string = Q): Travail {
  return { id, client_id: "cccccccc-0000-4000-8000-00000000000c", module: "tavaro", genre: "tavaro.question", charge: { question }, cle: null, essais: 0, essais_max: 5 };
}

export function contexte(portes: PortesFausses, claude: ClientClaude | null): Contexte {
  return { portes, claude, env: { get: () => undefined }, maintenant: () => new Date("2026-10-17T15:30:00Z"), ouvrier: "essai" };
}

export function panne(code: "FOURNISSEUR_INDISPONIBLE" | "IA_NON_BRANCHEE"): () => never {
  return () => { throw new ErreurOuvrier(code, "panne simulée"); };
}
