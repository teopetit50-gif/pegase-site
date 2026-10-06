"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'approvisionnement du chantier (06/10/2026, session B6, b6_22)

   Chaque commande est rattachée au passage qui en a besoin : « livrer
   avant » = le jour ouvré qui précède son début, « commander avant » =
   moins le délai du fournisseur (jours ouvrés). Un passage recalé déplace
   ces dates. À commander vite, commande en retard, livraison prévue trop
   tard, livraison attendue : la base le dit, l'écran le montre. En
   exemple, les mêmes règles en mémoire.

   b6_23 : la liste se prépare depuis le devis vérifié (quantités du
   marché, passages du planning) ; la livraison est proposée la veille
   ouvrée de la pose (plus de 5 jours avant : « trop tôt ») ; chaque bon
   de livraison est comparé à la quantité commandée (manquant, excédent) ;
   le matériel loué porte sa date de retour.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListChecks, PackageCheck, Plus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { aujourdHui } from "../exemples/socle";
import type { Source } from "../source";
import { dateCourte } from "../format";
import { Avis, Pastille, type Teinte } from "../ui";
import { annulerCommande, chargerAppro, ecrireCommande, noterCommande, noterRetour, preparerListe, recevoir } from "./portes";
import { jourOuvre } from "./recalage";
import type { Appro, Commande, EtatCommande, Tableau } from "./types";

