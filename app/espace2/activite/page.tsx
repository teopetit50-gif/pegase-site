import type { Metadata } from "next";
import Activite from "@/components/espace2/Activite";

export const metadata: Metadata = {
  title: "Activité",
};

export default function PageActivite() {
  return <Activite />;
}
