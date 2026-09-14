import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import PageShell from "@/components/PageShell";
import Fond from "@/components/produits/factures/Fond";
import Apparition from "@/components/produits/factures/Apparition";
import {
  StarButton,
  BoutonPlein,
  Chevrons,
} from "@/components/produits/factures/ui/star-button";
import { LogoMarquee } from "@/components/produits/factures/ui/logo-marquee";
import Bento from "@/components/produits/factures/Bento";
import Francais from "@/components/produits/factures/Francais";
import Chiffres from "@/components/produits/factures/Chiffres";
import Faq from "@/components/produits/factures/Faq";
import Paliers from "@/components/produits/factures/Paliers";
import { Marque } from "@/components/produits/factures/Marque";
import {
  Vitrine,
  PanneauFile,
  PanneauTableau,
} from "@/components/produits/factures/Maquettes";
import {
  MARQUE, HERO, BANDEAU, PRINCIPE, FONCTIONNEMENT, SUIVI, FRANCAIS,
  GARDE_FOUS, CONFORMITE, FAQ, FINAL,
} from "@/lib/produits/factures";
import "./factures.css";

/* ══════════════════════════════════════════════════════════════════════
   /offres/factures-fournisseurs — FILED

   RAPATRIÉE LE 11/09/2026 depuis la page d'accueil du site SaaS autonome
   OMEGA/filed-site (décalque du gabarit qronos, relevé au style calculé
   le 09/09). Elle REMPLACE la page produit qu'`app/offres/[system]/`
   rendait pour ce slug : Next donne la priorité au segment statique,
   donc tous les liens existants vers /offres/factures-fournisseurs
   tombent ici sans une seule redirection à poser.

   Le relevé de la référence — type, rythme vertical, cadre, couleurs —
   est recopié en tête de `factures.css`, avec la liste de ce que le
   rapatriement a changé. Lire ce fichier-là avant de toucher à une
   valeur : les nombres ci-dessous ne sont pas estimés, ils sont lus.

   LES SIX RÈGLES D'INTÉGRATION, APPLIQUÉES ICI :
     1. enveloppée dans PageShell — l'entête et le pied viennent de là ;
     2. les jetons sont sous `.p-factures`, jamais sur :root ;
     3. les utilitaires nées du @theme du site source n'existent pas ici
        et ne peignaient RIEN, sans erreur : toutes converties (table
        complète dans factures.css) ;
     4. aucune bascule clair/sombre portée ; la page est figée dans son
        monde CLAIR depuis le 11/09 — elle était la seule des quatre
        pages produit à être sombre. Chaque section porte
        `data-monde="clair"`, comme chez les trois sœurs. La palette et
        les gestes qui ont dû être REPENSÉS plutôt qu'inversés (le
        tissage du héros, les voiles, les biseaux, le sens des dégradés
        de jauge, les deux rouges) sont détaillés en tête de
        factures.css, section « LE PASSAGE EN CLAIR » ;
     5. Figtree est importée ICI, pas dans le layout, et `font-family`
        est écrite explicitement dans `.p-factures` ;
     6. appels à l'action réaiguillés — `/commencer` (la porte du site
        SaaS, qui ne vient pas) devient `/reserver-un-audit`. L'entête,
        le pied et la signature Ω du site source sont supprimés : le site
        EN EST un.

   PAS DE `PageMotion` ICI. Il anime `[data-reveal]` / `[data-intertitre]`
   au GSAP ; cette page a son propre mécanisme d'apparition (`Apparition`,
   additif — voir le commentaire du composant). Les deux superposés
   feraient jouer deux entrées sur les mêmes blocs.
   ══════════════════════════════════════════════════════════════════════ */

/* RÈGLE 5 — la police s'importe dans la page, pas dans le layout.
   Substitut libre de la « Google Sans » que la référence déclare et
   n'embarque pas (police sous licence). Voir l'en-tête de factures.css.
   La variable est posée sur le conteneur `.p-factures` ci-dessous ; la
   `font-family` qui la consomme est écrite explicitement dans le CSS de
   portée, parce que la règle de police du site est posée plus haut, sur
   <html>, avec Inter. */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-figtree",
  display: "swap",
});

