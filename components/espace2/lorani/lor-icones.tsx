/* ══════════════════════════════════════════════════════════════════════
   LORANI — les icônes de Linear (02/11/2026)

   Deux sources, aucune redessinée :
     · le sprite (./lor-sprite.ts, tiré de releves/linear-commun/
       sprite-icones.svg) : <IconeSprite nom="Project" /> ;
     · les icônes dessinées en ligne par Linear, recopiées de son DOM
       (outerHTML, 01-02/11) : santé, priorité, statut de projet,
       calendrier, jalon, courbe de progression, boutons d'en-tête.
   ══════════════════════════════════════════════════════════════════════ */

import { useId } from "react";
import { SPRITE, type NomIcone } from "./lor-sprite";
import { LIN, type NomLin } from "./lor-icones-linear";

type P = { titre?: string; className?: string };
const aria = (titre?: string) => (titre ? { role: "img" as const, "aria-label": titre } : { "aria-hidden": true as const });

export function IconeSprite({ nom, couleur, taille = 16, titre, className }: P & { nom: NomIcone; couleur?: string; taille?: number }) {
  const [vb, contenu] = SPRITE[nom];
  return <svg width={taille} height={taille} viewBox={vb} fill={couleur ?? "currentColor"} className={className} {...aria(titre)} dangerouslySetInnerHTML={{ __html: contenu }} />;
}

