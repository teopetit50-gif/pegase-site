"use client";

/* ══════════════════════════════════════════════════════════════════════
   Conflits d'intérêts et vigilance LCB-FT d'un dossier (06/10/2026,
   session B4, b4_07)

   Le contrôle des conflits (RIN art. 4) se fait SANS que le serveur lise
   un nom : le navigateur calcule l'empreinte de chaque partie sous la clé
   d'index du cabinet (index.ts) et la base compare des empreintes. Une
   partie du dossier qui est, ailleurs, du côté opposé (client ↔ adverse),
   anciens clients compris, est un conflit : l'avocat le lève (accord écrit
   des clients) ou refuse le dossier, et sa décision est gardée. Les
   dossiers qu'on ne voit pas sont comptés, jamais nommés.

   La vigilance LCB-FT (CMF art. L.561-3) : le dossier est-il assujetti,
   le client et le bénéficiaire effectif sont-ils identifiés, quel risque.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { ScanSearch, ShieldCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Def, Pastille } from "../ui";
import { dateCourte } from "../format";
import { desenvelopper, envelopper, genererCle, phraseMemorisee } from "./chiffrement";
import { DOSSIERS_EXEMPLE, conformiteExemple } from "./exemples";
import { cleHmac, empreintesDe, normaliserNom } from "./index";
import * as portes from "./portes";
import { QUALITES } from "./regles";
import type { ActiviteAssujettie, Conformite, ControleConflits, Dossier, Partie, Piece, Trouve } from "./types";

type Props = {
  dossier: Dossier;
  source: Source;
  clientId: string;
  parties: Partie[];
  partiesClair: Record<string, { nom: string; courriels: string | null }>;
  pieces: Piece[];
  peutEcrire: boolean;
  /* un avocat qui gère le dossier : décide d'un conflit, pose la vigilance */
  peutGerer: boolean;
  gerant: boolean;
  referenceDe: (dossier: string) => string | null;
};

type Resultat = { partie: Partie; nom: string; controle: ControleConflits; decision: string | null };
type Form = { type: "vigilance" } | { type: "decider"; resultat: Resultat } | null;

export const ACTIVITES: Record<ActiviteAssujettie, string> = {
  transaction_immobiliere: "Transaction immobilière", transaction_financiere: "Transaction financière", gestion_fonds: "Gestion de fonds ou de titres",
  constitution_societe: "Constitution ou gestion de société", fiducie: "Fiducie", cession_entreprise: "Cession d'entreprise", autre_assujettie: "Autre activité assujettie",
};
const RISQUES = { faible: "Faible", standard: "Standard", eleve: "Élevé" } as const;
const MOTIFS: Record<string, string> = {
  accord_ecrit_des_clients: "Accord écrit des clients concernés",
  homonyme: "Homonyme : ce n'est pas la même personne",
  ancien_dossier_sans_lien: "Ancien dossier sans lien avec celui-ci",
  meme_cote: "Même côté : pas d'intérêts opposés",
  refus_du_dossier: "Le dossier est refusé",
};
const NATURES: Record<Trouve["nature"], string> = { conflit: "Conflit", meme_cote: "Même côté", information: "Information" };
const COMME: Record<Trouve["qualite"], string> = { client: "client", adverse: "partie adverse", confrere_adverse: "confrère adverse", expert: "expert", juridiction: "juridiction", tiers: "tiers" };

/* La clé d'index du cabinet, déballée une fois par onglet. */
const clesIndex = new Map<string, CryptoKey>();

async function obtenirCleIndex(client: string): Promise<CryptoKey> {
  const deja = clesIndex.get(client);
  if (deja) return deja;
  const k = await portes.indexCle(client);
  if (!k) throw new Error("Le cabinet n'a pas encore de clé d'index : le gérant la crée ici, une fois.");
  let brute: Uint8Array;
  if (k.fournisseur === "scaleway") {
    const r = await portes.coffre<{ cle: string }>("cle_index", { client });
    brute = Uint8Array.from(atob(r.cle), (c) => c.charCodeAt(0));
  } else {
    const phrase = phraseMemorisee();
    if (!phrase || !k.enveloppe) throw new Error("La phrase du cabinet est nécessaire pour ouvrir la clé d'index.");
    const aes = await desenvelopper(k.enveloppe, phrase);
    if (!aes) throw new Error("La phrase du cabinet n'ouvre pas la clé d'index.");
    brute = new Uint8Array(await crypto.subtle.exportKey("raw", aes));
  }
  const hmac = await cleHmac(brute);
  brute.fill(0);
  clesIndex.set(client, hmac);
  return hmac;
}

