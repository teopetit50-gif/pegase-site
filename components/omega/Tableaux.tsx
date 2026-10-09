"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le tableau opérationnel du pilotage (09/10/2026)

   Cinq tableaux, une ligne = un enregistrement de omega_lignes (colonne
   `donnees`, un objet clé → valeur dont les clés sont les en-têtes des
   colonnes). Chaque cellule se modifie sur place et s'enregistre en
   quittant le champ ; les statuts se choisissent dans une liste et
   s'enregistrent au choix. En tête, trois cartes : l'avancement du plan,
   les clients, les chantiers des moteurs.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Ligne = { id: string; tableau: string; ordre: number; donnees: Record<string, string> };

const STATUTS = ["À faire", "En cours", "Fait", "Bloqué"];
const ETAPES = ["À contacter", "Audit réservé", "Audit tenu", "Récap envoyé", "Signé", "Installé", "En rodage", "En réel", "Bilan J30 fait", "SaaS métier en route", "2e offre proposée", "Engagement annuel", "Perdu"];

type Colonne = { cle: string; choix?: string[]; large?: boolean; etroite?: boolean };
type Def = { cle: string; titre: string; intro: string; colonnes: Colonne[] };

const PLAN: Colonne[] = [{ cle: "N°", etroite: true }, { cle: "Tâche", large: true }, { cle: "Semaine", etroite: true }, { cle: "Échéance", etroite: true }, { cle: "Catégorie" }, { cle: "Statut", choix: STATUTS }];

export const TABLEAUX: Def[] = [
  { cle: "plan", titre: "Le plan sur 90 jours", intro: "Dans l'ordre, du 9 octobre au 10 janvier. Objectifs : 5 clients pilotes au mois 1, 12 au mois 2, 20 au mois 3.", colonnes: PLAN },
  { cle: "ajouts", titre: "Ajouts du 9 octobre (Léo Grindas et Hormozi)", intro: "Ce qui manquait au plan : le système de test des vidéos, l'enregistrement des appels, le suivi du coût d'un client.", colonnes: PLAN },
  { cle: "routines", titre: "Les routines", intro: "Remets les statuts à « À faire » chaque lundi matin avec le bouton du tableau.", colonnes: [{ cle: "Routine", large: true }, { cle: "Fréquence" }, { cle: "Moment" }, { cle: "Statut cette semaine", choix: STATUTS }] },
  { cle: "clients", titre: "Le suivi clients", intro: "Une ligne par prospect ou client, de l'audit jusqu'à J90. Ajoute une ligne à chaque nouveau prospect.", colonnes: [{ cle: "Client" }, { cle: "Métier" }, { cle: "Offre visée" }, { cle: "Étape", choix: ETAPES }, { cle: "Prochaine action", large: true }, { cle: "Date", etroite: true }, { cle: "Encours relevé (€)", etroite: true }, { cle: "Étude de cas", etroite: true }] },
  { cle: "moteurs", titre: "Développement des moteurs", intro: "En parallèle de la vente, sans dépasser 20 % du temps : on ne touche au produit que pour débloquer un client ou améliorer la conversion.", colonnes: [{ cle: "N°", etroite: true }, { cle: "Chantier", large: true }, { cle: "Pourquoi", large: true }, { cle: "Échéance", etroite: true }, { cle: "Statut", choix: STATUTS }] },
];

const teinteStatut = (v: string | undefined) => (v === "Fait" || v === "Signé" || v === "En réel" || v === "Engagement annuel" ? "vert" : v === "En cours" || v === "Audit réservé" || v === "Audit tenu" || v === "Récap envoyé" || v === "Installé" || v === "En rodage" ? "bleu" : v === "Bloqué" || v === "Perdu" ? "rouge" : "gris");

