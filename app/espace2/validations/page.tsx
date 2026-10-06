import type { Metadata } from "next";
import FileValidations from "@/components/espace/validations/FileValidations";
import Habille from "@/components/espace2/Habille";
import { utilisateurCourant } from "@/lib/supabase/server";

/* /espace2/validations — la file « À valider » de /espace, dans le nouvel espace. */

export const metadata: Metadata = {
  title: "À valider",
  description: "Les demandes qui attendent votre décision : virements, factures, IBAN, accords.",
};

export default async function PageValidations() {
  const utilisateur = await utilisateurCourant();
  return (
    <Habille>
      <FileValidations utilisateur={utilisateur} />
    </Habille>
  );
}
