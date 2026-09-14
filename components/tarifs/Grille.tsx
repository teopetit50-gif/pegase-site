"use client";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs v4 — la grille : trois paliers, choix des postes DANS la carte
   (28/08/2026)

   Chaque carte est autonome : « Un poste » se choisit comme une radio,
   « Trois postes » coche jusqu'à trois cases, « Tout Omega » n'a rien à
   choisir. Le bouton reste éteint tant que le compte n'y est pas — il
   affiche ce qui manque plutôt qu'un « continuer » grisé muet.

   Le CTA n'ouvre PAS WhatsApp et ne demande aucun paiement : il emmène
   vers /installation, la page de réservation de la réunion d'installation,
   avec les postes choisis dans l'URL. Le client enregistre carte ou mandat
   SEPA sur l'écran « Créneau réservé » de /installation (Stripe, rien de
   débité), et le premier prélèvement part quand l'agence finalise
   l'installation.

   02/09 — MENSUEL | ANNUEL (Teo : « un bouton en haut des cards pour
   switch, un pourcentage en moins pour l'annuel, met en évidence le prix
   économisé »). L'état est UN pour la grille — pas un par carte : on ne
   compare pas un palier mensuel à un palier annuel. En annuel, chaque
   carte montre le mensuel barré, le mensuel équivalent en grand, « facturé
   N € par an » et la ligne verte « Vous économisez … ». Le CTA porte
   `&periodicite=annuel` : /installation le lit et le récap le reprend,
   modifiable jusqu'au bout. Les montants sont DÉRIVÉS de lib/paliers.ts
   (prixAnnuel & co), jamais écrits ici.

   03/09 (relecture) — la périodicité fait aussi le chemin RETOUR :
   « Modifier mes postes » sur /installation renvoie `?periodicite=annuel`
   et la grille le relit dans l'URL. Lecture par useSyncExternalStore
   plutôt que useSearchParams : la page /tarifs reste STATIQUE (prix dans
   le HTML servi, pas de bascule client jusqu'au Suspense) et il n'y a ni
   effet qui pose un état, ni divergence d'hydratation — React rend
   d'abord l'instantané serveur (mensuel), puis celui du navigateur.

   ═══ 09/09/2026 — LE DESIGN DE LA GRILLE REFAIT (demande de Teo, qui a
   fourni le composant de référence « pricing-4 » de 21st.dev). La page
   quitte la composition héritée de /reserver-un-audit — colonne de gauche
   + trois cartes à grosse tête colorée — pour celle d'une page de prix
   moderne :
     · en-tête CENTRÉ (pastille, titre, chapô) puis le sélecteur
       Mensuel | Annuel centré juste dessous, au lieu de la colonne ;
     · trois cartes CERNÉES d'un filet, coins arrondis, ombre d'un pixel,
       chacune en quatre blocs séparés par des filets — tête (nom,
       promesse, prix), choix des postes, points, pied avec le bouton ;
     · le prix s'ANIME chiffre par chiffre à la bascule mensuel / annuel
       (@number-flow/react, la signature du composant de référence) ;
     · les pastilles passent en HAUT À DROITE de la carte, hors du flux :
       « Recommandé » avec l'étoile sur le palier phare, « Le plus
       complet » sur Tout Omega, et la remise annuelle en pastille noire
       qui n'apparaît qu'en annuel ;
     · la carte phare se détache par son filet doré, sa tête dorée, son
       corps voilé et sa pastille à l'étoile — le `scale-105` de la
       référence a été essayé puis retiré : sur des cartes de 1 500 px il
       décale la carte de 22 px et casse l'alignement des trois prix et
       des trois boutons (voir le bloc .tp- de globals.css) ;
     · les points du palier passent en liste à COCHES (CheckCircle), comme
       la référence, au lieu des puces rondes.
   Ce qui vivait dans la colonne de gauche n'est pas perdu : le sélecteur
   monte sous le chapô, « Compris à tous les paliers » (PULSE, VAULT et
   leurs liens) descend sous les cartes, et la ligne « Choisissez vos
   postes. L'installation est comprise. » disparaît — le titre et le
   chapô la disent déjà mot pour mot.
   Ce qui NE change pas : les trois teintes de tête décidées par l'associé
   le 08/09 (bleu, or, nuit — « on dirait que c'est la même chose »), la
   ligne d'argument « Le quatrième poste pour N € de plus », tous les
   textes de Teo, et la mécanique de sélection, d'URL et de périodicité.

   09/09, SECONDE PASSE — LE CHOIX DES POSTES MIS À NU (Teo, capture du
   composant de référence à l'appui : « c'est censé être de la même
   taille, et là tu as gardé les logos des moteurs ; c'est censé être
   simple comme sur le prompt »). Les tuiles `.rv-case` du 08/09 —
   cadre, tuile de logo de 44 px, nom PUIS ligne courte — pesaient 66 px
   pièce : cinq par carte, la carte montait à 1 500 px et le choix se
   lisait plus fort que le prix. Chaque poste est désormais UNE LIGNE :
   une case dessinée (ou une coche pour Tout Omega), le nom, rien
   d'autre — exactement le gabarit des points en dessous. La ligne
   « Un poste propre à votre métier » suit, un « + » à la place de la
   case. `Poste.court` et `SUR_MESURE.court` ne sont plus lus ici ; le
   champ reste dans lib/paliers.ts, il ne coûte rien.
   `.rv-case` n'est PAS retirée de globals.css :
   components/compte/AbonnementCarte.tsx s'en sert toujours.
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   14/09/2026 — LE MODÈLE « PRICING-SECTION-3 » (Teo, composant de
   référence fourni : ui-layouts, 21st.dev). Le design change, la
   mécanique de vente non (sélection exclusive, URL, périodicité).
     · l'en-tête passe À GAUCHE — titre révélé mot à mot en rideau
       (VerticalCutReveal), chapô — et le sélecteur Mensuel | Annuel se
       pose À DROITE sur la même ligne : pilule claire, curseur au dégradé
       gris qui glisse en ressort (layoutId) ;
     · les trois cartes vivent dans UN CADRE au dégradé gris ; deux sont
       transparentes et sans filet, la carte phare (« Trois postes ») est
       NOIRE, cerclée, grossie de 10 % dès 1024 px — en dessous les cartes
       s'empilent et l'échelle sauterait sur ses voisines ;
     · l'ordre de lecture est celui de la référence : pastille, le PRIX en
       premier, puis le nom en 30 px, la promesse, et les listes à
       pastilles rondes (CheckCheck) ;
     · le choix des postes garde son mécanisme : la pastille ronde est la
       case, vide puis cochée ; les points du palier suivent sous un
       second filet, même gabarit ;
     · le bouton est le grand bouton dégradé de la référence (20 px,
       coins 12) : clair sur la carte noire, sombre sur les claires ; tant
       que le compte n'y est pas il reste éteint et dit ce qui manque ;
     · les entrées : le titre en rideau, le reste en cascade floutée
       (TimelineContent, 0,4 s par cran, comme la référence).
   Ce qui part : les trois teintes de tête (bleu / or / nuit, décision de
   l'associé du 08/09) — ce design n'a qu'une carte qui se détache, la
   phare, et c'est le noir ; les pastilles de remise par carte (le
   sélecteur porte déjà −15 %, le prix barré et l'économie font le reste).
   Ce qui reste : « Le quatrième poste pour N € de plus » sur Tout Omega,
   tous les textes, l'ancre #grille et le scroll-mt.
   Les blocs .tp- et .rv-periode de globals.css partent avec ce commit :
   les styles sont des utilitaires Tailwind, comme la référence, et les
   pièces vivent dans components/ui (card, timeline-animation,
   vertical-cut-reveal). Les deux paragraphes sous les cartes passent de
   data-arrivee à data-reveal : la cascade d'Arrivee et celle de
   TimelineContent posent toutes deux l'opacité, elles se seraient
   battues sur les mêmes blocs.
   ═══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import NumberFlow, { type Format } from "@number-flow/react";
import { CheckCheck, Plus, Star } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import Partage from "@/components/Partage";
import { CallToAction4 } from "@/components/ui/call-to-action-4";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Comparator } from "@/components/ui/comparator-1";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { COURRIEL, lienContact, lienCourriel } from "@/lib/reservation";
import {
  COMPARATIF_PALIERS,
  COMPRIS,
  PALIERS,
  POSTES,
  REMISE_ANNUELLE,
  SUR_MESURE,
  economieAnnuelle,
  equivalentMensuel,
  lirePeriodicite,
  prixAnnuel,
  type Palier,
  type Periodicite,
} from "@/lib/paliers";

const REMISE_PCT = Math.round(REMISE_ANNUELLE * 100);

/* le prix en euros, sans centimes — le format que NumberFlow anime */
const FORMAT_EURO: Format = {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
};

/* la cascade floutée de la référence : chaque bloc arrive 0,4 s après le
   précédent, d'en haut, en se dé-floutant */
const VARIANTES_ENTREE: Variants = {
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { delay: i * 0.4, duration: 0.5 },
  }),
  hidden: { filter: "blur(10px)", y: -20, opacity: 0 },
};

