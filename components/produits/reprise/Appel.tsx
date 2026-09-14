import { ArrowUpRight } from "lucide-react";
import { APPEL } from "@/lib/produits/reprise";
import { Cadre } from "./Cadre";
import { Bouton } from "./Bouton";

/* Lueur d'angle du bloc final. */
const LUEUR = {
  background:
    "radial-gradient(ellipse at center, rgba(37, 99, 235, 0.5) 0%, rgba(37, 99, 235, 0.15) 45%, transparent 75%)",
};

/* Le masque va sur le CONTENEUR, pas sur la lueur — et c'est tout le piège.
 *
 * La lueur mesure 400 px et porte `translate-y-1/2` : sa moitié basse est
 * déjà hors de la section. Un masque posé sur elle s'éteint donc à un
 * pourcentage de SA hauteur, c'est-à-dire dans la partie qu'on ne voit
 * jamais — la portion visible reste pleinement opaque et `overflow-hidden`
 * la tranche net. On voyait un trait bleu horizontal juste avant le pied.
 *
 * Le conteneur, lui, épouse exactement la section : un dégradé qui s'y
 * éteint à 100 % s'éteint au bord réel, quelle que soit la géométrie de la
 * lueur. Le raccord avec le pied redevient continu.
 *
 * 11/09 — le pied qui suit n'est plus le pied clair du site source mais le
 * pied SOMBRE du site (PageShell). La section se termine donc sur un aplat
 * #f5f5f5 net, exactement comme les autres mondes clairs du site : c'est la
 * même coupe franche que `.fondu-clair` de globals.css, pas un raté. */
const FONDU_BAS = {
  maskImage: "linear-gradient(to bottom, white 0%, white 45%, transparent 96%)",
  WebkitMaskImage: "linear-gradient(to bottom, white 0%, white 45%, transparent 96%)",
};

export function Appel() {
  return (
    <section data-monde="clair">
      <Cadre className="relative overflow-hidden">
        <div className="relative z-10 mx-6 overflow-hidden border-[#d9d9d9] border-r border-l md:mx-16">
          <div className="grid gap-8 px-6 py-20 sm:grid-cols-2 md:py-28 lg:py-32">
            <h2 className="max-w-xl font-medium text-[#0a0a0a] text-xl sm:text-2xl md:text-3xl lg:text-4xl">
              {APPEL.titre}
            </h2>
            <div className="flex w-full items-center">
              <div className="max-w-xl space-y-4">
                <p className="text-[#737373] text-sm md:text-base">{APPEL.texte}</p>
                <div className="flex flex-row gap-3">
                  <Bouton href={APPEL.bouton.lien}>
                    {APPEL.bouton.texte}
                    <ArrowUpRight className="size-4 transition-transform group-hover:-rotate-12" />
                  </Bouton>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-0 h-full w-full rp-fondu"
          style={FONDU_BAS}
        >
          <div
            className="pointer-events-none absolute right-0 bottom-0 h-[400px] w-[450px] translate-x-1/2 translate-y-1/2 select-none sm:h-[500px] sm:w-[550px] md:h-[600px] md:w-[650px] lg:h-[700px] lg:w-[750px]"
            style={LUEUR}
          />
        </div>
      </Cadre>
    </section>
  );
}
