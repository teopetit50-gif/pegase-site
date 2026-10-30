"use client";

/* ══════════════════════════════════════════════════════════════════════
   La réception d'un chantier (06/10/2026, session B6, b6_13)

   Le procès-verbal (avec ou sans réserves), la levée des réserves, la
   retenue de garantie — due un an après la réception sauf opposition
   motivée du maître d'ouvrage (loi n° 71-584, art. 2) —, et le décompte
   définitif à envoyer dans les 45 jours (protocole de juin 2010).
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { ClipboardCheck, ClipboardList, Landmark, Scale } from "lucide-react";
import { Bouton, Detail, Gestes, Groupe, Ligne, Liste, Partie, Pilule, Point, Rangee, Rangees, Texte, Vide, jourCourt, useVolet } from "@/components/espace2/lin/Volet";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { dateCourte, montant } from "../format";
import { Avis, Pastille } from "../ui";
import { avenantDepuisReserve, envoyerDecompte, leverReserve, libererRetenue, opposerRetenue, preparerDecompte, prononcerReception, repondreDecompte } from "./portes";
import type { Reception, Tableau } from "./types";

type Props = { tableau: Tableau; source: Source; onLocal: (t: Tableau) => void; relire: () => Promise<void> };
type Fenetre = "prononcer" | "opposer" | "liberer" | "contester" | null;

const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const plusUnAn = (d: string) => { const x = new Date(`${d}T12:00:00`); x.setFullYear(x.getFullYear() + 1); return x.toISOString().slice(0, 10); };
const plusJours = (d: string, n: number) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

export default function ReceptionCarte({ tableau, source, onLocal, relire }: Props) {
  const { chantier: c, voit_prix } = tableau;
  const r = tableau.reception ?? null;
  const volet = useVolet();
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [date, setDate] = useState(aujourdhui());
  const [texte, setTexte] = useState("");
  const [accord, setAccord] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const jour = aujourdhui();

  const avec = (x: Reception): Tableau => ({ ...tableau, reception: x });
  const agir = async (reelle: () => Promise<unknown>, locale: () => Tableau, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") { await reelle(); await relire(); } else onLocal(locale());
      setFait(message);
      setFenetre(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };
  const ouvrir = (f: Fenetre) => { setErreur(null); setDate(aujourdhui()); setTexte(""); setAccord(false); setFenetre(f); };

  if (!r && c.statut !== "ouvert" && c.statut !== "suspendu" && c.statut !== "receptionne" && c.statut !== "clos") return null;

  const prononcer = () => {
    const reserves = texte.split("\n").map((l) => l.trim()).filter(Boolean).map((description) => ({ description }));
    return agir(
      () => prononcerReception(c.id, date, reserves),
      () => {
        if (date > jour) throw new Error("La date de réception est celle du procès-verbal : aujourd'hui ou avant.");
        const validees = (tableau.situations ?? []).filter((s) => s.statut === "validee");
        const caution = tableau.marches.find((m) => m.statut === "verifie")?.retenue_caution ?? false;
        const id = nid();
        const x: Reception = {
          id, chantier_id: c.id, date_reception: date, avec_reserves: reserves.length > 0,
          retenue_montant: Math.round(validees.reduce((t, s) => t + s.retenue, 0) * 100) / 100, retenue_caution: caution,
          retenue_due_le: plusUnAn(date), retenue_statut: "bloquee", retenue_etat: plusUnAn(date) <= jour ? "liberable" : "bloquee",
          opposition_le: null, opposition_motif: null, liberee_le: null, liberee_avant_terme: false,
          decompte_statut: "a_preparer", decompte_marche_ht: null, decompte_facture_ht: null, decompte_reste_ht: null, decompte_retenue: null,
          decompte_envoye_le: null, decompte_repondu_le: null, decompte_motif: null, decompte_echeance: plusJours(date, 45),
          reserves: reserves.map((v, i) => ({ id: nid(), reception_id: id, lot_id: null, ordre: i + 1, description: v.description, statut: "ouverte", levee_le: null })),
        };
        return { ...avec(x), chantier: { ...c, statut: "receptionne" } };
      },
      `Réception prononcée au ${dateCourte(date)}${reserves.length ? ` avec ${reserves.length} réserve${reserves.length > 1 ? "s" : ""}` : " sans réserve"}.`,
    );
  };

  const fenetrePrononcer = (
    <Dialog open={fenetre === "prononcer"} onOpenChange={(o) => !o && setFenetre(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><ClipboardCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Prononcer la réception</DialogTitle>
          <DialogDescription>La date du procès-verbal signé avec le maître d&apos;ouvrage, et ses réserves. Le chantier passe « réceptionné ».</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">Date du procès-verbal <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" type="date" max={jour} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="rv-libelle">Réserves (une par ligne ; vide = sans réserve)
              <textarea className="rv-champ" rows={4} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={"Joint de la fenêtre du séjour à reprendre\nRayure sur la porte palière"} />
            </label>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" onClick={() => void prononcer()} disabled={envoi || !date}>{envoi ? <Loader variant="spin" /> : null} Prononcer la réception</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!r) {
    if (volet) {
      const close = c.statut !== "ouvert" && c.statut !== "suspendu";
      return (
        <Partie
          titre="Réception des travaux"
          compte={close ? "prononcée" : "pas encore prononcée"}
          gestes={!close && voit_prix ? <Bouton fort icone={<ClipboardCheck aria-hidden="true" />} onClick={() => ouvrir("prononcer")} disabled={envoi}>Prononcer la réception</Bouton> : null}
          avis={fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
        >
          <Vide>
            {close
              ? voit_prix ? "Réception prononcée." : "Réception prononcée : la retenue et le décompte sont réservés à qui voit les prix."
              : "À la réception, la retenue de garantie commence à courir : elle sera due un an plus tard, sauf opposition motivée. Le décompte final part dans les 45 jours."}
          </Vide>
          {fenetrePrononcer}
        </Partie>
      );
    }
    if (c.statut !== "ouvert" && c.statut !== "suspendu") {
      return (
        <section className="esp-carte" aria-label="Réception des travaux">
          <div className="esp-section-titre">Réception des travaux</div>
          <p className="esp-kpi-sous">{c.statut === "receptionne" || c.statut === "clos" ? (voit_prix ? "Réception prononcée." : "Réception prononcée : la retenue et le décompte sont réservés à qui voit les prix.") : null}</p>
        </section>
      );
    }
    return (
      <section className="esp-carte" aria-label="Réception des travaux">
        <div className="esp-carte-tete">
          <div className="esp-section-titre" style={{ margin: 0 }}>Réception des travaux — pas encore prononcée</div>
          {voit_prix ? <div className="esp-actions" style={{ marginTop: 0 }}><button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir("prononcer")} disabled={envoi}><ClipboardCheck width={14} height={14} aria-hidden="true" /> Prononcer la réception</button></div> : null}
        </div>
        <p className="esp-kpi-sous">À la réception, la retenue de garantie commence à courir : elle sera due un an plus tard, sauf opposition motivée. Le décompte final part dans les 45 jours.</p>
        {fait ? <div style={{ marginTop: 8 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
        {fenetrePrononcer}
      </section>
    );
  }

  const ouvertes = r.reserves.filter((v) => v.statut === "ouverte");
  const etat = r.retenue_etat ?? (r.retenue_statut === "bloquee" && r.retenue_due_le <= jour ? "liberable" : r.retenue_statut);
  const avantTerme = jour < r.retenue_due_le;
  const libellRetenue = r.retenue_caution ? "Caution de retenue de garantie" : `Retenue de garantie : ${montant(r.retenue_montant)}`;
  const echeance = r.decompte_echeance ?? plusJours(r.date_reception, 45);

  const lever = (id: string) => agir(
    () => leverReserve(id),
    () => avec({ ...r, reserves: r.reserves.map((v) => (v.id === id ? { ...v, statut: "levee", levee_le: jour } : v)) }),
    "Réserve levée.",
  );
  const horsDevis = (id: string) => {
    const v = r.reserves.find((x) => x.id === id);
    if (!v) return;
    return agir(
      () => avenantDepuisReserve(id),
      () => {
        const av = { id: `av-${id}`, chantier_id: tableau.chantier.id, marche_id: tableau.marches.find((m) => m.statut === "verifie")?.id ?? null,
                     numero: Math.max(0, ...tableau.avenants.map((a) => a.numero)) + 1, objet: `Reprise hors devis demandée à la réception : ${v.description}`.slice(0, 500),
                     origine: { canal: "reception", reserve: id, date: r.date_reception, texte: v.description }, statut: "brouillon" as const,
                     demande_id: null, demande_statut: null, piece_id: null, soumis_le: null, signe_le: null, signe_par: null, signe_libelle: null, motif: null,
                     cree_le: new Date().toISOString(), nb_lignes: 0, montant_ht: 0, lignes: [] };
        const t = avec({ ...r, reserves: r.reserves.map((x) => (x.id === id ? { ...x, avenant_id: av.id } : x)) });
        return { ...t, avenants: [...t.avenants, av] };
      },
      "Avenant ouvert en brouillon depuis la réserve : chiffrez-le, puis faites-le signer.",
    );
  };
  const opposer = () => agir(
    () => opposerRetenue(r.id, texte.trim(), date),
    () => {
      if (!texte.trim()) throw new Error("Une opposition est motivée (loi n° 71-584, art. 2) : le motif est obligatoire.");
      if (date >= r.retenue_due_le) throw new Error("Trop tard : passé un an après la réception, la retenue est due.");
      return avec({ ...r, retenue_statut: "opposee", retenue_etat: "opposee", opposition_le: date, opposition_motif: texte.trim() });
    },
    "Opposition notée : la retenue reste bloquée jusqu'à la levée des réserves.",
  );
  const liberer = () => agir(
    () => libererRetenue(r.id, accord),
    () => {
      if (r.retenue_statut === "opposee" && ouvertes.length) throw new Error(`La retenue est frappée d'opposition et ${ouvertes.length} réserve(s) reste(nt) ouverte(s) : levez-les d'abord.`);
      if (avantTerme && r.retenue_statut !== "opposee" && !(accord && !ouvertes.length)) throw new Error(`La retenue est due le ${dateCourte(r.retenue_due_le)} : avant, il faut l'accord du maître d'ouvrage et toutes les réserves levées.`);
      return avec({ ...r, retenue_statut: "liberee", retenue_etat: "liberee", liberee_le: jour, liberee_avant_terme: avantTerme });
    },
    r.retenue_caution ? "Caution levée." : `Retenue de ${montant(r.retenue_montant)} libérée.`,
  );
  const preparer = () => agir(
    () => preparerDecompte(r.id),
    () => {
      const m = tableau.marches.find((x) => x.statut === "verifie");
      const marche = (m?.lignes ?? []).filter((l) => l.nature !== "option").reduce((t, l) => t + (l.montant_ht ?? 0), 0)
        + tableau.avenants.filter((a) => a.statut === "signe").flatMap((a) => a.lignes).reduce((t, l) => t + (l.montant_ht ?? 0), 0);
      const validees = (tableau.situations ?? []).filter((s) => s.statut === "validee").sort((a, b) => b.numero - a.numero);
      const facture = validees[0]?.cumul_ht ?? 0;
      const retenue = validees.reduce((t, s) => t + s.retenue, 0);
      return avec({ ...r, decompte_statut: "projet", decompte_marche_ht: marche, decompte_facture_ht: facture, decompte_reste_ht: Math.round((marche - facture) * 100) / 100, decompte_retenue: retenue });
    },
    "Projet de décompte final préparé.",
  );
  const envoyer = () => agir(() => envoyerDecompte(r.id), () => avec({ ...r, decompte_statut: "envoye", decompte_envoye_le: jour }), "Décompte final noté comme envoyé au maître d'ouvrage.");
  const repondre = (accepte: boolean) => agir(
    () => repondreDecompte(r.id, accepte, accepte ? null : texte.trim()),
    () => {
      if (!accepte && !texte.trim()) throw new Error("Une contestation porte son motif.");
      return avec({ ...r, decompte_statut: accepte ? "accepte" : "conteste", decompte_repondu_le: jour, decompte_motif: accepte ? null : texte.trim() });
    },
    accepte ? "Décompte accepté par le maître d'ouvrage." : "Contestation du décompte notée.",
  );

  const fenetres = (
    <>
      <Dialog open={fenetre === "opposer" || fenetre === "liberer" || fenetre === "contester"} onOpenChange={(o) => !o && setFenetre(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ClipboardCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{fenetre === "opposer" ? "Opposition du maître d'ouvrage" : fenetre === "liberer" ? (r.retenue_caution ? "Caution levée" : "Retenue libérée") : "Décompte contesté"}</DialogTitle>
            <DialogDescription>
              {fenetre === "opposer" ? `Notifiée par lettre recommandée avant le ${dateCourte(r.retenue_due_le)}, motivée par l'inexécution des obligations de l'entreprise (loi n° 71-584, art. 2).`
                : fenetre === "liberer" ? (avantTerme && r.retenue_statut !== "opposee" ? `Avant le ${dateCourte(r.retenue_due_le)}, une libération demande l'accord du maître d'ouvrage et toutes les réserves levées.` : "La retenue a été remboursée, ou la caution levée.")
                : "La réponse du maître d'ouvrage, avec son motif."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {fenetre === "opposer" ? <label className="rv-libelle">Date de l&apos;opposition <input className="rv-champ" type="date" max={jour} value={date} onChange={(e) => setDate(e.target.value)} /></label> : null}
              {fenetre === "opposer" || fenetre === "contester" ? <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" maxLength={500} value={texte} onChange={(e) => setTexte(e.target.value)} /></label> : null}
              {fenetre === "liberer" && avantTerme && r.retenue_statut !== "opposee" ? (
                <label className="rv-libelle" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} /> Le maître d&apos;ouvrage accepte une libération anticipée
                </label>
              ) : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || ((fenetre === "opposer" || fenetre === "contester") && !texte.trim())}
                    onClick={() => void (fenetre === "opposer" ? opposer() : fenetre === "liberer" ? liberer() : repondre(false))}>
              {envoi ? <Loader variant="spin" /> : null} {fenetre === "opposer" ? "Noter l'opposition" : fenetre === "liberer" ? "Confirmer" : "Noter la contestation"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );


  /* 30/10/2026 — dans la fiche de l'espace 2 : les réserves une par ligne, puis la retenue et le
     décompte ; chacun s'ouvre dans le volet avec ses gestes (../../espace2/lin/Volet.tsx) */
  if (volet) {
    const retenue =
      etat === "bloquee" ? { t: "gris" as const, l: `Due le ${dateCourte(r.retenue_due_le)}` }
      : etat === "liberable" ? { t: "jaune" as const, l: "À réclamer" }
      : etat === "opposee" ? { t: "rouge" as const, l: "Opposée" }
      : { t: "vert" as const, l: `Libérée${r.liberee_avant_terme ? " avant terme" : ""}` };
    const decompte =
      r.decompte_statut === "a_preparer" ? { t: "jaune" as const, l: "À préparer", d: echeance, dt: "À envoyer avant le" }
      : r.decompte_statut === "projet" ? { t: "jaune" as const, l: "Projet prêt", d: echeance, dt: "À envoyer avant le" }
      : r.decompte_statut === "envoye" ? { t: "bleu" as const, l: "Envoyé, en attente", d: r.decompte_envoye_le, dt: "Envoyé le" }
      : r.decompte_statut === "accepte" ? { t: "vert" as const, l: "Accepté", d: r.decompte_repondu_le, dt: "Accepté le" }
      : { t: "rouge" as const, l: "Contesté", d: r.decompte_repondu_le, dt: "Contesté le" };
    const avenantDe = (id: string | null | undefined) => (id ? tableau.avenants.find((a) => a.id === id)?.numero ?? "?" : null);
    return (
      <Partie
        titre="Réception des travaux"
        compte={`prononcée le ${dateCourte(r.date_reception)}`}
        avis={fait || (erreur && !fenetre) ? <>{fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}{erreur && !fenetre ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</> : null}
      >
        <Liste>
          <Groupe nom="Réserves" compte={r.reserves.length} precision={r.reserves.length ? (ouvertes.length ? `${ouvertes.length} ouverte${ouvertes.length > 1 ? "s" : ""}` : "toutes levées") : "sans réserve"}>
            {r.reserves.map((v) => (
              <Ligne
                key={v.id}
                cle={`reserve:${v.id}`}
                libelle={`Réserve : ${v.description}`}
                icone={<ClipboardList />}
                titre={v.description}
                second={v.avenant_id ? `avenant n° ${avenantDe(v.avenant_id)} (hors devis)` : null}
                droite={v.statut === "levee" ? <Pilule teinte="vert" icone={<Point teinte="vert" />}>Levée</Pilule> : <Pilule teinte="jaune" icone={<Point teinte="jaune" />}>Ouverte</Pilule>}
                date={v.levee_le ? jourCourt(v.levee_le) : null}
                dateTitre={v.levee_le ? `Levée le ${dateCourte(v.levee_le)}` : undefined}
              />
            ))}
          </Groupe>
          <Groupe nom="Après la réception" compte={2}>
            <Ligne
              cle="reception:retenue"
              libelle={`${libellRetenue}, ${retenue.l}`}
              icone={<Landmark />}
              titre={r.retenue_caution ? "Caution de retenue de garantie" : "Retenue de garantie"}
              second={r.retenue_caution ? null : montant(r.retenue_montant)}
              droite={<Pilule teinte={retenue.t} icone={<Point teinte={retenue.t} />}>{retenue.l}</Pilule>}
              date={jourCourt(r.retenue_due_le)}
              dateTitre={`Due le ${dateCourte(r.retenue_due_le)}`}
            />
            <Ligne
              cle="reception:decompte"
              libelle={`Décompte final, ${decompte.l}`}
              icone={<Scale />}
              titre="Décompte final"
              second={r.decompte_reste_ht !== null ? `reste ${montant(r.decompte_reste_ht)} HT` : null}
              droite={<Pilule teinte={decompte.t} icone={<Point teinte={decompte.t} />}>{decompte.l}</Pilule>}
              date={decompte.d ? jourCourt(decompte.d) : null}
              dateTitre={decompte.d ? `${decompte.dt} ${dateCourte(decompte.d)}` : undefined}
            />
          </Groupe>
        </Liste>
        {!r.reserves.length ? <Vide>Réception prononcée sans réserve.</Vide> : null}
        {r.reserves.map((v) => (
          <Detail key={v.id} cle={`reserve:${v.id}`} titre="Réserve" sous={`Réception du ${dateCourte(r.date_reception)}`}>
            <Texte>{v.description}</Texte>
            <Rangees>
              <Rangee libelle="État" teinte={v.statut === "levee" ? "vert" : "jaune"}>
                {v.statut === "levee" ? `Levée le ${dateCourte(v.levee_le)}` : "Ouverte"}
              </Rangee>
              {v.avenant_id ? <Rangee libelle="Avenant">n° {avenantDe(v.avenant_id)}, ouvert hors devis</Rangee> : null}
            </Rangees>
            {v.statut === "ouverte" ? (
              <Gestes>
                <Bouton fort onClick={() => void lever(v.id)} disabled={envoi}>Lever la réserve</Bouton>
                {!v.avenant_id ? <Bouton onClick={() => void horsDevis(v.id)} disabled={envoi}>Hors devis : ouvrir un avenant</Bouton> : null}
              </Gestes>
            ) : null}
          </Detail>
        ))}
        <Detail cle="reception:retenue" titre={r.retenue_caution ? "Caution de retenue de garantie" : "Retenue de garantie"} sous="Due un an après la réception, sauf opposition motivée (loi n° 71-584, art. 2)">
          <Rangees>
            {!r.retenue_caution ? <Rangee libelle="Montant">{montant(r.retenue_montant)}</Rangee> : null}
            <Rangee libelle="Due le">{dateCourte(r.retenue_due_le)}</Rangee>
            <Rangee libelle="État" teinte={retenue.t}>
              {etat === "liberable" ? `Due depuis le ${dateCourte(r.retenue_due_le)} : réclamez-la` : etat === "opposee" ? `Opposée le ${dateCourte(r.opposition_le)}` : etat === "liberee" ? `Libérée le ${dateCourte(r.liberee_le)}${r.liberee_avant_terme ? " (avant terme)" : ""}` : "Bloquée jusqu'à l'échéance"}
            </Rangee>
          </Rangees>
          {etat === "opposee" && r.opposition_motif ? <Texte citation>« {r.opposition_motif} »</Texte> : null}
          {etat !== "liberee" ? (
            <Gestes>
              <Bouton fort={etat === "liberable"} onClick={() => ouvrir("liberer")} disabled={envoi}>{r.retenue_caution ? "Noter la caution levée" : "Noter la retenue libérée"}</Bouton>
              {etat === "bloquee" && avantTerme ? <Bouton onClick={() => ouvrir("opposer")} disabled={envoi}>Noter une opposition</Bouton> : null}
            </Gestes>
          ) : null}
        </Detail>
        <Detail cle="reception:decompte" titre="Décompte final" sous={`À envoyer dans les 45 jours, avant le ${dateCourte(echeance)}`}>
          <Rangees>
            <Rangee libelle="État" teinte={decompte.t}>
              {decompte.l}
              {decompte.d && r.decompte_statut !== "a_preparer" && r.decompte_statut !== "projet" ? ` le ${dateCourte(decompte.d)}` : ""}
            </Rangee>
            {r.decompte_marche_ht !== null ? (
              <>
                <Rangee libelle="Marché HT">{montant(r.decompte_marche_ht)}</Rangee>
                <Rangee libelle="Facturé HT">{montant(r.decompte_facture_ht)}</Rangee>
                <Rangee libelle="Reste HT">{montant(r.decompte_reste_ht)}</Rangee>
                <Rangee libelle="Retenues">{montant(r.decompte_retenue)}</Rangee>
              </>
            ) : null}
          </Rangees>
          {r.decompte_statut === "conteste" && r.decompte_motif ? <Texte citation>« {r.decompte_motif} »</Texte> : null}
          {r.decompte_statut === "a_preparer" || r.decompte_statut === "projet" || r.decompte_statut === "envoye" ? (
            <Gestes>
              {r.decompte_statut === "projet" ? <Bouton fort onClick={() => void envoyer()} disabled={envoi}>Noter le décompte envoyé</Bouton> : null}
              {r.decompte_statut === "a_preparer" || r.decompte_statut === "projet" ? <Bouton fort={r.decompte_statut === "a_preparer"} onClick={() => void preparer()} disabled={envoi}>{r.decompte_statut === "projet" ? "Recalculer le décompte" : "Préparer le décompte"}</Bouton> : null}
              {r.decompte_statut === "envoye" ? (
                <>
                  <Bouton fort onClick={() => void repondre(true)} disabled={envoi}>Accepté par le maître d&apos;ouvrage</Bouton>
                  <Bouton onClick={() => ouvrir("contester")} disabled={envoi}>Contesté</Bouton>
                </>
              ) : null}
            </Gestes>
          ) : null}
        </Detail>
        {fenetres}
      </Partie>
    );
  }

  return (
    <section className="esp-carte" aria-label="Réception des travaux">
      <div className="esp-carte-tete">
        <div className="esp-section-titre" style={{ margin: 0 }}>Réception des travaux — prononcée le {dateCourte(r.date_reception)}</div>
        <span className="esp-item-haut">{ouvertes.length ? <Pastille teinte="ambre">{ouvertes.length} réserve{ouvertes.length > 1 ? "s" : ""} ouverte{ouvertes.length > 1 ? "s" : ""}</Pastille> : <Pastille teinte="vert">{r.avec_reserves ? "Réserves levées" : "Sans réserve"}</Pastille>}</span>
      </div>
      {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {erreur && !fenetre ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}

      {r.reserves.length ? (
        <ul className="esp-fil" style={{ marginBottom: 12 }}>
          {r.reserves.map((v) => (
            <li key={v.id}>
              <span className="esp-fil-point" data-teinte={v.statut === "levee" ? "vert" : "ambre"} />
              <div>
                <div>{v.description}</div>
                <div className="esp-kpi-sous">{v.statut === "levee" ? `Levée le ${dateCourte(v.levee_le)}` : "Ouverte"}{v.statut === "ouverte" ? <> · <button type="button" className="esp-lien-bouton" onClick={() => void lever(v.id)} disabled={envoi}>Lever la réserve</button></> : null}
                  {v.avenant_id ? <> · avenant n° {tableau.avenants.find((a) => a.id === v.avenant_id)?.numero ?? "?"} ouvert (hors devis)</>
                    : v.statut === "ouverte" ? <> · <button type="button" className="esp-lien-bouton" onClick={() => void horsDevis(v.id)} disabled={envoi}>Hors devis : ouvrir un avenant</button></> : null}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="esp-section-titre">{libellRetenue}</div>
      <div className="esp-item-haut" style={{ marginBottom: 6 }}>
        {etat === "bloquee" ? <Pastille teinte="gris">Due le {dateCourte(r.retenue_due_le)}</Pastille>
          : etat === "liberable" ? <Pastille teinte="ambre">Due depuis le {dateCourte(r.retenue_due_le)} : réclamez-la</Pastille>
          : etat === "opposee" ? <Pastille teinte="rouge">Opposée le {dateCourte(r.opposition_le)}</Pastille>
          : <Pastille teinte="vert">Libérée le {dateCourte(r.liberee_le)}{r.liberee_avant_terme ? " (avant terme)" : ""}</Pastille>}
      </div>
      {etat === "opposee" && r.opposition_motif ? <div className="esp-kpi-sous" style={{ marginBottom: 6 }}>Motif : « {r.opposition_motif} »</div> : null}
      <div className="esp-actions" style={{ marginTop: 0, marginBottom: 12 }}>
        {etat === "bloquee" && avantTerme ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir("opposer")} disabled={envoi}>Noter une opposition</button> : null}
        {etat !== "liberee" ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir("liberer")} disabled={envoi}>{r.retenue_caution ? "Noter la caution levée" : "Noter la retenue libérée"}</button> : null}
      </div>

      <div className="esp-section-titre">Décompte final — {r.decompte_statut === "a_preparer" ? `à envoyer avant le ${dateCourte(echeance)}` : r.decompte_statut === "projet" ? `projet prêt, à envoyer avant le ${dateCourte(echeance)}` : r.decompte_statut === "envoye" ? `envoyé le ${dateCourte(r.decompte_envoye_le)}, en attente de réponse` : r.decompte_statut === "accepte" ? `accepté le ${dateCourte(r.decompte_repondu_le)}` : `contesté le ${dateCourte(r.decompte_repondu_le)}`}</div>
      {r.decompte_marche_ht !== null ? (
        <dl style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "4px 16px", margin: "0 0 8px" }}>
          <dt>Marché et avenants HT</dt><dd className="esp-num" style={{ margin: 0 }}>{montant(r.decompte_marche_ht)}</dd>
          <dt>Facturé par les situations HT</dt><dd className="esp-num" style={{ margin: 0 }}>{montant(r.decompte_facture_ht)}</dd>
          <dt><strong>Reste à facturer HT</strong></dt><dd className="esp-num" style={{ margin: 0 }}><strong>{montant(r.decompte_reste_ht)}</strong></dd>
          <dt>Retenues de garantie cumulées</dt><dd className="esp-num" style={{ margin: 0 }}>{montant(r.decompte_retenue)}</dd>
        </dl>
      ) : null}
      {r.decompte_statut === "conteste" && r.decompte_motif ? <div className="esp-kpi-sous" style={{ marginBottom: 6 }}>Motif : « {r.decompte_motif} »</div> : null}
      <div className="esp-actions" style={{ marginTop: 0 }}>
        {r.decompte_statut === "a_preparer" || r.decompte_statut === "projet" ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => void preparer()} disabled={envoi}>{r.decompte_statut === "projet" ? "Recalculer le décompte" : "Préparer le décompte"}</button> : null}
        {r.decompte_statut === "projet" ? <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => void envoyer()} disabled={envoi}>Noter le décompte envoyé</button> : null}
        {r.decompte_statut === "envoye" ? <>
          <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => void repondre(true)} disabled={envoi}>Accepté par le maître d&apos;ouvrage</button>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir("contester")} disabled={envoi}>Contesté</button>
        </> : null}
      </div>

      {fenetres}
    </section>
  );
}
