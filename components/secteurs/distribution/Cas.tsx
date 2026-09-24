"use client";

import { useState } from "react";
import { CAS } from "./textes";
import { Fleche } from "./Fleche";

/* ══ leur « slider-section » : le carrousel de témoignages ══════════════
   Relevé : fond #e8f5f9, 100 px au-dessus et au-dessous, colonne 1040 ;
   rangée « logo 163 × 100 + marge 60 + chapô 16/180 % » ; filet #d7dbe1 ;
   la citation en serif italique 18/36 sur 120 px de haut ; filet ; trois
   chiffres 52/52 bleus ; puis la rangée de commande à 40 px : bouton plein
   à gauche, deux flèches 54 × 54 (#5c6a7c, #0c2542 au survol) à droite.
   ÉCARTS (règles maison) : pas de client, pas de portrait, pas de nom.
   Le logo devient l'ÉTIQUETTE du métier, le portrait une pastille, la
   citation le PROBLÈME écrit par nous, et les chiffres de résultat des
   faits PUBLICS du secteur, avec leur source sous la rangée. */
export default function Cas() {
  const [i, setI] = useState(0);
  const n = CAS.length;
  return (
    <section className="nm-cas" aria-roledescription="carrousel" aria-label="Situations par métier">
      <div className="nm-cas__colonne">
        <div className="nm-cas__masque">
          <div className="nm-cas__piste" style={{ transform: `translateX(-${i * 100}%)` }}>
            {CAS.map((c, k) => (
              <div
                key={c.etiquette}
                className="nm-cas__slide"
                role="group"
                aria-roledescription="diapositive"
                aria-label={`${k + 1} sur ${n} : ${c.etiquette}`}
                aria-hidden={k !== i}
              >
                <div className="nm-cas__tete">
                  <div className="nm-cas__marque">
                    <span>{c.etiquette}</span>
                  </div>
                  <p className="nm-cas__contexte">{c.contexte}</p>
                </div>
                <div className="nm-filet" />
                <div className="nm-cas__milieu">
                  <div className="nm-cas__vide" />
                  <div>
                    <div className="nm-cas__qui">
                      <span className="nm-cas__pastille" aria-hidden>
                        <Fleche />
                      </span>
                      <div>
                        <p className="nm-cas__qui-titre">Le problème</p>
                        <p className="nm-cas__qui-sous">tel qu&apos;il se pose chaque semaine</p>
                      </div>
                    </div>
                    <p className="nm-cas__citation">« {c.probleme} »</p>
                  </div>
                </div>
                <div className="nm-filet" />
                <div className="nm-cas__chiffres">
                  {c.chiffres.map((f) => (
                    <div key={f.libelle} className="nm-cas__chiffre">
                      <p className="nm-t52">{f.valeur}</p>
                      <p className="nm-cas__libelle">{f.libelle}</p>
                    </div>
                  ))}
                </div>
                <p className="nm-cas__source">Source : {c.source}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="nm-cas__commandes">
          <a href="/reserver-un-audit" className="nm-bouton">
            <span>Réserver un audit</span>
          </a>
          <div className="nm-cas__fleches">
            <button
              type="button"
              className="nm-cas__fleche nm-cas__fleche--g"
              aria-label="Situation précédente"
              onClick={() => setI((i - 1 + n) % n)}
            >
              <Fleche />
            </button>
            <button
              type="button"
              className="nm-cas__fleche"
              aria-label="Situation suivante"
              onClick={() => setI((i + 1) % n)}
            >
              <Fleche />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
