import type { Metadata } from "next";
import AVenir from "@/components/espace2/AVenir";

export const metadata: Metadata = {
  title: "Fournisseurs",
};

export default function PageFournisseurs() {
  return <AVenir titre="Fournisseurs" description="Les fournisseurs, leurs IBAN, leur identité vérifiée et leurs factures." ancien="/espace/filed/fournisseurs" />;
}
