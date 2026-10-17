"use client";

/* Le relevé du chantier (15/10/2026, session B6) : ce que Daliro y relève, en une page à lire, imprimer ou
   enregistrer en PDF. Rien n'est écrit ; calculé sur le tableau du chantier (releve.ts). */

import { useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { aujourdHui } from "../exemples/socle";
import { Pastille } from "../ui";
import { releveChantier, releveHtml } from "./releve";
import type { Tableau } from "./types";

export default function ReleveDialog({ tableau }: { tableau: Tableau }) {
  const jour = aujourdHui();
  const sections = useMemo(() => releveChantier(tableau, jour), [tableau, jour]);
  const imprimer = () => {
    const url = URL.createObjectURL(new Blob([releveHtml(tableau, sections, jour)], { type: "text/html" }));
    const w = window.open(url, "_blank", "noopener");
    if (!w) window.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  return (
    <>
      <DialogHeader>
        <DialogIcone><ClipboardList width={18} height={18} aria-hidden="true" /></DialogIcone>
        <DialogTitle>Relevé du chantier {tableau.chantier.nom}</DialogTitle>
        <DialogDescription>Ce que Daliro relève aujourd&apos;hui dans le marché, les travaux en plus, la facturation et le planning. Rien n&apos;est modifié.</DialogDescription>
      </DialogHeader>
      <DialogBody tabIndex={0} role="region" aria-label="Le relevé">
        {sections.map((s) => (
          <div key={s.titre} style={{ marginBottom: 12 }}>
            <div className="esp-section-titre" style={{ margin: "0 0 4px" }}>{s.titre}</div>
            <ul className="esp-fil">
              {s.lignes.map((l, k) => (
                <li key={k}>
                  <span className="esp-fil-point" data-teinte={l.gravite === "bloquant" ? "rouge" : l.gravite === "attention" ? "ambre" : undefined} />
                  <div className="esp-fil-texte">
                    {l.gravite === "bloquant" ? <><Pastille teinte="rouge" contour>À traiter</Pastille> </> : l.gravite === "attention" ? <><Pastille teinte="ambre" contour>À surveiller</Pastille> </> : null}
                    {l.texte}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </DialogBody>
      <DialogFooter>
        <button type="button" className="r-btn r-btn--noir" onClick={imprimer}>Imprimer ou enregistrer en PDF</button>
      </DialogFooter>
    </>
  );
}
