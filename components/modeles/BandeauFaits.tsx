import { cn } from "@/lib/cn";
import "./BandeauFaits.css";

/* ══════════════════════════════════════════════════════════════════════
   <BandeauFaits> — les quatre faits sous le hero de /modeles (14/09/2026)

   ORIGINE. Bloc « stats », variante `one`, de Tailark (dépôt public
   tailark/blocks, base radix/mist) : une `Card` divisée en cellules par des
   filets (`divide-y` sous md, `divide-x` au-dessus), grande valeur en gras,
   précision grise dessous, le tout centré. Les variantes `two` et `four`
   sont des grilles nues sans carte — c'est déjà ce que la page avait — et
   `three` est une liste à flèches ; `one` est la seule qui donne un objet.

   POURQUOI ICI. La rangée actuelle pose quatre couples de texte nus sur
   le blanc, à la même graisse que le chapô ; on ne les distingue pas du
   reste de la page. La référence de /modeles (scale.com) ne pose jamais
   rien nu : la carte à filets donne aux faits un contour, et les filets
   intérieurs disent « quatre faits de même poids » sans un mot de plus.

   CE QUI EST JETÉ de la source :
   1. La `Card` shadcn et ses jetons (`bg-muted`, `text-foreground`,
      `text-muted-foreground`) : absents ici. C'est du HTML (`ul` / `li`)
      et les jetons `--m-carte`, `--m-filet`, `--m-encre`, `--m-faible`.
   2. `divide-x` / `divide-y` : en 2 × 2 ils poseraient un filet haut sur
      la deuxième cellule de la première rangée. Remplacés par une grille à
      `gap: 1px` sur fond filet (BandeauFaits.css), qui donne les trois
      dispositions avec la même règle.
   3. Les trois cellules et le `md:grid-cols-3` : quatre faits, donc
      1 colonne sous 30 rem (à 390 une cellule de 2 colonnes ne laisse
      que ~150 px à une valeur de 28 px), 2 × 2 jusqu'à md, 1 × 4 au-dessus.
   4. `text-4xl font-bold` (36 px, 700) : ramené à un clamp 28–36 px au
      POIDS 400, la doctrine de la page (bloc `.modeles` de globals.css :
      « un 600 aurait donné une page bruyante »). La distinction vient de
      la taille et de la carte, pas de la graisse.
   5. La section `bg-muted py-12` qui enveloppe : l'espacement et la phrase
      d'introduction restent dans page.tsx, le composant ne rend que la carte.

   ÉCARTS ASSUMÉS.
   – La valeur reste dans la famille de la page (Inter Tight, héritée de
     `.modeles`) et non en Plus Jakarta Sans comme les h1–h3 : ce ne sont
     pas des titres, et Jakarta, plus large d'œil, ferait passer « Branché
     aux moteurs » sur deux lignes dans une colonne de ~275 px à 1440.
   – La précision garde le gris et le corps de l'ancienne rangée
     (`--m-faible`, 13,5 px) pour ne pas remonter d'un cran dans la
     hiérarchie de la page ; seule la valeur grandit.
   – Pas de compteur animé sur « 21 » : la valeur est une chaîne de FAITS,
     et la compter de 0 imposerait soit un rendu serveur à 0 (faux sans
     JavaScript), soit un flash à l'hydratation. Composant serveur pur ;
     l'apparition est celle de la page (`data-reveal`, posé sur le texte
     de chaque cellule et non sur la cellule, pour que le fond filet ne
     transparaisse pas pendant le fondu).
   – `role="list"` sur le `ul` : avec `list-style: none`, Safari/VoiceOver
     retire la sémantique de liste ; l'attribut la rend (« liste,
     4 éléments »).

   TYPAGE. La prop accepte `readonly (readonly string[])[]` et non un
   tableau de tuples : la constante FAITS de page.tsx est écrite sans
   `as const` et s'infère `string[][]`, qui n'est pas assignable à un tuple
   de 2. `Fait` reste exporté pour qui veut typer sa constante ; les
   couples incomplets rendent une chaîne vide plutôt qu'un `undefined`.
   ══════════════════════════════════════════════════════════════════════ */

export type Fait = readonly [valeur: string, precision: string];

export default function BandeauFaits({
  faits,
  className,
}: {
  /** quatre couples valeur / précision — la page passe FAITS */
  faits: readonly (Fait | readonly string[])[];
  className?: string;
}) {
  return (
    <div className={cn("bf-carte", className)}>
      <ul className="bf-grille" role="list">
        {faits.map((fait) => {
          const [valeur = "", precision = ""] = fait;
          return (
            <li key={valeur} className="bf-cellule">
              <div data-reveal>
                <p className="bf-valeur">{valeur}</p>
                <p className="bf-precision">{precision}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
