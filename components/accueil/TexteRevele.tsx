"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

/* ══════════════════════════════════════════════════════════════════════
   Le texte qui se révèle mot à mot au défilement (11/09/2026)

   ORIGINE. `text-reveal` de @dillionverma (Magic UI, MIT) —
   https://21st.dev/@dillionverma/components/text-reveal, code pris sur
   `21st.dev/r/dillionverma/text-reveal`. Le texte est collé au centre de
   l'écran pendant qu'on descend ; chaque mot passe du gris pâle au noir à
   son tour. On lit à la vitesse de la molette.

   POURQUOI ICI, ET POURQUOI CETTE PHRASE. La page enchaînait douze
   sections toutes bâties pareil — pastille, titre, chapô, contenu. Il lui
   manquait un temps d'arrêt. Les modèles de vitrine mettent à cet endroit
   une citation client en grand format ; la règle maison l'interdit
   (aucune preuve sociale inventée) et propose l'échange exact : la même
   forme typographique, mais le PROBLÈME que le produit règle. C'est
   littéralement ce qui est posé ici.

   La phrase n'est pas écrite pour l'occasion : c'est la citation déjà
   publiée sur /offres, `FAMILLES[0].proof.text` de `lib/content.ts`. Elle
   n'avance aucun chiffre, ne nomme personne et reste vraie sans source —
   elle décrit un mécanisme, pas une performance.

   CE QUI EST JETÉ.
   · `h-[200vh]` : deux hauteurs d'écran pour une phrase, c'était un
     péage. Ramené à 150vh, la phrase finit de se peindre bien avant la
     sortie de section.
   · Ses tailles `text-2xl → xl:text-5xl` et son `font-bold` : la charte a
     `.o-h2`, et un poids 600, pas 700.
   · Les variantes `dark:` : pas de monde sombre sur cette page.
   · Son double `ref={targetRef}` (posé à la fois sur le cadre et sur le
     paragraphe) : c'était un bug de la source — le second écrasait le
     premier, `useScroll` mesurait donc le paragraphe collant, dont la
     position ne bouge pas. La progression n'était juste que par accident
     de mise en page. Le paragraphe n'a plus de `ref`.

   ÉCART ASSUMÉ. Le mot non encore révélé reste lisible (gris à 22 %) au
   lieu du 20 % de la source : sous 20 %, sur fond blanc, le texte tombe
   sous le seuil de contraste et la phrase devient illisible pour qui
   n'atteint jamais le bas de la section.

   `prefers-reduced-motion` : la phrase est peinte entière et la section
   se referme à sa hauteur naturelle — plus de défilement à payer.
   ══════════════════════════════════════════════════════════════════════ */

function Mot({
  enfant,
  progression,
  plage,
}: {
  enfant: string;
  progression: MotionValue<number>;
  plage: [number, number];
}) {
  const opacite = useTransform(progression, plage, [0, 1]);
  return (
    <span className="relative mx-[0.18em]">
      <span aria-hidden className="absolute inset-0 opacity-[0.22]">
        {enfant}
      </span>
      <motion.span style={{ opacity: opacite }}>{enfant}</motion.span>
    </span>
  );
}

export default function TexteRevele({
  texte,
  signature,
}: {
  texte: string;
  signature?: string;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const reduit = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: cadre });
  const mots = texte.split(" ");

  if (reduit) {
    return (
      <div className="mx-auto max-w-[900px] px-6 text-center">
        <p className="o-h2 !leading-[1.35] text-[#09090b]">{texte}</p>
        {signature ? <p className="o-small mt-6">{signature}</p> : null}
      </div>
    );
  }

  return (
    /* 15/09 — 112vh sous `md`. À 390 px la phrase, ramenée à 25 px par
       l'échelle mobile, finit de se peindre dès le premier tiers : les
       150vh laissaient ensuite une demi-hauteur d'écran VIDE sous elle,
       un péage de défilement pour rien. Au-dessus de `md`, rien ne bouge. */
          /* 15/09/2026 — 112 vh pour UNE phrase font 910 px sur un téléphone,
         soit 1 070 px de section avec son écart : le plus cher de la page
         au signe près. La course descend à 85 vh — il en reste assez pour
         que la phrase se peigne mot à mot avant de quitter l'écran, et le
         temps de respiration voulu ici tient toujours. Le palier de bureau
         ne bouge pas. */
    <div ref={cadre} className="relative z-0 h-[85vh] md:h-[150vh]">
      <div className="sticky top-0 mx-auto flex h-screen max-w-[900px] flex-col items-center justify-center px-6">
        <p
          aria-label={texte}
          className="o-h2 flex flex-wrap justify-center !leading-[1.35] text-center text-[#09090b]"
        >
          {mots.map((mot, i) => (
            <Mot
              key={`${mot}-${i}`}
              enfant={mot}
              progression={scrollYProgress}
              plage={[i / mots.length, i / mots.length + 1 / mots.length]}
            />
          ))}
        </p>
        {signature ? (
          <p className="o-small mt-8 max-w-[640px] text-center">{signature}</p>
        ) : null}
      </div>
    </div>
  );
}
