"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le pilotage du cabinet (06/10/2026, session B4, carnet n° 5)

   Pour les avocats : cinq vues calculées dans le navigateur (pilotage.ts)
   sur ce que la RLS laisse voir — marge par dossier, charge par
   personne, séries, dossiers sans diligence, pièces attendues. Le coût
   de revient horaire se règle ici et reste dans ce navigateur.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { conformiteExemple, expertisesExemple, honorairesExemple } from "./exemples";
import { charges, marges, piecesAttendues, sansDiligence, series, type DonneesPilotage } from "./pilotage";
import * as portes from "./portes";
import { libelleMatiere } from "./regles";
import type { Audience, Clair, Delai, Dossier, DossierComplet, Personne } from "./types";

type Props = {
  ouvert: boolean;
  onFermer: () => void;
  source: Source;
  clientId: string;
  dossiers: { dossier: Dossier; clair: Clair | null }[];
  delais: Delai[];
  audiences: Audience[];
  personnes: Personne[];
  /* en exemple : les dossiers complets en mémoire */
  exemple: DossierComplet[];
  onOuvrir: (dossier: string) => void;
};

type Vue = "marge" | "charge" | "series" | "diligence" | "pieces";
const VUES: { cle: Vue; libelle: string }[] = [
  { cle: "marge", libelle: "Marge" }, { cle: "charge", libelle: "Charge" }, { cle: "series", libelle: "Séries" },
  { cle: "diligence", libelle: "Sans diligence" }, { cle: "pieces", libelle: "Pièces attendues" },
];
const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const heures = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
const CLE_COUT = "omega.tamila.cout_horaire";

function coutMemorise(): number {
  try {
    const v = parseInt(window.localStorage.getItem(CLE_COUT) ?? "", 10);
    return Number.isFinite(v) && v >= 1000 && v <= 100000 ? v : 9000;
  } catch {
    return 9000;
  }
}

