"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedList } from "./ui/animated-list";
import { Etiquette } from "./Bouton";
import { JOURNEE } from "@/lib/produits/accueil";

/* Les demandes arrivent devant le visiteur, une par une, la plus récente en
   tête — la mécanique vient du registre Magic UI (voir
   `components/ui/animated-list.tsx`). Ça remplace une barre de 24 h dessinée
   à la main qui disait la même chose en beaucoup moins bien.

   Deux lignes de texte pour toute la section : la pile porte l'argument. */

type Demande = (typeof JOURNEE.demandes)[number];

function Carte({ heure, canal, texte, issue, dehors, transfert }: Demande) {
  return (
    <figure className="m-0 w-full rounded-2xl bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,.04),0_2px_4px_rgba(0,0,0,.04),0_12px_24px_rgba(0,0,0,.05)] sm:p-5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase text-neutral-900">{heure}</span>
        <span className="text-neutral-300">·</span>
        <span className="font-mono text-[11px] uppercase text-neutral-500">{canal}</span>
        {dehors && (
          <span className="ml-auto rounded-full bg-neutral-900 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
            hors horaires
          </span>
        )}
      </div>
      <p className="mt-3 text-[15px] leading-snug text-neutral-900">« {texte} »</p>
      <figcaption className="mt-3 flex items-center gap-2 text-[13px] text-neutral-500">
        <span
          className={`size-1.5 shrink-0 rounded-full ${transfert ? "bg-neutral-900" : "bg-emerald-500"}`}
        />
        {issue}
      </figcaption>
    </figure>
  );
}

export function Journee() {
  /* La pile ne démarre qu'à l'entrée dans la fenêtre. Sinon elle s'est
     déroulée en haut de page, et le visiteur arrive devant une liste figée :
     l'animation ne sert plus à rien. */
  const cadre = useRef<HTMLDivElement>(null);
  /* ADDITIF, comme l'apparition au défilement du reste du site : la pile
     complète est dans le HTML servi (lisible sans JavaScript, et visible des
     robots) ; l'animation ne fait que la REJOUER quand la section entre dans
     la fenêtre.

     Deux garde-fous : si la section est déjà à l'écran au chargement, on
     n'anime pas — sinon la liste pleine se viderait sous les yeux du
     visiteur ; et le mouvement réduit ne rejoue rien. Les états sont posés
     depuis le rappel de l'observateur et jamais dans le corps de l'effet :
     un setState synchrone y déclenche des rendus en cascade, et le lint de
     React le refuse. */
  const [anime, setAnime] = useState(false);

  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const montage = performance.now();
    const o = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        o.disconnect();
        if (performance.now() - montage < 400) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        setAnime(true);
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);

  return (
    <section data-monde="clair" id="journee" className="scroll-mt-24 bg-white rounded-xl px-3 py-12 max-sm:py-14 lg:py-25">
      <div className="max-w-7xl mx-auto">
        <div className="flex-col flex lg:flex-row justify-between gap-10 sm:gap-14 lg:gap-16 xl:gap-23.5">
          <div className="lg:w-1/2 flex flex-col justify-between gap-10 lg:gap-0">
            <div>
            <Etiquette>{JOURNEE.etiquette}</Etiquette>
            <h2 className="mt-4 text-3xl max-sm:text-[26px] max-sm:leading-[30px] -tracking-[2px] max-sm:-tracking-[1px] sm:text-4xl lg:text-5xl font-medium text-neutral-900 lg:leading-14">
              {JOURNEE.titre}
            </h2>
            <p className="mt-4 text-lg max-sm:text-[15px] max-sm:leading-[1.55] text-neutral-500">
              {JOURNEE.chapo}
            </p>
            </div>
            <p className="font-mono text-[10px] uppercase text-neutral-400 sm:text-[11px]">
              {JOURNEE.mention}
            </p>
          </div>

          <div className="lg:w-1/2">
            {/* Hauteur réservée : sans elle, la pile pousse la page à chaque
                carte qui arrive et le contenu d'en dessous saute. */}
            {/* Hauteur fixe + dégradé en pied : les cartes les plus anciennes
                glissent sous le voile au lieu de pousser la page. C'est la
                composition du registre. */}
            <div
              ref={cadre}
              className="relative flex h-[330px] w-full flex-col overflow-hidden sm:h-[380px]"
            >
              {anime ? (
                <AnimatedList delay={1500}>
                  {JOURNEE.demandes.map((d) => (
                    <Carte key={d.heure} {...d} />
                  ))}
                </AnimatedList>
              ) : (
                <div className="flex flex-col gap-3">
                  {[...JOURNEE.demandes].reverse().map((d) => (
                    <Carte key={d.heure} {...d} />
                  ))}
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
