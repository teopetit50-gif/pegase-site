import { ApercuRelances } from "./Apercus";

/* Le cadre d'application relevé sur la référence : `rounded-lg
   sm:rounded-xl`, filet `#e6e6e6`, fond blanc, et deux ombres distinctes
   selon le thème.

   ── Ce que montre l'intérieur ────────────────────────────────────────
   De vraies captures du tableau de bord Omega — /espace/debiteurs,
   /espace/relances, /espace/tresorerie — alimentées par le jeu de
   démonstration écrit en dur dans le dépôt du tableau de bord (Rénov
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
   ici : le dossier public est partagé par les quatre pages produit.

   27/09/2026 → `/produits/relances/v2/` : les captures portaient encore
   l'ancien signe CASHD. Seuls les signes ont été redessinés dans les images
   (outils/logos-modules/signes.py). Le dossier est neuf parce que
   l'optimiseur d'images garde une URL déjà servie en cache pendant des heures. */

/* 22/11/2026 (Teo, « fais pareil pour les autres pages ») — le cadre ne
   porte plus une capture de l'espace client mais un aperçu dessiné en code
   (Apercus.tsx). Tout ce qui précède sur `<picture>` et les fichiers PNG
   raconte l'ancien montage ; les images de `public/produits/relances/` ne
   sont plus appelées. `alt` devient l'étiquette lue par les lecteurs
   d'écran, à la place des dizaines de chiffres de l'aperçu. */
export function Panneau({ apercu, alt }: { apercu: string; alt: string }) {
  return (
    <div role="img" aria-label={alt} className="overflow-hidden rounded-lg border border-[#e6e6e6] bg-[#ffffff] shadow-[0px_2px_6px_0px_rgba(28,40,64,0.06),0px_6px_20px_-2px_rgba(28,40,64,0.08)] sm:rounded-xl">
      <ApercuRelances cle={apercu} />
    </div>
  );
}
