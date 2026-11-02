"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — Avant les rendez-vous (/espace2/tiroma/avant, 02/11/2026)
   docs/refonte-metiers/PAGES-MANQUANTES.md ; copie 1:1 de Linear, Triage
   (releves/linear-triage.md) : la liste à gauche, la vérification ouverte
   à droite, l'état vide quand rien n'est ouvert.

   Données (rien n'est écrit en base, portes inchangées) : la porte b3_04
   tiroma_avant_rendez_vous — à J-2 par le dossier du layout, sur la semaine
   par ./avant.ts (p_jours = 7) — et, dans le volet, les fiches qu'elle nomme
   (travail de laboratoire, implants en stock, entente ODF).

   Correspondance avec Linear :
     ligne de triage   → une vérification : titre = le texte de la base,
                         identifiant par nature (LAB-, IMP-, DEV-, MUT-, ODF-,
                         INT-), auteur = le patient, échéance (critique),
                         priorité = gravité, date relative ;
     étoile            → épingler la page / la vérification dans Aujourd'hui ;
     Filtre, Display   → nature, gravité ; horizon J-2 / semaine, vérifiées,
                         écartées, reportées, export CSV ;
     Accept, Decline   → « Vérifié » / « Écarter » sur ce poste (réversibles) ;
     Duplicate         → les autres vérifications du même patient ;
     Snooze            → reporter (demain, 3 j, 7 j) ;
     Copy URL…, Copy as prompt | Choose → lien, page liée, suivre le patient,
                         copier pour l'assistant (la vérification ou la liste) ;
     pilules           → état, gravité, qui s'en charge, nature (page liée),
                         fiche, date ;
     réactions, pièce jointe, Add sub-issues → copier le texte, ouvrir la
                         fiche, geste suivant (relance du laboratoire,
                         commande d'implants, carte du plan, rappel ODF) ;
     Activity, Unsubscribe, boîte de commentaire → ce qui s'est passé sur ce
                         poste, suivre le patient, note de ce poste.
   Adresse : ?verif=<clé ou id de la fiche> (aiguillage de tiroma_travaux_labo
   et tiroma_ententes_odf), ?horizon=j2, ?nature=, ?patient=.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RACINE } from "../modules";
import { NATURES_VERIF } from "@/components/espace/tiroma/libelles";
import type { Verification } from "@/components/espace/tiroma/types";
import { useTiroma } from "./donnees";
import { TirAvatar, TirCarte, TirMenu, type OptionMenu } from "./TirCadre";
import { TirIcone, type NomTirIcone } from "./TirIcone";
import { AvantIcone } from "./AvantIcone";
import { chargerSemaine, FICHES_EXEMPLE, lireFiches, semaineExemple, type Fiches } from "./avant";
import { aujourdHuiISO, copier, dansJours, estReporte, exporterCSV, useAssignes, useFavoris, useNotes, useReportes, useSuivis, useTable } from "./navigateur";
import "./tir-triage.css";

const BASE = `${RACINE}/tiroma`;
const ICI = `${BASE}/avant`;
const URGENT = "lch(66 80 48)";

/* vérifiée / écartée sur ce poste : clé → date ISO */
const useVerifiees = () => useTable<string>("espace2:verifies:tiroma");
const useEcartees = () => useTable<string>("espace2:ecartes:tiroma");

const PREFIXES: Record<Verification["nature"], string> = {
  labo: "LAB",
  implant: "IMP",
  devis_expire: "DEV",
  devis_sans_reponse: "DEV",
  mutuelle_accord: "MUT",
  mutuelle_attente: "MUT",
  odf_accord: "ODF",
  odf_semestre: "ODF",
  interruption: "INT",
};
const FAMILLES: { cle: string; libelle: string; natures: Verification["nature"][]; icone: NomTirIcone }[] = [
  { cle: "labo", libelle: "Laboratoire", natures: ["labo"], icone: "Factory" },
  { cle: "implant", libelle: "Implants", natures: ["implant"], icone: "Box" },
  { cle: "devis", libelle: "Devis et mutuelle", natures: ["devis_expire", "devis_sans_reponse", "mutuelle_accord", "mutuelle_attente"], icone: "Euro" },
  { cle: "odf", libelle: "Orthodontie", natures: ["odf_accord", "odf_semestre"], icone: "Calendar" },
  { cle: "interruption", libelle: "Traitement interrompu", natures: ["interruption"], icone: "Hourglass" },
];
const GRAVITES = { critique: { libelle: "Critique", prio: 1, prioLib: "Urgent" }, attention: { libelle: "À vérifier", prio: 2, prioLib: "Haute" }, info: { libelle: "Sans souci", prio: 4, prioLib: "Basse" } } as const;
const STATUTS_LABO: Record<string, string> = { attendu: "attendu", en_fabrication: "en fabrication", revenu: "revenu", annule: "annulé" };
const STATUTS_ODF: Record<string, string> = { demandee: "demandée", accordee: "accordée", commencee: "commencée", terminee: "terminée", abandonnee: "abandonnée", refusee: "refusée" };

const jour = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
const jourCourt = (iso: string | null | undefined) => (iso ? jour(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");
const complet = (iso: string | null | undefined) => (iso ? jour(iso).toLocaleDateString("fr-FR", { dateStyle: "long" }) : "");
function relatif(iso: string | null): string {
  if (!iso) return "";
  const n = Math.round((jour(iso.slice(0, 10)).getTime() - jour(aujourdHuiISO()).getTime()) / 86_400_000);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  return n > 0 ? `dans ${n} j` : `il y a ${-n} j`;
}

export const cleVerif = (v: Verification) => `${v.nature}:${v.objet_id ?? v.rendez_vous_id ?? v.patient_id ?? ""}`;

type Ligne = { v: Verification; cle: string; ident: string; famille: (typeof FAMILLES)[number] };

/* la page liée : la carte du plan (Plans et devis), sinon les appels du patient (Créneaux et appels) */
function pageLiee(v: Verification): { href: string; libelle: string } {
  if (v.objet_type === "tiroma_plans" && v.objet_id) return { href: `${BASE}/plans?plan=${encodeURIComponent(v.objet_id)}`, libelle: "Ouvrir la carte du plan" };
  return { href: `${BASE}/creneaux?vue=appels`, libelle: "Ouvrir les appels à reprendre" };
}

export default function AvantRendezVous() {
  const t = useTiroma();
  const params = useSearchParams();
  const router = useRouter();
  const d = t.dossier;
  const horizon = params.get("horizon") === "j2" ? "j2" : "semaine";
  const nature = params.get("nature");
  const patient = params.get("patient");
  const voulu = params.get("verif");

  const [semaine, setSemaine] = useState<{ cabinet: string; verifs: Verification[] } | null>(null);
  const [erreurSemaine, setErreurSemaine] = useState<string | null>(null);
  const [fiches, setFiches] = useState<Fiches | null>(null);
  const [gravites, setGravites] = useState<string[]>([]);
  const [voirVerifiees, setVoirVerifiees] = useState(false);
  const [voirEcartees, setVoirEcartees] = useState(false);
  const [voirReportees, setVoirReportees] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const [favoris, poserFavori] = useFavoris();
  const [reportes, poserReporte] = useReportes();
  const [verifiees, poserVerifiee] = useVerifiees();
  const [ecartees, poserEcartee] = useEcartees();
  const [suivis, poserSuivi] = useSuivis();
  const [assignes, poserAssigne] = useAssignes();
  const [notes, poserNotes] = useNotes();

  const dire = useCallback((texte: string) => setAvis(texte), []);
  useEffect(() => {
    if (!avis) return;
    const m = window.setTimeout(() => setAvis(null), 4000);
    return () => window.clearTimeout(m);
  }, [avis]);

  /* la semaine (base réelle) : la porte b3_04 avec p_jours = 7 */
  const cabinet = t.source === "reelle" ? (d?.cabinet ?? null) : null;
  useEffect(() => {
    if (!cabinet || horizon !== "semaine") return;
    let vivant = true;
    chargerSemaine(cabinet)
      .then((verifs) => vivant && (setSemaine({ cabinet: cabinet.id, verifs }), setErreurSemaine(null)))
      .catch((e: unknown) => vivant && setErreurSemaine(e instanceof Error ? e.message : "La base n'a pas répondu."));
    return () => {
      vivant = false;
    };
  }, [cabinet, horizon]);

  const toutes: Verification[] = useMemo(() => {
    if (!d) return [];
    if (horizon === "j2") return d.verifications;
    if (t.source === "exemple") return semaineExemple(d.verifications);
    return semaine && semaine.cabinet === d.cabinet.id ? semaine.verifs : d.verifications;
  }, [d, horizon, t.source, semaine]);

  /* les fiches du volet (base réelle) ; en exemple, celles du cabinet fictif */
  useEffect(() => {
    if (!cabinet || !toutes.length) return;
    let vivant = true;
    lireFiches(cabinet, toutes)
      .then((f) => vivant && setFiches(f))
      .catch(() => vivant && setFiches({ labo: {}, odf: {}, stock: null }));
    return () => {
      vivant = false;
    };
  }, [cabinet, toutes]);
  const f: Fiches = t.source === "exemple" ? FICHES_EXEMPLE : (fiches ?? { labo: {}, odf: {}, stock: null });

  const lignes: Ligne[] = useMemo(() => {
    const rangs: Record<string, number> = {};
    return toutes.map((v) => {
      const p = PREFIXES[v.nature] ?? "AV";
      rangs[p] = (rangs[p] ?? 0) + 1;
      return { v, cle: cleVerif(v), ident: `${p}-${rangs[p]}`, famille: FAMILLES.find((x) => x.natures.includes(v.nature)) ?? FAMILLES[0] };
    });
  }, [toutes]);

  const visibles = lignes.filter((l) => {
    if (nature && l.famille.cle !== nature) return false;
    if (patient && l.v.patient_id !== patient) return false;
    if (gravites.length && !gravites.includes(l.v.gravite)) return false;
    if (verifiees[l.cle] && !voirVerifiees) return false;
    if (ecartees[l.cle] && !voirEcartees) return false;
    if (estReporte(reportes, l.cle) && !voirReportees) return false;
    return true;
  });

  const ouverte = voulu ? (lignes.find((l) => l.cle === voulu) ?? lignes.find((l) => l.v.objet_id === voulu || l.v.rendez_vous_id === voulu) ?? null) : null;

  const adresse = useCallback(
    (changes: Record<string, string | null>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null) p.delete(k);
        else p.set(k, v);
      }
      const q = p.toString();
      return q ? `${ICI}?${q}` : ICI;
    },
    [params],
  );
  const ouvrir = useCallback((cle: string | null) => router.replace(adresse({ verif: cle }), { scroll: false }), [router, adresse]);

  /* ↑ ↓ (et j k) parcourent la liste, Échap referme, comme dans Linear */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && (cible.tagName === "TEXTAREA" || cible.tagName === "INPUT" || cible.tagName === "SELECT" || cible.isContentEditable)) return;
      if (e.key === "Escape" && ouverte) ouvrir(null);
      const sens = e.key === "ArrowDown" || e.key === "j" ? 1 : e.key === "ArrowUp" || e.key === "k" ? -1 : 0;
      if (!sens || !visibles.length) return;
      e.preventDefault();
      const i = ouverte ? visibles.findIndex((l) => l.cle === ouverte.cle) : -1;
      const n = visibles[Math.min(Math.max(i + sens, 0), visibles.length - 1)];
      if (n) ouvrir(n.cle);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [visibles, ouverte, ouvrir]);

  /* ——— utilités ——— */
  const detailsTexte = (l: Ligne): string[] => {
    const v = l.v;
    if (v.objet_type === "tiroma_travaux_labo" && v.objet_id && f.labo[v.objet_id]) {
      const w = f.labo[v.objet_id];
      return [
        `${w.type_travail ?? "Travail"}${w.laboratoire ? ` — ${w.laboratoire}` : ""}, ${STATUTS_LABO[w.statut] ?? w.statut}.`,
        [w.envoye_le ? `Envoyé le ${complet(w.envoye_le)}` : null, w.retour_attendu_le ? `retour attendu le ${complet(w.retour_attendu_le)}` : null, w.revenu_le ? `revenu le ${complet(w.revenu_le)}` : null].filter(Boolean).join(", ") + ".",
      ];
    }
    if (v.nature === "labo" && !v.objet_id) return ["Aucune fiche de laboratoire n'est rattachée à cette pose dans le logiciel du cabinet."];
    if (v.objet_type === "tiroma_ententes_odf" && v.objet_id && f.odf[v.objet_id]) {
      const o = f.odf[v.objet_id];
      return [
        `Entente ${STATUTS_ODF[o.statut] ?? o.statut}${o.accord_par_silence ? " (accord tacite)" : ""}.`,
        [o.demande_le ? `Demandée le ${complet(o.demande_le)}` : null, o.accord_le ? `accordée le ${complet(o.accord_le)}` : null, o.debut_le ? `traitement commencé le ${complet(o.debut_le)}` : null, o.semestre_courant ? `semestre ${o.semestre_courant}${o.semestre_fin_le ? ` jusqu'au ${complet(o.semestre_fin_le)}` : ""}` : null].filter(Boolean).join(", ") + ".",
      ];
    }
    if (v.nature === "implant") {
      if (!f.stock) return ["Le stock d'implants n'a pas pu être lu."];
      if (!f.stock.length) return ["Aucun implant n'est inscrit au stock du cabinet."];
      return f.stock.map((s) => `${s.reference}${s.marque ? ` · ${s.marque}` : ""}${s.diametre_mm && s.longueur_mm ? ` ${String(s.diametre_mm).replace(".", ",")} × ${String(s.longueur_mm).replace(".", ",")} mm` : ""} : ${s.quantite} en stock${s.seuil !== null ? ` (seuil ${s.seuil})` : ""}${s.seuil !== null && s.quantite <= s.seuil ? " — sous le seuil" : ""}${s.peremption ? `, périme le ${complet(s.peremption)}` : ""}.`);
    }
    return [];
  };
  const resume = (l: Ligne) =>
    [`${l.ident} · ${NATURES_VERIF[l.v.nature]} · ${GRAVITES[l.v.gravite].libelle}`, `Patient : ${l.v.patient_nom ?? "—"}${l.v.quand ? ` · ${complet(l.v.quand)}` : ""}`, l.v.texte, ...detailsTexte(l)].join("\n");
  const copierUne = async (l: Ligne) => dire((await copier(`Cabinet ${d?.cabinet.entite_nom ?? ""}, vérification avant le rendez-vous :\n${resume(l)}`)) ? "Copié pour l'assistant." : "Le presse-papier a refusé la copie.");
  const copierListe = async () =>
    dire((await copier(`Cabinet ${d?.cabinet.entite_nom ?? ""}, avant les rendez-vous (${horizon === "j2" ? `à J-${d?.regles?.labo_verif_jours ?? 2}` : "sur la semaine"}) :\n${visibles.map((l) => `- ${l.ident} ${l.v.patient_nom ?? ""} — ${l.v.texte}`).join("\n")}`)) ? "Liste copiée pour l'assistant." : "Le presse-papier a refusé la copie.");
  const copierLien = async (l: Ligne) => dire((await copier(`${window.location.origin}${ICI}?verif=${encodeURIComponent(l.cle)}`)) ? "Lien copié." : "Le presse-papier a refusé la copie.");
  const exporter = () => {
    exporterCSV("tiroma-avant-rendez-vous", ["Identifiant", "Gravité", "Nature", "Patient", "Date", "Vérification", "Sur ce poste"], visibles.map((l) => [l.ident, GRAVITES[l.v.gravite].libelle, NATURES_VERIF[l.v.nature], l.v.patient_nom, l.v.quand ? complet(l.v.quand) : "", l.v.texte, verifiees[l.cle] ? "vérifiée" : ecartees[l.cle] ? "écartée" : estReporte(reportes, l.cle) ? `reportée au ${complet(reportes[l.cle])}` : ""]));
    dire("Liste exportée en CSV.");
  };
  const epinglerPage = () => {
    if (favoris["page:avant"]) poserFavori("page:avant", null);
    else poserFavori("page:avant", { titre: "Avant les rendez-vous", href: ICI, type: "Page", depuis: new Date().toISOString() });
  };
  const epinglerUne = (l: Ligne) => {
    const k = `avant:${l.cle}`;
    if (favoris[k]) poserFavori(k, null);
    else poserFavori(k, { titre: `${l.ident} · ${l.v.patient_nom ?? ""} — ${NATURES_VERIF[l.v.nature]}`, href: `${ICI}?verif=${encodeURIComponent(l.cle)}`, type: "Avant les rendez-vous", depuis: new Date().toISOString() });
  };
  const suivre = (l: Ligne) => {
    if (!l.v.patient_id) return;
    if (suivis[l.v.patient_id]) {
      poserSuivi(l.v.patient_id, null);
      dire(`${l.v.patient_nom ?? "Le patient"} n'est plus suivi.`);
    } else {
      poserSuivi(l.v.patient_id, l.v.patient_nom ?? "Patient");
      dire(`${l.v.patient_nom ?? "Le patient"} est suivi : il apparaît en tête de Créneaux et appels.`);
    }
  };
  const verifier = (l: Ligne) => {
    if (verifiees[l.cle]) {
      poserVerifiee(l.cle, null);
      dire("Remise à vérifier.");
      return;
    }
    poserVerifiee(l.cle, new Date().toISOString());
    poserEcartee(l.cle, null);
    suivante(l);
    dire("Marquée vérifiée sur ce poste.");
  };
  const ecarter = (l: Ligne) => {
    if (ecartees[l.cle]) {
      poserEcartee(l.cle, null);
      dire("Remise dans la liste.");
      return;
    }
    poserEcartee(l.cle, new Date().toISOString());
    poserVerifiee(l.cle, null);
    suivante(l);
    dire("Écartée sur ce poste (Affichage › Les écartées pour la revoir).");
  };
  const reporter = (l: Ligne, jours: number | null) => {
    poserReporte(l.cle, jours === null ? null : dansJours(jours));
    if (jours !== null) suivante(l);
    dire(jours === null ? "Remise dans la liste." : `Reportée jusqu'au ${jourCourt(dansJours(jours))}.`);
  };
  function suivante(l: Ligne) {
    const i = visibles.findIndex((x) => x.cle === l.cle);
    const n = visibles[i + 1] ?? visibles[i - 1];
    ouvrir(n && n.cle !== l.cle ? n.cle : null);
  }
  /* le geste qui suit, selon la nature (« Add sub-issues ») */
  const gesteSuivant = (l: Ligne): { libelle: string; icone: NomTirIcone; href?: string; action?: () => void } => {
    const v = l.v;
    if (v.nature === "labo" && v.gravite !== "info") {
      const w = v.objet_id ? f.labo[v.objet_id] : null;
      return {
        libelle: "Copier la relance du laboratoire",
        icone: "Email",
        action: async () =>
          dire((await copier(`Bonjour${w?.laboratoire ? ` (${w.laboratoire})` : ""},\nPouvez-vous nous confirmer le retour de ${w?.type_travail ?? "ce travail"} pour ${v.patient_nom ?? "notre patient"} ? La pose est prévue le ${complet(v.quand)}.\nMerci,\n${d?.cabinet.entite_nom ?? "Le cabinet"}`)) ? "Relance copiée : à envoyer depuis votre messagerie." : "Le presse-papier a refusé la copie."),
      };
    }
    if (v.nature === "implant") {
      const bas = (f.stock ?? []).filter((s) => s.seuil !== null && s.quantite <= s.seuil);
      return {
        libelle: "Copier la commande d'implants",
        icone: "Cart",
        action: async () =>
          dire((await copier(`Commande d'implants — ${d?.cabinet.entite_nom ?? "cabinet"} (chirurgie du ${complet(v.quand)}) :\n${(bas.length ? bas : f.stock ?? []).map((s) => `- ${s.reference}${s.marque ? ` (${s.marque})` : ""} : ${Math.max((s.seuil ?? 0) + 2 - s.quantite, 1)}`).join("\n") || "- (aucune référence lue)"}`)) ? "Commande copiée : à envoyer au fournisseur." : "Le presse-papier a refusé la copie."),
      };
    }
    if (v.objet_type === "tiroma_plans" && v.objet_id) return { libelle: v.nature.startsWith("mutuelle") ? "Noter la mutuelle sur la carte" : "Noter l'appel sur la carte", icone: "Project", href: pageLiee(v).href };
    if (v.nature.startsWith("odf")) return { libelle: "Inscrire en liste d'attente", icone: "Plus", href: `${BASE}/creneaux?vue=attente&inscrire=1` };
    return { libelle: "Ouvrir les appels", icone: "Phone", href: `${BASE}/creneaux?vue=appels` };
  };

  /* ——— les menus de la liste ——— */
  const filtre: OptionMenu[] = [
    { titre: "Nature" },
    ...FAMILLES.map((x) => ({ libelle: x.libelle, icone: x.icone, coche: nature === x.cle, action: () => router.replace(adresse({ nature: nature === x.cle ? null : x.cle }), { scroll: false }) })),
    "sep",
    { titre: "Gravité" },
    ...(["critique", "attention", "info"] as const).map((g) => ({ libelle: GRAVITES[g].libelle, coche: gravites.includes(g), action: () => setGravites((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g])) })),
    ...(nature || patient || gravites.length
      ? ["sep" as const, { libelle: "Retirer les filtres", icone: "Refresh" as NomTirIcone, action: () => (setGravites([]), router.replace(adresse({ nature: null, patient: null }), { scroll: false })) }]
      : []),
  ];
  const affichage: OptionMenu[] = [
    { titre: "Horizon" },
    { libelle: `À J-${d?.regles?.labo_verif_jours ?? 2} (règle du cabinet)`, coche: horizon === "j2", action: () => router.replace(adresse({ horizon: "j2" }), { scroll: false }) },
    { libelle: "Sur la semaine", coche: horizon === "semaine", action: () => router.replace(adresse({ horizon: null }), { scroll: false }) },
    "sep",
    { titre: "Afficher" },
    { libelle: "Les vérifiées", coche: voirVerifiees, action: () => setVoirVerifiees((x) => !x) },
    { libelle: "Les écartées", coche: voirEcartees, action: () => setVoirEcartees((x) => !x) },
    { libelle: "Les reportées", coche: voirReportees, action: () => setVoirReportees((x) => !x) },
    "sep",
    { libelle: "Copier la liste pour l'assistant", icone: "Agent", action: () => void copierListe() },
    { libelle: "Exporter la liste en CSV", icone: "Spreadsheet", action: exporter },
  ];

  const reel = t.reel;
  let etat: React.ReactNode = null;
  if (t.source === "reelle" && !reel) etat = "Lecture de votre cabinet…";
  else if (t.source === "reelle" && reel && !reel.compte) etat = "Aucun compte rattaché : cette session n'est rattachée à aucune organisation.";
  else if (t.source === "reelle" && reel && !reel.cabinets.length) etat = <>Aucun cabinet installé. <Link href={`${BASE}/reglages`}>Installer le cabinet dans les réglages</Link></>;
  else if (!d) etat = "Lecture du cabinet…";
  else if (d.profil === "direction") etat = "La direction voit les compteurs du cabinet, sans les noms des patients : les vérifications sont réservées au titulaire, aux collaborateurs et aux assistantes.";

  const o = ouverte;
  const noteCle = o ? `avant:${o.cle}` : "";
  const sesNotes = o ? (notes[noteCle] ?? []) : [];
  const nomsEquipe = [...(d?.praticiens.filter((p) => p.actif).map((p) => p.nom_affiche) ?? []), ...(d?.membres.filter((m) => m.actif).map((m) => m.prenom) ?? [])];
  const enregistrerNote = () => {
    if (!o || !note.trim()) return;
    poserNotes(noteCle, [...sesNotes, { texte: note.trim(), le: new Date().toISOString() }]);
    setNote("");
    dire("Note gardée sur ce poste.");
  };
  const nb = visibles.length;

  return (
    <TirCarte className="tir-av">
      <div className="tir-av-triage" data-ouvert={!!o}>
        <div className="tir-av-liste">
          <div className="tir-av-tete">
            <h2>Avant les rendez-vous</h2>
            <button type="button" className="tir-rond" aria-pressed={!!favoris["page:avant"]} aria-label={favoris["page:avant"] ? "Retirer d'Aujourd'hui" : "Épingler dans Aujourd'hui"} title={favoris["page:avant"] ? "Retirer d'Aujourd'hui" : "Épingler dans Aujourd'hui"} onClick={epinglerPage}>
              <TirIcone nom={favoris["page:avant"] ? "Favorite" : "Etoile"} style={favoris["page:avant"] ? { color: "lch(60.135 63.97 86.502)" } : undefined} />
            </button>
            <span className="tir-pousse" />
            <TirMenu libelle="Filtrer" icone="Filtre" options={filtre} alignement="droite" largeur={220} />
            <TirMenu libelle="Affichage" icone="Affichage" options={affichage} alignement="droite" largeur={240} />
          </div>
          <div className="tir-av-defile" role="list" aria-label="Vérifications avant les rendez-vous">
            {t.erreur ? <p className="tir-av-note" role="alert">La base réelle n&apos;a pas répondu. {t.erreur}</p> : null}
            {erreurSemaine && horizon === "semaine" ? <p className="tir-av-note" role="alert">La semaine n&apos;a pas pu être lue ({erreurSemaine}) : la liste montre les vérifications à J-{d?.regles?.labo_verif_jours ?? 2}.</p> : null}
            {patient ? (
              <p className="tir-av-note">
                Vérifications de {lignes.find((l) => l.v.patient_id === patient)?.v.patient_nom ?? "ce patient"}.{" "}
                <Link href={adresse({ patient: null })} replace scroll={false}>Voir toutes</Link>
              </p>
            ) : null}
            {etat ? <p className="tir-av-note">{etat}</p> : null}
            {!etat && d && !nb ? <p className="tir-av-note">{lignes.length ? "Aucune vérification dans ce filtre." : "Rien à vérifier : les poses ont leur travail de laboratoire, les chirurgies leur implant, les devis leur délai et la mutuelle a répondu."}</p> : null}
            {!etat
              ? visibles.map((l) => {
                  const g = GRAVITES[l.v.gravite];
                  return (
                    <Link key={l.cle} href={adresse({ verif: l.cle })} replace scroll={false} className="tir-av-ligne" aria-current={o?.cle === l.cle} role="listitem" data-etat={verifiees[l.cle] ? "verifiee" : ecartees[l.cle] ? "ecartee" : undefined}>
                      <span className="tir-av-l1">
                        <span className="tir-av-titre">{l.v.texte}</span>
                        <span className="tir-av-id">{l.ident}</span>
                      </span>
                      <span className="tir-av-l2">
                        <span className="tir-av-auteur">
                          <TirAvatar nom={l.v.patient_nom ?? "Patient"} taille={16} />
                          <span>{l.v.patient_nom ?? "Patient"}</span>
                        </span>
                        {estReporte(reportes, l.cle) ? (
                          <span className="tir-av-puce" title={`Reportée jusqu'au ${complet(reportes[l.cle])}`}>
                            <AvantIcone nom="AlarmClock" taille={14} />
                            <span>{jourCourt(reportes[l.cle])}</span>
                          </span>
                        ) : l.v.gravite === "critique" && l.v.quand ? (
                          <span className="tir-av-puce" title={`Échéance : ${complet(l.v.quand)}`}>
                            <TirIcone nom="CrossedOutCalendar" taille={14} style={{ color: "var(--tir-rouge)" }} />
                            <span>{jourCourt(l.v.quand)}</span>
                          </span>
                        ) : null}
                        <span className="tir-av-prio" title={`Priorité : ${g.prioLib}`}>
                          <TirIcone nom={`Priority${g.prio}` as NomTirIcone} style={g.prio === 1 ? { color: URGENT } : undefined} />
                        </span>
                        <span className="tir-av-quand" title={complet(l.v.quand)}>{relatif(l.v.quand)}</span>
                      </span>
                    </Link>
                  );
                })
              : null}
          </div>
        </div>

        {o ? (
          <div className="tir-av-detail">
            <div className="tir-av-tete tir-av-tete--detail">
              <button type="button" className="tir-rond tir-av-retour" aria-label="Revenir à la liste" onClick={() => ouvrir(null)}>
                <TirIcone nom="Chevron" style={{ transform: "rotate(180deg)" }} />
              </button>
              <span className="tir-av-fil">
                <h2>
                  <span>{o.ident} </span>
                  {o.v.patient_nom ?? "Patient"} — {NATURES_VERIF[o.v.nature]}
                </h2>
              </span>
              <button type="button" className="tir-rond" aria-pressed={!!favoris[`avant:${o.cle}`]} aria-label={favoris[`avant:${o.cle}`] ? "Retirer d'Aujourd'hui" : "Épingler dans Aujourd'hui"} title={favoris[`avant:${o.cle}`] ? "Retirer d'Aujourd'hui" : "Épingler dans Aujourd'hui"} onClick={() => epinglerUne(o)}>
                <TirIcone nom={favoris[`avant:${o.cle}`] ? "Favorite" : "Etoile"} style={favoris[`avant:${o.cle}`] ? { color: "lch(60.135 63.97 86.502)" } : undefined} />
              </button>
              <TirMenu
                libelle="Actions de la vérification"
                options={[
                  { libelle: "Copier le lien", icone: "LienUrl", action: () => void copierLien(o) },
                  { libelle: "Copier pour l'assistant", icone: "Agent", action: () => void copierUne(o) },
                  { libelle: pageLiee(o.v).libelle, icone: "Project", href: pageLiee(o.v).href },
                  ...(o.v.patient_id ? [{ libelle: "Les vérifications de ce patient", icone: "StatusDuplicate" as NomTirIcone, href: adresse({ patient: o.v.patient_id, verif: o.cle }) }] : []),
                  "sep",
                  { libelle: "Vérification précédente", icone: "Chevron", raccourci: "↑", action: () => { const i = visibles.findIndex((x) => x.cle === o.cle); if (i > 0) ouvrir(visibles[i - 1].cle); } },
                  { libelle: "Vérification suivante", icone: "Chevron", raccourci: "↓", action: () => { const i = visibles.findIndex((x) => x.cle === o.cle); if (i >= 0 && i < visibles.length - 1) ouvrir(visibles[i + 1].cle); } },
                ]}
              />
              <div className="tir-av-actions">
                <button type="button" className="tir-rond" aria-pressed={!!verifiees[o.cle]} aria-label={verifiees[o.cle] ? "Remettre à vérifier" : "Marquer vérifiée"} title={verifiees[o.cle] ? "Remettre à vérifier" : "Marquer vérifiée (ce poste)"} onClick={() => verifier(o)}>
                  <AvantIcone nom="Resolved" taille={14} />
                </button>
                <button type="button" className="tir-rond" aria-pressed={!!ecartees[o.cle]} aria-label={ecartees[o.cle] ? "Remettre dans la liste" : "Écarter : sans objet"} title={ecartees[o.cle] ? "Remettre dans la liste" : "Écarter : sans objet (ce poste)"} onClick={() => ecarter(o)}>
                  <TirIcone nom="StatusCanceled" />
                </button>
                {o.v.patient_id ? (
                  <Link className="tir-rond" href={adresse({ patient: patient ? null : o.v.patient_id, verif: o.cle })} replace scroll={false} aria-label="Les autres vérifications de ce patient" title="Les autres vérifications de ce patient">
                    <TirIcone nom="StatusDuplicate" />
                  </Link>
                ) : null}
                <TirMenu
                  libelle="Reporter"
                  declencheur={<AvantIcone nom="AlarmClock" taille={14} />}
                  alignement="droite"
                  options={[
                    { titre: "Reporter jusqu'à" },
                    { libelle: "Demain", action: () => reporter(o, 1) },
                    { libelle: "Dans 3 jours", action: () => reporter(o, 3) },
                    { libelle: "Dans 7 jours", action: () => reporter(o, 7) },
                    ...(reportes[o.cle] ? ["sep" as const, { libelle: "Remettre maintenant", icone: "Refresh" as NomTirIcone, action: () => reporter(o, null) }] : []),
                  ]}
                />
              </div>
            </div>
            <div className="tir-av-barre">
              {avis ? <span className="tir-av-avis" role="status">{avis}</span> : null}
              <button type="button" className="tir-rond tir-rond--plein" aria-label="Copier le lien" title="Copier le lien" onClick={() => void copierLien(o)}>
                <TirIcone nom="LienUrl" />
              </button>
              <Link className="tir-rond tir-rond--plein" href={pageLiee(o.v).href} aria-label={pageLiee(o.v).libelle} title={pageLiee(o.v).libelle}>
                <TirIcone nom="Project" />
              </Link>
              <button type="button" className="tir-rond tir-rond--plein" disabled={!o.v.patient_id} aria-pressed={!!(o.v.patient_id && suivis[o.v.patient_id])} aria-label={o.v.patient_id && suivis[o.v.patient_id] ? "Ne plus suivre le patient" : "Suivre le patient"} title={o.v.patient_id && suivis[o.v.patient_id] ? "Ne plus suivre le patient" : "Suivre le patient"} onClick={() => suivre(o)}>
                <TirIcone nom="Subscribe" />
              </button>
              <span className="tir-av-double">
                <button type="button" className="tir-av-double-g" aria-label="Copier pour l'assistant" title="Copier pour l'assistant" onClick={() => void copierUne(o)}>
                  <TirIcone nom="Agent" />
                </button>
                <TirMenu
                  libelle="Que copier"
                  classeBouton="tir-av-double-d"
                  declencheur={<svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor" aria-hidden="true"><path d="M0.5 3h7L4 7z" /></svg>}
                  alignement="droite"
                  options={[
                    { libelle: "Cette vérification", icone: "Agent", action: () => void copierUne(o) },
                    { libelle: `La liste (${nb})`, icone: "Issues", action: () => void copierListe() },
                    { libelle: "La liste en CSV", icone: "Spreadsheet", action: exporter },
                  ]}
                />
              </span>
            </div>
            <div className="tir-av-corps">
              <div className="tir-av-colonne">
                <h1 className="tir-av-grand">{o.v.texte}</h1>
                <div className="tir-av-pilules">
                  <span className="tir-av-pilule" data-valeur="" title="État">
                    <TirIcone nom={verifiees[o.cle] ? "IssueStatusDone" : ecartees[o.cle] ? "StatusCanceled" : "IssueStatusTriage"} style={{ color: verifiees[o.cle] ? "#5e6ad2" : ecartees[o.cle] ? "var(--tir-t3)" : o.v.gravite === "critique" ? "#ff7336" : o.v.gravite === "info" ? "rgb(76, 183, 130)" : "lch(80 90 85)" }} />
                    <span>{verifiees[o.cle] ? "Vérifiée" : ecartees[o.cle] ? "Écartée" : GRAVITES[o.v.gravite].libelle}</span>
                  </span>
                  <span className="tir-av-pilule" data-valeur="" title="Priorité">
                    <TirIcone nom={`Priority${GRAVITES[o.v.gravite].prio}` as NomTirIcone} style={GRAVITES[o.v.gravite].prio === 1 ? { color: URGENT } : undefined} />
                    <span>{GRAVITES[o.v.gravite].prioLib}</span>
                  </span>
                  <TirMenu
                    libelle="Qui s'en charge"
                    classeBouton="tir-av-pilule"
                    declencheur={
                      <>
                        {assignes[noteCle] ? <TirAvatar nom={assignes[noteCle]} taille={14} /> : <TirIcone nom="Unassigned" />}
                        <span data-vide={assignes[noteCle] ? undefined : ""}>{assignes[noteCle] ?? "Qui s'en charge"}</span>
                      </>
                    }
                    options={[
                      { titre: "Sur ce poste" },
                      ...nomsEquipe.map((n) => ({ libelle: n, coche: assignes[noteCle] === n, action: () => poserAssigne(noteCle, assignes[noteCle] === n ? null : n) })),
                      ...(assignes[noteCle] ? ["sep" as const, { libelle: "Personne", icone: "Unassigned" as NomTirIcone, action: () => poserAssigne(noteCle, null) }] : []),
                    ]}
                  />
                  <Link className="tir-av-pilule" data-valeur="" href={adresse({ nature: o.famille.cle, verif: o.cle })} replace scroll={false} title={`Les vérifications « ${o.famille.libelle} »`}>
                    <TirIcone nom={o.famille.icone} />
                    <span>{o.famille.libelle}</span>
                  </Link>
                  <Link className="tir-av-pilule" data-valeur="" href={pageLiee(o.v).href} title={pageLiee(o.v).libelle}>
                    <TirIcone nom="Label" />
                    <span>{o.v.objet_type === "tiroma_travaux_labo" ? "Fiche de laboratoire" : o.v.objet_type === "tiroma_stock" ? "Stock d'implants" : o.v.objet_type === "tiroma_ententes_odf" ? "Entente ODF" : o.v.objet_type === "tiroma_plans" ? "Plan de traitement" : NATURES_VERIF[o.v.nature]}</span>
                  </Link>
                  {o.v.quand ? (
                    <span className="tir-av-pilule" data-valeur="" title={complet(o.v.quand)}>
                      <TirIcone nom={o.v.gravite === "critique" ? "CrossedOutCalendar" : "Calendar"} style={o.v.gravite === "critique" ? { color: "var(--tir-rouge)" } : undefined} />
                      <span>{jourCourt(o.v.quand)}</span>
                    </span>
                  ) : null}
                </div>
                <div className="tir-av-texte">
                  {detailsTexte(o).length ? detailsTexte(o).map((x, i) => <p key={i}>{x}</p>) : <p>{NATURES_VERIF[o.v.nature]} : {o.v.patient_nom ?? "patient"}{o.v.quand ? `, ${complet(o.v.quand)}` : ""}.</p>}
                </div>
                <div className="tir-av-reactions">
                  <button type="button" className="tir-rond" aria-label="Copier le texte" title="Copier le texte" onClick={async () => dire((await copier(resume(o))) ? "Texte copié." : "Le presse-papier a refusé la copie.")}>
                    <AvantIcone nom="Face" taille={14} />
                  </button>
                  <Link className="tir-rond" href={pageLiee(o.v).href} aria-label={pageLiee(o.v).libelle} title={pageLiee(o.v).libelle}>
                    <TirIcone nom="Attachment" />
                  </Link>
                </div>
                {(() => {
                  const g = gesteSuivant(o);
                  return g.href ? (
                    <Link className="tir-av-sous" href={g.href}>
                      <TirIcone nom="Plus" taille={14} />
                      {g.libelle}
                    </Link>
                  ) : (
                    <button type="button" className="tir-av-sous" onClick={() => g.action?.()}>
                      <TirIcone nom="Plus" taille={14} />
                      {g.libelle}
                    </button>
                  );
                })()}
                <div className="tir-av-activite">
                  <h3 className="tir-av-h3">Activité</h3>
                  <span className="tir-pousse" />
                  {o.v.patient_id ? (
                    <button type="button" className="tir-av-suivre" onClick={() => suivre(o)}>
                      {suivis[o.v.patient_id] ? "Ne plus suivre" : "Suivre le patient"}
                    </button>
                  ) : null}
                  <TirAvatar nom={assignes[noteCle] ?? o.v.patient_nom ?? "Patient"} taille={20} />
                </div>
                <p className="tir-av-evenement">
                  <TirIcone nom="Refresh" taille={14} />
                  <b>Tiroma</b> a relevé la vérification dans l&apos;agenda {horizon === "j2" ? `à J-${d?.regles?.labo_verif_jours ?? 2}` : "de la semaine"} <b>·</b> {t.source === "exemple" ? "exemple" : "dernière lecture"}
                </p>
                {verifiees[o.cle] ? (
                  <p className="tir-av-evenement">
                    <AvantIcone nom="Resolved" taille={14} />
                    <b>Ce poste</b> l&apos;a marquée vérifiée <b>·</b> {complet(verifiees[o.cle])}
                  </p>
                ) : null}
                {ecartees[o.cle] ? (
                  <p className="tir-av-evenement">
                    <TirIcone nom="StatusCanceled" taille={14} />
                    <b>Ce poste</b> l&apos;a écartée <b>·</b> {complet(ecartees[o.cle])}
                  </p>
                ) : null}
                {estReporte(reportes, o.cle) ? (
                  <p className="tir-av-evenement">
                    <AvantIcone nom="AlarmClock" taille={14} />
                    <b>Ce poste</b> l&apos;a reportée jusqu&apos;au {complet(reportes[o.cle])}
                  </p>
                ) : null}
                {sesNotes.map((n, i) => (
                  <div key={i} className="tir-av-note-poste">
                    <p className="tir-av-evenement">
                      <TirIcone nom="Comment" taille={14} />
                      <b>Note de ce poste</b> <b>·</b> {new Date(n.le).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      <button type="button" className="tir-av-lien" onClick={() => poserNotes(noteCle, sesNotes.filter((_, j) => j !== i).length ? sesNotes.filter((_, j) => j !== i) : null)}>Retirer</button>
                    </p>
                    <p className="tir-av-note-texte">{n.texte}</p>
                  </div>
                ))}
                <div className="tir-av-composeur">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) enregistrerNote();
                    }}
                    placeholder="Ajouter une note de ce poste…"
                    aria-label="Note de ce poste"
                    rows={1}
                    maxLength={500}
                  />
                  <div className="tir-av-composeur-pied">
                    <span className="tir-av-composeur-aide">Visible sur ce poste seulement</span>
                    <button type="button" className="tir-av-mini" aria-label="Joindre le lien de la fiche" title="Joindre le lien de la fiche" onClick={() => setNote((x) => `${x}${x && !x.endsWith(" ") ? " " : ""}${window.location.origin}${pageLiee(o.v).href}`)}>
                      <TirIcone nom="Attachment" taille={14} />
                    </button>
                    <button type="button" className="tir-av-mini tir-av-mini--plein" aria-label="Garder la note" title="Garder la note (⌘ Entrée)" disabled={!note.trim()} onClick={enregistrerNote}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 2.5a.75.75 0 0 1 .53.22l4 4a.75.75 0 1 1-1.06 1.06L8.75 5.06v7.69a.75.75 0 0 1-1.5 0V5.06L4.53 7.78a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 8 2.5" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="tir-av-vide">
            {/* l'illustration de Linear (132×84, linear-triage.md), prise telle quelle sur les captures de référence */}
            {/* eslint-disable-next-line @next/next/no-img-element -- image fixe, déjà à sa taille */}
            <img className="tir-av-illu tir-av-illu--sombre" src="/espace2/tiroma/avant-vide-sombre.png" alt="" width={136} height={87} />
            {/* eslint-disable-next-line @next/next/no-img-element -- idem, thème clair */}
            <img className="tir-av-illu tir-av-illu--clair" src="/espace2/tiroma/avant-vide-clair.png" alt="" width={136} height={87} />
            {avis ? <p role="status">{avis}</p> : null}
            <span>
              {nb} vérification{nb > 1 ? "s" : ""} avant les rendez-vous
            </span>
            <Link className="tir-av-pilule" href={`${BASE}/creneaux?vue=attente&inscrire=1`}>
              <TirIcone nom="Plus" taille={14} />
              Inscrire en liste d&apos;attente
            </Link>
          </div>
        )}
      </div>
    </TirCarte>
  );
}
