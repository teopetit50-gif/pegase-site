/* ══════════════════════════════════════════════════════════════════════
   L'appel final — le haut du pied de page de la référence : une photo en
   fond voilée de blanc, le titre en serif, le chapô, un bouton en pilule.
   Recopié classe par classe ; le pied lui-même (colonnes de liens) ne vient
   pas, c'est celui d'Omega qui sert (PageShell). Textes : Appel.tsx du
   24/09. La photo : la salle de soins (Unsplash, créditée).
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { PHOTO_FOND, RESERVER } from "./outils";

export default function Appel() {
  return (
    <section data-monde="clair" className="relative mt-12 overflow-hidden bg-tir-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Image src={PHOTO_FOND} alt="" aria-hidden="true" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-tir-background/30 dark:bg-tir-background/70" />
      </div>
      <GroupeApparition retard={700} className="relative px-6 pt-24 pb-32 text-center md:pt-32 md:pb-40 lg:px-8">
        <h2 className="mx-auto max-w-3xl text-balance font-bold text-5xl text-tir-foreground tracking-tight md:text-6xl lg:text-7xl">
          <MotsApparition texte="Votre premier point du matin, demain à 7 h ?" depart={80} />
        </h2>
        <Apparition as="p" delai={450} className="mx-auto mt-6 max-w-xl text-balance text-base text-tir-muted-foreground md:text-lg">
          {"Une démonstration sur un agenda d'exemple, puis l'audit qui fixe le prix. Sans engagement."}
        </Apparition>
        <Link href={RESERVER} className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap outline-none transition-all focus-visible:border-tir-ring focus-visible:ring-[3px] focus-visible:ring-tir-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-tir-destructive aria-invalid:ring-tir-destructive/20 dark:aria-invalid:ring-tir-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-tir-primary text-tir-primary-foreground shadow-xs hover:bg-tir-primary/90 h-10 has-[>svg]:px-4 mt-8 rounded-full px-6 py-5 font-medium text-sm">
          {"Réserver un audit"}
        </Link>
      </GroupeApparition>
    </section>
  );
}
