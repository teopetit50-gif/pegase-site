/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Produit.tsx, section « 01 — Le produit »

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   sections/03-product.tsx`. Côté source ce fichier est GÉNÉRÉ par
   `outils/assembler.py` ; ici il ne l'est plus : c'est une copie du
   résultat, corrigée à la main. Ce qui change :

   · COULEURS (monde blanc) — la source tournait en SOMBRE (classe `dark`
     sur <html>). Ses `dark:` (6) sont retirés : ce qui reste est le thème
     CLAIR de la référence Parlo, écrit par son auteur. Jetons convertis par
     outils/rapatrier-secteur.py sur ce thème clair : bg-background,
     bg-card → #ffffff · text-foreground (et ses /20…/80) → #0a0a0a ·
     text-muted-foreground → #737373 · from/via/to-background → #ffffff.
   · Les canevas de pixels des quatre cellules s'allumaient en BLANC au
     survol (#ffffff, #FFFFFFCC, #FFFFFF99, #A3A3A3) : sur le blanc, rien.
     Ils prennent la palette CLAIRE que la référence donne à ceux du héros
     (#404040, #525252CC, #73737399, #A3A3A3) : le survol se voit, en encre.
   · Le bouton « Réserver un audit » était une copie FIGÉE du bouton étoilé
     (un <button> sans destination, rendu serveur de la référence) : il
     devient `BoutonEtoile` vers /reserver-un-audit. La copie portait aussi
     un `clipPath id="clip0_408_119"` en dur, répété dans Formules.tsx :
     deux fois le même identifiant dans la page (voir marque.tsx).
   · `rounded-lg` / `rounded-xl` → 10 / 14 px : la source dérivait ses
     rayons de `--radius: .625rem`, ce site garde ceux de Tailwind.
   · PAGE PLEINE (Teo, 24/09) : le cadre de la source (`mx-[30px] border-x`)
     disparaît, ses 30 px de marge restent, section par section, autour du
     contenu. Les deux filets horizontaux des quatre cellules courent sur
     toute la largeur de la fenêtre ; les cellules restent dans la marge.
   · REPORT du 24/09, 17 h 00 (seconde copie de la source) : une autre
     session a ajouté des fonctions au site source entre 16 h 00 et 16 h 32
     (Teo : « ajoute tout sur les sites »). Ici : trois pièces de plus dans
     le second bandeau qui défile derrière le menu (attestations
     d'assurance, ordres de service, réserves de réception), dans ses deux
     copies. Mêmes conversions que le reste.
   ══════════════════════════════════════════════════════════════════════ */
import React from "react";
import Image from "next/image";
import PixelCanvas from "./pixels";
import StarButton from "./bouton-etoile";
import { CONTACT } from "./textes";

/* Palette claire des pixels (voir l'en-tête). */
const PIXELS_CLAIRS = ["#404040", "#525252CC", "#73737399", "#A3A3A3"];

export default function Produit() {
  return (
    <>
      <div id="product" className="scroll-mt-24">
        <section className="pt-20 pb-0 bg-[#ffffff] font-sans">
          <div className="mx-[30px]">
            <div className="mx-auto w-full max-w-7xl px-6">
              <div className="grid items-center gap-6 pb-14 md:grid-cols-2">
                <div
                  className="relative flex items-center justify-center py-6"
                  data-reveal="1"
                  style={{ "--reveal-y": "16px" } as React.CSSProperties}
                >
                  {/* 11/11/2026 — Teo : « quand tu montres un exemple, montre des captures du dashboard client à la place des
                      faux écrans ». La maquette en HTML de la source (liste des contrôles, menus) est remplacée par la vue
                      d'ensemble de LORANI, capturée sur /espace2/lorani en thème clair, sur les données d'exemple
                      (public/secteurs-architectes/ecrans/, 2880 × 1800 à deviceScaleFactor 2). */}
                  <div className="w-full overflow-hidden rounded-[14px] bg-[#ffffff] shadow-lg shadow-black/[0.06] ring-1 ring-[#0a0a0a]/[0.08]">
                    <Image
                      src="/secteurs-architectes/ecrans/dashboard-vue-d-ensemble.png"
                      width={2880}
                      height={1800}
                      alt="La vue d'ensemble de Lorani : les permis d'une agence, avec leur santé, leur chef de projet, leur prochaine date et leur avancement."
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
                <div data-reveal="1" style={{ "--reveal-y": "20px" } as React.CSSProperties}>
                  <div className="w-full">
                    <span className="mb-5 block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a]/40">
                      01 — Le produit
                    </span>
                    <h2 className="text-balance text-4xl font-semibold text-[#0a0a0a]">
                      <span className="block">Une incohérence entre deux pièces</span>
                      <span className="block text-[#737373]">ne se voit qu&apos;en les lisant ensemble.</span>
                    </h2>
                    <p className="mt-6 text-balance text-lg text-[#737373]">
                      Lorani lit toutes les pièces de l&apos;opération, les unes contre les autres : planches, CCTP, DPGF, offres, fiches techniques, situations et PV. Du dépôt du permis à la réception, vous arbitrez sur un dossier vérifié, et chaque décision reste datée.
                    </p>
                    <div className="mt-8">
                      <StarButton href={CONTACT.audit}>Réserver un audit</StarButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Les filets courent sur toute la largeur ; les cellules restent dans la marge de 30 px. */}
          <div className="border-y border-[#0a0a0a]/[0.06]">
            <div className="mx-[30px] grid grid-cols-2 lg:grid-cols-4">
              <div
                className="relative overflow-hidden px-6 py-8 lg:border-t-0"
                data-reveal="1"
                style={{ "--reveal-y": "8px" } as React.CSSProperties}
              >
                <PixelCanvas
                  colors={PIXELS_CLAIRS}
                  trigger="hover"
                  position="middle"
                  gap={8}
                  pixelSize={3}
                  speed={70}
                  backgroundColor="transparent"
                  padding={0}
                  borderWidth={0}
                  radius={0}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#ffffff]/95 via-[#ffffff]/75 to-[#ffffff]/90"
                ></div>
                <div className="relative z-10">
                  <span className="text-[14px] tabular-nums text-[#0a0a0a]/25">01</span>
                  <h3 className="mt-2 text-[18px] font-medium tracking-tight text-[#0a0a0a]">Chaque pièce est croisée avec les autres</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#0a0a0a]/45">
                    Lorani relit ensemble les plans, les coupes, les façades, le CCTP, la DPGF, les offres et les fiches techniques. Une cote modifiée à un endroit est retrouvée partout où elle apparaît.
                  </p>
                </div>
              </div>
              <div
                className="relative overflow-hidden px-6 py-8 border-l border-[#0a0a0a]/[0.06] lg:border-l lg:border-[#0a0a0a]/[0.06] lg:border-t-0"
                data-reveal="1"
                style={{ "--reveal-y": "8px" } as React.CSSProperties}
              >
                <PixelCanvas
                  colors={PIXELS_CLAIRS}
                  trigger="hover"
                  position="middle"
                  gap={8}
                  pixelSize={3}
                  speed={70}
                  backgroundColor="transparent"
                  padding={0}
                  borderWidth={0}
                  radius={0}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#ffffff]/95 via-[#ffffff]/75 to-[#ffffff]/90"
                ></div>
                <div className="relative z-10">
                  <span className="text-[14px] tabular-nums text-[#0a0a0a]/25">02</span>
                  <h3 className="mt-2 text-[18px] font-medium tracking-tight text-[#0a0a0a]">Les règles opposables sont citées</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#0a0a0a]/45">
                    Chaque point cite l&apos;article qu&apos;il met en défaut : règlement du plan local d&apos;urbanisme (PLU), accessibilité, sécurité incendie des établissements recevant du public (ERP), RE2020, DTU ou Avis Technique.
                  </p>
                </div>
              </div>
              <div
                className="relative overflow-hidden px-6 py-8 border-t border-[#0a0a0a]/[0.06] lg:border-l lg:border-[#0a0a0a]/[0.06] lg:border-t-0"
                data-reveal="1"
                style={{ "--reveal-y": "8px" } as React.CSSProperties}
              >
                <PixelCanvas
                  colors={PIXELS_CLAIRS}
                  trigger="hover"
                  position="middle"
                  gap={8}
                  pixelSize={3}
                  speed={70}
                  backgroundColor="transparent"
                  padding={0}
                  borderWidth={0}
                  radius={0}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#ffffff]/95 via-[#ffffff]/75 to-[#ffffff]/90"
                ></div>
                <div className="relative z-10">
                  <span className="text-[14px] tabular-nums text-[#0a0a0a]/25">03</span>
                  <h3 className="mt-2 text-[18px] font-medium tracking-tight text-[#0a0a0a]">Une preuve pour chaque point</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#0a0a0a]/45">
                    Chaque point cite la planche, l&apos;extrait et les deux valeurs lues, puis explique l&apos;écart et
                    propose une correction.
                  </p>
                </div>
              </div>
              <div
                className="relative overflow-hidden px-6 py-8 border-l border-t border-[#0a0a0a]/[0.06] lg:border-l lg:border-[#0a0a0a]/[0.06] lg:border-t-0"
                data-reveal="1"
                style={{ "--reveal-y": "8px" } as React.CSSProperties}
              >
                <PixelCanvas
                  colors={PIXELS_CLAIRS}
                  trigger="hover"
                  position="middle"
                  gap={8}
                  pixelSize={3}
                  speed={70}
                  backgroundColor="transparent"
                  padding={0}
                  borderWidth={0}
                  radius={0}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#ffffff]/95 via-[#ffffff]/75 to-[#ffffff]/90"
                ></div>
                <div className="relative z-10">
                  <span className="text-[14px] tabular-nums text-[#0a0a0a]/25">04</span>
                  <h3 className="mt-2 text-[18px] font-medium tracking-tight text-[#0a0a0a]">
                    L&apos;architecte décide, et la décision reste
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#0a0a0a]/45">
                    Lorani ne modifie aucun fichier : il remet une liste de points à arbitrer, chacun avec la pièce et la page. Ce que vous en décidez est daté et versé au journal de l&apos;opération.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
