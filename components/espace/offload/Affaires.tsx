"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — les affaires restées en plan (c4_08, 06/10/2026, session C4)

   Ce qui dort au magasin : les commandes arrivées que personne n'est venu
   reprendre, les interventions terminées et non retirées. En une liste,
   la plus ancienne en tête : depuis combien de jours, pour quel compte,
   et la valeur immobilisée. Le client est relancé après le délai fixé,
   puis une seule autre fois ; sans réponse, l'affaire passe en décision
   manuelle, montant en regard. Le message de retrait ne parle jamais de
   paiement (CASHD). Les affaires closes sans suite sont comptées à part.
   Lecture : public.offload_affaires_liste() ; décision et retrait :
   public.offload_decider_affaire, public.offload_retirer_affaire (en base
   réelle seulement). L'exemple vit ici.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { dateCourte, montant, nombreFr } from "../format";
import type { Source } from "../source";
import { Avis, Chargement, Pastille, Vide, type Teinte } from "../ui";
import { chargerAffaires, deciderAffaire, retirerAffaire, type DecisionAffaire } from "./portes";
import type { AffairesListe, StatutAffaire } from "./types";

export const STATUTS_AFFAIRE: Record<StatutAffaire, { libelle: string; teinte: Teinte }> = {
  en_attente: { libelle: "En attente", teinte: "gris" },
  relancee_1: { libelle: "Relancée une fois", teinte: "bleu" },
  relancee_2: { libelle: "Relancée deux fois", teinte: "ambre" },
  decision: { libelle: "À décider", teinte: "rouge" },
  repondue: { libelle: "Le client a répondu", teinte: "vert" },
  retiree: { libelle: "Retirée", teinte: "vert" },
  close_sans_suite: { libelle: "Close sans suite", teinte: "gris" },
};

export const DECISIONS: { cle: DecisionAffaire; libelle: string }[] = [
  { cle: "garder", libelle: "Garder en attente" },
  { cle: "relancer", libelle: "Relancer encore" },
  { cle: "retour_stock", libelle: "Remettre en stock" },
  { cle: "sans_suite", libelle: "Clore sans suite" },
];

