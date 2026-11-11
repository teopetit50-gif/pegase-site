import type { Metadata } from "next";
import { Suspense } from "react";
import Mails, { type ReelMails } from "@/components/espace2/teo/Mails";
import { estAdmin } from "@/lib/omega/donnees";
import { lireBoite } from "@/lib/teo/gmail";

/* /espace2/teo/mails — la boîte Gmail de Teo, copie des Mails de DALIRO (la
   liste des fils de Plain, le mail ouvert dans la carte au milieu) : les fils
   de la boîte de réception, le fil ouvert (?id=) avec ses messages lus dans
   Gmail à l'ouverture, et la réponse qui part dans le fil. */

export const metadata: Metadata = {
  title: "Mails",
  description: "Votre boîte Gmail : les mails reçus, ceux qui attendent une réponse, et la réponse qui part d'ici.",
};

export default async function PageMails() {
  const reel: ReelMails | null = (await estAdmin()) ? await lireBoite() : null;
  return (
    <Suspense>
      <Mails reel={reel} />
    </Suspense>
  );
}
