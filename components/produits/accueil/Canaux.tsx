import { Apparition } from "./Apparition";
import { Bouton, Etiquette } from "./Bouton";
import { ICONES } from "./Icones";
import { CANAUX } from "@/lib/produits/accueil";

/* La référence fait flotter six logos d'éditeurs autour du texte (Github,
   Drive, Notion, Zapier, Stripe, Slack). Deux règles s'appliquent : on ne
   réutilise pas la marque d'un tiers, et un bandeau d'outils nomme ceux DU
   CLIENT. Dessin au trait et nom en toutes lettres.

   06/10/2026 (C5) — les tuiles flottantes en absolu (quatre places, deux
   filets, paliers `xl:` relevés au pixel, voir l'historique git) sont
   retirées avec les canaux non branchés : il en reste trois, rangés sous le
   texte à toutes les largeurs. */

export function Canaux() {
  return (
    <section data-monde="clair" id="canaux" className="scroll-mt-24 bg-white rounded-xl px-3 py-12 max-sm:py-14 lg:py-25 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <Apparition className="lg:max-w-xl xl:max-w-xl mx-auto text-center relative z-10">
          <Etiquette centre>{CANAUX.etiquette}</Etiquette>
          <h2 className="mt-4 text-3xl max-sm:text-[26px] max-sm:leading-[30px] -tracking-[2px] max-sm:-tracking-[1px] sm:text-4xl lg:text-5xl font-medium text-neutral-900 lg:leading-14 mb-4">
            {CANAUX.titre}
          </h2>
          <p className="text-lg max-sm:text-[15px] max-sm:leading-[1.55] text-neutral-500 mb-8 lg:mb-11 font-normal mx-auto max-w-lg">{CANAUX.chapo}</p>
          <div className="flex justify-center">
            <Bouton href={CANAUX.bouton.href}>{CANAUX.bouton.libelle}</Bouton>
          </div>
        </Apparition>

        {/* 06/10/2026 (C5) — trois canaux réels au lieu de quatre tuiles
            dont deux n'étaient pas branchées : la constellation à quatre
            places et ses deux filets ne tenaient plus debout avec trois. La
            rangée qui servait sous xl sert donc à toutes les largeurs. */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {CANAUX.tuiles.map((t) => {
            const Icone = ICONES[t.icone as keyof typeof ICONES];
            return (
              <div key={t.nom} className="inline-flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 a-ombre-integration">
                <Icone className="size-6 text-neutral-900" />
                <span className="text-sm font-medium text-neutral-900">{t.nom}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
