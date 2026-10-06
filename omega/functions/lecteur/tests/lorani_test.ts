// Le module Lorani (urbanisme) : six types, leurs champs, les règles de
// statut ; FILED inchangé.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { ecrirePdf, type LigneTexte } from "../banc/pdf_minimal.ts";
import { consigneSysteme, type SortieOutil } from "../ia.ts";
import { lirePiece } from "../lire_piece.ts";
import { SCHEMA_OUTIL_LECTURE } from "../schemas/facture.ts";
import { champsPour, schemaOutilPour, schemaPour, typesPour } from "../schemas/modules.ts";
import { typerValeur } from "../verifier.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const lignes = (textes: string[]): LigneTexte[] => textes.map((texte, i) => ({ x: 50, y: 60 + i * 18, texte }));

function pdf(textes: string[]): Uint8Array {
  return ecrirePdf([{ type: "texte", lignes: lignes(textes) }]);
}

async function lireLorani(id: string, nom: string, octets: Uint8Array, sortie: SortieOutil) {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const piece = pieceDeTest(`cccccccc-0000-4000-8000-0000000000${id}`, nom, "application/pdf", { module: "lorani", objet_type: "lorani_dossier" });
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, octets);
  ia!.prochaine = sortie;
  const issue = await lirePiece(ctx, travailDeTest(Number(id), piece.id));
  return { issue, portes, ia: ia! };
}

Deno.test("lorani : récépissé de dépôt, numéro et date cités → lue", async () => {
  const octets = pdf([
    "MAIRIE DE SAINT-AUBIN",
    "RÉCÉPISSÉ DE DÉPÔT D'UNE DEMANDE DE PERMIS DE CONSTRUIRE",
    "Dossier n° PC 069 123 26 A0042",
    "Déposé le 14/09/2026",
    "Délai d'instruction de base : 2 mois",
  ]);
  const { issue, portes, ia } = await lireLorani("21", "recepisse.pdf", octets, {
    lisible: true,
    type_piece: "lorani_recepisse_depot",
    confiance_type: 0.97,
    valeurs: [
      { champ: "numero_dossier", valeur: "PC 069 123 26 A0042", texte: "Dossier n° PC 069 123 26 A0042", page: 1, confiance: 0.98 },
      { champ: "date_depot", valeur: "2026-09-14", texte: "Déposé le 14/09/2026", page: 1, confiance: 0.97 },
    ],
  });
  assertEquals(issue, "lue");
  const r = portes.enregistrements[0].resultat;
  assertEquals(r.type_piece, "lorani_recepisse_depot");
  assertEquals(r.statut, "lue");
  const v = new Map(r.valeurs.map((x) => [x.champ, x]));
  assertEquals(v.get("numero_dossier")!.valeur, "PC 069 123 26 A0042");
  assertEquals(v.get("numero_dossier")!.verifiee, true);
  assert(v.get("numero_dossier")!.boite, "boîte issue du PDF natif");
  assertEquals(v.get("date_depot")!.valeur, "2026-09-14");
  assertEquals(v.get("date_depot")!.verifiee, true);
  assertEquals(ia.appels[0].piece.module, "lorani");
});

Deno.test("lorani : lettre de délai hors bornes → non vérifiée, pièce à vérifier", async () => {
  const octets = pdf([
    "Commune de Vernet",
    "Dossier PC 069 123 26 A0042",
    "Lettre du 02/10/2026",
    "Le délai d'instruction est majoré d'un mois : il est porté à 30 mois.",
  ]);
  const { issue, portes } = await lireLorani("22", "delai.pdf", octets, {
    lisible: true,
    type_piece: "lorani_lettre_delai",
    confiance_type: 0.9,
    valeurs: [
      { champ: "numero_dossier", valeur: "PC 069 123 26 A0042", texte: "Dossier PC 069 123 26 A0042", page: 1 },
      { champ: "date_lettre", valeur: "2026-10-02", texte: "Lettre du 02/10/2026", page: 1 },
      { champ: "delai_mois", valeur: 30, texte: "porté à 30 mois", page: 1 },
    ],
  });
  assertEquals(issue, "a_verifier");
  const r = portes.enregistrements[0].resultat;
  const d = r.valeurs.find((x) => x.champ === "delai_mois")!;
  assertEquals(d.verifiee, false);
  assertStringIncludes(d.controle!, "hors bornes");
  assertStringIncludes(r.motif!, "delai_mois");
});

