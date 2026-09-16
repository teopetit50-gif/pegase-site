"use client";

import * as React from "react";
import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════════════════════
   CardSlide — une pile de cartes qui tourne toute seule.
   Repris de 21st.dev (« hero-preview-walls », 16/09/2026) pour la
   section « exemples » de /offres/sur-mesure.

   ── CE QUI A ÉTÉ GARDÉ ───────────────────────────────────────────────
   L'idée et la mécanique : des cartes empilées, décalées et légèrement
   réduites vers le fond, la dernière qui repasse devant à intervalle
   régulier, le tout animé au ressort par framer-motion. Les trois
   paliers de taille (téléphone / tablette / ordinateur) aussi.

   ── CE QUI A ÉTÉ JETÉ ────────────────────────────────────────────────
   • `HeroPreviewWalls`, l'enveloppe : un hero « We build technology that
     moves your vision forward », deux boutons, trois cartes de contenu
     inventé et quatre images sur cdn.21st.dev. Rien de tout ça n'a de
     rapport avec cette page — seule la pile nous intéressait.
   • TOUTES LES VARIANTES `dark:`. En Tailwind v4 `dark:` suit le réglage
     du SYSTÈME, pas une classe : sur un Mac en thème sombre, les cartes
     seraient devenues noires au milieu d'une page blanche. Piège déjà
     payé ailleurs sur ce parc.
   • Les classes de couleur en dur (`bg-white`, `text-neutral-800`,
     `border-neutral-200`) : l'habillage passe par le bloc `.smd` de la
     page, comme pour les autres composants repris.

   ── CE QUI A ÉTÉ CORRIGÉ ─────────────────────────────────────────────
   • `let interval: any` vivait au niveau du MODULE. Deux piles sur une
     même page se seraient partagé la même minuterie, et la première
     démontée aurait arrêté la seconde. Il passe en `useRef`.
   • `prefers-reduced-motion` : la rotation ne démarre pas, les cartes
     restent en place. Rien ne bouge pour qui ne veut pas que ça bouge.
   • La pile s'arrête hors écran et sur onglet caché — une minuterie qui
     tourne dans le vide fait travailler la machine pour rien.
   • Le survol suspend la rotation : on ne peut pas lire une carte qui
     s'échappe au moment où on la regarde.
   ══════════════════════════════════════════════════════════════════════ */

export type CarteEmpilee = {
  id: string;
  /** Le besoin, en une phrase — c'est le titre de la carte. */
  titre: string;
  /** Ce que le système en fait. */
  texte: string;
  /** Le croquis, à la place de l'image de l'original. */
  visuel: React.ReactNode;
  /** La nature du besoin, en pied de carte. */
  nature: string;
};

export function CardSlide({
  items,
  decalage = 22,
  reduction = 0.06,
  intervalle = 3600,
}: {
  items: CarteEmpilee[];
  decalage?: number;
  reduction?: number;
  intervalle?: number;
}) {
  /* L'état est un simple DÉCALAGE, pas une copie de `items`. L'original
     recopiait le tableau de props dans un état et le resynchronisait
     dans un effet — un `setState` en corps d'effet, que le lint du dépôt
     refuse, et qui n'a jamais servi à rien : l'ordre se dérive. */
  const [depart, setDepart] = React.useState(0);
  const conteneur = React.useRef<HTMLDivElement>(null);
  const minuterie = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const survol = React.useRef(false);

  const n = items.length;
  const cartes = React.useMemo(
    () => items.map((_, i) => items[(((i + depart) % n) + n) % n]),
    [items, depart, n]
  );

  React.useEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = true;

    const tourner = () => {
      if (survol.current) return;
      setDepart((d) => d - 1);
    };

    const lancer = () => {
      if (minuterie.current || !visible || document.hidden) return;
      minuterie.current = setInterval(tourner, intervalle);
    };
    const arreter = () => {
      if (!minuterie.current) return;
      clearInterval(minuterie.current);
      minuterie.current = null;
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e?.isIntersecting ?? true;
        if (visible) lancer();
        else arreter();
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    const surVisibilite = () => (document.hidden ? arreter() : lancer());
    document.addEventListener("visibilitychange", surVisibilite);
    lancer();

    return () => {
      arreter();
      io.disconnect();
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [intervalle]);

  return (
    <div
      ref={conteneur}
      className="smd-pile"
      onMouseEnter={() => (survol.current = true)}
      onMouseLeave={() => (survol.current = false)}
      style={
        {
          "--pile-decalage": `${decalage}px`,
          "--pile-nb": cartes.length,
        } as React.CSSProperties
      }
    >
      {cartes.map((carte, rang) => (
        <motion.article
          key={carte.id}
          className="smd-pile__carte"
          style={{ transformOrigin: "top center" }}
          animate={{
            top: rang * -decalage,
            scale: 1 - rang * reduction,
            zIndex: cartes.length - rang,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          <div>
            <h4 className="smd-pile__titre">{carte.titre}</h4>
            <p className="smd-pile__texte">{carte.texte}</p>
            <div className="smd-pile__visuel">{carte.visuel}</div>
          </div>
          <p className="smd-pile__nature">{carte.nature}</p>
        </motion.article>
      ))}
    </div>
  );
}

export default CardSlide;
