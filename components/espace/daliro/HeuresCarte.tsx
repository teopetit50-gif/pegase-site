"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les heures pointées et la rentabilité du chantier (06/10/2026, session B6, b6_17)

   La semaine du chantier : une ligne par intervenant, une case par jour,
   les heures du lot choisi (au quart d'heure ; 0 retire la journée). Une
   équipe se pointe d'un coup. Le Code du travail est tenu par la base :
   12 h au plus par jour, tous chantiers confondus ; alerte au-delà de 10 h
   par jour ou de 48 h par semaine.

   Pour qui voit les prix : la rentabilité à date — facturé (dernière
   situation validée) moins main-d'œuvre (heures × coût horaire chargé) et
   achats (factures rattachées), lot par lot.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Euro, Users } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { aujourdHui } from "../exemples/socle";
import type { Source } from "../source";
import { dateCourte, montant, pourcent } from "../format";
import { Avis, Pastille } from "../ui";
import { JOURS_COURTS, ajouterJours, heuresFr, lundiDe, mondeExemple, pointerLocal, semaineLocale, type MondeHeures } from "./heures";
import { chargerHeures, pointer, pointerEquipe, poserCoutHoraire } from "./portes";
import type { HeuresChantier, Tableau } from "./types";

const HORS_LOT = "hors";

type Props = { tableau: Tableau; source: Source };

