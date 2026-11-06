import type { Metadata } from "next";
import { Suspense } from "react";
import PageDevis from "@/components/espace2/daliro/PageDevis";

/* /espace2/daliro/devis/<id> — un devis dicté en pleine page (lien copié, écrans de 768 et moins). */

export const metadata: Metadata = {
  title: "Devis dicté",
  description: "Un devis dicté sur place : le vocal transcrit, les lignes chiffrées sur la bibliothèque de prix, le total.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PageDevis id={id} />
    </Suspense>
  );
}
