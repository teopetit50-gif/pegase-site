"use client";

import { motion } from "framer-motion";

/* Le trait de liaison animé du composant `integration-card` (21st.dev),
   extrait tel quel : un tracé fixe, et par-dessus un second tracé en
   pointillé long (`strokeDasharray`) dont on anime le décalage — ce qui
   fait courir une lueur le long du chemin.

   11/09 — la lueur qui court le long du tracé passe du crème à l'ENCRE.
   Une lueur claire ne se voit pas sur du papier ; ce qui court sur du
   papier, c'est un trait. Même tracé, même vitesse, même dégradé —
   seule la couleur du milieu change de camp.

   Extrait plutôt que d'intégrer tout `integration-card`, qui traînait
   avec lui @base-ui/react, une Card, un Button et deux logos servis par
   le CDN de 21st.dev : rien de tout ça n'est utile ici, et le CDN est un
   point de panne de plus sur une page qui n'en a aucun. */
export function AnimatedPath({
  d,
  id,
  duree = 4,
  delai = 0,
  couleur = "#171717",
}: {
  d: string;
  id: string;
  duree?: number;
  delai?: number;
  couleur?: string;
}) {
  return (
    <>
      <path d={d} stroke="currentColor" strokeWidth="1" fill="none" className="text-[#171717]/[0.12]" />
      <motion.path
        d={d}
        stroke={`url(#${id})`}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="40 160"
        initial={{ strokeDashoffset: 200 }}
        animate={{ strokeDashoffset: -200 }}
        transition={{ duration: duree, repeat: Infinity, ease: "linear", delay: delai }}
      />
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor={couleur} stopOpacity="0.75" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </>
  );
}
