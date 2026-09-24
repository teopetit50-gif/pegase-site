"use client";

import { useState } from "react";
import Ecran, { ECRANS_MODULES } from "./Ecran";
import Echelle from "./Echelle";
import { MODULES } from "./textes";
import { Fleche } from "./Fleche";

/* ══ leur « modules-section » : trois onglets (w-tabs de Webflow) ══════
   Relevé : onglets 260 × 52 collés (marge −1), actif jaune #ffc53a avec
   un liseré haut de 4 px à 20 % de noir ; volet 960 de large, 50 au-dessus
   et 90 en dessous ; la carte blanche flotte sur la capture, en bas à
   gauche (bottom 41), bordure 6 px à 10 %, ombre dure 20 × 20 à 20 %.
   ÉCART : la bande est BLEU NUIT chez eux ; ici elle est claire (#eef1f5,
   leur `--background`) — « Omega c'est blanc », bandes sombres refusées
   sur tout le site. Les onglets inactifs passent donc en blanc filé.
   Onglets en <button role="tab"> : chez eux des <a> sans href. */
export default function Modules() {
  const [actif, setActif] = useState(0);
  return (
    <section id="modules" className="nm-modules">
      <div className="nm-modules__cadre">
        <div className="nm-tabs">
          <div className="nm-tabs__menu" role="tablist" aria-label="Modules de Namolu">
            {MODULES.map((m, i) => (
              <button
                key={m.cle}
                type="button"
                role="tab"
                id={`nm-onglet-${m.cle}`}
                aria-selected={i === actif}
                aria-controls={`nm-volet-${m.cle}`}
                className={`nm-tabs__lien${i === actif ? " is-actif" : ""}`}
                onClick={() => setActif(i)}
              >
                {m.onglet}
              </button>
            ))}
          </div>
          {MODULES.map((m, i) => (
            <div
              key={m.cle}
              role="tabpanel"
              id={`nm-volet-${m.cle}`}
              aria-labelledby={`nm-onglet-${m.cle}`}
              hidden={i !== actif}
              className="nm-tabs__volet"
            >
              <div className="nm-tabs__capture">
                <Echelle largeur={960}>
                  <Ecran {...ECRANS_MODULES[m.cle]} />
                </Echelle>
              </div>
              <div className="nm-module">
                <h3 className="nm-t32">{m.titre}</h3>
                <p className="nm-module__texte">{m.texte}</p>
                <a href="/reserver-un-audit" className="nm-souligne">
                  <span>{m.lien}</span>
                  <Fleche />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
