// Varelo (B1, b1_11) : le bon de livraison et ses champs de réception ; la réception pré-remplie par
// grp_enregistrer_reception avec les seules valeurs vérifiées ; « sous réserve de déballage » ne vaut pas réserve ;
// sans société, rien n'est posé ; une porte en panne ne défait pas la lecture.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { ecrirePdf, type LigneTexte } from "../banc/pdf_minimal.ts";
import type { SortieOutil } from "../ia.ts";
import { lirePiece } from "../lire_piece.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { champsPour, schemaOutilPour, schemaPour, typesPour } from "../schemas/modules.ts";
import { reserveVague } from "../schemas/varelo.ts";
import type { PortesVarelo } from "../reception_varelo.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const ENTITE = "eeeeeeee-0000-4000-8000-000000000001";

function pdf(textes: string[]): Uint8Array {
  const lignes: LigneTexte[] = textes.map((texte, i) => ({ x: 50, y: 60 + i * 18, texte }));
  return ecrirePdf([{ type: "texte", lignes }]);
}

class VareloFactice implements PortesVarelo {
  appels: { client: string; entite: string; champs: Record<string, unknown> }[] = [];
  constructor(private readonly panne = false) {}
  enregistrerReception(client: string, entite: string, champs: Record<string, unknown>) {
    this.appels.push({ client, entite, champs });
    if (this.panne) return Promise.reject(new ErreurOuvrier("ERREUR_INTERNE", "porte grp_enregistrer_reception : HTTP 400 Livraison refusée", true));
    return Promise.resolve({ reception: "ffffffff-0000-4000-8000-000000000001", statut: "a_examiner", echeance: "2026-10-08" });
  }
}

const BON = [
  "BON DE LIVRAISON",
  "Expéditeur : Sodimat SA - SIREN 412345678",
  "Transporteur : Transports Caraïbes Express",
  "Lettre de voiture n° LV-2026-0915",
  "Livré le 03/10/2026",
  "Colis annoncés : 12",
  "Colis reçus : 10",
  "Réserves : 2 colis manquants, 1 carton écrasé",
];

const valeursBon = (reserve = "2 colis manquants, 1 carton écrasé", texteReserve = "Réserves : 2 colis manquants, 1 carton écrasé") => [
  { champ: "transporteur", valeur: "Transports Caraïbes Express", texte: "Transporteur : Transports Caraïbes Express", page: 1 },
  { champ: "document_transport", valeur: "LV-2026-0915", texte: "Lettre de voiture n° LV-2026-0915", page: 1 },
  { champ: "date_livraison", valeur: "2026-10-03", texte: "Livré le 03/10/2026", page: 1 },
  { champ: "colis_annonces", valeur: 12, texte: "Colis annoncés : 12", page: 1 },
  { champ: "colis_recus", valeur: 10, texte: "Colis reçus : 10", page: 1 },
  { champ: "reserves_ecrites", valeur: reserve, texte: texteReserve, page: 1 },
  { champ: "expediteur", valeur: "Sodimat SA", texte: "Expéditeur : Sodimat SA", page: 1 },
  { champ: "expediteur_siren", valeur: "412345678", texte: "SIREN 412345678", page: 1 },
  { champ: "mode", valeur: "routier", texte: "Lettre de voiture", page: 1 },
];

async function lireBon(textes: string[], sortie: SortieOutil, opts: { objet_type?: string; objet_id?: string; varelo?: VareloFactice } = {}) {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const varelo = opts.varelo ?? new VareloFactice();
  ctx.varelo = varelo;
  const piece = pieceDeTest("cccccccc-0000-4000-8000-000000000071", "bl.pdf", "application/pdf", {
    module: "varelo",
    objet_type: opts.objet_type ?? "grp_societes",
    objet_id: opts.objet_id ?? ENTITE,
  });
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, pdf(textes));
  ia!.prochaine = sortie;
  const issue = await lirePiece(ctx, travailDeTest(71, piece.id));
  return { issue, portes, varelo, ia: ia!, fini: portes.finis[0].resultat as Record<string, unknown> };
}

