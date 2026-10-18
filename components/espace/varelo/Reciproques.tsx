"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les comptes réciproques intragroupe — VARELO, vague 3 (06/10/2026, B1)

   À la clôture, ce que la société A dit que B lui doit (balance clients)
   et ce que B dit devoir à A (balance fournisseurs) doivent être égaux :
   en consolidation, ils s'éliminent (règlement ANC 2020-01). Varelo les
   met face à face grâce au référentiel (le tiers « intragroupe » dit
   quelle société il est) et aux balances âgées déposées. Un écart se
   justifie (en transit, litige, change…) ; la justification ne vaut que
   pour cet écart-là : un nouveau dépôt qui le change la rend caduque.

   Portes : grp_justifier_ecart (gérant, administrateur, direction
   financière), grp_exporter_reciproques (gérant, administrateur, valideur).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, Scale } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { EXEMPLE_MOI } from "../exemples/socle";
import type { Source } from "../source";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import {
  CATEGORIES_ECART,
  LIBELLE_ETAT_RECIPROQUE,
  RECIPROQUES_EXEMPLE,
  chargerReciproques,
  csvExemple,
  exporterReciproques,
  justifierEcart,
  type CategorieEcart,
  type Reciproque,
} from "./reciproques";
import type { Contexte } from "./types";

type Props = {
  source: Source;
  contexte: Contexte | null;
  client_id: string;
  onFait: (message: string) => void;
};

