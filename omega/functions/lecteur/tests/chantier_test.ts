// Les documents de chantier lus par le schéma FILED, pour Daliro (B6, DEMANDE-SOCLE-documents-chantier § 1).
// Doublures seulement : les vraies pièces NOBAT ne vont pas dans git.

import { assert, assertEquals } from "@std/assert";
import type { PageLue } from "@partage/portes.ts";
import type { SortieIa, SortieOutil } from "../ia.ts";
import { assembler } from "../lire_piece.ts";
import { TYPES_PIECE } from "../schemas/facture.ts";
import { consignePour, schemaOutilPour, typesPour } from "../schemas/modules.ts";

function ia(brut: Partial<SortieOutil>): SortieIa {
  return {
    brut: { lisible: true, type_piece: "autre", confiance_type: 0.95, valeurs: [], ...brut },
    usage: { tokens_entree: 0, tokens_sortie: 0 },
    modele: "double",
    cout_eur: 0,
  };
}
const page = (n: number, texte: string): PageLue => ({ n, methode: "vision", texte, confiance: 0.9 });
const lire = (brut: Partial<SortieOutil>, pages: PageLue[]) => assembler(ia(brut), null, pages, "ocr", 0).resultat;
const valeur = (r: ReturnType<typeof lire>, champ: string) => r.valeurs.find((v) => v.champ === champ);

const PV = [
  page(1, "PROCÈS-VERBAL D'OPÉRATIONS PRÉALABLES À LA RÉCEPTION\nMaître d'ouvrage : SCI ESSAI\nOpération : Résidence Essai, bâtiment A\nRédacteur : Atelier Essai Architecture\nFait le 25/03/2024"),
  page(2, "1 | Logt A12 | Lot 05 Menuiseries | Menuiserie Essai | Fenêtre séjour : joint manquant | 15 jours\n2 | Hall | Lot 08 Peinture | — | Reprise de peinture en plafond | avant le 30/04/2024"),
];

Deno.test("PV de réserves : champs de tête, réserves en une valeur, page par réserve ; lu si toutes retrouvées", () => {
  const r = lire({
    type_piece: "chantier_pv_reserves",
    valeurs: [
      { champ: "date_pv", valeur: "2024-03-25", texte: "Fait le 25/03/2024", page: 1 },
      { champ: "maitre_ouvrage", valeur: "SCI ESSAI", texte: "Maître d'ouvrage : SCI ESSAI", page: 1 },
      { champ: "operation", valeur: "Résidence Essai, bâtiment A", texte: "Opération : Résidence Essai, bâtiment A", page: 1 },
      { champ: "redacteur", valeur: "Atelier Essai Architecture", texte: "Rédacteur : Atelier Essai Architecture", page: 1 },
    ],
    reserves: [
      { numero: "1", localisation: "Logt A12", lot: "Lot 05 Menuiseries", entreprise: "Menuiserie Essai", description: "Fenêtre séjour : joint manquant", delai: "15 jours", page: 2 },
      { numero: "2", localisation: "Hall", lot: "Lot 08 Peinture", description: "Reprise de peinture en plafond", echeance: "30/04/2024", page: 2 },
    ],
  }, PV);
  assertEquals(r.type_piece, "chantier_pv_reserves");
  assertEquals(r.statut, "lue", r.motif);
  assertEquals(valeur(r, "date_pv")?.valeur, "2024-03-25");
  const reserves = valeur(r, "reserves")!;
  assert(reserves.verifiee, reserves.controle);
  assertEquals(reserves.valeur, [
    { numero: "1", localisation: "Logt A12", lot: "Lot 05 Menuiseries", entreprise: "Menuiserie Essai", description: "Fenêtre séjour : joint manquant", delai: "15 jours", page: 2 },
    { numero: "2", localisation: "Hall", lot: "Lot 08 Peinture", description: "Reprise de peinture en plafond", echeance: "2024-04-30", page: 2 },
  ]);
});

