"use client";
/* Tavaro — DefilementHeros.tsx. COPIÉ le 24/09/2026 à 14 h 58 de
   `OMEGA/rentalos-site/src/components/ui/container-scroll-animation.tsx`.
   Ce qui change : l'import de la miniature (relatif) ; `px-2 md:px-10`
   (échelle en PIXELS de la source) → `px-[2px] md:px-[10px]`. La fenêtre
   collante reste `top-0` : l'entête d'Omega est collant et DANS le flux,
   comme la barre de la source (collante elle aussi, 57 px sur téléphone,
   69 px dès md) ; la scène passe dessous de la même façon.
   Les règles `.container-scroll-animation_*` sont dans styles/, scopées. */
/** Container Scroll Animation — composant 21st.dev @manuarora700/container-scroll-animation
 *  (Aceternity, MIT), récupéré le 23/09/2026 sur le registre 21st.dev.
 *
 *  Adapté au relevé de la référence (mesures au style calculé, 1440 × 900) :
 *  - la référence ne bascule pas la carte en 3D : rotateX supprimé ;
 *  - piste collante de 160vh (170vh dès md) avec une fenêtre `sticky h-svh`,
 *    comme la référence, au lieu du bloc de 60/80rem du composant d'origine ;
 *  - échelle de la carte 1,08 → 1 ; translation 120 → −180 px ;
 *  - le titre monte de 48 px et s'efface aux trois quarts de la course.
 *  Le mécanisme (useScroll + useTransform + Header/Card motion) est celui du composant. */
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";
import { Miniature } from "./Miniature";

export const ContainerScroll = ({
  titleComponent,
  background,
  children,
}: {
  titleComponent: React.ReactNode;
  background?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [120, -180]);
  const titleTranslate = useTransform(scrollYProgress, [0, 0.81], [0, -48]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.76], [1, 0]);

  return (
    <div className="relative h-[160vh] md:h-[170vh]" ref={containerRef} data-logo-scroll-track="true">
      <div className="sticky top-0 h-svh min-h-[36rem] overflow-hidden px-[2px] md:px-[10px]">
        <div className="absolute inset-0 z-0 opacity-[0.64]">{background}</div>
        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col items-center pt-[min(4svh,1.25rem)] md:pt-[min(5svh,1.75rem)]">
          <Header translate={titleTranslate} opacity={titleOpacity} titleComponent={titleComponent} />
          <Card scale={scale} translate={translate}>
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  opacity,
  titleComponent,
}: {
  translate: MotionValue<number>;
  opacity: MotionValue<number>;
  titleComponent: React.ReactNode;
}) => (
  <motion.div style={{ y: translate, opacity }} className="container-scroll-animation_titleLayer">
    {titleComponent}
  </motion.div>
);

export const Card = ({
  scale,
  translate,
  children,
}: {
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => (
  <motion.div style={{ scale, y: translate }} className="container-scroll-animation_cardLayer">
    <div className="container-scroll-animation_mockEntrance">
      <Miniature naturel={1040}>{children}</Miniature>
    </div>
  </motion.div>
);
