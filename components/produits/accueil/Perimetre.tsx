/* ══════════════════════════════════════════════════════════════════════
   FRONTD — les trois blocs de capacités, dans l'habillage de la page
   (14/09/2026)

   La page FRONTD empile des cartes blanches arrondies sur un fond gris
   clair, séparées par une gouttière de 12 px. Les trois blocs prennent la
   même forme, sans quoi ils se liraient comme un corps étranger posé au
   milieu de la pile.

   Ils remplacent les trois cartes de `CAPACITES` (réception,
   qualification, avis) : elles disaient la promesse, pas l'étendue.
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
} from "@/lib/produits/capacites/accueil";

const CARTE =
  "scroll-mt-24 bg-white rounded-xl px-3 py-12 max-sm:py-14 lg:py-25";
const DEDANS = "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8";

export default function Perimetre() {
  return (
    <>
      <section id="perimetre" data-monde="clair" className={CARTE}>
        <div className={DEDANS}>
          <GrilleCapacites donnees={CATALOGUE} />
        </div>
      </section>

      <section id="cas-limites" data-monde="clair" className={CARTE}>
        <div className={DEDANS}>
          <CasLimites donnees={CAS_LIMITES} />
        </div>
      </section>

      <section id="echelle" data-monde="clair" className={CARTE}>
        <div className={DEDANS}>
          <EchelleGroupe donnees={ECHELLE} />
        </div>
      </section>
    </>
  );
}
