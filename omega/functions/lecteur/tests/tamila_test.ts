// Le module Tamila (avis RPVA des cabinets d'avocats) : dix types, les clés
// de p_valeurs de tamila_avis_lu, la date et heure locale ; FILED et Lorani
// inchangés.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { ecrirePdf, type LigneTexte } from "../banc/pdf_minimal.ts";
import { consigneSysteme, type SortieOutil } from "../ia.ts";
import { lirePiece } from "../lire_piece.ts";
import { champsPour, schemaOutilPour, typesPour } from "../schemas/modules.ts";
import { dateHeureLocale, typerValeur } from "../verifier.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const lignes = (textes: string[]): LigneTexte[] => textes.map((texte, i) => ({ x: 50, y: 60 + i * 18, texte }));

function pdf(textes: string[]): Uint8Array {
  return ecrirePdf([{ type: "texte", lignes: lignes(textes) }]);
}

async function lireTamila(id: string, nom: string, octets: Uint8Array, sortie: SortieOutil) {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const piece = pieceDeTest(`cccccccc-0000-4000-8000-0000000000${id}`, nom, "application/pdf", { module: "tamila", objet_type: "tamila_dossier" });
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, octets);
  ia!.prochaine = sortie;
  const issue = await lirePiece(ctx, travailDeTest(Number(id), piece.id));
  return { issue, portes, ia: ia! };
}

// Les clés que private.tamila_avis_lu lit dans p_valeurs (SOCLE-EXTRAITS-TAMILA.sql).
const CLES_AVIS_LU = ["date_avis", "date_audience", "date_cloture_previsible", "date_limite", "partie_visee", "rang", "depose_le"];
// La contrainte tamila_avis_type_avis_check.
const TYPES_AVIS = [
  "rpva_avis_fixation",
  "rpva_avis_902",
  "rpva_declaration_appel",
  "rpva_conclusions",
  "rpva_appel_incident",
  "rpva_intervention",
  "rpva_ordonnance_mee",
  "rpva_avis_audience",
  "rpva_accuse_depot",
  "rpva_interruption",
];

Deno.test("tamila : avis de fixation, audience en heure locale → lue", async () => {
  const octets = pdf([
    "COUR D'APPEL DE PARIS - Pôle 4 chambre 6",
    "N° RG 26/04512",
    "Avis du 02/10/2026",
    "AVIS DE FIXATION A BREF DELAI (art. 906 CPC)",
    "L'affaire sera appelée à l'audience du 04/02/2027 à 9h30",
    "Clôture prévisible : 21/01/2027",
  ]);
  const { issue, portes, ia } = await lireTamila("31", "avis_fixation.pdf", octets, {
    lisible: true,
    type_piece: "rpva_avis_fixation",
    confiance_type: 0.96,
    valeurs: [
      { champ: "numero_rg", valeur: "26/04512", texte: "N° RG 26/04512", page: 1, confiance: 0.98 },
      { champ: "date_avis", valeur: "2026-10-02", texte: "Avis du 02/10/2026", page: 1, confiance: 0.97 },
      { champ: "date_audience", valeur: "04/02/2027 à 9h30", texte: "audience du 04/02/2027 à 9h30", page: 1, confiance: 0.95 },
      { champ: "date_cloture_previsible", valeur: "2027-01-21", texte: "Clôture prévisible : 21/01/2027", page: 1 },
    ],
  });
  assertEquals(issue, "lue");
  const r = portes.enregistrements[0].resultat;
  assertEquals(r.type_piece, "rpva_avis_fixation");
  const v = new Map(r.valeurs.map((x) => [x.champ, x]));
  assertEquals(v.get("date_audience")!.valeur, "2027-02-04T09:30", "heure locale, sans fuseau");
  assertEquals(v.get("date_audience")!.verifiee, true);
  assertEquals(v.get("date_avis")!.valeur, "2026-10-02");
  assertEquals(v.get("numero_rg")!.valeur, "26/04512");
  assert(v.get("date_avis")!.boite, "boîte issue du PDF natif");
  assertEquals(ia.appels[0].piece.module, "tamila");
});

Deno.test("tamila : accusé de dépôt sans heure de dépôt citée → à vérifier", async () => {
  const octets = pdf(["e-barreau - Accusé de réception", "Message du 03/10/2026", "RG 26/04512 - conclusions déposées"]);
  const { issue, portes } = await lireTamila("32", "accuse.pdf", octets, {
    lisible: true,
    type_piece: "rpva_accuse_depot",
    confiance_type: 0.92,
    valeurs: [
      { champ: "date_avis", valeur: "2026-10-03", texte: "Message du 03/10/2026", page: 1 },
      { champ: "depose_le", valeur: "2026-10-03T16:12", texte: "déposées le 03/10/2026 à 16:12", page: 1 },
    ],
  });
  assertEquals(issue, "a_verifier");
  const r = portes.enregistrements[0].resultat;
  assertStringIncludes(r.motif!, "depose_le");
  assertEquals(r.valeurs.find((x) => x.champ === "depose_le")!.verifiee, false);
});

