import Image from "next/image";
import Link from "next/link";
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
      <div className="b-compo-logo">Omega</div>
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
  return (
    <div
      data-reveal
      className="rounded-[16px] bg-[#fafafa] px-6 py-12 text-center sm:px-10 sm:py-[60px]"
    >
      <h2
        className="text-[24px] font-bold leading-[1.4] tracking-[-0.04em] text-[#09090b] sm:text-[28px]"
        style={{ fontFamily: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif" }}
      >
        Et pour votre entreprise ?
      </h2>
      <p className="o-lead mx-auto mt-3 max-w-[560px]">
        Les analyses valent pour un secteur ; l&apos;audit vaut pour votre
        situation. Trente minutes suffisent à chiffrer ce que votre difficulté
        principale vous coûte réellement.
      </p>
      <Link
        href="/reserver-un-audit"
        className="mt-7 inline-flex items-center gap-2 rounded-[10px] bg-[#2e2e2e] px-[25px] py-[14px] text-[16px] leading-none text-white transition-[background-color,transform] duration-200 hover:bg-[#3f3f46] active:scale-[0.97]"
      >
        Réserver l&apos;audit gratuit
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
