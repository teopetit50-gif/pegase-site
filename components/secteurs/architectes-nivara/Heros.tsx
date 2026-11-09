"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Heros.tsx (09/11/2026)
   Le premier écran de la référence, classe pour classe : section
   `h-[120svh] min-h-[760px] bg-paper`, cadre qui grandit depuis le
   centre (frame-grow 2,1 s) pendant que la photo se pose (frame-settle),
   voile `scrim`, puis le titre sur deux lignes qui montent (hero-name,
   1,85 s et 1,95 s) et le chapô qui se fond (hero-fade, 2,1 s). Au
   défilement, le cadre suit à 45 % (relevé : 270 px pour 600 px).
   Photo : la référence montre un angle de façade verre et bronze ; ses
   photos ne sont pas réutilisables, celle-ci est la façade de logements
   d'Unsplash déjà servie par la page actuelle (CREDITS.txt).
   Les garanties du héros actuel n'ont pas de brique chez Nivara : elles
   suivent le chapô, en `text-small`, dans sa colonne.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { HERO } from "./textes";
import { useParallaxe } from "./parallaxe";

export default function Heros() {
  const cadre = useParallaxe<HTMLDivElement>((el, _p, scrollY) => {
    el.style.transform = `translateY(${Math.round(scrollY * 0.45)}px)`;
  });
  return (
    <section aria-labelledby="hero-title" className="relative h-[120svh] min-h-[760px] bg-paper">
      <div className="absolute inset-0 overflow-hidden">
        {/* une fois le cadre ouvert, le fond passe à l'encre : l'entête
            d'Omega sonde la couleur sous elle et passe en verre sombre
            au-dessus de la photo, comme l'entête blanche de la référence */}
        <div
          className="absolute inset-0 animate-frame-grow bg-paper"
          onAnimationEnd={(e) => {
            if (e.animationName === "frame-grow") e.currentTarget.dataset.ouvert = "";
          }}
        >
          <div ref={cadre} className="absolute inset-0">
            <Image
              alt="Façade d'un immeuble de logements, fenêtres et balcons en trame régulière"
              src="/secteurs-architectes/photos/logement.jpg"
              fill
              priority
              sizes="100vw"
              className="animate-frame-settle object-cover object-[50%_50%]"
            />
          </div>
          <div className="absolute inset-0 scrim" />
        </div>
      </div>
      <div className="relative mx-auto flex h-svh min-h-[640px] w-full max-w-[1600px] flex-col justify-end gap-10 px-4 pb-8 text-paper min-[810px]:px-8 min-[810px]:pb-12 min-[1200px]:flex-row min-[1200px]:items-end min-[1200px]:justify-between">
        <h1 id="hero-title" className="font-headline text-hero leading-[1]">
          {HERO.lignes.map((ligne, i) => (
            <span key={ligne} className="-mb-[0.14em] block pb-[0.14em] [clip-path:inset(-50%_-10%_0_-10%)]">
              <span className="block animate-hero-name" style={{ "--name-delay": `${1.85 + 0.1 * i}s` } as React.CSSProperties}>
                {ligne}
              </span>
            </span>
          ))}
        </h1>
        <div
          className="max-w-[24ch] animate-hero-fade [--fade-delay:2.1s] min-[1200px]:mb-[1.2vw] min-[1200px]:max-w-[26ch]"
        >
          <p className="text-pretty text-lead leading-[1.3] tracking-[-0.02em]">{HERO.texte}</p>
          <p className="mt-5 text-small text-paper/70">{HERO.garanties.join(" · ")}</p>
        </div>
      </div>
    </section>
  );
}
