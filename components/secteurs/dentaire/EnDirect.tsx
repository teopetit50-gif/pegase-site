/* ══════════════════════════════════════════════════════════════════════
   « Votre cabinet, lu en une page. » — la section qui suit le héros : les
   quatre écrans de Tiroma en onglets empilés (OngletsEmpiles.tsx), sur
   un halo vert d'eau. Balisage et classes de la source, `dark:` retirés.
   ══════════════════════════════════════════════════════════════════════ */
import Apparition from "./Apparition";
import OngletsEmpiles, { FenetreEcran } from "./OngletsEmpiles";
import { Surtitre } from "./Surtitre";
import { ONGLETS_ECRANS } from "./textes";

export default function EnDirect() {
  return (
    <section data-monde="clair" className="overflow-hidden bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <Apparition className="mb-12 max-w-3xl lg:mb-16">
          <Surtitre>En direct</Surtitre>
          <h2 className="mb-6 text-3xl text-slate-900 lg:text-5xl">Votre cabinet tient sur une seule page</h2>
          <p className="text-lg text-slate-600">Les créneaux, les plans et les fauteuils qui comptent ce matin sont réunis au même endroit.</p>
        </Apparition>
        <Apparition delay={200}>
          <div className="relative mx-auto max-w-6xl [perspective:1000px]">
            <div className="pointer-events-none absolute -inset-x-10 -inset-y-6 bg-gradient-to-b from-[#4f9587]/10 via-[#4f9587]/5 to-transparent blur-3xl" />
            <div className="relative h-[260px] sm:h-[380px] lg:h-[640px]">
              <OngletsEmpiles
                classeConteneur="justify-center gap-2 mb-6 relative z-20"
                classeOnglet="text-sm font-medium text-slate-500"
                classeActif="bg-[#e3f0ed]"
                classeContenu="mt-0"
                onglets={ONGLETS_ECRANS.map((o) => ({
                  titre: o.titre,
                  valeur: o.valeur,
                  contenu: <FenetreEcran src={o.src} legende={o.legende} />,
                }))}
              />
            </div>
          </div>
        </Apparition>
      </div>
    </section>
  );
}
