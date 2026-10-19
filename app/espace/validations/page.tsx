import type { Metadata } from "next";
import FileValidations from "@/components/espace/validations/FileValidations";
import { utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /espace/validations — la file de validation d'une personne connectée
   (05/10/2026, session A3)

   Page dynamique : elle lit la session dans les cookies (utilisateurCourant,
   jeton vérifié) et la passe à l'écran (qui elle-même est l'identité du
   décideur). La coquille, le titre « Espace client Omega » et le hors-index
   viennent du layout (app/espace/layout.tsx, lot 19). Sans session, l'écran
   se montre sur les données d'exemple — rien ici ne renvoie vers une page
   de connexion (décision Teo du 15/09).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "À valider",
  description: "La file des demandes qui attendent votre décision : approuver, refuser, modifier, déléguer.",
};

export default async function PageValidations() {
  const utilisateur = await utilisateurCourant();
  return <FileValidations utilisateur={utilisateur} />;
}
