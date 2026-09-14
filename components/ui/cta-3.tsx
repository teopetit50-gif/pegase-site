import Link from "next/link";
import { Plus } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   cta-3 — l'appel encadré au trait (11/09/2026)

   Reprise de `cta-3` de @efferd (21st.dev) : un bloc tenu par deux filets
   horizontaux et deux filets verticaux qui dépassent, quatre croix aux
   angles, un axe pointillé au centre, et un lavis radial qui descend du
   coin haut-gauche.

   Remplace la carte grise à trame pointillée qui fermait /offres. Le motif
   de la trame revenait déjà quatre fois plus haut (fond du hero, fond des
   cartes bento) ; le trait, lui, n'est employé nulle part ailleurs sur la
   page, et il ferme mieux qu'un rectangle gris de plus.

   Quatre écarts avec l'original :

   1. `--theme(--color-foreground/.08)` n'existe pas ici (c'est la syntaxe
      des jetons shadcn) : le lavis est écrit en `rgba` d'encre.
   2. L'AXE POINTILLÉ PASSE EN `z-0`, PAS EN `-z-10`. Un enfant à z-index
      négatif ne peint derrière le fond de son parent que si ce parent ne
      crée aucun contexte d'empilement — or `data-reveal` en pose un le
      temps de l'apparition, et le trait clignotait. Contenu en `z-10`,
      décor en `z-0` : le rendu ne dépend plus de l'animation.
   3. LES BOUTONS SONT CEUX DU SITE (`o-btn`), pas ceux de shadcn — sinon
      cet appel serait le seul bouton de la page à ne pas ressembler aux
      trente autres.
   4. Respiration doublée (`py-14 sm:py-16` au lieu de `py-8`) : à 768 px de
      large, le bloc d'origine est un bandeau ; ici il ferme une page de
      6 000 px et doit peser autant que les sections qu'il suit.

   ⚠ Les croix débordent de 11,5 px à gauche et à droite. Aucun parent ne
   doit porter `overflow-hidden`, et à 390 px c'est la gouttière de
   `.o-wrap` qui les absorbe — vérifié au débordement horizontal.
   ══════════════════════════════════════════════════════════════════════ */

export function Cta3({
  titre,
  chapo,
  bouton,
}: {
  titre: string;
  chapo?: string;
  bouton: { label: string; href: string };
}) {
  return (
    <div
      data-reveal
      className="relative mx-auto flex w-full max-w-3xl flex-col justify-between gap-y-7 border-y border-[var(--o-line)] px-4 py-14 sm:py-16"
      style={{
        background:
          "radial-gradient(35% 80% at 25% 0%, rgba(9,9,11,0.06), transparent)",
      }}
    >
      {/* les quatre croix d'angle */}
      <Plus aria-hidden className="absolute -left-[11.5px] -top-[12.5px] z-10 h-6 w-6 text-[var(--o-muted)]" strokeWidth={1} />
      <Plus aria-hidden className="absolute -right-[11.5px] -top-[12.5px] z-10 h-6 w-6 text-[var(--o-muted)]" strokeWidth={1} />
      <Plus aria-hidden className="absolute -bottom-[12.5px] -left-[11.5px] z-10 h-6 w-6 text-[var(--o-muted)]" strokeWidth={1} />
      <Plus aria-hidden className="absolute -bottom-[12.5px] -right-[11.5px] z-10 h-6 w-6 text-[var(--o-muted)]" strokeWidth={1} />

      {/* les deux montants, qui dépassent de 24 px en haut et en bas */}
      <div aria-hidden className="pointer-events-none absolute -inset-y-6 left-0 z-0 w-px border-l border-[var(--o-line)]" />
      <div aria-hidden className="pointer-events-none absolute -inset-y-6 right-0 z-0 w-px border-r border-[var(--o-line)]" />

      {/* l'axe central */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-0 h-full border-l border-dashed border-[var(--o-line)]" />

      <div className="relative z-10 space-y-4">
        <h2 className="o-h2 mx-auto max-w-[640px] text-center">{titre}</h2>
        {chapo ? (
          <p className="o-lead mx-auto max-w-[520px] text-center">{chapo}</p>
        ) : null}
      </div>

      <div className="relative z-10 flex items-center justify-center">
        <Link href={bouton.href} className="o-btn o-btn--primary">
          {bouton.label}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
