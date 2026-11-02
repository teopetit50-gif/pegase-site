import { DonneesTiroma } from "@/components/espace2/tiroma/donnees";

/* /espace2/tiroma/* — les six sous-pages de TIROMA partagent le même dossier
   (exemple modifié en mémoire, ou base réelle) : components/espace2/tiroma/donnees */
export default function LayoutTiroma({ children }: { children: React.ReactNode }) {
  return <DonneesTiroma>{children}</DonneesTiroma>;
}
