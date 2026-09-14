"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════════════════
   « CARTES À LUEUR » — le trait d'encre qui suit le pointeur (11/09/2026)

   ORIGINE. `animated-card` de EldoraUI (21st.dev) — une carte dont le
   LISERÉ s'allume sous le pointeur. Le mécanisme vaut d'être compris avant
   d'y toucher : un disque de dégradé de 400 px est posé en absolu à la
   position de la souris, masqué en cercle (`mask-image`), puis RECOUVERT
   par un panneau opaque calé à `inset-px`. Il ne reste donc visible qu'un
   anneau d'un pixel tout autour de la carte — et c'est cet anneau qui
   change de teinte selon l'endroit où l'on pointe. Au survol le disque
   passe à `scale-[3]` : la lueur s'étale sur tout le contour.

   POURQUOI ICI. La section « garanties » portait deux cartes larges de 5 et
   6 lignes de corps, plus un encadré de 3 lignes dans la première :
   26 lignes vues pour deux idées (le financement, les données). Demandé par
   Teo le 11/09 : « il y a un peu trop de texte, remplace certaines sections
   par ces composants, et reste dans le même thème, que du blanc et noir ».

   LA COULEUR EST L'ADAPTATION PRINCIPALE. La source peint son anneau avec
   `linear-gradient(135deg, #3BC4F2, #7A69F9, #F26378, #F5833F)` — cyan,
   violet, rose, orange. Cette page n'a pas une seule couleur : sa palette
   entière est `#09090b` → `#ffffff` en passant par quatre gris zinc. Le
   dégradé est donc remplacé par le même balayage en GRAPHITE
   (`#e4e4e7 → #09090b → #52525b → #e4e4e7`) : sur fond blanc, l'anneau se
   lit comme un trait d'encre qui s'épaissit là où l'on pointe, au lieu
   d'un néon. Les quatre arrêts sont ceux de `--o-line`, `--o-text` et
   `--o-muted-strong`, aucune valeur n'est inventée.

   CE QUI EST JETÉ de la source :

   1. `cn()` / `components/ui` : absents de ce dépôt (voir `BentoChange`).
   2. Les variantes `dark:` (`dark:bg-neutral-900/80`…) : cette section est
      dans le monde clair, et le monde `.o-nuit` ne l'appelle pas.
   3. `active:scale-90` : écrasé à 90 % au clic, c'est un geste de BOUTON.
      Sur une carte de 560 px qui contient une maquette d'interface, le
      rendu est une secousse. Le survol garde `scale-[1.005]`, c'est tout.
   4. Le `h-40` fixe du panneau à contenu : les deux maquettes du site
      (le chèque, la base locale) ont leur propre hauteur. Le panneau les
      prend telles quelles, et c'est un RESSORT vide qui pousse le libellé
      en pied — pas le paragraphe : un `flex-1` posé sur le texte l'étire
      bien au-delà de ses lignes, ce qui fausse toute mesure de hauteur.

   ÉCART ASSUMÉ. La source affiche une flèche au survol sans que la carte
   mène nulle part. Ici la carte ENTIÈRE est un `<Link>` : la flèche dit
   donc vrai, et le libellé de pied nomme la destination. Le libellé passe
   en `<span>` — un lien dans un lien n'est pas du HTML valide, c'est déjà
   la façon dont la section « à lire » est bâtie.

   CE QUI A ÉTÉ RETIRÉ DES TEXTES, et pourquoi ce n'est pas une perte : le
   corps de la carte « Données » énonçait le chiffrement, l'hébergement
   dans l'Union et le cloisonnement en base. Ces trois faits sont désormais
   trois CARTES de `CartesPreuve`, dans la section juste au-dessus. Ils
   étaient dits deux fois à 300 px d'intervalle, et c'est ce doublon qui
   faisait le mur. L'encadré « accompagnement de bout en bout » de la carte
   « Financement » disparaît de la même façon : « on monte le dossier avec
   vous » le porte, et le détail des pièces vit sur /tarifs#cheque-tic.
   ══════════════════════════════════════════════════════════════════════ */

export type CarteLueur = {
  label: string;
  titre: string;
  texte: string;
  lien: { label: string; href: string };
  maquette?: ReactNode;
};

