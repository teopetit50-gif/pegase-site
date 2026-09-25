"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tavaro — GrilleModules.tsx

   COPIÉ le 24/09/2026 à 14 h 58 de `OMEGA/rentalos-site/src/components/
   grille-moteurs.tsx`. La grille était déjà claire.

   CONVERSIONS (source en Tailwind v3) :
   · échelle d'espacement EN PIXELS : `py-64` → `py-[64px]`, `p-10` →
     `p-[10px]`, `md:p-14`, `mb-24`, `gap-8/12`, `px-4/12`, `py-8`,
     `mt-4`, `scroll-mt-80`, `md:scroll-mt-64`, `group-hover:translate-x-2`
     et `-translate-y-2` → les mêmes en `[Npx]` ; `mt-6` restait sur
     l'échelle par défaut ;
   · `md:py-100` RETIRÉ : la clé 100 n'existe ni dans l'échelle de la
     source ni dans celle de Tailwind v3, l'utilitaire n'était pas émis
     (absent de la feuille compilée de rentalos-site.vercel.app). En v4,
     `py-100` vaudrait 25 rem : 400 px de marge qui n'ont jamais existé ;
   · `text-gray-500/600/950`, `border-gray-950/15` → les hexadécimaux de
     la palette v3 (#6b7280, #4b5563, #030712) : la v4 les a redessinés
     en oklch, un ton plus froids ;
   · `text-primary`, `focus-visible:outline-primary` → #1E3A8A ;
   · `rounded-8` → `rounded-[8px]` ; `blur-0` → `blur-[0px]` ;
   · `transition-[opacity,transform,filter]` de l'aperçu flottant →
     + `translate,scale` : la v4 pose `scale-[0.97]` dans la propriété
     `scale`, que `transform` ne couvre plus — sans cela l'aperçu
     sauterait d'échelle au lieu de glisser ;
   · la variante maison `touch-device:` (plugin du tailwind.config) →
     `[@media(pointer:coarse)]:`.

   MARQUE : la pastille de chaque module posait `/marque.svg` → `SigneTuile`,
   le logo officiel (marque.tsx), 18 px puis 22 px dès md.
   Les cases sont des ancres de la page (#solutions, #a-propos) : inchangées.

   REPORT DU 24/09 À 17 h 03 (seconde copie du disque) : la source est
   passée de 12 à 20 modules (textes.ts). La grille n'a rien à changer :
   2 colonnes puis 4 dès md, 20 cases = 10 rangées puis 5 rangées pleines ;
   la case « à venir » (Plan de flotte, n° 20) ferme la dernière rangée.
   ══════════════════════════════════════════════════════════════════════ */
import { MOTEURS, type Moteur } from "./textes";
import { SigneTuile } from "./marque";

/* 25/09 (Teo) : « je ne veux pas que le reste soit flou, je veux que ça fasse
   grossir la carte et que ça mette ce qui est écrit là ». L'aperçu flottant
   qui suivait le pointeur et le voile flou sur les autres cases sont retirés :
   la case survolée grandit sur place en fiche bleue, arrondie à 10 px (« là
   c'est droit, j'aime pas »).
   Seconde passe le même jour : « elle s'affiche en trop gros et elle se
   superpose sur celle qu'on a sélectionnée, donc on ne la voit même plus ».
   La fiche REPREND donc la case (numéro, flèche, pastille du nom) et ajoute
   dessous le chiffre, sa légende, le rôle et le détail, en petit ; elle ne
   déborde que de 6 px sur les côtés et grandit vers le bas (vers le haut
   pour la dernière rangée, afin de rester dans la grille).
   La fiche est DANS le lien : survoler sa partie qui déborde garde la case
   ouverte, et un clic mène au même endroit. CSS seul : `group-hover` de la
   v4 est déjà sous `@media (hover: hover)`, donc rien au toucher ; rien non
   plus sous md. */
const COLONNES = 4;
const ANCRE_X = ["left-[-6px]", "left-1/2 -translate-x-1/2", "right-[-6px]"] as const;
const ANCRE_Y = ["top-[-6px]", "bottom-[-6px]"] as const;
/** Origine de la croissance, [rangée][colonne] : le coin ou le bord ancré. */
const ORIGINE = [
  ["origin-top-left", "origin-top", "origin-top-right"],
  ["origin-bottom-left", "origin-bottom", "origin-bottom-right"],
] as const;

function Fleche() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[#030712]">
      <path d="M3.5 12.5 12.5 3.5M5.5 3.5h7v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Le nom du module : titre pour la vedette, pastille avec le signe sinon.
 *  Sur la fiche, la pastille passe au blanc pour se détacher du bleu. */
function Nom({ mo, fiche = false }: { mo: Moteur; fiche?: boolean }) {
  if (mo.vedette) {
    const Balise = fiche ? "div" : "h3";
    return <Balise className="max-w-full text-center text-[clamp(15px,1.55vw,24px)] font-medium leading-[0.95] tracking-[-0.05em] text-[#030712]">{mo.nom}</Balise>;
  }
  return (
    <span className={`inline-flex items-center gap-[8px] rounded-[8px] px-[12px] py-[8px] ${fiche ? "bg-white/80" : "bg-[var(--accent-soft)]/70"} ${mo.aVenir ? "opacity-60" : ""}`}>
      <SigneTuile className="h-[18px] w-[18px] md:h-[22px] md:w-[22px]" />
      <span className="f-syne text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1E3A8A] md:text-[12px]">{mo.nom}</span>
    </span>
  );
}

/** « 01 / Moteurs » : la grille de la référence (2 colonnes, 4 dès md, filets
 *  gray-950/15), une case par moteur, qui grandit en fiche au survol. */
export function GrilleMoteurs() {
  const rangees = Math.ceil(MOTEURS.liste.length / COLONNES);

  return (
    <section id="moteurs" className="relative scroll-mt-[80px] py-[64px] md:scroll-mt-[64px]" aria-labelledby="moteurs-title">
      <div className="page-container wide">
        <div className="px-[clamp(6px,1vw,16px)]">
          <div className="mb-[24px] max-w-[680px]">
            <h2 id="moteurs-title" className="section-label">{MOTEURS.etiquette}</h2>
          </div>
          <div className="grid grid-cols-2 border-l border-t border-[#030712]/15 md:grid-cols-4">
            {MOTEURS.liste.map((mo, i) => {
              const col = i % COLONNES;
              const x = col === 0 ? 0 : col === COLONNES - 1 ? 2 : 1;
              const y = Math.floor(i / COLONNES) === rangees - 1 ? 1 : 0;
              return (
                <a
                  key={mo.numero}
                  aria-label={`${mo.nom} : ${mo.role}`}
                  href={mo.aVenir ? "#a-propos" : "#solutions"}
                  className="group relative flex min-h-[112px] min-w-0 flex-col border-b border-r border-[#030712]/15 p-[10px] focus-visible:z-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1E3A8A] md:min-h-[160px] md:p-[14px]"
                >
                  <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="flex items-start justify-between gap-[12px]">
                      <span className="font-mono text-[12px] tabular-nums text-[#6b7280]">{mo.numero}</span>
                      <Fleche />
                    </div>
                    <div className="flex flex-1 items-center justify-center px-[4px] py-[8px]">
                      <Nom mo={mo} />
                    </div>
                    <p className="hidden truncate text-[10px] leading-relaxed text-[#4b5563] md:block">{mo.role}</p>
                  </div>

                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute z-30 hidden w-[max(calc(100%+12px),260px)] scale-[0.97] flex-col rounded-[10px] border border-[#030712]/10 bg-[#E8F1FF] p-[16px] opacity-0 shadow-[0_12px_36px_rgba(15,23,42,0.14)] transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-hover:duration-300 group-focus-visible:scale-100 group-focus-visible:opacity-100 group-focus-visible:duration-300 motion-reduce:scale-100 ${ANCRE_X[x]} ${ANCRE_Y[y]} ${ORIGINE[y][x]}`}
                  >
                    <div className="flex items-start justify-between gap-[12px]">
                      <span className="font-mono text-[12px] tabular-nums text-[#6b7280]">{mo.numero}</span>
                      <Fleche />
                    </div>
                    <div className="flex justify-center px-[4px] py-[12px]">
                      <Nom mo={mo} fiche />
                    </div>
                    <div className="flex min-w-0 items-baseline gap-[8px]">
                      <span className="f-syne shrink-0 text-[22px] font-semibold leading-none tracking-[-0.03em] text-[#1E3A8A]">{mo.chiffre}</span>
                      <span className="min-w-0 text-[12px] leading-[1.35] text-[#4b5563]">{mo.chiffreLegende}</span>
                    </div>
                    <div className="mt-[10px] text-[13px] font-medium tracking-[-0.01em] text-[#030712]">{mo.role}</div>
                    <p className="mt-[2px] text-[12px] leading-[1.45] text-[#4b5563]">{mo.detail}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
