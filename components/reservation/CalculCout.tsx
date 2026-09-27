"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { BoutonReservation } from "./ModeleUrl";
import "./CalculCout.css";

/* ══════════════════════════════════════════════════════════════════════
   <CalculCout> — « Estimez ce que votre situation vous coûte »,
   /reserver-un-audit (27/09/2026, remplace <Simulateur> du 26/07)

   ORIGINE. `pricing-slider-loops` de @radu sur 21st.dev (registre ouvert,
   lu le 27/09) — le calculateur de la page de prix de Loops : deux cartes
   côte à côte, à gauche le réglage au curseur avec sa valeur en grand, à
   droite le résultat et le bouton.

   CE QUI EST REPRIS : les deux cartes, le curseur natif
   (<input type="range"> habillé : clavier, lecteur d'écran et tactile
   sans rien réécrire) avec sa piste remplie jusqu'au pouce, la valeur
   lue en regard du curseur, le résultat en très grand dans la carte de
   droite, le bouton pleine largeur.

   CE QUI CHANGE —
   · QUATRE curseurs au lieu d'un : ce sont les quatre chiffres de
     l'ancien simulateur (champs numériques), ramenés à des bornes
     plausibles. Le calcul et ses deux hypothèses (46 semaines, 25 % de
     conversion) sont ceux du 26/07, au chiffre près ;
   · le chiffre du résultat ROULE (NumberFlow, déjà au projet) au lieu de
     sauter — c'est ce qui rend le curseur lisible : on voit le total
     suivre la main ;
   · l'orange de Loops devient le noir de la charte ;
   · jeté : le lien « Contact us » du bas de la carte de gauche. Le seul
     bouton de la section est celui qui fait chiffrer la situation réelle.

   Les hypothèses restent AFFICHÉES, sous le résultat et en note : un
   simulateur qui cache sa formule est une promesse déguisée (26/07).
   ══════════════════════════════════════════════════════════════════════ */

/* 46 semaines travaillées : 52 moins congés et jours fériés — l'hypothèse
   est basse à dessein, un chiffrage qui gonfle ne sert personne. */
const SEMAINES = 46;
/* part des devis sans réponse qui se seraient conclus s'ils avaient été
   relancés. Volontairement prudente, et affichée. */
const CONVERSION = 0.25;

type Cle = "heures" | "taux" | "devis" | "echues";
type Valeurs = Record<Cle, number>;

const PROFILS: { id: string; label: string; valeurs: Valeurs }[] = [
  {
    id: "btp",
    label: "BTP & travaux publics",
    valeurs: { echues: 120000, devis: 80000, heures: 6, taux: 45 },
  },
  {
    id: "negoce",
    label: "Distribution & négoce",
    valeurs: { echues: 60000, devis: 25000, heures: 8, taux: 38 },
  },
  {
    id: "services",
    label: "Services & conseil",
    valeurs: { echues: 45000, devis: 30000, heures: 5, taux: 60 },
  },
];

/* Les bornes englobent largement les trois profils ; le pas de 1 000 €
   tombe juste sur chacune de leurs valeurs, et 1 € de pas pour le taux
   horaire (38 € n'est pas un multiple de 5). */
const CURSEURS: {
  cle: Cle;
  label: string;
  min: number;
  max: number;
  pas: number;
  unite: "€" | "h";
}[] = [
  { cle: "heures", label: "Heures d'administratif par semaine", min: 0, max: 40, pas: 1, unite: "h" },
  { cle: "taux", label: "Valeur d'une heure de dirigeant", min: 20, max: 200, pas: 1, unite: "€" },
  { cle: "devis", label: "Devis sans réponse le mois dernier", min: 0, max: 300000, pas: 1000, unite: "€" },
  { cle: "echues", label: "Factures échues aujourd'hui", min: 0, max: 500000, pas: 1000, unite: "€" },
];

const FMT_EUROS = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const euros = (n: number) => FMT_EUROS.format(Math.max(0, Math.round(n)));
const lu = (n: number, unite: "€" | "h") => (unite === "€" ? euros(n) : `${n} h`);

/* NumberFlow reçoit le même format que `euros` : les chiffres roulent,
   l'espace fine et le symbole restent en place */
const FORMAT_FLOW = {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
} as const;

