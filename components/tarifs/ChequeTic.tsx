"use client";

import { Landmark, PieChart, Receipt } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useMonde } from "@/components/tarifs/monde";
import { GRANDE_STRUCTURE } from "@/lib/paliers";

/* ══════════════════════════════════════════════════════════════════════
   ChequeTic — le Chèque TIC (14/09/2026)

   SECONDE PASSE DU JOUR — LE MODÈLE « FEATURES-2 » (Teo, composant de
   référence fourni). La bande quitte la composition `stats-2` du matin
   (titre et bouton à gauche, trois tuiles à grands chiffres en dessous)
   pour celle de la référence :

     · en-tête CENTRÉ — titre, puis chapô ;
     · trois cartes sans filet ni ombre, tout centré, chacune ouverte par
       un DÉCOR de 144 px : une trame de 24 px fondue par un masque
       radial, et au milieu un carré de 48 px, bordé en haut et à gauche,
       peint de la couleur du fond — l'icône se pose dedans ;
     · sous le décor, le titre de la carte, puis une phrase en 14 px.

   Ce qui reste du matin : les trois chiffres — c'est ce que la section
   doit faire lire. Ils prennent la place du titre de carte de la
   référence (qui n'y met qu'un mot en 16 px) : « 40 à 80 % », « 10 000 € »
   et « 0 € » restent en grand, et le libellé du matin (« Part financée »,
   « Plafond de l'aide », « Sur l'abonnement ») ouvre désormais la phrase
   qui les explique, au lieu de vivre sur sa propre ligne.

   Écarts assumés :

   1. LA BANDE RESTE SOMBRE. La référence est une section claire ; ici
      c'est le seul contraste de la page (grille, règles, appel final et
      FAQ sont tous clairs) et `.r-nuit` est posée par la page, pas par ce
      fichier. Conséquence directe : `[--border:black] dark:[--border:white]`
      du décor ne peut pas servir — en Tailwind v4 `dark:` suit le réglage
      de l'OS, pas une classe. La trame est donc écrite en blanc, une fois.
   2. LE BOUTON D'APPEL EST GARDÉ, centré sous le chapô. La
      référence n'en a pas ; c'est le seul chemin de cette bande vers la
      grille, le perdre coûterait plus que la ressemblance.
   3. Les requêtes de conteneur de la référence (`@container`,
      `@min-4xl:grid-cols-3`) sont remplacées par un palier d'écran
      (`md:`) : la bande fait toute la largeur de la page, un conteneur
      n'apporte rien ici, et `@min-4xl` est une syntaxe de greffon v3 qui
      ne rendrait rien sans un bruit.
   4. `bg-muted`, `bg-background`, `border` seul : jetons shadcn absents,
      et sous Tailwind v4 un `border` sans couleur peint en currentColor.
      Les trois valeurs sont écrites — carte `white/[0.05]`, carré du
      décor `#050505` (la bande), filet `white/20`.

   Les trois chiffres redisent des faits déjà posés sur la page (texte de
   la bande et FAQ « Le Chèque TIC s'applique-t-il ici ? ») — rien
   d'ajouté. La mention « Région Guadeloupe » reste : aide régionale sur
   un site national, l'incise est obligatoire.

   15/09/2026 — LA BANDE SUIT LE SÉLECTEUR DES DEUX MONDES. Elle disait
   « Réserver un audit » sous une grille qui venait d'annoncer « Réserver un
   diagnostic » : rien n'était cassé (même destination), mais c'étaient deux
   vocabulaires sur un même écran. Ce qui bascule ici est le MINIMUM — le
   chapô et le bouton ; le dispositif lui-même ne dépend pas de qui valide
   chez le client, donc le titre, les trois chiffres et leurs phrases sont
   les mêmes des deux côtés. Le composant passe client pour cela seul : le
   HTML servi reste celui des indépendants (voir components/tarifs/monde).
   ══════════════════════════════════════════════════════════════════════ */

type Icone = ComponentType<{ className?: string; strokeWidth?: number }>;

const TUILES: { chiffre: string; phrase: string; icone: Icone }[] = [
  {
    chiffre: "40 à 80 %",
    phrase: "Part de l'installation financée, selon le poste et le dossier.",
    icone: PieChart,
  },
  {
    chiffre: "10 000 €",
    phrase: "Plafond de l'aide, pour une entreprise éligible au dispositif.",
    icone: Landmark,
  },
  {
    chiffre: "0 €",
    phrase: "Part de l'abonnement couverte : l'assiette est l'installation, jamais le mensuel.",
    icone: Receipt,
  },
];

/* le décor de la référence : trame de 24 px fondue au centre par un masque
   radial, et le carré de 48 px qui porte l'icône, bordé en haut et à
   gauche seulement — c'est ce demi-cadre qui fait le motif */
const Decor = ({ children }: { children: ReactNode }) => (
  <div
    aria-hidden
    className="relative mx-auto size-36 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"
  >
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.14]" />
    <div className="absolute inset-0 m-auto flex size-12 items-center justify-center border-l border-t border-white/20 bg-[#050505] text-white">
      {children}
    </div>
  </div>
);

export default function ChequeTic() {
  const devis = useMonde() === "structure";

  return (
    <div className="r-wrap py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="r-note">Chèque TIC — Région Guadeloupe</p>
        <h2 className="r-h2 mx-auto mt-5 max-w-[20ch] text-balance">
          De 40 à 80&nbsp;% d&apos;un projet numérique financés
        </h2>
        <p
          key={devis ? "structure" : "pme"}
          className="rv-fondu mx-auto mt-4 max-w-xl text-balance text-[15px] leading-[24px] text-[#d4d4d8]"
        >
          {devis ? (
            GRANDE_STRUCTURE.chequeTic.chapo
          ) : (
            <>
              Le dispositif porte sur l&apos;installation, jamais sur l&apos;abonnement.
              Éligibilité vérifiée à l&apos;audit, dossier monté avec vous.
            </>
          )}
        </p>
        {/* 15/09 — le bouton disait « Choisir mes postes » et renvoyait à la
            grille : le dispositif porte sur l'installation, qui vient APRÈS
            l'audit. Il mène donc à l'audit, comme tout le reste de la page. */}
        <a
          href={devis ? GRANDE_STRUCTURE.href : "/reserver-un-audit"}
          className="r-btn r-btn--blanc mt-7"
        >
          {devis ? GRANDE_STRUCTURE.cta : "Réserver un audit"}
        </a>
      </div>

      <div className="mx-auto mt-12 grid max-w-sm gap-6 *:text-center md:mt-16 md:max-w-none md:grid-cols-3">
        {TUILES.map((t) => (
          <Card
            key={t.chiffre}
            data-reveal
            className="rounded-2xl border-0 bg-white/[0.05] text-white shadow-none"
          >
            <CardHeader className="pb-3">
              <Decor>
                <t.icone className="size-6" strokeWidth={1.75} />
              </Decor>
              {/* le chiffre ne doit JAMAIS se replier : « 10 000 € » coupé
                  après « 10 000 » décale la phrase d'une ligne et casse
                  l'alignement des trois cartes. La taille suit donc la
                  largeur de colonne, qui RETOMBE à md (trois colonnes de
                  224 px à 768) avant de remonter. */}
              <h3 className="mt-6 whitespace-nowrap font-[family-name:var(--font-jakarta)] text-[40px] font-semibold leading-none tracking-[-0.03em] text-white md:text-[26px] lg:text-[34px] xl:text-[44px]">
                {t.chiffre}
              </h3>
            </CardHeader>

            <CardContent>
              <p className="text-sm leading-[22px] text-white/80">{t.phrase}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
