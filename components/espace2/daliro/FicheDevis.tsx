"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — la page d'un devis dicté (05/11/2026)

   Référence validée par Teo : Linear, page d'un ticket (OME-19 : titre et
   montant, description, sous-tickets, activité, propriétés à droite). Même
   copie que la page d'un appel (./dal-ticket.css, recopiée de Tavaro) :
   le vocal transcrit en description, les lignes chiffrées en sous-tickets
   (montant à droite), le total sous les lignes, le journal en activité.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { dateHeure, montant, relatif } from "@/components/espace/format";
import { RACINE } from "../modules";
import { copierEtDire } from "../Toasts";
import { DalMenu } from "./DalCadre";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import { ETATS_DEVIS, TVA_GUADELOUPE, totalHt, type Devis, type EtatDevis } from "./exemplesDevis";
import "./dal-ticket.css";

const BASE = `${RACINE}/daliro`;
type Etat = "tri" | "cours" | "fait" | "afaire";
const ETAT: Record<EtatDevis, Etat> = { a_chiffrer: "tri", a_valider: "afaire", envoye: "cours", signe: "fait" };
const ICONE: Record<Etat, NomDalIcone> = { tri: "IssueStatusTriage", cours: "IssueStatusStarted", fait: "IssueStatusDone", afaire: "IssueStatusTodo" };

function Statut({ etat }: { etat: Etat }) {
  return (
    <span className="dal-tk-statut" data-etat={etat}>
      <DalIcone nom={ICONE[etat]} taille={14} />
    </span>
  );
}
function Pilule({ icone, etat, children, vide }: { icone?: NomDalIcone; etat?: Etat; children: React.ReactNode; vide?: boolean }) {
  return (
    <span className="dal-tk-pilule" data-vide={vide || undefined}>
      {etat ? <Statut etat={etat} /> : icone ? <DalIcone nom={icone} taille={16} /> : null}
      <span>{children}</span>
    </span>
  );
}

export function texteDevis(d: Devis): string {
  const ht = totalHt(d);
  return [
    `${d.numero} — ${d.titre}`,
    `${d.client}, ${d.adresse}`,
    "",
    ...d.lignes.map((l) => `- ${l.designation} : ${l.quantite} ${l.unite} × ${l.prix === null ? "à chiffrer" : montant(l.prix)} = ${l.prix === null ? "à chiffrer" : montant(l.prix * l.quantite)} HT`),
    "",
    `Total HT : ${montant(ht)} · TVA 8,5 % : ${montant(ht * TVA_GUADELOUPE)} · Total TTC : ${montant(ht * (1 + TVA_GUADELOUPE))}`,
  ].join("\n");
}

