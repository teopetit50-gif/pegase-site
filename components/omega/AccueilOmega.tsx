"use client";

/* ══════════════════════════════════════════════════════════════════════
   La vue d'ensemble du pilotage

   09/10/2026 : dupliquée de /espace2 (courbes, échéances, aujourd'hui,
   activité récente, encart de l'audit).
   11/10/2026 — retour de Teo : « trop surchargé, fais simple comme la
   page Notes ». Il reste, sur le squelette de Notes (simple.css) :
     · la barre : la courbe à suivre (tâches faites, appels, RDV pris,
       vidéos publiées) et la période ;
     · UNE courbe, à la manière des tuiles de PMT (Graphique.tsx) ;
     · « Aujourd'hui » : ce qui est dû et les routines du jour, cochables ;
     · « Cette semaine » : les échéances des sept jours qui viennent.
   Retirés : les quatre courbes à la fois, « Voir un exemple », l'activité
   récente, l'encart de l'audit (le bouton « Audit » est dans la barre du
   haut).
   ══════════════════════════════════════════════════════════════════════ */

import "@/components/espace2/notes.css";
import "./simple.css";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronDown, LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ItemMenu, MenuDeroulant } from "@/components/espace2/ui";
import Graphique from "./Graphique";
import type { Ligne } from "./Tableaux";

const R = "/omega";
const JOUR = 86_400_000;
const I = { width: 14, height: 14, strokeWidth: 1.6, "aria-hidden": true } as const;
const PERIODES = [
  { jours: 7, libelle: "7 derniers jours" },
  { jours: 30, libelle: "30 derniers jours" },
  { jours: 90, libelle: "90 derniers jours" },
];

function echeance(texte: string | undefined): number | null {
  const m = texte?.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const mois = Number(m[2]);
  return new Date(mois >= 10 ? 2026 : 2027, mois - 1, Number(m[1]), 23, 59).getTime();
}
const quand = (t: number | null, maintenant: number) => {
  if (t === null) return "";
  if (t < maintenant) return `En retard de ${Math.max(1, Math.ceil((maintenant - t) / JOUR))} j`;
  const j = Math.floor((t - maintenant) / JOUR);
  if (j === 0) return "Aujourd'hui";
  if (j === 1) return "Demain";
  return new Date(t).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
};

