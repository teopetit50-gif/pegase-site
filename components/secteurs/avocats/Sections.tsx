/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — Sections.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/
   sections.tsx` : pièces lues, fonctionnalités, point du matin, outils,
   appel final. Géométrie, textes, grilles et animations inchangés.

   CONVERSIONS (règle 3, jetons CLAIRS) : `bg-background`, `bg-card` →
   `bg-[#ffffff]` (suffixes d'opacité gardés) · `border-border` →
   `border-[#e6e6e6]` · `text-foreground`, `text-accent-foreground` →
   `text-[#171717]` · `text-muted-foreground` → `text-[#737373]` ·
   `from-foreground/5`, `border-foreground/20` → `#171717` · `rounded-md`
   → `rounded-[calc(0.6rem-2px)]`. Polices : `font-heading` retiré des h2
   (avocats.css leur donne la police de titre du site) ; `font-subheading
   italic` (Instrument Serif) → `avocats-accent italic`.

   MONDE BLANC, section par section :
   · Pièces lues : `.companies` → `.avocats-pieces` (avocats.css). Sa lueur
     bleue d'en-tête reste ici ; son filet (::before) sort de la section et
     prend toute la largeur de la fenêtre (page.tsx, règle des séparateurs
     du 24/09 au soir) — d'où le `mt-16` qui part avec lui.
   · Fonctionnalités : cartes blanches ; c'est le liseré d'un pixel de la
     carte magique qui les découpe sur le blanc.
   · Point du matin : les lueurs d'angle `blue-500` / `sky-500` → `blue-300`
     / `sky-300` (une lueur saturée tache le blanc) ; la tendance
     `green-500` → `green-600`, lisible sur le blanc. Les boutons fantômes
     foncent au survol au lieu d'éclaircir (bouton.tsx).
   · Outils : le halo `blue-400 → indigo-500` → `blue-200 → indigo-300`.
     Les bulles d'outils gardent leur voile d'encre à 5 % ; leur ombre
     `shadow-black/10`, invisible sur le noir, APPARAÎT sur le blanc :
     ÷ 1,5 (7 %). Les ondes : ondes.tsx. L'icône d'application : marque.tsx.
   · Appel final : cadre et voile inchangés en sens (encre à 20 % au lieu de
     blanc à 20 %) ; les particules #d4d4d4 (gris clair, des étoiles sur le
     noir) → ardoise #64748b, avec les mêmes alphas aléatoires (0,1 à 0,7) ;
     le halo conique : halo.tsx.

   LIENS (règle 6) : « Réserver un audit » de l'appel → /reserver-un-audit
   (textes.ts), en <Link>. « Voir les garanties » n'est pas un appel à
   l'action : il descend à la section « Secret professionnel » (#secret),
   comme dans la source. Les deux boutons étaient un <button> DANS un lien ;
   ici `Button asChild` fait du lien le bouton (mêmes classes).
   TABLEAUX DU POINT DU MATIN, sous `lg` : quatre colonnes égales, comme la
   source, laissaient « Licenciement » et « Construction » déborder sur la
   colonne voisine (« LicenciementForfait », mesuré à 390 et 768 : General
   Sans est plus large que Satoshi ; la source débordait déjà à 768, sur
   trois cellules). Mesure des textes les plus longs de chaque colonne :
   86, 79, 44 et 76 px. Sous `lg` seulement, les colonnes prennent ces
   proportions (`grid-cols-[86fr_79fr_44fr_76fr]`) ; entre `md` et `lg`,
   où la ligne ne fait que 290 px, le texte passe de 14 à 13 px (interligne
   de 20 px gardé, la hauteur des lignes ne bouge pas) pour laisser un
   blanc entre les colonnes. Aucun texte raccourci ; dès `lg`,
   la géométrie de la source (`grid-cols-4`, 14 px).
   ANCRES : `scroll-mt-16` (la barre de 64 px de la source) →
   `scroll-mt-16 sm:scroll-mt-[72px]`, la hauteur de l'entête d'Omega.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import {
  ArrowRight, AtSign, Briefcase, CalendarDays, Download, FileCheck2, FileSearch, FileSpreadsheet, FileStack, Filter,
  FolderOpen, GitCompare, History, Inbox, Mail, Paperclip, ScanText, ShieldCheck, Stamp, Gavel, TrendingUp,
} from "lucide-react";
import AnimationContainer from "./apparition";
import { MagicCard } from "./carte-magique";
import { Ripple } from "./ondes";
import { Particles } from "./particules";
import { Button } from "./bouton";
import { IconeApp } from "./marque";
import { IllusBordereau, IllusChronologie, IllusContradictions, IllusPieces, IllusSecret } from "./Illustrations";
import { APPEL, CONNEXIONS, CONTACT, FONCTIONNALITES, PIECES, POINT } from "./textes";
import { cn } from "@/lib/cn";
import { HaloConique } from "./halo";

