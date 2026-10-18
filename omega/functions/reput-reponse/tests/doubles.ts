// Doublures : des portes en mémoire et un Claude qui rend une entrée d'outil écrite d'avance.

import type { ClientClaude, DemandeConverse, ReponseConverse } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import type { Travail } from "@partage/portes.ts";
import type { Contexte } from "../passage.ts";
import type { Depot, Dossier, PortesReput, ResultatReponse } from "../portes_reput.ts";

export const FICHE_HORAIRES = {
  id: "11111111-1111-4111-8111-111111111111", sujet: "horaires", genre: "horaires", titre: "Horaires",
  contenu: "Du lundi au vendredi de 8 h 30 à 18 h ; le samedi de 9 h à 12 h.", langue: "fr", source: "Gérant",
};
export const FICHE_TARIF = {
  id: "22222222-2222-4222-8222-222222222222", sujet: "tarifs", genre: "tarif", titre: "Diagnostic",
  contenu: "Le diagnostic à domicile coûte 89 € TTC.", langue: "fr", source: "Grille 2026",
};

export function dossier(corps = "Bonjour, êtes-vous ouverts samedi matin ?", extra: Partial<Dossier> = {}): Dossier {
  return {
    statut: "a_preparer",
    demande: "dddddddd-0000-4000-8000-000000000001",
    client: "cccccccc-0000-4000-8000-00000000000c",
    reception: { id: 42, canal: "email", de_nom: "Marie Durand", sujet: "Samedi ?", corps, langue: null, recu_le: "2026-10-06T19:47:00Z", pieces: 0, en_reponse_a: false },
    canal_reponse: "email",
    base: {
      organisation: "Groupe Sogexal (banc)",
      installe: true,
      reglages: { signature: "L'équipe", formule_appel: "Bonjour,", formule_politesse: "Bien cordialement,", ton: "vouvoiement", mention_automatisee: null, langues: ["fr", "en"], actif: true },
      sujets: [
        { code: "horaires", libelle: "Horaires", description: null, autorisable: true },
        { code: "tarifs", libelle: "Tarifs", description: null, autorisable: true },
        { code: "reclamation", libelle: "Réclamation", description: null, autorisable: false },
        { code: "autre", libelle: "Autre", description: null, autorisable: false },
      ],
      fiches: [FICHE_HORAIRES, FICHE_TARIF],
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
    return Promise.resolve({ entree: this.sortie, usage: { tokens_entree: 1500, tokens_sortie: 100 }, stopReason: "tool_use" });
  }
}

export class PortesFausses implements PortesReput {
  travaux: Travail[] = [];
  finis: { id: number; resultat: unknown }[] = [];
  echoues: { id: number; erreur: string; reprendre: boolean }[] = [];
  depots: { demande: string; resultat: ResultatReponse; version: string }[] = [];
  echecs: { demande: string; motif: string }[] = [];
  battements = 0;
  consomme = 0;
  plafond: string | null = null;
  dossiers = new Map<number, Dossier>();
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
  commencer(reception: number): Promise<Dossier> {
    return Promise.resolve(this.dossiers.get(reception) ?? { statut: "ignore", motif: "réception introuvable" });
  }
  deposerReponse(demande: string, resultat: ResultatReponse, version: string): Promise<Depot> {
    this.depots.push({ demande, resultat, version });
    return Promise.resolve({ statut: "a_valider", demande, reponse: "rrrrrrrr-0000-4000-8000-000000000001", sujet: resultat.sujet, couverte: resultat.couverte, envoi: "eeee", envoi_statut: "a_valider" });
  }
  marquerEchec(demande: string, motif: string): Promise<void> { this.echecs.push({ demande, motif }); return Promise.resolve(); }
}

export function travail(id: number, reception: number, module: string | null = "reput"): Travail {
  return { id, client_id: "cccccccc-0000-4000-8000-00000000000c", module: "reput", genre: "reput.preparer",
           charge: { reception, ...(module ? { module } : {}), canal: "email", evenement: "reception.nouvelle" }, cle: null, essais: 0, essais_max: 5 };
}

export function contexte(portes: PortesFausses, claude: ClientClaude | null): Contexte {
  return { portes, claude, env: { get: () => undefined }, maintenant: () => new Date("2026-10-06T19:48:00Z"), ouvrier: "essai" };
}

export function panne(code: "FOURNISSEUR_INDISPONIBLE" | "IA_NON_BRANCHEE"): () => never {
  return () => { throw new ErreurOuvrier(code, "panne simulée"); };
}
