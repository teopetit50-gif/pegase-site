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
   · 28/09 — Cabinet : « 6 à 20 personnes » au lieu de « 5 à 20 », qui
     chevauchait la formule Agence (« 1 à 5 »).
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- planche décorative à 22 % d'opacité, masquée en CSS : pas d'optimiseur. */
import React from "react";
import Link from "next/link";
import StarButton from "./bouton-etoile";
import { CONTACT } from "./textes";
import { SiEnPreparation } from "@/components/ui/en-preparation";

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
                  <span className="text-[#0a0a0a]">Le prix dépend</span> de la taille de votre agence
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
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm bg-[#0a0a0a]/5 shadow-black/10 ring-1 ring-[#0a0a0a]/10 duration-200 hover:bg-[#f5f5f5]/50 h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 w-full"
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
                    <span>
                      Plans croisés, rapport PDF annoté
                      <SiEnPreparation pour="lorani" t="Plans croisés, rapport PDF annoté" />
                    </span>
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
                    <span>
                      Permis : PC1 à PC8 et PLU
                      <SiEnPreparation pour="lorani" t="Permis : PC1 à PC8 et PLU" />
                    </span>
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
                    <span>
                      Accessibilité, ERP et RE2020
                      <SiEnPreparation pour="lorani" t="Accessibilité, ERP et RE2020" />
                    </span>
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
                    <span>
                      PLU, servitudes et risques lus depuis l&apos;adresse
                      <SiEnPreparation pour="lorani" t="PLU, servitudes et risques lus depuis l'adresse" />
                    </span>
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
                    <span>
                      Calendrier du permis jusqu&apos;à la purge des recours
                      <SiEnPreparation pour="lorani" t="Calendrier du permis jusqu'à la purge des recours" />
                    </span>
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
                    <span>
                      Surfaces recalculées contre le Cerfa
                      <SiEnPreparation pour="lorani" t="Surfaces recalculées contre le Cerfa" />
                    </span>
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
                    <span>
                      RE2020 : attestation comparée aux plans
                      <SiEnPreparation pour="lorani" t="RE2020 : attestation comparée aux plans" />
                    </span>
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
                    <span>
                      Questions posées au dossier
                      <SiEnPreparation pour="lorani" t="Questions posées au dossier" />
                    </span>
                  </li>
                </ul>
              </div>
              <div className="bg-[#fafafa] flex flex-col gap-8 max-lg:border-y lg:border-x">
                <div>
                  <p className="text-lg font-medium">Cabinet</p>
                  <p className="text-[#737373] text-lg font-medium">Pour les agences de 6 à 20 personnes</p>
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
                    <span>
                      Tout ce que contient Agence
                      <SiEnPreparation pour="lorani" t="Tout ce que contient Agence" />
                    </span>
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
                    <span>
                      Analyse des offres sur DPGF
                      <SiEnPreparation pour="lorani" t="Analyse des offres sur DPGF" />
                    </span>
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
                    <span>
                      Visa des fiches techniques
                      <SiEnPreparation pour="lorani" t="Visa des fiches techniques" />
                    </span>
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
                    <span>
                      Situations et décomptes
                      <SiEnPreparation pour="lorani" t="Situations et décomptes" />
                    </span>
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
                    <span>
                      Visas calés sur les délais de commande
                      <SiEnPreparation pour="lorani" t="Visas calés sur les délais de commande" />
                    </span>
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
                    <span>
                      Questions suivies jusqu&apos;à la réponse
                      <SiEnPreparation pour="lorani" t="Questions suivies jusqu'à la réponse" />
                    </span>
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
                    <span>
                      Métré déposé contre la DPGF
                      <SiEnPreparation pour="lorani" t="Métré déposé contre la DPGF" />
                    </span>
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
                    <span>
                      Décennales contrôlées contre le lot
                      <SiEnPreparation pour="lorani" t="Décennales contrôlées contre le lot" />
                    </span>
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
                    <span>
                      Ordres de service : montant et délai
                      <SiEnPreparation pour="lorani" t="Ordres de service : montant et délai" />
                    </span>
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
                    <span>
                      Revérification à chaque indice
                      <SiEnPreparation pour="lorani" t="Revérification à chaque indice" />
                    </span>
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
                    <span>
                      Une question en un clic
                      <SiEnPreparation pour="lorani" t="Une question en un clic" />
                    </span>
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
                    <span>
                      Checklists de l&apos;agence
                      <SiEnPreparation pour="lorani" t="Checklists de l'agence" />
                    </span>
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
                    <span>
                      Export Excel par lot
                      <SiEnPreparation pour="lorani" t="Export Excel par lot" />
                    </span>
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
                    <span>
                      Utilisateurs sans supplément
                      <SiEnPreparation pour="lorani" t="Utilisateurs sans supplément" />
                    </span>
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
                    <span>
                      Hébergement dans l&apos;UE
                      <SiEnPreparation pour="lorani" t="Hébergement dans l'UE" />
                    </span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-8 max-lg:border-y lg:border-x">
                <div>
                  <p className="text-lg font-medium">Groupement</p>
                  <p className="text-[#737373] text-lg font-medium">Pour les groupements de maîtrise d&apos;œuvre</p>
                  <div className="my-8 block text-4xl font-medium tracking-tight">Sur audit</div>
                  <Link
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm bg-[#0a0a0a]/5 shadow-black/10 ring-1 ring-[#0a0a0a]/10 duration-200 hover:bg-[#f5f5f5]/50 h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 w-full"
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
                    <span>
                      Tout ce que contient Cabinet
                      <SiEnPreparation pour="lorani" t="Tout ce que contient Cabinet" />
                    </span>
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
                    <span>
                      Bureaux d&apos;études invités
                      <SiEnPreparation pour="lorani" t="Bureaux d'études invités" />
                    </span>
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
                    <span>
                      Fonds de plan BET croisés
                      <SiEnPreparation pour="lorani" t="Fonds de plan BET croisés" />
                    </span>
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
                    <span>
                      Complétude du DOE à la réception
                      <SiEnPreparation pour="lorani" t="Complétude du DOE à la réception" />
                    </span>
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
                    <span>
                      Comptes rendus de chantier rédigés
                      <SiEnPreparation pour="lorani" t="Comptes rendus de chantier rédigés" />
                    </span>
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
                    <span>
                      Réserves suivies jusqu&apos;à la fin de la GPA
                      <SiEnPreparation pour="lorani" t="Réserves suivies jusqu'à la fin de la GPA" />
                    </span>
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
                    <span>
                      Honoraires par phase contre temps passé
                      <SiEnPreparation pour="lorani" t="Honoraires par phase contre temps passé" />
                    </span>
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
                    <span>
                      Dossier de défense décennale
                      <SiEnPreparation pour="lorani" t="Dossier de défense décennale" />
                    </span>
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
                    <span>
                      Registre daté des visas
                      <SiEnPreparation pour="lorani" t="Registre daté des visas" />
                    </span>
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
                    <span>
                      Historique des indices sans limite
                      <SiEnPreparation pour="lorani" t="Historique des indices sans limite" />
                    </span>
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
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm bg-[#0a0a0a]/5 shadow-black/10 ring-1 ring-[#0a0a0a]/10 duration-200 hover:bg-[#f5f5f5]/50 h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 w-full"
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
                    <span>
                      Tout ce que contient Groupement
                      <SiEnPreparation pour="lorani" t="Tout ce que contient Groupement" />
                    </span>
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
                    <span>
                      Contrôles définis avec vous
                      <SiEnPreparation pour="lorani" t="Contrôles définis avec vous" />
                    </span>
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
                    <span>
                      Import depuis vos plateformes de projet
                      <SiEnPreparation pour="lorani" t="Import depuis vos plateformes de projet" />
                    </span>
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
                    <span>
                      Accès sans limite d&apos;équipe
                      <SiEnPreparation pour="lorani" t="Accès sans limite d'équipe" />
                    </span>
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
                    <span>
                      Règles de votre charte intégrées
                      <SiEnPreparation pour="lorani" t="Règles de votre charte intégrées" />
                    </span>
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
