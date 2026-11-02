"use client";

/* DALIRO — les briques communes des copies 1:1 de Linear (01/11/2026) :
   la carte `main` et le menu « … » (Team actions, linear-home.md).
   Styles : ./dal.css. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import "./dal.css";

export function DalCarte({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`dal${className ? ` ${className}` : ""}`}>
      <div className="dal-carte">{children}</div>
    </div>
  );
}

export type OptionMenu = { libelle: string; icone: NomDalIcone; href?: string; action?: () => void } | "sep";

/* Le menu s'ouvre sous le bouton, aligné à gauche, 4 px plus bas ; pas
   d'animation (relevé : apparition immédiate). Échap ou un clic dehors le
   referme. */
export function DalMenu({ libelle, options, icone = "Points", alignement = "gauche" }: { libelle: string; options: OptionMenu[]; icone?: NomDalIcone; alignement?: "gauche" | "droite" }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
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
  return (
    <div ref={boite} style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" className="dal-rond" aria-label={libelle} title={libelle} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <DalIcone nom={icone} />
      </button>
      {ouvert ? (
        <div className="dal-menu" role="menu" aria-label={libelle} style={alignement === "gauche" ? { top: 32, left: 0 } : { top: 32, right: 0 }}>
          {options.map((o, i) =>
            o === "sep" ? (
              <div key={i} className="dal-menu-sep" role="separator" />
            ) : o.href ? (
              <Link key={i} href={o.href} role="menuitem" className="dal-menu-option" onClick={() => setOuvert(false)}>
                <DalIcone nom={o.icone} />
                <span>{o.libelle}</span>
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                className="dal-menu-option"
                onClick={() => {
                  setOuvert(false);
                  o.action?.();
                }}
              >
                <DalIcone nom={o.icone} />
                <span>{o.libelle}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
