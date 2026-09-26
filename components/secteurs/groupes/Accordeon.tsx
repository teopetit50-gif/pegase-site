"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ACCORDEON } from "./textes";

/* 5. L'accordéon — leur `accordion grid-bg` (mediaContentAccordion) : le
   titre sur toute la largeur, la liste numérotée à gauche (5 fr), le
   panneau de l'élément ouvert à droite (7 fr) : son écran, son titre, sa
   phrase, son lien.
   Même écart que le survol : les quatre écrans sont montés d'avance
   (seul l'ouvert est dans le flux), pour qu'aucun clic ne montre un
   cadre vide pendant le chargement. */
export default function Accordeon() {
  const [n, setN] = useState(0);
  const e = ACCORDEON.elements[n];
  return (
    <section className="grp-accordeon grp-trame">
      <div className="grp-accordeon-tete">
        <h2>{ACCORDEON.titre}</h2>
      </div>
      <div className="grp-accordeon-items">
        {ACCORDEON.elements.map((x, i) => (
          <button
            key={x.titre}
            type="button"
            onClick={() => setN(i)}
            className={n === i ? "grp-actif" : ""}
            aria-expanded={n === i}
            aria-controls="grp-accordeon-panneau"
          >
            <span>0{i + 1}</span>
            {x.titre}
            <b>{n === i ? "−" : "+"}</b>
          </button>
        ))}
      </div>
      <div
        className="grp-accordeon-media"
        id="grp-accordeon-panneau"
        role="region"
        aria-label={e.titre}
      >
        {ACCORDEON.elements.map((x, i) => (
          <Image
            key={x.titre}
            className={n === i ? "grp-actif" : undefined}
            src={x.ecran.src}
            width={x.ecran.l}
            height={x.ecran.h}
            alt={n === i ? x.ecran.alt : ""}
            sizes="(max-width: 760px) 100vw, 47vw"
          />
        ))}
        <div>
          <h3>{e.titre}</h3>
          <p>{e.texte}</p>
          <Link href={e.lien.href}>{e.lien.texte} ↗</Link>
        </div>
      </div>
    </section>
  );
}