export default function Tableaux({ lignes: initiales }: { lignes: Ligne[] }) {
  const [lignes, setLignes] = useState(initiales);
  const [masquerFaits, setMasquerFaits] = useState(false);
  const [etat, setEtat] = useState("");
  const de = (t: string) => lignes.filter((l) => l.tableau === t).sort((a, b) => a.ordre - b.ordre);

  async function maj(id: string, cle: string, valeur: string) {
    const avant = lignes.find((l) => l.id === id);
    if (!avant || (avant.donnees[cle] ?? "") === valeur) return;
    const donnees = { ...avant.donnees, [cle]: valeur };
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, donnees } : l)));
    const { error } = await createClient().from("omega_lignes").update({ donnees, maj: new Date().toISOString() }).eq("id", id);
    setEtat(error ? "Échec de l'enregistrement : vérifiez votre connexion." : "Enregistré");
  }

  async function ajouter(tableau: string, colonnes: Colonne[]) {
    const ordre = Math.max(0, ...de(tableau).map((l) => l.ordre)) + 1;
    const donnees = Object.fromEntries(colonnes.filter((c) => c.choix).map((c) => [c.cle, c.choix![0]]));
    const { data, error } = await createClient().from("omega_lignes").insert({ tableau, ordre, donnees }).select("id, tableau, ordre, donnees").single();
    if (error || !data) return setEtat("Échec de l'ajout : vérifiez votre connexion.");
    setLignes((ls) => [...ls, data as Ligne]);
    setEtat("Ligne ajoutée");
  }

  /* « Nouveau… » de la barre du haut : /omega?ajouter=clients ajoute une ligne au tableau visé */
  const params = useSearchParams();
  const demande = params.get("ajouter");
  useEffect(() => {
    const t = TABLEAUX.find((x) => x.cle === demande);
    if (!t) return;
    window.history.replaceState(null, "", `${window.location.pathname}#${t.cle}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'ajout vient d'un lien externe à l'écran (« Nouveau… »), une seule fois
    void ajouter(t.cle, t.colonnes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois par demande
  }, [demande]);

  async function supprimer(id: string) {
    if (!window.confirm("Supprimer cette ligne ?")) return;
    const { error } = await createClient().from("omega_lignes").delete().eq("id", id);
    if (error) return setEtat("Échec de la suppression.");
    setLignes((ls) => ls.filter((l) => l.id !== id));
    setEtat("Ligne supprimée");
  }

  async function remettreRoutines() {
    const cible = de("routines").filter((l) => l.donnees["Statut cette semaine"] !== "À faire");
    for (const l of cible) await maj(l.id, "Statut cette semaine", "À faire");
    setEtat("Routines remises à « À faire »");
  }

  const plan = [...de("plan"), ...de("ajouts")];
  const faits = plan.filter((l) => l.donnees["Statut"] === "Fait").length;
  const clients = de("clients");
  const signes = clients.filter((l) => ["Signé", "Installé", "En rodage", "En réel", "Bilan J30 fait", "SaaS métier en route", "2e offre proposée", "Engagement annuel"].includes(l.donnees["Étape"])).length;
  const actifs = clients.filter((l) => l.donnees["Étape"] !== "Perdu" && l.donnees["Client"]).length;
  const moteurs = de("moteurs");
  const moteursFaits = moteurs.filter((l) => l.donnees["Statut"] === "Fait").length;
  const prochaine = plan.find((l) => l.donnees["Statut"] !== "Fait");

  return (
    <div className="om-tableaux">
      <div className="om-cartes">
        <Carte titre="Plan sur 90 jours" valeur={faits} total={plan.length} unite="tâches faites" pied={prochaine ? `Prochaine : ${prochaine.donnees["Tâche"] ?? ""}` : "Tout est fait"} ancre="#plan" />
        <Carte titre="Clients" valeur={signes} total={20} unite="signés sur l'objectif" pied={`${actifs} prospects ou clients suivis`} ancre="#clients" />
        <Carte titre="Moteurs" valeur={moteursFaits} total={moteurs.length} unite="chantiers faits" pied={`${moteurs.filter((l) => l.donnees["Statut"] === "En cours").length} en cours`} ancre="#moteurs" />
      </div>
      <p className="om-etat" role="status">
        {etat}
      </p>
      {TABLEAUX.map((t) => {
        const ls = de(t.cle).filter((l) => !(masquerFaits && (t.cle === "plan" || t.cle === "ajouts") && l.donnees["Statut"] === "Fait"));
        return (
          <section key={t.cle} id={t.cle} className="v2-carte om-section">
            <div className="om-tete-tableau">
              <div>
                <h2>{t.titre}</h2>
                <p className="v2-gris">{t.intro}</p>
              </div>
              <div className="om-actions">
                {t.cle === "plan" ? (
                  <label className="om-bascule">
                    <input type="checkbox" checked={masquerFaits} onChange={(e) => setMasquerFaits(e.target.checked)} />
                    Masquer les tâches faites
                  </label>
                ) : null}
                {t.cle === "routines" ? (
                  <button type="button" className="v2-btn v2-btn--petit" onClick={remettreRoutines}>
                    <RotateCcw width={14} height={14} aria-hidden="true" />
                    Nouvelle semaine
                  </button>
                ) : null}
                <button type="button" className="v2-btn v2-btn--petit" onClick={() => ajouter(t.cle, t.colonnes)}>
                  <Plus width={14} height={14} aria-hidden="true" />
                  Ajouter une ligne
                </button>
              </div>
            </div>
            <div className="v2-tableau-cadre om-tableau-cadre">
              <table className="v2-tableau om-grille">
                <thead>
                  <tr>
                    {t.colonnes.map((c) => (
                      <th key={c.cle} data-large={c.large ? "" : undefined} data-etroite={c.etroite ? "" : undefined}>
                        {c.cle}
                      </th>
                    ))}
                    <th aria-label="Actions" data-etroite="" />
                  </tr>
                </thead>
                <tbody>
                  {ls.map((l) => (
                    <tr key={l.id} data-fait={l.donnees["Statut"] === "Fait" ? "" : undefined}>
                      {t.colonnes.map((c) => (
                        <td key={c.cle} data-large={c.large ? "" : undefined}>
                          {c.choix ? (
                            <select className="om-choix" data-teinte={teinteStatut(l.donnees[c.cle])} value={l.donnees[c.cle] ?? c.choix[0]} onChange={(e) => maj(l.id, c.cle, e.target.value)} aria-label={c.cle}>
                              {c.choix.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Cellule valeur={l.donnees[c.cle] ?? ""} etiquette={c.cle} large={!!c.large} onValider={(v) => maj(l.id, c.cle, v)} />
                          )}
                        </td>
                      ))}
                      <td>
                        <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Supprimer la ligne" onClick={() => supprimer(l.id)}>
                          <Trash2 width={14} height={14} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Cellule({ valeur, etiquette, large, onValider }: { valeur: string; etiquette: string; large: boolean; onValider: (v: string) => void }) {
  const [v, setV] = useState(valeur);
  /* la hauteur suit le texte : jamais de ligne coupée */
  const ajuster = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  return (
    <textarea
      ref={ajuster}
      className="om-cellule"
      data-large={large ? "" : undefined}
      value={v}
      rows={1}
      aria-label={etiquette}
      onChange={(e) => {
        setV(e.target.value);
        ajuster(e.target);
      }}
      onBlur={() => onValider(v.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
    />
  );
}

function Carte({ titre, valeur, total, unite, pied, ancre }: { titre: string; valeur: number; total: number; unite: string; pied: string; ancre: string }) {
  const points = 32;
  const pleins = total ? Math.round((Math.min(valeur, total) / total) * points) : 0;
  return (
    <a href={ancre} className="v2-carte om-carte">
      <span className="om-carte-titre">
        {titre}
        <ChevronRight width={14} height={14} aria-hidden="true" />
      </span>
      <span className="om-carte-valeur">
        <strong>{valeur}</strong> / {total} {unite}
      </span>
      <span className="om-points" aria-hidden="true">
        {Array.from({ length: points }, (_, i) => (
          <span key={i} data-plein={i < pleins ? "" : undefined} />
        ))}
      </span>
      <span className="om-carte-pied">{pied}</span>
    </a>
  );
}
