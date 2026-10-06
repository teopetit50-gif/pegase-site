import { Apparition } from "./Apparition";
import { Bouton, Etiquette } from "./Bouton";
import { ICONES } from "./Icones";
import { CANAUX } from "@/lib/produits/accueil";

/* La référence fait flotter six logos d'éditeurs autour du texte (Github,
   Drive, Notion, Zapier, Stripe, Slack). Deux règles s'appliquent : on ne
   réutilise pas la marque d'un tiers, et un bandeau d'outils nomme ceux DU
   CLIENT. Quatre tuiles donc, aux quatre positions extérieures, dessin au
   trait et nom en toutes lettres. */
/* Écart assumé sur les emplacements `2xl:`. La référence les pose à
   left-50 / left-155 (200 px / 620 px) : entre 1536 et ~1620 px, ses tuiles
   passent alors SOUS son propre titre et SOUS son bouton — constaté sur elle,
   capture à 1536 px, ce n'est pas un défaut que nous aurions introduit. On
   gardait donc les tuiles plus au large (120 px / 480 px), ce qui tenait de
   1280 à 1920 px sans rien recouvrir. Les emplacements `xl:` sont ceux de la
   référence, au pixel. */
/* ── RAPATRIEMENT 11/09/2026 : le palier `2xl:` TOMBE ─────────────────
   Ces quatre tuiles sont posées en absolu par rapport à la `<section>`,
   donc leur écart au bord dépend de la largeur de la section. Sur le site
   source la section suivait la fenêtre : 1512 px à 1536, 1896 px à 1920 —
   d'où un second palier, plus au large, à partir de 1536.

   Ici la page est dans `PageShell`, dont le `<main>` est plafonné à
   1440 px. Passé 1440, la section ne grandit PLUS : elle vaut 1414 px à
   1536 comme à 1920. Le palier `2xl:` poussait donc les tuiles de 80 px
   VERS L'INTÉRIEUR d'un cadre qui n'a pas grandi — droit sur le bloc de
   texte centré (576 px de large, soit 419 px de marge de chaque côté).

   Les valeurs `xl:` sont conservées seules : elles ont été relevées sur
   une section de 1256 à 1414 px, exactement la plage qui vaut désormais
   de 1280 jusqu'à l'infini. Le rendu au-delà de 1440 est donc celui de
   1440, qui est recetté. */
const POSITIONS = [
  "xl:left-10 top-39",
  "xl:right-10 top-39",
  "xl:left-100 top-82",
  "xl:right-100 top-82",
];

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

        {/* Les deux filets de la référence, relevés sur ses SVG décoratifs :
            494×190, `left-10 2xl:left-70 top-50`, tracé #F1F1F1 — un coude
            qui relie les tuiles extérieures au centre. Même géométrie,
            chemin réécrit. Leur palier `2xl:` tombe pour la même raison que
            celui des tuiles : ils doivent rester accrochés aux tuiles
            qu'ils relient, et la section ne grandit plus après 1440. */}
        <svg
          className="absolute left-10 top-50 hidden xl:block pointer-events-none"
          width="494"
          height="190"
          viewBox="0 0 494 190"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M494 189.5H427c-21 0-41-10-55-26L263 27C250 10 230 .5 209 .5H0"
            stroke="#F1F1F1"
          />
        </svg>
        <svg
          className="absolute xl:right-10 top-50 hidden xl:block pointer-events-none"
          width="494"
          height="190"
          viewBox="0 0 494 190"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 189.5h67c21 0 41-10 55-26L231 27C244 10 264 .5 285 .5h209"
            stroke="#F1F1F1"
          />
        </svg>

        {CANAUX.tuiles.map((t, i) => {
          const Icone = ICONES[t.icone as keyof typeof ICONES];
          return (
            <div
              key={t.nom}
              className={`absolute ${POSITIONS[i]} hidden xl:inline-flex gap-3 items-center z-10 flex-col`}
            >
              <div className="border size-20 inline-flex a-ombre-integration items-center justify-center border-black/10 bg-white rounded-xl text-neutral-900">
                <Icone className="size-7" />
              </div>
              <span className="border inline-flex items-center justify-center h-7 rounded-full px-3 py-1 font-medium text-neutral-900 border-black/10 bg-white text-sm whitespace-nowrap">
                {t.court}
              </span>
            </div>
          );
        })}

        {/* Sous xl, les tuiles flottantes n'ont pas la place : elles se
            rangent en ligne sous le texte plutôt que de se chevaucher. */}
        <div className="xl:hidden mt-10 flex flex-wrap justify-center gap-4">
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
