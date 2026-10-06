// Le travail lecteur.analyser : dossier Tamila chiffré ouvert avec la clé du coffre, résultat et état rendus
// chiffrés (rien en clair que les comptes), reprise d'un état chiffré, coffre local refusé ; règles des types
// Tamila (chronologie triée, bordereau numéroté, contradiction à une seule citation ramenée à « attention »).

import { assert, assertEquals } from "@std/assert";
import type { ClientClaude, DemandeConverse, ReponseConverse } from "@partage/claude.ts";
import type { Travail } from "@partage/portes.ts";
import { analyserTravail, type DossierAnalyse, type ResultatTravailAnalyse } from "../analyse/travail.ts";
import type { Constat } from "../analyse/moteur.ts";
import { TAMILA_BORDEREAU, TAMILA_CHRONOLOGIE, TAMILA_CONTRADICTIONS } from "../analyse/types_tamila.ts";
import { type ClePiece, chiffrerTexte, type CoffreTamila, dechiffrerTexte } from "../coffre.ts";

const CLE = () => Uint8Array.from({ length: 32 }, (_, i) => (i * 11 + 5) & 0xff);
const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";

class Client implements ClientClaude {
  readonly fournisseur = "anthropic" as const;
  readonly modele = "claude-test";
  readonly prix = { prixEntreeUsdMtok: 2, prixSortieUsdMtok: 10, tauxUsdEur: 1 };
  vus: string[] = [];
  constructor(private reponses: unknown[]) {}
  converse(d: DemandeConverse): Promise<ReponseConverse> {
    this.vus.push((d.contenu[0] as { text: string }).text);
    return Promise.resolve({ entree: this.reponses.shift() ?? { constats: [] }, usage: { tokens_entree: 1000, tokens_sortie: 100 }, stopReason: "tool_use" });
  }
}

function coffre(fournisseur: "scaleway" | "local"): CoffreTamila & { remises: Uint8Array[] } {
  const remises: Uint8Array[] = [];
  return {
    remises,
    clePiece: (): Promise<ClePiece> => {
      if (fournisseur === "local") return Promise.resolve({ fournisseur: "local" });
      const cle = CLE();
      remises.push(cle);
      return Promise.resolve({ fournisseur: "scaleway", cle, dossier: "d" });
    },
    dossier: () => Promise.reject(new Error("non utilisé")),
    poserAvis: () => Promise.reject(new Error("non utilisé")),
  };
}

function portes(d: DossierAnalyse | null) {
  const p = {
    termines: [] as { analyse: string; r: ResultatTravailAnalyse; version: string }[],
    finis: [] as unknown[],
    echoues: [] as string[],
    commencerAnalyse: () => Promise.resolve(d),
    terminerAnalyse: (analyse: string, r: ResultatTravailAnalyse, version: string) => {
      p.termines.push({ analyse, r, version });
      return Promise.resolve(null);
    },
    finirTravail: (_id: number, r: unknown) => {
      p.finis.push(r);
      return Promise.resolve();
    },
    echouerTravail: (_id: number, e: string) => {
      p.echoues.push(e);
      return Promise.resolve("repris" as const);
    },
  };
  return p;
}

const travail: Travail = { id: 7, client_id: "c", module: "tamila", genre: "lecteur.analyser", charge: { analyse: "an-1" }, cle: null, essais: 1, essais_max: 5 };
const TEXTE_A = "CONCLUSIONS\nLe 3 mars 2026, la société Dupont a livré le chantier.\nFin.";
const TEXTE_B = "ASSIGNATION\nLa réception a eu lieu le 10 avril 2026.\nRéserves.";
const evenement = (piece: string, ligne: number, extrait: string, date: string) => ({
  code: "evenement",
  titre: "…",
  texte: "…",
  gravite: "info",
  donnees: { date, precision: "jour", evenement: extrait, acteur: "client", nature: "fait" },
  citations: [{ piece, page: 1, lignes: [ligne, ligne], extrait }],
});

async function dossierChiffre(): Promise<DossierAnalyse> {
  return {
    analyse: "an-1",
    client: "c",
    module: "tamila",
    type: "tamila.chronologie",
    chiffrement: "dossier:v1",
    pieces: [
      { piece: A, nom: "conclusions.pdf", chiffrement: "dossier:v1", pages: [{ n: 1, texte_chiffre: await chiffrerTexte(CLE(), TEXTE_A) }] },
      { piece: B, nom: "assignation.pdf", chiffrement: "dossier:v1", pages: [{ n: 1, texte_chiffre: await chiffrerTexte(CLE(), TEXTE_B) }] },
    ],
  };
}