Deno.test("lorani : arrêté, décision rendue « Accordé » ramenée à accorde", async () => {
  const octets = pdf([
    "ARRÊTÉ N° 2026-118",
    "Dossier n° PC 069 123 26 A0042",
    "ARRÊTE : Article 1 : Le permis de construire est ACCORDÉ.",
    "Fait à Vernet, le 20/11/2026",
  ]);
  const { issue, portes } = await lireLorani("23", "arrete.pdf", octets, {
    lisible: true,
    type_piece: "lorani_arrete",
    confiance_type: 0.95,
    valeurs: [
      { champ: "numero_dossier", valeur: "PC 069 123 26 A0042", texte: "Dossier n° PC 069 123 26 A0042", page: 1 },
      { champ: "decision", valeur: "Accordé", texte: "Le permis de construire est ACCORDÉ.", page: 1 },
      { champ: "date_decision", valeur: "20/11/2026", texte: "le 20/11/2026", page: 1 },
    ],
  });
  assertEquals(issue, "lue");
  const v = new Map(portes.enregistrements[0].resultat.valeurs.map((x) => [x.champ, x]));
  assertEquals(v.get("decision")!.valeur, "accorde");
  assertEquals(v.get("decision")!.verifiee, true);
  assertEquals(v.get("date_decision")!.valeur, "2026-11-20");
  assertEquals(typerValeur("decision", "non-opposition", champsPour("lorani")).valeur, "non_opposition");
  assertEquals(typerValeur("decision", "Sursis à statuer", champsPour("lorani")).valeur, "sursis");
  assertEquals(typerValeur("decision", "peut-être", champsPour("lorani")).ok, false);
});

Deno.test("lorani : demande de pièces, liste vérifiée élément par élément", async () => {
  const octets = pdf(["Dossier DP 03412 26 00117", "Courrier du 05/10/2026", "Pièces manquantes : PC5, PC 8 et le plan de masse"]);
  const { issue, portes } = await lireLorani("24", "pieces.pdf", octets, {
    lisible: true,
    type_piece: "lorani_demande_pieces",
    confiance_type: 0.93,
    valeurs: [
      { champ: "numero_dossier", valeur: "DP 03412 26 00117", texte: "Dossier DP 03412 26 00117", page: 1 },
      { champ: "date_lettre", valeur: "2026-10-05", texte: "Courrier du 05/10/2026", page: 1 },
      { champ: "pieces", valeur: ["PC5", "PC 8", "plan de masse"], texte: "Pièces manquantes : PC5, PC 8 et le plan de masse", page: 1 },
    ],
  });
  assertEquals(issue, "lue");
  const p = portes.enregistrements[0].resultat.valeurs.find((x) => x.champ === "pieces")!;
  assertEquals(p.valeur, ["PC5", "PC 8", "plan de masse"]);
  assertEquals(p.verifiee, true);
  // Un élément absent de la page : la liste n'est pas vérifiée.
  const { portes: p2 } = await lireLorani("25", "pieces2.pdf", octets, {
    lisible: true,
    type_piece: "lorani_demande_pieces",
    confiance_type: 0.93,
    valeurs: [
      { champ: "numero_dossier", valeur: "DP 03412 26 00117", texte: "Dossier DP 03412 26 00117", page: 1 },
      { champ: "date_lettre", valeur: "2026-10-05", texte: "Courrier du 05/10/2026", page: 1 },
      { champ: "pieces", valeur: ["PC5", "PC11"], texte: "Pièces manquantes", page: 1 },
    ],
  });
  const q = p2.enregistrements[0].resultat.valeurs.find((x) => x.champ === "pieces")!;
  assertEquals(q.verifiee, false);
  assertStringIncludes(q.controle!, "PC11");
  assertEquals(p2.enregistrements[0].resultat.statut, "a_verifier");
});

Deno.test("lorani : certificat tacite et constat d'affichage (passage entier 1–3)", async () => {
  const tacite = pdf(["CERTIFICAT DE PERMIS TACITE", "Dossier PC 069 123 26 A0042", "Décision tacite acquise le 15/11/2026"]);
  const a = await lireLorani("26", "tacite.pdf", tacite, {
    lisible: true,
    type_piece: "lorani_certificat_tacite",
    confiance_type: 0.9,
    valeurs: [
      { champ: "numero_dossier", valeur: "PC 069 123 26 A0042", texte: "Dossier PC 069 123 26 A0042", page: 1 },
      { champ: "date_tacite", valeur: "2026-11-15", texte: "acquise le 15/11/2026", page: 1 },
    ],
  });
  assertEquals(a.issue, "lue");
  const constat = pdf(["PROCÈS-VERBAL DE CONSTAT D'AFFICHAGE", "Dossier PC 069 123 26 A0042", "Deuxième passage, le 10/12/2026"]);
  const b = await lireLorani("27", "constat.pdf", constat, {
    lisible: true,
    type_piece: "lorani_constat_affichage",
    confiance_type: 0.9,
    valeurs: [
      { champ: "numero_dossier", valeur: "PC 069 123 26 A0042", texte: "Dossier PC 069 123 26 A0042", page: 1 },
      { champ: "date_constat", valeur: "2026-12-10", texte: "le 10/12/2026", page: 1 },
      { champ: "passage", valeur: "2", texte: "Deuxième passage", page: 1 },
    ],
  });
  assertEquals(b.issue, "lue");
  assertEquals(b.portes.enregistrements[0].resultat.valeurs.find((x) => x.champ === "passage")!.valeur, 2);
  assertEquals(typerValeur("passage", 4, champsPour("lorani")).ok, false);
});

