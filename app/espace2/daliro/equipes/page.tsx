import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import Equipes from "@/components/espace2/daliro/Equipes";

/* /espace2/daliro/equipes — copie 1:1 de « Availability » de Cal.com
   (02/11/2026) : un intervenant par ligne (passages des 30 prochains jours,
   absences), sa page (?intervenant=) sur celle d'un horaire : la semaine
   jour par jour, ses heures et ses jours qu'on change, ses absences.
   Police : Cal Sans VF, le fichier de Cal.com (licence OFL). */

const calSans = localFont({
  src: "../../../../components/espace2/daliro/polices/CalSansVF.woff2",
  variable: "--font-dal-cal",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Équipes",
  description: "Les passages prévus de vos équipes et sous-traitants sur 30 jours, leurs heures et leurs absences.",
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