export default function HeuresCarte({ tableau, source }: Props) {
  const c = tableau.chantier;
  const lotsClient = tableau.lots.filter((l) => l.execution === "client");
  const [lundi, setLundi] = useState(() => lundiDe(aujourdHui()));
  const [lot, setLot] = useState<string>(() => lotsClient[0]?.id ?? HORS_LOT);
  const [reel, setReel] = useState<HeuresChantier | null>(null);
  const [monde, setMonde] = useState<MondeHeures>(() => mondeExemple(tableau));
  const [chargement, setChargement] = useState(source === "reelle");
  const [saisies, setSaisies] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [alertes, setAlertes] = useState<string[]>([]);
  const [equipeForm, setEquipeForm] = useState(false);
  const [equipe, setEquipe] = useState("");
  const [jourEquipe, setJourEquipe] = useState(aujourdHui());
  const [heuresEquipe, setHeuresEquipe] = useState("8");
  const [coutForm, setCoutForm] = useState(false);
  const [coutQui, setCoutQui] = useState("");
  const [coutValeur, setCoutValeur] = useState("");
  const [coutDepuis, setCoutDepuis] = useState(aujourdHui());

  const lire = useCallback(async () => {
    try {
      setReel(await chargerHeures(c.id, lundi));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setChargement(false);
    }
  }, [c.id, lundi]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, lire]);

  const h: HeuresChantier | null = useMemo(
    () => (source === "reelle" ? reel : semaineLocale(tableau, monde, lundi)),
    [source, reel, tableau, monde, lundi],
  );

  const ouvert = c.statut !== "preparation" && c.statut !== "annule";
  const auj = aujourdHui();
  const lotId = lot === HORS_LOT ? null : lot;
  const lotLibelle = lotId ? `lot ${tableau.lots.find((l) => l.id === lotId)?.code ?? "?"}` : "hors lot";

  const agir = async (reelle: () => Promise<{ alertes?: string[] } | unknown>, locale: () => { alertes: string[] }, message: string) => {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      let a: string[] = [];
      if (source === "reelle") {
        const r = await reelle();
        if (r && typeof r === "object" && "alertes" in r && Array.isArray((r as { alertes: unknown }).alertes)) a = (r as { alertes: string[] }).alertes;
        await lire();
      } else {
        a = locale().alertes;
      }
      setAlertes(a);
      setFait(message);
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé le pointage.");
      return false;
    } finally {
      setEnvoi(false);
    }
  };

  const cle = (i: string, j: string) => `${i}|${j}`;
  const heuresDe = (i: string, j: string, toutLot = false) =>
    (h?.pointages ?? []).filter((p) => p.intervenant_id === i && p.jour === j && (toutLot || p.lot_id === lotId)).reduce((t, p) => t + p.heures, 0);

  const enregistrer = async (intervenant: string, nom: string, jour: string) => {
    const k = cle(intervenant, jour);
    const brut = saisies[k];
    if (brut === undefined) return;
    const v = brut.trim() === "" ? 0 : Number(brut.replace(",", "."));
    if (!Number.isNaN(v) && v === heuresDe(intervenant, jour)) {
      setSaisies((p) => { const n = { ...p }; delete n[k]; return n; });
      return;
    }
    await agir(
      () => pointer(c.id, intervenant, jour, v, lotId, null),
      () => { const r = pointerLocal(monde, intervenant, jour, v, lotId); setMonde(r.monde); return r.retour; },
      v > 0 ? `${nom} : ${heuresFr(v)} le ${dateCourte(jour)} (${lotLibelle}).` : `${nom} : journée du ${dateCourte(jour)} retirée (${lotLibelle}).`,
    );
    setSaisies((p) => { const n = { ...p }; delete n[k]; return n; });
  };

  const pointerLEquipe = async () => {
    const v = Number(heuresEquipe.replace(",", "."));
    const eq = h?.equipes.find((e) => e.id === equipe);
    const ok = await agir(
      () => pointerEquipe(c.id, equipe, jourEquipe, v, lotId),
      () => {
        const membres = monde.intervenants.filter((i) => i.actif && i.equipe_id === equipe);
        if (!membres.length) throw new Error(`L'équipe ${eq?.nom ?? ""} n'a aucun intervenant actif.`);
        let m = monde;
        const a: string[] = [];
        for (const i of membres) { const r = pointerLocal(m, i.id, jourEquipe, v, lotId); m = r.monde; a.push(...r.retour.alertes); }
        setMonde(m);
        return { alertes: a };
      },
      `Équipe ${eq?.nom ?? ""} : ${heuresFr(v)} le ${dateCourte(jourEquipe)} (${lotLibelle}).`,
    );
    if (ok) setEquipeForm(false);
  };

  const poserCout = async () => {
    const v = Number(coutValeur.replace(",", "."));
    const qui = coutQui || null;
    const nom = qui ? h?.intervenants.find((i) => i.id === qui)?.nom ?? "" : "l'entreprise (par défaut)";
    const ok = await agir(
      () => poserCoutHoraire(c.client_id, qui, v, coutDepuis),
      () => {
        if (Number.isNaN(v) || v <= 0 || v > 500) throw new Error("Le coût horaire chargé est entre 0 et 500 €.");
        setMonde((m) => (qui ? { ...m, couts: { ...m.couts, [qui]: Math.round(v * 100) / 100 } } : { ...m, cout_defaut: Math.round(v * 100) / 100 }));
        return { alertes: [] };
      },
      `Coût horaire chargé de ${nom} : ${montant(v)} de l'heure depuis le ${dateCourte(coutDepuis)}.`,
    );
    if (ok) setCoutForm(false);
  };

  if (chargement && !h) {
    return (
      <section className="esp-carte" aria-label="Heures et rentabilité">
        <div className="esp-section-titre">Heures et rentabilité</div>
        <Loader variant="spin" />
      </section>
    );
  }
  if (!h) {
    return (
      <section className="esp-carte" aria-label="Heures et rentabilité">
        <div className="esp-section-titre">Heures et rentabilité</div>
        {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : <p className="esp-kpi-sous">Les heures de ce chantier ne vous sont pas ouvertes.</p>}
      </section>
    );
  }

  const r = h.rentabilite;
  const totalJour = (j: string) => (h.pointages ?? []).filter((p) => p.jour === j).reduce((t, p) => t + p.heures, 0);
  const semaineCourante = lundi >= lundiDe(auj);

  return (
    <section className="esp-carte" aria-label="Heures et rentabilité">
      <div className="esp-carte-tete">
        <div className="esp-section-titre" style={{ margin: 0 }}>
          Heures et rentabilité — {heuresFr(h.total_heures)} pointées
        </div>
        <div className="esp-actions" style={{ marginTop: 0 }}>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi || !ouvert || !h.equipes.length}
                  onClick={() => { setEquipe(h.equipes[0]?.id ?? ""); setJourEquipe(auj); setHeuresEquipe("8"); setErreur(null); setEquipeForm(true); }}>
            <Users width={14} height={14} aria-hidden="true" /> Pointer une équipe
          </button>
          {h.voit_prix ? (
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi}
                    onClick={() => { setCoutQui(""); setCoutValeur(h.cout_defaut !== null ? String(h.cout_defaut).replace(".", ",") : ""); setCoutDepuis(auj); setErreur(null); setCoutForm(true); }}>
              <Euro width={14} height={14} aria-hidden="true" /> Coût horaire
            </button>
          ) : null}
        </div>
      </div>
      {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {alertes.map((a) => <div key={a} style={{ marginBottom: 10 }}><Avis teinte="ambre" role="alert">{a}</Avis></div>)}
      {erreur && !equipeForm && !coutForm ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      {!ouvert ? <p className="esp-kpi-sous">Le chantier n&apos;est pas ouvert : on n&apos;y pointe pas encore d&apos;heures.</p> : null}

      <div className="esp-heures-barre" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setLundi(ajouterJours(lundi, -7))} disabled={envoi} aria-label="Semaine précédente">
          <ChevronLeft width={14} height={14} aria-hidden="true" />
        </button>
        <strong>Semaine du {dateCourte(lundi)}</strong>
        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setLundi(ajouterJours(lundi, 7))} disabled={envoi || semaineCourante} aria-label="Semaine suivante">
          <ChevronRight width={14} height={14} aria-hidden="true" />
        </button>
        <label className="rv-libelle" style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>Lot pointé
          <select className="rv-champ" value={lot} onChange={(e) => { setLot(e.target.value); setSaisies({}); }} style={{ width: "auto" }}>
            {tableau.lots.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.libelle}</option>)}
            <option value={HORS_LOT}>Hors lot</option>
          </select>
        </label>
        <span className="esp-kpi-sous">{heuresFr(h.semaine_heures)} cette semaine, tous lots</span>
      </div>

      {h.intervenants.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label={`Heures de la semaine du ${dateCourte(lundi)} (tableau qui défile)`}>
          <table className="esp-tableau">
            <thead>
              <tr>
                <th>Intervenant</th>
                {h.jours.map((j, k) => <th key={j} className="esp-num">{JOURS_COURTS[k]} {j.slice(8, 10)}/{j.slice(5, 7)}</th>)}
                <th className="esp-num">Semaine</th>
              </tr>
            </thead>
            <tbody>
              {h.intervenants.map((i) => (
                <tr key={i.id}>
                  <td>{i.nom}{i.equipe_nom ? <span className="esp-kpi-sous"> · {i.equipe_nom}</span> : null}{!i.actif ? <> <Pastille teinte="gris">inactif</Pastille></> : null}</td>
                  {h.jours.map((j) => {
                    const k = cle(i.id, j);
                    const v = heuresDe(i.id, j);
                    const autres = heuresDe(i.id, j, true) - v;
                    const ferme = !ouvert || j > auj || envoi || (!i.actif && v === 0);
                    return (
                      <td key={j} className="esp-num">
                        <input className="rv-champ" style={{ width: 56, textAlign: "right" }} inputMode="decimal"
                               aria-label={`Heures de ${i.nom} le ${dateCourte(j)} (${lotLibelle})`}
                               value={saisies[k] ?? (v ? String(v).replace(".", ",") : "")}
                               placeholder={j > auj ? "" : "–"}
                               onChange={(e) => setSaisies((p) => ({ ...p, [k]: e.target.value }))}
                               onBlur={() => void enregistrer(i.id, i.nom, j)}
                               onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                               disabled={ferme} />
                        {autres > 0 ? <div className="esp-kpi-sous" title="Heures pointées ce jour sur d'autres lots du chantier">+{heuresFr(autres)}</div> : null}
                      </td>
                    );
                  })}
                  <td className="esp-num"><strong>{heuresFr(h.jours.reduce((t, j) => t + heuresDe(i.id, j, true), 0))}</strong></td>
                </tr>
              ))}
              <tr>
                <td><strong>Total du jour</strong></td>
                {h.jours.map((j) => <td key={j} className="esp-num">{totalJour(j) ? heuresFr(totalJour(j)) : "–"}</td>)}
                <td className="esp-num"><strong>{heuresFr(h.semaine_heures)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : <p className="esp-kpi-sous">Aucun intervenant : ajoutez vos compagnons et leurs équipes pour pointer leurs heures.</p>}
      <p className="esp-kpi-sous" style={{ marginTop: 6 }}>
        Au quart d&apos;heure (7,5 = 7 h 30) ; 0 retire la journée. 12 h au plus par jour, tous chantiers confondus (Code du travail, L3121-18 et L3121-19).
      </p>

      {r ? (
        <div style={{ marginTop: 14 }}>
          <div className="esp-section-titre">Rentabilité à date</div>
          <dl style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "4px 16px", margin: "0 0 10px" }}>
            <dt>Vendu (marché vérifié + avenants signés) HT</dt><dd className="esp-num" style={{ margin: 0 }}>{montant(r.vendu_ht)}</dd>
            <dt>Facturé (dernière situation validée) HT</dt><dd className="esp-num" style={{ margin: 0 }}>{montant(r.facture_ht)}</dd>
            <dt>Main-d&apos;œuvre ({heuresFr(r.heures)} × coût horaire chargé)</dt><dd className="esp-num" style={{ margin: 0 }}>− {montant(r.main_oeuvre_ht)}</dd>
            <dt>Achats et sous-traitance (factures rattachées) HT</dt><dd className="esp-num" style={{ margin: 0 }}>− {montant(r.achats_ht)}</dd>
            <dt><strong>Marge à date</strong></dt>
            <dd className="esp-num" style={{ margin: 0 }}>
              <strong>{montant(r.marge_ht)}</strong>{r.marge_taux !== null ? <span className="esp-kpi-sous"> ({pourcent(Math.round(r.marge_taux * 1000) / 10)} du facturé)</span> : null}
            </dd>
          </dl>
          {r.heures_sans_cout > 0 ? <Avis teinte="ambre">{heuresFr(r.heures_sans_cout)} sans coût horaire : posez le coût chargé de l&apos;entreprise (bouton « Coût horaire ») pour qu&apos;elles comptent dans la marge.</Avis> : null}
          {r.facture_ht === 0 && r.debourse_ht > 0 ? <Avis teinte="bleu">Rien de facturé encore : la marge à date ne deviendra parlante qu&apos;avec la première situation validée.</Avis> : null}
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Rentabilité par lot (tableau qui défile)">
            <table className="esp-tableau">
              <thead><tr><th>Lot</th><th className="esp-num">Vendu HT</th><th className="esp-num">Facturé HT</th><th className="esp-num">Heures</th><th className="esp-num">Main-d&apos;œuvre</th><th className="esp-num">Achats HT</th><th className="esp-num">Marge</th></tr></thead>
              <tbody>
                {r.lots.map((l) => (
                  <tr key={l.lot_id ?? HORS_LOT}>
                    <td>{l.code ? <span className="esp-mono">{l.code}</span> : null} {l.libelle}</td>
                    <td className="esp-num">{montant(l.vendu_ht)}</td>
                    <td className="esp-num">{montant(l.facture_ht)}</td>
                    <td className="esp-num">{l.heures ? heuresFr(l.heures) : "–"}</td>
                    <td className="esp-num">{montant(l.main_oeuvre_ht)}</td>
                    <td className="esp-num">{montant(l.achats_ht)}</td>
                    <td className="esp-num"><strong style={l.marge_ht < 0 ? { color: "var(--esp-rouge, #b42318)" } : undefined}>{montant(l.marge_ht)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <p className="esp-kpi-sous" style={{ marginTop: 10 }}>La rentabilité (coûts et marge) est réservée à qui a le droit de voir les prix.</p>}

      <Dialog open={equipeForm} onOpenChange={(o) => !o && setEquipeForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Users width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Pointer une équipe</DialogTitle>
            <DialogDescription>Les mêmes heures pour chaque intervenant actif de l&apos;équipe (chef compris), sur le {lotLibelle}.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Équipe
                <select className="rv-champ" value={equipe} onChange={(e) => setEquipe(e.target.value)}>
                  {h.equipes.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Jour
                  <input className="rv-champ" type="date" max={auj} value={jourEquipe} onChange={(e) => setJourEquipe(e.target.value)} />
                </label>
                <label className="rv-libelle">Heures chacun
                  <input className="rv-champ" inputMode="decimal" value={heuresEquipe} onChange={(e) => setHeuresEquipe(e.target.value)} />
                </label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" onClick={() => void pointerLEquipe()} disabled={envoi || !equipe || !jourEquipe || !heuresEquipe.trim()}>{envoi ? <Loader variant="spin" /> : null} Pointer l&apos;équipe</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={coutForm} onOpenChange={(o) => !o && setCoutForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Euro width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Coût horaire chargé</DialogTitle>
            <DialogDescription>Salaire brut, charges patronales, congés payés et intempéries (caisse CIBTP) ramenés à l&apos;heure travaillée. Daté : les heures déjà pointées gardent le coût de leur jour.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Pour
                <select className="rv-champ" value={coutQui} onChange={(e) => setCoutQui(e.target.value)}>
                  <option value="">Toute l&apos;entreprise (par défaut)</option>
                  {h.intervenants.map((i) => <option key={i.id} value={i.id}>{i.nom}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">€ de l&apos;heure <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="decimal" value={coutValeur} onChange={(e) => setCoutValeur(e.target.value)} placeholder="38" />
                </label>
                <label className="rv-libelle">Depuis le
                  <input className="rv-champ" type="date" value={coutDepuis} onChange={(e) => setCoutDepuis(e.target.value)} />
                </label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" onClick={() => void poserCout()} disabled={envoi || !coutValeur.trim()}>{envoi ? <Loader variant="spin" /> : null} Poser le coût</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
