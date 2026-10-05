// Décodage des exports : encodages, séparateurs, guillemets, XLSX ; en-têtes.

import { assert, assertEquals } from "@std/assert";
import { csvMouvements, csvPatients, xlsxArticles } from "../exemples/generer.ts";
import { decoderTexte, devinerSeparateur, lireCsv, lireTableau } from "../tableau.ts";
import { entetesCouvertes, motifReconnait, normaliserEntete, rapprocher } from "../entetes.ts";

Deno.test("CSV « ; » en Windows-1252 : accents rendus, lignes vides ignorées, cellules entre guillemets", () => {
  const t = lireCsv(csvPatients());
  assertEquals(t.encodage, "windows-1252");
  assertEquals(t.separateur, ";");
  const f = t.feuilles[0];
  assertEquals(f.entetes, ["N° dossier", "Nom", "Prénom", "Date de naissance", "Téléphone", "Dernière visite", "Praticien"]);
  assertEquals(f.lignes.length, 4);
  assertEquals(f.lignes[0][2], "Élodie");
  assertEquals(f.lignes[3][1], "PÉREZ, José");
  assertEquals(f.lignes[1][4], "");
});

Deno.test("CSV « , » UTF-8 avec BOM : BOM retiré, saut de ligne dans une cellule, guillemets doublés", () => {
  const t = lireCsv(csvMouvements());
  assertEquals(t.encodage, "utf-8-bom");
  assertEquals(t.separateur, ",");
  const f = t.feuilles[0];
  assertEquals(f.entetes[0], "Référence");
  assertEquals(f.lignes.length, 3);
  assertEquals(f.lignes[0][1], "Vis inox 4x40, boîte de 200");
  assertEquals(f.lignes[1][1], "Plaque BA13\n(2,5 m)");
  assertEquals(f.lignes[0][3], "8,90");
  assertEquals(f.lignes[2][3], "");
});

Deno.test("séparateur tabulation et « | », ligne courte complétée", () => {
  const tab = lireCsv(new TextEncoder().encode("a\tb\tc\n1\t2\t3\n4\t5\n"));
  assertEquals(tab.separateur, "\t");
  assertEquals(tab.feuilles[0].lignes[1], ["4", "5", ""]);
  const pipe = lireCsv(new TextEncoder().encode("a|b\n1|2\n"));
  assertEquals(pipe.separateur, "|");
  assertEquals(devinerSeparateur("x;y,z\n1;2,3"), ";");
  assertEquals(decoderTexte(new Uint8Array([0xc9, 0x74, 0xe9])).texte, "Été");
});

Deno.test("XLSX : la feuille vide est sautée, nombres rendus en texte", async () => {
  const t = await lireTableau(xlsxArticles(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "articles_varelo.xlsx");
  assert(t && t.format === "xlsx");
  assertEquals(t.feuilles.length, 1);
  assertEquals(t.feuilles[0].nom, "Articles");
  assertEquals(t.feuilles[0].entetes, ["Code article", "Libellé", "Famille", "Stock", "PU HT", "Fournisseur"]);
  assertEquals(t.feuilles[0].lignes[0], ["A100", "Tube cuivre 12 mm", "Plomberie", "120", "3.2", "Cuivrex"]);
  assertEquals(t.feuilles[0].lignes[1][3], "0");
});

Deno.test("ni CSV ni XLSX : null (PDF, zip quelconque, binaire)", async () => {
  assertEquals(await lireTableau(new TextEncoder().encode("%PDF-1.7 ..."), "application/pdf", "x.pdf"), null);
  assertEquals(await lireTableau(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]), "application/zip", "x.zip"), null);
  assertEquals(await lireTableau(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]), "application/octet-stream", "x.bin"), null);
  const csv = await lireTableau(new TextEncoder().encode("a;b\n1;2\n"), "application/octet-stream", "export.txt");
  assertEquals(csv?.format, "csv");
});

Deno.test("en-têtes : normalisation, rapprochement exact puis par préfixe, absentes et en trop", () => {
  assertEquals(normaliserEntete("N° de Dossier "), "n_de_dossier");
  assertEquals(normaliserEntete("Date-naissance"), "date_naissance");
  assertEquals(normaliserEntete("Prénom (usuel)"), "prenom_usuel");
  const r = rapprocher(
    ["N° dossier", "Nom", "Prénom", "Date de naissance", "Téléphone", "Commentaire"],
    new Map([
      ["dossier", ["n_dossier", "numero_dossier"]],
      ["nom", []],
      ["prenom", []],
      ["naissance", ["date_de_naissance", "date_naissance"]],
      ["telephone", ["tel"]],
      ["courriel", ["email", "mail"]],
    ]),
  );
  assertEquals([...r.index.entries()], [["dossier", 0], ["nom", 1], ["prenom", 2], ["naissance", 3], ["telephone", 4]]);
  assertEquals(r.absentes, ["courriel"]);
  assertEquals(r.enTrop, [5]);
  // Le préfixe ne sert que s'il désigne une seule colonne.
  const amb = rapprocher(["Date début", "Date fin"], new Map([["date", []]]));
  assertEquals(amb.absentes, ["date"]);
  assertEquals(entetesCouvertes(["Code article", "Libellé", "Stock"], ["code_article", "libelle"]), true);
  assertEquals(entetesCouvertes(["Code article"], ["code_article", "libelle"]), false);
  assertEquals(entetesCouvertes(["x"], []), false);
  assertEquals(motifReconnait("export_patients_*.csv", "Export_Patients_2026-09.CSV"), true);
  assertEquals(motifReconnait("^articles.*\\.xlsx$", "articles_varelo.xlsx"), true);
  assertEquals(motifReconnait("patients*.csv", "articles.xlsx"), false);
  assertEquals(motifReconnait(null, "x"), false);
});
