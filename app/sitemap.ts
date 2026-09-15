import type { MetadataRoute } from "next";
import { FAMILLES, POSTS } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/* ══════════════════════════════════════════════════════════════════════
   /sitemap.xml (30/07/2026)

   Le site n'en avait aucun : Google devait deviner l'existence des douze
   fiches moteurs et des articles en suivant les liens. Les listes sont
   dérivées des mêmes sources que les pages (FAMILLES, POSTS), donc un
   moteur ou un article ajouté demain y entre tout seul.

   Les URL redirigées — /audit, /articles, /moteurs, /solutions — (et plus
   /contact depuis le 08/09 : c'est la page du service client)
   n'y figurent PAS : un sitemap ne déclare que des destinations finales.
   ══════════════════════════════════════════════════════════════════════ */

export default function sitemap(): MetadataRoute.Sitemap {
  const maj = new Date();

  const fixes: { url: string; priorite: number; frequence: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { url: "/", priorite: 1, frequence: "weekly" },
    { url: "/offres", priorite: 0.9, frequence: "weekly" },
    /* 10/09 — /offres/sur-mesure manquait depuis toujours (relevé à l'audit
       du 16/08 et resté tel quel). Ce n'est pas une étape de parcours mais
       une porte d'entrée : « logiciel métier », « pont entre deux outils »
       se cherchent, et la page n'était indexable par aucun chemin. Même rang
       que /offres, dont elle est le complément. */
    { url: "/offres/sur-mesure", priorite: 0.9, frequence: "monthly" },
    { url: "/modeles", priorite: 0.9, frequence: "monthly" },
    { url: "/tarifs", priorite: 0.9, frequence: "monthly" },
    /* 01/09 — l'offre site à prix public, sœur de /tarifs. */
    { url: "/tarifs/site", priorite: 0.8, frequence: "monthly" },
    { url: "/reserver-un-audit", priorite: 0.9, frequence: "monthly" },
    /* 28/08 — les deux pages de réservation en ligne. Priorité modérée :
       ce sont des étapes de parcours, pas des portes d'entrée SEO. */
    { url: "/reserver", priorite: 0.5, frequence: "monthly" },
    /* 15/09 (soir) — /installation sort du plan du site : le parcours
       demande une connexion, et plus rien de la vitrine n'y mène. Il se
       réserve par le lien envoyé après l'audit. */
    /* 08/09 — le mode d'emploi de l'application (Android, iPhone,
       ordinateur) : une page publique, liée depuis le pied de page, qu'un
       client cherche quand il change de téléphone. Même rang que
       /reserver : une étape, pas une porte d'entrée. */
    { url: "/application", priorite: 0.5, frequence: "monthly" },
    /* 08/09 — le service client : WhatsApp et contact@omegaai.fr. */
    { url: "/contact", priorite: 0.6, frequence: "monthly" },
    { url: "/integrations", priorite: 0.8, frequence: "monthly" },
    /* 07/08 — « Où vont vos données ». Priorité haute pour une page qui ne
       vend rien : c'est celle qu'on cherche avant de signer, et elle répond
       à une question à laquelle aucune autre page du site ne répond. */
    { url: "/vos-donnees", priorite: 0.8, frequence: "monthly" },
    { url: "/blog", priorite: 0.7, frequence: "weekly" },
  ];

  /* 15/09/2026 — seuls les QUATRE paquets qui s'installent entrent au plan du
     site. Les deux compris (PULSE, VAULT) ne sont plus affichés ni liés nulle
     part : leurs pages existent encore, mais les déclarer ici reviendrait à
     les proposer à l'indexation comme des offres de plus. */
  const AFFICHES = new Set([
    "relances-impayes",
    "nouvelles-affaires",
    "demandes-clients",
    "factures-fournisseurs",
  ]);

  const moteurs = FAMILLES.flatMap((f) => f.moteurs)
    .filter((m) => AFFICHES.has(m.slug))
    .map((m) => ({
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
