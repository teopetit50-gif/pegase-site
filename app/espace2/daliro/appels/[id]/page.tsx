import type { Metadata } from "next";
import { Suspense } from "react";
import PageAppel from "@/components/espace2/daliro/PageAppel";

/* /espace2/daliro/appels/<id> — un appel en pleine page (lien copié, écrans de 768 et moins). */

export const metadata: Metadata = {
  title: "Appel",
  description: "Un appel : son résumé, sa transcription, ses suites et le chantier concerné.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PageAppel id={id} />
    </Suspense>
  );
}
