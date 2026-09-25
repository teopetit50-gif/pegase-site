/* ══════════════════════════════════════════════════════════════════════
   L'appel final — « Votre premier point du matin, demain à 7 h ? ».

   Dans la source, ce bloc ouvrait son PIED DE PAGE (<footer>), au-dessus
   des colonnes de liens, de la marque et du « © 2026 ». Le pied de la
   source ne vient pas (c'est celui d'Omega qui sert) : seul l'appel reste,
   en section, avec ses trois fonds recopiés — le bruit WebGL sur 600 px
   (FondBruit, vert d'eau pâle depuis le 24/09), la trame de glyphes sur
   256 px (TrameGlyphes, à 12 %), la grille de points qui s'efface vers le
   bas. La hauteur est celle du bloc d'appel de la source (80 puis 128 px
   au-dessus, 64 puis 80 px au-dessous) : le calque de 600 px est rogné par
   la section, comme il l'était par le pied.

   Boutons : « Réserver une démo » (omegaai.fr/reserver) → « Réserver un
   audit », /reserver-un-audit. « Nous écrire » (mailto:contact@omegaai.fr)
   devient « Voir la démo », l'ancre de la démo de la page, même habit :
   tous les boutons d'action mènent à la réservation d'audit (règle
   maison), et un second bouton vers la même adresse n'aurait rien dit de
   plus.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import Apparition from "./Apparition";
import BoutonDegrade from "./BoutonDegrade";
import FondBruit from "./FondBruit";
import LienAncre from "./LienAncre";
import { RESERVER } from "./outils";
import TrameGlyphes from "./TrameGlyphes";

export default function Appel() {
  return (
    <section data-monde="clair" className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] overflow-hidden">
        <FondBruit />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden opacity-100">
        <TrameGlyphes couleur="#A0CCC3" couleurSeconde="#3B7A6E" opacite={0.12} />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "rgb(148 163 184)",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
        }}
      />
      <Apparition>
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-24 text-center lg:px-12 lg:pb-20 lg:pt-32">
          <h2 className="mb-8 font-sans text-4xl leading-[0.95] tracking-tight text-black lg:text-7xl">
            Votre premier
            <br />
            point du matin,
            <br />
            demain à 7 h ?
          </h2>
          <p className="mb-12 max-w-xl text-xl leading-relaxed text-slate-600">
            Une démonstration sur un agenda d&apos;exemple, puis l&apos;audit qui fixe le prix. Sans engagement.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <BoutonDegrade asChild className="group min-w-0 gap-2 px-8 py-4">
              <Link href={RESERVER}>
                Réserver un audit
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </BoutonDegrade>
            <LienAncre
              cible="demo"
              className="inline-flex h-14 items-center gap-2 rounded-[6px] border border-slate-200 bg-white/70 px-8 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Play size={18} />
              Voir la démo
            </LienAncre>
          </div>
        </div>
      </Apparition>
    </section>
  );
}