const ETATS: Record<EtatCommande, { libelle: string; teinte: Teinte }> = {
  a_commander: { libelle: "À commander", teinte: "gris" },
  a_commander_vite: { libelle: "À commander vite", teinte: "ambre" },
  commande_en_retard: { libelle: "Commande en retard", teinte: "rouge" },
  commandee: { libelle: "Commandée", teinte: "bleu" },
  livraison_tardive: { libelle: "Livraison trop tardive", teinte: "rouge" },
  livraison_trop_tot: { libelle: "Livrée trop tôt : stockage", teinte: "ambre" },
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

/* Les échéances, comme private.btp_echeances_commande (b6_23). */
function echeances(k: Omit<Commande, "echeances">, tableau: Tableau, jour: string): Commande["echeances"] {
  const p = k.passage_id ? tableau.passages.find((x) => x.id === k.passage_id && x.statut !== "annule") : null;
  const besoin = p?.debut ?? k.besoin_le;
  const livrer = besoin ? decalerOuvres(besoin, -1) : null;
  const commander = livrer ? decalerOuvres(livrer, -k.delai_jours) : null;
  const recus = (k.livraisons ?? []).filter((l) => l.quantite !== null);
  const livre = recus.length ? recus.reduce((t, l) => t + (l.quantite ?? 0), 0) : null;
  const etat: EtatCommande =
    k.statut === "livree" || k.statut === "annulee" ? k.statut
    : k.statut === "a_commander" && commander && commander < jour ? "commande_en_retard"
    : k.statut === "a_commander" && commander && commander <= decalerOuvres(jour, 2) ? "a_commander_vite"
    : k.statut === "a_commander" ? "a_commander"
    : k.statut === "livree_partielle" ? "livree_partielle"
    : k.livraison_prevue && k.livraison_prevue < jour ? "livraison_attendue"
    : livrer && k.livraison_prevue && k.livraison_prevue > livrer ? "livraison_tardive"
    : livrer && k.livraison_prevue && k.livraison_prevue < decalerOuvres(livrer, -5) ? "livraison_trop_tot"
    : k.statut;
  const retourPrevu = k.a_retourner ? k.retour_prevu ?? (p ? decalerOuvres(p.fin, 1) : null) : null;
  const retour = !k.a_retourner ? null : k.retourne_le ? "rendu" : k.statut !== "livree" && k.statut !== "livree_partielle" ? null : retourPrevu && retourPrevu < jour ? "a_rendre" : "sur_chantier";
  return { besoin_le: besoin, livrer_avant: livrer, livrer_le: livrer, commander_avant: commander, etat,
           quantite_commandee: k.quantite ?? null, quantite_livree: livre, ecart: k.quantite != null && livre !== null ? livre - k.quantite : null,
           retour_prevu: retourPrevu, retour };
}

const UNITES: Record<string, string> = { m2: "m²", m3: "m³", ml: "m" };
const qte = (v: number | null | undefined, u: string | null | undefined) => (v == null ? "" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(v)} ${u ? UNITES[u] ?? u : ""}`.trim());

/* La liste cadencée, comme public.btp_preparer_liste : lignes du marché vérifié, lots de l'entreprise, matières. */
function listeLocale(tableau: Tableau, deja: Omit<Commande, "echeances">[]): Omit<Commande, "echeances">[] {
  const lotsClient = new Set(tableau.lots.filter((l) => l.execution === "client").map((l) => l.id));
  const lignes = tableau.marches.filter((m) => m.statut === "verifie").flatMap((m) => m.lignes)
    .filter((l) => l.lot_id && lotsClient.has(l.lot_id) && (l.nature === "ouvrage" || l.nature === "fourniture") && l.quantite && l.quantite > 0
                   && ["u", "ml", "m2", "m3", "kg", "t", "l"].includes(l.unite ?? ""));
  return lignes.filter((l) => !deja.some((k) => k.ligne_marche_id === l.id && k.statut !== "annulee")).map((l) => {
    const p = tableau.passages.filter((x) => x.lot_id === l.lot_id && x.statut === "prevu").sort((a, b) => a.debut.localeCompare(b.debut))[0];
    return { id: nid(), chantier_id: tableau.chantier.id, lot_id: l.lot_id, lot_code: tableau.lots.find((x) => x.id === l.lot_id)?.code ?? null,
             passage_id: p?.id ?? null, passage_tache: p?.tache ?? null, ligne_marche_id: l.id, fournisseur_id: null, fournisseur_nom: null,
             objet: l.designation.slice(0, 300), quantite: l.quantite, unite: l.unite, quantite_texte: qte(l.quantite, l.unite), reference: null, delai_jours: 5,
             besoin_le: null, statut: "a_commander" as const, commandee_le: null, livraison_prevue: null, livree_le: null, note: null, motif: null,
             a_retourner: false, retour_prevu: null, retourne_le: null, livraisons: [] };
  });
}

const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function exemple(tableau: Tableau): Omit<Commande, "echeances">[] {
  const pose = tableau.passages.find((p) => p.statut === "prevu" && /fenêtre/i.test(p.tache ?? "")) ?? tableau.passages.find((p) => p.statut === "prevu");
  const gc = tableau.passages.find((p) => p.statut === "prevu" && /garde-corps/i.test(p.tache ?? "") && p.id !== pose?.id);
  const base = { chantier_id: tableau.chantier.id, fournisseur_id: null, reference: null, besoin_le: null, commandee_le: null, livraison_prevue: null, livree_le: null, note: null, motif: null,
                 statut: "a_commander" as Commande["statut"], a_retourner: false, retour_prevu: null, retourne_le: null, livraisons: [] as Commande["livraisons"] };
  return [
    { ...base, id: nid(), lot_id: pose?.lot_id ?? null, lot_code: pose?.lot_code ?? null, passage_id: pose?.id ?? null, passage_tache: pose?.tache ?? null,
      fournisseur_nom: "Menuiseries Rhône-Alpes", objet: "Fenêtres PVC sur mesure", quantite_texte: "14 u", quantite: 14, unite: "u", delai_jours: 15,
      statut: "commandee", commandee_le: aujourdHui(-12), livraison_prevue: aujourdHui(1), reference: "CDE-45812" },
    { ...base, id: nid(), lot_id: gc?.lot_id ?? null, lot_code: gc?.lot_code ?? null, passage_id: gc?.id ?? null, passage_tache: gc?.tache ?? null,
      fournisseur_nom: "Serrurerie Dumont", objet: "Garde-corps acier, balcons R+3", quantite_texte: "12 ml", delai_jours: 8 },
    { ...base, id: nid(), lot_id: null, passage_id: null, besoin_le: aujourdHui(3), fournisseur_nom: "Loca-Nacelles Lyon", objet: "Nacelle 12 m, 2 jours", quantite_texte: null, delai_jours: 1,
      statut: "livree", commandee_le: aujourdHui(-6), livraison_prevue: aujourdHui(-3), livree_le: aujourdHui(-3), a_retourner: true, retour_prevu: aujourdHui(-1),
      livraisons: [{ id: nid(), livree_le: aujourdHui(-3), quantite: null, bon_reference: "LN-2291", piece_id: null, note: null }] },
  ];
}

type Form = { type: "nouvelle" } | { type: "commandee"; k: Commande } | { type: "recue"; k: Commande } | { type: "rendu"; k: Commande } | { type: "annuler"; k: Commande } | null;

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
    const aRendre = ch("a_rendre") === "oui";
    return agir(
      () => ecrireCommande(null, c.id, { objet: ch("objet"), quantite_texte: ch("quantite") || null, fournisseur_id: four?.id ?? null,
                                         fournisseur_libelle: four ? null : ch("fournisseur_libre") || null, delai_jours: delai,
                                         passage_id: passage?.id ?? null, besoin_le: passage ? null : ch("besoin") || null, a_retourner: aRendre }),
      () => {
        if (!ch("objet").trim()) throw new Error("Dites ce qui est commandé.");
        if (Number.isNaN(delai) || delai < 0 || delai > 120) throw new Error("Le délai du fournisseur va de 0 à 120 jours ouvrés.");
        setLocal((l) => [...l, { id: nid(), chantier_id: c.id, lot_id: passage?.lot_id ?? null, lot_code: passage?.lot_code ?? null, passage_id: passage?.id ?? null,
          passage_tache: passage?.tache ?? null, fournisseur_id: four?.id ?? null, fournisseur_nom: four?.nom ?? (ch("fournisseur_libre").trim() || null), objet: ch("objet").trim(),
          quantite_texte: ch("quantite").trim() || null, reference: null, delai_jours: delai, besoin_le: passage ? null : ch("besoin") || null, statut: "a_commander",
          commandee_le: null, livraison_prevue: null, livree_le: null, note: null, motif: null, a_retourner: aRendre, retour_prevu: null, retourne_le: null, livraisons: [] }]);
      },
      `« ${ch("objet").trim()} » ajouté à l'approvisionnement.`,
    );
  };

  const liste = () => agir(
    async () => { const r = await preparerListe(c.id); setFait(null); return r; },
    () => {
      if (!tableau.marches.some((m) => m.statut === "verifie")) throw new Error("La liste se prépare depuis le marché vérifié : vérifiez d'abord le marché.");
      setLocal((l) => [...l, ...listeLocale(tableau, l)]);
    },
    "La liste est préparée depuis le devis : choisissez les fournisseurs, Daliro dit quand commander.",
  );

  const commandee = (k: Commande) => {
    const four = a?.fournisseurs.find((f) => f.id === ch("fournisseur")) ?? null;
    const libre = ch("fournisseur_libre").trim();
    const sansFournisseur = !k.fournisseur_nom;
    return agir(
      async () => {
        if (sansFournisseur && (four || libre)) await ecrireCommande(k.id, c.id, four ? { fournisseur_id: four.id } : { fournisseur_libelle: libre });
        return noterCommande(k.id, ch("promise"), ch("le") || auj, ch("reference") || null);
      },
      () => {
        if (sansFournisseur && !four && !libre) throw new Error("Choisissez le fournisseur avant de commander.");
        if (!ch("promise") || ch("promise") < (ch("le") || auj)) throw new Error("La livraison promise est au plus tôt le jour de la commande.");
        setLocal((l) => l.map((x) => (x.id === k.id ? { ...x, statut: "commandee", commandee_le: ch("le") || auj, livraison_prevue: ch("promise"), reference: ch("reference") || x.reference,
                                                        fournisseur_id: four?.id ?? x.fournisseur_id, fournisseur_nom: x.fournisseur_nom ?? four?.nom ?? libre } : x)));
      },
      `« ${k.objet} » commandé, livraison promise le ${dateCourte(ch("promise"))}.`,
    );
  };

  const recue = (k: Commande) => {
    const q = ch("qte").trim() ? Number(ch("qte").replace(",", ".")) : null;
    return agir(
      () => recevoir(k.id, ch("le") || auj, q, ch("bon") || null, ch("note") || null),
      () => {
        if ((ch("le") || auj) > auj) throw new Error("Une livraison ne se note pas dans le futur.");
        if (q !== null && (Number.isNaN(q) || q <= 0)) throw new Error("La quantité reçue est positive.");
        setLocal((l) => l.map((x) => {
          if (x.id !== k.id) return x;
          const livraisons = [...(x.livraisons ?? []), { id: nid(), livree_le: ch("le") || auj, quantite: q, bon_reference: ch("bon") || null, piece_id: null, note: ch("note") || null }];
          const cumul = livraisons.reduce((t, y) => t + (y.quantite ?? 0), 0);
          const complete = x.quantite != null && livraisons.some((y) => y.quantite !== null) ? cumul >= x.quantite : ch("complete") !== "non";
          return { ...x, livraisons, statut: complete ? "livree" : "livree_partielle", livree_le: ch("le") || auj };
        }));
      },
      `Réception de « ${k.objet} » notée${ch("bon") ? ` (bon ${ch("bon")})` : ""}.`,
    );
  };

  const rendu = (k: Commande) => agir(
    () => noterRetour(k.id, ch("le") || auj, null),
    () => {
      if ((ch("le") || auj) > auj) throw new Error("Un retour ne se note pas dans le futur.");
      setLocal((l) => l.map((x) => (x.id === k.id ? { ...x, retourne_le: ch("le") || auj } : x)));
    },
    `« ${k.objet} » rendu.`,
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
  const aSurveiller = commandes.filter((k) => ["a_commander_vite", "commande_en_retard", "livraison_tardive", "livraison_attendue"].includes(k.echeances.etat) || k.echeances.retour === "a_rendre").length;
  const devisVerifie = a?.devis_verifie ?? tableau.marches.some((m) => m.statut === "verifie");

  return (
    <section className="esp-carte" aria-label="Approvisionnement">
      <div className="esp-carte-tete">
        <div className="esp-section-titre" style={{ margin: 0 }}>
          Approvisionnement — {commandes.filter((k) => k.statut !== "annulee").length} commande{commandes.filter((k) => k.statut !== "annulee").length > 1 ? "s" : ""}{aSurveiller ? `, ${aSurveiller} à surveiller` : ""}
        </div>
        <div className="esp-actions" style={{ marginTop: 0 }}>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi || !enCours || !devisVerifie} onClick={() => void liste()}
                  title={!devisVerifie ? "La liste se prépare depuis le marché vérifié" : undefined}>
            <ListChecks width={14} height={14} aria-hidden="true" /> Préparer la liste depuis le devis
          </button>
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
                  <td>{k.objet}{k.quantite_texte ? <div className="esp-kpi-sous">{k.quantite_texte}{k.ligne_marche_id ? " · du devis" : ""}</div> : null}
                    {k.a_retourner ? <div className="esp-kpi-sous">{k.echeances.retour === "rendu" ? `rendu le ${dateCourte(k.retourne_le)}` : `à rendre le ${dateCourte(k.echeances.retour_prevu)}`}</div> : null}</td>
                  <td>{k.fournisseur_nom ?? <span className="esp-obligatoire">à choisir</span>}<div className="esp-kpi-sous">délai {k.delai_jours} j ouvrés{k.reference ? ` · ${k.reference}` : ""}</div></td>
                  <td>{k.passage_tache ? <>« {k.passage_tache} »</> : "—"}{k.echeances.besoin_le ? <div className="esp-kpi-sous">besoin le {dateCourte(k.echeances.besoin_le)}</div> : null}</td>
                  <td>{k.statut === "a_commander" ? dateCourte(k.echeances.commander_avant) : k.commandee_le ? <span className="esp-kpi-sous">commandé le {dateCourte(k.commandee_le)}</span> : "—"}</td>
                  <td>{k.livree_le ? `reçue le ${dateCourte(k.livree_le)}` : k.livraison_prevue ? `promise le ${dateCourte(k.livraison_prevue)}` : "—"}
                    {k.echeances.livrer_le && k.statut !== "livree" && k.statut !== "annulee" ? <div className="esp-kpi-sous">à livrer le {dateCourte(k.echeances.livrer_le)}, veille de la pose</div> : null}
                    {k.echeances.quantite_livree != null ? <div className="esp-kpi-sous">reçu {qte(k.echeances.quantite_livree, k.unite)}{k.quantite != null ? ` sur ${qte(k.quantite, k.unite)}` : ""}
                      {k.echeances.ecart ? <> · <Pastille teinte="ambre" contour>{k.echeances.ecart < 0 ? `manque ${qte(-k.echeances.ecart, k.unite)}` : `${qte(k.echeances.ecart, k.unite)} en trop`}</Pastille></> : null}</div> : null}
                    {(k.livraisons ?? []).filter((l) => l.bon_reference).length ? <div className="esp-kpi-sous">bon{(k.livraisons ?? []).filter((l) => l.bon_reference).length > 1 ? "s" : ""} {(k.livraisons ?? []).map((l) => l.bon_reference).filter(Boolean).join(", ")}</div> : null}</td>
                  <td><Pastille teinte={ETATS[k.echeances.etat].teinte}>{ETATS[k.echeances.etat].libelle}</Pastille>{k.echeances.retour === "a_rendre" ? <div><Pastille teinte="rouge" contour>À rendre</Pastille></div> : null}{k.motif ? <div className="esp-kpi-sous">{k.motif}</div> : null}</td>
                  <td>
                    {k.statut === "a_commander" || k.statut === "commandee" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "commandee", k }, { le: k.commandee_le ?? auj, promise: k.livraison_prevue ?? "", reference: k.reference ?? "" })}>{k.statut === "a_commander" ? "Noter commandée" : "Changer la date promise"}</button></div> : null}
                    {k.statut === "commandee" || k.statut === "livree_partielle" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "recue", k }, { le: auj, complete: "oui" })}>Noter reçue</button></div> : null}
                    {k.a_retourner && !k.retourne_le && (k.statut === "livree" || k.statut === "livree_partielle") ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "rendu", k }, { le: auj })}>Noter rendu</button></div> : null}
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
            <DialogTitle>{form?.type === "nouvelle" ? "Nouvelle commande" : form?.type === "commandee" ? `Commandé : ${form.k.objet}` : form?.type === "recue" ? `Reçu : ${form.k.objet}` : form?.type === "rendu" ? `Rendu : ${form.k.objet}` : form?.type === "annuler" ? `Annuler : ${form.k.objet}` : ""}</DialogTitle>
            <DialogDescription>
              {form?.type === "nouvelle" ? "Rattachée au passage qui en a besoin, elle se recale avec lui ; le délai du fournisseur se compte en jours ouvrés."
                : form?.type === "commandee" ? `À livrer avant le ${dateCourte(form.k.echeances.livrer_avant)}.`
                : form?.type === "recue" ? (form.k.quantite != null ? `Commandé : ${qte(form.k.quantite, form.k.unite)}. La quantité du bon est comparée à la commande ; ce qui manque reste attendu.` : "Une livraison partielle laisse la commande ouverte pour le reste.")
                : form?.type === "rendu" ? "Le matériel quitte le chantier : la location s'arrête."
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
                <label className="rv-libelle" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={ch("a_rendre") === "oui"} onChange={(e) => pose("a_rendre", e.target.checked ? "oui" : "")} /> Matériel à rendre (location, consigne)</label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Pour le passage<select className="rv-champ" value={ch("passage")} onChange={(e) => pose("passage", e.target.value)}><option value="">— une date de besoin —</option>{tableau.passages.filter((p) => p.statut === "prevu").map((p) => <option key={p.id} value={p.id}>{p.tache ?? "Passage"} ({dateCourte(p.debut)})</option>)}</select></label>
                  {!ch("passage") ? <label className="rv-libelle">Besoin le<input className="rv-champ" type="date" value={ch("besoin")} onChange={(e) => pose("besoin", e.target.value)} /></label> : null}
                </div>
              </> : null}
              {form?.type === "commandee" && !form.k.fournisseur_nom ? <div className="esp-form-ligne">
                <label className="rv-libelle">Fournisseur de l&apos;annuaire<select className="rv-champ" value={ch("fournisseur")} onChange={(e) => pose("fournisseur", e.target.value)}><option value="">— en clair —</option>{(a?.fournisseurs ?? []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
                {!ch("fournisseur") ? <label className="rv-libelle">Fournisseur (en clair)<input className="rv-champ" maxLength={120} value={ch("fournisseur_libre")} onChange={(e) => pose("fournisseur_libre", e.target.value)} placeholder="Point P Lyon 3" /></label> : null}
              </div> : null}
              {form?.type === "commandee" ? <div className="esp-form-ligne">
                <label className="rv-libelle">Commandé le<input className="rv-champ" type="date" max={auj} value={ch("le")} onChange={(e) => pose("le", e.target.value)} /></label>
                <label className="rv-libelle">Livraison promise <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={ch("promise")} onChange={(e) => pose("promise", e.target.value)} /></label>
                <label className="rv-libelle">N° de commande<input className="rv-champ" maxLength={60} value={ch("reference")} onChange={(e) => pose("reference", e.target.value)} /></label>
              </div> : null}
              {form?.type === "recue" ? <>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Reçu le<input className="rv-champ" type="date" max={auj} value={ch("le")} onChange={(e) => pose("le", e.target.value)} /></label>
                  {form.k.quantite != null
                    ? <label className="rv-libelle">Quantité reçue ({form.k.unite ? UNITES[form.k.unite] ?? form.k.unite : "u"})<input className="rv-champ" inputMode="decimal" value={ch("qte")} onChange={(e) => pose("qte", e.target.value)} /></label>
                    : <label className="rv-libelle">Livraison<select className="rv-champ" value={ch("complete")} onChange={(e) => pose("complete", e.target.value)}><option value="oui">Complète</option><option value="non">En partie (le reste est attendu)</option></select></label>}
                </div>
                <label className="rv-libelle">N° du bon de livraison<input className="rv-champ" maxLength={60} value={ch("bon")} onChange={(e) => pose("bon", e.target.value)} placeholder="BL-5531" /></label>
                <label className="rv-libelle">Note (bon de livraison, manquants)<input className="rv-champ" maxLength={500} value={ch("note")} onChange={(e) => pose("note", e.target.value)} placeholder="10 châssis sur 14" /></label>
              </> : null}
              {form?.type === "rendu" ? <label className="rv-libelle">Rendu le<input className="rv-champ" type="date" max={auj} value={ch("le")} onChange={(e) => pose("le", e.target.value)} /></label> : null}
              {form?.type === "annuler" ? <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" maxLength={300} value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} placeholder="Pris au dépôt" /></label> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void (form?.type === "nouvelle" ? nouvelle() : form?.type === "commandee" ? commandee(form.k) : form?.type === "recue" ? recue(form.k) : form?.type === "rendu" ? rendu(form.k) : form?.type === "annuler" ? annuler(form.k) : Promise.resolve())}>
              {envoi ? <Loader variant="spin" /> : null} {form?.type === "nouvelle" ? "Ajouter la commande" : form?.type === "commandee" ? "Noter commandée" : form?.type === "recue" ? "Noter reçue" : form?.type === "rendu" ? "Noter rendu" : "Annuler la commande"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
