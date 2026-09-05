import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Partage from "@/components/Partage";
import { lienContact } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   /commencer — l'aiguillage (28/08/2026)

   Demande Teo : les deux portes posées en haut de /tarifs rendaient la
   page confuse. Désormais TOUS les « Commencer » du site mènent ici : une
   page à décision unique, deux grandes cartes, rien d'autre. Le visiteur
   se qualifie lui-même et part directement au bon endroit :

     · « Indépendants & TPE-PME »        → /tarifs   (prix publics)
     · « Organisations & équipes »       → /reserver-un-audit (sur devis)
     · « Découvrir nos sites » (01/09)   → /tarifs/site (l'offre site ;
                                            depuis le 02/09, plus /modeles)

   Le mot retenu pour l'autre monde est « organisation » — jamais
   « grosse entreprise » : ce qui sépare les deux n'est pas la taille mais
   la structure de validation, et personne n'aime être rangé par taille.

   Chaque page de destination porte une mention DISCRÈTE de l'autre porte
   (bas de page) pour qui s'est trompé — c'est ici que la clarté se joue,
   pas en doublant les portes partout.

   05/09/2026 — les trois cartes reprennent les « LinkCard » de la page
   d'accueil de scale.com (demande Teo, capture à l'appui) : carte grise,
   tuile blanche avec pictogramme, titre fin, texte calé en bas, bouton
   gris qui passe au noir au survol. Trois colonnes égales, plus de « + »
   ni de badge — la référence n'en a pas, et le bouton dit déjà où l'on
   va. Les points « c'est vous si » sont fondus dans le paragraphe. Le
   relevé au style calculé est en tête du bloc `.cm-*` de globals.css.
   Les teintes des pictogrammes sont celles de la référence, et elles
   gardent l'histoire du dégradé : brun chaud pour le départ (prix
   publics), violet pour l'arrivée (sur mesure), bleu ardoise pour les
   sites. Les pastilles « prix publics / sur mesure » ne partent donc
   plus d'ici : sur /tarifs et /reserver-un-audit elles arrivent avec
   leur page (Partage sans appariement), le cadre de la carte sites
   voyage toujours jusqu'à /tarifs/site.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Par où commencer | Omega.AI",
  description:
    "Deux façons de démarrer avec Omega : les prix publics pour les indépendants et TPE-PME, un audit sur mesure pour les organisations où plusieurs services valident.",
};

/* Les pictogrammes sont dessinés au trait (2 px, grille de 24) : une
   personne seule pour la porte « prix publics », plusieurs pour « sur
   mesure » — c'est le nombre de personnes qui valident qui sépare les
   deux mondes, pas la taille de l'entreprise — et une fenêtre de
   navigateur pour les sites. */
const ICONES = {
  seul: (
    <svg aria-hidden width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  ),
  plusieurs: (
    <svg aria-hidden width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18.5 14.5a5 5 0 0 1 3.5 4.5v1" />
    </svg>
  ),
  site: (
    <svg aria-hidden width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <circle cx="6.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="9.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  ),
};

const PORTES = [
  {
    id: "tpe",
    teinte: "chaud",
    icone: ICONES.seul,
    titre: "Indépendants & TPE-PME",
    texte:
      "Une personne — deux, parfois — tient les demandes, les devis et les factures, voit passer tout ce qui entre et sort, et valide seule ce qui part vers les clients. Ses outils : le mail, un tableur, WhatsApp, la caisse.",
    cta: "Voir les prix et démarrer",
    href: "/tarifs",
  },
  {
    id: "orga",
    teinte: "violet",
    icone: ICONES.plusieurs,
    titre: "Organisations & équipes",
    texte:
      "Plusieurs services se partagent le travail — l'accueil, la compta, l'atelier — et plusieurs personnes valident, chacune sur son poste. Le prix sort des volumes mesurés, pas d'une grille.",
    cta: "Réserver un échange",
    href: "/reserver-un-audit",
  },
];

const SITE = {
  teinte: "bleu",
  icone: ICONES.site,
  titre: "Découvrir nos sites",
  texte:
    "Pour qui n'a pas de site, ou dont le site ne ramène rien : vingt et un modèles en ligne, tous visitables en vrai — vous choisissez l'allure, on réécrit tout à votre métier, et le formulaire alimente vos postes dès le premier jour.",
  cta: "Voir les offres",
  href: "/tarifs/site",
};

export default function CommencerPage() {
  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <section data-monde="clair" className="r-wrap pb-20 pt-14 sm:pb-28 sm:pt-20">
          {/* 01/09 — transitions : [data-arrivee] = rôles de la cascade
              d'arrivée (components/Arrivee.tsx) ; les pastilles et le cadre
              bordeaux sont des objets PARTAGÉS (components/Partage.tsx) qui
              voyagent jusqu'à la page d'arrivée, et reviennent au retour. */}
          <div data-arrivee="titre" className="mx-auto max-w-3xl text-center">
            <h1 className="r-h1">Par où commencer&nbsp;?</h1>
            <p className="r-lead mx-auto mt-5 max-w-[46ch]">
              Une seule question décide de la suite&nbsp;: chez vous,{" "}
              <strong className="font-semibold text-[#050505]">qui valide ce qui part&nbsp;?</strong>
            </p>
          </div>

          {/* 05/09 — trois colonnes égales dès lg (la référence), deux en md
              où la carte sites prend la rangée du dessous. Le conteneur de
              1152 donne des cartes de 368 : la largeur relevée. */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2 lg:max-w-6xl lg:grid-cols-3">
            {PORTES.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                data-arrivee="colonne"
                data-porte={p.id === "tpe" ? "tarifs" : "audit"}
                data-teinte={p.teinte}
                className="cm-carte"
              >
                <span aria-hidden className="cm-nappe" />
                <span className="cm-tuile">{p.icone}</span>
                <h2 className="cm-titre">{p.titre}</h2>
                <div className="cm-bas">
                  <p className="cm-texte">{p.texte}</p>
                  <span className="cm-btn">{p.cta}</span>
                </div>
              </Link>
            ))}

            {/* La carte sites reste l'objet partagé « cadre-modeles » : son
                cadre voyage jusqu'à la carte produit de /tarifs/site et en
                revient (components/Partage.tsx, lib/transitions.ts). */}
            <Partage
              nom="cadre-modeles"
              share="voyage-modeles"
              href={SITE.href}
              data-arrivee="colonne"
              data-porte="modeles"
              data-teinte={SITE.teinte}
              className="cm-carte md:col-span-2 lg:col-span-1"
            >
              <span aria-hidden className="cm-nappe" />
              <span className="cm-tuile">{SITE.icone}</span>
              <h2 className="cm-titre">{SITE.titre}</h2>
              <div className="cm-bas">
                <p className="cm-texte">{SITE.texte}</p>
                <span className="cm-btn">{SITE.cta}</span>
              </div>
            </Partage>
          </div>

          <p data-arrivee="colonne" className="r-note mx-auto mt-10 max-w-md text-center">
            Vous hésitez entre les deux&nbsp;? Décrivez votre situation en deux lignes{" "}
            <a
              href={lienContact("Bonjour Omega — je ne sais pas par où commencer. Mon activité : ")}
              className="underline underline-offset-4 hover:text-[#050505]"
            >
              sur WhatsApp
            </a>{" "}
            — on vous répond le jour même.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
