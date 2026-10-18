"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le point du mois (11/10/2026, session B6, b6_30)

   Ce que la page promet aux formules Chantiers et Entreprise : chaque mois,
   les travaux repérés rapprochés des travaux facturés. Par chantier : les
   avenants repérés dans les photos et vocaux, ceux signés, ceux qui
   attendent depuis plus de 14 jours, et ce qui reste à facturer des
   avenants signés (cumul de la dernière situation validée). En exemple,
   calculé sur les chantiers d'exemple.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { montant } from "../format";
import { Avis } from "../ui";
import { formuleQuiOuvre, ouverte } from "./fonctions";
import { pointMensuel } from "./portes";
import type { PointChantier, PointMensuel, Tableau } from "./types";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const premierDu = (decalage: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + decalage); return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-01`; };
const libelleMois = (iso: string) => `${MOIS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const jour = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

/* Le même calcul que public.btp_point_mensuel, sur les tableaux d'exemple. */
function pointExemple(tableaux: Tableau[], mois: string): PointMensuel {
  const du = mois;
  const fin = new Date(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)), 0);
  const au = `${fin.getFullYear()}-${`${fin.getMonth() + 1}`.padStart(2, "0")}-${`${fin.getDate()}`.padStart(2, "0")}`;
  const relance = new Date(fin); relance.setDate(relance.getDate() - 14);
  const limite = `${relance.getFullYear()}-${`${relance.getMonth() + 1}`.padStart(2, "0")}-${`${relance.getDate()}`.padStart(2, "0")}`;
  const dans = (d: string) => d >= du && d <= au;
  const chantiers: PointChantier[] = [];
  for (const t of tableaux) {
    const c = t.chantier;
    if (!["ouvert", "suspendu", "receptionne"].includes(c.statut)) continue;
    const av = t.avenants.map((a) => ({ ...a, mt: a.montant_ht ?? 0, cree: jour(a.cree_le), lu: a.origine?.lecteur === true }));
    const reperes = av.filter((a) => a.lu && dans(a.cree));
    const signes = av.filter((a) => a.statut === "signe" && dans(jour(a.signe_le)));
    const attente = av.filter((a) => (a.statut === "brouillon" || a.statut === "soumis") && a.cree <= limite);
    const signeTotal = av.filter((a) => a.statut === "signe" && jour(a.signe_le) <= au).reduce((s, a) => s + a.mt, 0);
    const derniere = (t.situations ?? []).filter((s) => s.statut === "validee").sort((a, b) => b.numero - a.numero)[0];
    const facture = derniere ? derniere.lignes.filter((l) => l.origine === "avenant").reduce((s, l) => s + l.cumule_ht, 0) : 0;
    const p: PointChantier = {
      chantier: c.id, nom: c.nom, statut: c.statut,
      reperes: { nombre: reperes.length, montant_ht: reperes.reduce((s, a) => s + a.mt, 0) },
      saisis: av.filter((a) => !a.lu && dans(a.cree)).length,
      signes: { nombre: signes.length, montant_ht: signes.reduce((s, a) => s + a.mt, 0) },
      a_relancer: { nombre: attente.length, montant_ht: attente.reduce((s, a) => s + a.mt, 0) },
      perdus: av.filter((a) => (a.statut === "refuse" || a.statut === "abandonne") && dans(jour(a.cree_le))).length,
      signe_total: signeTotal, facture_total: facture, reste_a_facturer: Math.max(signeTotal - facture, 0),
    };
    if (p.reperes.nombre + p.saisis + p.signes.nombre + p.a_relancer.nombre + p.perdus > 0 || p.reste_a_facturer > 0) chantiers.push(p);
  }
  const somme = (f: (p: PointChantier) => number) => chantiers.reduce((s, p) => s + f(p), 0);
  return { mois: mois.slice(0, 7), du, au, chantiers,
           totaux: { reperes: somme((p) => p.reperes.nombre), reperes_ht: somme((p) => p.reperes.montant_ht), signes: somme((p) => p.signes.nombre),
                     signes_ht: somme((p) => p.signes.montant_ht), a_relancer: somme((p) => p.a_relancer.nombre), a_relancer_ht: somme((p) => p.a_relancer.montant_ht),
                     reste_a_facturer: somme((p) => p.reste_a_facturer) } };
}

type Props = { source: Source; client: string | null; tableaux: Tableau[] };

