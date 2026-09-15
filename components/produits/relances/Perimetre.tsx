/* ══════════════════════════════════════════════════════════════════════
   CASHD — les trois blocs de capacités, dans l'habillage de la page
   (14/09/2026)

   Les blocs eux-mêmes sont partagés par les quatre pages produit
   (`components/produits/capacites/Capacites.tsx`) et ne portent aucune
   enveloppe : chaque page produit a la sienne. Ici, celle de CASHD —
   `py-20 md:py-28` et un conteneur `max-w-7xl`, exactement comme ses
   voisines `France` et `Questions`.

   Ils remplacent la bande `Chiffres`, qui tenait la troisième place de la
   page. Ils sont posés APRÈS `Ecrans` : le lecteur a vu ce que le système
   fait et à quoi ressemble son espace, il est alors prêt à lire l'étendue.
   ══════════════════════════════════════════════════════════════════════ */

import {
  CasLimites,
  EchelleGroupe,
  GrilleCapacites,
} from "@/components/produits/capacites/Capacites";
import {
  CAS_LIMITES,
  CATALOGUE,
  ECHELLE,
} from "@/lib/produits/capacites/relances";

const CADRE = "mx-auto max-w-7xl px-6 lg:px-8";

export default function Perimetre() {
  return (
    <>
      <section id="perimetre" data-monde="clair" className="scroll-mt-24 py-20 md:py-28">
        <div className={CADRE}>
          <GrilleCapacites donnees={CATALOGUE} />
        </div>
      </section>

      <section id="cas-limites" data-monde="clair" className="scroll-mt-24 py-20 md:py-28">
        <div className={CADRE}>
          <CasLimites donnees={CAS_LIMITES} />
        </div>
      </section>

      <section id="echelle" data-monde="clair" className="scroll-mt-24 py-20 md:py-28">
        <div className={CADRE}>
          <EchelleGroupe donnees={ECHELLE} />
        </div>
      </section>
    </>
  );
}
