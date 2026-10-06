"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'état des lieux contradictoire, dans le dossier du contrat
   (06/10/2026, session B2, vague 3, migration b2_05)

   Deux colonnes, départ et retour : ce qui a été constaté (compteur,
   carburant, photos par vue, dommages déjà là, caution), qui a signé et
   quand (heure du serveur, empreinte du contenu signé), ou pourquoi ce
   n'est pas signé. Au comptoir : « Faire l'état » ouvre le constat (les
   quatre vues sont exigées, chaque dommage a sa photo), puis la
   signature au doigt du locataire, ou le refus constaté. Un état signé ne
   change plus. La caution se lève quand rien n'est dû.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateHeure, montant, nombreFr } from "../format";
import { nomLocataire } from "./etats";
import { MODES_CAUTION, VUES_OBLIGATOIRES, VUES_UTILES, ZONES, etatDe, libelleZone } from "./edl";
import { NETTETE_MIN_DEFAUT, mesurerNettete } from "./nettete";
import type { Dossier, EtatDesLieux, LigneBareme, Role, ZoneDommage } from "./types";

export type GestesEtats = {
  /* les fichiers partent d'abord (base réelle) ; la porte reçoit leurs chemins */
  etablir: (moment: "depart" | "retour", valeurs: Record<string, unknown>, fichiers: Map<string, File[]>) => Promise<string>;
  signer: (etat: string, signataire: string, signature: Blob | null) => Promise<void>;
  refuser: (etat: string, motif: string) => Promise<void>;
  leverCaution: (motif: string | null) => Promise<void>;
};

type DommageForm = { cle: string; zone: ZoneDommage | ""; code: string; description: string; fichiers: File[] };
type Etape = { moment: "depart" | "retour"; pas: "constat" | "signature"; etat: string | null };

function Resume({ e, moment, nommer }: { e: EtatDesLieux | null; moment: "depart" | "retour"; nommer: (id: string | null | undefined) => string }) {
  const titre = moment === "depart" ? "Départ" : "Retour";
  if (!e) return <div className="tav-edl-col"><div className="esp-item-haut"><strong>{titre}</strong><Pastille teinte="gris">pas encore fait</Pastille></div></div>;
  return (
    <div className="tav-edl-col">
      <div className="esp-item-haut">
        <strong>{titre}</strong>
        {e.statut === "signe" ? <Pastille teinte="vert">signé</Pastille> : e.statut === "refuse" ? <Pastille teinte="ambre">non signé</Pastille> : <Pastille teinte="gris">brouillon</Pastille>}
      </div>
      <p className="esp-kpi-sous">
        {e.km !== null ? `${nombreFr(e.km)} km` : "compteur ?"} · {e.carburant_8 !== null ? `carburant ${e.carburant_8}/8` : e.charge_pct !== null ? `charge ${e.charge_pct} %` : "niveau ?"} · {e.photos.length} photo{e.photos.length > 1 ? "s" : ""}
      </p>
      {e.dommages.length ? (
        <ul className="tav-edl-dommages">
          {e.dommages.map((d, i) => <li key={i}><strong>{libelleZone(d.zone)}</strong> — {d.description} <span className="esp-kpi-sous">({d.preuves.length} photo{d.preuves.length > 1 ? "s" : ""})</span></li>)}
        </ul>
      ) : <p className="esp-kpi-sous">Aucun dommage noté.</p>}
      {e.observations ? <p className="esp-kpi-sous">{e.observations}</p> : null}
      {e.statut === "signe" ? (
        <p className="esp-kpi-sous">Signé par <strong>{e.signataire_nom}</strong> le {dateHeure(e.signe_le)}{e.empreinte ? <> · empreinte <span className="esp-mono">{e.empreinte.slice(0, 8)}…{e.empreinte.slice(-4)}</span></> : null}</p>
      ) : e.statut === "refuse" ? (
        <p className="esp-kpi-sous">Non signé le {dateHeure(e.refuse_le)} : {e.refus_motif}</p>
      ) : <p className="esp-kpi-sous">Établi par {nommer(e.etabli_par)}, en attente de signature.</p>}
      {moment === "depart" && e.caution_eur !== null && e.caution_mode && e.caution_mode !== "aucune" ? (
        <p className="esp-kpi-sous">Caution {montant(e.caution_eur)} · {MODES_CAUTION.find((m) => m.cle === e.caution_mode)?.libelle}{e.caution_reference ? ` · ${e.caution_reference}` : ""} · {e.caution_statut === "levee" ? `levée le ${dateHeure(e.caution_levee_le)}` : "prise"}</p>
      ) : null}
    </div>
  );
}

