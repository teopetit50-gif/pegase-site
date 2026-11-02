"use client";

/* TAMILA — les briques communes des copies 1:1 (02/11/2026) :
   la carte `main` de Linear, son menu « … » (linear-home.md, Team actions),
   et la carte `main` de Plain (plain-commun.md). Styles : ./tam.css, ./tamp.css. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TamIcone, type NomTamIcone } from "./TamIcone";
import "./tam.css";
import "./tamp.css";

export function TamCarte({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`tam${className ? ` ${className}` : ""}`}>
      <div className="tam-carte">{children}</div>
    </div>
  );
}

export function PlainCarte({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`tamp${className ? ` ${className}` : ""}`}>
      <main className="tamp-carte">{children}</main>
    </div>
  );
}

export type OptionMenu = { libelle: string; icone: NomTamIcone; href?: string; action?: () => void; desactive?: boolean } | "sep";

/* Un menu ouvert : sous le bouton, 4 px plus bas, sans animation (relevé :
   apparition immédiate). Échap ou un clic dehors le referme. */
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

export function TamMenu({ libelle, options, icone = "Points", alignement = "gauche", classe = "tam-rond", enfants }: { libelle: string; options: OptionMenu[]; icone?: NomTamIcone; alignement?: "gauche" | "droite"; classe?: string; enfants?: React.ReactNode }) {
  const { ouvert, setOuvert, boite } = useOuvert<HTMLDivElement>();
  return (
    <div ref={boite} style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" className={classe} aria-label={libelle} title={libelle} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        {enfants ?? <TamIcone nom={icone} />}
      </button>
      {ouvert ? (
        <div className="tam-menu" role="menu" aria-label={libelle} style={alignement === "gauche" ? { top: 32, left: 0 } : { top: 32, right: 0 }}>
          {options.map((o, i) =>
            o === "sep" ? (
              <div key={i} className="tam-menu-sep" role="separator" />
            ) : o.href ? (
              <Link key={i} href={o.href} role="menuitem" className="tam-menu-option" onClick={() => setOuvert(false)}>
                <TamIcone nom={o.icone} />
                <span>{o.libelle}</span>
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                className="tam-menu-option"
                disabled={o.desactive}
                onClick={() => {
                  setOuvert(false);
                  o.action?.();
                }}
              >
                <TamIcone nom={o.icone} />
                <span>{o.libelle}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/* L'avatar rond de Linear (18×18, r 50 %) : les initiales sur une teinte tirée du nom. */
export function Avatar({ nom, taille = 18 }: { nom: string | null; taille?: number }) {
  if (!nom) return <TamIcone nom="Unassigned" taille={taille} className="tam-sans-avatar" />;
  const initiales = nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("");
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="tam-avatar" style={{ width: taille, height: taille, background: `lch(55 45 ${h})`, fontSize: Math.round(taille * 0.45) }} title={nom} aria-label={nom}>
      {initiales}
    </span>
  );
}
