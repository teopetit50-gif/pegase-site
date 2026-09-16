"use client";

import { Landmark, PieChart, Receipt } from "lucide-react";
import type { ComponentType } from "react";
import { useMonde } from "@/components/tarifs/monde";
import { GRANDE_STRUCTURE } from "@/lib/paliers";

/* ══════════════════════════════════════════════════════════════════════
   ChequeTic — le Chèque TIC

   15/09/2026, TROISIÈME COMPOSITION (Teo : « change de composant pour
   cette section, j'aime pas, trouves-en un autre bien descriptif »).
   La bande quitte `features-2` (en-tête centré, trois cartes à décor
   quadrillé) pour `@tommyjepsen/stats-section-with-text`, relevé sur le
   registre 21st.dev le 15/09. Ce que la référence apporte et que la
   précédente n'avait pas : le dispositif est EXPLIQUÉ à gauche pendant
   que les chiffres se lisent à droite, au lieu de trois chiffres seuls
   auxquels un chapô de deux lignes devait tout faire dire.

   Relevé de la référence (fichier `stats-section-with-text.tsx`) :

     · `grid-cols-1 lg:grid-cols-2 gap-10`, la moitié gauche en
       `flex-col items-start` : pastille, titre, paragraphe ;
     · la moitié droite est une grille `sm:grid-cols-2 gap-2` de cartes
       `flex-col justify-between p-6 border rounded-md` ;
     · dans chaque carte : une icône de 16 px, `mb-10` (c'est ce vide
       qui donne leur hauteur aux cartes), puis un `h2` de 34 px qui
       porte le chiffre ET, en `items-end`, une mention de 14 px en gris
       sur la même ligne de base, puis la phrase.

   Écarts assumés :

   1. LA BANDE RESTE SOMBRE — `.r-nuit` est posée par la page, c'est le
      seul contraste de /tarifs. Les couleurs ne sont donc pas écrites en
      dur : les jetons du monde (`--r-texte`, `--r-doux`, `--r-faible`,
      `--r-filet`) basculent déjà avec la bande. La référence, elle, est
      une section claire en jetons shadcn, absents ici.
   2. QUATRE CARTES DANS LA RÉFÉRENCE, TROIS ICI. Les faits du Chèque TIC
      sont trois (part financée, plafond, assiette) et rien n'autorise à
      en inventer un quatrième pour remplir la grille : la troisième
      passe donc en pleine largeur sous `sm`. C'est aussi la plus longue
      à lire, elle y gagne.
   3. LES FLÈCHES DE TENDANCE SAUTENT. La référence ouvre chaque carte
      par `MoveUpRight` / `MoveDownLeft` : ce sont des variations d'un
      tableau de bord. Nos trois chiffres sont des règles de dispositif,
      ils ne montent ni ne descendent. Les icônes de l'ancienne version
      reprennent la place, à la même taille.
   4. `rounded-md` (6 px) de la référence → `rounded-xl` (12 px), l'arrondi
      des cartes de la grille juste au-dessus sur la même page ; et
      `border` seul est remplacé par le filet nommé, sans quoi Tailwind v4
      peindrait la bordure en currentColor, donc en blanc plein.
   5. LE BOUTON D'APPEL EST GARDÉ, sous le paragraphe. La référence n'en
      a pas ; c'est le seul chemin de cette bande vers l'audit.

   L'incise « dispositif de la Région Guadeloupe, ouvert aux entreprises
   qui y sont immatriculées » est ENFIN écrite en entier — la composition
   centrée n'avait la place que d'un sur-titre « Chèque TIC — Région
   Guadeloupe ». Aide régionale sur un site national : sans l'incise, un
   lecteur hexagonal lit 10 000 € comme le concernant.

   Le sélecteur des deux mondes ne touche, comme avant, que la ligne
   d'éligibilité (audit / diagnostic) et le bouton : le dispositif ne
   dépend pas de qui valide chez le client.
   ══════════════════════════════════════════════════════════════════════ */