export default function AccueilOmega({ lignes: initiales }: { lignes: Ligne[] }) {
  const [lignes, setLignes] = useState(initiales);
  const [periode, setPeriode] = useState(30);
  const [serie, setSerie] = useState("taches");
  const [maintenant] = useState(() => Date.now());
  /* une ligne cochée ici reste visible, barrée, jusqu'au prochain passage */
  const [cochees, setCochees] = useState<string[]>([]);

  async function cocher(l: Ligne, fait: boolean) {
    const cle = l.tableau === "routines" ? "Statut cette semaine" : "Statut";
    const donnees = { ...l.donnees, [cle]: fait ? "Fait" : "À faire" };
    const maj = new Date().toISOString();
    setCochees((x) => (fait ? [...x, l.id] : x.filter((y) => y !== l.id)));
    setLignes((ls) => ls.map((x) => (x.id === l.id ? { ...x, donnees, maj } : x)));
    await createClient().from("omega_lignes").update({ donnees, maj }).eq("id", l.id);
  }

  const c = useMemo(() => {
    const taches = lignes.filter((l) => l.tableau === "plan" || l.tableau === "ajouts");
    const ouvertes = taches.filter((l) => l.donnees["Statut"] !== "Fait" || cochees.includes(l.id)).sort((a, b) => (echeance(a.donnees["Échéance"]) ?? 9e15) - (echeance(b.donnees["Échéance"]) ?? 9e15));
    const duJour = ouvertes.filter((l) => (echeance(l.donnees["Échéance"]) ?? Infinity) < maintenant + JOUR);
    const semaine = ouvertes.filter((l) => {
      const e = echeance(l.donnees["Échéance"]) ?? Infinity;
      return e >= maintenant + JOUR && e < maintenant + 7 * JOUR;
    });
    const routines = lignes.filter((l) => l.tableau === "routines" && /jour/i.test(l.donnees["Fréquence"] ?? "") && (l.donnees["Statut cette semaine"] !== "Fait" || cochees.includes(l.id)));
    /* la courbe : une série jour par jour sur la période, et la période d'avant pour l'écart */
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
      { cle: "taches", libelle: "Tâches faites", ...compter(taches.filter((l) => l.donnees["Statut"] === "Fait").map((l) => (l.maj ? new Date(l.maj).getTime() : NaN))) },
      { cle: "appels", libelle: "Appels", ...compter(appels.map((l) => lireDate(l.donnees["Date"]))) },
      { cle: "rdv", libelle: "RDV pris", ...compter(appels.filter((l) => l.donnees["Issue"] === "RDV pris").map((l) => lireDate(l.donnees["Date"]))) },
      { cle: "videos", libelle: "Vidéos publiées", ...compter(lignes.filter((l) => l.tableau === "videos" && l.donnees["Statut"] === "Publiée").map((l) => lireDate(l.donnees["Sortie"]))) },
    ];
    return { duJour, semaine, routines, series, debut };
  }, [lignes, periode, maintenant, cochees]);

  const courante = c.series.find((s) => s.cle === serie) ?? c.series[0];
  const aujourdhui = [...c.duJour, ...c.routines];
  const reste = aujourdhui.filter((l) => !cochees.includes(l.id)).length;

  return (
    <div className="no-page si-page v2-arrivee">
      <h1 className="v2-sr">Vue d&apos;ensemble</h1>

      <div className="no-barre">
        <div className="no-barre-droite">
          <MenuDeroulant
            etiquette="Courbe à suivre"
            classe="no-bouton"
            placement="bottom start"
            largeur={220}
            declencheur={
              <>
                <LineChart {...I} />
                {courante.libelle}
                <ChevronDown {...I} />
              </>
            }
          >
            {c.series.map((s) => (
              <ItemMenu key={s.cle} id={s.cle} textValue={s.libelle} onAction={() => setSerie(s.cle)} suffixe={s.cle === courante.cle ? <Check {...I} /> : null}>
                {s.libelle}
              </ItemMenu>
            ))}
          </MenuDeroulant>
          <MenuDeroulant
            etiquette="Période"
            classe="no-bouton"
            placement="bottom start"
            largeur={220}
            declencheur={
              <>
                <CalendarDays {...I} />
                {PERIODES.find((p) => p.jours === periode)?.libelle}
                <ChevronDown {...I} />
              </>
            }
          >
            {PERIODES.map((p) => (
              <ItemMenu key={p.jours} id={String(p.jours)} textValue={p.libelle} onAction={() => setPeriode(p.jours)} suffixe={p.jours === periode ? <Check {...I} /> : null}>
                {p.libelle}
              </ItemMenu>
            ))}
          </MenuDeroulant>
        </div>
      </div>

      <section className="si-section si-courbe" aria-label={courante.libelle}>
        <Graphique key={`${courante.cle}-${periode}`} debut={c.debut} series={[courante]} />
      </section>

      <div className="si-deux">
        <section className="si-section" aria-label="Aujourd'hui">
          <div className="si-tete">
            <h2>Aujourd&apos;hui</h2>
            <span className="no-compte">{reste}</span>
            <Link href={`${R}/point`} className="si-lien">
              Point du matin <ArrowRight {...I} />
            </Link>
          </div>
          {aujourdhui.length ? (
            <ul className="si-liste">
              {aujourdhui.slice(0, 8).map((l) => {
                const routine = l.tableau === "routines";
                const coche = cochees.includes(l.id);
                const titre = l.donnees["Tâche"] ?? l.donnees["Routine"];
                return (
                  <li key={l.id} className="si-ligne" data-fait={coche ? "" : undefined}>
                    <button type="button" role="checkbox" aria-checked={coche} aria-label={`${titre} : fait`} className="si-case" onClick={() => cocher(l, !coche)}>
                      <Check width={11} height={11} strokeWidth={3} aria-hidden="true" />
                    </button>
                    <Link href={routine ? `${R}/taches/routines` : `${R}/taches`} className="si-texte">
                      <strong>{titre}</strong>
                      <span>{routine ? "Routine" : l.donnees["Catégorie"]}</span>
                    </Link>
                    <span className="si-meta">{routine ? l.donnees["Moment"] : quand(echeance(l.donnees["Échéance"]), maintenant)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="si-vide">Rien d&apos;urgent aujourd&apos;hui.</p>
          )}
        </section>

        <section className="si-section" aria-label="Cette semaine">
          <div className="si-tete">
            <h2>Cette semaine</h2>
            <span className="no-compte">{c.semaine.length}</span>
            <Link href={`${R}/taches`} className="si-lien">
              Le plan <ArrowRight {...I} />
            </Link>
          </div>
          {c.semaine.length ? (
            <ul className="si-liste">
              {c.semaine.slice(0, 8).map((l) => (
                <li key={l.id} className="si-ligne">
                  <Link href={`${R}/taches`} className="si-texte">
                    <strong>{l.donnees["Tâche"]}</strong>
                    <span>{l.donnees["Catégorie"]}</span>
                  </Link>
                  <span className="si-meta">{quand(echeance(l.donnees["Échéance"]), maintenant)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="si-vide">Rien d&apos;autre cette semaine.</p>
          )}
        </section>
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