/* ─── « Trusted by leading brands » → les familles de pièces lues (aucun logo de client inventé) ─── */
const iconesPieces = [Gavel, FileStack, Paperclip, FileSearch, Stamp, AtSign, ScanText];

export function Pieces() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full py-20 avocats-pieces overflow-hidden">
      <AnimationContainer delay={0.4}>
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-2xl lg:text-4xl font-medium text-center">
            {PIECES.avant} <span className="avocats-accent italic">{PIECES.mot}</span>{PIECES.apres && ` ${PIECES.apres}`}
          </h2>
        </div>
      </AnimationContainer>
      <AnimationContainer delay={0.45}>
        <ul className="flex flex-row flex-wrap items-center justify-center gap-8 max-w-xl mx-auto pt-16 text-[#737373] transition-all">
          {PIECES.familles.map((f, i) => {
            const I = iconesPieces[i];
            return (
              <li key={f} className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
                <I className="size-5" strokeWidth={1.8} aria-hidden="true" />
                {f}
              </li>
            );
          })}
        </ul>
      </AnimationContainer>
    </div>
  );
}

/* ─── « AI-Powered marketing made simple » → cinq fonctionnalités, grille 3 colonnes, MagicCard ─── */
const cartes = [
  { I: Inbox, Illus: IllusPieces, span: "" },
  { I: History, Illus: IllusChronologie, span: "" },
  { I: FileCheck2, Illus: IllusBordereau, span: "md:col-span-2 lg:col-span-1" },
  { I: GitCompare, Illus: IllusContradictions, span: "lg:col-span-2" },
  { I: ShieldCheck, Illus: IllusSecret, span: "" },
];

export function Fonctionnalites() {
  return (
    <div id="fonctionnalites" className="relative flex flex-col items-center justify-center w-full py-20 scroll-mt-16 sm:scroll-mt-[72px]">
      <AnimationContainer delay={0.1}>
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-snug! mt-6">
            {FONCTIONNALITES.titreL1}
            <br />
            {FONCTIONNALITES.titreL2} <span className="avocats-accent italic">{FONCTIONNALITES.titreMot}</span>
          </h2>
          <p className="text-base md:text-lg text-center text-[#171717]/80 mt-6">{FONCTIONNALITES.texte}</p>
        </div>
      </AnimationContainer>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 relative overflow-visible">
        {cartes.map(({ I, Illus, span }, i) => {
          const c = FONCTIONNALITES.cartes[i];
          return (
            <AnimationContainer
              key={c.titre}
              delay={0.2 + 0.1 * i}
              className={cn("relative flex flex-col rounded-2xl lg:rounded-3xl bg-[#ffffff] border border-[#e6e6e6]/50 hover:border-[#e6e6e6]/100 transition-colors", span)}
            >
              <MagicCard className="p-4 lg:p-6 lg:rounded-3xl">
                <div className="flex items-center space-x-4 mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <I className="size-5" aria-hidden="true" />
                    {c.titre}
                  </h3>
                </div>
                <p className="text-sm text-[#737373]">{c.texte}</p>
                <div className="mt-6 w-full bg-[#ffffff]/50 overflow-hidden">
                  <Illus />
                </div>
              </MagicCard>
            </AnimationContainer>
          );
        })}
      </div>
    </div>
  );
}

