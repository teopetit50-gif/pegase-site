"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — Fauteuils (02/11/2026, refonte des pages métiers)

   La page Bookings de Cal.com, au 1:1 : relevé
   docs/refonte-metiers/releves/calcom-bookings.md (coque et jetons :
   calcom-availability.md, branche refs-plain-attio-cal), styles
   ./tir-cal.css. Les deux notions de l'écran d'avant enfin séparées
   (inventaire, § 17-21) : la charge du jour par fauteuil et les
   demi-journées vides des praticiens sont deux onglets distincts.

   Onglets (contrôle segmenté de Cal.com) :
     · Charge du jour (B17, titulaire) : un fauteuil par ligne, groupes
       « Demi-journée vide » / « Les autres » (Today / Next) ;
     · Demi-journées vides (B19, titulaire et collaborateur) : quatorze jours ;
     · Équipe absente (B11, titulaire et assistante) : F2/G4 « Noter une
       absence » (bouton « + Nouveau » de Cal.com), G5 « Clore l'absence »
       confirmé ;
     · À regrouper (B20, titulaire) et Séances longues (B21).
   Une ligne ouvre le panneau de détail flottant de Cal.com (?fauteuil=<id>
   depuis le point du matin : la charge de ce fauteuil).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cal_Sans } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { CAPACITES } from "@/components/espace/tiroma/libelles";
import type { Dossier, MotifAbsenceMembre } from "@/components/espace/tiroma/types";
import { RACINE } from "../modules";
import { useTiroma } from "./donnees";
import "./tir-cal.css";

/* Cal Sans (OFL) : la police de toute la page chez Cal.com (calcom-availability.md) */
const calSans = Cal_Sans({ weight: "400", subsets: ["latin"], variable: "--font-tir-cal", display: "swap" });

