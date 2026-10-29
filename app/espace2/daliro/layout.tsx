import DonneesDaliro from "@/components/espace2/daliro/donnees";

/* /espace2/daliro/* — les sous-pages de DALIRO partagent leurs données
   (liste, tableaux lus, exemple modifié en mémoire) : components/espace2/daliro/donnees */
export default function LayoutDaliro({ children }: { children: React.ReactNode }) {
  return <DonneesDaliro>{children}</DonneesDaliro>;
}
