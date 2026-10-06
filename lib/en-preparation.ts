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
     dossiers sans diligence (pilotage, 0c0714d). « Pièces attendues » reste :
     celles de l'expert ne sont pas suivies. */
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
    "Pièces attendues du client et de l'expert",
  ],

  /* LORANI — ouvrier B5. Construits et retirés d'ici le 06/10 au soir :
     calendrier du permis, contrôle des planches et du PLU avec
     revérification à chaque indice (b5_16), situations et visas
     (b5_13 à b5_15) ; ordres de service et réserves jusqu'à la GPA (b5_19). */
  lorani: [
    "Plans croisés, rapport PDF annoté",
    "Accessibilité, ERP et RE2020",
    "PLU, servitudes et risques lus depuis l'adresse",
    "Surfaces recalculées contre le Cerfa",
    "RE2020 : attestation comparée aux plans",
    "Questions posées au dossier",
    "Analyse des offres sur DPGF",
    "Questions suivies jusqu'à la réponse",
    "Métré des plans contre la DPGF",
    "Décennales contrôlées contre le lot",
    "Une question en un clic",
    "Checklists de l'agence",
    "Export Excel par lot",
    "Fonds de plan BET croisés",
    "Complétude du DOE à la réception",
    "Comptes rendus de chantier rédigés",
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
     calées, retours et bons rapprochés (b6_23). */
  daliro: [
    "Lecture des photos et vocaux",
    "Alerte météo",
    "Avancement lu dans les photos",
  ],

  /* VARELO — ouvrier B1 (réserves avec A1). Livrés et retirés d'ici le
     06/10 au soir : le groupe sur une page (b1_08), les reportings dus
     (b1_09), les réserves à émettre avec les photos du constat (b1_11, b1_12) ;
     le point du matin par direction (b1_07) n'avait pas de pastille. */
  varelo: [] as string[],

  /* TAVARO — ouvrier B2, par paliers. Seuls 01 (facturation des retours),
     12 (état des lieux signé) et 14 (amendes) existent. 19 (relevés
     constructeur) et l'assistance téléphonique (04) dépendent de tiers. */
  tavaro: [
    "Remise en location",
    "Entretien",
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
