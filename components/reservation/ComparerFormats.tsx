"use client";

import { useState } from "react";
import Link from "next/link";
import Lien from "@/components/Lien";
import { Building2, Check } from "lucide-react";
import {
  COMPARATIF,
  PROFILS,
  lienContact,
  lienReservation,
  type LigneComparatif,
} from "@/lib/reservation";
import { ICONES_FORMAT, ICONE_DEFAUT } from "./icones";
import "./ComparerFormats.css";

/* ══════════════════════════════════════════════════════════════════════
   <ComparerFormats> — « Comparer les formats », bento sombre à sélecteur
   (15/09/2026)

   ORIGINE. `features-card` (21st.dev), apporté par Teo : une bande NOIRE,
   un en-tête avec pastille + titre + chapô, puis une grille bento de
   cartes zinc aux tailles inégales. Sa grande carte porte une grille de
   boutons qui pilote un panneau « Selected: » ; une rangée de tuiles
   ferme la section.

   CE QUI EST REPRIS : la bande noire et ses cartes #141417 cerclées de
   #27272a (ce sont déjà celles de « Compléter votre audit », plus bas sur
   cette page), la pastille d'en-tête, les tailles de cartes inégales, le
   sélecteur qui pilote un panneau, les intitulés en petites capitales
   monospace, la rangée de tuiles du bas, le filet qui s'éclaircit au
   survol.

   CE QUI EST JETÉ, et pourquoi —

   · LES CHIFFRES DE LA SOURCE (2,5 M req/s, 99,99 % de disponibilité,
     44 points de présence, « ISO 27001 », les tendances +24 % / −8 %).
     Aucun n'est mesuré chez nous ; la règle du parc est qu'on n'invente
     ni chiffre de preuve ni certification. Les valeurs affichées ici
     sortent toutes de COMPARATIF (lib/reservation.ts), à la lettre.

   · LE BLOC TERMINAL et sa démonstration de code : on ne nomme pas nos
     outils sur le site, et un extrait de code n'a rien à dire sur un
     entretien d'audit.

   · LES LOGOS D'INTÉGRATION en émojis : même raison, et ce ne sont pas
     nos technologies.

   · L'ÎLOT CLAIR. Pas une surface claire dans la bande : une bande sombre
     parsemée de blocs blancs se lit comme un raté (leçon du 11/09 sur
     l'accueil). Les boutons de la section passent donc en `r-btn--blanc`
     et `r-btn--nuit`, jamais en carte blanche.

   CE QUE ÇA REMPLACE. Un tableau de 12 lignes × 3 colonnes, à deux
   en-têtes collants (un pour le bureau, un pour le mobile) et à moitié
   replié derrière « Voir tous les points ». Il disait tout, mais il
   fallait le lire en entier pour trouver sa ligne.

   L'ÉCART ASSUMÉ, à connaître avant de « corriger » : les trois valeurs
   d'une ligne ne sont plus côte à côte. On choisit un format en haut, et
   toutes les cartes affichent SA valeur. Les trois valeurs sont bien
   rendues dans le document — les deux autres sont seulement masquées
   (`display: none`), donc les robots d'indexation les lisent —, mais un
   Ctrl+F ne les trouvera pas : la comparaison se fait en changeant de
   format, pas en balayant une ligne. La comparaison simultanée, elle,
   vit toujours en haut de page : les trois cartes de formats y sont côte
   à côte, listes comprises.

   MÉCANIQUE, PAS ÉDITORIAL : une ligne dont les trois valeurs sont
   IDENTIQUES ne dépend pas du format — elle sort des cartes et va dans
   la rangée du bas, sous « Quel que soit le format ». Le tri est fait
   par comparaison de chaînes, jamais à la main : ajouter une ligne dans
   lib/reservation.ts la place toute seule du bon côté.
   ══════════════════════════════════════════════════════════════════════ */

const estConstante = (l: LigneComparatif) =>
  l.valeurs[0] === l.valeurs[1] && l.valeurs[1] === l.valeurs[2];

/* les familles, débarrassées de leurs lignes invariables ; une famille qui
   n'aurait plus que des invariables disparaît (aucune aujourd'hui) */
const FAMILLES = COMPARATIF.map((f) => ({
  titre: f.titre,
  lignes: f.lignes.filter((l) => !estConstante(l)),
})).filter((f) => f.lignes.length > 0);

const CONSTANTES = COMPARATIF.flatMap((f) => f.lignes.filter(estConstante));

/* les tailles de cartes du bento, dans l'ordre des familles : 3 colonnes
   sur 5, puis 3, puis 2 — le sélecteur en occupe 2 à côté de la première.
   Au-delà de trois familles, on repart sur 3 (valeur par défaut). */
const SPANS = ["cf-carte--3", "cf-carte--3", "cf-carte--2"];

