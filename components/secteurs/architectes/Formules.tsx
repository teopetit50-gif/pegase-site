/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Formules.tsx, « 06 — Formules »

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   sections/13-pricing.tsx` (GÉNÉRÉ côté source par l'assembleur ; ici une
   copie du résultat, corrigée à la main). Ce qui change :

   · AUCUN PRIX PUBLIC, comme Daliro et Tamila : les formules disent
     « Sur audit » (la bascule mensuel/annuel de la référence avait été
     retirée par la source). Les trois `<span>` vides qui suivaient « Sur
     audit » (l'emplacement du « /mois ») sont retirés.
   · Les boutons : <a href="#"> → `Link` vers /reserver-un-audit (liens
     morts) et le bouton étoilé figé de la formule mise en avant (un
     <button> sans action, copie du bouton du héros) → `BoutonEtoile`.
   · Jetons clairs : la formule mise en avant portait `bg-card` : #171717
     sur le fond #0a0a0a, un cran PLUS CLAIR que ses voisines. En clair,
     `bg-card` vaut #ffffff comme le fond : elle prend #fafafa, un cran plus
     FONCÉ (le sens s'inverse, pas la valeur). Planche du fond passée à
     l'encre (voir Fonctionnement.tsx).
   · Posée dans la marge de 30 px de la page (page.tsx).
   · 24/09, 17 h — report des fonctions ajoutées au site source (Teo :
     « ajoute tout sur les sites »), puis 28/09, « 6 à 20 personnes » au
     lieu de « 5 à 20 », qui chevauchait la formule Agence (« 1 à 5 »).

   08/11/2026 — LORANI ÉLARGIE (docs/briefs-saas/lorani-v2.md). Quatre
   formules toujours, mais la première devient « Découverte » : un dossier
   déjà clos (permis instruit ou DCE attribué), à prix fixe, sans
   abonnement, remboursé si moins de trois points sont confirmés. « Sur
   mesure » (grands comptes) fusionne dans « Groupement », qui porte les
   cinq phases jusqu'à la réception. La formule mise en avant devient
   Cabinet (6 à 20 personnes), la cible première du brief. Le balisage est
   celui de la copie (mêmes classes, mêmes cadres, même coche), désormais
   rendu depuis une liste : 823 lignes de SVG répété tenaient quatre listes
   de puces. Toujours aucun montant sur la page.
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- planche décorative à 22 % d'opacité, masquée en CSS : pas d'optimiseur. */
import React from "react";
import Link from "next/link";
import StarButton from "./bouton-etoile";
import { CONTACT } from "./textes";

type Formule = {
  titre: string;
  pour: string;
  prix: string;
  /** La formule mise en avant : fond #fafafa et bouton étoilé. */
  avant?: boolean;
  lignes: string[];
};

const FORMULES: Formule[] = [
  {
    titre: "Découverte",
    pour: "Pour juger Lorani sur un dossier déjà clos, sans abonnement",
    prix: "Prix fixe",
    lignes: [
      "Un permis instruit ou un DCE attribué, relu en entier",
      "Planches croisées entre elles, avec le CCTP et la DPGF",
      "Pièces du permis : complétude et règles chiffrées du PLU",
      "Fiches techniques confrontées au CCTP, bordereau de visa",
      "Chaque point avec la page, la valeur lue et la correction",
      "Rapport PDF annoté et Excel",
      "Réalisé pendant l'audit, résultat en quelques heures",
      "Remboursé si moins de trois points confirmés",
    ],
  },
  {
    titre: "Agence",
    pour: "Pour les agences de 1 à 5 personnes",
    prix: "Sur audit",
    lignes: [
      "Tout ce que contient Découverte, sur toutes vos opérations",
      "Plans croisés, rapport PDF annoté",
      "Permis : pièces du Cerfa et PLU",
      "Accessibilité, ERP et RE2020",
      "PLU, servitudes et risques lus depuis l'adresse",
      "Calendrier du permis jusqu'à la purge des recours",
      "Surfaces recalculées contre le Cerfa",
      "RE2020 : attestation comparée aux plans",
      "Revérification à chaque indice",
      "Questions posées au dossier",
    ],
  },
  {
    titre: "Cabinet",
    pour: "Pour les agences de 6 à 20 personnes",
    prix: "Sur audit",
    avant: true,
    lignes: [
      "Tout ce que contient Agence",
      "Analyse des offres sur DPGF",
      "Métré des plans contre la DPGF",
      "Décennales contrôlées contre le lot",
      "Visa des fiches techniques : VSO, VAO, refus",
      "Visas calés sur les délais de commande",
      "Situations et décomptes",
      "Ordres de service : montant et délai",
      "Questions suivies jusqu'à la réponse",
      "Journal des décisions de l'opération, exportable",
      "Checklists de l'agence",
      "Export Excel par lot",
      "Utilisateurs sans supplément",
      "Hébergement dans l'UE",
    ],
  },
  {
    titre: "Groupement",
    pour: "Pour les agences de plus de 20 personnes, les groupements et les maîtres d'ouvrage",
    prix: "Sur audit",
    lignes: [
      "Tout ce que contient Cabinet",
      "Bureaux d'études invités",
      "Fonds de plan BET croisés",
      "Comptes rendus de chantier rédigés",
      "Réserves suivies jusqu'à la fin de la GPA",
      "Complétude du DOE à la réception",
      "Dossier de défense décennale",
      "Registre daté des visas",
      "Honoraires par phase contre temps passé",
      "Historique des indices sans limite",
      "Contrôles définis avec vous",
      "Import depuis vos plateformes de projet",
      "Accès sans limite d'équipe",
      "Règles de votre charte intégrées",
    ],
  },
];

/* Les cadres des quatre cellules, dans l'ordre : filets de la copie
   (bas puis droite ; haut et bas puis gauche et droite ; idem ; haut puis
   gauche). La formule mise en avant ajoute son fond. */
const CADRES = [
  "flex flex-col gap-8 max-lg:border-b lg:border-r",
  "flex flex-col gap-8 max-lg:border-y lg:border-x",
  "flex flex-col gap-8 max-lg:border-y lg:border-x",
  "flex flex-col gap-8 max-lg:border-t lg:border-l",
];

const BOUTON =
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm bg-[#0a0a0a]/5 shadow-black/10 ring-1 ring-[#0a0a0a]/10 duration-200 hover:bg-[#f5f5f5]/50 h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 w-full";

function Coche() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-check text-[#737373] size-3"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5"></path>
    </svg>
  );
}

export default function Formules() {
  return (
    <>
      <div id="pricing" className="scroll-mt-24">
        <section className="relative isolate py-16 md:py-20">
          <div
            aria-hidden="true"
            data-reveal="1"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden h-[280px] md:h-[260px] lg:h-[290px] [mask-image:linear-gradient(to_bottom,black_62%,transparent)]"
          >
            <img
              alt=""
              loading="lazy"
              decoding="async"
              width="1600"
              height="922"
              src="/secteurs-architectes/plans/piscine.webp"
              className="absolute -top-[90px] right-[-2%] w-[min(66%,940px)] max-w-none select-none opacity-[0.22] [mask-image:radial-gradient(ellipse_62%_62%_at_58%_46%,black_32%,transparent_80%)] max-md:top-0 max-md:right-[-42%] max-md:w-[118%] max-md:opacity-[0.13]"
            />
          </div>
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-sm space-y-6">
                <span className="mb-5 block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a]/40">
                  06 — Formules
                </span>
                <h2 className="text-[#737373] text-balance text-4xl font-medium tracking-tight">
                  <span className="text-[#0a0a0a]">Un dossier à prix fixe pour juger,</span> puis un prix par taille
                  d&apos;agence
                </h2>
              </div>
            </div>
            <div className="mt-12 grid gap-1.5 border *:p-6 max-lg:mx-auto max-lg:max-w-sm lg:mt-20 lg:grid-cols-4">
              {FORMULES.map((f, i) => (
                <div key={f.titre} className={`${f.avant ? "bg-[#fafafa] " : ""}${CADRES[i]}`}>
                  <div>
                    <p className="text-lg font-medium">{f.titre}</p>
                    <p className="text-[#737373] text-lg font-medium">{f.pour}</p>
                    <div className="my-8 block text-4xl font-medium tracking-tight">{f.prix}</div>
                    {f.avant ? (
                      <StarButton href={CONTACT.audit} className="w-full">
                        Réserver un audit
                      </StarButton>
                    ) : (
                      <Link className={BOUTON} href={CONTACT.audit}>
                        Réserver un audit
                      </Link>
                    )}
                  </div>
                  <ul className="text-[#737373] list-outside space-y-3">
                    {f.lignes.map((l) => (
                      <li key={l} className="flex items-center gap-3">
                        <Coche />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
