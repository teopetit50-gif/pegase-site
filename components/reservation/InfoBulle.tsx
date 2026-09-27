"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   <InfoBulle> — la précision d'une ligne du tableau des formats (27/09/2026)

   Chaque ligne de COMPARATIF porte une `aide` : la phrase qui dit ce que
   la valeur engage (« Le devis est indépendant de l'audit… »). Écrite sous
   le libellé, elle doublait la hauteur du tableau ; cachée, elle perdait
   la nuance. Elle vit donc derrière une icône, comme les (i) du tableau
   de prix de Qonto dont cette page est décalquée depuis le 26/07.

   Trois façons de l'ouvrir, parce qu'aucune ne marche seule :
     · la souris : `:hover`, en CSS, sans état ;
     · le clavier : `:focus-visible` sur le bouton, en CSS aussi — un clic
       souris ne la laisse pas ouverte au départ du pointeur ;
     · le doigt : Safari iOS ne donne pas le focus à un bouton touché, d'où
       l'état `ouvert`, basculé au clic, refermé par Échap ou par un geste
       ailleurs.
   Le texte reste dans le document, relié au bouton par
   `aria-describedby` : un lecteur d'écran le lit au focus, ouvert ou non.
   ══════════════════════════════════════════════════════════════════════ */
export default function InfoBulle({
  libelle,
  children,
}: {
  libelle: string;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const ailleurs = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("pointerdown", ailleurs);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("pointerdown", ailleurs);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  return (
    <span ref={ref} className="tb-info" data-ouvert={ouvert ? "" : undefined}>
      <button
        type="button"
        className="tb-info-btn"
        aria-label={`Précision sur « ${libelle} »`}
        aria-describedby={id}
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
      >
        <Info aria-hidden strokeWidth={1.6} />
      </button>
      <span role="tooltip" id={id} className="tb-info-bulle">
        {children}
      </span>
    </span>
  );
}
