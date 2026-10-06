"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le groupe sur une page — VARELO (06/10/2026, B1)

   Une ligne par société, tirée de sa dernière balance générale : ventes
   depuis le début de l'exercice, comparées à l'an dernier à la même date et
   à l'objectif au prorata ; résultat ; trésorerie et son plancher ;
   l'ancienneté de la balance. Les chiffres sont sociaux (non consolidés) :
   les ventes intragroupe n'en sont pas retirées, l'écran le dit.

   Portes : grp_deposer_balance (gérant, administrateur), grp_regler_objectif
   (gérant, administrateur, direction financière). Lecture : grp_groupe_page.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Target, Upload } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { lireTableau } from "./csv";
import { lireMontant } from "./encours";
import {
  BASES_EXEMPLE,
  GABARIT_BALANCE_GENERALE,
  SYNONYMES_BALANCE_GENERALE,
  chargerPage,
  deposerBalance,
  ligneDePage,
  reglerObjectif,
  type BaseExemple,
  type LigneBalance,
  type PageSociete,
  type ResultatBalance,
} from "./groupe";
import type { Contexte, Societe } from "./types";

type Props = { source: Source; contexte: Contexte | null; client_id: string; societes: Societe[]; onFait: (m: string) => void };

const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
const signe = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${montant(v)}`);

export default function GroupePage({ source, contexte, client_id, societes, onFait }: Props) {
  const [bases, setBases] = useState<BaseExemple[]>(BASES_EXEMPLE);
  const [reelles, setReelles] = useState<PageSociete[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setReelles(await chargerPage(client_id));
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

  const lignes = useMemo(() => (source === "exemple" ? bases.map(ligneDePage) : (reelles ?? [])).sort((a, b) => a.societe.localeCompare(b.societe)), [source, bases, reelles]);
  const total = useMemo(() => ({
    ventes: lignes.reduce((s, l) => s + l.ventes, 0),
    resultat: lignes.reduce((s, l) => s + l.resultat, 0),
    tresorerie: lignes.reduce((s, l) => s + l.tresorerie, 0),
    sous: lignes.filter((l) => l.sous_plancher).length,
  }), [lignes]);

  const role = contexte?.role;
  const peutDeposer = role === "gerant" || role === "admin";
  const peutObjectif = peutDeposer || (role === "valideur" && !!contexte?.equipes.includes("direction_financiere"));

  const [depot, setDepot] = useState(false);
  const [objectif, setObjectif] = useState<PageSociete | null>(null);

  const deposer = useCallback(
    async (entite_id: string, arrete: string, debut: string | null, brutes: Record<string, string>[], src: string | null): Promise<ResultatBalance> => {
      if (source === "reelle") {
        const r = await deposerBalance(client_id, entite_id, arrete, debut, brutes, src);
        await charger();
        return r;
      }
      await new Promise((x) => setTimeout(x, 350));
      const rejetes: ResultatBalance["rejetes"] = [];
      const dernier = new Map<string, number>();
      brutes.forEach((l, i) => {
        const c = (l.compte ?? "").replace(/\s/g, "").toUpperCase();
        if (c) dernier.set(c, i);
      });
      const retenues: LigneBalance[] = [];
      brutes.forEach((l, i) => {
        const compte = (l.compte ?? "").replace(/\s/g, "").toUpperCase();
        const s = lireMontant(l.solde), d = lireMontant(l.debit), c = lireMontant(l.credit);
        let motif: string | null = null;
        if (!compte) motif = "numéro de compte manquant";
        else if (!/^[1-9][0-9A-Z]{1,19}$/.test(compte)) motif = "numéro de compte illisible";
        else if (dernier.get(compte) !== i) motif = "doublon dans le lot";
        else if ([s, d, c].some((x) => x !== null && Number.isNaN(x))) motif = "montant illisible";
        else if (s === null && d === null && c === null) motif = "aucun montant";
        if (motif) rejetes.push({ ligne: i + 1, compte: compte || null, motif });
        else retenues.push({ compte, solde: s ?? (d ?? 0) - (c ?? 0) });
      });
      const exDebut = debut ?? `${arrete.slice(0, 4)}-01-01`;
      setBases((prev) => {
        const ancien = prev.find((b) => b.entite_id === entite_id);
        if (ancien && ancien.arrete_le > arrete) return prev;
        return [...prev.filter((b) => b.entite_id !== entite_id), { entite_id, arrete_le: arrete, exercice_debut: exDebut, source: src, lignes: retenues, n1: ancien?.n1 ?? null, objectif: ancien?.objectif ?? null, plancher: ancien?.plancher ?? null }];
      });
      const p = ligneDePage({ entite_id, arrete_le: arrete, exercice_debut: exDebut, source: src, lignes: retenues, n1: null, objectif: null, plancher: null });
      return { depot: "exemple", arrete_le: arrete, exercice_debut: exDebut, lus: brutes.length, retenus: retenues.length, rejetes, desequilibre: p.desequilibre, ventes: p.ventes, tresorerie: p.tresorerie, resultat: p.resultat };
    },
    [source, client_id, charger],
  );

  const regler = useCallback(
    async (l: PageSociete, ventes: number | null, plancher: number | null, motif: string) => {
      if (source === "reelle") {
        await reglerObjectif(client_id, l.entite_id, l.exercice_debut, ventes, plancher, motif.trim() || null);
        await charger();
        return;
      }
      await new Promise((x) => setTimeout(x, 300));
      setBases((prev) => prev.map((b) => (b.entite_id === l.entite_id ? { ...b, objectif: ventes, plancher } : b)));
    },
    [source, client_id, charger],
  );

  return (
    <section id="vrl-groupe" className="esp-carte" aria-label="Le groupe sur une page" style={{ marginBottom: 16 }}>
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">Le groupe sur une page</h2>
          <p className="esp-kpi-sous" style={{ margin: "2px 0 0" }}>
            Chaque société d&apos;après sa dernière balance générale : ventes depuis le début de l&apos;exercice, face à l&apos;an dernier et à l&apos;objectif ; résultat ; trésorerie. Chiffres sociaux : les ventes entre sociétés du groupe n&apos;en sont pas retirées.
          </p>
        </div>
        {peutDeposer ? (
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setDepot(true)}><Upload width={14} height={14} aria-hidden="true" /> Déposer une balance générale</button>
        ) : null}
      </div>

      {erreur ? <Avis teinte="rouge" role="alert"><strong>La page du groupe n&apos;a pas pu être lue.</strong> {erreur}</Avis> : null}

      {source === "reelle" && !reelles ? (
        <Chargement texte="Lecture des balances…" />
      ) : !lignes.length ? (
        <Vide titre="Aucune balance générale déposée">{peutDeposer ? "Déposez la balance générale de chaque société, telle que son logiciel comptable la sort : ses ventes, son résultat et sa trésorerie s'affichent ici, société par société." : "Le gérant ou l'administrateur dépose la balance générale de chaque société."}</Vide>
      ) : (
        <>
          <dl className="esp-def esp-def--trois" style={{ marginTop: 10 }}>
            <div><dt>Ventes du groupe (sociales)</dt><dd className="esp-def-fort">{montant(total.ventes)}</dd></div>
            <div><dt>Résultat cumulé</dt><dd className="esp-def-fort">{montant(total.resultat)}</dd></div>
            <div><dt>Trésorerie</dt><dd className="esp-def-fort">{montant(total.tresorerie)} {total.sous ? <Pastille teinte="rouge">{total.sous} sous plancher</Pastille> : null}</dd></div>
          </dl>
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Le groupe par société (tableau qui défile)" style={{ marginTop: 12 }}>
            <table className="esp-tableau">
              <thead>
                <tr>
                  <th>Société</th>
                  <th className="esp-num">Ventes à date</th>
                  <th className="esp-num">Sur l&apos;an dernier</th>
                  <th className="esp-num">Sur l&apos;objectif</th>
                  <th className="esp-num">Résultat</th>
                  <th className="esp-num">Trésorerie</th>
                  <th>Balance</th>
                  {peutObjectif ? <th><span className="vrl-masque">Action</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.entite_id}>
                    <td><span className="vrl-balance-nom">{l.societe}</span>{l.pole ? <span className="vrl-paire-sous">{l.pole}</span> : null}</td>
                    <td className="esp-num"><strong>{montant(l.ventes)}</strong></td>
                    <td className="esp-num">{l.ecart_n1 === null ? <span className="vrl-paire-sous">pas de balance N-1</span> : <>{pct(l.ecart_n1_pct)}<span className="vrl-paire-sous">{signe(l.ecart_n1)}</span></>}</td>
                    <td className="esp-num">{l.ecart_objectif === null ? <span className="vrl-paire-sous">pas d&apos;objectif</span> : <>{signe(l.ecart_objectif)}<span className="vrl-paire-sous">objectif à date {montant(l.objectif_a_date)}</span></>}</td>
                    <td className="esp-num">{montant(l.resultat)}</td>
                    <td className="esp-num">
                      {montant(l.tresorerie)}
                      {l.tresorerie_plancher !== null ? <span className="vrl-paire-sous">plancher {montant(l.tresorerie_plancher)}</span> : null}
                      {l.sous_plancher ? <Pastille teinte="rouge">Sous le plancher</Pastille> : null}
                    </td>
                    <td>
                      au {dateCourte(l.arrete_le)}
                      <span className="vrl-paire-sous">{l.age_jours > 35 ? <Pastille teinte="ambre">ancienne de {l.age_jours} jours</Pastille> : `il y a ${l.age_jours} jour${l.age_jours > 1 ? "s" : ""}`}</span>
                    </td>
                    {peutObjectif ? (
                      <td><button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setObjectif(l)} aria-label={`Objectifs de ${l.societe}`}>Objectifs</button></td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {societes.length > lignes.length ? (
            <p className="esp-kpi-sous" style={{ marginTop: 6 }}>Sans balance générale : {societes.filter((s) => !lignes.some((l) => l.entite_id === s.entite_id)).map((s) => s.nom).join(", ")}.</p>
          ) : null}
        </>
      )}

      {objectif ? <DialogueObjectif l={objectif} onFermer={() => setObjectif(null)} regler={regler} onFait={onFait} /> : null}
      <DialogueBalanceGenerale ouvert={depot} onFermer={() => setDepot(false)} societes={societes} deposer={deposer} onFait={onFait} />
    </section>
  );
}

function DialogueObjectif({ l, onFermer, regler, onFait }: { l: PageSociete; onFermer: () => void; regler: (l: PageSociete, v: number | null, p: number | null, m: string) => Promise<void>; onFait: (m: string) => void }) {
  const [ventes, setVentes] = useState(l.ventes_objectif !== null ? String(l.ventes_objectif).replace(".", ",") : "");
  const [plancher, setPlancher] = useState(l.tresorerie_plancher !== null ? String(l.tresorerie_plancher).replace(".", ",") : "");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const v = lireMontant(ventes);
  const p = lireMontant(plancher);
  const valide = (v === null || (!Number.isNaN(v) && v > 0)) && (p === null || !Number.isNaN(p));
  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      await regler(l, v, p, motif);
      onFait(`Objectifs de ${l.societe} pour l'exercice commencé le ${dateCourte(l.exercice_debut)} : ventes ${v === null ? "sans objectif" : montant(v)}, trésorerie ${p === null ? "sans plancher" : `au moins ${montant(p)}`}.`);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Les objectifs n'ont pas été réglés.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Target width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Objectifs — {l.societe}</DialogTitle>
          <DialogDescription>Pour l&apos;exercice commencé le {dateCourte(l.exercice_debut)}. L&apos;objectif de ventes de l&apos;année se compare au prorata des jours écoulés ; sous le plancher de trésorerie, une alerte est levée et se ferme d&apos;elle-même quand la trésorerie remonte.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <div className="esp-form-ligne">
              <label className="rv-libelle">Objectif de ventes de l&apos;exercice
                <input className="rv-champ" inputMode="decimal" value={ventes} placeholder="facultatif" onChange={(x) => setVentes(x.target.value)} />
              </label>
              <label className="rv-libelle">Plancher de trésorerie
                <input className="rv-champ" inputMode="decimal" value={plancher} placeholder="facultatif" onChange={(x) => setPlancher(x.target.value)} />
              </label>
            </div>
            <label className="rv-libelle">Motif
              <input className="rv-champ" value={motif} maxLength={500} placeholder="budget voté en conseil, covenant bancaire…" onChange={(x) => setMotif(x.target.value)} />
            </label>
            {!valide ? <Avis teinte="ambre">Des montants comme « 1 450 000 » ou « 60 000,00 » ; l&apos;objectif de ventes est positif.</Avis> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!valide || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogueBalanceGenerale({ ouvert, onFermer, societes, deposer, onFait }: {
  ouvert: boolean;
  onFermer: () => void;
  societes: Societe[];
  deposer: (entite_id: string, arrete: string, debut: string | null, lignes: Record<string, string>[], source: string | null) => Promise<ResultatBalance>;
  onFait: (m: string) => void;
}) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [societe, setSociete] = useState("");
  const [arrete, setArrete] = useState(aujourdhui);
  const [debut, setDebut] = useState(`${aujourdhui.slice(0, 4)}-01-01`);
  const [source, setSource] = useState("");
  const [texte, setTexte] = useState("");
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultatBalance | null>(null);
  const entite = societe || societes[0]?.entite_id || "";
  const lecture = useMemo(() => (texte.trim() ? lireTableau(texte, SYNONYMES_BALANCE_GENERALE, ["compte"]) : null), [texte]);
  const sansMontant = !!lecture && !lecture.reconnues.some((r) => ["solde", "debit", "credit"].includes(r.cle));
  const pret = !!entite && !!arrete && arrete <= aujourdhui && (!debut || debut <= arrete) && !!lecture && lecture.lignes.length > 0 && lecture.manque.length === 0 && !sansMontant && lecture.lignes.length <= 20000;

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
      const r = await deposer(entite, arrete, debut || null, lecture.lignes, source.trim() || nomFichier || null);
      setResultat(r);
      onFait(`Balance générale déposée : ${r.retenus} compte${r.retenus > 1 ? "s" : ""}, ventes ${montant(r.ventes)}, trésorerie ${montant(r.tresorerie)}.`);
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Le dépôt a échoué.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Upload width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Déposer une balance générale</DialogTitle>
          <DialogDescription>La balance générale d&apos;une société, telle que son logiciel comptable la sort : un compte par ligne, avec son solde, ou ses colonnes débit et crédit. Rien n&apos;est écrit dans le logiciel d&apos;origine.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {resultat ? (
            <div className="esp-form">
              <Avis teinte="vert" role="status"><strong>Balance déposée, arrêtée au {dateCourte(resultat.arrete_le)}.</strong> La page du groupe est recalculée.</Avis>
              <dl className="esp-def esp-def--trois">
                <div><dt>Comptes retenus</dt><dd className="esp-def-fort">{resultat.retenus}</dd></div>
                <div><dt>Rejetés</dt><dd>{resultat.rejetes.length}</dd></div>
                <div><dt>Ventes</dt><dd className="esp-def-fort">{montant(resultat.ventes)}</dd></div>
                <div><dt>Résultat</dt><dd>{montant(resultat.resultat)}</dd></div>
                <div><dt>Trésorerie</dt><dd className="esp-def-fort">{montant(resultat.tresorerie)}</dd></div>
                <div><dt>Équilibre</dt><dd>{Math.abs(resultat.desequilibre) < 0.01 ? "équilibrée" : <Pastille teinte="ambre">écart de {montant(resultat.desequilibre)}</Pastille>}</dd></div>
              </dl>
              {resultat.rejetes.length ? (
                <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Comptes rejetés (tableau qui défile)">
                  <table className="esp-tableau">
                    <thead><tr><th className="esp-num">Ligne</th><th>Compte</th><th>Motif</th></tr></thead>
                    <tbody>{resultat.rejetes.slice(0, 50).map((r, i) => <tr key={i}><td className="esp-num">{r.ligne}</td><td className="esp-mono">{r.compte ?? "—"}</td><td>{r.motif}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="esp-form">
              <label className="rv-libelle">Société <span className="esp-obligatoire">(obligatoire)</span>
                <select className="rv-champ" value={entite} onChange={(x) => setSociete(x.target.value)}>
                  {societes.map((s) => <option key={s.entite_id} value={s.entite_id}>{s.nom}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Arrêtée au <span className="esp-obligatoire">(obligatoire)</span>
                  <input type="date" className="rv-champ" value={arrete} max={aujourdhui} onChange={(x) => setArrete(x.target.value)} />
                </label>
                <label className="rv-libelle">Début de l&apos;exercice
                  <input type="date" className="rv-champ" value={debut} max={arrete} onChange={(x) => setDebut(x.target.value)} />
                </label>
              </div>
              <label className="rv-libelle">Source
                <input className="rv-champ" value={source} maxLength={200} placeholder="balance générale Sage au 30/09…" onChange={(x) => setSource(x.target.value)} />
              </label>
              <div>
                <span className="rv-libelle">Le fichier <span className="esp-obligatoire">(obligatoire)</span></span>
                <div className="esp-fichier">
                  <input id="vrl-bg-fichier" type="file" className="esp-fichier-natif" accept=".csv,.txt,.tsv" onChange={(x) => void lireFichier(x.target.files?.[0] ?? null)} />
                  <label htmlFor="vrl-bg-fichier" className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>{nomFichier ? "Changer de fichier" : "Choisir un fichier"}</label>
                  <span className="esp-kpi-sous">{nomFichier ?? "CSV (point-virgule, virgule ou tabulation), première ligne : les en-têtes."}</span>
                </div>
                <textarea className="rv-champ" style={{ marginTop: 8, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }} value={texte} placeholder={"…ou collez les lignes ici\n" + GABARIT_BALANCE_GENERALE} onChange={(x) => { setTexte(x.target.value); setNomFichier(null); }} aria-label="Lignes de la balance générale" />
              </div>
              {lecture ? (
                <div className="esp-item-haut">
                  <Pastille teinte={lecture.lignes.length ? "vert" : "rouge"}>{lecture.lignes.length} ligne{lecture.lignes.length > 1 ? "s" : ""}</Pastille>
                  {lecture.reconnues.map((r) => <Pastille key={r.cle} teinte="gris" contour title={`colonne « ${r.entete} »`}>{r.cle}</Pastille>)}
                  {lecture.ignorees.length ? <Pastille teinte="ambre" title={lecture.ignorees.join(", ")}>{lecture.ignorees.length} colonne{lecture.ignorees.length > 1 ? "s" : ""} ignorée{lecture.ignorees.length > 1 ? "s" : ""}</Pastille> : null}
                  {lecture.manque.length ? <Pastille teinte="rouge">il manque : {lecture.manque.join(", ")}</Pastille> : null}
                  {sansMontant ? <Pastille teinte="rouge">aucune colonne de montant reconnue</Pastille> : null}
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
