"use client";

/* VARELO — les briques communes des copies 1:1 de Plain (02/11/2026) : menu déroulant
   (role=menu, 10 de rayon, options de 28) et popover (Display). Styles : ./var-plain.css. */

import { useEffect, useRef, useState } from "react";
import { PlainIcone, type NomPlainIcone } from "./PlainIcone";

/* ouvre et ferme : Échap ou un clic dehors referment */
export function useOuvert<T extends HTMLElement>() {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<T>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return { ouvert, setOuvert, boite };
}

export type OptionPlain = { libelle: string; icone?: NomPlainIcone; coche?: boolean; desactive?: boolean; action: () => void } | "sep";

export function MenuPlain({ options, style, onFermer, libelle }: { options: OptionPlain[]; style: React.CSSProperties; onFermer: () => void; libelle: string }) {
  return (
    <div className="var-p-menu" role="menu" aria-label={libelle} style={style}>
      {options.map((o, i) =>
        o === "sep" ? (
          <div key={i} className="var-p-menu-sep" role="separator" />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            className="var-p-menu-option"
            disabled={o.desactive}
            onClick={() => {
              onFermer();
              o.action();
            }}
          >
            {o.icone ? <PlainIcone nom={o.icone} /> : null}
            <span>{o.libelle}</span>
            {o.coche ? <PlainIcone nom="Coche" className="var-p-coche" /> : null}
          </button>
        ),
      )}
    </div>
  );
}

/* les raccourcis d'une lettre (F, V…), hors des champs de saisie */
export function useTouche(touche: string, faire: () => void) {
  useEffect(() => {
    const ecoute = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== touche.toLowerCase()) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      /* la coquille ouvre la palette sur F (écouteur sur window) : la page garde sa touche */
      e.stopPropagation();
      faire();
    };
    document.addEventListener("keydown", ecoute);
    return () => document.removeEventListener("keydown", ecoute);
  }, [touche, faire]);
}