export default function PointMensuelCarte({ source, client, tableaux }: Props) {
  const [decalage, setDecalage] = useState(0);
  const [reel, setReel] = useState<{ mois: string; point: PointMensuel } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const mois = premierDu(decalage);
  const premier = tableaux[0];
  const ferme = premier ? !ouverte(premier, "point_mensuel") : false;
  const voitPrix = premier ? premier.voit_prix : true;

  const lire = useCallback(async (m: string) => {
    if (!client) return;
    try { setErreur(null); setReel({ mois: m, point: await pointMensuel(client, m) }); }
    catch (e) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); }
  }, [client]);
  useEffect(() => {
    if (source !== "reelle" || ferme || !voitPrix) return;
    const t = window.setTimeout(() => void lire(mois), 0);
    return () => window.clearTimeout(t);
  }, [source, mois, lire, ferme, voitPrix]);

  const point = useMemo(() => (source === "reelle" ? (reel?.mois === mois ? reel.point : null) : pointExemple(tableaux, mois)), [source, reel, mois, tableaux]);
  if (!voitPrix || (source === "reelle" && !client)) return null;

  return (
    <section className="esp-carte" aria-label="Point du mois">
      <div className="esp-carte-tete">
        <div className="esp-section-titre" style={{ margin: 0 }}>Point du mois — travaux repérés, signés, facturés</div>
        <div className="esp-actions" style={{ marginTop: 0 }} role="group" aria-label="Mois du point">
          <button type="button" className={`r-btn r-btn--petit ${decalage === -1 ? "r-btn--noir" : "r-btn--fil"}`} aria-pressed={decalage === -1} onClick={() => setDecalage(-1)}>Mois dernier</button>
          <button type="button" className={`r-btn r-btn--petit ${decalage === 0 ? "r-btn--noir" : "r-btn--fil"}`} aria-pressed={decalage === 0} onClick={() => setDecalage(0)}>Ce mois</button>
        </div>
      </div>
      {ferme ? <p className="esp-kpi-sous">Le point mensuel est compris dans la formule {formuleQuiOuvre("point_mensuel")}.</p>
        : erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis>
        : !point ? <Loader variant="spin" />
        : (
          <>
            <p className="esp-kpi-sous" style={{ marginTop: 0 }}>
              {libelleMois(point.du)}{source !== "reelle" ? " (exemple)" : ""} : {point.totaux.reperes} repéré{point.totaux.reperes > 1 ? "s" : ""} ({montant(point.totaux.reperes_ht)}),
              {" "}{point.totaux.signes} signé{point.totaux.signes > 1 ? "s" : ""} ({montant(point.totaux.signes_ht)}),
              {" "}{point.totaux.a_relancer} à relancer ({montant(point.totaux.a_relancer_ht)}) ; reste à facturer sur les avenants signés : <strong>{montant(point.totaux.reste_a_facturer)}</strong>.
            </p>
            {point.chantiers.length ? (
              <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Point du mois par chantier (tableau qui défile)">
                <table className="esp-tableau">
                  <thead><tr><th>Chantier</th><th className="esp-num">Repérés</th><th className="esp-num">Signés</th><th className="esp-num">À relancer</th><th className="esp-num">Signé / facturé</th><th className="esp-num">Reste à facturer</th></tr></thead>
                  <tbody>
                    {point.chantiers.map((p) => (
                      <tr key={p.chantier}>
                        <td>{p.nom}{p.perdus ? <span className="esp-kpi-sous"> · {p.perdus} perdu{p.perdus > 1 ? "s" : ""}</span> : null}</td>
                        <td className="esp-num">{p.reperes.nombre}{p.reperes.nombre ? <span className="esp-kpi-sous"> · {montant(p.reperes.montant_ht)}</span> : null}</td>
                        <td className="esp-num">{p.signes.nombre}{p.signes.nombre ? <span className="esp-kpi-sous"> · {montant(p.signes.montant_ht)}</span> : null}</td>
                        <td className="esp-num">{p.a_relancer.nombre}{p.a_relancer.nombre ? <span className="esp-kpi-sous"> · {montant(p.a_relancer.montant_ht)}</span> : null}</td>
                        <td className="esp-num" style={{ whiteSpace: "nowrap" }}>{montant(p.signe_total)} / {montant(p.facture_total)}</td>
                        <td className="esp-num"><strong>{montant(p.reste_a_facturer)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="esp-kpi-sous">Rien à rapprocher ce mois-là.</p>}
          </>
        )}
    </section>
  );
}
