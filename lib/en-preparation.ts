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
  /* TIROMA — ouvrier B3 */
  tiroma: [
    "Assistante absente : soins à basculer",
    "Demi-journées vides des collaborateurs",
    "Demi-journées vides",
    "Absences probables",
    "Synthèse de la semaine pour la direction",
    "Synthèse de la semaine",
    "Synthèse pour la direction",
    "Objectifs par fauteuil",
    "Taux de réinscription",
    "Taux de réinscription et d'acceptation des devis",
    "Taux de réinscription et d'acceptation",
    "Un point du matin par centre",
    "Un point du matin par site",
    "Plusieurs sites",
  ],

  /* TAMILA — ouvrier B4 (pré-lecture avec A1 : lecture des pièces chiffrées,
     chronologie, contradictions, bordereau, export) */
  tamila: [
    // cartes « fonctionnalités »
    "Pièces adverses du jour",
    "Chronologie sourcée",
    "Bordereau contrôlé",
    "Contradictions relevées",
    // section « point du matin »
    "Point du matin à 7 h",
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
    "Effacement à la clôture",
    // formule Cabinet
    "L'ensemble de la pré-lecture",
    "Pièces attendues du client et de l'expert",
    "Forfaits dépassés",
    "Conventions et forfaits",
    "Marge par dossier",
    "Contentieux en série comparés",
    "Dossiers en série comparés",
    "Dossiers sans diligence",
    "Charge par avocat",
    "Temps passé proposé à la saisie",
  ],

  /* LORANI — ouvrier B5 (le contrôle des planches avec A1). Seul le
     calendrier du permis est construit (NOTES-B5). */
  lorani: [
    "Plans croisés, rapport PDF annoté",
    "Permis : PC1 à PC8 et PLU",
    "Accessibilité, ERP et RE2020",
    "PLU, servitudes et risques lus depuis l'adresse",
    "Surfaces recalculées contre le Cerfa",
    "RE2020 : attestation comparée aux plans",
    "Questions posées au dossier",
    "Analyse des offres sur DPGF",
    "Visa des fiches techniques",
    "Situations et décomptes",
    "Visas calés sur les délais de commande",
    "Questions suivies jusqu'à la réponse",
    "Métré des plans contre la DPGF",
    "Décennales contrôlées contre le lot",
    "Ordres de service : montant et délai",
    "Revérification à chaque indice",
    "Une question en un clic",
    "Checklists de l'agence",
    "Export Excel par lot",
    "Fonds de plan BET croisés",
    "Complétude du DOE à la réception",
    "Comptes rendus de chantier rédigés",
    "Réserves suivies jusqu'à la fin de la GPA",
    "Honoraires par phase contre temps passé",
    "Dossier de défense décennale",
    "Registre daté des visas",
    "Historique des indices sans limite",
    "Contrôles définis avec vous",
    "Import depuis vos plateformes de projet",
    "Règles de votre charte intégrées",
  ],

  /* DALIRO — ouvrier B6 (lecture des photos et vocaux avec A1 et A2) */
  daliro: [
    "Lecture des photos et vocaux",
    "Signature sur place",
    "Relance des avenants non signés",
    "Ordre des lots recalé",
    "Alerte météo",
    "Liste cadencée depuis le devis",
    "Livraisons calées sur la pose",
    "Suivi des retours",
    "Bons de livraison rapprochés",
    "Avancement lu dans les photos",
  ],

  /* VARELO — ouvrier B1 (réserves et lecture automatique des exports avec A1) */
  varelo: [
    "Le groupe sur une page",
    "Les réserves à émettre",
    "Les reportings dus",
  ],

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
