"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'approvisionnement du chantier (06/10/2026, session B6, b6_22)

   Chaque commande est rattachée au passage qui en a besoin : « livrer
   avant » = le jour ouvré qui précède son début, « commander avant » =
   moins le délai du fournisseur (jours ouvrés). Un passage recalé déplace
   ces dates. À commander vite, commande en retard, livraison prévue trop
   tard, livraison attendue : la base le dit, l'écran le montre. En
   exemple, les mêmes règles en mémoire.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageCheck, Plus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { aujourdHui } from "../exemples/socle";
import type { Source } from "../source";
import { dateCourte } from "../format";
import { Avis, Pastille, type Teinte } from "../ui";
import { annulerCommande, chargerAppro, ecrireCommande, noterCommande, noterLivraison } from "./portes";
import { jourOuvre } from "./recalage";
import type { Appro, Commande, EtatCommande, Tableau } from "./types";

const ETATS: Record<EtatCommande, { libelle: string; teinte: Teinte }> = {
  a_commander: { libelle: "À commander", teinte: "gris" },
  a_commander_vite: { libelle: "À commander vite", teinte: "ambre" },
  commande_en_retard: { libelle: "Commande en retard", teinte: "rouge" },
  commandee: { libelle: "Commandée", teinte: "bleu" },
  livraison_tardive: { libelle: "Livraison trop tardive", teinte: "rouge" },
  livraison_attendue: { libelle: "Livraison attendue", teinte: "ambre" },
  livree_partielle: { libelle: "Livrée en partie", teinte: "ambre" },
  livree: { libelle: "Livrée", teinte: "vert" },
  annulee: { libelle: "Annulée", teinte: "gris" },
};

