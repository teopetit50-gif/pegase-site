"use client";

/* Les pièces que le permis exigera (chiffrage, ligne 23), déduites du type d'autorisation, de la nature du projet, du
   permis (ERP, évaluation environnementale) et du PLU (secteur protégé), puis rapprochées des pièces déposées sur le
   projet. Le calcul est dans pieces-exigees.ts ; rien n'est écrit en base. */

import { useMemo } from "react";
import { FileCheck2, FileText } from "lucide-react";
import { Detail, Groupe, Ligne, Liste, Partie, Pilule, Point, Rangee, Rangees, Texte, teinte, useVolet } from "@/components/espace2/lin/Volet";
import { Pastille } from "../ui";
import { bordereau, type PieceExigee } from "./pieces-exigees";
import type { Dossier, Projet } from "./types";

/* l'état d'une pièce exigée, dans l'ordre du bordereau : déposée, demandée par la mairie, à confirmer, à déposer */
const etatDe = (p: PieceExigee) =>
  p.fournie ? { cle: "deposee", libelle: "Déposée", teinte: "vert" as const }
  : p.demandee ? { cle: "demandee", libelle: "Demandée par la mairie", teinte: "rouge" as const }
  : p.a_confirmer ? { cle: "a_confirmer", libelle: "À confirmer", teinte: "gris" as const }
  : { cle: "a_deposer", libelle: "À déposer", teinte: "ambre" as const };

export default function PiecesPermis({ projet, dossier }: { projet: Projet; dossier: Dossier }) {
  const volet = useVolet();
  const b = useMemo(() => bordereau(projet, dossier), [projet, dossier]);
  if (!b) return null;
  const manquantes = b.pieces.filter((p) => !p.fournie);
  const demandeesManquantes = manquantes.filter((p) => p.demandee).length;
  const cerfa = `${b.type === "pcmi" ? "Permis de construire une maison individuelle (Cerfa 13406)" : "Permis de construire (Cerfa 13409)"}${b.deduit ? ", déduit de la nature du projet" : ""}`;
  const etat = `${manquantes.length ? `${manquantes.length} pièce${manquantes.length > 1 ? "s" : ""} sur ${b.pieces.length} pas encore déposée${manquantes.length > 1 ? "s" : ""} sur le projet` : `Les ${b.pieces.length} pièces sont déposées sur le projet`}${demandeesManquantes ? `, dont ${demandeesManquantes} demandée${demandeesManquantes > 1 ? "s" : ""} par la mairie.` : "."}`;

  /* 30/10/2026 — dans la fiche de l'espace 2 : une pièce par ligne, groupées par ce qu'il reste à faire (demandées
     par la mairie, à déposer, à confirmer, déposées) ; article, motif et fichier déposé dans le volet (../../espace2/lin/Volet.tsx) */
  if (volet) {
    const groupes = [
      { cle: "demandee", nom: "Demandées par la mairie" },
      { cle: "a_deposer", nom: "À déposer" },
      { cle: "a_confirmer", nom: "À confirmer" },
      { cle: "deposee", nom: "Déposées" },
    ];
    return (
      <Partie titre="Pièces que le permis exigera" compte={manquantes.length ? `${manquantes.length} sur ${b.pieces.length} à déposer` : `${b.pieces.length} déposées`}>
        <p className="lvp-resume">{cerfa}.</p>
        <p className="lvp-resume" role="status">{etat}</p>
        <Liste>
          {groupes.map((g) => {
            const ps = b.pieces.filter((p) => etatDe(p).cle === g.cle);
            return ps.length ? (
              <Groupe key={g.cle} nom={g.nom} compte={ps.length}>
                {ps.map((p) => {
                  const e = etatDe(p);
                  return (
                    <Ligne
                      key={p.code}
                      cle={`piece-exigee:${p.code}`}
                      libelle={`${p.code} ${p.libelle}, ${e.libelle}`}
                      icone={<span data-teinte={teinte(e.teinte)} className="lvp-icone-teinte">{p.fournie ? <FileCheck2 /> : <FileText />}</span>}
                      id={p.code}
                      titre={p.libelle}
                      second={p.fournie ? p.fournie.nom_fichier : p.article}
                      droite={<Pilule teinte={teinte(e.teinte)} icone={<Point teinte={teinte(e.teinte)} />}>{e.libelle}</Pilule>}
                    />
                  );
                })}
              </Groupe>
            ) : null;
          })}
        </Liste>
        {b.pieces.map((p) => {
          const e = etatDe(p);
          return (
            <Detail key={p.code} cle={`piece-exigee:${p.code}`} titre={`${p.code} · ${p.libelle}`} sous={p.article}>
              <Rangees>
                <Rangee libelle="État" teinte={teinte(e.teinte)}>
                  <Point teinte={teinte(e.teinte)} />
                  {e.libelle}
                </Rangee>
                {p.fournie ? <Rangee libelle="Fichier">{p.fournie.nom_fichier}</Rangee> : null}
              </Rangees>
              {p.motif ? <Texte>{p.motif}</Texte> : null}
              {p.a_confirmer ? <Texte citation>{p.a_confirmer}</Texte> : null}
              {p.complement ? <Texte>{p.complement}</Texte> : null}
            </Detail>
          );
        })}
        <div className="lvp-note"><div>{b.non_couvert}</div></div>
      </Partie>
    );
  }

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