/* sansLien : le devis tout juste dicté (./DicterDevis) n'a pas encore d'adresse à lui */
export function FicheDevis({ devis: d, volet = false, retour, sansLien = false }: { devis: Devis; volet?: boolean; retour?: { libelle: string; href: string }; sansLien?: boolean }) {
  const [ouvert, setOuvert] = useState(true);
  const ht = totalHt(d);
  const manque = d.lignes.filter((l) => l.prix === null).length;
  const lien = `${BASE}/devis/${d.id}`;
  return (
    <div className="dal-tk" data-volet={volet || undefined}>
      <header className="dal-tk-tete">
        <nav className="dal-tk-fil" aria-label="Fil d'Ariane">
          {retour ? (
            <>
              <Link href={retour.href} className="dal-tk-fil-lien">
                {retour.libelle}
              </Link>
              <span className="dal-tk-fil-sep" aria-hidden="true">
                ›
              </span>
            </>
          ) : null}
          {sansLien ? (
            <span className="dal-tk-fil-ticket">
              <h2>
                <span className="dal-tk-fil-id">{d.numero}</span>
                {d.titre}
              </h2>
            </span>
          ) : (
            <Link href={lien} className="dal-tk-fil-ticket" aria-current={volet ? undefined : "page"}>
              <h2>
                <span className="dal-tk-fil-id">{d.numero}</span>
                {d.titre}
              </h2>
            </Link>
          )}
        </nav>
        <DalMenu
          libelle="Actions sur le devis"
          options={[
            { libelle: "Copier le devis (lignes et total)", icone: "Page", action: () => copierEtDire(texteDevis(d), "Devis copié.") },
            { libelle: "Copier la transcription du vocal", icone: "Mic", action: () => copierEtDire(d.vocal, "Transcription copiée.") },
            "sep",
            { libelle: "Bibliothèque de prix", icone: "Calculator", href: `${BASE}/reglages` },
          ]}
        />
        <span className="dal-pousse" />
        {d.telephone ? (
          <div className="dal-tk-actions">
            <a className="dal-tk-action" href={`tel:${d.telephone.replace(/\s/g, "")}`}>
              <DalIcone nom="Phone" taille={14} />
              <span>Appeler le client</span>
            </a>
          </div>
        ) : null}
      </header>

      <div className="dal-tk-defile">
        <div className="dal-tk-outils">
          {sansLien ? null : (
            <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier le lien du devis" title="Copier le lien du devis" onClick={() => copierEtDire(`${window.location.origin}${lien}`, "Lien copié.")}>
              <DalIcone nom="LienUrl" />
            </button>
          )}
          <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier le devis" title="Copier le devis (lignes et total)" onClick={() => copierEtDire(texteDevis(d), "Devis copié.")}>
            <DalIcone nom="Page" />
          </button>
        </div>
        <div className="dal-tk-corps">
          <div className="dal-tk-principal">
            <h1 className="dal-tk-titre">
              {d.titre} : {montant(ht)} HT
            </h1>
            <div className="dal-tk-replis">
              <Pilule etat={ETAT[d.etat]}>{ETATS_DEVIS[d.etat]}</Pilule>
              <Pilule icone="Users">{d.client}</Pilule>
            </div>

            <div className="dal-tk-description">
              <p>
                <strong>Vocal de {d.dicte_par}</strong> <span className="dal-tk-gris">{d.duree_vocal}</span> — « {d.vocal} »
              </p>
              <p>
                Daliro a reconnu {d.lignes.length} ouvrages et les a chiffrés sur votre bibliothèque de prix
                {manque ? ` ; ${manque} ligne${manque > 1 ? "s attendent" : " attend"} votre prix, rien n'est inventé.` : "."} Total : {montant(ht)} HT, TVA 8,5 % {montant(ht * TVA_GUADELOUPE)}, soit {montant(ht * (1 + TVA_GUADELOUPE))} TTC.
              </p>
              {manque ? <p className="dal-tk-attention">Le devis ne part pas tant qu&apos;une ligne est à chiffrer.</p> : null}
            </div>

            <section className="dal-tk-bloc" aria-label="Lignes du devis">
              <div className="dal-tk-bloc-tete">
                <button type="button" className="dal-tk-repli" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" style={{ transform: ouvert ? undefined : "rotate(-90deg)" }}>
                    <path d="M1 2.5h6L4 6z" fill="currentColor" />
                  </svg>
                  <span>Lignes du devis</span>
                </button>
                <span className="dal-tk-bloc-compte">
                  {d.lignes.length - manque}/{d.lignes.length}
                </span>
              </div>
              {ouvert ? (
                <ul className="dal-tk-rangees">
                  {d.lignes.map((l, i) => (
                    <li key={i}>
                      <div className="dal-tk-rangee dal-tk-rangee--fixe">
                        <span className="dal-tk-rangee-icone">
                          <Statut etat={l.prix === null ? "tri" : "fait"} />
                        </span>
                        <span className="dal-tk-rangee-titre">
                          {l.designation}{" "}
                          <span className="dal-tk-gris">
                            · {l.quantite} {l.unite} × {l.prix === null ? "prix à saisir" : montant(l.prix)} · {l.origine === "bibliotheque" ? "prix de la bibliothèque" : l.origine === "saisi" ? "prix saisi" : "à chiffrer"}
                          </span>
                        </span>
                        <span className="dal-tk-rangee-droite">{l.prix === null ? "—" : montant(l.prix * l.quantite)}</span>
                      </div>
                    </li>
                  ))}
                  <li>
                    <div className="dal-tk-rangee dal-tk-rangee--fixe">
                      <span className="dal-tk-rangee-icone">
                        <DalIcone nom="Calculator" taille={14} />
                      </span>
                      <span className="dal-tk-rangee-titre">
                        Total <span className="dal-tk-gris">· TVA 8,5 % {montant(ht * TVA_GUADELOUPE)} · TTC {montant(ht * (1 + TVA_GUADELOUPE))}</span>
                      </span>
                      <span className="dal-tk-rangee-droite">{montant(ht)} HT</span>
                    </div>
                  </li>
                </ul>
              ) : null}
            </section>

            <hr className="dal-tk-filet" />
            <div className="dal-tk-activite-tete">
              <h3>Activité</h3>
            </div>
            <ul className="dal-tk-evenements">
              {d.journal.map((e, i) => (
                <li key={i} className="dal-tk-evenement">
                  <DalIcone nom={i === 0 ? "Mic" : "Updated"} taille={14} />
                  <span className="dal-tk-qui">{e.qui}</span>
                  <span>{e.quoi}</span>
                  <span aria-hidden="true">·</span>
                  <span title={dateHeure(e.quand)}>{relatif(e.quand)}</span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="dal-tk-proprietes" aria-label="Propriétés du devis">
            <h3 className="dal-tk-prop-titre">Propriétés</h3>
            <div className="dal-tk-prop-liste">
              <Pilule etat={ETAT[d.etat]}>{ETATS_DEVIS[d.etat]}</Pilule>
              <Pilule icone="Euro">{`${montant(ht)} HT · ${montant(ht * (1 + TVA_GUADELOUPE))} TTC`}</Pilule>
              <Pilule icone="Mic">{`Dicté par ${d.dicte_par} · ${d.duree_vocal}`}</Pilule>
              <Pilule icone="Clock">{dateHeure(d.quand)}</Pilule>
            </div>
            <h3 className="dal-tk-prop-titre">Client</h3>
            <div className="dal-tk-prop-liste">
              <Pilule icone="Users">{d.client}</Pilule>
              {d.telephone ? <Pilule icone="Phone">{d.telephone}</Pilule> : null}
              <Pilule icone="Home">{d.adresse}</Pilule>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
