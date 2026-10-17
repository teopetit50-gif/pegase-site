// Doublures : des portes en mémoire et un Claude qui rend une entrée d'outil écrite d'avance.

import type { ClientClaude, DemandeConverse, ReponseConverse } from "@partage/claude.ts";
import type { Travail } from "@partage/portes.ts";
import type { Contexte } from "../passage.ts";
import type { Dossier, PortesQuestions, ResultatQuestion } from "../portes_questions.ts";

export const QUESTION = "aaaaaaaa-0000-4000-8000-000000000001";
export const CLIENT = "cccccccc-0000-4000-8000-00000000000c";

export function dossier(texte = "Qu'est-ce qui n'est pas au devis ?", extra: Partial<Dossier> = {}): Dossier {
  return {
    statut: "a_repondre",
    question: QUESTION,
    client: CLIENT,
    texte,
    voit_prix: true,
    contexte: {
      aujourdhui: "2026-10-17",
      tableau: {
        chantier: { nom: "Maison Lefèvre", commune: "Villeurbanne" },
        voit_prix: true,
        marches: [{ reference: "LEF-1", statut: "verifie", lignes: [{ numero: "1.1", designation: "Menuiseries extérieures", quantite: 100, prix_unitaire_ht: 50.0, montant_ht: 5000.0 }] }],
        avenants: [{ numero: 2, objet: "Reprise d'enduit façade nord", statut: "a_signer", montant_ht: 1840.0 }],
        passages: [{ lot_code: "01", tache: "Pose menuiseries", debut: "2026-10-20", fin: "2026-10-22", confirmation: "demandee" }],
      },
      fil: [{ recu_le: "2026-10-12T08:14:00Z", canal: "whatsapp", de: "Chef d'équipe", texte: "Enduit à reprendre sur la façade nord, 2 m².", pieces: 1 }],
    },
    ...extra,
  };
}

export class ClaudeFaux implements ClientClaude {
  readonly fournisseur = "anthropic" as const;
  readonly modele = "claude-essai";
  readonly prix = { prixEntreeUsdMtok: 2, prixSortieUsdMtok: 10, tauxUsdEur: 1 };
  demandes: DemandeConverse[] = [];
  constructor(private readonly sortie: unknown | (() => never)) {}
  converse(d: DemandeConverse): Promise<ReponseConverse> {
    this.demandes.push(d);
    if (typeof this.sortie === "function") return Promise.resolve().then(this.sortie as () => never);
    return Promise.resolve({ entree: this.sortie, usage: { tokens_entree: 3000, tokens_sortie: 200 }, stopReason: "tool_use" });
  }
}

export class PortesFausses implements PortesQuestions {
  travaux: Travail[] = [];
  finis: { id: number; resultat: unknown }[] = [];
  echoues: { id: number; erreur: string; reprendre: boolean }[] = [];
  depots: { question: string; resultat: ResultatQuestion; version: string }[] = [];
  echecs: { question: string; motif: string }[] = [];
  battements = 0;
  consomme = 0;
  plafond: string | null = null;
  dossiers = new Map<string, Dossier>();
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
  commencer(question: string): Promise<Dossier> {
    return Promise.resolve(this.dossiers.get(question) ?? { statut: "ignore", motif: "question introuvable" });
  }
  deposer(question: string, resultat: ResultatQuestion, version: string): Promise<{ statut: string }> {
    this.depots.push({ question, resultat, version });
    return Promise.resolve({ statut: "repondue" });
  }
  marquerEchec(question: string, motif: string): Promise<void> { this.echecs.push({ question, motif }); return Promise.resolve(); }
}

export function travail(id = 1, charge: Record<string, unknown> = { question: QUESTION }): Travail {
  return { id, client_id: CLIENT, module: "daliro", genre: "daliro.question", charge, cle: `question:${QUESTION}`, essais: 1, essais_max: 5 };
}

export function contexte(portes: PortesFausses, claude: ClientClaude | null): Contexte {
  return { portes, claude, env: { get: () => undefined }, maintenant: () => new Date("2026-10-17T10:00:00Z"), ouvrier: "essai" };
}