/* ——— la périodicité venue de l'URL (`?periodicite=annuel`), côté
   navigateur seulement ; le serveur répond toujours « mensuel » ——— */
function souscrireUrl(rappel: () => void) {
  window.addEventListener("popstate", rappel);
  return () => window.removeEventListener("popstate", rappel);
}
function periodiciteDeLUrl(): Periodicite {
  return lirePeriodicite(new URLSearchParams(window.location.search).get("periodicite"));
}
function periodiciteServeur(): Periodicite {
  return "mensuel";
}

/* le lien de réservation d'un palier — « Tout Omega » n'a rien à choisir,
   il part droit sur /installation ; les deux autres renvoient aux cartes
   où le choix se fait */
function lienPalier(p: Palier, periodicite: Periodicite) {
  if (p.aChoisir !== null) return "#grille";
  const postes = POSTES.map((x) => x.id).join(",");
  return `/installation?postes=${postes}${periodicite === "annuel" ? "&periodicite=annuel" : ""}`;
}

/* 08/09 — le bouton d'un palier dans le comparatif :
   noir pour Trois postes ET Tout Omega, filet pour Un poste. */
function boutonPalier(p: Palier) {
  return p.id === "un" ? "r-btn--fil" : "r-btn--noir";
}

/* 08/09 — l'argument de Tout Omega : ce que coûte le quatrième poste par
   rapport à Trois postes. CALCULÉ depuis PALIERS, jamais écrit en dur ;
   en annuel on compare les équivalents mensuels, pour que la phrase reste
   vraie sous les chiffres affichés. */
