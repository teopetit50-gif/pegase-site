"use client";

/* ══════════════════════════════════════════════════════════════════════
   Déposer l'export d'une société (05/10/2026, B1) : la DSI choisit la
   société et la nature, colle ou charge le fichier (CSV, point-virgule,
   tabulation), voit les colonnes reconnues et le compte des lignes, puis
   dépose (grp_deposer_codes). La porte rend lus / nouveaux / modifiés /
   inchangés / anomalies / rejetés, montrés tels quels ; un travail de
   rapprochement est déposé par le socle.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { GABARIT, lireExport } from "./csv";
import { LIBELLE_NATURE, NATURES, type Nature, type ResultatDepot, type Societe } from "./types";

type Props = {
  ouvert: boolean;
  onFermer: () => void;
  societes: Societe[];
  deposer: (entite_id: string, nature: Nature, lignes: Record<string, string>[], source: string | null) => Promise<ResultatDepot>;
  onFait: (message: string) => void;
};

export default function Depot({ ouvert, onFermer, societes, deposer, onFait }: Props) {
  const [societe, setSociete] = useState("");
  const [nature, setNature] = useState<Nature>("fournisseur");
  const [source, setSource] = useState("");
  const [texte, setTexte] = useState("");
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultatDepot | null>(null);

  const entite = societe || societes[0]?.entite_id || "";
  const lecture = useMemo(() => (texte.trim() ? lireExport(texte) : null), [texte]);
  const pret = !!entite && !!lecture && lecture.lignes.length > 0 && lecture.manque.length === 0 && lecture.lignes.length <= 20000;

  const lireFichier = async (f: File | null) => {
    if (!f) return;
    setNomFichier(f.name);
    setTexte(await f.text());
    if (!source) setSource(f.name);
  };
  const fermer = () => {
    if (envoi) return;
    setResultat(null);
    setErreur(null);
    setTexte("");
    setNomFichier(null);
    onFermer();
  };
  const envoyer = async () => {
    if (!pret || !lecture) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await deposer(entite, nature, lecture.lignes, source.trim() || nomFichier || null);
      setResultat(r);
      onFait(`Export déposé : ${r.lus} ligne${r.lus > 1 ? "s" : ""} lue${r.lus > 1 ? "s" : ""}, ${r.nouveaux} code${r.nouveaux > 1 ? "s" : ""} nouveau${r.nouveaux > 1 ? "x" : ""}, ${r.modifies} modifié${r.modifies > 1 ? "s" : ""}, ${r.rejetes.length} rejeté${r.rejetes.length > 1 ? "s" : ""}. Le rapprochement est en file.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le dépôt a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Upload width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Déposer l&apos;export d&apos;une société</DialogTitle>
          <DialogDescription>Le fichier sorti du logiciel de gestion (fournisseurs, clients, articles ou sites), tel quel. Les codes sont normalisés, les identifiants vérifiés (SIREN, TVA, IBAN, GTIN), puis rapprochés au prochain passage. Rien n&apos;est écrit dans le logiciel d&apos;origine.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {resultat ? (
            <div className="esp-form">
              <Avis teinte="vert" role="status"><strong>Export déposé.</strong> Le rapprochement est en file : le prochain passage range ces codes.</Avis>
              <dl className="esp-def esp-def--trois">
                <div><dt>Lignes lues</dt><dd className="esp-def-fort">{resultat.lus}</dd></div>
                <div><dt>Codes nouveaux</dt><dd className="esp-def-fort">{resultat.nouveaux}</dd></div>
                <div><dt>Modifiés</dt><dd className="esp-def-fort">{resultat.modifies}</dd></div>
                <div><dt>Inchangés</dt><dd>{resultat.inchanges}</dd></div>
                <div><dt>Anomalies</dt><dd>{resultat.anomalies} <span className="vrl-paire-sous">identifiant à clé fausse, code postal illisible… le code est gardé, l&apos;anomalie notée</span></dd></div>
                <div><dt>Rejetées</dt><dd>{resultat.rejetes.length}</dd></div>
              </dl>
              {resultat.rejetes.length ? (
                <div className="esp-tableau-cadre">
                  <table className="esp-tableau">
                    <thead><tr><th className="esp-num">Ligne</th><th>Code</th><th>Motif</th></tr></thead>
                    <tbody>
                      {resultat.rejetes.slice(0, 50).map((r, i) => (
                        <tr key={i}><td className="esp-num">{r.ligne}</td><td className="esp-mono">{r.code ?? "—"}</td><td>{r.motif}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Société <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={entite} onChange={(e) => setSociete(e.target.value)}>
                    {societes.map((s) => <option key={s.entite_id} value={s.entite_id}>{s.nom}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Nature
                  <select className="rv-champ" value={nature} onChange={(e) => setNature(e.target.value as Nature)}>
                    {NATURES.map((n) => <option key={n} value={n}>{LIBELLE_NATURE[n].des.charAt(0).toUpperCase() + LIBELLE_NATURE[n].des.slice(1)}</option>)}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">Source
                <input className="rv-champ" value={source} maxLength={200} placeholder="export Sage du 05/10, extraction EBP…" onChange={(e) => setSource(e.target.value)} />
              </label>
              <div>
                <span className="rv-libelle">Le fichier <span className="esp-obligatoire">(obligatoire)</span></span>
                <div className="esp-fichier">
                  <input id="vrl-depot-fichier" type="file" className="esp-fichier-natif" accept=".csv,.txt,.tsv" onChange={(e) => void lireFichier(e.target.files?.[0] ?? null)} />
                  <label htmlFor="vrl-depot-fichier" className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>{nomFichier ? "Changer de fichier" : "Choisir un fichier"}</label>
                  <span className="esp-kpi-sous">{nomFichier ?? "CSV (point-virgule, virgule ou tabulation), première ligne : les en-têtes."}</span>
                </div>
                <textarea className="rv-champ" style={{ marginTop: 8, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }} value={texte} placeholder={"…ou collez les lignes ici\n" + GABARIT} onChange={(e) => { setTexte(e.target.value); setNomFichier(null); }} aria-label="Lignes de l'export" />
              </div>
              {lecture ? (
                <div className="esp-item-haut">
                  <Pastille teinte={lecture.lignes.length ? "vert" : "rouge"}>{lecture.lignes.length} ligne{lecture.lignes.length > 1 ? "s" : ""}</Pastille>
                  {lecture.reconnues.map((r) => <Pastille key={r.cle} teinte="gris" contour title={`colonne « ${r.entete} »`}>{r.cle}</Pastille>)}
                  {lecture.ignorees.length ? <Pastille teinte="ambre" title={lecture.ignorees.join(", ")}>{lecture.ignorees.length} colonne{lecture.ignorees.length > 1 ? "s" : ""} ignorée{lecture.ignorees.length > 1 ? "s" : ""}</Pastille> : null}
                  {lecture.manque.length ? <Pastille teinte="rouge">il manque : {lecture.manque.join(", ")}</Pastille> : null}
                  {lecture.lignes.length > 20000 ? <Pastille teinte="rouge">20 000 lignes au plus par dépôt</Pastille> : null}
                </div>
              ) : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {resultat ? (
            <button type="button" className="r-btn r-btn--noir" onClick={fermer}>Fermer</button>
          ) : (
            <button type="button" className="r-btn r-btn--noir" disabled={!pret || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Déposer</button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
