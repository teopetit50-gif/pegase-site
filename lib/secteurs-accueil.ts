/* ══════════════════════════════════════════════════════════════════════
   Les six secteurs de l'accueil (25/09/2026) — ce que la section « Par
   secteur » ajoute à la table `SECTEURS` : la photo et le problème.

   Le nom, le métier et la réponse (`texte`) viennent de lib/secteurs.ts :
   le menu dit la même chose, mot pour mot. Le problème est repris du héros
   de chaque page métier (Daliro, Tamila, Namolu mot pour mot) ou de sa
   promesse retournée en situation (Lorani, Tavaro, Tiroma). Il décrit
   la situation, jamais un défaut du lecteur.

   Photos : celles des pages métier quand elles en ont
   (public/photos, public/secteurs-<métier>), Unsplash gratuit sinon
   (public/accueil-secteurs/, crédits à côté). Un secteur ajouté à
   SECTEURS sans ligne ici n'apparaît pas sur l'accueil.
   ══════════════════════════════════════════════════════════════════════ */
import type { CarteSecteur } from "@/components/accueil/SecteursDepliants";
import { SECTEURS } from "@/lib/secteurs";

const ACCUEIL: Record<string, { probleme: string; photo: string; cadrage?: string }> = {
  btp: {
    probleme: "Les travaux supplémentaires se perdent entre le chantier et la facture.",
    photo: "/accueil-secteurs/btp.jpg",
  },
  avocats: {
    probleme: "Une pièce reçue la veille peut contredire tout votre dossier.",
    photo: "/photos/avocats-palais-facade.jpg",
  },
  architectes: {
    probleme: "Une incohérence entre deux pièces du dossier se découvre sur le chantier.",
    photo: "/secteurs-architectes/photos/tertiaire.jpg",
  },
  "location-automobile": {
    probleme: "Un dommage constaté au retour se conteste s'il n'a pas sa preuve.",
    photo: "/accueil-secteurs/location-automobile.jpg",
    /* la plaque du véhicule est en haut du cadre : on la laisse hors champ */
    cadrage: "50% 78%",
  },
  dentaire: {
    probleme: "Un créneau annulé la veille se perd, faute de patient prévenu à temps.",
    photo: "/secteurs-dentaire/photos/praticien-au-fauteuil.jpg",
    cadrage: "72% 50%",
  },
  distribution: {
    probleme: "Ce qui n'entre pas dans le conteneur arrive après la rupture.",
    photo: "/secteurs-distribution/heros-port.jpg",
  },
};

export const CARTES_SECTEURS: CarteSecteur[] = SECTEURS.filter((s) => ACCUEIL[s.slug]).map((s) => ({
  slug: s.slug,
  metier: s.metier,
  saas: s.saas,
  reponse: s.texte,
  ...ACCUEIL[s.slug],
}));
