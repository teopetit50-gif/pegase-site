/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Formules.tsx, « 06 — Formules »

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   sections/13-pricing.tsx` (GÉNÉRÉ côté source par l'assembleur ; ici une
   copie du résultat, corrigée à la main). Ce qui change :

   · AUCUN PRIX PUBLIC, comme Daliro et Tamila : les quatre formules disent
     déjà « Sur audit » (la bascule mensuel/annuel de la référence avait été
     retirée par la source). Les trois `<span>` vides qui suivaient « Sur
     audit » (l'emplacement du « /mois ») sont retirés.
   · BOUTONS (règle maison) : les trois `<a role="button" href="#">` (liens
     morts) et le bouton étoilé figé de la formule Cabinet (un <button> sans
     destination, avec un `clipPath id="clip0_408_119"` en dur, le même que
     dans Produit.tsx) mènent tous à /reserver-un-audit, en <Link> et en
     `BoutonEtoile`. « Nous écrire » (Sur mesure) devient « Réserver un
     audit » : un libellé qui annonce un message ne peut pas ouvrir une
     réservation.
   · MONDE BLANC : `dark:` retirés (4), jetons clairs. La formule mise en
     avant (Cabinet) portait `bg-card` : #171717 sur le fond #0a0a0a, un cran
     PLUS CLAIR que ses voisines. En clair, `bg-card` vaut #ffffff comme le
     fond : la colonne ne se détachait plus. Elle prend #fafafa, un cran plus
     FONCÉ (le sens s'inverse, pas la valeur). Planche du fond passée à
     l'encre (voir Fonctionnement.tsx).
   · Posée dans la marge de 30 px de la page (page.tsx).
   · REPORT du 24/09, 17 h 00 (seconde copie de la source) : une autre
     session a ajouté des fonctions au site source entre 16 h 00 et 16 h 32
     (Teo : « ajoute tout sur les sites »). Ici : quinze lignes de plus dans
     les quatre formules (PLU lu depuis l'adresse, calendrier du permis,
     métré, décennales, comptes rendus, réserves, honoraires, dossier de
     défense décennale…). Toujours aucun prix : chaque formule reste « Sur
     audit ». Report par fusion à trois voies, vérifié ligne à ligne.
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- planche décorative à 22 % d'opacité, masquée en CSS : pas d'optimiseur. */
import React from "react";
import Link from "next/link";
import StarButton from "./bouton-etoile";
import { CONTACT } from "./textes";

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
                  <span className="text-[#0a0a0a]">Des formules</span> pour chaque taille d&apos;agence
                </h2>
              </div>
            </div>
            <div className="mt-12 grid gap-1.5 border *:p-6 max-lg:mx-auto max-lg:max-w-sm lg:mt-20 lg:grid-cols-4">
              <div className="flex flex-col gap-8 max-lg:border-b lg:border-r">
                <div>
                  <p className="text-lg font-medium">Agence</p>
                  <p className="text-[#737373] text-lg font-medium">Pour les agences de 1 à 5 personnes</p>
                  <div className="my-8 block text-4xl font-medium tracking-tight">Sur audit</div>
                  <Link
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm bg-[#0a0a0a]/5 shadow-black/10 ring-1 ring-[#0a0a0a]/10 duration-200 hover:bg-[#f5f5f5]/50 h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 w-full"
                    href={CONTACT.audit}
                  >
                    Réserver un audit
                  </Link>
                </div>
                <ul className="text-[#737373] list-outside space-y-3">
                  <li className="flex items-center gap-3">
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
                    Plans croisés, rapport PDF annoté
                  </li>
                  <li className="flex items-center gap-3">
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
                    Permis : PC1 à PC8 et PLU
                  </li>
                  <li className="flex items-center gap-3">
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
                    Accessibilité, ERP et RE2020
                  </li>
                  <li className="flex items-center gap-3">
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
                    PLU, servitudes et risques lus depuis l&apos;adresse
                  </li>
                  <li className="flex items-center gap-3">
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
                    Calendrier du permis jusqu&apos;à la purge des recours
                  </li>
                  <li className="flex items-center gap-3">
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
                    Surfaces recalculées contre le Cerfa
                  </li>
                  <li className="flex items-center gap-3">
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
                    RE2020 : attestation comparée aux plans
                  </li>
                  <li className="flex items-center gap-3">
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
                    Questions posées au dossier
                  </li>
                </ul>
              </div>
              <div className="bg-[#fafafa] flex flex-col gap-8 max-lg:border-y lg:border-x">
                <div>
                  <p className="text-lg font-medium">Cabinet</p>
                  <p className="text-[#737373] text-lg font-medium">Pour les agences de 5 à 20 personnes</p>
                  <div className="my-8 block text-4xl font-medium tracking-tight">Sur audit</div>
                  <StarButton href={CONTACT.audit} className="w-full">
                    Réserver un audit
                  </StarButton>
                </div>
                <ul className="text-[#737373] list-outside space-y-3">
                  <li className="flex items-center gap-3">
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
                    Tout ce que contient Agence
                  </li>
                  <li className="flex items-center gap-3">
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
                    Analyse des offres sur DPGF
                  </li>
                  <li className="flex items-center gap-3">
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
                    Visa des fiches techniques
                  </li>
                  <li className="flex items-center gap-3">
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
                    Situations et décomptes
                  </li>
                  <li className="flex items-center gap-3">
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
                    Visas calés sur les délais de commande
                  </li>
                  <li className="flex items-center gap-3">
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
                    Questions suivies jusqu&apos;à la réponse
                  </li>
                  <li className="flex items-center gap-3">
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
                    Métré des plans contre la DPGF
                  </li>
                  <li className="flex items-center gap-3">
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
                    Décennales contrôlées contre le lot
                  </li>
                  <li className="flex items-center gap-3">
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
                    Ordres de service : montant et délai
                  </li>
                  <li className="flex items-center gap-3">
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
                    Revérification à chaque indice
                  </li>
                  <li className="flex items-center gap-3">
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
                    Une question en un clic
                  </li>
                  <li className="flex items-center gap-3">
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
                    Checklists de l&apos;agence
                  </li>
                  <li className="flex items-center gap-3">
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
                    Export Excel par lot
                  </li>
                  <li className="flex items-center gap-3">
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
                    Utilisateurs sans supplément
                  </li>
                  <li className="flex items-center gap-3">
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
                    Hébergement dans l&apos;UE
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-8 max-lg:border-y lg:border-x">
                <div>
                  <p className="text-lg font-medium">Groupement</p>
                  <p className="text-[#737373] text-lg font-medium">Pour les groupements de maîtrise d&apos;œuvre</p>
                  <div className="my-8 block text-4xl font-medium tracking-tight">Sur audit</div>
                  <Link
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm bg-[#0a0a0a]/5 shadow-black/10 ring-1 ring-[#0a0a0a]/10 duration-200 hover:bg-[#f5f5f5]/50 h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 w-full"
                    href={CONTACT.audit}
                  >
                    Réserver un audit
                  </Link>
                </div>
                <ul className="text-[#737373] list-outside space-y-3">
                  <li className="flex items-center gap-3">
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
                    Tout ce que contient Cabinet
                  </li>
                  <li className="flex items-center gap-3">
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
                    Bureaux d&apos;études invités
                  </li>
                  <li className="flex items-center gap-3">
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
                    Fonds de plan BET croisés
                  </li>
                  <li className="flex items-center gap-3">
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
                    Complétude du DOE à la réception
                  </li>
                  <li className="flex items-center gap-3">
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
                    Comptes rendus de chantier rédigés
                  </li>
                  <li className="flex items-center gap-3">
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
                    Réserves suivies jusqu&apos;à la fin de la GPA
                  </li>
                  <li className="flex items-center gap-3">
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
                    Honoraires par phase contre temps passé
                  </li>
                  <li className="flex items-center gap-3">
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
                    Dossier de défense décennale
                  </li>
                  <li className="flex items-center gap-3">
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
                    Registre daté des visas
                  </li>
                  <li className="flex items-center gap-3">
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
                    Historique des indices sans limite
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-8 max-lg:border-t lg:border-l">
                <div>
                  <p className="text-lg font-medium">Sur mesure</p>
                  <p className="text-[#737373] text-lg font-medium">
                    Pour les grands comptes et maîtres d&apos;ouvrage
                  </p>
                  <div className="my-8 block text-4xl font-medium tracking-tight">Sur audit</div>
                  <Link
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm bg-[#0a0a0a]/5 shadow-black/10 ring-1 ring-[#0a0a0a]/10 duration-200 hover:bg-[#f5f5f5]/50 h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 w-full"
                    href={CONTACT.audit}
                  >
                    Réserver un audit
                  </Link>
                </div>
                <ul className="text-[#737373] list-outside space-y-3">
                  <li className="flex items-center gap-3">
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
                    Tout ce que contient Groupement
                  </li>
                  <li className="flex items-center gap-3">
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
                    Contrôles définis avec vous
                  </li>
                  <li className="flex items-center gap-3">
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
                    Import depuis vos plateformes de projet
                  </li>
                  <li className="flex items-center gap-3">
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
                    Accès sans limite d&apos;équipe
                  </li>
                  <li className="flex items-center gap-3">
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
                    Règles de votre charte intégrées
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
