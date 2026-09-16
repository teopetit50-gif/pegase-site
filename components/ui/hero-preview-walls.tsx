"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

/* ══════════════════════════════════════════════════════════════════════
   CardSlide / PileSurFond — repris de la fiche 21st.dev
   « hero-preview-walls », le 16/09/2026 à la demande de Teo.

   Ce que la fiche apporte et qu'on garde entier : une PILE de cartes
   empilées en perspective, qui tourne toute seule — la dernière repasse
   devant toutes les trois secondes — avec décalage et échelle dégressifs,
   le tout ancré au bas d'une grande image de fond.

   Ce qu'on ne garde pas : son entête (pastille, titre, chapô, deux
   boutons). La section où elle s'installe a déjà le sien, celui de la
   page, et le doublon aurait fait deux titres l'un sur l'autre.

   CINQ REPRISES SUR LE CODE DE LA FICHE, toutes nécessaires ici :

   1. `let interval: any` était déclaré AU MODULE. Deux piles sur la même
      page se seraient écrasé leur minuteur, et la dernière démontée aurait
      arrêté celui de l'autre. Il passe en `useRef`, une par instance.
   2. `any` est refusé par le typage du dépôt ; le ref est typé.
   3. `<img>` devient `next/image` : la règle du projet l'impose, et ça
      donne les tailles servies au lieu du fichier plein.
   4. Les classes de thème Tailwind (`dark:bg-neutral-900`,
      `text-emerald-600`, `border-neutral-200`) sont retirées : sur ce
      site, un utilitaire de thème shadcn ne peint RIEN, en silence
      ([[theme-scope-bat-les-utilitaires]]). Le composant porte des
      classes `hp-*` nues, habillées par le CSS de la page — c'est ce qui
      lui donne aussi sa police.
   5. `prefers-reduced-motion` : la fiche fait tourner la pile sans jamais
      le demander. Ici la rotation s'arrête et les cartes gardent leur
      empilement, immobile.
   ══════════════════════════════════════════════════════════════════════ */

export type Carte = {
  id: number | string;
  /** l'intitulé en tête de carte */
  nom: string;
  /** la ligne du bas, détachée par un filet */
  mention: string;
  /** le corps de la carte */
  contenu: ReactNode;
  image: string;
  imageAlt?: string;
};

const mqReduit = () =>
  typeof window !== "undefined" && "matchMedia" in window
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

function useMouvementReduit() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = mqReduit();
      mq?.addEventListener?.("change", onChange);
      return () => mq?.removeEventListener?.("change", onChange);
    },
    () => mqReduit()?.matches ?? false,
    () => false,
  );
}

export function CardSlide({
  items,
  offset = 22,
  scaleFactor = 0.06,
  intervalDuration = 3000,
}: {
  items: Carte[];
  offset?: number;
  scaleFactor?: number;
  intervalDuration?: number;
}) {
  const [cards, setCards] = useState<Carte[]>(items);
  const [decalage, setDecalage] = useState(offset);
  const [echelle, setEchelle] = useState(scaleFactor);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduit = useMouvementReduit();

  /* Les paliers de la fiche, gardés tels quels : la pile se resserre sur
     les petits écrans pour que la carte du dessous reste visible. */
  useEffect(() => {
    const surMesure = () => {
      if (window.innerWidth < 640) {
        setDecalage(10);
        setEchelle(0.04);
      } else if (window.innerWidth < 1024) {
        setDecalage(14);
        setEchelle(0.05);
      } else {
        setDecalage(offset);
        setEchelle(scaleFactor);
      }
    };
    surMesure();
    window.addEventListener("resize", surMesure);
    return () => window.removeEventListener("resize", surMesure);
  }, [offset, scaleFactor]);

  useEffect(() => {
    if (reduit) return;
    minuteur.current = setInterval(() => {
      setCards((prev) => {
        const arr = [...prev];
        arr.unshift(arr.pop()!);
        return arr;
      });
    }, intervalDuration);
    return () => {
      if (minuteur.current) clearInterval(minuteur.current);
    };
  }, [intervalDuration, reduit]);

  return (
    <div
      className="hp-pile"
      style={{ ["--hp-marches" as string]: `${cards.length * decalage}px` }}
    >
      {cards.map((card, index) => (
        <motion.article
          key={card.id}
          className="hp-carte"
          style={{ transformOrigin: "top center" }}
          animate={{
            top: index * -decalage,
            scale: 1 - index * echelle,
            zIndex: cards.length - index,
          }}
          transition={reduit ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 18 }}
        >
          <div className="hp-carte__haut">
            <p className="hp-carte__nom">{card.nom}</p>
            <div className="hp-carte__corps">{card.contenu}</div>
            <div className="hp-carte__vignette">
              <Image
                src={card.image}
                alt={card.imageAlt ?? ""}
                width={640}
                height={402}
                sizes="(max-width: 640px) 90vw, 420px"
              />
            </div>
          </div>
          <p className="hp-carte__mention">{card.mention}</p>
        </motion.article>
      ))}
    </div>
  );
}

/** La composition de la fiche : une grande image encadrée, et la pile
 *  ancrée en bas, à cheval sur son bord. */
export function PileSurFond({
  fond,
  fondAlt = "",
  cartes,
}: {
  fond: string;
  fondAlt?: string;
  cartes: Carte[];
}) {
  return (
    <div className="hp-scene">
      <div className="hp-fond">
        <Image src={fond} alt={fondAlt} width={1600} height={900} sizes="100vw" />
      </div>
      <div className="hp-ancre">
        <CardSlide items={cartes} />
      </div>
    </div>
  );
}
