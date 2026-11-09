"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Travaux.tsx (09/11/2026)
   Le carrousel « Selected work » de la référence : barre de titre
   (`mb-8 flex items-baseline justify-between`, h2 `font-display text-h3`,
   lien `text-small` à droite), puis un cadre `h-[85svh] min-h-[520px]
   bg-ink` plein cadre. Dans le cadre : la photo (échelle 1,08) sous un
   `scrim`, un lien qui couvre tout (`data-cursor`), le bloc de texte à
   `top-[55%]` (compteur `01 / 05` tabulaire au-dessus d'une ligne de
   progression de 6 s, titre `font-headline text-title`, à droite la
   légende `text-paper/70` et le lien, visibles à partir de 810 px), et
   en bas à droite « Pause » et les deux flèches de 48 px à voile papier.
   Relevé de la transition (300 ms après « suivant ») : la sortante à
   −47 %, l'entrante à +53 %, son image à −26 % — soit un glissement de
   1,2 s sur la courbe ease-in-out, l'image à moitié de vitesse ; le
   titre sort (roll-out) pendant que le nouveau entre (roll-in, 0,3 s).
   Textes : « 05 — Métiers », chaque carte du rail en diapositive. La
   phrase de la carte, qui n'a pas de brique dans la référence, suit le
   titre en `text-small`. Le lien « Voir la démo » du héros actuel tient
   la place de « See work ».
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { CONTACT, METIERS } from "./textes";

const DUREE = 6000;
const GLISSEMENT = 1200;

function Roule({ texte, cle, sortant }: { texte: string; cle: number; sortant?: string }) {
  return (
    <span className="inline-grid overflow-hidden pb-[0.08em] align-bottom">
      {sortant !== undefined && (
        <span key={`s${cle}`} aria-hidden="true" className="animate-roll-out [grid-area:1/1]" style={{ "--roll-delay": "0s" } as CSSProperties}>
          {sortant}
        </span>
      )}
      <span key={`e${cle}`} className="animate-roll-in [grid-area:1/1]" style={{ "--roll-delay": sortant !== undefined ? "0.3s" : "0.2s" } as CSSProperties}>
        {texte}
      </span>
    </span>
  );
}

function FlecheGauche() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M14 8H2m5-5L2 8l5 5" />
    </svg>
  );
}
function FlecheDroite() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M2 8h12M9 3l5 5-5 5" />
    </svg>
  );
}

