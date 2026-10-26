"use client";

/* Les pièces de chantier lues (b5_51) : un ordre de service, un avenant ou un procès-verbal de réception déposé sur le
   dossier (ou reçu par courriel) est lu, rattaché au marché reconnu, contrôlé, puis proposé ici. Rien n'entre au
   chantier sans un geste : « Confirmer » crée l'OS, l'avenant (signé : intégré au marché) ou les réserves et la date
   de réception ; « Écarter » garde le motif. Une lecture « à ranger » dit ce qui bloque ; la personne choisit le
   marché ou saisit la valeur, et la base refait les contrôles. Base réelle : lorani_lectures_chantier sous la RLS,
   RPC lorani_confirmer_lecture_chantier et lorani_ecarter_lecture_chantier. */

import { useMemo, useState } from "react";
import { ScanText } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { confirmerLectureChantier, ecarterLectureChantier } from "./portes";
import type { Dossier, LectureChantier, Marche, NatureOs, Projet, Reserve } from "./types";

/* des euros ronds sans décimales, sinon deux : « 953,40 € » */
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
const signe = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${euros(Math.abs(n))}`;
const jour = (d: unknown) => (typeof d === "string" && d ? dateCourte(`${d.slice(0, 10)}T12:00:00`) : "—");
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const plus = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const nombre = (s: string) => Number(s.replace(/\s/g, "").replace("−", "-").replace(",", "."));
const texte = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);
const NATURE: Record<LectureChantier["nature"], string> = { ordre_service: "Ordre de service", avenant: "Avenant", pv_reception: "Procès-verbal de réception" };
const NATURES_OS: Record<NatureOs, string> = {
  demarrage: "démarrage", travaux_modificatifs: "travaux modificatifs", travaux_supplementaires: "travaux supplémentaires", arret: "arrêt", reprise: "reprise", autre: "autre",
};
const TEINTE = { bloquant: "rouge", attention: "ambre", info: "gris" } as const;
/* les champs du lecteur (catalogue CHAMPS-LECTURE-LORANI.md) → leur nom à l'écran */
const CHAMP: Record<string, string> = {
  numero_os: "numéro", numero_avenant: "numéro", nature: "nature", objet: "objet", date_emission: "date", date_notification: "notification",
  montant_ht: "montant", delai_jours: "délai", titulaire: "titulaire", lot: "lot", date_signature: "signature", montant_marche_ht: "nouveau montant",
  date_reception: "réception", avec_reserves: "avec réserves", delai_levee_jours: "délai de levée", reserves: "réserves", origine: "nature du PV",
};

type ReserveLue = { intitule: string; lot?: string; lot_id?: string; localisation?: string; lever_avant?: string };
type Form = { type: "confirmer"; lecture: LectureChantier } | { type: "ecarter"; lecture: LectureChantier } | null;

export default function LecturesChantier({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const lots = useMemo(() => dossier.lots.filter((l) => l.projet_id === projet.id), [dossier.lots, projet.id]);
  const marches = useMemo(() => dossier.marches.filter((m) => m.projet_id === projet.id && m.actif), [dossier.marches, projet.id]);
  const lectures = useMemo(() => (dossier.lecturesChantier ?? []).filter((l) => l.projet_id === projet.id), [dossier.lecturesChantier, projet.id]);
  const ouvertes = lectures.filter((l) => l.statut === "a_confirmer" || l.statut === "a_ranger").sort((a, b) => (a.statut === "a_ranger" ? 0 : 1) - (b.statut === "a_ranger" ? 0 : 1) || b.cree_le.localeCompare(a.cree_le));
  const posees = lectures.filter((l) => l.statut === "posee").length;
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nc, setNc] = useState({ marche: "", objet: "", date: "", montant: "", delai: "" });
  const [motif, setMotif] = useState("");
  const auj = aujourdhui();
  const lotDe = (id: string | null | undefined) => lots.find((l) => l.id === id);
  const marcheDe = (id: string | null) => marches.find((m) => m.id === id);
  const nomMarche = (m: Marche | undefined) => (m ? `${m.titulaire} (lot ${lotDe(m.lot_id)?.numero ?? "—"})` : null);
  const piece = (l: LectureChantier) => dossier.pieces.find((p) => p.id === l.piece_id);
  const champDate = (l: LectureChantier) => (l.nature === "ordre_service" ? "emis_le" : l.nature === "avenant" ? "signe_le" : "reception_le");

  const lancer = async (reel: () => Promise<void>, local: () => Dossier) => {
    setEnvoi(true);
    setErreur(null);
    try {
      await agir(reel, local);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };
  const ouvrirConfirmer = (l: LectureChantier) => {
    const v = l.valeurs;
    setNc({ marche: l.marche_id ?? "", objet: texte(v.objet), date: texte(v[champDate(l)]).slice(0, 10), montant: num(v.montant_ht) === null ? "" : String(num(v.montant_ht)).replace(".", ","), delai: num(v.delai_jours) === null ? "" : String(num(v.delai_jours)) });
    setErreur(null);
    setForm({ type: "confirmer", lecture: l });
  };

  /* les corrections : seulement ce que la personne a changé par rapport à la lecture */
  const corrections = (l: LectureChantier) => {
    const v = l.valeurs;
    const c: Record<string, unknown> = {};
    if (l.nature !== "pv_reception" && nc.objet.trim() !== texte(v.objet)) c.objet = nc.objet.trim().replace(/\s+/g, " ");
    if (nc.date !== texte(v[champDate(l)]).slice(0, 10)) c[champDate(l)] = nc.date || null;
    if (l.nature !== "pv_reception" && nc.montant.trim() !== "" && nombre(nc.montant) !== num(v.montant_ht)) c.montant_ht = nombre(nc.montant);
    if (l.nature === "ordre_service" && nc.delai.trim() !== "" && Math.round(nombre(nc.delai)) !== num(v.delai_jours)) c.delai_jours = Math.round(nombre(nc.delai));
    return c;
  };
  const soumettreConfirmer = () => {
    if (form?.type !== "confirmer") return;
    const l = form.lecture;
    const c = corrections(l);
    const marche = nc.marche && nc.marche !== l.marche_id ? nc.marche : null;
    const v = { ...l.valeurs, ...c };
    const marcheId = marche ?? l.marche_id;
    return lancer(() => confirmerLectureChantier(l.id, marche, Object.keys(c).length ? c : null), () => {
      const d: Dossier = { ...dossier, lecturesChantier: (dossier.lecturesChantier ?? []).map((x) => (x.id === l.id ? { ...x, statut: "posee", marche_id: marcheId } : x)) };
      if (l.nature === "ordre_service" && marcheId) {
        const numero = num(v.numero) ?? Math.max(0, ...dossier.ordresService.filter((o) => o.marche_id === marcheId).map((o) => o.numero)) + 1;
        const nature = (texte(v.nature) || "autre") as NatureOs;
        const neutre = nature === "demarrage" || nature === "arret" || nature === "reprise";
        const notifie = texte(v.notifie_le) || null;
        return { ...d, ordresService: [...dossier.ordresService, { id: `local-os-${Date.now()}`, projet_id: projet.id, marche_id: marcheId, numero, nature, objet: texte(v.objet), emis_le: texte(v.emis_le),
          notifie_le: notifie, montant_ht: neutre ? 0 : num(v.montant_ht) ?? 0, delai_jours: neutre ? 0 : num(v.delai_jours) ?? 0, statut: "emis", reserves_entreprise: null, reserves_jusquau: notifie ? plus(notifie, 15) : null }] };
      }
      if (l.nature === "avenant" && marcheId) {
        const numero = num(v.numero) ?? Math.max(0, ...(dossier.avenants ?? []).filter((a) => a.marche_id === marcheId).map((a) => a.numero)) + 1;
        const signeLe = texte(v.signe_le) || null;
        const montant = num(v.montant_ht) ?? 0;
        return { ...d,
          avenants: [...(dossier.avenants ?? []), { id: `local-av-${Date.now()}`, projet_id: projet.id, marche_id: marcheId, numero, objet: texte(v.objet), montant_ht: montant, statut: signeLe ? "signe" : "a_signer", signe_le: signeLe, integre_le: signeLe ? new Date().toISOString() : null, piece_id: l.piece_id, motif: null }],
          marches: signeLe ? dossier.marches.map((x) => (x.id === marcheId ? { ...x, avenants_ht: x.avenants_ht + montant } : x)) : dossier.marches };
      }
      const date = texte(v.reception_le);
      const delai = num(v.delai_levee_jours);
      const origine = (texte(v.origine) || "reception") as Reserve["origine"];
      const debut = Math.max(0, ...dossier.reserves.filter((r) => r.projet_id === projet.id).map((r) => r.numero));
      const nouvelles: Reserve[] = ((v.reserves as ReserveLue[] | undefined) ?? []).map((r, i) => ({ id: `local-res-${Date.now()}-${i}`, projet_id: projet.id, lot_id: r.lot_id ?? null, marche_id: null, numero: debut + i + 1, intitule: r.intitule,
        localisation: r.localisation ?? null, origine, constatee_le: date, lever_avant: r.lever_avant ?? (delai ? plus(date, delai) : null), statut: "ouverte", levee_le: null, motif: null }));
      return { ...d, reserves: [...dossier.reserves, ...nouvelles],
        projets: origine === "reception" && !projet.reception_le ? dossier.projets.map((p) => (p.id === projet.id ? { ...p, reception_le: date } : p)) : dossier.projets };
    });
  };
  const soumettreEcarter = () => {
    if (form?.type !== "ecarter") return;
    const l = form.lecture;
    const m = motif.trim();
    return lancer(() => ecarterLectureChantier(l.id, m), () => ({ ...dossier, lecturesChantier: (dossier.lecturesChantier ?? []).map((x) => (x.id === l.id ? { ...x, statut: "ecartee", motif: m } : x)) }));
  };

  if (!ouvertes.length && !posees) return null;
  const lc = form?.type === "confirmer" ? form.lecture : null;
  const confirmerOk = !!lc && (lc.nature === "pv_reception"
    ? /^\d{4}-\d{2}-\d{2}$/.test(nc.date) && nc.date <= auj
    : !!nc.marche && nc.objet.trim().length > 0 && nc.montant.trim() !== "" && !Number.isNaN(nombre(nc.montant))
      && (lc.nature === "avenant" ? (!nc.date || (/^\d{4}-\d{2}-\d{2}$/.test(nc.date) && nc.date <= auj)) : /^\d{4}-\d{2}-\d{2}$/.test(nc.date) && (nc.delai.trim() === "" || !Number.isNaN(nombre(nc.delai)))));

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Pièces de chantier lues</span>
        {posees ? <span className="esp-kpi-sous">{posees} déjà posée{posees > 1 ? "s" : ""} au chantier</span> : null}
      </div>
      {!ouvertes.length ? <div className="lor-tableau-vide">Aucune pièce lue en attente : ordres de service, avenants et procès-verbaux de réception déposés sur le dossier sont lus dès leur réception.</div> : null}
      {ouvertes.map((l) => {
        const v = l.valeurs;
        const m = marcheDe(l.marche_id);
        const p = piece(l);
        const reserves = (v.reserves as ReserveLue[] | undefined) ?? [];
        const citations = Object.entries(l.citations ?? {});
        return (
          <div key={l.id} className="lor-situation lor-lecture" data-retard={l.statut === "a_ranger" || undefined}>
            <div className="lor-situation-tete">
              <strong>
                {l.nature === "pv_reception" && v.origine === "opr" ? "Procès-verbal des opérations préalables à la réception" : NATURE[l.nature]}
                {num(v.numero) !== null ? ` n° ${num(v.numero)}` : ""}{m ? ` · ${nomMarche(m)}` : ""}
              </strong>
              <span className="esp-kpi-sous">{p ? p.nom_fichier : "pièce du dossier"} · lue le {jour(l.cree_le)}</span>
              <Pastille teinte={l.statut === "a_ranger" ? "rouge" : "ambre"}>{l.statut === "a_ranger" ? "À ranger" : "À confirmer"}</Pastille>
            </div>
            <div className="lor-sous">
              {l.nature === "ordre_service" ? (
                <>{NATURES_OS[(texte(v.nature) || "autre") as NatureOs] ?? texte(v.nature)} · {texte(v.objet) || "objet non lu"} · émis le {jour(v.emis_le)}{v.notifie_le ? `, notifié le ${jour(v.notifie_le)}` : ""}
                  {num(v.montant_ht) ? ` · ${signe(num(v.montant_ht)!)} HT` : ""}{num(v.delai_jours) ? ` · ${num(v.delai_jours)! > 0 ? "+" : ""}${num(v.delai_jours)} j` : ""}</>
              ) : l.nature === "avenant" ? (
                <>{texte(v.objet) || "objet non lu"} · {num(v.montant_ht) !== null ? `${signe(num(v.montant_ht)!)} HT` : "montant non lu"} · {v.signe_le ? `signé le ${jour(v.signe_le)}` : "non signé"}
                  {m && num(v.montant_ht) !== null ? ` · marché porté à ${euros(m.montant_ht + m.avenants_ht + num(v.montant_ht)!)} HT à la signature` : ""}</>
              ) : (
                <>Réception le {jour(v.reception_le)} · {reserves.length ? `${reserves.length} réserve${reserves.length > 1 ? "s" : ""}` : v.avec_reserves === false ? "sans réserve" : "aucune réserve lue"}
                  {num(v.delai_levee_jours) ? ` · à lever sous ${num(v.delai_levee_jours)} jours` : ""}</>
              )}
            </div>
            {reserves.length ? (
              <ul className="lor-liste">
                {reserves.map((r, i) => (
                  <li key={i}><span>{r.intitule}</span><span className="esp-kpi-sous">{r.lot_id ? ` · lot ${lotDe(r.lot_id)?.numero}` : r.lot ? ` · lot ${r.lot} inconnu` : ""}{r.localisation ? ` · ${r.localisation}` : ""}{r.lever_avant ? ` · à lever avant le ${jour(r.lever_avant)}` : ""}</span></li>
                ))}
              </ul>
            ) : null}
            {citations.length ? (
              <details className="lor-lu-citations">
                <summary>Ce qui est écrit sur la pièce</summary>
                <ul className="lor-liste">
                  {citations.map(([champ, c]) => (
                    <li key={champ}>
                      <span className="esp-kpi-sous">{CHAMP[champ] ?? champ}{c.page ? `, page ${c.page}` : ""} : </span>
                      {c.verifiee ? <q>{c.texte}</q> : <span><Pastille teinte="ambre">Citation non retrouvée</Pastille> à relire sur la pièce</span>}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {l.constats.map((c) => <Avis key={c.code} teinte={TEINTE[c.gravite]}>{c.texte.charAt(0).toUpperCase() + c.texte.slice(1)}.</Avis>)}
            <div className="esp-actions">
              <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => ouvrirConfirmer(l)}>{l.statut === "a_ranger" ? "Ranger et confirmer" : "Confirmer"}</button>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => { setMotif(""); setErreur(null); setForm({ type: "ecarter", lecture: l }); }}>Écarter</button>
            </div>
          </div>
        );
      })}
      {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      {/* ——— confirmer ——— */}
      <Dialog open={form?.type === "confirmer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ScanText width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{lc ? `Confirmer : ${NATURE[lc.nature].toLowerCase()}${num(lc.valeurs.numero) !== null ? ` n° ${num(lc.valeurs.numero)}` : ""}` : ""}</DialogTitle>
            <DialogDescription>
              {lc?.nature === "ordre_service" ? "L’OS entre au chantier avec son incidence sur le montant et sur le délai." : lc?.nature === "avenant" ? "Signé, l’avenant est intégré au marché ; sans date de signature, il est posé « à signer »." : "La réception est datée (la garantie de parfait achèvement en découle) et chaque réserve entre au registre, suivie jusqu’à sa levée."}
              {" "}Corrigez ce que le lecteur a mal lu : la base refait ses contrôles.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {lc && lc.nature !== "pv_reception" ? (
                <>
                  <label className="rv-libelle">Marché
                    <select className="rv-champ" value={nc.marche} onChange={(e) => setNc((s) => ({ ...s, marche: e.target.value }))}>
                      <option value="">Choisir le marché</option>
                      {marches.map((m) => <option key={m.id} value={m.id}>{nomMarche(m)}</option>)}
                    </select>
                  </label>
                  <label className="rv-libelle">Objet
                    <input className="rv-champ" value={nc.objet} maxLength={300} onChange={(e) => setNc((s) => ({ ...s, objet: e.target.value }))} />
                  </label>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Montant HT (€)
                      <input className="rv-champ" inputMode="decimal" value={nc.montant} onChange={(e) => setNc((s) => ({ ...s, montant: e.target.value }))} placeholder="2 900 (ou −1 500)" />
                    </label>
                    {lc.nature === "ordre_service" ? (
                      <label className="rv-libelle">Incidence sur le délai (jours)
                        <input className="rv-champ" inputMode="numeric" value={nc.delai} onChange={(e) => setNc((s) => ({ ...s, delai: e.target.value }))} placeholder="0" />
                      </label>
                    ) : null}
                  </div>
                </>
              ) : null}
              <label className="rv-libelle">{lc?.nature === "ordre_service" ? "Émis le" : lc?.nature === "avenant" ? "Signé le (vide : à signer)" : "Réception le"}
                <input className="rv-champ" type="date" max={auj} value={nc.date} onChange={(e) => setNc((s) => ({ ...s, date: e.target.value }))} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!confirmerOk || envoi} onClick={soumettreConfirmer}>{envoi ? <Loader variant="spin" /> : null} Poser au chantier</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— écarter ——— */}
      <Dialog open={form?.type === "ecarter"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ScanText width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Écarter la lecture</DialogTitle>
            <DialogDescription>Rien n’est posé au chantier ; la pièce reste au dossier, avec votre motif.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" rows={2} maxLength={500} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Copie d’un OS déjà enregistré" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={motif.trim().length < 3 || envoi} onClick={soumettreEcarter}>{envoi ? <Loader variant="spin" /> : null} Écarter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
