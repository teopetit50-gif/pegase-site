"use client";

import { useState } from "react";

import { Apparition } from "./Apparition";
import { Etiquette } from "./Bouton";
import { FRANCAIS } from "@/lib/produits/accueil";
import Lien from "@/components/Lien";

/* La bande « produit français ».
 *
 * Le seul signe tricolore est un filet de 3 px en haut de la carte : un
 * drapeau plein ferait cheap, et la mention se lit de toute façon dans les
 * trois faits. Ce qui est écrit ici est aligné sur les mentions légales
 * d'omegaai.fr — notamment « Union européenne » pour l'hébergement, et
 * pas « France », qui serait faux. */
/* 16/09/2026 (Teo, par l'associé) — deux faits sur téléphone, le reste
   d'un geste. Empilés, les trois pavés font près de 900 px pour une
   section de réassurance placée en fin de page. Dès `lg` ils sont sur
   trois colonnes et la coupe n'a plus lieu d'être. */
export function Francais() {
  const [tout, setTout] = useState(false);
  return (
    <section data-monde="clair" id="francais" className="scroll-mt-24 bg-white rounded-xl px-3 py-12 max-sm:py-14 lg:py-25">
      <div className="max-w-7xl mx-auto">
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80">
          {/* Le tiers blanc du drapeau est invisible sur une carte blanche :
              un filet gris sous la bande le délimite, sinon on lit « bleu …
              rouge » avec un trou au milieu. */}
          <div className="flex h-[3px] border-b border-neutral-200" aria-hidden="true">
            <span className="flex-1 bg-[#000091]" />
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-[#e1000f]" />
          </div>

          <div className="px-6 py-10 sm:px-12 sm:py-14">
            <Apparition className="max-w-2xl">
              <Etiquette>{FRANCAIS.etiquette}</Etiquette>
              <h2 className="mt-4 text-3xl max-sm:text-[26px] max-sm:leading-[30px] -tracking-[2px] max-sm:-tracking-[1px] sm:text-4xl lg:text-5xl font-medium text-neutral-900 lg:leading-14">
                {FRANCAIS.titre}
              </h2>
            </Apparition>

            <div
              className={`mt-10 grid gap-px overflow-hidden rounded-xl bg-neutral-200/80 sm:mt-14 lg:grid-cols-3 ${
                tout ? "" : "max-lg:[&>*:nth-child(n+3)]:hidden"
              }`}
            >
              {FRANCAIS.faits.map((f, i) => (
                <Apparition key={f.cle} delai={80 * i} className="bg-white p-6 sm:p-8">
                  <span className="font-mono text-[11px] uppercase text-neutral-400">{f.cle}</span>
                  <h3 className="mt-3 text-xl max-sm:text-[17px] font-medium -tracking-[0.2px] text-neutral-900">
                    {f.titre}
                  </h3>
                  <p className="mt-2 text-base max-sm:text-[15px] leading-relaxed text-neutral-500">{f.texte}</p>
                </Apparition>
              ))}
            </div>
            <button
              type="button"
              aria-expanded={tout}
              onClick={() => setTout((v) => !v)}
              className="mt-4 font-medium text-neutral-500 text-sm underline underline-offset-4 lg:hidden"
            >
              {tout ? "Réduire" : "Lire la suite"}
            </button>

            <Lien
              href={FRANCAIS.lien.href}
              className="mt-8 inline-flex font-mono text-xs uppercase text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-900"
            >
              {FRANCAIS.lien.libelle}
            </Lien>
          </div>
        </div>
      </div>
    </section>
  );
}
