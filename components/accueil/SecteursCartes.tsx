/* ══════════════════════════════════════════════════════════════════════
   LES SECTEURS DE L'ACCUEIL — 25/09/2026, seconde version.

   Teo, sur la première (les photos repliées qui s'ouvrent au survol,
   `expanding-cards`) : « j'aime bien l'idée, mais pas le composant ; un
   composant où on peut voir toutes les photos, et comme ces visuels on
   comprend direct ». Les six cartes sont donc toutes ouvertes, photo en
   tête.

   Repris de `project-card` (@ravikatiyar162, 21st.dev, registre
   /r/ravikatiyar162/project-card) : photo, titre, texte, lien ; la photo
   grossit au survol et la carte se soulève. Avec, sur la photo, la
   pastille du logiciel (idée tirée de `card-7`, @lavikatiyar).

   Écarts à l'original, tous voulus :
   · la carte entière est UN lien (l'original était un <div> cliquable avec
     un second <a target="_blank"> dedans : deux cibles, dont une qui ouvrait
     un nouvel onglet vers notre propre site) ;
   · coins à 6 px (`rounded-md`), l'arrondi des cartes de l'accueil ; filet
     encre diluée de TuilesCatalogue et même ombre au survol, soulevé de
     4 px et photo à 105 % au lieu de 8 px et 110 % (six cartes qui sautent
     autant, ça s'agite) ;
   · la typographie des tuiles du catalogue (étiquette 12 px en capitales,
     intitulé 19 px, texte 14/15 px) : les deux grilles de l'accueil parlent
     la même langue ;
   · photo en 3:2 et non en 16:9 : ce sont les photos qui font comprendre ;
   · sous 768 px, les cartes défilent à l'horizontale (80 % de largeur, la
     suivante dépasse) au lieu de s'empiler : six photos l'une sous l'autre
     faisaient quatre écrans de haut.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import type { CarteSecteur } from "@/lib/secteurs-accueil";

export function SecteursCartes({ cartes }: { cartes: CarteSecteur[] }) {
  return (
    <ul className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] md:mx-auto md:grid md:max-w-[1200px] md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
      {cartes.map((c) => (
        <li key={c.slug} className="w-[80%] shrink-0 snap-start md:w-auto">
          <Link
            href={`/secteurs/${c.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-md border border-[rgba(24,24,27,0.12)] bg-white transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1 hover:border-[rgba(24,24,27,0.2)] hover:shadow-[0_6px_20px_rgba(24,24,27,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181b] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <div className="relative aspect-[3/2] overflow-hidden bg-[#f4f4f5]">
              <Image
                src={c.photo}
                alt=""
                fill
                sizes="(min-width: 1024px) 384px, (min-width: 768px) 50vw, 80vw"
                style={c.cadrage ? { objectPosition: c.cadrage } : undefined}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-md bg-black/55 px-2.5 py-1.5 text-[13px] font-semibold text-white backdrop-blur-sm">
                <span
                  aria-hidden
                  className="size-[15px] shrink-0 bg-white"
                  style={{
                    maskImage: `url(/logos/${c.saas.toLowerCase()}-mark.png)`,
                    WebkitMaskImage: `url(/logos/${c.saas.toLowerCase()}-mark.png)`,
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                />
                {c.saas}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--o-muted)]">{c.metier}</p>
              <h3 className="mt-2.5 text-[18px] font-medium leading-[1.35] tracking-[-0.01em] text-[var(--o-text)] sm:text-[19px]">
                {c.probleme}
              </h3>
              <p className="mt-2 flex-1 text-[14px] leading-[22px] text-[var(--o-muted)] sm:text-[15px] sm:leading-[24px]">
                {c.reponse}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 self-start text-[14px] font-semibold text-[var(--o-text)]">
                Voir {c.saas}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-[3px]">
                  →
                </span>
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
