/* Le surtitre des sections : un trait de 32 px puis le mot, en gris. La
   source le répétait tel quel dans six sections ; `mono` est la variante
   de la section Formules (police mono, sans graisse moyenne). */
import type { ReactNode } from "react";

export function Surtitre({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return (
    <span
      className={`mb-6 inline-flex items-center gap-3 text-sm text-slate-500 ${mono ? "font-mono" : "font-medium"}`}
    >
      <span className="h-px w-8 bg-slate-300" />
      {children}
    </span>
  );
}

/* La pastille « perle » (vert d'eau mat depuis le 24/09) des surtitres centrés (Écrans, Pourquoi
   Tiroma, Avant / après) : mono, capitales, espacée. */
export function SurtitrePerle({ children, className = "mb-6" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`dentaire-perle inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}
