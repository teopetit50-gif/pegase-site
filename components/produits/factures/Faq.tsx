"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/produits/factures/ui/accordion";
import { FAQ } from "@/lib/produits/factures";

/* La FAQ, en accordéon.

   C'est le bloc qui absorbe le plus de texte pour le moins de hauteur :
   sept réponses tiennent en sept lignes tant qu'on n'en ouvre pas une.
   La page en avait besoin — il n'y avait aucun endroit où un acheteur
   trouvait « et si ça se trompe ? » ou « je peux arrêter quand ? ».

   Deux réponses disent explicitement ce que FILED NE fait PAS. C'est
   volontaire : c'est ce qu'un acheteur cherche d'abord, et c'est ce qui
   évite un client déçu au premier mois. */
export default function Faq() {
  return (
    <div className="mx-0 grid gap-8 lg:mx-5 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        <p className="max-w-sm text-[15px] leading-relaxed text-[#737373]">
          Sept questions, sept réponses courtes. Deux d&apos;entre elles disent ce que le
          système ne fait pas — c&apos;est souvent ce qu&apos;on cherche en premier.
        </p>
      </div>

      <div className="lg:col-span-7">
        <Accordion type="single" collapsible className="border-t border-[#171717]/[0.12]">
          {FAQ.questions.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.r}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
