import DonneesTavaro from "@/components/espace2/tavaro/donnees";

/* /espace2/tavaro/* — les sous-pages de TAVARO partagent leurs données
   (monde lu une fois, rôle, gestes, filtre d'agence) : components/espace2/tavaro/donnees */
export default function LayoutTavaro({ children }: { children: React.ReactNode }) {
  return <DonneesTavaro>{children}</DonneesTavaro>;
}
