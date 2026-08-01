"use client";

/* « Nos services » — hero centré + sélecteur à 4 onglets (22/07, Teo).
   Remplace l'ancien hero aligné à gauche et le bento : les quatre moteurs
   ne sont plus quatre tuiles empilées mais quatre onglets ; cliquer change
   le panneau du dessous SANS quitter la page.

   23/07 : la page est intégralement CLAIRE et uniforme — plus de hero
   sombre, plus de carte, plus de vignette produit sombre dans le panneau.

   Deux partis pris de robustesse, tirés des bugs précédents :
   — aucune animation d'opacité au changement d'onglet. Si la transition ne
     s'exécute pas (onglet en arrière-plan, rAF throttlé), un panneau resté
     à 0 serait une page vide. Le contenu est toujours opaque.
   — pas de [data-reveal] dans le panneau : ScrollTrigger ne capture que les
     éléments présents au montage, ceux injectés au clic resteraient figés. */

import Link from "next/link";
import { useRef, useState } from "react";
import { SystemLogo } from "./logos";
import ServiceDetail from "./ServiceDetail";
import { FAMILLES } from "@/lib/content";
import { FICHES } from "@/lib/fiches";

const SERVICES = ["PAYD", "ANSWR", "OFFLOAD", "REVIVE"] as const;
type Service = (typeof SERVICES)[number];

/* identité de famille de chaque moteur : le panneau reprend l'en-tête des
   fiches (logo teinté, pastille + tag, titre complet) */
const META = Object.fromEntries(
  FAMILLES.flatMap((f) =>
    f.moteurs.map((m) => [
      m.system,
      { tag: f.tag, accent: f.accent, id: f.id, title: m.title },
    ])
  )
) as Record<
  string,
  { tag: string; accent: string; id: string; title: string }
>;

const POINT: Record<string, string> = {
  defensifs: "bg-gold",
  offensifs: "bg-mint",
  pepites: "bg-sky",
};

const ACCENT = Object.fromEntries(
  SERVICES.map((s) => [s, META[s]?.accent ?? ""])
) as Record<string, string>;
/* « PAYD — relance devis & factures » → la part après le nom système */
const SUITE = Object.fromEntries(
  SERVICES.map((s) => {
    const t = META[s]?.title ?? "";
    return [s, t.startsWith(s) ? t.slice(s.length) : ""];
  })
) as Record<string, string>;
const DOT = Object.fromEntries(
  SERVICES.map((s) => [s, POINT[META[s]?.id ?? ""] ?? "bg-gold"])
) as Record<string, string>;

/* Les visuels produit ne vivent plus ici (25/07, Teo) : la photo du moteur
   est descendue derrière la bande « Le problème », en pleine largeur — voir
   PHOTO dans ServiceDetail.tsx. L'en-tête d'onglet redevient ce qu'il doit
   être : une identité posée sur la surface claire, sans cadre. */

