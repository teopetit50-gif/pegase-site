/* TAMILA — le dossier de faits en exemple (02/11/2026, pages manquantes) : les lectures longues
   rendues sur le dossier 2026-0412 (SCI du Moulin c/ Bâti-Sud), en mémoire, non chiffrées.
   Même forme que le résultat que le lecteur d'A1 chiffre sous la clé du dossier (analyses.ts,
   omega/CONTRAT-ANALYSE.md). Longueurs calquées sur la page de référence (OME-19 de Linear :
   cinq lignes, trois cartes) pour la preuve par superposition. */

import type { ResultatAnalyse } from "@/components/espace/tamila/analyses";
import { DOSSIERS_EXEMPLE } from "@/components/espace/tamila/exemples";
import type * as portes from "@/components/espace/tamila/portes";

const heures = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export function faitsExemple(dossier: string): { lectures: portes.Analyse[]; resultats: Record<string, ResultatAnalyse> } {
  if (DOSSIERS_EXEMPLE.find((c) => c.clair?.reference === "2026-0412")?.dossier.id !== dossier) return { lectures: [], resultats: {} };
  const ord = `${dossier}-pc1`;
  const concl = `${dossier}-pc2`;
  const decl = `${dossier}-pc3`;
  const chrono: ResultatAnalyse = {
    type: "tamila.chronologie",
    statut: "finie",
    pieces_lues: 3,
    pages_lues: 21,
    sans_source: 0,
    resume:
      "Le marché de couverture est signé en 2021 ; les infiltrations apparaissent l'hiver 2023. Le tribunal rejette la demande en mars 2026 ; appel interjeté en avril.",
    constats: [
      {
        code: "evenement",
        titre: "Signature du marché de couverture avec Bâti-Sud",
        gravite: "info",
        donnees: { date: "2021-04-12", precision: "jour", acteur: "client", nature: "contrat" },
        citations: [{ piece: concl, page: 2, lignes: [4, 6], extrait: "le marché de travaux de couverture signé le 12 avril 2021", verifiee: true }],
      },
      {
        code: "evenement",
        titre: "Réception des travaux sans réserve sur la toiture",
        gravite: "info",
        donnees: { date: "2021-11-30", precision: "jour", acteur: "client", nature: "acte" },
        citations: [{ piece: concl, page: 3, lignes: [10, 11], extrait: "le procès-verbal de réception du 30 novembre 2021", verifiee: true }],
      },
      {
        code: "evenement",
        titre: "Premières infiltrations dans les combles du bâtiment B",
        gravite: "attention",
        texte: "La date diffère d'un mois entre les conclusions adverses et la déclaration d'appel.",
        donnees: { date: "2023-02-01", precision: "mois", acteur: "adverse", nature: "fait" },
        citations: [
          { piece: concl, page: 5, lignes: [12, 14], extrait: "dès le mois de février 2023, des infiltrations", verifiee: true },
          { piece: decl, page: 1, lignes: [8, 8], extrait: "constatées en mars 2023", verifiee: false },
        ],
      },
      {
        code: "evenement",
        titre: "Jugement du tribunal judiciaire de Pointe-à-Pitre",
        gravite: "info",
        donnees: { date: "2026-03-03", precision: "jour", acteur: "juge", nature: "decision" },
        citations: [{ piece: decl, page: 1, lignes: [2, 3], extrait: "jugement rendu le 3 mars 2026", verifiee: true }],
      },
      {
        code: "evenement",
        titre: "Ordonnance du conseiller de la mise en état",
        gravite: "info",
        donnees: { date: "2026-10-27", precision: "jour", acteur: "juge", nature: "procedure" },
        citations: [{ piece: ord, page: 1, lignes: [1, 4], extrait: "renvoie l'affaire à l'audience de mise en état", verifiee: true }],
      },
    ],
  };
  const contra: ResultatAnalyse = {
    type: "tamila.contradictions",
    statut: "finie",
    pieces_lues: 2,
    pages_lues: 17,
    sans_source: 0,
    resume: "Deux points où les écritures adverses et la déclaration d'appel ne disent pas la même chose.",
    constats: [
      {
        code: "contradiction",
        titre: "Date des premières infiltrations",
        gravite: "critique",
        texte: "Février 2023 selon les conclusions adverses, mars 2023 selon la déclaration d'appel : le point de départ de la garantie en dépend.",
        donnees: { sujet: "Date d'apparition des désordres", portee: "point de départ de la garantie" },
        citations: [
          { piece: concl, page: 5, lignes: [12, 14], extrait: "dès le mois de février 2023, des infiltrations", verifiee: true },
          { piece: decl, page: 1, lignes: [8, 8], extrait: "constatées en mars 2023", verifiee: true },
        ],
      },
      {
        code: "contradiction",
        titre: "Réserves à la réception",
        gravite: "attention",
        texte: "Les conclusions adverses parlent d'une réception sans réserve ; l'ordonnance mentionne des réserves levées.",
        donnees: { sujet: "Réception des travaux", portee: "garantie de parfait achèvement" },
        citations: [
          { piece: concl, page: 3, lignes: [10, 11], extrait: "le procès-verbal de réception du 30 novembre 2021", verifiee: true },
          { piece: ord, page: 2, lignes: [5, 6], extrait: "les réserves levées le 15 janvier 2022", verifiee: true },
        ],
      },
    ],
  };
  const citees: ResultatAnalyse = {
    type: "tamila.pieces_citees",
    statut: "finie",
    pieces_lues: 1,
    pages_lues: 14,
    sans_source: 0,
    resume: "Les conclusions adverses invoquent 3 pièces.",
    constats: [
      {
        code: "piece_citee",
        titre: "Constat d'huissier du 2 mars 2023",
        gravite: "info",
        donnees: { numero: "4", intitule: "Constat d'huissier du 2 mars 2023", date: "2023-03-02", partie: "client", ecriture: concl, ecritures: [concl] },
        citations: [{ piece: concl, page: 4, lignes: [10, 11], extrait: "le constat dressé le 2 mars 2023 (pièce n° 4)", verifiee: true }],
      },
      {
        code: "piece_citee",
        titre: "Ordonnance du conseiller de la mise en état",
        gravite: "info",
        donnees: { numero: "9", intitule: "Ordonnance du conseiller de la mise en état", partie: "adverse", ecriture: concl, ecritures: [concl] },
        citations: [{ piece: concl, page: 9, lignes: [2, 2], extrait: "l'ordonnance du conseiller de la mise en état (pièce n° 9)", verifiee: true }],
      },
      {
        code: "piece_citee",
        titre: "Rapport d'expertise amiable du 12 mai 2023",
        gravite: "info",
        donnees: { numero: "12", intitule: "Rapport d'expertise amiable du 12 mai 2023", date: "2023-05-12", partie: "adverse", ecriture: concl, ecritures: [concl] },
        citations: [{ piece: concl, page: 7, lignes: [3, 5], extrait: "ainsi qu'il ressort du rapport d'expertise amiable (pièce n° 12)", verifiee: true }],
      },
    ],
  };
  /* « Bordereau contrôlé (art. 768) » : chaque pièce numérotée, et la pièce que l'adversaire cite sans l'avoir
     communiquée (03/11/2026, docs/verification/PROMESSES-ECRANS.md) */
  const bordereau: ResultatAnalyse = {
    type: "tamila.bordereau",
    statut: "finie",
    pieces_lues: 3,
    pages_lues: 21,
    sans_source: 0,
    resume: "Trois pièces numérotées dans l'ordre ; la pièce n° 12 citée par l'adversaire ne figure pas à son bordereau.",
    constats: [
      { code: "piece", titre: "Déclaration d'appel", gravite: "info", donnees: { numero: "1", nature: "acte", date: "2026-10-14", pages: 4, deja_communiquee: true },
        citations: [{ piece: decl, page: 1, lignes: [1, 3], extrait: "déclaration d'appel", verifiee: true }] },
      { code: "piece", titre: "Conclusions de l'intimé", gravite: "info", donnees: { numero: "2", nature: "conclusions", date: "2026-10-28", pages: 14 },
        citations: [{ piece: concl, page: 1, lignes: [1, 2], extrait: "conclusions", verifiee: true }] },
      { code: "piece", titre: "Ordonnance du conseiller de la mise en état", gravite: "info", donnees: { numero: "3", nature: "decision", date: "2026-10-31", pages: 3 },
        citations: [{ piece: ord, page: 1, lignes: [1, 2], extrait: "ordonnance", verifiee: true }] },
      { code: "piece", titre: "Pièce n° 12 : citée, jamais communiquée", gravite: "attention", donnees: { numero: "12", nature: "rapport" },
        citations: [{ piece: concl, page: 7, lignes: [3, 5], extrait: "ainsi qu'il ressort du rapport d'expertise amiable (pièce n° 12)", verifiee: true }] },
    ],
  };
  /* « L'ensemble de la pré-lecture » : faits, prétentions, moyens et pièces visées, pièce par pièce */
  const prelecture: ResultatAnalyse = {
    type: "tamila.prelecture",
    statut: "finie",
    pieces_lues: 3,
    pages_lues: 21,
    sans_source: 0,
    resume: "L'intimé demande 48 000 € au titre des reprises, sur le fondement de la garantie décennale ; deux pièces visées.",
    constats: [
      { code: "pretention", titre: "Condamnation de Bâti-Sud à 48 000 € au titre des reprises", gravite: "info", donnees: { partie: "adverse", montant_cents: 4800000, fondement: "art. 1792 C. civ." },
        citations: [{ piece: concl, page: 12, lignes: [4, 6], extrait: "condamner la société Bâti-Sud à payer la somme de 48 000 €", verifiee: true }] },
      { code: "moyen", titre: "Désordres rendant l'ouvrage impropre à sa destination", gravite: "info", donnees: { partie: "adverse", fondement: "art. 1792 C. civ." },
        citations: [{ piece: concl, page: 6, lignes: [8, 10], extrait: "les infiltrations rendent l'ouvrage impropre à sa destination", verifiee: true }] },
      { code: "fait", titre: "Premières infiltrations dès février 2023", gravite: "info", donnees: { partie: "adverse", date: "2023-02-01" },
        citations: [{ piece: concl, page: 5, lignes: [2, 3], extrait: "dès le mois de février 2023, des infiltrations", verifiee: true }] },
      { code: "piece_visee", titre: "Constat d'huissier du 2 mars 2023 (pièce n° 4)", gravite: "info", donnees: { partie: "client", date: "2023-03-02" },
        citations: [{ piece: concl, page: 4, lignes: [10, 11], extrait: "le constat dressé le 2 mars 2023 (pièce n° 4)", verifiee: true }] },
      { code: "piece_visee", titre: "Rapport d'expertise amiable (pièce n° 12), absent du bordereau", gravite: "attention", donnees: { partie: "adverse", date: "2023-05-12" },
        citations: [{ piece: concl, page: 7, lignes: [3, 5], extrait: "ainsi qu'il ressort du rapport d'expertise amiable (pièce n° 12)", verifiee: true }] },
    ],
  };
  const base = { sans_source: 0, pieces_non_lues: [] as string[], motif: null, resultat_chiffre: null };
  const lectures: portes.Analyse[] = [
    { ...base, id: `${dossier}-an5`, type: "tamila.bordereau", statut: "finie", comptes: { info: 3, attention: 1, critique: 0 }, pieces: [ord, concl, decl], pieces_lues: 3, cout_eur: 0.12, demandee_le: heures(0.6), finie_le: heures(0.4) },
    { ...base, id: `${dossier}-an4`, type: "tamila.prelecture", statut: "finie", comptes: { info: 4, attention: 1, critique: 0 }, pieces: [ord, concl, decl], pieces_lues: 3, cout_eur: 0.38, demandee_le: heures(0.3), finie_le: heures(0.1) },
    { ...base, id: `${dossier}-an3`, type: "tamila.pieces_citees", statut: "finie", comptes: { info: 3, attention: 0, critique: 0 }, pieces: [concl], pieces_lues: 1, cout_eur: 0.18, demandee_le: heures(1), finie_le: heures(0.5) },
    { ...base, id: `${dossier}-an2`, type: "tamila.contradictions", statut: "finie", comptes: { info: 0, attention: 1, critique: 1 }, pieces: [concl, decl], pieces_lues: 2, cout_eur: 0.31, demandee_le: heures(2), finie_le: heures(1.5) },
    { ...base, id: `${dossier}-an1`, type: "tamila.chronologie", statut: "finie", comptes: { info: 4, attention: 1, critique: 0 }, pieces: [ord, concl, decl], pieces_lues: 3, cout_eur: 0.42, demandee_le: heures(72), finie_le: heures(1) },
  ];
  return { lectures, resultats: { [`${dossier}-an1`]: chrono, [`${dossier}-an2`]: contra, [`${dossier}-an3`]: citees, [`${dossier}-an4`]: prelecture, [`${dossier}-an5`]: bordereau } };
}
