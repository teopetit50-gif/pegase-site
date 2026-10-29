"use client";

/* Le sommaire de droite de /espace2/formation, sur celui de la
   documentation Linear : la section courante est le dernier titre passé
   sous la barre du haut ; en bas de page, le dernier titre. */

import { useEffect, useState } from "react";

export type Entree = { id: string; texte: string; niveau: 2 | 3 };

export default function Sommaire({ entrees }: { entrees: Entree[] }) {
  const [actif, setActif] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const calculer = () => {
      raf = 0;
      let courant = entrees[0]?.id ?? null;
      for (const e of entrees) {
        const h = document.getElementById(e.id);
        if (h && h.getBoundingClientRect().top < 140) courant = e.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) courant = entrees[entrees.length - 1]?.id ?? null;
      setActif(courant);
    };
    const surDefilement = () => {
      if (!raf) raf = requestAnimationFrame(calculer);
    };
    raf = requestAnimationFrame(calculer);
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    return () => {
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
      cancelAnimationFrame(raf);
    };
  }, [entrees]);

  return (
    <aside className="fm-sommaire" aria-label="Sur cette page">
      <ul>
        {entrees.map((e) => (
          <li key={e.id} data-niveau={e.niveau}>
            <a href={`#${e.id}`} aria-current={actif === e.id ? "location" : undefined}>
              {e.texte}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