/* ——— boutons d'en-tête (Projects) ——— */
export function IconePlus({ titre, className }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className} {...aria(titre)}>
      <path d="M8.75 4C8.75 3.58579 8.41421 3.25 8 3.25C7.58579 3.25 7.25 3.58579 7.25 4V7.25H4C3.58579 7.25 3.25 7.58579 3.25 8C3.25 8.41421 3.58579 8.75 4 8.75H7.25V12C7.25 12.4142 7.58579 12.75 8 12.75C8.41421 12.75 8.75 12.4142 8.75 12V8.75H12C12.4142 8.75 12.75 8.41421 12.75 8C12.75 7.58579 12.4142 7.25 12 7.25H8.75V4Z" />
    </svg>
  );
}
export function IconeNouvelleVue({ titre, className }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className} {...aria(titre)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M6.97358 1.34476C7.57022 0.885624 8.41055 0.885024 9.00788 1.3433L14.5499 5.59521C15.15 6.05565 15.15 6.94435 14.5499 7.40478L9.00788 11.6567C8.41055 12.115 7.57022 12.1144 6.97358 11.6552L1.44875 7.40374C0.850417 6.94331 0.850415 6.05669 1.44875 5.59625L6.97358 1.34476ZM8 3.25C8.41421 3.25 8.75 3.58579 8.75 4V5.75H10.5C10.9142 5.75 11.25 6.08579 11.25 6.5C11.25 6.91421 10.9142 7.25 10.5 7.25H8.75V9C8.75 9.41421 8.41421 9.75 8 9.75C7.58579 9.75 7.25 9.41421 7.25 9V7.25H5.5C5.08579 7.25 4.75 6.91421 4.75 6.5C4.75 6.08579 5.08579 5.75 5.5 5.75H7.25V4C7.25 3.58579 7.58579 3.25 8 3.25Z" />
      <path d="M1.15024 9.79849C1.39408 9.46375 1.84872 9.40113 2.16572 9.65862L6.50981 12.9949C7.29068 13.6292 8.37801 13.6292 9.15888 12.9949L13.8344 9.65862C14.1513 9.40113 14.606 9.46375 14.8498 9.79849C15.0937 10.1332 15.0344 10.6133 14.7174 10.8708L10.0419 14.2071C8.74045 15.2643 6.92824 15.2643 5.62678 14.2071L1.28269 10.8708C0.965698 10.6133 0.906397 10.1332 1.15024 9.79849Z" />
    </svg>
  );
}
export function IconeFiltre({ titre, className }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className} {...aria(titre)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M14.25 3a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5h12.5ZM4 8a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 8Zm2.75 3.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" />
    </svg>
  );
}
export function IconeAffichage({ titre, className }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className} {...aria(titre)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M7 2.5C8.11933 2.5 9.06613 3.23584 9.38477 4.25H14.75C15.1642 4.25 15.5 4.58579 15.5 5C15.5 5.41421 15.1642 5.75 14.75 5.75H9.38477C9.06613 6.76416 8.11933 7.5 7 7.5C5.88067 7.5 4.93387 6.76416 4.61523 5.75H2.25C1.83579 5.75 1.5 5.41421 1.5 5C1.5 4.58579 1.83579 4.25 2.25 4.25H4.61523C4.93387 3.23584 5.88067 2.5 7 2.5ZM7 4C6.44772 4 6 4.44772 6 5C6 5.55228 6.44772 6 7 6C7.55228 6 8 5.55228 8 5C8 4.44772 7.55228 4 7 4Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M10 13.5C8.88067 13.5 7.93387 12.7642 7.61523 11.75H2.25C1.83579 11.75 1.5 11.4142 1.5 11C1.5 10.5858 1.83579 10.25 2.25 10.25H7.61523C7.93387 9.23584 8.88067 8.5 10 8.5C11.1193 8.5 12.0661 9.23584 12.3848 10.25H14.75C15.1642 10.25 15.5 10.5858 15.5 11C15.5 11.4142 15.1642 11.75 14.75 11.75H12.3848C12.0661 12.7642 11.1193 13.5 10 13.5ZM10 12C10.5523 12 11 11.5523 11 11C11 10.4477 10.5523 10 10 10C9.44772 10 9 10.4477 9 11C9 11.5523 9.44772 12 10 12Z" />
    </svg>
  );
}
/* le volet : la barre glisse de 10 à 4 et s'élargit (transition x, width 250 ms) quand il est ouvert */
export function IconeVolet({ ouvert, titre, className }: P & { ouvert?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className} {...aria(titre)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M4.25 2C2.45508 2 1 3.45508 1 5.25V10.75C1 12.5449 2.45508 14 4.25 14H11.75C13.5449 14 15 12.5449 15 10.75V5.25C15 3.45508 13.5449 2 11.75 2H4.25ZM2.5 5.5C2.5 4.39543 3.39543 3.5 4.5 3.5H11.5C12.6046 3.5 13.5 4.39543 13.5 5.5V10.5C13.5 11.6046 12.6046 12.5 11.5 12.5H4.5C3.39543 12.5 2.5 11.6046 2.5 10.5V5.5Z" />
      <rect x={ouvert ? 4 : 10} y="5" width={ouvert ? 4.5 : 1.5} height="6" rx="0.75" style={{ transitionProperty: "x, width", transitionDuration: "250ms" }} />
    </svg>
  );
}
/* la loupe du menu de filtre (« AI filter » dans Linear) */
export function IconeChercher({ titre, className }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className} {...aria(titre)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M15.2642 10.9643L12.3789 8.07906C12.9923 7.19457 13.2716 6.11809 13.1623 5.04291C13.0463 3.90157 12.5011 2.8469 11.637 2.09228C10.7729 1.33766 9.65441 0.939437 8.50784 0.978168C7.36127 1.0169 6.27221 1.4897 5.461 2.30091C4.64979 3.11212 4.17699 4.20117 4.13826 5.34774C4.09953 6.49431 4.49776 7.61279 5.25238 8.4769C6.007 9.341 7.06166 9.88621 8.20301 10.0022C9.27819 10.1115 10.3547 9.83225 11.2392 9.21884L14.1243 12.104L14.1263 12.106C14.2782 12.2542 14.482 12.3371 14.6942 12.3371C14.9064 12.3371 15.1102 12.2542 15.2621 12.106L15.2642 12.1039C15.4152 11.9527 15.5 11.7478 15.5 11.5341C15.5 11.3205 15.4152 11.1155 15.2642 10.9643Z" />
    </svg>
  );
}

