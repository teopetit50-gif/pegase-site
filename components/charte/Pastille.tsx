import type { ReactNode } from "react";

/* La pastille de l'accueil (`.platform-eyebrow`) ; `sombre` : le badge
   arrondi des tarifs (`.pr-tag`). */
export default function Pastille({ children, ton = "neutre" }: { children: ReactNode; ton?: "neutre" | "sombre" }) {
  return <span className={`ch-pastille ${ton === "sombre" ? "ch-pastille--sombre" : ""}`}>{children}</span>;
}
