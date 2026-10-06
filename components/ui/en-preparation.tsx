/* ══════════════════════════════════════════════════════════════════════
   <EnPreparation> — la mention discrète d'une promesse pas encore livrée
   (06/10/2026, C5, omega/AUDIT-PROMESSES.md § 3, point 13)

   Règle de Teo : « livrer tout ce qu'on promet, pas une chose de moins ».
   Aucune ligne n'est retirée du site ; celle dont le code n'existe pas
   encore porte cette pastille, que l'on retire quand l'ouvrier livre.
   Le relevé ligne par ligne, avec l'ouvrier qui la rendra vraie, est dans
   omega/NOTES-C5.md.

   Style en ligne, pas en utilitaires : la pastille se pose sur des pages
   à peau scopée (.offres, .vd, capacites.css…) où une règle de page bat un
   utilitaire. Elle hérite de la couleur du texte (`currentColor`), donc
   elle se lit sur fond clair comme sur fond sombre sans variante.
   Composant serveur : utilisable partout, y compris dans un client.

   `libelle="Sur demande"` : la variante des intégrations (lib/integrations.ts)
   qui ne sont raccordées qu'à la demande d'un client ; point gris, pas ambre.
   ══════════════════════════════════════════════════════════════════════ */

/* 06/10/2026, 19 h 20 Z — DÉCISION DE TEO : « sur omegaai.fr, aucune pastille
   ne doit dire que c'est en préparation ; le site doit rester comme il
   était ». Les deux composants ne rendent plus rien, partout. Les appels
   restent en place (aucune page n'est retouchée) ; lib/en-preparation.ts
   ne sert plus qu'au suivi interne. */

import type { CSSProperties } from "react";

import type { ModulePromesses } from "@/lib/en-preparation";

export function EnPreparation(props: { libelle?: "En préparation" | "Sur demande"; style?: CSSProperties }): null {
  void props;
  return null;
}

export function SiEnPreparation(props: { pour: ModulePromesses; t: string; style?: CSSProperties }): null {
  void props;
  return null;
}
