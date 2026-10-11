"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — garde-fous de l'écran (c4_10, 11/10/2026, session C4)

   1. L'arrêt au premier doute : quand OFFLOAD s'est arrêté (trop de
      messages non remis, deux messages à la même adresse, volume anormal)
      ou a été suspendu à la main, le bandeau le dit, avec le motif ; seul
      un gérant ou un admin le relance, en disant ce qu'il a vérifié.
   2. Les règles des messages, écrites en français : une phrase, et le
      système répond ce qu'il en fera (ou qu'il ne l'a pas comprise). Un
      message qui enfreint une règle est retenu.
   3. Dans la fiche : un compte « à vérifier » (message non remis,
      interlocuteur parti) et le geste qui lève la vérification.
   Lectures : public.offload_garde_fous() ; écritures : offload_ecrire_regle,
   offload_retirer_regle, offload_suspendre, offload_reprendre,
   offload_lever_verification (en base réelle seulement).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { dateHeure } from "../format";
import type { Source } from "../source";
import { Avis, Chargement, Pastille, type Teinte } from "../ui";
import { chargerGardeFous, ecrireRegle, leverVerification, reprendre, retirerRegle, suspendre } from "./portes";
import type { Compte, GardeFous as Etat, Regle } from "./types";

const STATUTS: Record<Regle["statut"], { libelle: string; teinte: Teinte }> = {
  appliquee: { libelle: "Appliquée", teinte: "vert" },
  en_attente: { libelle: "Pas encore applicable", teinte: "ambre" },
  non_comprise: { libelle: "Non comprise", teinte: "rouge" },
};

const EXEMPLE: Etat = {
  suspendu_le: null,
  suspendu_motif: null,
  seuil_non_remis_pct: 20,
  a_verifier: 1,
  regles: [
    { id: "r1", texte: "Ne propose aucune remise aux anciens clients.", famille: "interdit", statut: "appliquee", cree_le: "",
      reponse: "Compris : « remise » n'apparaît dans aucun message. Un message qui le contiendrait serait retenu." },
    { id: "r2", texte: "Commence toujours par « Madame, Monsieur, »", famille: "salutation", statut: "appliquee", cree_le: "",
      reponse: "Compris : chaque message commence par « Madame, Monsieur, »." },
    { id: "r3", texte: "Ne relance jamais un compte en litige.", famille: "litige", statut: "en_attente", cree_le: "",
      reponse: "Compris, mais je ne sais pas encore quels comptes sont en litige : la règle s'appliquera quand OFFLOAD lira vos impayés (CASHD). D'ici là, excluez ces comptes un par un." },
  ],
};

