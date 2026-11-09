"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Appel.tsx (09/11/2026)
   La clôture plein cadre de la référence (« Have a site or a brief?
   Let's talk. ») : section `mt-32 h-[81svh] min-h-[504px] bg-ink`, photo
   débordante (`-inset-y-[12%]`) qui va de −12 % à +12 % au défilement,
   lien qui couvre tout (`data-cursor`), voile `scrim`, puis en bas le
   titre `font-headline text-title` sur deux lignes et la rangée
   `mt-10 gap-x-8 gap-y-4 text-small` : bouton papier, liens soulignés.
   Textes : l'appel de la page actuelle (titre coupé en deux lignes,
   « Réserver un audit », « Voir les formules » vers les formules).
   Photo : une façade au soleil couchant (Unsplash, public/photos), à la
   place de la maison au crépuscule de la référence.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import Bouton, { Lien } from "./Bouton";
import { APPEL, CONTACT } from "./textes";
import { useParallaxe } from "./parallaxe";

export default function Appel() {
  const photo = useParallaxe<HTMLDivElement>((el, p) => {
    el.style.transform = `translateY(${(-12 + 24 * p).toFixed(2)}%)`;
  });
  return (
    <section
      aria-labelledby="appel-title"
      className="relative mt-32 h-[81svh] min-h-[504px] overflow-hidden bg-ink text-paper min-[810px]:mt-44"
    >
      <div ref={photo} className="absolute inset-x-0 -inset-y-[12%]">
        <Image alt="" src={APPEL.image} fill sizes="100vw" className="object-cover" />
      </div>
      <Link aria-label={APPEL.audit} data-cursor="Contact" className="absolute inset-0 z-[1]" tabIndex={-1} href={CONTACT.audit} />
      <div className="pointer-events-none absolute inset-0 z-[1] scrim" />
      <div className="pointer-events-none relative z-[2] mx-auto flex h-full w-full max-w-[1600px] flex-col justify-end px-4 pb-8 min-[810px]:px-8 min-[810px]:pb-12">
        <GroupeApparition retard={1100}>
          <h2 id="appel-title" className="font-headline text-title">
            {APPEL.lignes.map((l, i) => (
              <span key={l} className="block overflow-hidden pb-[0.06em]">
                <span className="block">
                  <MotsApparition texte={l} depart={i * 350} />
                </span>
              </span>
            ))}
          </h2>
          <Apparition delai={800} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 text-small">
            <Bouton href={CONTACT.audit} variante="paper" className="pointer-events-auto">
              {APPEL.audit}
            </Bouton>
            <Lien href="#formules" className="pointer-events-auto">
              {APPEL.formules}
            </Lien>
          </Apparition>
        </GroupeApparition>
      </div>
    </section>
  );
}
