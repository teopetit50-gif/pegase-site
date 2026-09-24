"use client";
/* ══════════════════════════════════════════════════════════════════════
   Eventail — les quatre écrans de Tiroma en carrousel « éventail »
   (`C_mF` de la source, composant de 21st.dev) : la carte active devant,
   soulevée de 18 px et grossie à 1,04 ; ses voisines tournées de ±14°,
   reculées de 140 px et réduites à 0,92. Glisser la carte active, les
   flèches du clavier ou les points changent de carte ; cliquer une
   voisine la fait venir devant. Ressorts 280 / 28, recopiés.

   Sous 640 px, la source remplaçait l'éventail par une rangée qu'on fait
   défiler au doigt (`C_fn`) : c'est `CarrouselMobile`, plus bas.

   Écarts : les réglages que la page ne changeait jamais sont devenus des
   constantes ; `onSelect` de la carte active ne faisait rien (fonction
   vide) : retiré, avec le suivi du glissement qui ne servait qu'à lui ;
   la carte par défaut (`C_mB`, fond noir) n'était jamais
   rendue : retirée. La seconde <img> de chaque carte (version sombre,
   jamais affichée) aussi.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { cn } from "./outils";
import type { Ecran } from "./textes";

const PERSPECTIVE = 1100;
const PROFONDEUR = 140;
const INCLINAISON_X = 10;
const LEVEE_ACTIVE = 18;
const ECHELLE_ACTIVE = 1.04;
const ECHELLE_VOISINE = 0.92;

const modulo = (n: number, m: number) => (m <= 0 ? 0 : ((n % m) + m) % m);

type Props = {
  ecrans: Ecran[];
  largeurCarte?: number;
  hauteurCarte?: number;
  visibles?: number;
  ouvertureDeg?: number;
  recouvrement?: number;
};

export default function Eventail({
  ecrans,
  largeurCarte = 560,
  hauteurCarte = 350,
  visibles = 3,
  ouvertureDeg = 14,
  recouvrement = 0.66,
}: Props) {
  const reduit = useReducedMotion();
  const total = ecrans.length;
  const [choix, setActif] = useState(0);
  /* La source ramenait l'index dans la liste par un effet quand la liste
     changeait de longueur ; ici on le ramène au rendu (la liste est fixe). */
  const actif = modulo(choix, total);

  const demi = Math.max(0, Math.floor(visibles / 2));
  const pas = Math.max(10, Math.round(largeurCarte * (1 - recouvrement)));
  const angleParRang = demi > 0 ? ouvertureDeg / demi : 0;

  const precedent = useCallback(() => total && setActif((a) => modulo(a - 1, total)), [total]);
  const suivant = useCallback(() => total && setActif((a) => modulo(a + 1, total)), [total]);

  if (!total) return null;

  /* écart signé au plus court, la boucle comprise */
  const ecart = (i: number) => {
    const d = i - actif;
    if (total <= 1) return d;
    const autre = d > 0 ? d - total : d + total;
    return Math.abs(autre) < Math.abs(d) ? autre : d;
  };

  return (
    <div className="w-full">
      <div
        className="relative w-full"
        style={{ height: Math.max(380, hauteurCarte + 80) }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") precedent();
          if (e.key === "ArrowRight") suivant();
        }}
      >
        <div className="absolute inset-0 flex items-end justify-center" style={{ perspective: `${PERSPECTIVE}px` }}>
          <AnimatePresence initial={false}>
            {ecrans.map((ecran, i) => {
              const d = ecart(i);
              const distance = Math.abs(d);
              if (distance > demi) return null;
              const estActive = d === 0;
              const rotation = d * angleParRang;
              const x = d * pas;
              const y = 10 * distance;
              const echelle = estActive ? ECHELLE_ACTIVE : ECHELLE_VOISINE;
              const levee = estActive ? -LEVEE_ACTIVE : 0;
              const inclinaison = estActive ? 0 : INCLINAISON_X;
              const glisser = estActive
                ? {
                    drag: "x" as const,
                    dragConstraints: { left: 0, right: 0 },
                    dragElastic: 0.18,
                    onDragEnd: (_: unknown, info: PanInfo) => {
                      if (reduit) return;
                      const seuil = Math.min(160, 0.22 * largeurCarte);
                      if (info.offset.x > seuil || info.velocity.x > 650) precedent();
                      else if (info.offset.x < -seuil || info.velocity.x < -650) suivant();
                    },
                  }
                : {};
              return (
                <motion.div
                  key={ecran.id}
                  className={cn(
                    "absolute bottom-0 select-none overflow-hidden rounded-2xl will-change-transform",
                    estActive ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                  )}
                  style={{ width: largeurCarte, height: hauteurCarte, zIndex: 100 - distance, transformStyle: "preserve-3d" }}
                  initial={
                    reduit
                      ? false
                      : { opacity: 0, y: y + 40, x, rotateZ: rotation, rotateX: inclinaison, scale: echelle }
                  }
                  animate={{ opacity: 1, x, y: y + levee, rotateZ: rotation, rotateX: inclinaison, scale: echelle }}
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                  onClick={() => {
                    if (!estActive) setActif(i);
                  }}
                  {...glisser}
                >
                  <div
                    className="h-full w-full"
                    style={{ transform: `translateZ(${-distance * PROFONDEUR}px)`, transformStyle: "preserve-3d" }}
                  >
                    <CarteEcran ecran={ecran} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-2">
        {ecrans.map((ecran, i) => (
          <button
            key={ecran.id}
            type="button"
            onClick={() => setActif(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === actif ? "w-5 bg-[#4f9587]" : "w-1.5 bg-slate-300 hover:bg-slate-400",
            )}
            aria-label={ecran.titre}
          />
        ))}
      </div>
    </div>
  );
}

/* La carte de l'éventail (le `renderCard` que la page passait à `C_mF`). */
function CarteEcran({ ecran }: { ecran: Ecran }) {
  return (
    <div className="group relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-[#23433e]/10 transition-colors duration-300 hover:border-[#72b0a4]/40 hover:shadow-[#4f9587]/20">
      <Image
        src={ecran.src}
        alt=""
        fill
        draggable={false}
        sizes="560px"
        className="block object-contain transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#f3f8f7]/10 via-transparent to-[#23433e]/5" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-200" />
      <Badge texte={ecran.badge} className="absolute left-4 top-4 px-2.5 py-1 font-medium" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent p-6 pt-20">
        <h3 className="mb-1.5 text-2xl font-semibold text-slate-900">{ecran.titre}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{ecran.texte}</p>
      </div>
    </div>
  );
}

/* La pastille perle « En direct » / « Chaque matin », son point vert qui bat. */
function Badge({ texte, className }: { texte: string; className?: string }) {
  return (
    <span className={cn("dentaire-perle inline-flex items-center gap-1.5 rounded-full text-xs", className)}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      {texte}
    </span>
  );
}

/* `C_fn` — sous 640 px : les mêmes cartes en rangée à défiler au doigt,
   aimantées au centre, et des points qui suivent la carte visible. Les
   cartes étaient des <button> sans action (fonction vide) : ce sont des
   blocs ici, qu'aucun lecteur d'écran n'annonce plus comme cliquables. */
export function CarrouselMobile({ ecrans }: { ecrans: Ecran[] }) {
  const rangee = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(0);

  return (
    <div className="relative z-10 sm:hidden">
      <div
        ref={rangee}
        onScroll={() => {
          const r = rangee.current;
          if (!r || r.children.length === 0) return;
          const pasCarte = (r.children[0] as HTMLElement).offsetWidth + 16;
          setVisible(Math.max(0, Math.min(ecrans.length - 1, Math.round(r.scrollLeft / pasCarte))));
        }}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-10 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ecrans.map((ecran) => (
          <div
            key={ecran.titre}
            className="relative aspect-[16/10] w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-[#23433e]/10"
          >
            <Image src={ecran.src} alt="" fill sizes="85vw" className="block object-contain" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#f3f8f7]/10 via-transparent to-[#23433e]/5" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-200" />
            <Badge texte={ecran.badge} className="absolute left-4 top-4 px-2.5 py-1 font-medium" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent p-5 pt-16">
              <h3 className="mb-1 text-xl font-semibold text-slate-900">{ecran.titre}</h3>
              <p className="text-xs leading-relaxed text-slate-600">{ecran.texte}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {ecrans.map((ecran, i) => (
          <span
            key={ecran.id}
            className={`h-1.5 rounded-full transition-all ${i === visible ? "w-5 bg-[#4f9587]" : "w-1.5 bg-slate-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
