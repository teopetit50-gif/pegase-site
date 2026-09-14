"use client";

import { useState } from "react";
import type { Membre } from "@/lib/equipe";
import "./team-showcase.css";

/* ══════════════════════════════════════════════════════════════════════
   TEAM SHOWCASE — la mosaïque d'équipe (12/09/2026)

   ORIGINE. `team-showcase` de 21st.dev : une mosaïque de portraits en trois
   colonnes décalées à gauche, la liste des noms à droite, et un survol qui
   relie les deux — la vignette s'encre pendant que les autres s'atténuent,
   et le nom d'en face s'allume. Le mouvement est la raison d'être du
   composant : aucune capture ne le montre.

   Le contenu vit dans lib/equipe.ts, pas ici. La mosaïque s'adapte au
   nombre réel de fiches (1 à 8) — les colonnes se remplissent une sur
   trois, comme dans l'original, donc trois personnes donnent trois
   colonnes d'une vignette et la quatrième reviendra en tête de la
   première.

   ─ HUIT ÉCARTS AVEC L'ORIGINAL ─
   Tous notés, sinon quelqu'un les « corrigera » plus tard en croyant bien
   faire.

   1. `react-icons` N'EST PAS INSTALLÉ, et ne le sera pas pour quatre
      glyphes. La rangée d'icônes sociales devient un lien texte optionnel
      (`membre.lien`). À noter pour la suite : LinkedIn a été RETIRÉ de
      `simple-icons`, le seul jeu de logos du dépôt — son tracé n'existe
      nulle part ici, et le redessiner serait reprendre une marque.
   2. LES JETONS SHADCN NE VALENT RIEN DANS CE DÉPÔT. `text-foreground`,
      `text-muted-foreground`, `bg-foreground/25` : aucun n'est défini.
      Tailwind n'émet alors RIEN — ce n'est pas approximatif, c'est
      invisible, et sans un avertissement. Tout passe par les `--o-*` du
      monde `.offres`.
   3. LARGEURS FLUIDES au lieu des largeurs en pixels de l'original.
      Trois vignettes fixes plus deux gouttières font 363 px à 390 px de
      fenêtre, où la colonne n'en offre que 342 : l'original s'en sort par
      un `overflow-x-auto`, c'est-à-dire un défilement horizontal sur
      téléphone pour trois images. Ici les colonnes sont des `flex`
      pondérés 155 / 172 / 162 — les proportions exactes de l'original —
      et chaque vignette porte son rapport de forme. Elles ne débordent à
      aucune largeur.
   4. PAS DE NOIR ET BLANC. L'original grise les portraits au repos et ne
      leur rend la couleur qu'au survol. Deux raisons de l'avoir retiré :
      sur un téléphone personne ne survole rien, donc les visages y
      restaient gris pour toujours ; et Teo l'a tranché le 14/09 (« les
      photos sont noires alors qu'elles ont de la couleur de base »). Ce
      qui relie les deux moitiés n'était de toute façon pas la couleur mais
      l'ATTÉNUATION des autres vignettes, qui, elle, est conservée.
   5. `duration-400` DE L'ORIGINAL N'EXISTE PAS dans Tailwind (l'échelle
      passe de 300 à 500) : la classe était du texte mort et la transition
      instantanée. Les durées sont dans la feuille.
   6. SANS PHOTO, LA VIGNETTE REND UN MONOGRAMME. Un portrait qui n'est pas
      encore livré ne doit pas trouer la page. L'`onError` couvre le cas où
      le chemin est annoncé dans lib/equipe.ts avant que le fichier ne soit
      déposé : on retombe sur les initiales au lieu d'une image cassée.
   7. UN DESCRIPTIF SOUS CHAQUE NOM (14/09) — l'original n'affiche que le
      nom et le rôle. Le champ `bio` de lib/equipe.ts, jusque-là lu par la
      seule grille de fiches, est rendu ici sous le rôle. Budget : trois
      lignes par personne, c'est la colonne de droite qui donne la mesure.

   8. ACCESSIBILITÉ. La mosaïque est `aria-hidden` : elle répète mot pour
      mot la liste qui la suit, et un lecteur d'écran énoncerait chaque nom
      deux fois. Le lien optionnel, invisible au repos chez l'original,
      apparaît aussi au focus clavier — sinon la tabulation se poserait sur
      un lien invisible et inerte.
   ══════════════════════════════════════════════════════════════════════ */

/* Les proportions des trois colonnes de l'original (155 / 172 / 162 px),
   gardées en poids de flex pour qu'elles se règlent sur la place offerte. */
const POIDS = [155, 172, 162];

