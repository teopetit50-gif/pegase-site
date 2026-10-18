import type { Metadata } from "next";
import Point from "@/components/espace2/Point";

/* /espace2/point — le Point du matin, redessiné au dessin de la maquette
   de Teo (07/10/2026). Les données restent celles de /espace/point. */

export const metadata: Metadata = {
  title: "Point du matin",
  description: "Le point du matin du jour : ce qui a bougé pendant la nuit, ce qui attend, ce qui va bien.",
};

export default function PagePoint() {
  return <Point />;
}
