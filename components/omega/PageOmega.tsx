/* Une page-document du pilotage, avec ses onglets éventuels (Vendre,
   Vidéos). Composant serveur : lit le texte en base, confie l'édition
   à Document. */

import Link from "next/link";
import { notFound } from "next/navigation";
import Document from "./Document";
import { lirePage } from "@/lib/omega/donnees";

export type Onglet = { slug: string; libelle: string; href: string };

export default async function PageOmega({ slug, titre, onglets }: { slug: string; titre: string; onglets?: Onglet[] }) {
  const page = await lirePage(slug);
  if (!page && !onglets?.some((o) => o.slug === slug)) notFound();
  return (
    <div className="v2-page om-page">
      <div className="v2-tete">
        <h1>{titre}</h1>
      </div>
      {onglets ? (
        <nav className="om-onglets" aria-label={`Sections de ${titre}`}>
          {onglets.map((o) => (
            <Link key={o.slug} href={o.href} className="om-onglet" aria-current={o.slug === slug ? "page" : undefined}>
              {o.libelle}
            </Link>
          ))}
        </nav>
      ) : null}
      <Document key={slug} slug={slug} titre={page?.titre ?? titre} contenu={page?.contenu ?? ""} />
    </div>
  );
}
