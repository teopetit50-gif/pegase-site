"use client";

/* ══════════════════════════════════════════════════════════════════════
   LE COMPARATEUR DE CAS TYPES (22/09/2026, Teo)

   « Change ce composant par le composant de comparaison, et mets des
   exemples : x factures et y demandes font perdre en moyenne tant de
   temps. » Le calculateur à deux panneaux et quatre curseurs (pricing-12,
   15/09) est remplacé par le TABLEAU DE COMPARAISON de 21st.dev
   (comparison-table) : une carte, des filtres en tête (recherche, secteur,
   remise à zéro), un tableau dont chaque ligne porte un bouton « Comparer »,
   et — dès que deux lignes sont cochées — un comparatif attribut par
   attribut sous le tableau, la meilleure valeur mise en couleur.

   Ce qui change par rapport au modèle, et pourquoi :

   1. AUCUN JETON shadcn, AUCUNE DÉPENDANCE NOUVELLE. Le modèle appelle
      Card, Table, Input, Select (Radix) et Button. `bg-muted`,
      `text-muted-foreground` ne sont définis nulle part chez nous —
      Tailwind n'émet rien pour une couleur inconnue — et
      @radix-ui/react-select n'est pas dans le projet. Un <table> natif,
      un <input> et un <select> natifs habillés par le bloc `.cmp-*` de
      globals.css (sous `.resa`, avec les jetons de la page) rendent le
      même dessin, se pilotent au clavier, et n'ajoutent rien à un arbre
      que plusieurs sessions se partagent.
   2. LES LIGNES SONT DES ACTIVITÉS, pas des produits. Les colonnes du
      modèle (prix, note, stock) deviennent : les volumes, les pièces par
      mois, les heures perdues par mois. Le comparatif compare cinq
      attributs (pièces, heures perdues, heures rendues, journées, valeur).
      « Mieux » = plus à récupérer : c'est la valeur la plus haute qui est
      marquée, à l'or de la page et non au vert du modèle.
   3. LE FILTRE DE SECTEUR SORT DES DONNÉES (SECTEURS), le modèle codait
      ses quatre catégories dans le JSX.

   TOUT LE CONTENU VIT DANS lib/paliers.ts — cas types, volumes, profils
   horaires, textes, et le calcul (verdictExemple, qui repasse par
   verdictCalculateur : mêmes minutes par pièce, même part récupérée).
   Ce fichier ne fait que le mettre en page. Un chiffre qui apparaît ici
   et nulle part ailleurs est un chiffre inventé.

   CE QUI NE CHANGE PAS pour la grille : le composant garde son nom, ses
   props et son contrat. `onVerdict` remonte les volumes du DERNIER cas
   coché (null quand rien ne l'est) : les cartes affichent alors les
   heures de ce cas, poste par poste, comme elles le faisaient avec les
   réponses du visiteur. Il n'apparaît que côté « Indépendant & TPE »
   (Grille.tsx ne le monte pas quand `devis`), et tout reste sur
   l'appareil : aucun fetch, rien de transmis.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useId, useMemo, useState } from "react";

import { lienAudit } from "@/lib/reservation";
import {
  COMPARATEUR,
  EXEMPLES_VOLUMES,
  PROFILS_HORAIRES,
  QUESTIONS_VOLUME,
  SECTEURS,
  verdictExemple,
  type ExempleVolumes,
  type Poste,
  type SaisieVolumes,
} from "@/lib/paliers";

/* espace fine insécable, en séquence d'échappement (elle se reperd d'une
   passe à l'autre quand elle est tapée au clavier) */
const NBSP = " ";
const nombre = (n: number) => n.toLocaleString("fr-FR");
const euros = (n: number) => `${nombre(Math.round(n))}${NBSP}€`;
/* « 3,5 » et non « 3.5 », et « 4 » et non « 4,0 » */
const decimale = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/* l'unité courte d'un volume, pour la ligne du tableau :
   « 120 factures · 12 demandes/j · 90 devis · 1 800 clients » */
const UNITE_COURTE: Record<Poste["id"], string> = {
  filed: "factures",
  frontd: "demandes/j",
  cashd: "devis",
  reload: "clients",
};

function volumesCourts(v: SaisieVolumes) {
  return QUESTIONS_VOLUME.filter((q) => (v[q.posteId] ?? 0) > 0).map(
    (q) => `${nombre(v[q.posteId] as number)} ${UNITE_COURTE[q.posteId]}`,
  );
}

