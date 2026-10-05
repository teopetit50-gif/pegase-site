// La lecture d'un export de bout en bout, sur doubles.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { csvMouvements, csvPatients, windows1252, xlsxArticles } from "../exemples/generer.ts";
import { lireExport } from "../lire_export.ts";
import type { JeuDeclare } from "../portes_releve.ts";
import { passage } from "../passage.ts";
import { contexteDeTest, instantaneDeTest, jeuArticles, jeuPatients, travailDeTest } from "./doubles.ts";

const ID = (n: number) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;

Deno.test("CSV « ; » Windows-1252, jeu donné : lignes déposées, colonnes reconnues, anomalies comptées", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const inst = instantaneDeTest(ID(1), "patients_tiroma.csv", "text/csv", "patients", [jeuPatients(), jeuArticles()]);
  portes.instantanes.set(inst.instantane, inst);
  depot.fichiers.set(inst.chemin, csvPatients());
  assertEquals(await lireExport(ctx, travailDeTest(1, inst.instantane)), "lu");
  const t = portes.termines[0];
  assertEquals(t.resultat.statut, "lu");
  assertEquals(t.resultat.lignes, 4);
  assertEquals(t.resultat.format.type, "csv");
  assertEquals(t.resultat.format.encodage, "windows-1252");
  assertEquals(t.resultat.format.separateur, ";");
  assertEquals(t.resultat.colonnes, ["dossier", "nom", "prenom", "naissance", "telephone", "derniere_visite", "praticien"]);
  assertEquals(t.version, "lecteur-exports/2026-10-05");
  const lignes = portes.lignes.get(inst.instantane)!;
  assertEquals(lignes.length, 4);
  assertEquals(lignes[0].n, 1);
  assertEquals(lignes[0].valeurs.dossier, "D-0001");
  assertEquals(lignes[0].valeurs.prenom, "Élodie");
  assertEquals(lignes[0].valeurs.courriel, "", "colonne déclarée absente : vide, pas d'anomalie car facultative");
  assertEquals(lignes[0].cle, "D-0001");
  assertEquals(lignes[0].ligne, 2);
  assertEquals(lignes[0].anomalies, undefined);
  assertEquals(lignes[3].valeurs.nom, "PÉREZ, José");
  assertEquals(lignes[3].ligne, 5);
  assertEquals(t.resultat.jeu, "patients");
  assertEquals(t.resultat.format.anomalies, 0);
  assert(!("brute" in lignes[0]), "pas de clé hors contrat dans une ligne déposée");
  const fini = portes.finis[0].resultat as { jeu: string; paquets: number; lignes: number };
  assertEquals(fini.jeu, "patients");
  assertEquals(fini.paquets, 1);
  assertEquals(fini.lignes, 4);
  assertEquals(portes.echoues.length, 0);
});

Deno.test("XLSX, jeu reconnu par le motif de fichier, feuille nommée par l'option", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const inst = instantaneDeTest(ID(2), "articles_varelo.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", null, [
    jeuPatients(),
    jeuArticles(),
  ]);
  portes.instantanes.set(inst.instantane, inst);
  depot.fichiers.set(inst.chemin, xlsxArticles());
  assertEquals(await lireExport(ctx, travailDeTest(2, inst.instantane)), "lu");
  const t = portes.termines[0];
  assertEquals(t.resultat.format.type, "xlsx");
  assertEquals(t.resultat.format.feuille, "Articles");
  assertEquals(t.resultat.lignes, 3);
  const lignes = portes.lignes.get(inst.instantane)!;
  assertEquals(lignes[0].valeurs, { code: "A100", libelle: "Tube cuivre 12 mm", famille: "Plomberie", stock: "120", pu_ht: "3.2" });
  assertEquals(lignes[0].cle, "A100");
  assertEquals(lignes[0].ligne, 2);
  assertEquals(t.resultat.colonnes, ["code", "libelle", "famille", "stock", "pu_ht", "fournisseur"]);
  assertEquals((portes.finis[0].resultat as { jeu: string }).jeu, "articles");
});

