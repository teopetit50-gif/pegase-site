"use client";
/* Le titre du héros : « Chaque semaine, [une ligne qui change toutes les
   3 s] reste sans suite. » Les quatre lignes sont celles de la page du 24/09
   (textes.ts, LIGNES_TOURNANTES). La référence compose son titre en serif
   sur deux lignes équilibrées (`text-balance`) : la ligne tournante est
   donc en ligne, sans retour forcé. */
import { useEffect, useState } from "react";
import { LIGNES_TOURNANTES } from "./textes";

export default function TitreTournant() {
  const [ligne, setLigne] = useState(0);
  useEffect(() => {
    const minuterie = setInterval(() => setLigne((l) => (l + 1) % LIGNES_TOURNANTES.length), 3000);
    return () => clearInterval(minuterie);
  }, []);
  return (
    <>
      {"Chaque semaine, "}
      <span key={ligne} className="tir-ligne-tournante">
        {LIGNES_TOURNANTES[ligne]}
      </span>
      {" reste sans suite."}
    </>
  );
}