export default function PilotageCabinet({ ouvert, onFermer, source, clientId, dossiers, delais, audiences, personnes, exemple, onOuvrir }: Props) {
  const [lu, setLu] = useState<{ x: Omit<DonneesPilotage, "dossiers" | "delais" | "audiences" | "personnes">; le: number } | null | undefined>(undefined);
  const [vue, setVue] = useState<Vue>("marge");
  const [cout, setCout] = useState<number>(9000);

  useEffect(() => {
    if (!ouvert) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setCout(coutMemorise());
      try {
        const x = source === "exemple"
          ? {
              honoraires: Object.fromEntries(exemple.map((c) => [c.dossier.id, honorairesExemple(c.dossier.id)])),
              avis: exemple.flatMap((c) => c.avis.map((a) => ({ dossier_id: a.dossier_id, date_avis: a.date_avis }))),
              pieces: exemple.flatMap((c) => c.pieces.map((p) => ({ objet_id: c.dossier.id, recue_le: p.recue_le, type_piece: p.type_piece }))),
              vigilances: exemple.flatMap((c) => { const v = conformiteExemple(c.dossier.id).vigilance; return v ? [v] : []; }),
              expertises: exemple.flatMap((c) => expertisesExemple(c.dossier.id)),
            }
          : await portes.chargerPilotage(clientId);
        if (actif) setLu({ x, le: Date.now() });
      } catch {
        if (actif) setLu(null);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [ouvert, source, clientId, exemple]);

  const donnees: DonneesPilotage | null = useMemo(() => (lu ? { ...lu.x, dossiers, delais, audiences, personnes } : null), [lu, dossiers, delais, audiences, personnes]);
  const m = useMemo(() => (donnees && lu ? marges(donnees, cout, lu.le) : []), [donnees, cout, lu]);
  const c = useMemo(() => (donnees && lu ? charges(donnees, lu.le) : []), [donnees, lu]);
  const s = useMemo(() => (donnees ? series(donnees) : []), [donnees]);
  const sd = useMemo(() => (donnees && lu ? sansDiligence(donnees, lu.le) : []), [donnees, lu]);
  const pa = useMemo(() => (donnees && lu ? piecesAttendues(donnees, lu.le) : []), [donnees, lu]);
  const compte: Record<Vue, number> = { marge: m.filter((x) => x.margeCents < 0).length, charge: c.length, series: s.length, diligence: sd.length, pieces: pa.length };

  const poserCout = (texte: string) => {
    const v = Math.round(parseFloat(texte.replace(",", ".")) * 100);
    if (!Number.isFinite(v) || v < 1000 || v > 100000) return;
    setCout(v);
    try {
      window.localStorage.setItem(CLE_COUT, String(v));
    } catch {
      /* le réglage vaut pour la séance */
    }
  };
  const ref = (d: Dossier, clair: Clair | null) => (
    <button type="button" className="esp-lien-bouton esp-mono" onClick={() => { onOuvrir(d.id); onFermer(); }}>{clair?.reference ?? "Chiffré"}</button>
  );

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="tam-cabinet-dialogue">
        <DialogHeader>
          <DialogIcone><Gauge width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Pilotage du cabinet</DialogTitle>
          <DialogDescription>Calculé dans votre navigateur, sur les dossiers que vous voyez. Les références et les noms des séries se lisent quand la clé du dossier est ouverte ici.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {lu === undefined ? (
            <p className="esp-kpi-sous"><Loader variant="spin" /> Lecture du cabinet…</p>
          ) : lu === null ? (
            <Avis teinte="rouge" role="alert">La base n&apos;a pas répondu.</Avis>
          ) : (
            <div className="esp-form">
              <div className="esp-actions tam-cabinet-filtres" role="group" aria-label="Vues du pilotage">
                {VUES.map((v) => (
                  <button key={v.cle} type="button" className={`r-btn r-btn--petit ${vue === v.cle ? "r-btn--noir" : "r-btn--fil"}`} aria-pressed={vue === v.cle} onClick={() => setVue(v.cle)}>
                    {v.libelle}{compte[v.cle] ? ` (${compte[v.cle]})` : ""}
                  </button>
                ))}
              </div>

              {vue === "marge" ? (
                <>
                  <label className="rv-libelle tam-cout">Coût de revient d&apos;une heure (€, reste dans ce navigateur)
                    <input className="rv-champ" inputMode="decimal" defaultValue={String(cout / 100)} key={cout} onBlur={(e) => poserCout(e.target.value)} />
                  </label>
                  <div className="tam-cabinet-table" role="region" aria-label="Marge par dossier" tabIndex={0}>
                    <table>
                      <thead><tr><th scope="col">Dossier</th><th scope="col" className="tam-num">Temps passé</th><th scope="col" className="tam-num">Facturé et à facturer HT</th><th scope="col" className="tam-num">Coût du temps</th><th scope="col" className="tam-num">Marge</th><th scope="col" className="tam-num">Taux réalisé</th></tr></thead>
                      <tbody>
                        {m.length === 0 ? <tr><td colSpan={6} className="esp-kpi-sous">Aucun temps ni honoraire saisi.</td></tr> : m.map((x) => (
                          <tr key={x.dossier.id}>
                            <td>{ref(x.dossier, x.clair)}</td>
                            <td className="tam-num">{heures(x.minutes)}</td>
                            <td className="tam-num">{euros(x.factureHt + x.aFacturerHt)}</td>
                            <td className="tam-num">{euros(x.coutCents)}</td>
                            <td className="tam-num"><Pastille teinte={x.margeCents < 0 ? "rouge" : "vert"}>{euros(x.margeCents)}</Pastille></td>
                            <td className="tam-num">{x.tauxRealiseCents ? `${euros(x.tauxRealiseCents)} / h` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}

              {vue === "charge" ? (
                <div className="tam-cabinet-table" role="region" aria-label="Charge par personne" tabIndex={0}>
                  <table>
                    <thead><tr><th scope="col">Personne</th><th scope="col" className="tam-num">Temps saisi (30 jours)</th><th scope="col" className="tam-num">Dossiers dont responsable</th><th scope="col" className="tam-num">Délais à 30 jours</th><th scope="col" className="tam-num">Audiences à 30 jours</th></tr></thead>
                    <tbody>
                      {c.map((x) => (
                        <tr key={x.personne.user_id}>
                          <td>{x.personne.nom}</td>
                          <td className="tam-num">{heures(x.minutes30)}</td>
                          <td className="tam-num">{x.dossiers}</td>
                          <td className="tam-num">{x.delais30}</td>
                          <td className="tam-num">{x.audiences30}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {vue === "series" ? (
                s.length === 0 ? <p className="esp-kpi-sous">Aucune série : pas deux dossiers contre la même partie, ni trois dans la même matière devant la même juridiction.</p> : s.map((x) => (
                  <div key={x.cle} className="tam-ligne">
                    <div className="tam-ligne-haut">
                      <span className="tam-ligne-titre">{x.nature === "partie" ? x.libelle : `${libelleMatiere(x.dossiers[0].dossier.matiere ?? "")} · ${x.libelle}`}</span>
                      <Pastille teinte="bleu">{x.dossiers.length} dossiers</Pastille>
                      <Pastille teinte="gris" contour>{x.nature === "partie" ? "Même partie" : "Même matière, même juridiction"}</Pastille>
                    </div>
                    <div className="tam-ligne-meta">{x.dossiers.map((d) => <span key={d.dossier.id}>{ref(d.dossier, d.clair)}</span>)}</div>
                  </div>
                ))
              ) : null}

              {vue === "diligence" ? (
                sd.length === 0 ? <p className="esp-kpi-sous">Chaque dossier vivant a bougé dans les 45 derniers jours.</p> : sd.map((x) => (
                  <div key={x.dossier.id} className="tam-ligne">
                    <div className="tam-ligne-haut">
                      {ref(x.dossier, x.clair)}
                      <Pastille teinte={x.jours >= 90 ? "rouge" : "ambre"}>{x.jours} jours sans diligence</Pastille>
                    </div>
                    <div className="tam-ligne-meta"><span>Dernier mouvement le {dateCourte(x.derniere)} (temps, acte, audience, avis ou pièce)</span></div>
                  </div>
                ))
              ) : null}

              {vue === "pieces" ? (
                pa.length === 0 ? <p className="esp-kpi-sous">Aucune pièce attendue.</p> : pa.map((x, i) => (
                  <div key={`${x.dossier.id}-${i}`} className="tam-ligne">
                    <div className="tam-ligne-haut">
                      {ref(x.dossier, x.clair)}
                      <Pastille teinte={x.gravite}>{x.quoi}</Pastille>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--fil" onClick={onFermer}>Fermer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
