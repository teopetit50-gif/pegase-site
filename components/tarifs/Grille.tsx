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
   avec les postes choisis dans l'URL. Le paiement (IBAN, prélèvement) se
   branchera plus tard À CETTE COUTURE — quand le compte pro existera, une
   étape s'insérera entre le choix et la réunion, sans toucher aux cartes.
   → 05/09 : c'est fait, mais APRÈS la réservation, pas entre le choix et
   la réunion — le client enregistre carte ou mandat SEPA sur l'écran
   « Créneau réservé » de /installation (Stripe, rien de débité), et le
   premier prélèvement part quand l'agence finalise l'installation. La
   grille ne change pas ; seule la note sous le CTA a cessé de dire « tout
   se règle à l'installation ».

   02/09 — MENSUEL | ANNUEL (Teo : « un bouton en haut des cards pour
   switch, un pourcentage en moins pour l'annuel, met en évidence le prix
   économisé »). L'état est UN pour la grille — pas un par carte : on ne
   compare pas un palier mensuel à un palier annuel. En annuel, chaque
   carte montre le mensuel barré, le mensuel équivalent en grand, « facturé
   N € par an » et la ligne verte « Vous économisez … » ; le chiffre change
   en fondu (bloc keyé sur la périodicité, .rv-fondu). Le CTA porte
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

   05/09 — LE DESIGN DE /reserver-un-audit, COLLÉ (Teo : « quand on clique
   sur Indépendants & TPE, le design qui s'affiche doit être le même que
   celui d'Organisations & équipes ; les infos de tarifs restent »). Ce
   composant reprend donc la structure EXACTE de reservation/Formules.tsx :
     1. titre + grille de QUATRE colonnes — la colonne de gauche porte ce
        que la page audit y met (le fait qui décide, puis des blocs sous
        filet) : ici l'installation comprise, le sélecteur Mensuel |
        Annuel (qui vivait au-dessus des cartes) et PULSE/VAULT compris
        (qui vivaient dans le chapô du H2 « Choisissez vos postes ») ;
        les cartes perdent leurs têtes colorées (.rv-palier--, .rv-prix--)
        pour la tête grise / dorée de la page audit ;
     2. le bandeau d'orientation, blanc arrondi, avec sa porte WhatsApp ;
     3. le comparatif sur bande blanche — en-tête collant, familles,
        repli « Voir tous les points » (données : COMPARATIF_PALIERS).
   Le H2 « Choisissez vos postes » et le bandeau .r-blanc qui coiffaient la
   grille disparaissent : la page audit n'en a pas.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import Partage from "@/components/Partage";
import { SystemLogo } from "@/components/logos";
import { lienContact } from "@/lib/reservation";
import {
  COMPARATIF_PALIERS,
  COMPRIS,
  PALIERS,
  POSTES,
  REMISE_ANNUELLE,
  economieAnnuelle,
  equivalentMensuel,
  lirePeriodicite,
  prixAnnuel,
  type Palier,
  type Periodicite,
} from "@/lib/paliers";

const REMISE_PCT = Math.round(REMISE_ANNUELLE * 100);

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

  return (
    <div data-arrivee="colonne" className={`r-carte ${p.phare ? "r-carte--phare" : ""}`}>
      <div className="r-carte-tete">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-[family-name:var(--font-jakarta)] text-[26px] font-semibold leading-[34px] tracking-[-0.02em] text-[#050505] sm:text-[28px] sm:leading-[36px]">
            {p.nom}
          </h3>
          {p.badge ? <span className="r-badge mt-1.5">{p.badge}</span> : null}
        </div>

        {/* keyé sur la périodicité : le bloc prix remonte et rejoue son
            fondu à chaque bascule — pas de saut de chiffre */}
        <div key={periodicite} className="rv-fondu mt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {annuel ? (
              <span className="num rv-prix-barre">
                <span className="sr-only">Au lieu de </span>
                {p.prix} €
              </span>
            ) : null}
            <span className="num text-[36px] font-semibold leading-[44px] text-[#050505] sm:text-[40px] sm:leading-[48px]">
              {annuel ? equivalentMensuel(p.prix) : p.prix} €
            </span>
            <span className="text-[12px] leading-[18px] text-[#050505]">
              {annuel ? `par mois, facturé ${prixAnnuel(p.prix)} € par an` : p.sousPrix}
            </span>
          </div>
          {annuel ? (
            <p className="rv-economie mt-2.5">
              Vous économisez {economieAnnuelle(p.prix)}&nbsp;€ par an
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-[15px] leading-[22px] text-[#050505]">{p.promesse}</p>
      </div>

      <div className="flex flex-1 flex-col px-3 pt-4">
        {/* le choix des postes, quand il y en a un à faire */}
        {p.aChoisir !== null ? (
          <fieldset>
            <legend className="text-[14px] font-semibold leading-[20px] text-[#050505]">
              {p.aChoisir === 1 ? "Choisissez votre poste :" : `Choisissez ${p.aChoisir} postes :`}
            </legend>
            <div className="mt-3 space-y-2">
              {POSTES.map((x) => {
                const actif = choisis.includes(x.id);
                const plein = !actif && p.aChoisir !== 1 && choisis.length >= (p.aChoisir ?? 0);
                return (
                  <label
                    key={x.id}
                    className={`rv-case ${actif ? "rv-case--actif" : ""} ${plein ? "rv-case--plein" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={actif}
                      disabled={plein}
                      onChange={() => bascule(x.id)}
                      className="sr-only"
                    />
                    <span className="rv-coche" aria-hidden />
                    <SystemLogo system={x.system} />
                    <span>
                      <span className="block text-[14px] font-medium leading-[20px] text-[#050505]">
                        {x.nom}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-[18px] text-[#616161]">
                        {x.resume}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div>
            <div className="text-[14px] font-semibold leading-[20px] text-[#050505]">
              Les quatre postes, en service :
            </div>
            <ul className="mt-3 space-y-2.5">
              {POSTES.map((x) => (
                <li key={x.id} className="flex items-center gap-2.5 text-[14px] leading-[22px] text-[#3d3d3d]">
                  <SystemLogo system={x.system} />
                  {x.nom}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-1 flex-col justify-end">
          {pret ? (
            <Link href={href} className={`r-btn w-full ${p.phare ? "r-btn--noir" : "r-btn--fil"}`}>
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

        <ul className="mt-6 space-y-3 border-t border-[#e3e3e3] pt-5">
          {p.points.map((t) => (
            <li key={t} className="flex gap-2 text-[13px] leading-[19px] text-[#3d3d3d]">
              <span aria-hidden className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-[#050505]" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* le sélecteur Mensuel | Annuel — pilule noire à curseur blanc qui glisse
   (rv-periode, globals.css). 03/09 : deux boutons `aria-pressed` dans un
   groupe nommé, plutôt qu'un radiogroup — un radiogroup promet la
   navigation aux flèches et un seul arrêt Tab, qu'on n'implémentait pas.
   05/09 : il quitte le dessus des cartes pour la colonne de gauche, sous
   son propre intitulé « Facturation » — le mot vit donc dans la colonne,
   plus dans le composant. */
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
      {/* ═══ 1. titre + trois paliers ═══ */}
      <section data-monde="clair" className="r-wrap pb-10 pt-12 sm:pb-14 sm:pt-14">
        {/* 01/09 — transitions : la pastille « Prix publics » ARRIVE de la
            carte de /commencer (objet partagé) et se pose au-dessus du
            titre ; titre puis chapô entrent en cascade (Arrivee). */}
        <Partage nom="kicker-tarifs" share="voyage-tarifs" className="cm-kicker cm-kicker--page">
          Prix publics
        </Partage>
        <h1 data-arrivee="titre" className="r-h1 max-w-[17ch]">
          Des prix publics, une installation comprise
        </h1>
        <p data-arrivee="chapo" className="r-lead mt-5 max-w-[58ch]">
          Pour les indépendants, TPE et PME&nbsp;: vous choisissez vos postes, vous réservez la
          réunion d&apos;installation, et le système démarre sous votre œil. Sans engagement en
          mensuel, −{REMISE_PCT}&nbsp;% en annuel, satisfait ou remboursé trente jours.
        </p>

        <div id="grille" className="mt-10 grid scroll-mt-24 gap-4 sm:mt-12 lg:grid-cols-4">
          {/* colonne de gauche — la page audit y loge le fait qui décide,
              puis des blocs sous filet. Ici : l'installation comprise, la
              facturation (le sélecteur Mensuel | Annuel) et ce qui tourne
              chez tout le monde (PULSE, VAULT). */}
          <div data-arrivee="colonne" className="flex flex-col justify-start gap-8 pr-2 lg:pt-2">
            <p className="text-[19px] font-medium leading-[27px] text-[#050505] sm:text-[21px] sm:leading-[29px]">
              Choisissez vos postes.
              <br />
              L&apos;installation est comprise.
            </p>

            <div className="border-t border-[#e3e3e3] pt-6">
              <div className="text-[14px] font-semibold leading-[20px] text-[#050505]">
                Facturation
              </div>
              <div className="mt-3">
                <SelecteurPeriodicite valeur={periodicite} changer={setPeriodicite} />
              </div>
              <p className="mt-3 text-[13px] leading-[20px] text-[#616161]">
                Mensuel sans engagement, ou annuel à −{REMISE_PCT}&nbsp;%, facturé en une fois
                pour douze mois. Satisfait ou remboursé trente jours dans les deux cas.
              </p>
            </div>

            <div className="border-t border-[#e3e3e3] pt-6">
              <div className="text-[14px] font-semibold leading-[20px] text-[#050505]">
                Compris à tous les paliers
              </div>
              <p className="mt-1.5 text-[13px] leading-[20px] text-[#616161]">
                Quatre postes s&apos;installent sur les outils que vous avez déjà — mail, tableur,
                WhatsApp. Quel que soit le palier,{" "}
                <Link href={`/offres/${COMPRIS[0].slug}`} className="r-lien !text-[13px]">
                  {COMPRIS[0].system} · {COMPRIS[0].nom.toLowerCase()}
                </Link>{" "}
                et{" "}
                <Link href={`/offres/${COMPRIS[1].slug}`} className="r-lien !text-[13px]">
                  {COMPRIS[1].system} · {COMPRIS[1].nom.toLowerCase()}
                </Link>{" "}
                tournent d&apos;office&nbsp;: savoir où vous en êtes et la certitude que rien ne
                part sans vous ne sont pas des options.
              </p>
            </div>
          </div>

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

        <p data-arrivee="colonne" className="r-note mt-6 max-w-3xl">
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
            — et la réunion d&apos;installation se réserve en ligne.
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
                    className={`r-btn mt-3 w-full !py-2 !text-[14px] ${
                      p.phare ? "r-btn--noir" : "r-btn--fil"
                    }`}
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
