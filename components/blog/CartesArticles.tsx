import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { IconeCalendrier, tempsLecture } from "@/components/blog/BlogKit";
import type { Post } from "@/lib/content";
import "./CartesArticles.css";

/* ═════════════════════════════════════════════════════════════════════
   <CartesArticles> — les cartes d'articles de /blog et /blog/[slug] (15/09)

   ORIGINE. `apple-cards-carousel` d'Aceternity UI, retenu contre
   `card-stack` et `draggable-card` (les trois ont été lus). On en garde LA
   CARTE, pas le carrousel : un bloc-lien en portrait dont la photo occupe
   toute la surface, un voile d'encre monté du bas, le texte PAR DESSUS
   l'image — le seul des trois dont l'objet de base reste une carte lisible
   et cliquable. `card-stack` en fait tourner une toutes les cinq secondes
   (six articles sur sept inatteignables) et son `setCards` dans un
   `useEffect` est une ERREUR eslint ici ; `draggable-card` est un jouet à
   la souris, rien n'y est atteignable au clavier.

   POURQUOI ICI. /blog et « À lire ensuite » servent la même <BlogCard> :
   couverture composée, puis titre, chapô et date empilés sur du blanc —
   des colonnes de texte sans relief, où rien ne dit quel article est le
   dernier paru. Ici la photo porte la carte, le premier article prend
   toute la largeur, et le compte tombe juste : 7 = 1 une + 6.

   CE QUI EST JETÉ. Tout le carrousel de la source : le rail horizontal,
   ses deux flèches et leur état, le `CarouselContext`, la modale
   `layoutId` avec `useOutsideClick`, le verrou `body.style.overflow`, la
   touche Échap. Avec eux : `@tabler/icons-react` (aucune dépendance
   nouvelle), `BlurImage` et son <img> nu, les classes `dark:` (elles
   suivent l'OS ici) et le dégradé de bord `bg-gradient-to-l`, qui n'a ni
   `from-` ni `to-` et ne peint donc rien. Jetée aussi, et c'est le vrai
   arbitrage : la couverture composée <BlogCover> DANS les cartes de liste
   — elle écrit déjà le titre et le temps de lecture dans l'image, qui
   apparaîtraient deux fois. Elle reste intacte dans BlogKit.tsx et coiffe
   toujours chaque page article.

   ÉCARTS ASSUMÉS. Composant SERVEUR : aucun hook, aucun état, pas une
   ligne de JavaScript envoyée — les cartes existent JavaScript coupé. Seul
   mouvement : le survol CSS, éteint en mouvement réduit et réservé aux
   pointeurs fins ; l'apparition reste celle de la page ([data-reveal] +
   GSAP). Le chapô et la date, exigés par le brief, tiennent dans la moitié
   basse où le voile ne descend pas sous 0,77 d'encre : la lisibilité ne
   dépend d'aucune photo. `alt=""` sur l'image, le titre est le texte
   voisin immédiat.
   ═════════════════════════════════════════════════════════════════════ */

/* `liste` : /blog, 7 articles, le premier en une.
   `compacte` : bas de page article, 6 articles, carrés et sans une. */
type Variante = "liste" | "compacte";

/* La une couvre la colonne (1200 au plus) ; les autres tiennent 1, 2 puis
   3 colonnes. Deux chaînes constantes : elles ne dépendent d'aucun calcul. */
const TAILLES_UNE = "(max-width: 1247px) 100vw, 1200px";
const TAILLES_CARTE =
  "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1247px) 33vw, 380px";

function Fleche() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export default function CartesArticles({
  articles,
  variante = "liste",
  className,
}: {
  articles: Post[];
  variante?: Variante;
  className?: string;
}) {
  const compacte = variante === "compacte";
  /* sur /blog les cartes suivent le <h1> « Blog » ; au bas d'un article
     elles suivent le <h2> « À lire ensuite » et descendent donc d'un cran */
  const Titre = compacte ? "h3" : "h2";

  return (
    <div
      className={cn("bc-grille", compacte && "bc-grille--compacte", className)}
    >
      {articles.map((post, index) => {
        const une = !compacte && index === 0;
        return (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            data-reveal
            className={cn("bc-carte", une && "bc-carte--une")}
          >
            <div className="bc-photo">
              <Image
                src={post.cover}
                alt=""
                fill
                sizes={une ? TAILLES_UNE : TAILLES_CARTE}
                className="bc-img"
              />
            </div>
            <div className="bc-voile" aria-hidden />

            <div className="bc-haut">
              <span className="bc-cat">{post.cat.toLowerCase()}</span>
            </div>

            <div className="bc-bas">
              <Titre className="bc-titre">{post.title}</Titre>
              <p className="bc-chapo">{post.excerpt}</p>
              <div className="bc-meta">
                <span className="bc-date">
                  <IconeCalendrier className="bc-ico" />
                  {post.date}
                  <span className="bc-sep" aria-hidden>
                    ·
                  </span>
                  {tempsLecture(post)} min de lecture
                </span>
                {/* « Lire la suite » ne tient une ligne propre que sur la
                    une ; sur une carte de grille il pousserait le pied au
                    repli à certaines largeurs seulement. La carte entière
                    est le lien, et le titre se souligne au survol. */}
                {une && (
                  <span className="bc-lire">
                    Lire la suite
                    <Fleche />
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
