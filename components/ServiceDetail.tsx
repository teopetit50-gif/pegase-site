"use client";

/* Bloc détaillé affiché sous la présentation de chaque moteur dans les
   onglets de /solutions (23/07, Teo — 11 rubriques).

   Trois partis pris hérités des passes précédentes de la page :

   — LA DÉMO EST UNE MAQUETTE PRODUIT (23/07). Le rendu à plat a été
     remplacé par ServiceMockups : objet qui flotte sur fond dégradé,
     cartes superposées, grandes ombres. Les scènes PAYD et OFFLOAD sont
     volontairement SOMBRES — geste Qonto assumé, pas un oubli.
   — LA PHOTO PRODUIT EST DERRIÈRE « LE PROBLÈME » (25/07, Teo). Elle était
     enfermée dans une tuile arrondie en tête d'onglet ; c'était une vignette
     décorative posée à côté du discours. Elle est descendue là où elle sert
     à quelque chose — sous la phrase qui décrit la douleur — et en bande
     pleine largeur, sans cadre ni coins arrondis.
   — PAS DE data-reveal ici. ScrollTrigger ne capture que les éléments
     présents au montage ; ceux injectés au changement d'onglet resteraient
     figés à opacity 0, c'est-à-dire invisibles.
   — Les trous de contenu sont VISIBLES. Un placeholder mal signalé finit en
     production sans que personne le voie : ils sont donc rendus en pastille
     ambrée explicite, impossible à confondre avec du texte réel. */

import Image from "next/image";
import Link from "next/link";
import ParcoursSlider from "./ParcoursSlider";
import ServiceMockup, { MOCKUP_SOMBRE } from "./ServiceMockups";
import {
  SERVICES_DETAIL,
  estPlaceholder,
  type ServiceDetail as TDetail,
} from "@/lib/services-detail";

/* ——— photo de fond de la bande « Le problème », par moteur.
   `voile` : densité du noir plat posé sur l'image, réglée image par image —
   la lisibilité du blanc ne doit dépendre ni de la photo ni de l'écran. Les
   photos claires (ANSWR) en demandent nettement plus que les sombres (PAYD).
   Crédits : public/photos/CREDITS.txt. ——— */
const PHOTO: Record<
  string,
  { src: string; alt: string; voile: number; pos?: string }
> = {
  PAYD: {
    src: "/photos/payd-card.jpg",
    alt: "Carte de paiement noire tenue à la main dans la pénombre",
    voile: 0.42,
  },
  ANSWR: {
    src: "/photos/answr-phone.jpg",
    alt: "Smartphone à l'écran vierge posé sur une surface claire",
    voile: 0.68,
    pos: "object-[center_38%]",
  },
  OFFLOAD: {
    src: "/photos/offload-chip.jpg",
    alt: "Processeur installé sur une carte mère, gros plan sombre",
    voile: 0.55,
  },
  REVIVE: {
    src: "/photos/revive-chip.jpg",
    alt: "Processeur sur une carte mère, gros plan",
    voile: 0.6,
  },
};

/* ——— primitives ——— */

/* Texte à compléter : pastille ambrée, jamais confondable avec du contenu. */
function Trou({ children }: { children: string }) {
  return (
    <span className="inline-block rounded-md bg-[#f5e3bd] px-2 py-0.5 font-mono text-[12.5px] leading-relaxed text-[#6b4e12]">
      {children}
    </span>
  );
}

/* Rend une chaîne : soit du texte, soit un trou signalé. */
function Texte({ v, className }: { v: string; className?: string }) {
  if (estPlaceholder(v)) return <Trou>{v}</Trou>;
  return <span className={className}>{v}</span>;
}

function Titre({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <>
      <div
        className="font-mono text-[11px] uppercase tracking-[0.16em]"
        style={{ color: "#8a6519" }}
      >
        {eyebrow}
      </div>
      <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-[#0f1013] sm:text-[28px]">
        {children}
      </h3>
    </>
  );
}

/* Section séparée par une hairline — la respiration vient du padding, pas
   d'une carte (charte v2.3 : coupes franches, pas de boîtes ombrées). */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-t border-black/[0.08] py-12 sm:py-16">{children}</section>
  );
}

/* ——— le bloc complet ——— */

