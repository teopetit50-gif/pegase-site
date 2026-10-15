"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les exports automatiques — VARELO (06/10/2026, B1, migration b1_10)

   Chaque société branche son logiciel (Sage 100, EBP, Cegid, Quadra,
   Pennylane ou un tableur) : ses exports — fournisseurs, clients, balances
   âgées, balance générale — arrivent par le canal de dépôt réglé avec Omega
   (courriel ou passerelle), le lecteur d'exports les lit d'après les
   modèles Varelo, et Varelo les applique comme un dépôt à la main.
   Depuis b1_16, brancher et débrancher passent par l'accord de la DSI :
   porte grp_demander_source, demande dans la file du socle, exécutée à
   la validation (grp_sources_demandes).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plug, Unplug } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Chargement, Pastille } from "../ui";
import { dateCourte } from "../format";
import type { Contexte, Societe } from "./types";

export const LOGICIELS: { cle: string; libelle: string }[] = [
  { cle: "sage100", libelle: "Sage 100" },
  { cle: "ebp", libelle: "EBP" },
  { cle: "cegid", libelle: "Cegid" },
  { cle: "quadra", libelle: "Quadra" },
  { cle: "pennylane", libelle: "Pennylane" },
  { cle: "tableur", libelle: "Tableur (Excel, CSV)" },
  { cle: "lightspeed", libelle: "Lightspeed (caisse)" },
  { cle: "zelty", libelle: "Zelty (caisse)" },
  { cle: "tiller", libelle: "Tiller (caisse)" },
  { cle: "sumup", libelle: "SumUp (caisse)" },
  { cle: "cashpad", libelle: "Cashpad (caisse)" },
];
const CAISSES = ["lightspeed", "zelty", "tiller", "sumup", "cashpad"];
export const JEUX: { cle: string; libelle: string }[] = [
  { cle: "fournisseurs", libelle: "Fournisseurs" },
  { cle: "clients", libelle: "Clients" },
  { cle: "balance_agee_clients", libelle: "Balance âgée clients" },
  { cle: "balance_agee_fournisseurs", libelle: "Balance âgée fournisseurs" },
  { cle: "balance_generale", libelle: "Balance générale" },
  { cle: "ventes_caisse", libelle: "Ventes des caisses" },
];
/* les jeux qu'un logiciel sait sortir (b1_17) : une caisse, ses ventes ; un logiciel de gestion, les cinq ; un tableur, tout */
export const jeuxDe = (logiciel: string) => JEUX.filter((j) => (CAISSES.includes(logiciel) ? j.cle === "ventes_caisse" : logiciel === "tableur" || j.cle !== "ventes_caisse"));

type Jeu = { code: string; actif: boolean; dernier_recu_le: string | null; lignes: number };
type Branchement = { id: string; entite_id: string | null; logiciel: string; libelle: string; statut: string; jeux: Jeu[] };
type DemandeSource = { entite_id: string | null; logiciel: string; genre: "brancher" | "debrancher" };

const hier = () => new Date(Date.now() - 86400000).toISOString();

