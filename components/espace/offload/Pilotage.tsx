"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — le pilotage (c4_09, 06/10/2026, session C4)

   Quatre tableaux, chacun exportable vers un tableur à la demande :
   le chiffre remis en jeu vague par vague (une vague = le passage d'un
   jour), les taux de réponse comparés (par segment, niveau, canal,
   message), le tableau de suivi mois par mois (échéances honorées,
   commandes reprises, affaires retirées) et les résultats par entité,
   par site et en consolidé. À date fixe : les arrêtés mensuels posés la
   nuit, chacun téléchargeable en tableur.
   Lecture : public.offload_pilotage(), public.offload_arretes_liste()
   (gérant, admin, valideur). L'exemple vit ici.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { dateCourte, montant, nombreFr } from "../format";
import type { Source } from "../source";
import { Chargement, Vide } from "../ui";
import { chargerArretes, chargerPilotage } from "./portes";
import { exporterArrete, exporterTableau, type TableauPilotage } from "./tableur";
import type { Arrete, LigneTaux, Pilotage as Donnees } from "./types";

const ONGLETS: { cle: TableauPilotage | "arretes"; libelle: string }[] = [
  { cle: "vagues", libelle: "Vagues" },
  { cle: "taux", libelle: "Taux de réponse" },
  { cle: "suivi", libelle: "Suivi" },
  { cle: "entites", libelle: "Entités et sites" },
  { cle: "arretes", libelle: "Arrêtés" },
];

const AXES: { cle: keyof Donnees["taux"]; libelle: string }[] = [
  { cle: "segment", libelle: "Par segment" },
  { cle: "canal", libelle: "Par canal" },
  { cle: "message", libelle: "Par message" },
  { cle: "niveau", libelle: "Par niveau du signal" },
];

const NIVEAUX: Record<string, string> = { eteint: "Éteint", decroche: "Décroche", saison: "Saison manquée", ralentit: "Ralentit", ok: "Régulier", sans_achat: "Sans achat", sous_seuil: "Sous le seuil", inconnu: "Inconnu" };

function jour(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function mois(n: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 7);
}

export function pilotageExemple(): Donnees {
  const r = (comptes: number, en_jeu: number, reponses: number, commandes: number, chiffre_repris: number, echeances_honorees: number, affaires_retirees: number) =>
    ({ comptes, en_jeu, reponses, commandes, chiffre_repris, echeances_honorees, affaires_retirees });
  return {
    depuis: jour(-365),
    calcule_le: new Date().toISOString(),
    vagues: [
      { vague: jour(-1), comptes: 6, en_jeu: 48200, messages: 5, appels: 1, reponses: 2, commandes: 1, chiffre_repris: 3150, taux_reponse: 33.3 },
      { vague: jour(-8), comptes: 8, en_jeu: 61900, messages: 7, appels: 1, reponses: 3, commandes: 2, chiffre_repris: 7420, taux_reponse: 37.5 },
      { vague: jour(-15), comptes: 5, en_jeu: 29800, messages: 5, appels: 0, reponses: 1, commandes: 1, chiffre_repris: 1980, taux_reponse: 20 },
    ],
    taux: {
      segment: [
        { valeur: "BTP", sollicites: 9, reponses: 4, taux: 44.4 },
        { valeur: "Santé", sollicites: 6, reponses: 1, taux: 16.7 },
        { valeur: "Commerce", sollicites: 4, reponses: 1, taux: 25 },
      ],
      canal: [{ valeur: "Courriel", sollicites: 17, reponses: 5, taux: 29.4 }, { valeur: "Appel", sollicites: 2, reponses: 1, taux: 50 }],
      message: [
        { valeur: "Premier message", sollicites: 17, reponses: 4, taux: 23.5 },
        { valeur: "Relance", sollicites: 9, reponses: 1, taux: 11.1 },
        { valeur: "Rappel de retrait", sollicites: 6, reponses: 3, taux: 50 },
      ],
      niveau: [{ valeur: "decroche", sollicites: 11, reponses: 4, taux: 36.4 }, { valeur: "eteint", sollicites: 8, reponses: 2, taux: 25 }],
    },
    suivi: [
      { mois: mois(0), echeances_honorees: 7, echeances_apres_message: 5, commandes_reprises: 3, chiffre_repris: 10570, affaires_retirees: 4, valeur_liberee: 2310 },
      { mois: mois(-1), echeances_honorees: 9, echeances_apres_message: 6, commandes_reprises: 2, chiffre_repris: 4860, affaires_retirees: 3, valeur_liberee: 1180 },
      { mois: mois(-2), echeances_honorees: 5, echeances_apres_message: 3, commandes_reprises: 1, chiffre_repris: 1980, affaires_retirees: 2, valeur_liberee: 640 },
    ],
    entites: {
      par_entite: [{ societe_id: "s1", societe: "Groupe Sogexal", ...r(19, 139900, 6, 4, 12550, 21, 9) }],
      par_site: [
        { societe_id: "s1", societe: "Groupe Sogexal", site_id: "t1", site: "Agence de Rennes", ...r(11, 82100, 4, 3, 9400, 12, 5) },
        { societe_id: "s1", societe: "Groupe Sogexal", site_id: "t2", site: "Agence de Vannes", ...r(8, 57800, 2, 1, 3150, 9, 4) },
      ],
      consolide: r(19, 139900, 6, 4, 12550, 21, 9),
    },
  };
}

