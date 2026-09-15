"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import "./FaqSite.css";

/* ══════════════════════════════════════════════════════════════════════
   FaqSite — la FAQ de /tarifs/site en liste à filets (14/09/2026)

   ORIGINE. `faqs/three` de Tailark (registry/bases/radix/mist, source
   publique). Des trois blocs FAQ de la maison, c'est le seul qui ne pose
   ni carte ni colonne : une seule colonne étroite, cinq questions posées
   à la file, un filet RENTRÉ à l'aplomb du texte entre chacune, et — le
   geste qui fait tout — le filet sous la question ouverte qui s'efface
   pendant que cette question prend une surface douce et un arrondi. La
   liste respire sans qu'on ait dessiné une seule boîte.

   POURQUOI ICI. La page avait cinq <details class="o-faq-item"> : des
   filets nus et un « + » qui pivote en croix. Correct, mais rien n'y dit
   quelle question est ouverte une fois le texte déplié — le lecteur perd
   le fil au milieu d'une réponse de huit lignes. La surface --o-soft et
   le filet qui s'efface donnent ce repère sans une couleur. Et les deux
   autres FAQ du site sont prises : la carte-par-question est sur
   /offres/sur-mesure (faq-06 de Hirael), la deux-colonnes à bloc contact
   est sur /tarifs (faqs-02 de @ln-dev7) — celle-ci est la troisième
   écriture, volontairement la plus sobre des trois.

   CE QUI EST JETÉ, et pourquoi :
   1. `bg-muted`, `text-foreground`, `text-primary`, `text-muted-foreground`,
      `border-none` : jetons shadcn, ils n'existent pas ici. Surface
      --o-soft, encre --o-text, filets --o-line, réponse en `o-body`.
   2. Le <hr> + `group` + `peer-data-[state=open]:opacity-0` de la source :
      remplacés par un ::after sur l'item, qui s'efface sur le dernier et
      sur l'ouvert. Même rendu, un nœud de moins par question, et le filet
      ne peut pas se désynchroniser de son item.
   3. Le `-mx-2 sm:mx-0` de la source : il tirait la liste hors de sa
      colonne pour rattraper le padding des items. À 390 la colonne
      n'a que 24 px de gouttière — on ne va pas mordre dessus.
   4. La ligne « Can't find what you're looking for? Contact our customer
      support team » : la page pose déjà deux portes juste en dessous
      (section 7, « Commander le site » / « Nous joindre »). Une troisième
      au-dessus d'elles ne ferait que diluer.
   5. Le titre et le chapô du bloc source : l'en-tête reste `EnTete` dans
      page.tsx, ce composant ne rend que la liste.
   6. Les `animate-accordion-*` de tailwindcss-animate (absent) : deux
      keyframes sur la hauteur dans FaqSite.css.

   ÉCARTS ASSUMÉS :
   · Le « + » qui pivote en croix, signe des deux autres FAQ du site, cède
     ici au ChevronDown de la source — c'est lui qui va avec une liste à
     filets, et il dit « déplier » là où la croix dit « ajouter ».
   · `defaultValue="fqs-0"` : la première question est ouverte au
     chargement. Sans JavaScript, Radix ne rend QUE le contenu ouvert (les
     quatre autres réponses ne sont pas dans le HTML, c'est le
     fonctionnement de la primitive) — au moins une réponse reste donc
     lisible, et le bloc ne se présente pas comme cinq lignes mortes. Une
     seule ligne à retirer si l'on préfère tout fermé.
   · `type="single" collapsible` : une seule réponse ouverte à la fois, et
     l'ouverte se referme d'un second clic.
   · L'ouverture n'anime QUE la hauteur, jamais l'opacité : une animation
     gelée laisserait sinon un panneau invisible qui capte les clics.
   · `data-reveal` sur chaque item — la mécanique d'apparition de la page,
     pas une seconde ; sans JavaScript rien n'est masqué.
   · Aucune classe Tailwind : tout le style est dans FaqSite.css, scopé
     sous `.offres` avec le préfixe `fqs-`.
   ══════════════════════════════════════════════════════════════════════ */

export type QuestionSite = { q: string; a: string };

export default function FaqSite({ questions }: { questions: QuestionSite[] }) {
  return (
    <Accordion.Root type="single" collapsible defaultValue="fqs-0" className="fqs">
      {questions.map((f, i) => (
        <Accordion.Item key={f.q} value={`fqs-${i}`} data-reveal className="fqs-item">
          <Accordion.Header className="fqs-tete">
            <Accordion.Trigger className="fqs-declencheur">
              <span className="fqs-question">{f.q}</span>
              <ChevronDown aria-hidden strokeWidth={1.8} className="fqs-chevron" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="fqs-contenu">
            <p className="o-body fqs-reponse">{f.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
