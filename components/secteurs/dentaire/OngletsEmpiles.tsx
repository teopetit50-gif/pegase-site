"use client";
/* ══════════════════════════════════════════════════════════════════════
   OngletsEmpiles — les onglets animés d'Aceternity que portait la source
   (`C_mc` + `C_mh`) : une rangée de pastilles, et sous elle les écrans
   EMPILÉS — l'actif devant, les suivants reculent (échelle −10 % par
   rang, opacité −10 %, trois visibles au plus). Cliquer une pastille la
   remet en tête de pile ; au survol des pastilles, la pile se déploie vers
   le haut (−50 px par rang). La pastille active glisse d'un onglet à
   l'autre (`layoutId`, ressort 0,3 / 0,6 s), l'écran actif fait un rebond
   de 40 px à chaque changement.

   Écarts : `dark:bg-zinc-800` / `dark:text-white` retirés ; la classe
   `no-visible-scrollbar` de la source n'était définie nulle part, elle
   n'est pas reprise. L'écran lui-même (`C_fe`, une fenêtre à trois
   pastilles) est `FenetreEcran`, plus bas.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { cn } from "./outils";

export type Onglet = { titre: string; valeur: string; contenu: ReactNode };

type Props = {
  onglets: Onglet[];
  classeConteneur?: string;
  classeActif?: string;
  classeOnglet?: string;
  classeContenu?: string;
};

export default function OngletsEmpiles({ onglets, classeConteneur, classeActif, classeOnglet, classeContenu }: Props) {
  const [actif, setActif] = useState(onglets[0]);
  const [pile, setPile] = useState(onglets);
  const [survol, setSurvol] = useState(false);

  const choisir = (rang: number) => {
    const nouvelle = [...onglets];
    const [choisi] = nouvelle.splice(rang, 1);
    nouvelle.unshift(choisi);
    setPile(nouvelle);
    setActif(nouvelle[0]);
  };

  return (
    <>
      <div
        className={cn(
          "relative flex w-full max-w-full flex-row items-center justify-start overflow-auto [perspective:1000px] sm:overflow-visible",
          classeConteneur,
        )}
      >
        {onglets.map((o, rang) => (
          <button
            key={o.titre}
            type="button"
            onClick={() => choisir(rang)}
            onMouseEnter={() => setSurvol(true)}
            onMouseLeave={() => setSurvol(false)}
            className={cn("relative rounded-full px-4 py-2", classeOnglet)}
            style={{ transformStyle: "preserve-3d" }}
          >
            {actif.valeur === o.valeur && (
              <motion.div
                layoutId="dentaire-onglet-actif"
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className={cn("absolute inset-0 rounded-full bg-gray-200", classeActif)}
              />
            )}
            <span className="relative block text-black">{o.titre}</span>
          </button>
        ))}
      </div>
      <Pile key={actif.valeur} onglets={pile} survol={survol} className={cn("mt-32", classeContenu)} />
    </>
  );
}

function Pile({ onglets, survol, className }: { onglets: Onglet[]; survol: boolean; className?: string }) {
  return (
    <div className="relative h-full w-full">
      {onglets.map((o, rang) => (
        <motion.div
          key={o.valeur}
          layoutId={`dentaire-ecran-${o.valeur}`}
          style={{
            scale: 1 - 0.1 * rang,
            top: survol ? -50 * rang : 0,
            zIndex: -rang,
            opacity: rang < 3 ? 1 - 0.1 * rang : 0,
          }}
          animate={{ y: o.valeur === onglets[0].valeur ? [0, 40, 0] : 0 }}
          className={cn("absolute left-0 top-0 h-full w-full", className)}
        >
          {o.contenu}
        </motion.div>
      ))}
    </div>
  );
}

/* `C_fe` : une capture dans une fenêtre claire à trois pastilles, sa
   légende en mono. La source posait deux <img> (clair, sombre) de la même
   capture ; la sombre ne s'affichait jamais : une seule reste, servie par
   next/image. `width`/`height` sont ceux de la source (1957 × 1373) : ils
   ne donnent que le rapport avant chargement, la hauteur suit ensuite la
   capture (`h-auto`), rognée par la fenêtre comme dans la source. */
export function FenetreEcran({ src, legende }: { src: string; legende: string }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-[#4f9587]/10">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ml-4 font-mono text-xs text-slate-400">{legende}</span>
      </div>
      <Image
        src={src}
        alt=""
        width={1957}
        height={1373}
        sizes="(min-width: 1152px) 1152px, 100vw"
        className="block h-auto w-full"
      />
    </div>
  );
}
