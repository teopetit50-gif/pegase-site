"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ArrowRight, ChevronDown, Mail } from "lucide-react";
import { COURRIEL, lienContact } from "@/lib/reservation";
import { Button } from "@/components/ui/button";
import "./faq-tarifs.css";

/* ══════════════════════════════════════════════════════════════════════
   FaqTarifs — la FAQ des prix (14/09/2026)

   SECONDE PASSE DU JOUR — LE MODÈLE « FAQSECTION » (Teo, composant de
   référence fourni). La FAQ quitte la composition `faqs-02` du matin
   (colonne gauche collante : pastille, titre, carte « parler à un
   conseiller » ; accordéon à droite) pour celle de la référence :

     · un EN-TÊTE CENTRÉ — surtitre discret, titre, chapô, puis un bouton
       en pilule qui emmène vers la porte de contact ;
     · les questions en DEUX COLONNES d'accordéons, moitié / moitié, la
       moitié impaire allant à gauche.

   Ce qui reste du matin : la primitive Radix (clavier, ARIA, ouverture
   unique), les deux `@keyframes` de hauteur de `faq-tarifs.css`, les gris
   de `.resa`, et le fait que les questions ne sont PAS écrites ici —
   elles viennent de `FAQ_TARIFS` dans la page.

   Écarts avec la référence, assumés :

   1. La référence ouvre DEUX accordéons indépendants (`type="single"` par
      colonne) : une réponse peut donc rester ouverte de chaque côté. C'est
      gardé tel quel — deux colonnes, deux lectures.
   2. Le chevron vient de `@radix-ui/react-icons` chez la référence ; le
      paquet n'est pas installé et lucide l'est partout — `ChevronDown`,
      même geste, même rotation à l'ouverture. Le « + » des autres FAQ du
      site part donc ici, c'est le signe de ce composant.
   3. `Accordion` de shadcn est remplacé par la primitive Radix
      directement, et les `animate-accordion-*` de tailwindcss-animate (qui
      n'est installé nulle part sur le parc) par les deux keyframes de
      `faq-tarifs.css`, scopées sous `.tf-faq`.
   4. Les jetons shadcn (`border-border`, `text-muted-foreground`) sont
      remplacés par les gris de `.resa` (#e3e3e3, #616161, #3d3d3d) —
      Tailwind n'émet rien pour un jeton inconnu.
   5. Le bouton de la référence est décoratif (`onButtonClick`) ; ici il
      mène vraiment quelque part — la porte de contact — donc un `<a>`
      habillé par `Button asChild`. La ligne e-mail qui vivait dans la
      carte du matin le suit : c'est une voie de contact réelle, la perdre
      coûterait plus que la ressemblance.
   ══════════════════════════════════════════════════════════════════════ */

type Item = { q: string; r: string[] };

export default function FaqTarifs({ items }: { items: Item[] }) {
  /* moitié / moitié — l'impair va à gauche, comme la référence répartit
     ses cinq et cinq */
  const coupe = Math.ceil(items.length / 2);
  const colonnes: Item[][] = [items.slice(0, coupe), items.slice(coupe)];

  return (
    <div className="tf-faq r-wrap py-14 sm:py-20">
      {/* ——— en-tête centré ——— */}
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-2 text-sm font-medium tracking-wide text-[#616161]">
          Questions fréquentes
        </p>
        <h2 className="r-h3 mb-3">Questions sur la facturation</h2>
        <p className="mx-auto mb-6 max-w-xl text-[15px] leading-[23px] text-[#616161]">
          Les points qui reviennent le plus souvent sur la tarification et les modalités. Si
          une question manque, décrivez votre situation&nbsp;: un membre de l&apos;équipe vous
          répond le jour même.
        </p>
        <Button asChild className="h-11 rounded-full px-6 text-[15px]">
          <a href={lienContact("avant")}>
            Nous écrire
            <ArrowRight aria-hidden className="ml-2 size-4" />
          </a>
        </Button>
        <p className="mt-4 text-xs leading-4 text-[#616161]">
          <Mail aria-hidden className="mr-1 inline size-3" />
          Ou par e-mail&nbsp;:{" "}
          {/* 15/09/2026 — l'adresse reste AFFICHÉE, elle n'est plus un lien.
                Un `mailto:` sort du site vers un client mail (et ne fait
                rien du tout sur un téléphone sans compte configuré) : c'est
                la dernière famille de portes sortantes après WhatsApp. En
                faire un second lien vers /contact ne servait à rien — le
                bouton juste au-dessus y mène déjà. Reste donc le texte, à
                copier par qui préfère écrire depuis sa propre boîte.
                Le `mailto:` ne subsiste que là où il est la bonne réponse : la carte « Écrire » de /contact, que le visiteur a choisie, et les voies de SECOURS (formulaire ou agenda en panne). */}
          <span className="font-medium text-[#050505]">{COURRIEL}</span>
        </p>
      </div>

      {/* ——— les questions, en deux colonnes ——— */}
      <div className="grid grid-cols-1 gap-x-12 text-left md:grid-cols-2">
        {colonnes.map((colonne, c) => (
          <Accordion.Root
            key={c}
            type="single"
            collapsible
            className="border-t border-[#e3e3e3]"
          >
            {colonne.map((f, i) => (
              <Accordion.Item
                key={f.q}
                value={`q-${c}-${i}`}
                className="border-b border-[#e3e3e3]"
              >
                <Accordion.Header className="flex">
                  <Accordion.Trigger className="group flex flex-1 cursor-pointer items-start justify-between gap-6 py-5 text-left text-[16px] font-medium leading-[24px] text-[#050505] transition-colors hover:text-[#3d3d3d]">
                    {f.q}
                    <ChevronDown
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-[#616161] transition-transform duration-300 group-data-[state=open]:rotate-180"
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
        ))}
      </div>
    </div>
  );
}