export default function Branchements({ source, contexte, client_id, societes, onFait }: { source: Source; contexte: Contexte | null; client_id: string; societes: Societe[]; onFait: (m: string) => void }) {
  const [locaux] = useState<Branchement[]>(() =>
    societes[0]
      ? [{ id: "exemple-1", entite_id: societes[0].entite_id, logiciel: "sage100", libelle: "Sage 100 du siège", statut: "actif", jeux: JEUX.map((j, i) => ({ code: j.cle, actif: true, dernier_recu_le: i < 3 ? hier() : null, lignes: [134, 633, 41, 0, 0][i] })) }]
      : [],
  );
  const [reels, setReels] = useState<Branchement[] | null>(null);
  const [demandesLocales, setDemandesLocales] = useState<DemandeSource[]>([]);
  const [demandesReelles, setDemandesReelles] = useState<DemandeSource[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const supabase = createClient();
    const [b, j, d] = await Promise.all([
      supabase.from("branchements").select("id, entite_id, logiciel, libelle, statut").eq("client_id", client_id).eq("module", "varelo"),
      supabase.from("branchements_jeux").select("branchement_id, code, actif, dernier_recu_le, lignes").eq("client_id", client_id),
      supabase.from("grp_sources_demandes").select("entite_id, logiciel, genre").eq("client_id", client_id).eq("statut", "en_attente"),
    ]);
    setDemandesReelles((d.data ?? []) as DemandeSource[]);
    if (b.error || j.error) {
      setErreur((b.error ?? j.error)?.message ?? "La base n'a pas répondu.");
      setReels([]);
      return;
    }
    setErreur(null);
    const jeux = (j.data ?? []) as (Jeu & { branchement_id: string })[];
    setReels(((b.data ?? []) as Omit<Branchement, "jeux">[]).map((x) => ({ ...x, jeux: jeux.filter((k) => k.branchement_id === x.id) })));
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !contexte) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, contexte, charger]);

  const branchements = source === "exemple" ? locaux : reels;
  const demandes = source === "exemple" ? demandesLocales : demandesReelles;
  const demandeDe = (entite_id: string, logiciel?: string) => demandes.find((d) => d.entite_id === entite_id && (!logiciel || d.logiciel === logiciel)) ?? null;
  const parSociete = useMemo(() => societes.map((s) => ({ s, b: (branchements ?? []).filter((x) => x.entite_id === s.entite_id) })), [societes, branchements]);
  const peutBrancher = contexte?.role === "gerant" || contexte?.role === "admin";
  const [cible, setCible] = useState<Societe | null>(null);

  /* brancher ou débrancher : une demande à la DSI, exécutée à sa validation */
  const demander = useCallback(
    async (s: Societe, genre: "brancher" | "debrancher", logiciel: string, jeux: string[] | null) => {
      const libelle = `${LOGICIELS.find((l) => l.cle === logiciel)?.libelle ?? logiciel} — ${s.nom}`;
      if (source === "reelle") {
        const { error } = await createClient().rpc("grp_demander_source", { p_client: client_id, p_genre: genre, p_entite: s.entite_id, p_logiciel: logiciel, p_jeux: jeux, p_motif: null });
        if (error) throw new Error(error.message);
        await charger();
      } else {
        await new Promise((x) => setTimeout(x, 300));
        setDemandesLocales((prev) => [...prev, { entite_id: s.entite_id, logiciel, genre }]);
      }
      onFait(genre === "brancher"
        ? `Le branchement de ${libelle} est demandé à la DSI : il sera fait à sa validation, et ses exports seront lus d'eux-mêmes.`
        : `Le débranchement de ${libelle} est demandé à la DSI : plus aucun export ne sera lu après sa validation.`);
    },
    [source, client_id, charger, onFait],
  );
  const brancher = useCallback((s: Societe, logiciel: string, jeux: string[]) => demander(s, "brancher", logiciel, jeux), [demander]);
  const [erreurDebrancher, setErreurDebrancher] = useState<string | null>(null);
  const debrancher = async (s: Societe, x: Branchement) => {
    setErreurDebrancher(null);
    try {
      await demander(s, "debrancher", x.logiciel, null);
    } catch (e) {
      setErreurDebrancher(e instanceof Error ? e.message : "La demande n'est pas partie.");
    }
  };

  return (
    <section id="vrl-exports" className="esp-carte" aria-label="Exports automatiques" style={{ marginTop: 16 }}>
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">Exports automatiques</h2>
          <p className="esp-kpi-sous" style={{ margin: "2px 0 0" }}>
            Le logiciel de chaque société, branché en lecture seule : ses exports (tiers, balances âgées, balance générale) arrivent par le canal de dépôt réglé avec Omega, sont lus d&apos;après leurs en-têtes et entrent dans Varelo comme un dépôt à la main.
          </p>
        </div>
      </div>
      {erreur ? <Avis teinte="rouge" role="alert"><strong>Les branchements n&apos;ont pas pu être lus.</strong> {erreur}</Avis> : null}
      {erreurDebrancher ? <Avis teinte="rouge" role="alert">{erreurDebrancher}</Avis> : null}
      {source === "reelle" && !reels ? (
        <Chargement texte="Lecture des branchements…" />
      ) : (
        <ul className="vrl-balances" aria-label="Branchements par société">
          {parSociete.map(({ s, b: tous }) => {
            const b = tous.filter((x) => x.statut !== "debranche");
            const enAttente = demandeDe(s.entite_id);
            return (
            <li key={s.entite_id}>
              <span className="vrl-balance-nom">{s.nom}</span>
              {b.length ? (
                b.map((x) => (
                  <span key={x.id} className="vrl-paire-sous">
                    {LOGICIELS.find((l) => l.cle === x.logiciel)?.libelle ?? x.logiciel} :{" "}
                    {x.jeux.map((j) => `${JEUX.find((k) => k.cle === j.code)?.libelle ?? j.code} ${j.dernier_recu_le ? `(dernier export le ${dateCourte(j.dernier_recu_le)})` : "(rien reçu)"}`).join(" · ")}
                  </span>
                ))
              ) : (
                <span className="vrl-paire-sous">aucun logiciel branché : les exports se déposent à la main</span>
              )}
              {enAttente ? (
                <Pastille teinte="ambre">{enAttente.genre === "brancher" ? "Branchement en attente de la DSI" : "Débranchement en attente de la DSI"}</Pastille>
              ) : b.length ? (
                <span className="esp-item-haut">
                  <Pastille teinte="vert" contour>branché</Pastille>
                  {peutBrancher ? b.map((x) => (
                    <button key={x.id} type="button" className="esp-lien-bouton" onClick={() => void debrancher(s, x)} aria-label={`Demander à la DSI de débrancher ${x.libelle}`}><Unplug width={14} height={14} aria-hidden="true" /> Débrancher</button>
                  )) : null}
                </span>
              ) : peutBrancher ? (
                <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setCible(s)} aria-label={`Demander à la DSI de brancher le logiciel de ${s.nom}`}><Plug width={14} height={14} aria-hidden="true" /> Brancher</button>
              ) : <Pastille teinte="gris" contour>{tous.length ? "débranché" : "non branché"}</Pastille>}
            </li>
            );
          })}
        </ul>
      )}
      {cible ? <DialogueBrancher s={cible} onFermer={() => setCible(null)} brancher={brancher} /> : null}
    </section>
  );
}

