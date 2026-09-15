"use client";

/* ══════════════════════════════════════════════════════════════════════
   LE CALCULATEUR DE PALIER (15/09/2026, Teo)

   « Un bouton qui calcule : tu dis combien de factures tu as par mois, boum
   ça affiche un prix ; et si t'as pris Tout Omega, tu remplis les données. »
   Puis : « si il voit 300 euros par mois et qu'il voit pas combien il gagne,
   ça sert à rien — écrit en gros, 1400 euros d'économies moins le prix. »

   TOUT LE CONTENU VIT DANS lib/paliers.ts — questions, coefficients, durées,
   profils horaires, textes. Ce fichier ne fait que le mettre en page. C'est
   la règle du dossier : un chiffre qui apparaît ici et nulle part ailleurs
   est un chiffre inventé.

   TROIS CHOSES À NE PAS DÉFAIRE :

   · IL N'APPARAÎT QUE CÔTÉ « Indépendant & TPE ». Le monde « plusieurs
     services valident » va à l'audit et ne le voit jamais (Grille.tsx ne le
     monte pas quand `devis`).

   · LE CALCUL RESTE SUR L'APPAREIL. Aucun fetch, aucune donnée transmise,
     y compris à la réservation : reserver_audit fige son propre instantané
     de prix, lui passer un volume déclaré créerait deux sources de vérité.
     C'est aussi ce qui autorise la phrase de l'en-tête du panneau.

   · QUAND LE CALCUL EST NÉGATIF, ON L'AFFICHE. Le bouton reste « en
     parler », jamais « souscrire quand même ». C'est la règle de la maison
     (« si l'audit ne montre rien, ne rien installer »), écrite pour la
     première fois là où un visiteur peut la lire — et c'est ce que cet
     écran a de plus crédible. Ne pas la transformer en rattrapage.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useId, useMemo, useState } from "react";

import {
  CALCULATEUR,
  PALIERS,
  POSTES,
  PROFILS_HORAIRES,
  QUESTIONS_VOLUME,
  piecesParPoste,
  verdictCalculateur,
  type Poste,
  type SaisieVolumes,
} from "@/lib/paliers";

const NBSP = " ";

const nombre = (n: number) => n.toLocaleString("fr-FR");
const euros = (n: number) => `${nombre(Math.round(n))}${NBSP}€`;

/* « 3,5 » et non « 3.5 », et « 4 » et non « 4,0 ». */
const journees = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const nomPoste = (id: Poste["id"]) => POSTES.find((p) => p.id === id)?.nom ?? id;

