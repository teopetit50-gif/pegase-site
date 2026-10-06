"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'expertise d'un dossier (06/10/2026, session B4, b4_16)

   Les échéances d'une expertise : ordonnance, consignation (sinon la
   désignation est caduque, CPC art. 271), première réunion, pré-rapport,
   dires (art. 276), rapport définitif (art. 282). Des dates, aucun nom :
   l'expert est une partie du dossier (qualité « expert »), son nom est
   chiffré. Ce qui est attendu remonte au pilotage et au point du matin.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { Microscope } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { expertisesExemple } from "./exemples";
import * as portes from "./portes";
import type { Dossier, Expertise } from "./types";

type Props = { dossier: Dossier; source: Source; peutEcrire: boolean };

const CHAMPS: { cle: keyof portes.ChampsExpertise; libelle: string }[] = [
  { cle: "ordonnee_le", libelle: "Ordonnée le" }, { cle: "consignation_avant", libelle: "Consignation avant le" },
  { cle: "premiere_reunion_le", libelle: "Première réunion" }, { cle: "pre_rapport_attendu_le", libelle: "Pré-rapport attendu le" },
  { cle: "dires_jusqu_au", libelle: "Dires jusqu'au" }, { cle: "rapport_attendu_le", libelle: "Rapport définitif attendu le" },
];
const ETAPES: { cle: portes.EtapeExpertise; libelle: string; fait: keyof Expertise; prevu: keyof Expertise | null }[] = [
  { cle: "consignation_versee", libelle: "Consignation versée", fait: "consignation_versee_le", prevu: "consignation_avant" },
  { cle: "pre_rapport_recu", libelle: "Pré-rapport reçu", fait: "pre_rapport_recu_le", prevu: "pre_rapport_attendu_le" },
  { cle: "dires_deposes", libelle: "Dires adressés", fait: "dires_deposes_le", prevu: "dires_jusqu_au" },
  { cle: "rapport_recu", libelle: "Rapport définitif reçu", fait: "rapport_recu_le", prevu: "rapport_attendu_le" },
];
const aujourdhui = () => new Date().toISOString().slice(0, 10);