const plus = (iso: string, n: number) => { const [a, m, j] = iso.split("-").map(Number); const d = new Date(a, m - 1, j + n); return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`; };
function decalerOuvres(iso: string, n: number): string {
  let v = iso;
  let reste = Math.abs(n);
  const pas = n < 0 ? -1 : 1;
  while (reste > 0) { v = plus(v, pas); if (jourOuvre(v)) reste--; }
  return v;
}

/* Les échéances, comme private.btp_echeances_commande. */
function echeances(k: Omit<Commande, "echeances">, tableau: Tableau, jour: string): Commande["echeances"] {
  const p = k.passage_id ? tableau.passages.find((x) => x.id === k.passage_id && x.statut !== "annule") : null;
  const besoin = p?.debut ?? k.besoin_le;
  const livrer = besoin ? decalerOuvres(besoin, -1) : null;
  const commander = livrer ? decalerOuvres(livrer, -k.delai_jours) : null;
  const etat: EtatCommande =
    k.statut === "livree" || k.statut === "annulee" ? k.statut
    : k.statut === "a_commander" && commander && commander < jour ? "commande_en_retard"
    : k.statut === "a_commander" && commander && commander <= decalerOuvres(jour, 2) ? "a_commander_vite"
    : k.statut === "a_commander" ? "a_commander"
    : k.livraison_prevue && k.livraison_prevue < jour ? "livraison_attendue"
    : livrer && k.livraison_prevue && k.livraison_prevue > livrer ? "livraison_tardive"
    : k.statut;
  return { besoin_le: besoin, livrer_avant: livrer, commander_avant: commander, etat };
}

const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function exemple(tableau: Tableau): Omit<Commande, "echeances">[] {
  const pose = tableau.passages.find((p) => p.statut === "prevu" && /fenêtre/i.test(p.tache ?? "")) ?? tableau.passages.find((p) => p.statut === "prevu");
  const gc = tableau.passages.find((p) => p.statut === "prevu" && /garde-corps/i.test(p.tache ?? "") && p.id !== pose?.id);
  const base = { chantier_id: tableau.chantier.id, fournisseur_id: null, reference: null, besoin_le: null, commandee_le: null, livraison_prevue: null, livree_le: null, note: null, motif: null, statut: "a_commander" as const };
  return [
    { ...base, id: nid(), lot_id: pose?.lot_id ?? null, lot_code: pose?.lot_code ?? null, passage_id: pose?.id ?? null, passage_tache: pose?.tache ?? null,
      fournisseur_nom: "Menuiseries Rhône-Alpes", objet: "Fenêtres PVC sur mesure", quantite_texte: "14 châssis", delai_jours: 15,
      statut: "commandee", commandee_le: aujourdHui(-12), livraison_prevue: aujourdHui(1), reference: "CDE-45812" },
    { ...base, id: nid(), lot_id: gc?.lot_id ?? null, lot_code: gc?.lot_code ?? null, passage_id: gc?.id ?? null, passage_tache: gc?.tache ?? null,
      fournisseur_nom: "Serrurerie Dumont", objet: "Garde-corps acier, balcons R+3", quantite_texte: "12 ml", delai_jours: 8 },
    { ...base, id: nid(), lot_id: null, passage_id: null, besoin_le: aujourdHui(3), fournisseur_nom: "Loca-Nacelles Lyon", objet: "Nacelle 12 m, 2 jours", quantite_texte: null, delai_jours: 1 },
  ];
}

type Form = { type: "nouvelle" } | { type: "commandee"; k: Commande } | { type: "recue"; k: Commande } | { type: "annuler"; k: Commande } | null;

export default function ApproCarte({ tableau, source }: { tableau: Tableau; source: Source }) {
  const c = tableau.chantier;
  const [reel, setReel] = useState<Appro | null>(null);
  const [local, setLocal] = useState(() => exemple(tableau));
  const [chargement, setChargement] = useState(source === "reelle");
  const [form, setForm] = useState<Form>(null);
  const [champs, setChamps] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const auj = aujourdHui();
  const ch = (k: string) => champs[k] ?? "";
  const pose = (k: string, v: string) => setChamps((p) => ({ ...p, [k]: v }));

  const lire = useCallback(async () => {
    try {
      setReel(await chargerAppro(c.id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setChargement(false);
    }
  }, [c.id]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, lire]);

  const a: Appro | null = useMemo(
    () => (source === "reelle" ? reel : { commandes: local.map((k) => ({ ...k, echeances: echeances(k, tableau, auj) })), fournisseurs: tableau.tiers.filter((t) => t.actif && t.roles.some((r) => r === "fournisseur" || r === "loueur" || r === "sous_traitant")).map((t) => ({ id: t.id, nom: t.nom })) }),
    [source, reel, local, tableau, auj],
  );

  const ouvrir = (f: Form, init: Record<string, string> = {}) => { setErreur(null); setChamps(init); setForm(f); };

  const agir = async (reelle: () => Promise<unknown>, locale: () => void, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") { await reelle(); await lire(); } else { locale(); }
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };

  const nouvelle = () => {
    const delai = Number(ch("delai") || "5");
    const passage = tableau.passages.find((p) => p.id === ch("passage")) ?? null;
    const four = a?.fournisseurs.find((f) => f.id === ch("fournisseur")) ?? null;
    return agir(
      () => ecrireCommande(null, c.id, { objet: ch("objet"), quantite_texte: ch("quantite") || null, fournisseur_id: four?.id ?? null,
                                         fournisseur_libelle: four ? null : ch("fournisseur_libre") || null, delai_jours: delai,
                                         passage_id: passage?.id ?? null, besoin_le: passage ? null : ch("besoin") || null }),
      () => {
        if (!ch("objet").trim()) throw new Error("Dites ce qui est commandé.");
        if (!four && !ch("fournisseur_libre").trim()) throw new Error("Nommez le fournisseur (de l'annuaire ou en clair).");
        if (Number.isNaN(delai) || delai < 0 || delai > 120) throw new Error("Le délai du fournisseur va de 0 à 120 jours ouvrés.");
        setLocal((l) => [...l, { id: nid(), chantier_id: c.id, lot_id: passage?.lot_id ?? null, lot_code: passage?.lot_code ?? null, passage_id: passage?.id ?? null,
          passage_tache: passage?.tache ?? null, fournisseur_id: four?.id ?? null, fournisseur_nom: four?.nom ?? ch("fournisseur_libre").trim(), objet: ch("objet").trim(),
          quantite_texte: ch("quantite").trim() || null, reference: null, delai_jours: delai, besoin_le: passage ? null : ch("besoin") || null, statut: "a_commander",
          commandee_le: null, livraison_prevue: null, livree_le: null, note: null, motif: null }]);
      },
      `« ${ch("objet").trim()} » ajouté à l'approvisionnement.`,
    );
  };

  const commandee = (k: Commande) => agir(
    () => noterCommande(k.id, ch("promise"), ch("le") || auj, ch("reference") || null),
    () => {
      if (!ch("promise") || ch("promise") < (ch("le") || auj)) throw new Error("La livraison promise est au plus tôt le jour de la commande.");
      setLocal((l) => l.map((x) => (x.id === k.id ? { ...x, statut: "commandee", commandee_le: ch("le") || auj, livraison_prevue: ch("promise"), reference: ch("reference") || x.reference } : x)));
    },
    `« ${k.objet} » commandé, livraison promise le ${dateCourte(ch("promise"))}.`,
  );

  const recue = (k: Commande) => agir(
    () => noterLivraison(k.id, ch("le") || auj, ch("complete") !== "non", ch("note") || null),
    () => {
      if ((ch("le") || auj) > auj) throw new Error("Une livraison ne se note pas dans le futur.");
      setLocal((l) => l.map((x) => (x.id === k.id ? { ...x, statut: ch("complete") === "non" ? "livree_partielle" : "livree", livree_le: ch("le") || auj, note: ch("note") || x.note } : x)));
    },
    ch("complete") === "non" ? `« ${k.objet} » livré en partie.` : `« ${k.objet} » livré.`,
  );

  const annuler = (k: Commande) => agir(
    () => annulerCommande(k.id, ch("motif")),
    () => {
      if (!ch("motif").trim()) throw new Error("Une annulation se fait avec son motif.");
      setLocal((l) => l.map((x) => (x.id === k.id ? { ...x, statut: "annulee", motif: ch("motif").trim() } : x)));
    },
    `« ${k.objet} » annulé.`,
  );

  const enCours = c.statut === "preparation" || c.statut === "ouvert" || c.statut === "suspendu";
  const commandes = a?.commandes ?? [];
  const aSurveiller = commandes.filter((k) => ["a_commander_vite", "commande_en_retard", "livraison_tardive", "livraison_attendue"].includes(k.echeances.etat)).length;

  return (
    <section className="esp-carte" aria-label="Approvisionnement">
      <div className="esp-carte-tete">
        <div className="esp-section-titre" style={{ margin: 0 }}>
          Approvisionnement — {commandes.filter((k) => k.statut !== "annulee").length} commande{commandes.filter((k) => k.statut !== "annulee").length > 1 ? "s" : ""}{aSurveiller ? `, ${aSurveiller} à surveiller` : ""}
        </div>
        <div className="esp-actions" style={{ marginTop: 0 }}>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi || !enCours} onClick={() => ouvrir({ type: "nouvelle" }, { delai: "5" })}>
            <Plus width={14} height={14} aria-hidden="true" /> Nouvelle commande
          </button>
        </div>
      </div>
      {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {erreur && !form ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      {chargement ? <Loader variant="spin" /> : commandes.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Commandes du chantier (tableau qui défile)">
          <table className="esp-tableau">
            <thead><tr><th>Quoi</th><th>Fournisseur</th><th>Pour</th><th>Commander avant</th><th>Livraison</th><th>État</th><th></th></tr></thead>
            <tbody>
              {commandes.map((k) => (
                <tr key={k.id}>
                  <td>{k.objet}{k.quantite_texte ? <div className="esp-kpi-sous">{k.quantite_texte}</div> : null}</td>
                  <td>{k.fournisseur_nom ?? "—"}<div className="esp-kpi-sous">délai {k.delai_jours} j ouvrés{k.reference ? ` · ${k.reference}` : ""}</div></td>
                  <td>{k.passage_tache ? <>« {k.passage_tache} »</> : "—"}{k.echeances.besoin_le ? <div className="esp-kpi-sous">besoin le {dateCourte(k.echeances.besoin_le)}</div> : null}</td>
                  <td>{k.statut === "a_commander" ? dateCourte(k.echeances.commander_avant) : k.commandee_le ? <span className="esp-kpi-sous">commandé le {dateCourte(k.commandee_le)}</span> : "—"}</td>
                  <td>{k.livree_le ? `reçue le ${dateCourte(k.livree_le)}` : k.livraison_prevue ? `promise le ${dateCourte(k.livraison_prevue)}` : "—"}{k.echeances.livrer_avant && k.statut !== "livree" && k.statut !== "annulee" ? <div className="esp-kpi-sous">à livrer avant le {dateCourte(k.echeances.livrer_avant)}</div> : null}</td>
                  <td><Pastille teinte={ETATS[k.echeances.etat].teinte}>{ETATS[k.echeances.etat].libelle}</Pastille>{k.motif ? <div className="esp-kpi-sous">{k.motif}</div> : null}</td>
                  <td>
                    {k.statut === "a_commander" || k.statut === "commandee" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "commandee", k }, { le: k.commandee_le ?? auj, promise: k.livraison_prevue ?? "", reference: k.reference ?? "" })}>{k.statut === "a_commander" ? "Noter commandée" : "Changer la date promise"}</button></div> : null}
                    {k.statut === "commandee" || k.statut === "livree_partielle" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "recue", k }, { le: auj, complete: "oui" })}>Noter reçue</button></div> : null}
                    {k.statut !== "livree" && k.statut !== "annulee" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "annuler", k })}>Annuler</button></div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="esp-kpi-sous">Aucune commande : ajoutez ce qu&apos;il faut commander pour chaque passage, avec le délai du fournisseur ; Daliro dit quand commander.</p>}

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><PackageCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "nouvelle" ? "Nouvelle commande" : form?.type === "commandee" ? `Commandé : ${form.k.objet}` : form?.type === "recue" ? `Reçu : ${form.k.objet}` : form?.type === "annuler" ? `Annuler : ${form.k.objet}` : ""}</DialogTitle>
            <DialogDescription>
              {form?.type === "nouvelle" ? "Rattachée au passage qui en a besoin, elle se recale avec lui ; le délai du fournisseur se compte en jours ouvrés."
                : form?.type === "commandee" ? `À livrer avant le ${dateCourte(form.k.echeances.livrer_avant)}.`
                : form?.type === "recue" ? "Une livraison partielle laisse la commande ouverte pour le reste."
                : "La commande reste visible, marquée annulée."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {form?.type === "nouvelle" ? <>
                <label className="rv-libelle">Quoi <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" maxLength={300} value={ch("objet")} onChange={(e) => pose("objet", e.target.value)} placeholder="Fenêtres PVC sur mesure" /></label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Quantité<input className="rv-champ" maxLength={120} value={ch("quantite")} onChange={(e) => pose("quantite", e.target.value)} placeholder="14 châssis" /></label>
                  <label className="rv-libelle">Délai du fournisseur (jours ouvrés)<input className="rv-champ" inputMode="numeric" value={ch("delai")} onChange={(e) => pose("delai", e.target.value)} /></label>
                </div>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Fournisseur de l&apos;annuaire<select className="rv-champ" value={ch("fournisseur")} onChange={(e) => pose("fournisseur", e.target.value)}><option value="">— en clair —</option>{(a?.fournisseurs ?? []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
                  {!ch("fournisseur") ? <label className="rv-libelle">Fournisseur (en clair)<input className="rv-champ" maxLength={120} value={ch("fournisseur_libre")} onChange={(e) => pose("fournisseur_libre", e.target.value)} placeholder="Point P Lyon 3" /></label> : null}
                </div>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Pour le passage<select className="rv-champ" value={ch("passage")} onChange={(e) => pose("passage", e.target.value)}><option value="">— une date de besoin —</option>{tableau.passages.filter((p) => p.statut === "prevu").map((p) => <option key={p.id} value={p.id}>{p.tache ?? "Passage"} ({dateCourte(p.debut)})</option>)}</select></label>
                  {!ch("passage") ? <label className="rv-libelle">Besoin le<input className="rv-champ" type="date" value={ch("besoin")} onChange={(e) => pose("besoin", e.target.value)} /></label> : null}
                </div>
              </> : null}
              {form?.type === "commandee" ? <div className="esp-form-ligne">
                <label className="rv-libelle">Commandé le<input className="rv-champ" type="date" max={auj} value={ch("le")} onChange={(e) => pose("le", e.target.value)} /></label>
                <label className="rv-libelle">Livraison promise <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={ch("promise")} onChange={(e) => pose("promise", e.target.value)} /></label>
                <label className="rv-libelle">N° de commande<input className="rv-champ" maxLength={60} value={ch("reference")} onChange={(e) => pose("reference", e.target.value)} /></label>
              </div> : null}
              {form?.type === "recue" ? <>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Reçu le<input className="rv-champ" type="date" max={auj} value={ch("le")} onChange={(e) => pose("le", e.target.value)} /></label>
                  <label className="rv-libelle">Livraison<select className="rv-champ" value={ch("complete")} onChange={(e) => pose("complete", e.target.value)}><option value="oui">Complète</option><option value="non">En partie (le reste est attendu)</option></select></label>
                </div>
                <label className="rv-libelle">Note (bon de livraison, manquants)<input className="rv-champ" maxLength={500} value={ch("note")} onChange={(e) => pose("note", e.target.value)} placeholder="10 châssis sur 14" /></label>
              </> : null}
              {form?.type === "annuler" ? <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" maxLength={300} value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} placeholder="Pris au dépôt" /></label> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void (form?.type === "nouvelle" ? nouvelle() : form?.type === "commandee" ? commandee(form.k) : form?.type === "recue" ? recue(form.k) : form?.type === "annuler" ? annuler(form.k) : Promise.resolve())}>
              {envoi ? <Loader variant="spin" /> : null} {form?.type === "nouvelle" ? "Ajouter la commande" : form?.type === "commandee" ? "Noter commandée" : form?.type === "recue" ? "Noter reçue" : "Annuler la commande"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
