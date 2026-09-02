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

   Le mot retenu pour l'autre monde est « organisation » — jamais
   « grosse entreprise » : ce qui sépare les deux n'est pas la taille mais
   la structure de validation, et personne n'aime être rangé par taille.

   Chaque page de destination porte une mention DISCRÈTE de l'autre porte
   (bas de page) pour qui s'est trompé — c'est ici que la clarté se joue,
   pas en doublant les portes partout.

   La carte claire porte le départ du dégradé de la grille (orange), la
   carte sombre son arrivée (violet) : l'aiguillage annonce la suite.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Par où commencer | Omega.AI",
  description:
    "Deux façons de démarrer avec Omega : les prix publics pour les indépendants et TPE-PME, un audit sur mesure pour les organisations où plusieurs services valident.",
};

const PORTES = [
  {
    id: "tpe",
    kicker: "Prix publics",
    titre: "Indépendants & TPE-PME",
    critere: "Une personne — deux, parfois — tient les demandes, les devis, les factures.",
    points: [
      "Vous voyez passer vous-même ce qui entre et ce qui sort",
      "Vous validez seul ce qui part vers vos clients",
      "Vos outils : mail, tableur, WhatsApp, caisse",
    ],
    cta: "Voir les prix et démarrer",
    href: "/tarifs",
    sombre: false,
  },
  {
    id: "orga",
    kicker: "Sur mesure",
    titre: "Organisations & équipes",
    critere: "Plusieurs services se partagent le travail, chacun avec ses règles de validation.",
    points: [
      "La demande passe par l'accueil, la compta, l'atelier…",
      "Plusieurs personnes valident, chacune sur son poste",
      "Le prix sort des volumes mesurés, pas d'une grille",
    ],
    cta: "Réserver un échange",
    href: "/reserver-un-audit",
    sombre: true,
  },
];

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

          {/* 01/09 — trois colonnes dès lg (la carte sites rejoint la
              rangée), le conteneur s'élargit d'autant pour que les deux
              portes gardent leur respiration. */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2 lg:max-w-6xl lg:grid-cols-[1fr_1fr_auto_1fr]">
            {PORTES.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                data-arrivee="colonne"
                data-porte={p.id === "tpe" ? "tarifs" : "audit"}
                className={`cm-carte group ${p.sombre ? "cm-carte--sombre" : ""}`}
              >
                <Partage
                  nom={p.id === "tpe" ? "kicker-tarifs" : "kicker-audit"}
                  share={p.id === "tpe" ? "voyage-tarifs" : "voyage-audit"}
                  className={`cm-kicker ${p.sombre ? "cm-kicker--sombre" : ""}`}
                >
                  {p.kicker}
                </Partage>
                <h2 className="r-h3 mt-4">{p.titre}</h2>
                <p className="cm-critere mt-3">{p.critere}</p>

                <div className="cm-cvs mt-6">C&apos;est vous si&nbsp;:</div>
                <ul className="mt-3 flex-1 space-y-2.5">
                  {p.points.map((pt) => (
                    <li key={pt} className="cm-point">
                      <svg aria-hidden width="14" height="11" viewBox="0 0 14 11" fill="none" className="mt-[5px] shrink-0">
                        <path d="M1 5.5 5 9.5 13 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {pt}
                    </li>
                  ))}
                </ul>

                <span className={`cm-cta mt-8 ${p.sombre ? "cm-cta--sombre" : ""}`}>
                  {p.cta}
                  <svg aria-hidden width="15" height="12" viewBox="0 0 15 12" fill="none" className="transition-transform duration-200 group-hover:translate-x-1">
                    <path d="M1 6h12M9 1.5 13.5 6 9 10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}

            {/* 01/09 (Teo) — la troisième carte : les sites. Transversale
                aux deux portes (un indépendant comme une organisation
                peut en avoir besoin). D'abord en bande dessous, puis
                déplacée À DROITE des portes à la demande de Teo (croquis) :
                troisième colonne dès lg, même squelette que les deux
                autres. Bordeaux et or : une teinte à part, premium. Elle
                mène à la galerie (/modeles) ; la page de l'offre
                (/tarifs/site, prix et Chèque TIC) sera retravaillée plus
                tard. Entre md et lg elle occupe la rangée du dessous. */}
            {/* 01/09 (Teo) — un « + » entre les portes et la carte sites :
                deux portes + une offre en plus. Sa propre colonne (auto)
                dès lg, entre les cartes empilées en mobile, masqué en md
                où la grille est à deux colonnes. */}
            <span data-arrivee="colonne" className="cm-plus flex md:hidden lg:flex" aria-hidden>
              +
            </span>
            <Partage
              nom="cadre-modeles"
              share="voyage-modeles"
              href="/modeles"
              data-arrivee="colonne"
              data-porte="modeles"
              className="cm-carte cm-carte--or group md:col-span-2 lg:col-span-1"
            >
              <span className="cm-kicker cm-kicker--or">En plus</span>
              <h2 className="r-h3 mt-4">Découvrir nos sites</h2>
              <p className="cm-critere mt-3">
                Vingt et un modèles en ligne, tous visitables — vous choisissez l&apos;allure, on
                réécrit tout à votre métier.
              </p>

              <div className="cm-cvs mt-6">C&apos;est pour vous si&nbsp;:</div>
              <ul className="mt-3 flex-1 space-y-2.5">
                {[
                  "Vous n'avez pas de site, ou le vôtre ne ramène rien",
                  "Vous voulez juger l'allure en vrai, pas sur une maquette",
                  "Le formulaire doit alimenter vos postes dès le premier jour",
                ].map((pt) => (
                  <li key={pt} className="cm-point">
                    <svg aria-hidden width="14" height="11" viewBox="0 0 14 11" fill="none" className="mt-[5px] shrink-0">
                      <path d="M1 5.5 5 9.5 13 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {pt}
                  </li>
                ))}
              </ul>

              <span className="cm-cta cm-cta--or mt-8">
                Voir les 21 modèles
                <svg aria-hidden width="15" height="12" viewBox="0 0 15 12" fill="none" className="transition-transform duration-200 group-hover:translate-x-1">
                  <path d="M1 6h12M9 1.5 13.5 6 9 10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
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