export default function GardeFous({ source, client }: { source: Source; client: string | null }) {
  const [reel, setReel] = useState<Etat | null>(null);
  const [texte, setTexte] = useState("");
  const [motif, setMotif] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [reponse, setReponse] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    try {
      setReel(await chargerGardeFous());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const etat = source === "exemple" ? EXEMPLE : reel;

  const agir = async (f: () => Promise<unknown>, apres?: (r: unknown) => void) => {
    setErreur(null);
    if (source !== "reelle" || !client) {
      setReponse("Exemple : rien n'est enregistré. En base réelle, le système répond ici ce qu'il fera de votre phrase.");
      return;
    }
    setEnvoi(true);
    try {
      const r = await f();
      apres?.(r);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  if (!etat) return source === "reelle" && !erreur ? <Chargement texte="Lecture des garde-fous…" /> : null;

  return (
    <section className="esp-carte" aria-label="Garde-fous et règles des messages">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Garde-fous et règles des messages</h2>
        <span className="esp-kpi-sous">s&apos;arrête au premier doute ; vos règles s&apos;écrivent en français</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 10 }}>
        {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        {etat.suspendu_le ? (
          <Avis teinte="rouge" role="alert">
            <strong>OFFLOAD est arrêté depuis le {dateHeure(etat.suspendu_le)}.</strong> {etat.suspendu_motif} Aucun message n&apos;est préparé ;
            ceux qui attendaient ont été annulés.
          </Avis>
        ) : (
          <p className="esp-kpi-sous" style={{ margin: 0 }}>
            OFFLOAD surveille ses envois : au-delà de {etat.seuil_non_remis_pct} % de messages non remis sur 7 jours, ou si deux messages visent la même
            adresse, il s&apos;arrête de lui-même et vous le signale.{etat.a_verifier ? ` ${etat.a_verifier} compte${etat.a_verifier > 1 ? "s" : ""} à vérifier.` : ""}
          </p>
        )}
        {ouvert ? (
          <div className="esp-form">
            <label className="rv-libelle">{etat.suspendu_le ? "Ce qui a été vérifié" : "Pourquoi suspendre"} <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)}
                placeholder={etat.suspendu_le ? "Adresses corrigées avec le commercial." : "Salon cette semaine."} />
            </label>
            <div className="esp-actions">
              <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi || !motif.trim()}
                onClick={() => void agir(() => (etat.suspendu_le ? reprendre(client ?? "", motif.trim()) : suspendre(client ?? "", motif.trim())),
                  () => { setOuvert(false); setMotif(""); })}>
                {etat.suspendu_le ? "Relancer OFFLOAD" : "Suspendre OFFLOAD"}
              </button>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setOuvert(false)}>Annuler</button>
            </div>
          </div>
        ) : (
          <div className="esp-actions">
            <button type="button" className={`r-btn r-btn--petit ${etat.suspendu_le ? "r-btn--noir" : "r-btn--fil"}`} onClick={() => setOuvert(true)}>
              {etat.suspendu_le ? "Relancer OFFLOAD (gérant)" : "Suspendre OFFLOAD"}
            </button>
          </div>
        )}

        <div className="esp-section-titre" style={{ marginTop: 4 }}>Vos règles, en français</div>
        <div className="esp-form">
          <label className="rv-libelle">Une phrase suffit
            <input className="rv-champ" value={texte} onChange={(e) => setTexte(e.target.value)}
              placeholder="Ne propose aucune remise aux anciens clients." />
          </label>
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi || texte.trim().length < 3}
              onClick={() => void agir(() => ecrireRegle(client ?? "", texte.trim()), (r) => {
                setReponse((r as { reponse?: string } | null)?.reponse ?? null);
                setTexte("");
              })}>
              Ajouter la règle
            </button>
          </div>
          {reponse ? <Avis teinte="vert" role="status">{reponse}</Avis> : null}
        </div>
        {etat.regles.length === 0 ? <p className="esp-kpi-sous" style={{ margin: 0 }}>Aucune règle : les messages suivent le gabarit, sans prix ni délai, toujours au vouvoiement.</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {etat.regles.map((r) => (
              <li key={r.id} style={{ border: "1px solid var(--r-filet)", borderRadius: 12, padding: "8px 12px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px" }}>
                  <strong>« {r.texte} »</strong>
                  <Pastille teinte={STATUTS[r.statut].teinte}>{STATUTS[r.statut].libelle}</Pastille>
                </div>
                <div className="esp-kpi-sous">{r.reponse}</div>
                {source === "reelle" ? (
                  <button type="button" className="esp-lien-bouton" onClick={() => void agir(() => retirerRegle(r.id))}>Retirer la règle</button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Dans la fiche : un compte « à vérifier », et le geste qui lève la vérification. */
export function Verification({ compte, source, onFait }: { compte: Compte; source: Source; onFait?: () => void }) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  if (!compte.verification || fait) return null;
  const lever = async () => {
    setErreur(null);
    try {
      await leverVerification(compte.id, motif.trim());
      setFait(true);
      onFait?.();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    }
  };
  return (
    <Avis teinte="ambre" role="status">
      <strong>{compte.verification === "reattribuer" ? "À réattribuer" : "À vérifier"} :</strong> {compte.verification_motif ?? "le compte attend une vérification."}{" "}
      Il ne repart dans aucune vague tant que la vérification n&apos;est pas levée.
      {source === "reelle" ? (
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          <input className="rv-champ" style={{ flex: "1 1 200px" }} value={motif} onChange={(e) => setMotif(e.target.value)}
            placeholder={compte.verification === "reattribuer" ? "Nouveau contact : Mme Leroy." : "Adresse corrigée."} aria-label="Ce qui a été vérifié" />
          <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!motif.trim()} onClick={() => void lever()}>Lever la vérification</button>
        </span>
      ) : null}
      {erreur ? <span role="alert" style={{ display: "block", marginTop: 4 }}>{erreur}</span> : null}
    </Avis>
  );
}
