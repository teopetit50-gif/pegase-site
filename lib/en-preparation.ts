/* ══════════════════════════════════════════════════════════════════════
   Les promesses des pages métiers dont le code n'existe pas encore
   (06/10/2026, C5 — omega/AUDIT-PROMESSES.md § 2 et § 3, point 13)

   Règle de Teo : « livrer tout ce qu'on promet, pas une chose de moins ».
   Aucune ligne n'est retirée du site. Une ligne dont le texte figure ici
   porte la pastille « En préparation » (components/ui/en-preparation.tsx)
   partout où une liste la rend avec <SiEnPreparation pour="…" t={…} />.

   QUAND L'OUVRIER LIVRE : il retire SA ligne d'ici (même commit que la
   livraison, ou le coordinateur la retire à la pose sur la recette), et la
   pastille tombe sur toutes les pages à la fois. Le texte doit être
   EXACTEMENT celui de la page ; les espaces insécables comptent comme des
   espaces ordinaires. Relevé ligne par ligne : omega/NOTES-C5.md.

   Les catalogues des pages produit n'utilisent pas ce fichier : leur
   colonne `atteste` (lib/produits/capacites/*.ts) fait le même travail.
   ══════════════════════════════════════════════════════════════════════ */

const LIGNES = {
  /* TIROMA — ouvrier B3. Tout est livré. Retirés le 06/10 au soir :
     synthèse de la semaine (b3_15), réinscription (b3_16), absences
     probables (b3_17) ; puis assistante absente (b3_18), demi-journées vides
     des collaborateurs (b3_19), objectifs par fauteuil (b3_20), un point du
     matin par centre / par site, plusieurs sites (b3_21, test à deux
     centres). La clé reste : la page dentaire la nomme. */
  tiroma: [] as string[],

  /* TAMILA — ouvrier B4 (pré-lecture avec A1 : lecture des pièces chiffrées,
     chronologie, contradictions, bordereau, export). Retirés le 06/10 au
     soir : effacement à la clôture (b4_11), temps proposé et forfait
     consommé (b4_12) ; point du matin (b4_14) ; marge, charge, séries et
     dossiers sans diligence (pilotage, 0c0714d) ; pièces attendues du client et
     de l'expert (b4_16, expertises). */
  tamila: [
    // cartes « fonctionnalités »
    "Pièces adverses du jour",
    "Chronologie sourcée",
    "Bordereau contrôlé",
    "Contradictions relevées",
    // section « point du matin »
    // formule Pré-lecture
    "Dossier de faits daté et sourcé",
    "Contradictions entre pièces",
    "Bordereau contrôlé (art. 768)",
    "Dispositif contre motifs (art. 954)",
    "Prétentions nouvelles et concentration en appel",
    "Pièces citées jamais communiquées, sommation prête",
    "Dires à l'expert préparés sur le pré-rapport",
    "Trous de la chronologie et faits contredits",
    "Index des personnes et faits classés par moyen",
    "Questions posées au dossier",
    "Premier jet de l'exposé des faits",
    "Dossier de plaidoirie et renvois cliquables",
    "Pièces scannées et manuscrites",
    "Export Word et PDF",
    "Chronologie des soins",
    "Interruptions de soins repérées",
    "Nomenclature Dintilhac pré-remplie",
    "Écarts entre rapports d'expertise",
    "Source de chaque poste de préjudice",
    "Questions posées au dossier médical",
    "Pièces médicales scannées",
    // formule Cabinet
    "L'ensemble de la pré-lecture",
  ],

  /* LORANI — ouvrier B5. Construits et retirés d'ici le 06/10 au soir :
     calendrier du permis, contrôle des planches et du PLU avec
     revérification à chaque indice (b5_16), situations et visas
     (b5_13 à b5_15) ; ordres de service et réserves jusqu'à la GPA (b5_19) ; comptes rendus de
     chantier et questions suivies jusqu'à la réponse (b5_20) ; décennales
     (b5_18, b5_09) ; accessibilité, ERP, RE2020, Cerfa, fonds BET et DOE
     (b5_21). Le métré : retiré le 06/10 au soir, la phrase dit maintenant le
     métré déposé (ou les quantités écrites sur les planches) comparé à la
     DPGF (b5_16 amendé, 3c838eb8) ; le lecteur ne mesure pas le dessin.
     Reste : PLU (servitudes et risques non lus). */
  lorani: [
    "Plans croisés, rapport PDF annoté",
    "PLU, servitudes et risques lus depuis l'adresse",
    "Questions posées au dossier",
    "Analyse des offres sur DPGF",
    "Une question en un clic",
    "Checklists de l'agence",
    "Export Excel par lot",
    "Honoraires par phase contre temps passé",
    "Dossier de défense décennale",
    "Historique des indices sans limite",
    "Contrôles définis avec vous",
    "Import depuis vos plateformes de projet",
    "Règles de votre charte intégrées",
  ],

  /* DALIRO — ouvrier B6 (lecture des photos et vocaux avec A1 et A2).
     Retirés le 06/10 au soir : relance des avenants (b6_18), recalage des
     lots (b6_19), signature sur place (b6_20), liste cadencée, livraisons
     calées, retours et bons rapprochés (b6_23), alerte météo (b6_21b, MET
     Norway). « Lecture des photos et vocaux » reste : les vocaux attendent la
     transcription. */
  daliro: [
    "Lecture des photos et vocaux",
    "Avancement lu dans les photos",
  ],

  /* VARELO — ouvrier B1 (réserves avec A1). Livrés et retirés d'ici le
     06/10 au soir : le groupe sur une page (b1_08), les reportings dus
     (b1_09), les réserves à émettre avec les photos du constat (b1_11, b1_12) ;
     le point du matin par direction (b1_07) n'avait pas de pastille. */
  varelo: [] as string[],

  /* TAVARO — ouvrier B2, par paliers. Seuls 01 (facturation des retours),
     12 (état des lieux signé) et 14 (amendes) existent. 19 (relevés
     constructeur) et l'assistance téléphonique (04) dépendent de tiers.
     Retirés le 06/10 : remise en location et entretien (b2_10). */
  tavaro: [
    "Assistance",
    "Sortie de flotte",
    "Questions",
    "Réservations à risque",
    "Montée en gamme",
    "Contrats à risque",
    "Véhicules inactifs",
    "Transferts",
    "Péages",
    "Rappels",
    "Garage et carrosserie",
    "Contestations bancaires",
    "Sinistres et recours",
    "Relevés constructeur",
    "Plan de flotte",
  ],

  /* OFFLOAD — ouvrier C4. Lignes « non construites » de NOTES-C4 (f9bf72d)
     qui apparaissent hors du catalogue. Le catalogue, lui, porte déjà
     `atteste: false`. Retiré le 06/10 au soir : « Entretien annuel redevenu
     dû » (c4_07, 5f2cc7e, échéances et renouvellements) ; « Pièce arrivée,
     jamais reprise » (c4_08, e4365bfb, affaires restées en plan). */
  offload: [] as string[],

  /* REPUT — ouvrier C3 (palier 5 : rendez-vous, avis, astreinte). Lignes
     non tenues (NOTES-C3) qui apparaissent hors du catalogue. */
  reput: [
    "Prise de rendez-vous",
  ],
};

/* Une liste PAR MODULE : la même phrase peut être livrée chez l'un et pas
   chez l'autre (« Point du matin à 7 h » existe chez Tiroma, pas chez
   Tamila). */
export type ModulePromesses = keyof typeof LIGNES;

const normaliser = (t: string) => t.replace(/[  ]/g, " ").trim();

const ENSEMBLES = Object.fromEntries(
  Object.entries(LIGNES).map(([m, l]) => [m, new Set(l.map(normaliser))]),
) as Record<ModulePromesses, Set<string>>;

/** Vrai si la promesse `t` du module `m` n'est pas encore livrée. */
export function enPreparation(m: ModulePromesses, t: string): boolean {
  return ENSEMBLES[m].has(normaliser(t));
}
