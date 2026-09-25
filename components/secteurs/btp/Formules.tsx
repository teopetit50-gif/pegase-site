"use client";
/* Formules de Vertex (module 6312 de 421-*.js) : en-tête collant sous la barre (top-16), grille 200 px + 3 colonnes,
   lignes de 56 px, infobulles Radix au « ? », version empilée sous md. Écart assumé : pas de prix publics
   (le prix est fixé à l'audit), donc plus de bascule mensuel / annuel — sa place porte l'intitulé « Comparer ».

   COPIÉ le 24/09/2026 à 12 h 01 de `OMEGA/chantieros-site/src/components/pricing.tsx`.

   AUCUN PRIX : la source affichait déjà « Prix fixé à l'audit, selon vos chantiers ouverts » à la place du
   montant, ce qui est la règle du site (le prix s'estime, l'audit le fixe). Rien à remplacer.

   CE QUI CHANGE
   · Infobulles : `@radix-ui/react-tooltip` n'est pas installé ici (consigne : ne pas l'ajouter si on peut
     s'en passer). `Bulle` ci-dessous le remplace en ~40 lignes : même bulle (#171717, 12 px, rayon 6,
     `max-w-xs`, flèche carrée à 45°), même délai de 150 ms, même côté (au-dessus, sans décalage), et un
     recalage horizontal pour ne jamais sortir de la fenêtre — c'est ce que Radix faisait par ses
     « collisions ». Ouverture au survol de la souris et au focus (un toucher sur téléphone donne le focus).
     Les classes `tw-animate-css` (`animate-in`, `fade-in-0`, `zoom-in-95`…) n'existent pas ici : l'entrée
     est l'animation `btp-bulle` de btp.css (fondu + 95 % → 100 %, 150 ms).
   · En-tête collant : `top-16` (64 px, la barre de la source) → `top-[72px]`, la hauteur de l'entête
     d'Omega à partir de `sm` (components/Header.tsx) ; cette grille n'existe qu'à partir de `md`.
   · Boutons : `CONTACT.audit` = /reserver-un-audit, en <Lien>.
   · Couleurs converties (règle 3) : bg-background → bg-[#ffffff] (et /90, /75 du verre collant) ·
     text-muted-foreground → text-[#737373] · text-foreground, text-secondary-foreground → text-[#171717] ·
     bg-primary, text-primary-foreground → #171717, #ffffff · bg-foreground/N → #171717/N ·
     border-border → #e6e6e6. Les `border-t` / `border-b` sans couleur sont peints par la règle de base de
     btp.css. Les 4 utilitaires `dark:` sont retirés.
   · « J-2 » (Confirmation à J-2) : insécable.
   · 25/09/2026 — sous md, chaque groupe du comparatif se PLIE (`<details>` natif, fermé par défaut). Teo, sur
     capture : « juste sur mobile cette section est trop longue, mets des trucs qui se plient et déplient ».
     Déplié, le comparatif faisait vingt-cinq lignes, trois écrans ; plié, cinq titres. Le tableau de bureau
     (hidden md:block) ne change pas. */
import * as React from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
import Lien from "@/components/Lien";
import { cn } from "@/lib/cn";
import { Button } from "./bouton";
import { insecable } from "./insecable";
import { CONTACT, FORMULES, type Valeur } from "./textes";

type Plan = (typeof FORMULES.plans)[number] & { popular?: boolean };
const PLANS = FORMULES.plans as Plan[];

