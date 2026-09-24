/* ══════════════════════════════════════════════════════════════════════
   Tavaro — APropos.tsx

   COPIÉ le 24/09/2026 à 14 h 58 de `OMEGA/rentalos-site/src/components/
   a-propos.tsx`. La section nomme les trois associés d'Omega avec leurs
   photos (Henri, Vincent, Teo) : c'est vrai, et voulu. Les photos sont
   recopiées dans public/secteurs-location/equipe/ (textes.ts).

   Ce qui change :
   · la phrase « à propos » ouvre sur le LOCKUP OFFICIEL (marque.tsx,
     masque de /logos/tavaro-lockup.png), comme dans la source ;
   · les portraits passent par next/image (mêmes 130 × 130, mêmes classes,
     chargement différé comme le `loading="lazy"` de la source) au lieu
     d'un <img> : le site sert ainsi un fichier à la taille affichée ;
   · `text-body2/3/4/5/6` → `text-[18px]/[1.5]`, `text-[17px]/[1.5]`,
     `text-[16px]/[1.5]`, `text-[14px]/[1.5]`, `text-[12px]/[1.5]` ;
     `mt-16`, `gap-4` (échelle en PIXELS de la source) → `mt-[16px]`,
     `gap-[4px]` ; `text-[color:var(--x)]` → `text-[color:var(--x)]` ;
   · « co‑fondateur » (U+2011, absent de General Sans) : trait d'union
     ordinaire tenu d'un bloc par `insecable()` ;
   · les liens « Explorer » sont des ancres de la page : inchangés.
   La mise en page est dans styles/About.css ; l'écart des trois portraits
   (`.About_founders`, règle de la source) dans location.css.
   ══════════════════════════════════════════════════════════════════════ */
import { Fragment } from "react";
import Image from "next/image";
import { A_PROPOS } from "./textes";
import { Marque } from "./marque";
import { Drapeau } from "./drapeau";

/* « CTO & co-fondateur » : le mot composé ne se coupe pas à son trait
   d'union (la source l'écrivait avec U+2011, absent de General Sans). */
function insecable(texte: string) {
  return texte.split(" ").map((mot, k) => (
    <Fragment key={k}>
      {k > 0 ? " " : null}
      {mot.includes("-") ? <span className="whitespace-nowrap">{mot}</span> : mot}
    </Fragment>
  ));
}

export function APropos() {
  return (
    <section id="a-propos" className="About_section" aria-labelledby="a-propos-title">
      <div className="page-container wide">
        <div className="About_inner">
          <header className="About_header">
            <h2 id="a-propos-title" className="section-label">{A_PROPOS.etiquette}</h2>
          </header>
          <div className="About_people">
            <p className="f-onest About_identity text-[17px]/[1.5] leading-[1.65] lg:text-[18px]/[1.5] lg:leading-[1.6]">
              <Marque className="mx-[0.18em] inline-flex translate-y-[0.16em] align-baseline text-[1em]" />
              {A_PROPOS.identite}
              <Drapeau className="ml-[0.35em] inline-block h-[0.62em] w-auto translate-y-[-0.05em] rounded-[1px] align-baseline" />
            </p>
            <div className="About_founders">
              {A_PROPOS.equipe.map((p) => (
                <figure key={p.prenom} className="flex min-w-0 flex-col items-center text-center">
                  <Image
                    alt={`${p.nom}, ${p.role}`}
                    width={130}
                    height={130}
                    src={p.photo}
                    className="mx-auto h-[96px] w-[96px] rounded-[12px] border border-black/10 object-cover object-top sm:h-[120px] sm:w-[120px] md:h-[130px] md:w-[130px] lg:h-[104px] lg:w-[104px] xl:h-[130px] xl:w-[130px]"
                  />
                  <figcaption className="mt-[16px] flex flex-col items-center gap-[4px]">
                    <div className="f-syne whitespace-nowrap text-[14px]/[1.5] font-medium uppercase tracking-[0.08em] text-[color:var(--text)]">{p.prenom}</div>
                    <div className="f-onest text-[10px] font-normal uppercase tracking-[0.08em] text-[color:var(--muted)] sm:text-[12px]/[1.5] sm:tracking-[0.12em]">{insecable(p.role)}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <hr className="About_divider" />
          <div id="ce-que-tavaro-construit" className="About_builds" aria-labelledby="construit-title">
            <div className="About_buildsLead">
              <h3 id="construit-title" className="section-label About_buildsLabel">{A_PROPOS.construitTitre}</h3>
              <p className="f-onest About_buildsBody text-[16px]/[1.5] leading-[1.65] md:text-[17px]/[1.5]">{A_PROPOS.construit}</p>
            </div>
            <div className="About_side">
              <ul className="f-onest About_list">
                {A_PROPOS.liste.map((t, i) => (
                  <li key={t} className="About_item text-[14px]/[1.5] md:text-[16px]/[1.5]">
                    <span className="About_index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                    <span className="About_itemText">{t}</span>
                  </li>
                ))}
              </ul>
              <nav aria-label={A_PROPOS.explorer} className="f-onest About_nav">
                <span className="About_navLabel">{A_PROPOS.explorer}</span>
                <ul className="About_links">
                  {A_PROPOS.liens.map((l) => (
                    <li key={l.href}><a className="About_link text-[12px]/[1.5]" href={l.href}>{l.libelle}</a></li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
