"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import Partage from "@/components/Partage";
import {
  FORMULES_SITE,
  euros,
  milliers,
  pluriel,
  resteChequeTic,
  type FormuleSite,
} from "@/lib/formules-site";
import "./GrilleSite.css";

/* ══════════════════════════════════════════════════════════════════════
   <GrilleSite> — les trois formules du site catalogue (27/09/2026)

   ORIGINE. 21st.dev, @arihantcodes_1f7b8c4d/blueprint-tiers (registre
   /r/arihantcodes_1f7b8c4d/blueprint-tiers, lu le 27/09) : un cadre à
   filets où chaque colonne se lit en trois bandes — le nom et
   l'accroche, le prix et le bouton, la liste ligne à ligne — des repères
   de coupe aux angles, des coins de visée autour du bouton de la formule
   mise en avant, une bande hachurée qui ferme le cadre, et des chiffres
   qui ROULENT (PriceFigure) quand le montant change.

   CE QUI EST JETÉ. Le bleu #2941ff (le site est quasi monochrome : la
   formule mise en avant se dit à l'encre, par le bouton plein) ; le fond
   gris de section ; les `dark:` (en Tailwind v4 ils suivent l'OS, pas
   notre classe) ; `@container` ; le `cn()` ; useReveal et ses keyframes
   (PageMotion anime déjà les `[data-reveal]` : deux mécaniques d'arrivée
   sur le même bloc se marcheraient dessus) ; l'interrupteur mensuel /
   annuel posé PAR carte — ici un seul sélecteur, le taux du Chèque TIC,
   qui vaut pour les trois ; la police mono, que le site ne charge pas.

   REPRIS DE <PrixSite> (14/09, remplacé par cette grille) : le groupe
   radio du taux d'aide, au même clavier que les puces de /modeles
   (flèches, Début, Fin), et le total lu par une zone aria-live unique —
   les chiffres visibles sont aria-hidden.

   ÉCARTS ASSUMÉS. Par défaut, AUCUNE aide n'est déduite : le site parle à
   toute la France et le Chèque TIC ne concerne que la Guadeloupe — le
   gros chiffre est d'abord le prix. Les chiffres roulent par RANG
   (unités sur unités) : de 1 990 à 398, le « 1 » des milliers s'en va au
   lieu de faire glisser toute la rangée d'un cran. Groupement des
   milliers écrit à la main (lib/formules-site), pour un texte identique
   au serveur et au navigateur.

   Les montants ne sont écrits nulle part ici : ils viennent de
   lib/formules-site.ts.
   ══════════════════════════════════════════════════════════════════════ */

type Taux = { cle: string; puce: string; taux?: 40 | 80 };

const TAUX: Taux[] = [
  { cle: "sans", puce: "Sans aide" },
  { cle: "t40", puce: "Aide à 40\u00a0%", taux: 40 },
  { cle: "t80", puce: "Aide à 80\u00a0%", taux: 80 },
];

const CHIFFRES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Le montant, chiffre par chiffre, chacun sur son rouleau. La clé est
 *  le rang compté depuis la DROITE : un changement de montant fait rouler
 *  les unités vers les unités, les dizaines vers les dizaines.
 *
 *  La police du site ignore `tabular-nums` (mesuré le 27/09 : « 1 » fait
 *  15,5 px, « 0 » 28,8 px à 50 px) : un rouleau de 1ch, comme chez
 *  blueprint-tiers, isolait le « 1 » de 1 990 dans un trou. Chaque
 *  rouleau prend donc la largeur de SON chiffre, par un double invisible
 *  posé dans le flux (.gs-mesure) ; la bande roule par-dessus. */
