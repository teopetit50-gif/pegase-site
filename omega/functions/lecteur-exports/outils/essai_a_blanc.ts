// L'essai à blanc d'un export réel, avant tout dépôt sur la recette : le fichier
// passe par lireExport (le code exact de la fonction), avec des portes et un
// dépôt en mémoire et les jeux d'un modèle (par défaut les dix jeux Logos_w de
// Tiroma, modeles/tiroma_logosw.json). Rien ne part sur le réseau.
//
//   deno task essai <fichier> [<fichier>…] [--modeles <json>] [--jeu <code>] [--json]
//
// Ce qui s'affiche ne contient AUCUNE valeur du fichier : seulement les
// en-têtes, le jeu reconnu, les colonnes rapprochées ou absentes, le nombre de
// lignes et les anomalies comptées par colonne et par motif. Un export de
// patients se diagnostique donc sans rien recopier.

import { normaliserEntete, rapprocher } from "../entetes.ts";
import { choisirJeu, lireExport } from "../lire_export.ts";
import type { InstantaneALire, JeuDeclare } from "../portes_releve.ts";
import { lireTableau } from "../tableau.ts";
import { contexteDeTest, instantaneDeTest, travailDeTest } from "../tests/doubles.ts";

export interface Diagnostic {
  fichier: string;
  statut: string;
  jeu: string | null;
  motif?: string;
  format: Record<string, unknown>;
  lignes: number;
  /** Clé de colonne → en-tête du fichier qui l'a fournie. */
  rapprochees: Record<string, string>;
  /** Colonnes déclarées sans en-tête dans le fichier, obligatoires d'abord. */
  absentes_obligatoires: string[];
  absentes_facultatives: string[];
  /** En-têtes du fichier qu'aucune colonne du jeu ne prend : de quoi enrichir le modèle. */
  entetes_non_declares: string[];
  /** Colonne → motif → nombre de lignes. */
  anomalies: Record<string, Record<string, number>>;
  lignes_avec_anomalie: number;
}

export function chargerModeles(texte: string): JeuDeclare[] {
  const doc = JSON.parse(texte);
  const jeux = Array.isArray(doc) ? doc : doc.jeux;
  if (!Array.isArray(jeux) || jeux.length === 0) throw new Error("modèle sans jeux");
  return jeux.map((j: Record<string, unknown>) => ({
    code: String(j.code),
    libelle: String(j.libelle ?? j.code),
    motif_fichier: (j.motif_fichier as string | null) ?? null,
    entetes: (j.entetes as string[]) ?? [],
    colonnes: (j.colonnes as JeuDeclare["colonnes"]) ?? {},
    cle: (j.cle as string[]) ?? [],
    options: (j.options as Record<string, unknown>) ?? {},
  }));
}

