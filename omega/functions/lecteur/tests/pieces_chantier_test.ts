// Les pièces de chantier des logiciels métier (25/10) : le bon de livraison Daliro (b6_62, souvent une photo) et
// l'ordre de service, l'avenant et le procès-verbal de réception Lorani (b5_51), aux champs des fiches
// CHAMPS-LECTURE-DALIRO.md et CHAMPS-LECTURE-LORANI.md ; FILED inchangé.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { ecrirePdf, type LigneTexte } from "../banc/pdf_minimal.ts";
import { consigneSysteme, type SortieOutil } from "../ia.ts";
import { lirePiece } from "../lire_piece.ts";
import { SCHEMA_OUTIL_LECTURE } from "../schemas/facture.ts";
import { schemaOutilPour, typesPour } from "../schemas/modules.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const lignes = (textes: string[]): LigneTexte[] => textes.map((texte, i) => ({ x: 50, y: 60 + i * 18, texte }));
const pdf = (textes: string[]) => ecrirePdf([{ type: "texte", lignes: lignes(textes) }]);
type Outil = { properties: Record<string, { items?: { properties: Record<string, unknown> }; enum?: string[] }> };

async function lire(module: string, id: string, nom: string, mime: string, octets: Uint8Array, sortie: SortieOutil, extra = {}) {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const piece = pieceDeTest(`cccccccc-0000-4000-8000-0000000000${id}`, nom, mime, { module, ...extra });
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, octets);
  ia!.prochaine = sortie;
  const issue = await lirePiece(ctx, travailDeTest(Number.parseInt(id, 16), piece.id));
  const r = portes.enregistrements[0].resultat;
  const v = (c: string) => r.valeurs.find((x) => x.champ === c);
  return { issue, r, v, ia: ia! };
}

Deno.test("catalogue : les quatre types sont connus, avec leur consigne ; l'outil FILED ne change pas", () => {
  assert(typesPour("daliro").includes("daliro_bon_livraison"));
  for (const t of ["lorani_ordre_service", "lorani_avenant", "lorani_pv_reception"]) assert(typesPour("lorani").includes(t), t);
  assertStringIncludes(consigneSysteme("daliro"), "daliro_bon_livraison");
  assertStringIncludes(consigneSysteme("lorani"), "lorani_pv_reception");
  const daliro = schemaOutilPour("daliro") as Outil;
  assert("reference" in daliro.properties.lignes.items!.properties);
  assert(!("reserves" in daliro.properties), "Daliro : les réserves d'un bon sont un texte, pas une liste");
  const lorani = schemaOutilPour("lorani") as Outil;
  assertEquals(Object.keys(lorani.properties.reserves.items!.properties).sort(), ["intitule", "lever_avant", "localisation", "lot", "page"]);
  assert(!("reserves" in (schemaOutilPour("tamila") as Outil).properties));
  assert("description" in (SCHEMA_OUTIL_LECTURE as Outil).properties.reserves.items!.properties, "FILED garde ses réserves de PV");
  assert(!("reference" in (SCHEMA_OUTIL_LECTURE as Outil).properties.lignes.items!.properties));
});

