// La lecture d'un instantané : du travail `releve.lire` aux lignes déposées
// et à l'instantané clos. Tout chemin finit par une porte, aucune exception ne sort.

import type { Depot } from "@partage/depot.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal, messageDe } from "@partage/journal.ts";
import type { Travail } from "@partage/portes.ts";
import { entetesCouvertes, motifReconnait, normaliserEntete, rapprocher } from "./entetes.ts";
import type { InstantaneALire, JeuDeclare, LigneDeposee, PortesReleve, ResultatReleve } from "./portes_releve.ts";
import { type Feuille, lireTableau, type Tableau } from "./tableau.ts";
import { anomalieDeForme } from "./valeurs.ts";

export interface Contexte {
  portes: PortesReleve;
  depot: Depot;
  maintenant: () => Date;
  ouvrier: string;
  /** Lignes par appel de deposer_lignes. */
  taillePaquet: number;
}

export type Issue = "lu" | "a_classer" | "rejete" | "echec" | "ignore" | "repris" | "abandon" | "erreur";

export function versionLecteurExports(maintenant: Date): string {
  return `lecteur-exports/${maintenant.toISOString().slice(0, 10)}`;
}

export async function lireExport(ctx: Contexte, travail: Travail): Promise<Issue> {
  const instantaneId = typeof travail.charge?.instantane === "string" ? travail.charge.instantane : null;
  const trace = { travail: travail.id, instantane: instantaneId, client: travail.client_id };
  try {
    if (!instantaneId) {
      await ctx.portes.finirTravail(travail.id, { ignore: "charge sans instantané" });
      journal("alerte", "travail sans instantané, ignoré", trace);
      return "ignore";
    }
    const inst = await ctx.portes.commencerReleve(instantaneId);
    if (!inst) {
      await ctx.portes.finirTravail(travail.id, { ignore: "plus rien à lire" });
      journal("info", "instantané déjà lu ou écarté, travail ignoré", trace);
      return "ignore";
    }
    const debut = Date.now();
    const bilan = await lire(ctx, inst);
    const version = versionLecteurExports(ctx.maintenant());
    await ctx.portes.terminerLecture(inst.instantane, bilan.resultat, version);
    await ctx.portes.finirTravail(travail.id, {
      statut: bilan.resultat.statut,
      lignes: bilan.resultat.lignes,
      colonnes: bilan.resultat.colonnes.length,
      anomalies: bilan.anomalies,
      format: bilan.resultat.format.type,
      jeu: bilan.jeu,
      paquets: bilan.paquets,
      duree_ms: Date.now() - debut,
      version,
    });
    journal("info", "export lu", {
      ...trace,
      statut: bilan.resultat.statut,
      jeu: bilan.jeu,
      lignes: bilan.resultat.lignes,
      anomalies: bilan.anomalies,
      format: bilan.resultat.format.type,
    });
    return bilan.resultat.statut;
  } catch (e) {
    const erreur = e instanceof ErreurOuvrier ? e : new ErreurOuvrier("ERREUR_INTERNE", messageDe(e), true);
    journal(erreur.code === "ERREUR_INTERNE" ? "erreur" : "alerte", `lecture d'export interrompue : ${erreur.code}`, { ...trace, motif: erreur.message });
    try {
      return (await ctx.portes.echouerTravail(travail.id, erreur.motif, erreur.reprendre)) === "repris" ? "repris" : "abandon";
    } catch (e2) {
      journal("erreur", "echouer_travail a lui-même échoué", { ...trace, erreur: messageDe(e2) });
      return "erreur";
    }
  }
}

interface Bilan {
  resultat: ResultatReleve;
  jeu: string | null;
  paquets: number;
  anomalies: number;
}

function echec(statut: "echec" | "rejete" | "a_classer", motif: string, format?: ResultatReleve["format"]): Bilan {
  return {
    resultat: { statut, lignes: 0, colonnes: [], format: format ?? { type: "csv", entetes: [], anomalies: 0 }, motif: motif.slice(0, 500) },
    jeu: null,
    paquets: 0,
    anomalies: 0,
  };
}