const BASE = `${RACINE}/tiroma/fauteuils`;
const MOTIFS: Record<MotifAbsenceMembre, string> = { conge: "Congé", maladie: "Arrêt", formation: "Formation", autre: "Autre" };
const enDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
const jourCourt = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const jourLong = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const heure = (iso: string) => enDate(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)} %`);
const hm = (m: number) => (m % 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m / 60} h`);
const jourISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function enJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00`);
  d.setDate(d.getDate() + n);
  return jourISO(d);
}

type Onglet = "charge" | "vides" | "equipe" | "regrouper" | "longues";
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "charge", libelle: "Charge du jour" },
  { cle: "vides", libelle: "Demi-journées vides" },
  { cle: "equipe", libelle: "Équipe absente" },
  { cle: "regrouper", libelle: "À regrouper" },
  { cle: "longues", libelle: "Séances longues" },
];

type Ligne = {
  cle: string;
  date: string;
  heures: string;
  pastille?: { texte: string; teinte?: "vert" | "orange" | "rouge" };
  titre: string;
  barre?: boolean;
  qui: string;
  mention?: string;
  note?: string;
  sous?: string;
  detail: { titre: string; lignes: { libelle: string; valeur: string }[] }[];
  action?: { libelle: string; confirmer: string; faire: () => Promise<void> };
  liens?: { libelle: string; href: string }[];
};
type Groupe = { libelle: string | null; lignes: Ligne[] };

function Icone({ d, taille = 16 }: { d: string; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
  );
}
/* Lucide, aux noms relevés (list-filter, calendar, menu, ellipsis, x, chevron-up/down, refresh-ccw, armchair) */
const L = {
  filtre: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
  calendrier: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  menu: '<path d="M4 12h16"/><path d="M4 18h16"/><path d="M4 6h16"/>',
  points: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  croix: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  haut: '<path d="m18 15-6-6-6 6"/>',
  bas: '<path d="m6 9 6 6 6-6"/>',
  tri: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  cycle: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  fauteuil: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
};

function lignes(d: Dossier, onglet: Onglet, clore: (id: string) => Promise<void>): Groupe[] {
  const titulaire = d.profil === "titulaire";
  if (onglet === "charge") {
    const c = titulaire ? d.charge : null;
    if (!c) return [];
    const toutes: Ligne[] = c.fauteuils.map((f) => {
      const vide = f.journee.vide ? "Journée vide" : f.matin.vide ? "Matinée vide" : f.apres_midi.vide ? "Après-midi vide" : null;
      return {
        cle: f.fauteuil_id,
        date: f.nom,
        heures: `${pct(f.matin.taux)} / ${pct(f.apres_midi.taux)}`,
        pastille: vide ? { texte: vide, teinte: "orange" } : { texte: `${pct(f.journee.taux)} prévu` },
        titre: `${f.nom} : ${pct(f.journee.taux)} prévu sur la journée${f.objectif_occupation ? `, objectif ${pct(f.objectif_occupation)}` : ""}`,
        qui: `${f.capacites.map((k) => CAPACITES[k] ?? k).join(", ")} · ${f.assistante_habituelle ? `avec ${f.assistante_habituelle}` : "sans assistante habituelle"}`,
        mention: f.sans_assistante_exigee ? `${f.sans_assistante_exigee} soin${f.sans_assistante_exigee > 1 ? "s" : ""} exige${f.sans_assistante_exigee > 1 ? "nt" : ""} une assistante : à basculer` : undefined,
        note: `${f.rendez_vous} rendez-vous · ${hm(f.journee.prevu_min)} prévues sur ${hm(f.journee.ouvert_min)} ouvertes`,
        detail: [
          { titre: "Quand", lignes: [{ libelle: jourLong(c.jour), valeur: `seuil de demi-journée vide : ${pct(c.seuil_demi_journee_vide)}` }] },
          { titre: "Charge", lignes: [{ libelle: "Matin", valeur: `${pct(f.matin.taux)} · ${hm(f.matin.prevu_min)} sur ${hm(f.matin.ouvert_min)}${f.matin.vide ? " · vide" : ""}` }, { libelle: "Après-midi", valeur: `${pct(f.apres_midi.taux)} · ${hm(f.apres_midi.prevu_min)} sur ${hm(f.apres_midi.ouvert_min)}${f.apres_midi.vide ? " · vide" : ""}` }, { libelle: "Journée", valeur: `${pct(f.journee.taux)} · ${f.rendez_vous} rendez-vous` }] },
          { titre: "Qui", lignes: [{ libelle: "Assistante habituelle", valeur: f.assistante_habituelle ?? "—" }, { libelle: "Capacités", valeur: f.capacites.map((k) => CAPACITES[k] ?? k).join(", ") }] },
          { titre: "Objectif", lignes: [{ libelle: "Occupation visée", valeur: pct(f.objectif_occupation) }] },
        ],
        liens: [
          { libelle: "Soins à regrouper", href: `${BASE}?vue=regrouper` },
          { libelle: "Équipe absente", href: `${BASE}?vue=equipe` },
          { libelle: "Objectifs (Pilotage)", href: `${RACINE}/tiroma/pilotage` },
        ],
      };
    });
    return [
      { libelle: `Demi-journée vide · ${c.demi_journees_vides} sous ${pct(c.seuil_demi_journee_vide)}`, lignes: toutes.filter((l) => l.pastille?.teinte === "orange") },
      { libelle: `Les autres · ${pct(c.total.taux)} prévu sur le cabinet`, lignes: toutes.filter((l) => l.pastille?.teinte !== "orange") },
    ].filter((g) => g.lignes.length);
  }
  if (onglet === "vides") {
    const dj = d.profil === "titulaire" || d.profil === "collaborateur" ? d.demiJournees : null;
    if (!dj) return [];
    const auj = jourISO(new Date());
    const ls: Ligne[] = dj.demi_journees.map((x) => ({
      cle: `${x.praticien_id}-${x.jour}-${x.moment}`,
      date: jourCourt(x.jour),
      heures: x.moment === "matin" ? "Matin" : "Après-midi",
      pastille: x.jour === auj ? { texte: "Aujourd'hui", teinte: "rouge" } : x.jour === enJours(auj, 1) ? { texte: "Demain", teinte: "orange" } : undefined,
      titre: `${x.praticien} : ${hm(x.libre_min)} libres sur ${hm(x.ouvert_min)}`,
      qui: x.prevu_min ? `Occupée à ${pct(x.taux)}` : "Aucun rendez-vous",
      mention: x.attente ? `${x.attente} patient${x.attente > 1 ? "s" : ""} en liste d'attente` : undefined,
      note: x.source === "habitude" ? "D'après ses demi-journées habituelles" : "D'après ses horaires",
      detail: [
        { titre: "Quand", lignes: [{ libelle: jourLong(x.jour), valeur: x.moment === "matin" ? "Matin" : "Après-midi" }] },
        { titre: "Qui", lignes: [{ libelle: "Praticien", valeur: x.praticien }] },
        { titre: "Remplissage", lignes: [{ libelle: "Ouvert", valeur: hm(x.ouvert_min) }, { libelle: "Prévu", valeur: hm(x.prevu_min) }, { libelle: "Libre", valeur: hm(x.libre_min) }, { libelle: "Liste d'attente", valeur: String(x.attente) }] },
      ],
      liens: [{ libelle: "Liste d'attente", href: `${RACINE}/tiroma/creneaux?vue=attente` }],
    }));
    return [
      { libelle: "Cette semaine", lignes: ls.filter((l) => dj.demi_journees.find((x) => `${x.praticien_id}-${x.jour}-${x.moment}` === l.cle && x.jour <= enJours(auj, 6))) },
      { libelle: "Ensuite", lignes: ls.filter((l) => dj.demi_journees.find((x) => `${x.praticien_id}-${x.jour}-${x.moment}` === l.cle && x.jour > enJours(auj, 6))) },
    ].filter((g) => g.lignes.length);
  }
  if (onglet === "equipe") {
    const eq = d.profil === "titulaire" || d.profil === "assistante" ? d.equipe : null;
    if (!eq) return [];
    return [{
      libelle: null,
      lignes: eq.map((a) => ({
        cle: a.absence_id,
        date: `${jourCourt(a.debut)}`,
        heures: `au ${jourCourt(new Date(new Date(a.fin).getTime() - 1).toISOString())}`,
        pastille: { texte: MOTIFS[a.motif], teinte: "orange" as const },
        titre: `${a.membre}${a.fauteuil_nom ? ` — ${a.fauteuil_nom}` : ""}`,
        qui: a.soins.length ? `${a.soins.length} soin${a.soins.length > 1 ? "s" : ""} exige${a.soins.length > 1 ? "nt" : ""} une assistante` : "Aucun soin à basculer",
        sous: a.soins.map((s) => `${jourCourt(s.debut)} ${heure(s.debut)} · ${s.patient_nom}${s.soin ? ` · ${s.soin}` : ""} → ${s.vers.length ? `vers ${s.vers[0].fauteuil_nom} (avec ${s.vers[0].assistante})` : "aucun fauteuil libre"}`).join("\n"),
        note: "Le basculement se fait dans le logiciel du cabinet.",
        detail: [
          { titre: "Quand", lignes: [{ libelle: `Du ${jourLong(a.debut)}`, valeur: `au ${jourLong(new Date(new Date(a.fin).getTime() - 1).toISOString())}` }] },
          { titre: "Qui", lignes: [{ libelle: a.membre, valeur: MOTIFS[a.motif] }, { libelle: "Fauteuil habituel", valeur: a.fauteuil_nom ?? "—" }] },
          { titre: "Soins à basculer", lignes: a.soins.length ? a.soins.map((s) => ({ libelle: `${jourCourt(s.debut)} ${heure(s.debut)} · ${s.patient_nom}`, valeur: `${s.soin ?? "Soin"} → ${s.vers.length ? `${s.vers[0].fauteuil_nom} (avec ${s.vers[0].assistante})` : "aucun fauteuil libre"}` })) : [{ libelle: "Aucun", valeur: "" }] },
        ],
        action: { libelle: "Clore l'absence", confirmer: `Clore l'absence de ${a.membre} ? Elle reste dans l'historique.`, faire: () => clore(a.absence_id) },
      })),
    }];
  }
  if (onglet === "regrouper") {
    const s = titulaire ? d.soinsADeplacer : null;
    if (!s) return [];
    return [{
      libelle: null,
      lignes: s.demi_journees.map((x) => ({
        cle: `${x.fauteuil_id}-${x.jour}-${x.moment}`,
        date: jourCourt(x.jour),
        heures: x.moment === "matin" ? "Matin" : "Après-midi",
        pastille: x.libere ? { texte: "Peut se libérer", teinte: "vert" as const } : { texte: "Un soin reste sans place", teinte: "rouge" as const },
        titre: `${x.fauteuil} : ${pct(x.taux)} occupé`,
        qui: `${x.soins.length} soin${x.soins.length > 1 ? "s" : ""} à déplacer`,
        sous: x.soins.map((so) => `${heure(so.debut)} · ${so.patient_nom}${so.soin ? ` · ${so.soin}` : ""} → ${so.vers.length ? so.vers.map((v) => `${v.fauteuil} (${pct(v.taux)}${v.assistante ? `, avec ${v.assistante}` : ""})`).join(", ") : "aucun fauteuil possible"}`).join("\n"),
        note: "Tiroma ne déplace rien : le rendez-vous se déplace dans le logiciel du cabinet.",
        detail: [
          { titre: "Quand", lignes: [{ libelle: jourLong(x.jour), valeur: x.moment === "matin" ? "Matin" : "Après-midi" }] },
          { titre: "Soins", lignes: x.soins.map((so) => ({ libelle: `${heure(so.debut)} · ${so.patient_nom}`, valeur: so.vers.map((v) => v.fauteuil).join(", ") || "aucun fauteuil" })) },
        ],
      })),
    }];
  }
  const sl = d.seancesLongues;
  if (!sl) return [];
  return [{
    libelle: null,
    lignes: sl.map((x) => ({
      cle: x.rendez_vous_id,
      date: jourCourt(x.debut),
      heures: `${heure(x.debut)} - ${heure(x.fin)}`,
      pastille: { texte: `${x.minutes} min`, teinte: x.raisons.length > 1 ? "rouge" as const : "orange" as const },
      titre: `${x.soin ?? "Séance"} — ${x.patient_nom}`,
      qui: [x.fauteuil, x.praticien].filter(Boolean).join(" · "),
      mention: `${x.raisons.length} problème${x.raisons.length > 1 ? "s" : ""}`,
      sous: x.raisons.join("\n"),
      detail: [
        { titre: "Quand", lignes: [{ libelle: jourLong(x.debut), valeur: `${heure(x.debut)} - ${heure(x.fin)} (${x.minutes} min)` }] },
        { titre: "Où", lignes: [{ libelle: "Fauteuil", valeur: x.fauteuil ?? "—" }, { libelle: "Praticien", valeur: x.praticien ?? "—" }] },
        { titre: "Raisons", lignes: x.raisons.map((r) => ({ libelle: r, valeur: "" })) },
      ],
    })),
  }];
}

