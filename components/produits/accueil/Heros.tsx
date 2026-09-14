import { Apparition } from "./Apparition";
import { Bouton, Etiquette } from "./Bouton";
import { Ornement } from "./Ornement";
import { HERO, MARQUE } from "@/lib/produits/accueil";

/* RAPATRIEMENT 11/09/2026 — la signature Ω qui se trouvait sous les deux
   boutons est partie avec l'entête du site source (règle 6 : le site EST
   Omega, il n'a pas à se signer lui-même). À sa place, et exactement à sa
   place, le nom du PRODUIT : le site source le portait dans sa barre, or
   cette barre est remplacée par celle d'omegaai.fr, qui ne dit rien du
   produit qu'on est en train de lire. Sans ce trait, la page ne se nomme
   plus qu'en clôture.

   Le signe est `/logos/frontd-mark.png`, déjà dans public/logos : c'est un
   MASQUE ALPHA (encre dans le canal alpha, pixels blancs). Un `<img>` n'en
   affiche rien — il se pose en `mask-image` et c'est `background` qui donne
   l'encre, d'où la classe `.a-marque` du fichier de portée. */
export function Heros() {
  return (
    <section
      id="haut"
      data-monde="clair"
      className="a-fond-heros pt-30 max-sm:pt-26 lg:pt-40 lg:pb-75 pb-16 sm:pb-20 relative overflow-hidden rounded-xl"
    >
      <div className="max-w-7xl mx-auto px-4 xl:px-0">
        <div className="flex flex-col lg:flex-row">
          <Apparition className="max-w-xl relative z-30">
            <Etiquette>{HERO.etiquette}</Etiquette>
            <h1 className="mt-4 text-4xl max-sm:text-[30px] max-sm:leading-[34px] max-sm:-tracking-[0.5px] lg:text-5xl xl:text-6xl font-medium text-neutral-900 xl:leading-none mb-4">
              {HERO.titre}
            </h1>
            <p className="text-base max-sm:text-[15px] max-sm:leading-[1.55] sm:text-lg text-neutral-500 mb-8 max-sm:mb-6 lg:mb-20 font-normal max-w-lg">
              {HERO.chapo}
            </p>
            <div className="flex flex-wrap gap-4">
              <Bouton href={HERO.principal.href}>{HERO.principal.libelle}</Bouton>
              <Bouton href={HERO.secondaire.href} variante="secondaire">
                {HERO.secondaire.libelle}
              </Bouton>
            </div>
            <p className="mt-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
              <span className="a-marque size-4" aria-hidden="true" />
              {MARQUE.nom}
            </p>
          </Apparition>

          {/* UN SEUL exemplaire de la pièce de verre, repositionné par CSS.
              Deux exemplaires sur la même page se partagent les identifiants
              de ses dégradés : les `url(#…)` du second pointent dans le
              premier, et si celui-là est en `display:none` les dégradés ne
              peignent plus — les couleurs pleines, elles, continuent. La
              pièce se retrouve lavée sans qu'aucune erreur n'apparaisse.

              Sous lg, la référence n'affiche rien du tout et son héros mobile
              reste vide ; ici la pièce passe dans le flux, sous l'accroche. */}
          <div className="mt-10 flex justify-center lg:absolute lg:top-0 lg:right-0 lg:mt-0 lg:block lg:h-full lg:translate-x-45 xl:translate-x-0">
            <Ornement className="w-[76%] max-w-[300px] h-auto lg:h-[80%] lg:w-auto lg:max-w-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
