"use client";
/* ══════════════════════════════════════════════════════════════════════
   Héros — « Des fauteuils pleins. / Chaque créneau sauvé. / Sans rien
   changer. » La ligne du milieu change toutes les 3 s, lettres floues qui
   montent (`.dentaire-lettres`, ex-`animate-char-in`). Sous le titre :
   le chapô, deux boutons, six pastilles de ce que Tiroma lit, puis le
   la photo du praticien au fauteuil, deux cartes de Tiroma posées dessus
   (Photos.tsx), puis le bandeau des données qui défile.

   RHABILLAGE DU 24/09 (après-midi, dans la source puis ici) : le fond
   WebGL bleu ciel part, remplacé par la photo et un voile vert d'eau très
   pâle en haut (`from-[#f3f8f7]`). Les boutons et le titre passent au vert
   d'eau.

   CE QUI CHANGE PAR RAPPORT À LA SOURCE
   • L'entête de la source était `fixed` et passait PAR-DESSUS le héros :
     `min-h-screen`, et `pt-28 lg:pt-32` pour la dégager. Celle d'Omega est
     `sticky` : elle occupe 64 px (72 dès `sm`) AU-DESSUS du héros. Le héros
     fait donc 100vh moins l'entête, et son haut perd la même hauteur
     (112 → 48 / 40 px, 128 → 56 px dès `lg`) : le badge, le titre et le
     bandeau tombent au même point de la fenêtre que dans la source.
   • « Réserver une démo » (omegaai.fr/reserver) → « Réserver un audit »,
     lien vers /reserver-un-audit. « Voir la démo » reste une ancre vers
     la démo de la page (#demo), comme dans la source.
   • `dark:` retirés (fond, bordures, textes des pastilles).
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { ArrowRight, CalendarDays, Play } from "lucide-react";
import { useEffect, useState } from "react";
import Apparition from "./Apparition";
import BoutonDegrade from "./BoutonDegrade";
import LienAncre from "./LienAncre";
import { RESERVER } from "./outils";
import { PhotoHeros } from "./Photos";
import { BANDEAU_LU, LIGNES_TOURNANTES, PASTILLES_LUES } from "./textes";

export default function Heros() {
  const [ligne, setLigne] = useState(0);

  useEffect(() => {
    const minuterie = setInterval(() => setLigne((l) => (l + 1) % LIGNES_TOURNANTES.length), 3000);
    return () => clearInterval(minuterie);
  }, []);

  return (
    <section
      data-monde="clair"
      className="relative flex min-h-[calc(100vh-64px)] flex-col overflow-hidden bg-gradient-to-b from-[#f3f8f7] via-white to-white sm:min-h-[calc(100vh-72px)]"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-6 pt-12 text-center sm:pt-10 lg:px-12 lg:pt-14">
        <Apparition delay={50}>
          <div className="mb-4">
            <span className="dentaire-perle inline-flex items-center gap-2 rounded-full py-2 pl-4 pr-5 text-xs font-semibold">
              <CalendarDays size={13} className="shrink-0" />
              Cabinets dentaires · Lecture seule
            </span>
          </div>
        </Apparition>
        <Apparition delay={100} duration="slow">
          <div className="relative mx-auto mb-5 max-w-4xl">
            <h1 className="font-sans text-[clamp(2rem,6vw,4.5rem)] leading-[1] tracking-tight">
              <span className="block">Chaque semaine,</span>
              <span className="block">
                <span className="relative inline-block">
                  <span key={ligne} className="dentaire-lettres inline-block whitespace-nowrap">
                    {LIGNES_TOURNANTES[ligne].replace(/ /g, " ")}
                  </span>
                </span>
              </span>
              <span className="block text-[#3b7a6e]">reste sans suite.</span>
            </h1>
          </div>
        </Apparition>
        <Apparition delay={200}>
          <p className="mx-auto mb-6 max-w-xl text-base leading-normal text-slate-600 lg:text-lg">
            Tiroma lit votre agenda, vos plans de traitement et vos devis signés. Avant le premier patient, votre secrétariat sait quel créneau proposer et à qui, quel plan planifier et quel fauteuil tourne à vide.
          </p>
        </Apparition>
        <div className="relative z-20">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BoutonDegrade asChild className="group w-full min-w-0 gap-2 px-6 py-3 text-sm sm:w-auto">
              <Link href={RESERVER}>
                Réserver un audit
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </BoutonDegrade>
            <LienAncre
              cible="demo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[6px] border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 sm:w-auto"
            >
              <Play size={18} className="text-[#3b7a6e]" />
              Voir la démo
            </LienAncre>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Se branche sur votre logiciel · Aucune double saisie · Sans engagement
          </p>
        </div>
        <Apparition delay={500}>
          <div className="mt-5 flex items-center justify-center gap-3">
            {PASTILLES_LUES.map(({ nom, Icone }) => (
              <span
                key={nom}
                title={nom}
                aria-label={nom}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-[#a0ccc3] hover:text-[#3b7a6e]"
              >
                <Icone className="h-5 w-5" />
              </span>
            ))}
          </div>
        </Apparition>
        <Apparition delay={300} className="mt-12 lg:mt-16">
          <PhotoHeros />
        </Apparition>
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-8 pt-12 lg:px-12 lg:pb-10 lg:pt-16">
        <div
          className="relative w-full overflow-hidden"
          style={{
            WebkitMaskImage: "linear-gradient(to right, transparent, black 30%, black 70%, transparent)",
            maskImage: "linear-gradient(to right, transparent, black 30%, black 70%, transparent)",
          }}
        >
          <div
            className="dentaire-defile-lent flex w-max items-center gap-12 opacity-90 transition-opacity duration-300 hover:opacity-100 lg:gap-16"
            style={{ animationDirection: "reverse" }}
          >
            {[0, 1, 2, 3].map((copie) => (
              <div key={copie} className="flex shrink-0 items-center gap-12 lg:gap-16" aria-hidden={copie > 0}>
                {BANDEAU_LU.map(({ cle, Icone, libelle }) => (
                  <div key={cle} className="flex items-center gap-3">
                    <div className="h-6 w-6 text-[#3b7a6e]">
                      <Icone className="h-full w-full" strokeWidth={1.8} />
                    </div>
                    <span className="whitespace-nowrap text-base font-medium text-slate-900">{libelle}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
