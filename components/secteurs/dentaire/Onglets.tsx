"use client";
/* ══════════════════════════════════════════════════════════════════════
   « Votre cabinet tient sur une seule page » (#demo) — la section à
   onglets de la référence : titre et chapô côte à côte, quatre onglets
   (titre, sous-titre, filet qui se remplit en 16 s puis passe au suivant),
   et les quatre fenêtres EMPILÉES — l'active devant, les suivantes
   reculent de 10 px et de 4 % par rang, la quatrième invisible. Classes
   et valeurs relevées sur la référence (sonde du 09/11 : 0,3125 % du
   filet toutes les 50 ms, soit 16 s par onglet).

   Les quatre fenêtres (Panneaux.tsx) portent la démo, le calculateur, le
   parcours d'un créneau et la comparaison de la page du 24/09.
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { PanneauCalculateur, PanneauComparatif, PanneauParcours, PanneauPointDuMatin } from "./Panneaux";
import { ECRANS, ONGLETS_ECRANS } from "./textes";

const DUREE = 16000;
const PANNEAUX = [PanneauPointDuMatin, PanneauCalculateur, PanneauParcours, PanneauComparatif];

export default function Onglets() {
  const [actif, setActif] = useState(0);
  const [avance, setAvance] = useState(0);
  const depart = useRef(0);

  /* Le filet se remplit image par image (requestAnimationFrame) : l'état
     n'est posé que dans la boucle, jamais dans le corps de l'effet. */
  useEffect(() => {
    depart.current = 0;
    let image = 0;
    const pas = (t: number) => {
      if (!depart.current) depart.current = t;
      const a = Math.min((t - depart.current) / DUREE, 1);
      setAvance(a);
      if (a >= 1) setActif((n) => (n + 1) % PANNEAUX.length);
      else image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [actif]);

  const style = (i: number): CSSProperties => {
    const rang = (i - actif + PANNEAUX.length) % PANNEAUX.length;
    return {
      transformOrigin: "top center",
      zIndex: PANNEAUX.length - rang,
      top: `${-10 * rang}px`,
      opacity: rang === PANNEAUX.length - 1 ? 0 : 1,
      transform: rang === 0 ? "none" : `scale(${(1 - 0.04 * rang).toFixed(2)})`,
      transition: "top 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s",
    };
  };

  return (
    <section id="demo" data-monde="clair" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <GroupeApparition retard={700} className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="text-balance font-bold text-4xl text-tir-foreground tracking-tight md:text-5xl">
            <MotsApparition texte="Votre cabinet tient sur une seule page" depart={80} />
          </h2>
          <Apparition as="p" delai={450} className="max-w-md text-base text-tir-muted-foreground leading-relaxed">
            Décrivez une annulation : voici le point du matin que Tiroma préparerait
          </Apparition>
        </GroupeApparition>
        <Apparition delai={150}>
          <div className="mt-14 grid grid-cols-1 gap-x-4 gap-y-2 border-tir-border border-b sm:grid-cols-2 lg:grid-cols-4">
            {ONGLETS_ECRANS.map((o, i) => (
              <button
                key={o.valeur}
                type="button"
                onClick={() => setActif(i)}
                className={`group relative flex flex-col px-2 pt-3 pb-4 text-left transition-opacity ${i === actif ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
              >
                <p className="font-semibold text-tir-foreground text-sm md:text-base">{o.titre}</p>
                <p className="mt-1 text-tir-muted-foreground text-xs">{ECRANS[i].texte}</p>
                <span className="-bottom-px absolute right-0 left-0 h-0.5 overflow-hidden">
                  {i === actif && <span className="block h-full bg-tir-foreground" style={{ width: `${(avance * 100).toFixed(4)}%`, transition: "width 50ms linear" }} />}
                </span>
              </button>
            ))}
          </div>
          <div className="relative mx-auto mt-14 h-[360px] sm:h-[440px] md:h-[520px] lg:h-[640px]">
            {PANNEAUX.map((Panneau, i) => (
              <div key={i} className="absolute inset-x-0" style={style(i)} aria-hidden={i !== actif}>
                <Panneau />
              </div>
            ))}
          </div>
        </Apparition>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {["Lecture seule", "Tiroma lit votre logiciel sans jamais y écrire.", "Accès journalisés, droits par rôle, vos données restent les vôtres."].map((t) => (
            <div key={t} className="flex items-center gap-2 text-tir-muted-foreground text-sm">
              <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500">
                <svg aria-hidden="true" className="size-2.5 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