function DialogueBrancher({ s, onFermer, brancher }: { s: Societe; onFermer: () => void; brancher: (s: Societe, logiciel: string, jeux: string[]) => Promise<void> }) {
  const [logiciel, setLogiciel] = useState(LOGICIELS.find((l) => s.logiciel && l.libelle.toLowerCase().startsWith(s.logiciel.toLowerCase().slice(0, 3)))?.cle ?? "tableur");
  const [jeux, setJeux] = useState<string[]>(() => jeuxDe(LOGICIELS.find((l) => s.logiciel && l.libelle.toLowerCase().startsWith(s.logiciel.toLowerCase().slice(0, 3)))?.cle ?? "tableur").map((j) => j.cle));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      await brancher(s, logiciel, jeux);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Le branchement a échoué.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Plug width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Brancher le logiciel — {s.nom}</DialogTitle>
          <DialogDescription>La demande part à la DSI, qui la valide dans la file de validation ; le branchement est fait à son accord. En lecture seule : Omega ne lit que les exports que la société envoie, rien n&apos;est jamais écrit dans son logiciel. Les colonnes se reconnaissent par leurs en-têtes ; un fichier non reconnu est mis de côté pour qu&apos;une personne le classe.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">Logiciel
              <select className="rv-champ" value={logiciel} onChange={(x) => { setLogiciel(x.target.value); setJeux(jeuxDe(x.target.value).map((j) => j.cle)); }}>
                {LOGICIELS.map((l) => <option key={l.cle} value={l.cle}>{l.libelle}</option>)}
              </select>
            </label>
            <fieldset className="vrl-jeux">
              <legend className="rv-libelle">Exports attendus</legend>
              {jeuxDe(logiciel).map((j) => (
                <label key={j.cle} className="vrl-case">
                  <input type="checkbox" checked={jeux.includes(j.cle)} onChange={(x) => setJeux((p) => (x.target.checked ? [...p, j.cle] : p.filter((k) => k !== j.cle)))} /> {j.libelle}
                </label>
              ))}
            </fieldset>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!jeux.length || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Demander à la DSI</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
