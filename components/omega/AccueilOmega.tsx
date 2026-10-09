"use client";

/* ══════════════════════════════════════════════════════════════════════
   La vue d'ensemble du pilotage (09/10/2026)

   DUPLIQUÉE de components/espace2/Accueil.tsx : même salutation, même
   rangée de quatre chiffres, même grille (courbe + tableau à gauche,
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
import { ArrowRight, CheckCheck, ChevronRight, ClipboardCheck, ListChecks, UserRound, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Chiffre } from "@/components/espace2/vivant";
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
  const [exemple, setExemple] = useState(false);
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

  const heure = new Date(maintenant).getHours();
  const aFaire = c.duJour.length + c.routines.length;
  const kpis = [
    { libelle: "Tâches faites", valeur: `${c.faites.length}`, sous: `sur ${c.taches.length} au plan`, lien: `${R}/taches` },
    { libelle: "En retard", valeur: `${c.retard.length}`, sous: "tâches dont l'échéance est passée", lien: `${R}/point`, alerte: c.retard.length > 0 },
    { libelle: "À valider", valeur: `${c.decisions.length}`, sous: "décisions qui t'attendent", lien: `${R}/validations` },
    { libelle: "Clients signés", valeur: `${c.signes}`, sous: "sur un objectif de 20", lien: `${R}/demandes` },
  ];

  return (
    <div className="v2-page v2-arrivee v2-va v2-vivant">
      <h1 className="v2-sr">Vue d&apos;ensemble</h1>
      <div className="v2-salut">
        <div>
          <p className="v2-salut-titre" suppressHydrationWarning>
            {heure >= 18 ? "Bonsoir" : "Bonjour"} Teo
            <span> — {aFaire ? `${aFaire} chose${aFaire > 1 ? "s" : ""} t'attend${aFaire > 1 ? "ent" : ""} ${heure < 12 ? "ce matin" : "aujourd'hui"}` : "rien d'urgent aujourd'hui"}</span>
          </p>
          <p className="v2-salut-date" suppressHydrationWarning>
            {new Date(maintenant).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      <section className="v2-va-kpis" aria-label="Chiffres clés">
        {kpis.map((k) => (
          <Link key={k.libelle} href={k.lien} className="v2-va-kpi" data-alerte={k.alerte ? "" : undefined}>
            <span className="v2-va-kpi-libelle">{k.libelle}</span>
            <strong data-alerte={k.alerte ? "" : undefined}>
              <Chiffre valeur={k.valeur} />
            </strong>
            <small className="v2-gris v2-va-kpi-sous">{k.sous}</small>
          </Link>
        ))}
      </section>

      <div className="v2-va-grille">
        <div className="v2-va-col">
          <section className="v2-carte v2-carte-corps">
            <div className="v2-va-titre" style={{ marginBottom: 16 }}>
              <div>
                <h2 className="v2-h2">Activité</h2>
                <p className="v2-gris v2-va-sous">Jour par jour, comparé à la période précédente</p>
              </div>
              <span className="om-barres-actions">
                <button type="button" className="v2-val-bouton" data-actif={exemple ? "" : undefined} aria-pressed={exemple} onClick={() => setExemple((x) => !x)}>
                  {exemple ? "Revenir aux vrais chiffres" : "Voir un exemple"}
                </button>
                <Choix classe="v2-va-periode" etiquette="Période" valeur={String(periode)} onChange={(v) => setPeriode(Number(v))} options={[{ cle: "7", libelle: "7 derniers jours" }, { cle: "30", libelle: "30 derniers jours" }, { cle: "90", libelle: "90 derniers jours" }]} />
              </span>
            </div>
            {exemple ? <p className="om-barres-exemple">Exemple : des chiffres inventés pour voir le rendu, rien n&apos;est enregistré.</p> : null}
            <Graphique
              key={exemple ? "exemple" : "vrai"}
              debut={c.debut}
              series={exemple ? c.series.map((x, k) => ({ ...x, valeurs: valeursExemple(periode, k * 5, [1, 3, 0.4, 0.3][k]), avant: valeursExemple(periode, k * 5 + 3, [0.8, 2.6, 0.35, 0.3][k]) })) : c.series}
            />
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
                      <th>État</th>
                      <th aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {c.ouvertes.slice(0, 6).map((l) => {
                      const e = echeance(l.donnees["Échéance"]);
                      return (
                        <tr key={l.id}>
                          <td>{l.donnees["Tâche"]}</td>
                          <td className="v2-gris">{l.donnees["Échéance"] ?? "—"}</td>
                          <td>
                            <span className="v2-etat">{e !== null && e < maintenant ? "En retard" : e !== null && e < maintenant + 7 * JOUR ? "Cette semaine" : "À venir"}</span>
                          </td>
                          <td>
                            <Link href={`${R}/taches`} aria-label={`Ouvrir « ${l.donnees["Tâche"]} »`}>
                              <ChevronRight width={16} height={16} />
                            </Link>
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
                      <small className="v2-gris">{l.tableau === "routines" ? ["Routine", l.donnees["Moment"]].filter(Boolean).join(" · ") : ["Tâche", l.donnees["Catégorie"], l.donnees["Échéance"]].filter(Boolean).join(" · ")}</small>
                    </span>
                    <Link href={l.tableau === "routines" ? `${R}/taches/routines` : `${R}/taches`} aria-label="Ouvrir">
                      <ChevronRight width={16} height={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="v2-carte v2-carte-corps">
            <div className="v2-va-titre">
              <h2 className="v2-h2">Activité récente</h2>
              <Link href={`${R}/taches`} className="v2-va-lien">
                Voir tout
              </Link>
            </div>
            {c.activite.length === 0 ? (
              <p className="v2-gris" style={{ margin: 0 }}>
                Rien pour l&apos;instant.
              </p>
            ) : (
              <ul className="v2-va-liste">
                {c.activite.map((l) => (
                  <li key={l.id}>
                    <span className="v2-va-pastille" aria-hidden="true">
                      {l.tableau === "clients" ? <UserRound width={14} height={14} /> : l.tableau === "moteurs" ? <Wrench width={14} height={14} /> : l.donnees["Statut"] === "Fait" ? <CheckCheck width={14} height={14} /> : <ListChecks width={14} height={14} />}
                    </span>
                    <small className="v2-gris v2-va-heure" suppressHydrationWarning>
                      {heureCourte(l.maj!)}
                    </small>
                    <span className="v2-va-texte">
                      <span>{l.donnees["Tâche"] ?? l.donnees["Client"] ?? l.donnees["Chantier"] ?? l.donnees["Routine"] ?? l.donnees["Entreprise"] ?? "Ligne modifiée"}</span>
                      <small className="v2-gris">{[NOMS[l.tableau] ?? l.tableau, l.donnees["Statut"] ?? l.donnees["Étape"] ?? l.donnees["Statut cette semaine"] ?? l.donnees["Prospection"]].filter(Boolean).join(" · ")}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="v2-carte v2-carte-corps v2-va-ia">
        <div>
          <p className="v2-va-ia-marque">
            <ClipboardCheck width={14} height={14} aria-hidden="true" /> Audit Omega
          </p>
          <h2 className="v2-h2">Lance l&apos;audit d&apos;un prospect pendant le rendez-vous.</h2>
          <p className="v2-gris" style={{ margin: 0 }}>
            Dépose son export de factures : l&apos;argent qui dort, les devis sans réponse et le retard moyen sortent en direct, avec le rapport à son nom.
          </p>
        </div>
        <Link href={`${R}/audit`} className="v2-btn v2-btn--primaire">
          Ouvrir l&apos;audit <ArrowRight width={16} height={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

const NOMS: Record<string, string> = { plan: "Plan", ajouts: "Plan", routines: "Routine", clients: "Prospect", moteurs: "Chantier", entreprises: "Entreprise" };

function heureCourte(iso: string): string {
  const d = new Date(iso);
  const j = new Date();
  const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === j.toDateString()) return h;
  j.setDate(j.getDate() - 1);
  if (d.toDateString() === j.toDateString()) return `Hier ${h}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/* des valeurs de démonstration (bouton « Voir un exemple ») : une montée en
   régime, creux le week-end, toujours les mêmes d'un affichage à l'autre */
function valeursExemple(n: number, graine: number, echelle: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / Math.max(1, n - 1);
    const bruit = (((i + graine) * 7919) % 13) / 13;
    const weekEnd = (i + 2) % 7 >= 5;
    return Math.max(0, Math.round(((1 + t * 4) * (weekEnd ? 0.3 : 1) + (bruit - 0.45) * 2.4) * echelle));
  });
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
