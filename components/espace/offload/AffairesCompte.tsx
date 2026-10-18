"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — les affaires d'un compte dans sa fiche (c4_08, 06/10/2026)

   Ce que le compte n'est pas venu reprendre, y compris s'il n'achète plus
   (la pièce commandée pour un compte inactif reste rattachée à sa fiche),
   et ce qui a été retiré ou clos sans suite, à part. Deux gestes en base
   réelle : saisir une affaire, noter un retrait.
   Lecture : public.offload_affaires_compte(p_compte) ; écriture :
   public.offload_saisir_affaire, public.offload_retirer_affaire.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { dateCourte, montant } from "../format";
import type { Source } from "../source";
import { Avis, Pastille } from "../ui";
import { STATUTS_AFFAIRE, affairesExemple } from "./Affaires";
import { chargerAffairesCompte, retirerAffaire, saisirAffaire } from "./portes";
import type { AffaireCompte } from "./types";

const FORM = { reference: "", disponible_le: "", type: "commande", libelle: "", valeur: "" };

function exemple(compte: string): AffaireCompte[] {
  return affairesExemple().affaires.filter((a) => a.compte_id === compte).map((a) => ({
    id: a.id, type: a.type, reference: a.reference, libelle: a.libelle, disponible_le: a.disponible_le, jours: a.jours,
    valeur_ht: a.valeur_ht, statut: a.statut, motif: a.motif, retire_le: null, decision: null,
  }));
}

export default function AffairesCompte({ compte, source }: { compte: string; source: Source }) {
  const [reel, setReel] = useState<AffaireCompte[] | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState(FORM);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const l = await chargerAffairesCompte(compte);
        if (actif) setReel(l);
      } catch (e) {
        if (actif) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); setReel([]); }
      }
    }, 0);
    return () => { actif = false; window.clearTimeout(t); };
  }, [compte, source]);

  const lignes = source === "exemple" ? exemple(compte) : reel;

  const enregistrer = async () => {
    setErreur(null);
    try {
      const valeur = f.valeur.trim() ? Number(f.valeur.replace(/\s/g, "").replace(",", ".")) : undefined;
      if (valeur !== undefined && !Number.isFinite(valeur)) throw new Error("La valeur se donne en euros, par exemple 480 ou 480,50.");
      await saisirAffaire(compte, f.reference.trim(), f.disponible_le, {
        type: f.type, ...(f.libelle.trim() ? { libelle: f.libelle.trim() } : {}), ...(valeur !== undefined ? { valeur_ht: valeur } : {}),
      });
      setReel(await chargerAffairesCompte(compte));
      setFait("Affaire enregistrée : le client sera relancé après le délai de retrait, message en validation.");
      setOuvert(false);
      setF(FORM);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    }
  };

  const retirer = async (affaire: string) => {
    setErreur(null);
    try {
      await retirerAffaire(affaire, null);
      setReel(await chargerAffairesCompte(compte));
      setFait("Retrait noté.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    }
  };

  if (lignes === null) return null;

  return (
    <div style={{ margin: "8px 0 14px" }}>
      {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
      {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
      {lignes.length === 0 ? <p className="esp-kpi-sous">Rien n&apos;attend son retrait pour ce compte.</p> : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          {lignes.map((a) => {
            const s = STATUTS_AFFAIRE[a.statut];
            const close = a.statut === "retiree" || a.statut === "close_sans_suite";
            return (
              <li key={a.id} style={{ border: "1px solid var(--r-filet)", borderRadius: 12, padding: "8px 12px", opacity: close ? 0.7 : 1 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px" }}>
                  <strong>{a.type === "intervention" ? "Intervention" : "Commande"} <span className="esp-mono">{a.reference}</span></strong>
                  <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
                  {a.valeur_ht !== null ? <span className="esp-kpi-sous">{montant(a.valeur_ht)} immobilisés</span> : null}
                </div>
                <div className="esp-kpi-sous">
                  {a.libelle ? `${a.libelle} · ` : ""}
                  {close ? (a.retire_le ? `retirée le ${dateCourte(a.retire_le)}` : a.motif ?? "") : `${a.jours} jour${a.jours > 1 ? "s" : ""} d'attente, depuis le ${dateCourte(a.disponible_le)}`}
                </div>
                {!close && source === "reelle" ? (
                  <button type="button" className="esp-lien-bouton" onClick={() => void retirer(a.id)}>Le client l&apos;a retirée</button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {source === "reelle" ? (
        ouvert ? (
          <div className="esp-form" style={{ marginTop: 8 }}>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Référence <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="CMD-4471" />
              </label>
              <label className="rv-libelle">Disponible depuis le <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" type="date" value={f.disponible_le} onChange={(e) => setF({ ...f, disponible_le: e.target.value })} />
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Nature
                <select className="rv-champ" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                  <option value="commande">Commande arrivée</option><option value="intervention">Intervention terminée</option>
                </select>
              </label>
              <label className="rv-libelle">Valeur HT immobilisée
                <input className="rv-champ" inputMode="decimal" value={f.valeur} onChange={(e) => setF({ ...f, valeur: e.target.value })} placeholder="480" />
              </label>
            </div>
            <label className="rv-libelle">Libellé
              <input className="rv-champ" value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} placeholder="4 pneus hiver 315/70" />
            </label>
            <div className="esp-actions">
              <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!f.reference.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(f.disponible_le)} onClick={() => void enregistrer()}>Enregistrer l&apos;affaire</button>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setOuvert(false)}>Annuler</button>
            </div>
          </div>
        ) : (
          <button type="button" className="esp-lien-bouton" style={{ marginTop: 6 }} onClick={() => { setOuvert(true); setFait(null); }}>Saisir une affaire en attente</button>
        )
      ) : null}
    </div>
  );
}
