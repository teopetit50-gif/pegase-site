// deno-lint-ignore-file require-await
// Doubles : portes de relevé en mémoire, dépôt en mémoire.

import type { Depot, Telechargement } from "@partage/depot.ts";
import type { Travail } from "@partage/portes.ts";
import type { Contexte } from "../lire_export.ts";
import type { InstantaneALire, JeuDeclare, LigneDeposee, PortesReleve, ResultatReleve } from "../portes_releve.ts";

export class PortesReleveMemoire implements PortesReleve {
  travaux: Travail[] = [];
  instantanes = new Map<string, InstantaneALire & { statut: string }>();
  lignes = new Map<string, LigneDeposee[]>();
  depots: { instantane: string; nombre: number }[] = [];
  termines: { instantane: string; resultat: ResultatReleve; version: string }[] = [];
  finis: { id: number; resultat: unknown }[] = [];
  echoues: { id: number; erreur: string; reprendre: boolean }[] = [];
  battements: { module: string; genres: string[]; detail: unknown }[] = [];
  panne: Partial<Record<keyof PortesReleve, Error>> = {};

  private noter(porte: keyof PortesReleve) {
    const p = this.panne[porte];
    if (p) throw p;
  }
  async prendreTravaux(genres: string[], nombre: number): Promise<Travail[]> {
    this.noter("prendreTravaux");
    const pris = this.travaux.filter((t) => genres.includes(t.genre)).slice(0, nombre);
    this.travaux = this.travaux.filter((t) => !pris.includes(t));
    return pris;
  }
  async finirTravail(id: number, resultat: unknown): Promise<void> {
    this.noter("finirTravail");
    this.finis.push({ id, resultat });
  }
  async echouerTravail(id: number, erreur: string, reprendre = true): Promise<"repris" | "echec"> {
    this.noter("echouerTravail");
    this.echoues.push({ id, erreur, reprendre });
    return reprendre ? "repris" : "echec";
  }
  async battreOuvrier(module: string, genres: string[], detail: unknown): Promise<number> {
    this.noter("battreOuvrier");
    this.battements.push({ module, genres, detail });
    return 1;
  }
  async commencerReleve(instantane: string): Promise<InstantaneALire | null> {
    this.noter("commencerReleve");
    const i = this.instantanes.get(instantane);
    if (!i || !["recu", "en_lecture"].includes(i.statut)) return null;
    i.statut = "en_lecture";
    this.lignes.delete(instantane);
    const { statut: _s, ...reste } = i;
    return reste;
  }
  async deposerLignes(instantane: string, lignes: LigneDeposee[]): Promise<number> {
    this.noter("deposerLignes");
    const i = this.instantanes.get(instantane);
    if (!i || i.statut !== "en_lecture") throw new Error("instantané pas en lecture");
    const deja = this.lignes.get(instantane) ?? [];
    const ns = new Set(deja.map((l) => l.n));
    const cles = new Set(deja.map((l) => l.cle));
    for (const l of lignes) {
      if (!Number.isInteger(l.n) || l.n < 1 || ns.has(l.n)) throw new Error(`n invalide ou en double : ${l.n}`);
      if (l.ligne !== null && (!Number.isInteger(l.ligne) || l.ligne < 1)) throw new Error("ligne invalide");
      if (typeof l.cle !== "string" || l.cle.length < 1 || l.cle.length > 1000 || cles.has(l.cle)) throw new Error(`cle invalide ou en double : ${l.cle}`);
      if (!l.valeurs || typeof l.valeurs !== "object" || Array.isArray(l.valeurs)) throw new Error("valeurs : objet attendu");
      if (l.anomalies !== undefined && (typeof l.anomalies !== "object" || Object.keys(l.anomalies).length === 0)) {
        throw new Error("anomalies : objet non vide ou absent");
      }
      for (const k of Object.keys(l)) if (!["n", "ligne", "cle", "valeurs", "anomalies"].includes(k)) throw new Error(`clé inattendue : ${k}`);
      ns.add(l.n);
      cles.add(l.cle);
    }
    this.lignes.set(instantane, [...deja, ...lignes]);
    this.depots.push({ instantane, nombre: lignes.length });
    return lignes.length;
  }
  async terminerLecture(instantane: string, resultat: ResultatReleve, version: string): Promise<unknown> {
    this.noter("terminerLecture");
    const i = this.instantanes.get(instantane);
    if (!i || i.statut !== "en_lecture") throw new Error("instantané pas en lecture");
    if (!["lu", "a_classer", "rejete", "echec"].includes(resultat.statut)) throw new Error(`statut inconnu ${resultat.statut}`);
    if (resultat.motif && resultat.motif.length > 500) throw new Error("motif trop long");
    if (version.length > 40) throw new Error("version trop longue");
    if (resultat.statut === "lu") {
      if (!resultat.jeu || !i.jeux.some((j) => j.code === resultat.jeu)) throw new Error("Jeu inconnu");
      if (resultat.lignes !== (this.lignes.get(instantane) ?? []).length) throw new Error("lignes annoncées ≠ déposées");
    } else this.lignes.delete(instantane);
    i.statut = resultat.statut;
    this.termines.push({ instantane, resultat, version });
    return { statut: resultat.statut };
  }
}