Deno.test("varelo : schéma — bon_livraison avec ses champs de réception, factures comme FILED", () => {
  const s = schemaPour("varelo");
  assertEquals(s.module, "varelo");
  const bl = s.types.find((t) => t.type === "bon_livraison")!;
  assertEquals(bl.cles, ["transporteur", "date_livraison"]);
  for (const c of ["transporteur", "document_transport", "date_livraison", "colis_annonces", "colis_recus", "reserves_ecrites", "expediteur", "mode"]) {
    assert(bl.champs.includes(c), c);
  }
  assertEquals(champsPour("varelo", "bon_livraison").get("mode")!.choix, ["routier", "cmr", "maritime", "aerien"]);
  assertEquals(s.types.find((t) => t.type === "facture")!.cles, schemaPour("filed").types.find((t) => t.type === "facture")!.cles);
  assert(typesPour("varelo").includes("facture"));
  assert(s.lignes, "les factures d'un groupe gardent leurs lignes");
  assertEquals(schemaPour("filed").types.find((t) => t.type === "bon_livraison")!.cles, [], "FILED inchangé");
  const outil = JSON.stringify(schemaOutilPour("varelo"));
  assertStringIncludes(outil, "reserves_ecrites");
});

Deno.test("varelo : « sous réserve de déballage » ne vaut pas réserve", () => {
  for (const t of ["Sous réserve de déballage", "sous reserve de deballage.", "SOUS RÉSERVE", "Sous toutes réserves", "réserves de contrôle", ""]) {
    assert(reserveVague(t), t);
  }
  for (const t of ["2 colis manquants", "carton écrasé, film déchiré", "Sous réserve : palette 3 renversée"]) assert(!reserveVague(t), t);
});

Deno.test("varelo : bon lu → réception posée avec les valeurs vérifiées (manquant, constat, expéditeur et SIREN)", async () => {
  const { issue, varelo, fini, ia } = await lireBon(BON, { lisible: true, type_piece: "bon_livraison", confiance_type: 0.95, valeurs: valeursBon() });
  assertEquals(issue, "lue");
  assertEquals(ia.appels[0].piece.module, "varelo");
  assertEquals(varelo.appels.length, 1);
  const a = varelo.appels[0];
  assertEquals(a.entite, ENTITE);
  assertEquals(a.client, "cccccccc-0000-4000-8000-00000000000c");
  assertEquals(a.champs.date_reception, "2026-10-03");
  assertEquals(a.champs.transporteur, "Transports Caraïbes Express");
  assertEquals(a.champs.document_transport, "LV-2026-0915");
  assertEquals(a.champs.mode, "routier");
  assertEquals(a.champs.colis_attendus, 12);
  assertEquals(a.champs.colis_recus, 10);
  assertEquals(a.champs.manquant, true);
  assertEquals(a.champs.avarie, false);
  assertEquals(a.champs.reserves_sur_bon, "2 colis manquants, 1 carton écrasé");
  assertEquals(a.champs.expediteur, "Sodimat SA (SIREN 412345678)");
  assertEquals(a.champs.piece_id, "cccccccc-0000-4000-8000-000000000071");
  assertStringIncludes(a.champs.constat as string, "12 colis annoncés, 10 reçus");
  assertEquals((fini.reception_varelo as Record<string, unknown>).reception, "posee");
  assertEquals((fini.reception_varelo as Record<string, unknown>).echeance, "2026-10-08");
});

Deno.test("varelo : réserve vague, colis au complet → ni avarie, ni manquant, ni réserve recopiée", async () => {
  const textes = [...BON.slice(0, 5), "Colis annoncés : 12", "Colis reçus : 12", "Réserves : sous réserve de déballage"];
  const valeurs = valeursBon("sous réserve de déballage", "Réserves : sous réserve de déballage").map((v) =>
    v.champ === "colis_recus" ? { ...v, valeur: 12, texte: "Colis reçus : 12" } : v
  );
  const { varelo } = await lireBon(textes, { lisible: true, type_piece: "bon_livraison", confiance_type: 0.95, valeurs });
  const c = varelo.appels[0].champs;
  assertEquals(c.reserves_sur_bon, undefined);
  assertEquals(c.avarie, undefined);
  assertEquals(c.manquant, undefined);
  assertEquals(c.constat, undefined);
});