export default function ServiceDetail({ service }: { service: string }) {
  const d: TDetail | undefined = SERVICES_DETAIL[service];
  if (!d) return null;
  const ph = PHOTO[service];

  return (
    <div className="mt-2">
      {/* 1 — LE PROBLÈME, en bande photo pleine largeur. C'est la douleur :
          elle doit frapper avant qu'on parle de solution, et l'image porte
          le coup mieux qu'un fond blanc.

          Plein bord SANS débordement horizontal : -mx pour annuler le padding
          de la colonne, puis la recette maison du site (ombre portée géante
          de la couleur de fond + clip horizontal, cf. .monde-clair) pour que
          le noir continue au-delà des 1440 px de la colonne sur grand écran.
          Ni 100vw (qui compte la barre de défilement), ni marge négative
          calculée — aucune barre parasite. */}
      {ph ? (
        <section
          className="relative -mx-6 flex min-h-[520px] flex-col justify-end overflow-hidden sm:-mx-10 sm:min-h-[68vh]"
          style={{
            background: "#08090c",
            boxShadow: "0 0 0 100vmax #08090c",
            clipPath: "inset(0 -100vmax)",
          }}
        >
          <Image
            src={ph.src}
            alt={ph.alt}
            fill
            priority
            sizes="100vw"
            className={`object-cover ${ph.pos ?? ""}`}
          />
          {/* voiles de lisibilité : plat réglé par image, puis dégradé bas
              (là où vit le texte) et léger dégradé gauche */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `rgba(8,9,12,${ph.voile})` }}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/55 to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#08090c]/70 to-transparent"
          />
          <div className="relative px-6 pb-14 pt-28 sm:px-10 sm:pb-20 sm:pt-40">
            <div
              className="font-mono text-[11px] uppercase tracking-[0.16em]"
              style={{ color: "#c99a3f" }}
            >
              Le problème
            </div>
            <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-white sm:text-[28px]">
              Ce que ça coûte aujourd&apos;hui
            </h3>
            <p className="mt-6 max-w-3xl text-[19px] leading-[1.55] tracking-[-0.01em] text-white sm:text-[24px]">
              <Texte v={d.probleme} />
            </p>
            <p className="mt-6 max-w-2xl text-[15px] leading-[1.8] text-white/70 sm:text-[16px]">
              <Texte v={d.accroche} />
            </p>
          </div>
        </section>
      ) : (
        <Section>
          <Titre eyebrow="Le problème">Ce que ça coûte aujourd&apos;hui</Titre>
          <p className="mt-6 max-w-3xl text-[19px] leading-[1.55] tracking-[-0.01em] text-[#0f1013] sm:text-[24px]">
            <Texte v={d.probleme} />
          </p>
          <p className="mt-6 max-w-2xl text-[15px] leading-[1.8] text-[#52555c] sm:text-[16px]">
            <Texte v={d.accroche} />
          </p>
        </Section>
      )}

      {/* 2 — LE PARCOURS, en carrousel (25/07, Teo : le geste Qonto — la
          barre qui se remplit et fait passer à la carte suivante). L'ancienne
          timeline à rail montrait les trois étapes d'un coup, à plat : on
          lisait un schéma, pas un parcours. Ici on avance étape par étape,
          au doigt ou tout seul. Le rail à nœuds reste sur /solutions pour
          « la mise en place » — deux blocs, deux gestes assumés.
          key={service} : le carrousel doit repartir de l'étape 1 quand on
          change d'onglet, sinon il reste sur l'index du moteur précédent. */}
      <Section>
        <Titre eyebrow="Comment ça marche">Le parcours, étape par étape</Titre>
        <ParcoursSlider key={service} etapes={d.etapes} />
      </Section>

      {/* 3 — LA DÉMO, en situation réelle.
          Pour les moteurs à maquette sombre (PAYD, OFFLOAD), toute la section
          bascule en BANDE NOIRE pleine largeur (23/07, Teo : « le fond de la
          partie en situation doit être noir, pas blanc »). Full-bleed par la
          même technique que .monde-clair : ombre portée géante + clip
          horizontal, aucun débordement, aucune barre de défilement. */}
      {MOCKUP_SOMBRE.has(service) ? (
        <section
          className="relative border-t border-white/[0.06] py-12 sm:py-16"
          style={{
            background: "#08090c",
            boxShadow: "0 0 0 100vmax #08090c",
            clipPath: "inset(0 -100vmax)",
          }}
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "#c99a3f" }}>
            En situation
          </div>
          <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-white sm:text-[28px]">
            Ce que ça donne, concrètement
          </h3>
          <p className="mt-4 text-[15px] text-white/55">
            <Texte v={d.demoContexte} />
          </p>
          <div className="mt-8">
            <ServiceMockup service={service} />
          </div>
        </section>
      ) : (
        <Section>
          <Titre eyebrow="En situation">Ce que ça donne, concrètement</Titre>
          <p className="mt-4 text-[15px] text-[#52555c]">
            <Texte v={d.demoContexte} />
          </p>
          <div className="mt-8">
            <ServiceMockup service={service} />
          </div>
        </Section>
      )}

      {/* 4 — CE QUI EST INCLUS */}
      <Section>
        <Titre eyebrow="Ce qui est inclus">Le détail des fonctionnalités</Titre>
        <ul className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {d.inclus.map((it) => (
            <li key={it} className="flex gap-3">
              <span
                aria-hidden
                className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "#8a6519" }}
              />
              <span className="text-[15px] leading-[1.8] text-[#52555c]">{it}</span>
            </li>
          ))}
        </ul>

        {/* rappel d'action, à mi-parcours */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/commencer"
            className="rounded-[var(--radius-btn)] bg-black px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-black/85"
          >
            Commencer
          </Link>
          <span className="text-[14px] text-[#52555c]">30 minutes, sans engagement.</span>
        </div>
      </Section>

      {/* 5 + 6 — POUR QUI · INTÉGRATIONS, sur une même rangée : deux listes
          courtes de pastilles, elles n'ont pas besoin d'une section chacune. */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Titre eyebrow="Pour qui">Les profils concernés</Titre>
            <ul className="mt-7 flex flex-wrap gap-2">
              {d.pourQui.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-black/10 px-3.5 py-1.5 text-[14px] text-[#0f1013]"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Titre eyebrow="Intégrations">Les outils compatibles</Titre>
            <ul className="mt-7 flex flex-wrap gap-2">
              {d.integrations.map((o) => (
                <li
                  key={o}
                  className="rounded-full border border-black/10 px-3.5 py-1.5 text-[14px] text-[#0f1013]"
                >
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 7 — LA PREUVE : chiffres + emplacement témoignage */}
      <Section>
        <Titre eyebrow="La preuve">Les résultats</Titre>
        <dl className="mt-10 grid gap-8 sm:grid-cols-3">
          {d.stats.map((s, i) => (
            <div key={i}>
              <dt className="text-[34px] font-semibold tracking-[-0.03em] text-[#0f1013] sm:text-[44px]">
                {estPlaceholder(s.valeur) ? <Trou>{s.valeur}</Trou> : s.valeur}
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[#52555c]">
                <Texte v={s.label} />
              </dd>
            </div>
          ))}
        </dl>

        {/* Témoignage OU réassurance, jamais les deux.
            La réassurance est la voix de l'ENTREPRISE : elle est rendue en
            texte courant, sans filet ni guillemets, pour qu'aucun visiteur ne
            puisse la prendre pour un avis client. Quand ni l'un ni l'autre
            n'existe, on n'affiche rien — pas de faux témoignage. */}
        {d.reassurance ? (
          <p className="mt-12 max-w-2xl text-[16px] leading-[1.8] text-[#52555c] sm:text-[17px]">
            <Texte v={d.reassurance} />
          </p>
        ) : d.temoignage ? (
          <figure className="mt-12 max-w-2xl border-l-2 border-black/[0.12] pl-6">
            <blockquote className="text-[17px] leading-[1.7] text-[#0f1013] sm:text-[19px]">
              <Texte v={d.temoignage} />
            </blockquote>
          </figure>
        ) : null}
      </Section>

      {/* 8 + 9 — TARIFS · INSTALLATION */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Titre eyebrow="Tarifs">Le modèle de prix</Titre>
            {/* Deux formes : une phrase (« Sur devis… »), ou le gabarit
                chiffré « À partir de X par mois ». */}
            {d.tarifTexte ? (
              <p className="mt-7 max-w-md text-[20px] font-semibold tracking-[-0.02em] text-[#0f1013] sm:text-[24px]">
                <Texte v={d.tarifTexte} />
              </p>
            ) : (
              <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <span className="text-[15px] text-[#52555c]">À partir de</span>
                <span className="text-[30px] font-semibold tracking-[-0.03em] text-[#0f1013] sm:text-[38px]">
                  {estPlaceholder(d.tarif ?? "") ? <Trou>{d.tarif ?? ""}</Trou> : d.tarif}
                </span>
                <span className="text-[15px] text-[#52555c]">{d.tarifDetail}</span>
              </div>
            )}
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-[#52555c]">
              Le montant exact dépend du moteur et de votre situation : c&apos;est ce
              que l&apos;audit gratuit chiffre en trente minutes.
            </p>
          </div>
          <div>
            <Titre eyebrow="Installation">Ce que ça vous demande</Titre>
            <p className="mt-7 max-w-md text-[15px] leading-[1.8] text-[#52555c] sm:text-[16px]">
              <Texte v={d.installation} />
            </p>
          </div>
        </div>
      </Section>

      {/* 10 — FAQ / objections */}
      <Section>
        <Titre eyebrow="Objections">Les questions qui viennent</Titre>
        <div className="mt-8 max-w-3xl">
          {d.faq.map((f) => (
            <details key={f.q} className="group border-b border-black/[0.08] py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-[#0f1013] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  className="text-[22px] font-light leading-none transition-transform duration-300 group-open:rotate-45"
                  style={{ color: "#8a6519" }}
                >
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-2xl text-[15px] leading-[1.8] text-[#52555c]">
                <Texte v={f.a} />
              </p>
            </details>
          ))}
        </div>
      </Section>

      {/* 11 — CTA FINAL */}
      <Section>
        <h3 className="max-w-2xl text-[26px] font-semibold tracking-[-0.025em] text-[#0f1013] sm:text-[36px]">
          <Texte v={d.ctaTitre} />
        </h3>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#52555c]">
          <Texte v={d.ctaTexte} />
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href="/reserver?formule=diagnostic"
            className="rounded-[var(--radius-btn)] bg-black px-7 py-3.5 text-[16px] font-semibold text-white transition hover:bg-black/85"
          >
            Réserver une démo
          </Link>
          <Link
            href="/reserver-un-audit#faq"
            className="rounded-[var(--radius-btn)] border border-black/15 px-7 py-3.5 text-[16px] font-medium text-[#0f1013] transition hover:border-black/40"
          >
            Poser une question
          </Link>
        </div>
      </Section>
    </div>
  );
}