/* le balayage graphite — les quatre arrêts sont des jetons du site */
const LUEUR =
  "linear-gradient(135deg, #e4e4e7, #09090b, #52525b, #e4e4e7)";

function Carte({ label, titre, texte, lien, maquette }: CarteLueur) {
  const cadre = useRef<HTMLAnchorElement>(null);
  const [souris, setSouris] = useState<{ x: number; y: number } | null>(null);

  const suivre = useCallback((e: React.MouseEvent) => {
    const r = cadre.current?.getBoundingClientRect();
    if (r) setSouris({ x: e.clientX - r.left, y: e.clientY - r.top });
  }, []);

  return (
    <Link
      ref={cadre}
      href={lien.href}
      onMouseMove={suivre}
      onMouseLeave={() => setSouris(null)}
      data-reveal
      className="group relative flex transform-gpu flex-col overflow-hidden rounded-[20px] bg-[#f4f4f5] p-[1.5px] transition-transform duration-300 ease-out hover:scale-[1.005]"
    >
      {/* le disque de dégradé, masqué en cercle : invisible tant que le
          pointeur n'est pas entré, puis étalé ×3 au survol. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute size-[400px] -translate-x-1/2 -translate-y-1/2 transform-gpu rounded-full transition-[transform,opacity] duration-500 group-hover:scale-[3] ${
          souris ? "opacity-100" : "opacity-0"
        }`}
        style={{
          maskImage:
            "radial-gradient(200px circle at center, white, transparent)",
          WebkitMaskImage:
            "radial-gradient(200px circle at center, white, transparent)",
          left: souris ? `${souris.x}px` : "50%",
          top: souris ? `${souris.y}px` : "50%",
          background: LUEUR,
        }}
      />

      {/* le panneau opaque qui ne laisse dépasser que le liseré */}
      <span
        aria-hidden
        className="absolute inset-[1.5px] rounded-[19px] bg-white"
      />

      <ArrowUpRight
        aria-hidden
        size={18}
        strokeWidth={1.6}
        className="absolute right-4 top-4 z-20 translate-y-2 text-[#71717a] opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-y-0 group-hover:opacity-100"
      />

      {maquette ? (
        /* Hauteur commune, contenu centré. Les deux maquettes du site ne
           font PAS la même taille — le chèque en fait 177, la bande de
           garanties 77 — et la grille force les deux cartes à la même
           hauteur : les 100 px d'écart se retrouvaient en TROU entre le
           texte et le lien de la carte la plus courte, au beau milieu de la
           carte. Égaliser le cadre déplace le vide là où il ne se voit pas,
           réparti autour de la maquette. */
        <span className="relative z-10 flex min-h-[178px] flex-col justify-center overflow-hidden rounded-t-[19px] border-b border-[#f4f4f5]">
          {maquette}
        </span>
      ) : null}

      <span className="relative z-10 flex flex-1 flex-col p-8 sm:p-10">
        {/* `<a>` a un modèle de contenu transparent : un titre et des
            paragraphes y sont valides tant qu'ils ne sont pas eux-mêmes
            interactifs. Les garder en `<span>` aurait coûté le niveau de
            titre — et rendu la carte muette pour un lecteur d'écran qui
            parcourt la page par ses titres. Seul le libellé de pied reste un
            `<span>` : un lien dans un lien, ça, ce n'est pas valide. */}
        <p className="o-small !text-[14px] uppercase tracking-[0.08em]">
          {label}
        </p>
        <h3 className="o-h5 mt-2">{titre}</h3>
        <p className="o-body mt-4">{texte}</p>
        {/* Le ressort qui pousse le libellé en pied, pour que les deux
            cartes finissent à la même hauteur. Il était porté par le
            paragraphe (`flex-1`) : le bloc de texte s'étirait alors bien
            au-delà de ses lignes, ce qui fausse toute mesure de hauteur et
            étend la zone de sélection dans le vide. */}
        <span aria-hidden className="flex-1" />
        <span className="o-link mt-6 !text-[15px]">
          {lien.label}
          <svg
            aria-hidden
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </span>
    </Link>
  );
}

export default function CartesLueur({ cartes }: { cartes: CarteLueur[] }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
      {cartes.map((c) => (
        <Carte key={c.label} {...c} />
      ))}
    </div>
  );
}
