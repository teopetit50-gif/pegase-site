import { Apparition } from "./Apparition";
import { Bouton, Etiquette } from "./Bouton";
import { PanneauConversation } from "./Panneaux";
import { APPORT } from "@/lib/produits/accueil";

export function Apport() {
  return (
    <section data-monde="clair" id="apport" className="scroll-mt-24 bg-white rounded-xl px-3 py-12 max-sm:py-14 lg:py-25">
      <div className="max-w-7xl mx-auto">
        <div className="flex-col flex lg:flex-row justify-between gap-10 sm:gap-14 lg:gap-16 xl:gap-23.5">
          <Apparition className="lg:w-1/2 flex flex-col justify-between gap-10 lg:gap-0">
            <div>
              <Etiquette>{APPORT.etiquette}</Etiquette>
              <h2 className="mt-4 text-3xl max-sm:text-[26px] max-sm:leading-[30px] -tracking-[2px] max-sm:-tracking-[1px] sm:text-4xl lg:text-5xl font-medium text-neutral-900 lg:leading-14 mb-4">
                {APPORT.titre}
              </h2>
              <p className="text-lg max-sm:text-[15px] max-sm:leading-[1.55] text-neutral-500 mb-8 max-sm:mb-6 sm:mb-11 font-normal max-w-lg">{APPORT.chapo}</p>
              <Bouton href={APPORT.bouton.href}>{APPORT.bouton.libelle}</Bouton>
            </div>

            {/* Les deux compteurs de la référence sont de la traction
                commerciale. Ici, deux faits de conception. */}
            <div className="flex flex-col sm:flex-row gap-8">
              {APPORT.faits.map((f) => (
                <div key={f.chiffre}>
                  <h3 className="text-neutral-900 text-[52px] leading-[78px] max-sm:text-[34px] max-sm:leading-[42px] mb-4 max-sm:mb-2">
                    <span>{f.chiffre}</span>
                  </h3>
                  <p className="text-neutral-500 text-base max-sm:text-[15px] font-normal">{f.texte}</p>
                </div>
              ))}
            </div>
          </Apparition>

          <Apparition className="lg:w-1/2" delai={120}>
            <PanneauConversation />
          </Apparition>
        </div>
      </div>
    </section>
  );
}
