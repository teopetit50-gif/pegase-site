"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — la fiche d'un intervenant (05/11/2026). Teo : « pourquoi quand on
   clique sur une équipe, tu me renvoies vers l'ancien design ? ». La liste
   des Équipes (Linear, Initiatives) ouvrait la vue Cal.com des passages ;
   elle ouvre désormais cette page, sur la copie 1:1 de la page d'un ticket
   Linear déjà en place dans Daliro (./dal-ticket.css) : propriétés à droite,
   résumé en description, passages et chantiers en sous-tickets, réponses
   reçues en activité. Absences et remplaçants restent dans « Passages et
   absences » (lien dans l'en-tête).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { dateHeure, relatif } from "@/components/espace/format";
import type { Passage, Tableau, Tiers } from "@/components/espace/daliro/types";
import { RACINE } from "../modules";
import { copierEtDire } from "../Toasts";
import { DalCarte } from "./DalCadre";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import { useDaliro } from "./donnees";
import "./dal-inbox.css";
import "./dal-ticket.css";

const BASE = `${RACINE}/daliro`;
type Etat = "fait" | "cours" | "afaire" | "tri" | "annule";
const ICONE: Record<Etat, NomDalIcone> = { fait: "IssueStatusDone", cours: "IssueStatusStarted", afaire: "IssueStatusTodo", tri: "IssueStatusTriage", annule: "StatusCanceled" };
const CONF: Record<string, string> = { confirmee: "confirmé", demandee: "réponse attendue", sans_reponse: "sans réponse", declinee: "décliné", non_demandee: "confirmation pas encore demandée" };
const VIG: Record<string, string> = { a_jour: "Attestation de vigilance à jour", a_renouveler: "Attestation à renouveler", echue: "Attestation échue", absente: "Attestation absente", a_verifier: "Attestation à vérifier", sans_objet: "Vigilance sans objet" };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jour = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

function Statut({ etat }: { etat: Etat }) {
  return (
    <span className="dal-tk-statut" data-etat={etat}>
      <DalIcone nom={ICONE[etat]} taille={14} />
    </span>
  );
}
function Pilule({ icone, etat, children, vide, href }: { icone?: NomDalIcone; etat?: Etat; children: React.ReactNode; vide?: boolean; href?: string }) {
  const c = (
    <>
      {etat ? <Statut etat={etat} /> : icone ? <DalIcone nom={icone} taille={16} /> : null}
      <span>{children}</span>
    </>
  );
  return href ? (
    <Link className="dal-tk-pilule" href={href}>
      {c}
    </Link>
  ) : (
    <span className="dal-tk-pilule" data-vide={vide || undefined}>
      {c}
    </span>
  );
}
function Bloc({ titre, compte, children }: { titre: string; compte: string; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(true);
  return (
    <section className="dal-tk-bloc" aria-label={titre}>
      <div className="dal-tk-bloc-tete">
        <button type="button" className="dal-tk-repli" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" style={{ transform: ouvert ? undefined : "rotate(-90deg)" }}>
            <path d="M1 2.5h6L4 6z" fill="currentColor" />
          </svg>
          <span>{titre}</span>
        </button>
        <span className="dal-tk-bloc-compte">{compte}</span>
      </div>
      {ouvert ? <ul className="dal-tk-rangees">{children}</ul> : null}
    </section>
  );
}

export default function FicheIntervenant({ cle }: { cle: string }) {
  const { liste, tableau } = useDaliro();
  const [auj] = useState(() => iso(new Date()));
  const tableaux = useMemo(() => liste.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t), [liste, tableau]);
  const id = cle.slice(2);
  const estTiers = cle.startsWith("t:");
  const tiers: Tiers | null = estTiers ? (tableaux.flatMap((t) => t.tiers).find((x) => x.id === id) ?? null) : null;
  const ps = useMemo(
    () =>
      tableaux
        .flatMap((t) => t.passages.filter((p) => p.statut !== "annule" && (estTiers ? p.tiers_id === id : p.equipe_id === id)).map((p) => ({ p, t })))
        .sort((a, b) => a.p.debut.localeCompare(b.p.debut)),
    [tableaux, id, estTiers],
  );
  const nom = tiers?.nom ?? ps[0]?.p.intervenant_nom ?? tableaux.flatMap((t) => t.equipes).find((e) => e.id === id)?.nom ?? "Intervenant";
  const aVenir = ps.filter(({ p }) => p.statut === "prevu" && p.fin >= auj);
  const faits = ps.filter(({ p }) => !(p.statut === "prevu" && p.fin >= auj));
  const enCours = aVenir.filter(({ p }) => p.debut <= auj);
  const chantiers = [...new Map(ps.map(({ t }) => [t.chantier.id, t])).values()];
  const souffrance = aVenir.filter(({ p }) => p.confirmation === "declinee" || p.confirmation === "sans_reponse");
  const etat: Etat = enCours.length ? "cours" : aVenir.length ? "afaire" : "fait";
  const corps = tiers?.corps_etat?.[0] ?? (/conducteur/i.test(nom) ? "rendez-vous de chantier" : "équipe de pose");
  const reponses = ps
    .flatMap(({ p, t }) => (p.confirmations ?? []).filter((e) => e.evenement !== "demandee").map((e) => ({ e, p, t })))
    .sort((a, b) => b.e.survenu_le.localeCompare(a.e.survenu_le));
  const etatPassage = (p: Passage): Etat => (p.statut === "fait" || p.fin < auj ? "fait" : p.confirmation === "declinee" || p.confirmation === "sans_reponse" ? "tri" : p.debut <= auj ? "cours" : "afaire");
  const lien = `${BASE}/equipes/${encodeURIComponent(cle)}`;

  const rangee = ({ p, t }: { p: Passage; t: Tableau }) => (
    <li key={p.id}>
      <Link className="dal-tk-rangee" href={`${BASE}/chantiers/${t.chantier.id}?onglet=terrain#planning`}>
        <span className="dal-tk-rangee-icone">
          <Statut etat={etatPassage(p)} />
        </span>
        <span className="dal-tk-rangee-titre">
          {p.tache ?? "Passage"}{" "}
          <span className="dal-tk-gris">
            · {t.chantier.nom}
            {p.lot_code ? ` · lot ${p.lot_code}` : ""}
            {p.heure_debut ? ` · ${p.heure_debut.slice(0, 5)}–${(p.heure_fin ?? "").slice(0, 5)}` : ""} · {CONF[p.confirmation] ?? p.confirmation}
          </span>
        </span>
        <span className="dal-tk-rangee-droite">{p.debut === p.fin ? jour(p.debut) : `${jour(p.debut)} → ${jour(p.fin)}`}</span>
      </Link>
    </li>
  );

  return (
    <DalCarte>
      <div className="dal-tk">
        <header className="dal-tk-tete">
          <nav className="dal-tk-fil" aria-label="Fil d'Ariane">
            <Link href={`${BASE}/equipes`} className="dal-tk-fil-lien">
              Équipes
            </Link>
            <span className="dal-tk-fil-sep" aria-hidden="true">
              ›
            </span>
            <Link href={lien} className="dal-tk-fil-ticket" aria-current="page">
              <h2>{nom}</h2>
            </Link>
          </nav>
          <span className="dal-pousse" />
          <div className="dal-tk-actions">
            {tiers?.telephone ? (
              <a className="dal-tk-action" href={`tel:${tiers.telephone}`}>
                <DalIcone nom="Phone" taille={14} />
                <span>Appeler</span>
              </a>
            ) : null}
            <Link className="dal-tk-action" href={`${BASE}/equipes?vue=passages&intervenant=${encodeURIComponent(cle)}`}>
              <DalIcone nom="Calendar" taille={14} />
              <span>Absences et remplaçants</span>
            </Link>
          </div>
        </header>
        <div className="dal-tk-defile">
          <div className="dal-tk-outils">
            <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier le lien" title="Copier le lien" onClick={() => copierEtDire(`${window.location.origin}${lien}`, "Lien copié.")}>
              <DalIcone nom="LienUrl" />
            </button>
          </div>
          <div className="dal-tk-corps">
            <div className="dal-tk-principal">
              <h1 className="dal-tk-titre">{nom}</h1>
              <div className="dal-tk-replis">
                <Pilule etat={etat}>{etat === "cours" ? "Sur chantier aujourd'hui" : etat === "afaire" ? "Planifié" : "Rien de prévu"}</Pilule>
                <Pilule icone="Project">{`${chantiers.length} chantier${chantiers.length > 1 ? "s" : ""}`}</Pilule>
              </div>
              <div className="dal-tk-description">
                <p>
                  {corps.charAt(0).toUpperCase() + corps.slice(1)}
                  {tiers?.commune ? `, ${tiers.commune}` : ""}. {ps.length} passage{ps.length > 1 ? "s" : ""} sur {chantiers.length} chantier{chantiers.length > 1 ? "s" : ""} : {faits.length} fait{faits.length > 1 ? "s" : ""}, {aVenir.length} à venir
                  {enCours.length ? `, dont ${enCours.length} en cours aujourd'hui` : ""}.
                </p>
                {souffrance.length ? (
                  <p className="dal-tk-attention">
                    {souffrance.length} passage{souffrance.length > 1 ? "s" : ""} à venir sans confirmation ferme : {souffrance.map(({ p, t }) => `${p.tache ?? "passage"} (${t.chantier.nom}, ${jour(p.debut)}, ${CONF[p.confirmation]})`).join(" ; ")}. Des remplaçants sont proposés dans « Absences et remplaçants ».
                  </p>
                ) : aVenir.length ? (
                  <p>Tous ses passages à venir sont confirmés ou leur demande part à J-2.</p>
                ) : null}
              </div>
              <Bloc titre="Passages à venir" compte={`${aVenir.filter(({ p }) => p.confirmation === "confirmee").length}/${aVenir.length}`}>
                {aVenir.length ? aVenir.map(rangee) : <li className="dal-ap-avis">Aucun passage prévu.</li>}
              </Bloc>
              <Bloc titre="Passages faits" compte={String(faits.length)}>
                {faits.length ? [...faits].reverse().map(rangee) : <li className="dal-ap-avis">Aucun passage fait pour l&apos;instant.</li>}
              </Bloc>
              <Bloc titre="Chantiers" compte={String(chantiers.length)}>
                {chantiers.map((t) => (
                  <li key={t.chantier.id}>
                    <Link className="dal-tk-rangee" href={`${BASE}/chantiers/${t.chantier.id}`}>
                      <span className="dal-tk-rangee-icone">
                        <DalIcone nom="Crane" taille={14} />
                      </span>
                      <span className="dal-tk-rangee-titre">
                        {t.chantier.nom} <span className="dal-tk-gris">· {t.chantier.commune}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </Bloc>
              <hr className="dal-tk-filet" />
              <div className="dal-tk-activite-tete">
                <h3>Activité</h3>
              </div>
              <ul className="dal-tk-evenements">
                {reponses.length ? (
                  reponses.slice(0, 12).map(({ e, p, t }) => (
                    <li key={e.id} className="dal-tk-evenement">
                      <DalIcone nom={e.evenement === "confirmee" ? "IssueStatusDone" : "Alert"} taille={14} />
                      <span className="dal-tk-qui">{nom}</span>
                      <span>
                        {e.evenement === "confirmee" ? "a confirmé" : e.evenement === "declinee" ? "a décliné" : "n'a pas répondu pour"} « {p.tache} » ({t.chantier.nom})
                        {typeof e.detail.texte === "string" ? ` : « ${e.detail.texte} »` : ""}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span title={dateHeure(e.survenu_le)}>{relatif(e.survenu_le)}</span>
                    </li>
                  ))
                ) : (
                  <li className="dal-tk-evenement">
                    <DalIcone nom="Updated" taille={14} />
                    <span>Aucune réponse reçue pour l&apos;instant.</span>
                  </li>
                )}
              </ul>
            </div>
            <aside className="dal-tk-proprietes" aria-label="Propriétés de l'intervenant">
              <h3 className="dal-tk-prop-titre">Propriétés</h3>
              <div className="dal-tk-prop-liste">
                <Pilule etat={etat}>{etat === "cours" ? "En cours" : etat === "afaire" ? "Planifié" : "Terminé"}</Pilule>
                <Pilule icone={estTiers ? "Wrench" : "Team"}>{estTiers ? (tiers?.roles.includes("fournisseur") ? "Fournisseur" : "Sous-traitant") : "Nos équipes"}</Pilule>
                {tiers ? <Pilule icone="Shield" vide={!tiers.vigilance || tiers.vigilance === "sans_objet"}>{VIG[tiers.vigilance ?? "sans_objet"] ?? "Vigilance"}</Pilule> : null}
              </div>
              {tiers ? (
                <>
                  <h3 className="dal-tk-prop-titre">Contact</h3>
                  <div className="dal-tk-prop-liste">
                    <Pilule icone="Phone" vide={!tiers.telephone}>{tiers.telephone ?? "Téléphone inconnu"}</Pilule>
                    <Pilule icone="Chat">{`Confirmations par ${tiers.canal === "whatsapp" ? "WhatsApp" : tiers.canal === "sms" ? "SMS" : tiers.canal === "email" ? "courriel" : "téléphone"}`}</Pilule>
                    <Pilule icone="Users" href={`${BASE}/annuaire?entreprise=${encodeURIComponent(tiers.id)}`}>Fiche dans l&apos;annuaire</Pilule>
                  </div>
                </>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
    </DalCarte>
  );
}
