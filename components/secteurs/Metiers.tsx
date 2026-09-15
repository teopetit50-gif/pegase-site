"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BLOCS, METIERS, SYSTEMES } from "./donnees";

/* ══════════════════════════════════════════════════════════════════════
   02 — LE RAIL ET SON PANNEAU

   Décalque de la section « Solutions » de Northstar
   (daliagency-anonymized.vercel.app, `AgentSolutions_*`) : un rail collant
   à gauche, un panneau à droite, le tout dans un cadre à un filet. Toutes
   les valeurs — largeur du rail, `sticky top`, remplissages, tailles en
   clamp, et le basculement du rail en piste horizontale sous 720 px —
   viennent de la feuille compilée de la référence et sont écrites en tête
   de `secteurs.css`.

   ── DEUX ÉCARTS, ET POURQUOI ───────────────────────────────────────────

   1. LA RÉFÉRENCE EMPILE SES PANNEAUX ; NOUS EN MONTRONS UN. Chez elle,
      les cinq panneaux se suivent dans la page et le rail suit le
      défilement (`aria-current="location"`). Avec DOUZE métiers et une
      hauteur de panneau de `min(82vh, 48rem)`, la section ferait dix
      écrans : le douzième métier serait à la même distance du titre que le
      pied de page. Le rail devient donc une vraie piste d'onglets, avec
      son panneau unique — même dessin, même géométrie, un seul panneau
      monté. Les rôles ARIA suivent : `tablist` / `tab` / `tabpanel`, un
      seul onglet dans l'ordre de tabulation, flèches, Origine et Fin.

   2. LA VIGNETTE N'EST PAS UNE CAPTURE DE PRODUIT. La référence pose une
      capture d'application par panneau. Y mettre une fausse interface
      serait inventer une preuve (règles maison). La vignette occupe le
      même cadre, au même endroit, et porte le CONTENU du métier.

   ── CE QUI VIENT DE 21st.dev ───────────────────────────────────────────
   La transition DIRECTIONNELLE du panneau vient de
   `@0xUrvish/vertical-tabs`, récupéré sur le registre (`fetch('/r/…')`
   depuis une page 21st.dev ; en `curl` il répond 403, c'est le cookie qui
   manque, pas le code). Le panneau entre par le HAUT quand on remonte le
   rail, par le BAS quand on descend : le mouvement dit dans quel sens on
   vient de se déplacer dans la liste.

   Ce qui n'en est PAS repris : son défilement automatique toutes les cinq
   secondes, et son `AnimatePresence` en `mode="wait"`. Un panneau de
   contenu qui change tout seul sous les yeux du lecteur est hostile, et
   une sortie animée sur l'opacité laisse le panneau invisible dès que le
   navigateur cesse de produire des images. On n'anime que la translation,
   à l'entrée, sans sortie.
   ══════════════════════════════════════════════════════════════════════ */

/* La grille des douze et le rail partagent leur état : cliquer une tuile
   sélectionne le métier dans le rail, puis amène le lecteur au panneau. Les
   deux sections vivent donc dans le même composant client — les séparer
   aurait demandé un contexte pour un seul entier. */
