import { MARQUE, CLOTURE } from "@/lib/produits/relances";

/* Le bloc d'appel qui ouvrait le pied du site source (components/Pied.tsx).

   RAPATRIEMENT 11/09 — le `<footer>` du site source est SUPPRIMÉ (règle 6 :
   entête et pied font doublon avec ceux du site, servis par PageShell).
   Mais son premier bloc n'était pas du châssis : c'est la dernière phrase
   de la page et son appel à l'action. Il est donc sorti du pied et devient
   une section à part entière, sous le nom `Cloture`. Ce qui part avec le
   pied : la marque et sa vignette, les quatre colonnes de liens, la ligne
   de mentions légales et les deux liens légaux — tous présents dans le pied
   du site, et deux d'entre eux pointaient sur `https://omegaai.fr/…`,
   c'est-à-dire ici.

   Le bouton menait à `/creer-un-compte` : il mène désormais à
   `/reserver-un-audit` (table de réaiguillage de RAPATRIEMENT.md), et son
   libellé suit — un bouton qui promet un compte et ouvre une prise de
   rendez-vous serait faux.

   Couleurs converties : `bg-background` → `bg-[#ffffff]`,
   `text-foreground` → `text-[#171717]`, `text-muted-foreground` →
   `text-[#737373]`, `bg-primary text-primary-foreground
   hover:bg-primary/90` → `bg-[#171717] text-[#ffffff] hover:bg-[#171717]/90`,
   `text-foreground/[0.06]` → `text-[#171717]/[0.06]`, et le
   `color-mix(… var(--foreground) …)` du dégradé passe sur `var(--rel-fg)`. */
export function Cloture() {
  return (
    <section
      id="commencer"
      data-monde="clair"
      className="relative mt-12 scroll-mt-24 overflow-hidden bg-[#ffffff]"
    >
      {/* La référence pose ici la photographie de son gabarit. Aucun des
          sites frères n'embarque de photo, et celle-ci ne nous appartient
          pas : un dégradé qui monte du bas donne au bloc d'appel de quoi
          se poser. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(75% 60% at 50% 100%, color-mix(in oklab, var(--rel-fg) 9%, transparent), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 text-[#171717]/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,transparent,black_35%,black_70%,transparent)]" />
      </div>

      <div /* Le bloc d'appel faisait 224 px de marge verticale à lui seul sur
              un téléphone. On repart plus serré et on rejoint le relevé à sm. */
        className="relative px-6 pt-16 pb-20 text-center sm:pt-24 sm:pb-32 md:pt-32 md:pb-40 lg:px-8"
      >
        <h2 /* 48 px de base tenaient sur cinq lignes à 375 px : on part du
             même palier que le h1 du héros et on rejoint la référence dès sm. */
          className="mx-auto max-w-3xl text-balance font-bold text-4xl text-[#171717] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          {CLOTURE.titre}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-balance text-base text-[#737373] md:text-lg">
          {CLOTURE.chapo}
        </p>
        {/* CORRIGÉ le 11/09/2026 — le bouton était réglé de deux façons
            contradictoires : `h-10` fixait la hauteur à 40 px ET `py-5`
            demandait 40 px de rembourrage vertical. En `border-box`, la
            boîte de CONTENU tombait donc à 0 px : le libellé, haut de
            20 px, se centrait dans le vide et touchait presque les deux
            bords. Avec `rounded-full` par-dessus, la partie droite de la
            pastille faisait quelques pixels — d'où le gros losange noir.
            Mesuré : 163 × 40, rayon 9999, contenu 0 px.

            La hauteur vient maintenant du contenu (20 px de libellé) plus
            son rembourrage (2 × 12), soit 44 px — un cran au-dessus des
            36 px des deux boutons du héros, ce qu'un appel final mérite.
            Et `rounded-md` : c'est le rayon des trois autres boutons de
            la page, relevé sur Folio. La pastille était l'intruse.
            Aucun autre bouton du parc n'a ce réglage — les quatre pages
            ont été balayées. */}
        <a
          href={MARQUE.audit}
          className="mt-8 inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#171717] px-6 py-3 font-medium text-[#ffffff] text-sm shadow-md transition-all hover:bg-[#171717]/90"
        >
          {CLOTURE.bouton}
        </a>
      </div>
    </section>
  );
}
