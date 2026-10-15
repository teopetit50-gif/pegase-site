"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le tableau des honoraires du cabinet (06/10/2026, session B4)

   Pour les avocats du cabinet : une ligne par dossier qu'on voit (la RLS
   en décide, murailles comprises), calculée comme la carte Honoraires
   du dossier (resumer) : convention, temps non facturé, à facturer,
   provisions disponibles, reste dû, et ce qui demande un geste (pas de
   convention, forfait presque consommé, facture impayée depuis plus de
   trente jours). Les références se lisent si la clé du dossier est
   ouverte dans ce navigateur. L'export CSV est composé ici, rien ne
   part au serveur.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Download, Scale } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Def, Pastille } from "../ui";
import { honorairesExemple } from "./exemples";
import { MODES_HONORAIRES, resumer } from "./HonorairesTamila";
import * as portes from "./portes";
import { consommationForfait } from "./temps";
import type { Clair, Dossier, Honoraires } from "./types";

type Props = {
  ouvert: boolean;
  onFermer: () => void;
  source: Source;
  clientId: string;
  dossiers: { dossier: Dossier; clair: Clair | null }[];
  nomDe: (id: string | null | undefined) => string;
  onOuvrir: (dossier: string) => void;
};

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const heures = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
const JOUR = 86_400_000;

type Ligne = {
  dossier: Dossier;
  reference: string;
  intitule: string | null;
  responsable: string;
  convention: string;
  minutes: number;
  aFacturer: number;
  provisions: number;
  resteDu: number;
  factureAnnee: number;
  encaisseAnnee: number;
  signaux: { texte: string; teinte: "rouge" | "ambre" }[];
};

