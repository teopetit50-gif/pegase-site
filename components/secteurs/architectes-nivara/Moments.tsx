/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Moments.tsx (09/11/2026)
   La section « Every stage, in house » de la référence : grille de douze
   colonnes (h2 `font-display text-h3` sur 4, chapô `font-statement
   text-h4 max-w-[40ch]` sur 7 à partir de la 6e), puis deux colonnes
   d'accordéons à `mt-14` (`gap-12`, `m:gap-8`, `l:gap-16`). Chaque
   panneau ouvert : `grid-cols-[1fr_auto] items-end gap-6 pb-6`, texte
   `max-w-[34ch] text-graphite`, image `aspect-[4/3] w-32 m:w-40 bg-rule`.
   Textes : le titre de « 02 — Fonctionnement » en h2, le chapô de
   « 01 — Le produit » en chapô ; colonne 1 les quatre arguments du
   produit, colonne 2 les quatre phases du fonctionnement (accroche,
   paragraphe, puces). Images : planches d'archives et photos Unsplash de
   la page actuelle, à la place des photos de la référence.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import Accordeon from "./Accordeon";
import { FONCTIONNEMENT, PRODUIT } from "./textes";

function Panneau({ image, alt, children }: { image: string; alt: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-6 pb-6">
      <div className="max-w-[34ch] text-graphite">{children}</div>
      <div className="relative aspect-[4/3] w-32 overflow-hidden bg-rule min-[810px]:w-40">
        <div className="absolute inset-0">
          <Image alt={alt} src={image} fill sizes="160px" className="object-cover" />
        </div>
      </div>
    </div>
  );
}

export default function Moments() {
  return (
    <section
      data-monde="clair"
      aria-labelledby="moments-title"
      className="mx-auto w-full max-w-[1600px] px-4 pt-28 min-[810px]:px-8 min-[810px]:pt-40"
    >
      <GroupeApparition retard={1600} className="grid gap-6 min-[810px]:grid-cols-12">
        <h2 id="moments-title" className="font-display text-h3 min-[810px]:col-span-4">
          <MotsApparition texte={FONCTIONNEMENT.titre} depart={0} />
        </h2>
        <p className="max-w-[40ch] font-statement text-h4 min-[810px]:col-span-7 min-[810px]:col-start-6">
          <MotsApparition texte={PRODUIT.texte} depart={300} pas={30} />
        </p>
      </GroupeApparition>
      <div className="mt-14 grid gap-12 min-[810px]:grid-cols-2 min-[810px]:gap-8 min-[1200px]:gap-16">
        <Accordeon
          intertitre={PRODUIT.sourcil}
          rangs={PRODUIT.arguments.map((a) => ({
            titre: a.titre,
            contenu: (
              <Panneau image={a.image} alt="">
                <p>{a.texte}</p>
              </Panneau>
            ),
          }))}
        />
        <Accordeon
          intertitre={FONCTIONNEMENT.sourcil}
          rangs={FONCTIONNEMENT.phases.map((ph) => ({
            titre: ph.titre,
            contenu: (
              <Panneau image={ph.image} alt="">
                <p>
                  <span className="text-ink">{ph.accroche}</span> {ph.texte}
                </p>
                <ul className="mt-4 text-small">
                  {ph.puces.map((p) => (
                    <li key={p} className="border-t border-rule py-2">
                      {p}
                    </li>
                  ))}
                </ul>
              </Panneau>
            ),
          }))}
        />
      </div>
    </section>
  );
}
