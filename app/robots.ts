import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* /robots.txt (30/07/2026) — le site n'en avait pas. Tout est indexable :
   il n'y a ni espace client, ni page de test, ni contenu privé. La seule
   utilité réelle ici est de déclarer le sitemap, que les moteurs lisent en
   priorité pour découvrir les douze fiches et les articles. */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