/* ─── « Intelligent marketing dashboard » → le point du matin, deux cartes à tableau ─── */
export function PointDuMatin() {
  return (
    <div id="point-du-matin" className="relative flex flex-col items-center justify-center w-full py-20 scroll-mt-16 sm:scroll-mt-[72px]">
      <AnimationContainer delay={0.1}>
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-snug!">
            {POINT.titreL1}
            <br />
            <span className="avocats-accent italic">{POINT.titreMot}</span>
          </h2>
          <p className="text-base md:text-lg text-[#171717]/80 mt-4">{POINT.texte}</p>
        </div>
      </AnimationContainer>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative w-full">
        {POINT.cartes.map((c, i) => (
          <AnimationContainer key={c.titre} delay={0.2 + 0.1 * i}>
            <div className="rounded-2xl bg-[#ffffff]/40 relative border border-[#e6e6e6]/50">
              <MagicCard className="p-4 lg:p-8 w-full overflow-hidden">
                <div className={cn("absolute bottom-0 right-0 w-1/4 h-1/4 blur-[8rem] z-20", i ? "bg-sky-300" : "bg-blue-300")} />
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center justify-between gap-2">
                    {c.titre}
                    <span className="rounded-[calc(0.6rem-2px)] border border-[#e6e6e6] px-2 py-0.5 text-[11px] font-normal uppercase tracking-wider text-[#737373]">{POINT.exemple}</span>
                  </h3>
                  <p className="text-sm text-[#737373]">{c.texte}</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <div className="text-3xl font-semibold">{c.valeur}</div>
                        <div className="text-sm text-green-600 flex items-center gap-1 mt-2">
                          <TrendingUp className="w-4 h-4" aria-hidden="true" />
                          {c.tendance}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" aria-label="Filtrer">
                          <Filter className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Exporter">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[86fr_79fr_44fr_76fr] lg:grid-cols-4 text-sm md:max-lg:text-[13px] md:max-lg:leading-5 text-[#737373] py-2">
                        {c.colonnes.map((col) => <div key={col}>{col}</div>)}
                      </div>
                      {c.lignes.map((l) => (
                        <div key={l[0]} className="grid grid-cols-[86fr_79fr_44fr_76fr] lg:grid-cols-4 text-sm md:max-lg:text-[13px] md:max-lg:leading-5 py-2 border-t border-[#e6e6e6]/50">
                          <div>{l[0]}</div>
                          <div>{l[1]}</div>
                          <div>{l[2]}</div>
                          <div className="font-semibold">{l[3]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </MagicCard>
            </div>
          </AnimationContainer>
        ))}
      </div>
    </div>
  );
}

/* ─── « Social Media Integration » → la couche sur les outils du cabinet (ondes Magic UI) ─── */
const outils = [
  { I: FolderOpen, t: CONNEXIONS.outils[2], c: "-translate-x-[285px] size-12 hidden lg:flex", s: "size-5" },
  { I: CalendarDays, t: CONNEXIONS.outils[1], c: "-translate-x-[210px] size-16 flex", s: "size-7" },
  { I: Mail, t: CONNEXIONS.outils[0], c: "-translate-x-[125px] size-20 flex", s: "size-10" },
  { I: Briefcase, t: CONNEXIONS.outils[3], c: "translate-x-[125px] size-20 flex", s: "size-10" },
  { I: ScanText, t: CONNEXIONS.outils[4], c: "translate-x-[210px] size-16 flex", s: "size-7" },
  { I: FileSpreadsheet, t: CONNEXIONS.outils[5], c: "translate-x-[285px] size-12 hidden lg:flex", s: "size-5" },
];

export function Connexions() {
  return (
    <div id="outils" className="relative flex flex-col items-center justify-center w-full py-20 scroll-mt-16 sm:scroll-mt-[72px]">
      <AnimationContainer delay={0.1} className="relative">
        <div className="relative flex flex-col lg:hidden items-center justify-center overflow-visible">
          <div className="absolute top-1/2 -translate-y-1/2 right-1/4 w-3/5 h-14 lg:h-20 bg-linear-to-r from-blue-200 to-indigo-300 rounded-full -rotate-12 blur-[6.5rem] -z-10" />
          {/* la référence pose ici une image (integration.svg, une rangée d'icônes) : même rangée, dessinée */}
          <div className="max-w-sm w-full h-auto mx-auto mt-8 flex items-center justify-center gap-3" role="img" aria-label={CONNEXIONS.outils.join(", ")}>
            {outils.slice(1, 3).map(({ I, t }) => (
              <span key={t} className="grid size-10 place-items-center rounded-full bg-linear-to-b from-[#171717]/5 to-transparent shadow-xl shadow-black/[0.07]"><I className="size-5" /></span>
            ))}
            <IconeApp className="size-16" />
            {outils.slice(3, 5).map(({ I, t }) => (
              <span key={t} className="grid size-10 place-items-center rounded-full bg-linear-to-b from-[#171717]/5 to-transparent shadow-xl shadow-black/[0.07]"><I className="size-5" /></span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto lg:absolute lg:top-1/4 inset-x-0 mt-12 lg:mt-0">
          <h2 className="text-2xl md:text-4xl lg:text-6xl font-semibold leading-snug!">{CONNEXIONS.titre}</h2>
        </div>
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto lg:absolute lg:bottom-1/4 inset-x-0 z-20 mt-8 lg:mt-0">
          <Button asChild size="lg">
            <a href="#secret">
              {CONNEXIONS.bouton}
              <ArrowRight className="size-4" />
            </a>
          </Button>
        </div>
      </AnimationContainer>
      <AnimationContainer delay={0.2}>
        <div className="relative hidden lg:flex items-center justify-center overflow-visible">
          <div className="absolute top-1/2 -translate-y-1/2 right-1/4 w-3/5 h-14 lg:h-20 bg-linear-to-r from-blue-200 to-indigo-300 rounded-full -rotate-12 blur-[6.5rem] -z-10" />
          <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-visible">
            <Ripple />
          </div>
          <div className="absolute z-20 flex items-center justify-center group">
            <IconeApp className="size-24 group-hover:scale-110 transition-all duration-500" />
          </div>
          {outils.map(({ I, t, c, s }) => (
            <div
              key={t}
              title={t}
              className={cn("absolute z-20 p-3 rounded-full items-center justify-center bg-linear-to-b from-[#171717]/5 to-transparent shadow-xl shadow-black/[0.07] backdrop-blur-lg transition-all duration-300 hover:scale-110", c)}
            >
              <I className={cn("text-[#171717]", s)} aria-label={t} />
            </div>
          ))}
        </div>
      </AnimationContainer>
    </div>
  );
}

/* ─── « Ready to boost your marketing? » → l'appel final, particules Magic UI et halo conique ─── */
export function Appel() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full py-20">
      <AnimationContainer className="py-20 max-w-6xl mx-auto">
        <div className="relative flex flex-col items-center justify-center py-12 lg:py-20 px-0 rounded-2xl lg:rounded-3xl bg-[#ffffff]/20 text-center border border-[#171717]/20 overflow-hidden">
          <Particles refresh ease={80} quantity={80} color="#64748b" className="hidden lg:block absolute inset-0 z-0" />
          <Particles refresh ease={80} quantity={35} color="#64748b" className="block lg:hidden absolute inset-0 z-0" />
          <HaloConique />
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-medium leading-snug! px-4">
            {APPEL.titreAvant} <br /> <span className="avocats-accent italic">{APPEL.titreMot}</span>
          </h2>
          <p className="text-sm md:text-lg text-center text-[#171717]/80 max-w-2xl mx-auto mt-4 px-4">
            {APPEL.texte} <span className="hidden lg:inline">{APPEL.texteSuite}</span>
          </p>
          <Button asChild size="lg" className="mt-8 relative z-10">
            <Link href={CONTACT.audit}>{APPEL.bouton}</Link>
          </Button>
        </div>
      </AnimationContainer>
    </div>
  );
}

