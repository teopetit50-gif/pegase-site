"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — les encaissements sur la page « Reporting » de Plain (28/10/2026)

   Les règlements reçus qui ne soldent pas encore une facture (le même
   tableau que les autres pages : ./donnees.ts, cashd_tableau en base réelle),
   dans les briques de Rapports.tsx : trois cartes-graphiques (à imputer, sans
   compte, règlements reçus) sur la période et la granularité de l'adresse,
   puis la liste à rapprocher, cherchable, filtrée en place (?filtre=). Le
   lettrage se fait toujours dans Trésorerie ; les liens vers la fiche du
   compte et vers « Débiteurs et relances » restent (menu « Actions »).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { dateCourte, montant } from "@/components/espace3/base/format";
import { AvisRapport, CarteRapport, CourbeRapport, Rapport, SectionRapport, TableauRapport, pluriel, serieDatee, useParametresRapport } from "../lin/Rapports";
import { lienCompte, useTableauCashd } from "./donnees";

const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Encaissements() {
  const { tableau, erreur } = useTableauCashd();
  const { periode, pas, filtre, lien } = useParametresRapport();
  const [q, setQ] = useState("");
  const tous = tableau?.a_imputer ?? [];
  const sans = tous.filter((x) => !x.compte_id);
  const total = tous.reduce((s, x) => s + x.a_imputer, 0);
  const recus = tous.reduce((s, x) => s + x.montant, 0);
  const r = sansAccents(q.trim());
  const lignes = [...tous]
    .filter((x) => (filtre === "sans" ? !x.compte_id : filtre === "avec" ? !!x.compte_id : true))
    .filter((x) => !r || [x.compte, x.reference, x.libelle].some((v) => v && sansAccents(v).includes(r)))
    .sort((a, b) => b.recu_le.localeCompare(a.recu_le));
  const FILTRES = [
    { cle: "tous", libelle: "Tous les règlements", valeur: null },
    { cle: "sans", libelle: "Sans compte", valeur: "sans" },
    { cle: "avec", libelle: "Avec un compte", valeur: "avec" },
  ];

  return (
    <Rapport
      titre="Encaissements"
      actions={[
        { cle: "tresorerie", libelle: "Trésorerie (lettrage)", href: "/espace3/cashd/suivi?vue=tresorerie", externe: true },
        { cle: "debiteurs", libelle: "Débiteurs et relances", href: "/espace3/cashd/suivi?vue=debiteurs", externe: true },
      ]}
      filtres={FILTRES.map((f) => ({ cle: f.cle, libelle: f.libelle, coche: (filtre ?? null) === f.valeur, href: lien({ filtre: f.valeur }) }))}
      filtreLibelle={FILTRES.find((f) => f.valeur === filtre && f.valeur)?.libelle}
      avis={
        erreur ? (
          <AvisRapport teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </AvisRapport>
        ) : null
      }
    >
      <SectionRapport titre="Vue d'ensemble" meta={tableau ? (tableau.dernier_import ? `Dernier import le ${dateCourte(tableau.dernier_import)}` : "Aucun import lu pour l'instant") : erreur ? undefined : "Lecture…"}>
        <CarteRapport
          titre="À imputer"
          info="Les règlements reçus qui ne soldent pas encore une facture : un virement sans référence, un paiement partiel, un acompte."
          chiffre={montant(total)}
          legende={pluriel(tous.length, "règlement")}
          etat={tous.length ? "orange" : "vert"}
          etatTitre={tous.length ? "Des règlements attendent leur facture" : "Tout est imputé"}
        >
          <CourbeRapport
            libelle="Montant à imputer par jour de réception"
            serie={serieDatee(
              tous.map((x) => ({ jour: x.recu_le, valeur: x.a_imputer })),
              periode,
              pas,
            )}
          />
        </CarteRapport>
        <CarteRapport
          titre="Sans compte"
          info="Le payeur n'a pas été reconnu : le compte se désigne depuis la fiche, dans Trésorerie."
          chiffre={String(sans.length)}
          legende="payeur à reconnaître"
          etat={sans.length ? "orange" : "vert"}
          etatTitre={sans.length ? "Un payeur à reconnaître" : undefined}
        >
          <CourbeRapport
            libelle="Règlements sans compte, par jour"
            serie={serieDatee(
              sans.map((x) => ({ jour: x.recu_le, valeur: 1 })),
              periode,
              pas,
              "compte",
            )}
            format={(v) => pluriel(Math.round(v), "règlement")}
          />
        </CarteRapport>
        <CarteRapport
          titre="Règlements reçus"
          info="Le montant total des règlements de la liste, imputés ou non ; les crédits clients (avoirs, trop-perçus) sont à part."
          chiffre={montant(recus)}
          legende={tableau ? `${montant(tableau.totaux.credits)} de crédits clients` : ""}
          etat="vert"
        >
          <CourbeRapport
            libelle="Règlements reçus par jour"
            serie={serieDatee(
              tous.map((x) => ({ jour: x.recu_le, valeur: x.montant })),
              periode,
              pas,
            )}
          />
        </CarteRapport>
      </SectionRapport>

      <SectionRapport titre="Règlements à rapprocher" meta={`${pluriel(lignes.length, "règlement")}${filtre ? " dans ce filtre" : ""}`}>
        <CarteRapport
          taille="pleine"
          titre="Liste"
          info="Un règlement enregistré interrompt la séquence de relance avant le prochain envoi ; le lettrage se fait dans la vue Trésorerie."
          chiffre={montant(lignes.reduce((s, x) => s + x.a_imputer, 0))}
          legende="à imputer dans la liste"
          etat={lignes.length ? "orange" : "vert"}
        >
          <div className="rap-gestes" style={{ marginBottom: 12 }}>
            <input
              type="search"
              className="rap-champ"
              style={{ maxWidth: 320 }}
              value={q}
              placeholder="Rechercher un payeur, une référence"
              aria-label="Rechercher un payeur, une référence"
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {!tableau ? (
            <p className="rap-sous" aria-busy="true">
              {erreur ? "" : "Lecture…"}
            </p>
          ) : lignes.length ? (
            <TableauRapport
              libelle="Règlements à rapprocher"
              colonnes={[{ libelle: "Reçu le" }, { libelle: "Payeur" }, { libelle: "Référence" }, { libelle: "Montant", num: true }, { libelle: "Imputé", num: true }, { libelle: "À imputer", num: true }]}
            >
              {lignes.map((x) => (
                <tr key={x.id}>
                  <td>{dateCourte(x.recu_le)}</td>
                  <td>
                    {x.compte_id ? (
                      <Link href={lienCompte(x.compte_id)}>{x.compte ?? "Compte"}</Link>
                    ) : (
                      <span className="rap-pastille" data-teinte="orange">
                        Sans compte
                      </span>
                    )}
                  </td>
                  <td>
                    {x.reference ?? "—"}
                    {x.libelle ? <small>{x.libelle}</small> : null}
                  </td>
                  <td className="rap-num">{montant(x.montant)}</td>
                  <td className="rap-num">{x.impute ? montant(x.impute) : "—"}</td>
                  <td className="rap-num" style={{ fontWeight: 500 }}>
                    {montant(x.a_imputer)}
                  </td>
                </tr>
              ))}
            </TableauRapport>
          ) : (
            <p className="rap-sous">{tous.length ? "Rien dans ce filtre." : "Tout est imputé : chaque règlement reçu solde la facture qu'il vise."}</p>
          )}
        </CarteRapport>
      </SectionRapport>
    </Rapport>
  );
}
