"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les pièces attendues d'un dossier (11/10/2026, session B4, b4_18)

   Ce que le cabinet attend du client, du confrère ou d'un tiers : l'objet
   (« relevés bancaires 2023 ») est chiffré dans le navigateur avec la clé
   du dossier ; la base ne garde que de qui, quand, et la prochaine
   relance. Une relance due remonte au point du matin et au pilotage.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { FileClock } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { chiffrer, dechiffrer } from "./chiffrement";
import { ATTENTES_OBJETS_EXEMPLE, attentesExemple } from "./exemples";
import * as portes from "./portes";
import type { Attente, Dossier } from "./types";

type Props = { dossier: Dossier; source: Source; cle: CryptoKey | null; peutEcrire: boolean };

const DE: Record<Attente["de"], string> = { client: "Client", confrere: "Confrère", tiers: "Tiers" };
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const dansJours = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export default function AttentesTamila({ dossier: d, source, cle, peutEcrire }: Props) {
  /* undefined : lecture ; null : la base n'a pas b4_18 */
  const [liste, setListe] = useState<Attente[] | null | undefined>(() => (source === "exemple" ? attentesExemple(d.id) : undefined));
  const [objets, setObjets] = useState<Record<string, string>>(() => (source === "exemple" ? ATTENTES_OBJETS_EXEMPLE : {}));
  const [form, setForm] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const x = await portes.chargerAttentes(d.id);
      if (actif) setListe(x);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, d.id]);

  /* les objets, déchiffrés avec la clé du dossier */
  useEffect(() => {
    if (source !== "reelle" || !cle || !liste) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const o: Record<string, string> = {};
      for (const a of liste) {
        const c = await dechiffrer(cle, a.objet_chiffre);
        if (c !== null) o[a.id] = c;
      }
      if (actif) setObjets(o);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, cle, liste]);

  if (liste === null) return null;

  async function geste(action: () => Promise<unknown>, local: (l: Attente[]) => Attente[], message: string) {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") {
        await action();
        setListe(await portes.chargerAttentes(d.id));
      } else {
        await new Promise((r) => setTimeout(r, 300));
        setListe((l) => local(l ?? []));
      }
      setFait(message);
      setForm(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  }

  const poser = () => {
    const objet = (f.objet ?? "").trim();
    const de = (f.de ?? "client") as Attente["de"];
    const relance = f.relance || null;
    if (objet.length < 3) return setErreur("Dites ce qui est attendu.");
    if (source === "reelle" && !cle) return setErreur("La clé du dossier est nécessaire pour chiffrer l'objet.");
    const id = crypto.randomUUID();
    if (source === "exemple") setObjets((o) => ({ ...o, [id]: objet }));
    return geste(
      async () => portes.poserAttente(d.id, de, await chiffrer(cle as CryptoKey, objet), relance),
      (l) => [{ id, client_id: d.client_id, dossier_id: d.id, de, objet_chiffre: "\\x01", demandee_le: aujourdhui(), relance_le: relance, relances: 0, recue_le: null, statut: "attendue", cree_le: new Date().toISOString() }, ...l],
      "Pièce attendue notée ; sa relance remontera au point du matin.",
    );
  };
  const noter = (a: Attente, ev: "recue" | "relancee" | "abandon") =>
    geste(
      () => portes.noterAttente(a.id, ev, null, ev === "relancee" ? dansJours(7) : null),
      (l) => l.map((y) => (y.id !== a.id ? y : ev === "recue" ? { ...y, statut: "recue", recue_le: aujourdhui(), relance_le: null } : ev === "abandon" ? { ...y, statut: "abandonnee", relance_le: null } : { ...y, relances: y.relances + 1, relance_le: dansJours(7) })),
      ev === "recue" ? "Pièce reçue." : ev === "abandon" ? "Attente abandonnée." : "Relance notée ; la prochaine dans sept jours.",
    );

  const attendues = (liste ?? []).filter((a) => a.statut === "attendue");
  return (
    <section className="esp-carte" aria-label="Pièces attendues">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Pièces attendues</h2>
        <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || !liste || (source === "reelle" && !cle)} title={source === "reelle" && !cle ? "La clé du dossier est nécessaire pour chiffrer l'objet" : undefined} onClick={() => { setErreur(null); setF({ de: "client", relance: dansJours(7) }); setForm(true); }}><FileClock width={14} height={14} aria-hidden="true" /> Demander</button>
      </div>
      <div className="esp-carte-corps">
        {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
        {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        {liste === undefined ? <p className="esp-kpi-sous"><Loader variant="spin" /> Lecture…</p> : attendues.length === 0 ? (
          <p className="esp-kpi-sous">Rien n&apos;est attendu du client, du confrère ou d&apos;un tiers. L&apos;objet d&apos;une demande est chiffré avec la clé du dossier.</p>
        ) : attendues.map((a) => {
          const due = !!a.relance_le && a.relance_le <= aujourdhui();
          return (
            <div key={a.id} className="tam-ligne">
              <div className="tam-ligne-haut">
                <span className="tam-ligne-titre">{objets[a.id] ?? <span className="tam-chiffre">objet chiffré</span>}</span>
                <Pastille teinte="gris" contour>{DE[a.de]}</Pastille>
                {a.relance_le ? <Pastille teinte={due ? "rouge" : "ambre"}>{due ? "Relance due" : `Relance le ${dateCourte(a.relance_le)}`}</Pastille> : null}
              </div>
              <div className="tam-ligne-meta">
                <span>Demandée le {dateCourte(a.demandee_le)}{a.relances ? ` · ${a.relances} relance${a.relances > 1 ? "s" : ""}` : ""}</span>
                {peutEcrire ? (
                  <>
                    <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => void noter(a, "recue")}>Reçue</button>
                    <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => void noter(a, "relancee")}>Relancée</button>
                    <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => void noter(a, "abandon")}>Abandonner</button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={form} onOpenChange={(o) => !o && !envoi && setForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileClock width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Une pièce attendue</DialogTitle>
            <DialogDescription>Ce que vous attendez, de qui, et quand relancer. L&apos;objet est chiffré dans votre navigateur avec la clé du dossier.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Ce qui est attendu<input className="rv-champ" value={f.objet ?? ""} onChange={(e) => setF((p) => ({ ...p, objet: e.target.value }))} /></label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">De qui<select className="rv-champ" value={f.de ?? "client"} onChange={(e) => setF((p) => ({ ...p, de: e.target.value }))}>{(Object.keys(DE) as Attente["de"][]).map((k) => <option key={k} value={k}>{DE[k]}</option>)}</select></label>
                <label className="rv-libelle">Relancer le<input className="rv-champ" type="date" min={aujourdhui()} value={f.relance ?? ""} onChange={(e) => setF((p) => ({ ...p, relance: e.target.value }))} /></label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" disabled={envoi} onClick={() => setForm(false)}>Fermer</button>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void poser()}>{envoi ? <Loader variant="spin" /> : null} Noter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
