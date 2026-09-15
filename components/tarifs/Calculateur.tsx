"use client";

/* ══════════════════════════════════════════════════════════════════════
   LE CALCULATEUR DE PALIER (15/09/2026, Teo)

   « Un bouton qui calcule : tu dis combien de factures tu as par mois, boum
   ça affiche un prix ; et si t'as pris Tout Omega, tu remplis les données. »
   Puis : « si il voit 300 euros par mois et qu'il voit pas combien il gagne,
   ça sert à rien — écrit en gros, 1400 euros d'économies moins le prix. »

   LA FORME vient de `pricing-12` (21st.dev) — le calculateur de retour sur
   investissement à deux panneaux : à gauche ce que le visiteur règle, à
   droite ce que ça donne, dans un seul cadre arrondi. Trois écarts au
   modèle, tous imposés par le parc :

   1. AUCUN JETON shadcn. `bg-card`, `bg-muted`, `text-muted-foreground`,
      `shadow-elevated-lg` ne sont définis nulle part chez nous : Tailwind
      n'émet RIEN pour une couleur inconnue, le panneau serait transparent.
      Tout est peint par le bloc `.calc-*` de globals.css, sous `.resa`, avec
      les jetons de la page (--r-texte, --r-filet, --r-or-*). Sur cette page
      un thème scopé bat de toute façon les utilitaires.
   2. LE CURSEUR EST NATIF. Le modèle appelle le Slider de shadcn, donc
      `@radix-ui/react-slider`, absent du projet. Un `input[type=range]`
      habillé rend le même dessin (rail, pastille cerclée de blanc, réglette
      graduée dessous), se pilote au clavier sans une ligne de JS et n'ajoute
      pas une dépendance à un arbre que plusieurs sessions se partagent.
   3. LE GROS CHIFFRE S'ANIME caractère par caractère comme le modèle
      (`motion/react`, déjà installé), mais `useReducedMotion` le fige pour
      qui a demandé moins d'animations.

   TOUT LE CONTENU VIT DANS lib/paliers.ts — questions, bornes des curseurs,
   coefficients, durées, profils horaires, textes. Ce fichier ne fait que le
   mettre en page. C'est la règle du dossier : un chiffre qui apparaît ici et
   nulle part ailleurs est un chiffre inventé.

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
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";

import {
  CALCULATEUR,
  PLANCHER_MENSUEL,
  POSTES,
  TARIF_PIECE,
  PROFILS_HORAIRES,
  QUESTIONS_VOLUME,
  piecesParPoste,
  verdictCalculateur,
  type Palier,
  type Poste,
  type QuestionVolume,
  type SaisieVolumes,
} from "@/lib/paliers";

/* 15/09 — écrite en séquence d'échappement et non au clavier : l'espace
   fine insécable se reperd d'une passe à l'autre, et elle s'était déjà
   dégradée ici en espace ordinaire — d'où le « € » seul en bout de ligne
   dès que la colonne se resserre. */
const NBSP = "\u202f";

const nombre = (n: number) => n.toLocaleString("fr-FR");
const euros = (n: number) => `${nombre(Math.round(n))}${NBSP}€`;

/* « 3,5 » et non « 3.5 », et « 4 » et non « 4,0 ». */
const journees = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const nomPoste = (id: Poste["id"]) => POSTES.find((p) => p.id === id)?.nom ?? id;

/* L'entrée d'un caractère du gros chiffre — reprise telle quelle du modèle :
   décalage vertical, flou et échelle, décalés de 30 ms par rang. */
