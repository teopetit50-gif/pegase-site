"use client";

/* ══════════════════════════════════════════════════════════════════════
   Documents du chantier (19/10/2026, session B6, b6_37)

   Les PV de réserves, plans et notes techniques reçus par Daliro (par
   FILED, ou pris en main par le bureau). Ce qu'ils deviennent : des
   réserves à lever, avec leur échéance (écrite sur le PV, ou date du PV +
   délai écrit, sinon absente), et des références du marché. Chaque élément
   dit sa pièce et sa page, et « à vérifier » quand le lecteur ne l'a pas
   retrouvé sur sa page. Les documents qu'aucun chantier unique n'a
   reconnus attendent ici qu'on les rattache. En exemple, un PV, un plan et
   une note calculés sur la date du jour.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { dateCourte } from "../format";
import { Avis, Pastille } from "../ui";
import { documentsARattacher, documentsChantier, leverReserveLue, rattacherDocument } from "./portes";
import type { DocumentARattacher, DocumentsChantier, ReserveALever, SousTypeDocument, Tableau } from "./types";

const SOUS_TYPES: Record<SousTypeDocument, string> = { pv_reserves: "PV de réserves", plan: "Plan", note_technique: "Note technique" };

function plusJours(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* En exemple : un PV de réserves, un plan et une note, rattachés au chantier ouvert. */
export function documentsExemple(aujourdhui: string): DocumentsChantier {
  const pv = "exemple-pv", plan = "exemple-plan", note = "exemple-note";
  const datePv = plusJours(aujourdhui, -20);
  const r = (ordre: number, x: Partial<ReserveALever>): ReserveALever => ({
    id: `exemple-r${ordre}`, document_id: pv, piece_id: "exemple-piece-pv", page: 1, ordre, numero: String(ordre), localisation: null, lot_texte: null,
    entreprise: null, description: "", delai_texte: null, echeance: null, echeance_source: null, verifiee: true, statut: "a_lever", levee_le: null, ...x,
  });
  return {
    documents: [
      { id: pv, piece: "exemple-piece-pv", sous_type: "pv_reserves", classe_par: "lecteur", titre: "Opérations préalables à la réception — bâtiment A", numero: null, indice: null, date: datePv, maitre_ouvrage: "SCI exemple", nom_fichier: "PV-OPR-bat-A.jpg", rattache_le: null },
      { id: plan, piece: "exemple-piece-plan", sous_type: "plan", classe_par: "lecteur", titre: "Plan des fondations", numero: "S-02", indice: null, date: plusJours(aujourdhui, -120), maitre_ouvrage: "SCI exemple", nom_fichier: "plan-S02.jpg", rattache_le: null },
      { id: note, piece: "exemple-piece-note", sous_type: "note_technique", classe_par: "humain", titre: "Dispositions constructives parasismiques", numero: null, indice: null, date: null, maitre_ouvrage: null, nom_fichier: "note-parasismique.jpg", rattache_le: null },
    ],
    reserves: [
      r(1, { localisation: "Logement A12", lot_texte: "Carrelage", entreprise: "Carrelages du Sud", description: "Reprise des joints de la salle d'eau", echeance: plusJours(aujourdhui, -2), echeance_source: "ecrite" }),
      r(2, { localisation: "Façade est", description: "Fissure à reprendre", delai_texte: "30 jours", echeance: plusJours(datePv, 30), echeance_source: "calculee" }),
      r(3, { description: "Peinture de la cage d'escalier", verifiee: false }),
    ],
    references: [
      { id: "exemple-x1", document_id: plan, piece_id: "exemple-piece-plan", page: 1, ordre: 1, nature: "plan", titre: "Plan des fondations", numero: "S-02", indice: null, date_document: plusJours(aujourdhui, -120), echelle: "1/50", texte: null, reference_normative: null, verifiee: true },
      { id: "exemple-x2", document_id: note, piece_id: "exemple-piece-note", page: 1, ordre: 1, nature: "note_technique", titre: "Dispositions constructives parasismiques", numero: null, indice: null, date_document: null, echelle: null, texte: null, reference_normative: null, verifiee: true },
      { id: "exemple-x3", document_id: note, piece_id: "exemple-piece-note", page: 2, ordre: 2, nature: "disposition", titre: null, numero: null, indice: null, date_document: null, echelle: null, texte: "Chaînages verticaux à chaque angle et de part et d'autre des ouvertures", reference_normative: "Eurocode 8", verifiee: true },
    ],
  };
}