/* Le décalage vertical qui fait la mosaïque. L'original pose 0 / 68 / 32 px
   pour des vignettes de 165 px ; les mêmes rapports, par palier — creusés
   d'un tiers à partir de `lg` depuis que les descriptifs sont là (14/09) :
   à trois personnes, la mosaïque n'a qu'une vignette par colonne, donc
   250 px de haut, quand la colonne de droite en fait le double. Le décalage
   plus franc, et l'alignement VERTICALEMENT CENTRÉ de la paire, répartissent
   le vide au lieu de le laisser tout entier sous les photos. */
const DECALAGE = [
  "",
  "mt-[34px] sm:mt-[46px] lg:mt-[76px]",
  "mt-[16px] sm:mt-[22px] lg:mt-[36px]",
];

type Etat = "actif" | "attenue" | "repos";

function etatDe(cle: string, survole: string | null): Etat {
  if (survole === null) return "repos";
  return survole === cle ? "actif" : "attenue";
}

function initialesDe(m: Membre) {
  const seconde = m.nom?.[0] ?? m.prenom[1] ?? "";
  return (m.prenom[0] + seconde).toUpperCase();
}

export default function TeamShowcase({
  membres,
  pied,
}: {
  membres: Membre[];
  /* la ligne sous la liste — origine, langue, droit. Facultative. */
  pied?: string;
}) {
  const [survole, setSurvole] = useState<string | null>(null);

  if (membres.length === 0) return null;

  const colonnes = [0, 1, 2].map((c) => membres.filter((_, i) => i % 3 === c));

  return (
    /* La paire est BORNÉE ET CENTRÉE, elle ne s'étale pas sur les 1200 px
       de la colonne. Relevé le 12/09 sur la première capture : la liste
       prenait tout le reste (668 px pour trois noms courts) et laissait
       260 px de vide à droite, sous un titre centré — le bloc penchait à
       gauche sans qu'aucune mesure ne le signale. */
    <div className="mx-auto flex w-full flex-col items-center gap-10 lg:max-w-[1100px] lg:flex-row lg:items-center lg:justify-center lg:gap-16">
      {/* ── la mosaïque ── */}
      <div
        aria-hidden="true"
        /* Même largeur que la liste sous `lg` (420) : empilés, les deux blocs
           partagent alors exactement le même bord gauche. À 336 et 400, la
           mosaïque se centrait 10 px à droite des noms — assez pour se voir,
           pas assez pour qu'on sache pourquoi. */
        className="eq-mosaique w-full max-w-[420px] shrink-0 lg:max-w-[500px]"
      >
        {colonnes.map((colonne, c) =>
          colonne.length === 0 ? null : (
            <div
              key={c}
              className={`eq-col ${DECALAGE[c]}`}
              style={{ flex: `${POIDS[c]} 1 0%` }}
            >
              {colonne.map((m) => (
                <Vignette
                  key={m.cle}
                  membre={m}
                  etat={etatDe(m.cle, survole)}
                  onSurvol={setSurvole}
                />
              ))}
            </div>
          ),
        )}
      </div>

      {/* ── la liste des noms ── */}
      <div className="w-full max-w-[420px] lg:max-w-none lg:flex-1 lg:pt-2">
        <ul className="eq-liste">
          {membres.map((m) => (
            <Rangee
              key={m.cle}
              membre={m}
              etat={etatDe(m.cle, survole)}
              onSurvol={setSurvole}
            />
          ))}
        </ul>
        {pied ? <p className="eq-pied">{pied}</p> : null}
      </div>
    </div>
  );
}

function Vignette({
  membre,
  etat,
  onSurvol,
}: {
  membre: Membre;
  etat: Etat;
  onSurvol: (cle: string | null) => void;
}) {
  const [manquante, setManquante] = useState(false);

  return (
    <div
      className="eq-tuile"
      data-etat={etat}
      onMouseEnter={() => onSurvol(membre.cle)}
      onMouseLeave={() => onSurvol(null)}
    >
      {membre.photo && !manquante ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={membre.photo}
          alt=""
          className="eq-photo"
          loading="lazy"
          decoding="async"
          onError={() => setManquante(true)}
        />
      ) : (
        <span className="eq-mono">{initialesDe(membre)}</span>
      )}
    </div>
  );
}

function Rangee({
  membre,
  etat,
  onSurvol,
}: {
  membre: Membre;
  etat: Etat;
  onSurvol: (cle: string | null) => void;
}) {
  return (
    <li
      className="eq-rang"
      data-etat={etat}
      onMouseEnter={() => onSurvol(membre.cle)}
      onMouseLeave={() => onSurvol(null)}
    >
      <div className="eq-ligne">
        <span aria-hidden="true" className="eq-tiret" />
        <span className="eq-nom">
          {membre.prenom}
          {membre.nom ? ` ${membre.nom}` : ""}
        </span>
        {membre.lien ? (
          <a
            className="eq-lien"
            href={membre.lien.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {membre.lien.label}
          </a>
        ) : null}
      </div>
      <p className="eq-role">{membre.role}</p>
      {membre.bio ? <p className="eq-bio">{membre.bio}</p> : null}
    </li>
  );
}
