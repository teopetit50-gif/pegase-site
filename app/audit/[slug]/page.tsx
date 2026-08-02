import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import CopierPrompt from "@/components/audit/CopierPrompt";
import { AUDITS, auditParSlug } from "@/lib/audits";
import { CANAL_LABEL_PHRASE, CANAL_VALEUR, lienContact } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   /audit/[slug] — pré-audit personnalisé (02/08/2026)

   Le document de travail envoyé à UN prospect avant l'entretien de
   découverte : ce qu'on pense avoir compris, les douleurs de son métier,
   trois remèdes utilisables le jour même sans Omega (prompts copiables),
   puis les moteurs qui répondent — dans cet ordre, parce que le
   protocole d'audit donne avant de vendre.

   Design : le monde .resa de /reserver-un-audit (la page sœur — c'est
   vers elle que ce document conduit). Contenu : lib/audits.ts, une
   entrée par prospect.

   Ces pages sont PRIVÉES : robots noindex, absentes du sitemap, slug
   non devinable pour les vrais prospects. /audit (sans slug) reste une
   redirection 308 vers /reserver-un-audit — inchangée.
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
  if (!audit) return { title: "Pré-audit — Omega", robots: { index: false, follow: false } };
  return {
    title: `Pré-audit — ${audit.entreprise} · Omega`,
    description: `Document de travail préparé pour ${audit.entreprise} avant l'entretien d'audit.`,
    robots: { index: false, follow: false },
  };
}

/* message WhatsApp pré-rempli, propre à la page — la demande arrive déjà
   contextualisée, comme partout ailleurs sur le site */
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