Deno.test("varelo : une réserve précise sans manquant part en avarie, à examiner", async () => {
  const textes = [...BON.slice(0, 5), "Colis annoncés : 12", "Colis reçus : 12", "Réserves : carton 4 écrasé, film déchiré"];
  const valeurs = valeursBon("carton 4 écrasé, film déchiré", "Réserves : carton 4 écrasé, film déchiré").map((v) =>
    v.champ === "colis_recus" ? { ...v, valeur: 12, texte: "Colis reçus : 12" } : v
  );
  const { varelo } = await lireBon(textes, { lisible: true, type_piece: "bon_livraison", confiance_type: 0.95, valeurs });
  const c = varelo.appels[0].champs;
  assertEquals(c.avarie, true);
  assertEquals(c.manquant, false);
  assertStringIncludes(c.constat as string, "« carton 4 écrasé, film déchiré »");
});

Deno.test("varelo : valeur non retrouvée sur la pièce → elle ne sort pas ; transporteur non vérifié → rien n'est posé", async () => {
  const valeurs = valeursBon().map((v) => v.champ === "colis_recus" ? { ...v, valeur: 7, texte: "Colis reçus : 7" } : v);
  const r1 = await lireBon(BON, { lisible: true, type_piece: "bon_livraison", confiance_type: 0.95, valeurs });
  assertEquals(r1.varelo.appels[0].champs.colis_recus, undefined, "« 7 » n'est pas sur le bon");
  assertEquals(r1.varelo.appels[0].champs.manquant, false);

  const sansTransporteur = valeursBon().map((v) => v.champ === "transporteur" ? { ...v, valeur: "Geodis", texte: "Transporteur : Geodis" } : v);
  const r2 = await lireBon(BON, { lisible: true, type_piece: "bon_livraison", confiance_type: 0.95, valeurs: sansTransporteur });
  assertEquals(r2.issue, "a_verifier");
  assertEquals(r2.varelo.appels.length, 0);
  assertEquals(r2.fini.reception_varelo, { reception: "non_posee", raison: "transporteur_non_verifie" });
});

Deno.test("varelo : pièce sans société (objet autre que grp_societes) → rien n'est posé, la raison est dite", async () => {
  const { varelo, fini } = await lireBon(BON, { lisible: true, type_piece: "bon_livraison", confiance_type: 0.95, valeurs: valeursBon() }, {
    objet_type: "grp_contrats",
    objet_id: "11111111-0000-4000-8000-000000000001",
  });
  assertEquals(varelo.appels.length, 0);
  assertEquals(fini.reception_varelo, { reception: "non_posee", raison: "societe_inconnue" });
});

Deno.test("varelo : porte en panne → la lecture reste enregistrée, l'erreur est dite", async () => {
  const { issue, portes, fini } = await lireBon(BON, { lisible: true, type_piece: "bon_livraison", confiance_type: 0.95, valeurs: valeursBon() }, {
    varelo: new VareloFactice(true),
  });
  assertEquals(issue, "lue");
  assertEquals(portes.enregistrements.length, 1);
  assertEquals((fini.reception_varelo as Record<string, unknown>).reception, "erreur");
});

Deno.test("varelo : une facture d'un groupe ne pose aucune réception", async () => {
  const varelo = new VareloFactice();
  await lireBon(["FACTURE F-1", "Total TTC 120,00"], {
    lisible: true,
    type_piece: "facture",
    confiance_type: 0.95,
    valeurs: [{ champ: "numero", valeur: "F-1", texte: "FACTURE F-1", page: 1 }],
  }, { varelo });
  assertEquals(varelo.appels.length, 0);
});
