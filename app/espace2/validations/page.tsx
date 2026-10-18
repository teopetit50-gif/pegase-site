import type { Metadata } from "next";
import Validations from "@/components/espace2/Validations";
import { utilisateurCourant } from "@/lib/supabase/server";

/* /espace2/validations — « À valider », redessiné au dessin de la maquette
   de Teo (07/10/2026). La logique reste celle de /espace (voir le composant). */

export const metadata: Metadata = {
  title: "À valider",
  description: "Les demandes qui attendent votre décision : virements, factures, IBAN, accords.",
};

export default async function PageValidations() {
  const utilisateur = await utilisateurCourant();
  return <Validations utilisateur={utilisateur} />;
}