function ecartQuatriemePoste(periodicite: Periodicite) {
  const trois = PALIERS.find((x) => x.id === "trois");
  const complet = PALIERS.find((x) => x.id === "complet");
  if (!trois || !complet) return null;
  const valeur = (p: Palier) => (periodicite === "annuel" ? equivalentMensuel(p.prix) : p.prix);
  return valeur(complet) - valeur(trois);
}

/* ——— la pastille ronde de la référence (h-6 w-6, CheckCheck) ———
   Elle sert trois fois : la case d'un poste à choisir (vide → cochée), la
   coche d'un point compris, le « + » de la ligne sur-mesure. Sur la carte
   noire elle prend les gris de la référence (neutral-600 / 500), sur les
   claires le blanc cerné de noir. `peer-focus-visible` : le vrai <input>
   est en sr-only juste avant elle, le focus clavier se voit ici. */
function Pastille({ sombre, etat }: { sombre: boolean; etat: "vide" | "coche" | "plus" }) {
  const teinte = sombre
    ? etat === "vide"
      ? "border-neutral-500 bg-transparent"
      : "border-neutral-500 bg-neutral-600 text-white"
    : "border-black bg-white text-black";
  return (
    <span
      aria-hidden
      className={`mr-3 mt-0.5 grid h-6 w-6 flex-none place-content-center rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-current ${teinte}`}
    >
      {etat === "coche" ? <CheckCheck className="h-4 w-4" /> : null}
      {etat === "plus" ? <Plus className="h-4 w-4" /> : null}
    </span>
  );
}

/* la cinquième ligne : même gabarit qu'un poste, un « + » dans la
   pastille, et toute la ligne est un lien vers la page sur-mesure */
