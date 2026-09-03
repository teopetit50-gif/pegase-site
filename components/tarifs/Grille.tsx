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

   02/09 — MENSUEL | ANNUEL (Teo : « un bouton en haut des cards pour
   switch, un pourcentage en moins pour l'annuel, met en évidence le prix
   économisé »). Le sélecteur segmenté vit AU-DESSUS des trois cartes et
   l'état est UN pour la grille — pas un par carte : on ne compare pas un
   palier mensuel à un palier annuel. En annuel, chaque carte montre le
   mensuel barré, le mensuel équivalent en grand, « facturé N € par an »
   et la ligne verte « Vous économisez … » ; le chiffre change en fondu
   (bloc keyé sur la périodicité, .rv-fondu). Le CTA porte
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
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { SystemLogo } from "@/components/logos";
import {
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
    <div
      data-arrivee="colonne"
      className={`r-carte rv-palier--${p.id} ${p.phare ? "r-carte--phare" : ""}`}
    >
      <div className="r-carte-tete !min-h-0">
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
            <span className={`num rv-prix rv-prix--${p.id} text-[36px] font-semibold leading-[44px] sm:text-[40px] sm:leading-[48px]`}>
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
          <p className="r-note mt-2 text-center">
            Sans paiement en ligne — tout se règle à l&apos;installation.
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

/* le sélecteur Mensuel | Annuel — même .r-seg que les deux portes du
   module de connexion. 03/09 : deux boutons `aria-pressed` dans un groupe
   nommé, plutôt qu'un radiogroup — un radiogroup promet la navigation aux
   flèches et un seul arrêt Tab, qu'on n'implémentait pas ; deux boutons
   à bascule disent exactement ce qu'ils font (Tab, Entrée/Espace). */
function SelecteurPeriodicite({
  valeur,
  changer,
}: {
  valeur: Periodicite;
  changer: (p: Periodicite) => void;
}) {
  const remise = Math.round(REMISE_ANNUELLE * 100);
  const annuel = valeur === "annuel";
  /* 03/09 (Teo : « vers la droite, en bouton stylisé, plus pro ») — le
     sélecteur quitte le centre pour la droite de la grille, au-dessus de
     la troisième carte, et devient une pilule noire à curseur blanc qui
     GLISSE d'un côté à l'autre (rv-periode, globals.css) — le geste des
     pages de prix de référence. Le mot « Facturation » à gauche dit ce
     que le bouton règle ; la pastille « −15 % » reste dans le bouton
     Annuel, verte sur les deux fonds. */
  return (
    <div data-arrivee="bloc" className="flex items-center justify-center gap-3 sm:justify-end">
      <span className="hidden text-[13px] font-medium leading-[18px] text-[#616161] sm:inline">
        Facturation
      </span>
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
            −{remise}&nbsp;%<span className="sr-only"> de remise</span>
          </span>
        </button>
      </div>
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
    <div>
      <SelecteurPeriodicite valeur={periodicite} changer={setPeriodicite} />
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
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
    </div>
  );
}