function Bulle({ children, texte, className }: { children: React.ReactNode; texte: string; className: string }) {
  const [ouverte, setOuverte] = React.useState(false);
  const [decalage, setDecalage] = React.useState(0);
  const bulle = React.useRef<HTMLSpanElement>(null);
  const minuterie = React.useRef<number | undefined>(undefined);
  const ouvrir = () => {
    window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => setOuverte(true), 150); /* delayDuration de la source */
  };
  const fermer = () => {
    window.clearTimeout(minuterie.current);
    setOuverte(false);
    setDecalage(0);
  };
  React.useEffect(() => () => window.clearTimeout(minuterie.current), []);
  /* Recalage : la bulle est centrée sur le « ? » ; si elle sort de la fenêtre, on la ramène à 8 px du bord.
     La flèche, elle, reste sur le « ? » (elle n'est pas dans la boîte décalée). */
  React.useLayoutEffect(() => {
    if (!ouverte || !bulle.current) return;
    const r = bulle.current.getBoundingClientRect();
    const largeur = document.documentElement.clientWidth;
    if (r.left < 8) setDecalage(8 - r.left);
    else if (r.right > largeur - 8) setDecalage(largeur - 8 - r.right);
  }, [ouverte]);
  return (
    <button
      type="button"
      data-slot="tooltip-trigger"
      className={cn("relative", className)}
      aria-label={texte}
      onPointerEnter={(e) => e.pointerType === "mouse" && ouvrir()}
      onPointerLeave={(e) => e.pointerType === "mouse" && fermer()}
      onFocus={ouvrir}
      onBlur={fermer}
      onKeyDown={(e) => e.key === "Escape" && fermer()}
    >
      {children}
      {ouverte && (
        <span data-slot="tooltip-content" aria-hidden="true" className="pointer-events-none absolute bottom-full left-1/2 z-50">
          <span
            ref={bulle}
            className="btp-bulle block w-max max-w-xs text-balance rounded-md bg-[#171717] px-3 py-1.5 text-left font-normal text-[#ffffff] text-xs"
            style={{ transform: `translateX(calc(-50% + ${decalage}px))` }}
          >
            {texte}
          </span>
          <span className="btp-bulle -translate-x-1/2 absolute top-full left-0 block size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-[#171717]" />
        </span>
      )}
    </button>
  );
}

function Conseille() {
  return <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-600 text-xs">{FORMULES.conseille}</span>;
}

function Prix() {
  return (
    <div className="mt-2">
      <p className="text-[#737373] text-xs">{FORMULES.prix}</p>
      <p className="text-[#737373] text-xs">{FORMULES.prixSous}</p>
    </div>
  );
}

function EnteteLarge({ p }: { p: Plan }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-x-2">
        <h3 className="font-medium text-2xl text-[#171717] tracking-tight">{p.name}</h3>
        {p.popular && <Conseille />}
      </div>
      <Prix />
      <div className="mt-4 flex flex-col items-stretch">
        <Button asChild size="sm" variant={p.popular ? "default" : "outline"} className="h-9 rounded-[6px]"><Lien href={CONTACT.audit}>{p.cta}</Lien></Button>
      </div>
    </div>
  );
}

function CarteEtroite({ p }: { p: Plan }) {
  return (
    <div className={cn("rounded-lg border p-4", p.popular ? "border-blue-500" : "border-[#e6e6e6]")}>
      <div className="flex items-center gap-x-2">
        <h3 className="font-medium text-base text-[#171717] tracking-tight">{p.name}</h3>
        {p.popular && <Conseille />}
      </div>
      <Prix />
      <Button asChild size="sm" variant={p.popular ? "default" : "outline"} className="mt-3 h-9 w-full rounded-[6px]"><Lien href={CONTACT.audit}>{p.cta}</Lien></Button>
    </div>
  );
}

function Case({ v }: { v: Valeur }) {
  if (v === true)
    return <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/10 font-sans font-semibold text-emerald-600 text-xs" aria-label="Inclus"><Check className="size-3" strokeWidth={3} /></span>;
  if (v === false)
    return <span className="flex size-5 items-center justify-center rounded-full bg-[#171717]/[0.065] font-sans font-semibold text-[#171717]/65 text-xs" aria-label="Non inclus"><Minus className="size-3" strokeWidth={3} /></span>;
  return <span className="text-sm">{v}</span>;
}

