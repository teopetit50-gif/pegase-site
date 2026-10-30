"use client";

/* L'analyse des offres (b5_26) : chaque offre reçue pour un lot est alignée sur la DPGF, ligne par ligne. Les postes
   non chiffrés, les quantités modifiées, les erreurs de calcul, les écarts à l'estimation et les réserves ressortent
   avant l'attribution ; le classement se fait sur un montant comparable (un poste non chiffré compté au prix médian des
   autres offres). Base réelle : lorani_consultations et lorani_offres sous la RLS ; les offres déposées sont lues et
   rangées par la base (passage des lectures), l'analyse tourne dans la base (lorani_analyser_offres), l'attribution
   crée le marché du lot (lorani_attribuer_offre). Exemple : les saisies s'appliquent en mémoire, sans réanalyse. */

import { useMemo, useState } from "react";
import { Building2, FileDown, ListOrdered, Scale } from "lucide-react";
import { Bouton, Detail, Gestes, Groupe, Ligne, Liste, Partie, Pilule, Point as PointLin, Rangee, Rangees, SousLigne, SousListe, Texte, Vide, jourCourt, teinte, useVolet, type TeinteLin } from "@/components/espace2/lin/Volet";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { analyserOffres, attribuerOffre, ecarterOffre, ouvrirConsultation } from "./portes";
import { telecharger } from "./rapport";
import { excelOffres, pdfOffres, STATUT_OFFRE, type DonneesRapportOffres } from "./rapport-offres";
import type { Consultation, Dossier, Marche, Offre, Projet } from "./types";

