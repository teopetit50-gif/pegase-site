import { redirect } from "next/navigation";

/* 29/10/2026 — la formation vit désormais dans l'espace client
   (app/espace2/formation) ; l'ancienne adresse, déjà donnée, y renvoie. */
export default function Page() {
  redirect("/espace2/formation");
}
