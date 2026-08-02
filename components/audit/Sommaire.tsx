"use client";

/* Sommaire sticky du pré-audit (pattern « sticky table of contents »
   21st.dev, dans la langue du site : c'est la SolutionsNav historique).
   Colle sous le header, section active soulignée or via
   IntersectionObserver, défilement doux au clic — coupé si
   prefers-reduced-motion. */

import { useEffect, useState } from "react";

export type SectionSommaire = { id: string; label: string };

export default function Sommaire({ sections }: { sections: SectionSommaire[] }) {
  const [actif, setActif] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) if (e.isIntersecting) setActif(e.target.id);
      },
      /* la « ligne de lecture » : une section devient active quand elle
         traverse la bande 40-45 % du viewport */
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  function aller(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: doux ? "smooth" : "auto", block: "start" });
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav className="pa-som" aria-label="Sommaire du pré-audit">
      <div className="r-wrap">
        <div className="pa-som-rangee">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-actif={actif === s.id}
              onClick={(e) => aller(e, s.id)}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