const STATUTS: Record<Consultation["statut"], { libelle: string; teinte: "gris" | "bleu" | "vert" | "rouge" }> = {
  ouverte: { libelle: "Offres attendues", teinte: "gris" },
  analysee: { libelle: "Analysée", teinte: "bleu" },
  attribuee: { libelle: "Attribuée", teinte: "vert" },
  infructueuse: { libelle: "Infructueuse", teinte: "rouge" },
};
const TEINTE_OFFRE: Record<Offre["statut"], "gris" | "bleu" | "vert" | "rouge"> = { recue: "gris", analysee: "bleu", retenue: "vert", ecartee: "rouge" };
const jour = (d: string | null | undefined) => (d ? dateCourte(d.length === 10 ? `${d}T12:00:00` : d) : "—");
const euros = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`);
const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
const ref = (r: string) => r.replace(/_/g, ".");
const montant = (s: string) => {
  const v = Number(s.replace(/\s/g, "").replace(",", "."));
  return s.trim() && Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
};

type Form =
  | { type: "ouvrir" }
  | { type: "retenir"; offre: Offre }
  | { type: "ecarter"; offre: Offre }
  | null;

export default function Offres({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const volet = useVolet();
  const lots = useMemo(() => dossier.lots.filter((l) => l.projet_id === projet.id).sort((a, b) => a.numero.localeCompare(b.numero)), [dossier.lots, projet.id]);
  const consultations = useMemo(() => dossier.consultations.filter((c) => c.projet_id === projet.id)
    .sort((a, b) => (lots.find((l) => l.id === a.lot_id)?.numero ?? "").localeCompare(lots.find((l) => l.id === b.lot_id)?.numero ?? "") || b.cree_le.localeCompare(a.cree_le)), [dossier.consultations, projet.id, lots]);
  const dpgfs = useMemo(() => dossier.pieces.filter((p) => p.objet_id === projet.id && p.type_piece === "lorani_dpgf"), [dossier.pieces, projet.id]);
  const [choisie, setChoisie] = useState<string | null>(null);
  const c = consultations.find((x) => x.id === choisie) ?? consultations[0] ?? null;
  const lot = c ? lots.find((l) => l.id === c.lot_id) : undefined;
  const offres = useMemo(() => (c ? dossier.offres.filter((o) => o.consultation_id === c.id).sort((a, b) => (a.rang ?? 999) - (b.rang ?? 999) || a.entreprise.localeCompare(b.entreprise)) : []), [dossier.offres, c]);
  const postes = c?.tableau.postes ?? [];
  const seuil = c?.tableau.seuil_ecart_pct ?? c?.seuil_ecart_pct ?? 20;

  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nc, setNc] = useState({ lot_id: "", intitule: "", estimation: "", seuil: "20", date_limite: "", dpgf: "" });
  const [motif, setMotif] = useState("");
  const [rapport, setRapport] = useState<"pdf" | "xlsx" | null>(null);
  const clientId = dossier.moi?.client_id ?? "";

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

  const ouvrir = () => {
    setErreur(null);
    const libre = lots.find((l) => !consultations.some((x) => x.lot_id === l.id && x.statut !== "infructueuse")) ?? lots[0];
    setNc({ lot_id: libre?.id ?? "", intitule: libre ? `DCE lot ${libre.numero}` : "", estimation: "", seuil: "20", date_limite: "", dpgf: "" });
    setForm({ type: "ouvrir" });
  };
  const soumettreOuverture = () => {
    const v = { client_id: clientId, projet_id: projet.id, lot_id: nc.lot_id, intitule: nc.intitule.trim().replace(/\s+/g, " "), estimation_ht: montant(nc.estimation),
      seuil_ecart_pct: Math.min(100, Math.max(1, Number(nc.seuil) || 20)), date_limite: nc.date_limite || null, dpgf_piece_id: nc.dpgf || null };
    return lancer(() => ouvrirConsultation(v).then((id) => setChoisie(id)), () => {
      const id = `local-consultation-${Date.now()}`;
      setChoisie(id);
      const n: Consultation = { id, ...v, statut: "ouverte", offre_retenue: null, tableau: {}, analysee_le: null, cree_le: new Date().toISOString() };
      return { ...dossier, consultations: [n, ...dossier.consultations] };
    });
  };
  const ouvrirOk = form?.type === "ouvrir" && !!nc.lot_id && nc.intitule.trim().length >= 1 && nc.intitule.trim().length <= 160 && (!nc.estimation.trim() || montant(nc.estimation) !== null)
    && !consultations.some((x) => x.lot_id === nc.lot_id && x.intitule === nc.intitule.trim().replace(/\s+/g, " "));

  const relancer = () => {
    if (!c) return;
    return lancer(() => analyserOffres(c.id), () => ({ ...dossier, consultations: dossier.consultations.map((x) => (x.id === c.id ? { ...x, analysee_le: new Date().toISOString(), statut: x.statut === "ouverte" && offres.length ? "analysee" : x.statut } : x)) }));
  };
  const decider = (o: Offre, type: "retenir" | "ecarter") => {
    setErreur(null);
    setMotif("");
    setForm({ type, offre: o });
  };
  const soumettreDecision = () => {
    if (form?.type !== "retenir" && form?.type !== "ecarter") return;
    const o = form.offre;
    const m = motif.trim() || null;
    if (form.type === "ecarter") {
      return lancer(() => ecarterOffre(o.id, m ?? ""), () => ({ ...dossier, offres: dossier.offres.map((x) => (x.id === o.id ? { ...x, statut: "ecartee", motif: m, rang: null } : x)) }));
    }
    return lancer(() => attribuerOffre(o.id, m), () => {
      const marche: Marche | null = dossier.marches.some((x) => x.lot_id === c?.lot_id && x.actif) || !c ? null : {
        id: `local-marche-${Date.now()}`, projet_id: projet.id, lot_id: c.lot_id, titulaire: o.entreprise, montant_ht: o.montant_ht ?? o.montant_calcule_ht ?? 0, avenants_ht: 0,
        retenue_pct: 5, delai_verification_jours: projet.marche_public ? 7 : 15, actif: true, delai_execution_jours: null, demarrage_le: null,
      };
      return {
        ...dossier,
        offres: dossier.offres.map((x) => (x.id === o.id ? { ...x, statut: "retenue", motif: m ?? x.motif } : x)),
        consultations: dossier.consultations.map((x) => (x.id === o.consultation_id ? { ...x, statut: "attribuee", offre_retenue: o.id } : x)),
        marches: marche ? [...dossier.marches, marche] : dossier.marches,
      };
    });
  };
  const decisionOk = form?.type === "retenir" || (form?.type === "ecarter" && motif.trim().length >= 3);

  const exporter = (format: "pdf" | "xlsx") => {
    if (!c) return;
    const d: DonneesRapportOffres = { projet, lot, consultation: c, offres };
    setRapport(format);
    setErreur(null);
    try {
      const r = format === "pdf" ? pdfOffres(d) : excelOffres(d);
      telecharger(r.nom, r.octets, format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le rapport n'a pas pu être fabriqué.");
    } finally {
      setRapport(null);
    }
  };

  const attribuee = c?.statut === "attribuee";
  const fenetres = (
    <>
      {/* ——— ouvrir une consultation ——— */}
      <Dialog open={form?.type === "ouvrir"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Scale width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ouvrir une consultation</DialogTitle>
            <DialogDescription>Les offres déposées pour ce lot y seront rangées et alignées sur la DPGF. Sans DPGF chiffrée, l’estimation saisie sert de référence.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Lot
                  <select className="rv-champ" value={nc.lot_id} onChange={(e) => setNc((s) => ({ ...s, lot_id: e.target.value }))}>
                    {lots.map((l) => <option key={l.id} value={l.id}>{l.numero} · {l.intitule}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Intitulé <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nc.intitule} maxLength={160} onChange={(e) => setNc((s) => ({ ...s, intitule: e.target.value }))} placeholder="DCE lot 03" />
                </label>
              </div>
              <label className="rv-libelle">DPGF de référence
                <select className="rv-champ" value={nc.dpgf} onChange={(e) => setNc((s) => ({ ...s, dpgf: e.target.value }))}>
                  <option value="">La dernière DPGF lue de ce lot</option>
                  {dpgfs.map((p) => <option key={p.id} value={p.id}>{p.nom_fichier}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Estimation HT (€)
                  <input className="rv-champ" inputMode="decimal" value={nc.estimation} onChange={(e) => setNc((s) => ({ ...s, estimation: e.target.value }))} placeholder="si la DPGF n’est pas chiffrée" />
                </label>
                <label className="rv-libelle">Seuil d’écart par ligne (%)
                  <input className="rv-champ" inputMode="numeric" value={nc.seuil} onChange={(e) => setNc((s) => ({ ...s, seuil: e.target.value }))} />
                </label>
                <label className="rv-libelle">Remise des offres
                  <input className="rv-champ" type="date" value={nc.date_limite} onChange={(e) => setNc((s) => ({ ...s, date_limite: e.target.value }))} />
                </label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!ouvrirOk || envoi} onClick={soumettreOuverture}>{envoi ? <Loader variant="spin" /> : null} Ouvrir la consultation</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— retenir ou écarter une offre ——— */}
      <Dialog open={form?.type === "retenir" || form?.type === "ecarter"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Scale width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "retenir" ? "Retenir l’offre" : "Écarter l’offre"}</DialogTitle>
            <DialogDescription>
              {form?.type === "retenir" || form?.type === "ecarter" ? `${form.offre.entreprise} · ${euros(form.offre.montant_ht)} HT annoncés, rang ${form.offre.rang ?? "—"} au classement comparable. ` : ""}
              {form?.type === "retenir" ? "La consultation sera attribuée et le marché du lot créé, pour suivre ses situations de travaux." : "Le motif est obligatoire ; il figure au rapport d’analyse."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif {form?.type === "ecarter" ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                <textarea className="rv-champ" rows={3} maxLength={500} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={form?.type === "ecarter" ? "Offre incomplète : poste 3.3 non chiffré malgré la demande de précision" : "Moins-disante après complément du poste 3.3"} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!decisionOk || envoi} onClick={soumettreDecision}>{envoi ? <Loader variant="spin" /> : null} {form?.type === "retenir" ? "Retenir" : "Écarter"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  /* 30/10/2026 — dans la fiche de l'espace 2 : la consultation en tête, puis une offre par ligne (retenue, en lice
     par rang, écartées) et un poste de la DPGF par ligne ; montants, relevés, offres poste par poste et gestes
     dans le volet (../../espace2/lin/Volet.tsx) */
  if (volet) {
    const releves = (o: Offre) => {
      const nonChiffres = o.constats.filter((k) => k.code === "non_chiffre").length;
      return [nonChiffres ? `${nonChiffres} non chiffré${nonChiffres > 1 ? "s" : ""}` : null, o.reserves.length ? `${o.reserves.length} réserve${o.reserves.length > 1 ? "s" : ""}` : null, `${o.constats.length} relevé${o.constats.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ");
    };
    const groupesOffres: { nom: string; os: Offre[] }[] = [
      { nom: "Retenue", os: offres.filter((o) => o.statut === "retenue") },
      { nom: "En lice", os: offres.filter((o) => o.statut === "recue" || o.statut === "analysee") },
      { nom: "Écartées", os: offres.filter((o) => o.statut === "ecartee") },
    ];
    /* sur un poste, ce qu'une offre chiffre : rien (rouge), au-delà du seuil d'écart à l'estimation (jaune) */
    const surPoste = (l: (typeof postes)[number], o: Offre) => {
      const v = l.offres[o.id]?.montant ?? null;
      const ecart = v !== null && l.estimation ? Math.abs(v - l.estimation) > (seuil / 100) * l.estimation : false;
      return { v, t: (!v ? "rouge" : ecart ? "jaune" : undefined) as TeinteLin | undefined };
    };
    return (
      <Partie
        titre="Analyse des offres"
        compte={c ? `${offres.length} offre${offres.length > 1 ? "s" : ""}` : null}
        gestes={<Bouton icone={<Scale aria-hidden="true" />} disabled={!peutEcrire || envoi || !lots.length} onClick={ouvrir}>Ouvrir une consultation</Bouton>}
        avis={
          (c && (c.tableau.aucune_offre?.length || c.tableau.une_seule_offre?.length)) || (erreur && !form) ? (
            <>
              {c?.tableau.aucune_offre?.length ? <Avis teinte="rouge">Chiffré par aucune entreprise : poste{c.tableau.aucune_offre.length > 1 ? "s" : ""} {c.tableau.aucune_offre.map(ref).join(", ")}. Il reviendrait en plus-value au chantier.</Avis> : null}
              {c?.tableau.une_seule_offre?.length ? <Avis teinte="ambre">Chiffré par une seule entreprise sur {offres.length} : poste{c.tableau.une_seule_offre.length > 1 ? "s" : ""} {c.tableau.une_seule_offre.map(ref).join(", ")}.</Avis> : null}
              {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </>
          ) : null
        }
      >
        <p className="lvp-resume">
          Déposez chaque offre comme « Offre d’une entreprise » (PDF ou Excel) : Lorani la lit, la range dans la consultation de son lot et l’aligne sur la DPGF, ligne par ligne.
        </p>
        {!consultations.length ? (
          <Vide>{lots.length ? "Aucune consultation : ouvrez celle d’un lot pour recevoir les offres." : "Aucun lot : déclarez les lots du projet pour consulter les entreprises."}</Vide>
        ) : null}
        {consultations.length > 1 ? (
          <div className="lvp-barre">
            <label className="lvp-barre-choix">
              <span>Consultation</span>
              <select className="lvp-select" value={c?.id ?? ""} onChange={(e) => { setChoisie(e.target.value); volet.choisir(null); }}>
                {consultations.map((x) => <option key={x.id} value={x.id}>Lot {lots.find((l) => l.id === x.lot_id)?.numero ?? "?"} · {x.intitule}</option>)}
              </select>
            </label>
          </div>
        ) : null}

        {c ? (
          <>
            <Liste>
              <Groupe nom="La consultation" compte={1}>
                <Ligne
                  cle={`consultation:${c.id}`}
                  libelle={`Lot ${lot?.numero ?? "?"}, ${c.intitule}, ${STATUTS[c.statut].libelle}`}
                  icone={<Scale />}
                  id={`Lot ${lot?.numero ?? "?"}`}
                  titre={c.intitule}
                  second={lot?.intitule}
                  droite={<Pilule teinte={teinte(STATUTS[c.statut].teinte)} icone={<PointLin teinte={teinte(STATUTS[c.statut].teinte)} />}>{STATUTS[c.statut].libelle}</Pilule>}
                  date={c.date_limite ? jourCourt(c.date_limite) : null}
                  dateTitre={c.date_limite ? `Remise des offres le ${jour(c.date_limite)}` : undefined}
                />
              </Groupe>
              {groupesOffres.map((g) => g.os.length ? (
                <Groupe key={g.nom} nom={g.nom} compte={g.os.length}>
                  {g.os.map((o) => {
                    const t = teinte(TEINTE_OFFRE[o.statut]);
                    const nonChiffres = o.constats.filter((k) => k.code === "non_chiffre").length;
                    return (
                      <Ligne
                        key={o.id}
                        cle={`offre:${o.id}`}
                        libelle={`${o.entreprise}, ${STATUT_OFFRE[o.statut]}, ${euros(o.montant_comparable_ht)} comparables`}
                        icone={<span data-teinte={t} className="lvp-icone-teinte"><Building2 /></span>}
                        id={o.rang ? `rang ${o.rang}` : undefined}
                        titre={o.entreprise}
                        second={releves(o)}
                        droite={
                          <>
                            <Pilule teinte={t} icone={<PointLin teinte={t} />}>{STATUT_OFFRE[o.statut]}</Pilule>
                            {nonChiffres ? <Pilule teinte="rouge">{nonChiffres} non chiffré{nonChiffres > 1 ? "s" : ""}</Pilule> : null}
                          </>
                        }
                        date={euros(o.montant_comparable_ht)}
                        dateTitre="Montant comparable HT"
                      />
                    );
                  })}
                </Groupe>
              ) : null)}
              {postes.length && offres.length ? (
                <Groupe nom="Postes de la DPGF" compte={postes.length} precision="en € HT">
                  {postes.map((l) => {
                    const manques = offres.filter((o) => !surPoste(l, o).v).length;
                    const ecarts = offres.filter((o) => surPoste(l, o).t === "jaune").length;
                    return (
                      <Ligne
                        key={l.ref}
                        cle={`poste:${c.id}:${l.ref}`}
                        libelle={`Poste ${ref(l.ref)}, ${l.libelle ?? ""}`}
                        icone={<span data-teinte={manques ? "rouge" : ecarts ? "jaune" : "gris"} className="lvp-icone-teinte"><ListOrdered /></span>}
                        id={ref(l.ref)}
                        titre={l.libelle || ref(l.ref)}
                        second={`${l.quantite ?? "—"} ${l.unite ?? ""}`.trim()}
                        droite={
                          <>
                            {manques ? <Pilule teinte="rouge">{manques} non chiffré{manques > 1 ? "s" : ""}</Pilule> : null}
                            {ecarts ? <Pilule teinte="jaune">{ecarts} écart{ecarts > 1 ? "s" : ""}</Pilule> : null}
                          </>
                        }
                        date={euros(l.estimation)}
                        dateTitre="Estimation HT"
                      />
                    );
                  })}
                </Groupe>
              ) : null}
            </Liste>
            {!offres.length ? <Vide>Aucune offre reçue pour cette consultation.</Vide> : null}

            {/* ——— la consultation : estimation, seuil, dates, et ses gestes ——— */}
            <Detail cle={`consultation:${c.id}`} titre={`Lot ${lot?.numero ?? "?"}${lot ? ` — ${lot.intitule}` : ""}`} sous={c.intitule}>
              <Rangees>
                <Rangee libelle="État" teinte={teinte(STATUTS[c.statut].teinte)}>
                  <PointLin teinte={teinte(STATUTS[c.statut].teinte)} />
                  {STATUTS[c.statut].libelle}
                </Rangee>
                <Rangee libelle="Estimation">{euros(c.tableau.estimation_ht ?? c.estimation_ht)} HT</Rangee>
                <Rangee libelle="Seuil d’écart">{seuil} % par ligne</Rangee>
                {c.date_limite ? <Rangee libelle="Remise">le {jour(c.date_limite)}</Rangee> : null}
                <Rangee libelle="Analyse">{c.analysee_le ? `le ${jour(c.analysee_le)}` : "pas encore analysée"}</Rangee>
                <Rangee libelle="Offres">{offres.length}</Rangee>
              </Rangees>
              <Gestes>
                <Bouton fort icone={envoi && !form ? <Loader variant="spin" /> : undefined} disabled={!peutEcrire || envoi || attribuee || !offres.length} onClick={relancer}>Relancer l’analyse</Bouton>
                <Bouton icone={<FileDown aria-hidden="true" />} disabled={!!rapport || !offres.length} onClick={() => exporter("pdf")}>Rapport d’analyse PDF</Bouton>
                <Bouton icone={<FileDown aria-hidden="true" />} disabled={!!rapport || !offres.length} onClick={() => exporter("xlsx")}>Tableau Excel</Bouton>
              </Gestes>
            </Detail>

            {/* ——— une offre : ses montants, ses relevés, la décision ——— */}
            {offres.map((o) => {
              const t = teinte(TEINTE_OFFRE[o.statut]);
              return (
                <Detail key={o.id} cle={`offre:${o.id}`} titre={o.entreprise} sous={[o.siren ? `SIREN ${o.siren}` : null, `reçue le ${jour(o.recue_le)}`].filter(Boolean).join(" · ")}>
                  <Rangees>
                    <Rangee libelle="Décision" teinte={t}>
                      <PointLin teinte={t} />
                      {STATUT_OFFRE[o.statut]}
                    </Rangee>
                    <Rangee libelle="Rang">{o.rang ?? "—"}</Rangee>
                    <Rangee libelle="Annoncé HT">
                      {euros(o.montant_ht)}
                      {o.montant_calcule_ht !== null && o.montant_ht !== null && Math.abs(o.montant_calcule_ht - o.montant_ht) > 1 ? ` · recalculé ${euros(o.montant_calcule_ht)}` : ""}
                    </Rangee>
                    <Rangee libelle="Comparable HT">{euros(o.montant_comparable_ht)}</Rangee>
                    <Rangee libelle="Écart">{pct(o.ecart_estimation_pct)} sur l’estimation</Rangee>
                    <Rangee libelle="Relevés">{releves(o)}</Rangee>
                  </Rangees>
                  {o.motif ? <Texte citation>{o.statut === "ecartee" ? "Écartée" : "Motif"} : {o.motif}</Texte> : null}
                  {o.constats.length ? (
                    <SousListe titre="Relevés">
                      {o.constats.map((k, i) => <SousLigne key={i} titre={k.texte} valeur={k.gravite === "majeur" ? "Majeur" : "À noter"} teinte={k.gravite === "majeur" ? "jaune" : undefined} />)}
                    </SousListe>
                  ) : null}
                  {o.statut === "retenue" || o.statut === "ecartee" ? null : (
                    <Gestes>
                      <Bouton fort disabled={!peutEcrire || envoi || attribuee} onClick={() => decider(o, "retenir")}>Retenir</Bouton>
                      <Bouton disabled={!peutEcrire || envoi || attribuee} onClick={() => decider(o, "ecarter")}>Écarter</Bouton>
                    </Gestes>
                  )}
                </Detail>
              );
            })}

            {/* ——— un poste : l'estimation et ce que chaque offre chiffre ——— */}
            {offres.length ? postes.map((l) => (
              <Detail key={l.ref} cle={`poste:${c.id}:${l.ref}`} titre={l.libelle || ref(l.ref)} sous={`Poste ${ref(l.ref)}`}>
                <Rangees>
                  <Rangee libelle="Quantité">{l.quantite ?? "—"} {l.unite ?? ""}</Rangee>
                  <Rangee libelle="Estimation">{euros(l.estimation)}</Rangee>
                </Rangees>
                <SousListe titre="Les offres, en € HT">
                  {offres.map((o) => {
                    const x = surPoste(l, o);
                    return <SousLigne key={o.id} titre={o.entreprise} second={o.rang ? `rang ${o.rang}` : undefined} valeur={x.v ? euros(x.v) : "non chiffré"} teinte={x.t} />;
                  })}
                </SousListe>
                <div className="lvp-note"><div>En rouge ce qui n’est pas chiffré, en jaune l’écart à l’estimation au-delà de {seuil} %.</div></div>
              </Detail>
            )) : null}
          </>
        ) : null}
        {fenetres}
      </Partie>
    );
  }

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Analyse des offres</span>
        <span className="esp-item-haut">
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || !lots.length} onClick={ouvrir}>Ouvrir une consultation</button>
        </span>
      </div>
      <p className="lor-sous">
        Déposez chaque offre comme « Offre d’une entreprise » (PDF ou Excel) : Lorani la lit, la range dans la consultation de son lot et l’aligne sur la DPGF, ligne par ligne.
      </p>

      {!consultations.length ? (
        <div className="lor-tableau-vide">{lots.length ? "Aucune consultation : ouvrez celle d’un lot pour recevoir les offres." : "Aucun lot : déclarez les lots du projet pour consulter les entreprises."}</div>
      ) : null}

      {consultations.length > 1 ? (
        <div className="lor-controles" role="group" aria-label="Consultations du projet">
          {consultations.map((x) => (
            <button key={x.id} type="button" className="esp-filtre" aria-pressed={x.id === c?.id} onClick={() => setChoisie(x.id)}>
              Lot {lots.find((l) => l.id === x.lot_id)?.numero ?? "?"} · {x.intitule}
            </button>
          ))}
        </div>
      ) : null}

      {c ? (
        <>
          <div className="lor-situation-tete lor-offres-tete">
            <Pastille teinte={STATUTS[c.statut].teinte}>{STATUTS[c.statut].libelle}</Pastille>
            <strong>Lot {lot?.numero ?? "?"}{lot ? ` — ${lot.intitule}` : ""} · {c.intitule}</strong>
          </div>
          <p className="lor-sous">
            {[
              `Estimation : ${euros(c.tableau.estimation_ht ?? c.estimation_ht)} HT`,
              `seuil d’écart par ligne : ${seuil} %`,
              c.date_limite ? `remise des offres le ${jour(c.date_limite)}` : null,
              c.analysee_le ? `analysée le ${jour(c.analysee_le)}` : "pas encore analysée",
            ].filter(Boolean).join(" · ")}
          </p>
          <div className="esp-actions">
            <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || attribuee || !offres.length} onClick={relancer}>{envoi && !form ? <Loader variant="spin" /> : null} Relancer l’analyse</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!!rapport || !offres.length} onClick={() => exporter("pdf")}><FileDown width={15} height={15} aria-hidden="true" /> Rapport d’analyse PDF</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!!rapport || !offres.length} onClick={() => exporter("xlsx")}><FileDown width={15} height={15} aria-hidden="true" /> Tableau Excel</button>
          </div>

          {c.tableau.aucune_offre?.length ? <Avis teinte="rouge">Chiffré par aucune entreprise : poste{c.tableau.aucune_offre.length > 1 ? "s" : ""} {c.tableau.aucune_offre.map(ref).join(", ")}. Il reviendrait en plus-value au chantier.</Avis> : null}
          {c.tableau.une_seule_offre?.length ? <Avis teinte="ambre">Chiffré par une seule entreprise sur {offres.length} : poste{c.tableau.une_seule_offre.length > 1 ? "s" : ""} {c.tableau.une_seule_offre.map(ref).join(", ")}.</Avis> : null}

          {!offres.length ? (
            <div className="lor-tableau-vide">Aucune offre reçue pour cette consultation.</div>
          ) : (
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Classement des offres">
              <table className="esp-tableau lor-offres">
                <thead>
                  <tr>
                    <th scope="col">Rang</th><th scope="col">Entreprise</th><th scope="col">Annoncé HT</th><th scope="col">Comparable HT</th><th scope="col">Écart à l’estimation</th><th scope="col">Relevés</th><th scope="col">Décision</th>
                  </tr>
                </thead>
                <tbody>
                  {offres.map((o) => {
                    const nonChiffres = o.constats.filter((k) => k.code === "non_chiffre").length;
                    return (
                      <tr key={o.id}>
                        <td>{o.rang ?? "—"}</td>
                        <td><strong>{o.entreprise}</strong>{o.siren ? <span className="esp-kpi-sous"> · SIREN {o.siren}</span> : null}<div className="esp-kpi-sous">reçue le {jour(o.recue_le)}</div></td>
                        <td>{euros(o.montant_ht)}{o.montant_calcule_ht !== null && o.montant_ht !== null && Math.abs(o.montant_calcule_ht - o.montant_ht) > 1 ? <div className="esp-kpi-sous">recalculé {euros(o.montant_calcule_ht)}</div> : null}</td>
                        <td>{euros(o.montant_comparable_ht)}</td>
                        <td>{pct(o.ecart_estimation_pct)}</td>
                        <td>{[nonChiffres ? `${nonChiffres} non chiffré${nonChiffres > 1 ? "s" : ""}` : null, o.reserves.length ? `${o.reserves.length} réserve${o.reserves.length > 1 ? "s" : ""}` : null, `${o.constats.length} relevé${o.constats.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}</td>
                        <td>
                          {o.statut === "retenue" || o.statut === "ecartee" ? <Pastille teinte={TEINTE_OFFRE[o.statut]}>{STATUT_OFFRE[o.statut]}</Pastille> : (
                            <span className="lor-offre-actions">
                              <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutEcrire || envoi || attribuee} onClick={() => decider(o, "retenir")}>Retenir</button>
                              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi || attribuee} onClick={() => decider(o, "ecarter")}>Écarter</button>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {offres.map((o) => o.constats.length || o.motif ? (
            <div key={o.id} className="lor-constat" data-gravite={o.constats.some((k) => k.code === "non_chiffre" || k.code === "arithmetique" || k.code === "total") ? "majeur" : "mineur"}>
              <div className="lor-situation-tete">
                <Pastille teinte={TEINTE_OFFRE[o.statut]}>{STATUT_OFFRE[o.statut]}</Pastille>
                <strong>{o.entreprise}</strong>
              </div>
              {o.constats.length ? (
                <ul className="lor-citations" aria-label={`Relevés sur l’offre de ${o.entreprise}`}>
                  {o.constats.map((k, i) => <li key={i}><strong>{k.gravite === "majeur" ? "Majeur" : "À noter"} :</strong> {k.texte}</li>)}
                </ul>
              ) : null}
              {o.motif ? <div className="lor-sous">{o.statut === "ecartee" ? "Écartée" : "Motif"} : {o.motif}</div> : null}
            </div>
          ) : null)}

          {postes.length && offres.length ? (
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Les offres poste par poste">
              <table className="esp-tableau lor-offres lor-offres-postes">
                <caption className="lor-sous">Poste par poste, en € HT : en rouge ce qui n’est pas chiffré, en ambre l’écart à l’estimation au-delà de {seuil} %.</caption>
                <thead>
                  <tr>
                    <th scope="col">Poste</th><th scope="col">Quantité</th><th scope="col">Estimation</th>
                    {offres.map((o) => <th key={o.id} scope="col">{o.entreprise}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {postes.map((l) => (
                    <tr key={l.ref}>
                      <th scope="row">{l.libelle || ref(l.ref)}</th>
                      <td>{l.quantite ?? "—"} {l.unite ?? ""}</td>
                      <td>{euros(l.estimation)}</td>
                      {offres.map((o) => {
                        const x = l.offres[o.id];
                        const v = x?.montant ?? null;
                        const ecart = v !== null && l.estimation ? Math.abs(v - l.estimation) > (seuil / 100) * l.estimation : false;
                        return <td key={o.id} data-etat={!v ? "manque" : ecart ? "ecart" : undefined}>{v ? euros(v) : "non chiffré"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      {fenetres}
    </div>
  );
}