function jour(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const C = (n: number) => `00000000-0000-4000-8c40-${String(n).padStart(12, "0")}`;

export function affairesExemple(): AffairesListe {
  const affaires: AffairesListe["affaires"] = [
    { id: "a1", type: "commande", reference: "CMD-4390", libelle: "Groupe de condensation", compte_id: C(2), compte_nom: "Froid Services Ouest", compte_niveau: "ralentit",
      disponible_le: jour(-23), jours: 23, valeur_ht: 1840, statut: "decision", plus_vue: false,
      motif: "Relancé deux fois sans réponse : à décider (1 840 € immobilisés depuis le " + dateCourte(jour(-23)) + ")." },
    { id: "a2", type: "intervention", reference: "OR-2291", libelle: "compresseur d'atelier", compte_id: C(4), compte_nom: "Transports Rival", compte_niveau: "eteint",
      disponible_le: jour(-11), jours: 11, valeur_ht: 310, statut: "relancee_1", plus_vue: false, motif: null },
    { id: "a3", type: "commande", reference: "CMD-4471", libelle: "4 pneus hiver 315/70", compte_id: C(1), compte_nom: "Garage Martin", compte_niveau: "decroche",
      disponible_le: jour(-9), jours: 9, valeur_ht: 480, statut: "repondue", plus_vue: false,
      motif: "Le client a répondu : la conversation revient au magasin." },
    { id: "a4", type: "commande", reference: "CMD-4502", libelle: "Batterie 12 V", compte_id: C(5), compte_nom: "Boulangerie Lemaire", compte_niveau: null,
      disponible_le: jour(-3), jours: 3, valeur_ht: 95, statut: "en_attente", plus_vue: false, motif: null },
  ];
  return {
    total: { affaires: affaires.length, valeur_ht: affaires.reduce((s, a) => s + (a.valeur_ht ?? 0), 0), a_decider: 1, closes_sans_suite: 2 },
    affaires,
  };
}

export default function Affaires({ source, onChoisir }: { source: Source; onChoisir: (compte: string) => void }) {
  const [reel, setReel] = useState<AffairesListe | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionAffaire>("garder");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    try {
      setReel(await chargerAffaires());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ total: { affaires: 0, valeur_ht: 0, a_decider: 0, closes_sans_suite: 0 }, affaires: [] });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const liste = source === "exemple" ? affairesExemple() : reel;

  const agir = async (affaire: string, geste: "decider" | "retirer") => {
    setErreur(null);
    setFait(null);
    if (source !== "reelle") {
      setFait("Exemple : rien n'est enregistré. En base réelle, la décision est notée au journal avec son motif.");
      setOuvert(null);
      return;
    }
    setEnvoi(true);
    try {
      if (geste === "retirer") {
        await retirerAffaire(affaire, null);
        setFait("Retrait noté : l'affaire sort de la liste.");
      } else {
        await deciderAffaire(affaire, decision, motif.trim());
        setFait(decision === "relancer" ? "Décision notée : un nouveau message de retrait sera préparé, en validation." : "Décision notée au journal.");
      }
      setOuvert(null);
      setMotif("");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="esp-carte" aria-label="Affaires restées en plan">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Affaires restées en plan</h2>
        <span className="esp-kpi-sous">commandes arrivées et interventions terminées, non retirées</span>
      </div>
      {liste && liste.affaires.length ? (
        <div className="esp-carte-corps" style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px" }}>
          <span><strong>{nombreFr(liste.total.affaires)}</strong> <span className="esp-kpi-sous">en attente de retrait</span></span>
          <span><strong>{montant(liste.total.valeur_ht)}</strong> <span className="esp-kpi-sous">de stock immobilisé (HT)</span></span>
          {liste.total.a_decider ? <span><strong>{nombreFr(liste.total.a_decider)}</strong> <span className="esp-kpi-sous">à décider</span></span> : null}
          {liste.total.closes_sans_suite ? <span className="esp-kpi-sous">{nombreFr(liste.total.closes_sans_suite)} close{liste.total.closes_sans_suite > 1 ? "s" : ""} sans suite, comptée{liste.total.closes_sans_suite > 1 ? "s" : ""} à part</span> : null}
        </div>
      ) : null}
      {fait ? <div className="esp-carte-corps"><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {erreur ? <div className="esp-carte-corps"><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      {liste === null ? (
        <Chargement texte="Lecture des affaires en attente…" />
      ) : liste.affaires.length === 0 ? (
        <Vide titre="Rien ne dort au magasin">Importez la liste de ce qui attend son retrait (commandes arrivées, réparations terminées) ou saisissez une affaire depuis la fiche d&apos;un compte.</Vide>
      ) : (
        <ul className="esp-liste" aria-label="Affaires en attente de retrait, la plus ancienne en tête">
          {liste.affaires.map((a) => {
            const s = STATUTS_AFFAIRE[a.statut];
            return (
              <li key={a.id}>
                <button type="button" className="esp-item" onClick={() => onChoisir(a.compte_id)}>
                  <span className="esp-item-haut">
                    <span style={{ fontWeight: 600 }}>{a.compte_nom}</span>
                    <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
                    {a.compte_niveau === "eteint" ? <Pastille teinte="noir" contour>Compte inactif</Pastille> : null}
                    {a.plus_vue ? <Pastille teinte="ambre" contour>Absente du dernier export</Pastille> : null}
                  </span>
                  <span className="esp-item-montant">{a.valeur_ht !== null ? montant(a.valeur_ht) : "—"}</span>
                  <span className="esp-item-titre">
                    {a.type === "intervention" ? "Intervention" : "Commande"} <span className="esp-mono">{a.reference}</span>
                    {a.libelle ? ` — ${a.libelle}` : ""}
                  </span>
                  <span className="esp-item-bas">
                    <span>{a.jours} jour{a.jours > 1 ? "s" : ""} d&apos;attente, depuis le {dateCourte(a.disponible_le)}</span>
                    {a.motif && a.statut !== "decision" ? <span>{a.motif}</span> : null}
                  </span>
                </button>
                {a.statut === "decision" ? (
                  <div className="esp-carte-corps" style={{ paddingTop: 0 }}>
                    <p className="esp-kpi-sous" style={{ margin: "0 0 6px" }}>{a.motif}</p>
                    {ouvert === a.id ? (
                      <div className="esp-form">
                        <div className="esp-form-ligne">
                          <label className="rv-libelle">Décision
                            <select className="rv-champ" value={decision} onChange={(e) => setDecision(e.target.value as DecisionAffaire)}>
                              {DECISIONS.map((d) => <option key={d.cle} value={d.cle}>{d.libelle}</option>)}
                            </select>
                          </label>
                          <label className="rv-libelle">Pourquoi <span className="esp-obligatoire">(obligatoire)</span>
                            <input className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Le client a annulé par téléphone." />
                          </label>
                        </div>
                        <div className="esp-actions">
                          <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi || !motif.trim()} onClick={() => void agir(a.id, "decider")}>Noter la décision</button>
                          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setOuvert(null)}>Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <div className="esp-actions" style={{ flexWrap: "wrap" }}>
                        <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => { setOuvert(a.id); setDecision("garder"); setMotif(""); }}>Décider</button>
                        <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => void agir(a.id, "retirer")}>Le client l&apos;a retirée</button>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
