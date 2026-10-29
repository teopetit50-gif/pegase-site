import type { Metadata } from "next";
import { Suspense } from "react";
import FilAppels from "@/components/espace2/lin/FilAppels";

/* /espace2/appels — le journal des appels sur la page d'un fil de Plain
   (28/10/2026) : la colonne des appels à gauche, le fil de l'appel ouvert
   (l'appel, ses notes, son suivi) au milieu avec son composeur, ses
   propriétés à droite. Mêmes fiches et mêmes gestes que l'ancienne page
   (Collection « appels », gardées sur cet appareil). */

export const metadata: Metadata = {
  title: "Appels",
};

export default function Page() {
  return (
    <Suspense>
      <FilAppels />
    </Suspense>
  );
}
