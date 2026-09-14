import Link from "next/link";

/* ══════════════════════════════════════════════════════════════════════
   cta-rectangle — l'appel final éclairé par le bas (14/09/2026)

   Reprise de `cta-with-rectangle` de @mikolajdobrucki (Launch UI,
   21st.dev) : une pastille, un titre, une phrase, un bouton, et sous
   l'ensemble un rectangle arrondi dont seule la lueur intérieure se voit —
   elle monte du bas et s'éteint vers le haut, comme un écran qu'on
   aurait posé derrière le texte.

   Ferme /offres/sur-mesure, qui se terminait sur la FAQ depuis le 26/07
   (Teo avait retiré la carte de clôture du gabarit, jugée doublon). Ici
   la FAQ passe en cartes et n'a plus la forme d'une fin de page ; un
   appel court la referme. Le texte n'est pas inventé : le titre est
   l'appel de la famille (« Parler de votre cas »), la phrase est celle de
   la première étape (« Rien n'est chiffré avant que ce soit clair… »).

   Trois écarts :
   1. `shadow-glow` et `fade-top-lg` sont des utilitaires de la config
      Launch UI : la lueur est écrite en `box-shadow` inset blanc, le
      fondu en `mask-image`. Le glow est monochrome, comme tout ici.
   2. `animate-fade-in-up delay-*` (greffon d'animation absent) →
      `data-reveal`, comme partout sur le site.
   3. `Button` et `Badge` shadcn → `o-btn` et `o-pill` du site.
   ══════════════════════════════════════════════════════════════════════ */

export function CtaRectangle({
  pastille,
  titre,
  texte,
  action,
}: {
  pastille: string;
  titre: string;
  texte: string;
  action: { label: string; href: string };
}) {
  return (
    <section className="overflow-hidden">
      <div className="relative mx-auto flex max-w-[960px] flex-col items-center gap-6 px-8 py-16 text-center sm:gap-8 md:py-24">
        <div data-reveal>
          <span className="o-pill o-pill--xs">{pastille}</span>
        </div>
        <h2 data-reveal className="o-h2 max-w-[640px] !leading-[1.15]">
          {titre}
        </h2>
        <p data-reveal className="o-lead max-w-[560px]">
          {texte}
        </p>
        <div data-reveal>
          <Link href={action.href} className="o-btn o-btn--primary">
            {action.label}
          </Link>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow:
              "0 -16px 128px 0 rgba(255,255,255,0.10) inset, 0 -16px 32px 0 rgba(255,255,255,0.05) inset",
            maskImage: "linear-gradient(to bottom, transparent, black 45%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 45%)",
          }}
        />
      </div>
    </section>
  );
}