Deno.test("PV de réserves : rien de deviné — échéance non datée écartée, réserve sans description non rendue, citation introuvable → à vérifier", () => {
  const r = lire({
    type_piece: "chantier_pv_reserves",
    reserves: [
      { numero: "1", description: "Fenêtre séjour : joint manquant", echeance: "sous quinze jours", page: 2 },
      { numero: "3", localisation: "Cage B", page: 2 },
      { numero: "4", description: "Garde-corps à refixer", page: 2 },
    ],
  }, PV);
  const reserves = valeur(r, "reserves")!;
  assertEquals((reserves.valeur as Record<string, unknown>[]).map((e) => e.numero), ["1", "4"]);
  assertEquals((reserves.valeur as Record<string, unknown>[])[0].echeance, undefined);
  assert(!reserves.verifiee, "la réserve 4 n'est pas sur la page");
  assertEquals(r.statut, "a_verifier");
  assert(r.motif?.includes("reserves"));
});

Deno.test("plan : cartouche lu, clé titre", () => {
  const r = lire({
    type_piece: "chantier_plan",
    valeurs: [
      { champ: "titre", valeur: "Plan de fondations", texte: "PLAN DE FONDATIONS", page: 1 },
      { champ: "numero_plan", valeur: "S-101", texte: "N° S-101", page: 1 },
      { champ: "indice", valeur: "B", texte: "Ind. B", page: 1 },
      { champ: "echelle", valeur: "1/50", texte: "Éch. 1/50", page: 1 },
      { champ: "phase", valeur: "EXE", texte: "Phase EXE", page: 1 },
      { champ: "auteur", valeur: "BET Essai Structure", texte: "BET Essai Structure", page: 1 },
    ],
  }, [page(1, "PLAN DE FONDATIONS — N° S-101 — Ind. B — Éch. 1/50 — Phase EXE — BET Essai Structure")]);
  assertEquals(r.statut, "lue", r.motif);
  assertEquals(["titre", "numero_plan", "indice", "echelle", "phase", "auteur"].map((c) => valeur(r, c)?.verifiee), [true, true, true, true, true, true]);
});

Deno.test("note technique : dispositions avec leur norme, une seule valeur", () => {
  const r = lire({
    type_piece: "chantier_note_technique",
    valeurs: [{ champ: "titre", valeur: "Note de dispositions parasismiques", texte: "NOTE DE DISPOSITIONS PARASISMIQUES", page: 1 }],
    dispositions: [
      { texte: "Chaînages verticaux à chaque angle", reference: "Eurocode 8", page: 1 },
      { texte: "Joint de dilatation de 4 cm entre blocs", page: 1 },
      { reference: "NF P 06-013", page: 1 },
    ],
  }, [page(1, "NOTE DE DISPOSITIONS PARASISMIQUES\nChaînages verticaux à chaque angle (Eurocode 8)\nJoint de dilatation de 4 cm entre blocs")]);
  assertEquals(r.statut, "lue", r.motif);
  const d = valeur(r, "dispositions")!;
  assert(d.verifiee, d.controle);
  assertEquals(d.valeur, [
    { texte: "Chaînages verticaux à chaque angle", reference: "Eurocode 8", page: 1 },
    { texte: "Joint de dilatation de 4 cm entre blocs", page: 1 },
  ]);
});

Deno.test("une liste rendue sur un autre type est ignorée ; les types de facture ne changent pas", () => {
  const r = lire({ type_piece: "facture", reserves: [{ description: "x", page: 1 }] }, [page(1, "x")]);
  assertEquals(valeur(r, "reserves"), undefined);
  assertEquals(TYPES_PIECE.includes("chantier_plan" as never), false, "les natures de facture (filed_nature_de) restent les mêmes");
});

Deno.test("format de lecture : les trois types dans FILED (et un module sans schéma), pas dans Varelo ni Daliro", () => {
  const enumTypes = (m: string) => ((schemaOutilPour(m) as { properties: { type_piece: { enum: string[] } } }).properties.type_piece.enum);
  for (const t of ["chantier_pv_reserves", "chantier_plan", "chantier_note_technique"]) {
    assert(enumTypes("filed").includes(t), t);
    assert(typesPour("nobat").includes(t), t);
    assert(!typesPour("varelo").includes(t), t);
  }
  const props = (m: string) => (schemaOutilPour(m) as { properties: Record<string, unknown> }).properties;
  assert("reserves" in props("filed") && "dispositions" in props("filed"));
  assert(!("reserves" in props("daliro")) && !("reserves" in props("varelo")));
  assert(consignePour("filed", "").includes("chantier_pv_reserves"));
});