/* En exemple : la même règle que tamila_controler_conflits, sur les noms des dossiers d'exemple. */
function controleExemple(dossier: string, partie: Partie, nom: string): ControleConflits {
  const cherche = normaliserNom(nom);
  const trouves: Trouve[] = [];
  for (const c of DOSSIERS_EXEMPLE) {
    if (c.dossier.id === dossier) continue;
    for (const p of c.parties) {
      const n = c.partiesClair[p.id]?.nom;
      if (!n || normaliserNom(n) !== cherche) continue;
      const nature = (partie.qualite === "client" && p.qualite === "adverse") || (partie.qualite === "adverse" && p.qualite === "client") ? "conflit" : partie.qualite === p.qualite ? "meme_cote" : "information";
      trouves.push({ dossier: c.dossier.id, qualite: p.qualite, statut: c.dossier.statut, nature });
    }
  }
  return { controle: crypto.randomUUID(), correspondances: trouves.length, conflits: trouves.filter((t) => t.nature === "conflit").length, hors_vue: 0, trouves };
}

export default function ConformiteTamila({ dossier: d, source, clientId, parties, partiesClair, pieces, peutEcrire, peutGerer, gerant, referenceDe }: Props) {
  /* undefined : lecture ; null : la base n'a pas b4_07 */
  const [conf, setConf] = useState<Conformite | null | undefined>(() => (source === "exemple" ? conformiteExemple(d.id) : undefined));
  const [resultats, setResultats] = useState<Resultat[] | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const champ = (k: string, defaut = "") => f[k] ?? defaut;
  const poser = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const c = await portes.conformite(d.id);
      if (actif) setConf(c);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, d.id]);

  if (conf === null) return null;

  const relire = async () => setConf(await portes.conformite(d.id));
  const aControler = parties.filter((p) => (p.qualite === "client" || p.qualite === "adverse") && partiesClair[p.id]?.nom);
  const nomsLisibles = aControler.length > 0;

  async function geste(action: () => Promise<void>, message: string) {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      await action();
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  /* ——— la clé d'index : créée une fois par le gérant ——— */
  const creerIndex = () =>
    geste(async () => {
      if (source === "exemple") return;
      const etat = await portes.etatCoffre(clientId);
      if (etat && etat.statut !== "local") {
        const r = await portes.coffre<{ cle: string }>("nouvelle_cle_index", { client: clientId });
        clesIndex.set(clientId, await cleHmac(Uint8Array.from(atob(r.cle), (c) => c.charCodeAt(0))));
      } else {
        const phrase = phraseMemorisee();
        if (!phrase) throw new Error("Tapez d'abord la phrase du cabinet : la clé d'index est enveloppée sous elle.");
        const aes = await genererCle();
        await portes.poserIndexCle(clientId, await envelopper(aes, phrase));
      }
      await relire();
    }, "La clé d'index du cabinet est créée : les parties peuvent être indexées et contrôlées.");

  /* ——— le contrôle : indexer les parties du dossier, puis les comparer à tout le cabinet ——— */
  const controler = () =>
    geste(async () => {
      const sortie: Resultat[] = [];
      if (source === "exemple") {
        await new Promise((r) => setTimeout(r, 400));
        for (const p of aControler) sortie.push({ partie: p, nom: partiesClair[p.id].nom, controle: controleExemple(d.id, p, partiesClair[p.id].nom), decision: null });
      } else {
        const cle = await obtenirCleIndex(clientId);
        for (const p of aControler) {
          const nom = partiesClair[p.id].nom;
          const empreintes = await empreintesDe(cle, nom);
          if (!empreintes.length) continue;
          if (peutEcrire) await portes.indexerPartie(p.id, empreintes);
          sortie.push({ partie: p, nom, controle: await portes.controlerConflits(clientId, d.id, p.qualite, empreintes), decision: null });
        }
        await relire();
      }
      setResultats(sortie);
      if (source === "exemple") {
        const conflits = sortie.reduce((s, r) => s + r.controle.conflits, 0);
        setConf((c) => (c ? { ...c, controles: c.controles + sortie.length, conflits_sans_decision: conflits, dernier_controle: { le: new Date().toISOString(), correspondances: sortie.reduce((s, r) => s + r.controle.correspondances, 0), conflits, decision: null } } : c));
      }
    }, "Contrôle fait : chaque partie a été comparée à tous les dossiers du cabinet, sans qu'aucun nom ne quitte votre navigateur.");

  const decider = (r: Resultat) =>
    geste(async () => {
      const decision = champ("decision", r.controle.conflits ? "conflit_leve" : "pas_de_conflit");
      const motif = champ("motif", decision === "refus" ? "refus_du_dossier" : r.controle.conflits ? "accord_ecrit_des_clients" : "homonyme");
      if (source === "reelle") {
        await portes.deciderConflit(r.controle.controle, decision, motif);
        await relire();
      } else {
        await new Promise((res) => setTimeout(res, 300));
        if (r.controle.conflits) setConf((c) => (c ? { ...c, conflits_sans_decision: Math.max(0, c.conflits_sans_decision - 1) } : c));
      }
      setResultats((rs) => (rs ? rs.map((x) => (x.controle.controle === r.controle.controle ? { ...x, decision } : x)) : rs));
    }, "Décision enregistrée, avec son motif.");

  const poserVigilance = () =>
    geste(async () => {
      const assujetti = champ("assujetti", conf?.vigilance?.assujetti ? "oui" : "non") === "oui";
      const activite = assujetti ? champ("activite", conf?.vigilance?.activite ?? "transaction_immobiliere") : null;
      const ident = assujetti ? champ("identification", conf?.vigilance?.identification_le ?? "") || null : null;
      const piece = assujetti ? champ("piece", conf?.vigilance?.identification_piece ?? "") || null : null;
      const benef = assujetti ? champ("beneficiaire", conf?.vigilance?.beneficiaire_effectif_le ?? "") || null : null;
      const risque = assujetti ? champ("risque", conf?.vigilance?.risque ?? "") || null : null;
      const aujourdhui = new Date().toISOString().slice(0, 10);
      if ((ident && ident > aujourdhui) || (benef && benef > aujourdhui)) throw new Error("Une identification est datée du passé ou du jour.");
      if (source === "reelle") {
        await portes.poserVigilance(d.id, assujetti, activite, ident, piece, benef, risque);
        await relire();
      } else {
        await new Promise((res) => setTimeout(res, 300));
        setConf((c) => (c ? { ...c, vigilance: { dossier_id: d.id, client_id: d.client_id, assujetti, activite: activite as ActiviteAssujettie | null, identification_le: ident, identification_piece: piece, beneficiaire_effectif_le: benef, risque: risque as "faible" | "standard" | "eleve" | null, revue_le: aujourdhui, par: null, maj_le: new Date().toISOString() }, vigilance_a_faire: assujetti && (!ident || !benef || !risque) } : c));
      }
    }, "Vigilance enregistrée.");

  const v = conf?.vigilance ?? null;
  const ouvrir = (x: Form) => {
    setErreur(null);
    setFait(null);
    setF({});
    setForm(x);
  };

  return (
    <section className="esp-carte" aria-label="Conflits d'intérêts et vigilance">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Conflits d&apos;intérêts et vigilance</h2>
        <div className="esp-actions">
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!conf?.index || !nomsLisibles || envoi} title={!nomsLisibles ? "Les noms des parties se lisent avec la clé du dossier" : undefined} onClick={controler}>
            {envoi && !form ? <Loader variant="spin" /> : <ScanSearch width={14} height={14} aria-hidden="true" />} Contrôler les conflits
          </button>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutGerer || !conf} onClick={() => ouvrir({ type: "vigilance" })}><ShieldCheck width={14} height={14} aria-hidden="true" /> Vigilance LCB-FT</button>
        </div>
      </div>
      <div className="esp-carte-corps">
        {conf === undefined ? (
          <p className="esp-kpi-sous"><Loader variant="spin" /> Lecture…</p>
        ) : (
          <>
            {fait && !form ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
            {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            {!conf.index ? (
              <Avis teinte="ambre">
                <strong>Pas encore de clé d&apos;index.</strong> Elle permet de comparer les parties de tous les dossiers sans que le serveur lise un seul nom.
                {gerant ? <div className="esp-actions" style={{ marginTop: 8 }}><button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi} onClick={creerIndex}>Créer la clé d&apos;index du cabinet</button></div> : <> Le gérant la crée, une fois pour le cabinet.</>}
              </Avis>
            ) : null}
            {conf.conflits_sans_decision ? (
              <Avis teinte="rouge" role="alert"><strong>{conf.conflits_sans_decision} conflit{conf.conflits_sans_decision > 1 ? "s" : ""} sans décision.</strong> Avant d&apos;accepter le dossier, levez-le (accord écrit des clients) ou refusez le dossier (RIN art. 4).</Avis>
            ) : null}
            {conf.vigilance_a_faire ? (
              <Avis teinte="ambre">{!v ? "La vigilance LCB-FT n'est pas posée : dites si le dossier est assujetti (CMF art. L.561-3)." : "Dossier assujetti : identifiez le client et le bénéficiaire effectif, et notez le niveau de risque."}</Avis>
            ) : null}

            <dl className="esp-def esp-def--trois">
              <Def etiquette="Dernier contrôle">{conf.dernier_controle ? <>{dateCourte(conf.dernier_controle.le)} · {conf.dernier_controle.conflits ? `${conf.dernier_controle.conflits} conflit${conf.dernier_controle.conflits > 1 ? "s" : ""}` : `${conf.dernier_controle.correspondances} correspondance${conf.dernier_controle.correspondances > 1 ? "s" : ""}`}</> : "Jamais"}</Def>
              <Def etiquette="Parties indexées">{conf.parties_indexees} sur {conf.parties}</Def>
              <Def etiquette="Vigilance LCB-FT">{!v ? "À poser" : !v.assujetti ? "Non assujetti" : `${ACTIVITES[v.activite as ActiviteAssujettie] ?? "Assujetti"}${v.risque ? ` · risque ${RISQUES[v.risque].toLowerCase()}` : ""}`}</Def>
            </dl>

            <p className="esp-kpi-sous tam-notice">Les noms ne sont jamais conservés en clair ; une empreinte reste pour détecter un conflit avec un ancien client.</p>

            {resultats ? resultats.map((r) => (
              <div key={r.controle.controle} className="tam-ligne">
                <div className="tam-ligne-haut">
                  <span className="tam-ligne-titre">{r.nom}</span>
                  <Pastille teinte="gris" contour>{QUALITES[r.partie.qualite]}</Pastille>
                  <Pastille teinte={r.controle.conflits ? "rouge" : r.controle.correspondances ? "ambre" : "vert"}>{r.controle.conflits ? `${r.controle.conflits} conflit${r.controle.conflits > 1 ? "s" : ""}` : r.controle.correspondances ? "Déjà connu" : "Aucune correspondance"}</Pastille>
                  {r.decision ? <Pastille teinte="noir" contour>{r.decision === "refus" ? "Dossier refusé" : r.decision === "conflit_leve" ? "Conflit levé" : "Pas de conflit"}</Pastille> : null}
                </div>
                {r.controle.trouves.length ? (
                  <div className="tam-ligne-meta">
                    {r.controle.trouves.map((t, i) => (
                      <span key={i}>{NATURES[t.nature]} : {COMME[t.qualite]} {t.dossier ? <>dans le dossier <span className="esp-mono">{referenceDe(t.dossier) ?? "chiffré"}</span></> : t.statut === "efface" ? "dans un dossier effacé (ancien client)" : "dans un dossier hors de votre vue"}</span>
                    ))}
                    {!r.decision && peutGerer ? <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "decider", resultat: r })}>Décider</button> : null}
                  </div>
                ) : null}
              </div>
            )) : (
              <p className="esp-kpi-sous">{nomsLisibles ? "Le contrôle compare le client et l'adversaire de ce dossier à toutes les parties du cabinet, anciens dossiers compris." : "Les noms des parties se lisent avec la clé du dossier : ouvrez-la pour contrôler."}</p>
            )}
          </>
        )}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          {form ? (
            <>
              <DialogHeader>
                <DialogIcone>{form.type === "vigilance" ? <ShieldCheck width={18} height={18} aria-hidden="true" /> : <ScanSearch width={18} height={18} aria-hidden="true" />}</DialogIcone>
                <DialogTitle>{form.type === "vigilance" ? "La vigilance LCB-FT du dossier" : `Décider : ${form.resultat.nom}`}</DialogTitle>
                <DialogDescription>
                  {form.type === "vigilance" ? "L'avocat est assujetti pour certaines activités seulement (CMF art. L.561-3) : il identifie alors le client et le bénéficiaire effectif et apprécie le risque." : form.resultat.controle.conflits ? "Des intérêts opposés : le conflit se lève avec l'accord écrit des clients concernés, ou le dossier se refuse (RIN art. 4)." : "La partie est déjà connue du cabinet, du même côté ou sans opposition d'intérêts."}
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="esp-form">
                  {form.type === "vigilance" ? (
                    <>
                      <label className="rv-libelle">Le dossier est-il assujetti ?<select className="rv-champ" value={champ("assujetti", v?.assujetti ? "oui" : "non")} onChange={(e) => poser("assujetti", e.target.value)}><option value="non">Non (conseil ou contentieux hors activités assujetties)</option><option value="oui">Oui</option></select></label>
                      {champ("assujetti", v?.assujetti ? "oui" : "non") === "oui" ? (
                        <>
                          <label className="rv-libelle">Activité<select className="rv-champ" value={champ("activite", v?.activite ?? "transaction_immobiliere")} onChange={(e) => poser("activite", e.target.value)}>{(Object.keys(ACTIVITES) as ActiviteAssujettie[]).map((a) => <option key={a} value={a}>{ACTIVITES[a]}</option>)}</select></label>
                          <div className="esp-form-ligne">
                            <label className="rv-libelle">Client identifié le<input className="rv-champ" type="date" value={champ("identification", v?.identification_le ?? "")} onChange={(e) => poser("identification", e.target.value)} /></label>
                            <label className="rv-libelle">Bénéficiaire effectif vérifié le<input className="rv-champ" type="date" value={champ("beneficiaire", v?.beneficiaire_effectif_le ?? "")} onChange={(e) => poser("beneficiaire", e.target.value)} /></label>
                          </div>
                          <div className="esp-form-ligne">
                            <label className="rv-libelle">Pièce d&apos;identité<select className="rv-champ" value={champ("piece", v?.identification_piece ?? "")} onChange={(e) => poser("piece", e.target.value)}><option value="">— non déposée —</option>{pieces.map((pc) => <option key={pc.id} value={pc.id}>{pc.nom_fichier}</option>)}</select></label>
                            <label className="rv-libelle">Niveau de risque<select className="rv-champ" value={champ("risque", v?.risque ?? "")} onChange={(e) => poser("risque", e.target.value)}><option value="">— à apprécier —</option>{(Object.keys(RISQUES) as (keyof typeof RISQUES)[]).map((k) => <option key={k} value={k}>{RISQUES[k]}</option>)}</select></label>
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <label className="rv-libelle">Décision<select className="rv-champ" value={champ("decision", form.resultat.controle.conflits ? "conflit_leve" : "pas_de_conflit")} onChange={(e) => poser("decision", e.target.value)}>
                        {form.resultat.controle.conflits ? null : <option value="pas_de_conflit">Pas de conflit</option>}
                        <option value="conflit_leve">Conflit levé</option>
                        <option value="refus">Refuser le dossier</option>
                      </select></label>
                      <label className="rv-libelle">Motif<select className="rv-champ" value={champ("motif", champ("decision", form.resultat.controle.conflits ? "conflit_leve" : "pas_de_conflit") === "refus" ? "refus_du_dossier" : form.resultat.controle.conflits ? "accord_ecrit_des_clients" : "homonyme")} onChange={(e) => poser("motif", e.target.value)}>{Object.entries(MOTIFS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                    </>
                  )}
                  {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
                </div>
              </DialogBody>
              <DialogFooter>
                <button type="button" className="r-btn r-btn--fil" onClick={() => setForm(null)}>Fermer</button>
                <button type="button" className={`r-btn ${form.type === "decider" && champ("decision") === "refus" ? "r-btn--rouge" : "r-btn--noir"}`} disabled={envoi} onClick={() => (form.type === "vigilance" ? void poserVigilance() : void decider(form.resultat))}>
                  {envoi ? <Loader variant="spin" /> : null} Enregistrer
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
