import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import Agenda, { type ReelAgenda } from "@/components/espace2/teo/Agenda";
import { estAdmin } from "@/lib/omega/donnees";
import { lireAgenda } from "@/lib/teo/agenda";

/* /espace2/teo/agenda — l'agenda de Teo (les rendez-vous du tableau des associés,
   et l'agenda Google s'il est branché), copie 1:1 de « Bookings » de
   Cal.com (les Équipes de DALIRO) : À venir, Non confirmés, Plusieurs jours,
   Passés, Annulés ; filtre (?invite=, ?genre=) ; le détail d'un rendez-vous
   (?rdv=) ; la vue calendrier (?vue=calendrier). Police : Cal Sans VF, le
   fichier de Cal.com (licence OFL), comme chez DALIRO. */

const calSans = localFont({
  src: "../../../../components/espace2/daliro/polices/CalSansVF.woff2",
  variable: "--font-dal-cal",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agenda",
  description: "Votre agenda : les rendez-vous du tableau des associés et de Google Agenda, avec leurs invités et leurs liens de visio.",
};

export default async function PageAgenda() {
  const reel: ReelAgenda | null = (await estAdmin()) ? await lireAgenda() : null;
  return (
    <div className={calSans.variable}>
      <Suspense>
        <Agenda reel={reel} />
      </Suspense>
    </div>
  );
}