function Chiffre({ valeur }: { valeur: number }) {
  const signes = milliers(valeur).split("");
  return (
    <span className="gs-chiffre">
      <span aria-hidden className="gs-chiffre-corps">
        {signes.map((c, i) => {
          const rang = signes.length - 1 - i;
          return /\d/.test(c) ? (
            <span key={`c${rang}`} className="gs-rouleau">
              <span className="gs-mesure">{c}</span>
              <span className="gs-bande" style={{ transform: `translateY(-${Number(c) * 10}%)` }}>
                {CHIFFRES.map((d) => (
                  <span key={d} className="gs-case">
                    {d}
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span key={`s${rang}`} className="gs-sep">
              {c}
            </span>
          );
        })}
        <span className="gs-devise">{" €"}</span>
      </span>
      <span className="gs-lecture">{euros(valeur)}</span>
    </span>
  );
}

function Coche() {
  return (
    <span aria-hidden className="gs-coche">
      <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
        <path d="M2.5 6.2 5 8.6l4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function GrilleSite({ compris }: { compris: string[] }) {
  const [rang, setRang] = useState(0);
  const puces = useRef<(HTMLButtonElement | null)[]>([]);
  const actif = TAUX[rang];

  const montant = (f: FormuleSite) => (actif.taux ? resteChequeTic(f.prix, actif.taux) : f.prix);

  const choisir = (i: number) => {
    setRang(i);
    puces.current[i]?.focus();
  };

  const clavier = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = TAUX.length;
    let vise: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        vise = (i + 1) % n;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        vise = (i - 1 + n) % n;
        break;
      case "Home":
        vise = 0;
        break;
      case "End":
        vise = n - 1;
        break;
    }
    if (vise === null) return;
    e.preventDefault();
    choisir(vise);
  };

  /* le seul texte LU quand le taux change : stable, une phrase pour les trois */
  const annonce = actif.taux
    ? `Avec le Chèque TIC à ${actif.taux} %, restant à votre charge : ${FORMULES_SITE.map(
        (f) => `${f.nom} ${euros(montant(f))}`,
      ).join(", ")}.`
    : `Prix sans aide : ${FORMULES_SITE.map((f) => `${f.nom} ${euros(f.prix)}`).join(", ")}.`;

  return (
    <>
      <div data-reveal className="gs-aide">
        <div className="gs-selecteur" role="radiogroup" aria-label="Chèque TIC déduit">
          {TAUX.map((t, i) => (
            <button
              key={t.cle}
              ref={(el) => {
                puces.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={i === rang}
              tabIndex={i === rang ? 0 : -1}
              onClick={() => choisir(i)}
              onKeyDown={(e) => clavier(e, i)}
              className="gs-puce"
            >
              {t.puce}
            </button>
          ))}
        </div>
        <p className="gs-aide-note">
          Le Chèque TIC est un dispositif de la Région Guadeloupe, réservé aux entreprises qui y
          sont immatriculées. L&apos;éligibilité se vérifie à l&apos;audit.
        </p>
      </div>

      {/* le cadre est l'objet partagé qui arrive de /commencer (« cadre-modeles ») */}
      <Partage nom="cadre-modeles" share="voyage-modeles" as="div" className="gs-cadre">
        <span aria-hidden className="gs-repere gs-repere--hg" />
        <span aria-hidden className="gs-repere gs-repere--hd" />

        <div className="gs-grille">
          {FORMULES_SITE.map((f, i) => (
            <article
              key={f.id}
              aria-labelledby={`gs-nom-${f.id}`}
              className={f.recommandee ? "gs-carte gs-carte--vedette" : "gs-carte"}
            >
              {i > 0 ? <span aria-hidden className="gs-repere gs-repere--col" /> : null}

              <div className="gs-tete">
                <div className="gs-nom-ligne">
                  <h3 id={`gs-nom-${f.id}`} className="gs-nom">
                    {f.nom}
                  </h3>
                  {f.recommandee ? <span className="gs-badge">Recommandée</span> : null}
                </div>
                <p className="gs-accroche">{f.accroche}</p>
              </div>

              <div className="gs-prix">
                <div className="gs-montant">
                  <Chiffre valeur={montant(f)} />
                  <span className="gs-unite">{actif.taux ? "restant à votre charge" : "TTC, une fois"}</span>
                </div>
                <p className="gs-sous">
                  {actif.taux ? `sur ${euros(f.prix)}, si vous êtes éligible` : "Pas d'abonnement."}
                </p>
                <div className="gs-action">
                  {f.recommandee ? (
                    <>
                      <span aria-hidden className="gs-coin gs-coin--hg" />
                      <span aria-hidden className="gs-coin gs-coin--hd" />
                      <span aria-hidden className="gs-coin gs-coin--bg" />
                      <span aria-hidden className="gs-coin gs-coin--bd" />
                    </>
                  ) : null}
                  <Link
                    href={`/reserver-un-audit?site=${f.id}`}
                    className={f.recommandee ? "o-btn o-btn--primary gs-btn" : "o-btn o-btn--ghost gs-btn"}
                  >
                    Choisir {f.nom}
                  </Link>
                </div>
              </div>

              <ul className="gs-liste">
                <li>
                  <Coche />
                  {pluriel(f.pages, "page", "pages")}
                </li>
                <li>
                  <Coche />
                  {pluriel(f.allersRetours, "aller-retour", "allers-retours")}
                </li>
                <li>
                  <Coche />
                  {f.miseEnPage}
                </li>
              </ul>
            </article>
          ))}
        </div>

        <div className="gs-commun">
          <p className="gs-commun-titre">Dans les trois formules</p>
          <ul className="gs-commun-liste">
            {compris.map((t) => (
              <li key={t}>
                <Coche />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden className="gs-hachures" />
      </Partage>

      <p className="gs-lecture" aria-live="polite">
        {annonce}
      </p>
    </>
  );
}
