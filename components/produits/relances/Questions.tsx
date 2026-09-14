"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { QUESTIONS, MARQUE } from "@/lib/produits/relances";

/* Relevé : titre à gauche, chapô à droite, puis une grille `md:grid-cols-5`
   — nav de catégories collante sur 2 colonnes, accordéons sur 3.

   ÉCART ASSUMÉ — la référence utilise l'accordéon Radix. On l'écrit à la
   main : une dépendance de moins, et le repli natif suffit ici puisqu'il
   n'y a ni portail ni positionnement flottant. Le clavier et
   `aria-expanded` sont conservés.

   RAPATRIEMENT 11/09 — deux choses :

   1. LA NAV COLLANTE DESCEND SOUS L'ENTÊTE DU SITE. Sur le site source
      l'entête était `fixed` et flottante : la nav des catégories pouvait
      coller à `top-0` (mobile) et `md:top-12`. Ici l'entête du site est
      `sticky top-0` et OPAQUE, haute de 64 px puis 72 px à partir de `sm`
      (components/Header.tsx) : aux valeurs d'origine la nav se serait
      glissée dessous. On garde le dégagement de 48 px du relevé, mesuré
      sous la barre réelle — `top-16` et `md:top-[120px]`.

   2. Couleurs converties : `bg-background` → `bg-[#ffffff]`,
      `text-foreground` → `text-[#171717]`, `text-muted-foreground` →
      `text-[#737373]`, `bg-card` → `bg-[#ffffff]`, `ring-border` →
      `ring-[#e6e6e6]`, `border-border` → `border-[#e6e6e6]`,
      `max-md:bg-foreground/2` → `max-md:bg-[#171717]/2`,
      `focus-visible:ring-ring/50` → `focus-visible:ring-[#171717]/50`.
      `shadow-black/[0.065]` reste : `black` est de la palette Tailwind
      par défaut, il existe sur ce site. */
export function Questions() {
  const [ouvert, setOuvert] = useState<string | null>(
    `${QUESTIONS.categories[0].id}-0`,
  );
  const [visible, setVisible] = useState<string>(QUESTIONS.categories[0].id);

  useEffect(() => {
    const cibles = QUESTIONS.categories
      .map((c) => document.getElementById(c.id))
      .filter((e): e is HTMLElement => e !== null);
    const obs = new IntersectionObserver(
      (entrees) => {
        const vue = entrees.filter((e) => e.isIntersecting).sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0];
        if (vue) setVisible(vue.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    cibles.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="questions"
      data-monde="clair"
      className="scroll-mt-24 bg-[#ffffff] py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="font-semibold text-4xl text-[#171717]">{QUESTIONS.titre}</h2>
          <p className="max-w-md text-balance text-lg text-[#737373]">
            {QUESTIONS.chapoAvant}
            <a
              href={`mailto:${MARQUE.courriel}`}
              className="font-medium text-[#171717] hover:underline"
            >
              {QUESTIONS.chapoLien}
            </a>
            {QUESTIONS.chapoApres}
          </p>
        </div>

        <div className="mt-6 grid md:mt-20 md:grid-cols-5">
          <nav
            aria-label="Catégories de questions"
            className="md:-mt-3 sticky top-16 z-10 h-fit max-md:flex max-md:justify-center max-md:bg-[#171717]/2 max-md:p-2 max-md:backdrop-blur md:top-[120px] md:col-span-2 md:block"
          >
            {QUESTIONS.categories.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className={`block w-fit py-2 text-left text-sm transition-colors max-md:px-2 md:py-1.5 ${
                  visible === c.id
                    ? "font-medium text-[#171717]"
                    : "text-[#737373] hover:text-[#171717]"
                }`}
              >
                {c.titre}
              </a>
            ))}
          </nav>

          <div className="space-y-12 max-md:mt-6 md:col-span-3">
            {QUESTIONS.categories.map((c) => (
              <div key={c.id} id={c.id} className="scroll-mt-28 space-y-4">
                <h3 className="pl-6 font-semibold text-[#171717] text-lg">{c.titre}</h3>
                <div className="-space-y-1">
                  {c.items.map((item, i) => {
                    const cle = `${c.id}-${i}`;
                    const actif = ouvert === cle;
                    return (
                      <div
                        key={item.q}
                        /* Un seul filet par question : celui du bouton.
                           La référence pose `border-none` sur l'enveloppe
                           pour cette raison — garder les deux donnait deux
                           traits de largeurs différentes, l'un pleine
                           largeur, l'autre rentré de `px-6`. */
                        className={`rounded-xl border-none px-6 py-1 ${
                          actif
                            ? "bg-[#ffffff] shadow-black/[0.065] shadow-sm ring-1 ring-[#e6e6e6]"
                            : ""
                        }`}
                      >
                        <h4 className="flex">
                          <button
                            type="button"
                            id={`question-${cle}`}
                            aria-expanded={actif}
                            aria-controls={`reponse-${cle}`}
                            onClick={() => setOuvert(actif ? null : cle)}
                            className={`flex flex-1 cursor-pointer items-start justify-between gap-4 border-b py-4 text-left font-medium text-base outline-none focus-visible:ring-[3px] focus-visible:ring-[#171717]/50 ${
                              actif ? "border-transparent" : "border-[#e6e6e6]"
                            }`}
                          >
                            {item.q}
                            <ChevronDown
                              className={`size-4 shrink-0 translate-y-0.5 text-[#737373] transition-transform ${
                                actif ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </h4>
                        <div
                          id={`reponse-${cle}`}
                          role="region"
                          aria-labelledby={`question-${cle}`}
                          hidden={!actif}
                          className="overflow-hidden text-sm"
                        >
                          <div className="pt-0 pb-4 text-[#737373] leading-relaxed">
                            {item.r}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
