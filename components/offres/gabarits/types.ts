/* Contrat commun aux gabarits de fiche moteur — 25/07/2026.

   Depuis que Teo demande UN design par moteur (PAYD sur le gabarit « home »,
   ANSWR / OFFLOAD / REVIVE sur le gabarit « intégration », les suivants à
   venir), la route app/offres/[system]/page.tsx ne fait plus que résoudre
   les données et aiguiller. Tous les gabarits reçoivent exactement ces
   props : un nouveau gabarit se pose donc sans toucher ni à la route ni aux
   données. */

import type { Famille, Moteur } from "@/lib/content";
import type { Fiche } from "@/lib/fiches";

export type MoteurAvecFamille = Moteur & { famille: Famille };

export type GabaritProps = {
  /* le moteur affiché, avec sa famille */
  m: MoteurAvecFamille;
  /* sa fiche détaillée */
  fiche: Fiche;
  /* « relance devis & factures » — le titre amputé du nom du moteur */
  role: string;
  /* fiche.fonctionnement normalisé en tableau (il peut être une chaîne) */
  paragraphes: string[];
  /* accent de la famille, lisible sur fond clair (AA) */
  accent: string;
  /* le même accent remonté pour tenir sur un fond noir (gabarit sombre) */
  accentSombre: string;
  /* les autres paquets, prêts à afficher */
  autres: { system: string; role: string; pitch: string; href: string }[];
};

/* Le catalogue s'écrit en lettres partout ailleurs sur le site (« Quatre
   choses en moins », « Douze verrous »), donc le compte du bandeau « les
   autres » aussi. Partagé par les gabarits `home` et `publish`, qui
   annonçaient tous deux « Onze autres moteurs. » en dur — un reste des douze
   moteurs d'avant le regroupement en paquets. Au-delà de six on retombe sur
   le chiffre : aucune page n'y arrive, et allonger la table serait du zèle. */
export const NOMBRES: Record<number, string> = {
  1: "Un",
  2: "Deux",
  3: "Trois",
  4: "Quatre",
  5: "Cinq",
  6: "Six",
};

/* Accents de famille — repris des valeurs déjà vérifiées AA sur clair par
   l'ancienne fiche (supprimée le 25/07). Ils teintent le nom du moteur et
   les icônes du gabarit « intégration », comme la référence teinte à la
   couleur de la marque intégrée (Facebook rgb(45,103,237), LinkedIn
   rgb(35,87,184)). */
export const ACCENT_FAMILLE: Record<string, string> = {
  installes: "#b45309",
  compris: "#0369a1",
};

/* Sur le fond #09090b du gabarit sombre, les accents ci-dessus tombent sous
   3:1 — illisibles. Voici leurs équivalents remontés, tous au-dessus de 8:1
   sur ce fond, dans la même famille chromatique. La référence fait
   exactement ça : son bleu de marque s'éclaircit quand la page passe en
   sombre. */
export const ACCENT_FAMILLE_SOMBRE: Record<string, string> = {
  installes: "#f59e0b",
  compris: "#38bdf8",
};
