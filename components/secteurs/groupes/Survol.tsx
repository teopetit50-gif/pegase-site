"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AUDIT, SURVOL } from "./textes";

/* 3. Le survol — leur `highlights grid-bg` (hoverHighlights) : à gauche
   une phrase, quatre entrées en très grand qui s'allument au survol, au
   focus ou au clic, chacune avec son petit lien souligné ; à droite
   l'écran de l'entrée active, et sa vignette posée par-dessus quand elle
   en a une (leur `media.top`, `.highlight-overlay`).
   Écart assumé : chez eux l'image change de `src`, donc la première
   visite de chaque entrée montre un cadre vide le temps du chargement.
   Ici les quatre écrans sont montés d'avance et seul l'actif est dans le
   flux ; les autres attendent en fondu à zéro, avec leur `transition:
   opacity .3s` (déjà dans leur feuille, jamais visible chez eux). */
export default function Survol() {
  const [actif, setActif] = useState(0);
  return (
    <section className="grp-survol grp-trame">
      <div className="grp-survol-liste">
        <p>{SURVOL.avant}</p>
        {SURVOL.entrees.map((e, i) => (
          <div
            key={e.texte}
            className={
              i === actif ? "grp-survol-entree grp-actif" : "grp-survol-entree"
            }
          >
            <button
              type="button"
              onMouseEnter={() => setActif(i)}
              onFocus={() => setActif(i)}
              onClick={() => setActif(i)}
              aria-pressed={i === actif}
            >
              {e.texte}
              {/* une espace insécable : la flèche ne part jamais seule à
                  la ligne (chez eux, une espace simple) */}
              <span>{"\u00a0↗"}</span>
            </button>
            <Link href={AUDIT} aria-label={`${SURVOL.lien} : ${e.texte}`}>
              {SURVOL.lien}
            </Link>
          </div>
        ))}
        {/* leur `afterHighlights` vide : un paragraphe sans texte, dont
            les marges tiennent l'écart au bouton */}
        <p aria-hidden="true" />
        <Link className="grp-mini" href={AUDIT}>
          {SURVOL.bouton} ↗
        </Link>
      </div>
      <div className="grp-survol-visuel" aria-live="polite">
        {SURVOL.entrees.map((e, i) => (
          <Fragment key={e.texte}>
            <Image
              className={i === actif ? "grp-survol-bas grp-actif" : "grp-survol-bas"}
              src={e.bas.src}
              width={e.bas.l}
              height={e.bas.h}
              alt={i === actif ? e.bas.alt : ""}
              sizes="(max-width: 760px) 100vw, min(720px, 50vw)"
            />
            {e.dessus && (
              <Image
                className={
                  i === actif ? "grp-survol-dessus grp-actif" : "grp-survol-dessus"
                }
                src={e.dessus.src}
                width={e.dessus.l}
                height={e.dessus.h}
                alt={i === actif ? e.dessus.alt : ""}
                sizes="(max-width: 760px) 100vw, min(720px, 50vw)"
              />
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
