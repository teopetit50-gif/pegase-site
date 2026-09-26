"use client";

import { useState } from "react";

/* La pastille mono du héros. Chez la référence, `$ npx create-payload-app`
   et son bouton « Copy » (→ « Copied », « Unavailable ») : une commande à
   copier. Ici la même pastille, au même pixel, porte l'adresse d'Omega ;
   le bouton la copie. Structure identique : le signe, le texte, le bouton,
   trois éléments de flex séparés de 9 px. */
export default function Copier({ texte }: { texte: string }) {
  const [etat, setEtat] = useState("Copier");
  return (
    <code>
      <span>→</span> {texte}{" "}
      <button
        type="button"
        aria-label={`Copier l'adresse ${texte}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texte);
            setEtat("Copié");
          } catch {
            setEtat("Indisponible");
          }
        }}
      >
        {etat}
      </button>
    </code>
  );
}
