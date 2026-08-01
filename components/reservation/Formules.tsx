"use client";

/* ══════════════════════════════════════════════════════════════════════
   /reserver-un-audit — bloc haut : sélecteur de profil, trois formules,
   bandeau d'orientation, comparatif. (26/07/2026)

   Ces quatre sections sont contiguës sur la page de référence ET partagent
   le même état (le profil choisi pilote les cartes comme les colonnes du
   comparatif). Elles vivent donc dans un seul composant client plutôt que
   dans un contexte partagé : moins d'indirection, et le reste de la page
   demeure entièrement statique.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import {
  COMPARATIF,
  COURRIEL,
  PROFILS,
  lienContact,
  lienReservation,
  type Formule,
  type Point,
} from "@/lib/reservation";

/* Le libellé d'un point comporte une portion en gras (`fort`) — la
   référence met en gras le mot qui porte la différence, jamais la phrase
   entière. On coupe autour de la première occurrence. */
function Libelle({ point }: { point: Point }) {
  if (!point.fort || !point.texte.includes(point.fort)) return <>{point.texte}</>;
  const [avant, ...reste] = point.texte.split(point.fort);
  return (
    <>
      {avant}
      <span className="font-semibold text-[#050505]">{point.fort}</span>
      {reste.join(point.fort)}
    </>
  );
}

