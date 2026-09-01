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
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { SystemLogo } from "@/components/logos";
import { PALIERS, POSTES, type Palier } from "@/lib/paliers";

function CartePalier({
  p,
  choisis,
  bascule,
}: {
  p: Palier;
  /* la sélection vit dans Grille : vide dès qu'un AUTRE palier est actif */
  choisis: string[];
  bascule: (id: string) => void;
}) {

  const postes = p.aChoisir === null ? POSTES.map((x) => x.id) : choisis;
  const manque = p.aChoisir === null ? 0 : p.aChoisir - choisis.length;
  const pret = manque <= 0;
  const href = `/installation?postes=${postes.join(",")}`;

  return (
    <div className={`r-carte rv-palier--${p.id} ${p.phare ? "r-carte--phare" : ""}`}>
      {/* 01/09 — plancher commun dès lg : à quatre cartes de front (la
          carte site rejoint la grille), les promesses replient
          différemment et les têtes dessinaient un escalier. Le badge vit
          AU-DESSUS du titre : à côté, son nowrap repliait « Trois
          postes » sur deux lignes dans les cartes resserrées. La ligne
          du badge est RÉSERVÉE sur toutes les cartes (h-5, vide sans
          badge) : sinon titres et prix des cartes sans badge remontaient
          d'une rangée et plus rien ne s'alignait d'une carte à l'autre. */}
      <div className="r-carte-tete !min-h-0 lg:!min-h-[268px]">
        <div className={`h-5 ${p.badge ? "mb-2 flex" : "hidden lg:mb-2 lg:flex"}`}>
          {p.badge ? <span className="r-badge">{p.badge}</span> : null}
        </div>
        <h3 className="font-[family-name:var(--font-jakarta)] text-[26px] font-semibold leading-[34px] tracking-[-0.02em] text-[#050505] sm:text-[28px] sm:leading-[36px]">
          {p.nom}
        </h3>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={`num rv-prix rv-prix--${p.id} text-[36px] font-semibold leading-[44px] sm:text-[40px] sm:leading-[48px]`}>
            {p.prix} €
          </span>
          <span className="text-[12px] leading-[18px] text-[#050505]">{p.sousPrix}</span>
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

        {/* 01/09 — plancher commun : les puces replient différemment d'une
            carte à l'autre (171 à 190px mesurés) et décalaient les CTA,
            ancrés juste au-dessus. Même valeur sur la carte site. */}
        <ul className="mt-6 space-y-3 border-t border-[#e3e3e3] pt-5 lg:min-h-[190px]">
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

export default function Grille() {
  /* 28/08 (Teo) — la sélection est EXCLUSIVE entre paliers : cocher un
     poste dans une carte efface la sélection de l'autre. Chaque carte
     gardait son propre état, on pouvait donc cocher « Un poste » ET
     « Trois postes » en même temps — deux paniers à l'écran, aucun sens. */
  const [choix, setChoix] = useState<{ palier: string; postes: string[] }>({
    palier: "",
    postes: [],
  });

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
    <div className="grid gap-4 lg:grid-cols-3">
      {PALIERS.map((p) => (
        <CartePalier
          key={p.id}
          p={p}
          choisis={choix.palier === p.id ? choix.postes : []}
          bascule={basculePour(p)}
        />
      ))}
    </div>
  );
}
