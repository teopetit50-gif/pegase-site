import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { type Outil } from "@/components/integrations/FamilleOutils";
import OrbiteOutils from "@/components/integrations/OrbiteOutils";
import GrilleOutils from "@/components/integrations/GrilleOutils";
import FriseRaccordement from "@/components/integrations/FriseRaccordement";
import CartesSystemes from "@/components/integrations/CartesSystemes";
import { OUTILS } from "@/components/offres/MediaMoteurs";
import Cadre from "@/components/charte/Cadre";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Appel from "@/components/charte/Appel";
import Bouton from "@/components/charte/Bouton";
import { Scene } from "@/components/charte/Cartes";
import "@/components/charte/pages/integrations.css";
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
   22/11/2026 (Teo, « elle sert toujours à quelque chose ? Si oui, on a
   besoin de modifier son contenu ») — la page disait « sans le modifier »
   et « aucune migration », ce qui contredit l'accueil depuis qu'Omega est
   un logiciel de gestion : nous reprenons les données du logiciel actuel.
   Elle dit maintenant les deux chemins (vous passez sur Omega, ou vous
   gardez votre logiciel et les agents s'y branchent) avec les mots de
   l'accueil : « agent » et non « système », « audit » et non « diagnostic ».
   Mêmes sections, mêmes composants, mêmes outils : seuls les textes changent.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/integrations" },
  title: "Intégrations | Omega.AI",
  description:
    "Omega se branche sur vos outils (messagerie, tableur, WhatsApp, agenda, paiement, comptabilité) et reprend les données de votre logiciel actuel.",
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
      <Cadre>
        <div className="offres it-page">
          {/* ════════ 1 · LE TITRE DE PAGE, puis l'orbite des outils ════════ */}
          <Section>
            <EnTeteSection
              niveau={1}
              haut
              pastille="Intégrations"
              titre="Omega se branche sur vos outils et reprend vos données."
              chapo={
                <>
                  Messagerie, tableur, WhatsApp, agenda, paiement, comptabilité : Omega lit et écrit dans les outils où vos équipes travaillent déjà. Si Omega devient votre logiciel de gestion, nous reprenons vos données. Elles restent dans un espace dédié, chiffré, hébergé dans l&apos;Union européenne.
                </>
              }
              actions={
                <>
                  <Bouton href="/reserver-un-audit" icone="calendrier">
                    Réserver un audit offert
                  </Bouton>
                  <Bouton href="/gestion" icone="chevron">
                    Voir le logiciel
                  </Bouton>
                </>
              }
            />
            <div className="it-cellule">
              {/* 14/09 — les outils du client gravitent autour du noyau. La
                  ligne ci-dessous est sa légende. */}
              <Scene trame className="it-orbite">
                <OrbiteOutils />
              </Scene>
              <p className="it-legende">{TOTAL} outils raccordés à ce jour</p>
            </div>
          </Section>

          {/* ════════ 2 · LA GRILLE, PAR FAMILLE ════════ */}
          <Section>
            <div className="it-cellule it-grille">
              <GrilleOutils groupes={PAR_FAMILLE} />
            </div>
          </Section>

          {/* ════════ 3 · LE RACCORDEMENT ════════ */}
          <Section>
            <EnTeteSection
              pastille="Le raccordement"
              titre="Comment se passe le raccordement."
              chapo={
                <>
                  Toujours dans le même ordre : Omega lit d&apos;abord, écrit ensuite. Vous décidez de ce qui part.
                </>
              }
            />
            <div className="it-cellule">
              <FriseRaccordement />
            </div>
          </Section>

          {/* ════════ 4 · CE QUE CONSOMME CHAQUE AGENT ════════ */}
          <Section>
            <EnTeteSection
              pastille="Par agent"
              titre="Les outils dont chaque agent a besoin."
              chapo={
                <>
                  Les quatre agents et les outils qu&apos;ils utilisent le plus souvent. Un agent n&apos;a pas besoin de tous vos logiciels : seulement de ceux où se trouve l&apos;information.
                </>
              }
            />
            <CartesSystemes
              className="it-agents"
              systemes={MOTEUR_OUTILS.map((m) => ({
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
          </Section>

          {/* ════════ 5 · L'OUTIL MANQUANT ════════
              Les textes de <AppelOutil>, mot pour mot, dans le bandeau
              d'appel de l'accueil. */}
          <Appel
            pastille="Audit"
            titre={<>Votre outil n&apos;est pas dans la liste&nbsp;?</>}
            chapo={
              <>
                Cette liste n&apos;est pas une limite. Dès qu&apos;un outil donne accès à ses données, nous construisons le raccordement sur mesure. Sinon, nous vous le disons pendant l&apos;audit, pas après.
              </>
            }
            actions={
              <Bouton href="/reserver-un-audit" icone="calendrier">
                En parler pendant l&apos;audit
              </Bouton>
            }
          />
        </div>
      </Cadre>
    </PageShell>
  );
}
