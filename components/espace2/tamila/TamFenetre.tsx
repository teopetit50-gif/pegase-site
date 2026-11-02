"use client";

/* TAMILA — la fenêtre d'un geste (02/11/2026). Les gestes des métiers qui n'ont pas de place dans la page de
   référence (ouvrir un dossier, poser un délai, décider…) passent par une fenêtre, comme Linear range les siens
   (« New issue », boîtes « Add link to initiative » de linear-initiative.md : champs, « Cancel » / bouton
   principal). Habillage : les jetons du menu de Linear (fond, bord 0,5, ombre, r 12) ; la fenêtre elle-même n'a
   pas été relevée : écart écrit dans REFERENCES-TAMILA.md. Échap ou « Annuler » referme sans rien écrire. */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function TamFenetre({ titre, sous, ouverte, fermer, children, pied, large }: { titre: string; sous?: React.ReactNode; ouverte: boolean; fermer: () => void; children: React.ReactNode; pied?: React.ReactNode; large?: boolean }) {
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouverte) return;
    const echap = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("keydown", echap);
    const t = window.setTimeout(() => boite.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", echap);
      window.clearTimeout(t);
    };
  }, [ouverte, fermer]);
  if (!ouverte || typeof document === "undefined") return null;
  const racine = document.querySelector(".v2") ?? document.body;
  return createPortal(
    <div className="tam tam-voile" onMouseDown={(e) => e.target === e.currentTarget && fermer()}>
      <div ref={boite} className={`tam-fenetre${large ? " tam-fenetre--large" : ""}`} role="dialog" aria-modal="true" aria-label={titre}>
        <div className="tam-fenetre-tete">
          <h2>{titre}</h2>
          {sous ? <p>{sous}</p> : null}
        </div>
        <div className="tam-fenetre-corps">{children}</div>
        <div className="tam-fenetre-pied">
          <button type="button" className="tam-bouton" onClick={fermer}>
            Annuler
          </button>
          {pied}
        </div>
      </div>
    </div>,
    racine,
  );
}

export function Champ({ libelle, children, aide }: { libelle: string; children: React.ReactNode; aide?: React.ReactNode }) {
  return (
    <label className="tam-champ">
      <span className="tam-champ-libelle">{libelle}</span>
      {children}
      {aide ? <span className="tam-champ-aide">{aide}</span> : null}
    </label>
  );
}