export default function ExpertiseTamila({ dossier: d, source, peutEcrire }: Props) {
  /* undefined : lecture ; null : la base n'a pas b4_16 */
  const [liste, setListe] = useState<Expertise[] | null | undefined>(() => (source === "exemple" ? expertisesExemple(d.id) : undefined));
  const [form, setForm] = useState<{ expertise: Expertise | null } | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const x = await portes.chargerExpertises(d.id);
      if (actif) setListe(x);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, d.id]);

  if (liste === null) return null;

  async function geste(action: () => Promise<unknown>, local: (l: Expertise[]) => Expertise[], message: string) {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") {
        await action();
        setListe(await portes.chargerExpertises(d.id));
      } else {
        await new Promise((r) => setTimeout(r, 300));
        setListe((l) => local(l ?? []));
      }
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  }

  const ouvrir = (x: Expertise | null) => {
    setErreur(null);
    setFait(null);
    setF(Object.fromEntries(CHAMPS.map((c) => [c.cle, (x?.[c.cle] as string | null) ?? ""])));
    setForm({ expertise: x });
  };
  const enregistrer = () => {
    const champs: portes.ChampsExpertise = {};
    for (const c of CHAMPS) (champs as Record<string, string | null>)[c.cle] = f[c.cle] || null;
    const x = form?.expertise ?? null;
    return geste(
      () => portes.poserExpertise(d.id, x?.id ?? null, champs),
      (l) => (x ? l.map((y) => (y.id === x.id ? { ...y, ...champs } : y)) : [{ id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, mission: "judiciaire", statut: "en_cours", consignation_versee_le: null, pre_rapport_recu_le: null, dires_deposes_le: null, rapport_recu_le: null, cree_le: new Date().toISOString(), ordonnee_le: null, consignation_avant: null, premiere_reunion_le: null, pre_rapport_attendu_le: null, dires_jusqu_au: null, rapport_attendu_le: null, ...champs } as Expertise, ...l]),
      "Les dates de l'expertise sont enregistrées ; ce qui est attendu remonte au point du matin.",
    );
  };
  const noter = (x: Expertise, e: (typeof ETAPES)[number]) =>
    geste(() => portes.noterExpertise(x.id, e.cle), (l) => l.map((y) => (y.id === x.id ? { ...y, [e.fait]: aujourdhui(), ...(e.cle === "rapport_recu" ? { statut: "deposee" as const } : {}) } : y)), `${e.libelle}, noté au ${dateCourte(aujourdhui())}.`);

  const etat = (x: Expertise, e: (typeof ETAPES)[number]) => {
    const fait = x[e.fait] as string | null;
    const prevu = e.prevu ? (x[e.prevu] as string | null) : null;
    if (fait) return { texte: `${e.libelle} le ${dateCourte(fait)}`, teinte: "vert" as const };
    if (!prevu) return null;
    const retard = prevu < aujourdhui();
    return { texte: `${e.libelle.replace(/ reçu$| versée$| adressés$/, "")} : ${retard ? "attendu depuis le" : "le"} ${dateCourte(prevu)}`, teinte: retard ? ("rouge" as const) : ("ambre" as const) };
  };

  return (
    <section className="esp-carte" aria-label="Expertise">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Expertise</h2>
        <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || !liste} onClick={() => ouvrir(null)}><Microscope width={14} height={14} aria-hidden="true" /> Ordonnée</button>
      </div>
      <div className="esp-carte-corps">
        {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
        {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        {liste === undefined ? <p className="esp-kpi-sous"><Loader variant="spin" /> Lecture…</p> : liste.length === 0 ? (
          <p className="esp-kpi-sous">Aucune expertise. Ses échéances (consignation, pré-rapport, dires, rapport) remontent ensuite au pilotage et au point du matin.</p>
        ) : liste.map((x) => (
          <div key={x.id} className="tam-ligne">
            <div className="tam-ligne-haut">
              <span className="tam-ligne-titre">Expertise {x.mission === "judiciaire" ? "judiciaire" : "amiable"}{x.ordonnee_le ? `, ordonnée le ${dateCourte(x.ordonnee_le)}` : ""}</span>
              <Pastille teinte={x.statut === "en_cours" ? "bleu" : x.statut === "deposee" ? "vert" : "gris"}>{x.statut === "en_cours" ? "En cours" : x.statut === "deposee" ? "Rapport déposé" : "Abandonnée"}</Pastille>
            </div>
            <div className="tam-ligne-meta">
              {ETAPES.map((e) => { const s = etat(x, e); return s ? <Pastille key={e.cle} teinte={s.teinte}>{s.texte}</Pastille> : null; })}
            </div>
            {x.statut === "en_cours" && peutEcrire ? (
              <div className="tam-ligne-meta">
                {ETAPES.filter((e) => !x[e.fait]).map((e) => <button key={e.cle} type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => void noter(x, e)}>{e.libelle}</button>)}
                <button type="button" className="esp-lien-bouton" onClick={() => ouvrir(x)}>Dates</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Microscope width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.expertise ? "Les dates de l'expertise" : "Une expertise ordonnée"}</DialogTitle>
            <DialogDescription>Les dates seulement : l&apos;expert est une partie du dossier, son nom reste chiffré. Le pré-rapport vient avant la fin des dires, les dires avant le rapport.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="tam-entete-grille">
                {CHAMPS.map((c) => (
                  <label key={c.cle} className="rv-libelle">{c.libelle}<input className="rv-champ" type="date" value={f[c.cle] ?? ""} onChange={(e) => setF((p) => ({ ...p, [c.cle]: e.target.value }))} /></label>
                ))}
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" disabled={envoi} onClick={() => setForm(null)}>Fermer</button>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void enregistrer()}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
