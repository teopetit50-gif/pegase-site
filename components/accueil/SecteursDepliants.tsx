"use client";
/* ══════════════════════════════════════════════════════════════════════
   LES SECTEURS DE L'ACCUEIL — 25/09/2026 (Teo : « un composant qui présente
   avec photo les secteurs et leurs problèmes qu'on résout »).

   Repris de `expanding-cards` (@vaib215, 21st.dev, registre
   /r/vaib215/expanding-cards) : une rangée de photos en noir et blanc, le
   nom du métier écrit à la verticale ; la carte survolée, touchée ou
   atteinte au clavier s'ouvre en couleur et dit le problème, puis ce que
   le logiciel du métier en fait. En colonne sous 768 px.

   Écarts à l'original, tous voulus :
   · la grille ne dépend plus d'un `isDesktop` calculé en JS au montage
     (la page s'affichait d'abord en rangées puis sautait en colonnes) : les
     pistes passent par `--pistes`, lues en rangées puis en colonnes dès md ;
   · coins à 6 px (`rounded-md`), l'arrondi des cartes de l'accueil — et le
     filet encre diluée de TuilesCatalogue, pas `border` nu (currentColor) ;
   · l'icône lucide devient le signe du logiciel (masque alpha, en blanc) ;
   · un vrai lien vers /secteurs/<slug> (l'original déclarait `linkHref`
     sans s'en servir). Il couvre la carte ouverte ; fermée, il ne capte
     pas le pointeur, donc au doigt le premier toucher ouvre, le second
     mène à la page. C'est lui qui prend le focus clavier : la carte n'est
     plus un <li tabIndex> qui annonçait un titre sans lien ;
   · l'étiquette verticale passe par `writing-mode` (la rotation à 90° de
     l'original dépendait de la hauteur du texte caché sous elle), et elle
     reste lisible au téléphone, à l'horizontale, dans les rangées fermées ;
   · le texte ouvert a une largeur fixe : il ne se recompose pas pendant
     que la carte s'élargit.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";

export type CarteSecteur = {
  slug: string;
  metier: string;
  saas: string;
  probleme: string;
  reponse: string;
  photo: string;
  /* `object-position` de la photo, quand le centre coupe mal */
  cadrage?: string;
};

export function SecteursDepliants({ cartes, depart = 0 }: { cartes: CarteSecteur[]; depart?: number }) {
  const [actif, setActif] = useState(depart);
  const pistes = cartes.map((_, i) => (i === actif ? "5fr" : "1fr")).join(" ");

  return (
    <ul
      style={{ "--pistes": pistes } as CSSProperties}
      className="mx-auto grid h-[660px] max-w-[1200px] grid-cols-1 grid-rows-[var(--pistes)] gap-2 transition-[grid-template-columns,grid-template-rows] duration-500 ease-out motion-reduce:transition-none md:h-[520px] md:grid-cols-[var(--pistes)] md:grid-rows-1"
    >
      {cartes.map((c, i) => (
        <li
          key={c.slug}
          data-active={i === actif}
          onMouseEnter={() => setActif(i)}
          onClick={() => setActif(i)}
          onFocus={() => setActif(i)}
          className="group relative min-h-0 min-w-0 cursor-pointer overflow-hidden rounded-md border border-[rgba(24,24,27,0.12)] bg-[#18181b] md:min-w-[72px]"
        >
          <Image
            src={c.photo}
            alt=""
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            style={c.cadrage ? { objectPosition: c.cadrage } : undefined}
            className="scale-110 object-cover grayscale transition-[filter,transform] duration-500 ease-out group-data-[active=true]:scale-100 group-data-[active=true]:grayscale-0 motion-reduce:transition-none"
          />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/10" />
          {/* Fermée, la carte s'assombrit d'un voile : l'étiquette reste lisible
              sur une photo claire (la blouse du praticien, un ciel blanc). */}
          <div aria-hidden className="absolute inset-0 bg-black/30 transition-opacity duration-300 group-data-[active=true]:opacity-0" />

          {/* Carte fermée : le métier, à la verticale au bureau. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.18em] text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)] transition-opacity duration-300 group-data-[active=true]:opacity-0 md:left-1/2 md:top-5 md:-translate-x-1/2 md:translate-y-0 md:[writing-mode:vertical-rl]"
          >
            {c.metier}
          </span>

          {/* Carte ouverte. */}
          <article className="absolute inset-x-0 bottom-0 flex w-[min(460px,calc(100vw-48px))] flex-col p-5 md:p-7">
            <p className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/75 opacity-0 transition-opacity delay-75 duration-300 group-data-[active=true]:opacity-100">
              <span
                aria-hidden
                className="size-[18px] shrink-0 bg-white"
                style={{
                  maskImage: `url(/logos/${c.saas.toLowerCase()}-mark.png)`,
                  WebkitMaskImage: `url(/logos/${c.saas.toLowerCase()}-mark.png)`,
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                }}
              />
              {c.saas} · {c.metier}
            </p>
            <h3 className="mt-3 max-w-[26ch] text-[19px] font-medium leading-[1.3] tracking-[-0.01em] text-white opacity-0 transition-opacity delay-150 duration-300 group-data-[active=true]:opacity-100 md:text-[22px]">
              {c.probleme}
            </h3>
            <p className="mt-2 max-w-[38ch] text-[14px] leading-[22px] text-white/80 opacity-0 transition-opacity delay-200 duration-300 group-data-[active=true]:opacity-100 sm:text-[15px] sm:leading-[24px]">
              {c.reponse}
            </p>
            <span
              aria-hidden
              className="mt-4 inline-flex items-center gap-1.5 self-start text-[14px] font-semibold text-white opacity-0 transition-opacity delay-200 duration-300 group-data-[active=true]:opacity-100"
            >
              Voir {c.saas}
              <span className="transition-transform duration-300 group-hover:translate-x-[3px]">→</span>
            </span>
          </article>

          {/* Le lien couvre toute la carte ouverte. */}
          <Link
            href={`/secteurs/${c.slug}`}
            aria-label={`${c.saas} (${c.metier}) : ${c.probleme}`}
            className="absolute inset-0 z-10 rounded-md focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white group-data-[active=false]:pointer-events-none"
          />
        </li>
      ))}
    </ul>
  );
}