/* La signature au doigt (ou à la souris) : un tracé sur un canevas, rendu en PNG. */
function Signature({ onChange }: { onChange: (vide: boolean) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const trace = useRef(false);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * (window.devicePixelRatio || 1));
    c.height = Math.round(r.height * (window.devicePixelRatio || 1));
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#050505";
    }
  }, []);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  return (
    <div className="tav-signature">
      <canvas ref={ref} aria-label="Zone de signature du locataire" role="img"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); trace.current = true; const ctx = e.currentTarget.getContext("2d"); const [x, y] = point(e); ctx?.beginPath(); ctx?.moveTo(x, y); }}
        onPointerMove={(e) => { if (!trace.current) return; const ctx = e.currentTarget.getContext("2d"); const [x, y] = point(e); ctx?.lineTo(x, y); ctx?.stroke(); onChange(false); }}
        onPointerUp={() => { trace.current = false; }}
        onPointerLeave={() => { trace.current = false; }} />
      <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { const c = ref.current; c?.getContext("2d")?.clearRect(0, 0, c.width, c.height); onChange(true); }}>Effacer</button>
    </div>
  );
}

export default function EtatsDesLieux({ dossier, role, bareme, nommer, gestes, onFait, netteteMin }: {
  dossier: Dossier;
  role: Role | null;
  bareme: LigneBareme[];
  nommer: (id: string | null | undefined) => string;
  gestes: GestesEtats;
  onFait: (message: string) => void;
  /* b2_07 : le seuil du loueur ; une photo plus floue est refusée avant l'envoi */
  netteteMin?: number;
}) {
  const c = dossier.contrat;
  const dep = etatDe(dossier.etats, "depart");
  const ret = etatDe(dossier.etats, "retour");
  const [etape, setEtape] = useState<Etape | null>(null);
  const [km, setKm] = useState("");
  const [c8, setC8] = useState("8");
  const [photos, setPhotos] = useState<Record<string, File[]>>({});
  const [dommages, setDommages] = useState<DommageForm[]>([]);
  const [observations, setObservations] = useState("");
  const [caution, setCaution] = useState("");
  const [modeCaution, setModeCaution] = useState("empreinte_carte");
  const [refCaution, setRefCaution] = useState("");
  const [signataire, setSignataire] = useState("");
  const [vide, setVide] = useState(true);
  const [refus, setRefus] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const canevas = useRef<HTMLDivElement | null>(null);
  /* la netteté de chaque photo retenue, mesurée au choix du fichier ; les photos floues sont écartées et nommées */
  const mesures = useRef(new Map<File, number | null>());
  const [floues, setFloues] = useState<string[]>([]);
  const [mesure, setMesure] = useState(false);
  const seuil = netteteMin ?? NETTETE_MIN_DEFAUT;
  const retenir = async (fichiers: File[], quoi: string): Promise<File[]> => {
    setMesure(true);
    const gardees: File[] = [];
    const refus: string[] = [];
    for (const f of fichiers) {
      const n = await mesurerNettete(f);
      if (n !== null && n < seuil) refus.push(`${quoi} : « ${f.name} » est floue (netteté ${n.toLocaleString("fr-FR")}, minimum ${seuil.toLocaleString("fr-FR")})`);
      else {
        mesures.current.set(f, n);
        gardees.push(f);
      }
    }
    setFloues((x) => [...x.filter((t) => !t.startsWith(`${quoi} :`)), ...refus]);
    setMesure(false);
    return gardees;
  };
  const peut = role === "gerant" || role === "admin" || role === "valideur" || role === "collaborateur";
  const lignesDommage = bareme.filter((l) => l.nature === "dommage");

  const ouvrir = (moment: "depart" | "retour") => {
    const e = etatDe(dossier.etats, moment);
    setErreur(null);
    setKm(e?.km?.toString() ?? (moment === "depart" ? c.km_depart?.toString() ?? "" : c.km_retour?.toString() ?? ""));
    setC8(e?.carburant_8?.toString() ?? "8");
    setPhotos({});
    setDommages([]);
    setObservations(e?.observations ?? "");
    setCaution(e?.caution_eur?.toString() ?? (moment === "depart" ? c.depot_eur?.toString() ?? "" : ""));
    setModeCaution(e?.caution_mode ?? "empreinte_carte");
    setRefCaution(e?.caution_reference ?? "");
    setSignataire(dossier.locataire && !dossier.locataire.anonymise_le ? nomLocataire(dossier.locataire) : "");
    setVide(true);
    setRefus(null);
    setFloues([]);
    /* un brouillon déjà posé (photos comprises) passe droit à la signature */
    setEtape({ moment, pas: e?.statut === "brouillon" && e.photos.length ? "signature" : "constat", etat: e?.statut === "brouillon" ? e.id : null });
  };

  const vuesManquantes = VUES_OBLIGATOIRES.filter((v) => !(photos[v.cle]?.length)).map((v) => v.libelle);
  const dommagesIncomplets = dommages.some((d) => !d.zone || !d.description.trim() || d.fichiers.length === 0);
  const kmNombre = km.trim() === "" ? null : Number(km.replace(/\s/g, ""));
  const constatPret = kmNombre !== null && !Number.isNaN(kmNombre) && vuesManquantes.length === 0 && !dommagesIncomplets;

  async function faire(action: () => Promise<void>) {
    setEnvoi(true);
    setErreur(null);
    try {
      await action();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  const enregistrerConstat = () => etape && faire(async () => {
    const fichiers = new Map<string, File[]>();
    const vuesFaites: { vue: string; photo: string; nettete?: number }[] = [];
    for (const [vue, fs] of Object.entries(photos)) {
      if (!fs.length) continue;
      fichiers.set(`vue:${vue}`, fs);
      fs.forEach((f) => vuesFaites.push({ vue, photo: f.name, ...(typeof mesures.current.get(f) === "number" ? { nettete: mesures.current.get(f) as number } : {}) }));
    }
    dommages.forEach((d, i) => fichiers.set(`dommage:${i}`, d.fichiers));
    const valeurs: Record<string, unknown> = {
      km: kmNombre, carburant_8: Number(c8), observations: observations.trim() || undefined,
      photos: vuesFaites, dommages: dommages.map((d) => ({ zone: d.zone, code: d.code || undefined, description: d.description.trim(), preuves: d.fichiers.map((f) => ({ photo: f.name, ...(typeof mesures.current.get(f) === "number" ? { nettete: mesures.current.get(f) as number } : {}) })) })),
      ...(etape.moment === "depart" ? { caution_eur: caution.trim() ? Number(caution.replace(",", ".")) : undefined, caution_mode: modeCaution, caution_reference: refCaution.trim() || undefined } : {}),
    };
    const id = await gestes.etablir(etape.moment, valeurs, fichiers);
    setEtape({ ...etape, pas: "signature", etat: id });
  });

  const signer = () => etape?.etat && faire(async () => {
    const c0 = canevas.current?.querySelector("canvas");
    const blob = c0 ? await new Promise<Blob | null>((r) => c0.toBlob((b) => r(b), "image/png")) : null;
    await gestes.signer(etape.etat!, signataire.trim(), blob);
    onFait(`L'état des lieux de ${etape.moment === "depart" ? "départ" : "retour"} est signé par ${signataire.trim()} : il ne change plus.`);
    setEtape(null);
  });

  const constaterRefus = () => etape?.etat && refus && faire(async () => {
    await gestes.refuser(etape.etat!, refus.trim());
    onFait(`L'état des lieux de ${etape.moment === "depart" ? "départ" : "retour"} est clos sans signature ; les photos font foi${etape.moment === "retour" ? " et les dommages iront à la direction, hors barème" : ""}.`);
    setEtape(null);
  });

  const lever = () => faire(async () => {
    await gestes.leverCaution(null);
    onFait("La caution est levée.");
  });

  const du = dossier.factures.some((f) => f.statut === "emise" || f.statut === "envoyee" || f.statut === "litige");

  return (
    <section className="esp-carte" aria-label="États des lieux">
      <div className="esp-carte-tete">
        <h3 className="esp-carte-titre">États des lieux</h3>
        <div className="esp-actions" style={{ marginTop: 0 }}>
          {!dep || dep.statut === "brouillon" ? <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peut || c.statut === "annule"} onClick={() => ouvrir("depart")}><ClipboardCheck width={14} height={14} aria-hidden="true" /> {dep ? "Reprendre le départ" : "Faire l'état de départ"}</button> : null}
          {dep && dep.statut !== "brouillon" && (!ret || ret.statut === "brouillon") ? <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peut} onClick={() => ouvrir("retour")}><ClipboardCheck width={14} height={14} aria-hidden="true" /> {ret ? "Reprendre le retour" : "Faire l'état de retour"}</button> : null}
          {dep?.caution_statut === "prise" ? <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peut || envoi || du} title={du ? "Une facture reste due : réglez-la (mode « dépôt » si la caution la paie)" : undefined} onClick={lever}>Lever la caution</button> : null}
        </div>
      </div>
      <div className="esp-carte-corps">
        {!dep ? <p className="esp-kpi-sous" style={{ marginBottom: 8 }}>Sans état de départ signé, un dommage facturé au retour se conteste facilement : faites-le au comptoir, photos et signature du locataire.</p> : null}
        {erreur && !etape ? <div style={{ marginBottom: 8 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
        <div className="tav-edl">
          <Resume e={dep} moment="depart" nommer={nommer} />
          <Resume e={ret} moment="retour" nommer={nommer} />
        </div>
      </div>

      <Dialog open={!!etape} onOpenChange={(o) => !o && setEtape(null)}>
        <DialogContent className="tav-dialogue-large">
          <DialogHeader>
            <DialogIcone><ClipboardCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>État des lieux de {etape?.moment === "depart" ? "départ" : "retour"} — {c.numero}</DialogTitle>
            <DialogDescription>
              {etape?.pas === "constat"
                ? "Le compteur, le carburant, une photo de chaque côté du véhicule, et chaque dommage déjà là avec sa photo. La signature vient ensuite."
                : "Le locataire relit et signe. L'heure est celle du serveur ; une empreinte du contenu signé est gardée : l'état ne pourra plus changer."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {etape?.pas === "constat" ? (
              <div className="esp-form">
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Compteur (km) <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} /></label>
                  <label className="rv-libelle">Carburant
                    <select className="rv-champ" value={c8} onChange={(e) => setC8(e.target.value)}>
                      {[8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => <option key={n} value={n}>{n === 8 ? "plein (8/8)" : n === 0 ? "vide (0/8)" : `${n}/8`}</option>)}
                    </select>
                  </label>
                </div>
                <fieldset className="tav-edl-vues">
                  <legend className="rv-libelle">Photos du véhicule — les quatre côtés sont obligatoires</legend>
                  {[...VUES_OBLIGATOIRES, ...VUES_UTILES].map((v) => (
                    <div key={v.cle} className="esp-fichier">
                      <input id={`edl-${v.cle}`} type="file" className="esp-fichier-natif" accept="image/*" capture="environment" multiple onChange={(e) => { const fs = Array.from(e.target.files ?? []); void retenir(fs, v.libelle).then((g) => setPhotos((p) => ({ ...p, [v.cle]: g }))); }} />
                      <label htmlFor={`edl-${v.cle}`} className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>{v.libelle}{VUES_OBLIGATOIRES.some((o) => o.cle === v.cle) ? " *" : ""}</label>
                      <span className="esp-kpi-sous">{photos[v.cle]?.length ? photos[v.cle].map((f) => f.name).join(", ") : "aucune photo"}</span>
                    </div>
                  ))}
                </fieldset>
                <div className="esp-form">
                  <span className="rv-libelle">Dommages déjà là</span>
                  {dommages.map((d, i) => (
                    <div key={d.cle} className="tav-ligne-saisie">
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Zone
                          <select className="rv-champ" value={d.zone} onChange={(e) => setDommages(dommages.map((x) => (x.cle === d.cle ? { ...x, zone: e.target.value as ZoneDommage } : x)))}>
                            <option value="">Choisir…</option>
                            {ZONES.map((z) => <option key={z.cle} value={z.cle}>{z.libelle}</option>)}
                          </select>
                        </label>
                        <label className="rv-libelle">Poste du barème (facultatif)
                          <select className="rv-champ" value={d.code} onChange={(e) => setDommages(dommages.map((x) => (x.cle === d.cle ? { ...x, code: e.target.value } : x)))}>
                            <option value="">—</option>
                            {lignesDommage.map((l) => <option key={l.id} value={l.code}>{l.libelle}</option>)}
                          </select>
                        </label>
                      </div>
                      <label className="rv-libelle">Description<input className="rv-champ" value={d.description} onChange={(e) => setDommages(dommages.map((x) => (x.cle === d.cle ? { ...x, description: e.target.value } : x)))} placeholder="Rayure de 6 cm sur la portière arrière droite" /></label>
                      <div className="esp-fichier">
                        <input id={`edl-d-${d.cle}`} type="file" className="esp-fichier-natif" accept="image/*" capture="environment" multiple onChange={(e) => { const fs = Array.from(e.target.files ?? []); void retenir(fs, `Dommage ${i + 1}`).then((g) => setDommages((l) => l.map((x) => (x.cle === d.cle ? { ...x, fichiers: g } : x)))); }} />
                        <label htmlFor={`edl-d-${d.cle}`} className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>Photo du dommage *</label>
                        <span className="esp-kpi-sous">{d.fichiers.length ? d.fichiers.map((f) => f.name).join(", ") : "obligatoire"}</span>
                        <button type="button" className="r-btn r-btn--fil r-btn--petit" aria-label={`Retirer le dommage ${i + 1}`} onClick={() => setDommages(dommages.filter((x) => x.cle !== d.cle))}><Trash2 width={14} height={14} aria-hidden="true" /></button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="r-btn r-btn--fil r-btn--petit" style={{ justifySelf: "start" }} onClick={() => setDommages([...dommages, { cle: crypto.randomUUID(), zone: "", code: "", description: "", fichiers: [] }])}><Plus width={14} height={14} aria-hidden="true" /> Noter un dommage</button>
                </div>
                {etape.moment === "depart" ? (
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Caution (€)<input className="rv-champ" inputMode="decimal" value={caution} onChange={(e) => setCaution(e.target.value)} /></label>
                    <label className="rv-libelle">Prise par
                      <select className="rv-champ" value={modeCaution} onChange={(e) => setModeCaution(e.target.value)}>
                        {MODES_CAUTION.map((m) => <option key={m.cle} value={m.cle}>{m.libelle}</option>)}
                      </select>
                    </label>
                    <label className="rv-libelle">Référence<input className="rv-champ" value={refCaution} onChange={(e) => setRefCaution(e.target.value)} placeholder="n° d'autorisation, de chèque…" /></label>
                  </div>
                ) : null}
                <label className="rv-libelle">Observations<textarea className="rv-champ" rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} /></label>
                {mesure ? <p className="esp-kpi-sous" role="status">Mesure de la netteté…</p> : null}
                {floues.length ? <Avis teinte="rouge" role="alert"><strong>Photo floue refusée : reprenez-la.</strong><ul className="tav-avert">{floues.map((t) => <li key={t}><span>{t}</span></li>)}</ul></Avis> : null}
                {vuesManquantes.length ? <p className="esp-kpi-sous">Photos manquantes : {vuesManquantes.join(", ")}.</p> : null}
                {dommagesIncomplets ? <Avis teinte="ambre">Chaque dommage a une zone, une description et sa photo : sans photo, il ne protège personne.</Avis> : null}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : etape ? (
              <div className="esp-form">
                <label className="rv-libelle">Nom de la personne qui signe <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={signataire} onChange={(e) => setSignataire(e.target.value)} autoComplete="off" /></label>
                <div ref={canevas}>
                  <span className="rv-libelle">Signature</span>
                  <Signature onChange={setVide} />
                </div>
                {refus !== null ? (
                  <label className="rv-libelle">Pourquoi ce n&apos;est pas signé<textarea className="rv-champ" rows={2} value={refus} onChange={(e) => setRefus(e.target.value)} placeholder="Client absent : clés déposées dans la boîte" /></label>
                ) : null}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            {etape?.pas === "constat" ? (
              <button type="button" className="r-btn r-btn--noir" disabled={envoi || mesure || !constatPret} onClick={enregistrerConstat}>{envoi ? <Loader variant="spin" /> : null} Enregistrer et faire signer</button>
            ) : refus === null ? (
              <>
                <button type="button" className="r-btn r-btn--fil" disabled={envoi} onClick={() => setRefus("")}>Le client ne signe pas</button>
                <button type="button" className="r-btn r-btn--noir" disabled={envoi || vide || !signataire.trim()} onClick={signer}>{envoi ? <Loader variant="spin" /> : null} Signer l&apos;état des lieux</button>
              </>
            ) : (
              <>
                <button type="button" className="r-btn r-btn--fil" disabled={envoi} onClick={() => setRefus(null)}>Revenir à la signature</button>
                <button type="button" className="r-btn r-btn--rouge" disabled={envoi || refus.trim().length < 5} onClick={constaterRefus}>{envoi ? <Loader variant="spin" /> : null} Clore sans signature</button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