Deno.test("daliro : un bon de livraison photographié → lue ; numéro, date, commande, lignes (référence, quantité, unité), réserves", async () => {
  const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const transcription = "BON DE LIVRAISON N° BL-4471\nLivré le 25/10/2026\nVotre commande : CDE 62\nMENUISERIES ANTILLES SARL\n" +
    "F12 Fenêtre PVC 120x135 10 pce\nPalette consignée 1 u\nRéserves : 2 vitrages rayés";
  const { issue, r, v, ia } = await lire("daliro", "b1", "bon.jpg", "image/jpeg", photo, {
    lisible: true,
    type_piece: "daliro_bon_livraison",
    confiance_type: 0.96,
    manuscrit: false,
    pages: [{ n: 1, texte: transcription, confiance: 0.9 }],
    valeurs: [
      { champ: "numero_bon", valeur: "BL-4471", texte: "BON DE LIVRAISON N° BL-4471", page: 1 },
      { champ: "date_livraison", valeur: "2026-10-25", texte: "Livré le 25/10/2026", page: 1 },
      { champ: "reference_commande", valeur: "CDE 62", texte: "Votre commande : CDE 62", page: 1 },
      { champ: "fournisseur", valeur: "MENUISERIES ANTILLES SARL", texte: "MENUISERIES ANTILLES SARL", page: 1 },
      { champ: "reserves", valeur: "2 vitrages rayés", texte: "Réserves : 2 vitrages rayés", page: 1 },
    ],
    lignes: [
      { designation: "Fenêtre PVC 120x135", reference: "F12", quantite: "10", unite: "pce", page: 1 },
      { designation: "Palette consignée", reference: null, quantite: 1, unite: "u", page: 1 },
    ],
  }, { objet_type: "btp_commande" });
  assertEquals(issue, "lue", r.motif);
  assertEquals(r.methode, "ocr");
  assertEquals(ia.appels[0].entree.mode, "image");
  assertEquals(v("numero_bon")!.verifiee, true);
  assertEquals(v("date_livraison")!.valeur, "2026-10-25");
  assertEquals(v("reference_commande")!.valeur, "CDE 62");
  assertEquals(v("reserves")!.verifiee, true);
  const l = v("lignes")!;
  assertEquals(l.verifiee, true, l.controle);
  assertEquals(l.valeur, [
    { reference: "F12", designation: "Fenêtre PVC 120x135", unite: "pce", quantite: 10 },
    { designation: "Palette consignée", unite: "u", quantite: 1 },
  ]);
});

Deno.test("daliro : un bon sans date lisible reste « à vérifier » (les trois clés : numéro, date, lignes)", async () => {
  const { issue, r } = await lire("daliro", "b2", "bon.pdf", "application/pdf", pdf(["BON DE LIVRAISON N° BL-4472", "F12 Fenêtre PVC 120x135 4 pce"]), {
    lisible: true,
    type_piece: "daliro_bon_livraison",
    confiance_type: 0.9,
    valeurs: [{ champ: "numero_bon", valeur: "BL-4472", texte: "BON DE LIVRAISON N° BL-4472", page: 1 }],
    lignes: [{ designation: "Fenêtre PVC 120x135", reference: "F12", quantite: 4, unite: "pce", page: 1 }],
  });
  assertEquals(issue, "a_verifier");
  assertStringIncludes(r.motif!, "date_livraison");
});

const OS = [
  "ORDRE DE SERVICE N° 6",
  "Marché : Lot 02 Gros œuvre - BÂTI CARAÏBES SARL",
  "Objet : travaux supplémentaires - reprise des fondations côté est",
  "Fait à Pointe-à-Pitre, le 14/10/2026",
  "Notifié le 16/10/2026",
  "Incidence financière : + 4 800,00 € HT",
  "Incidence sur le délai : + 10 jours",
];

Deno.test("lorani : un ordre de service → lue ; numéro, nature, dates, incidence sur le montant et le délai, titulaire, lot", async () => {
  const { issue, r, v } = await lire("lorani", "c1", "os6.pdf", "application/pdf", pdf(OS), {
    lisible: true,
    type_piece: "lorani_ordre_service",
    confiance_type: 0.95,
    valeurs: [
      { champ: "numero_os", valeur: "6", texte: "ORDRE DE SERVICE N° 6", page: 1 },
      { champ: "objet", valeur: "travaux supplémentaires - reprise des fondations côté est", texte: "travaux supplémentaires - reprise des fondations côté est", page: 1 },
      { champ: "nature", valeur: "travaux supplémentaires", texte: "travaux supplémentaires", page: 1 },
      { champ: "date_emission", valeur: "2026-10-14", texte: "le 14/10/2026", page: 1 },
      { champ: "date_notification", valeur: "2026-10-16", texte: "Notifié le 16/10/2026", page: 1 },
      { champ: "montant_ht", valeur: 4800, texte: "+ 4 800,00 € HT", page: 1 },
      { champ: "delai_jours", valeur: "+10 jours", texte: "+ 10 jours", page: 1 },
      { champ: "titulaire", valeur: "BÂTI CARAÏBES SARL", texte: "BÂTI CARAÏBES SARL", page: 1 },
      { champ: "lot", valeur: "02", texte: "Lot 02", page: 1 },
    ],
  }, { objet_type: "lorani_projet" });
  assertEquals(issue, "lue", r.motif);
  assertEquals(v("numero_os")!.valeur, 6);
  assertEquals(v("nature")!.valeur, "travaux_supplementaires");
  assertEquals(v("delai_jours")!.valeur, 10);
  assertEquals(v("montant_ht")!.valeur, 4800);
  assert(r.valeurs.every((x) => x.verifiee), JSON.stringify(r.valeurs.filter((x) => !x.verifiee)));
});

