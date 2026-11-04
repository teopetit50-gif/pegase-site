import Link from "next/link";
import { SearchX } from "lucide-react";
import { Vide } from "@/components/espace2/ui";
import { RACINE } from "@/components/espace2/modules";

/* /espace2 — la page introuvable de l'espace client (04/11/2026)

   Une fiche inconnue (un membre du Réseau, une page de la Formation…)
   appelait notFound() et tombait sur la 404 du site vitrine, hors de la
   coquille. Ici, elle reste dans Espace 2, avec le volet et la barre. */

export default function Introuvable() {
  return (
    <div style={{ padding: "48px 16px", maxWidth: 640, margin: "0 auto" }}>
      <Vide
        icone={<SearchX width={20} height={20} />}
        titre="Cette page n'existe pas"
        action={
          <Link href={RACINE} className="v2-btn v2-btn--primaire">
            Revenir à la vue d&apos;ensemble
          </Link>
        }
      >
        Le lien est peut-être ancien, ou ce qu&apos;il désigne n&apos;est pas dans les données affichées.
      </Vide>
    </div>
  );
}
