import type { Metadata } from "next";
import { Suspense } from "react";
import Courrier from "@/components/espace2/lorani/Courrier";

/* /espace2/lorani/courrier — ce que la lecture des courriers de la mairie
   laisse à traiter, tous permis confondus, sur « My issues » de Linear
   (29/10/2026) : dates lues et décisions implicites à confirmer, dates
   sans permis et courriers non reconnus à ranger (?onglet=). Mêmes portes
   que l'écran du permis (PermisVue). */

export const metadata: Metadata = {
  title: "Courrier à ranger",
  description: "Les dates lues sur les courriers de la mairie à confirmer ou à écarter, et les courriers à rattacher à leur permis.",
};

export default function PageCourrier() {
  return (
    <Suspense>
      <Courrier />
    </Suspense>
  );
}
