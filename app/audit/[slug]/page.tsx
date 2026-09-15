import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import BarreCTA from "@/components/audit/BarreCTA";
import BarreLecture from "@/components/audit/BarreLecture";
import { CarteDouleur, CarteMoteur, CarteRemede, EnteteSection } from "@/components/audit/CartesFiche";
import Sommaire from "@/components/audit/Sommaire";
import TimelineSuite, { type EtapeSuite } from "@/components/audit/TimelineSuite";
import { AUDITS, auditParSlug } from "@/lib/audits";
import { COURRIEL, lienCourriel, lienReservation } from "@/lib/reservation";

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

/* 14/09 — « Caler l'entretien » ouvre l'agenda, format Audit process (le
   gratuit des organisations, modifiable sur place) : WhatsApp n'est plus
   une porte du site — voir lib/reservation.ts. Avant, un message WhatsApp
   pré-rempli au nom de l'entreprise. La voie écrite reste l'e-mail, objet
   pré-rempli (lienEcrit). */
function lienSuite() {
  return lienReservation("process");
}
function lienEcrit(entreprise: string) {
  return lienCourriel(`Pré-audit ${entreprise}`);
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
  { id: "moteurs", label: "Systèmes" },
  { id: "suite", label: "La suite" },
];

const ETAPES: EtapeSuite[] = [
  {
    etape: "Étape 1",
    titre: "L'entretien",
    texte:
      "Trente à quatre-vingt-dix minutes en visio, gratuit, sans engagement. Nous reprenons ce document ligne par ligne : vous corrigez, nous écoutons, et c'est votre quotidien qui fait foi, pas nos hypothèses.",
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
      "La recommandation classe les pistes par retour, dit par quel système commencer, et ce qu'il ne faut pas automatiser. Elle vous appartient, que vous installiez un système ou non.",
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

  const lien = lienSuite();
  const ecrit = lienEcrit(audit.entreprise);

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
          <EnteteSection rang={1} total={SECTIONS.length} etiquette="Situation" />
          <p className="r-note">À confirmer, ou à démonter, pendant l&apos;entretien.</p>
          <h2 className="r-h3 mt-6 max-w-[22ch]">Ce que nous pensons avoir compris</h2>

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
            <EnteteSection rang={2} total={SECTIONS.length} etiquette="Douleurs" />
            <p className="r-note">Repérées dans le métier : pas encore vérifiées chez vous.</p>
            <h2 className="r-h2 mt-6 max-w-[20ch]">Où le temps et l&apos;argent partent</h2>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {audit.douleurs.map((d, i) => (
                <CarteDouleur key={d.titre} douleur={d} index={i} />
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
            <EnteteSection rang={3} total={SECTIONS.length} etiquette="Remèdes" />
            <p className="r-note">
              À utiliser dès aujourd&apos;hui, gratuitement, sans nous : avec
              ChatGPT ou Claude.
            </p>
            <h2 className="r-h2 mt-6 max-w-[20ch]">Trois choses à faire dès cette&nbsp;semaine</h2>
            <p className="r-lead mt-6 max-w-[58ch]">
              L&apos;audit commence par ce que nous vous donnons. Ces trois gestes ne remplacent pas un système&nbsp;: ils se font à la main, un par un, mais ils rapportent dès cette semaine, que nous travaillions ensemble ou non.
            </p>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {audit.remedes.map((r) => (
                <CarteRemede key={r.titre} remede={r} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 5 — les moteurs qui répondent ═══ */}
        <section id="moteurs" data-monde="clair" className="pa-section r-wrap py-14 sm:py-20">
          <EnteteSection rang={4} total={SECTIONS.length} etiquette="Systèmes" />
          <p className="r-note">
            La version en continu des gestes ci-dessus : installée sur vos
            outils, sous votre validation.
          </p>
          <h2 className="r-h2 mt-6 max-w-[20ch]">Les systèmes qui répondent à&nbsp;cela</h2>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {audit.moteurs.map((m) => (
              <CarteMoteur key={m.system} moteur={m} />
            ))}
          </div>
        </section>

        {/* ═══ 6 — la suite : timeline + CTA ═══ */}
        <section id="suite" data-monde="clair" className="pa-section r-blanc">
          <div className="r-wrap py-16 sm:py-24">
            <EnteteSection rang={5} total={SECTIONS.length} etiquette="La suite" />
            <div className="grid gap-12 lg:grid-cols-[400px_1fr] lg:gap-20">
              <div className="lg:sticky lg:top-40 lg:self-start">
                <h2 className="r-h3 max-w-[16ch]">La suite tient en un&nbsp;entretien</h2>
                <p className="r-body mt-5 max-w-[44ch]">
                  Nous vérifions ce document avec vous, nous chiffrons sur vos propres fichiers, et la recommandation dit aussi ce qu&apos;il ne faut pas automatiser.
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
                  Ou par e-mail :{" "}
                  <a href={ecrit} className="underline underline-offset-4 hover:text-[#050505]">
                    {COURRIEL}
                  </a>
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
