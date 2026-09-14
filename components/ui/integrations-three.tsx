import Link from "next/link";
import { SystemLogo } from "@/components/logos";
import { Chevron } from "@/components/offres/MediaMoteurs";

/* ══════════════════════════════════════════════════════════════════════
   integrations-three — grille de cartes douces (11/09/2026)

   Reprise du bloc `integrations-three` de cnblocks (blocs shadcn, via
   21st.dev) : même anatomie de carte — une icône seule sur sa ligne, un
   intitulé en dessous, un texte court, le tout dans une carte « soft »
   posée sur une grille à gouttière courte (`gap-4`).

   Ce qui change, et pourquoi :

   1. LA CARTE « SOFT » EXISTE DÉJÀ ICI. Le bloc d'origine appelle un
      `<Card variant="soft">` qui n'est rien d'autre qu'un fond discret et
      un filet : c'est mot pour mot `.o-card-soft` du monde `.offres`
      (#fafafa, filet var(--o-line), rayon 20). Aucun jeton shadcn n'est
      importé — `bg-card` et `text-muted-foreground` ne valent rien sous
      `.offres`, qui a ses propres variables.
   2. DEUX COLONNES, PAS TROIS. Le bloc range six cartes en
      `lg:grid-cols-3`. Le catalogue en compte QUATRE : à trois colonnes la
      dernière reste seule sur sa rangée. `sm:grid-cols-2` les range 2 × 2
      et chaque carte gagne ~490 px de large — la place qui manquait à
      l'ancienne grille de quatre colonnes (285 px, de quoi tenir un
      intitulé et deux lignes).
   3. PAS DE `line-clamp-2`. Les accroches françaises font 110 à 150
      signes : le bloc d'origine les couperait au milieu d'une phrase. Les
      cartes gardent la même hauteur par la grille, et le lien est calé en
      bas (`mt-auto`) pour que les quatre s'alignent malgré des textes de
      longueurs inégales.
   4. LES CARTES SONT DES PORTES. Le bloc d'origine est décoratif ; ici
      chaque carte mène à sa page produit. D'où le `group`, le survol et le
      chevron qui avance. Le survol est défini dans globals.css
      (`.o-card-porte`) et non en utilitaire Tailwind : le `background` de
      `.o-card-soft` est posé hors couche, il gagnerait toujours contre un
      `hover:bg-white`.
   5. LA MARGE INTÉRIEURE PASSE À 32 px À PARTIR DE `lg` SEULEMENT. Entre
      640 et 1024 px les deux colonnes tiennent dans 350 px chacune : les
      24 px du bloc d'origine y laissent 300 px de texte, un `sm:p-8` n'en
      laisserait que 287 et ajouterait une ligne à la carte la plus longue.
   6. LE NOM DU PAQUET RESTE EN LIGNE AVEC LA TUILE. Chez la référence le
      titre EST le nom du produit (« Google Gemini ») ; ici le nom
      (« RELOAD ») et l'objectif (« Réactiver les opportunités »)
      sont deux informations distinctes, et c'est l'objectif qui doit se
      lire de loin.

   Le composant ne définit ni police de titre ni fond de page : il vit sous
   une classe de monde (`.offres`) et emprunte ses `o-*`.
   ══════════════════════════════════════════════════════════════════════ */

export type CarteSysteme = {
  /* sigle interne (CASHD, RELOAD…) : porte le logo et la clé, jamais affiché */
  system: string;
  nom: string;
  objectif: string;
  texte: string;
  href: string;
};

export function GrilleSystemes({
  cartes,
  className = "",
}: {
  cartes: CarteSysteme[];
  className?: string;
}) {
  return (
    <div
      className={`mx-auto grid max-w-[1000px] grid-cols-1 gap-4 sm:grid-cols-2 ${className}`}
    >
      {cartes.map((c) => (
        <Link
          key={c.system}
          href={c.href}
          data-reveal
          className="o-card-soft o-card-porte o-card-or group flex flex-col p-6 lg:p-8"
        >
          <div className="flex items-center gap-3">
            <SystemLogo system={c.system} />
            <span
              className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--o-text)]"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              {c.nom}
            </span>
          </div>

          <h3
            className="mt-6 text-[18px] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--o-text)]"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            {c.objectif}
          </h3>
          <p className="o-body mt-2 !text-[15px] !leading-[26px]">{c.texte}</p>

          <span className="o-link mt-auto self-start pt-6 !text-[14px]">
            Voir le détail
            <Chevron taille={12} />
          </span>
        </Link>
      ))}
    </div>
  );
}