export default function HonorairesCabinet({ ouvert, onFermer, source, clientId, dossiers, nomDe, onOuvrir }: Props) {
  /* undefined : lecture ; null : la base n'a pas les honoraires */
  const [lu, setLu] = useState<{ par: Record<string, Honoraires> | null; le: number } | undefined>(undefined);
  const par = lu === undefined ? undefined : lu.par;
  const [filtre, setFiltre] = useState<"tous" | "a_facturer" | "signaux">("tous");

  useEffect(() => {
    if (!ouvert) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const x = source === "exemple" ? Object.fromEntries(dossiers.map((d) => [d.dossier.id, honorairesExemple(d.dossier.id)])) : await portes.chargerHonorairesCabinet(clientId);
      if (actif) setLu({ par: x, le: Date.now() });
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [ouvert, source, clientId, dossiers]);

  const lignes: Ligne[] = useMemo(() => {
    if (!lu?.par) return [];
    const par = lu.par;
    const maintenant = lu.le;
    const annee = new Date(maintenant).getFullYear().toString();
    return dossiers
      .filter((x) => x.dossier.statut !== "efface" && x.dossier.statut !== "refuse")
      .map(({ dossier, clair }) => {
        const h = par[dossier.id] ?? { convention: null, conventions: [], temps: [], provisions: [], factures: [] };
        const r = resumer(h, dossier, maintenant);
        const c = h.convention;
        const forfait = consommationForfait(c, h);
        const signaux: Ligne["signaux"] = [];
        if (r.sansConvention) signaux.push({ texte: "Sans convention signée", teinte: "rouge" });
        const impayees = h.factures.filter((f) => f.statut === "emise" && maintenant - Date.parse(`${f.emise_le}T12:00:00Z`) > 30 * JOUR);
        if (impayees.length) signaux.push({ texte: `${impayees.length} facture${impayees.length > 1 ? "s" : ""} impayée${impayees.length > 1 ? "s" : ""} depuis plus de 30 jours`, teinte: "rouge" });
        if (forfait?.pct !== null && forfait?.pct !== undefined && forfait.pct >= 80) signaux.push({ texte: `Forfait consommé à ${forfait.pct} %`, teinte: forfait.pct >= 100 ? "rouge" : "ambre" });
        if (dossier.statut === "clos" && r.aFacturerHt > 0) signaux.push({ texte: "Clos avec du temps non facturé", teinte: "ambre" });
        return {
          dossier,
          reference: clair?.reference ?? "Chiffré",
          intitule: clair?.intitule ?? null,
          responsable: nomDe(dossier.responsable_id),
          convention: c ? `${MODES_HONORAIRES[c.mode]}${c.statut === "signee" ? "" : c.urgence ? " (urgence)" : " (non signée)"}` : "Aucune",
          minutes: r.minutes,
          aFacturer: r.aFacturerHt,
          provisions: r.provisionsDispo,
          resteDu: r.resteDu,
          factureAnnee: h.factures.filter((f) => f.statut !== "annulee" && f.emise_le.startsWith(annee)).reduce((s, f) => s + f.total_ttc_cents, 0),
          encaisseAnnee: h.factures.filter((f) => f.statut === "payee" && (f.payee_le ?? "").startsWith(annee)).reduce((s, f) => s + f.total_ttc_cents, 0),
          signaux,
        };
      })
      .sort((a, b) => b.signaux.length - a.signaux.length || b.aFacturer + b.resteDu - (a.aFacturer + a.resteDu));
  }, [lu, dossiers, nomDe]);

  const visibles = lignes.filter((l) => (filtre === "a_facturer" ? l.aFacturer > 0 : filtre === "signaux" ? l.signaux.length > 0 : true));
  const total = (k: "minutes" | "aFacturer" | "provisions" | "resteDu" | "factureAnnee" | "encaisseAnnee") => lignes.reduce((s, l) => s + l[k], 0);

  const exporter = () => {
    const champ = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const tete = ["Référence", "Intitulé", "Responsable", "Statut", "Convention", "Temps non facturé (min)", "À facturer HT (€)", "Provisions disponibles (€)", "Reste dû (€)", "Facturé TTC dans l'année (€)", "Encaissé TTC dans l'année (€)", "À faire"];
    const corps = lignes.map((l) => [l.reference, l.intitule ?? "", l.responsable, l.dossier.statut, l.convention, l.minutes, (l.aFacturer / 100).toFixed(2), (l.provisions / 100).toFixed(2), (l.resteDu / 100).toFixed(2), (l.factureAnnee / 100).toFixed(2), (l.encaisseAnnee / 100).toFixed(2), l.signaux.map((s) => s.texte).join(" ; ")]);
    const csv = "﻿" + [tete, ...corps].map((r) => r.map(champ).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `honoraires-cabinet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="tam-cabinet-dialogue">
        <DialogHeader>
          <DialogIcone><Scale width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Honoraires du cabinet</DialogTitle>
          <DialogDescription>Les dossiers que vous voyez, calculés comme dans chaque dossier. Les références se lisent quand la clé du dossier est ouverte dans ce navigateur ; l&apos;export est composé ici.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {par === undefined ? (
            <p className="esp-kpi-sous"><Loader variant="spin" /> Lecture des honoraires…</p>
          ) : par === null ? (
            <Avis teinte="gris">Les honoraires ne sont pas encore installés sur cette base.</Avis>
          ) : (
            <div className="esp-form">
              <dl className="esp-def esp-def--trois tam-cabinet-totaux">
                <Def etiquette="À facturer" fort>{euros(total("aFacturer"))} HT<span className="esp-kpi-sous"> · {heures(total("minutes"))} non facturées</span></Def>
                <Def etiquette="Reste dû">{euros(total("resteDu"))}<span className="esp-kpi-sous"> · provisions disponibles {euros(total("provisions"))}</span></Def>
                <Def etiquette={`Facturé en ${new Date().getFullYear()}`}>{euros(total("factureAnnee"))} TTC<span className="esp-kpi-sous"> · encaissé {euros(total("encaisseAnnee"))}</span></Def>
              </dl>
              <div className="esp-actions tam-cabinet-filtres" role="group" aria-label="Filtrer les dossiers">
                {([["tous", "Tous"], ["a_facturer", "À facturer"], ["signaux", "À traiter"]] as const).map(([k, l]) => (
                  <button key={k} type="button" className={`r-btn r-btn--petit ${filtre === k ? "r-btn--noir" : "r-btn--fil"}`} aria-pressed={filtre === k} onClick={() => setFiltre(k)}>
                    {l} ({k === "tous" ? lignes.length : k === "a_facturer" ? lignes.filter((x) => x.aFacturer > 0).length : lignes.filter((x) => x.signaux.length).length})
                  </button>
                ))}
              </div>
              <div className="tam-cabinet-table" role="region" aria-label="Honoraires par dossier" tabIndex={0}>
                <table>
                  <thead>
                    <tr><th scope="col">Dossier</th><th scope="col">Convention</th><th scope="col" className="tam-num">Non facturé</th><th scope="col" className="tam-num">À facturer HT</th><th scope="col" className="tam-num">Provisions</th><th scope="col" className="tam-num">Reste dû</th><th scope="col">À faire</th></tr>
                  </thead>
                  <tbody>
                    {visibles.length === 0 ? <tr><td colSpan={7} className="esp-kpi-sous">Rien dans cette famille.</td></tr> : visibles.map((l) => (
                      <tr key={l.dossier.id}>
                        <td>
                          <button type="button" className="esp-lien-bouton esp-mono" onClick={() => { onOuvrir(l.dossier.id); onFermer(); }}>{l.reference}</button>
                          <div className="esp-kpi-sous">{l.intitule ?? "intitulé chiffré"} · {l.responsable}</div>
                        </td>
                        <td>{l.convention}</td>
                        <td className="tam-num">{l.minutes ? heures(l.minutes) : "—"}</td>
                        <td className="tam-num">{l.aFacturer ? euros(l.aFacturer) : "—"}</td>
                        <td className="tam-num">{l.provisions ? euros(l.provisions) : "—"}</td>
                        <td className="tam-num">{l.resteDu ? euros(l.resteDu) : "—"}</td>
                        <td>{l.signaux.length ? l.signaux.map((s) => <Pastille key={s.texte} teinte={s.teinte}>{s.texte}</Pastille>) : <span className="esp-kpi-sous">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--fil" onClick={onFermer}>Fermer</button>
          <button type="button" className="r-btn r-btn--noir" disabled={!par || !lignes.length} onClick={exporter}><Download width={15} height={15} aria-hidden="true" /> Exporter (CSV)</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
