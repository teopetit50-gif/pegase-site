"use client";

/* /espace2/daliro/equipes : la liste des intervenants (Linear, Initiatives — ./EquipesListe, 05/11/2026),
   et ?vue=passages : les passages, absences, remplaçants et le calendrier (./Equipes, Cal.com Bookings). */

import { useSearchParams } from "next/navigation";
import Equipes from "./Equipes";
import EquipesListe from "./EquipesListe";

export default function EquipesVues() {
  const params = useSearchParams();
  return params.get("vue") === "passages" || params.get("passage") || params.get("absence") ? <Equipes /> : <EquipesListe />;
}
