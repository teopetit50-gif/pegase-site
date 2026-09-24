"use client";
/* FAQ de Vertex (module 7142 de 421-*.js) : sommaire collant à gauche suivi par IntersectionObserver
   (rootMargin −15 % / −70 %), accordéon Radix à une seule ouverture, pictogramme [+] / [−] dessiné en traits.

   COPIÉ le 24/09/2026 à 12 h 01 de `OMEGA/chantieros-site/src/components/faq.tsx`. Ce qui change :
   · Sommaire collant : `top-0` sous `md` et `md:top-12` passaient SOUS l'entête d'Omega, qui est collant
     lui aussi (64 px sur téléphone, 72 dès `sm`). → `top-16 sm:top-[72px] md:top-[120px]` : sur téléphone
     la bande de catégories se range juste sous l'entête ; à partir de `md` elle garde les 48 px d'air que
     la source lui donnait (`top-12`), comptés depuis le bas de l'entête. Sur la référence, à 1440, la
     première catégorie se glissait à moitié sous sa propre barre : l'écart corrige aussi ça.
   · Accordéon : `animate-accordion-down/up` venaient du `@theme` de la source ; ici, classe `btp-accordeon`
     et ses deux keyframes dans btp.css (mêmes 0,2 s ease-out sur --radix-accordion-content-height).
   · Couleurs converties (règle 3) : text-foreground → text-[#171717] (et /70 au survol) ·
     text-muted-foreground → text-[#737373] · border-border → border-[#e6e6e6] · md:border-foreground →
     md:border-[#171717] · max-md:bg-foreground/2 → max-md:bg-[#171717]/2. */
import * as React from "react";
import * as A from "@radix-ui/react-accordion";
import { OctagonAlert, HardHat, WalletCards } from "lucide-react";
import { FAQ } from "./textes";

const ICONES = { general: OctagonAlert, chantier: HardHat, formules: WalletCards } as const;

function Signe() {
  return (
    <svg width="19.2" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
      className="mt-2 shrink-0 text-[#737373] transition-colors duration-300 group-hover:text-[#171717] group-data-[state=open]:text-[#171717]">
      <line x1="0" y1="0.75" x2="20%" y2="0.75" />
      <line x1="0.75" y1="0" x2="0.75" y2="100%" />
      <line x1="0" y1="11.25" x2="20%" y2="11.25" />
      <line x1="6" y1="50%" x2="13.2" y2="50%" />
      <line x1="50%" y1="2.4" x2="50%" y2="9.6" className="origin-center transition-transform duration-300 ease-in-out group-data-[state=open]:scale-y-0" />
      <line x1="80%" y1="0.75" x2="100%" y2="0.75" />
      <line x1="18.45" y1="0" x2="18.45" y2="100%" />
      <line x1="80%" y1="11.25" x2="100%" y2="11.25" />
    </svg>
  );
}

export function Faq() {
  const cats = FAQ.categories;
  const [actif, setActif] = React.useState(cats[0].id);
  const refs = React.useRef<Record<string, HTMLDivElement | null>>({});
  React.useEffect(() => {
    const obs = new IntersectionObserver(
      (entrees) => {
        const vues = entrees.filter((e) => e.isIntersecting);
        if (!vues.length) return;
        vues.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = vues[0].target.id;
        if (id) setActif(id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    Object.values(refs.current).filter(Boolean).forEach((el) => obs.observe(el!));
    return () => obs.disconnect();
  }, []);
  return (
    <section className="flex flex-col">
      <div className="border-[#e6e6e6] border-t border-dashed" />
      <div className="w-full px-6 py-16 sm:px-8 md:py-24 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-semibold text-4xl text-[#171717]">{FAQ.titre}</h2>
          <p className="mt-4 text-balance text-lg text-[#737373]">{FAQ.sous}</p>
        </div>
        <div className="@container mt-12 grid md:mt-16 md:grid-cols-5">
          <nav aria-label={FAQ.aria} className="sticky top-16 z-10 h-fit sm:top-[72px] max-md:flex max-md:justify-center max-md:bg-[#171717]/2 max-md:p-2 max-md:backdrop-blur md:top-[120px] md:col-span-2">
            {cats.map(({ id, label }) => {
              const on = actif === id;
              const Icone = ICONES[id as keyof typeof ICONES];
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  data-state={on ? "active" : "inactive"}
                  onClick={() => setActif(id)}
                  className={`flex items-center gap-2 text-sm transition-colors duration-200 max-md:px-3 max-md:py-1.5 md:border-transparent md:border-l-2 md:py-2 md:pl-4 ${on ? "font-medium text-[#171717] md:border-[#171717]" : "text-[#737373] hover:text-[#171717]"}`}
                >
                  <Icone className="size-4 shrink-0" />
                  <span className="@max-xs:in-data-[state=inactive]:hidden">{label}</span>
                </a>
              );
            })}
          </nav>
          <div className="max-md:mt-10 md:col-span-3">
            <div className="space-y-12">
              {cats.map((c) => (
                <div key={c.id} id={c.id} ref={(el) => { refs.current[c.id] = el; }} className="scroll-mt-24">
                  <h3 className="font-semibold text-base text-[#171717]">{c.label}</h3>
                  <A.Root type="single" collapsible className="mt-2" defaultValue={c.id === cats[0].id ? `${c.id}-0` : undefined}>
                    {c.items.map((q, i) => (
                      <A.Item key={q.question} value={`${c.id}-${i}`} className="border-[#e6e6e6] border-b py-7">
                        <A.Header className="flex">
                          <A.Trigger className="group flex w-full cursor-pointer items-start justify-between gap-6 text-left text-base outline-none">
                            <span className="font-semibold text-[#171717] transition-colors duration-200 group-hover:text-[#171717]/70">{q.question}</span>
                            <Signe />
                          </A.Trigger>
                        </A.Header>
                        <A.Content className="overflow-hidden text-base text-[#737373] btp-accordeon">
                          <div className="pt-4 pr-2 lg:pr-16">{q.answer}</div>
                        </A.Content>
                      </A.Item>
                    ))}
                  </A.Root>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-[#e6e6e6] border-t border-dashed" />
    </section>
  );
}