export default function ServicesTabs() {
  const [actif, setActif] = useState<Service>("PAYD");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const fiche = FICHES[actif];

  /* navigation clavier attendue d'un role="tablist" */
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const suivant =
      e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (suivant === null) return;
    e.preventDefault();
    const j = (suivant + SERVICES.length) % SERVICES.length;
    setActif(SERVICES[j]);
    refs.current[j]?.focus();
  };

  return (
    <>
      {/* ——— hero CLAIR (23/07) ———
          Vérifié sur qonto.com/en/payment-methods/card : leur hero est une
          <section> BLANCHE pleine largeur — `background: rgb(255,255,255)`,
          aucun border-radius, aucune background-image, aucune carte posée
          dessus. Les liserés qu'on croyait voir sur les bords de la capture
          n'étaient pas une photo. Première version (photo en fond + panneau
          blanc arrondi) supprimée : elle produisait un carré blanc flottant
          sur un halo gris, exactement ce que Teo a signalé.

          La surface est donc uniforme d'un bord à l'autre, et c'est le
          .monde-clair du site (#f6f6f5, neutralisé par Teo le 22/07) qui la
          porte — pas un blanc pur qui trancherait avec le reste de la page. */}
      <section
        data-monde="clair"
        className="monde-clair px-6 pb-16 pt-16 text-center sm:px-10 sm:pb-20 sm:pt-28"
      >
        {/* ligne de tête — l'aplomb du « 4.5 of 5 Capterra » de Qonto, mais
            sur un fait vérifiable : aucune note ni preuve sociale inventée
            (règle refs-qonto/NOTES-DESIGN.md). */}
        <p
          data-reveal
          className="text-[13px] font-medium tracking-tight text-[#52555c] sm:text-[14px]"
        >
          <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 -translate-y-[2px] rounded-full align-middle" style={{ background: "#8a6519" }} />
          Chèque TIC — <span className="font-semibold text-[#0f1013]">jusqu&apos;à 80 % de l&apos;installation financée</span> pour les TPE éligibles
        </p>

        <h1
          data-reveal
          className="mx-auto mt-6 max-w-[15ch] text-[38px] font-bold leading-[1.03] tracking-[-0.035em] text-[#0f1013] sm:mt-8 sm:text-[66px] lg:text-[86px]"
        >
          Quatre moteurs qui travaillent sans vous
        </h1>

        <p
          data-reveal
          className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-[#52555c] sm:mt-7 sm:text-[18px]"
        >
          Relance des impayés, réponses clients 24/7, factures fournisseurs
          classées, clients dormants réactivés. Chaque moteur s&apos;installe
          sur <span className="font-semibold text-[#0f1013]">vos outils actuels</span> —
          mail, tableur, WhatsApp — en{" "}
          <span className="font-semibold text-[#0f1013]">quelques jours</span>, et{" "}
          <span className="font-semibold text-[#0f1013]">rien ne part sans votre validation</span>.
        </p>

        {/* le doublet de CTA de Qonto : plein noir + contour */}
        <div data-reveal className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:mt-10 sm:gap-4">
          <Link
            href="/reserver-un-audit"
            className="rounded-[var(--radius-btn)] bg-black px-7 py-3.5 text-[16px] font-semibold text-white transition hover:bg-black/85"
          >
            Réserver l&apos;audit gratuit
          </Link>
          <a
            href="#panneau-service"
            className="rounded-[var(--radius-btn)] border border-black/15 px-7 py-3.5 text-[16px] font-medium text-[#0f1013] transition hover:border-black/40"
          >
            Comparer les moteurs
          </a>
        </div>

        {/* sélecteur — un onglet par moteur */}
        <div
          data-reveal
          role="tablist"
          aria-label="Nos services"
          /* gap-x-4 sur mobile : les quatre libellés mesurent 244 px pour
             307 px disponibles à 375 px de large — au-delà de 21 px
             d'écart, REVIVE tombe seul sur une deuxième ligne. */
          className="mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:mt-14 sm:gap-x-12"
        >
        {SERVICES.map((s, i) => {
          const on = s === actif;
          return (
            <button
              key={s}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`onglet-${s.toLowerCase()}`}
              aria-selected={on}
              aria-controls="panneau-service"
              tabIndex={on ? 0 : -1}
              onClick={() => setActif(s)}
              onKeyDown={(e) => onKey(e, i)}
              /* 22/07 — plus aucun cadre autour des noms (Teo). Les onglets
                 sont du texte nu ; la sélection se lit à un filet or sous
                 le libellé actif. py-3 est conservé sans fond : la cible
                 tactile reste ≥ 44 px, simplement invisible. */
              className="group relative px-1 py-3 text-[15px] font-semibold tracking-tight"
            >
              {/* Le reflet métal vit sur un SPAN, jamais sur le bouton :
                  .metal-text pose `background:` en raccourci, ce qui
                  écraserait tout fond posé sur le bouton. Sur fond BLANC on
                  utilise la rampe sombre bornée AA (metal-text-sm-dark) —
                  la rampe claire y serait illisible. */}
              <span className="metal-text-sm-dark">{s}</span>
              {/* Le filet actif n'est JAMAIS animé : une transition
                  d'opacité gelée (onglet en arrière-plan, rAF throttlé)
                  laisserait le marqueur sous le mauvais onglet — constaté
                  en test. Les deux états sont donc deux éléments distincts
                  que React échange, sans transition entre eux. Seul le
                  survol, purement décoratif, garde la sienne. */}
              {on ? (
                <span
                  key="filet-actif"
                  aria-hidden
                  className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[#0f1013]"
                />
              ) : (
                <span
                  key="filet-inactif"
                  aria-hidden
                  className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[#0f1013] opacity-0 transition-opacity duration-200 group-hover:opacity-40"
                />
              )}
            </button>
          );
        })}
        </div>
      </section>

      {/* ——— PANNEAU CLAIR ———
          23/07, Teo : les vignettes produit (facture PAYD, téléphone ANSWR,
          tableau OFFLOAD, fiche client REVIVE) sont retirées. C'étaient les
          derniers objets sombres de la page ; sur la surface claire uniforme
          ils faisaient tache. Le panneau est donc une colonne unique de
          texte — plus de grille à deux colonnes. ——— */}
      <section data-monde="clair" className="monde-clair">
        <div
          id="panneau-service"
          role="tabpanel"
          aria-labelledby={`onglet-${actif.toLowerCase()}`}
          className="scroll-mt-24 px-6 pb-20 pt-14 sm:px-10 sm:pb-24 sm:pt-16"
        >
          <div>
            {/* ——— identité du moteur, à plat sur la surface claire ———
                La photo qui vivait ici (tuile arrondie, texte blanc dessus)
                est partie derrière « Le problème », en pleine largeur — elle
                y sert le propos au lieu de décorer un en-tête. Reste
                l'essentiel : logo, nom, promesse. Sur fond clair, le reflet
                métal du nom passe par la rampe sombre bornée AA
                (metal-text-dark) — la rampe claire y serait illisible. */}
            <div className="border-b border-black/[0.08] pb-9 sm:pb-11">
              <div className={ACCENT[actif] ?? ""}>
                <SystemLogo system={actif} />
              </div>
              <h2 className="mt-5 text-[32px] font-bold leading-[1.06] tracking-[-0.03em] text-[#0f1013] sm:text-[46px]">
                <span className="metal-text-dark">{actif}</span>
                {SUITE[actif] ?? ""}
              </h2>
              <p className="mt-3 max-w-xl text-[18px] font-medium leading-[1.4] tracking-[-0.01em] text-[#0f1013] sm:text-[22px]">
                {fiche?.pitch}
              </p>
            </div>

            {/* fonctionnement — string (1 paragraphe) ou string[] (plusieurs,
                cas des 4 moteurs des onglets) : on normalise en tableau. */}
            <div className="mt-8 max-w-xl space-y-4 sm:mt-10">
              {(Array.isArray(fiche?.fonctionnement)
                ? fiche.fonctionnement
                : [fiche?.fonctionnement ?? ""]
              ).map((para, i) => (
                <p key={i} className="text-[15px] leading-[1.8] text-[#52555c] sm:text-[16px]">
                  {para}
                </p>
              ))}
            </div>

            <ul className="mt-7 space-y-3.5">
              {fiche?.points.map((pt) => (
                <li key={pt} className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT[actif] ?? "bg-gold"}`}
                  />
                  <span className="max-w-xl text-[15px] leading-[1.8] text-[#52555c]">{pt}</span>
                </li>
              ))}
            </ul>

            {/* les pastilles d'outils qui vivaient ici sont retirées : la
                rubrique « Intégrations » ci-dessous rend exactement la même
                liste, à quelques centaines de pixels — le doublon se lisait
                comme un bug. */}

            {/* les 11 rubriques détaillées du service (23/07) — dans le
                tabpanel, donc elles changent avec l'onglet actif */}
            <ServiceDetail service={actif} />
          </div>
        </div>
      </section>

    </>
  );
}
