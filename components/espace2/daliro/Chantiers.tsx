"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Chantiers (29/10/2026) : la page Projects de Linear en
   affichage « Timeline », au 1:1 (relevé : docs/refonte-metiers/releves/
   linear-timeline.md ; la frise : ./Frise.tsx, ../lin/linear-timeline.css).

   Une ligne par chantier (useDaliro().liste, la même liste que l'écran de
   /espace, btp_liste_chantiers) : à gauche l'icône du statut, le nom, la
   santé (sa famille : bloqué, avenant à signer, passage à confirmer, en
   cours), l'avancement de l'étape, le maître d'ouvrage ; à droite la barre
   du début à la fin prévue, le lot en cours et le prochain passage (un
   losange de la teinte de sa confirmation). Sans dates, la ligne reste,
   sans barre, comme chez Linear.

   Ce que l'écran d'avant faisait, et où c'est ici (inventaire daliro.md) :
     B01  le titre, « Nouveau chantier » (F01, la même fenêtre que la Vue
          d'ensemble, G01 par useDaliro().creer, puis la fiche du nouveau
          chantier), la bascule exemple / réel (menu du cadre)
     B03  les compteurs → pastilles de la barre d'outils, une par famille,
          comptées comme le filtre (exclusives) ; le quota « x / quota »
          dans la barre du titre ; ?famille= garde le filtre (la Vue
          d'ensemble y renvoie)
     B07  l'erreur de la base réelle, sous la barre d'outils
     B08  la liste : triée par famille puis par nom ; la recherche par nom
          ou commune (le bouton Filtre) ; un clic ouvre la fiche
   Zoom de la frise : ?zoom=mois|trimestre|annee.

   30/10/2026, choix de Teo (« celui de Float, exactement le même ») : la
   page s'ouvre sur le planning (./Planning, le Schedule de Float : une
   ligne par intervenant, les jours en colonnes, un bloc par passage à la
   couleur de son chantier) ; la frise reste à un clic (?vue=frise).
   ?semaine=<lundi> choisit la première semaine (un passage ouvert depuis
   ailleurs, ?passage=, montre la sienne), ?echelle=mois resserre,
   ?qui=equipes|sous-traitants filtre les lignes.
   Un bloc glissé ou tiré dans le planning, ou les heures d'un passage
   posées dans l'aperçu (poser, plus bas) : en base réelle, la porte
   btp_deplacer_passage (b6_82) ; en exemple, la même règle en mémoire.

   30/10/2026 — la frise qu'on touche (Teo : « le mec peut cliquer et
   accéder aux fiches ») :
     · Mois par défaut : on voit les semaines qui viennent, pas une année
       presque vide ;
     · sous chaque nom, la phrase la plus pressée du chantier (./enClair)
       à la place des trois ronds sans texte (santé, avancement, maître
       d'ouvrage) : il reste l'avancement et le maître d'ouvrage ;
     · sur chaque barre, un pavé par passage prévu, de la couleur de la
       réponse de l'intervenant (confirmé, sans réponse, refusé…) ;
     · un clic sur la barre ou sur un pavé ouvre l'aperçu à droite
       (./ApercuFrise : ce qu'il faut faire, les trois semaines à venir,
       les portes de la fiche), sans quitter la frise. ?apercu=<chantier>,
       ?passage=<passage> ; Échap referme. Le nom, à gauche, mène toujours
       droit à la fiche.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, CircleDashed, Clock, HardHat, ListFilter, Plus, Send, UserRound, X } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { RACINE } from "@/components/espace2/modules";
