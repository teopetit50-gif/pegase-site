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

   24/09 (SOIR) — REGISTRE D'UN CABINET (avocats.css) : les taches bleues
   floues du point du matin et des outils sont retirées ; les h2 passent en
   serif, interligne 1,15 (1,375 pour la sans d'origine) ; l'icône
   d'application et les ondes passent au vert de Tamila. L'APPEL FINAL
   perd ses particules et son halo conique : c'est une carte blanche en
   deux colonnes, le texte à gauche, et à droite la cour du Mai du Palais
   de justice de Paris un jour de pluie (Robin Benzrihem, Unsplash) —
   une photo documentaire plutôt qu'un effet.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, AtSign, Briefcase, CalendarDays, Download, FileCheck2, FileSearch, FileSpreadsheet, FileStack, Filter,
  FolderOpen, GitCompare, History, Inbox, Mail, Paperclip, ScanText, ShieldCheck, Stamp, Gavel, TrendingUp,
} from "lucide-react";
import AnimationContainer from "./apparition";
import { MagicCard } from "./carte-magique";
import { Ripple } from "./ondes";
import { Button } from "./bouton";
import { IconeApp } from "./marque";
import { IllusBordereau, IllusChronologie, IllusContradictions, IllusPieces, IllusSecret } from "./Illustrations";
import { APPEL, CONNEXIONS, CONTACT, FONCTIONNALITES, PIECES, POINT } from "./textes";
import { cn } from "@/lib/cn";

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
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-[1.15]! mt-6">
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
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-[1.15]!">
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
      {/* 24/09 au soir : ce conteneur prend toute la section dès `lg` (`lg:absolute lg:inset-0`). Sans hauteur,
          le titre (`lg:top-1/4`) et le bouton (`lg:bottom-1/4`) se calaient tous deux sur son bord à 0 px, et
          « Voir les garanties » s'affichait AU-DESSUS du titre ; ils encadrent maintenant les ondes. */}
      <AnimationContainer delay={0.1} className="relative lg:absolute lg:inset-0 lg:z-20 lg:pointer-events-none [&_a]:pointer-events-auto">
        <div className="relative flex flex-col lg:hidden items-center justify-center overflow-visible">
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
          <h2 className="text-2xl md:text-4xl lg:text-6xl font-semibold leading-[1.15]!">{CONNEXIONS.titre}</h2>
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

/* ─── « Ready to boost your marketing? » → l'appel final : texte à gauche, la cour du Mai à droite ─── */
export function Appel() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full py-20">
      <AnimationContainer className="py-20 max-w-6xl mx-auto">
        <div className="grid overflow-hidden rounded-2xl lg:rounded-3xl border border-[#171717]/10 bg-[#ffffff] lg:grid-cols-2">
          <div className="flex flex-col items-start justify-center px-6 py-10 md:p-12 lg:p-14">
            <h2 className="text-3xl md:text-5xl lg:text-[2.75rem] leading-[1.12]!">
              {APPEL.titreAvant} <br /> <span className="avocats-accent">{APPEL.titreMot}</span>
            </h2>
            <p className="text-sm md:text-lg text-[#171717]/80 max-w-xl mt-5">
              {APPEL.texte} {APPEL.texteSuite}
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href={CONTACT.audit}>{APPEL.bouton}</Link>
            </Button>
          </div>
          <figure className="relative -order-1 min-h-[240px] sm:min-h-[320px] lg:order-none lg:min-h-[520px]">
            <Image
              src="/photos/avocats-cour-du-mai.jpg"
              alt="La cour du Mai du Palais de justice de Paris, un jour de pluie"
              fill
              sizes="(min-width: 1280px) 576px, (min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
            <figcaption className="absolute bottom-3 left-4 rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
              {APPEL.legende}
            </figcaption>
          </figure>
        </div>
      </AnimationContainer>
    </div>
  );
}
