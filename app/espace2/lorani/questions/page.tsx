import type { Metadata } from "next";
import { Suspense } from "react";
import Questions from "@/components/espace2/lorani/Questions";

/* /espace2/lorani/questions — les questions et les actions des comptes
   rendus de chantier, tous projets confondus, suivies jusqu'à la réponse
   (lorani_points, b5_20, b5_25), sur Threads de Plain (02/11/2026).
   « ?point=<id> » ouvre une question (lien du point du matin, aiguillage). */

export const metadata: Metadata = {
  title: "Questions et réponses",
  description: "Les questions posées aux entreprises et aux bureaux d'études, suivies jusqu'à la réponse ; celles qui attendent depuis huit jours remontent le matin.",
};

export default function PageQuestions() {
  return (
    <Suspense>
      <Questions />
    </Suspense>
  );
}
