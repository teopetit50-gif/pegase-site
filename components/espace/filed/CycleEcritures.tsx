"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les onglets « Cycle de vie » et « Écritures » du dossier d'une facture
   (06/10/2026, fiche d'A4 §§ 3 et 6).

   La frise : un statut par ligne, dans l'ordre (filed_cycle_vie_facture) ;
   sous le libellé, l'état de la transmission (ou « Reçu du fournisseur »),
   le motif normalisé, le montant ; « obligatoire » pour 200, 210, 212, 213.
   Les écritures : le tableau Journal · N° · Date · Compte · Libellé ·
   Débit · Crédit · Lettrage, et « Transmettre à la comptabilité » pour une
   facture validée (filed_comptabiliser_facture).
   ══════════════════════════════════════════════════════════════════════ */

import { BookOpen } from "lucide-react";
import { Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { quand, texteEtat, type Ecriture, type LigneCycle } from "./factureElectronique";

export function CycleDeVie({ lignes }: { lignes: LigneCycle[] }) {
  if (!lignes.length) {
    return <Vide titre="Pas encore de statut">Le cycle de vie commence quand la facture est prise en charge (statut 204).</Vide>;
  }
  return (
    <div>
      <div className="esp-section-titre">Cycle de vie de la facture</div>
      <ol className="esp-fil esp-frise" aria-label="Statuts du cycle de vie, du plus ancien au plus récent">
        {lignes.map((l, i) => {
          const t = texteEtat(l);
          return (
            <li key={`${l.code}-${l.survenu_le}-${i}`}>
              <span className="esp-fil-point" data-teinte={t.teinte === "rouge" ? "rouge" : l.sens === "recu" ? "bleu" : l.etat === "emis" ? "vert" : undefined} />
              <div>
                <div className="esp-fil-texte esp-item-haut">
                  <span className="esp-mono">{l.code}</span>
                  <strong>{l.libelle}</strong>
                  {l.obligatoire ? <Pastille contour title="Statut obligatoire de la réforme de la facture électronique">obligatoire</Pastille> : null}
                  {l.sens === "recu" ? <Pastille teinte="bleu">reçu</Pastille> : null}
                </div>
                <div className="esp-fil-meta">{quand(l.survenu_le)}</div>
                <div className="esp-fil-meta" data-teinte={t.teinte ?? undefined} style={t.teinte === "rouge" ? { color: "#b91c1c" } : undefined}>{t.texte}</div>
                {l.motif_libelle || l.motif ? (
                  <div className="esp-fil-meta">Motif : {l.motif_libelle ?? l.motif_code}{l.motif ? ` — ${l.motif}` : ""}</div>
                ) : null}
                {l.montant !== null && (l.code === 211 || l.code === 212) ? <div className="esp-fil-meta">{montant(l.montant)}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function EcrituresFacture({ ecritures, peutTransmettre, envoi, onTransmettre }: { ecritures: Ecriture[]; peutTransmettre: boolean; envoi: boolean; onTransmettre: () => void }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="esp-section-titre">Écritures</div>
      {ecritures.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Écritures de la facture">
          <table className="esp-tableau">
            <thead>
              <tr><th>Journal</th><th>N°</th><th>Date</th><th>Compte</th><th>Libellé</th><th className="esp-num">Débit</th><th className="esp-num">Crédit</th><th>Lettrage</th></tr>
            </thead>
            <tbody>
              {ecritures.map((e, i) => (
                <tr key={`${e.ecriture_num}-${e.compte_num}-${i}`}>
                  <td title={e.journal_lib}><span className="esp-mono">{e.journal_code}</span></td>
                  <td className="esp-mono">{e.ecriture_num}</td>
                  <td>{dateCourte(e.ecriture_date)}</td>
                  <td className="esp-mono">{e.compte_num}{e.comp_aux_num ? ` · ${e.comp_aux_num}` : ""}</td>
                  <td>{e.compte_lib}</td>
                  <td className="esp-num">{e.debit ? montant(e.debit) : ""}</td>
                  <td className="esp-num">{e.credit ? montant(e.credit) : ""}</td>
                  <td>{e.ecriture_let ? `${e.ecriture_let}${e.date_let ? ` · ${dateCourte(e.date_let)}` : ""}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="esp-kpi-sous" style={{ margin: 0 }}>Pas encore d&apos;écriture : la facture s&apos;écrit en comptabilité quand elle est transmise à la comptabilité.</p>
      )}
      {peutTransmettre ? (
        <div className="esp-actions">
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={onTransmettre}><BookOpen width={13} height={13} aria-hidden="true" /> Transmettre à la comptabilité</button>
        </div>
      ) : null}
    </div>
  );
}
