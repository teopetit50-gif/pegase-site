import type { Metadata } from "next";
import AVenir from "@/components/espace2/AVenir";

export const metadata: Metadata = {
  title: "Point du matin",
};

export default function PagePoint() {
  return <AVenir titre="Point du matin" description="Ce qu'il faut savoir ce matin, module par module." ancien="/espace/point" />;
}
