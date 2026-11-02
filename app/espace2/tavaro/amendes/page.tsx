import type { Metadata } from "next";
import { Suspense } from "react";
import Amendes from "@/components/espace2/tavaro/Amendes";

/* /espace2/tavaro/amendes — avis de contravention, contestations bancaires et péages en flux libre,
   les trois délais légaux, sur le Triage de Linear (02/11/2026). */

export const metadata: Metadata = {
  title: "Amendes, péages, contestations",
  description: "Les avis de contravention à désigner sous 45 jours, les contestations bancaires à défendre, les péages à payer sous 72 heures.",
};

export default function Page() {
  return (
    <Suspense>
      <Amendes />
    </Suspense>
  );
}
