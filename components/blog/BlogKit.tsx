import Image from "next/image";
import Link from "next/link";
import Appel from "@/components/charte/Appel";
import Bouton from "@/components/charte/Bouton";
import type { Post } from "@/lib/content";

/* ══════════════════════════════════════════════════════════════════════
   /blog — pièces partagées entre la liste et les pages article
   (30/07/2026, reproduction de la référence blog.ocoya.com)

   La référence sert pour chaque post une image de cover PRÉ-COMPOSÉE :
   fond blanc, logotype, titre gras, badge « N MIN READ », photo à droite
   coiffée d'une pastille catégorie et d'un astérisque décoratif. Ici la
   cover est recomposée en CSS (classes .b-compo-* de globals.css, unités
   cqw) : la même sert à 260 px dans la grille et à 760 px en tête
   d'article, sans générer d'images. Les photos viennent de public/photos
   (Unsplash — crédits dans CREDITS.txt), jamais du site de référence.
   ══════════════════════════════════════════════════════════════════════ */

/* Temps de lecture calculé depuis le corps (≈ 200 mots/minute, arrondi
   au supérieur) — aucune valeur saisie à la main, donc jamais fausse. */
export function tempsLecture(post: Post): number {
  const mots = post.body
    .map((b) => `${b.h ?? ""} ${b.p}`)
    .join(" ")
    .trim()
    .split(/\s+/).length;
  return Math.max(1, Math.ceil(mots / 200));
}

/* astérisque 8 branches — le décor posé au pied de la photo */
function Etoile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11 0h2v7.6l5.4-5.4 1.4 1.4L14.4 9H22v2h-7.6l5.4 5.4-1.4 1.4-5.4-5.4V22h-2v-9.6l-5.4 5.4-1.4-1.4L9.6 11H2V9h7.6L4.2 3.6l1.4-1.4L11 7.6V0Z" />
    </svg>
  );
}

export function IconeCalendrier({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

/* ——— la cover composée, façon référence ——— */
export function BlogCover({
  post,
  sizes,
  priority,
}: {
  post: Post;
  /* attribut sizes de l'Image : "290px" en grille, "760px" en article */
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className="b-compo">
      <div className="b-compo-logo">Omega.AI</div>
      <div className="b-compo-title">{post.title}</div>
      <div className="b-compo-badge">
        {tempsLecture(post)} min de lecture
      </div>
      <div className="b-compo-photo">
        <Image
          src={post.cover}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
      <div className="b-compo-tag">{post.cat.toLowerCase()}</div>
      <Etoile className="b-compo-star" />
    </div>
  );
}

/* ——— carte de la grille : vignette + titre + extrait + pied ——— */
export function BlogCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} data-reveal className="b-card group">
      <div className="b-media">
        <BlogCover post={post} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 290px" />
      </div>
      <div className="b-card-body">
        <h2 className="b-card-title">{post.title}</h2>
        <p className="b-card-excerpt">{post.excerpt}</p>
        <div className="b-card-foot">
          <span className="b-date">
            <IconeCalendrier className="h-[17px] w-[17px] text-[#0c1d37]" />
            {post.date}
          </span>
          <span className="b-more">Lire la suite</span>
        </div>
      </div>
    </Link>
  );
}

/* ——— bandeau CTA de fin de page (gris doux, arrondi 16, centré) ——— */
export function BlogCta() {
  /* 25/11/2026 — l'appel final du blog prend le bandeau d'appel de la
     charte (components/charte/Appel.tsx) et son bouton blanc. Ne sert
     qu'aux pages du blog, toutes deux dans <Cadre>. Texte inchangé ; le
     lien va droit à l'audit (/commencer y redirigeait). */
  return (
    <Appel
      titre="Et pour votre entreprise ?"
      chapo="Les analyses valent pour un secteur. L'audit vaut pour votre situation, et trente minutes suffisent à chiffrer ce que votre processus le plus coûteux représente réellement."
      actions={
        <Bouton href="/reserver-un-audit" icone="chevron">
          Commencer
        </Bouton>
      }
    />
  );
}
