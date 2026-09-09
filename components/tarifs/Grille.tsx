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

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import NumberFlow, { type Format } from "@number-flow/react";
import { CheckCircle, Plus, Star } from "lucide-react";
import Partage from "@/components/Partage";
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

/* 08/09 — le bouton d'un palier : noir pour Trois postes ET Tout Omega
   (la dernière carte doit attirer autant que la phare), filet pour Un
   poste. Sert la carte et l'en-tête collant du comparatif. */
function boutonPalier(p: Palier) {
  return p.id === "un" ? "r-btn--fil" : "r-btn--noir";
}

/* 08/09 — l'argument de la tête nuit : ce que coûte le quatrième poste
   par rapport à Trois postes. CALCULÉ depuis PALIERS, jamais écrit en
   dur ; en annuel on compare les équivalents mensuels, pour que la
   phrase reste vraie sous les chiffres affichés. */
function ecartQuatriemePoste(periodicite: Periodicite) {
  const trois = PALIERS.find((x) => x.id === "trois");
  const complet = PALIERS.find((x) => x.id === "complet");
  if (!trois || !complet) return null;
  const valeur = (p: Palier) => (periodicite === "annuel" ? equivalentMensuel(p.prix) : p.prix);
  return valeur(complet) - valeur(trois);
}

/* la cinquième ligne : même gabarit qu'un poste, un « + » à la place de
   la case, et toute la ligne est un lien vers la page sur-mesure */
