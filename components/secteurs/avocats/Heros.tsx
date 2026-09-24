/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — Heros.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/
   hero.tsx`. Géométrie, orbites (300/400/500 px, 40/80/200 s), étincelle du
   badge et lueurs animées inchangées ; seules les couleurs changent.

   CONVERSIONS (règle 3, jetons CLAIRS) : `text-foreground/N` → `text-[#171717]/N`
   (orbites) · `text-muted-foreground` → `text-[#737373]` · `bg-background`
   → `bg-[#ffffff]` · `border-border` → `border-[#e6e6e6]` · `from-background`
   → `from-[#ffffff]` · `animate-flip`, `animate-image-glow` → `avocats-flip`,
   `avocats-image-glow` (avocats.css) · `rounded-lg` → `rounded-[0.6rem]`
   (le `--radius` de la source).

   MONDE BLANC — ce qui a demandé plus qu'un échange de jetons :
   · Orbites : les points et les six signes étaient du BLANC à 50-90 % sur
     le noir ; ils deviennent l'ENCRE à la même opacité (le sens : des
     marques qui contrastent avec le fond). Les signes sont le logo
     officiel (marque.tsx).
   · Badge « NOUVEAU » : son liseré était une ombre intérieure grise à 15 %
     (le filet de la source) → #e6e6e6, le filet de la page. L'étincelle
     qui fait le tour était BLANCHE — invisible sur le blanc ; elle passe au
     bleu de la marque (#3b82f6), qui est déjà celui de la pastille. Le fond
     s'éclaircissait au survol (`neutral-800` sur le noir) : il fonce
     (#f5f5f5). Texte `neutral-100` → encre.
   · Lueurs : sky-500 → blue-600 derrière le cadre, blue-600 au-dessus, et
     blue-500 sur téléphone. Sur le noir, ce sont des lueurs ; posées
     telles quelles sur le blanc, des taches. Même dessin, même flou, même
     animation, teintes claires de la même famille (sky-300 → blue-400,
     blue-400, blue-300) : la page s'éclaire de bleu au lieu de s'y noyer.
   · Le bouton « Soumettre un dossier » était blanc sur noir ; il est encre
     sur blanc (variante `default`, bouton.tsx).

   LIENS (règle 6) : « Soumettre un dossier » visait https://omegaai.fr/
   reserver → /reserver-un-audit (textes.ts), en <Link> : un <a> interne
   rechargerait tout le site. Le badge garde son ancre #fonctionnalites.
   ACCESSIBILITÉ : la source posait un <button> DANS un <a> (deux
   éléments interactifs imbriqués) ; ici `Button asChild` fait du lien le
   bouton, mêmes classes, même géométrie.
   `spark` et `mask-gradient` n'étaient définies nulle part dans la source :
   classes mortes, retirées. `before:animate-rotate` ne pouvait pas passer
   en `before:avocats-rotate` (ce n'est pas un utilitaire) : l'animation du
   pseudo-élément est écrite dans avocats.css (`.avocats-etincelle`).
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AnimationContainer from "./apparition";
import { OrbitingCircles } from "./orbites";
import { Button } from "./bouton";
import { Glyphe } from "./marque";
import ApercuDossier from "./ApercuDossier";
import { CONTACT, HERO } from "./textes";

const Point = ({ c }: { c: string }) => (
  <svg className={`size-1 ${c}`} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="10" fill="currentColor" />
  </svg>
);

/* Héros de la référence : trois orbites derrière le titre, badge à étincelle, h1 72/90 gras, bouton, puis le
   cadre de l'écran produit (rounded-[32px], deux lueurs bleues). */
export default function Hero() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full py-20">
      <div className="absolute flex lg:hidden size-40 rounded-full bg-blue-300 blur-[10rem] top-0 left-1/2 -translate-x-1/2 -z-10" />
      {/* w-full sur ces deux colonnes : dans la référence, c'est l'<img> 1920 px de l'écran produit qui les élargit
          jusqu'au cadre max-w-6xl ; notre écran est dessiné, sans largeur propre, d'où la largeur posée ici. */}
      <div className="flex flex-col items-center justify-center gap-y-8 relative w-full">
        <AnimationContainer className="hidden lg:flex absolute inset-0 top-0 mb-auto flex-col items-center justify-center w-full min-h-screen -z-10">
          <OrbitingCircles duration={40} radius={300}>
            <Glyphe className="size-4 text-[#171717]/70" />
            <Point c="text-[#171717]/80" />
          </OrbitingCircles>
          <OrbitingCircles duration={80} radius={400}>
            <Point c="text-[#171717]/50" />
            <Glyphe className="size-4 text-[#171717]/60" />
            <Point c="text-[#171717]/90" />
          </OrbitingCircles>
          <OrbitingCircles duration={200} radius={500}>
            <Point c="text-[#171717]/50" />
            <Point c="text-[#171717]/90" />
            <Glyphe className="size-4 text-[#171717]/60" />
            <Point c="text-[#171717]/90" />
          </OrbitingCircles>
        </AnimationContainer>

        <div className="flex flex-col items-center justify-center text-center gap-y-4 w-full">
          <AnimationContainer className="relative hidden lg:block overflow-hidden" delay={0.1}>
            <Link
              href="#fonctionnalites"
              className="group relative grid overflow-hidden rounded-full px-2 py-1 shadow-[0_1000px_0_0_#e6e6e6_inset] transition-colors duration-200 mx-auto w-fit"
            >
              <span>
                <span className="avocats-etincelle absolute inset-0 h-[100%] w-[100%] avocats-flip overflow-hidden rounded-full [mask:linear-gradient(white,_transparent_50%)] before:absolute before:aspect-square before:w-[200%] before:rotate-[-90deg] before:bg-[conic-gradient(from_0deg,transparent_0_340deg,#3b82f6_360deg)] before:content-[''] before:[inset:0_auto_auto_50%] before:[translate:-50%_-15%]" />
              </span>
              <span className="absolute inset-[1px] rounded-full bg-[#ffffff] transition-colors duration-200 group-hover:bg-[#f5f5f5]" />
              <span className="z-10 py-0.5 text-sm text-[#171717] flex items-center">
                <span className="px-2 py-[0.5px] h-[18px] tracking-wide flex items-center justify-center rounded-full bg-linear-to-r from-sky-400 to-blue-600 text-[9px] font-medium mr-2 text-white">
                  {HERO.badge}
                </span>
                {HERO.annonce}
              </span>
            </Link>
          </AnimationContainer>

          <AnimationContainer delay={0.15}>
            <h1 className="text-4xl md:text-4xl lg:text-7xl font-bold text-center leading-tight! max-w-4xl mx-auto">
              {HERO.titreAvant} <span>{HERO.titreMot}</span> {HERO.titreApres}
            </h1>
          </AnimationContainer>

          <AnimationContainer delay={0.2}>
            <p className="max-w-xl mx-auto mt-2 text-base lg:text-lg text-center text-[#737373]">{HERO.texte}</p>
          </AnimationContainer>

          <AnimationContainer delay={0.25} className="z-20">
            <div className="flex items-center justify-center mt-6 gap-x-4">
              <Button asChild size="lg" className="group">
                <Link href={CONTACT.audit}>
                  {HERO.bouton}
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-all duration-300" />
                </Link>
              </Button>
            </div>
          </AnimationContainer>

          <AnimationContainer delay={0.3} className="relative">
            <div className="relative rounded-xl lg:rounded-[32px] border border-[#e6e6e6] p-2 backdrop-blur-lg mt-10 max-w-6xl mx-auto">
              <div className="absolute top-1/8 left-1/2 -z-10 bg-linear-to-r from-sky-300 to-blue-400 w-1/2 lg:w-3/4 -translate-x-1/2 h-1/4 -translate-y-1/2 inset-0 blur-[4rem] lg:blur-[10rem] avocats-image-glow" />
              <div className="hidden lg:block absolute -top-1/8 left-1/2 -z-20 bg-blue-400 w-1/4 -translate-x-1/2 h-1/4 -translate-y-1/2 inset-0 blur-[10rem] avocats-image-glow" />
              <div className="rounded-[0.6rem] lg:rounded-[22px] border border-[#e6e6e6] bg-[#ffffff]">
                <ApercuDossier />
              </div>
            </div>
            <div className="bg-linear-to-t from-[#ffffff] to-transparent absolute bottom-0 inset-x-0 w-full h-1/2" />
          </AnimationContainer>
        </div>
      </div>
    </div>
  );
}
