"use client";

/* ══════════════════════════════════════════════════════════════════════
   La vue d'ensemble du pilotage (09/10/2026)

   DUPLIQUÉE de components/espace2/Accueil.tsx, sans la salutation ni la
   rangée de quatre chiffres (retirées le 11/10/2026 : Attio n'en a pas) ;
   11/10/2026 (2) — allégée encore, même dessin : plus de « Voir un
   exemple » ni de sous-titre sous « Activité » ; les échéances sans la
   colonne « État » ni la flèche ; « Aujourd'hui » sur une ligne (le
   titre, l'échéance ou le moment à droite).
   11/10/2026 — allégée à la demande de Teo, même dessin : plus
   d'« Activité récente » ni d'encart de l'audit (le bouton « Audit » est
   dans la barre du haut).
   Même grille (courbe + tableau à gauche,
   « Aujourd'hui » + « Activité récente » à droite), même carte du bas.
   Le contenu vient du tableau opérationnel (omega_lignes) :
     · le graphique (Graphique.tsx) = tâches, appels, RDV, vidéos par jour ;
     · le tableau = les prochaines échéances ;
     · « Aujourd'hui » = ce qui est dû, cochable ;
     · l'activité = les dernières lignes modifiées.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Choix from "./Choix";
import Graphique from "./Graphique";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Ligne } from "./Tableaux";
import "@/components/espace2/habillage.css";

const R = "/omega";
const JOUR = 86_400_000;
const FINIS = ["Signé", "Installé", "En rodage", "En réel", "Bilan J30 fait", "SaaS métier en route", "2e offre proposée", "Engagement annuel"];

function echeance(texte: string | undefined): number | null {
  const m = texte?.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const mois = Number(m[2]);
  return new Date(mois >= 10 ? 2026 : 2027, mois - 1, Number(m[1]), 23, 59).getTime();
}

export default function AccueilOmega({ lignes: initiales }: { lignes: Ligne[] }) {
  const [lignes, setLignes] = useState(initiales);
  const [periode, setPeriode] = useState(30);
  const [maintenant] = useState(() => Date.now());

  async function faire(l: Ligne) {
    const cle = l.tableau === "routines" ? "Statut cette semaine" : "Statut";
    const donnees = { ...l.donnees, [cle]: "Fait" };
    const maj = new Date().toISOString();
    setLignes((ls) => ls.map((x) => (x.id === l.id ? { ...x, donnees, maj } : x)));
    await createClient().from("omega_lignes").update({ donnees, maj }).eq("id", l.id);
  }

  const c = useMemo(() => {
    const taches = lignes.filter((l) => l.tableau === "plan" || l.tableau === "ajouts");
    const ouvertes = taches.filter((l) => l.donnees["Statut"] !== "Fait").sort((a, b) => (echeance(a.donnees["Échéance"]) ?? 9e15) - (echeance(b.donnees["Échéance"]) ?? 9e15));
    const faites = taches.filter((l) => l.donnees["Statut"] === "Fait");
    const retard = ouvertes.filter((l) => (echeance(l.donnees["Échéance"]) ?? Infinity) < maintenant);
    const duJour = ouvertes.filter((l) => (echeance(l.donnees["Échéance"]) ?? Infinity) < maintenant + JOUR);
    const routines = lignes.filter((l) => l.tableau === "routines" && /jour/i.test(l.donnees["Fréquence"] ?? "") && l.donnees["Statut cette semaine"] !== "Fait");
    const decisions = ouvertes.filter((l) => ["Fondations", "Pilotage"].includes(l.donnees["Catégorie"]));
    const signes = lignes.filter((l) => l.tableau === "clients" && FINIS.includes(l.donnees["Étape"])).length;
    /* le graphique : quatre séries jour par jour sur la période, et la période d'avant pour l'écart */
    const debut = new Date(maintenant - (periode - 1) * JOUR).setHours(0, 0, 0, 0);
    const compter = (dates: number[]) => {
      const valeurs = Array.from({ length: periode }, () => 0);
      const avant = Array.from({ length: periode }, () => 0);
      for (const t of dates) {
        const i = Math.floor((t - debut) / JOUR);
        if (i >= 0 && i < periode) valeurs[i]++;
        else if (i < 0 && i >= -periode) avant[i + periode]++;
      }
      return { valeurs, avant };
    };
    const appels = lignes.filter((l) => l.tableau === "appels");
    const series = [
      { cle: "taches", libelle: "Tâches faites", ...compter(faites.map((l) => (l.maj ? new Date(l.maj).getTime() : NaN))) },
      { cle: "appels", libelle: "Appels", ...compter(appels.map((l) => lireDate(l.donnees["Date"]))) },
      { cle: "rdv", libelle: "RDV pris", ...compter(appels.filter((l) => l.donnees["Issue"] === "RDV pris").map((l) => lireDate(l.donnees["Date"]))) },
      { cle: "videos", libelle: "Vidéos publiées", ...compter(lignes.filter((l) => l.tableau === "videos" && l.donnees["Statut"] === "Publiée").map((l) => lireDate(l.donnees["Sortie"]))) },
    ];
    const activite = [...lignes]
      .filter((l) => l.maj)
      .sort((a, b) => (b.maj ?? "").localeCompare(a.maj ?? ""))
      .slice(0, 6);
    return { taches, ouvertes, faites, retard, duJour, routines, decisions, signes, series, debut, activite };
  }, [lignes, periode, maintenant]);

  const aFaire = c.duJour.length + c.routines.length;
  return (
    <div className="v2-page v2-arrivee v2-va v2-vivant om-va-simple">
      <h1 className="v2-sr">Vue d&apos;ensemble</h1>
      <div className="v2-va-grille">
        <div className="v2-va-col">
          <section className="v2-carte v2-carte-corps">
            <div className="v2-va-titre" style={{ marginBottom: 16 }}>
              <h2 className="v2-h2">Activité</h2>
              <span className="om-barres-actions">
                <Choix classe="v2-va-periode" etiquette="Période" valeur={String(periode)} onChange={(v) => setPeriode(Number(v))} options={[{ cle: "7", libelle: "7 derniers jours" }, { cle: "30", libelle: "30 derniers jours" }, { cle: "90", libelle: "90 derniers jours" }]} />
              </span>
            </div>
            <Graphique debut={c.debut} series={c.series} />
          </section>

          <section className="v2-carte v2-carte-corps">
            <div className="v2-va-titre">
              <h2 className="v2-h2">Prochaines échéances</h2>
              <Link href={`${R}/taches`} className="v2-va-lien">
                Voir tout <ArrowRight width={14} height={14} />
              </Link>
            </div>
            {c.ouvertes.length === 0 ? (
              <p className="v2-gris" style={{ margin: 0 }}>
                Tout le plan est fait.
              </p>
            ) : (
              <div className="v2-tableau-cadre">
                <table className="v2-va-table">
                  <thead>
                    <tr>
                      <th>Tâche</th>
                      <th>Échéance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.ouvertes.slice(0, 6).map((l) => {
                      const e = echeance(l.donnees["Échéance"]);
                      return (
                        <tr key={l.id}>
                          <td>{l.donnees["Tâche"]}</td>
                          <td className="v2-gris" data-retard={e !== null && e < maintenant ? "" : undefined}>
                            {l.donnees["Échéance"] ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="v2-va-col">
          <section className="v2-carte v2-carte-corps">
            <div className="v2-va-titre">
              <h2 className="v2-h2">Aujourd&apos;hui</h2>
              <span className="v2-gris">{aFaire} à faire</span>
            </div>
            {aFaire === 0 ? (
              <p className="v2-gris" style={{ margin: 0 }}>
                Rien d&apos;urgent aujourd&apos;hui.{" "}
                <Link href={`${R}/taches?ajouter=plan`} className="v2-va-lien">
                  Ajouter une tâche
                </Link>
              </p>
            ) : (
              <ul className="v2-va-liste">
                {[...c.duJour, ...c.routines].slice(0, 7).map((l) => (
                  <li key={l.id}>
                    <input type="checkbox" aria-label={`Marquer « ${l.donnees["Tâche"] ?? l.donnees["Routine"]} » comme fait`} onChange={() => faire(l)} />
                    <span className="v2-va-texte">
                      <span>{l.donnees["Tâche"] ?? l.donnees["Routine"]}</span>
                    </span>
                    <span className="om-pm-meta">{l.tableau === "routines" ? l.donnees["Moment"] : l.donnees["Échéance"]}</span>
                    <Link href={l.tableau === "routines" ? `${R}/taches/routines` : `${R}/taches`} aria-label="Ouvrir">
                      <ChevronRight width={16} height={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      </div>

    </div>
  );
}

/* les dates saisies à la main : « 14/10 », « 14/10/2026 », « 2026-10-14… » */
function lireDate(v: string | undefined): number {
  if (!v) return NaN;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v).getTime();
  const m = v.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return NaN;
  const an = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : 2026;
  return new Date(an, Number(m[2]) - 1, Number(m[1])).getTime();
}
