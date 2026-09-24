"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tavaro — Methode.tsx

   COPIÉ le 24/09/2026 à 14 h 58 de `OMEGA/rentalos-site/src/components/
   methode.tsx`. Le rideau (clip-path lu au défilement) est inchangé.

   MONDE BLANC — c'était LA section noire de la source : rideau #0d0d0f,
   cinq cartes #141416 (« Le retour qui facture », « Vos questions,
   chiffrées », « Quatre indicateurs suivis », « Un pilote en trois
   temps », « L'agence garde la main »), titres #f0f0f2. Teo, le 24/09 :
   « Omega c'est blanc, les SaaS qui sont en noir, change les couleurs et
   mets tout en blanc » — sans demi-mesure : le rideau prend le blanc de la
   page, les cartes un #fafafa fileté, le texte l'encre. Table complète en
   tête de styles/DesignSprints.css ; les couleurs posées en style dans
   apercus/BentoMethode.tsx. Ici : l'étiquette « 03 / Méthode » perd
   `data-on="dark"` (son gris à 42 % de BLANC) et prend celui des autres
   sections.

   CONVERSIONS : `text-lead` → `text-[clamp(18px,1.5vw,20px)]/[1.5]` (la
   feuille de la section l'emporte, comme dans la source) ; `gap-12 px-20
   py-12` (échelle en PIXELS de la source) → `gap-[12px] px-[20px]
   py-[12px]` ; `bg-primary-500` / `hover:bg-primary-700` → `#1E3A8A` /
   `#172A66` ; `font-ui` → `f-syne`.

   REPORT DU 24/09 À 17 h 03 (seconde copie du disque) : la source a donné
   au bouton ses coins de 8 px à 16 h 55 (`rounded-8`, comme les boutons
   du héros) → `rounded-[8px]`.

   LIEN (règle 6) : « Réserver un audit » ouvrait la modale de la source ;
   c'est un <Link> vers /reserver-un-audit, mêmes classes, mêmes icônes.
   ══════════════════════════════════════════════════════════════════════ */
import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import { BentoMethode } from "./apercus/BentoMethode";
import { METHODE } from "./textes";

/** « 03 / Méthode » : le bloc de la référence (DesignSprints, sombre dans la source) et son
 *  rideau. Relevé au style calculé : clip-path inset(0 0 100%) tant que le haut
 *  de la section est sous les deux tiers de la fenêtre, ouvert entièrement quand
 *  il atteint le tiers ; puis, en sortie, le bord haut se referme de 0 à 100 %
 *  entre 256 et 800 px au-dessus de la fenêtre. */
export function Methode() {
  const ref = useRef<HTMLElement>(null);
  const entree = useScroll({ target: ref, offset: ["start 70%", "start 33%"] });
  const sortie = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bas = useTransform(entree.scrollYProgress, [0, 1], [100, 0]);
  const haut = useTransform(sortie.scrollYProgress, [0.32, 1], [0, 100]);
  const clipPath = useMotionTemplate`inset(${haut}% 0px ${bas}%)`;

  return (
    <section id="methode" ref={ref} className="f-onest DesignSprints_section" data-curtain="scroll">
      <motion.div className="DesignSprints_curtain" style={{ clipPath }}>
        <div className="DesignSprints_curtainSheen" aria-hidden="true" />
        <div className="page-container DesignSprints_sectionContainer">
          <div className="DesignSprints_sectionShell" data-entered="true">
            <div className="DesignSprints_intro">
              <div className="DesignSprints_introTitle">
                <h2 className="section-label">{METHODE.etiquette}</h2>
                <p className="f-syne DesignSprints_heading font-medium">{METHODE.titre}</p>
              </div>
            </div>
            <BentoMethode />
            <div className="DesignSprints_introCopy">
              <p className="DesignSprints_introBody text-[clamp(18px,1.5vw,20px)]/[1.5] font-normal">{METHODE.chapo}</p>
              <Link
                href="/reserver-un-audit"
                className="DesignSprints_contactButton inline-flex items-center justify-between gap-[12px] rounded-[8px] bg-[#1E3A8A] px-[20px] py-[12px] f-syne text-white transition-colors hover:bg-[#172A66]"
                data-cta="methode-demo"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M5 2.5h6l3 3V15.5H5v-13Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M7.5 9h3M7.5 11.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                {" "}{METHODE.cta}{" "}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