export default async function PreAuditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const audit = auditParSlug(slug);
  if (!audit) notFound();

  return (
    <PageShell>
      <PageMotion />

      <div className="resa">
        {/* ═══ 1 — en-tête personnalisé ═══ */}
        <section data-monde="clair" className="r-wrap pb-12 pt-28 sm:pb-16 sm:pt-36">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#616161]">
            Pré-audit · document de travail
          </p>
          <h1 className="r-h1 mt-5 max-w-[16ch]">
            Préparé pour {audit.entreprise}.
          </h1>
          <p className="mt-5 text-[15px] leading-[23px] text-[#3d3d3d]">
            {audit.activite} · {audit.commune} · préparé le {audit.date}
          </p>

          {audit.demo ? (
            <p className="mt-6 inline-block rounded-lg bg-[#e8e8e8] px-4 py-2.5 text-[13px] leading-[20px] text-[#3d3d3d]">
              Page d&apos;exemple — les contenus sont génériques au métier du
              bâtiment. Aucune entreprise réelle derrière ce document.
            </p>
          ) : null}

          <div className="mt-10 max-w-[62ch] border-l-2 border-[#050505] pl-6">
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

        {/* ═══ 2 — les douleurs du métier ═══ */}
        <section data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-20">
            <p className="r-note">
              Repérées dans le métier — pas encore vérifiées chez vous.
            </p>
            <h2 className="r-h2 mt-6 max-w-[20ch]">
              Où le temps et l&apos;argent partent
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {audit.douleurs.map((d, i) => (
                <div
                  key={d.titre}
                  data-reveal
                  className="flex h-full flex-col rounded-2xl bg-[#f5f5f5] p-7 sm:p-9"
                >
                  <div className="num text-[13px] font-semibold text-[#616161]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="r-h4 mt-3">{d.titre}</h3>
                  <p className="mt-4 flex-1 text-[15px] leading-[24px] text-[#3d3d3d]">
                    {d.texte}
                  </p>
                  <div className="mt-6 border-t border-[#e3e3e3] pt-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                      Ce qu&apos;on mesurera ensemble
                    </div>
                    <p className="mt-2 text-[14px] leading-[22px] text-[#050505]">
                      {d.mesure}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="r-note mt-8 max-w-[66ch]">
              Aucun montant n&apos;est avancé sur cette page. Le chiffrage se
              fait pendant l&apos;audit, sur vos propres documents — un chiffre
              qu&apos;on ne peut pas vérifier chez vous ne vaut rien.
            </p>
          </div>
        </section>

        {/* ═══ 3 — les remèdes immédiats, sans Omega ═══ */}
        <section className="r-nuit">
          <div className="r-wrap py-14 sm:py-20">
            <p className="r-note">
              À utiliser dès aujourd&apos;hui, gratuitement, sans nous — avec
              ChatGPT ou Claude.
            </p>
            <h2 className="r-h2 mt-6 max-w-[20ch]">
              Trois choses à faire dès cette semaine
            </h2>
            <p className="r-lead mt-6 max-w-[58ch]">
              L&apos;audit commence par ce qu&apos;on vous donne. Ces trois
              gestes ne remplacent pas un moteur — ils se font à la main, un
              par un — mais ils rapportent dès cette semaine, que l&apos;on
              travaille ensemble ou non.
            </p>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {audit.remedes.map((r) => (
                <div
                  key={r.titre}
                  data-reveal
                  className="flex h-full flex-col rounded-2xl border border-[#27272a] bg-[#141417] p-7"
                >
                  <h3 className="r-h4">{r.titre}</h3>
                  <p className="mt-4 text-[15px] leading-[24px] text-[#d4d4d8]">
                    {r.texte}
                  </p>
                  <div className="mt-6 flex-1 rounded-lg bg-[#0a0a0c] p-5">
                    <div className="font-mono text-[12.5px] leading-[21px] text-[#a1a1aa]">
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
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 4 — les moteurs qui répondent ═══ */}
        <section data-monde="clair" className="r-wrap py-14 sm:py-20">
          <p className="r-note">
            La version en continu des gestes ci-dessus — installée sur vos
            outils, sous votre validation.
          </p>
          <h2 className="r-h2 mt-6 max-w-[20ch]">
            Les moteurs qui répondent à ça
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {audit.moteurs.map((m) => (
              <Link
                key={m.system}
                href={`/offres/${m.system.toLowerCase()}`}
                data-reveal
                className="group flex h-full flex-col rounded-2xl bg-white p-7 transition-shadow hover:shadow-[0_2px_24px_rgba(5,5,5,0.08)] sm:p-9"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[15px] font-semibold tracking-[0.04em] text-[#050505]">
                    {m.system}
                  </span>
                  <span className="text-[12px] text-[#616161]">{m.douleurs}</span>
                </div>
                <p className="mt-4 flex-1 text-[15px] leading-[24px] text-[#3d3d3d]">
                  {m.raison}
                </p>
                <span className="r-lien mt-6 self-start text-[15px]">
                  Voir la fiche
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══ 5 — la suite ═══ */}
        <section data-monde="clair" className="r-blanc">
          <div className="r-wrap py-16 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="r-h2">La suite tient en un entretien</h2>
              <p className="r-lead mx-auto mt-6 max-w-[54ch]">
                Trente à quatre-vingt-dix minutes, gratuit, sans engagement. On
                vérifie ce document avec vous, on chiffre les postes sur vos
                propres fichiers, et la recommandation dit aussi ce qu&apos;il
                ne faut pas automatiser.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <a href={lienSuite(audit.entreprise)} className="r-btn r-btn--noir">
                  Caler l&apos;entretien
                </a>
                <Link href="/reserver-un-audit" className="r-btn r-btn--fil">
                  Voir les formats d&apos;audit
                </Link>
              </div>
              <p className="r-note mt-5">
                Ou directement — {CANAL_LABEL_PHRASE} : {CANAL_VALEUR}
              </p>
            </div>

            <p className="r-note mx-auto mt-14 max-w-[70ch] text-center">
              Page privée, préparée pour {audit.entreprise}&nbsp;: elle n&apos;est ni
              répertoriée sur le site, ni indexée par les moteurs de recherche.
              Aucun chiffre réel de l&apos;entreprise n&apos;y figure et rien de
              ce qui sera dit en entretien n&apos;y sera publié.
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
