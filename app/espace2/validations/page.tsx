import type { Metadata } from "next";
import AVenir from "@/components/espace2/AVenir";

export const metadata: Metadata = {
  title: "À valider",
};

export default function PageValidations() {
  return <AVenir titre="À valider" description="Les demandes qui attendent votre décision : virements, factures, IBAN, accords." ancien="/espace/validations" />;
}
