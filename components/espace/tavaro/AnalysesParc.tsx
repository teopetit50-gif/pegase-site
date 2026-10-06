"use client";

/* Les analyses du parc (06/10/2026, session B3, renfort sur Tavaro) :
   quatre listes du matin et, pour la direction, le plan de flotte.
   · Véhicules inactifs : la probabilité qu'un véhicule reste trois jours au
     parking, avec l'action qui l'évite (transfert, montée en gamme, creux).
   · Réservations à risque : non-présentations probables, avec la
     confirmation, l'acompte ou la relance à proposer.
   · Contrats à risque : un score par contrat (conducteur, historique,
     sinistralité) et le contrôle de la pièce d'identité et du permis,
     noté ici au comptoir.
   · Montée en gamme : à qui proposer la catégorie supérieure libre.
   · Plan de flotte (gérant, admin) : agence par agence, à acheter,
     renouveler, vendre ou déplacer l'an prochain.
   Chaque ligne dit ses raisons : ce sont des règles, pas une boîte noire.
   Deux sources : l'exemple (analyses-exemple.ts, le contrôle s'y note en
   mémoire) ou la base réelle (analyses.ts). */

import { useCallback, useEffect, useState } from "react";
import { IdCard } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { ANALYSES_EXEMPLE } from "./analyses-exemple";
import { chargerAnalyses, noterControle, type Analyses, type Conformite, type ContratRisque } from "./analyses";
import type { Moi } from "./portes";
import type { Role } from "./types";

const NIVEAU: Record<string, { libelle: string; teinte: "rouge" | "ambre" | "gris" }> = {
  fort: { libelle: "Risque fort", teinte: "rouge" },
  moyen: { libelle: "Risque moyen", teinte: "ambre" },
  faible: { libelle: "Risque faible", teinte: "gris" },
};

