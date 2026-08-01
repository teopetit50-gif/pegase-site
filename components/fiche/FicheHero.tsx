"use client";

/* Hero de fiche « texte sur photo » — le moment Qonto « Get paid » (22/07).
   Bannière plein écran, photo du moteur en fond, texte blanc posé dessus.

   LISIBILITÉ — le point dur. Sans voile, les photos les plus claires
   (reach, revive, hired) ne donnent que 1,2:1 entre le blanc et le 95ᵉ
   centile des pixels de la zone de texte : illisible. Mais un voile
   UNIFORME écrase pour rien les photos déjà sombres. Sa densité est donc
   mesurée photo par photo (fiche.photoVoile) : 0,08 suffit à ANSWR quand
   REVIVE exige 0,80. S'y ajoute un léger dégradé de confort côté texte.
   Les petits éléments (tag, puces d'outils) portent en plus leur propre
   fond sombre : leur contraste ne dépend alors plus du tout de la photo.

   PARALLAXE : douce, sur transform uniquement (jamais la géométrie), coupée
   net en prefers-reduced-motion. Sans photo → hero sombre, aucune casse.

   AUCUN [data-reveal] ici, volontairement : le contenu du hero est ce que
   l'utilisateur voit en premier. Le gater sur une entrée au scroll le laisse
   invisible si l'animation ne part pas (onglet en arrière-plan, rAF
   throttlé) — constaté en test, hero vide sur mobile. Il est donc rendu
   opaque d'emblée ; seule la parallaxe est animée, et son échec ne coûte
   qu'une image immobile. */

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SystemLogo } from "@/components/logos";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function FicheHero({
  system,
  titreSuite,
  tag,
  accent,
  dot,
  pitch,
  outils,
  photo,
  alt,
  voile,
  retour = true,
  cta,
  bande = false,
}: {
  system: string;
  titreSuite: string;
  tag: string;
  accent: string;
  dot: string;
  pitch: string;
  outils: string[];
  photo?: string;
  alt: string;
  /* densité du voile, mesurée par photo (fiche.photoVoile) */
  voile?: number;
  /* lien « ← Toutes les offres » — masqué quand la bannière est déjà
     dans une page qui liste les moteurs (25/07 : /solutions supprimée) */
  retour?: boolean;
  cta?: { href: string; label: string };
  /* bande = version courte, posée dans une page qui a déjà son hero */
  bande?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!photo) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const img = ref.current?.querySelector("[data-parallaxe]");
      if (!img) return;
      /* l'image est surdimensionnée de 12 % (scale-110 + -inset-y) : elle
         glisse de 8 % de sa hauteur sans jamais découvrir de bord */
      gsap.to(img, {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    },
    { scope: ref, dependencies: [photo] }
  );

  return (
    <div
      ref={ref}
      className={`relative flex flex-col justify-end overflow-hidden ${
        bande
          ? "min-h-[48vh] sm:min-h-[52vh]"
          : "min-h-[62vh] sm:min-h-[70vh]"
      }`}
    >
      {/* ——— photo ——— */}
      {photo && (
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div data-parallaxe className="absolute -inset-y-[6%] inset-x-0">
            <Image
              src={photo}
              alt={alt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </div>
      )}

      {/* ——— voiles de lisibilité (voir en-tête) ——— */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${voile ?? 0.75})` }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent"
      />
      {/* Fondu HAUT : la photo commence juste sous le header noir, et la
          couture se voyait comme une ligne nette (23/07, Teo). Le dégradé
          part du noir plein pour rejoindre la photo sans bord visible. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black via-black/70 to-transparent"
      />
      {/* raccord vers la section claire qui suit */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-black/70"
      />

      {/* ——— contenu ——— */}
      <div
        className={`relative px-6 sm:px-10 ${
          bande ? "pb-12 pt-16 sm:pb-14 sm:pt-20" : "pb-14 pt-24 sm:pb-20 sm:pt-32"
        }`}
      >
        {retour && (
          <div>
            <Link
              href="/offres"
              className="font-mono text-[12px] uppercase tracking-[0.18em] text-white/70 transition hover:text-white"
            >
              ← Toutes les offres
            </Link>
          </div>
        )}

        <div className={`${retour ? "mt-8" : ""} ${accent}`}>
          <SystemLogo system={system} />
        </div>


        <h1
          className="mt-5 max-w-3xl text-[32px] font-bold leading-[1.06] tracking-[-0.03em] text-white sm:text-[60px]"
        >
          <span className="metal-text">{system}</span>
          {titreSuite}
        </h1>

        <p
          className="mt-5 max-w-2xl text-[19px] font-medium leading-[1.35] tracking-[-0.01em] text-white sm:text-[26px]"
        >
          {pitch}
        </p>

        <div className="mt-7 flex flex-wrap gap-2">
          {outils.map((o) => (
            <span
              key={o}
              className="rounded-full bg-black/55 px-3 py-1.5 text-[13px] text-white/85 backdrop-blur-sm"
            >
              {o}
            </span>
          ))}
        </div>

        {cta && (
          <div className="mt-8">
            <Link
              href={cta.href}
              className="inline-block rounded-[var(--radius-btn)] bg-white px-7 py-3.5 text-[16px] font-semibold text-black transition hover:bg-neutral-200 active:scale-[0.97]"
            >
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
