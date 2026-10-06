"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les exports automatiques — VARELO (06/10/2026, B1, migration b1_10)

   Chaque société branche son logiciel (Sage 100, EBP, Cegid, Quadra,
   Pennylane ou un tableur) : ses exports — fournisseurs, clients, balances
   âgées, balance générale — arrivent par le canal de dépôt réglé avec Omega
   (courriel ou passerelle), le lecteur d'exports les lit d'après les
   modèles Varelo, et Varelo les applique comme un dépôt à la main.
   La porte public.brancher (socle) déclare les cinq jeux de la société.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plug } from "lucide-react";
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
];
export const JEUX: { cle: string; libelle: string }[] = [
  { cle: "fournisseurs", libelle: "Fournisseurs" },
  { cle: "clients", libelle: "Clients" },
  { cle: "balance_agee_clients", libelle: "Balance âgée clients" },
  { cle: "balance_agee_fournisseurs", libelle: "Balance âgée fournisseurs" },
  { cle: "balance_generale", libelle: "Balance générale" },
];

type Jeu = { code: string; actif: boolean; dernier_recu_le: string | null; lignes: number };
type Branchement = { id: string; entite_id: string | null; logiciel: string; libelle: string; statut: string; jeux: Jeu[] };

const hier = () => new Date(Date.now() - 86400000).toISOString();

export default function Branchements({ source, contexte, client_id, societes, onFait }: { source: Source; contexte: Contexte | null; client_id: string; societes: Societe[]; onFait: (m: string) => void }) {
  const [locaux, setLocaux] = useState<Branchement[]>(() =>
    societes[0]
      ? [{ id: "exemple-1", entite_id: societes[0].entite_id, logiciel: "sage100", libelle: "Sage 100 du siège", statut: "actif", jeux: JEUX.map((j, i) => ({ code: j.cle, actif: true, dernier_recu_le: i < 3 ? hier() : null, lignes: [134, 633, 41, 0, 0][i] })) }]
      : [],
  );
  const [reels, setReels] = useState<Branchement[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const supabase = createClient();
    const [b, j] = await Promise.all([
      supabase.from("branchements").select("id, entite_id, logiciel, libelle, statut").eq("client_id", client_id).eq("module", "varelo"),
      supabase.from("branchements_jeux").select("branchement_id, code, actif, dernier_recu_le, lignes").eq("client_id", client_id),
    ]);
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
  const parSociete = useMemo(() => societes.map((s) => ({ s, b: (branchements ?? []).filter((x) => x.entite_id === s.entite_id) })), [societes, branchements]);
  const peutBrancher = contexte?.role === "gerant" || contexte?.role === "admin";
  const [cible, setCible] = useState<Societe | null>(null);

  const brancher = useCallback(
    async (s: Societe, logiciel: string, jeux: string[]) => {
      const libelle = `${LOGICIELS.find((l) => l.cle === logiciel)?.libelle ?? logiciel} — ${s.nom}`.slice(0, 200);
      if (source === "reelle") {
        const { error } = await createClient().rpc("brancher", { p_client: client_id, p_module: "varelo", p_logiciel: logiciel, p_voie: "exports", p_libelle: libelle, p_entite: s.entite_id, p_fuseau: null, p_jeux: jeux });
        if (error) throw new Error(error.message);
        await charger();
      } else {
        await new Promise((x) => setTimeout(x, 300));
        setLocaux((prev) => [...prev, { id: `exemple-${Date.now()}`, entite_id: s.entite_id, logiciel, libelle, statut: "actif", jeux: jeux.map((code) => ({ code, actif: true, dernier_recu_le: null, lignes: 0 })) }]);
      }
      onFait(`${libelle} est branché : ses exports seront lus d'eux-mêmes dès qu'ils arrivent par le canal de dépôt.`);
    },
    [source, client_id, charger, onFait],
  );

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
      {source === "reelle" && !reels ? (
        <Chargement texte="Lecture des branchements…" />
      ) : (
        <ul className="vrl-balances" aria-label="Branchements par société">
          {parSociete.map(({ s, b }) => (
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
              {b.length ? <Pastille teinte="vert" contour>branché</Pastille> : peutBrancher ? (
                <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setCible(s)} aria-label={`Brancher le logiciel de ${s.nom}`}><Plug width={14} height={14} aria-hidden="true" /> Brancher</button>
              ) : <Pastille teinte="gris" contour>non branché</Pastille>}
            </li>
          ))}
        </ul>
      )}
      {cible ? <DialogueBrancher s={cible} onFermer={() => setCible(null)} brancher={brancher} /> : null}
    </section>
  );
}

function DialogueBrancher({ s, onFermer, brancher }: { s: Societe; onFermer: () => void; brancher: (s: Societe, logiciel: string, jeux: string[]) => Promise<void> }) {
  const [logiciel, setLogiciel] = useState(LOGICIELS.find((l) => s.logiciel && l.libelle.toLowerCase().startsWith(s.logiciel.toLowerCase().slice(0, 3)))?.cle ?? "tableur");
  const [jeux, setJeux] = useState<string[]>(JEUX.map((j) => j.cle));
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
          <DialogDescription>En lecture seule : Omega ne lit que les exports que la société envoie, rien n&apos;est jamais écrit dans son logiciel. Les colonnes se reconnaissent par leurs en-têtes ; un fichier non reconnu est mis de côté pour qu&apos;une personne le classe.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">Logiciel
              <select className="rv-champ" value={logiciel} onChange={(x) => setLogiciel(x.target.value)}>
                {LOGICIELS.map((l) => <option key={l.cle} value={l.cle}>{l.libelle}</option>)}
              </select>
            </label>
            <fieldset className="vrl-jeux">
              <legend className="rv-libelle">Exports attendus</legend>
              {JEUX.map((j) => (
                <label key={j.cle} className="vrl-case">
                  <input type="checkbox" checked={jeux.includes(j.cle)} onChange={(x) => setJeux((p) => (x.target.checked ? [...p, j.cle] : p.filter((k) => k !== j.cle)))} /> {j.libelle}
                </label>
              ))}
            </fieldset>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!jeux.length || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Brancher</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
