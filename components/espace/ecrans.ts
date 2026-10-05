/* Les écrans de l'espace client — partagé par la coquille (serveur)
   et la navigation (client) ; ce fichier n'importe rien. */

export type EcranEspace = "validations" | "filed" | "lorani" | "tiroma" | "point";

export const ECRANS: { cle: EcranEspace; href: string; libelle: string; court: string }[] = [
  { cle: "validations", href: "/espace/validations", libelle: "À valider", court: "Validations" },
  { cle: "filed", href: "/espace/filed", libelle: "Documents reçus", court: "FILED" },
  { cle: "lorani", href: "/espace/lorani", libelle: "Permis", court: "Permis" },
  { cle: "tiroma", href: "/espace/tiroma", libelle: "Cabinet dentaire", court: "TIROMA" },
  { cle: "point", href: "/espace/point", libelle: "Point du matin", court: "Point" },
];
