"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { FONCTIONNALITES as F } from "@/lib/produits/reprise";
import { Cadre, TitreSection } from "./Cadre";
import { TramePoints } from "./Manifeste";
import { cn } from "./cn";

/* Hachure de fond des grilles bento, relevée telle quelle (pas 10 px, 315°).
   Sa jumelle `dark:[background-image:…]` est retirée : page figée en clair. */
const HACHURE =
  "bg-[size:10px_10px] [background-image:repeating-linear-gradient(315deg,rgba(0,0,0,0.05)_0_1px,#0000_0_50%)]";

function Intitule({ titre, suite }: { titre: string; suite: string }) {
  return (
    /* Même parti que TitreSection : sous 640 l'intitulé descend d'un cran et
       sa suite passe en taille de texte courant, sinon la carte est un pavé de
       six lignes à 18 px. Inchangé au-delà de sm. */
    <p className="font-medium text-[#0a0a0a] text-lg max-sm:text-[17px] sm:text-xl">
      {titre}{" "}
      <span className="text-[#737373] max-sm:text-[15px] max-sm:leading-[1.5]">
        {suite}
      </span>
    </p>
  );
}

/* ── Carte 1 · le flux d'annonces ─────────────────────────────────────────
   Écart assumé : la référence pose ici un planisphère en points (« déployer
   des agents dans le monde »). On garde la même composition — trame de points
   sur les deux tiers bas, trois épingles qui battent avec leur étiquette —
   mais chaque point est une annonce parue, les estompées sont celles que le
   filtre écarte, et les épingles marquent celles qui vous concernent.      */
