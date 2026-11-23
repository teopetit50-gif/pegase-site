/* ══════════════════════════════════════════════════════════════════════
   Les récits de MetiersOnglets : les six modules métier de l'accueil.

   Le nom du module, le problème et la réponse viennent des cartes de
   secteurs (lib/secteurs-accueil) ; seul l'objet du métier, écrit en
   grand dans l'onglet, est posé ici. Partagé par l'accueil (app/page.tsx)
   et par la page d'essai (app/essai-blocs/page.tsx).
   ══════════════════════════════════════════════════════════════════════ */
import { CARTES_SECTEURS } from "@/lib/secteurs-accueil";
import type { Recit } from "./MetiersOnglets";

const OBJETS: Record<string, string> = {
  btp: "Chantier",
  avocats: "Dossier",
  architectes: "Permis",
  "location-automobile": "Véhicule",
  dentaire: "Patient",
  groupes: "Groupe",
};

export const RECITS_METIERS: Recit[] = CARTES_SECTEURS.filter((carte) => OBJETS[carte.slug]).map((carte) => ({
  id: carte.slug,
  nom: carte.saas,
  logo: `/logos/${carte.saas.toLowerCase()}-lockup.png`,
  chiffre: OBJETS[carte.slug],
  libelle: carte.reponse,
  note: "",
  texte: carte.probleme,
  role: `Module métier · ${carte.metier}`,
  href: `/secteurs/${carte.slug}`,
  lien: `Voir ${carte.saas}`,
}));