/* ——— santé d'un projet : On track, At risk, Off track, No updates ——— */
export type SanteLor = "bien" | "risque" | "hors" | "aucune" | "manque";
const TRACE_SANTE = {
  bien: "M12.6807 5.7029C12.9925 5.97566 13.0241 6.44948 12.7513 6.76121L9.71942 10.2263C9.56569 10.402 9.33892 10.4961 9.10596 10.4808C8.873 10.4656 8.66044 10.3427 8.53094 10.1485L6.76432 7.49855L4.37742 10.2263C4.10466 10.5381 3.63083 10.5696 3.31911 10.2969C3.00739 10.0241 2.97581 9.55028 3.24857 9.23856L6.28056 5.77356C6.43429 5.59788 6.66106 5.50379 6.89401 5.51905C7.12696 5.53432 7.33952 5.65718 7.46902 5.85142L9.23562 8.50133L11.6224 5.77347C11.8952 5.46174 12.369 5.43015 12.6807 5.7029Z",
  hors: "M12.6807 10.297C12.9925 10.0242 13.0241 9.5504 12.7513 9.23866L9.71942 5.77356C9.56569 5.59786 9.33892 5.50377 9.10596 5.51903C8.873 5.53429 8.66044 5.65716 8.53094 5.8514L6.76432 8.50133L4.37742 5.77354C4.10466 5.46182 3.63083 5.43024 3.31911 5.703C3.00739 5.97577 2.97581 6.44959 3.24857 6.76132L6.28056 10.2263C6.43429 10.402 6.66106 10.4961 6.89401 10.4808C7.12696 10.4656 7.33952 10.3427 7.46902 10.1485L9.23562 7.49855L11.6224 10.2264C11.8952 10.5381 12.369 10.5697 12.6807 10.297Z",
  risque: "M9.62562 3.8314C9.85957 3.7977 10.0957 3.87627 10.2628 4.04341L12.5728 6.35341C12.8657 6.6463 12.8657 7.12117 12.5728 7.41407C12.28 7.70696 11.8051 7.70696 11.5122 7.41407L9.91096 5.81284L6.92594 11.2854C6.81276 11.4929 6.60838 11.6349 6.37442 11.6686C6.14047 11.7023 5.90433 11.6237 5.73719 11.4566L3.42719 9.14657C3.1343 8.85367 3.1343 8.3788 3.42719 8.08591C3.72008 7.79301 4.19496 7.79301 4.48785 8.08591L6.08908 9.68714L9.0741 4.2146C9.18728 4.00709 9.39166 3.86509 9.62562 3.8314Z",
};
export const COULEUR_SANTE: Record<SanteLor, string> = { bien: "var(--lor-bien)", risque: "var(--lor-risque)", hors: "var(--lor-hors)", aucune: "var(--lor-t4)", manque: "var(--lor-sante-manque)" };
export function IconeSanteLor({ etat, titre, className, couleur }: P & { etat: SanteLor; couleur?: string }) {
  const c = couleur ?? COULEUR_SANTE[etat];
  if (etat === "aucune") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" className={className} {...aria(titre)}>
        <circle r="7.5" cx="8" cy="8" fill="none" strokeWidth="1" strokeDasharray="2.36 2.36" strokeLinecap="round" stroke={c} />
      </svg>
    );
  }
  if (etat === "manque") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill={c} className={className} {...aria(titre)}>
        <circle r="7.5" cx="8" cy="8" fill="none" strokeWidth="1" strokeDasharray="2.36 2.36" strokeLinecap="round" stroke={c} strokeOpacity="0.45" />
        <path fillRule="evenodd" clipRule="evenodd" d={TRACE_SANTE.risque} />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={c} className={className} {...aria(titre)}>
      <circle r="8" cx="8" cy="8" fill={c} fillOpacity="0.25" />
      <path fillRule="evenodd" clipRule="evenodd" d={TRACE_SANTE[etat]} />
    </svg>
  );
}

/* ——— priorité : 0 aucune, 1 urgente, 2 haute, 3 moyenne, 4 basse ——— */
export function IconePrioriteLor({ niveau, titre, className }: P & { niveau: 0 | 1 | 2 | 3 | 4 }) {
  if (niveau === 1) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--lor-urgent)" className={className} {...aria(titre)}>
        <path d="M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z" />
      </svg>
    );
  }
  if (niveau === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--lor-t3)" className={className} {...aria(titre)}>
        <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
        <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
        <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--lor-t3)" className={className} {...aria(titre)}>
      <rect x="1.5" y="8" width="3" height="6" rx="1" />
      <rect x="6.5" y="5" width="3" height="9" rx="1" fillOpacity={niveau === 4 ? 0.4 : undefined} />
      <rect x="11.5" y="2" width="3" height="12" rx="1" fillOpacity={niveau >= 3 ? 0.4 : undefined} />
    </svg>
  );
}

