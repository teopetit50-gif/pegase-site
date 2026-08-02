import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { BlogCard, BlogCta } from "@/components/blog/BlogKit";
import { POSTS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog — Omega",
  description:
    "Conformité facture électronique, financement Chèque TIC, RGPD et données clients, impayés aux Antilles : les analyses du desk Omega pour les dirigeants de TPE.",
};

/* ══════════════════════════════════════════════════════════════════════
   /blog — liste (30/07/2026)

   Reprise à l'identique de la liste de la référence (blog.ocoya.com),
   demandée par Teo en remplacement de l'ancienne page /articles (charte
   v2 sombre). Même monde blanc `.offres` que « Nos offres » : H1 centré
   48 Jakarta 700, sous-titre 18 muted, fond pointillé qui s'éteint vers
   le bas, grille de covers composées en 4 colonnes gap 40, CTA gris doux.

   Écarts assumés vis-à-vis de la référence : ses sections « Posts » et
   « Updates » répètent trois fois les MÊMES cartes (remplissage CMS) et
   son « Load More » pagine un fonds de centaines de posts — avec quatre
   articles, dupliquer la grille ou paginer serait un bug visible, pas une
   fidélité. Une seule grille, donc, entre le hero et le CTA.

   Le contenu reste celui de Omega : reprendre les textes ou les visuels
   du tiers n'aurait ni sens commercial ni base légale (même règle que
   /offres). L'ancienne URL /articles est redirigée en 308 par
   next.config.ts, fiches et accueil pointent désormais vers /blog.
   ══════════════════════════════════════════════════════════════════════ */

export default function BlogPage() {
  return (
    <PageShell>
      {/* couche motion commune : lenis + reveals GSAP */}
      <PageMotion />

      <div className="offres">
        {/* ——— hero : « Blog » centré sur le fond pointillé ——— */}
        <section data-monde="clair" className="relative">
          <div
            aria-hidden
            className="o-dots o-dots-fade pointer-events-none absolute inset-x-0 top-0 h-[440px]"
          />
          <div className="o-wrap relative pt-[100px] text-center sm:pt-[130px]">
            <h1 data-reveal className="b-h1">
              Blog
            </h1>
            <p data-reveal className="o-lead mx-auto mt-3 max-w-[560px]">
              Découvrez nos dernières analyses pour les TPE des Antilles.
            </p>
          </div>

          {/* ——— la grille de cartes ——— */}
          <div className="o-wrap relative mt-[90px] sm:mt-[150px]">
            <div className="b-grid">
              {POSTS.map((p) => (
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