function Taux({ l }: { l: LigneTaux }) {
  const t = l.taux ?? 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end", width: "100%" }}>
      <span aria-hidden="true" style={{ width: 64, height: 6, borderRadius: 3, background: "var(--r-filet)", overflow: "hidden", flex: "none" }}>
        <span style={{ display: "block", width: `${Math.min(100, t)}%`, height: "100%", background: "var(--r-texte)", opacity: 0.8 }} />
      </span>
      <span style={{ minWidth: 52, textAlign: "right" }}>{l.taux === null ? "—" : `${String(l.taux).replace(".", ",")} %`}</span>
    </span>
  );
}

function Exporter({ onClick, libelle = "Exporter vers un tableur" }: { onClick: () => void; libelle?: string }) {
  return <button type="button" className="esp-lien-bouton" onClick={onClick}>{libelle}</button>;
}

function Cadre({ etiquette, children }: { etiquette: string; children: React.ReactNode }) {
  return <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label={`${etiquette} (tableau qui défile)`}>{children}</div>;
}

export default function Pilotage({ source }: { source: Source }) {
  const [onglet, setOnglet] = useState<TableauPilotage | "arretes">("vagues");
  const [reel, setReel] = useState<Donnees | null>(null);
  const [arretes, setArretes] = useState<Arrete[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const [p, a] = await Promise.all([chargerPilotage(null), chargerArretes()]);
        if (actif) { setReel(p); setArretes(a); }
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      } finally {
        if (actif) setCharge(true);
      }
    }, 0);
    return () => { actif = false; window.clearTimeout(t); };
  }, [source]);

  const p = source === "exemple" ? pilotageExemple() : reel;
  const listeArretes: Arrete[] = source === "exemple" && p ? [{ jour: jour(-5), pilotage: p, cree_le: jour(-5) }] : arretes;
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <section className="esp-carte" aria-label="Pilotage">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Pilotage</h2>
        <span className="esp-kpi-sous">{p ? `douze derniers mois, depuis le ${dateCourte(p.depuis)}` : "vue consolidée, réservée à la direction"}</span>
      </div>
      {source === "reelle" && !charge ? <Chargement texte="Calcul du pilotage…" /> : !p ? (
        <Vide titre="Pilotage indisponible">{erreur ?? "Le pilotage consolidé se lit par le gérant, l'administrateur ou le valideur."}</Vide>
      ) : (
        <div className="esp-carte-corps" style={{ display: "grid", gap: 10 }}>
          <div role="tablist" aria-label="Tableaux du pilotage" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ONGLETS.map((o) => (
              <button key={o.cle} type="button" role="tab" aria-selected={onglet === o.cle}
                className={`r-btn r-btn--petit ${onglet === o.cle ? "r-btn--noir" : "r-btn--fil"}`} onClick={() => setOnglet(o.cle)}>
                {o.libelle}
              </button>
            ))}
          </div>

          {onglet === "vagues" ? (
            p.vagues.length === 0 ? <p className="esp-kpi-sous">Aucune vague sur la période.</p> : (
              <>
                <Cadre etiquette="Chiffre remis en jeu, vague par vague">
                  <table className="esp-tableau">
                    <thead><tr><th>Vague du</th><th className="esp-num">Comptes</th><th className="esp-num">En jeu HT</th><th className="esp-num">Réponses</th><th className="esp-num">Taux</th><th className="esp-num">Commandes</th><th className="esp-num">Chiffre repris HT</th></tr></thead>
                    <tbody>
                      {p.vagues.map((v) => (
                        <tr key={v.vague}>
                          <td>{dateCourte(v.vague)}</td><td className="esp-num">{nombreFr(v.comptes)}</td><td className="esp-num">{montant(v.en_jeu)}</td>
                          <td className="esp-num">{nombreFr(v.reponses)}</td><td className="esp-num">{v.taux_reponse === null ? "—" : `${String(v.taux_reponse).replace(".", ",")} %`}</td>
                          <td className="esp-num">{nombreFr(v.commandes)}</td><td className="esp-num">{montant(v.chiffre_repris)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Cadre>
                <span className="esp-kpi-sous">En jeu : la valeur annuelle attendue des comptes sollicités, figée à l&apos;ouverture. Repris : leurs achats dans les 90 jours qui suivent.</span>
              </>
            )
          ) : null}

          {onglet === "taux" ? (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {AXES.map((ax) => (
                <Cadre key={ax.cle} etiquette={`Taux de réponse ${ax.libelle.toLowerCase()}`}>
                  <table className="esp-tableau">
                    <thead><tr><th>{ax.libelle}</th><th className="esp-num">Sollicités</th><th className="esp-num">Taux</th></tr></thead>
                    <tbody>
                      {(p.taux[ax.cle] ?? []).length === 0 ? <tr><td colSpan={3} className="esp-kpi-sous">Aucune sollicitation.</td></tr> : null}
                      {(p.taux[ax.cle] ?? []).map((l) => (
                        <tr key={l.valeur}>
                          <td>{ax.cle === "niveau" ? NIVEAUX[l.valeur] ?? l.valeur : l.valeur}</td>
                          <td className="esp-num">{nombreFr(l.sollicites)}</td>
                          <td className="esp-num"><Taux l={l} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Cadre>
              ))}
            </div>
          ) : null}

          {onglet === "suivi" ? (
            <Cadre etiquette="Tableau de suivi">
              <table className="esp-tableau">
                <thead><tr><th>Mois</th><th className="esp-num">Échéances honorées</th><th className="esp-num">dont après message</th><th className="esp-num">Commandes reprises</th><th className="esp-num">Chiffre repris HT</th><th className="esp-num">Affaires retirées</th><th className="esp-num">Valeur libérée HT</th></tr></thead>
                <tbody>
                  {p.suivi.map((m) => (
                    <tr key={m.mois}>
                      <td>{m.mois.split("-").reverse().join("/")}</td><td className="esp-num">{nombreFr(m.echeances_honorees)}</td><td className="esp-num">{nombreFr(m.echeances_apres_message)}</td>
                      <td className="esp-num">{nombreFr(m.commandes_reprises)}</td><td className="esp-num">{montant(m.chiffre_repris)}</td>
                      <td className="esp-num">{nombreFr(m.affaires_retirees)}</td><td className="esp-num">{montant(m.valeur_liberee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Cadre>
          ) : null}

          {onglet === "entites" ? (
            <Cadre etiquette="Résultats par entité, par site et en consolidé">
              <table className="esp-tableau">
                <thead><tr><th>Entité / site</th><th className="esp-num">Comptes</th><th className="esp-num">Réponses</th><th className="esp-num">Commandes</th><th className="esp-num">Chiffre repris HT</th><th className="esp-num">Échéances honorées</th><th className="esp-num">Affaires retirées</th></tr></thead>
                <tbody>
                  {p.entites.par_entite.map((e) => (
                    <FragmentEntite key={e.societe_id} nom={e.societe} r={e} sites={p.entites.par_site.filter((s) => s.societe_id === e.societe_id)} />
                  ))}
                  {p.entites.consolide ? (
                    <tr style={{ fontWeight: 600 }}>
                      <td>Consolidé</td><td className="esp-num">{nombreFr(p.entites.consolide.comptes)}</td><td className="esp-num">{nombreFr(p.entites.consolide.reponses)}</td>
                      <td className="esp-num">{nombreFr(p.entites.consolide.commandes)}</td><td className="esp-num">{montant(p.entites.consolide.chiffre_repris)}</td>
                      <td className="esp-num">{nombreFr(p.entites.consolide.echeances_honorees)}</td><td className="esp-num">{nombreFr(p.entites.consolide.affaires_retirees)}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </Cadre>
          ) : null}

          {onglet === "arretes" ? (
            listeArretes.length === 0 ? <p className="esp-kpi-sous">Aucun arrêté encore : le premier sera posé la nuit du jour réglé (le 1er du mois par défaut).</p> : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                {listeArretes.map((a) => (
                  <li key={a.jour} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, border: "1px solid var(--r-filet)", borderRadius: 12, padding: "8px 12px" }}>
                    <span>Arrêté du <strong>{dateCourte(a.jour)}</strong> <span className="esp-kpi-sous">— vagues, taux, suivi, entités</span></span>
                    <Exporter libelle="Télécharger en tableur" onClick={() => exporterArrete(a.pilotage, a.jour)} />
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div><Exporter onClick={() => exporterTableau(p, onglet, aujourdhui)} /></div>
          )}
        </div>
      )}
    </section>
  );
}

function FragmentEntite({ nom, r, sites }: { nom: string; r: Donnees["entites"]["par_entite"][number]; sites: Donnees["entites"]["par_site"] }) {
  return (
    <>
      <tr>
        <td><strong>{nom}</strong></td><td className="esp-num">{nombreFr(r.comptes)}</td><td className="esp-num">{nombreFr(r.reponses)}</td>
        <td className="esp-num">{nombreFr(r.commandes)}</td><td className="esp-num">{montant(r.chiffre_repris)}</td>
        <td className="esp-num">{nombreFr(r.echeances_honorees)}</td><td className="esp-num">{nombreFr(r.affaires_retirees)}</td>
      </tr>
      {sites.map((s) => (
        <tr key={s.site_id}>
          <td style={{ paddingLeft: 20 }}>{s.site}</td><td className="esp-num">{nombreFr(s.comptes)}</td><td className="esp-num">{nombreFr(s.reponses)}</td>
          <td className="esp-num">{nombreFr(s.commandes)}</td><td className="esp-num">{montant(s.chiffre_repris)}</td>
          <td className="esp-num">{nombreFr(s.echeances_honorees)}</td><td className="esp-num">{nombreFr(s.affaires_retirees)}</td>
        </tr>
      ))}
    </>
  );
}