function Valeurs({ ligne, actif }: { ligne: LigneComparatif; actif: number }) {
  return (
    <span className="cf-valeurs">
      {ligne.valeurs.map((v, i) => (
        <span key={i} className="cf-valeur" data-actif={i === actif ? "true" : undefined}>
          {v}
        </span>
      ))}
    </span>
  );
}

export default function ComparerFormats({ modele }: { modele?: string }) {
  const p = PROFILS[1];
  /* le format retenu par défaut est le phare — celui que la page
     recommande en haut ; à défaut, le premier */
  const parDefaut = Math.max(
    0,
    p.formules.findIndex((f) => f.phare),
  );
  const [actif, setActif] = useState(parDefaut);
  const f = p.formules[actif];

  return (
    <section id="comparatif" className="r-nuit cf">
      <div className="r-wrap py-14 sm:py-20">
        <div className="cf-tete">
          <span className="cf-pastille">
            <Building2 aria-hidden strokeWidth={1.4} />
            {p.label}
          </span>
          <h2 className="r-h2 cf-titre">Comparer les formats</h2>
          <p className="cf-chapo">
            Choisissez un format&nbsp;: chaque carte affiche ce qu&apos;il comprend, point
            par point.
          </p>
          {/* <Lien> et non <a> : lienContact() rend une adresse INTERNE
              depuis le 14/09, un <a> nu ferait recharger tout le site */}
          <Lien href={lienContact("avant")} className="r-lien cf-conseil">
            Demander conseil
          </Lien>
        </div>

        <div className="cf-bento">
          {/* ═══ la grande carte : le sélecteur et le format retenu ═══ */}
          <div data-reveal className="cf-carte cf-carte--2 cf-choix">
            <p className="cf-label">Les trois formats</p>

            <div className="cf-boutons" role="group" aria-label="Choisir un format d'audit">
              {p.formules.map((formule, i) => {
                const Icone = ICONES_FORMAT[formule.id] ?? ICONE_DEFAUT;
                const choisi = i === actif;
                return (
                  <button
                    key={formule.id}
                    type="button"
                    aria-pressed={choisi}
                    onClick={() => setActif(i)}
                    className="cf-bouton"
                    data-actif={choisi ? "true" : undefined}
                  >
                    <Icone aria-hidden className="cf-bouton-icone" strokeWidth={1.4} />
                    <span className="cf-bouton-nom">{formule.nom}</span>
                    <span className="num cf-bouton-duree">{formule.duree}</span>
                  </button>
                );
              })}
            </div>

            {/* le panneau : ce que la colonne d'en-tête collante du tableau
                disait, mais pour le seul format retenu */}
            <div className="cf-panneau">
              <p className="cf-label">Format retenu</p>
              <p className="cf-panneau-nom">{f.nom}</p>
              <p className="cf-panneau-ligne">
                <span className="num">{f.duree}</span> · {f.suffixe}
              </p>
              <p className="cf-panneau-conditions">{f.conditions}</p>
              <Link href={lienReservation(f.id, modele)} className="r-btn r-btn--blanc cf-panneau-btn">
                {f.cta}
              </Link>
              <p className="cf-panneau-note">{f.souscta}</p>
            </div>
          </div>

          {/* ═══ une carte par famille de points ═══ */}
          {FAMILLES.map((famille, i) => (
            <div
              key={famille.titre}
              data-reveal
              className={`cf-carte ${SPANS[i] ?? "cf-carte--3"}`}
            >
              <h3 className="cf-carte-titre">{famille.titre}</h3>
              <dl className="cf-lignes">
                {famille.lignes.map((l) => (
                  <div key={l.libelle} className="cf-ligne">
                    {/* l'aide explique le CRITÈRE : elle vit donc dans le
                        <dt>, pas à côté — une <dl> n'accepte que dt et dd
                        dans son emballage. Elle ne s'affiche qu'au bureau :
                        répétée sous chaque libellé, elle transformait le
                        comparatif mobile en mur de texte (règle héritée du
                        tableau qu'on remplace). */}
                    <dt className="cf-libelle">
                      {l.libelle}
                      <span className="cf-aide">{l.aide}</span>
                    </dt>
                    <dd className="cf-valeur-cell">
                      <Valeurs ligne={l} actif={actif} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}

        </div>

        {/* ═══ la rangée du bas : ce qui ne dépend pas du format ═══ */}
        <p className="cf-label cf-label--rangee">Quel que soit le format</p>
        <div className="cf-tuiles">
          {CONSTANTES.map((l) => (
            <div key={l.libelle} data-reveal className="cf-tuile">
              <Check aria-hidden className="cf-tuile-coche" strokeWidth={2} />
              <p className="cf-tuile-libelle">{l.libelle}</p>
              <p className="cf-tuile-valeur">{l.valeurs[0]}</p>
              <p className="cf-aide cf-tuile-aide">{l.aide}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
