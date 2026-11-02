/* Les icônes de projet de Linear (santé, statut, priorité), telles que relevées dans
   linear-projects.md (02/11/2026) : partagées par la frise des chantiers et la fiche d'un
   chantier. Couleurs de santé : ./dal-projet.css. */

import type { StatutChantier } from "@/components/espace/daliro/types";
import "./dal-projet.css";

export const NOM_PRIORITE = ["Aucune urgence", "Urgent", "Haute", "Moyenne", "Basse"];

export function IconeSante({ etat }: { etat: "off" | "risk" | "on" | null }) {
  if (!etat) return <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle r="7.5" cx="8" cy="8" fill="none" strokeWidth="1" strokeDasharray="2.36 2.36" strokeLinecap="round" stroke="var(--dal-sante-vide)" /></svg>;
  const c = `var(--dal-sante-${etat})`;
  const d =
    etat === "on"
      ? "M12.6807 5.7029C12.9925 5.97566 13.0241 6.44948 12.7513 6.76121L9.71942 10.2263C9.56569 10.402 9.33892 10.4961 9.10596 10.4808C8.873 10.4656 8.66044 10.3427 8.53094 10.1485L6.76432 7.49855L4.37742 10.2263C4.10466 10.5381 3.63083 10.5696 3.31911 10.2969C3.00739 10.0241 2.97581 9.55028 3.24857 9.23856L6.28056 5.77356C6.43429 5.59788 6.66106 5.50379 6.89401 5.51905C7.12696 5.53432 7.33952 5.65718 7.46902 5.85142L9.23562 8.50133L11.6224 5.77347C11.8952 5.46174 12.369 5.43015 12.6807 5.7029Z"
      : etat === "off"
        ? "M12.6807 10.297C12.9925 10.0242 13.0241 9.5504 12.7513 9.23866L9.71942 5.77356C9.56569 5.59786 9.33892 5.50377 9.10596 5.51903C8.873 5.53429 8.66044 5.65716 8.53094 5.8514L6.76432 8.50133L4.37742 5.77354C4.10466 5.46182 3.63083 5.43024 3.31911 5.703C3.00739 5.97577 2.97581 6.44959 3.24857 6.76132L6.28056 10.2263C6.43429 10.402 6.66106 10.4961 6.89401 10.4808C7.12696 10.4656 7.33952 10.3427 7.46902 10.1485L9.23562 7.49855L11.6224 10.2264C11.8952 10.5381 12.369 10.5697 12.6807 10.297Z"
        : "M9.62562 3.8314C9.85957 3.7977 10.0957 3.87627 10.2628 4.04341L12.5728 6.35341C12.8657 6.6463 12.8657 7.12117 12.5728 7.41407C12.28 7.70696 11.8051 7.70696 11.5122 7.41407L9.91096 5.81284L6.92594 11.2854C6.81276 11.4929 6.60838 11.6349 6.37442 11.6686C6.14047 11.7023 5.90433 11.6237 5.73719 11.4566L3.42719 9.14657C3.1343 8.85367 3.1343 8.3788 3.42719 8.08591C3.72008 7.79301 4.19496 7.79301 4.48785 8.08591L6.08908 9.68714L9.0741 4.2146C9.18728 4.00709 9.39166 3.86509 9.62562 3.8314Z";
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle r="8" cx="8" cy="8" fill={c} fillOpacity="0.25" />
      <path d={d} fill={c} />
    </svg>
  );
}

/* statut de projet : l'hexagone, rempli à proportion de l'avancement */
export function IconeStatut({ statut, pct }: { statut: StatutChantier; pct: number }) {
  const fait = statut === "receptionne" || statut === "clos";
  const annule = statut === "annule";
  const c = annule ? "#8A8F98" : fait ? "lch(48 59.31 288.43)" : statut === "preparation" ? "#D7D8DB" : "lch(80 90 85)";
  const p = fait ? 100 : Math.max(0, Math.min(100, pct));
  return (
    <svg width="16" height="16" viewBox="-1 -1 16 16" aria-hidden="true">
      <path d="M2.95778 3.02069L5.70777 1.36023C6.50244 0.88041 7.49756 0.88041 8.29223 1.36024L11.0422 3.02074C11.7918 3.47336 12.25 4.2852 12.25 5.16086V8.84803C12.25 9.7251 11.7904 10.5381 11.0388 10.9902L8.29114 12.6433C7.49693 13.1211 6.50355 13.1203 5.71011 12.6412L2.95775 10.9792C2.20815 10.5266 1.75 9.7148 1.75 8.83911V5.16082C1.75 4.28516 2.20816 3.47332 2.95778 3.02069Z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="bevel" strokeDasharray={statut === "preparation" && p === 0 ? "1.4 1.74" : undefined} />
      {p > 0 ? <circle r="2" cx="7" cy="7" fill="none" stroke={c} strokeWidth="4" strokeDasharray={`${(12.566 * p) / 100} 12.566`} transform="rotate(-90 7 7)" /> : null}
    </svg>
  );
}

export function IconePriorite({ n }: { n: 0 | 1 | 2 | 3 | 4 }) {
  if (n === 1)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="lch(66 80 48)">
        <path d="M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z" />
      </svg>
    );
  if (n === 0)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
        <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
        <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
        <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <rect x="1.5" y="8" width="3" height="6" rx="1" />
      <rect x="6.5" y="5" width="3" height="9" rx="1" fillOpacity={n >= 4 ? 0.4 : 1} />
      <rect x="11.5" y="2" width="3" height="12" rx="1" fillOpacity={n >= 3 ? 0.4 : 1} />
    </svg>
  );
}
