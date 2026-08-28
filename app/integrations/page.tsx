import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { SystemLogo } from "@/components/logos";
import FamilleOutils, { type Outil } from "@/components/integrations/FamilleOutils";
import { Chevron, OUTILS } from "@/components/offres/MediaMoteurs";
import {
  FAMILLES_OUTILS,
  MOTEUR_OUTILS,
  OUTIL_INFOS,
  RACCORDEMENT,
  type Famille,
} from "@/lib/integrations";

/* ══════════════════════════════════════════════════════════════════════
   /integrations — « Sur quoi ça se branche » (30/07/2026)

   Page de référence : ocoya.com/integrations. C'était le dernier design
   inexploité de leur sitemap avec /pricing — et le seul des deux qui
   comblait un vrai manque : « est-ce que ça marche avec MON outil ? » est la
   première objection d'un artisan, et le site n'y répondait que par un
   bandeau de logos qui défile sur la home.

   La référence appartient au même monde que /offres (même charte, mêmes
   cartes) : aucun CSS nouveau, tout passe par les classes .o-*. Relevé au
   pixel sur viewport 1440 :

     H1 en 48/67,2 ls −1,92 — soit l'échelle des H2, pas celle du H1 de
     /offres. D'où la classe .o-h2 sur une balise h1 : le niveau sémantique
     reste juste, la mesure typographique aussi.
     Cartes 270×261, rayon 15, padding 30, ombre à quatre passes (= .o-card),
     pastille de logo ronde de 60, nom 16/28,8 w500, famille 14/25,2,
     description 16/28,8 en #71717a, lien 12/14,4 w500.

   Écart assumé : la référence tient en trois sections — hero, grille, fin.
   C'est très maigre pour une page qui doit lever une objection, donc les
   familles structurent la grille, et deux sections suivent (le déroulé du
   raccordement, puis ce que consomment les quatre moteurs les plus
   installés). Rien d'inventé : les 28 outils sont ceux déjà déclarés dans
   MediaMoteurs, et chaque phrase décrit un usage réel. Ce sont les outils
   DU CLIENT : aucun outil de notre propre stack n'a sa place ici (n8n en a
   été retiré le 14/08 — voir le garde-fou en tête d'OUTILS).

   07/08/2026 — 29 cartes ouvertes d'un coup, c'était trop (Teo). Chaque
   famille n'ouvre plus que sur sa première carte, le reste passe derrière
   un « Voir plus » : voir components/integrations/FamilleOutils.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Intégrations | Omega.AI",
  description:
    "Les moteurs Omega.AI se branchent sur les outils que vous avez déjà : messagerie, tableur, WhatsApp, agenda, paiement, comptabilité. Ni compte à créer, ni migration : vos données vivent dans un espace dédié, chiffré, hébergé dans l'UE.",
};

/* Regroupement par famille, dans l'ordre déclaré. Un outil sans fiche
   n'apparaît pas : on ne comble pas un manque par une phrase inventée.
   Le logo est aplati ici (title/hex/path) : FamilleOutils est un composant
   client, il ne doit recevoir que du sérialisable — surtout pas le module
   simple-icons entier, qui partirait alors dans le bundle. */
const PAR_FAMILLE: { famille: Famille; outils: Outil[] }[] = FAMILLES_OUTILS.map(
  (famille) => ({
    famille,
    outils: OUTILS.filter((o) => OUTIL_INFOS[o.title]?.famille === famille).map(
      (o) => ({
        title: o.title,
        hex: o.hex,
        path: o.path,
        famille: OUTIL_INFOS[o.title].famille,
        role: OUTIL_INFOS[o.title].role,
      })
    ),
  })
).filter((g) => g.outils.length > 0);

const TOTAL = PAR_FAMILLE.reduce((n, g) => n + g.outils.length, 0);

