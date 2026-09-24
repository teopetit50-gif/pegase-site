/* ══════════════════════════════════════════════════════════════════════
   « Tout le cabinet, chaque matin » (#screenshots) — la section Écrans :
   la nappe de points (VagueDePoints), les quatre écrans en éventail
   (Eventail, ou la rangée à défiler sous 640 px), la ligne « Lecture
   seule », puis deux colonnes : l'avant / après et le schéma d'un créneau
   annulé (Schema). Toute la section s'ouvre au défilement
   (ZoomAuDefilement).

   MONDE BLANC. Dans la référence, cette section était NOIRE ; la source
   l'avait déjà passée au clair ; le rhabillage du 24/09 la passe au vert
   d'eau (dégradé #f3f8f7 → blanc → #f3f8f7, halo à 14 %), et l'avant /
   après gagne une scène du quotidien : deux assistantes qui préparent la
   matinée (« 8 h 10, avant le premier patient »). Rien de sombre n'y reste.

   Écarts : le bouton « Voir la démo » de l'avant / après reste une ancre
   vers #demo (lien, plus <button>) ; les <img> doublées en sombre des
   cartes partent (Eventail.tsx).
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { ArrowRight, BookOpen, Clock, Shield } from "lucide-react";
import Apparition from "./Apparition";
import BoutonDegrade from "./BoutonDegrade";
import Eventail, { CarrouselMobile } from "./Eventail";
import LienAncre from "./LienAncre";
import { PHOTOS } from "./Photos";
import Schema from "./Schema";
import { SurtitrePerle } from "./Surtitre";
import VagueDePoints from "./VagueDePoints";
import ZoomAuDefilement from "./ZoomAuDefilement";
import { AVEC_TIROMA, ECRANS, SANS_TIROMA } from "./textes";

function Liste({ items, puce }: { items: string[]; puce: string }) {
  return (
    <ul className="space-y-2 text-sm text-slate-600">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className={`mt-0.5 ${puce}`}>›</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function Ecrans() {
  return (
    <ZoomAuDefilement>
      <section
        id="screenshots"
        data-monde="clair"
        className="relative overflow-hidden bg-gradient-to-b from-[#f3f8f7] via-white to-[#f3f8f7] py-24 lg:py-32"
      >
        <VagueDePoints />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 55% at 50% 15%, rgba(79,149,135,0.14), transparent 65%)" }}
        />
        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-12">
          <Apparition className="mb-8 text-center lg:mb-12">
            <SurtitrePerle>
              <BookOpen size={12} />
              Écrans
            </SurtitrePerle>
            <h2 className="text-4xl font-light tracking-tight text-slate-900 lg:text-6xl">
              Tout le cabinet, chaque matin
            </h2>
          </Apparition>
          <CarrouselMobile ecrans={ECRANS} />
          <div className="relative z-10 -mt-4 hidden sm:block lg:-mt-8">
            <Eventail ecrans={ECRANS} largeurCarte={560} hauteurCarte={350} visibles={3} ouvertureDeg={14} recouvrement={0.66} />
          </div>
          <Apparition delay={300}>
            <div className="relative z-10 mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-slate-500 lg:mt-20">
              <span className="flex items-center gap-2">
                <Shield size={16} className="text-[#4f9587]" />
                Lecture seule
              </span>
              <span className="hidden h-4 w-px bg-slate-300 sm:block" />
              <span>
                Tiroma lit votre logiciel sans jamais y écrire. Accès journalisés, droits par rôle, vos données
                restent les vôtres.
              </span>
            </div>
          </Apparition>
          <div className="mt-24 grid grid-cols-1 items-start gap-10 lg:mt-32 lg:grid-cols-2 lg:gap-16">
            <Apparition>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <SurtitrePerle className="mb-4">Avant / après</SurtitrePerle>
                <h2 className="mb-6 text-2xl text-slate-900 lg:text-3xl">Le matin, avec et sans Tiroma</h2>
                <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-xl">
                  <Image
                    src={`${PHOTOS}/assistantes-du-matin.jpg`}
                    alt="Deux assistantes dentaires préparent la matinée, tablette en main"
                    fill
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="object-cover"
                    style={{ objectPosition: "60% 35%" }}
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                    <Clock size={12} className="text-[#3b7a6e]" />8 h 10, avant le premier patient
                  </span>
                </div>
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/60 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-rose-600">Sans Tiroma</h3>
                  <Liste items={SANS_TIROMA} puce="text-rose-500" />
                </div>
                <div className="mb-6 rounded-xl border border-[#c7e1db] bg-[#f3f8f7]/70 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-[#30635a]">Avec Tiroma</h3>
                  <Liste items={AVEC_TIROMA} puce="text-[#4f9587]" />
                </div>
                <BoutonDegrade asChild className="min-w-0 gap-2 px-6 py-3 text-sm">
                  <LienAncre cible="demo">
                    Voir la démo
                    <ArrowRight size={18} />
                  </LienAncre>
                </BoutonDegrade>
              </div>
            </Apparition>
            <Apparition delay={150}>
              <Schema />
            </Apparition>
          </div>
        </div>
      </section>
    </ZoomAuDefilement>
  );
}
