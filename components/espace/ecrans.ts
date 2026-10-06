/* Les écrans de l'espace client — partagé par la coquille (serveur)
   et la navigation (client) ; ce fichier n'importe rien. */

export type EcranEspace = "validations" | "filed" | "varelo" | "tavaro" | "lorani" | "tiroma" | "tamila" | "daliro" | "point" | "demandes" | "reglages";

export const ECRANS: { cle: EcranEspace; href: string; libelle: string; court: string }[] = [
  { cle: "validations", href: "/espace/validations", libelle: "À valider", court: "Validations" },
  { cle: "filed", href: "/espace/filed", libelle: "Documents reçus", court: "FILED" },
  { cle: "varelo", href: "/espace/varelo", libelle: "Référentiel du groupe", court: "VARELO" },
  { cle: "tavaro", href: "/espace/tavaro", libelle: "Location", court: "TAVARO" },
  { cle: "lorani", href: "/espace/lorani", libelle: "Permis", court: "Permis" },
  { cle: "tiroma", href: "/espace/tiroma", libelle: "Cabinet dentaire", court: "TIROMA" },
  { cle: "tamila", href: "/espace/tamila", libelle: "Dossiers du cabinet", court: "TAMILA" },
  { cle: "daliro", href: "/espace/daliro", libelle: "Chantiers", court: "Daliro" },
  { cle: "point", href: "/espace/point", libelle: "Point du matin", court: "Point" },
  /* A3, 06/10 (accord du coordinateur) : la vue brute de toutes les boîtes, et vos données */
  { cle: "demandes", href: "/espace/demandes", libelle: "Demandes reçues", court: "Demandes" },
  { cle: "reglages", href: "/espace/reglages", libelle: "Réglages", court: "Réglages" },
];
