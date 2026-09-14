"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ArrowRight, Mail, MessageCircle, Plus } from "lucide-react";
import { COURRIEL, lienContact, lienCourriel } from "@/lib/reservation";
import "./faq-tarifs.css";

/* ══════════════════════════════════════════════════════════════════════
   FaqTarifs — la FAQ des prix en deux colonnes (14/09/2026)

   Reprise de `faqs-02` de @ln-dev7 (21st.dev), le même auteur que
   `bento-02` et `how-it-works-01` de /offres : une colonne gauche collante
   (pastille, titre, phrase, carte « parler à quelqu'un »), et l'accordéon
   à droite, 1 fr / 1,4 fr.

   Remplace la grille titre-collant + `<details>` : les questions y étaient
   posées en Jakarta 24 px semi-gras, aussi lourdes que les titres de
   section, et la colonne de gauche ne portait qu'un H2 sur un vide de
   380 px. La carte de contact remplit ce vide avec ce que la page dit
   déjà plus haut (réponse le jour même, WhatsApp, courriel).

   Écarts avec l'original :

   1. `Accordion` de shadcn est remplacé par la primitive Radix directement
      (déjà installée pour la page Factures) — clavier, ARIA et ouverture
      unique compris. Les `animate-accordion-*` de tailwindcss-animate
      n'existent pas ici : deux `@keyframes` sur la hauteur dans
      `faq-tarifs.css`, scopées sous `.tf-faq`.
   2. Les jetons shadcn (`border-border`, `bg-card`, `text-muted-foreground`)
      sont remplacés par les gris de `.resa` (#e3e3e3, blanc, #616161) —
      Tailwind n'émet rien pour un jeton inconnu.
   3. Le bouton `rounded-full` de shadcn devient le bouton du site
      (`r-btn r-btn--noir`) ; « Open a ticket » devient l'écriture WhatsApp
      et « Replies in < 4h » reprend « le jour même », déjà écrit dans le
      bandeau d'orientation de la grille.
   4. Le « + » qui pivote est gardé (c'est le signe des FAQ du site), pas le
      chevron de shadcn.
   5. `cn()` n'est pas utilisé — classes écrites à la main, comme les
      autres reprises du banc.

   Les questions et réponses viennent de `FAQ_TARIFS` dans la page —
   rien n'est réécrit ici.
   ══════════════════════════════════════════════════════════════════════ */

export default function FaqTarifs({ items }: { items: { q: string; r: string[] }[] }) {
  return (
    <div className="tf-faq r-wrap py-14 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start lg:gap-16">
        <div className="flex flex-col gap-5 lg:sticky lg:top-28">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#e3e3e3] bg-white px-3 py-1 text-xs font-medium text-[#616161]">
            FAQ
          </span>
          <h2 className="r-h3">Questions sur les prix</h2>
          <p className="text-[15px] leading-[23px] text-[#616161]">
            Les questions qu&apos;une page de prix doit traiter clairement. S&apos;il en manque une, décrivez votre situation et une personne de l&apos;équipe vous répond.
          </p>

          <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-[#e3e3e3] bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#050505] text-white">
                <MessageCircle aria-hidden className="size-4" />
              </span>
              <div className="flex flex-col leading-tight">
                <p className="text-sm font-medium text-[#050505]">Parler à un conseiller</p>
                <p className="text-xs text-[#616161]">Réponse le jour même</p>
              </div>
            </div>
            <a
              href={lienContact("avant")}
              className="r-btn r-btn--noir mt-2 w-full !text-[15px]"
            >
              Nous écrire
              <ArrowRight aria-hidden className="size-4" />
            </a>
            <p className="text-center text-[11px] leading-4 text-[#616161]">
              <Mail aria-hidden className="mr-1 inline size-3" />
              Ou par e-mail&nbsp;:{" "}
              <a
                href={lienCourriel("Tarifs Omega")}
                className="font-medium text-[#050505] underline-offset-4 hover:underline"
              >
                {COURRIEL}
              </a>
            </p>
          </div>
        </div>

        <Accordion.Root type="single" collapsible className="border-t border-[#e3e3e3]">
          {items.map((f, i) => (
            <Accordion.Item key={f.q} value={`q-${i}`} className="border-b border-[#e3e3e3]">
              <Accordion.Header className="flex">
                <Accordion.Trigger className="group flex flex-1 items-start justify-between gap-6 py-5 text-left text-[16px] font-medium leading-[24px] text-[#050505] transition-colors hover:text-[#3d3d3d] sm:text-[17px]">
                  {f.q}
                  <Plus
                    aria-hidden
                    className="mt-1 size-4 shrink-0 text-[#616161] transition-transform duration-300 group-data-[state=open]:rotate-45"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="tf-faq-contenu overflow-hidden">
                <div className="pb-6 pr-8">
                  {f.r.map((par, j) => (
                    <p
                      key={j}
                      className={`text-[15px] leading-[24px] text-[#3d3d3d] ${j > 0 ? "mt-3" : ""}`}
                    >
                      {par}
                    </p>
                  ))}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </div>
  );
}