export default function Reciproques({ source, contexte, client_id, onFait }: Props) {
  const [locales, setLocales] = useState<Reciproque[]>(RECIPROQUES_EXEMPLE);
  const [reelles, setReelles] = useState<Reciproque[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setReelles(await chargerReciproques(client_id));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReelles([]);
    }
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !contexte) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, contexte, charger]);

  const liste = useMemo(() => {
    const rang: Record<Reciproque["etat"], number> = { ecart: 0, manque_debiteur: 1, dates_differentes: 2, manque_creancier: 3, justifie: 4, concorde: 5 };
    return [...((source === "exemple" ? locales : reelles) ?? [])].sort((a, b) => rang[a.etat] - rang[b.etat] || Math.abs(b.ecart) - Math.abs(a.ecart));
  }, [source, locales, reelles]);
  const compte = useMemo(() => {
    const ouverts = liste.filter((r) => r.etat === "ecart" || r.etat === "manque_debiteur" || r.etat === "manque_creancier" || r.etat === "dates_differentes");
    return { paires: liste.length, concordes: liste.filter((r) => r.etat === "concorde" || r.etat === "justifie").length, ouverts: ouverts.length, montant: ouverts.reduce((s, r) => s + Math.abs(r.ecart), 0) };
  }, [liste]);

  const role = contexte?.role;
  const peutJustifier = role === "gerant" || role === "admin" || (role === "valideur" && !!contexte?.equipes.includes("direction_financiere"));
  const peutExporter = role === "gerant" || role === "admin" || role === "valideur";

  const [cible, setCible] = useState<Reciproque | null>(null);
  const justifier = useCallback(
    async (r: Reciproque, categorie: CategorieEcart, motif: string) => {
      if (source === "reelle") {
        await justifierEcart(client_id, r.creancier_id, r.debiteur_id, categorie, motif.trim());
        await charger();
        return;
      }
      await new Promise((x) => setTimeout(x, 300));
      setLocales((prev) => prev.map((x) => (x.creancier_id === r.creancier_id && x.debiteur_id === r.debiteur_id ? { ...x, etat: "justifie", categorie, motif: motif.trim(), justification_id: "exemple", justifie_le: new Date().toISOString(), justifie_par: EXEMPLE_MOI } : x)));
    },
    [source, client_id, charger],
  );

  const [exportEnCours, setExportEnCours] = useState(false);
  const telecharger = useCallback(async () => {
    setExportEnCours(true);
    setErreur(null);
    try {
      const csv = source === "reelle" ? await exporterReciproques(client_id) : csvExemple(locales);
      const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reciproques-intragroupe-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onFait(`Le tableau des réciproques est exporté (${csv.split("\n").length - 1} paire${csv.split("\n").length - 1 > 1 ? "s" : ""}).`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'export a échoué.");
    } finally {
      setExportEnCours(false);
    }
  }, [source, client_id, locales, onFait]);

  return (
    <section id="vrl-reciproques" className="esp-carte" aria-label="Comptes réciproques intragroupe" style={{ marginTop: 16 }}>
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">Comptes réciproques intragroupe</h2>
          <p className="esp-kpi-sous" style={{ margin: "2px 0 0" }}>
            Ce qu&apos;une société du groupe dit qu&apos;une autre lui doit, face à ce que l&apos;autre reconnaît lui devoir, d&apos;après leurs dernières balances âgées. À la clôture, chaque écart s&apos;explique avant la consolidation.
          </p>
        </div>
        {peutExporter ? (
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={exportEnCours || !liste.length} onClick={telecharger}><Download width={14} height={14} aria-hidden="true" /> {exportEnCours ? "Export…" : "Exporter (CSV)"}</button>
        ) : null}
      </div>

      {erreur ? <Avis teinte="rouge" role="alert"><strong>Les réciproques n&apos;ont pas pu être lues.</strong> {erreur}</Avis> : null}

      {source === "reelle" && !reelles ? (
        <Chargement texte="Lecture des réciproques…" />
      ) : !liste.length ? (
        <Vide titre="Aucun compte réciproque">Les réciproques apparaissent quand deux sociétés ont déposé leurs balances âgées et que le référentiel a reconnu l&apos;une comme tiers de l&apos;autre (même SIREN).</Vide>
      ) : (
        <>
          <dl className="esp-def esp-def--trois" style={{ marginTop: 10 }}>
            <div><dt>Paires de sociétés</dt><dd className="esp-def-fort">{compte.paires}</dd></div>
            <div><dt>Concordantes ou justifiées</dt><dd className="esp-def-fort">{compte.concordes}</dd></div>
            <div><dt>À traiter avant la clôture</dt><dd className="esp-def-fort">{compte.ouverts ? <Pastille teinte="rouge">{compte.ouverts} paire{compte.ouverts > 1 ? "s" : ""}, {montant(compte.montant)}</Pastille> : "aucune"}</dd></div>
          </dl>
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Comptes réciproques par paire de sociétés (tableau qui défile)" style={{ marginTop: 12 }}>
            <table className="esp-tableau">
              <thead>
                <tr>
                  <th>Créancier → débiteur</th>
                  <th className="esp-num">Créance</th>
                  <th className="esp-num">Dette reconnue</th>
                  <th className="esp-num">Écart</th>
                  <th>État</th>
                  {peutJustifier ? <th><span className="vrl-masque">Action</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {liste.map((r) => (
                  <tr key={`${r.creancier_id}-${r.debiteur_id}`}>
                    <td>
                      <span className="vrl-balance-nom">{r.creancier}</span> <ArrowRight width={13} height={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /><span className="vrl-masque">sur</span> <span className="vrl-balance-nom">{r.debiteur}</span>
                    </td>
                    <td className="esp-num">{r.creance === null ? "—" : montant(r.creance)}<span className="vrl-paire-sous">{r.arrete_creancier ? `au ${dateCourte(r.arrete_creancier)}` : "non déposée"}</span></td>
                    <td className="esp-num">{r.dette === null ? "—" : montant(r.dette)}<span className="vrl-paire-sous">{r.arrete_debiteur ? `au ${dateCourte(r.arrete_debiteur)}` : "rien reconnu"}</span></td>
                    <td className="esp-num"><strong>{montant(r.ecart)}</strong></td>
                    <td>
                      <Pastille teinte={LIBELLE_ETAT_RECIPROQUE[r.etat].teinte}>{LIBELLE_ETAT_RECIPROQUE[r.etat].libelle}</Pastille>
                      {r.etat === "justifie" && r.motif ? <span className="vrl-paire-sous">{CATEGORIES_ECART.find((c) => c.cle === r.categorie)?.libelle ?? r.categorie} — {r.motif}</span> : null}
                    </td>
                    {peutJustifier ? (
                      <td>
                        {r.etat === "ecart" || r.etat === "dates_differentes" ? (
                          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setCible(r)} aria-label={`Justifier l'écart entre ${r.creancier} et ${r.debiteur}`}>Justifier</button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {cible ? <DialogueJustification r={cible} onFermer={() => setCible(null)} justifier={justifier} onFait={onFait} /> : null}
    </section>
  );
}

function DialogueJustification({ r, onFermer, justifier, onFait }: { r: Reciproque; onFermer: () => void; justifier: (r: Reciproque, c: CategorieEcart, m: string) => Promise<void>; onFait: (m: string) => void }) {
  const [categorie, setCategorie] = useState<CategorieEcart>("en_transit");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      await justifier(r, categorie, motif);
      onFait(`L'écart de ${montant(r.ecart)} entre ${r.creancier} et ${r.debiteur} est justifié. S'il change au prochain dépôt, il redeviendra à expliquer.`);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "La justification n'a pas été enregistrée.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Scale width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Justifier un écart intragroupe</DialogTitle>
          <DialogDescription>La justification vaut pour cet écart et ces deux arrêtés ; elle est inscrite au journal et sortira dans le tableau des réciproques remis à la consolidation.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <p className="esp-kpi-sous">{r.creancier} dit que {r.debiteur} lui doit <strong>{r.creance === null ? "—" : montant(r.creance)}</strong>{r.arrete_creancier ? ` au ${dateCourte(r.arrete_creancier)}` : ""} ; {r.debiteur} reconnaît <strong>{r.dette === null ? "—" : montant(r.dette)}</strong>{r.arrete_debiteur ? ` au ${dateCourte(r.arrete_debiteur)}` : ""}. Écart : <strong>{montant(r.ecart)}</strong>.</p>
            <label className="rv-libelle">Cause
              <select className="rv-champ" value={categorie} onChange={(x) => setCategorie(x.target.value as CategorieEcart)}>
                {CATEGORIES_ECART.map((c) => <option key={c.cle} value={c.cle}>{c.libelle}</option>)}
              </select>
            </label>
            <label className="rv-libelle">Explication <span className="esp-obligatoire">(obligatoire)</span>
              <textarea className="rv-champ" value={motif} maxLength={500} placeholder="Facture F-778 du 30/09 reçue par la société débitrice le 2/10…" onChange={(x) => setMotif(x.target.value)} />
            </label>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!motif.trim() || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Justifier l&apos;écart</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