Deno.test("CSV « , » UTF-8 BOM, jeu reconnu par les en-têtes ; anomalies de nombre et de date", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const mouvements: JeuDeclare = {
    code: "mouvements",
    libelle: "Mouvements",
    motif_fichier: null,
    entetes: ["Référence", "Désignation", "Quantité"],
    colonnes: {
      reference: { type: "texte", entetes: ["Référence"], obligatoire: true },
      designation: { type: "texte", entetes: ["Désignation"] },
      quantite: { type: "entier", entetes: ["Quantité"] },
      prix: { type: "decimal", entetes: ["Prix unitaire HT"], obligatoire: true },
      date: { type: "date", entetes: ["Date"] },
    },
    cle: ["reference"],
    options: {},
  };
  const inst = instantaneDeTest(ID(3), "export.csv", "text/csv", null, [jeuPatients(), mouvements]);
  portes.instantanes.set(inst.instantane, inst);
  depot.fichiers.set(inst.chemin, csvMouvements());
  assertEquals(await lireExport(ctx, travailDeTest(3, inst.instantane)), "lu");
  const lignes = portes.lignes.get(inst.instantane)!;
  assertEquals(lignes.length, 3);
  assertEquals(lignes[0].valeurs.prix, "8,90");
  assertEquals(lignes[0].anomalies, undefined);
  assertEquals(lignes[2].anomalies, { prix: "vide" });
  assertEquals(lignes[1].ligne, 3, "la cellule à saut de ligne décale le numéro suivant");
  assertEquals(lignes[2].ligne, 5);
  assertEquals(portes.termines[0].resultat.format.anomalies, 1);
  assertEquals((portes.finis[0].resultat as { anomalies: number }).anomalies, 1);
  assertEquals(portes.termines[0].resultat.format.encodage, "utf-8-bom");
});

Deno.test("aucun jeu reconnu : à classer, motivé, rien déposé", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const inst = instantaneDeTest(ID(4), "inconnu.csv", "text/csv", null, [jeuPatients(), jeuArticles()]);
  portes.instantanes.set(inst.instantane, inst);
  depot.fichiers.set(inst.chemin, new TextEncoder().encode("Colonne A;Colonne B\n1;2\n"));
  assertEquals(await lireExport(ctx, travailDeTest(4, inst.instantane)), "a_classer");
  assertStringIncludes(portes.termines[0].resultat.motif!, "Colonne A");
  assertEquals(portes.depots.length, 0);
  assertEquals(portes.finis.length, 1);
});

Deno.test("colonne obligatoire absente : rejeté, motivé, rien déposé", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const inst = instantaneDeTest(ID(5), "patients_sans_dossier.csv", "text/csv", "patients", [jeuPatients()]);
  portes.instantanes.set(inst.instantane, inst);
  depot.fichiers.set(inst.chemin, windows1252("Nom;Prénom\nDURAND;Élodie\n"));
  assertEquals(await lireExport(ctx, travailDeTest(5, inst.instantane)), "rejete");
  assertStringIncludes(portes.termines[0].resultat.motif!, "dossier");
  assertEquals(portes.depots.length, 0);
});

Deno.test("fichier absent → échec ; fichier illisible (PDF) → rejeté ; commencer_releve null → ignoré", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const absent = instantaneDeTest(ID(6), "patients.csv", "text/csv", "patients", [jeuPatients()]);
  portes.instantanes.set(absent.instantane, absent);
  assertEquals(await lireExport(ctx, travailDeTest(6, absent.instantane)), "echec");
  assertStringIncludes(portes.termines[0].resultat.motif!, "absent");

  const pdf = instantaneDeTest(ID(7), "patients.pdf", "application/pdf", "patients", [jeuPatients()]);
  portes.instantanes.set(pdf.instantane, pdf);
  depot.fichiers.set(pdf.chemin, new TextEncoder().encode("%PDF-1.7 ..."));
  assertEquals(await lireExport(ctx, travailDeTest(7, pdf.instantane)), "rejete");

  const lu = instantaneDeTest(ID(8), "patients.csv", "text/csv", "patients", [jeuPatients()]);
  lu.statut = "lu";
  portes.instantanes.set(lu.instantane, lu);
  assertEquals(await lireExport(ctx, travailDeTest(8, lu.instantane)), "ignore");
  assertEquals((portes.finis.at(-1)!.resultat as { ignore: string }).ignore, "plus rien à lire");
  assertEquals(await lireExport(ctx, travailDeTest(9, "aaaaaaaa-0000-4000-8000-000000000099")), "ignore");
});