Deno.test("lorani : un type d'un autre module (facture) ou inconnu → à classer", async () => {
  const octets = pdf(["FACTURE F-1", "Total TTC : 10,00 €"]);
  const { issue, portes } = await lireLorani("28", "facture.pdf", octets, {
    lisible: true,
    type_piece: "facture",
    confiance_type: 0.9,
    valeurs: [{ champ: "numero", valeur: "F-1", texte: "FACTURE F-1", page: 1 }],
  });
  assertEquals(issue, "a_classer");
  const r = portes.enregistrements[0].resultat;
  assertEquals(r.type_piece, "autre");
  assertStringIncludes(r.motif!, "lorani");
  assertEquals(r.valeurs.length, 0, "numero n'est pas un champ Lorani : écarté");
});

Deno.test("table des types par module : schémas d'outil et consignes", () => {
  assertEquals(schemaOutilPour("filed"), SCHEMA_OUTIL_LECTURE, "FILED garde son schéma à l'identique");
  assertEquals(schemaOutilPour(undefined), SCHEMA_OUTIL_LECTURE);
  assertEquals(schemaPour("tavaro").module, "filed", "module sans schéma propre : FILED");
  assertEquals(typesPour("lorani"), [
    "lorani_recepisse_depot",
    "lorani_lettre_delai",
    "lorani_demande_pieces",
    "lorani_arrete",
    "lorani_certificat_tacite",
    "lorani_constat_affichage",
    "lorani_courrier_autre",
    "autre",
  ]);
  const outil = schemaOutilPour("lorani") as { properties: Record<string, { enum?: string[]; items?: { properties: Record<string, { enum?: string[] }> } }> };
  assertEquals(outil.properties.type_piece.enum, typesPour("lorani"));
  assertEquals(outil.properties.valeurs.items!.properties.champ.enum, [...champsPour("lorani").keys()]);
  assertEquals(outil.properties.lignes, undefined, "pas de lignes de facture pour Lorani");
  assertEquals(outil.properties.tva_ventilation, undefined);
  for (const t of typesPour("lorani")) assert(/^[a-z][a-z0-9_]{1,59}$/.test(t), t);
  const consigne = consigneSysteme("lorani");
  assertStringIncludes(consigne, "lorani_arrete");
  assertStringIncludes(consigne, "accorde, refuse, non_opposition, opposition, sursis");
  assertStringIncludes(consigne, "Tu ne devines jamais");
  assertStringIncludes(consigneSysteme("filed"), "pièces comptables");
});

Deno.test("lorani : champs facultatifs de la fiche de B5 (récépissé, arrêté, constat)", async () => {
  const octets = pdf([
    "MAIRIE DE SAINT-HERBLAIN",
    "Récépissé de dépôt — maison individuelle et/ou ses annexes (PCMI)",
    "Dossier n° PC 044109 26 A0042",
    "Demandeur : SCI LES TILLEULS",
    "Le dossier a été déposé le 15/09/2026.",
  ]);
  const { issue, portes } = await lireLorani("29", "recepisse2.pdf", octets, {
    lisible: true,
    type_piece: "lorani_recepisse_depot",
    confiance_type: 0.97,
    valeurs: [
      { champ: "date_depot", valeur: "2026-09-15", texte: "Le dossier a été déposé le 15/09/2026.", page: 1 },
      { champ: "type_autorisation", valeur: "PCMI", texte: "maison individuelle et/ou ses annexes (PCMI)", page: 1 },
      { champ: "commune", valeur: "Saint-Herblain", texte: "MAIRIE DE SAINT-HERBLAIN", page: 1 },
      { champ: "demandeur", valeur: "SCI LES TILLEULS", texte: "Demandeur : SCI LES TILLEULS", page: 1 },
    ],
  });
  assertEquals(issue, "lue", "numero_dossier n'est plus une clé : la date de dépôt suffit");
  const v = new Map(portes.enregistrements[0].resultat.valeurs.map((x) => [x.champ, x]));
  assertEquals(v.get("type_autorisation")!.valeur, "pcmi");
  assertEquals(v.get("type_autorisation")!.verifiee, true);
  assertEquals(v.get("demandeur")!.verifiee, true);
  assertEquals(typerValeur("type_autorisation", "DP", champsPour("lorani")).valeur, "dp");
  assertEquals(typerValeur("type_autorisation", "certificat d'urbanisme", champsPour("lorani")).ok, false);
  assertEquals(typerValeur("delai_reponse_mois", "3 mois", champsPour("lorani")).valeur, 3);
  assertEquals(typerValeur("delai_reponse_mois", 13, champsPour("lorani")).ok, false);
  for (const c of ["motif_majoration", "prescriptions", "date_notification", "date_certificat", "commissaire"]) {
    assert(champsPour("lorani").has(c), c);
  }
});

Deno.test("lorani : un autre courrier de la mairie est lu, avec ou sans date", async () => {
  const octets = pdf(["Accusé de réception électronique", "Votre envoi a bien été reçu."]);
  const { issue, portes } = await lireLorani("30", "ar.pdf", octets, {
    lisible: true,
    type_piece: "lorani_courrier_autre",
    confiance_type: 0.9,
    valeurs: [],
  });
  assertEquals(issue, "lue");
  assertEquals(portes.enregistrements[0].resultat.type_piece, "lorani_courrier_autre");
});