import { dateCourte } from "@/components/espace/format";
import { Avis } from "@/components/espace/ui";
import { CONFIRMATIONS, EXECUTIONS, FAMILLES, STATUTS_CHANTIER, type Famille } from "@/components/espace/daliro/etats";
import { famille } from "@/components/espace/daliro/liste";
import type { Chantier, Confirmation, Passage, StatutChantier, Tableau } from "@/components/espace/daliro/types";
import { Menu } from "../lin/Lin";
import { IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { deplacerPassage } from "@/components/espace/daliro/portes";
import { appliquerLocal, recalageLocal } from "@/components/espace/daliro/recalage";
import { useToast } from "../Toasts";
import { useDaliro, type NouveauChantier } from "./donnees";
import Frise, { estZoom, type LigneFrise, type PastilleFrise, type TeinteFrise, type Zoom } from "./Frise";
import ApercuFrise from "./ApercuFrise";
import Planning, { estDensite, lundiDe } from "./Planning";
import { CONFIRMATION_CLAIRE, jourLocal, qui, quand, resume } from "./enClair";
import "@/components/espace/espace.css";

const MO_TYPES = [
  { cle: "professionnel", libelle: "Professionnel (promoteur, SCI, entreprise)" },
  { cle: "particulier", libelle: "Particulier" },
  { cle: "acheteur_public", libelle: "Acheteur public (commune, bailleur, État)" },
];
const PLACES = [
  { cle: "titulaire", libelle: "Titulaire du marché" },
  { cle: "cotraitant", libelle: "Cotraitant (groupement)" },
  { cle: "sous_traitant", libelle: "Sous-traitant d'une entreprise principale" },
];
const VIDE: NouveauChantier = { nom: "", reference: "", adresse: "", code_postal: "", commune: "", maitre_ouvrage_type: "professionnel", place_client: "titulaire", maitre_ouvrage_id: "" };

const ORDRE: Record<Famille, number> = { bloque: 0, a_signer: 1, a_confirmer: 2, ouvert: 3 };
/* les familles dites comme sur un chantier (les compteurs de la barre d'outils) */
const FAMILLE_CLAIRE: Record<Famille, string> = { bloque: "Bloqués", a_signer: "Avenant à faire signer", a_confirmer: "Intervenant à relancer", ouvert: "En cours" };
const ETAT: Record<StatutChantier, EtatProjet> = { preparation: "planifie", ouvert: "en-cours", suspendu: "en-cours", receptionne: "fait", clos: "fait", annule: "annule" };
const teinteDe = (t: string): TeinteFrise => (t === "rouge" || t === "ambre" || t === "bleu" || t === "vert" ? t : "gris");
const estFamille = (v: string | null): v is Famille => v === "bloque" || v === "a_signer" || v === "a_confirmer" || v === "ouvert";
const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 1 || /\p{Lu}/u.test(m))
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

