/* ══════════════════════════════════════════════════════════════════════
   « Lecture seule » — le bandeau de logos de la référence (« Trusted by
   leading teams » : un libellé en capitales, deux rubans masqués aux
   bords qui défilent en sens contraire, 35 s et 40,25 s, grisés et
   éclaircis au survol), recopié classe par classe. À la place des logos
   clients, les données que Tiroma lit (textes.ts, BANDEAU_LU, 24/09) :
   une icône et son libellé, à la hauteur des logos (h-6).
   ══════════════════════════════════════════════════════════════════════ */
import type { CSSProperties } from "react";
import Apparition from "@/components/accueil/Apparition";
import { BANDEAU_LU } from "./textes";

const ARTICLE: CSSProperties = { filter: "grayscale(1)", transition: "filter 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" };
const MASQUE: CSSProperties = {
  maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
  WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
};

function Ruban({ duree, sens, articles }: { duree: string; sens: "normal" | "reverse"; articles: typeof BANDEAU_LU }) {
  return (
    <div className="overflow-hidden py-4" style={MASQUE}>
      <div className="flex w-max items-center" style={{ animation: `tir-auto-scroll-ribbon ${duree} linear infinite`, animationDirection: sens }}>
        {[0, 1, 2].map((copie) =>
          articles.map(({ cle, Icone, libelle }) => (
            <div key={`${copie}-${cle}`} aria-hidden={copie > 0} className="flex shrink-0 items-center justify-center pl-14 sm:pl-16" style={ARTICLE}>
              <span className="inline-flex items-center">
                <span className="inline-flex h-6 w-auto items-center gap-2.5 text-tir-foreground opacity-65 transition-opacity hover:opacity-100">
                  <Icone className="size-6 shrink-0" strokeWidth={1.8} />
                  <span className="whitespace-nowrap text-base font-medium">{libelle}</span>
                </span>
              </span>
            </div>
          )),
        )}
      </div>
    </div>
  );
}

export default function Bandeau() {
  return (
    <section data-monde="clair" className="py-16 md:py-24">
      <Apparition className="mx-auto max-w-5xl px-6">
        <p className="mb-8 text-center font-medium text-tir-muted-foreground text-sm uppercase tracking-wider">Lecture seule</p>
        <div className="space-y-2">
          <Ruban duree="35s" sens="normal" articles={BANDEAU_LU} />
          <Ruban duree="40.25s" sens="reverse" articles={[...BANDEAU_LU].reverse()} />
        </div>
      </Apparition>
    </section>
  );
}
