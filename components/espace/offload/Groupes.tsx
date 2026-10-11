"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — la raison sociale mère (c4_10, 11/10/2026, session C4)

   Les entités d'un même groupe client regroupées sous leur raison
   sociale mère : chiffre consolidé sur 12 mois, valeur annuelle, pire
   signal de ses entités, reprises en cours, échéances, affaires en plan.
   Les comptes qui partagent un domaine de courriel professionnel sont
   proposés au rattachement ; rien n'est rattaché sans votre geste.
   Lecture : public.offload_groupes() ; écriture :
   public.offload_rattacher_groupe (en base réelle seulement).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { montant, nombreFr } from "../format";
import type { Source } from "../source";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { NIVEAUX } from "./etats";
import { chargerGroupes, rattacherGroupe } from "./portes";
import type { Groupes as Donnees } from "./types";

const C = (n: number) => `00000000-0000-4000-8c40-${String(n).padStart(12, "0")}`;

const EXEMPLE: Donnees = {
  groupes: [
    {
      nom: "Groupe Ouest Froid", nb: 2, ca_12m: 41200, valeur_annuelle: 52800, dernier_achat: null, pire_niveau: "ralentit",
      reprises_en_cours: 1, echeances: 3, affaires_valeur: 1840,
      comptes: [
        { id: C(2), nom: "Froid Services Ouest", ref: "C002", niveau: "ralentit", ca_12m: 28600, statut: "suivi", verification: null },
        { id: "x", nom: "Froid Services Vannes", ref: "C012", niveau: "ok", ca_12m: 12600, statut: "suivi", verification: null },
      ],
    },
  ],
  a_rattacher: [
    { domaine: "dubreuil-menuiserie.fr", comptes: [{ id: C(3), nom: "Menuiserie Dubreuil", groupe: null }, { id: "y", nom: "Dubreuil Agencement", groupe: null }] },
  ],
};

export default function Groupes({ source, onChoisir }: { source: Source; onChoisir: (compte: string) => void }) {
  const [reel, setReel] = useState<Donnees | null>(null);
  const [nom, setNom] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setReel(await chargerGroupes());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ groupes: [], a_rattacher: [] });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const d = source === "exemple" ? EXEMPLE : reel;

  const rattacher = async (domaine: string, comptes: string[]) => {
    setErreur(null);
    if (source !== "reelle") {
      setFait("Exemple : rien n'est enregistré. En base réelle, les comptes passent sous la raison sociale mère, et c'est au journal.");
      return;
    }
    try {
      await rattacherGroupe(comptes, (nom[domaine] ?? "").trim());
      setFait("Rattachement noté : le plafond de sollicitation vaut désormais pour le groupe.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    }
  };

  return (
    <section className="esp-carte" aria-label="Groupes clients">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Groupes clients</h2>
        <span className="esp-kpi-sous">les entités d&apos;un même groupe, sous leur raison sociale mère</span>
      </div>
      {fait ? <div className="esp-carte-corps"><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {erreur ? <div className="esp-carte-corps"><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      {d === null ? <Chargement texte="Lecture des groupes…" /> : d.groupes.length === 0 && d.a_rattacher.length === 0 ? (
        <Vide titre="Aucun groupe">La colonne « groupe » de votre export, ou un rattachement depuis cette carte, regroupe les entités d&apos;un même client.</Vide>
      ) : (
        <div className="esp-carte-corps" style={{ display: "grid", gap: 8 }}>
          {d.groupes.map((g) => {
            const n = g.pire_niveau ? NIVEAUX[g.pire_niveau as keyof typeof NIVEAUX] : null;
            return (
              <details key={g.nom} style={{ border: "1px solid var(--r-filet)", borderRadius: 12, padding: "8px 12px" }}>
                <summary style={{ cursor: "pointer" }}>
                  <strong>{g.nom}</strong> <span className="esp-kpi-sous">— {nombreFr(g.nb)} entité{g.nb > 1 ? "s" : ""}</span>{" "}
                  {n ? <Pastille teinte={n.teinte}>{n.libelle}</Pastille> : null}
                  <div className="esp-kpi-sous">
                    {montant(g.ca_12m)} sur 12 mois · {nombreFr(g.reprises_en_cours)} reprise{g.reprises_en_cours > 1 ? "s" : ""} en cours ·{" "}
                    {nombreFr(g.echeances)} échéance{g.echeances > 1 ? "s" : ""}{g.affaires_valeur ? ` · ${montant(g.affaires_valeur)} en attente de retrait` : ""}
                  </div>
                </summary>
                <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 4 }}>
                  {g.comptes.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="esp-lien-bouton" onClick={() => onChoisir(c.id)}>{c.nom}</button>{" "}
                      <span className="esp-kpi-sous"><span className="esp-mono">{c.ref}</span> · {c.ca_12m !== null ? montant(c.ca_12m) : "—"}</span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
          {d.a_rattacher.length ? <div className="esp-section-titre" style={{ marginTop: 4 }}>À rattacher ? (même domaine de courriel)</div> : null}
          {d.a_rattacher.map((x) => (
            <div key={x.domaine} style={{ border: "1px dashed var(--r-filet)", borderRadius: 12, padding: "8px 12px" }}>
              <div className="esp-kpi-sous">@{x.domaine} : {x.comptes.map((c) => c.nom + (c.groupe ? ` (${c.groupe})` : "")).join(", ")}</div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                <input className="rv-champ" style={{ flex: "1 1 200px" }} value={nom[x.domaine] ?? ""} aria-label={`Raison sociale mère pour ${x.domaine}`}
                  onChange={(e) => setNom({ ...nom, [x.domaine]: e.target.value })} placeholder="Raison sociale mère" />
                <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!(nom[x.domaine] ?? "").trim()}
                  onClick={() => void rattacher(x.domaine, x.comptes.map((c) => c.id))}>Rattacher</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
