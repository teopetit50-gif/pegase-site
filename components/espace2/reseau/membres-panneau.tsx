"use client";

/* Réseau Omega, page Membres — le panneau « Ce que je montre au réseau ».
   Il parle de « vous », l'organisation connectée d'Espace 2 (son nom vient
   de la coquille), jamais d'un des membres. Un interrupteur par champ,
   tous éteints au départ : rien n'est visible sans accord. Dessous,
   l'aperçu de votre carte telle que les membres la voient.

   Large écran (≥ 1280 px) : une colonne à droite de la liste, toujours
   ouverte. Plus étroit : un bloc repliable au-dessus de la liste. */

import { useId, useState, useSyncExternalStore } from "react";
import { ChevronDown, EyeOff } from "lucide-react";
import { Interrupteur } from "../ui";
import { useOrganisation } from "../organisation";
import { Monogramme } from "./membres-ui";
import { CHAMPS_VISIBLES, VOUS_EXEMPLE, badgesLus, changerVisibilite, toutMasquer, useVisibilite, type ChampVisible } from "./membres-donnees";

const LARGE = "(min-width: 1280px)";
function useLarge() {
  return useSyncExternalStore(
    (e) => {
      const m = window.matchMedia(LARGE);
      m.addEventListener("change", e);
      return () => m.removeEventListener("change", e);
    },
    () => window.matchMedia(LARGE).matches,
    () => false,
  );
}

const vous = VOUS_EXEMPLE;
const [badgePaiement, badgeReponse] = [badgesLus({ bonPayeur: vous.badges.bonPayeur }), badgesLus({ reponseRapide: vous.badges.reponseRapide })].map((l) => l[0]);

const CHAMPS: Record<ChampVisible, { libelle: string; valeur: string; aide?: string }> = {
  bonPayeur: { libelle: "Badge « Bon payeur »", valeur: badgePaiement.phrase, aide: "Calculé sur vos factures FILED, 12 mois" },
  reponseRapide: { libelle: "Badge « Réponse rapide »", valeur: badgeReponse.phrase, aide: "Calculé sur vos demandes reçues, 12 mois" },
  secteur: { libelle: "Secteur", valeur: vous.secteur },
  commune: { libelle: "Commune", valeur: `${vous.commune}, ${vous.ile}` },
  propose: { libelle: "Ce que vous proposez", valeur: vous.propose.join(" · ") },
  cherche: { libelle: "Ce que vous cherchez", valeur: vous.cherche.join(" · ") },
};

export function PanneauVisibilite() {
  const { nom } = useOrganisation();
  const v = useVisibilite();
  const large = useLarge();
  const [ouvert, setOuvert] = useState(false);
  const idCorps = useId();
  const visibles = CHAMPS_VISIBLES.filter((c) => v[c]).length;
  const resume = visibles ? `${visibles} champ${visibles > 1 ? "s" : ""} sur ${CHAMPS_VISIBLES.length} visible${visibles > 1 ? "s" : ""}` : "Rien de visible pour l'instant";
  const deplie = large || ouvert;

  return (
    <section className="v2-carte rm-moi" aria-labelledby={`${idCorps}-titre`}>
      <header className="rm-moi-tete">
        {large ? (
          <div className="rm-moi-titre-bloc">
            <h2 className="rm-h2" id={`${idCorps}-titre`}>
              Ce que je montre au réseau
            </h2>
            <p className="rm-moi-resume">{resume}</p>
          </div>
        ) : (
          <button type="button" className="rm-moi-bascule" aria-expanded={ouvert} aria-controls={idCorps} onClick={() => setOuvert((o) => !o)}>
            <span className="rm-moi-titre-bloc">
              <span className="rm-h2" id={`${idCorps}-titre`}>
                Ce que je montre au réseau
              </span>
              <span className="rm-moi-resume">{resume}</span>
            </span>
            <ChevronDown className="rm-moi-chevron" width={16} height={16} aria-hidden="true" />
          </button>
        )}
      </header>

      {deplie ? (
        <div id={idCorps} className="rm-moi-corps">
          <p className="rm-moi-intro">
            Les membres voient toujours le nom <strong>{nom}</strong>. Tout le reste attend votre accord, champ par champ.
          </p>
          <ul className="rm-moi-champs">
            {CHAMPS_VISIBLES.map((c) => (
              <li key={c} className="rm-moi-champ">
                <Interrupteur actif={v[c]} onChange={(oui) => changerVisibilite(c, oui)}>
                  <span className="rm-moi-champ-texte">
                    <span className="rm-moi-champ-libelle">{CHAMPS[c].libelle}</span>
                    <span className="rm-moi-champ-valeur">{CHAMPS[c].valeur}</span>
                    {CHAMPS[c].aide ? <span className="rm-moi-champ-aide">{CHAMPS[c].aide}</span> : null}
                  </span>
                </Interrupteur>
              </li>
            ))}
          </ul>

          <div className="rm-apercu">
            <p className="rm-etiquette">Ce que les membres voient</p>
            <div className="rm-apercu-carte">
              <div className="rm-apercu-tete">
                <Monogramme nom={nom} />
                <div>
                  <p className="rm-apercu-nom">{nom}</p>
                  <p className="rm-apercu-ligne">{[v.secteur ? vous.secteur : null, v.commune ? vous.commune : null].filter(Boolean).join(" · ") || "Secteur et commune masqués"}</p>
                </div>
              </div>
              {v.propose ? <p className="rm-apercu-ligne"><span>Propose :</span> {vous.propose.join(", ")}</p> : null}
              {v.cherche ? <p className="rm-apercu-ligne"><span>Cherche :</span> {vous.cherche.join(", ")}</p> : null}
              {v.bonPayeur || v.reponseRapide ? (
                <p className="rm-apercu-ligne">
                  <span>Badges :</span> {[v.bonPayeur ? badgePaiement.phrase : null, v.reponseRapide ? badgeReponse.phrase : null].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {!visibles ? (
                <p className="rm-apercu-vide">
                  <EyeOff width={14} height={14} aria-hidden="true" />
                  Seul votre nom apparaît dans l&apos;annuaire.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rm-moi-pied">
            <span>Vos choix valent pour cette visite : ils ne sont pas encore enregistrés.</span>
            {visibles ? (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={toutMasquer}>
                Tout masquer
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
