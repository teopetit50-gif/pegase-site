"use client";

/* La section « Avant les rendez-vous » (05/10/2026, session B3) : deux jours
   avant, le retour du laboratoire, l'implant en stock, l'accord de la
   mutuelle, le devis qui expire, l'accord ODF qui dort et le traitement
   interrompu. Critique d'abord. */

import { Pastille, Vide } from "../ui";
import { dateCourte } from "../format";
import { NATURES_VERIF } from "./libelles";
import type { Verification } from "./types";

const TEINTES = { critique: "rouge", attention: "ambre", info: "vert" } as const;

export default function AvantRendezVous({ verifications, jours }: { verifications: Verification[]; jours: number }) {
  const critiques = verifications.filter((v) => v.gravite === "critique").length;
  return (
    <section id="tiroma-avant" className="esp-carte" aria-label="Avant les rendez-vous">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Avant les rendez-vous</h2>
        <span className="esp-kpi-sous">À J-{jours} : {verifications.length ? `${verifications.length} vérification${verifications.length > 1 ? "s" : ""}${critiques ? `, ${critiques} critique${critiques > 1 ? "s" : ""}` : ""}` : "rien à vérifier"}</span>
      </div>
      <div className="esp-carte-corps">
        {!verifications.length ? (
          <Vide titre="Rien à vérifier">Les poses ont leur travail de laboratoire, les chirurgies leur implant, les devis leur délai et la mutuelle a répondu.</Vide>
        ) : (
          <div className="esp-point-sections" style={{ gridTemplateColumns: "1fr" }}>
            {verifications.map((v, i) => (
              <div key={`${v.nature}-${v.objet_id ?? i}-${v.rendez_vous_id ?? ""}`} className="esp-point-ligne">
                <span className="esp-point-gravite" data-gravite={v.gravite === "info" ? undefined : v.gravite} data-sante={v.gravite === "info"} role="img" aria-label={v.gravite === "info" ? "information" : v.gravite} />
                <div>
                  <div className="esp-item-haut">
                    <Pastille teinte={TEINTES[v.gravite]}>{NATURES_VERIF[v.nature]}</Pastille>
                    {v.quand ? <span className="esp-kpi-sous">{dateCourte(v.quand)}</span> : null}
                    {v.patient_nom ? <strong>{v.patient_nom}</strong> : null}
                  </div>
                  <div className="esp-point-texte">{v.texte}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
