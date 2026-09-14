import { Badge } from "@/components/produits/factures/ui/badge";
import { Drapeau } from "@/components/produits/factures/ui/drapeau";

/* ══════════════════════════════════════════════════════════════════════
   « Un produit français » — bloc de confiance, placé avant les tarifs
   (motif « Trust & Authority » : la preuve précède le prix).

   Composé sur le motif des deux composants que Teo a retenus : texte à
   gauche, VISUEL à droite, et le texte réduit à ce qui ne se voit pas.
   Quatre faits de trois mots, pas quatre paragraphes.

   Le visuel est le DRAPEAU. Une carte de France avait été dessinée ici —
   Teo l'a écartée, le drapeau suffit. Ne pas la remettre.

   ⚠️ CE QUI EST ÉCRIT ICI EST EXACT, ET CE QUI N'Y EST PAS L'EST AUSSI.

   · « Conçu en France » — vrai : la Guadeloupe est française, 971.
   · « Hébergé dans l'Union européenne » — vrai : la base est à
     Francfort. NE PAS écrire « hébergé en France », c'est faux.
   · Il n'est écrit NULLE PART que les données ne quittent jamais
     l'Europe : la lecture des pièces passe par un service qui n'est pas
     hébergé dans l'UE. Tant que ce point n'est pas réglé, ce bloc ne
     promet aucune souveraineté des traitements.
   ══════════════════════════════════════════════════════════════════════ */

const FAITS = [
  ["Conception", "France · 971"],
  ["Hébergement", "Union européenne"],
  ["Droit applicable", "Français"],
  ["Facturation", "Euros, TVA française"],
];

export default function Francais() {
  return (
    <div className="mx-0 grid items-center gap-10 lg:mx-5 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-6">
        <div>
          <Badge
            variant="outline"
            className="gap-2 border-[#171717]/[0.19] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#2b2b2b]"
          >
            <Drapeau className="h-3 w-auto rounded-[1px] ring-1 ring-[#171717]/20" />
            Produit français
          </Badge>
        </div>

        <p className="max-w-md text-[16px] leading-relaxed text-[#737373] sm:text-lg">
          Vos factures disent ce que vous achetez, à qui, et combien. C&apos;est une raison
          suffisante de savoir où elles vont.
        </p>

        <dl className="max-w-md divide-y divide-[#171717]/[0.11] border-y border-[#171717]/[0.11]">
          {FAITS.map(([cle, valeur]) => (
            <div key={cle} className="flex items-baseline justify-between gap-4 py-3">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#5f5f5f]">
                {cle}
              </dt>
              <dd className="text-right text-[15px] font-medium text-[#171717] sm:text-base">
                {valeur}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative">
        <div className="relative overflow-hidden rounded-xl border border-[#171717]/[0.16] bg-[linear-gradient(#ffffff,#f2f2f3)] p-8 sm:p-12">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(23,23,23,0.5) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Filigrane d'angle : le même drapeau, très effacé, pour
              occuper le coin sans faire de bruit.

              11/09 — IL EST PASSÉ EN GRIS. Sur du noir, un drapeau saturé
              à 5 % ne se voyait pas ; sur du papier, les mêmes 5 % de
              bleu et de rouge redeviennent deux bandes de couleur que
              l'`overflow-hidden` coupe net — on lisait deux rectangles
              bleu et rose, pas un filigrane. Un filigrane sur du papier
              est GRIS : `grayscale` le ramène à trois valeurs de ton, et
              c'est seulement là qu'il peut « occuper le coin sans faire
              de bruit », ce qui était l'intention. L'opacité remonte de
              0,05 à 0,14 parce que la matière a changé : une fois gris,
              le bleu vaut #0a0a0a et le rouge #313131 — à 0,14 sur du
              blanc ils donnent #ddd et #e2e2e2, soit trois bandes juste
              perceptibles. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -right-8 hidden opacity-[0.14] [filter:grayscale(1)] sm:block"
          >
            <Drapeau className="h-48 w-auto" />
          </div>

          <div className="relative flex flex-col items-center">
            <Drapeau className="h-16 w-auto rounded-[4px] shadow-[0_14px_34px_-18px_rgba(23,23,23,0.45)] ring-1 ring-[#171717]/[0.14] sm:h-20" />
            <div className="mt-7 font-mono text-[10px] uppercase tracking-[0.16em] text-[#5f5f5f]">
              Conçu en Guadeloupe · 971
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
