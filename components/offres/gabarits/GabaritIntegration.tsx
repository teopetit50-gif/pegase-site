import Image from "next/image";
import Link from "next/link";
import { SystemLogo } from "@/components/logos";
import { Chevron } from "@/components/offres/MediaMoteurs";
import { DemoFiche, PastillesOutils } from "@/components/offres/MediaFiche";
import BlocFaq from "./BlocFaq";
import type { GabaritProps } from "./types";

/* ══════════════════════════════════════════════════════════════════════
   Gabarit « intégration » — d'après ocoya.com/integrations/[marque]

   Vérifié le 25/07/2026 sur /facebook, /x et /linkedin : les trois pages
   sont UN SEUL gabarit, paramétré par la couleur de marque (Facebook
   rgb(45,103,237), LinkedIn rgb(35,87,184)) et par la copie. Même ordre de
   sections, mêmes largeurs — 600 pour le H2 centré, 520 pour le H2 des
   blocs alternés, 760 pour la citation, 800 pour le bloc « à propos »,
   1040 pour le CTA. D'où un gabarit unique ici, l'accent passant en prop.

   Affecté à ANSWR, OFFLOAD et REVIVE. Sept sections :
     1  hero noir pointillé, H1 bicolore, deux tuiles, illustration à droite
     2  bande #18181b : quatre cartes à icône teintée
     3  bloc alterné texte / média
     4  bloc alterné texte / média (média à gauche)
     5  grande citation en carte grise
     6  « à propos du moteur », colonne 800
     7  CTA

   Fond : NOIR. La référence a un sélecteur de thème et Teo la regarde en
   sombre — c'est cette version qu'il veut (capture du 25/07). Palette prise
   dans ses tokens de thème : fond #09090b, surfaces #18181b, texte #fafafa,
   secondaire #a1a1aa, bordures #27272a, bouton #424242. Les tuiles de
   marque restent blanches, comme sur la référence. Voir `.offres--sombre`
   dans globals.css.

   Conséquence : aucune section ne porte data-monde="clair" — le header
   caméléon du site doit rester sombre sur cette page.

   Le hero est CENTRÉ tant qu'on n'est pas en deux colonnes (< 1024 px),
   comme la référence à cette largeur.

   Deux écarts assumés sur la section 5 (« User feedback » sur la
   référence) : pas d'étoiles et pas de témoignage nominatif. Omega n'a
   aucun avis client au dépôt et en fabriquer un serait un faux. La forme
   est conservée, le contenu devient l'engagement de contrôle du moteur,
   signé par le desk.
   ══════════════════════════════════════════════════════════════════════ */

/* icônes des cartes de la section 2 — trait 1,8, teintées à l'accent */
const GLYPHES = [
  "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  "M3 5h18M3 12h18M3 19h10",
  "M20 6 9 17l-5-5",
  "m3 11 18-7-7 18-2.5-8L3 11Z",
];