type Icone = ComponentType<{ className?: string; strokeWidth?: number }>;

const TUILES: {
  chiffre: string;
  mention: string;
  phrase: string;
  icone: Icone;
  large?: boolean;
}[] = [
  {
    chiffre: "40 à 80 %",
    mention: "du poste",
    phrase: "Part de l'installation financée, selon le poste et le dossier.",
    icone: PieChart,
  },
  {
    chiffre: "10 000 €",
    mention: "plafond",
    phrase: "Montant maximum de l'aide, pour une entreprise éligible.",
    icone: Landmark,
  },
  {
    chiffre: "0 €",
    mention: "sur l'abonnement",
    phrase: "L'assiette est l'installation : le mensuel n'entre jamais dans le dossier.",
    icone: Receipt,
    large: true,
  },
];

export default function ChequeTic() {
  const devis = useMonde() === "structure";

  return (
    <div className="r-wrap py-16 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* ——— la moitié qui explique ——— */}
        <div className="flex flex-col items-start">
          <span className="inline-flex h-6 items-center rounded-full border border-white/25 px-3 text-xs font-medium text-white">
            Chèque TIC
          </span>

          <h2 className="r-h2 mt-5 max-w-[15ch] text-balance">
            De 40 à 80&nbsp;% d&apos;un projet numérique financés
          </h2>

          <p className="mt-5 max-w-md text-[17px] leading-[28px] text-[color:var(--r-doux)]">
            Un dispositif de la Région Guadeloupe, ouvert aux entreprises qui y sont
            immatriculées. Il finance l&apos;installation, jamais l&apos;abonnement.
          </p>

          <p
            key={devis ? "structure" : "pme"}
            className="rv-fondu mt-3 max-w-md text-[15px] leading-[24px] text-[color:var(--r-faible)]"
          >
            {devis
              ? "Éligibilité vérifiée au diagnostic, dossier monté avec vous."
              : "Éligibilité vérifiée à l'audit, dossier monté avec vous."}
          </p>

          <a
            href={devis ? GRANDE_STRUCTURE.href : "/reserver-un-audit"}
            className="r-btn r-btn--blanc mt-8"
          >
            {devis ? GRANDE_STRUCTURE.cta : "Réserver un audit"}
          </a>
        </div>

        {/* ——— la moitié qui chiffre ——— */}
        {/* deux colonnes seulement là où une carte reste assez large pour
            tenir « 40 à 80 % » et sa mention sur UNE ligne : entre lg et xl
            la bande est déjà coupée en deux, la moitié droite n'a plus que
            431 px et deux colonnes y tomberaient à 212 — les cartes s'y
            empilent donc, comme sous sm. */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {TUILES.map((t) => (
            <div
              key={t.chiffre}
              data-reveal
              className={`flex flex-col justify-between rounded-xl border border-[color:var(--r-filet)] p-6 ${
                t.large ? "sm:col-span-2 lg:col-span-1 xl:col-span-2" : ""
              }`}
            >
              <t.icone className="mb-10 size-4 text-white" strokeWidth={1.75} />

              {/* chiffre et mention sur la même ligne de base, comme la
                  référence ; `whitespace-nowrap` parce que « 10 000 € »
                  replié après « 10 000 » décalerait la phrase d'une ligne */}
              <h3 className="flex flex-row items-end gap-3 font-[family-name:var(--font-jakarta)] text-[32px] font-semibold leading-none tracking-[-0.03em] text-white xl:text-[30px]">
                <span className="whitespace-nowrap">{t.chiffre}</span>
                <span className="whitespace-nowrap text-sm font-normal leading-[20px] tracking-normal text-[color:var(--r-faible)]">
                  {t.mention}
                </span>
              </h3>

              <p className="mt-3 text-[15px] leading-[24px] text-[color:var(--r-doux)]">
                {t.phrase}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
