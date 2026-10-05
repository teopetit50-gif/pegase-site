"use client";

/* ══════════════════════════════════════════════════════════════════════
   Un objet du groupe (05/10/2026, B1) : son code F-00001, son nom, ses
   codes locaux société par société (état, méthode, score, anomalies),
   l'intragroupe, et les corrections qu'une personne peut proposer :
   renommer, fusionner dans un autre objet, rattacher un code ailleurs,
   détacher un code, scinder des codes. Chacune ouvre une demande de
   validation (portes grp_proposer_*) ; la raison est demandée, la base
   reste juge (deux SIREN qui se contredisent, dernier code…).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { GitMerge, Pencil, Scissors, Unlink } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Def, Pastille } from "../ui";
import { dateCourte } from "../format";
import type { Actions, Donnees } from "./EcranVarelo";
import { LIBELLE_ETAT, LIBELLE_METHODE, LIBELLE_NATURE, type CodeRef, type GenreProposition, type Objet } from "./types";

type Correction =
  | { genre: "renommer" }
  | { genre: "fusionner" }
  | { genre: "deplacer"; code: CodeRef }
  | { genre: "detacher"; code: CodeRef }
  | { genre: "scinder" };

const TITRES: Record<GenreProposition, string> = {
  placer: "Rattacher",
  renommer: "Proposer un nom pour le groupe",
  fusionner: "Fusionner dans un autre objet",
  deplacer: "Rattacher ce code à un autre objet",
  detacher: "Détacher ce code",
  scinder: "Scinder : des codes sous un nouvel objet",
};

export default function ObjetDetail({ objet, donnees, actions }: { objet: Objet; donnees: Donnees; actions: Actions }) {
  const codes = useMemo(() => donnees.codes.filter((c) => c.objet_id === objet.id).sort((a, b) => a.societe.localeCompare(b.societe) || a.code_local.localeCompare(b.code_local)), [donnees.codes, objet.id]);
  const autres = useMemo(() => donnees.objets.filter((o) => o.nature === objet.nature && o.statut === "actif" && o.id !== objet.id).sort((a, b) => a.numero - b.numero), [donnees.objets, objet]);
  const attente = donnees.propositions.filter((p) => p.statut !== "a_valider" ? false : p.objet_cible === objet.id || p.objet_source === objet.id || codes.some((c) => c.code_id === p.code_id));
  const intragroupe = objet.intragroupe ? donnees.societes.find((s) => s.entite_id === objet.intragroupe_entite_id)?.nom ?? actions.contexte?.entites.find((e) => e.id === objet.intragroupe_entite_id)?.nom ?? null : null;
  const peutProposer = !!actions.contexte && actions.contexte.role !== "lecteur";

  const [correction, setCorrection] = useState<Correction | null>(null);
  const [nom, setNom] = useState("");
  const [cible, setCible] = useState("");
  const [coches, setCoches] = useState<string[]>([]);
  const [raison, setRaison] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const ouvrir = (c: Correction) => {
    setErreur(null);
    setNom(objet.nom_groupe);
    setCible(autres[0]?.id ?? "");
    setCoches([]);
    setRaison("");
    setCorrection(c);
  };
  const pret = !correction ? false
    : correction.genre === "renommer" ? nom.trim().length > 0 && nom.trim() !== objet.nom_groupe
    : correction.genre === "fusionner" || correction.genre === "deplacer" ? !!cible
    : correction.genre === "scinder" ? coches.length > 0 && coches.length < codes.length
    : true;

  const envoyer = async () => {
    if (!correction || !pret) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const m =
        correction.genre === "renommer" ? await actions.proposer("renommer", { objet_cible: objet.id, nom: nom.trim() }, raison)
        : correction.genre === "fusionner" ? await actions.proposer("fusionner", { objet_source: objet.id, objet_cible: cible }, raison)
        : correction.genre === "deplacer" ? await actions.proposer("deplacer", { code_id: correction.code.code_id, objet_cible: cible }, raison)
        : correction.genre === "detacher" ? await actions.proposer("detacher", { code_id: correction.code.code_id, objet_cible: objet.id }, raison)
        : await actions.proposer("scinder", { objet_cible: objet.id, codes: coches }, raison);
      setFait(m);
      setCorrection(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La proposition a été refusée.");
    } finally {
      setEnvoi(false);
    }
  };

  const Icone = correction?.genre === "renommer" ? Pencil : correction?.genre === "scinder" ? Scissors : correction?.genre === "detacher" ? Unlink : GitMerge;

  return (
    <div className="esp-carte">
      <div className="esp-carte-tete">
        <div className="vrl-objet-tete">
          <span className="vrl-objet-code">{objet.code_groupe}</span>
          <h2 className="vrl-objet-nom">{objet.nom_groupe}</h2>
        </div>
        <span className="esp-item-haut">
          <Pastille teinte="noir">{LIBELLE_NATURE[objet.nature].un.charAt(0).toUpperCase() + LIBELLE_NATURE[objet.nature].un.slice(1)}</Pastille>
          {intragroupe ? <Pastille teinte="bleu" title="Ce tiers est une société du groupe">Intragroupe · {intragroupe}</Pastille> : null}
          {attente.length ? <Pastille teinte="ambre">{attente.length} proposition{attente.length > 1 ? "s" : ""} en attente</Pastille> : null}
        </span>
      </div>
      <div className="esp-carte-corps">
        {fait ? <div style={{ marginBottom: 12 }}><Avis teinte="vert" role="status"><strong>C&apos;est proposé.</strong> {fait}</Avis></div> : null}
        <dl className="esp-def esp-def--trois">
          <Def etiquette="Nom du groupe">{objet.nom_groupe}{objet.nom_origine === "humain" ? " (choisi par une personne)" : " (libellé le plus complet)"}</Def>
          <Def etiquette="Codes locaux" fort>{codes.length}</Def>
          <Def etiquette="Sociétés">{Array.from(new Set(codes.map((c) => c.societe))).length}</Def>
        </dl>

        <h3 className="esp-section-titre" style={{ marginTop: 18 }}>Les codes de chaque société</h3>
        {codes.length === 0 ? (
          <p className="esp-kpi-sous">Aucun code : cet objet a été vidé par une correction.</p>
        ) : (
          <div className="esp-tableau-cadre">
            <table className="esp-tableau">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>Code local</th>
                  <th>Libellé local</th>
                  <th>État</th>
                  <th>Comment</th>
                  {peutProposer ? <th aria-label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.code_id}>
                    <td>{c.societe}</td>
                    <td className="esp-mono">{c.code_local}</td>
                    <td>
                      {c.nom_local}
                      {Object.keys(c.anomalies ?? {}).length ? (
                        <span className="vrl-paire-sous" title={Object.entries(c.anomalies).map(([k, v]) => `${k} : ${v}`).join(" · ")}>
                          {Object.entries(c.anomalies).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(" · ")}
                        </span>
                      ) : null}
                    </td>
                    <td><Pastille teinte={LIBELLE_ETAT[c.etat].teinte}>{LIBELLE_ETAT[c.etat].libelle}</Pastille></td>
                    <td>
                      {c.methode ? LIBELLE_METHODE[c.methode] : "—"}
                      {c.score !== null && c.score !== undefined && c.methode !== "nouveau" && c.methode !== "humain" ? ` (${Math.round(c.score * 100)} %)` : ""}
                      {c.rattache_le ? <span className="vrl-paire-sous">le {dateCourte(c.rattache_le)}</span> : null}
                    </td>
                    {peutProposer ? (
                      <td>
                        <div className="vrl-paire-actions">
                          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={c.etat === "propose" || !autres.length} title={c.etat === "propose" ? "Ce code attend déjà la validation de son rattachement" : undefined} onClick={() => ouvrir({ genre: "deplacer", code: c })}>Rattacher ailleurs</button>
                          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={codes.length < 2 || c.etat === "propose"} title={codes.length < 2 ? "On ne détache pas le dernier code d'un objet" : undefined} onClick={() => ouvrir({ genre: "detacher", code: c })}>Détacher</button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {peutProposer ? (
          <div className="esp-actions" style={{ marginTop: 16 }}>
            <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => ouvrir({ genre: "renommer" })}><Pencil width={14} height={14} aria-hidden="true" /> Proposer un nom</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!autres.length || codes.some((c) => c.etat === "propose")} onClick={() => ouvrir({ genre: "fusionner" })}><GitMerge width={14} height={14} aria-hidden="true" /> Fusionner dans…</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={codes.length < 2} onClick={() => ouvrir({ genre: "scinder" })}><Scissors width={14} height={14} aria-hidden="true" /> Scinder</button>
          </div>
        ) : (
          <p className="esp-kpi-sous" style={{ marginTop: 14 }}>Un membre qui agit (gérant, administrateur, valideur, collaborateur) peut proposer une correction ; vous lisez seulement.</p>
        )}
        <p className="esp-kpi-sous" style={{ marginTop: 10 }}>Une correction ne s&apos;applique qu&apos;après la décision du référent données ; celui qui la propose ne la décide pas.</p>
      </div>

      <Dialog open={!!correction} onOpenChange={(o) => !o && !envoi && setCorrection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Icone width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{correction ? TITRES[correction.genre] : ""}</DialogTitle>
            <DialogDescription>
              {correction?.genre === "renommer" ? `Le nom du groupe de ${objet.code_groupe} ; il remplace le libellé choisi par le calcul et ne sera plus recalculé.`
                : correction?.genre === "fusionner" ? `Tous les codes de ${objet.code_groupe} passent sous l'objet d'arrivée ; ${objet.code_groupe} est fermé. Deux identifiants qui se contredisent (SIREN, TVA, GTIN) seront refusés.`
                : correction?.genre === "deplacer" ? `Le code ${correction.code.code_local} (${correction.code.societe}) rejoint l'objet d'arrivée.`
                : correction?.genre === "detacher" ? `Le code ${correction.code.code_local} (${correction.code.societe}) quitte ${objet.code_groupe} et ouvre son propre objet.`
                : "Les codes cochés quittent cet objet et forment un nouvel objet du groupe ; au moins un code reste ici."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {correction?.genre === "renommer" ? (
                <label className="rv-libelle">Nom du groupe <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nom} maxLength={200} onChange={(e) => setNom(e.target.value)} />
                </label>
              ) : null}
              {correction?.genre === "fusionner" || correction?.genre === "deplacer" ? (
                <label className="rv-libelle">Objet d&apos;arrivée <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={cible} onChange={(e) => setCible(e.target.value)}>
                    {autres.map((o) => <option key={o.id} value={o.id}>{o.code_groupe} — {o.nom_groupe}</option>)}
                  </select>
                </label>
              ) : null}
              {correction?.genre === "scinder" ? (
                <div>
                  <span className="rv-libelle">Codes à scinder <span className="esp-obligatoire">(au moins un, pas tous)</span></span>
                  <div className="vrl-coches" style={{ marginTop: 6 }}>
                    {codes.map((c) => (
                      <label key={c.code_id}>
                        <input type="checkbox" checked={coches.includes(c.code_id)} disabled={c.etat === "propose"} onChange={(e) => setCoches((prev) => (e.target.checked ? [...prev, c.code_id] : prev.filter((x) => x !== c.code_id)))} />
                        <span><span className="esp-mono">{c.code_local}</span> · {c.nom_local} <span className="vrl-paire-sous">{c.societe}</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <label className="rv-libelle">Raison
                <textarea className="rv-champ" value={raison} maxLength={500} placeholder="Ce que vous savez que le calcul ne sait pas." onChange={(e) => setRaison(e.target.value)} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!pret || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Proposer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
