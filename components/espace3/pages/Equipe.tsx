"use client";

/* Équipe et périmètres : qui voit quoi dans le groupe. */

import { UserPlus } from "lucide-react";
import { useToast } from "@/components/espace2/Toasts";
import { MEMBRES } from "../donnees";
import { Carte, Page, Pastille, Tableau, Tete } from "../ui3";

export default function Equipe() {
  const toast = useToast();
  return (
    <Page>
      <Tete
        titre="Équipe et périmètres"
        sous="Chacun voit son périmètre, et seulement lui. Le CEO voit tout le groupe ; un gérant, sa société ; la direction marketing, les enseignes et les clients."
        actions={
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => toast("Invitation prête à envoyer")}>
            <UserPlus width={14} height={14} aria-hidden="true" /> Inviter
          </button>
        }
      />
      <Carte titre="Les accès" plein>
        <Tableau colonnes={[{ libelle: "Qui" }, { libelle: "Rôle" }, { libelle: "Périmètre" }, { libelle: "Ce qu'il voit" }]}>
          {MEMBRES.map((m) => (
            <tr key={m.nom}>
              <td>{m.nom}</td>
              <td>
                <Pastille teinte={m.role === "CEO" ? "bleu" : "gris"}>{m.role}</Pastille>
              </td>
              <td>{m.perimetre}</td>
              <td style={{ whiteSpace: "normal", minWidth: 260 }}>{m.acces}</td>
            </tr>
          ))}
        </Tableau>
      </Carte>
    </Page>
  );
}