function Carte({ f }: { f: Formule }) {
  return (
    <div className={`r-carte ${f.phare ? "r-carte--phare" : ""}`}>
      <div className="r-carte-tete">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-[family-name:var(--font-jakarta)] text-[26px] font-semibold leading-[34px] tracking-[-0.02em] text-[#050505] sm:text-[28px] sm:leading-[36px]">
            {f.nom}
          </h3>
          {f.badge ? <span className="r-badge mt-1.5">{f.badge}</span> : null}
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="num text-[36px] font-semibold leading-[44px] text-[#050505] sm:text-[40px] sm:leading-[48px]">
            {f.duree}
          </span>
          <span className="text-[12px] leading-[18px] text-[#050505]">{f.suffixe}</span>
        </div>
        <div className="mt-1 text-[14px] leading-[22px] text-[#3d3d3d]">{f.conditions}</div>

        <p className="mt-4 text-[15px] leading-[22px] text-[#050505]">{f.promesse}</p>
      </div>

      <div className="flex flex-1 flex-col px-3 pt-4">
        <a
          href={lienReservation(`${f.nom} (${f.duree})`)}
          className={`r-btn w-full ${f.phare ? "r-btn--noir" : "r-btn--fil"}`}
        >
          {f.cta}
        </a>
        <p className="r-note mt-2 text-center">{f.souscta}</p>

        <div className="mt-6 text-[14px] font-semibold leading-[20px] text-[#050505]">
          {f.enteteListe}
        </div>
        <ul className="mt-3 space-y-3">
          {f.points.map((p) => (
            <li
              key={p.texte}
              className={`flex gap-2 text-[14px] leading-[22px] text-[#3d3d3d] ${
                p.surligne ? "r-surligne" : ""
              }`}
            >
              <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#050505]" />
              <span>
                <Libelle point={p} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ——— une ligne du comparatif ———
   La grille fait six colonnes : le libellé en occupe trois, chaque formule
   une. En dessous de 768 px la grille retombe à trois colonnes, le libellé
   passe pleine largeur et chaque valeur est coiffée du nom de sa formule
   (sinon on ne sait plus quelle colonne on lit). */
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
        <div className="text-[15px] font-semibold leading-[22px] text-[#050505]">{libelle}</div>
        <p className="mt-1 max-w-[42ch] text-[13px] leading-[20px] text-[#616161]">{aide}</p>
      </div>
      {valeurs.map((v, i) => (
        <div key={noms[i]} className="text-[14px] leading-[20px] text-[#3d3d3d]">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161] md:hidden">
            {noms[i]}
          </div>
          {v}
        </div>
      ))}
    </div>
  );
}

export default function Formules() {
  const [profil, setProfil] = useState(0);
  const p = PROFILS[profil];
  const noms = p.formules.map((f) => f.nom) as [string, string, string];

  const visibles = COMPARATIF.filter((f) => !f.repliee);
  const repliees = COMPARATIF.filter((f) => f.repliee);

  return (
    <>
      {/* ═══ 1. titre + sélecteur + trois formules ═══ */}
      <section data-monde="clair" className="r-wrap pb-10 pt-12 sm:pb-14 sm:pt-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <h1 className="r-h1 max-w-[16ch]">Un audit pour chaque situation</h1>

          <div
            role="tablist"
            aria-label="Profil d'entreprise"
            className="r-seg shrink-0 self-start"
          >
            {PROFILS.map((x, i) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={profil === i}
                data-actif={profil === i}
                onClick={() => setProfil(i)}
                className="r-seg-btn"
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-4">
          {/* colonne de gauche — la référence y loge sa preuve sociale ;
              Omega n'en a pas d'authentique, on y met donc les deux faits
              qui décident réellement : c'est gratuit, et c'est financé. */}
          <div className="flex flex-col justify-start gap-8 pr-2 lg:pt-2">
            <p className="text-[19px] font-medium leading-[27px] text-[#050505] sm:text-[21px] sm:leading-[29px]">
              Gratuit, sans engagement.
              <br />
              Toute collaboration commence ici.
            </p>
            <div className="border-t border-[#e3e3e3] pt-6">
              <div className="text-[14px] font-semibold leading-[20px] text-[#050505]">
                Chèque TIC
              </div>
              <p className="mt-1.5 text-[13px] leading-[20px] text-[#616161]">
                Jusqu&apos;à 80 % d&apos;une installation financés par la Région Guadeloupe
                pour les TPE éligibles. Votre éligibilité est vérifiée pendant
                l&apos;audit, avant tout engagement.
              </p>
            </div>
          </div>

          {p.formules.map((f) => (
            <Carte key={f.id} f={f} />
          ))}
        </div>

        <p className="r-note mt-6 max-w-3xl">
          *Créneaux du lundi au vendredi, 8 h – 18 h (heure Guadeloupe). Les durées
          annoncées sont tenues : l&apos;entretien se termine à l&apos;heure. Les deux
          formats sur site sont facturés sur devis et déduits de l&apos;installation si
          vous décidez d&apos;aller plus loin.
        </p>
      </section>

      {/* ═══ 2. bandeau d'orientation ═══ */}
      <section data-monde="clair" className="r-wrap pb-14 sm:pb-16">
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <p className="max-w-[62ch] text-[15px] leading-[23px] text-[#3d3d3d]">
            <span className="font-semibold text-[#050505]">
              Vous ne savez pas quel format choisir ?
            </span>{" "}
            Décrivez votre situation en deux lignes — votre activité, votre commune, ce
            qui vous coûte le plus cher. On vous propose le format adapté et trois
            créneaux.
          </p>
          <a
            href={lienContact("Quel format d'audit pour moi ?")}
            className="r-btn r-btn--fil shrink-0"
          >
            Décrire ma situation
          </a>
        </div>
      </section>

      {/* ═══ 3. comparatif ═══ */}
      <section id="comparatif" data-monde="clair" className="r-blanc">
        <div className="r-wrap py-14 sm:py-20">
          <h2 className="r-h2">Comparer les formats</h2>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
            <a
              href={lienContact("Aidez-moi à choisir un format d'audit")}
              className="r-lien"
            >
              Aidez-moi à choisir
            </a>
          </div>

          {/* en-tête collant : les trois formules restent lisibles pendant
              qu'on descend dans les lignes */}
          <div className="sticky top-16 z-10 mt-10 hidden bg-white pb-4 pt-4 sm:top-[72px] md:block">
            <div className="grid grid-cols-6 gap-x-6 border-b border-[#e3e3e3] pb-5">
              <div className="col-span-3 self-end text-[13px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                {p.label}
              </div>
              {p.formules.map((f) => (
                <div key={f.id}>
                  <div className="font-[family-name:var(--font-jakarta)] text-[19px] font-semibold leading-[26px] tracking-[-0.01em] text-[#050505]">
                    {f.nom}
                  </div>
                  <div className="num mt-0.5 text-[14px] leading-[22px] text-[#3d3d3d]">
                    {f.duree} · {f.conditions}
                  </div>
                  <a
                    href={lienReservation(`${f.nom} (${f.duree})`)}
                    className={`r-btn mt-3 w-full !py-2 !text-[14px] ${
                      f.phare ? "r-btn--noir" : "r-btn--fil"
                    }`}
                  >
                    {f.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* familles toujours visibles */}
          <div className="mt-8 md:mt-2">
            {visibles.map((fam) => (
              <div key={fam.titre}>
                <h3 className="r-h4 pb-2 pt-10">{fam.titre}</h3>
                {fam.lignes.map((l) => (
                  <Ligne key={l.libelle} {...l} noms={noms} />
                ))}
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
                  {fam.lignes.map((l) => (
                    <Ligne key={l.libelle} {...l} noms={noms} />
                  ))}
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>
    </>
  );
}
