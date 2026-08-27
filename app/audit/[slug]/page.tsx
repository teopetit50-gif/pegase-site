import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import BarreCTA from "@/components/audit/BarreCTA";
import BarreLecture from "@/components/audit/BarreLecture";
import CarteSpotlight from "@/components/audit/CarteSpotlight";
import CopierPrompt from "@/components/audit/CopierPrompt";
import Sommaire from "@/components/audit/Sommaire";
import TimelineSuite, { type EtapeSuite } from "@/components/audit/TimelineSuite";
import { AUDITS, auditParSlug } from "@/lib/audits";
import { CANAL_LABEL_PHRASE, CANAL_VALEUR, lienContact } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   /audit/[slug] — pré-audit personnalisé, v2 « composants » (02/08/2026)

   Le document de travail envoyé à UN prospect avant l'entretien de
   découverte. v2 : passe premium sur la v1 du jour — barre de lecture,
   sommaire sticky, H1 par mots masqués, spotlight satin sur les cartes,
   prompts en console (feux macOS), timeline au fil or pour la suite,
   flèches cerclées sur les moteurs, barre CTA mobile. Les patterns
   viennent de 21st.dev (spotlight card, process timeline, reading
   progress, sticky toc, bottom bar), réécrits dans le monde .resa —
   styles dans globals.css, préfixe .pa-*.

   Toujours : privé (noindex, hors sitemap, slug non devinable pour un
   vrai prospect), zéro chiffre inventé, /audit sans slug reste une 308
   vers /reserver-un-audit.
   ══════════════════════════════════════════════════════════════════════ */

export const dynamicParams = false;

export function generateStaticParams() {
  return AUDITS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const audit = auditParSlug(slug);
  if (!audit) return { title: "Pré-audit | Omega.AI", robots: { index: false, follow: false } };
  return {
    title: `Pré-audit, ${audit.entreprise} · Omega.AI`,
    description: `Document de travail préparé pour ${audit.entreprise} avant l'entretien d'audit.`,
    robots: { index: false, follow: false },
  };
}

/* message WhatsApp pré-rempli, propre à la page */
function lienSuite(entreprise: string) {
  return lienContact(
    `Pré-audit ${entreprise}`,
    [
      "Bonjour,",
      "",
      `J'ai lu le pré-audit préparé pour ${entreprise}.`,
      "Je souhaite caler l'entretien.",
      "",
      "Mes disponibilités : ",
    ].join("\n")
  );
}

/* H1 en mots masqués — chaque mot monte depuis son propre cadre (CSS pur,
   délais en cascade ; l'espace vit ENTRE les cadres, jamais dedans) */
function TitreAnime({ entreprise }: { entreprise: string }) {
  const mots = ["Préparé", "pour", ...`${entreprise}.`.split(" ")];
  return (
    <h1 className="r-h1 mt-5 max-w-[16ch]">
      {mots.map((m, i) => (
        <span key={`${m}-${i}`}>
          <span className="pa-mot">
            <span style={{ "--d": `${60 + i * 70}ms` } as React.CSSProperties}>{m}</span>
          </span>
          {i < mots.length - 1 ? " " : null}
        </span>
      ))}
    </h1>
  );
}

const SECTIONS = [
  { id: "situation", label: "Situation" },
  { id: "douleurs", label: "Douleurs" },
  { id: "remedes", label: "Remèdes" },
  { id: "moteurs", label: "Moteurs" },
  { id: "suite", label: "La suite" },
];

const ETAPES: EtapeSuite[] = [
  {
    etape: "Étape 1",
    titre: "L'entretien",
    texte:
      "Trente à quatre-vingt-dix minutes en visio, gratuit, sans engagement. On reprend ce document ligne par ligne : vous corrigez, on écoute, c'est votre quotidien qui fait foi, pas nos hypothèses.",
  },
  {
    etape: "Étape 2",
    titre: "Le chiffrage",
    texte:
      "Chaque poste confirmé est mesuré sur vos propres fichiers : échéancier, boîte mail, tableur. Le chiffre qui en sort est vérifiable chez vous, pas dans une plaquette.",
  },
  {
    etape: "Étape 3",
    titre: "La décision",
    texte:
      "La recommandation classe les pistes par retour, dit par quel moteur commencer, et ce qu'il ne faut pas automatiser. Elle vous appartient, que vous installiez un moteur ou non.",
  },
];