Deno.test("1 200 lignes : trois paquets de 500, 500, 200, rangs continus", async () => {
  const { ctx, portes, depot } = contexteDeTest(500);
  const inst = instantaneDeTest(ID(10), "patients_gros.csv", "text/csv", "patients", [jeuPatients()]);
  portes.instantanes.set(inst.instantane, inst);
  const lignes = ["N° dossier;Nom;Prénom"];
  for (let i = 1; i <= 1200; i++) lignes.push(`D-${i};NOM${i};Prénom`);
  depot.fichiers.set(inst.chemin, windows1252(lignes.join("\r\n")));
  assertEquals(await lireExport(ctx, travailDeTest(10, inst.instantane)), "lu");
  assertEquals(portes.depots.map((d) => d.nombre), [500, 500, 200]);
  const deposees = portes.lignes.get(inst.instantane)!;
  assertEquals(deposees.length, 1200);
  assertEquals(deposees[1199].n, 1200);
  assertEquals(deposees[1199].valeurs.dossier, "D-1200");
  assertEquals((portes.finis[0].resultat as { paquets: number }).paquets, 3);
});

Deno.test("clés en double et clé vide : signalées, jamais deux fois la même clé", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const inst = instantaneDeTest(ID(12), "patients_doublons.csv", "text/csv", "patients", [jeuPatients()]);
  portes.instantanes.set(inst.instantane, inst);
  depot.fichiers.set(inst.chemin, windows1252("N° dossier;Nom\nD-1;A\nD-2;B\nD-1;C\n;D\n"));
  assertEquals(await lireExport(ctx, travailDeTest(12, inst.instantane)), "lu");
  const l = portes.lignes.get(inst.instantane)!;
  assertEquals(l.map((x) => x.cle), ["D-1", "D-2", "D-1#3", "#4"]);
  assertEquals(l[2].anomalies, { cle: "doublon de la ligne 1" });
  assertEquals(l[3].anomalies, { dossier: "vide", cle: "clé vide" });
  assertEquals(portes.termines[0].resultat.format.anomalies, 2);
});

Deno.test("types : entier, décimal, date, heure, booléen", async () => {
  const { anomalieDeForme } = await import("../valeurs.ts");
  assertEquals(anomalieDeForme("entier", "12"), null);
  assertEquals(anomalieDeForme("entier", "12,5"), "entier illisible");
  assertEquals(anomalieDeForme("decimal", "1 234,56"), null);
  assertEquals(anomalieDeForme("decimal", "8.90"), null);
  assertEquals(anomalieDeForme("decimal", "abc"), "nombre illisible");
  assertEquals(anomalieDeForme("date", "12/03/1988"), null);
  assertEquals(anomalieDeForme("date", "2026-09-01"), null);
  assertEquals(anomalieDeForme("date", "hier"), "date illisible");
  assertEquals(anomalieDeForme("heure", "14h30"), null);
  assertEquals(anomalieDeForme("dateheure", "01/09/2026 14:30"), null);
  assertEquals(anomalieDeForme("booleen", "Oui"), null);
  assertEquals(anomalieDeForme("booleen", "peut-être"), "booléen illisible");
  assertEquals(anomalieDeForme("texte", "n'importe"), null);
  assertEquals(anomalieDeForme("entier", ""), null);
});

Deno.test("panne d'une porte : repris sans exception ; passage à vide bat quand même", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const inst = instantaneDeTest(ID(11), "patients_tiroma.csv", "text/csv", "patients", [jeuPatients()]);
  portes.instantanes.set(inst.instantane, inst);
  depot.fichiers.set(inst.chemin, csvPatients());
  portes.panne.deposerLignes = new Error("HTTP 503");
  assertEquals(await lireExport(ctx, travailDeTest(11, inst.instantane)), "repris");
  assert(portes.echoues[0].erreur.startsWith("ERREUR_INTERNE"));

  const vide = contexteDeTest();
  const bilan = await passage(vide.ctx);
  assertEquals(bilan.pris, 0);
  assertEquals(vide.portes.battements[0].module, "lecteur_exports");
  assertEquals(vide.portes.battements[0].genres, ["releve.lire"]);
});
