import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { type Outil } from "@/components/integrations/FamilleOutils";
import OrbiteOutils from "@/components/integrations/OrbiteOutils";
import GrilleOutils from "@/components/integrations/GrilleOutils";
import FriseRaccordement from "@/components/integrations/FriseRaccordement";
import CartesSystemes from "@/components/integrations/CartesSystemes";
import AppelOutil from "@/components/integrations/AppelOutil";
import { Chevron, OUTILS } from "@/components/offres/MediaMoteurs";
import {
  FAMILLES_OUTILS,
  MOTEUR_OUTILS,
  OUTIL_INFOS,
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

   14/09/2026 — REFONTE par composants repris. Mêmes sections, mêmes textes,
   mêmes liens ; ce qui change est la matière :
     1. hero     + <OrbiteOutils>      (Magic UI « orbiting-circles » : deux
                                        anneaux d'outils clients autour du
                                        noyau ; le texte du hero ne bouge pas)
     2. grille   → <GrilleOutils>      (Tailark « integrations three » + les
                                        puces de filtre de /modeles : les 28
                                        outils sont tous dans le HTML)
     3. déroulé  → <FriseRaccordement> (Aceternity « timeline » couché à
                                        l'horizontale : le rail se remplit au
                                        défilement, plein sans JavaScript)
     4. systèmes → <CartesSystemes>    (Aceternity « card-hover-effect » : le
                                        lavis glisse d'une carte à l'autre)
     5. clôture  → <AppelOutil>        (shadcnblocks « cta4 », carte claire)
   <FamilleOutils> n'est plus appelé (orphelin, gardé le temps de la recette) ;
   seul son type Outil sert encore ici.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Intégrations | Omega.AI",
  description:
    "Les systèmes Omega.AI s'intègrent aux outils déjà en place : messagerie, tableur, WhatsApp, agenda, paiement, comptabilité. Aucun compte à créer, aucune migration : vos données vivent dans un espace dédié, chiffré, hébergé dans l'Union européenne.",
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
              Intégrés à votre environnement, sans le modifier.
            </h1>
            <p data-reveal className="o-lead mt-5 max-w-[640px]">
              Messagerie, tableur, WhatsApp, agenda, paiement, comptabilité : les systèmes lisent et écrivent dans les outils où vos équipes travaillent déjà. Aucun compte à créer, aucune migration, aucun logiciel à apprendre, et vos données restent dans un espace dédié, chiffré, hébergé dans l&apos;Union européenne.
            </p>
            <div data-reveal className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/offres" className="o-btn o-btn--primary">
                Vérifier la compatibilité
              </Link>
              <Link href="/offres" className="o-btn o-btn--ghost">
                Voir les systèmes
                <Chevron taille={13} />
              </Link>
            </div>
            {/* 14/09 — l'objet qui manquait : les outils du client gravitent
                autour du noyau. La ligne ci-dessous devient sa légende. */}
            <OrbiteOutils className="mt-14" />
            <p data-reveal className="o-small mt-6">
              {TOTAL} outils raccordés à ce jour
            </p>
          </div>
        </section>

        {/* ════════ 2 · LA GRILLE, PAR FAMILLE ════════ */}
        <section data-monde="clair" className="py-[100px]">
          <div className="o-wrap">
            <GrilleOutils groupes={PAR_FAMILLE} />
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
                Comment un système s&apos;intègre.
              </h2>
              <p data-reveal className="o-lead mt-4 max-w-[650px]">
                Toujours dans le même ordre, et toujours en lecture avant l&apos;écriture, ce qui garantit qu&apos;aucun message ne part sur des données erronées.
              </p>
            </div>
            <FriseRaccordement className="mt-16" />
          </div>
        </section>

        {/* ════════ 4 · CE QUE CONSOMME CHAQUE MOTEUR ════════ */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <div className="flex flex-col items-center text-center">
              <div data-reveal>
                <span className="o-pill o-pill--xs">PAR SYSTÈME</span>
              </div>
              <h2 data-reveal className="o-h2 mt-4 max-w-[620px]">
                Ce que chaque système consomme.
              </h2>
              <p data-reveal className="o-lead mt-4 max-w-[650px]">
                Les quatre systèmes les plus déployés et les outils qu&apos;ils consomment réellement. Un système n&apos;a pas besoin de tout votre système d&apos;information, seulement des outils qui portent l&apos;information.
              </p>
            </div>
            <CartesSystemes
              className="mt-16"
              systemes={MOTEUR_OUTILS.map((m) => ({
                system: m.system,
                slug: m.slug,
                role: m.role,
                /* aplati ici comme PAR_FAMILLE : CartesSystemes est un
                   composant client, il ne reçoit que du sérialisable — jamais
                   le module simple-icons. Un outil sans logo n'affiche pas de
                   pastille, il n'est pas remplacé. */
                outils: m.outils.flatMap((t) => {
                  const marque = OUTILS.find((o) => o.title === t);
                  return marque
                    ? [{ title: marque.title, hex: marque.hex, path: marque.path }]
                    : [];
                }),
              }))}
            />
          </div>
        </section>

        {/* ════════ 5 · L'OUTIL MANQUANT ════════ */}
        <AppelOutil />
      </div>
    </PageShell>
  );
}