function mimeDe(nom: string): string {
  const n = nom.toLowerCase();
  if (n.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (n.endsWith(".xls")) return "application/vnd.ms-excel";
  if (n.endsWith(".txt")) return "text/plain";
  return "text/csv";
}

export async function essaiABlanc(nom: string, octets: Uint8Array, jeux: JeuDeclare[], jeuImpose: string | null = null): Promise<Diagnostic> {
  const { ctx, portes, depot } = contexteDeTest();
  const id = crypto.randomUUID();
  const inst: InstantaneALire & { statut: string } = { ...instantaneDeTest(id, nom, mimeDe(nom), jeuImpose, jeux), logiciel: "essai_a_blanc" };
  portes.instantanes.set(id, inst);
  depot.fichiers.set(inst.chemin, octets);
  await lireExport(ctx, travailDeTest(1, id));

  const fin = portes.termines.at(-1);
  const echec = portes.echoues.at(-1);
  const diag: Diagnostic = {
    fichier: nom,
    statut: fin?.resultat.statut ?? (echec ? `erreur : ${echec.erreur}` : "inconnu"),
    jeu: fin?.resultat.jeu ?? null,
    motif: fin?.resultat.motif,
    format: { ...(fin?.resultat.format ?? {}) },
    lignes: fin?.resultat.lignes ?? 0,
    rapprochees: {},
    absentes_obligatoires: [],
    absentes_facultatives: [],
    entetes_non_declares: [],
    anomalies: {},
    lignes_avec_anomalie: 0,
  };

  // Le rapprochement, refait avec les mêmes fonctions que lireExport, pour le montrer.
  const tableau = await lireTableau(octets, inst.mime, nom).catch(() => null);
  const jeu = fin?.resultat.jeu ? jeux.find((j) => j.code === fin.resultat.jeu) : undefined;
  if (tableau && jeu) {
    const choix = choisirJeu({ ...inst, jeu: jeu.code }, tableau);
    if (choix) {
      const declarees = new Map<string, string[]>();
      for (const [cle, d] of Object.entries(jeu.colonnes)) {
        declarees.set(cle, [...(Array.isArray(d.entetes) ? d.entetes : []), ...(typeof d.libelle === "string" ? [d.libelle] : [])]);
      }
      const r = rapprocher(choix.feuille.entetes, declarees);
      const pris = new Set<number>();
      for (const [cle, k] of r.index) {
        diag.rapprochees[cle] = choix.feuille.entetes[k];
        pris.add(k);
      }
      const obligatoires = new Set([...jeu.cle, ...Object.entries(jeu.colonnes).filter(([, d]) => d.obligatoire === true).map(([k]) => k)]);
      diag.absentes_obligatoires = r.absentes.filter((c) => obligatoires.has(c));
      diag.absentes_facultatives = r.absentes.filter((c) => !obligatoires.has(c));
      diag.entetes_non_declares = choix.feuille.entetes.filter((e, k) => !pris.has(k) && normaliserEntete(e) !== "");
    }
  }
  for (const l of portes.lignes.get(id) ?? []) {
    if (!l.anomalies) continue;
    diag.lignes_avec_anomalie++;
    for (const [col, motif] of Object.entries(l.anomalies)) {
      // Le motif d'un doublon cite un numéro de ligne : ramené à sa forme générale.
      const m = motif.replace(/\d+/g, "n");
      diag.anomalies[col] ??= {};
      diag.anomalies[col][m] = (diag.anomalies[col][m] ?? 0) + 1;
    }
  }
  return diag;
}

function afficher(d: Diagnostic): string {
  const l: string[] = [];
  l.push(`── ${d.fichier}`);
  l.push(`statut : ${d.statut}${d.jeu ? `, jeu « ${d.jeu} »` : ""}${d.motif ? ` — ${d.motif}` : ""}`);
  const f = d.format as { type?: string; encodage?: string; separateur?: string; feuille?: string; entetes?: string[] };
  l.push(
    `format : ${f.type ?? "?"}${f.encodage ? `, ${f.encodage}` : ""}${f.separateur ? `, séparateur « ${f.separateur === "\t" ? "tab" : f.separateur} »` : ""}${
      f.feuille ? `, feuille « ${f.feuille} »` : ""
    }`,
  );
  l.push(`en-têtes du fichier (${f.entetes?.length ?? 0}) : ${(f.entetes ?? []).join(" | ")}`);
  if (d.jeu) {
    l.push(`lignes : ${d.lignes}, dont ${d.lignes_avec_anomalie} avec anomalie`);
    l.push(`rapprochées : ${Object.entries(d.rapprochees).map(([c, e]) => `${c} ← « ${e} »`).join(", ") || "aucune"}`);
    if (d.absentes_obligatoires.length) l.push(`ABSENTES OBLIGATOIRES : ${d.absentes_obligatoires.join(", ")}`);
    if (d.absentes_facultatives.length) l.push(`absentes facultatives : ${d.absentes_facultatives.join(", ")}`);
    if (d.entetes_non_declares.length) l.push(`en-têtes non déclarés : ${d.entetes_non_declares.join(" | ")}`);
    for (const [c, ms] of Object.entries(d.anomalies)) l.push(`anomalie ${c} : ${Object.entries(ms).map(([m, n]) => `${m} × ${n}`).join(", ")}`);
  }
  return l.join("\n");
}

if (import.meta.main) {
  const args = [...Deno.args];
  const opt = (nom: string): string | null => {
    const i = args.indexOf(nom);
    if (i < 0) return null;
    const v = args[i + 1] ?? null;
    args.splice(i, 2);
    return v;
  };
  const enJson = args.includes("--json");
  if (enJson) args.splice(args.indexOf("--json"), 1);
  const modeles = opt("--modeles") ?? new URL("../modeles/tiroma_logosw.json", import.meta.url).pathname;
  const jeuImpose = opt("--jeu");
  if (args.length === 0) {
    console.error("usage : deno task essai <fichier> [<fichier>…] [--modeles <json>] [--jeu <code>] [--json]");
    Deno.exit(2);
  }
  const jeux = chargerModeles(await Deno.readTextFile(modeles));
  const diags: Diagnostic[] = [];
  for (const chemin of args) {
    const nom = chemin.split(/[\\/]/).pop()!;
    diags.push(await essaiABlanc(nom, await Deno.readFile(chemin), jeux, jeuImpose));
  }
  console.log(enJson ? JSON.stringify(diags, null, 1) : diags.map(afficher).join("\n\n"));
  Deno.exit(diags.every((d) => d.statut === "lu" && d.absentes_obligatoires.length === 0) ? 0 : 1);
}