/* ——— statut d'un projet : hexagone et camembert (part = 0 à 1) ——— */
export type StatutLor = "attente" | "planifie" | "cours" | "fait" | "annule";
const HEXAGONE = "M2.95778 3.02069L5.70777 1.36023C6.50244 0.88041 7.49756 0.88041 8.29223 1.36024L11.0422 3.02074C11.7918 3.47336 12.25 4.2852 12.25 5.16086V8.84803C12.25 9.7251 11.7904 10.5381 11.0388 10.9902L8.29114 12.6433C7.49693 13.1211 6.50355 13.1203 5.71011 12.6412L2.95775 10.9792C2.20815 10.5266 1.75 9.7148 1.75 8.83911V5.16082C1.75 4.28516 2.20816 3.47332 2.95778 3.02069Z";
const TROU = "M8.3779 4.74233C8.14438 4.60607 7.85562 4.60607 7.6221 4.74233L5.37209 6.05513C5.14168 6.18957 5 6.4363 5 6.70311V9.34216C5 9.60897 5.14168 9.85573 5.37209 9.99016L7.6221 11.303C7.85562 11.4392 8.14438 11.4392 8.3779 11.303L10.6279 9.99016C10.8583 9.85573 11 9.60897 11 9.34216V6.70311C11 6.4363 10.8583 6.18957 10.6279 6.05513L8.3779 4.74233Z";
const COCHE = "M10.7803 5.28033C11.0732 4.98744 11.0732 4.51256 10.7803 4.21967C10.4874 3.92678 10.0126 3.92678 9.7197 4.21967L5.75 8.18934L4.28033 6.71967C3.98744 6.42678 3.51256 6.42678 3.21967 6.71967C2.92678 7.01256 2.92678 7.48744 3.21967 7.78033L5.21967 9.7803C5.51256 10.0732 5.98744 10.0732 6.28033 9.7803L10.7803 5.28033Z";
const CROIX = "M3.73657 3.73657C4.05199 3.42114 4.56339 3.42114 4.87881 3.73657L5.93941 4.79716L7 5.85775L9.12117 3.73657C9.4366 3.42114 9.94801 3.42114 10.2634 3.73657C10.5789 4.05199 10.5789 4.56339 10.2634 4.87881L8.14225 7L10.2634 9.12118C10.5789 9.4366 10.5789 9.94801 10.2634 10.2634C9.94801 10.5789 9.4366 10.5789 9.12117 10.2634L7 8.14225L4.87881 10.2634C4.56339 10.5789 4.05199 10.5789 3.73657 10.2634C3.42114 9.94801 3.42114 9.4366 3.73657 9.12118L4.79716 8.06059L5.85775 7L3.73657 4.87881C3.42114 4.56339 3.42114 4.05199 3.73657 3.73657Z";
const COULEUR_STATUT: Record<StatutLor, string> = { attente: "var(--lor-planifie)", planifie: "var(--lor-planifie)", cours: "var(--lor-cours)", fait: "var(--lor-fait)", annule: "var(--lor-annule)" };
export function IconeStatutLor({ statut, part, titre, className }: P & { statut: StatutLor; part: number }) {
  const id = useId().replace(/:/g, "");
  const c = COULEUR_STATUT[statut];
  const clos = statut === "fait" || statut === "annule";
  const p = clos ? 1 : Math.max(0, Math.min(1, part));
  return (
    <svg width="16" height="16" viewBox="-1 -1 16 16" fill="none" stroke="none" className={className} {...aria(titre)}>
      <path d={HEXAGONE} stroke={c} strokeWidth="1.5" strokeLinejoin="bevel" strokeDasharray={statut === "attente" ? "1.65 1.35" : "3.14 0"} strokeDashoffset={statut === "attente" ? "2.3" : "1"} fill="none" />
      <g mask={`url(#${id}-trou)`}>
        <circle r="4" cx="7" cy="7" stroke={c} fill="none" strokeWidth="8" strokeDasharray={`${(25.12 * p).toFixed(3)} 25.12`} transform="rotate(-90) translate(-14, 0)" />
      </g>
      <mask id={`${id}-trou`} maskUnits="userSpaceOnUse">
        <path transform={clos ? "translate(-7.5, -7.5) scale(1.8)" : "translate(-1, -1)"} d={TROU} fill="white" />
        {statut === "fait" ? <path stroke="none" fill="black" d={COCHE} /> : statut === "annule" ? <path stroke="none" fill="black" d={CROIX} /> : null}
      </mask>
    </svg>
  );
}

