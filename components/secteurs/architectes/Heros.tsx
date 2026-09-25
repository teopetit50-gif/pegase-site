"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Heros.tsx

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   hero.tsx` : décalque du « hero-10 » de la référence Parlo — voiles de
   lumière, deux canevas de pixels masqués en haut, grille 3D en bas, texte
   circulaire, titre révélé lettre à lettre, puis le texte et les boutons.
   Ce qui change :

   · MONDE BLANC, AVEC LES VALEURS DE LA RÉFÉRENCE. La source tournait en
     sombre ; la référence, elle, a un thème CLAIR que son code choisit par
     `useTheme()` (bundle relevé le 23/09, chunk 0o5_t4…). Ce sont ces
     valeurs-là qui sont posées, pas des valeurs devinées :
       pixels du haut        #ffffff, #FFFFFFCC, #FFFFFF99, #A3A3A3
                           → #404040, #525252CC, #73737399, #A3A3A3
       grille 3D, cases      #151515, #1d1d1d, #252525, #303030
                           → #e5e5e5, #d4d4d4, #bdbdbd, #a3a3a3
       grille 3D, filets     #262626 → #d4d4d4
       texte circulaire      blanc → #262626
       fond et voiles        `--hero-10-*` du thème clair (architectes.css)
     Titre et texte : jetons clairs (#0a0a0a, #737373).

   · « Voir la démo » était un `mailto:` : il mène à /reserver-un-audit
     (la démonstration se fait pendant l'audit), en `Lien` ; « Réserver un
     audit » aussi (la source visait https://omegaai.fr/reserver).

   · LE PREMIER ÉCRAN. L'entête de la source était `fixed` et flottait sur
     le héros, d'où `min-h-screen` et `pt-16`. Celle d'Omega est `sticky` :
     elle occupe 64 px (72 dès `sm`) au-dessus du héros. Le héros prend donc
     la hauteur de fenêtre MOINS l'entête, sans le `pt-16` : le titre reste
     au même endroit de l'écran qu'à la source (4 px près).

   · PAGE PLEINE : le héros est posé hors marge (fond, voiles, pixels et
     grille courent d'un bord à l'autre) ; la colonne de texte garde les
     30 px de marge du cadre de la source.

   · Police : Syne partout dans la source ; ici la police du site. Le texte
     circulaire mesure ses lettres au canevas : il reçoit le nom de famille
     réellement calculé sur la page, pas une variable CSS que le canevas ne
     lit pas.
   ══════════════════════════════════════════════════════════════════════ */
import React, { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import PixelCanvas from "./pixels";
import Grid3D from "./grille-3d";
import CircularText from "./texte-circulaire";
import FocusReveal from "./revelation";
import StarButton from "./bouton-etoile";
import Lien from "@/components/Lien";
import { CONTACT, HERO } from "./textes";

const PIXELS = {
  colors: ["#404040", "#525252CC", "#73737399", "#A3A3A3"],
  appearFrom: "top" as const,
  trigger: "auto" as const,
  position: "top" as const,
  replay: false,
  gap: 8,
  pixelSize: 3,
  speed: 70,
  backgroundColor: "transparent",
  padding: 0,
  borderWidth: 0,
  borderColor: "transparent",
  radius: 0,
  transition: { duration: 0.65, ease: "easeOut" },
  style: { width: "100%", height: "100%", minWidth: 0, minHeight: 0, isolation: "auto" } as React.CSSProperties,
};
const EASE: [number, number, number, number] = [0.215, 0.61, 0.355, 1];

/* La largeur de fenêtre et la police réellement calculée, lues sans état
   posé dans un effet (règle react-hooks du site) : 0 et "" au rendu
   serveur, les vraies valeurs dès l'hydratation, puis à chaque
   redimensionnement — la source faisait la même chose par `useState` +
   `useEffect`. */
const surRedimension = (rappel: () => void) => {
  window.addEventListener("resize", rappel);
  return () => window.removeEventListener("resize", rappel);
};
const sansAbonnement = () => () => {};

function Cercle() {
  const largeur = useSyncExternalStore(
    surRedimension,
    () => window.innerWidth,
    () => 0,
  );
  const famille = useSyncExternalStore(
    sansAbonnement,
    () => getComputedStyle(document.body).fontFamily,
    () => "",
  );
  const monte = largeur > 0;
  const d = largeur >= 1600 ? 1100 : largeur >= 1280 ? 900 : largeur >= 768 ? 750 : 440;
  const taille = largeur >= 1280 ? "16px" : "13px";
  const masque = "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)";
  return (
    <div
      className="pointer-events-none relative mx-auto mb-3 h-[56px] w-full max-w-[316px] overflow-hidden"
      aria-hidden="true"
      style={{
        maskImage: masque,
        WebkitMaskImage: masque,
        maskMode: "alpha",
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    >
      {monte && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ width: d, height: d }}>
          <CircularText
            words={[HERO.cercle.join(" · ")]}
            separator=" · "
            diameter={d}
            color="#262626"
            onHover="pause"
            hoverSpeed={8}
            transition={{ duration: 40 }}
            font={{
              fontFamily: famille,
              fontWeight: 500,
              fontSize: taille,
              letterSpacing: "0.06em",
              lineHeight: "1em",
            }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}
    </div>
  );
}

export default function Heros() {
  const reduced = useReducedMotion();
  const [pret, setPret] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPret(true), 1700);
    return () => clearTimeout(t);
  }, []);
  const ok = reduced || pret;
  const app = (delai: number) =>
    reduced
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 12 },
          animate: ok ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
          transition: { type: "tween" as const, duration: 0.3, ease: EASE, delay: ok ? delai : 0 },
        };
  const voile =
    "radial-gradient(ellipse 130% 100% at 50% 0%, #000 0%, #000 42%, rgba(0,0,0,0.55) 62%, transparent 78%)";
  return (
    <section
      aria-label="Lorani, le contrôleur de dossier"
      className="relative isolate min-h-[calc(100svh-64px)] w-full overflow-hidden sm:min-h-[calc(100svh-72px)]"
      style={{ backgroundColor: "var(--hero-10-background)" }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-x-0 top-0 h-[360px] xl:h-[420px]"
          style={{
            background: "var(--hero-10-glow-wash)",
            opacity: 0.45,
            maskImage: voile,
            WebkitMaskImage: voile,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />
        <div
          className="absolute top-[-40px] left-1/2 h-[280px] w-[160%] max-w-none -translate-x-1/2 blur-[70px] xl:h-[340px] xl:blur-[100px]"
          style={{ background: "var(--hero-10-glow-bloom)", opacity: 0.5 }}
        />
        <div
          className="absolute top-[180px] left-1/2 h-[298px] w-[587px] -translate-x-1/2 rounded-full blur-[40px]"
          style={{ background: "radial-gradient(ellipse at center, var(--hero-10-glow-mid) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-[260px] left-1/2 h-[294px] w-[1826px] -translate-x-1/2 rounded-full blur-[60px]"
          style={{ background: "radial-gradient(ellipse at center, var(--hero-10-glow-wide) 0%, transparent 65%)" }}
        />
      </div>
      <div
        className="pointer-events-none absolute top-0 left-1/2 z-[1] flex h-[48%] w-full max-w-[1512px] -translate-x-1/2 gap-10 overflow-hidden md:h-[42%] md:gap-10 xl:gap-[50px] min-[1600px]:max-w-none"
        aria-hidden="true"
      >
        <div className="relative h-full min-w-0 flex-1 mask-ellipse mask-radial-farthest-corner mask-radial-at-top-left mask-radial-from-30% mask-radial-to-60%">
          <PixelCanvas {...PIXELS} />
        </div>
        <div className="relative h-full min-w-0 flex-1 mask-ellipse mask-radial-farthest-corner mask-radial-at-top-right md:mask-radial-from-30% mask-radial-to-60% mask-radial-from-50%">
          <PixelCanvas {...PIXELS} />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-[1] h-[60%] overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 opacity-90 [mask-image:linear-gradient(to_top,black_0%,black_55%,transparent_100%)]">
          <div className="absolute inset-y-0 left-1/2 w-[240%] -translate-x-1/2 md:w-[200%] xl:inset-0 xl:w-full xl:translate-x-0">
            <Grid3D
              backgroundColor="transparent"
              boxSize={80}
              borderWidth={1}
              borderColor="#d4d4d4"
              rotate={{ x: 0, y: 50 }}
              colors={["#e5e5e5", "#d4d4d4", "#bdbdbd", "#a3a3a3"]}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      </div>
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[calc(100svh-64px)] w-full flex-col items-center px-[30px] sm:min-h-[calc(100svh-72px)]">
        <div className="flex w-full flex-1 flex-col items-center justify-center max-w-[520px] md:max-w-[760px]">
          <div className="relative z-20 mx-auto flex w-full flex-col items-center xl:mt-12">
            <Cercle />
            <div className="flex flex-col gap-6">
              <div className="flex w-full flex-col items-center gap-6 md:gap-8">
                <div className="flex w-full flex-col items-center gap-2 md:gap-4 text-center">
                  <FocusReveal
                    text={HERO.titre}
                    as="h1"
                    staggerFrom="start"
                    blur={12}
                    duration={0.3}
                    delay={0.08}
                    stagger={0.028}
                    className="w-full text-center font-sans text-[40px] md:text-[54px] leading-none tracking-[-0.88px] text-[#0a0a0a] text-pretty"
                  />
                  <motion.p
                    {...app(0)}
                    className="w-full max-w-[340px] md:max-w-none font-sans text-[14px] md:text-[16px] leading-[1.4] tracking-[-0.28px] text-[#737373] text-pretty"
                  >
                    {HERO.texte}
                  </motion.p>
                </div>
              </div>
              <motion.div {...app(0.1)} className="pointer-events-auto mx-auto flex max-w-[310px] items-center gap-4">
                <StarButton href={CONTACT.audit}>{HERO.audit}</StarButton>
                <Lien
                  href={CONTACT.demo}
                  className="relative inline-flex shrink-0 touch-manipulation items-center justify-center overflow-clip rounded-[6px] font-sans text-[20px] font-medium leading-[1.2] tracking-[-0.4px] transition-[opacity,transform] duration-200 ease [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] active:scale-[0.97] motion-reduce:active:scale-100 cursor-pointer group border border-solid border-[#e5e5e5] px-4 py-[10px] text-[#303030]"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[32px] bg-[#fafafa] transition-colors duration-200 ease motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:bg-white"
                  />
                  <span className="relative z-1 text-center text-[#303030] text-[13px] font-normal">{HERO.demo}</span>
                </Lien>
              </motion.div>
              <motion.p {...app(0.15)} className="text-center font-sans text-[12px] tracking-[-0.2px] text-[#737373]">
                {HERO.garanties.join(" · ")}
              </motion.p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
