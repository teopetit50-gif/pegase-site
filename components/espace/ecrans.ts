/* Les trois écrans de l'espace client — partagé par la coquille (serveur)
   et la navigation (client) ; ce fichier n'importe rien. */

export type EcranEspace = "validations" | "filed" | "point" | "tavaro";

export const ECRANS: { cle: EcranEspace; href: string; libelle: string; court: string }[] = [
  { cle: "validations", href: "/espace/validations", libelle: "À valider", court: "Validations" },
  { cle: "filed", href: "/espace/filed", libelle: "Documents reçus", court: "FILED" },
  { cle: "point", href: "/espace/point", libelle: "Point du matin", court: "Point" },
  /* 06/10/2026, session B2 — l'écran du loueur (TAVARO) ; ligne reportée sur main par le coordinateur à la fusion */
  { cle: "tavaro", href: "/espace/tavaro", libelle: "Location", court: "TAVARO" },
];