function Vide({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="cal-vide">
      <span className="cal-vide-icone"><Icone d={L.calendrier} /></span>
      <h3>{titre}</h3>
      <p>{texte}</p>
    </div>
  );
}

const VIDES: Record<Onglet, [string, string]> = {
  charge: ["Aucune charge à montrer", "Aucun fauteuil ou aucun horaire : posez-les dans les réglages. Vue réservée au titulaire."],
  vides: ["Aucune demi-journée vide", "Aucune demi-journée sous le seuil sur les quatorze prochains jours."],
  equipe: ["Personne n'est absent", "Notez l'absence d'une assistante : Tiroma dit quels soins basculer et vers quel fauteuil."],
  regrouper: ["Rien à regrouper", "Aucune demi-journée à vide dans les deux prochains jours."],
  longues: ["Aucune séance mal placée", "Les séances d'une heure et plus et les chirurgies des sept prochains jours sont bien placées."],
};

function Absence({ fermer }: { fermer: () => void }) {
  const t = useTiroma();
  const d = t.dossier;
  const jour = d?.appels?.jour ?? jourISO(new Date());
  const membres = (d?.membres ?? []).filter((m) => m.actif);
  const [membre, setMembre] = useState(membres[0]?.id ?? "");
  const [du, setDu] = useState(jour);
  const [au, setAu] = useState(jour);
  const [motif, setMotif] = useState<MotifAbsenceMembre>("conge");
  const [avis, setAvis] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const noter = async () => {
    setOccupe(true);
    setAvis(null);
    try {
      await t.noterAbsence({ membre_id: membre, debut: new Date(`${du}T00:00:00`).toISOString(), fin: new Date(`${enJours(au, 1)}T00:00:00`).toISOString(), motif });
      setAvis({ ok: true, t: "C'est noté. Les soins à basculer s'affichent dans la liste." });
    } catch (e) {
      setAvis({ ok: false, t: e instanceof Error ? e.message : "La base n'a pas répondu." });
    } finally {
      setOccupe(false);
    }
  };
  return (
    <aside className="cal-panneau" aria-label="Noter une absence">
      <div className="cal-panneau-tete">
        <span className="cal-pastille cal-pastille--orange">Absence</span>
        <span className="cal-pousse" />
        <button type="button" className="cal-icone-bouton" aria-label="Fermer" onClick={fermer}><Icone d={L.croix} /></button>
      </div>
      <h2 className="cal-panneau-titre">Noter une absence</h2>
      <div className="cal-panneau-corps">
        <label className="cal-champ"><span>Qui</span><select value={membre} onChange={(e) => setMembre(e.target.value)}>{membres.map((m) => <option key={m.id} value={m.id}>{m.prenom}</option>)}</select></label>
        <label className="cal-champ"><span>Du</span><input type="date" value={du} min={enJours(jour, -7)} max={enJours(jour, 365)} onChange={(e) => setDu(e.target.value)} /></label>
        <label className="cal-champ"><span>Au (inclus)</span><input type="date" value={au} min={du} max={enJours(du || jour, 365)} onChange={(e) => setAu(e.target.value)} /></label>
        <div className="cal-champ"><span>Motif</span>
          <div className="cal-choix" role="radiogroup" aria-label="Motif">
            {(Object.keys(MOTIFS) as MotifAbsenceMembre[]).map((k) => <button key={k} type="button" role="radio" aria-checked={motif === k} className="cal-bouton" onClick={() => setMotif(k)}>{MOTIFS[k]}</button>)}
          </div>
        </div>
        <p className="cal-aide">Aucune raison médicale n&apos;est demandée.</p>
        {avis ? <p className={avis.ok ? "cal-ok" : "cal-erreur"} role={avis.ok ? "status" : "alert"}>{avis.t}</p> : null}
      </div>
      <div className="cal-panneau-pied">
        <button type="button" className="cal-bouton" onClick={fermer}>Fermer</button>
        <button type="button" className="cal-bouton cal-bouton--plein" disabled={occupe || !membre || !du || !au || au < du} onClick={() => void noter()}>Noter</button>
      </div>
    </aside>
  );
}

