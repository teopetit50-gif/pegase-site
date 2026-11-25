import type { ReactNode } from "react";
import { googleSansAccueil } from "@/app/_polices/google-sans-accueil";
import SxRegles from "@/components/accueil-sx/SxRegles";
import { MARQUE_SITE } from "@/components/espace2/portail";
import "./charte.css";

/* La racine d'une page de la vitrine (25/11/2026, docs/charte-accueil.md) :
   pose `.charte` (fond, encre, Google Sans, alias de police) et les marges
   hachurées de l'accueil, qui se calent sur chaque `data-gutter-guide` de la
   page. Les sections vont dedans : <Section>, <EnTeteSection>…
   Sur un SITE DÉDIÉ (MARQUE_SITE posé), le cadre s'efface : la page garde
   le dessin de son site, la charte est celle de la vitrine Omega seule. */
export default function Cadre({
  children,
  gouttieres = true,
  className = "",
}: {
  children: ReactNode;
  gouttieres?: boolean;
  className?: string;
}) {
  if (MARQUE_SITE) return <>{children}</>;
  return (
    <div className={`charte relative isolate ${googleSansAccueil.variable} ${className}`}>
      {gouttieres && <SxRegles />}
      {children}
    </div>
  );
}