function quand(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v * 100)} %`;
}

function DialogueControle({ contrat, fermer, noter }: { contrat: ContratRisque | null; fermer: () => void; noter: (c: ContratRisque, i: Conformite, p: Conformite, r: boolean | null) => Promise<void> }) {
  const [identite, setIdentite] = useState<Conformite>("conforme");
  const [permis, setPermis] = useState<Conformite>("conforme");
  const [recent, setRecent] = useState<"oui" | "non" | "inconnu">("inconnu");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (!contrat) return;
    const t = window.setTimeout(() => {
      setIdentite(contrat.controle?.identite ?? "conforme");
      setPermis(contrat.controle?.permis ?? "conforme");
      setRecent(contrat.controle?.permis_recent === true ? "oui" : contrat.controle?.permis_recent === false ? "non" : "inconnu");
      setErreur(null);
    }, 0);
    return () => window.clearTimeout(t);
  }, [contrat]);
  const confirmer = async () => {
    if (!contrat) return;
    setOccupe(true);
    setErreur(null);
    try {
      await noter(contrat, identite, permis, recent === "inconnu" ? null : recent === "oui");
      fermer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  const choix = (nom: string, valeur: string, set: (v: never) => void, options: [string, string][]) => (
    <fieldset className="esp-form" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="rv-libelle" style={{ marginBottom: 6 }}>{nom}</legend>
      <div className="esp-item-haut" style={{ gap: 14, flexWrap: "wrap" }}>
        {options.map(([v, l]) => (
          <label key={v} className="esp-item-haut" style={{ gap: 8, cursor: "pointer" }}>
            <input type="radio" name={`controle-${nom}`} value={v} checked={valeur === v} onChange={() => set(v as never)} />
            <span>{l}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <Dialog open={!!contrat} onOpenChange={(o) => !o && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><IdCard width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Contrôle des pièces — {contrat?.numero}</DialogTitle>
          <DialogDescription>
            {contrat ? `${contrat.client}. ` : ""}Tavaro garde seulement le résultat : ni numéro, ni date de naissance, ni photo de la pièce.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            {choix("Pièce d'identité", identite, setIdentite as (v: never) => void, [["conforme", "Conforme"], ["non_conforme", "Non conforme"]])}
            {choix("Permis de conduire", permis, setPermis as (v: never) => void, [["conforme", "Conforme"], ["non_conforme", "Non conforme"]])}
            {choix("Permis de moins de trois ans", recent, setRecent as (v: never) => void, [["oui", "Oui"], ["non", "Non"], ["inconnu", "Non vu"]])}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={occupe} onClick={confirmer}>{occupe ? <Loader variant="spin" /> : null} Noter le contrôle</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AnalysesParc({ source, moi, role }: { source: "exemple" | "reelle"; moi: Moi | null; role: Role | null }) {
  const [local, setLocal] = useState<Analyses>(ANALYSES_EXEMPLE);
  const [reel, setReel] = useState<Analyses | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [cible, setCible] = useState<ContratRisque | null>(null);
  /* les dates de l'exemple suivent l'horloge du navigateur : rien n'est rendu côté serveur (pas d'écart à l'hydratation) */
  const [monte, setMonte] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMonte(true), 0);
    return () => window.clearTimeout(t);
  }, []);
  const direction = role === "gerant" || role === "admin";
  const peutNoter = role !== null && role !== "lecteur";

  const charger = useCallback(async () => {
    if (source !== "reelle" || !moi) return;
    const r = await chargerAnalyses(moi.client_id, moi.role === "gerant" || moi.role === "admin");
    setReel(r.analyses);
    setErreurs(r.erreurs);
  }, [source, moi]);
  useEffect(() => {
    const t = window.setTimeout(() => { void charger(); }, 0);
    return () => window.clearTimeout(t);
  }, [charger]);

  const noter = useCallback(async (c: ContratRisque, identite: Conformite, permis: Conformite, recent: boolean | null) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => {
        if (!prev.contrats) return prev;
        const contrats = prev.contrats.contrats.map((x) => {
          if (x.contrat_id !== c.contrat_id) return x;
          const raisons = x.raisons.filter((r) => r !== "pièces pas encore contrôlées" && r !== "pièce d'identité ou permis non conforme" && r !== "permis de moins de trois ans");
          if (identite === "non_conforme" || permis === "non_conforme") raisons.unshift("pièce d'identité ou permis non conforme");
          if (recent) raisons.push("permis de moins de trois ans");
          const score = x.score - (x.raisons.includes("pièces pas encore contrôlées") ? 1 : 0) - (x.raisons.includes("pièce d'identité ou permis non conforme") ? 3 : 0)
            - (x.raisons.includes("permis de moins de trois ans") ? 2 : 0) + (identite === "non_conforme" || permis === "non_conforme" ? 3 : 0) + (recent ? 2 : 0);
          const ko = identite === "non_conforme" || permis === "non_conforme";
          return { ...x, raisons, score, niveau: score >= 4 ? "fort" as const : "moyen" as const,
            controle: { identite, permis, permis_recent: recent, le: new Date().toISOString() },
            action: ko ? "Ne pas remettre les clés sans pièces conformes" : x.action === "Contrôler la pièce d'identité et le permis" ? "Appeler le client la veille du retour" : x.action };
        });
        return { ...prev, contrats: { a_risque: contrats.filter((x) => x.niveau === "fort").length, contrats } };
      });
      return;
    }
    await noterControle(c.contrat_id, identite, permis, recent);
    await charger();
  }, [source, charger]);

  const a = source === "exemple" ? local : reel;
  if (!monte || (source === "reelle" && !moi)) return null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {erreurs.length ? <Avis teinte="ambre">Certaines analyses n&apos;ont pas pu être lues : {erreurs.join(" ; ")}</Avis> : null}
      {!a ? <div className="esp-carte"><Chargement texte="Lecture des analyses du parc…" /></div> : (
        <>
          <div className="esp-grille">
            <section id="tavaro-inactifs" className="esp-carte" aria-label="Véhicules inactifs">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">Véhicules inactifs</h2>
                <span className="esp-kpi-sous">{a.inactifs ? `${a.inactifs.a_risque} véhicule${a.inactifs.a_risque > 1 ? "s" : ""} à risque ce matin` : "—"}</span>
              </div>
              <div className="esp-carte-corps">
                {!a.inactifs?.vehicules.length ? <Vide titre="Aucun véhicule à risque">Tous les véhicules au parc ont un départ dans les 72 heures.</Vide> : (
                  <ul className="esp-liste" aria-label="Véhicules qui risquent de rester trois jours au parking">
                    {a.inactifs.vehicules.map((v) => (
                      <li key={v.vehicule_id} className="esp-item" style={{ cursor: "default" }}>
                        <span className="esp-item-haut">
                          <Pastille teinte={NIVEAU[v.niveau].teinte}>{pct(v.probabilite)} sur 72 h</Pastille>
                          <span className="esp-mono">{v.immatriculation}</span>
                        </span>
                        <span className="esp-item-titre">{v.action.libelle}</span>
                        <span className="esp-item-bas">
                          <span>{v.modele ? `${v.modele} · ` : ""}catégorie {v.categorie}</span>
                          <span>{v.agence}</span>
                          <span>au parking depuis {v.jours_parking} jour{v.jours_parking > 1 ? "s" : ""}</span>
                          <span>{v.raison}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section id="tavaro-reservations-risque" className="esp-carte" aria-label="Réservations à risque">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">Réservations à risque</h2>
                <span className="esp-kpi-sous">{a.reservations ? `${a.reservations.reservations.length} réservation${a.reservations.reservations.length > 1 ? "s" : ""} à risque ce matin` : "—"}</span>
              </div>
              <div className="esp-carte-corps">
                {!a.reservations?.reservations.length ? <Vide titre="Aucune non-présentation probable">Rien à confirmer avant les départs des trois prochains jours.</Vide> : (
                  <ul className="esp-liste" aria-label="Réservations exposées à une non-présentation">
                    {a.reservations.reservations.map((r) => (
                      <li key={r.reservation_id} className="esp-item" style={{ cursor: "default" }}>
                        <span className="esp-item-haut">
                          <Pastille teinte={NIVEAU[r.niveau].teinte}>{NIVEAU[r.niveau].libelle}</Pastille>
                          <span className="esp-mono">{r.ref}</span>
                        </span>
                        <span className="esp-item-titre">{r.client} — {r.action}</span>
                        <span className="esp-item-bas">
                          <span>départ {quand(r.depart_prevu_le)}</span>
                          <span>{r.agence}{r.categorie ? ` · catégorie ${r.categorie}` : ""}</span>
                          <span>{r.raisons.join(" · ")}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <div className="esp-grille">
            <section id="tavaro-contrats-risque" className="esp-carte" aria-label="Contrats à risque">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">Contrats à risque</h2>
                <span className="esp-kpi-sous">{a.contrats ? `${a.contrats.a_risque} contrat${a.contrats.a_risque > 1 ? "s" : ""} signalé${a.contrats.a_risque > 1 ? "s" : ""} à risque ce matin` : "—"}</span>
              </div>
              <div className="esp-carte-corps">
                {!a.contrats?.contrats.length ? <Vide titre="Aucun contrat à risque">Les contrats en cours n&apos;appellent aucune précaution particulière.</Vide> : (
                  <ul className="esp-liste" aria-label="Contrats signalés">
                    {a.contrats.contrats.map((c) => (
                      <li key={c.contrat_id} className="esp-item" style={{ cursor: "default" }}>
                        <span className="esp-item-haut">
                          <Pastille teinte={NIVEAU[c.niveau].teinte}>Score {c.score}</Pastille>
                          <span className="esp-mono">{c.numero}</span>
                          {c.controle ? <Pastille teinte={c.controle.identite === "conforme" && c.controle.permis === "conforme" ? "vert" : "rouge"}>{c.controle.identite === "conforme" && c.controle.permis === "conforme" ? "Pièces conformes" : "Pièce non conforme"}</Pastille> : <Pastille teinte="gris">Pièces à contrôler</Pastille>}
                        </span>
                        <span className="esp-item-titre">{c.client} — {c.action}</span>
                        <span className="esp-item-bas">
                          <span>{c.agence}{c.vehicule ? ` · ${c.vehicule}` : ""}</span>
                          <span>retour prévu {quand(c.retour_prevu_le)}</span>
                          <span>{c.raisons.join(" · ")}</span>
                          {peutNoter ? <button type="button" className="esp-lien-bouton" onClick={() => setCible(c)}>{c.controle ? "Revoir le contrôle" : "Noter le contrôle"}<span className="sr-only"> du contrat {c.numero}</span></button> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section id="tavaro-montee-en-gamme" className="esp-carte" aria-label="Montée en gamme">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">Montée en gamme</h2>
                <span className="esp-kpi-sous">{a.montee ? `${a.montee.offres.length} client${a.montee.offres.length > 1 ? "s" : ""} à qui proposer une offre` : "—"}</span>
              </div>
              <div className="esp-carte-corps">
                {!a.montee?.offres.length ? <Vide titre="Aucune offre à faire">Aucun véhicule supérieur n&apos;est libre pour les départs des deux prochains jours.</Vide> : (
                  <ul className="esp-liste" aria-label="Offres de montée en gamme au comptoir">
                    {a.montee.offres.map((o) => (
                      <li key={o.reservation_id} className="esp-item" style={{ cursor: "default" }}>
                        <span className="esp-item-haut">
                          <Pastille teinte="bleu">{o.categorie} → {o.offre.categorie}</Pastille>
                          <span className="esp-mono">{o.ref}</span>
                        </span>
                        <span className="esp-item-titre">{o.client} — proposer une {o.offre.libelle.toLowerCase()}</span>
                        <span className="esp-item-bas">
                          <span>départ {quand(o.depart_prevu_le)}</span>
                          <span>{o.agence} · {o.offre.libres} libre{o.offre.libres > 1 ? "s" : ""}</span>
                          <span>{o.raisons.join(" · ")}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {(direction || source === "exemple") && a.plan ? (
            <section id="tavaro-plan-de-flotte" className="esp-carte" aria-label="Plan de flotte">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">Plan de flotte {a.plan.annee}</h2>
                <span className="esp-kpi-sous">sur les {a.plan.periode.mois} derniers mois, utilisation visée {pct(a.plan.cible_utilisation)}</span>
              </div>
              <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
                <div className="esp-kpis" style={{ marginBottom: 0 }}>
                  <div className="esp-kpi"><span className="esp-kpi-etiquette">À acheter</span><span className="esp-kpi-valeur">{a.plan.totaux.acheter}</span><span className="esp-kpi-sous">après les déplacements</span></div>
                  <div className="esp-kpi"><span className="esp-kpi-etiquette">À renouveler</span><span className="esp-kpi-valeur">{a.plan.totaux.renouveler}</span><span className="esp-kpi-sous">4 ans ou 120 000 km</span></div>
                  <div className="esp-kpi"><span className="esp-kpi-etiquette">À vendre</span><span className="esp-kpi-valeur">{a.plan.totaux.vendre}</span><span className="esp-kpi-sous">en trop sur le réseau</span></div>
                  <div className="esp-kpi"><span className="esp-kpi-etiquette">À déplacer</span><span className="esp-kpi-valeur">{a.plan.totaux.deplacer}</span><span className="esp-kpi-sous">d&apos;une agence à l&apos;autre</span></div>
                </div>
                <div className="esp-tableau-cadre" style={{ position: "relative" }} tabIndex={0} role="region" aria-label="Plan de flotte par agence et par catégorie (tableau qui défile)">
                  <table className="esp-tableau">
                    <thead>
                      <tr><th>Agence</th><th>Catégorie</th><th>Flotte</th><th>Utilisation</th><th>Il en faut</th><th>Acheter</th><th>Renouveler</th><th>Vendre</th><th>Déplacer</th></tr>
                    </thead>
                    <tbody>
                      {a.plan.agences.flatMap((ag) => ag.categories.map((l) => (
                        <tr key={`${ag.entite_id}-${l.categorie_id}`} title={l.raison}>
                          <td>{ag.agence}</td>
                          <td>{l.categorie} · {l.libelle}</td>
                          <td>{l.flotte}</td>
                          <td>{pct(l.utilisation)}</td>
                          <td>{l.cible}</td>
                          <td>{l.acheter || "—"}</td>
                          <td>{l.renouveler || "—"}</td>
                          <td>{l.vendre ? `${l.vendre}${l.a_vendre.length ? ` (${l.a_vendre.join(", ")})` : ""}` : "—"}</td>
                          <td>{l.deplacer.length ? l.deplacer.map((d) => `${d.n} vers ${d.vers}`).join(", ") : l.recevoir ? `reçoit ${l.recevoir}` : "—"}</td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
                {source === "exemple" ? <p className="esp-fil-meta">Dans votre espace, seuls le gérant et l&apos;administrateur voient le plan de flotte : il porte sur tout le réseau.</p> : null}
                <p className="esp-fil-meta">Le besoin est le plus grand de deux chiffres : le nombre de contrats en cours au plus fort de l&apos;année (95e centile), et ce qu&apos;il faut pour louer autant de jours à l&apos;utilisation visée. Les excédents d&apos;une agence couvrent d&apos;abord les manques d&apos;une autre ; la décision reste à la direction.</p>
              </div>
            </section>
          ) : null}
        </>
      )}
      <DialogueControle contrat={cible} fermer={() => setCible(null)} noter={noter} />
    </div>
  );
}
