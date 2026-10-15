"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les disponibilités des sous-traitants, 30 jours (11/10/2026, session B6, b6_31)

   Dans l'annuaire : pour chaque sous-traitant, ses passages prévus et ses
   absences notées sur les 30 prochains jours. Une absence se note (du, au,
   motif) et s'annule ; les remplaçants proposés ne sont que des
   sous-traitants libres ces jours-là. En exemple, les passages viennent du
   chantier affiché et les absences restent en mémoire.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Source } from "../source";
import { dateCourte } from "../format";
import { Avis } from "../ui";
import { annulerIndisponibilite, chargerDisponibilites, noterIndisponibilite } from "./portes";
import type { Disponibilite, Tableau } from "./types";

const iso = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
const plus = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function DisponibilitesBloc({ tableau, source }: { tableau: Tableau; source: Source }) {
  const du = plus(0);
  const au = plus(30);
  const [reel, setReel] = useState<Disponibilite[] | null>(null);
  const [absencesLocales, setAbsencesLocales] = useState<Record<string, Disponibilite["absences"]>>({});
  const [form, setForm] = useState<{ tiers: string; du: string; au: string; motif: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lire = useCallback(async () => {
    try { setReel(await chargerDisponibilites(tableau.chantier.client_id, du, au)); }
    catch (e) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); }
  }, [tableau.chantier.client_id, du, au]);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, lire]);

  const liste: Disponibilite[] = useMemo(() => {
    if (source === "reelle") return reel ?? [];
    return tableau.tiers.filter((t) => t.actif && t.roles.includes("sous_traitant")).map((t) => ({
      tiers: t.id, nom: t.nom, absences: absencesLocales[t.id] ?? [],
      passages: tableau.passages.filter((p) => p.tiers_id === t.id && p.statut === "prevu" && p.debut <= au && p.fin >= du)
        .map((p) => ({ passage: p.id, chantier: tableau.chantier.nom, tache: p.tache, debut: p.debut, fin: p.fin })),
    }));
  }, [source, reel, tableau, absencesLocales, du, au]);

  const noter = async () => {
    if (!form) return;
    setEnvoi(true); setErreur(null);
    try {
      if (form.au < form.du) throw new Error("Une absence a un premier et un dernier jour, dans cet ordre.");
      if (source === "reelle") { await noterIndisponibilite(form.tiers, form.du, form.au, form.motif.trim() || null); await lire(); }
      else setAbsencesLocales((a) => ({ ...a, [form.tiers]: [...(a[form.tiers] ?? []), { id: nid(), du: form.du, au: form.au, motif: form.motif.trim() || null }] }));
      setForm(null);
    } catch (e) { setErreur(e instanceof Error ? e.message : "La base a refusé l'absence."); }
    finally { setEnvoi(false); }
  };
  const annuler = async (tiers: string, id: string) => {
    setEnvoi(true); setErreur(null);
    try {
      if (source === "reelle") { await annulerIndisponibilite(id); await lire(); }
      else setAbsencesLocales((a) => ({ ...a, [tiers]: (a[tiers] ?? []).filter((x) => x.id !== id) }));
    } catch (e) { setErreur(e instanceof Error ? e.message : "La base a refusé l'annulation."); }
    finally { setEnvoi(false); }
  };

  if (!liste.length && source !== "reelle") return null;
  return (
    <div style={{ marginTop: 10 }} aria-label="Disponibilités des sous-traitants">
      <div className="esp-kpi-sous" style={{ fontWeight: 600 }}>Disponibilités des sous-traitants, du {dateCourte(du)} au {dateCourte(au)}</div>
      {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
      <ul className="esp-fil">
        {liste.map((d) => (
          <li key={d.tiers}>
            <span className="esp-fil-point" data-teinte={d.absences.length ? "ambre" : d.passages.length ? undefined : "vert"} />
            <div>
              <div className="esp-fil-texte"><strong>{d.nom}</strong> — {!d.absences.length && !d.passages.length ? "libre sur la période" : `${d.passages.length} passage${d.passages.length > 1 ? "s" : ""} prévu${d.passages.length > 1 ? "s" : ""}${d.absences.length ? `, ${d.absences.length} absence${d.absences.length > 1 ? "s" : ""}` : ""}`}</div>
              <div className="esp-fil-meta">
                {d.passages.map((p) => <span key={p.passage}>{p.chantier} : {p.tache ?? "passage"} ({dateCourte(p.debut)}{p.fin !== p.debut ? ` → ${dateCourte(p.fin)}` : ""}) · </span>)}
                {d.absences.map((a) => <span key={a.id}>absent du {dateCourte(a.du)} au {dateCourte(a.au)}{a.motif ? ` (${a.motif})` : ""} <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => void annuler(d.tiers, a.id)}>Annuler</button> · </span>)}
                <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => setForm({ tiers: d.tiers, du, au: du, motif: "" })}>Noter une absence</button>
              </div>
              {form?.tiers === d.tiers ? (
                <div className="esp-form" style={{ gridTemplateColumns: "minmax(0, 1fr)", marginTop: 6 }}>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Du<input className="rv-champ" type="date" value={form.du} onChange={(e) => setForm({ ...form, du: e.target.value })} /></label>
                    <label className="rv-libelle">Au<input className="rv-champ" type="date" value={form.au} min={form.du} onChange={(e) => setForm({ ...form, au: e.target.value })} /></label>
                  </div>
                  <label className="rv-libelle">Motif<input className="rv-champ" maxLength={200} value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Congés, autre chantier" /></label>
                  <div className="esp-actions" style={{ marginTop: 0 }}>
                    <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi || !form.du || !form.au} onClick={() => void noter()}>Noter l&apos;absence</button>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setForm(null)}>Fermer</button>
                  </div>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
