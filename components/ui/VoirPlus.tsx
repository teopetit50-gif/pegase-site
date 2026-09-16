"use client";

import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   Le bouton « voir la suite » des sections repliées sur téléphone
   (16/09/2026)

   Demande de l'associé : « rends les boutons de lire la suite plus propres
   et design, va récupérer des exemples sur 21st ou ailleurs ».

   Relevé sur le catalogue 21st.dev (Show More, Expandable Content Card,
   Left Chevron Accordion) : le motif est partout le même, et c'est lui
   qu'on reprend — une PILULE, un CHEVRON qui pivote de 180° à l'ouverture,
   et un fondu au-dessus quand le contenu est coupé. Rien d'autre n'est
   commun à ces exemples ; leurs couleurs et leurs ombres, si.

   CE QU'ON NE REPREND PAS : l'aplat de couleur et l'ombre portée. Le site
   n'a aucun bouton plein en dehors de ses appels à l'action, et un bouton
   gris foncé au milieu d'une liste se lirait comme l'action principale de
   la section — ce qu'il n'est pas. Un filet suffit à dire « on peut
   appuyer », et la pilule le distingue d'un lien.

   Le chevron pivote, il ne change pas de dessin : deux glyphes différents
   pour un même bouton font clignoter la ligne de base au moment du clic.
   `motion-reduce` coupe la rotation, pas l'état — un utilisateur qui
   refuse le mouvement doit quand même voir le sens du chevron.
   ══════════════════════════════════════════════════════════════════════ */

export function VoirPlus({
  ouvert,
  onBascule,
  libelle,
  libelleOuvert = "Réduire",
  pleineLargeur = false,
  className,
}: {
  ouvert: boolean;
  onBascule: () => void;
  libelle: string;
  libelleOuvert?: string;
  /** Sous une rangée de cartes : la pilule prend toute la largeur pour
      qu'on la trouve au pouce sans viser. */
  pleineLargeur?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={ouvert}
      onClick={onBascule}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/[0.12] bg-white/80 px-4",
        "text-[13px] font-medium tracking-[-0.01em] text-[#3d3d3d]",
        "transition-[border-color,color,transform] duration-200 motion-reduce:transition-none",
        "hover:border-black/25 hover:text-[#050505] active:scale-[0.985]",
        pleineLargeur && "w-full",
        className,
      )}
    >
      {ouvert ? libelleOuvert : libelle}
      <svg
        aria-hidden
        width="12"
        height="12"
        viewBox="0 0 12 12"
        className={cn(
          "transition-transform duration-200 motion-reduce:transition-none",
          ouvert && "rotate-180",
        )}
      >
        <path
          d="M2.6 4.4 6 7.8l3.4-3.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default VoirPlus;