export default function Calculateur({
  postesChoisis,
  palierChoisi,
  onVerdict,
}: {
  /* les postes cochés dans la grille — vide tant que rien n'est choisi */
  postesChoisis: string[];
  palierChoisi: string;
  /* 15/09 — remonte à la grille le FAIT d'avoir répondu. C'est ce qui ouvre
     l'affichage des prix sur les cartes et dans le comparatif : avant, un
     montant serait un montant qu'on a choisi, pas un montant qui sort de
     son cas. Passe `true` dès qu'une question est remplie. */
  onVerdict: (repondu: boolean) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState<SaisieVolumes>({});
  const [profil, setProfil] = useState(PROFILS_HORAIRES[0].id);
  const idBase = useId();

  /* Quelles questions poser. On ne repose pas le choix des postes : il est
     déjà fait dans les cartes. Tant que rien n'est coché — ou quand « Tout
     Omega » l'est —, on pose les quatre : c'est le cas où le visiteur veut
     justement voir ce que l'ensemble donne. */
  const questions = useMemo(() => {
    if (palierChoisi === "complet" || postesChoisis.length === 0) return QUESTIONS_VOLUME;
    return QUESTIONS_VOLUME.filter((q) => postesChoisis.includes(q.posteId));
  }, [palierChoisi, postesChoisis]);

  const taux = PROFILS_HORAIRES.find((p) => p.id === profil)?.taux ?? 60;
  const lignes = piecesParPoste(saisie).filter((l) =>
    questions.some((q) => q.posteId === l.question.posteId),
  );
  const saisieUtile = Object.fromEntries(
    lignes.map((l) => [l.question.posteId, l.saisi]),
  ) as SaisieVolumes;
  const rempli = lignes.length > 0;
  const v = verdictCalculateur(saisieUtile, taux);

  /* Le palier que la grille propose : celui qui couvre le volume, ou celui
     que le visiteur avait coché s'il est plus grand (on ne redescend jamais
     quelqu'un qui a choisi plus large — il a peut-être ses raisons). */
  /* `v.net` vaut null hors grille ; dans la branche « gain » il est
     forcément un nombre, mais le rétrécissement ne traverse pas la
     chaîne de ternaires du JSX — on le fige ici. */
  const net = v.net ?? 0;
  const palierCoche = PALIERS.find((p) => p.id === palierChoisi) ?? null;
  const monte =
    v.palier && palierCoche && v.palier.plafond > palierCoche.plafond ? v.palier : null;

  /* On ne remonte que le FAIT d'avoir répondu, jamais le montant : les
     cartes tirent leur prix de PALIERS comme avant, elles attendent
     seulement le feu vert. Une seule source de vérité pour les prix. */
  useEffect(() => {
    onVerdict(rempli);
  }, [rempli, onVerdict]);

  if (!ouvert) {
    return (
      <div className="calc-appel">
        <div>
          <p className="calc-appel-titre">{CALCULATEUR.appel.titre}</p>
          <p className="calc-appel-texte">{CALCULATEUR.appel.texte}</p>
        </div>
        <button type="button" className="calc-bouton" onClick={() => setOuvert(true)}>
          {CALCULATEUR.appel.cta}
        </button>
      </div>
    );
  }

  return (
    <section className="calc" aria-label="Calculateur de palier">
      <header className="calc-tete">
        <h3 className="calc-titre">{CALCULATEUR.entete.titre}</h3>
        <p className="calc-chapo">{CALCULATEUR.entete.texte}</p>
      </header>

      {/* ——— les champs, un par poste coché ——— */}
      <div className="calc-champs">
        {questions.map((q) => {
          const id = `${idBase}-${q.posteId}`;
          return (
            <div key={q.posteId} className="calc-champ">
              <label className="calc-label" htmlFor={id}>
                <span className="calc-poste">{nomPoste(q.posteId)}</span>
                {q.question}
              </label>
              <div className="calc-saisie">
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  className="calc-input"
                  value={saisie[q.posteId] ?? ""}
                  placeholder="0"
                  onChange={(e) => {
                    const n = e.target.value === "" ? undefined : Math.max(0, +e.target.value);
                    setSaisie((s) => ({ ...s, [q.posteId]: n }));
                  }}
                />
                <span className="calc-unite">{q.unite}</span>
              </div>
              <p className="calc-aide">{q.aide}</p>
            </div>
          );
        })}
      </div>

      {/* ——— qui fait ce travail : LA question, sans laquelle le gain est faux ——— */}
      <fieldset className="calc-qui">
        <legend className="calc-qui-titre">{CALCULATEUR.qui.question}</legend>
        <div className="calc-qui-choix">
          {PROFILS_HORAIRES.map((p) => (
            <label key={p.id} className="calc-radio" data-actif={profil === p.id}>
              <input
                type="radio"
                name={`${idBase}-profil`}
                checked={profil === p.id}
                onChange={() => setProfil(p.id)}
              />
              <span className="calc-radio-libelle">{p.libelle}</span>
              <span className="calc-radio-taux">
                {p.detail}, compté {p.taux}
                {NBSP}€
              </span>
            </label>
          ))}
        </div>
        <p className="calc-aide">{CALCULATEUR.qui.aide}</p>
      </fieldset>

      {rempli && (
        <>
          {/* ——— la conversion, montrée et non cachée ——— */}
          <div className="calc-detail">
            <p className="calc-detail-titre">{CALCULATEUR.detail.titre}</p>
            <ul className="calc-detail-liste">
              {lignes.map((l) => (
                <li key={l.question.posteId}>
                  <span>
                    {nombre(l.saisi)} {l.question.unite}
                  </span>
                  <span className="calc-detail-fleche" aria-hidden="true">
                    →
                  </span>
                  <span className="calc-detail-pieces">
                    {nombre(Math.round(l.pieces))} pièces
                    <span className="calc-detail-regle"> · {l.question.conversion}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="calc-detail-total">
              {CALCULATEUR.detail.total} : <strong>{nombre(v.pieces)} pièces par mois</strong>
            </p>
          </div>

          {/* ——— le verdict ——— */}
          {v.palier === null ? (
            <div className="calc-verdict" data-ton="audit">
              <p className="calc-verdict-titre">{CALCULATEUR.horsGrille.titre}</p>
              <p className="calc-verdict-texte">
                Vos {nombre(v.pieces)} pièces mensuelles dépassent ce que la grille publique
                couvre. {CALCULATEUR.horsGrille.texte}
              </p>
              <a className="calc-bouton" href="/reserver-un-audit">
                {CALCULATEUR.horsGrille.cta}
              </a>
              <p className="calc-souscta">{CALCULATEUR.horsGrille.souscta}</p>
            </div>
          ) : v.net !== null && v.net < 0 ? (
            <div className="calc-verdict" data-ton="franc">
              <p className="calc-verdict-titre">{CALCULATEUR.negatif.titre}</p>
              <p className="calc-verdict-texte">
                Les {journees(Math.round(v.heuresRecuperees))} heures que le système vous rendrait
                valent {euros(v.valeurRecuperee)} par mois, pour un abonnement à{" "}
                {euros(v.palier.prix)}. {CALCULATEUR.negatif.texte}
              </p>
              <a className="calc-bouton" href="/reserver-un-audit">
                {CALCULATEUR.negatif.cta}
              </a>
              <button
                type="button"
                className="calc-retour"
                onClick={() => setOuvert(false)}
              >
                {CALCULATEUR.negatif.retour}
              </button>
            </div>
          ) : (
            <div className="calc-verdict" data-ton="gain">
              {monte && (
                <p className="calc-monte">
                  Vous aviez coché {palierCoche?.nom}, qui comprend{" "}
                  {nombre(palierCoche?.plafond ?? 0)} pièces par mois ; vos réponses en donnent{" "}
                  {nombre(v.pieces)}. <strong>{v.palier.nom}</strong> en comprend{" "}
                  {nombre(v.palier.plafond)}.
                </p>
              )}

              {/* le chiffre en gros, puis la soustraction */}
              <p className="calc-gain-chiffre">{euros(v.valeurRecuperee)}</p>
              <p className="calc-gain-libelle">de temps récupéré chaque mois</p>
              <p className="calc-gain-note">
                {journees(Math.round(v.heuresRecuperees))} heures rendues, sur les{" "}
                {journees(Math.round(v.heuresActuelles))} que ces {nombre(v.pieces)} pièces vous
                coûtent aujourd&apos;hui.
              </p>

              <div className="calc-soustraction">
                <span>− {euros(v.palier.prix)} d&apos;abonnement</span>
                <strong>= {euros(net)} net par mois</strong>
                <span>soit {euros(net * 12)} sur l&apos;année.</span>
              </div>

              <p className="calc-journees">
                Soit {journees(v.journees)} journées par mois, rendues à votre métier.
              </p>
              <p className="calc-verdict-texte">{CALCULATEUR.gain.plancher}</p>

              <a className="calc-bouton" href={`/installation?palier=${v.palier.id}`}>
                Réserver l&apos;installation — {euros(v.palier.installation)}
              </a>
              <p className="calc-souscta">
                Puis {euros(v.palier.prix)} par mois · satisfait ou remboursé 30 jours
              </p>
              <p className="calc-encours">{CALCULATEUR.gain.encours}</p>
            </div>
          )}
        </>
      )}

      <p className="calc-pied">{CALCULATEUR.pied}</p>
    </section>
  );
}
