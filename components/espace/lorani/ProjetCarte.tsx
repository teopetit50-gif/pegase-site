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
import { Building2, FileArchive, Layers, Mail, Plus, UserRound } from "lucide-react";
import { Bouton, Detail, Groupe, Ligne, Liste, Partie, Pilule, Point, Rangee, Rangees, SousLigne, SousListe, Vide, useVolet } from "@/components/espace2/lin/Volet";
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
  const volet = useVolet();
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
  /* 30/10/2026 — dans la fiche de l'espace 2 : l'identité en rangées (ses trois gestes en tête), l'équipe groupée
     par rôle, les lots et les intervenants une ligne chacun ; le détail de l'élément choisi dans le volet
     (../../espace2/lin/Volet.tsx). Les autres cartes font leur propre bascule. */
  const identiteVolet = volet ? (
    <Partie
      titre="Identité du projet"
      gestes={
        <>
          <Bouton fort icone={<Mail aria-hidden="true" />} disabled={gris} onClick={() => ouvrirForm({ type: "courrier", projet: projet.id })}>Déposer un courrier de la mairie</Bouton>
          <Bouton icone={<Plus aria-hidden="true" />} disabled={gris} onClick={() => ouvrirForm({ type: "permis", projet: projet.id })}>Nouveau permis</Bouton>
          <Bouton icone={<FileArchive aria-hidden="true" />} onClick={exporter}>Exporter le dossier daté</Bouton>
        </>
      }
      avis={exportErreur ? <Avis teinte="rouge" role="alert">{exportErreur}</Avis> : null}
    >
      <Rangees>
        <Rangee libelle="Nom">{projet.nom}</Rangee>
        {projet.reference ? <Rangee libelle="Référence">{projet.reference}</Rangee> : null}
        {projet.adresse || projet.code_postal || projet.commune ? (
          <Rangee libelle="Adresse">{[projet.adresse, [projet.code_postal, projet.commune].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</Rangee>
        ) : null}
        {projet.parcelles.length ? <Rangee libelle="Parcelles">{projet.parcelles.join(", ")}</Rangee> : null}
        <Rangee libelle="Nature">
          <Pilule>{NATURES_PROJET[projet.nature]}</Pilule>
          {projet.marche_public ? <> <Pilule>Marché public</Pilule></> : null}
        </Rangee>
        <Rangee libelle="Phase">
          <Pilule>{PHASES[projet.phase]}</Pilule>
        </Rangee>
        <Rangee libelle="Territoire">
          {projet.territoire ? (
            <Pilule teinte="gris">{projet.territoire === "metropole" ? "Métropole" : projet.territoire}</Pilule>
          ) : (
            <Pilule teinte="jaune" icone={<Point teinte="jaune" />}>Territoire inconnu</Pilule>
          )}
        </Rangee>
      </Rangees>
    </Partie>
  ) : null;
  const lotDe = (id: string | null) => (id ? lots.find((l) => l.id === id) : undefined);
  const equipeVolet = volet ? (
    <>
      <Partie
        titre="Équipe"
        compte={membres.length ? String(membres.length) : null}
        gestes={<Bouton icone={<Plus aria-hidden="true" />} disabled={gris} onClick={() => ouvrirForm({ type: "membre", projet: projet.id })}>Ajouter un membre</Bouton>}
      >
        {membres.length ? (
          <Liste>
            {(Object.keys(ROLES_PROJET) as (keyof typeof ROLES_PROJET)[]).map((r) => {
              const ms = membres.filter((m) => m.role_projet === r);
              return ms.length ? (
                <Groupe key={r} nom={ROLES_PROJET[r]} compte={ms.length}>
                  {ms.map((m) => (
                    <Ligne key={m.id} cle={`membre:${m.id}`} libelle={`${nommer(m.user_id)}, ${ROLES_PROJET[m.role_projet]}`} icone={<UserRound />} titre={nommer(m.user_id)} second={ROLES_PROJET[m.role_projet]} />
                  ))}
                </Groupe>
              ) : null;
            })}
          </Liste>
        ) : (
          <Vide>Personne : les rappels n&apos;ont pas de destinataire. Nommez un chef de projet.</Vide>
        )}
        {membres.map((m) => (
          <Detail key={m.id} cle={`membre:${m.id}`} titre={nommer(m.user_id)} sous={ROLES_PROJET[m.role_projet]}>
            <Rangees>
              <Rangee libelle="Rôle">{ROLES_PROJET[m.role_projet]}</Rangee>
              <Rangee libelle="Projet">{projet.nom}</Rangee>
            </Rangees>
          </Detail>
        ))}
      </Partie>
      <Partie
        titre="Lots"
        compte={lots.length ? String(lots.length) : null}
        gestes={<Bouton icone={<Plus aria-hidden="true" />} disabled={gris} onClick={() => ouvrirForm({ type: "lot", projet: projet.id })}>Ajouter un lot</Bouton>}
      >
        {lots.length ? (
          <Liste>
            {[
              { cle: "sans", nom: "Sans entreprise", ls: lots.filter((l) => !intervenants.some((i) => i.lot_id === l.id && i.nature === "entreprise")) },
              { cle: "avec", nom: "Entreprise désignée", ls: lots.filter((l) => intervenants.some((i) => i.lot_id === l.id && i.nature === "entreprise")) },
            ].map((g) =>
              g.ls.length ? (
                <Groupe key={g.cle} nom={g.nom} compte={g.ls.length}>
                  {g.ls.map((l) => {
                    const ent = intervenants.find((i) => i.lot_id === l.id && i.nature === "entreprise");
                    return <Ligne key={l.id} cle={`lot:${l.id}`} libelle={`Lot ${l.numero}, ${l.intitule}`} icone={<Layers />} id={l.numero} titre={l.intitule} second={ent?.organisme ?? null} />;
                  })}
                </Groupe>
              ) : null,
            )}
          </Liste>
        ) : (
          <Vide>Aucun lot.</Vide>
        )}
        {lots.map((l) => {
          const du = intervenants.filter((i) => i.lot_id === l.id);
          return (
            <Detail key={l.id} cle={`lot:${l.id}`} titre={`Lot ${l.numero}`} sous={l.intitule}>
              <Rangees>
                <Rangee libelle="Numéro">{l.numero}</Rangee>
                <Rangee libelle="Intitulé">{l.intitule}</Rangee>
              </Rangees>
              {du.length ? (
                <SousListe titre="Intervenants du lot">
                  {du.map((i) => <SousLigne key={i.id} titre={i.organisme} second={NATURES_INTERVENANT[i.nature]} />)}
                </SousListe>
              ) : null}
            </Detail>
          );
        })}
      </Partie>
    </>
  ) : null;
  const intervenantsVolet = volet ? (
    <Partie
      titre="Intervenants"
      compte={intervenants.length ? String(intervenants.length) : null}
      gestes={<Bouton icone={<Plus aria-hidden="true" />} disabled={gris} onClick={() => ouvrirForm({ type: "intervenant", projet: projet.id })}>Ajouter un intervenant</Bouton>}
    >
      {intervenants.length ? (
        <Liste>
          {[
            { cle: "conseils", nom: "Maîtrise d’ouvrage, études et contrôle", is: intervenants.filter((i) => i.nature !== "entreprise") },
            { cle: "entreprises", nom: "Entreprises", is: intervenants.filter((i) => i.nature === "entreprise") },
          ].map((g) =>
            g.is.length ? (
              <Groupe key={g.cle} nom={g.nom} compte={g.is.length}>
                {g.is.map((i) => {
                  const lot = lotDe(i.lot_id);
                  return (
                    <Ligne
                      key={i.id}
                      cle={`intervenant:${i.id}`}
                      libelle={`${i.organisme}, ${NATURES_INTERVENANT[i.nature]}`}
                      icone={<Building2 />}
                      id={i.lot_id ? (lot ? `Lot ${lot.numero}` : "—") : undefined}
                      titre={i.organisme}
                      second={[NATURES_INTERVENANT[i.nature], i.contact].filter(Boolean).join(" · ")}
                      droite={i.lot_id ? null : <Pilule>Tout le projet</Pilule>}
                    />
                  );
                })}
              </Groupe>
            ) : null,
          )}
        </Liste>
      ) : (
        <Vide>Aucun intervenant.</Vide>
      )}
      {intervenants.map((i) => {
        const lot = lotDe(i.lot_id);
        return (
          <Detail key={i.id} cle={`intervenant:${i.id}`} titre={i.organisme} sous={NATURES_INTERVENANT[i.nature]}>
            <Rangees>
              <Rangee libelle="Rôle">{NATURES_INTERVENANT[i.nature]}</Rangee>
              {i.siren ? <Rangee libelle="SIREN">{i.siren}</Rangee> : null}
              <Rangee libelle="Contact">{i.contact ?? "—"}</Rangee>
              {i.email ? <Rangee libelle="E-mail"><a href={`mailto:${i.email}`}>{i.email}</a></Rangee> : null}
              {i.telephone ? <Rangee libelle="Téléphone"><a href={`tel:${i.telephone.replace(/\s/g, "")}`}>{i.telephone}</a></Rangee> : null}
              <Rangee libelle="Lot">{i.lot_id ? (lot ? `${lot.numero} · ${lot.intitule}` : "—") : "Tout le projet"}</Rangee>
            </Rangees>
          </Detail>
        );
      })}
    </Partie>
  ) : null;
  return (
    <section className="esp-carte" aria-label="Dossier du projet">
      {voir("identite") ? (identiteVolet ?? (
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
      )) : null}
      {voir("equipe") ? (equipeVolet ?? (
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
      )) : null}
      {voir("intervenants") ? (intervenantsVolet ?? (
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
      )) : null}
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
