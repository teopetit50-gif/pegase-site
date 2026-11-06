import type { Metadata } from "next";
import { Suspense } from "react";
import Mails from "@/components/espace2/daliro/Mails";

/* /espace2/daliro/mails — la boîte mail de l'entreprise, copie de la Boîte de
   réception de FILED (liste des fils de Plain, mail ouvert dans la carte au
   milieu), remplie de mails d'exemple du BTP, tous modifiables (06/11/2026). */

export const metadata: Metadata = {
  title: "Mails",
  description: "La boîte mail de l'entreprise : clients, fournisseurs, sous-traitants, bureau de contrôle, mairie. Chaque mail se lit, se modifie, se range et se rattache à un chantier.",
};

export default function PageMails() {
  return (
    <Suspense>
      <Mails />
    </Suspense>
  );
}
