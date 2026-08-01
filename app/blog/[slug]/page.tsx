import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import {
  BlogCard,
  BlogCover,
  BlogCta,
  IconeCalendrier,
} from "@/components/blog/BlogKit";
import { POSTS } from "@/lib/content";

/* ══════════════════════════════════════════════════════════════════════
   /blog/[slug] — page article (30/07/2026)

   Reprise à l'identique des pages article de la référence
   (blog.ocoya.com/blog/…), demandée par Teo : date + pastille catégorie
   sur la première ligne, H1 48 Jakarta 700, cover composée 760 arrondie
   30, rail de partage en cercles gris à gauche du corps, rich text
   16/1.8 muted avec intertitres 38, rangée « à lire ensuite » puis CTA.
   Le contenu (textes, photos) reste celui de Omega — même règle que
   /offres et /blog.

   Le rail de partage de la référence pointe vers ses profils sociaux ;
   Omega n'en a pas — les trois cercles partagent donc L'ARTICLE
   (sharer Facebook / intent X / partage LinkedIn), même dessin, geste
   utile. Sous 1280 px le rail disparaît, comme chez la référence dont
   la colonne absorbe le gabarit mobile.
   ══════════════════════════════════════════════════════════════════════ */

/* URL publique de l'article, pour les liens de partage (le site est servi
   sur ce domaine de prod — voir memory projet). */
const BASE = "https://pegase-site-beige.vercel.app";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return { title: "Article — Omega" };
  return { title: `${post.title} — Omega`, description: post.excerpt };
}

/* pictos de partage — traits simples, 16 px dans un cercle 44 */
function IconeFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3H11v7h2.5Z" />
    </svg>
  );
}
function IconeX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M17.7 3h3l-6.6 7.6L21.9 21h-6.1l-4.8-6.3L5.5 21h-3l7.1-8.1L2.4 3h6.2l4.3 5.7L17.7 3Zm-1.1 16.2h1.7L7.7 4.7H5.9l10.7 14.5Z" />
    </svg>
  );
}
function IconeLinkedin() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M6.9 8.6H3.8V20h3.1V8.6ZM5.4 7.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM20.2 20h-3.1v-5.6c0-1.5-.6-2.3-1.8-2.3-1 0-1.6.7-1.9 1.3-.1.2-.1.6-.1.9V20h-3.1V8.6h3.1v1.4c.4-.7 1.3-1.6 3.1-1.6 2.3 0 3.8 1.5 3.8 4.6V20Z" />
    </svg>
  );
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const url = `${BASE}/blog/${post.slug}`;
  const autres = POSTS.filter((p) => p.slug !== post.slug);

  return (
    <PageShell>
      {/* couche motion commune : lenis + reveals GSAP */}
      <PageMotion />

      <div className="offres">
        <section data-monde="clair" className="relative">
          <div
            aria-hidden
            className="o-dots o-dots-fade pointer-events-none absolute inset-x-0 top-0 h-[440px]"
          />

          {/* ——— tête : date + catégorie, puis le titre ——— */}
          <div className="o-wrap relative pt-[70px] sm:pt-[90px]">
            <div className="mx-auto max-w-[950px]">
              <div data-reveal className="flex items-center justify-between gap-4">
                <span className="b-date !text-[18px] text-[#3b4555]">
                  <IconeCalendrier className="h-[18px] w-[18px] opacity-60" />
                  {post.date}
                </span>
                <span className="b-tag-plate">{post.cat.toLowerCase()}</span>
              </div>
              <h1 data-reveal className="b-article-h1 mt-6">
                {post.title}
              </h1>
            </div>
          </div>

          {/* ——— cover + rail de partage + corps ——— */}
          <div className="o-wrap relative mt-12 sm:mt-16">
            <div className="relative mx-auto max-w-[760px]">
              {/* rail de partage — à gauche du corps, suit le défilement */}
              <div className="absolute -left-[104px] top-0 bottom-0 hidden xl:block">
                <div className="sticky top-[120px] flex flex-col gap-3">
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Partager sur Facebook"
                    className="b-share"
                  >
                    <IconeFacebook />
                  </a>
                  <a
                    href={`https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Partager sur X"
                    className="b-share"
                  >
                    <IconeX />
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Partager sur LinkedIn"
                    className="b-share"
                  >
                    <IconeLinkedin />
                  </a>
                </div>
              </div>

              <div data-reveal className="b-cover">
                <BlogCover post={post} sizes="(max-width: 800px) 92vw, 760px" priority />
              </div>

              {/* corps — la typo vit dans .b-rte (globals.css) */}
              <div className="b-rte mt-12 sm:mt-14">
                {post.body.map((b, idx) => (
                  <div key={idx}>
                    {b.h && <h2>{b.h}</h2>}
                    <p>{b.p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ——— à lire ensuite ——— */}
          <div className="o-wrap pt-[90px] sm:pt-[110px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 data-reveal className="b-h1">
                À lire ensuite
              </h2>
              <Link
                data-reveal
                href="/blog"
                className="o-link mb-3 whitespace-nowrap"
              >
                Tout voir
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            </div>
            <div className="b-grid mt-10 sm:mt-12">
              {autres.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </div>

          {/* ——— CTA final ——— */}
          <div className="o-wrap pb-[100px] pt-[110px] sm:pb-[120px] sm:pt-[140px]">
            <BlogCta />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