Deno.test("plan de détail sans titre (NOBAT 068) : le numéro « Plan 101 » suffit ; ni titre ni numéro → à vérifier", () => {
  const texte = "M1: 60 x 60 h.: 80 / M1 : à replier après la pose du treillis / Plan 101";
  const avecNumero = lire({ type_piece: "chantier_plan", valeurs: [{ champ: "numero_plan", valeur: "101", texte: "Plan 101", page: 1 }] }, [page(1, texte)]);
  assertEquals(avecNumero.statut, "lue", avecNumero.motif);
  const rien = lire({ type_piece: "chantier_plan", valeurs: [] }, [page(1, "M1: 60 x 60 h.: 80 / M1 : à replier après la pose du treillis")]);
  assertEquals(rien.statut, "a_verifier");
  assertEquals(rien.motif, "À vérifier : titre ou numero_plan.");
});

Deno.test("T-FILED 26 (NOBAT 067, 075) : l'intitulé d'un détail n'est pas le titre de la planche → à vérifier, comme 074 et 077", () => {
  const texte = "Détail sur scellement n° 1 / Détail joint de retrait / Détail sur scellement n° 2 / DÉSIGNATION DES MASSIFS";
  const r = lire({ type_piece: "chantier_plan", valeurs: [{ champ: "titre", valeur: "Détail sur scellement n° 1", texte: "Détail sur scellement n° 1", page: 1 }] }, [
    page(1, texte),
  ]);
  const titre = valeur(r, "titre")!;
  assert(!titre.verifiee && titre.controle?.includes("pas le titre de la planche"), titre.controle);
  assertEquals(r.statut, "a_verifier");
  // un vrai titre de planche reste vérifié
  const vrai = lire({ type_piece: "chantier_plan", valeurs: [{ champ: "titre", valeur: "Plan de fondations", texte: "PLAN DE FONDATIONS", page: 1 }] }, [page(1, "PLAN DE FONDATIONS")]);
  assertEquals(vrai.statut, "lue", vrai.motif);
});

Deno.test("T-FILED 22 : plan daté « Septembre 2023 » → date 2023-09 vérifiée (rendue par le modèle, ou relevée s'il l'omet)", () => {
  const texte = "PLAN DE FONDATIONS — DATE: Septembre 2023 — Plan 101";
  const rendue = lire({
    type_piece: "chantier_plan",
    valeurs: [{ champ: "date", valeur: "Septembre 2023", texte: "DATE: Septembre 2023", page: 1 }, { champ: "numero_plan", valeur: "101", texte: "Plan 101", page: 1 }],
  }, [page(1, texte)]);
  assertEquals(valeur(rendue, "date")?.valeur, "2023-09");
  assert(valeur(rendue, "date")?.verifiee, valeur(rendue, "date")?.controle);
  const omise = lire({ type_piece: "chantier_plan", valeurs: [{ champ: "numero_plan", valeur: "101", texte: "Plan 101", page: 1 }] }, [page(1, texte)]);
  assertEquals(valeur(omise, "date")?.valeur, "2023-09");
  // une facture n'accepte toujours pas une date au mois
  const facture = lire({ type_piece: "facture", valeurs: [{ champ: "date", valeur: "Septembre 2023", texte: "Septembre 2023", page: 1 }] }, [page(1, "Septembre 2023")]);
  assertEquals(valeur(facture, "date")?.verifiee, false);
});

