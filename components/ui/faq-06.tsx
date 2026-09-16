"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import "./faq-06.css";

/* ══════════════════════════════════════════════════════════════════════
   faq-06 — la FAQ en cartes, titre à deux encres (14/09/2026)

   Reprise de `faq-06` de Hirael (@hirael, MIT · Mohammad Shehadeh,
   21st.dev) : un en-tête centré dont le titre est peint en deux tons (la
   première moitié des mots en gris, la seconde en blanc), puis une pile de
   cartes-accordéon espacées, chacune sur son filet, qui s'éclaircit quand
   elle est ouverte.

   Remplace le `BlocFaq` de /offres/sur-mesure : une grande carte grise de
   800 px avec des `<details>` à filet dessous — le même bloc que sur les
   fiches PULSE et VAULT. Ici chaque question est sa propre carte.

   Ce qui a été jeté, et pourquoi :
   • `motion` (apparition mot à mot du titre, cartes en cascade) : le site
     a déjà `data-reveal` pour ça, et deux systèmes sur le même élément se
     battent. Les spans du titre restent, sans animation.
   • `Badge`, `bg-card`, `bg-muted/40`, `border-border`, `font-serif` :
     jetons et police absents. Pastille `o-pill`, surfaces `--o-soft` /
     blanc à l'ouverture, filets `--o-line`, titre en `o-h2`.
     15/09 — la carte ouverte S'ÉCLAIRCIT, comme dans l'original : elle
     valait `#1c1c20` sur le noir, elle vaut `bg-white` sur le
     `--o-soft` (#fafafa) des cartes fermées. Le geste est le même, le
     sens de l'écart aussi.
   • L'accordéon shadcn attendu (`@/components/ui/accordion`) n'existe pas
     dans ce dossier : la primitive Radix est câblée directement, avec un
     « + » qui pivote en croix — le vocabulaire déjà posé sur le bloc
     facturation de la page Factures.

   Deux règles tenues :
   • `type="single" collapsible` : une réponse ouverte à la fois, c'est ce
     que faisait le bloc d'avant (`<details>` sans `name` ouvrait tout, ce
     qui n'était pas voulu non plus).
   • L'ouverture n'anime QUE la hauteur (`faq-06.css`) — jamais l'opacité.
   ══════════════════════════════════════════════════════════════════════ */

export type Question = { q: string; a: string };

/* la moitié des mots en gris, la suite à l'encre pleine — l'accent de
   Hirael. Aucune couleur en dur : `--o-muted` puis la couleur héritée,
   donc le titre suit le monde de la page. */
export function TitreDeuxEncres({ children }: { children: string }) {
  const mots = children.split(" ");
  const moitie = Math.floor(mots.length / 2);
  return (
    <h2 data-reveal className="o-h2 mt-2.5 max-w-[600px] !leading-[1.15]">
      {mots.map((m, i) => (
        // l'espace est un nœud texte ENTRE les spans, pas une marge : avec
        // `me-[0.25em]` seul, le titre se lisait « Questionsdirectes,… »
        // au lecteur d'écran et à la copie
        <span key={`${m}-${i}`}>
          <span className={"inline-block " + (i < moitie ? "!text-[var(--o-muted)]" : "")}>{m}</span>
          {i < mots.length - 1 ? " " : null}
        </span>
      ))}
    </h2>
  );
}

export function Faq06({ questions }: { questions: Question[] }) {
  return (
    <Accordion.Root type="single" collapsible className="mx-auto flex w-full max-w-[800px] flex-col gap-3">
      {questions.map((f, i) => (
        <Accordion.Item
          key={f.q}
          value={`q-${i}`}
          data-reveal
          className="rounded-xl border border-[var(--o-line)] bg-[var(--o-soft)] px-5 transition-colors data-[state=open]:bg-white md:px-6"
        >
          <Accordion.Header className="flex tracking-[-0.01em]">
            <Accordion.Trigger className="group flex flex-1 items-center justify-between gap-6 py-4 text-left text-[16px] font-medium leading-snug text-[var(--o-text)] md:text-[17px]">
              {f.q}
              <Plus
                aria-hidden
                className="h-4 w-4 shrink-0 text-[var(--o-muted)] transition-transform duration-300 group-data-[state=open]:rotate-45"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="fq-contenu overflow-hidden">
            <p className="o-body pb-5 pr-6 !text-[15px] !leading-[1.75]">{f.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