type Cas = ExempleVolumes & { v: ReturnType<typeof verdictExemple> };

export default function Calculateur({
  onVerdict,
}: {
  /* les postes cochés dans la grille et le palier — le comparateur ne les
     lit pas (ses lignes sont des cas complets), mais la grille les passe
     toujours : le contrat ne bouge pas */
  postesChoisis: string[];
  palierChoisi: string;
  /* remonte à la grille les volumes du dernier cas coché, null sinon */
  onVerdict: (volumes: SaisieVolumes | null) => void;
}) {
  const [choisis, setChoisis] = useState<string[]>([]);
  const [recherche, setRecherche] = useState("");
  const [secteur, setSecteur] = useState<string>("tous");
  const idBase = useId();

  /* chiffrés une fois pour toutes : les cas ne changent pas */
  const cas = useMemo<Cas[]>(
    () => EXEMPLES_VOLUMES.map((e) => ({ ...e, v: verdictExemple(e) })),
    [],
  );

  const basculer = (id: string) =>
    setChoisis((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev,
    );

  const remettre = () => {
    setChoisis([]);
    setRecherche("");
    setSecteur("tous");
  };

  const filtres = cas.filter((c) => {
    const q = recherche.trim().toLowerCase();
    const parNom = !q || `${c.nom} ${c.taille} ${c.secteur}`.toLowerCase().includes(q);
    const parSecteur = secteur === "tous" || c.secteur === secteur;
    return parNom && parSecteur;
  });

  /* dans l'ordre où ils ont été cochés — la colonne A reste la colonne A */
  const compares = choisis
    .map((id) => cas.find((c) => c.id === id))
    .filter((c): c is Cas => c !== undefined);

  /* la grille reçoit les volumes du dernier cas coché */
  const dernier = compares[compares.length - 1];
  const cle = dernier ? JSON.stringify(dernier.volumes) : "";
  useEffect(() => {
    onVerdict(cle ? (JSON.parse(cle) as SaisieVolumes) : null);
  }, [cle, onVerdict]);

  const pleins = compares.length === 2;

  return (
    <section className="calc" aria-label="Comparaison de cas types">
      <header className="calc-tete">
        <h3 className="calc-titre">{COMPARATEUR.entete.titre}</h3>
        <p className="calc-chapo">{COMPARATEUR.entete.texte}</p>
      </header>

      <div className="cmp-carte">
        {/* ——— les filtres : recherche, secteur, remise à zéro ——— */}
        <div className="cmp-filtres">
          <label className="cmp-champ">
            <span className="sr-only">{COMPARATEUR.filtres.recherche}</span>
            <input
              type="search"
              className="cmp-entree"
              placeholder={`${COMPARATEUR.filtres.recherche}…`}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </label>
          <label className="cmp-champ cmp-champ--select">
            <span className="sr-only">Secteur</span>
            <select
              className="cmp-entree cmp-select"
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
            >
              <option value="tous">{COMPARATEUR.filtres.tous}</option>
              {SECTEURS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="cmp-bouton" onClick={remettre}>
            {COMPARATEUR.filtres.reinitialiser}
          </button>
        </div>

        {/* ——— le tableau ——— */}
        <table className="cmp-table">
          <thead>
            <tr>
              <th scope="col">{COMPARATEUR.colonnes.activite}</th>
              <th scope="col" className="cmp-col-pieces">
                {COMPARATEUR.colonnes.pieces}
              </th>
              <th scope="col" className="cmp-col-heures">
                {COMPARATEUR.colonnes.heures}
              </th>
              <th scope="col" className="cmp-col-action">
                <span className="sr-only">{COMPARATEUR.colonnes.comparer}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtres.map((c) => {
              const coche = choisis.includes(c.id);
              const bloque = !coche && choisis.length >= 2;
              return (
                <tr key={c.id} data-coche={coche}>
                  <th scope="row">
                    <span className="cmp-nom">
                      {c.nom}
                      <span className="cmp-taille">{c.taille}</span>
                    </span>
                    <span className="cmp-volumes">{volumesCourts(c.volumes).join(" · ")}</span>
                  </th>
                  <td className="cmp-col-pieces">
                    {nombre(c.v.pieces)}
                    {c.v.palier === null && (
                      <span className="cmp-audit" title={COMPARATEUR.audit}>
                        audit
                      </span>
                    )}
                  </td>
                  <td className="cmp-col-heures">
                    <strong>{nombre(Math.round(c.v.heuresActuelles))}</strong>
                    <span className="cmp-heures-note"> h</span>
                  </td>
                  <td className="cmp-col-action">
                    <button
                      type="button"
                      className="cmp-bouton"
                      data-coche={coche}
                      disabled={bloque}
                      aria-pressed={coche}
                      aria-describedby={`${idBase}-consigne`}
                      onClick={() => basculer(c.id)}
                    >
                      {coche ? COMPARATEUR.boutons.retirer : COMPARATEUR.boutons.comparer}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtres.length === 0 && (
              <tr>
                <td colSpan={4} className="cmp-vide">
                  Aucune activité ne correspond.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!pleins && (
          <p id={`${idBase}-consigne`} className="cmp-consigne">
            {COMPARATEUR.consigne}
          </p>
        )}

        {/* ——— le comparatif, dès que deux lignes sont cochées ——— */}
        {pleins && (
          <div className="cmp-resultat">
            <h4 className="cmp-resultat-titre">{COMPARATEUR.resultat.titre}</h4>
            <dl className="cmp-grille">
              <div className="cmp-ligne cmp-ligne--tete">
                <dt>&nbsp;</dt>
                {compares.map((c) => (
                  <dd key={c.id}>
                    <span className="cmp-nom">{c.nom}</span>
                    <span className="cmp-taille">{c.taille}</span>
                  </dd>
                ))}
              </div>
              <Ligne
                libelle={COMPARATEUR.resultat.lignes.pieces}
                valeurs={compares.map((c) => c.v.pieces)}
                rendu={(n, c) =>
                  c.v.palier === null ? (
                    <>
                      {nombre(n)}
                      <span className="cmp-audit" title={COMPARATEUR.audit}>
                        audit
                      </span>
                    </>
                  ) : (
                    nombre(n)
                  )
                }
                compares={compares}
              />
              <Ligne
                libelle={COMPARATEUR.resultat.lignes.actuelles}
                valeurs={compares.map((c) => Math.round(c.v.heuresActuelles))}
                rendu={(n) => `${nombre(n)} h`}
                compares={compares}
              />
              <Ligne
                libelle={COMPARATEUR.resultat.lignes.rendues}
                valeurs={compares.map((c) => Math.round(c.v.heuresRecuperees))}
                rendu={(n) => `${nombre(n)} h`}
                compares={compares}
              />
              <Ligne
                libelle={COMPARATEUR.resultat.lignes.journees}
                valeurs={compares.map((c) => c.v.journees)}
                rendu={(n) => decimale(n)}
                compares={compares}
              />
              <Ligne
                libelle={COMPARATEUR.resultat.lignes.valeur}
                valeurs={compares.map((c) => c.v.valeurRecuperee)}
                rendu={(n, c) => (
                  <>
                    {euros(n)}
                    <span className="cmp-taux">
                      {PROFILS_HORAIRES.find((p) => p.id === c.profil)?.libelle.toLowerCase()},{" "}
                      {c.v.taux}
                      {NBSP}€/h
                    </span>
                  </>
                )}
                compares={compares}
              />
            </dl>
            <p className="cmp-note">{COMPARATEUR.resultat.note}</p>
            <a className="calc-bouton" href={lienAudit([], 0)}>
              {COMPARATEUR.resultat.cta}
            </a>
            <p className="calc-souscta">{COMPARATEUR.resultat.souscta}</p>
          </div>
        )}
      </div>

      <p className="calc-pied calc-pied--regle">{COMPARATEUR.pied}</p>
    </section>
  );
}

/* ——— une ligne du comparatif : le libellé, puis une valeur par cas.
   La plus haute est marquée — c'est celle où il y a le plus à récupérer.
   À égalité, aucune ne l'est. ——— */
function Ligne({
  libelle,
  valeurs,
  rendu,
  compares,
}: {
  libelle: string;
  valeurs: number[];
  rendu: (n: number, c: Cas) => React.ReactNode;
  compares: Cas[];
}) {
  const max = Math.max(...valeurs);
  const egales = valeurs.every((n) => n === max);
  return (
    <div className="cmp-ligne">
      <dt>{libelle}</dt>
      {compares.map((c, i) => (
        <dd key={c.id} data-mieux={!egales && valeurs[i] === max}>
          {rendu(valeurs[i], c)}
        </dd>
      ))}
    </div>
  );
}
