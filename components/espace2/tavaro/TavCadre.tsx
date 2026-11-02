"use client";

/* TAVARO — les briques communes des copies 1:1 de Linear (01/11/2026) :
   la carte `main` et le menu « … » (Team actions, linear-home.md).
   Styles : ./tav.css. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TavIcone, type NomTavIcone } from "./TavIcone";
import "./tav.css";

export function TavCarte({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`tav${className ? ` ${className}` : ""}`}>
      <div className="tav-carte">{children}</div>
    </div>
  );
}

export type OptionMenu = { libelle: string; icone: NomTavIcone; href?: string; action?: () => void } | "sep";

/* Le menu s'ouvre sous le bouton, aligné à gauche, 4 px plus bas ; pas
   d'animation (relevé : apparition immédiate). Échap ou un clic dehors le
   referme. */
export function TavMenu({ libelle, options, icone = "Points", alignement = "gauche" }: { libelle: string; options: OptionMenu[]; icone?: NomTavIcone; alignement?: "gauche" | "droite" }) {
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
      <button type="button" className="tav-rond" aria-label={libelle} title={libelle} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <TavIcone nom={icone} />
      </button>
      {ouvert ? (
        <div className="tav-menu" role="menu" aria-label={libelle} style={alignement === "gauche" ? { top: 32, left: 0 } : { top: 32, right: 0 }}>
          {options.map((o, i) =>
            o === "sep" ? (
              <div key={i} className="tav-menu-sep" role="separator" />
            ) : o.href ? (
              <Link key={i} href={o.href} role="menuitem" className="tav-menu-option" onClick={() => setOuvert(false)}>
                <TavIcone nom={o.icone} />
                <span>{o.libelle}</span>
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                className="tav-menu-option"
                onClick={() => {
                  setOuvert(false);
                  o.action?.();
                }}
              >
                <TavIcone nom={o.icone} />
                <span>{o.libelle}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/* Le filtre d'agence (B07), valable pour toutes les sous-pages (inventaire § 8.3-5).
   Dans la vue d'ensemble, il prend la place de la puce « Members » de Linear :
   avatar 18 + chevron 14 dans une puce 26 de haut ; un clic ouvre le menu de
   Linear (même boîte que « … »), une entrée par agence. */
export function TavAgences({ agences, agence, setAgence }: { agences: { id: string; entite_id: string; code: string; nom?: string }[]; agence: string | null; setAgence: (e: string | null) => void }) {
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
  const court = (a: { code: string; nom?: string }) => (a.nom ?? a.code).split(" — ").pop() ?? a.code;
  const choisie = agences.find((a) => a.entite_id === agence) ?? null;
  const initiales = choisie ? choisie.code.slice(0, 2).toUpperCase() : "TO";
  return (
    <div ref={boite} style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" className="tav-h-membre" aria-haspopup="menu" aria-expanded={ouvert} title={choisie ? court(choisie) : "Toutes les agences"} onClick={() => setOuvert((o) => !o)}>
        <span className="tav-h-avatar">{initiales}</span>
        <span className="v2-sr">{choisie ? court(choisie) : "Toutes les agences"}</span>
        <TavIcone nom="Chevron" taille={14} style={{ transform: "rotate(90deg)" }} />
      </button>
      {ouvert ? (
        <div className="tav-menu" role="menu" aria-label="Filtrer par agence" style={{ top: 30, left: -4 }}>
          {[{ cle: null as string | null, libelle: "Toutes les agences" }, ...agences.map((a) => ({ cle: a.entite_id as string | null, libelle: court(a) }))].map((o) => (
            <button
              key={o.cle ?? "toutes"}
              type="button"
              role="menuitemradio"
              aria-checked={agence === o.cle}
              className="tav-menu-option"
              onClick={() => {
                setOuvert(false);
                setAgence(o.cle);
              }}
            >
              <TavIcone nom={agence === o.cle ? "IssueStatusDone" : "Team"} />
              <span>{o.libelle}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