export class DepotMemoire implements Depot {
  fichiers = new Map<string, Uint8Array>();
  async telecharger(chemin: string): Promise<Telechargement> {
    const o = this.fichiers.get(chemin);
    return o ? { present: true, octets: o, mime: null } : { present: false };
  }
}

export const CLIENT = "cccccccc-0000-4000-8000-00000000000c";
export const BRANCHEMENT = "bbbbbbbb-0000-4000-8000-000000000001";

export function jeuPatients(): JeuDeclare {
  return {
    code: "patients",
    libelle: "Patients",
    motif_fichier: "patients*.csv",
    entetes: ["N° dossier", "Nom", "Prénom", "Date de naissance"],
    colonnes: {
      dossier: { type: "texte", entetes: ["N° dossier", "Numéro dossier"], obligatoire: true },
      nom: { type: "texte", entetes: ["Nom"], obligatoire: true },
      prenom: { type: "texte", entetes: ["Prénom"] },
      naissance: { type: "date", entetes: ["Date de naissance"], sensible: true },
      telephone: { type: "texte", entetes: ["Téléphone"], sensible: true },
      derniere_visite: { type: "date", entetes: ["Dernière visite"], facultative: true },
      courriel: { type: "texte", entetes: ["Courriel", "Email", "E-mail"], facultative: true },
    },
    cle: ["dossier"],
    options: {},
  };
}

export function jeuArticles(): JeuDeclare {
  return {
    code: "articles",
    libelle: "Articles",
    motif_fichier: "articles*.xlsx",
    entetes: ["Code article", "Libellé", "Stock"],
    colonnes: {
      code: { type: "texte", entetes: ["Code article"], obligatoire: true },
      libelle: { type: "texte", entetes: ["Libellé"] },
      famille: { type: "texte", entetes: ["Famille"] },
      stock: { type: "entier", entetes: ["Stock"] },
      pu_ht: { type: "decimal", entetes: ["PU HT"] },
    },
    cle: ["code"],
    options: { feuille: "Articles" },
  };
}

export function instantaneDeTest(id: string, nom_fichier: string, mime: string, jeu: string | null, jeux: JeuDeclare[]): InstantaneALire & { statut: string } {
  return {
    statut: "recu",
    instantane: id,
    client: CLIENT,
    branchement: BRANCHEMENT,
    module: "tiroma",
    logiciel: "logiciel_test",
    fuseau: "Europe/Paris",
    nom_fichier,
    chemin: `${CLIENT}/branchement/${BRANCHEMENT}/${nom_fichier}`,
    mime,
    octets: null,
    sha256: "0".repeat(64),
    force: false,
    jeu,
    jeux,
  };
}

export function travailDeTest(id: number, instantane: string): Travail {
  return { id, client_id: CLIENT, module: "tiroma", genre: "releve.lire", charge: { instantane }, cle: `instantane:${instantane}`, essais: 1, essais_max: 5 };
}

export function contexteDeTest(taillePaquet = 500): { ctx: Contexte; portes: PortesReleveMemoire; depot: DepotMemoire } {
  const portes = new PortesReleveMemoire();
  const depot = new DepotMemoire();
  const ctx: Contexte = { portes, depot, maintenant: () => new Date("2026-10-05T21:00:00Z"), ouvrier: "lecteur-exports-test", taillePaquet };
  return { ctx, portes, depot };
}
