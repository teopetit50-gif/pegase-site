import type { MetadataRoute } from "next";
import { FAMILLES, POSTS } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/* ══════════════════════════════════════════════════════════════════════
   /sitemap.xml (30/07/2026)

   Le site n'en avait aucun : Google devait deviner l'existence des douze
   fiches moteurs et des articles en suivant les liens. Les listes sont
   dérivées des mêmes sources que les pages (FAMILLES, POSTS), donc un
   moteur ou un article ajouté demain y entre tout seul.

   Les URL redirigées — /audit, /contact, /articles, /moteurs, /solutions —
   n'y figurent PAS : un sitemap ne déclare que des destinations finales.
   ══════════════════════════════════════════════════════════════════════ */

export default function sitemap(): MetadataRoute.Sitemap {
  const maj = new Date();

  const fixes: { url: string; priorite: number; frequence: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { url: "/", priorite: 1, frequence: "weekly" },
    { url: "/offres", priorite: 0.9, frequence: "weekly" },
    { url: "/modeles", priorite: 0.9, frequence: "monthly" },
    { url: "/tarifs", priorite: 0.9, frequence: "monthly" },
    { url: "/reserver-un-audit", priorite: 0.9, frequence: "monthly" },
    /* 28/08 — les deux pages de réservation en ligne. Priorité modérée :
       ce sont des étapes de parcours, pas des portes d'entrée SEO. */
    { url: "/reserver", priorite: 0.5, frequence: "monthly" },
    { url: "/installation", priorite: 0.4, frequence: "monthly" },
    { url: "/integrations", priorite: 0.8, frequence: "monthly" },
    /* 07/08 — « Où vont vos données ». Priorité haute pour une page qui ne
       vend rien : c'est celle qu'on cherche avant de signer, et elle répond
       à une question à laquelle aucune autre page du site ne répond. */
    { url: "/vos-donnees", priorite: 0.8, frequence: "monthly" },
    { url: "/blog", priorite: 0.7, frequence: "weekly" },
    { url: "/mentions-legales", priorite: 0.2, frequence: "yearly" },
  ];

  const moteurs = FAMILLES.flatMap((f) => f.moteurs).map((m) => ({
    url: `/offres/${m.slug}`,
    priorite: 0.8,
    frequence: "monthly" as const,
  }));

  const articles = POSTS.map((p) => ({
    url: `/blog/${p.slug}`,
    priorite: 0.6,
    frequence: "monthly" as const,
  }));

  return [...fixes, ...moteurs, ...articles].map((e) => ({
    url: `${SITE_URL}${e.url}`,
    lastModified: maj,
    changeFrequency: e.frequence,
    priority: e.priorite,
  }));
}