function IconeCarte({ d, accent }: { d: string; accent: string }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke={accent}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

/* bloc alterné : texte d'un côté, média de l'autre, dans une grande carte */
function BlocAlterne({
  eyebrow,
  titre,
  texte,
  lien,
  media,
  inverse = false,
}: {
  eyebrow: string;
  titre: string;
  texte: string;
  lien?: { label: string; href: string };
  media: React.ReactNode;
  inverse?: boolean;
}) {
  return (
    <div data-reveal className="o-bloc">
      {/* trame pointillée du coin bas, comme la référence */}
      <div
        aria-hidden
        className="o-dots o-dots-fade-up pointer-events-none absolute inset-x-0 bottom-0 top-1/2 opacity-70"
      />
      <div
        className={`relative grid grid-cols-1 items-center gap-10 p-8 sm:p-14 lg:grid-cols-2 lg:gap-16 ${
          inverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div>
          <span className="o-pill o-pill--xs">{eyebrow}</span>
          <h2 className="o-h2 mt-5 max-w-[520px]">{titre}</h2>
          <p className="o-body mt-5 max-w-[450px]">{texte}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
              Audit gratuit
              <Chevron taille={13} />
            </Link>
            {lien ? (
              <Link href={lien.href} className="o-link">
                {lien.label}
                <Chevron />
              </Link>
            ) : null}
          </div>
        </div>
        <div className="o-bloc-media p-6 sm:p-8">{media}</div>
      </div>
    </div>
  );
}

export default function GabaritIntegration({
  m,
  fiche,
  role,
  paragraphes,
  accentSombre,
}: GabaritProps) {
  /* les blocs alternés consomment les paragraphes après le premier (qui sert
     de chapô dans la section 2). S'il n'y en a qu'un, on retombe sur les
     étapes d'installation — jamais de bloc vide, jamais de texte inventé. */
  const blocs =
    paragraphes.length > 1
      ? paragraphes.slice(1, 3).map((p, i) => ({
          eyebrow: i === 0 ? "En marche" : "Au quotidien",
          /* 26/07 — titres pris dans la fiche quand elle les porte : « X au
             travail » / « Ce qui vous revient » ne disaient rien du contenu
             du paragraphe qu'ils coiffaient, et se répétaient d'une fiche à
             l'autre. Repli sur l'ancienne formule si la copie manque. */
          titre:
            fiche.sections?.blocTitres?.[i] ??
            (i === 0 ? `${m.system} au travail` : "Ce qui vous revient"),
          texte: p,
        }))
      : fiche.etapes.slice(0, 2).map((e, i) => ({
          eyebrow: i === 0 ? "Mise en place" : "Rodage",
          titre: e.t,
          texte: e.d,
        }));

  return (
    <div className="offres offres--sombre">
      {/* ════════ 1 · HERO ════════ */}
      <section
       
        className="relative overflow-hidden pb-[110px] pt-[40px] sm:pt-[81px]"
      >
        <div
          aria-hidden
          className="o-dots o-dots-fade pointer-events-none absolute inset-0"
        />
        <div className="o-wrap relative">
          <div className="grid grid-cols-1 items-center gap-16 pt-[60px] lg:grid-cols-[700px_minmax(0,1fr)]">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div data-reveal className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link href="/offres" className="o-pill o-pill--xs">
                  ← Nos offres
                </Link>
                <span className="o-pill o-pill--xs">{m.famille.tag}</span>
              </div>

              {/* H1 bicolore : le nom du moteur prend l'accent de sa famille,
                  exactement comme la référence teinte le nom de la marque.

                  13/08 — le deux-points est retiré. `role` commence déjà par
                  un tiret cadratin (« — clients dormants & marchés publics »),
                  si bien que RELOAD et FRONTD affichaient « NOM : — rôle »,
                  deux ponctuations cumulées. Les quatre autres pages
                  séparaient déjà proprement le nom du rôle ; c'est cette forme
                  qui est reprise ici. */}
              <h1 data-reveal className="o-h2 mt-6">
                <span style={{ color: accentSombre }}>{m.system}</span>
                <span className="text-[#fafafa]"> {role}</span>
              </h1>

              <p data-reveal className="o-lead mt-5 max-w-[560px]">
                {fiche.pitch}
              </p>

              {/* les deux tuiles : le moteur × Omega */}
              <div data-reveal className="mt-8 flex items-center justify-center gap-5 lg:justify-start">
                <span className="o-tuile">
                  <span className="scale-[0.86]">
                    <SystemLogo system={m.system} />
                  </span>
                </span>
                <span className="text-[20px] font-light text-[#a1a1aa]">×</span>
                <span className="o-tuile">
                  <span
                    className="text-[15px] font-bold tracking-[-0.02em] text-[#09090b]"
                    style={{ fontFamily: "var(--font-jakarta)" }}
                  >
                    Omega.AI
                  </span>
                </span>
              </div>

              <div data-reveal className="mt-9">
                <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
                  Chiffrer mon cas : audit gratuit
                  <Chevron taille={13} />
                </Link>
              </div>

              <div data-reveal className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <PastillesOutils outils={fiche.outils} />
                <span className="o-small !text-[#52525b]">{fiche.outils.join(" · ")}</span>
              </div>
            </div>

            {/* Colonne de droite : la démo, puis la photo du moteur. La
                référence pose une illustration ET une image dans son hero —
                la démo seule laissait la colonne trop maigre. */}
            <div data-reveal className="flex w-full flex-col gap-5 lg:max-w-[440px] lg:justify-self-end">
              <DemoFiche demo={fiche.demo} />
              {fiche.photo ? (
                <div className="o-photo !aspect-[440/260]">
                  <Image
                    src={fiche.photo}
                    alt={fiche.photoAlt ?? ""}
                    fill
                    sizes="(max-width: 1024px) 100vw, 440px"
                  />
                  <span className="o-pill o-pill--xs o-pill--verre absolute right-5 top-5 z-10">
                    {m.famille.tag}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ 2 · CE QU'IL APPORTE — bande teintée ════════ */}
      <section className="o-bande relative py-[110px]">

        <div className="o-wrap relative flex flex-col items-center text-center">
          <div data-reveal>
            <span className="o-pill">Ce qu&apos;il apporte</span>
          </div>
          {/* 26/07 — titre pris dans la fiche. En repli, on retombe sur la
              formule construite à partir de `role` (« Réceptionniste 24/7,
              sans angle mort. ») : correcte mais fabriquée, et identique de
              fiche en fiche. `role` étant en minuscule, on relève sa première
              lettre pour en faire un titre de section. */}
          <h2 data-reveal className="o-h2 mt-2.5 max-w-[600px]">
            {fiche.sections?.apportTitre ??
              `${role.charAt(0).toUpperCase() + role.slice(1)}, sans angle mort.`}
          </h2>
          {/* 13/08 — `m.benefit` est écrit pour les cartes de l'accueil : une
              ligne, trop courte pour tenir un chapô de section. Les fiches qui
              portent leur propre `apportChapo` l'emportent ; les autres
              retombent dessus. */}
          <p data-reveal className="o-lead mt-4 max-w-[650px]">
            {fiche.sections?.apportChapo ?? m.benefit}
          </p>
          <div data-reveal className="mt-6">
            <Link href="#a-propos" className="o-link">
              Le détail du fonctionnement
              <Chevron />
            </Link>
          </div>
        </div>

        <div className="o-wrap relative mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {fiche.points.map((pt, i) => (
            <div key={pt} data-reveal className="o-carte-icone">
              <IconeCarte d={GLYPHES[i % GLYPHES.length]} accent={accentSombre} />
              <p className="o-body mt-7">{pt}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ 3-4 · BLOCS ALTERNÉS ════════ */}
      <section className="o-wrap space-y-14 py-[110px]">
        <BlocAlterne
          eyebrow={blocs[0].eyebrow}
          titre={blocs[0].titre}
          texte={blocs[0].texte}
          lien={{ label: "Voir les autres moteurs", href: "/offres" }}
          media={<DemoFiche demo={fiche.demo} />}
        />
        {blocs[1] ? (
          <BlocAlterne
            inverse
            eyebrow={blocs[1].eyebrow}
            titre={blocs[1].titre}
            texte={blocs[1].texte}
            lien={{ label: "Comment se passe l'installation", href: "/reserver-un-audit" }}
            media={
              <div className="space-y-2.5">
                {fiche.etapes.map((e, i) => (
                  <div
                    key={e.t}
                    className="flex items-start gap-3 rounded-[10px] border border-white/[0.08] bg-[#09090b] px-4 py-3.5"
                  >
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: accentSombre }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="text-[13.5px] font-semibold text-[#fafafa]">{e.t}</div>
                      <div className="text-[12.5px] leading-[1.6] text-[#a1a1aa]">{e.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            }
          />
        ) : null}
      </section>

      {/* ════════ 5 · L'ENGAGEMENT ════════
          La référence place ici un témoignage noté. Omega n'a pas d'avis
          client au dépôt : la forme est gardée, le contenu devient
          l'engagement de contrôle — vrai, vérifiable, et signé par le desk
          plutôt que par un client inventé. */}
      <section className="o-wrap pb-[110px]">
        <div className="flex flex-col items-center text-center">
          <div data-reveal>
            <span className="o-pill">L&apos;engagement</span>
          </div>
          <h2 data-reveal className="o-h2 mt-2.5 max-w-[600px]">
            Vous gardez la main.
          </h2>
          <p data-reveal className="o-lead mt-4 max-w-[650px]">
            La règle qui prime sur toutes les autres, sur {m.system} comme sur
            les onze autres moteurs.
          </p>
        </div>

        <div data-reveal className="o-citation mx-auto mt-16 max-w-[880px]">
          <span className="absolute right-10 top-10 hidden sm:block">
            <SystemLogo system={m.system} />
          </span>
          <blockquote className="o-h2 max-w-[760px]">
            « {fiche.controle} »
          </blockquote>
          <p className="o-lead mt-8 max-w-[760px]">
            Cet engagement ne se négocie pas à l&apos;installation : il
            conditionne le fonctionnement du moteur. Les premières semaines,
            tout vous est soumis avant envoi. Ensuite, vous décidez poste par
            poste ce qui part seul et ce qui attend votre accord.
          </p>
          <div className="mt-9 flex items-center gap-4">
            <span
              className="grid h-[60px] w-[60px] place-items-center rounded-full text-[15px] font-bold text-white"
              style={{ background: accentSombre }}
            >
              P
            </span>
            <div>
              <div className="text-[16px] font-semibold text-[#fafafa]">
                Le desk Omega.AI
              </div>
              <div className="o-small">Installation et supervision</div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ 6 · À PROPOS DU MOTEUR ════════ */}
      <section id="a-propos" className="o-wrap scroll-mt-24 pb-[110px]">
        <div className="mx-auto max-w-[800px]">
          <div data-reveal className="scale-[1.6] origin-left ml-6">
            <SystemLogo system={m.system} />
          </div>
          <h2 data-reveal className="o-h2 mt-14">
            {m.system}
          </h2>
          <div data-reveal className="mt-6 space-y-5">
            {paragraphes.map((p, i) => (
              <p key={i} className="o-lead">
                {p}
              </p>
            ))}
          </div>

          <div data-reveal className="mt-10 flex flex-wrap gap-2.5">
            {fiche.cible.map((c) => (
              <span
                key={c}
                className="inline-flex items-center rounded-full border border-white/[0.1] bg-[#18181b] px-4 py-2 text-[14px] font-medium text-[#d4d4d8]"
              >
                {c}
              </span>
            ))}
          </div>

          {fiche.photo ? (
            <div data-reveal className="o-photo mt-12 !aspect-[800/380]">
              <Image
                src={fiche.photo}
                alt={fiche.photoAlt ?? ""}
                fill
                sizes="(max-width: 900px) 100vw, 800px"
              />
              <span className="o-pill o-pill--xs o-pill--verre absolute right-6 top-6 z-10">
                {m.famille.tag}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {/* ════════ 6 bis · FAQ ════════
          13/08 — ce gabarit n'affichait aucune FAQ : les quatre questions
          écrites pour RELOAD et les quatre de FRONTD dormaient dans
          lib/fiches.ts sans jamais atteindre une page. */}
      <BlocFaq faq={fiche.faq} chapo={fiche.sections?.faqChapo} />

      {/* ════════ 7 · CTA ════════ */}
      <section className="o-wrap pb-[120px]">
        <div
          data-reveal
          className="relative overflow-hidden rounded-[20px] bg-[#18181b] px-6 py-20 text-center sm:px-20"
        >
          <div
            aria-hidden
            className="o-dots o-dots-fade-up pointer-events-none absolute inset-x-0 bottom-0 top-1/2"
          />

          <h2 className="o-h2 relative mx-auto max-w-[1040px]">
            {m.system} est-il le bon pour vous ?
          </h2>
          <p className="o-lead relative mx-auto mt-4 max-w-[610px]">
            {fiche.sections?.clotureChapo ??
              "L'audit gratuit chiffre ce que votre difficulté principale vous coûte et désigne le moteur au meilleur retour : celui-ci, ou un autre."}
          </p>
          <div className="relative mt-8">
            <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
              Réserver l&apos;audit gratuit
              <Chevron taille={14} />
            </Link>
          </div>
        </div>

      </section>
    </div>
  );
}
