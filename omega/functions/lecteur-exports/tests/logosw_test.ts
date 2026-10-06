// Les dix jeux Logos_w de Tiroma (modeles_jeux de la recette) : chacun se
// reconnaît par le nom de fichier et par ses en-têtes, ses colonnes
// obligatoires se rapprochent, l'essai à blanc ne recopie aucune valeur.

import { assert, assertEquals } from "@std/assert";
import { chargerModeles, essaiABlanc } from "../outils/essai_a_blanc.ts";
import type { JeuDeclare } from "../portes_releve.ts";

const JEUX = chargerModeles(await Deno.readTextFile(new URL("../modeles/tiroma_logosw.json", import.meta.url)));

// Un nom de fichier plausible par jeu, tel qu'un export Logos_w le nommerait.
const NOMS: Record<string, string> = {
  actes: "actes_2026-10-06.csv",
  agenda: "agenda_2026-10-06.csv",
  attente: "liste_attente.csv",
  devis: "devis_2026-10.csv",
  devis_lignes: "devis_lignes_2026-10.csv",
  labo: "labo_fiches.csv",
  odf: "odf_ententes.csv",
  patients: "patients_actifs.csv",
  stock: "stock.csv",
  types_rdv: "types_rdv.csv",
};

// Constat du 06/10 sur les modèles v1 : « actes » couvrait la signature de « devis », « devis_lignes » celle de
// « types_rdv », « agenda » celle de « patients ». Signatures resserrées par b3_11 : plus aucun recouvrement.

function exemple(type: string, rang: number): string {
  switch (type) {
    case "date":
      return `0${(rang % 9) + 1}/10/2026`;
    case "dateheure":
      return `2026-10-0${(rang % 9) + 1} 08:30`;
    case "entier":
      return String(10 + rang);
    case "decimal":
      return `${100 + rang},50`;
    case "booleen":
      return rang % 2 ? "oui" : "non";
    default:
      return `V${rang}`;
  }
}

/** Un CSV « ; » avec, pour chaque colonne déclarée, sa première variante d'en-tête. */
function csvPour(jeu: JeuDeclare, lignes = 3): Uint8Array {
  const cols = Object.entries(jeu.colonnes);
  const entetes = cols.map(([, d]) => d.entetes![0]);
  const corps = Array.from({ length: lignes }, (_, i) => cols.map(([, d]) => exemple(d.type, i + 1)).join(";"));
  return new TextEncoder().encode([entetes.join(";"), ...corps].join("\r\n") + "\r\n");
}

Deno.test("logosw : le modèle extrait porte les dix jeux de la recette", () => {
  assertEquals(JEUX.map((j) => j.code), ["actes", "agenda", "attente", "devis", "devis_lignes", "labo", "odf", "patients", "stock", "types_rdv"]);
  for (const j of JEUX) assert(j.cle.length > 0 && j.entetes.length > 0, j.code);
});

for (const jeu of JEUX) {
  Deno.test(`logosw : « ${jeu.code} » reconnu par son nom de fichier puis par ses seuls en-têtes`, async () => {
    const octets = csvPour(jeu);
    const parNom = await essaiABlanc(NOMS[jeu.code], octets, JEUX);
    assertEquals(parNom.statut, "lu", `${jeu.code} : ${parNom.motif}`);
    assertEquals(parNom.jeu, jeu.code);
    assertEquals(parNom.lignes, 3);
    assertEquals(parNom.absentes_obligatoires, []);
    assertEquals(parNom.entetes_non_declares, []);
    assertEquals(parNom.lignes_avec_anomalie, 0, JSON.stringify(parNom.anomalies));
    const parEntetes = await essaiABlanc("export.csv", octets, JEUX);
    assertEquals(parEntetes.jeu, jeu.code, `${jeu.code} par en-têtes : ${parEntetes.statut} ${parEntetes.motif ?? ""}`);
  });
}

Deno.test("logosw : agenda Windows-1252 aux en-têtes variantes, heures du cabinet sans fuseau", async () => {
  const texte = [
    "N° rendez-vous;N° dossier;Praticien;Fauteuil;Type de RDV;Date début;Durée (min);État;Nom patient;Commentaire",
    "R101;Q02;Dr Rousseau;Fauteuil 1;Détartrage;06/10/2026 08:30;30;Prévu;Zami;",
    "R102;Q03;Dr Lacour;Fauteuil 2;Soin composite;06/10/2026 14:00;30;Honoré;Bazile;rappel",
    "R103;;Dr Lacour;Fauteuil 2;Urgence;06/10/2026 25:00;20;Prévu;Nestor;",
  ].join("\r\n");
  const octets = Uint8Array.from([...texte].map((c) => ({ "°": 0xb0, "é": 0xe9, "É": 0xc9, "è": 0xe8 } as Record<string, number>)[c] ?? c.charCodeAt(0)));
  const d = await essaiABlanc("RDV du jour.csv", octets, JEUX);
  assertEquals(d.statut, "lu");
  assertEquals(d.jeu, "agenda");
  assertEquals((d.format as { encodage?: string }).encodage, "windows-1252");
  assertEquals(d.rapprochees.ref, "N° rendez-vous");
  assertEquals(d.rapprochees.debut, "Date début");
  assertEquals(d.entetes_non_declares, ["Commentaire"]);
  // patient_ref n'est pas obligatoire dans le modèle agenda (un créneau sans patient) : pas d'anomalie.
  assertEquals(d.anomalies, { debut: { "date et heure illisibles": 1 } }, "l'heure 25:00 est relevée");
  assertEquals(d.lignes_avec_anomalie, 1);
  // Aucune valeur du fichier dans le diagnostic (noms de patients compris).
  const json = JSON.stringify(d);
  for (const v of ["Zami", "Bazile", "Nestor", "R101", "Q02", "rappel"]) assert(!json.includes(v), v);
});

Deno.test("logosw : colonne obligatoire absente → rejeté, nommée dans le diagnostic", async () => {
  const octets = new TextEncoder().encode("N° patient;Prénom;Praticien\nP001;Marguerite;Dr Lacour\n");
  const d = await essaiABlanc("patients.csv", octets, JEUX);
  assertEquals(d.statut, "rejete");
  assertEquals(d.jeu, "patients");
  assertEquals(d.absentes_obligatoires, ["nom"]);
});
