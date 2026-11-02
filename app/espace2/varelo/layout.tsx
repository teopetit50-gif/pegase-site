import DonneesVarelo from "@/components/espace2/varelo/donnees";

/* /espace2/varelo/* — les sous-pages de VARELO partagent le référentiel du groupe
   (lu une fois, exemple modifié en mémoire) : components/espace2/varelo/donnees */
export default function LayoutVarelo({ children }: { children: React.ReactNode }) {
  return <DonneesVarelo>{children}</DonneesVarelo>;
}