/* ——— date cible : calendrier, ou calendrier barré en rouge quand elle est passée ——— */
export function IconeCalendrierLor({ passe, titre, className }: P & { passe?: boolean }) {
  if (passe) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--lor-retard)" className={className} {...aria(titre)}>
        <path d="M11 1C13.2091 1 15 2.79086 15 5V6.25C15 6.66421 14.6642 7 14.25 7C13.8358 7 13.5 6.66421 13.5 6.25V6H2.5V11C2.5 12.3807 3.61929 13.5 5 13.5H6.25C6.66421 13.5 7 13.8358 7 14.25C7 14.6642 6.66421 15 6.25 15H5C2.79086 15 1 13.2091 1 11V5C1 2.79086 2.79086 1 5 1H11ZM9.53033 8.46967L11.5 10.4393L13.4697 8.46967C13.7626 8.17678 14.2374 8.17678 14.5303 8.46967C14.8232 8.76256 14.8232 9.23744 14.5303 9.53033L12.5607 11.5L14.5303 13.4697C14.8232 13.7626 14.8232 14.2374 14.5303 14.5303C14.2374 14.8232 13.7626 14.8232 13.4697 14.5303L11.5 12.5607L9.53033 14.5303C9.23744 14.8232 8.76256 14.8232 8.46967 14.5303C8.17678 14.2374 8.17678 13.7626 8.46967 13.4697L10.4393 11.5L8.46967 9.53033C8.17678 9.23744 8.17678 8.76256 8.46967 8.46967C8.76256 8.17678 9.23744 8.17678 9.53033 8.46967Z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--lor-t3)" className={className} {...aria(titre)}>
      <path d="M11 1C13.2091 1 15 2.79086 15 5V11C15 13.2091 13.2091 15 11 15H5C2.79086 15 1 13.2091 1 11V5C1 2.79086 2.79086 1 5 1H11ZM13.5 6H2.5V11C2.5 12.3807 3.61929 13.5 5 13.5H11C12.3807 13.5 13.5 12.3807 13.5 11V6Z" />
    </svg>
  );
}

/* ——— jalon : le losange de Linear ——— */
export function IconeJalon({ titre, className }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} {...aria(titre)}>
      <path d="M7.3406 2.32C7.68741 1.89333 8.31259 1.89333 8.6594 2.32L12.7903 7.402C13.0699 7.74597 13.0699 8.25403 12.7903 8.598L8.6594 13.68C8.31259 14.1067 7.68741 14.1067 7.3406 13.68L3.2097 8.598C2.9301 8.25403 2.9301 7.74597 3.2097 7.402L7.3406 2.32Z" fill="none" stroke="var(--lor-cours)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* ——— « No lead » : la silhouette en pointillés ——— */
