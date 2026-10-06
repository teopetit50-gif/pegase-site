"use client";

import Image from "next/image";
import { useState } from "react";
import { Coche } from "./Icones";

/* ══════════════════════════════════════════════════════════════════════
   /vos-donnees — les deux hébergements, en onglets (08/08/2026)

   C'est la section « USE CASES » de la référence
   (scale.com/global-public-sector) : une étiquette monospace centrée, un
   sélecteur en pilule à deux onglets, puis une grande carte grise en deux
   colonnes — photo à gauche, contenu à droite avec le compteur « 01 / 02 »,
   un titre de 48, une bande de trois chiffres et deux blocs à étiquette.

   Ce gabarit tombe juste pour le sujet : la page a exactement deux
   hébergements à opposer, et les opposer dans le MÊME cadre — mêmes
   rubriques, mêmes trois chiffres au même endroit — les rend comparables
   ligne à ligne, ce qu'une succession de deux blocs ne fait pas.
   ══════════════════════════════════════════════════════════════════════ */

export type Option = {
  cle: string;
  onglet: string;
  titre: string;
  resume: string;
  image: string;
  alt: string;
  chiffres: { valeur: string; libelle: string }[];
  principe: string;
  obtenez: string[];
};

export default function Options({ options }: { options: Option[] }) {
  const [actif, setActif] = useState(0);
  const o = options[actif];

  return (
    <>
      <div className="flex flex-col items-center">
        <p className="vd-eyebrow">DEUX OPTIONS</p>
        <div className="vd-onglets mt-5" role="tablist" aria-label="Choix de l'hébergement">
          {options.map((opt, i) => (
            <button
              key={opt.cle}
              type="button"
              role="tab"
              id={`vd-onglet-${opt.cle}`}
              aria-selected={i === actif}
              aria-controls={`vd-volet-${opt.cle}`}
              onClick={() => setActif(i)}
              className="vd-onglet"
            >
              {opt.onglet}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`vd-volet-${o.cle}`}
        aria-labelledby={`vd-onglet-${o.cle}`}
        className="mt-10 grid grid-cols-1 gap-0 overflow-hidden rounded-[var(--vd-r-lg)] bg-[var(--vd-soft)] lg:grid-cols-2"
      >
        {/* la photo — `key` sur l'image pour que Next reparte d'un nœud neuf
            à chaque changement d'onglet plutôt que de garder l'ancienne le
            temps du chargement, ce qui donnait un fondu entre deux salles. */}
        <div className="relative min-h-[260px] lg:min-h-[560px]">
          <Image
            key={o.image}
            src={o.image}
            alt={o.alt}
            fill
            sizes="(min-width:1024px) 608px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="p-7 md:p-12">
          <p className="vd-eyebrow">
            {String(actif + 1).padStart(2, "0")} / {String(options.length).padStart(2, "0")}
          </p>
          <h3 className="vd-h2 mt-4">{o.titre}</h3>
          <p className="vd-body mt-5">{o.resume}</p>

          <div className="vd-stats mt-8">
            {o.chiffres.map((c) => (
              <div key={c.libelle}>
                <p className="vd-chiffre">{c.valeur}</p>
                <p className="mt-1.5 text-[13px] leading-[1.4] tracking-[-0.01em] text-black/60">
                  {c.libelle}
                </p>
              </div>
            ))}
          </div>

          <hr className="mt-8 border-t border-[var(--vd-line)]" />

          <p className="vd-eyebrow mt-7">LE PRINCIPE</p>
          <p className="vd-body mt-2.5">{o.principe}</p>

          <p className="vd-eyebrow mt-7">CE QUE VOUS OBTENEZ</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {o.obtenez.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="vd-check mt-0.5">
                  <Coche className="h-3 w-3" />
                </span>
                <span className="vd-body flex-1">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
