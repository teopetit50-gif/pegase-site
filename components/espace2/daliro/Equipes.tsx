"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Équipes — copie 1:1 de « Availability » de Cal.com
   (02/11/2026, règles de Teo : docs/refonte-metiers/REGLES.md ;
   relevé : docs/refonte-metiers/releves/calcom-availability.md ;
   styles : ./dal-cal.css, préfixe dcal-).

   Ce que Cal.com montre, et ce que c'est ici :
     liste des horaires (nom, badge « Default », une ligne par plage,
     fuseau au globe, bouton ⋯)
         → un intervenant par ligne : nos équipes, les sous-traitants de
           l'annuaire et ceux que le planning nomme sans les avoir
           rapprochés ; badge « Équipe » pour nos équipes ; une ligne par
           passage prévu sur 30 jours (jours, heures, tâche, chantier) et
           par absence ; au globe, son métier et sa commune
     « My availability / Team availability »
         → « Tout le monde / Sous-traitants » (?type=)
     « + New »  → « + Absence » (G61) ; « ⋯ » → noter une absence (G61),
           annuler une absence (G62), ouvrir sa fiche d'annuaire
     « Temporarily out-of-office? Add a redirect »
         → « Un intervenant indisponible ? Noter une absence »
     page d'un horaire (?intervenant=)
       « Weekly hours » : sept jours, interrupteur, plages d'heures, ×, + et ⧉
         → la semaine choisie de l'intervenant, jour par jour : ses passages
           et leurs heures. Les gestes du planning façon Float d'avant
           (./Planning, retiré de la page) y sont tous :
             heures (les deux champs)  poser des heures (b6_82)
             ×                          retirer ce jour du passage
                                        (raccourcir par la fin ou le début)
             +                          étendre jusqu'à ce jour le passage
                                        qui finit la veille (étirer)
             ⧉ « Copy times to… »       « Déplacer vers… » un autre jour
                                        (glisser)
           Comme dans Cal.com, rien ne part avant « Enregistrer » ; en base
           réelle, btp_deplacer_passage (./deplacer), en exemple la même
           règle en mémoire. Le nom d'un chantier ouvre son passage dans
           Chantiers (?passage=).
       « Date overrides » → « Absences » : « + Ajouter une absence » (G61),
           la poubelle annule (G62, après confirmation)
       « Timezone » → « Semaine » (?semaine=) ; « Something doesn't look
           right? / Launch troubleshooter » → « Un passage à revoir ? /
           Ouvrir les chantiers »

     lecture  base réelle : les tableaux de tous les chantiers
              (useDaliro().demanderTous) et btp_disponibilites
              (chargerDisponibilites, gérant, admin ou valideur) ;
              exemple : les tableaux en mémoire, les absences notées
              gardées le temps de la visite.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, BookUser, CalendarOff, ChevronsUpDown, Copy, Ellipsis, EyeOff, Globe, Info, Pencil, Plus, Star, Trash, X } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { RACINE } from "@/components/espace2/modules";
import { dateCourte } from "@/components/espace/format";
import { Avis } from "@/components/espace/ui";
import { annulerIndisponibilite, chargerDisponibilites, noterIndisponibilite } from "@/components/espace/daliro/portes";
import type { Confirmation, Disponibilite, Passage, Tableau } from "@/components/espace/daliro/types";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import { useDeplacer } from "./deplacer";
import { copier } from "./navigateur";
import "@/components/espace/espace.css";
import "./dal-cal.css";

const BASE = `${RACINE}/daliro`;

type Absence = Disponibilite["absences"][number];
type PassageVu = { id: string; chantierId: string | null; chantier: string; tache: string | null; debut: string; fin: string; hd: string | null; hf: string | null; confirmation: Confirmation | null; p: Passage | null };
type Genre = "equipe" | "tiers" | "inconnu";
type Intervenant = { cle: string; nom: string; genre: Genre; tiers: string | null; lieu: string; passages: PassageVu[]; absences: Absence[] };
type Brouillon = Record<string, { debut: string; fin: string; hd: string | null; hf: string | null }>;

const RANG: Record<Genre, number> = { equipe: 0, tiers: 1, inconnu: 2 };
const JOUR = 86_400_000;
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
/* la liste des heures de Cal.com : un quart d'heure par option */
const HEURES = Array.from({ length: 96 }, (_, i) => `${`${Math.floor(i / 4)}`.padStart(2, "0")}:${`${(i % 4) * 15}`.padStart(2, "0")}`);

const num = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, (m || 1) - 1, j || 1) / JOUR);
};
const iso = (n: number) => new Date(n * JOUR).toISOString().slice(0, 10);
const plusJours = (jour: string, n: number) => iso(num(jour) + n);
const lundiDe = (jour: string) => {
  const n = num(jour);
  return iso(n - ((n + 3) % 7));
};
/* 0 = lundi */
const rangJour = (jour: string) => (num(jour) + 3) % 7;
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
const jj = (s: string) => s.slice(0, 10);
const hh = (s: string | null | undefined) => (s ? s.slice(0, 5) : null);
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const chevauche = (a: { debut: string; fin: string }, b: { du: string; au: string }) => jj(a.debut) <= b.au && jj(a.fin) >= b.du;
const periode = (du: string, au: string) => (du === au ? `le ${dateCourte(du)}` : `du ${dateCourte(du)} au ${dateCourte(au)}`);
const morceaux = (jour: string) => {
  const [, m, j] = jour.split("-").map(Number);
  return { j, m: m - 1, r: rangJour(jour) };
};
/* « Lun 3 nov. », « Lun 3 - Ven 7 nov. », « Ven 28 nov. - Mar 2 déc. » (la plage de Cal.com : « Mon - Fri ») */
function jours(debut: string, fin: string): string {
  const a = morceaux(debut);
  const b = morceaux(fin);
  if (debut === fin) return `${JOURS_COURTS[a.r]} ${a.j} ${MOIS_COURTS[a.m]}`;
  if (a.m === b.m) return `${JOURS_COURTS[a.r]} ${a.j} - ${JOURS_COURTS[b.r]} ${b.j} ${MOIS_COURTS[b.m]}`;
  return `${JOURS_COURTS[a.r]} ${a.j} ${MOIS_COURTS[a.m]} - ${JOURS_COURTS[b.r]} ${b.j} ${MOIS_COURTS[b.m]}`;
}
/* « Vendredi 20 novembre » (« Friday, November 20 ») */
function dateLongue(jour: string): string {
  const a = morceaux(jour);
  return `${JOURS[a.r]} ${a.j} ${MOIS[a.m]}`;
}
function plageLongue(du: string, au: string): string {
  if (du === au) return dateLongue(du);
  const a = morceaux(du);
  const b = morceaux(au);
  return a.m === b.m ? `${JOURS[a.r]} ${a.j} - ${JOURS[b.r].toLowerCase()} ${b.j} ${MOIS[b.m]}` : `${dateLongue(du)} - ${dateLongue(au).toLowerCase()}`;
}
const heures = (hd: string | null, hf: string | null) => (hd && hf ? `${hd} - ${hf}` : null);
const libellePassage = (p: PassageVu) => `${p.tache ?? "Passage"}, ${p.chantier}`;