export default async function PreAuditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const audit = auditParSlug(slug);
  if (!audit) notFound();

  const lien = lienSuite(audit.entreprise);

  return (
    <PageShell>
      <PageMotion />
      <BarreLecture />

      <div className="resa">
        {/* ═══ 1 — en-tête personnalisé ═══ */}
        <section data-monde="clair" className="r-wrap pb-12 pt-24 sm:pb-16 sm:pt-32">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#616161]">
            Pré-audit · document de travail
          </p>
          <TitreAnime entreprise={audit.entreprise} />

          <div className="mt-7 flex flex-wrap gap-2.5">
            <span className="pa-chip">{audit.activite}</span>
            <span className="pa-chip">{audit.commune}</span>
            <span className="pa-chip">Préparé le {audit.date}</span>
          </div>

          {audit.demo ? (
            <p className="mt-7 inline-block rounded-lg bg-[#e8e8e8] px-4 py-2.5 text-[13px] leading-[20px] text-[#3d3d3d]">
              Page d&apos;exemple : les contenus sont génériques au métier du
              bâtiment. Aucune entreprise réelle derrière ce document.
            </p>
          ) : null}
        </section>

        {/* ═══ sommaire sticky ═══ */}
        <Sommaire sections={SECTIONS} />

        {/* ═══ 2 — la situation ═══ */}
        <section id="situation" data-monde="clair" className="pa-section r-wrap py-14 sm:py-20">
          <p className="r-note">À confirmer, ou à démonter, pendant l&apos;entretien.</p>
          <h2 className="r-h3 mt-6 max-w-[22ch]">Ce qu&apos;on pense avoir compris</h2>

          <div className="mt-9 max-w-[62ch] border-l-2 border-[#050505] pl-6" data-reveal>
            <p className="text-[17px] leading-[27px] text-[#050505] sm:text-[18px] sm:leading-[29px]">
              {audit.intro}
            </p>
            <p className="r-note mt-4">
              Rédigé avant de vous avoir entendu : tout ce qui est faux ici se
              corrige à l&apos;oral, c&apos;est précisément à ça que sert
              l&apos;entretien.
            </p>
          </div>
        </section>

        {/* ═══ 3 — les douleurs du métier ═══ */}
        <section id="douleurs" data-monde="clair" className="pa-section r-blanc">
          <div className="r-wrap py-14 sm:py-20">
            <p className="r-note">Repérées dans le métier : pas encore vérifiées chez vous.</p>
            <h2 className="r-h2 mt-6 max-w-[20ch]">Où le temps et l&apos;argent partent</h2>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {audit.douleurs.map((d, i) => (
                <CarteSpotlight
                  key={d.titre}
                  className="flex h-full flex-col rounded-2xl bg-[#f5f5f5] p-7 sm:p-9"
                >
                  <div data-reveal className="flex h-full flex-col">
                    <div className="num text-[13px] font-semibold text-[#616161]">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 className="r-h4 mt-3">{d.titre}</h3>
                    <p className="mt-4 flex-1 text-[15px] leading-[24px] text-[#3d3d3d]">
                      {d.texte}
                    </p>
                    <div className="mt-6 border-t border-[#e3e3e3] pt-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a6519]">
                        Ce qu&apos;on mesurera ensemble
                      </div>
                      <p className="mt-2 text-[14px] leading-[22px] text-[#050505]">
                        {d.mesure}
                      </p>
                    </div>
                  </div>
                </CarteSpotlight>
              ))}
            </div>

            <p className="r-note mt-8 max-w-[66ch]">
              Aucun montant n&apos;est avancé sur cette page. Le chiffrage se
              fait pendant l&apos;audit, sur vos propres documents : un chiffre
              qu&apos;on ne peut pas vérifier chez vous ne vaut rien.
            </p>
          </div>
        </section>

        {/* ═══ 4 — les remèdes immédiats, sans Omega ═══ */}
        <section id="remedes" className="pa-section r-nuit">
          <div className="r-wrap py-14 sm:py-20">
            <p className="r-note">
              À utiliser dès aujourd&apos;hui, gratuitement, sans nous : avec
              ChatGPT ou Claude.
            </p>
            <h2 className="r-h2 mt-6 max-w-[20ch]">Trois choses à faire dès cette&nbsp;semaine</h2>
            <p className="r-lead mt-6 max-w-[58ch]">
              L&apos;audit commence par ce qu&apos;on vous donne. Ces trois
              gestes ne remplacent pas un moteur : ils se font à la main, un
              par un, mais ils rapportent dès cette semaine, que l&apos;on
              travaille ensemble ou non.
            </p>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {audit.remedes.map((r) => (
                <CarteSpotlight
                  key={r.titre}
                  nuit
                  className="pa-carte-nuit flex h-full flex-col rounded-2xl border border-[#27272a] bg-[#141417] p-7"
                >
                  <div data-reveal className="flex h-full flex-col">
                    <h3 className="r-h4">{r.titre}</h3>
                    <p className="mt-4 text-[15px] leading-[24px] text-[#d4d4d8]">{r.texte}</p>
                    <div className="pa-console mt-6 flex-1">
                      <div className="pa-console-tete">
                        <span className="pa-feu bg-[#ff5f57]" />
                        <span className="pa-feu bg-[#febc2e]" />
                        <span className="pa-feu bg-[#28c840]" />
                        <span className="ml-2 font-mono text-[11px] tracking-[0.02em] text-[#71717a]">
                          prompt · chatgpt ou claude
                        </span>
                      </div>
                      <div className="p-5 font-mono text-[12.5px] leading-[21px] text-[#a1a1aa]">
                        {r.prompt}
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <CopierPrompt texte={r.prompt} />
                      {r.moteur ? (
                        <span className="text-[12px] leading-[18px] text-[#71717a]">
                          En continu : <span className="font-mono">{r.moteur}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </CarteSpotlight>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 5 — les moteurs qui répondent ═══ */}
        <section id="moteurs" data-monde="clair" className="pa-section r-wrap py-14 sm:py-20">
          <p className="r-note">
            La version en continu des gestes ci-dessus : installée sur vos
            outils, sous votre validation.
          </p>
          <h2 className="r-h2 mt-6 max-w-[20ch]">Les moteurs qui répondent à&nbsp;ça</h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {audit.moteurs.map((m) => (
              <Link key={m.system} href={`/offres/${m.slug}`} className="group">
                <CarteSpotlight className="flex h-full flex-col rounded-2xl bg-white p-7 transition-shadow duration-300 group-hover:shadow-[0_2px_28px_rgba(5,5,5,0.09)] sm:p-9">
                  <div data-reveal className="flex h-full flex-col">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[15px] font-semibold tracking-[0.04em] text-[#050505]">
                        {m.system}
                      </span>
                      <span className="text-[12px] text-[#616161]">{m.douleurs}</span>
                    </div>
                    <p className="mt-4 flex-1 text-[15px] leading-[24px] text-[#3d3d3d]">
                      {m.raison}
                    </p>
                    <div className="mt-7 flex items-center justify-between">
                      <span className="text-[14px] font-medium text-[#050505]">
                        Voir la fiche
                      </span>
                      <span className="pa-fleche" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2.5 8h11m0 0-4.2-4.2M13.5 8l-4.2 4.2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </CarteSpotlight>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══ 6 — la suite : timeline + CTA ═══ */}
        <section id="suite" data-monde="clair" className="pa-section r-blanc">
          <div className="r-wrap py-16 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[400px_1fr] lg:gap-20">
              <div className="lg:sticky lg:top-40 lg:self-start">
                <h2 className="r-h3 max-w-[16ch]">La suite tient en un&nbsp;entretien</h2>
                <p className="r-body mt-5 max-w-[44ch]">
                  On vérifie ce document avec vous, on chiffre sur vos propres
                  fichiers, et la recommandation dit aussi ce qu&apos;il ne faut
                  pas automatiser.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a href={lien} className="r-btn r-btn--noir cta-shine">
                    Caler l&apos;entretien
                  </a>
                  <Link href="/reserver-un-audit" className="r-btn r-btn--fil">
                    Voir les formats d&apos;audit
                  </Link>
                </div>
                <p className="r-note mt-5">
                  Ou directement : {CANAL_LABEL_PHRASE} : {CANAL_VALEUR}
                </p>
              </div>

              <TimelineSuite etapes={ETAPES} />
            </div>

            <p className="r-note mx-auto mt-16 max-w-[70ch] text-center">
              Page privée, préparée pour {audit.entreprise}&nbsp;: elle
              n&apos;est ni répertoriée sur le site, ni indexée par les moteurs
              de recherche. Aucun chiffre réel de l&apos;entreprise n&apos;y
              figure et rien de ce qui sera dit en entretien n&apos;y sera
              publié.
            </p>
          </div>
        </section>
      </div>

      <BarreCTA entreprise={audit.entreprise} lien={lien} />
    </PageShell>
  );
}
