"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AUDIT, CARROUSEL } from "./textes";

const deux = (n: number) => String(n).padStart(2, "0");

/* 4. Le carrousel — leur `slider grid-bg` : un titre, UNE carte à la
   fois, et une navigation « ← 01 / 04 → ». Chez eux, des témoignages
   factices signés « Example person » sous une étiquette « Editable demo
   testimonial » ; ici des SITUATIONS TYPES, sans personne ni société
   (règles maison : aucune preuve sociale inventée). Leur vignette de
   « logo » (une image abstraite de 120 × 45) porte le signe de Varelo. */
export default function Carrousel() {
  const [n, setN] = useState(0);
  const cartes = CARROUSEL.cartes;
  const c = cartes[n];
  return (
    <section
      className="grp-carrousel grp-trame"
      aria-roledescription="carousel"
      aria-label="Situations types"
    >
      <div className="grp-carrousel-intro">
        <h2>{CARROUSEL.titre}</h2>
      </div>
      <article className="grp-carte" aria-live="polite">
        <Image src="/logos/varelo-mark.png" width={120} height={45} alt="Varelo" />
        <p className="grp-etiquette">{CARROUSEL.etiquette}</p>
        <blockquote>«&#8239;{c.citation}&#8239;»</blockquote>
        <p>
          {c.role}
          <br />
          <span>{c.liste}</span>
        </p>
        <Link href={AUDIT}>{CARROUSEL.lien} ↗</Link>
      </article>
      <div className="grp-carrousel-nav">
        <button
          type="button"
          aria-label="Situation précédente"
          disabled={!n}
          onClick={() => setN(n - 1)}
        >
          ←
        </button>
        <span>
          {deux(n + 1)} / {deux(cartes.length)}
        </span>
        <button
          type="button"
          aria-label="Situation suivante"
          disabled={n === cartes.length - 1}
          onClick={() => setN(n + 1)}
        >
          →
        </button>
      </div>
    </section>
  );
}
