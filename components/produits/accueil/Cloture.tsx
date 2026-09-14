import { Bouton, Etiquette } from "./Bouton";
import { CLOTURE } from "@/lib/produits/accueil";

/* ══════════════════════════════════════════════════════════════════════
   La clôture — ex-`components/Pied.tsx` du site source.

   RAPATRIEMENT 11/09/2026. Le fichier d'origine tenait DEUX choses dans un
   seul `<footer>` :

     1. l'appel à l'action de fin — la carte claire sur son lavis, encadrée
        de noir à 22 px de rayon (la ligne « pied 22 » du relevé) ;
     2. le pied de page proprement dit — nom de marque, signature Ω, deux
        adresses, trois colonnes de liens, la ligne de copyright.

   Le (2) est le doublon exact de `components/Footer.tsx`, que `PageShell`
   pose déjà sous chaque page : il part entier, règle 6, signature Ω
   comprise. Le (1) est du CONTENU de page — c'est la dernière chose que
   lit un visiteur convaincu — et il reste, au pixel.

   Le cadre noir reste lui aussi : ce n'est pas le pied, c'est la GÉOMÉTRIE
   de la clôture (`p-3` + `rounded-[22px]`, relevé sur la référence). Sans
   lui la carte claire finirait sur un bord net contre le fond gris.

   Conséquence pour l'entête caméléon : pas de `data-monde="clair"` ici. La
   sonde du header prélève la couleur à 4 px du bord gauche, et à cet
   endroit c'est le cadre NOIR qui se trouve, pas le lavis. Annoncer
   « clair » mentirait sur ce qui est réellement sous la barre.
   ══════════════════════════════════════════════════════════════════════ */
export function Cloture() {
  return (
    <section className="bg-black p-3 rounded-[22px] mt-3">
      <div className="a-fond-cloture py-16 relative overflow-hidden rounded-xl">
        <div className="max-w-3xl text-center flex-col items-center flex mx-auto px-4">
          <Etiquette centre>{CLOTURE.etiquette}</Etiquette>
          <h2 className="mt-4 text-3xl max-sm:text-[28px] max-sm:leading-[32px] sm:text-4xl lg:text-5xl xl:text-6xl font-medium text-neutral-900 xl:leading-none mb-11 max-sm:mb-8">
            {CLOTURE.titre}
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Bouton href={CLOTURE.principal.href}>{CLOTURE.principal.libelle}</Bouton>
            <Bouton href={CLOTURE.secondaire.href} variante="secondaire">
              {CLOTURE.secondaire.libelle}
            </Bouton>
          </div>
        </div>
      </div>
    </section>
  );
}