async function lire(ctx: Contexte, inst: InstantaneALire): Promise<Bilan> {
  const tele = await ctx.depot.telecharger(inst.chemin);
  if (!tele.present) return echec("echec", `Fichier absent du dépôt (${inst.chemin}).`);
  if (tele.octets.length === 0) return echec("echec", "Fichier vide.");

  let tableau: Tableau | null;
  try {
    tableau = await lireTableau(tele.octets, inst.mime, inst.nom_fichier);
  } catch (e) {
    return echec("echec", `Fichier illisible : ${messageDe(e, 200)}`);
  }
  if (!tableau) return echec("rejete", `Ni CSV ni classeur : ${inst.mime}, ${inst.nom_fichier}.`);

  // Le jeu : celui de l'instantané, sinon reconnu par le nom du fichier, sinon par les en-têtes.
  const choix = choisirJeu(inst, tableau);
  if (!choix) {
    const f = tableau.feuilles[0];
    return echec(
      "a_classer",
      `Aucun jeu reconnu pour « ${inst.nom_fichier} » (en-têtes : ${(f?.entetes ?? []).slice(0, 8).join(", ")}).`,
      formatDe(tableau, f, 0),
    );
  }
  const { jeu, feuille } = choix;
  if (feuille.lignes.length === 0 && feuille.entetes.length === 0) {
    return echec("echec", "Aucune ligne ni en-tête dans le fichier.", formatDe(tableau, feuille, 0));
  }

  // Les colonnes déclarées trouvent leur colonne de fichier par en-tête.
  const declarees = new Map<string, string[]>();
  for (const [cle, d] of Object.entries(jeu.colonnes ?? {})) {
    declarees.set(cle, [...(Array.isArray(d.entetes) ? d.entetes : []), ...(typeof d.libelle === "string" ? [d.libelle] : [])]);
  }
  const r = rapprocher(feuille.entetes, declarees);
  const obligatoires = new Set([...jeu.cle, ...Object.entries(jeu.colonnes ?? {}).filter(([, d]) => d.obligatoire === true).map(([k]) => k)]);
  const manquantes = r.absentes.filter((c) => obligatoires.has(c));
  if (manquantes.length > 0) {
    return {
      resultat: {
        statut: "rejete",
        jeu: jeu.code,
        lignes: 0,
        colonnes: [],
        format: formatDe(tableau, feuille, 0),
        motif: `Colonnes obligatoires absentes du fichier : ${manquantes.join(", ")}.`.slice(0, 500),
      },
      jeu: jeu.code,
      paquets: 0,
      anomalies: 0,
    };
  }

  const normes = feuille.entetes.map(normaliserEntete);
  const lignes: LigneDeposee[] = [];
  const clesVues = new Map<string, number>();
  let anomalies = 0;
  feuille.lignes.forEach((cellules, i) => {
    const valeurs: Record<string, string> = {};
    const anos: Record<string, string> = {};
    for (const [cle, k] of r.index) {
      const v = (cellules[k] ?? "").trim();
      valeurs[cle] = v;
      if (v === "" && obligatoires.has(cle)) anos[cle] = "vide";
      else {
        const a = anomalieDeForme(jeu.colonnes?.[cle]?.type, v);
        if (a) anos[cle] = a;
      }
    }
    for (const c of r.absentes) valeurs[c] = "";
    const n = i + 1;
    // La clé métier : les colonnes `cle` du jeu, jointes ; unique par instantané.
    let cle = jeu.cle.map((c) => valeurs[c] ?? "").join("|").trim();
    if (cle === "" || jeu.cle.length === 0) {
      cle = `#${n}`;
      if (jeu.cle.length > 0) anos["cle"] = "clé vide";
    } else if (clesVues.has(cle)) {
      anos["cle"] = `doublon de la ligne ${clesVues.get(cle)}`;
      cle = `${cle}#${n}`;
    } else clesVues.set(cle, n);
    const ligne: LigneDeposee = { n, ligne: feuille.numeros[i] ?? null, cle: cle.slice(0, 1000), valeurs };
    if (Object.keys(anos).length > 0) {
      ligne.anomalies = anos;
      anomalies++;
    }
    lignes.push(ligne);
  });

  let paquets = 0;
  let deposees = 0;
  for (let i = 0; i < lignes.length; i += ctx.taillePaquet) {
    const paquet = lignes.slice(i, i + ctx.taillePaquet);
    const n = await ctx.portes.deposerLignes(inst.instantane, paquet);
    deposees += Number.isFinite(n) && n > 0 ? n : paquet.length;
    paquets++;
  }
  if (deposees !== lignes.length) {
    throw new ErreurOuvrier("ERREUR_INTERNE", `deposer_lignes a inséré ${deposees} lignes sur ${lignes.length}`, true);
  }

  const colonnes = feuille.entetes.map((_, k) => {
    for (const [cle, idx] of r.index) if (idx === k) return cle;
    return normes[k];
  });
  return {
    resultat: { statut: "lu", jeu: jeu.code, lignes: lignes.length, colonnes, format: formatDe(tableau, feuille, anomalies) },
    jeu: jeu.code,
    paquets,
    anomalies,
  };
}

function formatDe(t: Tableau, f: Feuille | undefined, anomalies: number): ResultatReleve["format"] {
  return {
    type: t.format,
    encodage: t.encodage,
    separateur: t.separateur,
    feuille: t.format === "xlsx" ? f?.nom : undefined,
    entetes: f?.entetes ?? [],
    anomalies,
  };
}

/** Le jeu et la feuille à lire. */
export function choisirJeu(inst: InstantaneALire, tableau: Tableau): { jeu: JeuDeclare; feuille: Feuille } | null {
  const feuilles = tableau.feuilles.filter((f) => f.entetes.length > 0);
  if (feuilles.length === 0) return null;
  const feuillePour = (jeu: JeuDeclare): Feuille => {
    const nommee = typeof jeu.options?.feuille === "string"
      ? feuilles.find((f) => normaliserEntete(f.nom) === normaliserEntete(String(jeu.options.feuille)))
      : undefined;
    return nommee ?? feuilles.find((f) => entetesCouvertes(f.entetes, jeu.entetes)) ?? feuilles[0];
  };
  if (inst.jeu) {
    const jeu = inst.jeux.find((j) => j.code === inst.jeu);
    if (jeu) return { jeu, feuille: feuillePour(jeu) };
  }
  const parMotif = inst.jeux.filter((j) => motifReconnait(j.motif_fichier, inst.nom_fichier));
  if (parMotif.length === 1) return { jeu: parMotif[0], feuille: feuillePour(parMotif[0]) };
  const parEntetes = inst.jeux.filter((j) => feuilles.some((f) => entetesCouvertes(f.entetes, j.entetes)));
  if (parEntetes.length === 1) return { jeu: parEntetes[0], feuille: feuillePour(parEntetes[0]) };
  if (parMotif.length > 1) {
    const croise = parMotif.filter((j) => parEntetes.includes(j));
    if (croise.length === 1) return { jeu: croise[0], feuille: feuillePour(croise[0]) };
  }
  if (inst.jeux.length === 1 && inst.jeux[0].entetes.length === 0) return { jeu: inst.jeux[0], feuille: feuilles[0] };
  return null;
}
