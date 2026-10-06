/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Metiers.tsx, « 05 — Métiers »

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   sections/11-testimonials.tsx` (GÉNÉRÉ côté source par l'assembleur ; ici
   une copie du résultat, corrigée à la main). Le rail de « témoignages »
   de la référence, déjà transformé par la source en SITUATIONS : un cas
   d'usage par carte, signé par un profil d'agence et une famille de projet,
   jamais par une personne (règle maison) ; photos de bâtiments Unsplash
   (crédits dans public/secteurs-architectes/photos/CREDITS.txt). Puis le
   bandeau des logiciels des agences, en mots typographiques. Ce qui change :

   · Cartes : `bg-[#fafafa]` (un cran au-dessus du fond noir) → #fafafa
     (un cran sous le fond blanc) ; pastille des glyphes `bg-white/10` →
     encre à 6 % ; glyphes de pièces repeints à l'encre (#404040 au lieu de
     #e5e5e5, public/secteurs-architectes/glyphes/). Jetons clairs pour le
     reste (#0a0a0a, #737373, #e5e5e5).
   · Chaque situation était un <blockquote> : ce n'est la citation de
     personne, c'est un <p> (même dessin).
   · Classes `` (styled-jsx de la référence, sans règle
     ici) retirées ; le rail tourne par `.architectes-rail` et le bandeau par
     les keyframes `architectes-trusted-marquee` d'architectes.css.
   · Posée dans la marge de 30 px de la page (page.tsx).
   · Le second titre (« Quatre étapes où une incohérence coûte cher. »)
     était en `sm:whitespace-nowrap` : à 768 il fait 746 px pour 658 de
     colonne, et la source le coupait déjà (« coûte ch… », rogné par le
     `overflow-hidden` de la section). Ici `lg:whitespace-nowrap` : il passe
     sur deux lignes sous 1024, tient sur une au-delà.
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- photos 16/7 et glyphes SVG repris tels quels de la source (images statiques déjà dimensionnées). */
import React from "react";

export default function Metiers() {
  return (
    <>
      <div id="testimonials" className="scroll-mt-24">
        <section className="overflow-hidden bg-[#ffffff] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl text-left">
              <span className="mb-5 block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a]/40">
                05 — Métiers
              </span>
              <p className="font-sans text-4xl font-medium tracking-tight text-[#0a0a0a]">Où le dossier se perd-il ?</p>
              <h2 className="mt-1 font-sans text-4xl font-medium tracking-tight text-[#737373] lg:whitespace-nowrap">
                Quatre étapes où une incohérence coûte cher.
              </h2>
            </div>
          </div>
          <div className="mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] lg:mt-20">
            <div className="architectes-rail flex w-max gap-5 px-2 hover:[animation-play-state:paused]">
              <article className="flex w-[min(86vw,540px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                <div className="relative aspect-[16/7] shrink-0 overflow-hidden border-b border-[#e5e5e5]">
                  <img
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover grayscale transition duration-700 ease-out hover:grayscale-0"
                    src="/secteurs-architectes/photos/logement.jpg"
                  />
                </div>
                <p className="flex min-h-48 flex-1 p-6 text-xl leading-snug tracking-tight text-[#0a0a0a] md:p-8 md:text-2xl">
                  Le plan de masse et la coupe donnent deux cotes de recul différentes, et l&apos;incohérence est
                  corrigée avant le dépôt plutôt qu&apos;à la demande du service instructeur.
                </p>
                <footer className="flex items-center border-t border-[#e5e5e5]">
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a]/[0.06]">
                      <img
                        alt=""
                        loading="lazy"
                        decoding="async"
                        data-nimg="fill"
                        className="object-contain p-2"
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          left: "0",
                          top: "0",
                          right: "0",
                          bottom: "0",
                          color: "transparent",
                        }}
                        src="/secteurs-architectes/glyphes/permis.svg"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#0a0a0a]">Agence de 6 personnes</span>
                      <span className="block truncate text-sm text-[#737373]">Logement collectif</span>
                    </span>
                  </div>
                  <span className="border-l border-[#e5e5e5] px-4 py-5 text-right text-xs text-[#737373]">
                    Concours et permis
                  </span>
                </footer>
              </article>
              <article className="flex w-[min(86vw,540px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                <div className="relative aspect-[16/7] shrink-0 overflow-hidden border-b border-[#e5e5e5]">
                  <img
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover grayscale transition duration-700 ease-out hover:grayscale-0"
                    src="/secteurs-architectes/photos/equipements-publics.jpg"
                  />
                </div>
                <p className="flex min-h-48 flex-1 p-6 text-xl leading-snug tracking-tight text-[#0a0a0a] md:p-8 md:text-2xl">
                  Sur quatre offres reçues dans quatre formats, un poste n&apos;est chiffré par aucune entreprise, et il
                  ressort à l&apos;analyse plutôt qu&apos;au chantier en plus-value.
                </p>
                <footer className="flex items-center border-t border-[#e5e5e5]">
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a]/[0.06]">
                      <img
                        alt=""
                        loading="lazy"
                        decoding="async"
                        data-nimg="fill"
                        className="object-contain p-2"
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          left: "0",
                          top: "0",
                          right: "0",
                          bottom: "0",
                          color: "transparent",
                        }}
                        src="/secteurs-architectes/glyphes/offres.svg"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#0a0a0a]">Agence de 12 personnes</span>
                      <span className="block truncate text-sm text-[#737373]">Équipements publics</span>
                    </span>
                  </div>
                  <span className="border-l border-[#e5e5e5] px-4 py-5 text-right text-xs text-[#737373]">
                    Analyse des offres
                  </span>
                </footer>
              </article>
              <article className="flex w-[min(86vw,540px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                <div className="relative aspect-[16/7] shrink-0 overflow-hidden border-b border-[#e5e5e5]">
                  <img
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover grayscale transition duration-700 ease-out hover:grayscale-0"
                    src="/secteurs-architectes/photos/rehabilitation.jpg"
                  />
                </div>
                <p className="flex min-h-48 flex-1 p-6 text-xl leading-snug tracking-tight text-[#0a0a0a] md:p-8 md:text-2xl">
                  Une situation facture 62 % d&apos;avancement alors que le chantier en est à 55 %, et l&apos;écart est
                  chiffré avant que la situation soit visée.
                </p>
                <footer className="flex items-center border-t border-[#e5e5e5]">
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a]/[0.06]">
                      <img
                        alt=""
                        loading="lazy"
                        decoding="async"
                        data-nimg="fill"
                        className="object-contain p-2"
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          left: "0",
                          top: "0",
                          right: "0",
                          bottom: "0",
                          color: "transparent",
                        }}
                        src="/secteurs-architectes/glyphes/situations.svg"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#0a0a0a]">Agence de 3 personnes</span>
                      <span className="block truncate text-sm text-[#737373]">Réhabilitation</span>
                    </span>
                  </div>
                  <span className="border-l border-[#e5e5e5] px-4 py-5 text-right text-xs text-[#737373]">
                    Situations de travaux
                  </span>
                </footer>
              </article>
              <article className="flex w-[min(86vw,540px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                <div className="relative aspect-[16/7] shrink-0 overflow-hidden border-b border-[#e5e5e5]">
                  <img
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover grayscale transition duration-700 ease-out hover:grayscale-0"
                    src="/secteurs-architectes/photos/tertiaire.jpg"
                  />
                </div>
                <p className="flex min-h-48 flex-1 p-6 text-xl leading-snug tracking-tight text-[#0a0a0a] md:p-8 md:text-2xl">
                  La fiche technique d&apos;une porte annonce EI 30 quand le CCTP exige EI 60, et le visa est refusé
                  avant la commande plutôt qu&apos;à la réception.
                </p>
                <footer className="flex items-center border-t border-[#e5e5e5]">
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a]/[0.06]">
                      <img
                        alt=""
                        loading="lazy"
                        decoding="async"
                        data-nimg="fill"
                        className="object-contain p-2"
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          left: "0",
                          top: "0",
                          right: "0",
                          bottom: "0",
                          color: "transparent",
                        }}
                        src="/secteurs-architectes/glyphes/fiches.svg"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#0a0a0a]">
                        Groupement de maîtrise d&apos;œuvre
                      </span>
                      <span className="block truncate text-sm text-[#737373]">Tertiaire</span>
                    </span>
                  </div>
                  <span className="border-l border-[#e5e5e5] px-4 py-5 text-right text-xs text-[#737373]">
                    Visa des documents
                  </span>
                </footer>
              </article>
              <article className="flex w-[min(86vw,540px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                <div className="relative aspect-[16/7] shrink-0 overflow-hidden border-b border-[#e5e5e5]">
                  <img
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover grayscale transition duration-700 ease-out hover:grayscale-0"
                    src="/secteurs-architectes/photos/logement.jpg"
                  />
                </div>
                <p className="flex min-h-48 flex-1 p-6 text-xl leading-snug tracking-tight text-[#0a0a0a] md:p-8 md:text-2xl">
                  Le plan de masse et la coupe donnent deux cotes de recul différentes, et l&apos;incohérence est
                  corrigée avant le dépôt plutôt qu&apos;à la demande du service instructeur.
                </p>
                <footer className="flex items-center border-t border-[#e5e5e5]">
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a]/[0.06]">
                      <img
                        alt=""
                        loading="lazy"
                        decoding="async"
                        data-nimg="fill"
                        className="object-contain p-2"
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          left: "0",
                          top: "0",
                          right: "0",
                          bottom: "0",
                          color: "transparent",
                        }}
                        src="/secteurs-architectes/glyphes/permis.svg"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#0a0a0a]">Agence de 6 personnes</span>
                      <span className="block truncate text-sm text-[#737373]">Logement collectif</span>
                    </span>
                  </div>
                  <span className="border-l border-[#e5e5e5] px-4 py-5 text-right text-xs text-[#737373]">
                    Concours et permis
                  </span>
                </footer>
              </article>
              <article className="flex w-[min(86vw,540px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                <div className="relative aspect-[16/7] shrink-0 overflow-hidden border-b border-[#e5e5e5]">
                  <img
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover grayscale transition duration-700 ease-out hover:grayscale-0"
                    src="/secteurs-architectes/photos/equipements-publics.jpg"
                  />
                </div>
                <p className="flex min-h-48 flex-1 p-6 text-xl leading-snug tracking-tight text-[#0a0a0a] md:p-8 md:text-2xl">
                  Sur quatre offres reçues dans quatre formats, un poste n&apos;est chiffré par aucune entreprise, et il
                  ressort à l&apos;analyse plutôt qu&apos;au chantier en plus-value.
                </p>
                <footer className="flex items-center border-t border-[#e5e5e5]">
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a]/[0.06]">
                      <img
                        alt=""
                        loading="lazy"
                        decoding="async"
                        data-nimg="fill"
                        className="object-contain p-2"
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          left: "0",
                          top: "0",
                          right: "0",
                          bottom: "0",
                          color: "transparent",
                        }}
                        src="/secteurs-architectes/glyphes/offres.svg"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#0a0a0a]">Agence de 12 personnes</span>
                      <span className="block truncate text-sm text-[#737373]">Équipements publics</span>
                    </span>
                  </div>
                  <span className="border-l border-[#e5e5e5] px-4 py-5 text-right text-xs text-[#737373]">
                    Analyse des offres
                  </span>
                </footer>
              </article>
              <article className="flex w-[min(86vw,540px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                <div className="relative aspect-[16/7] shrink-0 overflow-hidden border-b border-[#e5e5e5]">
                  <img
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover grayscale transition duration-700 ease-out hover:grayscale-0"
                    src="/secteurs-architectes/photos/rehabilitation.jpg"
                  />
                </div>
                <p className="flex min-h-48 flex-1 p-6 text-xl leading-snug tracking-tight text-[#0a0a0a] md:p-8 md:text-2xl">
                  Une situation facture 62 % d&apos;avancement alors que le chantier en est à 55 %, et l&apos;écart est
                  chiffré avant que la situation soit visée.
                </p>
                <footer className="flex items-center border-t border-[#e5e5e5]">
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a]/[0.06]">
                      <img
                        alt=""
                        loading="lazy"
                        decoding="async"
                        data-nimg="fill"
                        className="object-contain p-2"
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          left: "0",
                          top: "0",
                          right: "0",
                          bottom: "0",
                          color: "transparent",
                        }}
                        src="/secteurs-architectes/glyphes/situations.svg"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#0a0a0a]">Agence de 3 personnes</span>
                      <span className="block truncate text-sm text-[#737373]">Réhabilitation</span>
                    </span>
                  </div>
                  <span className="border-l border-[#e5e5e5] px-4 py-5 text-right text-xs text-[#737373]">
                    Situations de travaux
                  </span>
                </footer>
              </article>
              <article className="flex w-[min(86vw,540px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fafafa]">
                <div className="relative aspect-[16/7] shrink-0 overflow-hidden border-b border-[#e5e5e5]">
                  <img
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover grayscale transition duration-700 ease-out hover:grayscale-0"
                    src="/secteurs-architectes/photos/tertiaire.jpg"
                  />
                </div>
                <p className="flex min-h-48 flex-1 p-6 text-xl leading-snug tracking-tight text-[#0a0a0a] md:p-8 md:text-2xl">
                  La fiche technique d&apos;une porte annonce EI 30 quand le CCTP exige EI 60, et le visa est refusé
                  avant la commande plutôt qu&apos;à la réception.
                </p>
                <footer className="flex items-center border-t border-[#e5e5e5]">
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#0a0a0a]/[0.06]">
                      <img
                        alt=""
                        loading="lazy"
                        decoding="async"
                        data-nimg="fill"
                        className="object-contain p-2"
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          left: "0",
                          top: "0",
                          right: "0",
                          bottom: "0",
                          color: "transparent",
                        }}
                        src="/secteurs-architectes/glyphes/fiches.svg"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#0a0a0a]">
                        Groupement de maîtrise d&apos;œuvre
                      </span>
                      <span className="block truncate text-sm text-[#737373]">Tertiaire</span>
                    </span>
                  </div>
                  <span className="border-l border-[#e5e5e5] px-4 py-5 text-right text-xs text-[#737373]">
                    Visa des documents
                  </span>
                </footer>
              </article>
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-7xl px-6 md:mt-16">
            <div className="relative">
              <p className="mb-8 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a]/40">
                Les plans de vos logiciels, lus en PDF ou en DWG
              </p>
              <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
                <div className="flex w-max items-center animate-[architectes-trusted-marquee_40s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none">
                  <div className="flex shrink-0 items-center gap-16 pr-16">
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-semibold">
                      AutoCAD
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-bold">
                      Revit
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-medium tracking-[0.02em]">
                      Archicad
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-semibold">
                      SketchUp
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-bold tracking-[0.04em]">
                      Allplan
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-medium">
                      Vectorworks
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-semibold">
                      BricsCAD
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-bold">
                      Rhino
                    </span>
                  </div>
                  <div aria-hidden="true" className="flex shrink-0 items-center gap-16 pr-16">
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-semibold">
                      AutoCAD
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-bold">
                      Revit
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-medium tracking-[0.02em]">
                      Archicad
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-semibold">
                      SketchUp
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-bold tracking-[0.04em]">
                      Allplan
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-medium">
                      Vectorworks
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-semibold">
                      BricsCAD
                    </span>
                    <span className="whitespace-nowrap text-[22px] leading-none tracking-tight text-[#0a0a0a]/70 font-bold">
                      Rhino
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
