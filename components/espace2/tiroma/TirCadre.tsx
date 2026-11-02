"use client";

/* TIROMA — les briques communes des copies 1:1 de Linear (02/11/2026) :
   la carte `main`, le menu de Linear (options, sous-menus, cases) et
   l'avatar rond. Styles : ./tir.css. Mesures : linear-home.md (carte, menu
   « … »), linear-my-issues.md (avatar 18). */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TirIcone, type NomTirIcone } from "./TirIcone";
import "./tir.css";

export function TirCarte({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`tir${className ? ` ${className}` : ""}`}>
      <div className="tir-carte">{children}</div>
    </div>
  );
}

export type OptionMenu =
  | "sep"
  | { titre: string }
  | {
      libelle: string;
      icone?: NomTirIcone;
      couleur?: string;
      href?: string;
      action?: () => void;
      coche?: boolean;
      desactive?: boolean;
      danger?: boolean;
      sous?: OptionMenu[];
      raccourci?: string;
    };

function Options({ options, fermer }: { options: OptionMenu[]; fermer: () => void }) {
  const [ouverte, setOuverte] = useState<number | null>(null);
  return (
    <>
      {options.map((o, i) => {
        if (o === "sep") return <div key={i} className="tir-menu-sep" role="separator" />;
        if ("titre" in o) return <div key={i} className="tir-menu-titre">{o.titre}</div>;
        const contenu = (
          <>
            {o.coche !== undefined ? (
              <span className="tir-menu-case" data-coche={o.coche ? "" : undefined} aria-hidden="true">
                {o.coche ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.2 4.1 7.3 8 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
              </span>
            ) : null}
            {o.icone ? <TirIcone nom={o.icone} style={o.couleur ? { color: o.couleur } : undefined} /> : null}
            <span className="tir-menu-libelle">{o.libelle}</span>
            {o.raccourci ? <kbd className="tir-menu-kbd">{o.raccourci}</kbd> : null}
            {o.sous ? <TirIcone nom="Chevron" taille={14} className="tir-menu-fleche" /> : null}
          </>
        );
        if (o.sous) {
          return (
            <div key={i} className="tir-menu-sousbloc" onMouseEnter={() => setOuverte(i)} onMouseLeave={() => setOuverte((v) => (v === i ? null : v))}>
              <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={ouverte === i} className="tir-menu-option" data-actif={ouverte === i ? "" : undefined} onClick={() => setOuverte((v) => (v === i ? null : i))}>
                {contenu}
              </button>
              {ouverte === i ? (
                <div className="tir-menu tir-menu--sous" role="menu" aria-label={o.libelle}>
                  <Options options={o.sous} fermer={fermer} />
                </div>
              ) : null}
            </div>
          );
        }
        if (o.href) {
          return (
            <Link key={i} href={o.href} role="menuitem" className="tir-menu-option" onClick={fermer}>
              {contenu}
            </Link>
          );
        }
        return (
          <button
            key={i}
            type="button"
            role={o.coche !== undefined ? "menuitemcheckbox" : "menuitem"}
            aria-checked={o.coche !== undefined ? o.coche : undefined}
            className="tir-menu-option"
            data-danger={o.danger ? "" : undefined}
            disabled={o.desactive}
            onClick={() => {
              if (o.coche === undefined) fermer();
              o.action?.();
            }}
          >
            {contenu}
          </button>
        );
      })}
    </>
  );
}

/* Le menu s'ouvre sous le bouton, 4 px plus bas, sans animation (relevé :
   apparition immédiate). Échap ou un clic dehors le referme. */
export function TirMenu({
  libelle,
  options,
  icone = "Points",
  alignement = "gauche",
  declencheur,
  classeBouton = "tir-rond",
  largeur,
}: {
  libelle: string;
  options: OptionMenu[];
  icone?: NomTirIcone;
  alignement?: "gauche" | "droite";
  declencheur?: React.ReactNode;
  classeBouton?: string;
  largeur?: number;
}) {
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
    <div ref={boite} className="tir-menu-ancre" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={classeBouton}
        aria-label={libelle}
        title={libelle}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        onClick={(e) => {
          e.preventDefault();
          setOuvert((o) => !o);
        }}
      >
        {declencheur ?? <TirIcone nom={icone} />}
      </button>
      {ouvert ? (
        <div className="tir-menu" role="menu" aria-label={libelle} style={{ ...(alignement === "gauche" ? { top: "calc(100% + 4px)", left: 0 } : { top: "calc(100% + 4px)", right: 0 }), ...(largeur ? { minWidth: largeur } : {}) }}>
          <Options options={options} fermer={() => setOuvert(false)} />
        </div>
      ) : null}
    </div>
  );
}

const TEINTES_AVATAR = ["lch(48 59.31 288.43)", "lch(60.135 63.97 86.502)", "rgb(38, 181, 206)", "rgb(76, 183, 130)", "rgb(235, 87, 87)", "lch(67.969 19.321 31.72)"];

export function initiales(nom: string | null | undefined): string {
  const mots = (nom ?? "").replace(/^Dr\.?\s+/i, "").split(/[\s-]+/).filter(Boolean);
  return ((mots[0]?.[0] ?? "") + (mots[1]?.[0] ?? "")).toUpperCase() || "·";
}

/* avatar 18×18 r 50 % (linear-my-issues.md) ; sans personne : l'icône « non assigné » */
export function TirAvatar({ nom, taille = 18 }: { nom: string | null | undefined; taille?: number }) {
  if (!nom) return <TirIcone nom="Unassigned" taille={taille} className="tir-avatar-vide" />;
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span className="tir-avatar" title={nom} style={{ width: taille, height: taille, background: TEINTES_AVATAR[h % TEINTES_AVATAR.length] }} aria-label={nom}>
      {initiales(nom)}
    </span>
  );
}