/* l'avancement de l'étape : un anneau de 16, rempli à proportion */
function Avancement({ pct }: { pct: number | null }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      {pct ? <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${(c * Math.min(100, pct)) / 100} ${c}`} transform="rotate(-90 8 8)" strokeLinecap="round" /> : null}
    </svg>
  );
}

export default function Chantiers() {
  const { source, pret, erreur, liste, quota, maitresOuvrage, creer, tableau, demanderTous, enLecture, onLocal, relireChantier } = useDaliro();
  const toast = useToast();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const [q, setQ] = useState("");
  const aujourdhui = useMemo(() => jourLocal(), []);

  const filtre = estFamille(params.get("famille")) ? (params.get("famille") as Famille) : null;
  const zParam = params.get("zoom");
  const zoom: Zoom = estZoom(zParam) ? zParam : "mois";
  const vueFrise = params.get("vue") === "frise";
  const apercuId = params.get("apercu");
  const passageId = params.get("passage");
  const lien = (modif: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modif)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };

  /* les passages de la frise sont dans les tableaux : en base réelle, on les lit tous, une fois */
  useEffect(() => {
    if (source === "reelle" && pret) demanderTous();
  }, [source, pret, demanderTous]);

  const ouvrir = (modif: Record<string, string | null>) => routeur.replace(lien(modif), { scroll: false });
  const fermer = () => ouvrir({ apercu: null, passage: null });
  useEffect(() => {
    if (!apercuId && !passageId) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[role=dialog]")) return;
      routeur.replace(lien({ apercu: null, passage: null }), { scroll: false });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

  /* l'élément ouvert : le passage dit son chantier */
  const passageOuvert = useMemo(() => {
    if (!passageId) return null;
    for (const c of liste) {
      const p = tableau(c.id)?.passages.find((x) => x.id === passageId);
      if (p) return p;
    }
    return null;
  }, [passageId, liste, tableau]);
  const chantierOuvert = liste.find((c) => c.id === (passageOuvert?.chantier_id ?? apercuId)) ?? null;
  const sParam = params.get("semaine");
  const lundi = sParam && /^\d{4}-\d{2}-\d{2}$/.test(sParam) ? lundiDe(sParam) : lundiDe(passageOuvert?.debut ?? aujourdhui);

  /* ——— un bloc du planning glissé ou tiré, ou ses heures posées dans l'aperçu ———
     En exemple : la règle de la base rejouée en mémoire (la suite qui en dépend part après, un passage déplacé ou
     ré-horé repart en confirmation J-2). En base réelle : btp_deplacer_passage (b6_82), qui fait de même et journalise. */
  const plusJours = (iso: string, n: number) => {
    const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10);
  };
  const poser = async (p: Passage, chantierId: string, debut: string, fin: string, hd: string | null, hf: string | null, quoi: string) => {
    const t = tableau(chantierId);
    if (!t) return;
    const nom = `« ${p.tache ?? "Passage"} »`;
    if (source === "reelle") {
      try {
        const r = await deplacerPassage(p.id, debut, fin, hd, hf, null);
        await relireChantier(chantierId);
        const suite = (r.recalage?.deplaces ?? []).filter((d) => d.passage_id !== p.id).length;
        toast(`${nom} ${quoi}${r.reconfirmer ? ", à reconfirmer à J-2" : ""}${suite ? ` ; ${suite} passage${suite > 1 ? "s" : ""} qui en dépendent suivent` : ""}.`, "vert");
      } catch (e) {
        toast(e instanceof Error ? e.message : "La base a refusé le déplacement.", "rouge");
      }
      return;
    }
    const sec = (h: string | null) => (h ? (h.length === 5 ? `${h}:00` : h) : null);
    const avant = { debut: p.debut, fin: p.fin, hd: p.heure_debut ?? null, hf: p.heure_fin ?? null };
    const bouge = debut !== avant.debut || fin !== avant.fin || sec(hd) !== avant.hd || sec(hf) !== avant.hf;
    const reconfirmer = bouge && p.confirmation !== "non_demandee";
    let t2: Tableau = { ...t, passages: t.passages.map((q) => (q.id === p.id ? { ...q, debut, fin, heure_debut: sec(hd), heure_fin: sec(hf), version: q.version + (bouge ? 1 : 0), confirmation: reconfirmer ? "non_demandee" : q.confirmation, confirmation_le: reconfirmer ? null : q.confirmation_le } : q)) };
    let suite = 0;
    if (fin > avant.fin) {
      try {
        const r = recalageLocal(t2, p.id, fin);
        suite = r.deplaces.filter((d) => d.passage_id !== p.id).length;
        t2 = appliquerLocal(t2, r);
      } catch {
        /* rien en aval */
      }
    }
    onLocal(t2);
    toast(`${nom} ${quoi}${reconfirmer ? ", à reconfirmer à J-2" : ""}${suite ? ` ; ${suite} passage${suite > 1 ? "s" : ""} qui en dépendent suivent` : ""}.`, "vert");
  };
  const changer = ({ passage: p, chantierId, mode, jours }: { passage: Passage; chantierId: string; mode: "deplacer" | "etirer"; jours: number }) => {
    const debut = mode === "deplacer" ? plusJours(p.debut, jours) : p.debut.slice(0, 10);
    const fin = plusJours(p.fin, jours);
    const quoi = mode === "etirer" ? `finit ${quand(fin, aujourdhui)}` : `déplacé ${debut === fin ? quand(debut, aujourdhui) : `du ${dateCourte(debut)} au ${dateCourte(fin)}`}`;
    void poser(p, chantierId, debut, fin, p.heure_debut?.slice(0, 5) ?? null, p.heure_fin?.slice(0, 5) ?? null, quoi);
  };
  const heures = (p: Passage, hd: string | null, hf: string | null) => {
    void poser(p, p.chantier_id, p.debut.slice(0, 10), p.fin.slice(0, 10), hd, hf, hd ? `de ${hd.replace(":", " h ")} à ${(hf ?? "").replace(":", " h ")}` : "sans heures");
  };

  const tries = useMemo(
    () =>
      [...liste].sort((a, b) => {
        const fa = famille(a);
        const fb = famille(b);
        return (fa ? ORDRE[fa] : 9) - (fb ? ORDRE[fb] : 9) || a.nom.localeCompare(b.nom, "fr");
      }),
    [liste],
  );
  const comptes = useMemo(() => {
    const c: Record<Famille, number> = { bloque: 0, a_signer: 0, a_confirmer: 0, ouvert: 0 };
    for (const ch of liste) {
      const f = famille(ch);
      if (f) c[f]++;
    }
    return c;
  }, [liste]);
  /* F01 : nouveau chantier, la fenêtre de la Vue d'ensemble (G01) */
  const [nouveau, setNouveau] = useState(params.get("nouveau") === "1");
  const [envoi, setEnvoi] = useState(false);
  const [erreurNouveau, setErreurNouveau] = useState<string | null>(null);
  const [f, setF] = useState<NouveauChantier>(VIDE);
  const ouvrirNouveau = () => {
    setErreurNouveau(null);
    setF(VIDE);
    setNouveau(true);
  };
  const complet = f.nom.trim().length > 0 && /^[0-9]{5}$/.test(f.code_postal) && f.commune.trim().length > 0;
  const lancerCreation = async () => {
    setEnvoi(true);
    setErreurNouveau(null);
    try {
      const id = await creer(f);
      toast(`C'est fait. ${f.nom.trim()} est créé, en préparation : posez ses lots, son marché, puis ouvrez-le.`, "vert");
      setNouveau(false);
      routeur.push(`${RACINE}/daliro/chantiers/${encodeURIComponent(id)}`);
    } catch (e) {
      setErreurNouveau(e instanceof Error ? e.message : "La création a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  const ouverts = liste.filter((c) => c.statut === "ouvert" || c.statut === "suspendu").length;

  const recherche = q.trim().toLocaleLowerCase("fr");
  const visibles = tries.filter((c) => (!filtre || famille(c) === filtre) && (!recherche || `${c.nom} ${c.commune} ${c.code_postal} ${c.reference ?? ""}`.toLocaleLowerCase("fr").includes(recherche)));

  const ligne = (c: Chantier): LigneFrise => {
    const statut = STATUTS_CHANTIER[c.statut];
    const t = tableau(c.id);
    const pct = c.etape && c.etape.etapes ? c.etape.avancement_pct : null;
    const p = c.prochain_passage;
    const conf = p ? CONFIRMATIONS[p.confirmation] : null;
    const lot = c.etape?.lot_libelle ?? null;
    const enClair = resume(c, t, aujourdhui);
    const passages = (t?.passages ?? []).filter((x) => x.statut !== "annule");
    const aVenir = passages.filter((x) => x.statut === "prevu" && x.fin.slice(0, 10) >= aujourdhui).length;
    const choisi = c.id === chantierOuvert?.id;
    return {
      cle: c.id,
      niveau: 1,
      icone: <IconeStatutProjet etat={ETAT[c.statut]} />,
      teinteIcone: teinteDe(statut.teinte),
      nom: c.nom,
      sous: { texte: enClair.texte, teinte: enClair.teinte },
      choisie: choisi,
      href: `${RACINE}/daliro/chantiers/${encodeURIComponent(c.id)}`,
      pilule: lot ?? (p ? `Passage ${quand(p.debut, aujourdhui)}` : undefined),
      ronds: (
        <>
          <span className="ltl-rond" data-teinte={pct === null ? "gris" : pct === 100 ? "vert" : "ambre"} title={pct === null ? "Avancement : aucun lot posé" : `Avancement : ${pct} %${lot ? `, ${lot}` : ""}`} aria-label={pct === null ? "Avancement : aucun lot posé" : `Avancement : ${pct} %`} role="img">
            <Avancement pct={pct} />
          </span>
          <span className="ltl-rond" data-liste="non" title={c.maitre_ouvrage_nom ? `Maître d'ouvrage : ${c.maitre_ouvrage_nom}` : "Maître d'ouvrage à désigner"} aria-label={c.maitre_ouvrage_nom ? `Maître d'ouvrage : ${c.maitre_ouvrage_nom}` : "Maître d'ouvrage à désigner"} role="img">
            {c.maitre_ouvrage_nom ? <span className="ltl-avatar">{initiales(c.maitre_ouvrage_nom) || "?"}</span> : <UserRound aria-hidden="true" />}
          </span>
        </>
      ),
      barres:
        c.date_debut || c.date_fin_prevue
          ? [
              {
                cle: c.id,
                debut: c.date_debut,
                fin: c.date_fin_prevue,
                libelle: lot ? `En cours : ${lot}` : statut.libelle,
                meta: aVenir ? `${aVenir} passage${aVenir > 1 ? "s" : ""} à venir` : undefined,
                titre: `${c.nom}, ${c.date_debut ? `du ${dateCourte(c.date_debut)}` : "sans date de début"} ${c.date_fin_prevue ? `au ${dateCourte(c.date_fin_prevue)}` : "sans fin prévue"} · cliquez pour l'aperçu`,
                onClick: () => ouvrir({ apercu: c.id, passage: null }),
                choisie: choisi && !passageOuvert,
                /* sans tableau (base réelle pas encore lue), le losange du prochain passage, comme avant */
                jalon: !t && p && conf ? { jour: p.debut, teinte: teinteDe(conf.teinte), titre: `Prochain passage ${quand(p.debut, aujourdhui)}` } : null,
                /* sous les lots, la durée du chantier n'est plus qu'un trait */
                fine: !!t,
              },
            ]
          : [],
    };
  };

  /* sous chaque chantier, une ligne par lot qui a des passages : qui fait le lot, et ses passages en étiquettes */
  const ICONE_REPONSE: Record<Confirmation, React.ReactNode> = {
    confirmee: <Check aria-hidden="true" />,
    demandee: <Send aria-hidden="true" />,
    sans_reponse: <Clock aria-hidden="true" />,
    declinee: <X aria-hidden="true" />,
    non_demandee: <CircleDashed aria-hidden="true" />,
  };
  const pastille = (x: Passage): PastilleFrise => {
    const fait = x.statut === "fait";
    const conf = CONFIRMATION_CLAIRE[x.confirmation];
    return {
      cle: x.id,
      debut: x.debut,
      fin: x.fin,
      texte: x.tache ?? qui(x),
      sous: fait ? "fait" : conf.court,
      teinte: fait ? "gris" : conf.teinte,
      icone: fait ? <CheckCheck aria-hidden="true" /> : ICONE_REPONSE[x.confirmation],
      titre: `${quand(x.debut, aujourdhui)} · ${qui(x)}${x.tache ? ` · ${x.tache}` : ""} · ${fait ? "fait" : conf.court} — cliquez pour le détail`,
      onClick: () => ouvrir({ passage: x.id, apercu: null }),
      choisi: x.id === passageOuvert?.id,
    };
  };
  const lignesLots = (c: Chantier, t: Tableau | null): LigneFrise[] => {
    if (!t) return [];
    const passages = t.passages.filter((x) => x.statut !== "annule");
    const parLot = new Map<string, Passage[]>();
    for (const x of passages) parLot.set(x.lot_id ?? "", [...(parLot.get(x.lot_id ?? "") ?? []), x]);
    const lots = [...t.lots].sort((a, b) => a.rang - b.rang || a.code.localeCompare(b.code));
    const r: LigneFrise[] = [];
    for (const lot of lots) {
      const ps = parLot.get(lot.id);
      if (!ps?.length) continue;
      const qui = lot.tiers_nom ?? lot.equipe_nom ?? (lot.execution === "client" ? "Nos équipes" : EXECUTIONS[lot.execution]);
      r.push({ cle: `${c.id}:${lot.id}`, niveau: 2, icone: null, nom: `${lot.code} · ${lot.libelle}`, sous: { texte: qui }, ronds: null, barres: [], pastilles: ps.map(pastille) });
    }
    const sans = parLot.get("");
    if (sans?.length) r.push({ cle: `${c.id}:sans-lot`, niveau: 2, icone: null, nom: "Sans lot", sous: { texte: "passages à rattacher à un lot" }, ronds: null, barres: [], pastilles: sans.map(pastille) });
    return r;
  };

  const vide = !pret ? (
    <p className="lin-vide">Lecture des chantiers…</p>
  ) : liste.length === 0 ? (
    <p className="lin-vide">
      Aucun chantier.{" "}
      <button type="button" className="lin-voir-tout" style={{ marginTop: 0 }} onClick={ouvrirNouveau}>
        Créez votre premier chantier
      </button>{" "}
      : son nom, son adresse, son maître d&apos;ouvrage.
    </p>
  ) : (
    <p className="lin-vide">{recherche ? "Aucun chantier ne correspond à la recherche." : "Rien dans cette famille."}</p>
  );

  return (
    <div className="lin">
      <h1 className="v2-sr">Chantiers</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Chantiers</span>
        <div className="lin-tete-droite">
          {quota ? (
            <span className="lin-position" title="Chantiers ouverts ou suspendus, sur le quota de la formule">
              {ouverts} / {quota} ouverts
            </span>
          ) : null}
          <button type="button" className="v2-btn v2-btn--petit" onClick={ouvrirNouveau}>
            <Plus width={14} height={14} aria-hidden="true" />
            <span>Nouveau chantier</span>
          </button>
        </div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Familles de chantiers">
          <Link href={lien({ famille: null })} className="v2-btn v2-btn--petit" data-actif={!filtre ? "" : undefined} aria-current={!filtre ? "page" : undefined} scroll={false}>
            Tous les chantiers <span className="ltl-compte">{liste.length}</span>
          </Link>
          {FAMILLES.map((fa) => (
            <Link
              key={fa.cle}
              href={lien({ famille: filtre === fa.cle ? null : fa.cle })}
              className="v2-btn v2-btn--petit"
              data-actif={filtre === fa.cle ? "" : undefined}
              aria-current={filtre === fa.cle ? "page" : undefined}
              title={fa.sous}
              scroll={false}
            >
              {FAMILLE_CLAIRE[fa.cle]} <span className="ltl-compte">{comptes[fa.cle]}</span>
            </Link>
          ))}
        </nav>
        <div className="lin-outils-droite">
          <nav className="lin-onglets" aria-label="Affichage" style={{ marginRight: 6 }}>
            <Link href={lien({ vue: null, zoom: null })} className="v2-btn v2-btn--petit" data-actif={!vueFrise ? "" : undefined} aria-current={!vueFrise ? "page" : undefined} scroll={false}>
              Planning
            </Link>
            <Link href={lien({ vue: "frise", semaine: null, echelle: null, qui: null })} className="v2-btn v2-btn--petit" data-actif={vueFrise ? "" : undefined} aria-current={vueFrise ? "page" : undefined} scroll={false}>
              Frise
            </Link>
          </nav>
          <Menu
            largeur={280}
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Rechercher un chantier" title="Rechercher un chantier" aria-expanded={ouvert} aria-pressed={!!recherche} onClick={basculer}>
                <ListFilter width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <input
                className="lin-menu-champ"
                autoFocus
                placeholder="Nom, commune ou code postal…"
                aria-label="Rechercher un chantier par nom ou commune"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && fermer()}
              />
            )}
          </Menu>
        </div>
      </div>

      {erreur && source === "reelle" ? (
        <p className="ltl-note" data-teinte="rouge" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : null}
      {recherche ? (
        <p className="ltl-note" role="status">
          {visibles.length} chantier{visibles.length > 1 ? "s" : ""} pour « {q.trim()} ».{" "}
          <button type="button" className="lin-voir-tout" style={{ marginTop: 0 }} onClick={() => setQ("")}>
            Effacer
          </button>
        </p>
      ) : null}

      {vueFrise && pret && visibles.length ? (
        <p className="ltl-legende">Une ligne par lot, un rectangle par passage : qui vient, pour quoi, et ce qu&apos;il a répondu. Cliquez pour le détail à droite.</p>
      ) : null}

      <div className="ltl-cadre">
        {vueFrise ? (
          <Frise libelle="Frise des chantiers" lignes={pret ? visibles.flatMap((c) => [ligne(c), ...lignesLots(c, tableau(c.id))]) : []} zoom={zoom} onZoom={(z) => ouvrir({ zoom: z === "mois" ? null : z })} aujourdhui={aujourdhui} vide={vide} />
        ) : pret && liste.length ? (
          <Planning
            lundi={lundi}
            aujourdhui={aujourdhui}
            densite={estDensite(params.get("echelle")) ? (params.get("echelle") as "semaines" | "mois") : "semaines"}
            type={params.get("qui") === "equipes" ? "equipes" : params.get("qui") === "sous-traitants" ? "sous-traitants" : null}
            chantiers={visibles}
            tous={liste}
            tableau={tableau}
            passageChoisi={passageOuvert?.id ?? null}
            onSemaine={(l) => ouvrir({ semaine: l ?? lundiDe(aujourdhui) })}
            onDensite={(d) => ouvrir({ echelle: d === "semaines" ? null : d })}
            onType={(t) => ouvrir({ qui: t })}
            onPassage={(id) => ouvrir({ passage: id, apercu: null })}
            onChanger={changer}
          />
        ) : (
          <div className="ltl">{vide}</div>
        )}
        {chantierOuvert ? (
          <ApercuFrise
            key={passageOuvert?.id ?? chantierOuvert.id}
            chantier={chantierOuvert}
            tableau={tableau(chantierOuvert.id)}
            passage={passageOuvert}
            auj={aujourdhui}
            lecture={enLecture(chantierOuvert.id)}
            onPassage={(id) => ouvrir({ passage: id, apercu: null })}
            onChantier={() => ouvrir({ apercu: chantierOuvert.id, passage: null })}
            onFermer={fermer}
            onHeures={heures}
          />
        ) : null}
      </div>

      <Dialog open={nouveau} onOpenChange={(o) => !o && setNouveau(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <HardHat width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Nouveau chantier</DialogTitle>
            <DialogDescription>Le chantier naît en préparation. Le département, le territoire et le régime de TVA se déduisent du code postal ; une entité « site » lui est ouverte.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Nom <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Résidence Les Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Référence interne
                  <input className="rv-champ" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="TIL-2026" />
                </label>
                <label className="rv-libelle">
                  Code postal <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="numeric" value={f.code_postal} onChange={(e) => setF({ ...f, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) })} placeholder="69100" />
                </label>
              </div>
              <label className="rv-libelle">
                Commune <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.commune} onChange={(e) => setF({ ...f, commune: e.target.value })} placeholder="Villeurbanne" />
              </label>
              <label className="rv-libelle">
                Adresse
                <input className="rv-champ" value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} placeholder="14 rue des Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Maître d&apos;ouvrage
                  <select className="rv-champ" value={f.maitre_ouvrage_type} onChange={(e) => setF({ ...f, maitre_ouvrage_type: e.target.value })}>
                    {MO_TYPES.map((o) => (
                      <option key={o.cle} value={o.cle}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rv-libelle">
                  Notre place
                  <select className="rv-champ" value={f.place_client} onChange={(e) => setF({ ...f, place_client: e.target.value })}>
                    {PLACES.map((o) => (
                      <option key={o.cle} value={o.cle}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">
                Qui signe (annuaire, rôle maître d&apos;ouvrage)
                <select className="rv-champ" value={f.maitre_ouvrage_id} onChange={(e) => setF({ ...f, maitre_ouvrage_id: e.target.value })}>
                  <option value="">À désigner plus tard (le chantier ne pourra pas s&apos;ouvrir sans lui)</option>
                  {maitresOuvrage.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </label>
              {erreurNouveau ? (
                <Avis teinte="rouge" role="alert">
                  {erreurNouveau}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!complet || envoi} onClick={lancerCreation}>
              {envoi ? <Loader variant="spin" /> : null} Créer le chantier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
