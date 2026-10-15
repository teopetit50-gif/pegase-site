"use client";

/* Les pièces que le permis exigera (chiffrage, ligne 23), déduites du type d'autorisation, de la nature du projet, du
   permis (ERP, évaluation environnementale) et du PLU (secteur protégé), puis rapprochées des pièces déposées sur le
   projet. Le calcul est dans pieces-exigees.ts ; rien n'est écrit en base. */

import { useMemo } from "react";
import { Pastille } from "../ui";
import { bordereau } from "./pieces-exigees";
import type { Dossier, Projet } from "./types";

export default function PiecesPermis({ projet, dossier }: { projet: Projet; dossier: Dossier }) {
  const b = useMemo(() => bordereau(projet, dossier), [projet, dossier]);
  if (!b) return null;
  const manquantes = b.pieces.filter((p) => !p.fournie);
  const demandeesManquantes = manquantes.filter((p) => p.demandee).length;
  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Pièces que le permis exigera</span>
        <span className="esp-kpi-sous">{b.type === "pcmi" ? "Permis de construire une maison individuelle (Cerfa 13406)" : "Permis de construire (Cerfa 13409)"}{b.deduit ? ", déduit de la nature du projet" : ""}</span>
      </div>
      <p className="lor-sous" role="status">
        {manquantes.length ? `${manquantes.length} pièce${manquantes.length > 1 ? "s" : ""} sur ${b.pieces.length} pas encore déposée${manquantes.length > 1 ? "s" : ""} sur le projet` : `Les ${b.pieces.length} pièces sont déposées sur le projet`}
        {demandeesManquantes ? `, dont ${demandeesManquantes} demandée${demandeesManquantes > 1 ? "s" : ""} par la mairie.` : "."}
      </p>
      <ul className="lor-liste lor-pieces-exigees" aria-label="Pièces exigées par le permis">
        {b.pieces.map((p) => (
          <li key={p.code}>
            <Pastille teinte={p.fournie ? "vert" : p.demandee ? "rouge" : p.a_confirmer ? "gris" : "ambre"}>{p.fournie ? "Déposée" : p.demandee ? "Demandée par la mairie" : p.a_confirmer ? "À confirmer" : "À déposer"}</Pastille>{" "}
            <strong className="esp-mono">{p.code}</strong> {p.libelle}
            <span className="lor-sous"> · {p.article}{p.fournie ? ` · ${p.fournie.nom_fichier}` : ""}</span>
            {p.motif || p.a_confirmer || p.complement ? <div className="lor-sous">{[p.motif, p.a_confirmer, p.complement].filter(Boolean).join(" ")}</div> : null}
          </li>
        ))}
      </ul>
      <p className="lor-sous">{b.non_couvert}</p>
    </div>
  );
}
