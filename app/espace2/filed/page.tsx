import type { Metadata } from "next";
import AVenir from "@/components/espace2/AVenir";

export const metadata: Metadata = {
  title: "Documents reçus",
};

export default function PageFiled() {
  return <AVenir titre="Documents reçus" description="Les documents reçus par FILED : numéro, contrôles, pièce en regard et corrections." ancien="/espace/filed" />;
}