Deno.test("tamila : conclusions, partie « l'intimé » ramenée à intime, rang entier", async () => {
  const octets = pdf([
    "Notification entre avocats - RG 26/04512",
    "Le 05/10/2026",
    "Conclusions d'intimé n° 2 notifiées pour la SCI Les Tilleuls, intimée",
  ]);
  const { issue, portes } = await lireTamila("33", "conclusions.pdf", octets, {
    lisible: true,
    type_piece: "rpva_conclusions",
    confiance_type: 0.9,
    valeurs: [
      { champ: "date_avis", valeur: "05/10/2026", texte: "Le 05/10/2026", page: 1 },
      { champ: "partie_visee", valeur: "Intimé", texte: "Conclusions d'intimé", page: 1 },
      { champ: "rang", valeur: "2", texte: "n° 2", page: 1 },
    ],
  });
  assertEquals(issue, "lue");
  const v = new Map(portes.enregistrements[0].resultat.valeurs.map((x) => [x.champ, x]));
  assertEquals(v.get("partie_visee")!.valeur, "intime");
  assertEquals(v.get("rang")!.valeur, 2);
  assertEquals(typerValeur("rang", 100, champsPour("tamila")).ok, false);
  assertEquals(typerValeur("partie_visee", "avocat", champsPour("tamila")).ok, false);
});

Deno.test("tamila : un type FILED ou Lorani rendu sur une pièce Tamila → à classer", async () => {
  const octets = pdf(["ARRÊTÉ N° 2026-118", "Le permis de construire est ACCORDÉ."]);
  const { issue, portes } = await lireTamila("34", "arrete.pdf", octets, {
    lisible: true,
    type_piece: "lorani_arrete",
    confiance_type: 0.95,
    valeurs: [{ champ: "decision", valeur: "accorde", texte: "ACCORDÉ", page: 1 }],
  });
  assertEquals(issue, "a_classer");
  const r = portes.enregistrements[0].resultat;
  assertEquals(r.type_piece, "autre");
  assertStringIncludes(r.motif!, "tamila");
  assertEquals(r.valeurs.length, 0);
});

Deno.test("tamila : date et heure locale", () => {
  assertEquals(dateHeureLocale("2027-02-04T09:30"), "2027-02-04T09:30");
  assertEquals(dateHeureLocale("2027-02-04T09:30:00"), "2027-02-04T09:30");
  assertEquals(dateHeureLocale("2027-02-04 9:05"), "2027-02-04T09:05");
  assertEquals(dateHeureLocale("04/02/2027 à 9h30"), "2027-02-04T09:30");
  assertEquals(dateHeureLocale("04/02/2027 14h"), "2027-02-04T14:00");
  assertEquals(dateHeureLocale("4 février 2027 à 9 h 30"), "2027-02-04T09:30");
  assertEquals(dateHeureLocale("04/02/2027 09:30:00"), "2027-02-04T09:30");
  assertEquals(dateHeureLocale("2027-02-04"), "2027-02-04", "date seule : heure inconnue");
  assertEquals(dateHeureLocale("4 février 2027"), "2027-02-04");
  assertEquals(dateHeureLocale("2027-02-04T09:30:00Z"), null, "un fuseau rendu par le modèle est refusé");
  assertEquals(dateHeureLocale("2027-02-04T09:30:00+01:00"), null);
  assertEquals(dateHeureLocale("04/02/2027 à 25h00"), null);
  assertEquals(dateHeureLocale("31/02/2027"), null);
  assertEquals(dateHeureLocale(20270204), null);
});

Deno.test("table des types : Tamila suit tamila_avis_lu", () => {
  assertEquals(typesPour("tamila"), [...TYPES_AVIS.slice().sort((a, b) => ordre(a) - ordre(b)), "autre"]);
  const champs = [...champsPour("tamila").keys()];
  for (const c of CLES_AVIS_LU) assert(champs.includes(c), `clé de p_valeurs absente : ${c}`);
  assertEquals(champs.filter((c) => !CLES_AVIS_LU.includes(c)), ["numero_rg"]);
  assertEquals(champsPour("tamila").get("partie_visee")!.choix, ["appelant", "intime", "intervenant"]);
  const outil = schemaOutilPour("tamila") as {
    properties: Record<string, { enum?: string[]; items?: { properties: Record<string, { enum?: string[]; description?: string }> } }>;
  };
  assertEquals(outil.properties.type_piece.enum, typesPour("tamila"));
  assertEquals(outil.properties.valeurs.items!.properties.champ.enum, champs);
  assertStringIncludes(outil.properties.valeurs.items!.properties.valeur.description!, "AAAA-MM-JJTHH:MM");
  assertEquals(outil.properties.lignes, undefined);
  const lorani = schemaOutilPour("lorani") as { properties: Record<string, { items?: { properties: Record<string, { description?: string }> } }> };
  assert(!lorani.properties.valeurs.items!.properties.valeur.description!.includes("HH:MM"), "Lorani n'a pas de date et heure");
  const consigne = consigneSysteme("tamila");
  assertStringIncludes(consigne, "RPVA");
  assertStringIncludes(consigne, "rpva_accuse_depot");
  assertStringIncludes(consigne, "appelant, intime, intervenant");
  assertStringIncludes(consigne, "heure locale sans fuseau");
});

// L'ordre de déclaration dans schemas/tamila.ts.
function ordre(t: string): number {
  return [
    "rpva_declaration_appel",
    "rpva_avis_902",
    "rpva_avis_fixation",
    "rpva_conclusions",
    "rpva_appel_incident",
    "rpva_intervention",
    "rpva_ordonnance_mee",
    "rpva_avis_audience",
    "rpva_accuse_depot",
    "rpva_interruption",
  ].indexOf(t);
}
