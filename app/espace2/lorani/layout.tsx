import DonneesLorani from "@/components/espace2/lorani/donnees";

/* /espace2/lorani/* — les sous-pages de LORANI partagent leur dossier
   (lu une fois, exemple modifié en mémoire) : components/espace2/lorani/donnees */
export default function LayoutLorani({ children }: { children: React.ReactNode }) {
  return <DonneesLorani>{children}</DonneesLorani>;
}