/* Reprise du <title>/<description> que le site SaaS portait dans son
   layout. Le titre suit la convention du site (« … | Omega.AI ») et
   reprend le libellé déjà publié pour ce slug dans lib/content.ts, pour
   qu'un lien indexé ne change pas de nom. La description est celle du
   site source, ramenée sous les ~160 caractères que Google affiche (la
   phrase « Un système Omega » finale saute : sur omegaai.fr elle ne dit
   plus rien). */
export const metadata: Metadata = {
  title: "FILED · flux documentaires | Omega.AI",
  description:
    "Vous connectez une messagerie. Chaque facture fournisseur est lue quel qu'en soit le format, ses montants recoupés, la pièce classée et transmise à votre comptabilité.",
};

/* Cadre de section relevé sur la référence : max-w-[1400px] mx-auto
   px-[15px] lg:px-14 — puis un décalage de mx-5 sur les contenus à
   partir de lg.

   Il survit tel quel au rapatriement : le <main> de PageShell plafonne à
   1440px, soit 1438 utiles une fois son filet latéral retiré. Aux cinq
   largeurs de recette (390, 768, 1024, 1280, 1440) ce plafond ne mord
   jamais — c'est ce cadre-ci qui arrête le contenu. */
const CADRE = "mx-auto w-full max-w-[1400px] px-[15px] lg:px-14";

/* Le titre de section : deux lignes, la seconde en muted, 37px puis 48px
   à lg, interlignage .95, tracking -0.025em. Le paragraphe occupe les
   5 colonnes de droite, aligné sur le bas du titre. */
function TitreSection({
  titre1, titre2, para,
}: { titre1: string; titre2: string; para: string }) {
  return (
    <div className="relative mb-10 lg:mb-32">
      <div className="mx-0 grid items-end gap-8 lg:mx-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Apparition>
            <h2 className="font-display text-[28px] leading-[0.98] tracking-[-0.025em] sm:text-[37px] sm:leading-[0.95] lg:text-[48px]">
              <span className="block text-[#171717]">{titre1}</span>
              <span className="mt-1 block text-[#737373] lg:mt-3">{titre2}</span>
            </h2>
          </Apparition>
        </div>
        <div className="lg:col-span-5 lg:pb-4">
          <Apparition delai={200}>
            <p className="text-[16px] leading-relaxed text-[#737373] sm:text-xl">{para}</p>
          </Apparition>
        </div>
      </div>
    </div>
  );
}

/* Le filet de 40px qui sépare deux sections dans la référence. */
function Filet() {
  return (
    <div className="relative mx-auto h-6 w-full max-w-[1344px] lg:h-10 lg:w-[calc(100%-3.5rem)]">
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#171717]/[0.09]" />
    </div>
  );
}


