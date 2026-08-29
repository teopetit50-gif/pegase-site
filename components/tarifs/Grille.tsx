"use client";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs v5 — la grille : trois paliers, choix des postes DANS la carte
   (né 28/08/2026 en .resa, rhabillé .tf le 29/08/2026)

   La MÉCANIQUE est celle du 28/08, inchangée : chaque carte est autonome
   (« Un poste » se choisit comme une radio, « Trois postes » coche
   jusqu'à trois cases, « Tout Omega » n'a rien à choisir), la sélection
   est EXCLUSIVE entre paliers, et le bouton reste éteint tant que le
   compte n'y est pas — il affiche ce qui manque plutôt qu'un
   « continuer » grisé muet.

   L'HABILLAGE, lui, a changé le 29/08 : décision Teo, la page tarifs
   reprend le design v3 (relevé scale.com/careers, bloc .tf de
   globals.css) en gardant le contenu v4. Les trois paliers occupent les
   trois cartes de couleur de la référence — vert, bleu, encre — et les
   cases à cocher sont dessinées dans son langage (extension v5 du bloc
   .tf). Les logos de postes sont partis avec le monde .resa : ici la
   seule icône de la page reste la flèche, règle v3.

   Le CTA n'ouvre PAS WhatsApp et ne demande aucun paiement : il emmène
   vers /installation, la page de réservation de la réunion
   d'installation, avec les postes choisis dans l'URL. Le paiement se
   branchera plus tard À CETTE COUTURE — quand le compte pro existera,
   une étape s'insérera entre le choix et la réunion, sans toucher aux
   cartes.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { PALIERS, POSTES, type Palier } from "@/lib/paliers";

/* les trois fonds de la référence, dans son ordre */
const TONS: Record<Palier["id"], string> = {
  un: "tf-carte-couleur--vert",
  trois: "tf-carte-couleur--bleu",
  complet: "tf-carte-couleur--encre",
};

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
    <article className={`tf-carte-couleur ${TONS[p.id]} !justify-start`}>
      {/* ——— tête : nom, prix, promesse ——— */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className="tf-mono">{p.nom}</p>
          {p.badge ? <span className="tf-badge">{p.badge}</span> : null}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tf-prix">{p.prix}&nbsp;€</span>
          <span className="text-[13px] leading-[18px] text-white/70">{p.sousPrix}</span>
        </div>
        <p className="tf-body">{p.promesse}</p>
      </div>

      {/* ——— le choix des postes, quand il y en a un à faire ——— */}
      <div className="flex flex-1 flex-col">
        {p.aChoisir !== null ? (
          <fieldset>
            <legend className="text-[14px] leading-[20px] text-white">
              {p.aChoisir === 1 ? "Choisissez votre poste :" : `Choisissez ${p.aChoisir} postes :`}
            </legend>
            <div className="mt-3 space-y-2">
              {POSTES.map((x) => {
                const actif = choisis.includes(x.id);
                const plein = !actif && p.aChoisir !== 1 && choisis.length >= (p.aChoisir ?? 0);
                return (
                  <label
                    key={x.id}
                    className={`tf-case ${actif ? "tf-case--actif" : ""} ${plein ? "tf-case--plein" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={actif}
                      disabled={plein}
                      onChange={() => bascule(x.id)}
                      className="sr-only"
                    />
                    <span className="tf-coche" aria-hidden />
                    <span>
                      <span className="tf-mono block !text-[11px]">{x.system}</span>
                      <span className="mt-0.5 block text-[14px] leading-[20px] text-white">
                        {x.nom}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-[18px] text-white/60">
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
            <div className="text-[14px] leading-[20px] text-white">
              Les quatre postes, en service :
            </div>
            <ul className="mt-3 space-y-2.5">
              {POSTES.map((x) => (
                <li key={x.id} className="flex items-baseline gap-2.5 text-[14px] leading-[22px] text-white/85">
                  <span className="tf-mono !text-[11px]">{x.system}</span>
                  {x.nom}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ——— le bouton, calé en bas comme ceux des cartes v3 ——— */}
        <div className="mt-6 flex flex-1 flex-col justify-end">
          {pret ? (
            <Link href={href} className="tf-btn tf-btn--filet w-full !justify-center">
              Réserver l&apos;installation
            </Link>
          ) : (
            <span aria-disabled className="tf-btn tf-btn--filet tf-btn--attente w-full !justify-center">
              {manque === 1 ? "Choisissez 1 poste" : `Choisissez encore ${manque} postes`}
            </span>
          )}
          <p className="mt-2.5 text-center text-[12px] leading-[18px] text-white/60">
            Sans paiement en ligne — tout se règle à l&apos;installation.
          </p>
        </div>

        <ul className="mt-6 space-y-3 border-t border-white/20 pt-5">
          {p.points.map((t) => (
            <li key={t} className="flex gap-2.5 text-[13px] leading-[19px] text-white/70">
              <span aria-hidden className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-white/70" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </article>
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
    <div className="tf-grille tf-grille--paliers" data-reveal>
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
