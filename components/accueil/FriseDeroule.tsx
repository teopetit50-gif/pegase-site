"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/* ══════════════════════════════════════════════════════════════════════
   La frise du déroulé — rail qui se remplit au défilement (11/09/2026)

   ORIGINE. `timeline` de @manuarora700 (Aceternity UI, MIT) —
   https://21st.dev/@manuarora700/components/timeline, code pris sur le
   registre `21st.dev/r/manuarora700/timeline`. Son idée réelle, et la
   seule qu'on garde : un rail vertical dont la portion parcourue se
   REMPLIT à mesure qu'on descend, pendant que l'intitulé de l'étape reste
   collé en haut de fenêtre. La progression du chantier se lit alors dans
   la page elle-même, au lieu d'être énoncée par quatre numéros posés
   côte à côte.

   POURQUOI ICI. Les quatre étapes tenaient dans une grille plate de
   quatre colonnes coiffées d'un filet. À 1440 elles se lisaient d'un
   coup, donc comme quatre options simultanées — alors que le déroulé est
   justement une SUITE : on ne déploie pas avant d'avoir conçu. Le rail
   remet l'ordre dans la lecture.

   CE QUI EST JETÉ.
   · Son en-tête en dur (« Changelog from my journey ») : la page a déjà
     son `EnTete`.
   · Le rail dégradé violet → bleu (`from-purple-500 via-blue-500`). Sur
     une page quasi monochrome, deux couleurs saturées sur 1 500 px de
     haut auraient été le seul accent de couleur du site. Le rail prend le
     graphite du texte (#18181b) et s'éteint vers le haut.
   · Les variantes `dark:` : cette page n'a pas de monde sombre.
   · `max-w-7xl` et ses `md:px-10` : le contenu vit dans `.o-wrap`.
   · Ses titres en `md:text-5xl font-bold` : la charte a `.o-h5`.

   ÉCART ASSUMÉ. La hauteur. Une frise à rail est nécessairement plus
   haute qu'une grille — c'est le prix du séquencement. Les écarts sont
   donc resserrés par rapport à la source (`md:pt-40` → `md:pt-28`), et
   sous `md` le rail passe à gauche en gouttière plutôt que de doubler la
   hauteur avec un titre par-dessus le texte.

   `prefers-reduced-motion` : le rail est rempli d'emblée et ne suit plus
   le défilement. Rien ne disparaît, la frise se lit entière.
   ══════════════════════════════════════════════════════════════════════ */

export type EtapeFrise = {
  n: string;
  titre: string;
  sousTitre: string;
  texte: string;
};

export default function FriseDeroule({ etapes }: { etapes: EtapeFrise[] }) {
  const rails = useRef<HTMLDivElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const [hauteur, setHauteur] = useState(0);
  const reduit = useReducedMotion();

  /* La hauteur du rail est celle de la pile d'étapes, mesurée après rendu.
     Elle est reprise à chaque redimensionnement : sans ça, le rail garde la
     hauteur qu'il avait à 1440 quand la fenêtre passe à 390, et la barre
     dépasse la dernière étape de plusieurs centaines de pixels. */
  useEffect(() => {
    const mesurer = () => {
      if (rails.current) setHauteur(rails.current.getBoundingClientRect().height);
    };
    mesurer();
    const obs = new ResizeObserver(mesurer);
    if (rails.current) obs.observe(rails.current);
    return () => obs.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: cadre,
    offset: ["start 25%", "end 65%"],
  });
  const remplissage = useTransform(scrollYProgress, [0, 1], [0, hauteur]);
  const opacite = useTransform(scrollYProgress, [0, 0.08], [0, 1]);

  return (
    <div ref={cadre} className="relative mt-14">
      <div ref={rails} className="relative">
        {etapes.map((e) => (
          <div
            key={e.n}
            className="flex justify-start pb-12 pt-8 md:gap-10 md:pb-16 md:pt-16"
          >
            {/* colonne collante : la pastille du rail, et l'intitulé à partir
                de md. Sous md l'intitulé redescend avec le texte pour ne pas
                voler une pleine hauteur d'écran à chaque étape. */}
            <div className="sticky top-28 z-10 flex max-w-xs self-start md:w-full lg:max-w-sm">
              <span
                aria-hidden
                className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white"
              >
                <span className="h-[10px] w-[10px] rounded-full bg-[#18181b]" />
              </span>
              <div className="hidden pl-20 md:block">
                <span
                  className="text-[12px] font-semibold tracking-[0.12em] text-[#a1a1aa]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {e.n}
                </span>
                <h3 className="o-h5 mt-2">{e.titre}</h3>
              </div>
            </div>

            <div className="w-full pl-20 pr-0 md:pl-0 md:pr-4">
              <div className="md:hidden">
                <span
                  className="text-[12px] font-semibold tracking-[0.12em] text-[#a1a1aa]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {e.n}
                </span>
                <h3 className="o-h5 mt-2">{e.titre}</h3>
              </div>
              <p className="mt-3 text-[15px] font-semibold leading-[24px] text-[#18181b] md:mt-0">
                {e.sousTitre}
              </p>
              <p className="o-small mt-2 max-w-[560px] !text-[15px] !leading-[24px]">
                {e.texte}
              </p>
            </div>
          </div>
        ))}

        {/* le rail : un filet continu, masqué en fondu aux deux bouts, et la
            portion parcourue peinte par-dessus. */}
        <div
          aria-hidden
          style={{ height: hauteur }}
          className="absolute left-[19px] top-0 w-[2px] overflow-hidden bg-[#e4e4e7] [mask-image:linear-gradient(to_bottom,transparent_0%,black_8%,black_92%,transparent_100%)]"
        >
          <motion.div
            style={
              reduit
                ? { height: hauteur, opacity: 1 }
                : { height: remplissage, opacity: opacite }
            }
            className="absolute inset-x-0 top-0 w-[2px] rounded-full bg-gradient-to-t from-[#18181b] via-[#18181b] to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