const animChiffre: Variants = {
  cache: { opacity: 0, y: 10, filter: "blur(4px)", scale: 0.98 },
  vu: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    scale: 1,
    transition: { delay: i * 0.03, type: "spring", damping: 22, stiffness: 280 },
  }),
  sorti: {
    opacity: 0,
    y: -10,
    filter: "blur(4px)",
    scale: 0.98,
    transition: { duration: 0.14 },
  },
};

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
  /* 15/09 (prix continu) — remonte LES VOLUMES, plus un booléen : chaque
     carte calcule son prix sur les pièces de SES postes, d'où trois montants
     différents à partir des mêmes réponses. `null` = rien de rempli. */
  onVerdict: (volumes: SaisieVolumes | null) => void;
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
  /* 15/09 (prix continu) — `monte` et `palierCoche` ont disparu avec la
     notion de marche : le montant suit le volume sans saut. */
  /* On ne remonte que le FAIT d'avoir répondu, jamais le montant : les
     cartes tirent leur prix de PALIERS comme avant, elles attendent
     seulement le feu vert. Une seule source de vérité pour les prix. */
  /* les volumes sérialisés : dépendance stable pour l'effet ci-dessous */
  const cle = JSON.stringify(saisieUtile);
  useEffect(() => {
    onVerdict(rempli ? (JSON.parse(cle) as SaisieVolumes) : null);
  }, [rempli, cle, onVerdict]);

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

  /* Les trois verdicts, nommés une fois : le JSX en dépend quatre fois et
     une chaîne de ternaires imbriqués s'y relit mal. */
  const horsGrille = rempli && v.palier === null;
  const negatif = rempli && v.palier !== null && v.net !== null && v.net < 0;
  const gain = rempli && !horsGrille && !negatif && v.palier !== null;
  const ton = horsGrille ? "audit" : negatif ? "franc" : gain ? "gain" : "attente";

  /* 15/09, correctif — LE BOUTON MENAIT DANS LE VIDE. Il pointait sur
     `/installation?palier=<id>` ; la page ne lit que `postes=` et renvoyait
     donc à /tarifs sans un mot. Elle a raison de ne lire que ça : le prix
     du récapitulatif sort du NOMBRE de postes, lui passer un palier sans
     ses postes ferait deux façons de dire le même prix.
     Les postes ne sont connus que dans deux cas : « Tout Omega », qui les
     prend tous, et un palier dont le visiteur a coché exactement le compte
     dans les cartes. Sinon — rien de coché, ou palier monté par le calcul —
     on ne devine pas à sa place : le bouton descend à la grille. */
  const postesResa: string[] | null = (() => {
    const p: Palier | null = v.palier;
    if (!p) return null;
    if (p.aChoisir === null) return POSTES.map((x) => x.id);
    return postesChoisis.length === p.aChoisir ? postesChoisis : null;
  })();

  return (
    <section className="calc" aria-label="Calculateur de palier">
      <header className="calc-tete">
        <h3 className="calc-titre">{CALCULATEUR.entete.titre}</h3>
        <p className="calc-chapo">{CALCULATEUR.entete.texte}</p>
      </header>

      {/* ══ le cadre à deux panneaux — la géométrie du modèle ══ */}
      <div className="calc-cadre">
        {/* ——— à gauche : ce que le visiteur règle ——— */}
        <div className="calc-reglages">
          <div className="calc-questions">
            {questions.map((q) => (
              <QuestionCurseur
                key={q.posteId}
                q={q}
                idBase={idBase}
                valeur={saisie[q.posteId] ?? 0}
                surValeur={(n) => setSaisie((s) => ({ ...s, [q.posteId]: n }))}
              />
            ))}
          </div>

          <div className="calc-trait" aria-hidden="true" />

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
        </div>

        {/* ——— à droite : ce que ça donne ———
            Le panneau garde toute la hauteur du cadre (sinon la carte montre
            un fond blanc sous lui), mais son CONTENU est collant à partir de
            1024 px : avec quatre curseurs, la colonne de gauche fait plus de
            1 200 px et le résultat sortait de l'écran dès le deuxième
            réglage. On règle en voyant le chiffre bouger. */}
        <div className="calc-resultat" data-ton={ton}>
          <div className="calc-resultat-dedans">
          {!rempli && (
            <div className="calc-bloc">
              <p className="calc-resultat-titre">{CALCULATEUR.avant.sous}</p>
              <p className="calc-gain-chiffre">{CALCULATEUR.avant.grand}</p>
              <p className="calc-gain-note">{CALCULATEUR.avant.note}</p>
            </div>
          )}

          {horsGrille && (
            <div className="calc-bloc">
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
          )}

          {negatif && v.palier && (
            <div className="calc-bloc">
              <p className="calc-verdict-titre">{CALCULATEUR.negatif.titre}</p>
              <p className="calc-verdict-texte">
                Les {journees(Math.round(v.heuresRecuperees))} heures que le système vous rendrait
                valent {euros(v.valeurRecuperee)} par mois, pour un abonnement à{" "}
                {euros(v.prix ?? 0)}. {CALCULATEUR.negatif.texte}
              </p>
              <a className="calc-bouton" href="/reserver-un-audit">
                {CALCULATEUR.negatif.cta}
              </a>
              <button type="button" className="calc-retour" onClick={() => setOuvert(false)}>
                {CALCULATEUR.negatif.retour}
              </button>
            </div>
          )}

          {gain && v.palier && (
            <div className="calc-bloc">
              {/* 15/09 — plus de « palier au-dessus » à proposer : le prix est
                  continu, il n'y a pas de marche à franchir. On rappelle d'où
                  sort le montant, et que l'audit le fixe. */}
              <p className="calc-monte">
                <span className="calc-etiquette">{CALCULATEUR.estimation.etiquette}</span>
                {nombre(v.pieces)} pièces par mois, à {TARIF_PIECE}&nbsp;€ la pièce
                {v.prix === PLANCHER_MENSUEL ? ` — minimum de ${PLANCHER_MENSUEL} € appliqué` : ""}.{" "}
                {CALCULATEUR.estimation.phrase}
              </p>

              {/* le chiffre en gros, la soustraction est dans le détail dessous */}
              <p className="calc-resultat-titre">Ce que ces heures valent</p>
              <ChiffreAnime valeur={v.valeurRecuperee} />
              <p className="calc-gain-libelle">de temps récupéré chaque mois</p>
              <p className="calc-gain-note">
                {journees(Math.round(v.heuresRecuperees))} heures rendues sur les{" "}
                {journees(Math.round(v.heuresActuelles))} que ces {nombre(v.pieces)} pièces vous
                coûtent aujourd&apos;hui, soit {journees(v.journees)} journées par mois rendues à
                votre métier.
              </p>

              {postesResa ? (
                <a className="calc-bouton" href={`/installation?postes=${postesResa.join(",")}`}>
                  Réserver l&apos;installation — {euros(v.palier.installation)}
                </a>
              ) : (
                <a className="calc-bouton" href="#grille">
                  {v.palier.aChoisir === 1
                    ? "Choisir mon poste"
                    : `Choisir mes ${v.palier.aChoisir} postes`}
                </a>
              )}
              <p className="calc-souscta">
                Puis {euros(v.prix ?? 0)} par mois · satisfait ou remboursé 30 jours
              </p>
            </div>
          )}

          {/* ——— la conversion, montrée et non cachée ——— */}
          {rempli && (
            <div className="calc-detail">
              <p className="calc-detail-titre">{CALCULATEUR.detail.titre}</p>
              <ul className="calc-detail-liste">
                {lignes.map((l) => (
                  <li key={l.question.posteId}>
                    <span className="calc-detail-saisi">
                      {nombre(l.saisi)} {l.question.unite}
                    </span>
                    <span className="calc-detail-pieces">
                      {nombre(Math.round(l.pieces))} pièces
                    </span>
                    <span className="calc-detail-regle">{l.question.conversion}</span>
                  </li>
                ))}
              </ul>

              <div className="calc-ligne">
                <span>{CALCULATEUR.detail.total}</span>
                <strong>{nombre(v.pieces)} pièces par mois</strong>
              </div>
              <div className="calc-ligne">
                <span>
                  Temps rendu, à {taux}
                  {NBSP}€ de l&apos;heure
                </span>
                <strong>{euros(v.valeurRecuperee)}</strong>
              </div>
              {v.palier && (
                <div className="calc-ligne">
                  <span>Abonnement {v.palier.nom}</span>
                  <strong>− {euros(v.prix ?? 0)}</strong>
                </div>
              )}
              {gain && (
                <>
                  <div className="calc-trait calc-trait--serre" aria-hidden="true" />
                  <div className="calc-ligne calc-ligne--net">
                    <span>Net par mois</span>
                    <strong>{euros(net)}</strong>
                  </div>
                  <p className="calc-annee">soit {euros(net * 12)} sur l&apos;année.</p>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ——— ce que le chiffre ne dit pas : le plancher, les encours, la portée ——— */}
      {gain && (
        <>
          <p className="calc-pied">{CALCULATEUR.gain.plancher}</p>
          <p className="calc-pied">{CALCULATEUR.gain.encours}</p>
        </>
      )}
      <p className="calc-pied calc-pied--regle">{CALCULATEUR.pied}</p>
    </section>
  );
}

/* ——— une question : l'intitulé, le chiffre en grand, le curseur, la règle ——— */
function QuestionCurseur({
  q,
  idBase,
  valeur,
  surValeur,
}: {
  q: QuestionVolume;
  idBase: string;
  valeur: number;
  surValeur: (n: number) => void;
}) {
  const id = `${idBase}-${q.posteId}`;
  /* Vingt intervalles, comme le modèle : une graduation courte partout, une
     longue et chiffrée tous les cinq. Le dernier chiffre porte un « + » —
     au-delà, on sort de la grille et c'est l'audit qui répond. */
  const intervalles = 20;
  const graduations = Array.from(
    { length: intervalles + 1 },
    (_, i) => (q.max / intervalles) * i,
  );

  return (
    <div className="calc-q">
      <label className="calc-q-question" htmlFor={id}>
        <span className="calc-poste">{nomPoste(q.posteId)}</span>
        {q.question}
      </label>

      <p className="calc-q-valeur">
        <span className="calc-q-nombre">{nombre(valeur)}</span>
        <span className="calc-q-unite">{q.unite}</span>
      </p>

      <div className="calc-curseur">
        <input
          id={id}
          type="range"
          min={0}
          max={q.max}
          step={q.pas}
          value={valeur}
          onChange={(e) => surValeur(+e.target.value)}
          /* la part remplie du rail : le dégradé du fond la lit, ce qui
             évite un second élément posé par-dessus l'input natif */
          style={{ "--part": `${(valeur / q.max) * 100}%` } as React.CSSProperties}
        />
        <span className="calc-regle" aria-hidden="true">
          {graduations.map((g, i) => (
            <span key={i} className="calc-graduation" data-longue={i % 5 === 0}>
              <span className="calc-graduation-trait" />
              <span className="calc-graduation-nombre">
                {i % 5 === 0 ? `${nombre(Math.round(g))}${i === intervalles ? "+" : ""}` : ""}
              </span>
            </span>
          ))}
        </span>
      </div>

      <p className="calc-aide">{q.aide}</p>
    </div>
  );
}

/* ——— le gros chiffre, caractère par caractère ——— */
function ChiffreAnime({ valeur }: { valeur: number }) {
  const fige = useReducedMotion();
  const texte = euros(valeur);

  if (fige) return <p className="calc-gain-chiffre">{texte}</p>;

  return (
    <p className="calc-gain-chiffre">
      <AnimatePresence mode="popLayout" initial={false}>
        {texte.split("").map((c, i) => (
          <motion.span
            key={`${valeur}-${i}`}
            variants={animChiffre}
            initial="cache"
            animate="vu"
            exit="sorti"
            custom={i}
            className="calc-gain-caractere"
          >
            {c === " " ? NBSP : c}
          </motion.span>
        ))}
      </AnimatePresence>
    </p>
  );
}
