import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import Equipes from "@/components/espace2/daliro/Equipes";

/* /espace2/daliro/equipes — copie 1:1 de « Bookings » de Cal.com
   (03/11/2026, à la place d'Availability) : les passages des intervenants
   en réservations (À venir, Non confirmés, Plusieurs jours, Passés,
   Annulés), filtres (?intervenant=, ?type=, ?chantier=), détail d'un
   passage (?passage=) ou d'une absence (?absence=), vue calendrier.
   Police : Cal Sans VF, le fichier de Cal.com (licence OFL). */

const calSans = localFont({
  src: "../../../../components/espace2/daliro/polices/CalSansVF.woff2",
  variable: "--font-dal-cal",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Équipes",
  description: "Les passages de vos équipes et sous-traitants, leurs confirmations à J-2 et leurs absences.",
};

export default function PageEquipes() {
  return (
    <div className={calSans.variable}>
      <Suspense>
        <Equipes />
      </Suspense>
    </div>
  );
}
