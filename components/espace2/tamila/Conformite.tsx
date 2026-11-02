"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — Conformité du cabinet (02/11/2026) : copie 1:1 des « Tasks »
   de Plain (releves/plain-tasks.md). Seul le contenu change.

   Les deux vues cabinet qui manquaient (inventaire § 8.5-2) et ce qui
   relève de la conformité, réunis en tâches :
     · conflit d'intérêts sans décision (E7, RIN art. 4) ;
     · vigilance LCB-FT à faire (CMF L.561-3) ;
     · parties jamais contrôlées contre l'index du cabinet ;
     · temps proposé à la saisie (E4 : audiences, actes, avis passés) ;
   et, dans « Faits », les vigilances revues. Onglets My tasks · Todo ·
   Done → À moi (par défaut) · À traiter · Faits ; tri « Last updated » → Dernière
   date · Priorité. Une tâche ouverte (?tache=…) : volet de 360, avec
   « Traiter dans le dossier » à la place de « Handle with Agent » — la
   décision, la vigilance et la saisie se font dans la page du dossier,
   onglet Conformité ou Honoraires (gestes G44, G45, G59, G60), avec leurs
   fenêtres. « Add new task T » → ouvrir un dossier (B16 : le contrôle des
   conflits a lieu à l'entrée). Le journal des accès d'un dossier se lit
   dans sa page : chaque lecture du journal est elle-même tracée.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { conformiteExemple, DOSSIERS_EXEMPLE } from "@/components/espace/tamila/exemples";
import * as portes from "@/components/espace/tamila/portes";
import { proposerTemps } from "@/components/espace/tamila/temps";
import type { Conformite as EtatConformite } from "@/components/espace/tamila/types";
import { estAssocie, estGerant } from "@/components/espace/tamila/regles";
import { RACINE } from "@/components/espace2/modules";
import { PlainCarte, useOuvert } from "./TamCadre";
import { PlainIcone, TamIcone } from "./TamIcone";
import { useTamila } from "./donnees";
import { dateLongue, ilYaCourt } from "./echeances";
import NouveauDossier from "./NouveauDossier";
import { copier, exporterCsv } from "./navigateur";
import { ISSUE, POUR, lireJournalCabinet, lireJournalCoffre, type LigneCoffre, type LigneJournal } from "./acces";
import { TamFenetre } from "./TamFenetre";
import "./tamp-comptes.css";
import "./tamp-taches.css";

const ICI = `${RACINE}/tamila/conformite`;
type Onglet = "moi" | "tous" | "faits" | "acces";
type Tri = "date" | "priorite";
type Tache = {
  cle: string;
  dossier: string;
  rang: number;
  titre: string;
  description: string;
  quand: string;
  assigne: string | null;
  faite: boolean;
  origine: string;
  regle: string;
  onglet: "conformite" | "honoraires";
};

/* la couleur d'un avatar carré (r 4) : teinte tirée du nom */
const teinte = (nom: string) => `lch(62 42 ${[...nom].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 0)})`;
const initiales = (nom: string) =>
  nom
    .replace(/^Me\s+/, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("");

export default function Conformite() {
  const t = useTamila();
  const params = useSearchParams();
  const router = useRouter();
  const ouverte = params.get("tache");
  const onglet = (["tous", "faits", "acces"].includes(params.get("onglet") ?? "") ? params.get("onglet") : "moi") as Onglet;
  const [tri, setTri] = useState<Tri>("date");
  const [nouveau, setNouveau] = useState(false);
  /* la case de Plain : sélection multiple, puis la barre des actions groupées */
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const { ouvert: plusOuvert, setOuvert: ouvrirPlus, boite: boitePlus } = useOuvert<HTMLSpanElement>();
  /* l'onglet « Accès » (PAGES-MANQUANTES.md) : le journal de tout le cabinet, le journal du coffre, l'export du cabinet */
  const [journalLu, setJournalLu] = useState<{ lignes: LigneJournal[]; refuses: number } | null>(null);
  const [coffreLu, setCoffreLu] = useState<LigneCoffre[] | null | undefined>(undefined);
  const [confirmer, setConfirmer] = useState<"journal" | "export" | null>(null);
  const [envoiAcces, setEnvoiAcces] = useState(false);
  const [lues, setLues] = useState<Record<string, EtatConformite | null> | null>(null);
  const { ouvert: triOuvert, setOuvert: ouvrirTri, boite: boiteTri } = useOuvert<HTMLDivElement>();
  const { ouvert: segOuvert, setOuvert: ouvrirSeg, boite: boiteSeg } = useOuvert<HTMLDivElement>();
  const [maintenant] = useState(() => Date.now());
  const { lireAnnexes } = t;
  useEffect(() => lireAnnexes(), [lireAnnexes]);

  const vivants = useMemo(() => t.lignes.filter((l) => ["attente", "ouvert", "audit"].includes(l.dossier.statut)), [t.lignes]);

  /* l'état de conformité de chaque dossier vivant (rpc tamila_conformite, sans trace de lecture) */
  useEffect(() => {
    if (t.source !== "reelle" || !t.pret) return;
    let actif = true;
    Promise.all(vivants.map(async (l) => [l.dossier.id, await portes.conformite(l.dossier.id)] as const)).then((r) => actif && setLues(Object.fromEntries(r)));
    return () => {
      actif = false;
    };
  }, [t.source, t.pret, vivants]);
  const etats = useMemo<Record<string, EtatConformite | null>>(() => {
    if (t.source === "reelle") return lues ?? {};
    const base = new Set(DOSSIERS_EXEMPLE.map((c) => c.dossier.id));
    return Object.fromEntries(
      vivants.map((l, i) => {
        if (base.has(l.dossier.id)) {
          const c = conformiteExemple(l.dossier.id);
          /* 2026-0430 : le cas d'école du contrôle, l'adversaire est client du cabinet dans 2026-0412 */
          return [l.dossier.id, l.dossier.statut === "attente" ? { ...c, controles: 1, conflits_sans_decision: 1 } : c];
        }
        return [l.dossier.id, { dossier: l.dossier.id, index: true, parties: 2, parties_indexees: i % 3 ? 2 : 1, controles: 1, conflits_sans_decision: 0, dernier_controle: null, vigilance: null, vigilance_a_faire: i % 2 === 0 }];
      }),
    );
  }, [t.source, lues, vivants]);

  const taches: Tache[] = useMemo(() => {
    const out: Tache[] = [];
    const moi = t.moi?.user_id ?? null;
    for (const l of vivants) {
      const c = etats[l.dossier.id];
      const d = l.dossier;
      if (c?.conflits_sans_decision) {
        out.push({
          cle: `c:${d.id}`, dossier: d.id, rang: 0, titre: `Décider d'un conflit d'intérêts${c.conflits_sans_decision > 1 ? ` (${c.conflits_sans_decision})` : ""}`,
          description: "Une partie de ce dossier est aussi partie d'un autre dossier du cabinet, de l'autre côté. Le contrôle a lieu à l'entrée : décidez (accord écrit, homonyme, même côté, refus) avant d'aller plus loin.",
          quand: c.dernier_controle?.le ?? d.cree_le, assigne: d.responsable_id, faite: false, origine: "Point du matin : conflit sans décision", regle: "RIN art. 4", onglet: "conformite",
        });
      }
      if (c && c.parties_indexees < c.parties) {
        out.push({
          cle: `p:${d.id}`, dossier: d.id, rang: 1, titre: `Contrôler ${c.parties - c.parties_indexees} partie${c.parties - c.parties_indexees > 1 ? "s" : ""} contre l'index du cabinet`,
          description: "Des parties du dossier n'ont jamais été comparées aux autres dossiers du cabinet. Le contrôle compare des empreintes : aucun nom ne quitte le navigateur.",
          quand: d.ouvert_le ?? d.cree_le, assigne: d.responsable_id, faite: false, origine: "Index aveugle des parties", regle: "RIN art. 4", onglet: "conformite",
        });
      }
      if (c?.vigilance_a_faire) {
        out.push({
          cle: `v:${d.id}`, dossier: d.id, rang: 2, titre: "Faire la vigilance LCB-FT du dossier",
          description: "Assujetti ou non, activité, identification du client et du bénéficiaire effectif, pièce d'identité, niveau de risque : la vigilance se pose une fois, puis se revoit.",
          quand: d.ouvert_le ?? d.cree_le, assigne: d.responsable_id, faite: false, origine: "Dossier ouvert sans vigilance", regle: "CMF, art. L.561-3", onglet: "conformite",
        });
      }
      if (c?.vigilance) {
        out.push({
          cle: `vf:${d.id}`, dossier: d.id, rang: 2, titre: `Vigilance LCB-FT revue${c.vigilance.assujetti ? "" : " : non assujetti"}`,
          description: `Revue le ${c.vigilance.revue_le ? dateLongue(c.vigilance.revue_le) : "—"}${c.vigilance.risque ? `, risque ${c.vigilance.risque}` : ""}.`,
          quand: c.vigilance.maj_le, assigne: c.vigilance.par, faite: true, origine: "Vigilance du dossier", regle: "CMF, art. L.561-3", onglet: "conformite",
        });
      }
      /* E4 : le temps proposé à la saisie, pour la personne qui regarde */
      const complet = t.source === "exemple" ? t.local.find((x) => x.dossier.id === d.id) : null;
      const props = proposerTemps(
        { audiences: t.audiencesCabinet.filter((a) => a.dossier_id === d.id), delais: t.delaisCabinet.filter((x) => x.dossier_id === d.id), avis: complet?.avis ?? [] },
        t.annexes?.honoraires[d.id] ?? { temps: [] },
        moi,
        maintenant,
      );
      for (const p of props) {
        out.push({
          cle: `t:${d.id}:${p.origine}`, dossier: d.id, rang: 3, titre: `Saisir le temps : ${p.libelle}`,
          description: `${Math.floor(p.minutes / 60) ? `${Math.floor(p.minutes / 60)} h ` : ""}${p.minutes % 60 ? `${p.minutes % 60} min` : ""} proposées, à corriger avant d'enregistrer. Saisie, la proposition porte son origine ; ignorée, elle n'est plus proposée.`,
          quand: `${p.jour}T12:00:00`, assigne: moi, faite: false, origine: "Point du matin : temps proposé à la saisie", regle: "Convention d'honoraires", onglet: "honoraires",
        });
      }
    }
    return out;
  }, [vivants, etats, t.moi, t.source, t.local, t.audiencesCabinet, t.delaisCabinet, t.annexes, maintenant]);

  const aFaire = taches.filter((x) => !x.faite);
  const aMoi = aFaire.filter((x) => x.assigne === t.moi?.user_id);
  const faits = taches.filter((x) => x.faite);
  const liste = (onglet === "moi" ? aMoi : onglet === "faits" ? faits : aFaire).slice().sort((a, b) => (tri === "priorite" ? a.rang - b.rang || (a.quand < b.quand ? 1 : -1) : a.quand < b.quand ? 1 : -1));
  const ouverteT = taches.find((x) => x.cle === ouverte) ?? null;
  const refDe = (id: string) => t.lignes.find((l) => l.dossier.id === id)?.clair?.reference ?? "Chiffré";
  const intituleDe = (id: string) => t.lignes.find((l) => l.dossier.id === id)?.clair?.intitule ?? "Intitulé chiffré";
  const aller = (o: Onglet, tache: string | null = null) => {
    const q = new URLSearchParams();
    if (o !== "moi") q.set("onglet", o);
    if (tache) q.set("tache", tache);
    router.replace(`${ICI}${q.size ? `?${q}` : ""}`, { scroll: false });
  };
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "t" || e.key === "T") setNouveau(true);
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, []);

  const associe = estAssocie(t.moi);
  const gerant = estGerant(t.moi);
  /* en exemple, les lectures des dossiers en mémoire ; en réel, lues à la demande (chaque lecture du journal est tracée) */
  const journal: LigneJournal[] | null =
    t.source === "exemple" ? t.local.flatMap((c) => c.lectures.map((l) => ({ dossier: c.dossier.id, user_id: l.user_id, lu_le: l.lu_le, contexte: l.contexte }))).sort((a, b) => (a.lu_le < b.lu_le ? 1 : -1)) : (journalLu?.lignes ?? null);
  const coffre: LigneCoffre[] | null | undefined = t.source === "exemple" ? [] : coffreLu;
  useEffect(() => {
    if (t.source !== "reelle" || onglet !== "acces" || !associe || coffreLu !== undefined) return;
    let actif = true;
    lireJournalCoffre().then((x) => actif && setCoffreLu(x));
    return () => {
      actif = false;
    };
  }, [t.source, onglet, associe, coffreLu]);
  const lisibles = t.lignes.filter((l) => l.dossier.statut !== "refuse").map((l) => l.dossier.id);
  const lireJournal = async () => {
    setEnvoiAcces(true);
    try {
      setJournalLu(await lireJournalCabinet(lisibles));
    } finally {
      setEnvoiAcces(false);
      setConfirmer(null);
    }
  };
  /* G — l'export de tout le cabinet (tamila_demander_export_cabinet, portes.ts:285) : gérant, après confirmation */
  const exporterCabinet = async () => {
    setEnvoiAcces(true);
    try {
      if (t.source === "reelle") await portes.demanderExportCabinet(t.clientId);
      else await new Promise((r) => setTimeout(r, 350));
      setMessage("L'export de tous les dossiers est demandé : chaque archive arrive dans la page de son dossier (onglet Conformité, Exports). Les associés en sont avertis.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "La base a refusé l'export du cabinet.");
    } finally {
      setEnvoiAcces(false);
      setConfirmer(null);
    }
  };
  const CONTEXTE: Record<string, string> = { dossier: "a consulté le dossier", journal: "a lu le journal des accès", export: "a demandé un export", "export.telechargement": "a téléchargé l'archive", cle: "a ouvert la clé du dossier" };

  const ONGLETS: { cle: Onglet; libelle: string; nb: number; faite?: boolean }[] = [
    { cle: "moi", libelle: "À moi", nb: aMoi.length },
    { cle: "tous", libelle: "À traiter", nb: aFaire.length },
    { cle: "faits", libelle: "Faits", nb: faits.length, faite: true },
    { cle: "acces", libelle: "Accès", nb: journal?.length ?? 0, faite: true },
  ];
  const courant = ONGLETS.find((o) => o.cle === onglet)!;
  const avatar = (id: string | null) => {
    const nom = id ? t.nomDe(id) : "Personne";
    return (
      <span className="tamp-carre" style={{ background: teinte(nom) }} title={nom}>
        {initiales(nom)}
      </span>
    );
  };

  return (
    <PlainCarte>
      <div className="tamp-taches" data-ouvert={!!ouverteT}>
        <div className="tamp-tliste">
          <header className="tamp-ttete">
            <h1 className="tamp-titre">Conformité du cabinet</h1>
            {ouverteT ? (
              <button type="button" className="tamp-icone" aria-label="Masquer le volet" onClick={() => aller(onglet)}>
                <PlainIcone nom="Ecran" />
              </button>
            ) : null}
          </header>
          <section aria-label="Tâches de conformité">
            <div className="tamp-onglets">
              {ouverteT ? null : (
                <div className="tamp-segments" role="tablist">
                  {ONGLETS.map((o) => (
                    <button key={o.cle} type="button" role="tab" aria-selected={onglet === o.cle} className="tamp-segment" onClick={() => aller(o.cle)}>
                      <PlainIcone nom={o.faite ? "Faite" : "AFaire"} className={o.faite ? "tamp-faite" : "tamp-afaire"} />
                      {o.libelle} <small>{o.nb}</small>
                    </button>
                  ))}
                </div>
              )}
              <div ref={boiteSeg} className={ouverteT ? undefined : "tamp-menu-segments"} style={{ position: "relative" }}>
                <button type="button" className="tamp-fantome" style={{ marginLeft: 0 }} aria-haspopup="menu" aria-expanded={segOuvert} onClick={() => ouvrirSeg((o) => !o)}>
                  <PlainIcone nom={courant.faite ? "Faite" : "AFaire"} className={courant.faite ? "tamp-faite" : "tamp-afaire"} />
                  {courant.libelle} <small>{courant.nb}</small>
                  <TamIcone nom="Chevron" taille={14} style={{ transform: "rotate(90deg)" }} />
                </button>
                {segOuvert ? (
                  <div className="tamp-menu" role="menu" style={{ top: 38, left: 0, width: 180 }}>
                    {ONGLETS.map((o) => (
                      <button key={o.cle} type="button" role="menuitemradio" aria-checked={onglet === o.cle} className="tamp-menu-option tamp-menu-option--grand" onClick={() => (aller(o.cle, ouverte), ouvrirSeg(false))}>
                        <PlainIcone nom={o.faite ? "Faite" : "AFaire"} taille={14} />
                        <span style={{ flex: 1 }}>{o.libelle}</span>
                        <small>{o.nb}</small>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {onglet === "acces" ? (
                <button
                  type="button"
                  className="tamp-fantome"
                  style={{ marginLeft: "auto" }}
                  disabled={!journal?.length}
                  onClick={() => exporterCsv("tamila-journal-cabinet", [["Date et heure", "Dossier", "Personne", "Lecture"], ...(journal ?? []).map((l) => [new Date(l.lu_le).toLocaleString("fr-FR"), refDe(l.dossier), t.nomDe(l.user_id), CONTEXTE[l.contexte ?? "dossier"] ?? l.contexte ?? ""])])}
                >
                  <PlainIcone nom="Tri" />
                  Exporter le journal (CSV)
                </button>
              ) : null}
              <div ref={boiteTri} style={{ position: "relative", marginLeft: "auto", display: onglet === "acces" ? "none" : undefined }}>
                <button type="button" className="tamp-fantome" aria-haspopup="menu" aria-expanded={triOuvert} onClick={() => ouvrirTri((o) => !o)}>
                  <PlainIcone nom="Tri" />
                  {tri === "date" ? "Dernière date" : "Priorité"}
                  <TamIcone nom="Chevron" taille={14} style={{ transform: "rotate(90deg)" }} />
                </button>
                {triOuvert ? (
                  <div className="tamp-menu" role="menu" style={{ top: 38, right: 0, width: 160 }}>
                    {(
                      [
                        ["date", "Dernière date"],
                        ["priorite", "Priorité"],
                      ] as [Tri, string][]
                    ).map(([k, l]) => (
                      <button key={k} type="button" role="menuitemradio" aria-checked={tri === k} className="tamp-menu-option tamp-menu-option--grand" onClick={() => (setTri(k), ouvrirTri(false))}>
                        <span style={{ flex: 1 }}>{l}</span>
                        {tri === k ? "✓" : ""}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            {onglet === "acces" ? (
              <button type="button" className="tamp-ajout" onClick={() => setConfirmer("export")} disabled={!gerant || envoiAcces} title={gerant ? undefined : "Seul un gérant demande l'export de tout le cabinet"}>
                <PlainIcone nom="Plus" />
                <span>Exporter tous les dossiers du cabinet{gerant ? "" : " (gérant)"}</span>
              </button>
            ) : (
              <button type="button" className="tamp-ajout" onClick={() => setNouveau(true)} aria-keyshortcuts="T">
                <PlainIcone nom="Plus" />
                <span>
                  Ouvrir un dossier (contrôle à l&apos;entrée) <span className="tamp-kbd">T</span>
                </span>
              </button>
            )}
            {onglet === "acces" ? (
              <ul>
                {journal === null ? (
                  <li className="tamp-tache">
                    <button type="button" className="tamp-tligne" style={{ width: "100%", textAlign: "left" }} onClick={() => setConfirmer("journal")} disabled={envoiAcces}>
                      <span className="tamp-tcase">
                        <PlainIcone nom="AFaire" className="tamp-afaire" />
                      </span>
                      <span className="tamp-ttitre">
                        <span className="tamp-tid">Journal</span>
                        <b>{envoiAcces ? "Lecture du journal…" : `Lire le journal des accès de ${lisibles.length} dossier${lisibles.length > 1 ? "s" : ""}`}</b>
                      </span>
                      <span />
                      <span />
                    </button>
                  </li>
                ) : null}
                {(journal ?? []).slice(0, 300).map((l, i) => (
                  <li key={`${l.dossier}-${l.lu_le}-${i}`} className="tamp-tache" data-faite="">
                    <Link className="tamp-tligne" href={`${RACINE}/tamila/dossiers/${l.dossier}?onglet=conformite&choix=journal`}>
                      <span className="tamp-tcase">
                        <PlainIcone nom="Faite" className="tamp-faite" />
                      </span>
                      <span className="tamp-ttitre">
                        <span className="tamp-tid">{new Date(l.lu_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                        <b>
                          {t.nomDe(l.user_id)} {CONTEXTE[l.contexte ?? "dossier"] ?? l.contexte}
                        </b>
                      </span>
                      <span className="tamp-tcompte">
                        <span className="tamp-pastille">
                          <span className="tamp-vignette">
                            <PlainIcone nom="Batiment" taille={12} />
                          </span>
                          {refDe(l.dossier)} · {intituleDe(l.dossier)}
                        </span>
                      </span>
                      <span className="tamp-assigne">{avatar(l.user_id)}</span>
                    </Link>
                  </li>
                ))}
                {journalLu?.refuses ? <li className="tamp-tvide">{journalLu.refuses} dossier(s) dont le journal revient à leur responsable : non lus.</li> : null}
                {journal && !journal.length ? <li className="tamp-tvide">Aucune lecture enregistrée.</li> : null}
                {associe ? (
                  <>
                    <li className="tamp-tvide" style={{ paddingBottom: 8, fontWeight: 550, color: "var(--p-texte-1)" }}>
                      Journal du coffre à clés (associés)
                    </li>
                    {coffre === undefined ? <li className="tamp-tvide">Lecture…</li> : null}
                    {coffre === null ? <li className="tamp-tvide">Le coffre à clés n&apos;est pas installé sur cette base.</li> : null}
                    {coffre && !coffre.length ? <li className="tamp-tvide">Aucune remise de clé : le cabinet n&apos;est pas passé au coffre Scaleway.</li> : null}
                    {(coffre ?? []).slice(0, 200).map((c) => (
                      <li key={c.id} className="tamp-tache" data-faite={c.issue === "refuse" || c.issue === "echec" ? undefined : ""}>
                        <Link className="tamp-tligne" href={`${RACINE}/tamila/dossiers/${c.dossier_id}`}>
                          <span className="tamp-tcase">
                            <PlainIcone nom={c.issue === "refuse" || c.issue === "echec" ? "AFaire" : "Faite"} className={c.issue === "refuse" || c.issue === "echec" ? "tamp-afaire" : "tamp-faite"} />
                          </span>
                          <span className="tamp-ttitre">
                            <span className="tamp-tid">{new Date(c.demande_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                            <b>
                              {POUR[c.pour] ?? c.pour} · {ISSUE[c.issue] ?? c.issue}
                            </b>
                          </span>
                          <span className="tamp-tcompte">
                            <span className="tamp-pastille">
                              <span className="tamp-vignette">
                                <PlainIcone nom="Batiment" taille={12} />
                              </span>
                              {refDe(c.dossier_id)}
                            </span>
                          </span>
                          <span className="tamp-assigne">{avatar(c.demandeur)}</span>
                        </Link>
                      </li>
                    ))}
                  </>
                ) : null}
              </ul>
            ) : null}
            <ul style={onglet === "acces" ? { display: "none" } : undefined}>
              {t.source === "reelle" && lues === null ? <li className="tamp-tvide">Lecture de la conformité des dossiers…</li> : null}
              {liste.map((x) => (
                <li key={x.cle} className="tamp-tache" aria-current={x.cle === ouverte} data-faite={x.faite ? "" : undefined}>
                  <Link className="tamp-tligne" href={`${ICI}?${new URLSearchParams({ ...(onglet !== "moi" ? { onglet } : {}), tache: x.cle })}`} replace scroll={false}>
                    <button
                      type="button"
                      className="tamp-tcase"
                      aria-pressed={selection.has(x.cle)}
                      aria-label={`Sélectionner : ${x.titre}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelection((v) => {
                          const n = new Set(v);
                          if (n.has(x.cle)) n.delete(x.cle);
                          else n.add(x.cle);
                          return n;
                        });
                      }}
                    >
                      <PlainIcone nom={x.faite || selection.has(x.cle) ? "Faite" : "AFaire"} className={x.faite ? "tamp-faite" : "tamp-afaire"} />
                    </button>
                    <span className="tamp-ttitre">
                      <span className="tamp-tid">{refDe(x.dossier)}</span>
                      <b>{x.titre}</b>
                    </span>
                    <span className="tamp-tcompte">
                      <span className="tamp-pastille">
                        <span className="tamp-vignette">
                          <PlainIcone nom="Batiment" taille={12} />
                        </span>
                        {intituleDe(x.dossier)}
                      </span>
                    </span>
                    <span className="tamp-assigne" title={`Responsable : ${x.assigne ? t.nomDe(x.assigne) : "personne"} — les personnes du dossier se changent dans sa page, onglet Conformité`}>
                      {avatar(x.assigne)}
                    </span>
                  </Link>
                </li>
              ))}
              {(t.source === "exemple" || lues !== null) && !liste.length ? <li className="tamp-tvide">{onglet === "faits" ? "Rien de fait pour l'instant." : "Rien à traiter : la conformité du cabinet est à jour."}</li> : null}
            </ul>
          </section>
        </div>

        {ouverteT ? (
          <aside className="tamp-tvolet" aria-label={ouverteT.titre}>
            <div className="tamp-tvolet-tete">
              <span>{refDe(ouverteT.dossier)}</span>
              <span style={{ display: "flex" }}>
                <span ref={boitePlus} style={{ position: "relative", display: "inline-flex" }}>
                  <button type="button" className="tamp-icone" aria-label="Plus" aria-haspopup="menu" aria-expanded={plusOuvert} onClick={() => ouvrirPlus((o) => !o)}>
                    <PlainIcone nom="Points" />
                  </button>
                  {plusOuvert ? (
                    <span className="tamp-menu" role="menu" style={{ top: 36, right: 0, width: 220 }}>
                      <button type="button" role="menuitem" className="tamp-menu-option" onClick={() => (void copier(`${refDe(ouverteT.dossier)} · ${intituleDe(ouverteT.dossier)}\n${ouverteT.titre}\n${ouverteT.description}\nRègle : ${ouverteT.regle}`).then((ok) => setMessage(ok ? "Tâche copiée pour l'assistant." : "Le presse-papier a refusé la copie.")), ouvrirPlus(false))}>
                        Copier pour l&apos;assistant
                      </button>
                      <button type="button" role="menuitem" className="tamp-menu-option" onClick={() => (void copier(window.location.href), ouvrirPlus(false))}>
                        Copier le lien de la tâche
                      </button>
                      <Link role="menuitem" className="tamp-menu-option" href={`${RACINE}/tamila/dossiers/${ouverteT.dossier}?onglet=${ouverteT.onglet}`}>
                        Ouvrir le dossier
                      </Link>
                    </span>
                  ) : null}
                </span>
                <button type="button" className="tamp-icone" aria-label="Fermer" onClick={() => aller(onglet)}>
                  <PlainIcone nom="Croix" />
                </button>
              </span>
            </div>
            <div className="tamp-tactions">
              <span className="tamp-tstatut">
                <PlainIcone nom={ouverteT.faite ? "Faite" : "AFaire"} className={ouverteT.faite ? "tamp-faite" : "tamp-afaire"} />
                {ouverteT.faite ? "Fait" : "À faire"}
              </span>
              <Link className="tamp-tbouton" href={`${RACINE}/tamila/dossiers/${ouverteT.dossier}?onglet=conformite`} title="Les personnes du dossier se changent dans sa page, onglet Conformité">
                {avatar(ouverteT.assigne)}
                {ouverteT.assigne === t.moi?.user_id ? "Assigné à moi" : `Assigné à ${ouverteT.assigne ? t.nomDe(ouverteT.assigne) : "personne"}`}
              </Link>
              <Link className="tamp-tbouton tamp-tbouton--agent" href={`${RACINE}/tamila/dossiers/${ouverteT.dossier}?onglet=${ouverteT.onglet}`}>
                <TamIcone nom="Resolved" taille={18} />
                Traiter dans le dossier
              </Link>
            </div>
            <h2 className="tamp-tgrand">{ouverteT.titre}</h2>
            <p className="tamp-tcree">Depuis {ilYaCourt(ouverteT.quand).replace(/^il y a /, "")}</p>
            <p className="tamp-tdesc">{ouverteT.description}</p>
            <hr />
            <dl className="tamp-tdl">
              <dt>Dossier</dt>
              <dd>
                <Link className="tamp-pastille" href={`${RACINE}/tamila/dossiers/${ouverteT.dossier}`}>
                  <span className="tamp-vignette">
                    <PlainIcone nom="Batiment" taille={12} />
                  </span>
                  {intituleDe(ouverteT.dossier)}
                </Link>
              </dd>
              <dt>Origine</dt>
              <dd>{ouverteT.origine}</dd>
              <dt>Règle</dt>
              <dd>{ouverteT.regle}</dd>
            </dl>
          </aside>
        ) : null}
      </div>
      {selection.size || message ? (
        <div className="tam">
          <div className="tam-barre-selection" role="toolbar" aria-label="Actions sur la sélection">
            {message ? <span role="status">{message}</span> : <span>{selection.size} sélectionnée{selection.size > 1 ? "s" : ""}</span>}
            {selection.size ? (
              <>
                <button
                  type="button"
                  className="tam-bouton"
                  onClick={() =>
                    void copier(
                      taches
                        .filter((x) => selection.has(x.cle))
                        .map((x) => `- ${refDe(x.dossier)} · ${x.titre} (${x.regle})`)
                        .join("\n"),
                    ).then((ok) => setMessage(ok ? "Tâches copiées pour l'assistant." : "Le presse-papier a refusé la copie."))
                  }
                >
                  Copier pour l&apos;assistant
                </button>
                <button type="button" className="tam-bouton" onClick={() => exporterCsv("tamila-conformite", [["Référence", "Dossier", "Tâche", "Responsable", "Origine", "Règle"], ...taches.filter((x) => selection.has(x.cle)).map((x) => [refDe(x.dossier), intituleDe(x.dossier), x.titre, x.assigne ? t.nomDe(x.assigne) : "", x.origine, x.regle])])}>
                  Exporter (CSV)
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="tam-rond"
              aria-label="Fermer"
              onClick={() => {
                setSelection(new Set());
                setMessage(null);
              }}
            >
              <TamIcone nom="StatusCanceled" />
            </button>
          </div>
        </div>
      ) : null}
      <NouveauDossier ouverte={nouveau} fermer={() => setNouveau(false)} />
      <TamFenetre
        titre={confirmer === "export" ? "Exporter tous les dossiers du cabinet" : "Lire le journal de tout le cabinet"}
        sous={
          confirmer === "export"
            ? "Une archive est préparée pour chaque dossier ; chacune est tracée comme une lecture et arrive dans la page de son dossier. Les associés sont avertis qu'un gérant a demandé l'export de tous les dossiers."
            : `La lecture du journal est elle-même tracée : ${lisibles.length} ligne${lisibles.length > 1 ? "s" : ""} « journal » s'ajoute${lisibles.length > 1 ? "nt" : ""} au journal des accès, une par dossier lu.`
        }
        ouverte={!!confirmer}
        fermer={() => !envoiAcces && setConfirmer(null)}
        pied={
          <button type="button" className={`tam-bouton ${confirmer === "export" ? "tam-bouton--danger" : "tam-bouton--principal"}`} disabled={envoiAcces} onClick={() => void (confirmer === "export" ? exporterCabinet() : lireJournal())}>
            {envoiAcces ? "…" : confirmer === "export" ? "Exporter le cabinet" : "Lire le journal"}
          </button>
        }
      >
        <p className="tam-note">{confirmer === "export" ? "Les archives sont conservées quelques jours, puis purgées." : "Seuls les dossiers dont vous êtes responsable, et pour les associés les dossiers clos, ouvrent leur journal."}</p>
      </TamFenetre>
    </PlainCarte>
  );
}
