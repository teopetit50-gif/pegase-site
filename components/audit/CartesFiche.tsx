import Link from "next/link";
import CopierPrompt from "./CopierPrompt";
import type { Douleur, MoteurReco, Remede } from "@/lib/audits";
import { nomPaquet } from "@/lib/content";
import "./CartesFiche.css";

/* ══════════════════════════════════════════════════════════════════════
   <CartesFiche> — les cartes du pré-audit /audit/[slug] (15/09/2026)

   ORIGINE. Aucune, et c'est la conclusion du brief, pas un raccourci. Les
   quatre pistes proposées ont été lues : `aceternity/glare-card` (foil
   holographique arc-en-ciel piloté au pointeur), `aceternity/comet-card`
   (bascule 3D + reflet blanc au pointeur, ombre à quatre couches),
   `aceternity/background-boxes` (15 000 divs, couleur tirée au sort à
   CHAQUE rendu, allumées au survol), `aceternity/canvas-reveal-effect`
   (shader three.js révélé au survol). Les quatre sont des décorations de
   SURVOL. Or cette page est projetée devant un client pendant un entretien :
   personne ne survole pendant qu'on parle, et l'effet ne se voit jamais.
   Trois se heurtent en plus à une règle dure du dépôt — l'arc-en-ciel et
   l'ombre lourde sortent de la charte quasi monochrome, le Math.random au
   rendu casse l'hydratation, et le shader réclame three.js + @react-three,
   absents du package.json. La bonne réponse était donc : ne rien reprendre.

   POURQUOI ICI. Ce qui manque à ces cartes n'est pas un effet, c'est de la
   LISIBILITÉ À DISTANCE et une hiérarchie qui se lit d'un coup d'œil. Trois
   corrections, toutes tirées de la page elle-même : le corps des cartes
   passe de 15/24 à 17/27, la taille que la page utilise déjà pour le seul
   bloc qu'elle veut faire lire (« Ce que nous pensons avoir compris ») ;
   le numéro de douleur, aujourd'hui en 13 px gris, devient une vraie
   marque repérable — c'est la clé de renvoi que la section « systèmes »
   emploie déjà en toutes lettres (« douleurs 1 et 2 ») ; et la ligne
   « Ce que nous mesurerons ensemble », qui est la phrase que Teo lit à
   voix haute, quitte le bas de page en 14 px pour une tuile blanche posée
   dans la carte grise. <EnteteSection> ajoute le repère qui manquait au
   corps du document — rang sur cinq + étiquette du sommaire — pour qu'on
   sache où l'on en est sans remonter à la barre collante.

   CE QUI EST JETÉ. <CarteSpotlight> tout entier : son halo satin suit le
   curseur, il est déjà gaté hover + pointer:fine, donc invisible en
   rendez-vous comme au tactile. Avec lui partent trois « use client » et
   leur JavaScript — ces cartes sont des composants SERVEUR, zéro octet
   envoyé. Partent aussi le liseré or au survol des cartes nuit, l'ombre
   portée au survol des cartes système (remplacée par un filet d'encre) et
   la soupe d'utilitaires Tailwind du page.tsx, passée dans la feuille.

   ÉCARTS ASSUMÉS. Les textes restent ceux des données (lib/audits.ts) et
   les libellés fixes ceux de la page, au mot près — seule exception, une
   insécable posée devant le deux-points de « En continu ». Le prompt garde
   son corps mono 12,5 px : il se copie, il ne se lit pas à l'écran, et
   l'agrandir allongerait la carte sans profit. Les remèdes ne sont pas
   numérotés, parce que rien ne les appelle par leur numéro. Aucune
   @keyframes, aucune apparition propre : le [data-reveal] posé sur la
   racine suffit, la page l'anime déjà.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— l'en-tête de rubrique : le repère de progression du document ———
   Placé au-dessus de la note et du titre existants, il ne reprend RIEN de
   leur texte : juste le rang et l'étiquette du sommaire, dans le même
   caractère que la barre collante — les deux disent la même chose. */
export function EnteteSection({
  rang,
  total,
  etiquette,
}: {
  rang: number;
  total: number;
  etiquette: string;
}) {
  return (
    <div className="fic-entete">
      <span className="fic-entete-rang num">
        {String(rang).padStart(2, "0")}
        <span className="fic-entete-total">/{String(total).padStart(2, "0")}</span>
      </span>
      <span className="fic-entete-etiquette">{etiquette}</span>
      <span className="fic-entete-filet" aria-hidden />
    </div>
  );
}

/* ——— carte « douleur » : numérotée, parce qu'on la désigne ———
   `index` est l'index du tableau audit.douleurs : le numéro affiché est
   index + 1, exactement le renvoi qu'écrit MoteurReco.douleurs. */
export function CarteDouleur({ douleur, index }: { douleur: Douleur; index: number }) {
  return (
    <article data-reveal className="fic-carte fic-carte--douleur">
      <div className="fic-rang">
        <span className="fic-rang-chiffre num">{String(index + 1).padStart(2, "0")}</span>
        <span className="fic-rang-filet" aria-hidden />
      </div>
      <h3 className="r-h4 fic-titre">{douleur.titre}</h3>
      <p className="fic-texte">{douleur.texte}</p>
      <div className="fic-mesure">
        <div className="fic-mesure-rubrique">Ce que nous mesurerons ensemble</div>
        <p className="fic-mesure-texte">{douleur.mesure}</p>
      </div>
    </article>
  );
}

/* ——— carte « remède » : la carte nuit, sa console et son bouton ———
   <CopierPrompt> est un composant client ; il ne reçoit qu'une chaîne. */
export function CarteRemede({ remede }: { remede: Remede }) {
  return (
    <article data-reveal className="fic-carte fic-carte--nuit">
      <h3 className="r-h4 fic-titre">{remede.titre}</h3>
      <p className="fic-texte">{remede.texte}</p>

      <div className="pa-console fic-console">
        <div className="pa-console-tete">
          <span className="pa-feu fic-feu--rouge" />
          <span className="pa-feu fic-feu--ambre" />
          <span className="pa-feu fic-feu--vert" />
          <span className="fic-console-titre">prompt · chatgpt ou claude</span>
        </div>
        <div className="fic-console-corps">{remede.prompt}</div>
      </div>

      <div className="fic-remede-pied">
        <CopierPrompt texte={remede.prompt} />
        {remede.moteur ? (
          <span className="fic-remede-suite">
            En continu&nbsp;: <span className="fic-remede-code">{remede.moteur}</span>
          </span>
        ) : null}
      </div>
    </article>
  );
}

/* ——— carte « système » : la seule des trois qui soit un lien ———
   Donc la seule où un état de survol a un sens : quelqu'un qui clique.
   Le <span className="pa-fleche"> est la flèche cerclée de globals.css,
   qui se remplit d'encre sur `.resa a:hover` — rien à redéfinir ici. */
export function CarteMoteur({ moteur }: { moteur: MoteurReco }) {
  return (
    <Link href={`/offres/${moteur.slug}`} className="fic-moteur-lien">
      <article data-reveal className="fic-carte fic-carte--moteur">
        <div className="fic-moteur-tete">
          <span className="fic-moteur-code">{nomPaquet(moteur.system)}</span>
          <span className="fic-moteur-renvoi">{moteur.douleurs}</span>
        </div>
        <p className="fic-texte">{moteur.raison}</p>
        <div className="fic-moteur-pied">
          <span className="fic-moteur-lire">Voir la fiche</span>
          <span className="pa-fleche" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2.5 8h11m0 0-4.2-4.2M13.5 8l-4.2 4.2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </article>
    </Link>
  );
}