type Props = { tableau: Tableau; source: Source; aujourdhui: string };

export default function DocumentsCarte({ tableau, source, aujourdhui }: Props) {
  const c = tableau.chantier;
  const [reel, setReel] = useState<DocumentsChantier | null>(null);
  const [exemple, setExemple] = useState<DocumentsChantier>(() => documentsExemple(aujourdhui));
  const [orphelins, setOrphelins] = useState<DocumentARattacher[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);

  const relire = useCallback(async () => {
    try {
      setErreur(null);
      const [d, o] = await Promise.all([documentsChantier(c.id), documentsARattacher(c.client_id)]);
      setReel(d); setOrphelins(o);
    } catch (e) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); }
  }, [c.id, c.client_id]);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void relire(), 0);
    return () => window.clearTimeout(t);
  }, [source, relire]);

  const donnees = source === "reelle" ? reel : exemple;
  const parDoc = useMemo(() => new Map((donnees?.documents ?? []).map((d) => [d.id, d])), [donnees]);
  const aLever = (donnees?.reserves ?? []).filter((r) => r.statut === "a_lever");

  async function lever(r: ReserveALever) {
    if (source !== "reelle") { setExemple((x) => ({ ...x, reserves: x.reserves.map((y) => (y.id === r.id ? { ...y, statut: "levee", levee_le: aujourdhui } : y)) })); return; }
    setEnvoi(r.id);
    try { await leverReserveLue(r.id, null); await relire(); }
    catch (e) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); }
    finally { setEnvoi(null); }
  }
  async function rattacher(d: DocumentARattacher) {
    setEnvoi(d.id);
    try { await rattacherDocument(d.id, c.id); await relire(); }
    catch (e) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); }
    finally { setEnvoi(null); }
  }

  const source_ = (piece: string, page: number | null, verifiee: boolean) => {
    const doc = [...parDoc.values()].find((d) => d.piece === piece);
    return `${doc?.nom_fichier ?? "pièce"}${page ? `, page ${page}` : ", page non dite"}${verifiee ? "" : " — à vérifier"}`;
  };
  const etatEcheance = (r: ReserveALever) => {
    if (r.statut === "levee") return <Pastille teinte="vert">Levée{r.levee_le ? ` le ${dateCourte(r.levee_le)}` : ""}</Pastille>;
    if (!r.echeance) return <Pastille teinte="gris">Sans échéance écrite</Pastille>;
    if (r.echeance < aujourdhui) return <Pastille teinte="rouge">Échue le {dateCourte(r.echeance)}</Pastille>;
    if (r.echeance <= plusJours(aujourdhui, 7)) return <Pastille teinte="ambre">À lever avant le {dateCourte(r.echeance)}</Pastille>;
    return <Pastille teinte="bleu">À lever avant le {dateCourte(r.echeance)}</Pastille>;
  };

  if (source === "reelle" && !reel && !erreur) return <section className="esp-carte" aria-label="Documents du chantier"><Loader variant="spin" /></section>;
  const vide = !donnees || (!donnees.documents.length && !orphelins.length);

  return (
    <section className="esp-carte" aria-label="Documents du chantier">
      <div className="esp-carte-tete">
        <div className="esp-section-titre" style={{ margin: 0 }}>
          Documents du chantier{source !== "reelle" ? " (exemple)" : ""} — {aLever.length} réserve{aLever.length > 1 ? "s" : ""} à lever
        </div>
      </div>
      {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
      {vide ? (
        <p className="esp-kpi-sous">Aucun PV de réserves, plan ou note technique reçu pour ce chantier. Ceux qui arrivent par courriel ou par dépôt sont reconnus et rangés ici.</p>
      ) : (
        <>
          {orphelins.length ? (
            <div style={{ marginBottom: 12 }}>
              <div className="esp-section-titre" style={{ margin: "0 0 4px" }}>À rattacher</div>
              <ul className="esp-fil">
                {orphelins.map((d) => (
                  <li key={d.id}>
                    <span className="esp-fil-point" data-teinte="ambre" />
                    <div className="esp-fil-texte">
                      <strong>{SOUS_TYPES[d.sous_type]}</strong>{d.titre ? ` — ${d.titre}` : ""}{d.maitre_ouvrage ? ` · ${d.maitre_ouvrage}` : ""}{d.date_document ? ` · ${dateCourte(d.date_document)}` : ""}
                      {d.motif ? <div className="esp-kpi-sous">{d.motif}</div> : null}
                      <div className="esp-actions" style={{ marginTop: 4 }}>
                        <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi === d.id} onClick={() => void rattacher(d)}>
                          {envoi === d.id ? <Loader variant="spin" /> : null} Rattacher à ce chantier
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {donnees && donnees.reserves.length ? (
            <div style={{ marginBottom: 12 }}>
              <div className="esp-section-titre" style={{ margin: "0 0 4px" }}>Réserves à lever</div>
              <ul className="esp-fil">
                {donnees.reserves.map((r) => (
                  <li key={r.id}>
                    <span className="esp-fil-point" data-teinte={r.statut === "levee" ? "vert" : r.echeance && r.echeance < aujourdhui ? "rouge" : undefined} />
                    <div className="esp-fil-texte">
                      <div className="esp-item-haut">
                        <span>{r.numero ? <strong>n° {r.numero} </strong> : null}{r.description}</span>
                        {etatEcheance(r)}
                      </div>
                      <div className="esp-kpi-sous">
                        {[r.localisation, r.lot_texte ? `lot ${r.lot_texte}` : null, r.entreprise].filter(Boolean).join(" · ")}
                        {r.echeance_source === "calculee" ? `${r.localisation || r.lot_texte || r.entreprise ? " · " : ""}échéance : date du PV + ${r.delai_texte}` : ""}
                      </div>
                      <div className="esp-kpi-sous">Lu dans {source_(r.piece_id, r.page, r.verifiee)}</div>
                      {r.statut === "a_lever" ? (
                        <div className="esp-actions" style={{ marginTop: 4 }}>
                          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi === r.id} onClick={() => void lever(r)}>
                            {envoi === r.id ? <Loader variant="spin" /> : null} Marquer levée
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {donnees && donnees.references.length ? (
            <div>
              <div className="esp-section-titre" style={{ margin: "0 0 4px" }}>Références du marché</div>
              <ul className="esp-fil">
                {donnees.references.map((x) => (
                  <li key={x.id}>
                    <span className="esp-fil-point" />
                    <div className="esp-fil-texte">
                      {x.nature === "disposition"
                        ? <span>{x.texte}{x.reference_normative ? <span className="esp-kpi-sous"> · {x.reference_normative}</span> : null}</span>
                        : <span><strong>{x.nature === "plan" ? "Plan" : "Note technique"}</strong>{x.titre ? ` — ${x.titre}` : " — sans titre lu"}{x.numero ? ` · n° ${x.numero}` : ""}{x.indice ? ` · indice ${x.indice}` : ""}{x.echelle ? ` · ${x.echelle}` : ""}{x.date_document ? ` · ${dateCourte(x.date_document)}` : ""}</span>}
                      <div className="esp-kpi-sous">Lu dans {source_(x.piece_id, x.page, x.verifiee)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