export default function Travaux() {
  const cartes = METIERS.cartes;
  const n = cartes.length;
  const [etat, setEtat] = useState({ courant: 0, precedent: -1, cle: 0 });
  const [pause, setPause] = useState(false);
  const enCours = useRef(false);
  const minuteur = useRef(0);

  const aller = useCallback(
    (vers: number) => {
      if (enCours.current) return;
      enCours.current = true;
      setEtat((e) => ({ courant: (vers + n) % n, precedent: e.courant, cle: e.cle + 1 }));
      window.setTimeout(() => {
        enCours.current = false;
      }, GLISSEMENT);
    },
    [n],
  );

  useEffect(() => {
    if (pause) return;
    minuteur.current = window.setTimeout(() => aller(etat.courant + 1), DUREE);
    return () => window.clearTimeout(minuteur.current);
  }, [etat, pause, aller]);

  /* glissement au doigt */
  const depart = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => {
    depart.current = e.clientX;
  };
  const onUp = (e: React.PointerEvent) => {
    if (depart.current === null) return;
    const d = e.clientX - depart.current;
    depart.current = null;
    if (Math.abs(d) > 50) aller(etat.courant + (d < 0 ? 1 : -1));
  };

  const num = (i: number) => String(i + 1).padStart(2, "0");
  const c = cartes[etat.courant];
  const p = etat.precedent >= 0 ? cartes[etat.precedent] : null;
  const transition = p !== null;

  return (
    <section aria-labelledby="travaux-title" className="mt-28 min-[810px]:mt-40">
      <div data-monde="clair">
        <GroupeApparition
          retard={400}
          className="mx-auto mb-8 flex w-full max-w-[1600px] items-baseline justify-between gap-6 px-4 min-[810px]:px-8"
        >
          <h2 id="travaux-title" className="font-display text-h3">
            <MotsApparition texte={METIERS.titre} />
          </h2>
          <Apparition as="p" delai={200} className="text-small text-right">
            {METIERS.sous}
          </Apparition>
        </GroupeApparition>
      </div>
      <div
        aria-roledescription="carousel"
        aria-label={METIERS.titre}
        className="relative h-[85svh] min-h-[520px] overflow-hidden bg-ink text-paper"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => (depart.current = null)}
      >
        {transition && (
          <div
            key={`p${etat.cle}`}
            className="n-diapo-sort absolute inset-0 overflow-hidden"
            style={{ touchAction: "pan-y", userSelect: "none" }}
          >
            <div className="n-diapo-image-sort absolute inset-0">
              <div className="absolute inset-0" style={{ transform: "scale(1.08)" }}>
                <Image alt="" src={p!.image} fill sizes="100vw" className="object-cover" draggable={false} />
              </div>
            </div>
            <div className="absolute inset-0 scrim" />
          </div>
        )}
        <div
          key={`c${etat.cle}`}
          className={`${transition ? "n-diapo-entre " : ""}absolute inset-0 overflow-hidden`}
          style={{ touchAction: "pan-y", userSelect: "none" }}
        >
          <div className={`${transition ? "n-diapo-image-entre " : ""}absolute inset-0`}>
            <div className="absolute inset-0" style={{ transform: "scale(1.08)" }}>
              <Image alt={`${c.agence}, ${c.secteur}`} src={c.image} fill sizes="100vw" className="object-cover" draggable={false} />
            </div>
          </div>
          <div className="absolute inset-0 scrim" />
          <Link aria-label={`${METIERS.lien} : ${c.phase}`} data-cursor="Voir" draggable={false} className="absolute inset-0 z-[1]" href={CONTACT.demo} />
        </div>
        <div className="pointer-events-none absolute inset-x-4 top-[55%] z-[2] min-[810px]:inset-x-8">
          <p className="absolute bottom-full left-0 mb-3 text-small tabular-nums" aria-label={`Étape ${etat.courant + 1} sur ${n}`}>
            <Roule texte={num(etat.courant)} cle={etat.cle} sortant={p ? num(etat.precedent) : undefined} />
            <span aria-hidden="true"> / {num(n - 1)}</span>
          </p>
          <div className="h-px bg-paper/30">
            <div
              key={`b${etat.cle}${pause ? "p" : "l"}`}
              className="h-full origin-left bg-paper animate-slide-progress"
              style={{ animationPlayState: pause ? "paused" : "running" }}
            />
          </div>
          <div className="mt-4 flex items-start justify-between gap-6">
            <div>
              <h3 className="font-headline text-title">
                <Roule texte={c.phase} cle={etat.cle} sortant={p?.phase} />
              </h3>
              <p className="mt-4 max-w-[44ch] text-small text-paper/70">
                <Roule texte={c.texte} cle={etat.cle} sortant={p?.texte} />
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-5 pt-2 text-small min-[810px]:flex">
              <span className="text-paper/70">
                <Roule texte={`${c.agence} · ${c.secteur}`} cle={etat.cle} sortant={p ? `${p.agence} · ${p.secteur}` : undefined} />
              </span>
              <Link className="pointer-events-auto link" href={CONTACT.demo}>
                {METIERS.lien}
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute right-4 bottom-4 z-[2] flex items-center gap-4 min-[810px]:right-8 min-[810px]:bottom-8">
          <button
            type="button"
            aria-label={pause ? "Reprendre le défilement" : "Arrêter le défilement"}
            onClick={() => setPause((v) => !v)}
            className="cursor-pointer text-small text-paper/70 hover:text-paper"
          >
            {pause ? "Lecture" : "Pause"}
          </button>
          <button
            type="button"
            aria-label="Étape précédente"
            onClick={() => aller(etat.courant - 1)}
            className="group/arrow relative grid size-12 cursor-pointer place-items-center overflow-hidden bg-paper/15 text-paper backdrop-blur-md"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-bottom-left scale-0 bg-paper group-hover/arrow:scale-100 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
            <span className="relative block w-4 overflow-hidden transition-colors duration-[400ms] group-hover/arrow:text-ink">
              <span className="flex w-8 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/arrow:-translate-x-1/2">
                <FlecheGauche />
                <FlecheGauche />
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Étape suivante"
            onClick={() => aller(etat.courant + 1)}
            className="group/arrow relative grid size-12 cursor-pointer place-items-center overflow-hidden bg-paper/15 text-paper backdrop-blur-md"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-bottom-left scale-0 bg-paper group-hover/arrow:scale-100 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
            <span className="relative block w-4 overflow-hidden transition-colors duration-[400ms] group-hover/arrow:text-ink">
              <span className="flex w-8 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] -translate-x-1/2 group-hover/arrow:translate-x-0">
                <FlecheDroite />
                <FlecheDroite />
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