export function IconeSansResponsable({ titre, className }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--lor-t3)" className={className} {...aria(titre)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.25 6.75C10.25 7.99264 9.24264 9 8 9C6.75736 9 5.75 7.99264 5.75 6.75C5.75 5.50736 6.75736 4.5 8 4.5C9.24264 4.5 10.25 5.50736 10.25 6.75Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M8.5752 10C9.97242 10 11.2611 10.6106 12.1436 11.6143C12.1563 11.5997 12.17 11.586 12.1826 11.5713C12.4518 11.2567 12.9255 11.2202 13.2402 11.4893C13.5548 11.7585 13.5913 12.2321 13.3223 12.5469C13.0953 12.8123 12.8478 13.0593 12.584 13.2881C12.5484 13.3246 12.5106 13.3593 12.4668 13.3887C11.3913 14.2811 10.0437 14.8571 8.56738 14.9756C8.56118 14.9762 8.55508 14.978 8.54883 14.9785C8.51409 14.9812 8.4792 14.9822 8.44434 14.9844C8.38882 14.9879 8.3332 14.991 8.27734 14.9932C8.18529 14.9968 8.09287 15 8 15C7.90681 15 7.81406 14.9968 7.72168 14.9932C7.66583 14.991 7.6102 14.9879 7.55469 14.9844C7.52015 14.9822 7.48558 14.9812 7.45117 14.9785C7.44459 14.978 7.43816 14.9763 7.43164 14.9756C5.94988 14.8564 4.59683 14.2772 3.51953 13.3789C3.50616 13.3677 3.49384 13.3556 3.48145 13.3438C3.47213 13.3365 3.46218 13.33 3.45312 13.3223C3.17492 13.0844 2.91561 12.8251 2.67773 12.5469C2.40865 12.2321 2.44515 11.7585 2.75977 11.4893C3.07452 11.2202 3.54818 11.2567 3.81738 11.5713C3.83028 11.5864 3.84339 11.6013 3.85645 11.6162C4.73898 10.612 6.02721 10.0001 7.4248 10H8.5752ZM7.4248 11.5C6.47086 11.5001 5.59107 11.9168 4.9873 12.6016C5.85267 13.1696 6.88689 13.5 8 13.5C9.11327 13.5 10.1472 13.1687 11.0127 12.6006C10.4088 11.9164 9.52878 11.5 8.5752 11.5H7.4248Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M1.82715 6.76172C2.24007 6.79385 2.54868 7.15444 2.5166 7.56738C2.50553 7.70999 2.5 7.85427 2.5 8C2.5 8.14573 2.50553 8.29001 2.5166 8.43262C2.54868 8.84556 2.24007 9.20615 1.82715 9.23828C1.41418 9.27036 1.05357 8.9618 1.02148 8.54883C1.00741 8.36759 1 8.18457 1 8C1 7.81543 1.00741 7.63241 1.02148 7.45117C1.05357 7.0382 1.41418 6.72964 1.82715 6.76172Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M14.1729 6.76172C14.5858 6.72964 14.9464 7.0382 14.9785 7.45117C14.9926 7.63241 15 7.81543 15 8C15 8.18457 14.9926 8.36759 14.9785 8.54883C14.9464 8.9618 14.5858 9.27036 14.1729 9.23828C13.7599 9.20615 13.4513 8.84556 13.4834 8.43262C13.4945 8.29001 13.5 8.14573 13.5 8C13.5 7.85427 13.4945 7.70999 13.4834 7.56738C13.4513 7.15444 13.7599 6.79385 14.1729 6.76172Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M3.45312 2.67773C3.76789 2.40865 4.24155 2.44515 4.51074 2.75977C4.77982 3.07452 4.74329 3.54818 4.42871 3.81738C4.20954 4.00475 4.00475 4.20954 3.81738 4.42871C3.54818 4.74329 3.07452 4.77982 2.75977 4.51074C2.44515 4.24155 2.40865 3.76789 2.67773 3.45312C2.91561 3.17492 3.17492 2.91561 3.45312 2.67773Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M11.4893 2.75977C11.7585 2.44515 12.2321 2.40865 12.5469 2.67773C12.8251 2.91561 13.0844 3.17492 13.3223 3.45312C13.5913 3.76789 13.5548 4.24155 13.2402 4.51074C12.9255 4.77982 12.4518 4.74329 12.1826 4.42871C11.9953 4.20954 11.7905 4.00475 11.5713 3.81738C11.2567 3.54818 11.2202 3.07452 11.4893 2.75977Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M8 1C8.18457 1 8.36759 1.00741 8.54883 1.02148C8.9618 1.05357 9.27036 1.41418 9.23828 1.82715C9.20615 2.24007 8.84556 2.54868 8.43262 2.5166C8.29001 2.50553 8.14573 2.5 8 2.5C7.85427 2.5 7.70999 2.50553 7.56738 2.5166C7.15444 2.54868 6.79385 2.24007 6.76172 1.82715C6.72964 1.41418 7.0382 1.05357 7.45117 1.02148C7.63241 1.00741 7.81543 1 8 1Z" />
    </svg>
  );
}

/* ——— courbe de progression 32 × 16 : le réalisé (violet) et le prévu (gris à 88/255) ——— */
export function CourbeLor({ part, prevu }: { part: number; prevu: number }) {
  /* Linear trace la droite du réalisé de (0,16) jusqu'au jour présent, la courbe du prévu jusqu'à la date cible */
  const x = Math.max(0, Math.min(32, 32 * prevu));
  const y = 16 - 16 * Math.max(0, Math.min(1, part));
  const xp = x.toFixed(3);
  return (
    <svg width="32" height="16" aria-hidden="true">
      <rect width="32" height="16" fill="transparent" />
      <g>
        <path d={`M0,16L${xp},${y.toFixed(3)}`} fill="none" strokeWidth="1.25" stroke="var(--lor-fait)" />
        <path d={`M0,16C${(x / 3).toFixed(3)},8,${((2 * x) / 3).toFixed(3)},0,${xp},0C${(x + (32 - x) / 3).toFixed(3)},0,${(x + (2 * (32 - x)) / 3).toFixed(3)},0,32,0`} fill="none" strokeWidth="1.25" stroke="var(--lor-t3)" strokeOpacity="0.533" />
      </g>
    </svg>
  );
}

