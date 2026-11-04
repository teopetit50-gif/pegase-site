import type { Metadata } from "next";
import EnvoyerAClaude from "@/components/espace2/EnvoyerAClaude";

/* /espace2/envoyer — copier les fiches d'Espace 2 gardées dans ce navigateur
   (appels, entreprises, contacts, tâches) pour les donner à Claude.
   Voir components/espace2/EnvoyerAClaude.tsx. */

export const metadata: Metadata = {
  title: "Envoyer mes fiches à Claude",
};

export default function Page() {
  return <EnvoyerAClaude />;
}
