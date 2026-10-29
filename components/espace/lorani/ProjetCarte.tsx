"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le dossier du projet (sorti d'EcranLorani le 29/10/2026, tel quel) :
   l'identité et ses actions (B18, B19), l'équipe et les lots (B20, B21),
   les intervenants (B22), puis les cartes des phases de la mission
   (urbanisme, pièces, contrôle, offres, honoraires, chantier, comptes
   rendus, ordres de service, réception, DOE, assurances).

   `parties` n'affiche que les parties demandées, dans l'ordre de toujours
   (toutes par défaut : l'écran de /espace ne change pas). Les fenêtres du
   projet (courrier, permis, lot, intervenant, membre) sont tenues par le
   parent (Formulaires) : `ouvrirForm` les ouvre.
   `confirmerEnvois` : « Diffuser » un compte rendu et « Demander les pièces
   manquantes » du DOE passent par une fenêtre de confirmation (espace 2) ;
   sans elle, ils partent au clic, comme avant.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { FileArchive, Mail, Plus } from "lucide-react";
import { Avis, Pastille } from "../ui";
import { NATURES_INTERVENANT, NATURES_PROJET, PHASES, ROLES_PROJET } from "./etats";
import { dossierDate } from "./dossier-date";
import { telecharger } from "./rapport";
import Chantier from "./Chantier";
import Assurances from "./Assurances";
import Offres from "./Offres";
import ComptesRendus from "./ComptesRendus";
import Doe from "./Doe";
import OrdresService from "./OrdresService";
import Reserves from "./Reserves";
import Controle from "./Controle";
import PluProjet from "./PluProjet";
import PiecesPermis from "./PiecesPermis";
import Honoraires from "./Honoraires";
import type { Form } from "./Formulaires";
import type { Dossier, Projet } from "./types";
import "./lorani.css";

export type PartieProjet =
  | "identite"
  | "equipe"
  | "intervenants"
  | "plu"
  | "pieces"
  | "controle"
  | "offres"
  | "honoraires"
  | "chantier"
  | "comptesRendus"
  | "ordresService"
  | "reserves"
  | "doe"
  | "assurances";

/* ——— le dossier du projet : équipe, lots, intervenants, actions ——— */
export default function ProjetCarte({ projet, dossier, nommer, peutEcrire, envoi, ouvrirForm, agir, parties, confirmerEnvois }: {
  projet: Projet;
  dossier: Dossier;
  nommer: (id: string | null | undefined) => string;
  peutEcrire: boolean;
  envoi: boolean;
  ouvrirForm: (f: Form) => void;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
  parties?: PartieProjet[];
  confirmerEnvois?: boolean;
}) {
  const voir = (p: PartieProjet) => !parties || parties.includes(p);
  const membres = dossier.membres.filter((m) => m.projet_id === projet.id);
  const lots = dossier.lots.filter((l) => l.projet_id === projet.id);
  const intervenants = dossier.intervenants.filter((i) => i.projet_id === projet.id && i.actif);
  const gris = !peutEcrire || envoi;
  const [exportErreur, setExportErreur] = useState<string | null>(null);
  /* le dossier daté, exportable en une fois : registre PDF et Excel (une feuille par lot), dans une archive */
  const exporter = () => {
    setExportErreur(null);
    try {
      const r = dossierDate(projet, dossier, nommer);
      telecharger(r.nom, r.octets, "application/zip");
    } catch (e) {
      setExportErreur(e instanceof Error ? e.message : "Le dossier daté n'a pas pu être fabriqué.");
    }
  };
  return (
    <section className="esp-carte" aria-label="Dossier du projet">
      {voir("identite") ? (
        <>
          <div className="esp-carte-tete">
            <div>
              <h2 className="esp-carte-titre">{projet.nom}</h2>
              <div className="lor-sous">
                {[projet.reference, projet.adresse, [projet.code_postal, projet.commune].filter(Boolean).join(" "), projet.parcelles.length ? `parcelles ${projet.parcelles.join(", ")}` : null].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span className="esp-item-haut">
              <Pastille contour>{NATURES_PROJET[projet.nature]}</Pastille>
              <Pastille contour>{PHASES[projet.phase]}</Pastille>
              {projet.marche_public ? <Pastille contour>Marché public</Pastille> : null}
              {projet.territoire ? <Pastille teinte="gris">{projet.territoire === "metropole" ? "Métropole" : projet.territoire}</Pastille> : <Pastille teinte="ambre">Territoire inconnu</Pastille>}
            </span>
          </div>
          <div className="esp-carte-corps">
            <div className="esp-actions">
              <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={() => ouvrirForm({ type: "courrier", projet: projet.id })}><Mail width={16} height={16} aria-hidden="true" /> Déposer un courrier de la mairie</button>
              <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => ouvrirForm({ type: "permis", projet: projet.id })}><Plus width={16} height={16} aria-hidden="true" /> Nouveau permis</button>
              <button type="button" className="r-btn r-btn--fil" onClick={exporter}><FileArchive width={16} height={16} aria-hidden="true" /> Exporter le dossier daté</button>
            </div>
            {exportErreur ? <Avis teinte="rouge" role="alert">{exportErreur}</Avis> : null}
          </div>
        </>
      ) : null}
      {voir("equipe") ? (
        <div className="esp-carte-corps">
          <div className="lor-grille-dossier">
            <div>
              <div className="esp-section-titre">
                <span>Équipe</span>
                <button type="button" className="esp-lien-bouton" disabled={gris} onClick={() => ouvrirForm({ type: "membre", projet: projet.id })}>Ajouter</button>
              </div>
              {membres.length ? (
                <dl className="esp-def">
                  {membres.map((m) => (
                    <div key={m.id}>
                      <dt>{ROLES_PROJET[m.role_projet]}</dt>
                      <dd>{nommer(m.user_id)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="lor-tableau-vide">Personne : les rappels n&apos;ont pas de destinataire. Nommez un chef de projet.</div>
              )}
            </div>
            <div>
              <div className="esp-section-titre">
                <span>Lots</span>
                <button type="button" className="esp-lien-bouton" disabled={gris} onClick={() => ouvrirForm({ type: "lot", projet: projet.id })}>Ajouter</button>
              </div>
              {lots.length ? (
                <dl className="esp-def">
                  {lots.map((l) => (
                    <div key={l.id}>
                      <dt className="esp-mono">{l.numero}</dt>
                      <dd>{l.intitule}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="lor-tableau-vide">Aucun lot.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {voir("intervenants") ? (
        <div className="esp-carte-corps">
          <div className="esp-section-titre">
            <span>Intervenants</span>
            <button type="button" className="esp-lien-bouton" disabled={gris} onClick={() => ouvrirForm({ type: "intervenant", projet: projet.id })}>Ajouter</button>
          </div>
          {intervenants.length ? (
            /* le tableau défile à 390 : focusable au clavier, nommé (axe, scrollable-region-focusable) */
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Intervenants du projet">
              <table className="esp-tableau">
                <thead>
                  <tr>
                    <th>Rôle</th>
                    <th>Organisme</th>
                    <th>Contact</th>
                    <th>Lot</th>
                  </tr>
                </thead>
                <tbody>
                  {intervenants.map((i) => (
                    <tr key={i.id}>
                      <td>{NATURES_INTERVENANT[i.nature]}</td>
                      <td>{i.organisme}{i.siren ? <span className="esp-kpi-sous"> · SIREN {i.siren}</span> : null}</td>
                      <td>{[i.contact, i.email, i.telephone].filter(Boolean).join(" · ") || "—"}</td>
                      <td>{i.lot_id ? (lots.find((l) => l.id === i.lot_id)?.numero ?? "—") : "Tout le projet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="lor-tableau-vide">Aucun intervenant.</div>
          )}
        </div>
      ) : null}
      {voir("plu") ? <PluProjet projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} /> : null}
      {voir("pieces") ? <PiecesPermis projet={projet} dossier={dossier} /> : null}
      {voir("controle") ? <Controle projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} agir={agir} /> : null}
      {voir("offres") ? <Offres projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} /> : null}
      {voir("honoraires") ? <Honoraires projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} agir={agir} /> : null}
      {voir("chantier") ? <Chantier projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} /> : null}
      {voir("comptesRendus") ? <ComptesRendus projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} confirmer={confirmerEnvois} /> : null}
      {voir("ordresService") ? <OrdresService projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} /> : null}
      {voir("reserves") ? <Reserves projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} /> : null}
      {voir("doe") ? <Doe projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} confirmer={confirmerEnvois} /> : null}
      {voir("assurances") ? <Assurances projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} /> : null}
    </section>
  );
}
