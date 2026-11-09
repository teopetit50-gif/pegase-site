/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Enonce.tsx (09/11/2026)
   L'énoncé centré de la référence (« We design buildings people use
   every day… ») : section `flex-col items-center px-4 pt-28 text-center`,
   paragraphe `max-w-[22ch] font-statement text-statement leading-[1.15]`
   dont deux mots sont suivis d'une pastille d'image (`h-[0.82em] w-[1.6em]
   rounded-full bg-rule`, image à l'échelle 1,3), puis le bouton encre
   à `mt-12`. Texte : le titre de « 01 — Le produit ». Les mots montent
   avec l'apparition de l'accueil, non avec le `translateY(110%)` de la
   référence (la seule exception à la copie).
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import Apparition from "@/components/accueil/Apparition";
import Bouton from "./Bouton";
import { CONTACT, PRODUIT } from "./textes";

function Pastille({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="relative mr-[0.25em] inline-block h-[0.82em] w-[1.6em] translate-y-[0.08em] overflow-hidden rounded-full bg-rule align-baseline"
    >
      <span className="absolute inset-0 block" style={{ transform: "scale(1.3)" }}>
        <Image alt="" src={src} fill sizes="120px" className="object-cover" />
      </span>
    </span>
  );
}

/* la deuxième ligne du titre est coupée avant son dernier mot pour y
   glisser la seconde pastille, comme la référence coupe sa phrase */
const [LIGNE_1, LIGNE_2] = PRODUIT.titre;
const COUPE = LIGNE_2.lastIndexOf(" ");
const LIGNE_2A = LIGNE_2.slice(0, COUPE);
const LIGNE_2B = LIGNE_2.slice(COUPE + 1);

export default function Enonce() {
  return (
    <section
      data-monde="clair"
      className="mx-auto flex w-full max-w-[1600px] flex-col items-center px-4 pt-28 text-center min-[810px]:px-8 min-[810px]:pt-44"
    >
      <GroupeApparition retard={1300} className="flex flex-col items-center">
        <p className="max-w-[22ch] font-statement text-statement leading-[1.15] min-[1200px]:max-w-[24ch]">
          <span className="sr-only">{PRODUIT.titre.join(" ")}</span>
          <span aria-hidden="true">
            <MotsApparition texte={LIGNE_1} depart={0} /> <Pastille src="/secteurs-architectes/photos/rehabilitation.jpg" />
            <MotsApparition texte={LIGNE_2A} depart={300} /> <Pastille src="/secteurs-architectes/plans/facades.webp" />
            <MotsApparition texte={LIGNE_2B} depart={700} />
          </span>
        </p>
        <Apparition delai={900} className="mt-12 min-[810px]:mt-16">
          <Bouton href={CONTACT.audit}>{PRODUIT.audit}</Bouton>
        </Apparition>
      </GroupeApparition>
    </section>
  );
}
