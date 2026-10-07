/* /bienvenue — les choix proposés (07/10/2026).

   Les métiers sont les six des pages /secteurs de la vitrine (omegaai.fr),
   plus « Autre ». Chaque métier ouvre SES activités (la cascade de la
   référence : choisir « Recruiting » change la ligne du dessous) et pose
   dans l'aperçu de droite les deux listes que son espace mettra en tête
   — l'équivalent de « People / Companies » chez Attio. Les priorités
   ajoutent leurs propres listes sous ces deux-là. */

export type Metier = {
  cle: string;
  libelle: string;
  activites: string[];
  listes: [string, string];
};

export const METIERS: Metier[] = [
  {
    cle: "btp",
    libelle: "BTP & artisans",
    activites: ["Gros œuvre", "Second œuvre", "Rénovation", "Maîtrise d'œuvre"],
    listes: ["Chantiers", "Devis"],
  },
  {
    cle: "dentaire",
    libelle: "Cabinet dentaire",
    activites: ["Praticien seul", "Cabinet de groupe", "Centre dentaire"],
    listes: ["Patients", "Rendez-vous"],
  },
  {
    cle: "avocats",
    libelle: "Avocats",
    activites: ["Contentieux", "Conseil", "Cabinet d'associés"],
    listes: ["Dossiers", "Pièces"],
  },
  {
    cle: "architectes",
    libelle: "Architecture",
    activites: ["Maisons individuelles", "Collectif & tertiaire", "Architecture intérieure"],
    listes: ["Projets", "Permis"],
  },
  {
    cle: "location-automobile",
    libelle: "Location automobile",
    activites: ["Une agence", "Plusieurs agences", "Location et atelier"],
    listes: ["Réservations", "Véhicules"],
  },
  {
    cle: "groupes",
    libelle: "Groupe multi-sites",
    activites: ["2 à 5 entités", "6 entités et plus", "Réseau de franchise"],
    listes: ["Entités", "Équipes"],
  },
  {
    cle: "autre",
    libelle: "Autre",
    activites: ["Commerce", "Services", "Santé", "Restauration"],
    listes: ["Clients", "Demandes"],
  },
];

/* Ce qui prend le plus de temps — chaque priorité ajoute sa liste à
   l'aperçu. Les mots sont ceux du client, jamais les noms des moteurs. */
export const PRIORITES: { cle: string; libelle: string; liste: string }[] = [
  { cle: "demandes", libelle: "Demandes clients", liste: "Demandes" },
  { cle: "impayes", libelle: "Relances d'impayés", liste: "Relances" },
  { cle: "documents", libelle: "Documents & pièces", liste: "Documents" },
  { cle: "avis", libelle: "Avis clients", liste: "Avis" },
];

export const TERRITOIRES = [
  "Guadeloupe",
  "Martinique",
  "Guyane",
  "La Réunion",
  "Mayotte",
  "France métropolitaine",
  "Autre pays",
];

/* Le secteur de la fiche client (clé du cockpit, lib/espace/profil.ts)
   → le métier de la vitrine, pour préremplir. */
export function metierDepuisSecteur(secteur: string | null | undefined): string {
  if (!secteur) return "";
  const s = secteur.toLowerCase();
  if (METIERS.some((m) => m.cle === s)) return s;
  if (s === "garage") return "location-automobile";
  return "";
}