export default function Integrations() {
  return (
    <PageShell>
      <PageMotion />

      <div className="offres">
        {/* ════════ 1 · HERO — centré sur fond gris pointillé ════════ */}
        <section
          data-monde="clair"
          className="o-gris relative overflow-hidden pb-[90px] pt-[60px] sm:pb-[110px] sm:pt-[90px]"
        >
          <div
            aria-hidden
            className="o-dots o-dots-fade pointer-events-none absolute inset-x-0 top-0 h-[700px]"
          />
          <div className="o-wrap relative flex flex-col items-center text-center">
            <div data-reveal>
              <span className="o-pill o-pill--xs">INTÉGRATIONS</span>
            </div>
            {/* .o-h2 sur un h1 : c'est l'échelle de la référence (48/67,2) */}
            <h1 data-reveal className="o-h2 mt-4 max-w-[720px]">
              Ça se branche sur ce que vous avez déjà.
            </h1>
            <p data-reveal className="o-lead mt-5 max-w-[640px]">
              Messagerie, tableur, WhatsApp, agenda, paiement, comptabilité :
              les moteurs lisent et écrivent là où vous travaillez. Ni compte à
              créer, ni migration, ni logiciel à apprendre, et vos données
              vivent dans un espace dédié, chiffré, hébergé dans l&apos;Union
              européenne.
            </p>
            <div data-reveal className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/offres" className="o-btn o-btn--primary">
                Vérifier avec vos outils
              </Link>
              <Link href="/offres" className="o-btn o-btn--ghost">
                Voir les moteurs
                <Chevron taille={13} />
              </Link>
            </div>
            <p data-reveal className="o-small mt-6">
              {TOTAL} outils raccordés à ce jour
            </p>
          </div>
        </section>

        {/* ════════ 2 · LA GRILLE, PAR FAMILLE ════════ */}
        <section data-monde="clair" className="py-[100px]">
          <div className="o-wrap">
            {PAR_FAMILLE.map((g, i) => (
              <FamilleOutils
                key={g.famille}
                famille={g.famille}
                outils={g.outils}
                className={i > 0 ? "mt-16" : undefined}
              />
            ))}
          </div>
        </section>

        {/* ════════ 3 · LE RACCORDEMENT ════════ */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <div className="flex flex-col items-center text-center">
              <div data-reveal>
                <span className="o-pill o-pill--xs">LE RACCORDEMENT</span>
              </div>
              <h2 data-reveal className="o-h2 mt-4 max-w-[600px]">
                Comment un moteur se branche.
              </h2>
              <p data-reveal className="o-lead mt-4 max-w-[650px]">
                Toujours dans le même ordre, et toujours en lecture avant
                l&apos;écriture. C&apos;est ce qui garantit qu&apos;aucun
                message ne part sur des données fausses.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {RACCORDEMENT.map((e, i) => (
                <div key={e.n} data-reveal className="relative flex flex-col">
                  {i < RACCORDEMENT.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-9 right-0 top-[15px] hidden h-px bg-[#e4e4e7] lg:block"
                    />
                  )}
                  <span className="relative z-10 inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#09090b] text-[12px] font-semibold text-white">
                    {e.n}
                  </span>
                  <h3 className="o-h5 mt-5">{e.titre}</h3>
                  <p className="o-small mt-2.5 !text-[15px] !leading-[24px]">
                    {e.texte}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 4 · CE QUE CONSOMME CHAQUE MOTEUR ════════ */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <div className="flex flex-col items-center text-center">
              <div data-reveal>
                <span className="o-pill o-pill--xs">PAR MOTEUR</span>
              </div>
              <h2 data-reveal className="o-h2 mt-4 max-w-[620px]">
                Qui se branche sur quoi.
              </h2>
              <p data-reveal className="o-lead mt-4 max-w-[650px]">
                Les quatre moteurs les plus installés et les outils qu&apos;ils
                consomment réellement. Un moteur n&apos;a pas besoin de toute
                votre pile : seulement de ce qui porte l&apos;information.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MOTEUR_OUTILS.map((m) => (
                <Link
                  key={m.system}
                  href={`/offres/${m.slug}`}
                  data-reveal
                  className="o-card-soft flex flex-col p-7 transition-colors duration-200 hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <SystemLogo system={m.system} />
                    <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#09090b]">
                      {m.system}
                    </span>
                  </div>
                  <p className="o-small mt-3 !text-[15px] !text-[#52525b]">
                    {m.role}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {m.outils.map((t) => {
                      const marque = OUTILS.find((o) => o.title === t);
                      if (!marque) return null;
                      return (
                        <span
                          key={t}
                          title={t}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e4e4e7] bg-white"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill={`#${marque.hex}`}
                            role="img"
                            aria-label={t}
                          >
                            <path d={marque.path} />
                          </svg>
                        </span>
                      );
                    })}
                  </div>
                  <span className="o-link mt-6 !text-[14px]">
                    Voir la fiche
                    <Chevron taille={12} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 5 · L'OUTIL MANQUANT ════════ */}
        <section data-monde="clair" className="pb-[120px]">
          <div className="o-wrap">
            <div className="o-card flex flex-col items-center px-8 py-14 text-center sm:px-16 sm:py-16">
              <h2 data-reveal className="o-h2 max-w-[620px]">
                Votre outil n&apos;est pas dans la liste ?
              </h2>
              <p data-reveal className="o-lead mt-5 max-w-[620px]">
                Cette liste n&apos;est pas une limite, c&apos;est ce qui est
                déjà raccordé. Dès qu&apos;un outil expose ses données, un
                moteur peut s&apos;y brancher, et si ce n&apos;est pas le cas,
                on vous le dit pendant l&apos;audit plutôt qu&apos;après.
              </p>
              <div data-reveal className="mt-8">
                <Link
                  href="/tarifs"
                  className="o-btn o-btn--primary"
                >
                  En parler au premier rendez-vous
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
