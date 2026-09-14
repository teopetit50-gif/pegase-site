import { PenLine, ShieldCheck, Table2 } from "lucide-react";
import { PRINCIPE } from "@/lib/produits/relances";
import { HowItWorks } from "./ui/how-it-works";

/* Les trois temps de la matinée, sur le composant `how-it-works`.

   Ce qu'on y gagne : les vignettes dessinées à la main disparaissent —
   trois petites maquettes animées qui occupaient 160 à 210 px chacune
   pour dire ce que trois puces disent en une ligne. Les faits, eux,
   restent tous : ils sont passés dans les puces. */

const ICONES = [
  <Table2 key="relit" className="size-6" strokeWidth={1.5} />,
  <PenLine key="ecrit" className="size-6" strokeWidth={1.5} />,
  <ShieldCheck key="arrete" className="size-6" strokeWidth={1.5} />,
];

export function Principe() {
  return (
    <HowItWorks
      id="principe"
      className="scroll-mt-24"
      sourcil={PRINCIPE.sourcil}
      titre={PRINCIPE.titre}
      chapo={PRINCIPE.chapo}
      etapes={PRINCIPE.cartes.map((c, i) => ({
        icone: ICONES[i],
        titre: c.titre,
        texte: c.texte,
        points: c.points,
      }))}
    />
  );
}