const GRILLE = "grid grid-cols-[200px_1fr_1fr_1fr] gap-x-6";

export function Pricing() {
  return (
      <section className="bg-[#ffffff] pb-16 md:py-16">
        <div className="px-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl px-6 pt-6 text-center md:px-0 md:pt-0 md:pb-10">
            <h2 className="text-balance font-bold text-3xl md:text-4xl lg:text-5xl lg:tracking-tight">{FORMULES.titre}</h2>
            <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-[#737373]">{FORMULES.sous}</p>
          </div>

          <div className="md:hidden">
            <div className="flex flex-col gap-y-3 px-6 pt-6">
              <p className="text-[#737373] text-xs">{FORMULES.comparer.join(" ")}</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 px-6 sm:grid-cols-3">
              {PLANS.map((p) => <CarteEtroite key={p.id} p={p} />)}
            </div>
            <div className="mt-8">
            {FORMULES.groupes.map((g) => (
              <details key={g.title} className="group border-[#e6e6e6] border-t last:border-b">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <h3 className="font-medium text-[#171717] text-base">{g.title}</h3>
                    <p className="mt-0.5 text-[#737373] text-sm">{g.description}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-x-1.5 text-[#737373] text-xs tabular-nums">
                    {g.features.length}
                    <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                  </span>
                </summary>
                {g.features.map((f) => (
                  <div key={f.name} className="border-t px-6 py-4">
                    <div className="flex items-start gap-x-2">
                      <div className="font-medium text-[#171717] text-sm">{insecable(f.name)}</div>
                      <Bulle texte={f.description} className="flex size-6 shrink-0">
                        <span className="m-auto flex size-4 items-center justify-center rounded-full bg-[#171717]/10 text-[#171717]/65 text-sm">?</span>
                      </Bulle>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      {PLANS.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-[#737373] text-xs">{p.name}</span>
                          <Case v={(f.values as Record<string, Valeur>)[p.id]} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </details>
            ))}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="sticky top-[72px] z-20 bg-[#ffffff]/90 pt-10 backdrop-blur supports-[backdrop-filter]:bg-[#ffffff]/75">
              <div className={GRILLE}>
                <div className="-mb-0.5 flex flex-col justify-end gap-y-3">
                  <p className="text-[#737373] text-xs">{FORMULES.comparer[0]}<br /> {FORMULES.comparer[1]}</p>
                </div>
                {PLANS.map((p) => <div key={p.id}><EnteteLarge p={p} /></div>)}
              </div>
              <div className="mt-8 border-[#e6e6e6] border-b" />
            </div>
            <div className={GRILLE}>
              <div>
                {FORMULES.groupes.map((g) => (
                  <div key={g.title}>
                    <div className="relative flex h-24 flex-col justify-center">
                      <h3 className="font-medium text-lg">{g.title}</h3>
                      <p className="-mr-12 mt-1 line-clamp-2 text-balance text-[#737373] text-sm">{g.description}</p>
                    </div>
                    {g.features.map((f) => (
                      <div key={f.name} className="flex h-14 items-center border-t text-[#737373] last:h-[calc(3.5rem+1px)] last:border-b">
                        <div className="text-sm">{insecable(f.name)}</div>
                        <Bulle texte={f.description} className="flex size-7 shrink-0">
                          <span className="m-auto flex size-4 items-center justify-center rounded-full bg-[#171717]/10 text-[#171717]/65 text-sm">?</span>
                        </Bulle>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {PLANS.map((p) => (
                <div key={p.id}>
                  {FORMULES.groupes.map((g) => (
                    <div key={g.title}>
                      <div aria-hidden="true" className="h-24" />
                      {g.features.map((f) => (
                        <div key={f.name} className="flex h-14 items-center border-t text-sm last:h-[calc(3.5rem+1px)] last:border-b md:px-2 lg:px-4">
                          <Case v={(f.values as Record<string, Valeur>)[p.id]} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
  );
}