Deno.test("Tamila chiffré : pages ouvertes avec la clé du coffre, résultat rendu chiffré, rien en clair que les comptes", async () => {
  const p = portes(await dossierChiffre());
  const c = coffre("scaleway");
  const client = new Client([
    { constats: [evenement(A, 2, "Le 3 mars 2026, la société Dupont a livré le chantier.", "2026-03-03")] },
    { constats: [evenement(B, 2, "La réception a eu lieu le 10 avril 2026.", "2026-04-10")] },
    {
      resume: "Livraison puis réception.",
      constats: [
        evenement(B, 2, "La réception a eu lieu le 10 avril 2026.", "2026-04-10"),
        evenement(A, 2, "Le 3 mars 2026, la société Dupont a livré le chantier.", "2026-03-03"),
      ],
    },
  ]);
  const issue = await analyserTravail({ portes: p, claude: client, coffre: c, maintenant: () => new Date("2026-10-06T12:00:00Z") }, travail, 60_000);
  assertEquals(issue, "finie");
  assert(client.vus[0].includes("la société Dupont"), "le modèle a lu le texte déchiffré");
  const r = p.termines[0].r;
  assertEquals(r.statut, "finie");
  assertEquals(r.comptes, { info: 2, attention: 0, critique: 0 });
  assertEquals(r.resultat, undefined, "pas de résultat en clair");
  const clair = JSON.stringify({ ...r, resultat_chiffre: undefined });
  assert(!clair.includes("Dupont") && !clair.includes("réception"), "rien du dossier en clair");
  const ouvert = JSON.parse(await dechiffrerTexte(CLE(), r.resultat_chiffre!));
  assertEquals(ouvert.resume, "Livraison puis réception.");
  assertEquals(ouvert.constats.map((x: Constat) => x.donnees.date), ["2026-03-03", "2026-04-10"], "chronologie triée par date");
  assert(c.remises[0].every((b) => b === 0), "clé effacée");
  assert(!JSON.stringify(p.finis).includes("Dupont"));
});

Deno.test("paliers chiffrés : budget épuisé → état chiffré ; le passage suivant le rouvre et finit", async () => {
  const d = await dossierChiffre();
  const p1 = portes(d);
  const c1 = new Client([]);
  assertEquals(await analyserTravail({ portes: p1, claude: c1, coffre: coffre("scaleway"), maintenant: () => new Date() }, travail, -1), "en_cours");
  const e = p1.termines[0].r;
  assertEquals(e.statut, "en_cours");
  assert(e.etat_chiffre && !e.etat, "état chiffré, pas en clair");
  const p2 = portes({ ...d, etat_chiffre: e.etat_chiffre });
  const c2 = new Client([
    { constats: [evenement(A, 2, "Le 3 mars 2026, la société Dupont a livré le chantier.", "2026-03-03")] },
    { constats: [evenement(B, 2, "La réception a eu lieu le 10 avril 2026.", "2026-04-10")] },
    { resume: "r", constats: [evenement(B, 2, "La réception a eu lieu le 10 avril 2026.", "2026-04-10")] },
  ]);
  assertEquals(await analyserTravail({ portes: p2, claude: c2, coffre: coffre("scaleway"), maintenant: () => new Date() }, travail, 60_000), "finie");
  assertEquals(p2.termines[0].r.statut, "finie");
  assert(p2.termines[0].r.resultat_chiffre, "fini : le résultat part chiffré");
  // (la non-relecture d'une tranche déjà faite est prouvée dans analyse_test.ts)
});

Deno.test("dossier chiffré sans coffre serveur : analyse en échec motivé, pas de reprise sans fin", async () => {
  const p = portes(await dossierChiffre());
  assertEquals(await analyserTravail({ portes: p, claude: new Client([]), coffre: coffre("local"), maintenant: () => new Date() }, travail, 60_000), "echec");
  assertEquals(p.termines[0].r.statut, "echec");
  assertEquals(p.echoues.length, 0);
});

Deno.test("dossier en clair (autre module) : résultat rendu en clair ; type inconnu → échec", async () => {
  const d: DossierAnalyse = { analyse: "an-2", client: "c", module: "essai", type: "tamila.bordereau", chiffrement: null, pieces: [{ piece: A, nom: "a.pdf", pages: [{ n: 1, texte: TEXTE_A }] }] };
  const p = portes(d);
  const client = new Client([{ constats: [{ code: "piece", titre: "Conclusions", texte: "…", gravite: "info", donnees: { intitule: "Conclusions", nature: "conclusions", piece: A, pages: 1, date: "2026-03-03" }, citations: [{ piece: A, page: 1, lignes: [1, 1], extrait: "CONCLUSIONS" }] }] }]);
  assertEquals(await analyserTravail({ portes: p, claude: client, coffre: null, maintenant: () => new Date() }, travail, 60_000), "finie");
  assertEquals(p.termines[0].r.resultat!.constats[0].donnees.numero, 1);
  const p2 = portes({ ...d, type: "tamila.inconnu" });
  assertEquals(await analyserTravail({ portes: p2, claude: client, coffre: null, maintenant: () => new Date() }, travail, 60_000), "echec");
});

Deno.test("types Tamila : bordereau numéroté par date, contradiction à une seule citation vérifiée ramenée à « attention »", () => {
  const c = (date: string | undefined, gravite: "info" | "critique", verifiees: number): Constat => ({
    code: "x",
    titre: "",
    texte: "",
    gravite,
    donnees: date ? { date } : {},
    citations: Array.from({ length: 2 }, (_, i) => ({ piece: A, page: 1, lignes: [1, 1] as [number, number], extrait: "x", verifiee: i < verifiees })),
  });
  const b = TAMILA_BORDEREAU.finaliser!([c("2026-05-01", "info", 1), c(undefined, "info", 1), c("2026-01-15", "info", 1)]);
  assertEquals(b.map((x) => [x.donnees.date, x.donnees.numero]), [["2026-01-15", 1], ["2026-05-01", 2], [undefined, 3]]);
  const k = TAMILA_CONTRADICTIONS.finaliser!([c(undefined, "critique", 1), c(undefined, "critique", 2)]);
  assertEquals(k.map((x) => x.gravite), ["attention", "critique"]);
  assertEquals(TAMILA_CHRONOLOGIE.limites.pages, 3000);
});