/* ——— flèche de tri 12 × 12 des en-têtes de colonne (vers le bas ; retournée pour l'ordre croissant) ——— */
export function IconeTri({ montant, className }: P & { montant?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" className={className} aria-hidden="true" style={montant ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M11.5361 10.2745C11.8024 10.0029 11.8249 9.56807 11.5762 9.26961C11.3275 8.97139 10.8961 8.91526 10.5811 9.12801L10.5195 9.17391L8.00001 11.2735L5.48048 9.17391L5.41895 9.12801C5.10388 8.91526 4.67252 8.97139 4.42384 9.26961C4.17512 9.56807 4.19758 10.0029 4.46387 10.2745L4.51954 10.3263L7.51954 12.8263C7.79767 13.058 8.20234 13.058 8.48048 12.8263L11.4805 10.3263L11.5361 10.2745Z" />
      <path d="M8.75 12.25C8.75 12.6642 8.41421 13 8 13C7.58579 13 7.25 12.6642 7.25 12.25L7.25 3.75C7.25 3.33579 7.58579 3 8 3C8.41421 3 8.75 3.33579 8.75 3.75V12.25Z" />
    </svg>
  );
}

/* ——— 02/11/2026 : les icônes de la page d'un ticket, tirées du bundle de Linear (./lor-icones-linear.ts) ——— */
export function IconeLin({ nom, taille = 16, vue = 16, titre, className, couleur }: P & { nom: NomLin; taille?: number; vue?: number; couleur?: string }) {
  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${vue} ${vue}`} fill={couleur ?? "currentColor"} className={className} {...aria(titre)}>
      {LIN[nom].map(([d, pair], i) => (pair ? <path key={i} d={d} fillRule="evenodd" clipRule="evenodd" /> : <path key={i} d={d} />))}
    </svg>
  );
}

/* l'étoile (Add to favorites) et les points « … » : releves/linear-commun/icones-en-ligne.md */
export function IconePoints({ titre, className }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} {...aria(titre)}>
      <path d="M3 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
    </svg>
  );
}

/* le statut d'un ticket 14 × 14 (Hnt de Linear) : triage, backlog, à faire et en cours (anneau et part), fait, doublon, annulé */
export type StatutTicket = "triage" | "backlog" | "afaire" | "encours" | "fait" | "doublon" | "annule";
export const COULEUR_TICKET: Record<StatutTicket, string> = {
  triage: "#fc7840",
  backlog: "var(--lor-annule)",
  afaire: "var(--lor-planifie)",
  encours: "var(--lor-cours)",
  fait: "var(--lor-fait)",
  doublon: "var(--lor-annule)",
  annule: "var(--lor-annule)",
};
export function IconeStatutTicket({ statut, part = 0.5, titre, className }: P & { statut: StatutTicket; part?: number }) {
  const c = COULEUR_TICKET[statut];
  if (statut === "afaire" || statut === "encours") {
    /* ZE : l'anneau 12 × 12 (trait 1,5) et une part de disque de rayon 3,5 */
    const i = 3.5;
    const a = 360 * (statut === "afaire" ? 0 : part);
    const o = a > 180 ? 360 - a : a;
    const s = (o * Math.PI) / 180;
    const corde = Math.sqrt(2 * i * i - 2 * i * i * Math.cos(s));
    const l = o <= 90 ? i * Math.sin(s) : i * Math.sin(((180 - o) * Math.PI) / 180);
    const u = Math.sqrt(Math.max(0, corde * corde - l * l));
    const [d, f] = a <= 180 ? [i + l, 0] : [i - l, 1];
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} {...aria(titre)}>
        <rect x="1" y="1" width="12" height="12" rx="6" stroke={c} strokeWidth="1.5" fill="none" />
        <path fill={c} stroke="none" d={`M ${i},${i} L${i},0 A${i},${i} 0 ${f},1 ${d}, ${u} z`} transform={`translate(${i},${i})`} />
      </svg>
    );
  }
  const nom: NomLin = statut === "triage" ? "statutTriage" : statut === "backlog" ? "statutBacklog" : statut === "fait" ? "statutFait" : statut === "doublon" ? "statutDoublon" : "statutAnnule";
  return <IconeLin nom={nom} taille={14} vue={14} couleur={c} titre={titre} className={className} />;
}