function LigneSurMesure({ sombre }: { sombre: boolean }) {
  return (
    <li>
      <Link href={SUR_MESURE.href} className="group flex items-start">
        <Pastille sombre={sombre} etat="plus" />
        <span
          className={`text-sm underline-offset-4 group-hover:underline ${sombre ? "text-neutral-100" : "text-gray-600"}`}
        >
          {SUR_MESURE.nom}
        </span>
      </Link>
    </li>
  );
}

function CartePalier({
  p,
  choisis,
  bascule,
  periodicite,
}: {
  p: Palier;
  /* la sélection vit dans Grille : vide dès qu'un AUTRE palier est actif */
  choisis: string[];
  bascule: (id: string) => void;
  periodicite: Periodicite;
}) {
  const postes = p.aChoisir === null ? POSTES.map((x) => x.id) : choisis;
  const manque = p.aChoisir === null ? 0 : p.aChoisir - choisis.length;
  const pret = manque <= 0;
  const annuel = periodicite === "annuel";
  const sombre = Boolean(p.phare);
  const href = `/installation?postes=${postes.join(",")}${annuel ? "&periodicite=annuel" : ""}`;
  const ecart = p.id === "complet" ? ecartQuatriemePoste(periodicite) : null;
  const texteDoux = sombre ? "text-neutral-200" : "text-gray-600";
  const texteListe = sombre ? "text-neutral-100" : "text-gray-600";
  const filet = sombre ? "border-neutral-700" : "border-neutral-200";

  return (
    <Card
      className={`relative flex h-full flex-col justify-between ${
        sombre
          ? "border-transparent bg-gradient-to-t from-black to-neutral-900 text-white ring-2 ring-neutral-900 lg:scale-110"
          : "border-none bg-transparent pt-4 text-gray-900 shadow-none"
      }`}
    >
      <CardContent className="pt-0">
        <div className="space-y-2 pb-3">
          {/* la pastille : « Recommandé » à l'étoile sur la phare, « Le
              plus complet » sur Tout Omega — Un poste n'en a pas, son
              prix monte d'autant, comme Starter sur la référence */}
          {/* la ligne est RÉSERVÉE sur Un poste (pastille invisible) : les
              deux cartes claires qui encadrent la noire tombent ainsi sur
              la même ligne de prix — la référence laisse Starter monter,
              mais elle n'a qu'une carte claire de chaque côté à aligner */}
          <div className={`pt-4 ${p.badge ? "" : "invisible"}`} aria-hidden={!p.badge}>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                sombre ? "bg-neutral-600 text-white" : "border border-neutral-300 bg-white text-black"
              }`}
            >
              {p.phare ? <Star aria-hidden className="size-3 fill-current" /> : null}
              {p.badge ?? "\u00A0"}
            </span>
          </div>

          {/* le prix EN PREMIER. NumberFlow anime les chiffres à la
              bascule : il ne faut SURTOUT PAS le remonter par une clé ;
              seules les lignes qui l'entourent rejouent leur fondu */}
          <div className="flex flex-wrap items-baseline gap-x-2">
            <NumberFlow
              aria-label={`${annuel ? equivalentMensuel(p.prix) : p.prix} euros par mois`}
              className="text-4xl font-semibold tabular-nums"
              format={FORMAT_EURO}
              locales="fr-FR"
              value={annuel ? equivalentMensuel(p.prix) : p.prix}
            />
            <span className={texteDoux}>par mois</span>
            {annuel ? (
              <span
                key="barre"
                className={`rv-fondu text-sm font-medium line-through ${sombre ? "text-neutral-400" : "text-gray-500"}`}
              >
                <span className="sr-only">Au lieu de </span>
                {p.prix}&nbsp;€
              </span>
            ) : null}
          </div>

          <div key={periodicite} className="rv-fondu">
            <p className={`text-xs ${sombre ? "text-neutral-300" : "text-gray-500"}`}>
              {annuel
                ? `Facturé ${prixAnnuel(p.prix)} € par an, en une fois.`
                : "Facturé chaque mois, sans engagement."}
            </p>
            {annuel ? (
              <p
                className={`mt-2 inline-block rounded-lg px-2.5 py-1 text-[13px] font-semibold ${
                  sombre ? "bg-[rgba(159,216,178,0.14)] text-[#9fd8b2]" : "bg-[#e8f6ed] text-[#15753a]"
                }`}
              >
                Vous économisez {economieAnnuelle(p.prix)}&nbsp;€ par an
              </p>
            ) : null}
            {ecart !== null ? (
              <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-900">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-black" />
                Le quatrième poste pour {ecart}&nbsp;€ de plus.
              </p>
            ) : null}
          </div>
        </div>

        <h3 className="mb-2 font-[family-name:var(--font-jakarta)] text-3xl font-semibold tracking-[-0.02em]">
          {p.nom}
        </h3>
        <p className={`mb-4 text-sm ${texteDoux}`}>{p.promesse}</p>

        {/* le choix des postes — la pastille ronde est la case */}
        <div className={`space-y-3 border-t pt-4 ${filet}`}>
          {p.aChoisir !== null ? (
            /* min-w-0 : un fieldset a min-inline-size: min-content par
               défaut ; sans lui il dépasse de son bloc dans les cartes
               étroites */
            <fieldset className="min-w-0">
              <legend className="mb-3 text-base font-medium">
                {p.aChoisir === 1 ? "Choisissez votre poste :" : `Choisissez ${p.aChoisir} postes :`}
              </legend>
              <ul className="space-y-2 font-semibold">
                {POSTES.map((x) => {
                  const actif = choisis.includes(x.id);
                  const plein = !actif && p.aChoisir !== 1 && choisis.length >= (p.aChoisir ?? 0);
                  return (
                    <li key={x.id}>
                      <label
                        className={`flex items-start ${plein ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          checked={actif}
                          disabled={plein}
                          onChange={() => bascule(x.id)}
                          className="peer sr-only"
                        />
                        <Pastille sombre={sombre} etat={actif ? "coche" : "vide"} />
                        <span className={`text-sm ${texteListe}`}>{x.nom}</span>
                      </label>
                    </li>
                  );
                })}
                <LigneSurMesure sombre={sombre} />
              </ul>
            </fieldset>
          ) : (
            <div>
              <h4 className="mb-3 text-base font-medium">Les quatre postes, en service :</h4>
              <ul className="space-y-2 font-semibold">
                {POSTES.map((x) => (
                  <li key={x.id} className="flex items-start">
                    <Pastille sombre={sombre} etat="coche" />
                    <span className={`text-sm ${texteListe}`}>{x.nom}</span>
                  </li>
                ))}
                <LigneSurMesure sombre={sombre} />
              </ul>
            </div>
          )}
        </div>

        {/* les points du palier, même gabarit */}
        <div className={`mt-4 space-y-3 border-t pt-4 ${filet}`}>
          <h4 className="mb-3 text-base font-medium">Compris dans le palier :</h4>
          <ul className="space-y-2 font-semibold">
            {p.points.map((t) => (
              <li key={t} className="flex items-start">
                <Pastille sombre={sombre} etat="coche" />
                <span className={`text-sm ${texteListe}`}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex-col items-stretch">
        {pret ? (
          <Link
            href={href}
            className={`mb-3 w-full rounded-xl border p-4 text-center text-xl lg:text-lg xl:text-xl transition-[filter] hover:brightness-105 ${
              sombre
                ? "border-neutral-400 bg-gradient-to-t from-neutral-100 to-neutral-300 font-semibold text-black shadow-lg shadow-neutral-500"
                : "border-neutral-700 bg-gradient-to-t from-neutral-900 to-neutral-600 text-white shadow-lg shadow-neutral-900"
            }`}
          >
            Réserver l&apos;installation
          </Link>
        ) : (
          <span
            aria-disabled
            className={`mb-3 w-full rounded-xl border p-4 text-center text-xl lg:text-lg xl:text-xl ${
              sombre
                ? "border-neutral-700 bg-neutral-800 text-neutral-400"
                : "border-neutral-300 bg-neutral-200 text-neutral-500"
            }`}
          >
            {manque === 1 ? "Choisissez 1 poste" : `Choisissez encore ${manque} postes`}
          </span>
        )}
        {/* 05/09 — le moyen de paiement s'enregistre à la réservation,
            rien n'est débité avant la fin de l'installation */}
        <p className={`mb-2 text-center text-xs ${sombre ? "text-neutral-400" : "text-gray-500"}`}>
          Rien n&apos;est débité avant la fin de l&apos;installation.
        </p>
      </CardFooter>
    </Card>
  );
}

/* le sélecteur Mensuel | Annuel — le PricingSwitch de la référence :
   pilule claire cernée, et sous le libellé actif un curseur au dégradé
   gris, bordé, qui GLISSE d'un bouton à l'autre (layoutId, ressort).
   Deux boutons `aria-pressed` dans un groupe nommé (03/09), plutôt qu'un
   radiogroup qui promettrait la navigation aux flèches. */
function SelecteurPeriodicite({
  valeur,
  changer,
}: {
  valeur: Periodicite;
  changer: (p: Periodicite) => void;
}) {
  const reduit = useReducedMotion();
  const transition = reduit
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 500, damping: 30 };
  const bouton = (p: Periodicite, contenu: ReactNode) => {
    const actif = valeur === p;
    return (
      <button
        type="button"
        aria-pressed={actif}
        onClick={() => changer(p)}
        className={`relative z-10 h-10 w-fit shrink-0 cursor-pointer rounded-full px-3 py-1 font-medium transition-colors sm:h-12 sm:px-6 sm:py-2 ${
          actif ? "text-black" : "text-neutral-500 hover:text-black"
        }`}
      >
        {actif ? (
          <motion.span
            layoutId="tq-curseur"
            className="absolute left-0 top-0 h-10 w-full rounded-full border-4 border-neutral-300 bg-gradient-to-t from-neutral-100 via-neutral-200 to-neutral-300 shadow-sm shadow-neutral-300 sm:h-12"
            transition={transition}
          />
        ) : null}
        <span className="relative flex items-center gap-2">{contenu}</span>
      </button>
    );
  };

  return (
    <div className="flex justify-center">
      <div
        role="group"
        aria-label="Périodicité de l'abonnement"
        className="relative z-10 mx-auto flex w-fit rounded-full border border-gray-200 bg-neutral-50 p-1"
      >
        {bouton("mensuel", "Mensuel")}
        {bouton(
          "annuel",
          <>
            Annuel
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-black">
              −{REMISE_PCT}&nbsp;%<span className="sr-only"> de remise</span>
            </span>
          </>,
        )}
      </div>
    </div>
  );
}