/* ——— ce que ce navigateur retient pour la page (02/11/2026, « trouve une utilité aux boutons ») :
   l'intervenant par défaut (« Set as default »), les intervenants retirés de la liste (la poubelle),
   le nom affiché d'une de nos équipes (le crayon). Rien n'est envoyé au serveur. ——— */
const CLE_DEFAUT = "espace2:daliro:equipes:defaut";
const CLE_RETIRES = "espace2:daliro:equipes:retires";
const CLE_NOMS = "espace2:daliro:equipes:noms";
const lireLocal = (cle: string) => {
  try {
    return localStorage.getItem(cle) ?? "";
  } catch {
    return "";
  }
};
const ecrireLocal = (cle: string, valeur: unknown) => {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible : le réglage vaut pour cette visite */
  }
  window.dispatchEvent(new Event(cle));
};
const analyses = new Map<string, unknown>();
function useLocal<T>(cle: string, defaut: T): T {
  const brut = useSyncExternalStore(
    (cb) => {
      window.addEventListener(cle, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(cle, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => lireLocal(cle),
    () => "",
  );
  if (!brut) return defaut;
  const k = `${cle}|${brut}`;
  if (!analyses.has(k)) {
    try {
      analyses.set(k, JSON.parse(brut) as T);
    } catch {
      analyses.set(k, defaut);
    }
  }
  return analyses.get(k) as T;
}
const AUCUN: string[] = [];
const AUCUN_NOM: Record<string, string> = {};

/* le planning d'un intervenant en clair, pour le presse-papier (« Duplicate » de Cal.com) */
function resume(iv: Intervenant, du: string, au: string): string {
  const passages = iv.passages.filter((p) => chevauche(p, { du, au }));
  const absences = iv.absences.filter((a) => a.au >= du && a.du <= au);
  return [
    `${iv.nom} (${iv.lieu})`,
    ...passages.map((p) => `- ${jours(p.debut, p.fin)}${heures(p.hd, p.hf) ? `, ${heures(p.hd, p.hf)}` : ""} : ${libellePassage(p)}`),
    ...absences.map((a) => `- ${jours(a.du, a.au)} : absent${a.motif ? ` (${a.motif})` : ""}`),
    ...(!passages.length && !absences.length ? ["- aucun passage sur 30 jours"] : []),
  ].join("\n");
}

export default function Equipes() {
  const { source, pret, erreur, client, liste, tableau, demanderTous } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const toast = useToast();
  const du = useMemo(() => aujourdhui(), []);
  /* les passages des 30 prochains jours (la liste) ; les absences sur neuf semaines (le choix de la semaine) */
  const au = useMemo(() => plusJours(du, 30), [du]);
  const auAbsences = useMemo(() => plusJours(lundiDe(du), 63), [du]);

  useEffect(() => {
    if (source === "reelle") demanderTous();
  }, [source, demanderTous]);

  /* les disponibilités : la porte b6_31 en base réelle, la mémoire en exemple */
  const [reel, setReel] = useState<Disponibilite[] | null>(null);
  const [erreurDispo, setErreurDispo] = useState<string | null>(null);
  const [locales, setLocales] = useState<Record<string, Absence[]>>({});
  const clientId = client?.client_id ?? null;
  const lire = useCallback(async () => {
    if (!clientId) return;
    try {
      setReel(await chargerDisponibilites(clientId, du, auAbsences));
      setErreurDispo(null);
    } catch (e) {
      setErreurDispo(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, [clientId, du, auAbsences]);
  useEffect(() => {
    if (source !== "reelle" || !clientId) return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, clientId, lire]);

  const tableaux = liste.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t);
  const enLecture = source === "reelle" && tableaux.length < liste.length;

  const defaut = useLocal<string | null>(CLE_DEFAUT, null);
  const retires = useLocal<string[]>(CLE_RETIRES, AUCUN);
  const noms = useLocal<Record<string, string>>(CLE_NOMS, AUCUN_NOM);

  /* recalculé à chaque rendu : les tableaux arrivent un à un en base réelle */
  const intervenants = (() => {
    const m = new Map<string, Intervenant>();
    const ajouter = (cle: string, nom: string, genre: Genre, tiers: string | null, lieu: string) => {
      if (!m.has(cle)) m.set(cle, { cle, nom, genre, tiers, lieu, passages: [], absences: [] });
      return m.get(cle)!;
    };
    const lieuTiers = (id: string | null) => {
      const t = id ? tableaux.flatMap((x) => x.tiers).find((x) => x.id === id) : null;
      const metier = t?.corps_etat[0] ? t.corps_etat[0].charAt(0).toUpperCase() + t.corps_etat[0].slice(1).replace(/_/g, " ") : "Sous-traitant";
      return t?.commune ? `${metier} · ${t.commune}` : metier;
    };
    for (const t of tableaux) {
      for (const x of t.tiers) if (x.actif && x.roles.includes("sous_traitant")) ajouter(`t:${x.id}`, x.nom, "tiers", x.id, lieuTiers(x.id));
      for (const e of t.equipes) ajouter(`e:${e.id}`, e.nom, "equipe", null, "Équipe interne");
    }
    const vus = new Set<string>();
    for (const t of tableaux)
      for (const p of t.passages) {
        if (p.statut !== "prevu" || !chevauche(p, { du, au: auAbsences })) continue;
        const nom = p.intervenant_nom ?? p.intervenant_lu ?? "Intervenant à désigner";
        const iv = p.tiers_id ? ajouter(`t:${p.tiers_id}`, nom, "tiers", p.tiers_id, lieuTiers(p.tiers_id)) : p.equipe_id ? ajouter(`e:${p.equipe_id}`, nom, "equipe", null, "Équipe interne") : ajouter(`n:${nom.toLocaleLowerCase("fr")}`, nom, "inconnu", null, "Pas encore rapproché de l'annuaire");
        iv.passages.push({ id: p.id, chantierId: t.chantier.id, chantier: t.chantier.nom, tache: p.tache, debut: jj(p.debut), fin: jj(p.fin), hd: hh(p.heure_debut), hf: hh(p.heure_fin), confirmation: p.confirmation, p });
        vus.add(p.id);
      }
    if (source === "reelle")
      for (const d of reel ?? []) {
        const iv = ajouter(`t:${d.tiers}`, d.nom, "tiers", d.tiers, lieuTiers(d.tiers));
        iv.absences = d.absences;
        /* un passage d'un chantier dont le tableau n'est pas encore lu : lu seulement */
        for (const p of d.passages) if (!vus.has(p.passage)) iv.passages.push({ id: p.passage, chantierId: liste.find((c) => c.nom === p.chantier)?.id ?? null, chantier: p.chantier, tache: p.tache, debut: jj(p.debut), fin: jj(p.fin), hd: null, hf: null, confirmation: null, p: null });
      }
    else for (const iv of m.values()) if (iv.tiers) iv.absences = locales[iv.tiers] ?? [];
    for (const iv of m.values()) {
      iv.passages.sort((a, b) => a.debut.localeCompare(b.debut));
      /* le nom affiché d'une de nos équipes, choisi dans ce navigateur (le crayon) */
      if (iv.genre !== "tiers" && noms[iv.cle]) iv.nom = noms[iv.cle];
    }
    /* l'intervenant par défaut en tête, comme l'horaire « Default » de Cal.com */
    return [...m.values()].sort((a, b) => Number(b.cle === defaut) - Number(a.cle === defaut) || RANG[a.genre] - RANG[b.genre] || a.nom.localeCompare(b.nom, "fr"));
  })();

  const lien = (modif: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modif)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };
  const typeParam = params.get("type");
  const type = typeParam === "equipes" || typeParam === "sous-traitants" ? typeParam : null;
  const sousTraitants = intervenants.filter((i) => i.tiers);
  const choisi = intervenants.find((i) => i.cle === params.get("intervenant")) ?? null;

  /* ——— G61 : noter une absence ——— */
  const [form, setForm] = useState<{ tiers: string; du: string; au: string; motif: string; remplace?: Absence } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreurGeste, setErreurGeste] = useState<string | null>(null);
  const ouvrirNoter = (tiers?: string) => {
    setErreurGeste(null);
    const parDefaut = intervenants.find((i) => i.cle === defaut)?.tiers;
    setForm({ tiers: tiers ?? parDefaut ?? sousTraitants[0]?.tiers ?? "", du, au: du, motif: "" });
  };
  /* le crayon d'une absence : la base n'a pas de porte pour la modifier ; on note la nouvelle,
     puis on annule l'ancienne (btp_noter_indisponibilite, btp_annuler_indisponibilite) */
  const ouvrirModifier = (tiers: string, a: Absence) => {
    setErreurGeste(null);
    setForm({ tiers, du: a.du, au: a.au, motif: a.motif ?? "", remplace: a });
  };
  const noter = async () => {
    if (!form) return;
    setEnvoi(true);
    setErreurGeste(null);
    try {
      if (!form.tiers) throw new Error("Choisissez le sous-traitant absent.");
      if (form.au < form.du) throw new Error("Une absence a un premier et un dernier jour, dans cet ordre.");
      const motif = form.motif.trim() || null;
      const ancienne = form.remplace;
      if (source === "reelle") {
        await noterIndisponibilite(form.tiers, form.du, form.au, motif);
        if (ancienne) await annulerIndisponibilite(ancienne.id);
        await lire();
      } else setLocales((a) => ({ ...a, [form.tiers]: [...(a[form.tiers] ?? []).filter((x) => x.id !== ancienne?.id), { id: nid(), du: form.du, au: form.au, motif }] }));
      const nom = intervenants.find((i) => i.tiers === form.tiers)?.nom ?? "Le sous-traitant";
      toast(`${ancienne ? "Absence modifiée" : "Absence notée"} : ${nom}, ${periode(form.du, form.au)}.`, "vert");
      setForm(null);
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "La base a refusé l'absence.");
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— G62 : annuler une absence, après confirmation ——— */
  const [aAnnuler, setAAnnuler] = useState<{ tiers: string; nom: string; absence: Absence } | null>(null);
  const ouvrirAnnuler = (iv: Intervenant, a: Absence) => {
    setErreurGeste(null);
    setAAnnuler({ tiers: iv.tiers ?? "", nom: iv.nom, absence: a });
  };
  const annuler = async () => {
    if (!aAnnuler) return;
    setEnvoi(true);
    setErreurGeste(null);
    try {
      const { tiers, absence } = aAnnuler;
      if (source === "reelle") {
        await annulerIndisponibilite(absence.id);
        await lire();
      } else setLocales((a) => ({ ...a, [tiers]: (a[tiers] ?? []).filter((x) => x.id !== absence.id) }));
      toast(`Absence annulée : ${aAnnuler.nom}.`, "vert");
      setAAnnuler(null);
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "La base a refusé l'annulation.");
    } finally {
      setEnvoi(false);
    }
  };

  /* « Set as default » : l'intervenant par défaut passe en tête de liste et se propose dans « Noter une absence » */
  const basculerDefaut = (iv: Intervenant) => {
    const devient = defaut === iv.cle ? null : iv.cle;
    ecrireLocal(CLE_DEFAUT, devient);
    toast(devient ? `${iv.nom} est l'intervenant par défaut.` : `${iv.nom} n'est plus l'intervenant par défaut.`, "vert");
  };
  /* « Duplicate » : son planning en clair dans le presse-papier */
  const copierPlanning = async (iv: Intervenant) => {
    const ok = await copier(resume(iv, du, au));
    toast(ok ? `Planning de ${iv.nom} copié.` : "Le presse-papier n'a pas répondu.", ok ? "vert" : "rouge");
  };
  /* la poubelle : retirer de la liste (ce navigateur), après confirmation ; « Les remettre » au pied de la liste */
  const [aRetirer, setARetirer] = useState<Intervenant | null>(null);
  const retirer = (iv: Intervenant) => {
    ecrireLocal(CLE_RETIRES, [...retires.filter((c) => c !== iv.cle), iv.cle]);
    if (defaut === iv.cle) ecrireLocal(CLE_DEFAUT, null);
    setARetirer(null);
    toast(`${iv.nom} est retiré de la liste.`, "vert");
    if (choisi?.cle === iv.cle) routeur.push(lien({ intervenant: null, semaine: null }), { scroll: false });
  };
  const nbRetires = intervenants.filter((i) => retires.includes(i.cle)).length;
  /* le crayon d'une de nos équipes : son nom affiché dans ce navigateur */
  const renommer = (iv: Intervenant, nom: string) => {
    const propre = nom.trim();
    ecrireLocal(CLE_NOMS, { ...noms, [iv.cle]: propre || undefined });
  };

  const avis = (
    <>
      {erreur && source === "reelle" ? (
        <p className="dcal-note" data-teinte="rouge" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : null}
      {erreurDispo ? (
        <p className="dcal-note" data-teinte="rouge" role="alert">
          Les absences n&apos;ont pas pu être lues (réservé au gérant, à l&apos;administrateur et au valideur). {erreurDispo}
        </p>
      ) : null}
      {enLecture && intervenants.length ? (
        <p className="dcal-note" role="status">
          Lecture des chantiers : {tableaux.length} sur {liste.length}.
        </p>
      ) : null}
    </>
  );

  const choisiAbsentPendant = form ? intervenants.find((i) => i.tiers === form.tiers) : null;
  const pendant = form && choisiAbsentPendant ? choisiAbsentPendant.passages.filter((p) => chevauche(p, { du: form.du, au: form.au })) : [];

  return (
    <div className="dcal">
      <main className="dcal-main">
        {choisi ? (
          <FicheIntervenant
            iv={choisi}
            du={du}
            semaine={params.get("semaine")}
            avis={avis}
            retour={lien({ intervenant: null, semaine: null })}
            onSemaine={(s) => routeur.replace(lien({ semaine: s }), { scroll: false })}
            onNoter={() => ouvrirNoter(choisi.tiers ?? undefined)}
            onAnnuler={(a) => ouvrirAnnuler(choisi, a)}
            onModifier={(a) => ouvrirModifier(choisi.tiers ?? "", a)}
            parDefaut={defaut === choisi.cle}
            onDefaut={() => basculerDefaut(choisi)}
            onRetirer={() => setARetirer(choisi)}
            onRenommer={(n) => renommer(choisi, n)}
          />
        ) : (
          <>
            <h1 className="v2-sr">Équipes</h1>
            <header className="dcal-tete">
              <div className="dcal-tete-textes">
                <p className="dcal-titre" aria-hidden="true">
                  Équipes
                </p>
                <p className="dcal-sous-titre">Les passages prévus et les absences de vos intervenants.</p>
              </div>
              <nav className="dcal-segment" aria-label="Qui">
                <Link href={lien({ type: null })} scroll={false} aria-current={type !== "sous-traitants" ? "page" : undefined}>
                  Tout le monde
                </Link>
                <Link href={lien({ type: "sous-traitants" })} scroll={false} aria-current={type === "sous-traitants" ? "page" : undefined}>
                  Sous-traitants
                </Link>
              </nav>
              <button type="button" className="dcal-plein" onClick={() => ouvrirNoter()} disabled={!sousTraitants.length}>
                <Plus width={16} height={16} strokeWidth={2} aria-hidden="true" />
                Absence
              </button>
            </header>
            {avis}
            <div className="dcal-liste">
              <ul>
                {!pret || (enLecture && !intervenants.length) ? (
                  <li className="dcal-vide">Lecture des intervenants…</li>
                ) : (
                  (() => {
                    const vus = intervenants.filter((i) => !retires.includes(i.cle) && (type === "sous-traitants" ? !!i.tiers : type === "equipes" ? i.genre === "equipe" : true));
                    if (!vus.length)
                      return (
                        <li className="dcal-vide">
                          {type ? "Personne dans ce groupe." : "Aucun intervenant : les équipes et les sous-traitants viennent de l'annuaire et du planning de vos chantiers."}{" "}
                          <Link href={`${BASE}/annuaire`} style={{ textDecoration: "underline" }}>
                            Ouvrir l&apos;annuaire
                          </Link>
                        </li>
                      );
                    return vus.map((iv) => (
                      <LigneIntervenant
                        key={iv.cle}
                        iv={iv}
                        du={du}
                        au={au}
                        href={lien({ intervenant: iv.cle })}
                        parDefaut={defaut === iv.cle}
                        onDefaut={() => basculerDefaut(iv)}
                        onCopier={() => void copierPlanning(iv)}
                        onNoter={() => ouvrirNoter(iv.tiers ?? undefined)}
                        onAnnuler={(a) => ouvrirAnnuler(iv, a)}
                        onRetirer={() => setARetirer(iv)}
                      />
                    ));
                  })()
                )}
              </ul>
              <p className="dcal-pied">
                Un intervenant indisponible ?{" "}
                <button type="button" onClick={() => ouvrirNoter()} disabled={!sousTraitants.length}>
                  Noter une absence
                </button>
                {nbRetires ? (
                  <>
                    {" "}
                    · {pluriel(nbRetires, "intervenant")} retiré{nbRetires > 1 ? "s" : ""} de la liste :{" "}
                    <button type="button" onClick={() => ecrireLocal(CLE_RETIRES, null)}>
                      les remettre
                    </button>
                  </>
                ) : null}
              </p>
            </div>
            <button type="button" className="dcal-flottant" aria-label="Noter une absence" onClick={() => ouvrirNoter()} disabled={!sousTraitants.length}>
              <Plus width={20} height={20} aria-hidden="true" />
            </button>
          </>
        )}
      </main>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <CalendarOff width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{form?.remplace ? "Modifier l'absence" : "Noter une absence"}</DialogTitle>
            <DialogDescription>
              {form?.remplace
                ? `L'absence ${periode(form.remplace.du, form.remplace.au)} est remplacée par les jours choisis : la nouvelle est notée, puis l'ancienne annulée.`
                : "Les jours notés ne sont plus proposés pour ce sous-traitant : ni pour un passage, ni comme remplaçant."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {form ? (
              <div className="esp-form">
                <label className="rv-libelle">
                  Sous-traitant
                  <select className="rv-champ" value={form.tiers} onChange={(e) => setForm({ ...form, tiers: e.target.value })}>
                    {sousTraitants.map((i) => (
                      <option key={i.cle} value={i.tiers ?? ""}>
                        {i.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">
                    Du
                    <input className="rv-champ" type="date" value={form.du} onChange={(e) => setForm({ ...form, du: e.target.value, au: form.au < e.target.value ? e.target.value : form.au })} />
                  </label>
                  <label className="rv-libelle">
                    Au
                    <input className="rv-champ" type="date" value={form.au} min={form.du} onChange={(e) => setForm({ ...form, au: e.target.value })} />
                  </label>
                </div>
                <label className="rv-libelle">
                  Motif
                  <input className="rv-champ" maxLength={200} value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Congés, autre chantier" />
                </label>
                {pendant.length ? (
                  <Avis teinte="ambre">
                    {pluriel(pendant.length, "passage")} prévu{pendant.length > 1 ? "s" : ""} sur ces jours : {pendant.map((p) => `${p.chantier}${p.tache ? ` (${p.tache})` : ""} ${periode(p.debut, p.fin)}`).join(" ; ")}.
                  </Avis>
                ) : null}
                {erreurGeste ? (
                  <Avis teinte="rouge" role="alert">
                    {erreurGeste}
                  </Avis>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !form?.tiers || !form?.du || !form?.au} onClick={() => void noter()}>
              {envoi ? <Loader variant="spin" /> : null} {form?.remplace ? "Remplacer l'absence" : "Noter l'absence"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aAnnuler} onOpenChange={(o) => !o && setAAnnuler(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <CalendarOff width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Annuler cette absence ?</DialogTitle>
            <DialogDescription>
              {aAnnuler
                ? `${aAnnuler.nom}, absent ${periode(aAnnuler.absence.du, aAnnuler.absence.au)}${aAnnuler.absence.motif ? ` (${aAnnuler.absence.motif})` : ""}. Ces jours redeviennent libres : il pourra être proposé pour un passage ou comme remplaçant.`
                : null}
            </DialogDescription>
          </DialogHeader>
          {erreurGeste ? (
            <DialogBody>
              <Avis teinte="rouge" role="alert">
                {erreurGeste}
              </Avis>
            </DialogBody>
          ) : null}
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void annuler()}>
              {envoi ? <Loader variant="spin" /> : null} Annuler l&apos;absence
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setAAnnuler(null)}>
              Garder l&apos;absence
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aRetirer} onOpenChange={(o) => !o && setARetirer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <EyeOff width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Retirer {aRetirer?.nom ?? "cet intervenant"} de la liste ?</DialogTitle>
            <DialogDescription>Il ne s&apos;affiche plus dans Équipes sur ce navigateur ; ses passages et ses absences restent tels quels. « Les remettre », au pied de la liste, le fait revenir.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" onClick={() => aRetirer && retirer(aRetirer)}>
              Retirer de la liste
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setARetirer(null)}>
              Garder
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ——— le menu « ⋯ » de Cal.com : aligné à droite, 4 px sous le bouton ; Échap ou un clic dehors le ferme ——— */
type Option = { libelle: string; icone: React.ReactNode; action?: () => void; href?: string; rouge?: boolean; desactive?: boolean } | { titre: string } | "sep";
function MenuPoints({ libelle, options, petit }: { libelle: string; options: Option[]; petit?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return (
    <div className="dcal-menu-boite" ref={boite}>
      <button type="button" className={`dcal-carre${petit ? " dcal-carre--petit" : ""}`} aria-label={libelle} title={libelle} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <Ellipsis width={16} height={16} aria-hidden="true" />
      </button>
      {ouvert ? (
        <div className="dcal-menu" role="menu" aria-label={libelle}>
          {options.map((o, i) =>
            o === "sep" ? (
              <div key={i} className="dcal-menu-sep" role="separator" />
            ) : "titre" in o ? (
              <div key={i} className="dcal-menu-titre">
                {o.titre}
              </div>
            ) : o.href ? (
              <Link key={i} href={o.href} role="menuitem" className={`dcal-menu-option${o.rouge ? " dcal-menu-option--rouge" : ""}`} onClick={() => setOuvert(false)}>
                {o.icone}
                {o.libelle}
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                className={`dcal-menu-option${o.rouge ? " dcal-menu-option--rouge" : ""}`}
                disabled={o.desactive}
                onClick={() => {
                  setOuvert(false);
                  o.action?.();
                }}
              >
                {o.icone}
                {o.libelle}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

const ico = (I: typeof Plus) => <I width={16} height={16} aria-hidden="true" />;

function LigneIntervenant({
  iv,
  du,
  au,
  href,
  parDefaut,
  onDefaut,
  onCopier,
  onNoter,
  onAnnuler,
  onRetirer,
}: {
  iv: Intervenant;
  du: string;
  au: string;
  href: string;
  parDefaut: boolean;
  onDefaut: () => void;
  onCopier: () => void;
  onNoter: () => void;
  onAnnuler: (a: Absence) => void;
  onRetirer: () => void;
}) {
  const passages = iv.passages.filter((p) => chevauche(p, { du, au }));
  const absences = iv.absences.filter((a) => a.au >= du && a.du <= au);
  /* le menu de Cal.com (« Set as default », « Duplicate », « Delete »), puis les gestes de l'intervenant */
  const options: Option[] = [
    { libelle: parDefaut ? "Ne plus être par défaut" : "Définir par défaut", icone: ico(Star), action: onDefaut },
    { libelle: "Copier le planning", icone: ico(Copy), action: onCopier },
    { libelle: "Noter une absence", icone: ico(CalendarOff), action: onNoter, desactive: !iv.tiers },
  ];
  if (iv.tiers) options.push({ libelle: "Ouvrir dans l'annuaire", icone: ico(BookUser), href: `${BASE}/annuaire?entreprise=${encodeURIComponent(iv.tiers)}` });
  for (const a of absences) options.push({ libelle: `Annuler l'absence ${jours(a.du, a.au)}`, icone: ico(Trash), action: () => onAnnuler(a), rouge: true });
  options.push({ libelle: "Retirer de la liste", icone: ico(Trash), action: onRetirer, rouge: true });
  return (
    <li className="dcal-ligne">
      <div className="dcal-ligne-corps">
        <div className="dcal-nom">
          <Link href={href} scroll={false} className="dcal-ligne-lien">
            {iv.nom}
          </Link>
          {parDefaut ? <span className="dcal-badge">Par défaut</span> : null}
        </div>
        <div className="dcal-plages">
          {passages.map((p) => (
            <p key={p.id}>
              {jours(p.debut, p.fin)}
              {heures(p.hd, p.hf) ? `, ${heures(p.hd, p.hf)}` : ""} · {libellePassage(p)}
            </p>
          ))}
          {absences.map((a) => (
            <p key={a.id}>
              {jours(a.du, a.au)}, absent{a.motif ? ` · ${a.motif}` : ""}
            </p>
          ))}
          {!passages.length && !absences.length ? <p>Aucun passage sur 30 jours</p> : null}
        </div>
        <div className="dcal-lieu">
          <Globe width={16} height={16} aria-hidden="true" />
          {iv.lieu}
        </div>
      </div>
      <MenuPoints libelle={`Actions : ${iv.nom}`} options={options} />
    </li>
  );
}

/* ——— la page d'un intervenant : la page d'un horaire de Cal.com ——— */
function FicheIntervenant({
  iv,
  du,
  semaine,
  avis,
  retour,
  onSemaine,
  onNoter,
  onAnnuler,
  onModifier,
  parDefaut,
  onDefaut,
  onRetirer,
  onRenommer,
}: {
  iv: Intervenant;
  du: string;
  semaine: string | null;
  avis: React.ReactNode;
  retour: string;
  onSemaine: (s: string) => void;
  onNoter: () => void;
  onAnnuler: (a: Absence) => void;
  onModifier: (a: Absence) => void;
  parDefaut: boolean;
  onDefaut: () => void;
  onRetirer: () => void;
  onRenommer: (nom: string) => void;
}) {
  const [renomme, setRenomme] = useState<string | null>(null);
  const { poser } = useDeplacer(du);
  const [brouillon, setBrouillon] = useState<Brouillon>({});
  const [envoi, setEnvoi] = useState(false);
  const [deplacer, setDeplacer] = useState<string | null>(null);
  const premier = lundiDe(du);
  const semaines = Array.from({ length: 9 }, (_, i) => plusJours(premier, i * 7));
  const lundi = semaine && /^\d{4}-\d{2}-\d{2}$/.test(semaine) ? lundiDe(semaine) : premier;
  const joursSemaine = Array.from({ length: 7 }, (_, i) => plusJours(lundi, i));

  /* un passage tel qu'il sera après « Enregistrer » */
  const vus = iv.passages.map((p) => (brouillon[p.id] ? { ...p, ...brouillon[p.id] } : p));
  const modifier = (p: PassageVu, champs: Partial<Brouillon[string]>) =>
    setBrouillon((b) => {
      const avant = b[p.id] ?? { debut: p.debut, fin: p.fin, hd: p.hd, hf: p.hf };
      const apres = { ...avant, ...champs };
      const origine = iv.passages.find((x) => x.id === p.id);
      const copie = { ...b };
      if (origine && origine.debut === apres.debut && origine.fin === apres.fin && origine.hd === apres.hd && origine.hf === apres.hf) delete copie[p.id];
      else copie[p.id] = apres;
      return copie;
    });
  const absentLe = (jour: string) => iv.absences.find((a) => a.du <= jour && a.au >= jour) ?? null;

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      for (const [id, b] of Object.entries(brouillon)) {
        const p = iv.passages.find((x) => x.id === id);
        if (!p?.p || !p.chantierId) continue;
        const quoi = b.debut !== p.debut || b.fin !== p.fin ? `prévu ${jours(b.debut, b.fin)}${heures(b.hd, b.hf) ? `, ${heures(b.hd, b.hf)}` : ""}` : heures(b.hd, b.hf) ? `de ${b.hd} à ${b.hf}` : "sans heures";
        await poser(p.p, p.chantierId, b.debut, b.fin, b.hd, b.hf, quoi);
      }
      setBrouillon({});
    } finally {
      setEnvoi(false);
    }
  };
  const nbModifs = Object.keys(brouillon).length;
  const absencesVues = iv.absences.filter((a) => a.au >= du).sort((a, b) => a.du.localeCompare(b.du));

  return (
    <>
      <h1 className="v2-sr">{iv.nom}</h1>
      <header className="dcal-fiche-tete">
        <Link href={retour} scroll={false} className="dcal-retour" aria-label="Retour aux équipes" title="Retour aux équipes">
          <ArrowLeft width={16} height={16} aria-hidden="true" />
        </Link>
        {renomme !== null ? (
          /* le nom éditable de Cal.com : le nom affiché de l'équipe, dans ce navigateur (Entrée garde, Échap annule) */
          <input
            className="dcal-fiche-nom dcal-fiche-champ"
            aria-label="Nom affiché de l'équipe"
            value={renomme}
            autoFocus
            maxLength={80}
            onChange={(e) => setRenomme(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRenommer(renomme);
                setRenomme(null);
              }
              if (e.key === "Escape") setRenomme(null);
            }}
            onBlur={() => {
              onRenommer(renomme);
              setRenomme(null);
            }}
          />
        ) : (
          <p className="dcal-fiche-nom" aria-hidden="true">
            {iv.nom}
          </p>
        )}
        {iv.tiers ? (
          <Link href={`${BASE}/annuaire?entreprise=${encodeURIComponent(iv.tiers)}`} className="dcal-crayon" aria-label="Modifier dans l'annuaire" title="Modifier dans l'annuaire">
            <Pencil width={16} height={16} aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" className="dcal-crayon" aria-label="Renommer l'équipe" title="Renommer l'équipe (nom affiché dans ce navigateur)" onClick={() => setRenomme(iv.nom)}>
            <Pencil width={16} height={16} aria-hidden="true" />
          </button>
        )}
        <div className="dcal-fiche-actions">
          <span className="dcal-defaut">
            <span className="dcal-txt-large">Par défaut</span>
            <button type="button" role="switch" className="dcal-inter" aria-checked={parDefaut} aria-label="Intervenant par défaut" title="L'intervenant par défaut passe en tête de liste et se propose pour une absence" onClick={onDefaut} />
          </span>
          <button type="button" className="dcal-carre dcal-carre--rouge" aria-label="Retirer de la liste" title="Retirer de la liste" onClick={onRetirer}>
            <Trash width={16} height={16} aria-hidden="true" />
          </button>
          <button type="button" className="dcal-plein" disabled={!nbModifs || envoi} onClick={() => void enregistrer()}>
            {envoi ? <Loader variant="spin" /> : null}
            Enregistrer
          </button>
        </div>
      </header>
      {avis}
      <div className="dcal-fiche-corps">
        <div className="dcal-gauche">
          <section className="dcal-carte" aria-labelledby="dcal-semaine-titre">
            <div className="dcal-carte-tete">
              <div className="dcal-carte-textes">
                <h2 id="dcal-semaine-titre" className="dcal-carte-titre">
                  Passages de la semaine
                </h2>
                <p className="dcal-carte-aide">Les heures posées chaque jour, chantier par chantier</p>
              </div>
            </div>
            <div className="dcal-panneau">
              <div className="dcal-semaine">
                {joursSemaine.map((jour, i) => {
                  const ici = vus.filter((p) => p.debut <= jour && p.fin >= jour);
                  const veille = vus.filter((p) => p.fin === plusJours(jour, -1) && p.p);
                  const absence = absentLe(jour);
                  const etendre = () => {
                    for (const p of veille) modifier(p, { fin: jour });
                  };
                  const retirer = (p: PassageVu) => {
                    if (p.debut === p.fin) return;
                    if (jour === p.fin) modifier(p, { fin: plusJours(jour, -1) });
                    else if (jour === p.debut) modifier(p, { debut: plusJours(jour, 1) });
                  };
                  const retirable = (p: PassageVu) => !!p.p && p.debut !== p.fin && (jour === p.fin || jour === p.debut);
                  const tousRetirables = ici.length > 0 && ici.every(retirable);
                  return (
                    <div key={jour} className="dcal-jour" data-actif={ici.length ? "" : undefined}>
                      <div className="dcal-jour-nom">
                        <button
                          type="button"
                          role="switch"
                          className="dcal-inter"
                          aria-checked={ici.length > 0}
                          aria-label={`${JOURS[i]} ${morceaux(jour).j}`}
                          title={ici.length ? (tousRetirables ? "Retirer ce jour des passages" : "Un passage d'un jour se déplace : utilisez « Déplacer vers… »") : veille.length ? "Étendre jusqu'à ce jour le passage de la veille" : "Aucun passage ne finit la veille"}
                          disabled={ici.length ? !tousRetirables : !veille.length}
                          onClick={() => (ici.length ? ici.forEach(retirer) : etendre())}
                        />
                        <span>
                          {JOURS[i]} {morceaux(jour).j}
                        </span>
                      </div>
                      <div className="dcal-plages-jour">
                        {ici.length ? (
                          ici.map((p) => (
                            <div key={p.id} className="dcal-plage">
                              <ChampHeure valeur={p.hd} libelle={`Début : ${libellePassage(p)}`} desactive={!p.p} onChange={(v) => modifier(p, v ? { hd: v, hf: p.hf && p.hf > v ? p.hf : (HEURES[HEURES.indexOf(v) + 16] ?? "23:45") } : { hd: null, hf: null })} />
                              <span className="dcal-tiret">-</span>
                              <ChampHeure valeur={p.hf} libelle={`Fin : ${libellePassage(p)}`} desactive={!p.p} onChange={(v) => modifier(p, v ? { hf: v, hd: p.hd && p.hd < v ? p.hd : (HEURES[HEURES.indexOf(v) - 16] ?? "00:00") } : { hd: null, hf: null })} />
                              <button type="button" className="dcal-croix" aria-label="Retirer ce jour du passage" title={retirable(p) ? "Retirer ce jour du passage" : "Seul le premier ou le dernier jour d'un passage de plusieurs jours se retire"} disabled={!retirable(p)} onClick={() => retirer(p)}>
                                <X width={16} height={16} aria-hidden="true" />
                              </button>
                              <Link href={`${BASE}/chantiers?passage=${encodeURIComponent(p.id)}`} className="dcal-chantier">
                                {libellePassage(p)}
                              </Link>
                            </div>
                          ))
                        ) : (
                          <span className="dcal-libre">{absence ? `Absent${absence.motif ? ` · ${absence.motif}` : ""}` : "Aucun passage"}</span>
                        )}
                      </div>
                      <div className="dcal-jour-boutons">
                        <button type="button" className="dcal-carre dcal-carre--petit" aria-label="Étendre jusqu'à ce jour le passage de la veille" title={veille.length ? `Étendre jusqu'à ce jour : ${veille.map(libellePassage).join(", ")}` : "Aucun passage ne finit la veille"} disabled={!veille.length} onClick={etendre}>
                          <Plus width={16} height={16} aria-hidden="true" />
                        </button>
                        <div className="dcal-menu-boite">
                          <button type="button" className="dcal-carre dcal-carre--petit" aria-label="Déplacer vers…" title="Déplacer vers…" aria-haspopup="menu" aria-expanded={deplacer === jour} disabled={!ici.some((p) => p.p)} onClick={() => setDeplacer((d) => (d === jour ? null : jour))}>
                            <Copy width={16} height={16} aria-hidden="true" />
                          </button>
                          {deplacer === jour ? (
                            <DeplacerVers
                              jour={jour}
                              lundi={lundi}
                              fermer={() => setDeplacer(null)}
                              choisir={(cible) => {
                                const n = num(cible) - num(jour);
                                for (const p of ici) if (p.p) modifier(p, { debut: plusJours(p.debut, n), fin: plusJours(p.fin, n) });
                                setDeplacer(null);
                              }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="dcal-carte" aria-labelledby="dcal-absences-titre">
            <div className="dcal-carte-tete">
              <div className="dcal-carte-textes">
                <h2 id="dcal-absences-titre" className="dcal-carte-titre">
                  Absences
                  <span title="Une absence notée retire ces jours des propositions : ni passage, ni remplacement." style={{ display: "inline-flex" }}>
                    <Info width={16} height={16} aria-hidden="true" />
                  </span>
                </h2>
                <p className="dcal-carte-aide">Ajoutez les jours où cet intervenant n&apos;est pas disponible.</p>
              </div>
              <button type="button" className="dcal-bord" onClick={onNoter} disabled={!iv.tiers} title={iv.tiers ? undefined : "Les absences se notent pour les sous-traitants de l'annuaire"}>
                <Plus width={16} height={16} aria-hidden="true" />
                Ajouter une absence
              </button>
            </div>
            {absencesVues.length ? (
              <div className="dcal-panneau">
                {absencesVues.map((a) => (
                  <div key={a.id} className="dcal-exception">
                    <div className="dcal-carte-textes">
                      <p className="dcal-exception-date">{plageLongue(a.du, a.au)}</p>
                      <p className="dcal-exception-plage">{a.motif ?? "Absent toute la journée"}</p>
                    </div>
                    <button type="button" className="dcal-carre dcal-carre--petit" aria-label="Modifier l'absence" title="Modifier l'absence" onClick={() => onModifier(a)}>
                      <Pencil width={16} height={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="dcal-carre dcal-carre--petit dcal-carre--rouge" aria-label="Annuler l'absence" title="Annuler l'absence" onClick={() => onAnnuler(a)}>
                      <Trash width={16} height={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="dcal-droite">
          <label className="dcal-libelle" htmlFor="dcal-semaine-choix">
            Semaine
          </label>
          <div className="dcal-select">
            <select id="dcal-semaine-choix" value={lundi} onChange={(e) => onSemaine(e.target.value)}>
              {semaines.map((s) => (
                <option key={s} value={s}>
                  Semaine du {morceaux(s).j} {MOIS[morceaux(s).m]}
                </option>
              ))}
            </select>
            <ChevronsUpDown width={16} height={16} aria-hidden="true" />
          </div>
          <div className="dcal-filet" />
          <div className="dcal-aide-carte">
            <p>Un passage à revoir ?</p>
            <Link href={`${BASE}/chantiers`}>Ouvrir les chantiers</Link>
          </div>
        </aside>
      </div>
    </>
  );
}

function ChampHeure({ valeur, libelle, desactive, onChange }: { valeur: string | null; libelle: string; desactive: boolean; onChange: (v: string | null) => void }) {
  return (
    <span className="dcal-heure">
      <select aria-label={libelle} value={valeur ?? ""} disabled={desactive} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">--:--</option>
        {HEURES.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </span>
  );
}

/* le « Copy times to… » de Cal.com : ici, déplacer les passages du jour vers un autre jour */
function DeplacerVers({ jour, lundi, fermer, choisir }: { jour: string; lundi: string; fermer: () => void; choisir: (cible: string) => void }) {
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.parentElement?.contains(e.target as Node)) fermer();
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [fermer]);
  const cibles = Array.from({ length: 14 }, (_, i) => plusJours(lundi, i)).filter((j) => j !== jour);
  return (
    <div className="dcal-menu" role="menu" aria-label="Déplacer vers" ref={boite} style={{ maxHeight: 320, overflow: "auto" }}>
      <div className="dcal-menu-titre">Déplacer vers</div>
      {cibles.map((c) => (
        <button key={c} type="button" role="menuitem" className="dcal-menu-option" onClick={() => choisir(c)}>
          {dateLongue(c)}
        </button>
      ))}
    </div>
  );
}
