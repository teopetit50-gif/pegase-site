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

   24/09 (SOIR) — LE HÉROS D'UN CABINET (avocats.css, « registre d'un
   cabinet ») :
   · Orbites, étincelle du badge, taches bleues et fondu blanc du bas :
     RETIRÉS. Le badge devient une étiquette filetée sur fond blanc, sa
     pastille « NOUVEAU » passe au vert de Tamila (#193a29).
   · Le h1 passe en serif 400 (avocats.css), interligne 1,08 au lieu de
     1,25 : une serif de titrage se compose serrée.
   · L'écran produit n'est plus posé sur des lueurs mais sur une photo de
     la façade du Palais de justice de Paris (Slavan, Unsplash, crédits
     dans public/photos/CREDITS.txt). Première version : l'écran DANS la
     photo, collé au bas, comme chez Harvey — mais le dôme et la grille
     sont au centre de la photo et l'écran les cachait tous deux : on ne
     voyait qu'un ciel. D'où ce montage : un bandeau photo 11/5 cadré par
     35 % du haut, et l'écran qui le chevauche à partir de 16 % de la
     largeur (une marge en % se calcule sur la LARGEUR : le chevauchement
     suit le bandeau à toutes les tailles). Le dôme, de 8 à 23 % de la
     largeur depuis le haut du bandeau, reste entier au-dessus de l'écran
     (qui commence à 29 %) ; à 10 %, on ne voyait que le ciel et la
     lanterne.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AnimationContainer from "./apparition";
import { Button } from "./bouton";
import ApercuDossier from "./ApercuDossier";
import { CONTACT, HERO } from "./textes";

/* Héros : badge, h1 serif, texte, bouton, puis l'écran produit dans la photo du Palais. */
export default function Hero() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full py-20">
      <div className="flex flex-col items-center justify-center gap-y-8 relative w-full">
        <div className="flex flex-col items-center justify-center text-center gap-y-4 w-full">
          <AnimationContainer className="relative hidden lg:block" delay={0.1}>
            <Link
              href="#fonctionnalites"
              className="group mx-auto flex w-fit items-center rounded-full border border-[#e6e6e6] bg-[#ffffff] px-2 py-1 text-sm text-[#171717] transition-colors duration-200 hover:border-[#193a29]/30"
            >
              <span className="mr-2 flex h-[18px] items-center justify-center rounded-full bg-[#193a29] px-2 text-[9px] font-medium tracking-wide text-white">
                {HERO.badge}
              </span>
              {HERO.annonce}
            </Link>
          </AnimationContainer>

          <AnimationContainer delay={0.15}>
            <h1 className="text-[2.5rem] md:text-5xl lg:text-7xl text-center leading-[1.08]! max-w-4xl mx-auto">
              {HERO.titreAvant} <span className="avocats-accent">{HERO.titreMot}</span> {HERO.titreApres}
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

          <AnimationContainer delay={0.3} className="relative mt-10 max-w-6xl mx-auto">
            <figure>
              <div className="relative aspect-[11/5] overflow-hidden rounded-xl lg:rounded-[28px] bg-[#d8cfc0]">
                <Image
                  src="/photos/avocats-palais-facade.jpg"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1280px) 1152px, 100vw"
                  className="object-cover object-[50%_35%]"
                />
              </div>
              <div className="relative -mt-[16%] mx-3 sm:mx-8 lg:mx-16 overflow-hidden rounded-[0.6rem] lg:rounded-[18px] border border-black/10 bg-[#ffffff] shadow-[0_24px_60px_-20px_rgba(30,22,10,0.35)]">
                <ApercuDossier />
              </div>
              <figcaption className="mt-3 text-left text-xs text-[#737373]">
                {HERO.legende}
              </figcaption>
            </figure>
          </AnimationContainer>
        </div>
      </div>
    </div>
  );
}
