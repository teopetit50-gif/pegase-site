import { getImageProps } from "next/image";

/* Le cadre d'application relevé sur la référence : `rounded-lg
   sm:rounded-xl`, filet `#e6e6e6`, fond blanc, et deux ombres distinctes
   selon le thème.

   ── Ce que montre l'intérieur ────────────────────────────────────────
   De vraies captures du tableau de bord Omega — /espace/debiteurs,
   /espace/relances, /espace/tresorerie — alimentées par le jeu de
   démonstration écrit en dur dans le dépôt du tableau de bord (Karayib
   Transports). Aucune donnée client, et surtout aucun châssis emprunté :
   les captures précédentes étaient des rendus de l'interface du gabarit
   Folio avec notre texte substitué. Refaites par `outils/apercus-omega.mjs`.

   L'espace client n'a **qu'un thème clair** — c'est le produit qui est
   ainsi. La même capture sert donc dans les deux thèmes du site, ce qui
   supprime la moitié des fichiers et laisse `<picture>` tout arbitrer.

   ⚠ 11/09 — C'EST POURQUOI IL N'Y A AUCUNE PAIRE `dark:hidden` /
   `dark:block` À ARBITRER DANS CE RAPATRIEMENT : elles avaient déjà
   disparu du site source le jour où les captures sont passées à un seul
   jeu. Les huit fichiers de `public/produits/relances/` sont quatre
   captures × deux largeurs, jamais deux thèmes.

   ── Pourquoi `<picture>` et non deux `<Image>` ──────────────────────
   Deux `<img>` dont un masqué par `hidden`, et le navigateur télécharge
   quand même les deux quand l'un porte `priority` : mesuré, un téléphone
   prenait la capture de bureau, et un bureau prenait la capture mobile
   agrandie à 3840 px. `<picture>` tranche à la source.

   ── Chemin des images ───────────────────────────────────────────────
   `/apercus/<x>.png` sur le site source → `/produits/relances/<x>.png`
   ici : le dossier public est partagé par les quatre pages produit. */

const LARGE = { width: 2880, height: 1640, sizes: "(min-width: 1280px) 840px, 100vw" };
const ETROIT = { width: 1120, height: 1800, sizes: "100vw" };

const DOSSIER = "/produits/relances";

export function Panneau({
  apercu,
  alt,
  priorite = false,
}: {
  apercu: string;
  alt: string;
  priorite?: boolean;
}) {
  const commun = { quality: 75, priority: priorite, alt };
  const { props: etroit } = getImageProps({
    ...commun,
    ...ETROIT,
    src: `${DOSSIER}/${apercu}-mobile.png`,
  });
  const { props: large } = getImageProps({
    ...commun,
    ...LARGE,
    src: `${DOSSIER}/${apercu}.png`,
  });

  return (
    <div className="overflow-hidden rounded-lg border border-[#e6e6e6] bg-[#ffffff] shadow-[0px_2px_6px_0px_rgba(28,40,64,0.06),0px_6px_20px_-2px_rgba(28,40,64,0.08)] sm:rounded-xl">
      <picture>
        <source media="(min-width: 640px)" srcSet={large.srcSet} sizes={large.sizes} />
        <img {...etroit} alt={alt} className="h-auto w-full" />
      </picture>
    </div>
  );
}
