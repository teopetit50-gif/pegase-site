import type { Metadata } from "next";
import CoquilleEspace from "@/components/espace/CoquilleEspace";
import FileValidations from "@/components/espace/validations/FileValidations";
import { utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /espace/validations — la file de validation d'une personne connectée
   (05/10/2026, session A3)

   Page dynamique : elle lit la session dans les cookies (utilisateurCourant,
   jeton vérifié) et la passe à la coquille et à l'écran. Sans session,
   l'écran se montre sur les données d'exemple — rien ici ne renvoie vers
   une page de connexion (décision Teo du 15/09).

   Hors index : c'est un écran de travail, pas une page de la vitrine.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "À valider | Espace client Omega",
  description: "La file des demandes qui attendent votre décision : approuver, refuser, modifier, déléguer.",
  robots: { index: false, follow: false },
};

export default async function PageValidations() {
  const utilisateur = await utilisateurCourant();
  return (
    <CoquilleEspace ecran="validations" utilisateur={utilisateur}>
      <FileValidations utilisateur={utilisateur} />
    </CoquilleEspace>
  );
}
