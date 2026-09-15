/* ══════════════════════════════════════════════════════════════════════
   RELOAD — les trois blocs de capacités, dans l'habillage de la page
   (14/09/2026)

   L'habillage de RELOAD n'est pas une section à marges verticales mais un
   `Cadre` à filets : les sections y sont des boîtes bordées, avec un
   rembourrage `px-6 md:px-16` et des séparateurs entre elles. Les trois
   blocs le reprennent pour ne pas trancher avec `Fonctionnalites` et
   `Metiers`, qui les encadrent.

   Ils remplacent les quatre tuiles de `Chiffres` (« 7 h 30 », « 60 / 100 »,
   « 1 seul », « Arrêt »). Le graphique du même composant reste en place.
   ══════════════════════════════════════════════════════════════════════ */

import {
  CasLimites,
  EchelleGroupe,
  GrilleCapacites,
} from "@/components/produits/capacites/Capacites";
import { Cadre, Separateur } from "@/components/produits/reprise/Cadre";
import {
  CAS_LIMITES,
  CATALOGUE,
  ECHELLE,
} from "@/lib/produits/capacites/reprise";

const BOITE = "px-6 py-12 md:px-16 md:py-16";

export default function Perimetre() {
  return (
    <>
      <section id="perimetre" data-monde="clair" className="scroll-mt-20">
        <Cadre className="relative w-full">
          <div className={BOITE}>
            <GrilleCapacites donnees={CATALOGUE} />
          </div>
        </Cadre>
      </section>

      <Separateur />

      <section id="cas-limites" data-monde="clair" className="scroll-mt-20">
        <Cadre className="relative w-full">
          <div className={BOITE}>
            <CasLimites donnees={CAS_LIMITES} />
          </div>
        </Cadre>
      </section>

      <Separateur />

      <section id="echelle" data-monde="clair" className="scroll-mt-20">
        <Cadre className="relative w-full">
          <div className={BOITE}>
            <EchelleGroupe donnees={ECHELLE} />
          </div>
        </Cadre>
      </section>
    </>
  );
}
