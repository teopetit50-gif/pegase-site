import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   « J-2 » ne se coupe plus en fin de ligne — 24/09/2026

   Sur le site source, à 390 px, « J-2 » se cassait en « J- » / « 2 » :
   le trait d'union est une occasion de coupure pour le navigateur.
   Teo : trait d'union insécable (U+2011) ou `white-space: nowrap`.

   POURQUOI PAS U+2011 : la police du site (General Sans, app/_polices)
   n'a PAS ce glyphe (vérifié à la table cmap le 24/09). Le navigateur
   irait le chercher dans une police de secours, et le tiret de « J‑2 »
   n'aurait ni la graisse ni la chasse de ses voisins. On garde donc le
   trait d'union ordinaire, et c'est le mot entier qui refuse la coupure.

   Pour les textes écrits dans le balisage (Chiffres, Fonctions, Métiers),
   la même enveloppe est posée à la main : <span className="whitespace-nowrap">.
   Cette fonction sert aux textes qui viennent de `textes.ts`. */
export function insecable(texte: string): ReactNode {
  const morceaux = texte.split(/(J-\d+)/);
  if (morceaux.length === 1) return texte;
  return morceaux.map((m, i) =>
    i % 2 === 1 ? (
      <span key={i} className="whitespace-nowrap">
        {m}
      </span>
    ) : (
      m
    ),
  );
}