export default function Fauteuils() {
  const t = useTiroma();
  const router = useRouter();
  const params = useSearchParams();
  const d = t.dossier;
  const fauteuilVise = params.get("fauteuil");
  const onglet = (ONGLETS.find((o) => o.cle === params.get("vue"))?.cle ?? "charge") as Onglet;
  const [ouverte, setOuverte] = useState<string | null>(fauteuilVise);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirme, setConfirme] = useState<string | null>(null);
  const [absence, setAbsence] = useState(false);
  const [vueCal, setVueCal] = useState<"liste" | "calendrier">("liste");

  useEffect(() => {
    if (!menu) return;
    const fermer = () => setMenu(null);
    window.addEventListener("click", fermer);
    return () => window.removeEventListener("click", fermer);
  }, [menu]);

  const groupes = d ? lignes(d, onglet, (id) => { const a = d.equipe?.find((x) => x.absence_id === id); return a ? t.cloreAbsence(a) : Promise.resolve(); }) : [];
  const toutes = groupes.flatMap((g) => g.lignes);
  const detail = ouverte ? toutes.find((l) => l.cle === ouverte) ?? null : null;
  const i = detail ? toutes.indexOf(detail) : -1;
  const peutAbsence = !!d && (d.profil === "titulaire" || d.profil === "assistante") && d.membres.some((m) => m.actif);

  const reel = t.reel;
  let etat: React.ReactNode = null;
  if (t.source === "reelle" && !reel) etat = "Lecture de votre cabinet…";
  else if (t.source === "reelle" && reel && !reel.compte) etat = "Cette session n'est rattachée à aucune organisation.";
  else if (t.source === "reelle" && reel && !reel.cabinets.length) etat = <>Aucun cabinet installé. <Link href={`${RACINE}/tiroma/reglages`}>Installer le cabinet</Link></>;
  else if (!d) etat = "Lecture du cabinet…";

  return (
    <div className={`tir-cal ${calSans.variable}`}>
      <div className="cal-carte">
        <div className="cal-defile">
          <div className="cal-outils">
            <nav className="cal-segment" aria-label="Onglets">
              {ONGLETS.map((o) => (
                <Link key={o.cle} href={o.cle === "charge" ? BASE : `${BASE}?vue=${o.cle}`} className="cal-segment-item" aria-current={onglet === o.cle ? "page" : undefined} onClick={() => setOuverte(null)}>{o.libelle}</Link>
              ))}
            </nav>
            <button type="button" className="cal-bouton cal-filtre" onClick={() => router.push(`${RACINE}/tiroma/reglages?section=fauteuils`)} title="Les fauteuils, dans les réglages">
              <Icone d={L.filtre} />Fauteuils
            </button>
            <span className="cal-pousse" />
            {peutAbsence ? (
              <button type="button" className="cal-bouton cal-bouton--plein" onClick={() => { setAbsence(true); setOuverte(null); }}>
                <Icone d={L.plus} />Noter une absence
              </button>
            ) : null}
            <div className="cal-segment cal-segment--icones" role="radiogroup" aria-label="Vue">
              <button type="button" role="radio" aria-checked={vueCal === "liste"} className="cal-segment-item" aria-label="Liste" onClick={() => setVueCal("liste")}><Icone d={L.menu} /></button>
              <button type="button" role="radio" aria-checked={vueCal === "calendrier"} className="cal-segment-item" aria-label="Pilotage" onClick={() => router.push(`${RACINE}/tiroma/pilotage`)}><Icone d={L.calendrier} /></button>
            </div>
          </div>

          {etat ? <div className="cal-etat">{etat}</div> : null}
          {!etat && !groupes.length ? <Vide titre={VIDES[onglet][0]} texte={VIDES[onglet][1]} /> : null}
          {!etat && groupes.length ? (
            <div className="cal-liste">
              {groupes.map((g, gi) => (
                <div key={gi} className="cal-groupe">
                  {g.libelle ? <div className="cal-groupe-tete">{g.libelle}</div> : null}
                  <div className="cal-panneau-int">
                    {g.lignes.map((l) => (
                      <div key={l.cle} className="cal-ligne" data-ouverte={ouverte === l.cle ? "" : undefined} onClick={() => { setOuverte(l.cle); setAbsence(false); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setOuverte(l.cle); }}>
                        <span className="cal-case" aria-hidden="true" />
                        <div className="cal-date">
                          <span className="cal-date-jour">{l.date}</span>
                          <span className="cal-date-heures">{l.heures}</span>
                          {l.pastille ? <span className={`cal-badge${l.pastille.teinte ? ` cal-badge--${l.pastille.teinte}` : ""}`}><Icone d={L.fauteuil} taille={14} />{l.pastille.texte}</span> : null}
                        </div>
                        <div className="cal-contenu">
                          <span className="cal-titre">{l.titre}</span>
                          <span className="cal-qui">{l.qui}</span>
                          {l.mention ? <span className="cal-mention">{l.mention}</span> : null}
                          {l.sous ? <span className="cal-sous">{l.sous}</span> : null}
                          {l.note ? <span className="cal-note">&quot;{l.note}&quot;</span> : null}
                        </div>
                        <div className="cal-droite" onClick={(e) => e.stopPropagation()}>
                          {l.action ? (
                            confirme === l.cle ? (
                              <>
                                <button type="button" className="cal-bouton cal-bouton--petit" onClick={() => setConfirme(null)}>Annuler</button>
                                <button type="button" className="cal-bouton cal-bouton--petit cal-bouton--plein" onClick={() => { setConfirme(null); void l.action?.faire(); }}>Confirmer</button>
                              </>
                            ) : (
                              <button type="button" className="cal-bouton cal-bouton--petit" title={l.action.confirmer} onClick={() => setConfirme(l.cle)}>{l.action.libelle}</button>
                            )
                          ) : null}
                          <span className="cal-ancre">
                            <button type="button" className="cal-icone-bouton cal-icone-bouton--bord" aria-label="Plus" aria-expanded={menu === l.cle} onClick={(e) => { e.stopPropagation(); setMenu((m) => (m === l.cle ? null : l.cle)); }}><Icone d={L.points} /></button>
                            {menu === l.cle ? (
                              <div className="cal-menu" role="menu">
                                <button type="button" role="menuitem" className="cal-menu-item" onClick={() => setOuverte(l.cle)}>Ouvrir le détail</button>
                                {(l.liens ?? []).map((k) => <Link key={k.href} href={k.href} role="menuitem" className="cal-menu-item">{k.libelle}</Link>)}
                                {l.action ? <button type="button" role="menuitem" className="cal-menu-item cal-menu-item--rouge" onClick={() => setConfirme(l.cle)}>{l.action.libelle}</button> : null}
                              </div>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {detail ? (
          <aside className="cal-panneau" aria-label={detail.titre}>
            <div className="cal-panneau-tete">
              {detail.pastille ? <span className={`cal-pastille${detail.pastille.teinte ? ` cal-pastille--${detail.pastille.teinte}` : ""}`}>{detail.pastille.texte}</span> : null}
              <span className="cal-pousse" />
              <button type="button" className="cal-icone-bouton" aria-label="Précédent" disabled={i <= 0} onClick={() => i > 0 && setOuverte(toutes[i - 1].cle)}><Icone d={L.haut} /></button>
              <button type="button" className="cal-icone-bouton" aria-label="Suivant" disabled={i >= toutes.length - 1} onClick={() => i < toutes.length - 1 && setOuverte(toutes[i + 1].cle)}><Icone d={L.bas} /></button>
              <button type="button" className="cal-icone-bouton" aria-label="Fermer" onClick={() => setOuverte(null)}><Icone d={L.croix} /></button>
            </div>
            <h2 className="cal-panneau-titre">{detail.titre}</h2>
            <div className="cal-panneau-corps">
              {detail.detail.map((s) => (
                <section key={s.titre} className="cal-section">
                  <h3>{s.titre}</h3>
                  {s.lignes.map((r, k) => (
                    <p key={k}><strong>{r.libelle}</strong>{r.valeur ? <span>{r.valeur}</span> : null}</p>
                  ))}
                </section>
              ))}
            </div>
            <div className="cal-panneau-pied">
              {(detail.liens ?? []).slice(0, 1).map((k) => <Link key={k.href} href={k.href} className="cal-bouton">{k.libelle}</Link>)}
              {detail.action ? <button type="button" className="cal-bouton cal-bouton--plein" onClick={() => setConfirme(detail.cle)}>{detail.action.libelle}</button> : null}
            </div>
          </aside>
        ) : absence ? <Absence fermer={() => setAbsence(false)} /> : null}
      </div>
    </div>
  );
}
