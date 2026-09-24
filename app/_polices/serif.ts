/* ══ LA SERIF DE /secteurs/avocats — 24/09/2026 (soir) ══════════════════
   Seule exception à « une police pour tout le site » (index.ts), et elle
   ne sert qu'une page : Tamila, le logiciel des cabinets d'avocats.

   Teo, 24/09 : « on ne voit pas assez que ça fait avocat ». Le relevé de
   douze sites du métier (Harvey, Legora, Doctrine, Spellbook, EvenUp,
   Gide, August Debouzy…) donne le signe le plus constant : les titres
   sont en serif, fins, avec un mot en italique. Harvey compose ses titres
   dans une serif maison à 400, Doctrine en Tiempos à 300, EvenUp en
   PT Serif à 400, Gide dans une serif de titrage à 300.

   NEWSREADER (Production Type, Google Fonts, SIL Open Font License —
   usage commercial libre). Variable en graisse et en taille optique :
   à 72 px elle prend son dessin de titrage, serré et contrasté, le plus
   proche de Tiempos Headline parmi les serifs libres. Italique vraie.

   Déclarée à part pour ne pas être préchargée par le layout sur les
   trente autres pages : seule app/secteurs/avocats/page.tsx l'importe
   et pose `serifAvocats.variable` sur sa peau.
   ═══════════════════════════════════════════════════════════════════ */
import { Newsreader } from "next/font/google";

export const serifAvocats = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-avocats-serif",
});