Deno.test("T-FILED 23 : plan sans cartouche — une cote n'est pas un titre ; « Plan 101 » → numero_plan 101", () => {
  const texte = "M1: 60 x 60 h.: 80 … M6: 220 x 220 h.: 100 / Plan 101";
  const r = lire({
    type_piece: "chantier_plan",
    valeurs: [
      { champ: "titre", valeur: "M6: 220 x 220 h.: 100", texte: "M6: 220 x 220 h.: 100", page: 1 },
      { champ: "numero_plan", valeur: "Plan 101", texte: "Plan 101", page: 1 },
    ],
  }, [page(1, texte)]);
  assertEquals(valeur(r, "titre"), undefined);
  assertEquals(valeur(r, "numero_plan")?.valeur, "101");
  assertEquals(valeur(r, "numero_plan")?.texte, "Plan 101");
  assertEquals(r.statut, "lue", r.motif);
});

Deno.test("NOBAT 066 : une disposition « titre : contenu » faite de lignes réelles qui se suivent est vérifiée", () => {
  const texte = [
    "DISPOSITIONS CONSTRUCTIVES PARASISMIQUES", "POTEAUX", "1er cadre à 5 cm les suivants e=10", "POUTRES / LONGRINES D'ANGLES",
    "Prévoir dans chaque angle", "1 equerre HA 10 * 150 sur les aciers", "inferieurs/ de peau/ superieurs",
    "DETAIL D'ANGLE - VUE EN PLAN", "RENFORTS DE CHAINAGE AU DROIT", "DES PLANCHERS", "Pour chaque lit", "2x2 HA 12 x 120",
    "Pour chaque lit", "2 HA 12 x 150",
  ].join("\n");
  const r = lire({
    type_piece: "chantier_note_technique",
    valeurs: [{ champ: "titre", valeur: "Dispositions constructives parasismiques", texte: "DISPOSITIONS CONSTRUCTIVES PARASISMIQUES", page: 1 }],
    dispositions: [
      { texte: "POTEAUX : 1er cadre à 5 cm les suivants e=10", page: 1 },
      { texte: "POUTRES / LONGRINES D'ANGLES : Prévoir dans chaque angle 1 equerre HA 10 * 150 sur les aciers inferieurs/ de peau/ superieurs", page: 1 },
      { texte: "DETAIL D'ANGLE - VUE EN PLAN, RENFORTS DE CHAINAGE AU DROIT DES PLANCHERS : Pour chaque lit 2x2 HA 12 x 120", page: 1 },
      { texte: "DETAIL D'ANGLE - VUE EN PLAN, RENFORTS DE CHAINAGE AU DROIT DES PLANCHERS : Pour chaque lit 2 HA 12 x 150", page: 1 },
    ],
  }, [page(1, texte)]);
  const d = valeur(r, "dispositions")!;
  assert(d.verifiee, d.controle);
  // un morceau inventé reste introuvable
  const faux = lire({ type_piece: "chantier_note_technique", dispositions: [{ texte: "POTEAUX : cadre tous les 30 cm", page: 1 }] }, [page(1, texte)]);
  assert(!valeur(faux, "dispositions")!.verifiee);
});

Deno.test("NOBAT 071 : « Plan 101 » omis par le modèle → numero_plan 101 relevé sur le texte, la planche est lue", () => {
  const texte = "M1: 60 x 60 h.: 80 … M6: 220 x 220 h.: 100\nSarl S / Plan 101 - Pag";
  const r = lire({ type_piece: "chantier_plan", valeurs: [{ champ: "titre", valeur: "M6: 220 x 220 h.: 100", texte: "M6: 220 x 220 h.: 100", page: 1 }] }, [page(1, texte)]);
  assertEquals(valeur(r, "numero_plan")?.valeur, "101");
  assert(valeur(r, "numero_plan")?.verifiee);
  assertEquals(valeur(r, "titre"), undefined);
  assertEquals(r.statut, "lue", r.motif);
  // deux numéros différents : on ne choisit pas ; « Plan de fondations » n'est pas un numéro
  const deux = lire({ type_piece: "chantier_plan", valeurs: [] }, [page(1, "Plan 101 / Plan 102 / Plan de fondations")]);
  assertEquals(valeur(deux, "numero_plan"), undefined);
  const nom = lire({ type_piece: "chantier_plan", valeurs: [] }, [page(1, "Plan de fondations — Plan n° S-12")]);
  assertEquals(valeur(nom, "numero_plan")?.valeur, "S-12");
});