Deno.test("lorani : un avenant en moins-value garde son signe ; sans montant lisible, « à vérifier »", async () => {
  const texte = ["AVENANT N° 2 AU MARCHÉ DU LOT 05 MENUISERIES", "Objet : suppression des volets du R+1", "Moins-value : - 1 500,00 € HT",
    "Nouveau montant du marché : 23 500,00 € HT", "Signé le 20/10/2026"];
  const { issue, v } = await lire("lorani", "c2", "avenant2.pdf", "application/pdf", pdf(texte), {
    lisible: true,
    type_piece: "lorani_avenant",
    confiance_type: 0.94,
    valeurs: [
      { champ: "numero_avenant", valeur: 2, texte: "AVENANT N° 2", page: 1 },
      { champ: "objet", valeur: "suppression des volets du R+1", texte: "suppression des volets du R+1", page: 1 },
      { champ: "montant_ht", valeur: -1500, texte: "- 1 500,00 € HT", page: 1 },
      { champ: "montant_marche_ht", valeur: 23500, texte: "23 500,00 € HT", page: 1 },
      { champ: "date_signature", valeur: "2026-10-20", texte: "Signé le 20/10/2026", page: 1 },
    ],
  });
  assertEquals(issue, "lue");
  assertEquals(v("montant_ht")!.valeur, -1500);
  const sans = await lire("lorani", "c3", "avenant3.pdf", "application/pdf", pdf(["AVENANT N° 3", "Objet : ajout d'un garde-corps"]), {
    lisible: true,
    type_piece: "lorani_avenant",
    confiance_type: 0.9,
    valeurs: [{ champ: "objet", valeur: "ajout d'un garde-corps", texte: "ajout d'un garde-corps", page: 1 }],
  });
  assertEquals(sans.issue, "a_verifier");
  assertStringIncludes(sans.r.motif!, "montant_ht");
});

Deno.test("lorani : un PV de réception avec réserves → la date, « oui », le délai, et les réserves en une seule valeur vérifiée", async () => {
  const texte = [
    "PROCÈS-VERBAL DE RÉCEPTION",
    "La réception est prononcée le 22/10/2026 avec réserves.",
    "Les réserves seront levées dans un délai de 30 jours.",
    "1. Lot 05 - Logement A12 : porte-fenêtre du séjour à régler",
    "2. Lot 08 - Parties communes : reprise de peinture cage B, avant le 15/11/2026",
  ];
  const { issue, r, v } = await lire("lorani", "c4", "pv.pdf", "application/pdf", pdf(texte), {
    lisible: true,
    type_piece: "lorani_pv_reception",
    confiance_type: 0.95,
    valeurs: [
      { champ: "date_reception", valeur: "2026-10-22", texte: "prononcée le 22/10/2026", page: 1 },
      { champ: "origine", valeur: "reception", texte: "PROCÈS-VERBAL DE RÉCEPTION", page: 1 },
      { champ: "avec_reserves", valeur: "oui", texte: "avec réserves", page: 1 },
      { champ: "delai_levee_jours", valeur: "30 jours", texte: "dans un délai de 30 jours", page: 1 },
    ],
    reserves: [
      { intitule: "porte-fenêtre du séjour à régler", lot: "05", localisation: "Logement A12", page: 1 },
      { intitule: "reprise de peinture cage B", lot: "08", localisation: "Parties communes", lever_avant: "15/11/2026", page: 1 },
    ],
  });
  assertEquals(issue, "lue", r.motif);
  assertEquals(v("avec_reserves")!.valeur, "oui");
  assertEquals(v("delai_levee_jours")!.valeur, 30);
  const res = v("reserves")!;
  assertEquals(res.verifiee, true, res.controle);
  assertEquals(res.valeur, [
    { intitule: "porte-fenêtre du séjour à régler", lot: "05", localisation: "Logement A12", page: 1 },
    { intitule: "reprise de peinture cage B", lot: "08", localisation: "Parties communes", lever_avant: "2026-11-15", page: 1 },
  ]);
  assertEquals(r.valeurs.filter((x) => x.champ === "reserves").length, 1);
});