function LigneSurMesure() {
  return (
    <Link href={SUR_MESURE.href} className="tp-poste tp-poste--lien">
      <Plus aria-hidden className="tp-signe" />
      <span>{SUR_MESURE.nom}</span>
    </Link>
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
  const href = `/installation?postes=${postes.join(",")}${annuel ? "&periodicite=annuel" : ""}`;
  /* 08/09 — la tête nuit porte l'écart avec Trois postes (voir l'en-tête) */
  const ecart = p.teinte === "nuit" ? ecartQuatriemePoste(periodicite) : null;

  return (
    /* 09/09 — la carte de la référence : un filet, quatre blocs séparés
       par des filets, le pied qui tombe en bas. Dès 1024 px elle devient
       une SOUS-GRILLE de quatre rangs partagés par la rangée (tête /
       choix / points / pied) : quatre têtes de même hauteur, trois
       boutons sur la même ligne, quelle que soit la longueur des textes */
    <div
      data-arrivee="colonne"
      className={`tp-carte ${p.phare ? "tp-carte--phare" : ""}`}
    >
      {/* les pastilles, hors du flux en haut à droite — « Recommandé »
          avec l'étoile sur le palier phare, la remise seulement en annuel */}
      <div className="tp-badges">
        {p.badge ? (
          <span className="tp-badge">
            {p.phare ? <Star aria-hidden className="size-3 fill-current" /> : null}
            {p.badge}
          </span>
        ) : null}
        {annuel ? (
          <span className="tp-badge tp-badge--remise rv-fondu">
            −{REMISE_PCT}&nbsp;%<span className="sr-only"> de remise</span>
          </span>
        ) : null}
      </div>

      {/* 1er rang — la tête : nom, promesse, prix. data-teinte : bleu / or
          / nuit, une par palier (décision de l'associé du 08/09) */}
      <div className="tp-tete" data-teinte={p.teinte}>
        <h3 className="tp-nom font-[family-name:var(--font-jakarta)] text-[20px] font-semibold leading-[27px] tracking-[-0.02em]">
          {p.nom}
        </h3>
        <p className="tp-info mt-1.5 text-[13px] leading-[19px]">{p.promesse}</p>

        {/* le prix — poussé EN BAS de la tête (mt-auto) : les trois têtes
            ayant la même hauteur par sous-grille, les trois prix tombent
            ainsi sur la même ligne, comme sur le composant de référence.
            NumberFlow anime les chiffres à la bascule, il ne faut donc
            SURTOUT PAS le remonter par une clé ; seules les lignes qui
            l'entourent rejouent leur fondu */}
        <div className="tp-bloc-prix">
        <div className="flex flex-wrap items-end gap-x-2.5 gap-y-1">
          <NumberFlow
            aria-label={`${annuel ? equivalentMensuel(p.prix) : p.prix} euros par mois`}
            className="tp-prix"
            format={FORMAT_EURO}
            locales="fr-FR"
            suffix=" par mois"
            value={annuel ? equivalentMensuel(p.prix) : p.prix}
          />
          {annuel ? (
            <span key="barre" className="num rv-prix-barre rv-fondu mb-[3px]">
              <span className="sr-only">Au lieu de </span>
              {p.prix} €
            </span>
          ) : null}
        </div>

        <div key={periodicite} className="rv-fondu">
          <p className="tp-facture mt-1.5 text-[12px] leading-[18px]">
            {annuel
              ? `Facturé ${prixAnnuel(p.prix)} € par an, en une fois.`
              : "Facturé chaque mois, sans engagement."}
          </p>
          {annuel ? (
            <p className="rv-economie mt-3">
              Vous économisez {economieAnnuelle(p.prix)}&nbsp;€ par an
            </p>
          ) : null}
          {/* 08/09 — sur la tête nuit seulement : l'argument du quatrième
              poste, calculé depuis PALIERS. 09/09 — la ligne est RÉSERVÉE
              (vide et invisible) dans les deux autres cartes : les trois
              blocs de prix ont ainsi la même hauteur et, poussés en bas de
              têtes de même hauteur, les trois prix tombent sur la même
              ligne. Sous 1024 px les cartes s'empilent, la ligne réservée
              n'a plus de raison d'être et disparaît. */}
          <p className="tp-ecart mt-3" data-vide={ecart === null} aria-hidden={ecart === null}>
            {ecart !== null ? (
              <>Le quatrième poste pour {ecart}&nbsp;€ de plus.</>
            ) : (
              "\u00A0"
            )}
          </p>
        </div>
        </div>
      </div>

      {/* 2e rang — le choix des postes : cinq lignes nues, le même
          gabarit que les points en dessous (09/09, seconde passe — voir
          l'en-tête : ni tuile de logo, ni résumé, comme la référence) */}
      <div className="tp-choix">
        {p.aChoisir !== null ? (
          /* min-w-0 : un fieldset a min-inline-size: min-content par
             défaut ; sans lui il dépasse de son bloc dans les cartes
             étroites et ses lignes ne tombent plus au droit des autres */
          <fieldset className="min-w-0">
            <legend className="tp-legende">
              {p.aChoisir === 1 ? "Choisissez votre poste :" : `Choisissez ${p.aChoisir} postes :`}
            </legend>
            <div className="mt-2.5">
              {POSTES.map((x) => {
                const actif = choisis.includes(x.id);
                const plein = !actif && p.aChoisir !== 1 && choisis.length >= (p.aChoisir ?? 0);
                return (
                  <label
                    key={x.id}
                    className={`tp-poste ${actif ? "tp-poste--actif" : ""} ${plein ? "tp-poste--plein" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={actif}
                      disabled={plein}
                      onChange={() => bascule(x.id)}
                      className="sr-only"
                    />
                    <span className="tp-case" aria-hidden />
                    <span>{x.nom}</span>
                  </label>
                );
              })}
              <LigneSurMesure />
            </div>
          </fieldset>
        ) : (
          <div>
            <div className="tp-legende">Les quatre postes, en service :</div>
            {/* les MÊMES lignes que dans les deux autres cartes, non
                cliquables, la coche posée à la place de la case */}
            <ul className="mt-2.5">
              {POSTES.map((x) => (
                <li key={x.id} className="tp-poste tp-poste--fixe tp-poste--actif">
                  <CheckCircle aria-hidden className="tp-signe tp-signe--ok" />
                  <span>{x.nom}</span>
                </li>
              ))}
              <li>
                <LigneSurMesure />
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 3e rang — les points du palier, en coches comme la référence */}
      <ul className="tp-points">
        {p.points.map((t) => (
          <li key={t} className="tp-point">
            <CheckCircle aria-hidden className="tp-coche" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      {/* 4e rang — le pied : le bouton pleine largeur et sa note */}
      <div className="tp-pied">
        {pret ? (
          <Link href={href} className={`r-btn w-full ${boutonPalier(p)}`}>
            Réserver l&apos;installation
          </Link>
        ) : (
          <span aria-disabled className="r-btn rv-btn--attente w-full">
            {manque === 1 ? "Choisissez 1 poste" : `Choisissez encore ${manque} postes`}
          </span>
        )}
        {/* 05/09 — plus de « tout se règle à l'installation » : le moyen de
            paiement s'enregistre à la réservation, rien n'est débité avant
            la fin de l'installation */}
        <p className="r-note mt-2 text-center">
          Rien n&apos;est débité avant la fin de l&apos;installation.
        </p>
      </div>
    </div>
  );
}

/* le sélecteur Mensuel | Annuel — pilule noire à curseur blanc qui glisse
   (rv-periode, globals.css). 03/09 : deux boutons `aria-pressed` dans un
   groupe nommé, plutôt qu'un radiogroup — un radiogroup promet la
   navigation aux flèches et un seul arrêt Tab, qu'on n'implémentait pas.
   09/09 : il quitte la colonne de gauche pour reprendre sa place de la
   référence — centré, juste sous le chapô et au-dessus des cartes. */
function SelecteurPeriodicite({
  valeur,
  changer,
}: {
  valeur: Periodicite;
  changer: (p: Periodicite) => void;
}) {
  const annuel = valeur === "annuel";
  return (
    <div
      className="rv-periode"
      role="group"
      aria-label="Périodicité de l'abonnement"
      data-actif={annuel ? "annuel" : "mensuel"}
    >
      <span aria-hidden className="rv-periode-curseur" />
      <button
        type="button"
        aria-pressed={!annuel}
        className="rv-periode-btn"
        data-actif={!annuel}
        onClick={() => changer("mensuel")}
      >
        Mensuel
      </button>
      <button
        type="button"
        aria-pressed={annuel}
        className="rv-periode-btn"
        data-actif={annuel}
        onClick={() => changer("annuel")}
      >
        Annuel
        <span className="rv-remise">
          −{REMISE_PCT}&nbsp;%<span className="sr-only"> de remise</span>
        </span>
      </button>
    </div>
  );
}

/* ——— une ligne du comparatif — la même que celle de Formules.tsx ———
   Six colonnes : le libellé en occupe trois, chaque palier une. Sous
   768 px la grille retombe à trois colonnes, le libellé passe pleine
   largeur et le texte d'aide s'efface (voir .r-grille / .r-tableau). */
function Ligne({
  libelle,
  aide,
  valeurs,
  noms,
}: {
  libelle: string;
  aide: string;
  valeurs: [string, string, string];
  noms: [string, string, string];
}) {
  return (
    <div className="r-grille">
      <div className="r-grille-libelle">
        <div className="text-[15px] font-semibold leading-[22px] text-white md:text-[#050505]">
          {libelle}
        </div>
        <p className="mt-1 hidden max-w-[42ch] text-[13px] leading-[20px] text-[#616161] md:block">
          {aide}
        </p>
      </div>
      {valeurs.map((v, i) => (
        <div
          key={noms[i]}
          className="text-[13px] leading-[19px] text-[#3d3d3d] md:text-[14px] md:leading-[20px]"
        >
          {v}
        </div>
      ))}
    </div>
  );
}

export default function Grille() {
  /* 28/08 (Teo) — la sélection est EXCLUSIVE entre paliers : cocher un
     poste dans une carte efface la sélection de l'autre. Chaque carte
     gardait son propre état, on pouvait donc cocher « Un poste » ET
     « Trois postes » en même temps — deux paniers à l'écran, aucun sens. */
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

  const noms = PALIERS.map((p) => p.nom) as [string, string, string];
  const visibles = COMPARATIF_PALIERS.filter((f) => !f.repliee);
  const repliees = COMPARATIF_PALIERS.filter((f) => f.repliee);

  return (
    <>
      {/* ═══ 1. en-tête centré, sélecteur, trois paliers ═══ */}
      <section data-monde="clair" className="r-wrap pb-10 pt-12 sm:pb-14 sm:pt-16">
        {/* 09/09 — l'en-tête de la référence : tout est centré, sur une
            colonne étroite. 01/09 — transitions : la pastille « Prix
            publics » ARRIVE de la carte de /commencer (objet partagé) et
            se pose au-dessus du titre ; titre puis chapô entrent en
            cascade (Arrivee). */}
        <div className="mx-auto max-w-3xl text-center">
          <Partage nom="kicker-tarifs" share="voyage-tarifs" className="cm-kicker cm-kicker--page">
            Prix publics
          </Partage>
          <h1 data-arrivee="titre" className="r-h1 mx-auto max-w-[19ch]">
            Des prix publics, une installation comprise
          </h1>
          <p data-arrivee="chapo" className="r-lead mx-auto mt-5 max-w-[58ch]">
            Pour les indépendants, TPE et PME&nbsp;: vous choisissez vos postes, vous réservez la
            réunion d&apos;installation, et le système démarre sous votre œil. Sans engagement en
            mensuel, −{REMISE_PCT}&nbsp;% en annuel, satisfait ou remboursé trente jours.
          </p>
        </div>

        {/* le sélecteur Mensuel | Annuel, centré sous le chapô */}
        <div data-arrivee="chapo" className="mt-9 flex justify-center">
          <SelecteurPeriodicite valeur={periodicite} changer={setPeriodicite} />
        </div>

        {/* 09/09 — dès 1024 px la rangée a QUATRE rangs (sous-grille des
            cartes, voir CartePalier) et plus d'interligne vertical */}
        <div
          id="grille"
          className="mx-auto mt-10 grid max-w-md scroll-mt-24 gap-6 sm:mt-12 lg:max-w-5xl lg:grid-cols-3 lg:gap-y-0"
        >
          {PALIERS.map((p) => (
            <CartePalier
              key={p.id}
              p={p}
              choisis={choix.palier === p.id ? choix.postes : []}
              bascule={basculePour(p)}
              periodicite={periodicite}
            />
          ))}
        </div>

        {/* ce qui tourne chez tout le monde — vivait dans la colonne de
            gauche jusqu'au 09/09, descendu sous les cartes avec elle */}
        <p
          data-arrivee="colonne"
          className="mx-auto mt-10 max-w-[76ch] text-center text-[13px] leading-[21px] text-[#616161]"
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

        <p data-arrivee="colonne" className="r-note mx-auto mt-8 max-w-3xl text-center">
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

      {/* ═══ 2. bandeau d'orientation ═══ */}
      <section data-monde="clair" className="r-wrap pb-14 sm:pb-16">
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <p className="max-w-[62ch] text-[15px] leading-[23px] text-[#3d3d3d]">
            <span className="font-semibold text-[#050505]">
              Vous ne savez pas quel palier choisir ?
            </span>{" "}
            Décrivez votre situation en deux lignes : votre activité, ce qui vous prend le
            plus de temps, ce qui se perd. On vous répond le jour même avec le palier adapté
            — et la réunion d&apos;installation se réserve en ligne. Ou par e-mail&nbsp;:{" "}
            <a href={lienCourriel("Quel palier pour moi ?")} className="r-lien !text-[15px]">
              {COURRIEL}
            </a>
            .
          </p>
          <a
            href={lienContact("Quel palier pour moi ?")}
            className="r-btn r-btn--fil shrink-0"
          >
            Décrire ma situation
          </a>
        </div>
      </section>

      {/* ═══ 3. comparatif ═══ */}
      <section id="comparatif" data-monde="clair" className="r-blanc">
        <div className="r-wrap py-14 sm:py-20">
          <h2 className="r-h2">Comparer les paliers</h2>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
            <a href={lienContact("Aidez-moi à choisir un palier")} className="r-lien">
              Aidez-moi à choisir
            </a>
          </div>

          {/* en-tête collant : les trois paliers restent lisibles pendant
              qu'on descend dans les lignes — le prix suit la périodicité
              choisie plus haut */}
          <div className="sticky top-16 z-10 mt-10 hidden bg-white pb-4 pt-4 sm:top-[72px] md:block">
            <div className="grid grid-cols-6 gap-x-6 border-b border-[#e3e3e3] pb-5">
              <div className="col-span-3 self-end text-[13px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                Indépendants &amp; TPE-PME
              </div>
              {PALIERS.map((p) => (
                <div key={p.id}>
                  <div className="font-[family-name:var(--font-jakarta)] text-[19px] font-semibold leading-[26px] tracking-[-0.01em] text-[#050505]">
                    {p.nom}
                  </div>
                  <div className="num mt-0.5 text-[14px] leading-[22px] text-[#3d3d3d]">
                    {annuel
                      ? `${equivalentMensuel(p.prix)} € par mois · ${prixAnnuel(p.prix)} € par an`
                      : `${p.prix} € · ${p.sousPrix}`}
                  </div>
                  <Link
                    href={lienPalier(p, periodicite)}
                    className={`r-btn mt-3 w-full !py-2 !text-[14px] ${boutonPalier(p)}`}
                  >
                    {p.aChoisir === null ? "Réserver l'installation" : "Choisir mes postes"}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* en-tête collant mobile : les trois noms coiffent les colonnes
              une seule fois pour tout le tableau — même encadré, mêmes
              cellules et mêmes gouttières que les tableaux .r-tableau */}
          <div className="sticky top-16 z-10 mt-8 bg-white pb-2 pt-3 sm:top-[72px] md:hidden">
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#f5f5f5]">
              {PALIERS.map((p, i) => (
                <div
                  key={p.id}
                  className={`px-3 py-2.5 ${i > 0 ? "border-l border-[#e3e3e3]" : ""}`}
                >
                  <div className="font-[family-name:var(--font-jakarta)] text-[14px] font-semibold leading-[19px] tracking-[-0.01em] text-[#050505]">
                    {p.nom}
                  </div>
                  <div className="num mt-0.5 text-[12px] leading-[16px] text-[#616161]">
                    {annuel ? equivalentMensuel(p.prix) : p.prix} € / mois
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* familles toujours visibles */}
          <div className="md:mt-2">
            {visibles.map((fam) => (
              <div key={fam.titre}>
                <h3 className="r-h4 pb-2 pt-10">{fam.titre}</h3>
                <div className="r-tableau">
                  {fam.lignes.map((l) => (
                    <Ligne key={l.libelle} {...l} noms={noms} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* familles repliées — le bouton porte lui-même le voile de
              dégradé (::before), qui disparaît à l'ouverture */}
          <details className="r-plus">
            <summary>
              <span className="r-btn r-btn--fil mx-auto mt-8 w-full max-w-sm">
                <span className="r-plus-ouvrir">Voir tous les points</span>
                <span className="r-plus-fermer">Masquer le détail</span>
              </span>
            </summary>
            <div>
              {repliees.map((fam) => (
                <div key={fam.titre}>
                  <h3 className="r-h4 pb-2 pt-10">{fam.titre}</h3>
                  <div className="r-tableau">
                    {fam.lignes.map((l) => (
                      <Ligne key={l.libelle} {...l} noms={noms} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>
    </>
  );
}