export default function Metiers() {
  const [actif, setActif] = useState(0);
  const [sens, setSens] = useState(1);
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);
  const sansMouvement = useReducedMotion();

  const choisir = (i: number) => {
    setSens(i > actif ? 1 : -1);
    setActif(i);
  };

  const auClavier = (e: React.KeyboardEvent) => {
    const n = METIERS.length;
    const cible =
      e.key === "ArrowDown" || e.key === "ArrowRight" ? (actif + 1) % n
      : e.key === "ArrowUp" || e.key === "ArrowLeft" ? (actif - 1 + n) % n
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : null;
    if (cible === null) return;
    e.preventDefault();
    choisir(cible);
    onglets.current[cible]?.focus();
  };

  const m = METIERS[actif];

  /* La tuile sélectionne ET emmène : sans le défilement, un clic en haut de
     page ne produit aucun effet visible, la scène étant plus bas. */
  const depuisLaGrille = (i: number) => {
    choisir(i);
    document.getElementById("detail")?.scrollIntoView({
      behavior: sansMouvement ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <>
    {/* ══ 01 — les douze d'un coup d'œil ══════════════════════════════
        Géométrie de la section « Projects » de la référence : grille à 2
        puis 4 colonnes, filets haut et gauche sur la grille, bas et droit
        sur chaque cellule, numéro tabulaire en haut à gauche, flèche en
        haut à droite, légende en bas. */}
    <section id="metiers" className="scroll-mt-24 py-16 md:py-24">
      <div className="n-cadre">
        <div className="px-[clamp(6px,1vw,16px)]">
          <div className="n-scene-intro">
            <h2 className="n-etiquette">01 / Métiers</h2>
          </div>
          <div className="n-grille">
            {METIERS.map((x, i) => (
              <button
                key={x.cle}
                type="button"
                onClick={() => depuisLaGrille(i)}
                aria-label={`${x.nom} — voir le détail`}
                className="n-tuile"
              >
                <div className="n-tuile-haut">
                  <span className="n-tuile-num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden="true" className="n-fleche">
                    ↗
                  </span>
                </div>
                {/* La référence centre un logo client au milieu de la carte,
                    entre le numéro et la légende. On y met le nom du système
                    qui porte le métier : même emplacement, même poids visuel,
                    et c'est une information, pas un remplissage. */}
                <div className="n-tuile-milieu">
                  {SYSTEMES[x.systemes[0]].nom}
                </div>
                <span className="n-tuile-titre">{x.nom}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section id="detail" className="n-scene">
      <div className="n-cadre">
        <div>
          <header className="n-scene-intro">
            <h2 className="n-etiquette">02 / Le détail</h2>
          </header>

          <div className="n-showcase">
            <aside className="n-rail">
              <div className="n-rail-interne">
                <p className="n-rail-sourcil">Métiers</p>
                <nav
                  role="tablist"
                  aria-orientation="vertical"
                  aria-label="Les métiers que nous connaissons"
                  onKeyDown={auClavier}
                >
                  {METIERS.map((x, i) => (
                    <button
                      key={x.cle}
                      ref={(el) => {
                        onglets.current[i] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`onglet-${x.cle}`}
                      aria-selected={i === actif}
                      aria-controls="panneau-metier"
                      tabIndex={i === actif ? 0 : -1}
                      onClick={() => choisir(i)}
                      className="n-rail-lien"
                    >
                      {x.nom}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="n-panneaux">
              <motion.article
                key={m.cle}
                id="panneau-metier"
                role="tabpanel"
                aria-labelledby={`onglet-${m.cle}`}
                tabIndex={0}
                className="n-panneau"
                /* Entrée seule, sur la translation seule. Pas de sortie, pas
                   d'opacité : voir l'en-tête du fichier. */
                initial={sansMouvement ? false : { y: sens > 0 ? 14 : -14 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <header className="n-panneau-copie">
                  <div className="n-panneau-meta">
                    <h3 className="n-panneau-titre">{m.complet}</h3>
                    <Link
                      href={SYSTEMES[m.systemes[0]].href}
                      className="n-panneau-lien"
                    >
                      Voir le système <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                  <p className="n-panneau-resume">{m.echappe}</p>
                  <div className="n-pastilles">
                    {m.systemes.map((cle) => (
                      <span key={cle} className="n-pastille">
                        {SYSTEMES[cle].nom}
                      </span>
                    ))}
                  </div>
                </header>

                {/* La vignette — même cadre que la capture d'écran de la
                    référence, rempli par le contenu du métier. */}
                <div className="n-vignette">
                  <div className="n-vignette-barre">
                    <span
                      aria-hidden="true"
                      className="inline-block size-1.5 rounded-full bg-[#2563eb]"
                    />
                    {m.nom}
                  </div>
                  <div className="n-vignette-rangee">
                    <span className="n-vignette-cle">{BLOCS.cherche}</span>
                    <p className="n-vignette-val">{m.cherche}</p>
                  </div>
                  <div className="n-vignette-rangee">
                    <span className="n-vignette-cle">{BLOCS.reste}</span>
                    <p className="n-vignette-val text-[#6b7280]">{m.reste}</p>
                  </div>
                </div>
              </motion.article>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