export default function Grille() {
  /* 28/08 (Teo) — la sélection est EXCLUSIVE entre paliers : cocher un
     poste dans une carte efface la sélection de l'autre. */
  const [choix, setChoix] = useState<{ palier: string; postes: string[] }>({
    palier: "",
    postes: [],
  });
  /* 02/09 — la périodicité, UNE pour toute la grille (voir l'en-tête).
     03/09 : l'URL donne la valeur de départ (retour depuis /installation),
     le clic du visiteur prend ensuite le dessus. */
  const depuisUrl = useSyncExternalStore(souscrireUrl, periodiciteDeLUrl, periodiciteServeur);
  const [choixPeriodicite, setPeriodicite] = useState<Periodicite | null>(null);
  const periodicite = choixPeriodicite ?? depuisUrl;
  const annuel = periodicite === "annuel";
  /* le repère de la cascade d'entrée : la section entière */
  const sectionRef = useRef<HTMLElement>(null);

  const basculePour = (p: Palier) => (id: string) =>
    setChoix((prev) => {
      /* premier clic dans une autre carte : on repart de zéro chez elle */
      if (prev.palier !== p.id) return { palier: p.id, postes: [id] };
      if (prev.postes.includes(id))
        return { palier: p.id, postes: prev.postes.filter((x) => x !== id) };
      if (p.aChoisir === 1) return { palier: p.id, postes: [id] }; // radio
      if (p.aChoisir !== null && prev.postes.length >= p.aChoisir) return prev;
      return { palier: p.id, postes: [...prev.postes, id] };
    });

  return (
    <>
      {/* ═══ 1. en-tête à gauche, sélecteur à droite, trois paliers ═══ */}
      <section
        ref={sectionRef}
        data-monde="clair"
        className="r-wrap pb-10 pt-12 sm:pb-14 sm:pt-16"
      >
        <article className="flex flex-col items-start justify-between gap-6 pb-4 sm:flex-row sm:items-center sm:pb-0">
          <div className="max-w-2xl text-left sm:mb-6">
            {/* 01/09 — la pastille « Prix publics » ARRIVE de la carte de
                /commencer (objet partagé) */}
            <Partage nom="kicker-tarifs" share="voyage-tarifs" className="cm-kicker cm-kicker--page">
              Prix publics
            </Partage>
            <h1 className="mb-4 font-[family-name:var(--font-jakarta)] text-4xl font-medium leading-[130%] tracking-[-0.02em] text-gray-900">
              <VerticalCutReveal
                splitBy="words"
                staggerDuration={0.15}
                staggerFrom="first"
                reverse
                containerClassName="justify-start"
                transition={{ type: "spring", stiffness: 250, damping: 40, delay: 0 }}
              >
                Des prix publics, une installation comprise
              </VerticalCutReveal>
            </h1>
            <TimelineContent
              as="p"
              animationNum={0}
              timelineRef={sectionRef}
              customVariants={VARIANTES_ENTREE}
              className="text-gray-600 sm:w-[80%]"
            >
              Pour les indépendants, TPE et PME&nbsp;: vous choisissez vos postes, vous réservez
              la réunion d&apos;installation, et le système démarre sous votre œil. Sans
              engagement en mensuel, −{REMISE_PCT}&nbsp;% en annuel, satisfait ou remboursé
              trente jours.
            </TimelineContent>
          </div>

          <TimelineContent
            as="div"
            animationNum={1}
            timelineRef={sectionRef}
            customVariants={VARIANTES_ENTREE}
            className="shrink-0"
          >
            <SelecteurPeriodicite valeur={periodicite} changer={setPeriodicite} />
          </TimelineContent>
        </article>

        {/* le cadre gris des trois cartes. Dès 1024 px la phare est
            grossie de 10 % : le cadre lui laisse de l'air en haut et en
            bas (mt / mb plus grands qu'en pile) */}
        <TimelineContent
          as="div"
          id="grille"
          animationNum={2}
          timelineRef={sectionRef}
          customVariants={VARIANTES_ENTREE}
          className="mx-auto mt-6 grid max-w-md scroll-mt-32 gap-4 rounded-lg bg-gradient-to-b from-neutral-100 to-neutral-200 sm:p-3 lg:mt-14 lg:max-w-none lg:grid-cols-3"
        >
          {PALIERS.map((p, i) => (
            <TimelineContent
              as="div"
              key={p.id}
              animationNum={i + 3}
              timelineRef={sectionRef}
              customVariants={VARIANTES_ENTREE}
              className={p.phare ? "relative lg:z-10" : undefined}
            >
              <CartePalier
                p={p}
                choisis={choix.palier === p.id ? choix.postes : []}
                bascule={basculePour(p)}
                periodicite={periodicite}
              />
            </TimelineContent>
          ))}
        </TimelineContent>

        {/* ce qui tourne chez tout le monde */}
        <p
          data-reveal
          className="mx-auto mt-10 max-w-[76ch] text-center text-[13px] leading-[21px] text-[#616161] lg:mt-20"
        >
          <span className="font-semibold text-[#050505]">Compris à tous les paliers.</span>{" "}
          Quatre postes s&apos;installent sur les outils que vous avez déjà — mail, tableur,
          WhatsApp. Quel que soit le palier,{" "}
          <Link href={`/offres/${COMPRIS[0].slug}`} className="r-lien !text-[13px]">
            {COMPRIS[0].system} · {COMPRIS[0].nom.toLowerCase()}
          </Link>{" "}
          et{" "}
          <Link href={`/offres/${COMPRIS[1].slug}`} className="r-lien !text-[13px]">
            {COMPRIS[1].system} · {COMPRIS[1].nom.toLowerCase()}
          </Link>{" "}
          tournent d&apos;office&nbsp;: savoir où vous en êtes et la certitude que rien ne part
          sans vous ne sont pas des options.
        </p>

        <p data-reveal className="r-note mx-auto mt-8 max-w-3xl text-center">
          Prix TTC, grille en vigueur au 01/09/2026 — le prix affiché au moment de votre demande
          est celui qui vous est confirmé à l&apos;installation. L&apos;installation elle-même
          (mise en route sur vos outils, rodage sous votre œil) est comprise dans la réunion
          pour les quatre postes standard&nbsp;; un raccordement particulier est chiffré avant
          tout engagement. Le moyen de paiement — carte ou prélèvement SEPA — est enregistré à
          la réservation&nbsp;; rien n&apos;est débité avant la fin de l&apos;installation, le
          premier prélèvement part le jour de la mise en service. Formule mensuelle&nbsp;: sans
          engagement, résiliable à tout moment, le mois en cours va à son terme. Formule
          annuelle&nbsp;: {REMISE_PCT}&nbsp;% de remise, facturée en une fois le jour de la mise
          en service&nbsp;; le satisfait ou remboursé 30 jours s&apos;applique de la même façon.
        </p>
      </section>

      {/* ═══ 2. bandeau d'orientation — 14/09 : la carte à deux volets de
             Tailark (call-to-action-4). Les mots sont ceux du bandeau du
             28/08, réorganisés : la question en titre, les trois choses à
             décrire en liste à coches, « le jour même » en grande mention
             dans l'encart, l'e-mail dessous, le bouton inchangé. ═══ */}
      <section data-monde="clair" className="r-wrap pb-14 sm:pb-16">
        <CallToAction4
          className="mx-auto max-w-4xl"
          titre="Vous ne savez pas quel palier choisir ?"
          texte="Décrivez votre situation en deux lignes. On vous répond avec le palier adapté — et la réunion d'installation se réserve en ligne."
          points={["Votre activité", "Ce qui vous prend le plus de temps", "Ce qui se perd"]}
          encart={{
            sur: "Une réponse",
            grand: "le jour même",
            sous: (
              <>
                Ou par e-mail&nbsp;:{" "}
                <a href={lienCourriel("Quel palier pour moi ?")} className="r-lien !text-sm">
                  {COURRIEL}
                </a>
              </>
            ),
            bouton: { label: "Décrire ma situation", href: lienContact("Quel palier pour moi ?") },
          }}
        />
      </section>

      {/* ═══ 3. comparatif — 14/09 : le « Comparator one » de Tailark, en
             carte à quatre colonnes (voir components/ui/comparator-1).
             Les deux en-têtes collants du 05/09 et le repli « Voir tous
             les points » partent avec lui : quinze lignes en trois
             familles se lisent d'un coup, et la tête de la carte porte
             déjà les prix — qui suivent la périodicité choisie plus haut. */}
      <section id="comparatif" data-monde="clair" className="r-blanc">
        <div className="r-wrap py-14 sm:py-20">
          <div className="text-center">
            <h2 className="r-h2 text-balance">Comparer les paliers</h2>
            <p className="mx-auto mt-4 max-w-md text-balance text-[#616161]">
              Chaque ligne redit ce que les cartes disent déjà, côte à côte.{" "}
              <a href={lienContact("Aidez-moi à choisir un palier")} className="r-lien">
                Aidez-moi à choisir
              </a>
            </p>
          </div>
          <Comparator
            className="mx-auto mt-12 max-w-4xl"
            plans={PALIERS.map((p) => ({
              id: p.id,
              nom: p.nom,
              prix: `${annuel ? equivalentMensuel(p.prix) : p.prix}\u00A0€`,
              periode: annuel ? `par mois · ${prixAnnuel(p.prix)}\u00A0€ par an` : "par mois",
              href: lienPalier(p, periodicite),
              cta: p.aChoisir === null ? "Réserver l'installation" : "Choisir mes postes",
              bouton: boutonPalier(p),
              phare: p.phare,
            }))}
            familles={COMPARATIF_PALIERS.map((f) => ({
              titre: f.titre,
              lignes: f.lignes.map((l) => ({ libelle: l.libelle, aide: l.aide, valeurs: l.valeurs })),
            }))}
          />
        </div>
      </section>
    </>
  );
}
