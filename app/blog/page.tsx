import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Cadre from "@/components/charte/Cadre";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import "@/components/charte/pages/blog.css";
import { BlogCta } from "@/components/blog/BlogKit";
import CartesArticles from "@/components/blog/CartesArticles";
import { POSTS } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
  title: "Blog | Omega.AI",
  description:
    "Conformité facture électronique, financement Chèque TIC, RGPD et données clients, impayés et trésorerie : les analyses d'Omega.AI pour les dirigeants.",
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
  /* 25/11/2026 — passe à la charte de l'accueil (docs/charte-accueil.md) :
     titre de page de l'accueil à gauche, sections jointives à filets, la
     grille d'articles gardée, l'appel final au kit, plus d'apparition au
     défilement. Textes inchangés. */
  return (
    <PageShell>
      <Cadre>
        <div className="offres ch-blog">
          <Section>
            <EnTeteSection
              niveau={1}
              haut
              disposition="pile"
              titre="Blog"
              chapo="Nos analyses, à l'attention des dirigeants."
            />
          </Section>
          <Section>
            <div className="ch-contenu">
              <CartesArticles articles={POSTS} />
            </div>
          </Section>
          <BlogCta />
        </div>
      </Cadre>
    </PageShell>
  );
}
