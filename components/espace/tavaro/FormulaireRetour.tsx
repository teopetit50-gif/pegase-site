"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le retour d'un véhicule, saisi par l'agent (06/10/2026, session B2)

   Ce que loc_chiffrer_retour attend, ni plus ni moins : l'heure de
   restitution, le compteur, le carburant en huitièmes (ou la charge en
   pour cent pour une politique au seuil), le retour signé ou non par le
   client, puis les dommages (au barème, sur devis, ou au prix de l'agence)
   et les autres postes (nettoyage, clé perdue…), chacun avec ses photos.
   Un dommage sans photo ne se facture pas : l'écran le dit avant le clic.
   En base réelle, la photo part dans le bucket omega-clients, sous
   <client>/loc_contrat/<contrat>/… ; en exemple, son nom suffit.
   Avec un état des lieux (b2_05) : le carburant du départ signé est repris
   et verrouillé, un retour clos sans signature coche « non signé », et un
   dommage dans une zone déjà notée au départ signé est annoncé « pas
   facturé » avant le clic — la base fait la même chose de son côté.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "../ui";
import { montant } from "../format";
import { UNITES } from "./etats";
import type { DommageConstate, Dossier, LigneBareme, Preuve, Retour, ZoneDommage } from "./types";
import { ZONES, etatDe, libelleZone } from "./edl";

type LigneSaisie = { cle: string; zone?: ZoneDommage | ""; code: string; libelle: string; quantite: string; prix: string; devis: string; preuves: Preuve[]; fichiers: File[] };

const HUITIEMES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const AUTRE = "__autre__";

function versLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const majLigne = (liste: LigneSaisie[], cle: string, patch: Partial<LigneSaisie>) => liste.map((l) => (l.cle === cle ? { ...l, ...patch } : l));

function LigneVue({ l, liste, setListe, choix, nom, depart }: { l: LigneSaisie; liste: LigneSaisie[]; setListe: (x: LigneSaisie[]) => void; choix: LigneBareme[]; nom: string; depart?: DommageConstate[] | null }) {
  const lb = choix.find((b) => b.code === l.code);
  const deja = depart && l.zone ? depart.find((x) => x.zone === l.zone && (!x.code || !l.code || l.code === AUTRE || x.code === l.code)) : null;
  return (
    <div className="tav-ligne-saisie">
      {depart !== undefined ? (
        <label className="rv-libelle">Zone
          <select className="rv-champ" value={l.zone ?? ""} onChange={(e) => setListe(majLigne(liste, l.cle, { zone: e.target.value as ZoneDommage }))}>
            <option value="">— choisir —</option>
            {ZONES.map((z) => <option key={z.cle} value={z.cle}>{z.libelle}</option>)}
          </select>
        </label>
      ) : null}
      {deja ? <Avis teinte="bleu">Déjà noté sur l&apos;état de départ signé ({libelleZone(deja.zone).toLowerCase()} : {deja.description}) : ce dommage ne sera pas facturé.</Avis> : null}
      <label className="rv-libelle">{nom}
        <select className="rv-champ" value={l.code} onChange={(e) => setListe(majLigne(liste, l.cle, { code: e.target.value }))}>
          <option value="">— choisir —</option>
          {choix.map((b) => <option key={b.id} value={b.code}>{b.libelle}{b.prix_eur !== null ? ` · ${montant(b.prix_eur)}${b.unite !== "forfait" ? ` / ${UNITES[b.unite]}` : ""}` : " · sur devis"}</option>)}
          <option value={AUTRE}>Autre (prix de l&apos;agence, hors barème)</option>
        </select>
      </label>
      {l.code === AUTRE ? (
        <div className="esp-form-ligne">
          <label className="rv-libelle">Libellé <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={l.libelle} onChange={(e) => setListe(majLigne(liste, l.cle, { libelle: e.target.value }))} placeholder="Enjoliveur manquant" /></label>
          <label className="rv-libelle">Prix TTC <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" inputMode="decimal" value={l.prix} onChange={(e) => setListe(majLigne(liste, l.cle, { prix: e.target.value }))} placeholder="45" /></label>
        </div>
      ) : null}
      <div className="esp-form-ligne">
        <label className="rv-libelle">Quantité<input className="rv-champ" inputMode="numeric" value={l.quantite} onChange={(e) => setListe(majLigne(liste, l.cle, { quantite: e.target.value }))} /></label>
        {lb?.unite === "devis" ? <label className="rv-libelle">Devis du carrossier (€)<input className="rv-champ" inputMode="decimal" value={l.devis} onChange={(e) => setListe(majLigne(liste, l.cle, { devis: e.target.value }))} placeholder="en attente" /></label> : null}
      </div>
      <div className="esp-fichier">
        <input id={`tav-photo-${l.cle}`} type="file" className="esp-fichier-natif" accept="image/*" multiple onChange={(e) => setListe(majLigne(liste, l.cle, { fichiers: [...l.fichiers, ...Array.from(e.target.files ?? [])] }))} />
        <label htmlFor={`tav-photo-${l.cle}`} className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}><Camera width={14} height={14} aria-hidden="true" /> Joindre les photos</label>
        <span className="esp-kpi-sous">{l.fichiers.length ? l.fichiers.map((f) => f.name).join(", ") : "Aucune photo : le poste ne se facturera pas."}</span>
        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setListe(liste.filter((x) => x.cle !== l.cle))} aria-label="Retirer cette ligne"><Trash2 width={14} height={14} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

const nouvelle = (): LigneSaisie => ({ cle: crypto.randomUUID(), code: "", libelle: "", quantite: "1", prix: "", devis: "", preuves: [], fichiers: [] });

export default function FormulaireRetour({ dossier, bareme, ouvert, envoi, erreur, onFermer, onSoumettre }: {
  dossier: Dossier;
  bareme: LigneBareme[];
  ouvert: boolean;
  envoi: boolean;
  erreur: string | null;
  onFermer: () => void;
  /* les fichiers restent à part : la porte reçoit leurs chemins une fois déposés */
  onSoumettre: (retour: Retour, fichiers: Map<string, File[]>) => Promise<void>;
}) {
  const c = dossier.contrat;
  const depart = etatDe(dossier.etats, "depart");
  const departSigne = depart?.statut === "signe" ? depart : null;
  const retourEtat = etatDe(dossier.etats, "retour");
  const [retourLe, setRetourLe] = useState(() => versLocal(c.retour_reel_le ?? new Date().toISOString()));
  const [km, setKm] = useState(c.km_retour?.toString() ?? (retourEtat?.statut === "signe" && retourEtat.km !== null ? retourEtat.km.toString() : ""));
  const [dep8, setDep8] = useState(departSigne?.carburant_8 !== null && departSigne?.carburant_8 !== undefined ? String(departSigne.carburant_8) : "8");
  const [ret8, setRet8] = useState(retourEtat?.statut === "signe" && retourEtat.carburant_8 !== null ? String(retourEtat.carburant_8) : "8");
  const [charge, setCharge] = useState("");
  const [nonContra, setNonContra] = useState(retourEtat?.statut === "refuse");
  const [dommages, setDommages] = useState<LigneSaisie[]>([]);
  const [postes, setPostes] = useState<LigneSaisie[]>([]);
  const [photosCarburant, setPhotosCarburant] = useState<File[]>([]);
  const [photosKm, setPhotosKm] = useState<File[]>([]);

  const lignesDommage = useMemo(() => bareme.filter((l) => l.nature === "dommage" && (l.categorie_id === null || l.categorie_id === c.categorie_id)), [bareme, c.categorie_id]);
  const lignesPoste = useMemo(() => bareme.filter((l) => l.nature === "frais" && !["carburant", "kilometres", "retard"].includes(l.famille) && (l.categorie_id === null || l.categorie_id === c.categorie_id)), [bareme, c.categorie_id]);

  const kmNombre = km.trim() === "" ? null : Number(km.replace(/\s/g, ""));
  const kmMauvais = kmNombre !== null && (Number.isNaN(kmNombre) || (c.km_depart !== null && kmNombre < c.km_depart));
  const sansPreuve = [...dommages, ...postes].filter((l) => l.code && l.preuves.length === 0 && l.fichiers.length === 0);
  const pret = retourLe !== "" && !kmMauvais && !envoi && [...dommages, ...postes].every((l) => l.code !== "" && (l.code !== AUTRE || (l.libelle.trim() && l.prix.trim())));

  const construire = (): { retour: Retour; fichiers: Map<string, File[]> } => {
    const fichiers = new Map<string, File[]>();
    const versRetour = (l: LigneSaisie, i: number, prefixe: string) => {
      const lb = bareme.find((b) => b.code === l.code);
      const code = l.code === AUTRE ? l.libelle.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "AUTRE" : l.code;
      const cleFichiers = `${prefixe}:${i}`;
      if (l.fichiers.length) fichiers.set(cleFichiers, l.fichiers);
      const base = { code, ...(l.zone ? { zone: l.zone } : {}), quantite: Number(l.quantite) || 1, preuves: [...l.preuves, ...l.fichiers.map((f) => ({ photo: f.name }))] };
      return {
        ...base,
        ...(l.code === AUTRE ? { libelle: l.libelle.trim(), prix_eur: Number(l.prix.replace(",", ".")) } : {}),
        ...(lb?.unite === "devis" && l.devis.trim() ? { devis_eur: Number(l.devis.replace(",", ".")) } : {}),
      };
    };
    const retour: Retour = {
      retour_reel_le: new Date(retourLe).toISOString(),
      km_retour: kmNombre,
      carburant_depart_8: c.politique_carburant === "seuil" ? null : Number(dep8),
      carburant_retour_8: c.politique_carburant === "seuil" ? null : Number(ret8),
      charge_retour_pct: c.politique_carburant === "seuil" && charge.trim() ? Number(charge) : null,
      non_contradictoire: nonContra,
      dommages: dommages.map((l, i) => versRetour(l, i, "dommage")),
      postes: postes.map((l, i) => versRetour(l, i, "poste")),
      preuves: {
        carburant: photosCarburant.map((f) => ({ photo: f.name })),
        km: photosKm.map((f) => ({ photo: f.name })),
      },
    };
    if (photosCarburant.length) fichiers.set("carburant", photosCarburant);
    if (photosKm.length) fichiers.set("km", photosKm);
    return { retour, fichiers };
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="tav-dialogue-large">
        <DialogHeader>
          <DialogIcone><Camera width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Chiffrer le retour du contrat {c.numero}</DialogTitle>
          <DialogDescription>Tavaro compare ce que vous relevez à l&apos;état des lieux de départ et chiffre chaque poste selon le barème. La facture n&apos;est proposée qu&apos;à l&apos;agence, qui la valide ou la refuse.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <div className="esp-form-ligne">
              <label className="rv-libelle">Rendu le <span className="esp-obligatoire">(obligatoire)</span><input type="datetime-local" className="rv-champ" value={retourLe} onChange={(e) => setRetourLe(e.target.value)} /></label>
              <label className="rv-libelle">Compteur au retour (km)<input className="rv-champ" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder={c.km_depart !== null ? `départ ${c.km_depart}` : ""} aria-invalid={kmMauvais} /></label>
            </div>
            {kmMauvais ? <Avis teinte="rouge">Le compteur au retour ne peut pas être inférieur à celui du départ ({c.km_depart} km).</Avis> : null}
            {c.politique_carburant === "seuil" ? (
              <label className="rv-libelle">Charge au retour (%) — seuil du contrat : {c.seuil_charge_pct ?? "?"} %<input className="rv-champ" inputMode="numeric" value={charge} onChange={(e) => setCharge(e.target.value)} /></label>
            ) : c.politique_carburant === "prepaye" ? (
              <Avis teinte="bleu">Carburant prépayé : rien à relever.</Avis>
            ) : (
              <div className="esp-form-ligne">
                <label className="rv-libelle">Carburant au départ (huitièmes)
                  <select className="rv-champ" value={dep8} disabled={!!departSigne} title={departSigne ? "Repris de l'état des lieux de départ signé" : undefined} onChange={(e) => setDep8(e.target.value)}>{HUITIEMES.map((h) => <option key={h} value={h}>{h}/8{h === 8 ? " (plein)" : ""}</option>)}</select>
                </label>
                <label className="rv-libelle">Carburant au retour (huitièmes)
                  <select className="rv-champ" value={ret8} onChange={(e) => setRet8(e.target.value)}>{HUITIEMES.map((h) => <option key={h} value={h}>{h}/8{h === 8 ? " (plein)" : ""}</option>)}</select>
                </label>
              </div>
            )}
            <div className="esp-form-ligne">
              <div className="esp-fichier">
                <input id="tav-photo-jauge" type="file" className="esp-fichier-natif" accept="image/*" multiple onChange={(e) => setPhotosCarburant(Array.from(e.target.files ?? []))} />
                <label htmlFor="tav-photo-jauge" className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}><Camera width={14} height={14} aria-hidden="true" /> Photo de la jauge</label>
                <span className="esp-kpi-sous">{photosCarburant.map((f) => f.name).join(", ") || "facultative"}</span>
              </div>
              <div className="esp-fichier">
                <input id="tav-photo-compteur" type="file" className="esp-fichier-natif" accept="image/*" multiple onChange={(e) => setPhotosKm(Array.from(e.target.files ?? []))} />
                <label htmlFor="tav-photo-compteur" className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}><Camera width={14} height={14} aria-hidden="true" /> Photo du compteur</label>
                <span className="esp-kpi-sous">{photosKm.map((f) => f.name).join(", ") || "facultative"}</span>
              </div>
            </div>
            {departSigne ? <Avis teinte="bleu">État de départ signé par {departSigne.signataire_nom} : carburant {departSigne.carburant_8}/8, {departSigne.dommages.length} dommage{departSigne.dommages.length > 1 ? "s" : ""} déjà noté{departSigne.dommages.length > 1 ? "s" : ""}{departSigne.dommages.length ? ` (${departSigne.dommages.map((d) => libelleZone(d.zone).toLowerCase()).join(", ")})` : ""}.</Avis>
              : <Avis teinte="ambre">Aucun état de départ signé : un dommage facturé se contestera plus facilement.</Avis>}
            <label className="tav-coche">
              <input type="checkbox" checked={nonContra} disabled={retourEtat?.statut === "signe" || retourEtat?.statut === "refuse"} onChange={(e) => setNonContra(e.target.checked)} />
              <span>Le client n&apos;a pas signé l&apos;état des lieux de retour (les dommages iront à la direction, hors barème)</span>
            </label>

            <div className="esp-section-titre">Dommages constatés au retour</div>
            {dommages.map((l) => <LigneVue key={l.cle} l={l} liste={dommages} setListe={setDommages} choix={lignesDommage} nom="Dommage" depart={departSigne?.dommages ?? null} />)}
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setDommages([...dommages, nouvelle()])}><Plus width={14} height={14} aria-hidden="true" /> Ajouter un dommage</button>

            <div className="esp-section-titre">Autres postes</div>
            {postes.map((l) => <LigneVue key={l.cle} l={l} liste={postes} setListe={setPostes} choix={lignesPoste} nom="Poste" />)}
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setPostes([...postes, nouvelle()])}><Plus width={14} height={14} aria-hidden="true" /> Ajouter un poste (nettoyage, clé, frais…)</button>

            {sansPreuve.length ? <Avis teinte="ambre"><strong>{sansPreuve.length} poste{sansPreuve.length > 1 ? "s" : ""} sans photo.</strong> Sans preuve, la proposition restera « preuve manquante » et aucune facture ne partira.</Avis> : null}
            {c.franchise_eur === null && c.rachat_franchise === null && dommages.length ? <Avis teinte="ambre">La franchise du contrat est inconnue : complétez-la avant de chiffrer un dommage.</Avis> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--fil" onClick={onFermer}>Annuler</button>
          <button type="button" className="r-btn r-btn--noir" disabled={!pret} onClick={() => { const b = construire(); void onSoumettre(b.retour, b.fichiers); }}>
            {envoi ? <Loader variant="spin" /> : null} Chiffrer le retour
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
