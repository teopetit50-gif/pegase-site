"use client";

/* ══════════════════════════════════════════════════════════════════════
   « À valider » et « Point du matin » du pilotage (09/10/2026)

   Les deux écrans de /espace2 à la même place, avec les listes de la vue
   d'ensemble (v2-va-liste) : une case = une tâche du tableau
   opérationnel, cochée → « Fait » en base.
     · À valider : les décisions qui n'attendent que Teo (fondations,
       pilotage) et les chantiers qui bloquent un client ;
     · Point du matin : ce qui est en retard, la semaine, les routines du
       jour, les prospects à relancer.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Repeat, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Ligne } from "./Tableaux";
import "@/components/espace2/habillage.css";

function echeance(texte: string | undefined): number | null {
  const m = texte?.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const mois = Number(m[2]);
  return new Date(mois >= 10 ? 2026 : 2027, mois - 1, Number(m[1]), 23, 59).getTime();
}

const FINIS = ["Signé", "Installé", "En rodage", "En réel", "Bilan J30 fait", "SaaS métier en route", "2e offre proposée", "Engagement annuel", "Perdu"];

export default function Journee({ mode, lignes: initiales }: { mode: "validations" | "point"; lignes: Ligne[] }) {
  const [lignes, setLignes] = useState(initiales);
  const [maintenant] = useState(() => Date.now());
  const [etat, setEtat] = useState("");

  async function marquer(l: Ligne, cle: string, valeur: string) {
    const donnees = { ...l.donnees, [cle]: valeur };
    setLignes((ls) => ls.map((x) => (x.id === l.id ? { ...x, donnees } : x)));
    const { error } = await createClient().from("omega_lignes").update({ donnees, maj: new Date().toISOString() }).eq("id", l.id);
    setEtat(error ? "Échec de l'enregistrement : vérifiez votre connexion." : "Enregistré");
  }

  const taches = lignes.filter((l) => (l.tableau === "plan" || l.tableau === "ajouts") && l.donnees["Statut"] !== "Fait").sort((a, b) => (echeance(a.donnees["Échéance"]) ?? 9e15) - (echeance(b.donnees["Échéance"]) ?? 9e15));

  if (mode === "validations") {
    const decisions = taches.filter((l) => ["Fondations", "Pilotage"].includes(l.donnees["Catégorie"]));
    const bloquants = lignes.filter((l) => l.tableau === "moteurs" && l.donnees["Statut"] !== "Fait").slice(0, 4);
    return (
      <div className="v2-va om-journee">
        <p className="om-etat" role="status">{etat}</p>
        <div className="v2-va-grille">
          <div className="v2-va-col">
            <section className="v2-carte v2-carte-corps">
              <div className="v2-va-titre">
                <h2 className="v2-h2">Tes décisions</h2>
                <span className="v2-gris">{decisions.length} en attente</span>
              </div>
              <Liste lignes={decisions} cle="Statut" maintenant={maintenant} cocher={(l) => marquer(l, "Statut", "Fait")} lien="/omega/taches" vide="Aucune décision en attente." />
            </section>
          </div>
          <div className="v2-va-col">
            <section className="v2-carte v2-carte-corps">
              <div className="v2-va-titre">
                <h2 className="v2-h2">Ce qui bloque un client</h2>
                <Link href="/omega/automatisations" className="v2-va-lien">
                  Voir les chantiers
                </Link>
              </div>
              <ul className="v2-va-liste">
                {bloquants.map((l) => (
                  <li key={l.id}>
                    <input type="checkbox" aria-label={`Marquer « ${l.donnees["Chantier"]} » comme fait`} onChange={() => marquer(l, "Statut", "Fait")} />
                    <span className="v2-va-texte">
                      <span>{l.donnees["Chantier"]}</span>
                      <small className="v2-gris">{[l.donnees["Pourquoi"], l.donnees["Échéance"]].filter(Boolean).join(" · ")}</small>
                    </span>
                    <Link href="/omega/automatisations" aria-label="Ouvrir les chantiers">
                      <ChevronRight width={16} height={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const retard = taches.filter((l) => (echeance(l.donnees["Échéance"]) ?? Infinity) < maintenant);
  const semaine = taches.filter((l) => {
    const e = echeance(l.donnees["Échéance"]) ?? Infinity;
    return e >= maintenant && e < maintenant + 7 * 864e5;
  });
  const routines = lignes.filter((l) => l.tableau === "routines" && /jour/i.test(l.donnees["Fréquence"] ?? ""));
  const relances = lignes.filter((l) => l.tableau === "clients" && l.donnees["Client"] && !FINIS.includes(l.donnees["Étape"]));

  return (
    <div className="v2-va om-journee">
      <div className="v2-salut">
        <div>
          <p className="v2-salut-titre" suppressHydrationWarning>
            {new Date().getHours() >= 18 ? "Bonsoir" : "Bonjour"} Teo
            <span> — {retard.length + semaine.length ? `${retard.length + semaine.length} tâche${retard.length + semaine.length > 1 ? "s" : ""} cette semaine` : "rien d'urgent"}</span>
          </p>
          <p className="v2-salut-date" suppressHydrationWarning>
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>
      <p className="om-etat" role="status">{etat}</p>
      <div className="v2-va-grille">
        <div className="v2-va-col">
          <section className="v2-carte v2-carte-corps">
            <div className="v2-va-titre">
              <h2 className="v2-h2">En retard</h2>
              <span className="v2-gris">{retard.length}</span>
            </div>
            <Liste lignes={retard} cle="Statut" maintenant={maintenant} cocher={(l) => marquer(l, "Statut", "Fait")} lien="/omega/taches" vide="Rien en retard." />
          </section>
          <section className="v2-carte v2-carte-corps">
            <div className="v2-va-titre">
              <h2 className="v2-h2">Cette semaine</h2>
              <span className="v2-gris">{semaine.length}</span>
            </div>
            <Liste lignes={semaine} cle="Statut" maintenant={maintenant} cocher={(l) => marquer(l, "Statut", "Fait")} lien="/omega/taches" vide="Rien de prévu cette semaine." />
          </section>
        </div>
        <div className="v2-va-col">
          <section className="v2-carte v2-carte-corps">
            <div className="v2-va-titre">
              <h2 className="v2-h2">Routines du jour</h2>
              <Link href="/omega/taches/routines" className="v2-va-lien">
                Toutes les routines
              </Link>
            </div>
            <ul className="v2-va-liste">
              {routines.map((l) => (
                <li key={l.id}>
                  <input type="checkbox" checked={l.donnees["Statut cette semaine"] === "Fait"} aria-label={`Marquer « ${l.donnees["Routine"]} » comme faite`} onChange={(e) => marquer(l, "Statut cette semaine", e.target.checked ? "Fait" : "À faire")} />
                  <span className="v2-va-texte">
                    <span>{l.donnees["Routine"]}</span>
                    <small className="v2-gris">{l.donnees["Moment"]}</small>
                  </span>
                  <span className="v2-va-pastille" aria-hidden="true">
                    <Repeat width={14} height={14} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="v2-carte v2-carte-corps">
            <div className="v2-va-titre">
              <h2 className="v2-h2">Prospects à relancer</h2>
              <Link href="/omega/demandes" className="v2-va-lien">
                Tout le suivi
              </Link>
            </div>
            {relances.length ? (
              <ul className="v2-va-liste">
                {relances.map((l) => (
                  <li key={l.id}>
                    <span className="v2-va-pastille" aria-hidden="true">
                      <UserRound width={14} height={14} />
                    </span>
                    <span className="v2-va-texte">
                      <span>{l.donnees["Client"]}</span>
                      <small className="v2-gris">{[l.donnees["Étape"], l.donnees["Prochaine action"], l.donnees["Date"]].filter(Boolean).join(" · ")}</small>
                    </span>
                    <Link href="/omega/demandes" aria-label={`Ouvrir ${l.donnees["Client"]}`}>
                      <ChevronRight width={16} height={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v2-gris" style={{ margin: 0 }}>
                Aucun prospect en cours.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Liste({ lignes, maintenant, cocher, lien, vide }: { lignes: Ligne[]; cle: string; maintenant: number; cocher: (l: Ligne) => void; lien: string; vide: string }) {
  if (!lignes.length)
    return (
      <p className="v2-gris" style={{ margin: 0 }}>
        {vide}
      </p>
    );
  return (
    <ul className="v2-va-liste">
      {lignes.map((l) => {
        const e = echeance(l.donnees["Échéance"]);
        return (
          <li key={l.id}>
            <input type="checkbox" aria-label={`Marquer « ${l.donnees["Tâche"]} » comme faite`} onChange={() => cocher(l)} />
            <span className="v2-va-texte">
              <span>{l.donnees["Tâche"]}</span>
              <small className="v2-gris" data-retard={e !== null && e < maintenant ? "" : undefined}>
                {[l.donnees["Catégorie"], l.donnees["Échéance"] ? `échéance ${l.donnees["Échéance"]}` : null].filter(Boolean).join(" · ")}
              </small>
            </span>
            <Link href={lien} aria-label="Ouvrir les tâches">
              <ChevronRight width={16} height={16} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
