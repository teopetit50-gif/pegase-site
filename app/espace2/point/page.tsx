import type { Metadata } from "next";
import PointDuMatin from "@/components/espace/point/PointDuMatin";
import Habille from "@/components/espace2/Habille";

/* /espace2/point — l'écran de /espace/point, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Point du matin",
  description: "Le point du matin du jour : ce qui a bougé pendant la nuit, ce qui attend, ce qui va bien.",
};

export default function PagePoint() {
  return (
    <Habille>
      <PointDuMatin />
    </Habille>
  );
}