export default function PageFactures() {
  return (
    <PageShell>
      {/* `relative` : c'est ce conteneur qui sert d'origine aux rails
          verticaux ci-dessous. La classe de portée y est posée avec la
          variable de Figtree — les deux vont ensemble (règle 5). */}
      <div data-monde="clair" className={`p-factures relative ${figtree.variable}`}>
        {/* Rails verticaux de la référence, purement décoratifs.
            ÉTAIENT `fixed inset-y-0 z-[51]` sur le site source, où la page
            EST le document : ils couraient d'un bord à l'autre de la
            fenêtre et passaient au-dessus de tout. Ici ce serait deux
            traits blancs par-dessus l'entête du site (z-50) et par-dessus
            son pied. Ils deviennent `absolute` dans le conteneur de page :
            ils courent la hauteur de la page produit, ce qui est ce que la
            référence donnait à voir, et rien de plus. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-full max-w-[1400px] -translate-x-1/2"
        >
          <div className="absolute inset-y-0 left-[15px] w-px bg-[#171717]/[0.08] lg:left-14" />
          <div className="absolute inset-y-0 right-[15px] w-px bg-[#171717]/[0.08] lg:right-14" />
        </div>

        {/* ── Héros ───────────────────────────────────────────────────
             `min-h-screen` sur le site source, où l'entête était `fixed
             top-3` : elle flottait AU-DESSUS du héros, qui occupait donc
             exactement le premier écran. L'entête du site, elle, est
             `sticky top-0` — DANS le flux, 64 px puis 72 px à partir de
             sm. Laisser 100vh ici ajoutait la hauteur de la barre au
             premier écran et poussait le bandeau qui défile (posé à
             `bottom-12` du héros) sous le pli — alors qu'il fait partie
             de ce que la référence montre d'emblée. On retranche donc
             l'entête : c'est la traduction du relevé, pas un écart. */}
        <section data-monde="clair" className="relative flex min-h-[calc(100vh-4rem)] flex-col items-start justify-center overflow-hidden bg-white sm:min-h-[calc(100vh-4.5rem)]">
          <Fond />
          <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-28 sm:px-8 sm:py-32 lg:px-14 lg:py-40">
            <div className="mx-auto flex max-w-full flex-col items-center text-center">
              {/* LE SEUL AJOUT DU RAPATRIEMENT. Le nom du produit ne vivait
                  que dans l'entête et le pied du site source ; les deux
                  sautent (règle 6), et la page produit de FILED ne
                  se serait plus nommée nulle part. Il est récupéré ici,
                  au-dessus du titre, où une page produit se nomme.
                  `filed-mark.png` est un MASQUE ALPHA : un <img>
                  n'afficherait rien, `Marque` le pose en mask-image sur un
                  fond `currentColor` — d'où la couleur par `text-`. */}
              <Apparition>
                <div className="mb-6 inline-flex items-center gap-2.5 sm:mb-8">
                  <Marque className="size-5 text-[#171717]" />
                  <span className="font-display text-[15px] tracking-[-0.01em] text-[#171717] sm:text-[17px]">
                    {MARQUE.nom}
                  </span>
                </div>
              </Apparition>

              <div className="mb-6">
                <Apparition>
                  <h1 className="relative z-10 max-w-[22rem] text-balance text-center font-display text-[clamp(2rem,9vw,2.5rem)] leading-[0.96] tracking-[-0.025em] text-[#171717] sm:max-w-[46rem] sm:text-[clamp(2rem,4.6vw,4.5rem)] sm:leading-[0.92]">
                    <span className="block">{HERO.titre1}</span>
                    <span className="block bg-gradient-to-b from-[#171717] via-[#3f3f46] to-[#71717b] bg-clip-text text-transparent">
                      {HERO.titre2}
                    </span>
                  </h1>
                </Apparition>
              </div>

              <Apparition delai={150}>
                <p className="relative z-0 mb-8 max-w-[22rem] text-balance text-center text-sm leading-relaxed text-[#2b2b2b] sm:mb-10 sm:max-w-[42rem] sm:text-base lg:text-lg">
                  <span className="block">{HERO.para1}</span>
                  <span className="block">{HERO.para2}</span>
                </p>
              </Apparition>

              <Apparition delai={250}>
                <div className="flex w-full flex-col items-center justify-center gap-3 min-[390px]:flex-row">
                  {/* Dans la référence, l'action principale est le bouton
                      SOMBRE à lumière tournante ; le bouton plein blanc est
                      le secondaire. Ne pas réinverser.
                      RÈGLE 6 — `/commencer` était la porte du site SaaS ;
                      elle ne vient pas. La porte de conversion du site est
                      /reserver-un-audit. */}
                  <StarButton href="/reserver-un-audit">
                    {HERO.cta1}
                    <Chevrons />
                  </StarButton>
                  <BoutonPlein href="#principe">{HERO.cta2}</BoutonPlein>
                </div>
              </Apparition>

              <Apparition delai={350}>
                <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-[#737373]">
                  {MARQUE.endos}
                </p>
              </Apparition>
            </div>
          </div>

          {/* Le bandeau qui défile, posé comme dans la référence :
              absolute bottom-12, masqué aux deux bords. */}
          <div className="absolute bottom-12 left-0 right-0 z-10">
            <Apparition delai={500}>
              <LogoMarquee items={BANDEAU} />
            </Apparition>
          </div>
        </section>

        {/* ── L'ORDRE DES SECTIONS EST UNE ALTERNANCE ───────────────
             composant · texte · composant · texte · composant · texte.
             Trois sections à maquettes qui se suivent, puis trois murs
             de texte : la page se lisait en deux blocs. Ne pas regrouper
             à nouveau les sections à maquettes.

             Contrainte qui prime sur l'alternance : la PREUVE
             (garde-fous, français) reste avant le PRIX (tarifs). */}

        {/* ── Le principe ───────────────────────────────────────────── */}
        <section data-monde="clair" id="principe" className="relative overflow-hidden pt-16 pb-12 lg:pt-32 lg:pb-20">
          <div className={CADRE}>
            <TitreSection titre1={PRINCIPE.titre1} titre2={PRINCIPE.titre2} para={PRINCIPE.para} />
            <Apparition>
              <Vitrine>
                <PanneauFile />
              </Vitrine>
            </Apparition>

            {/* Trois paragraphes remplacés par des chiffres. Chacun est
                vérifiable sur le produit — aucun n'est une performance
                commerciale, FILED n'a pas de client. */}
            <div className="mt-14 lg:mt-20">
              <Apparition>
                <Chiffres />
              </Apparition>
            </div>
          </div>
        </section>

        <Filet />

        {/* ── Garde-fous — remplace la section témoignages ──────────── */}
        <section data-monde="clair" id="garde-fous" className="relative overflow-hidden pt-16 pb-12 lg:pt-32 lg:pb-20">
          <div className={CADRE}>
            <TitreSection
              titre1={GARDE_FOUS.titre1}
              titre2={GARDE_FOUS.titre2}
              para={GARDE_FOUS.para}
            />

            <div className="mx-0 grid gap-4 lg:mx-5 lg:grid-cols-2">
              {GARDE_FOUS.cartes.map((c, i) => (
                <Apparition key={c.titre} delai={i * 120}>
                  <div className="flex h-full flex-col rounded-xl border border-[#171717]/[0.17] bg-[#fafafa] p-8">
                    <h3 className="font-display text-[20px] leading-tight tracking-[-0.02em] text-[#171717] sm:text-[24px]">
                      {c.titre}
                    </h3>
                    <p className="mt-4 flex-1 text-[15px] leading-relaxed text-[#737373] sm:hidden">
                      {c.court}
                    </p>
                    <p className="mt-4 hidden flex-1 text-[16px] leading-relaxed text-[#737373] sm:block">
                      {c.texte}
                    </p>
                    <ul className="mt-8 space-y-3 border-t border-[#171717]/[0.15] pt-6">
                      {c.faits.map((f) => (
                        <li key={f} className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#5f5f5f]">
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Apparition>
              ))}
            </div>

            <Apparition delai={200}>
              <details className="group mx-0 mt-4 rounded-xl border border-[#171717]/[0.11] bg-[#f5f5f5] p-6 sm:p-8 lg:mx-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[#737373] [&::-webkit-details-marker]:hidden">
                  {CONFORMITE.titre}
                  <span
                    aria-hidden="true"
                    className="text-[16px] leading-none text-[#8f8f8f] transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#737373] sm:text-[16px]">
                  {CONFORMITE.texte}
                </p>
              </details>
            </Apparition>
          </div>
        </section>

        <Filet />

        {/* ── Fonctionnement ────────────────────────────────────── */}
        <section data-monde="clair" id="fonctionnement" className="relative overflow-hidden py-16 lg:py-32">
          <div className={CADRE}>
            <TitreSection
              titre1={FONCTIONNEMENT.titre1}
              titre2={FONCTIONNEMENT.titre2}
              para={FONCTIONNEMENT.para}
            />
            <Apparition>
              <Bento />
            </Apparition>
          </div>
        </section>

        <Filet />

        {/* ── Un produit français ─────────────────────────────────
             Placé avant les tarifs : la preuve précède le prix. */}
        <section data-monde="clair" id="francais" className="relative overflow-hidden pt-16 pb-12 lg:pt-32 lg:pb-20">
          <div className={CADRE}>
            <TitreSection
              titre1={FRANCAIS.titre1}
              titre2={FRANCAIS.titre2}
              para={FRANCAIS.para}
            />
            <Apparition>
              <Francais />
            </Apparition>
          </div>
        </section>

        <Filet />

        {/* ── Suivi ─────────────────────────────────────────────────── */}
        <section data-monde="clair" id="suivi" className="relative overflow-hidden pt-16 pb-12 lg:pt-32 lg:pb-20">
          <div className={CADRE}>
            <TitreSection titre1={SUIVI.titre1} titre2={SUIVI.titre2} para={SUIVI.para} />
            <Apparition>
              <Vitrine>
                <PanneauTableau />
              </Vitrine>
            </Apparition>
          </div>
        </section>

        <Filet />

        {/* ── Tarifs ────────────────────────────────────────────────── */}
        <section data-monde="clair" id="tarifs" className="relative overflow-hidden pt-16 pb-12 lg:pt-32 lg:pb-20">
          <div className={CADRE}>
            {/* « pas au nombre de sièges » : du jargon de SaaS américain
                qu'un artisan ne dit pas au téléphone. Le chapô disait
                déjà la même chose en français. */}
            <TitreSection
              titre1="Vous payez les pièces,"
              titre2="pas les utilisateurs."
              para="Le prix suit le nombre de pièces qui passent, pas le nombre de personnes qui regardent. Vous changez de palier d'un mois sur l'autre."
            />
            <Apparition>
              <Paliers />
            </Apparition>

            <Apparition>
              <p className="mx-0 mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-[#737373] lg:mx-5">
                Montants en cours d&apos;arbitrage&nbsp;: le palier se choisit sur vos volumes réels.
              </p>
            </Apparition>
          </div>
        </section>

        <Filet />

        {/* ── Questions ────────────────────────────────────────────
             Le bloc qui absorbe le plus de texte pour le moins de
             hauteur. Il ferme la série, juste après le prix. */}
        <section data-monde="clair" id="questions" className="relative overflow-hidden pt-16 pb-12 lg:pt-32 lg:pb-20">
          <div className={CADRE}>
            <TitreSection titre1={FAQ.titre1} titre2={FAQ.titre2} para={FAQ.para} />
            <Apparition>
              <Faq />
            </Apparition>
          </div>
        </section>

        <Filet />


        {/* ── Appel final ───────────────────────────────────────────── */}
        <section data-monde="clair" className="relative overflow-hidden py-16 lg:py-32">
          <div className={CADRE}>
            <div className="mx-0 flex flex-col items-center text-center lg:mx-5">
              <Apparition>
                <h2 className="max-w-[24rem] text-balance font-display text-[32px] leading-[0.95] tracking-[-0.025em] sm:max-w-none sm:text-[37px] lg:text-[48px]">
                  <span className="block text-[#171717]">{FINAL.titre1}</span>
                  <span className="mt-1 block text-[#737373] lg:mt-3">{FINAL.titre2}</span>
                </h2>
              </Apparition>
              <Apparition delai={150}>
                <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#737373] sm:mt-6 sm:text-lg">
                  {FINAL.para}
                </p>
              </Apparition>
              <Apparition delai={250}>
                <div className="mt-10 flex flex-col items-center justify-center gap-3 min-[390px]:flex-row">
                  <StarButton href="/reserver-un-audit">
                    {HERO.cta1}
                    <Chevrons />
                  </StarButton>
                  <BoutonPlein href="#principe">{HERO.cta2}</BoutonPlein>
                </div>
              </Apparition>
            </div>
          </div>
        </section>

        <Filet />
      </div>
    </PageShell>
  );
}