function CarteChamp() {
  const grille = Array.from({ length: 22 * 9 }, (_, i) => i);
  return (
    <div className="min-h-[20rem] md:h-[400px]">
      <div className="relative flex h-full flex-col overflow-hidden border-[#d9d9d9] border-r border-b bg-[#f5f5f5]">
        <div className="p-6 sm:p-8">
          <Intitule titre={F.carteCarte.titre} suite={F.carteCarte.suite} />
        </div>
        <div aria-hidden="true" className="relative flex-1">
          <div className="absolute inset-0 flex items-center justify-center px-8 max-sm:opacity-40">
            <div className="grid grid-cols-[repeat(22,minmax(0,1fr))] gap-x-2.5 gap-y-2.5">
              {grille.map((i) => (
                <span
                  key={i}
                  className={cn(
                    "size-1 rounded-full",
                    /* La grande majorité des annonces ne concerne pas le
                       client : elles restent estompées. */
                    i % 9 === 0 ? "bg-[#0a0a0a]/30" : "bg-[#0a0a0a]/10",
                  )}
                />
              ))}
            </div>
          </div>
          {/* Sous sm, les étiquettes en `whitespace-nowrap` dispersées en
              pourcentage débordent du cadre : à 390 px, celle posée à 18 %
              commence à −10 px. On les empile donc au centre, même
              information, aucun débordement ; au-delà de sm on retrouve la
              dispersion de la référence.
              `dark:bg-muted/95` retiré ici et plus bas — page figée en clair,
              et `bg-muted` ne veut PAS dire la même chose sur ce site. */}
          <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2 sm:hidden">
            {F.carteCarte.epingles.map((e) => (
              <div
                key={e.texte}
                className="flex items-center gap-1.5 rounded border bg-[#f5f5f5]/95 px-2 py-1 font-medium text-[10px] shadow-sm backdrop-blur-sm"
              >
                <span className="relative flex size-2 items-center justify-center">
                  <span className="absolute size-3 animate-ping rounded-full bg-blue-500/20" />
                  <span className="absolute size-2 rounded-full bg-blue-500" />
                </span>
                <span className="text-[#737373]">{e.drapeau}</span>
                <span>{e.texte}</span>
              </div>
            ))}
          </div>

          {F.carteCarte.epingles.map((e) => (
            <div
              key={e.texte}
              className="absolute z-10 hidden rp-fondu opacity-0 sm:block"
              style={{
                left: e.gauche,
                top: e.haut,
                animationDelay: `${e.delai}ms`,
                animationFillMode: "forwards",
              }}
            >
              <div className="flex items-center justify-center">
                <span className="absolute size-3 animate-ping rounded-full bg-blue-500/20" />
                <span className="absolute size-2 rounded-full bg-blue-500" />
              </div>
              <div className="-translate-x-1/2 absolute top-4 left-1/2 whitespace-nowrap">
                <div className="flex items-center gap-1.5 rounded border bg-[#f5f5f5]/95 px-2 py-1 font-medium text-[10px] shadow-sm backdrop-blur-sm">
                  <span className="text-sm text-[#737373]">{e.drapeau}</span>
                  <span>{e.texte}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Carte 2 · la palette de segments ───────────────────────────────────── */
function CartePalette() {
  const [actif, setActif] = useState(0);
  const [ouvert, setOuvert] = useState(false);
  const bloc = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const e = bloc.current;
    if (!e) return;
    const o = new IntersectionObserver(([x]) => x.isIntersecting && setOuvert(true), {
      threshold: 0.3,
    });
    o.observe(e);
    return () => o.disconnect();
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    const t = setInterval(() => setActif((n) => (n + 1) % F.cartePalette.lignes.length), 1400);
    return () => clearInterval(t);
  }, [ouvert]);

  return (
    <div ref={bloc} className="min-h-[20rem] md:h-[400px]">
      <div className="relative flex h-full flex-col overflow-hidden bg-[#f5f5f5]">
        <TramePoints id="trame-palette" />
        <div className="relative z-10 p-6 sm:p-8">
          <Intitule titre={F.cartePalette.titre} suite={F.cartePalette.suite} />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none relative z-10 flex flex-1 items-center justify-center px-6 pb-6 sm:px-8"
        >
          <div
            data-sonde="palette"
            className={cn(
              "w-full max-w-[300px] overflow-hidden rounded-lg border bg-[#fafafa] text-[#272727] shadow-lg transition-all duration-200",
              ouvert ? "scale-100 opacity-100" : "scale-95 opacity-0",
            )}
          >
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 size-4 shrink-0 text-[#737373] opacity-50" />
              <input
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[#737373]"
                placeholder={F.cartePalette.espaceReserve}
                readOnly
                tabIndex={-1}
              />
            </div>
            <div className="max-h-[160px] overflow-hidden scroll-smooth">
              <div
                className="overflow-hidden p-1 transition-transform duration-500 ease-out"
                style={{ transform: `translateY(-${Math.max(0, actif - 2) * 36}px)` }}
              >
                <div className="px-2 py-1.5 font-medium text-[#737373] text-xs">
                  {F.cartePalette.intitule}
                </div>
                {F.cartePalette.lignes.map((l, i) => (
                  <div
                    key={l.texte}
                    className={cn(
                      "relative flex select-none items-center rounded-sm px-2 py-2 text-sm outline-none",
                      /* ex-`model-item-highlight` du globals.css source */
                      i === actif && "rp-ligne-active",
                    )}
                    style={{ borderRadius: 6 }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-[#f5f5f5] font-bold text-[8px] text-[#737373]">
                        {l.code}
                      </div>
                    </div>
                    <span className="ml-2 truncate font-medium">{l.texte}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Bloc citation au milieu du bento ───────────────────────────────────── */
function Citation() {
  return (
    <div className="relative col-span-full flex h-full flex-col items-center justify-center overflow-hidden border-[#d9d9d9] border-b bg-[#f5f5f5] py-12 md:py-32">
      <TramePoints id="trame-citation" />
      <div className="relative z-10 max-w-3xl px-6 text-center">
        {/* Un cran plus bas sous 640 : à 24 px cette citation occupait cinq
              lignes, c'était le plus gros bloc de toute la section. */}
          <p className="text-2xl text-[#0a0a0a] leading-relaxed max-sm:text-xl md:text-3xl lg:text-4xl">
          {F.citation.texte}
        </p>
        <div className="mt-8">
          <p className="font-semibold text-[#0a0a0a]">{F.citation.signataire}</p>
          <p className="text-[#737373] text-sm">{F.citation.role}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Carte 3 · la consigne en français ──────────────────────────────────── */
function CarteLangue() {
  const bloc = useRef<HTMLDivElement>(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const e = bloc.current;
    if (!e) return;
    const o = new IntersectionObserver(([x]) => x.isIntersecting && setVu(true), { threshold: 0.3 });
    o.observe(e);
    return () => o.disconnect();
  }, []);

  return (
    <div ref={bloc} className="min-h-[20rem] md:h-[400px]">
      <div className="relative flex h-full flex-col overflow-hidden border-[#d9d9d9] border-r bg-[#f5f5f5]">
        <TramePoints id="trame-langue" />
        <div className="relative z-10 p-6 sm:p-8">
          <Intitule titre={F.carteLangue.titre} suite={F.carteLangue.suite} />
        </div>
        <div
          aria-hidden="true"
          className="relative z-10 flex flex-col gap-2 overflow-hidden px-6 pb-6 sm:px-20"
        >
          {F.carteLangue.echanges.map((e, i) => (
            <div
              key={e.texte}
              data-sonde="bulle"
              className={cn(
                "max-w-[85%] rounded-lg border px-3 py-2 text-xs transition-all duration-500 sm:text-sm",
                e.role === "vous"
                  ? "self-end bg-[#171717] text-[#fafafa]"
                  /* ex-`bg-muted` : chez la référence c'est EXACTEMENT le fond
                     (#f5f5f5) — le relief vient du filet, pas d'un aplat. */
                  : "self-start bg-[#f5f5f5] text-[#0a0a0a]",
                vu ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              )}
              style={{ transitionDelay: `${i * 260}ms` }}
            >
              {e.texte}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Carte 4 · la justification ─────────────────────────────────────────── */
function CarteTrace() {
  return (
    <div className="min-h-[20rem] md:h-[400px]">
      <div className="relative flex h-full flex-col bg-[#f5f5f5]">
        <TramePoints id="trame-trace" />
        <div className="relative z-10 p-6 sm:p-8">
          <Intitule titre={F.carteTrace.titre} suite={F.carteTrace.suite} />
        </div>
        <div aria-hidden="true" className="relative z-10 flex-1 px-6 pb-6 sm:px-8">
          <p className="text-sm leading-relaxed">
            {F.carteTrace.phrase}{" "}
            <span className="inline">
              {/* `dark:bg-blue-900/30 dark:text-blue-300` retirés : la moitié
                  claire (blue-100 / blue-700) est du Tailwind de base, elle
                  existe bien ici et reste lisible. */}
              <span className="rounded bg-blue-100 px-0.5 text-blue-700">
                {F.carteTrace.phraseCitee}
              </span>
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 font-medium text-[10px] text-white">
                {F.carteTrace.nbSources}
              </span>
            </span>
            {F.carteTrace.fin}
          </p>
        </div>
      </div>
    </div>
  );
}

/* 16/09/2026 (Teo, par l'associé) — deux cartes sur téléphone, le reste
   d'un geste. Ces cartes portent chacune une maquette d'au moins 20 rem :
   empilées, elles font 1 800 px à elles seules. Dès `md` elles sont sur
   deux colonnes et la coupe n'a plus lieu d'être.

   La coupe passe par une variante Tailwind sur le CONTENEUR plutôt que
   par une classe sur chaque carte : les cartes portent leurs propres
   bordures de grille (`border-r`, `border-b`), et les envelopper aurait
   décalé ces traits d'un pixel. */
export function Fonctionnalites() {
  const [tout, setTout] = useState(false);
  return (
    <section id="fonctionnement" data-monde="clair" className="scroll-mt-20">
      <section>
        <Cadre className="relative w-full">
          <div className="relative w-full overflow-hidden border-b px-6 py-16 md:px-16 md:py-24">
            <TitreSection titre={F.titre} suite={F.suite} />
          </div>
          <div className={cn("relative", HACHURE)}>
            <div
              className={`mx-6 grid grid-cols-1 border-[#d9d9d9] border-r border-l md:mx-16 md:grid-cols-2 ${
                tout ? "" : "max-md:[&>*:nth-child(n+3)]:hidden"
              }`}
            >
              <CarteChamp />
              <CartePalette />
              <Citation />
              <CarteLangue />
              <CarteTrace />
            </div>
            <div className="mx-6 mt-5 md:hidden">
              <button
                type="button"
                aria-expanded={tout}
                onClick={() => setTout((v) => !v)}
                className="font-medium text-[#6b6b6b] text-sm underline underline-offset-4"
              >
                {tout ? "Réduire" : "Lire la suite (3 autres)"}
              </button>
            </div>
          </div>
        </Cadre>
      </section>
    </section>
  );
}