export default function CalculCout() {
  const [profil, setProfil] = useState(0);
  const [v, setV] = useState<Valeurs>(PROFILS[0].valeurs);

  const coutAdmin = v.heures * SEMAINES * v.taux;
  const caAttente = v.devis * 12 * CONVERSION;
  const total = coutAdmin + caAttente;

  const regler = (cle: Cle, n: number) => {
    setV((ancien) => ({ ...ancien, [cle]: n }));
  };

  return (
    <section id="simulateur" data-monde="clair" className="r-wrap cc py-16 sm:py-24">
      <div className="cc-tete">
        <h2 className="r-h2">Estimez ce que votre situation vous coûte</h2>
        <p className="r-lead cc-chapo">
          Quatre chiffres que vous connaissez déjà suffisent à poser un ordre de
          grandeur. C&apos;est le calcul que l&apos;audit refait sur vos documents réels.
        </p>
      </div>

      <div className="cc-cartes">
        {/* ═══ carte de gauche : les réglages ═══ */}
        <div data-reveal className="cc-carte cc-reglages">
          <p className="cc-surtitre" id="cc-profils">
            Partir d&apos;un profil
          </p>
          <div className="cc-profils" role="group" aria-labelledby="cc-profils">
            {PROFILS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={profil === i}
                className="cc-profil"
                onClick={() => {
                  setProfil(i);
                  setV(p.valeurs);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="cc-curseurs">
            {CURSEURS.map((c) => {
              const valeur = v[c.cle];
              /* fraction parcourue, SANS unité : la feuille en tire la
                 fin de la piste noire, recalée sur le centre du pouce */
              const part = (valeur - c.min) / (c.max - c.min);
              const id = `cc-${c.cle}`;
              return (
                <div key={c.cle} className="cc-curseur">
                  <div className="cc-curseur-tete">
                    <label htmlFor={id} className="cc-curseur-label">
                      {c.label}
                    </label>
                    <output htmlFor={id} className="num cc-curseur-valeur">
                      {lu(valeur, c.unite)}
                    </output>
                  </div>
                  <input
                    id={id}
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.pas}
                    value={valeur}
                    aria-valuetext={lu(valeur, c.unite)}
                    onChange={(e) => regler(c.cle, Number(e.target.value))}
                    className="cc-range"
                    style={{ "--cc-part": part } as React.CSSProperties}
                  />
                  <div aria-hidden className="num cc-bornes">
                    <span>{lu(c.min, c.unite)}</span>
                    <span>{lu(c.max, c.unite)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ carte de droite : le résultat ═══ */}
        <div data-reveal className="cc-carte cc-resultat">
          <p className="cc-surtitre">Sur douze mois</p>
          {/* Les roues de NumberFlow vivent dans son shadow DOM, sans
              libellé : elles sont muettes, et c'est le montant écrit en
              clair, masqué à l'œil, que le lecteur d'écran annonce. */}
          <p className="num cc-total" aria-live="polite">
            <span aria-hidden>
              <NumberFlow value={Math.max(0, Math.round(total))} locales="fr-FR" format={FORMAT_FLOW} />
            </span>
            <span className="sr-only cc-total-lu">{euros(total)}</span>
          </p>
          <p className="cc-total-sous">
            Ce que la situation actuelle consomme, avant même de parler
            d&apos;automatisation.
          </p>

          <dl className="cc-detail">
            <div className="cc-detail-ligne">
              <dt>
                Temps administratif
                <span className="num cc-formule">
                  {v.heures} h × {SEMAINES} semaines × {euros(v.taux)}
                </span>
              </dt>
              <dd className="num">{euros(coutAdmin)}</dd>
            </div>
            <div className="cc-detail-ligne">
              <dt>
                Chiffre d&apos;affaires en attente
                <span className="num cc-formule">
                  {euros(v.devis)} × 12 mois × {Math.round(CONVERSION * 100)} % de
                  conversion
                </span>
              </dt>
              <dd className="num">{euros(caAttente)}</dd>
            </div>
          </dl>

          <div className="cc-apart">
            <div className="cc-detail-ligne">
              <span>Trésorerie immobilisée aujourd&apos;hui</span>
              <span className="num cc-apart-valeur">{euros(v.echues)}</span>
            </div>
            <p className="cc-formule">
              Comptée à part&nbsp;: cet argent n&apos;est pas perdu, il est chez vos clients.
            </p>
          </div>

          <div className="cc-action">
            <BoutonReservation formule="process" className="r-btn r-btn--noir w-full">
              Faire chiffrer ma situation réelle
            </BoutonReservation>
            <p className="r-note cc-action-note">Gratuit&nbsp;: créneau bloqué immédiatement</p>
          </div>
        </div>
      </div>

      <p className="r-note cc-avertissement">
        Simulation indicative, fondée sur les seules valeurs que vous réglez et sur
        deux hypothèses affichées ci-dessus ({SEMAINES} semaines travaillées,{" "}
        {Math.round(CONVERSION * 100)} % des devis sans réponse convertibles après
        relance). Elle ne constitue ni un engagement, ni un conseil, ni une promesse de
        résultat&nbsp;: l&apos;audit remplace ces hypothèses par vos chiffres relevés.
      </p>
    </section>
  );
}
