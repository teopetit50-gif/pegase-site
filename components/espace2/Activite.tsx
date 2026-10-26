"use client";

/* ══════════════════════════════════════════════════════════════════════
   Activité — le journal unifié (Logs) de Supabase, au 1:1 (22/10/2026)

   22/10 : demande de Teo, recopier les pages de Supabase. Activité prend
   la page Logs : à gauche la colonne de filtres (période, type, module,
   chacun avec son compte), à droite la barre de recherche, l'histogramme
   des événements sur la période, la table dense (date en chasse fixe,
   type, module, événement, montant, état) ; un clic ouvre le détail dans
   le volet de droite. Gabarit et mesures : ./sb/sb.css.

   Avant (11/10) : en colonnes, à la manière d'Attio.

   Demande de Teo, maquette à l'appui : trois colonnes — Documents reçus,
   À valider, Décisions — chacune avec son compte, ses cartes (titre,
   montant et état, module, moment) et son « Voir tout ». Au-dessus, la
   barre : tri, module, période, recherche, colonnes ou liste. La finition
   est celle d'Attio, déjà posée sur Notes : filets d'un pixel, boutons de
   26 px à coins de 6 px, cartes à coins de 8 px, survols discrets.

   Mêmes sources qu'avant (./donnees) : l'exemple, ou la base réelle.
   ══════════════════════════════════════════════════════════════════════ */

import "./sb/sb.css";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock3, FileText, Search, X, type LucideIcon } from "lucide-react";
import { dateHeure, libelleModule, montant } from "@/components/espace/format";
import { etatDocument } from "@/components/espace/filed/etats";
import { nomPersonne } from "@/components/espace/exemples/socle";
import { useSource } from "@/components/espace/source";
import { Badge, Note, Squelette, teinte, type Teinte } from "./ui";
import { useDonnees, type Donnees } from "./donnees";
import { STATUTS_DEMANDE } from "./evenements";
import { useMaintenant } from "./horloge";
import { RACINE } from "./modules";

const JOUR = 86_400_000;

type Cle = "recus" | "a_valider" | "decisions";
type Carte = {
  id: string;
  colonne: Cle;
  quand: string;
  titre: string;
  complet: string;
  somme: number | null;
  devise: string;
  etat: { libelle: string; teinte: Teinte } | null;
  par: string | null;
  module: string;
  lien: string;
  texte: string;
};

const COLONNES: { cle: Cle; titre: string; icone: LucideIcon; tout: string; libelleTout: string; vide: string }[] = [
  { cle: "recus", titre: "Documents reçus", icone: FileText, tout: `${RACINE}/filed/boite`, libelleTout: "Voir tous les documents reçus", vide: "Aucun document reçu" },
  { cle: "a_valider", titre: "À valider", icone: Clock3, tout: `${RACINE}/validations`, libelleTout: "Voir toutes les demandes à valider", vide: "Rien à valider" },
  { cle: "decisions", titre: "Décisions", icone: CircleCheck, tout: `${RACINE}/validations`, libelleTout: "Voir toutes les décisions", vide: "Aucune décision" },
];
const TYPE: Record<Cle, string> = { recus: "Document reçu", a_valider: "À valider", decisions: "Décision" };

type Periode = "jour" | "7j" | "30j" | "tout";
const PERIODES: { cle: Periode; libelle: string; duree: number }[] = [
  { cle: "jour", libelle: "Dernières 24 heures", duree: JOUR },
  { cle: "7j", libelle: "7 derniers jours", duree: 7 * JOUR },
  { cle: "30j", libelle: "30 derniers jours", duree: 30 * JOUR },
  { cle: "tout", libelle: "Depuis le début", duree: Infinity },
];

/* « Payer la facture R2026-000014 — Papeterie Durand, 486,20 € » : la carte garde l'action, le reste va dans l'info-bulle */
const court = (resume: string) => resume.split(" — ")[0].trim() || resume;
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function cartes(donnees: Donnees): Carte[] {
  const l: Carte[] = [];
  for (const d of donnees.docs) {
    const e = etatDocument(d.etat);
    const titre = d.fournisseur ? `${d.montant !== null ? "Facture" : "Document"} ${d.fournisseur}` : `Document ${d.reference}`;
    l.push({
      id: `doc-${d.id}`,
      colonne: "recus",
      quand: d.recu_le,
      titre,
      complet: `${d.reference}${d.fournisseur ? ` · ${d.fournisseur}` : ""}`,
      somme: d.montant,
      devise: d.devise,
      etat: { libelle: e.libelle, teinte: teinte(e.teinte) },
      par: null,
      module: "filed",
      lien: `${RACINE}/filed?objet=document:${encodeURIComponent(d.id)}`,
      texte: `${titre} ${d.reference} ${e.libelle}`,
    });
  }
  for (const d of donnees.demandes) {
    const par = d.demandeur_type === "systeme" ? "Omega" : nomPersonne(d.demandeur_id);
    const s = STATUTS_DEMANDE[d.statut] ?? { libelle: d.statut, teinte: "gris" as const };
    const base = { titre: court(d.resume), complet: d.resume, somme: d.montant, devise: d.devise, module: d.module, lien: `${RACINE}/validations` };
    if (d.statut === "en_attente") {
      l.push({ ...base, id: `dem-${d.id}`, colonne: "a_valider", quand: d.cree_le, etat: null, par, texte: `${d.resume} ${par}` });
    } else {
      l.push({ ...base, id: `dec-${d.id}`, colonne: "decisions", quand: d.decide_le ?? d.cree_le, etat: s, par: null, texte: `${d.resume} ${s.libelle} ${par}` });
    }
  }
  return l;
}

export default function Activite() {
  const { donnees, erreur } = useDonnees();
  const { source } = useSource();
  const maintenant = useMaintenant();
  const [periode, setPeriode] = useState<Periode>("30j");
  const [types, setTypes] = useState<Cle[]>(["recus", "a_valider", "decisions"]);
  const [modules, setModules] = useState<string[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [choisie, setChoisie] = useState<string | null>(null);

  const toutes = useMemo(() => (donnees ? cartes(donnees) : null), [donnees]);
  const duree = PERIODES.find((p) => p.cle === periode)?.duree ?? Infinity;
  const dansPeriode = useMemo(() => (toutes && maintenant !== null ? toutes.filter((c) => duree === Infinity || maintenant - new Date(c.quand).getTime() <= duree) : null), [toutes, maintenant, duree]);
  const lesModules = useMemo(() => Array.from(new Set((dansPeriode ?? []).map((c) => c.module))), [dansPeriode]);
  const q = sansAccents(recherche.trim());
  const visibles = useMemo(
    () =>
      (dansPeriode ?? [])
        .filter((c) => types.includes(c.colonne) && (!modules || modules.includes(c.module)) && (!q || sansAccents(c.texte).includes(q)))
        .sort((a, b) => b.quand.localeCompare(a.quand)),
    [dansPeriode, types, modules, q],
  );
  const carte = visibles.find((c) => c.id === choisie) ?? null;
  const compte = (f: (c: Carte) => boolean) => (dansPeriode ?? []).filter(f).length;

  /* l'histogramme : 40 tranches sur la période (ou sur l'étendue des événements) */
  const barres = useMemo(() => {
    if (!visibles.length || maintenant === null) return [];
    const debut = duree === Infinity ? Math.min(...visibles.map((c) => new Date(c.quand).getTime())) : maintenant - duree;
    const pas = Math.max(1, (maintenant - debut) / 40);
    const b = Array.from({ length: 40 }, () => 0);
    for (const c of visibles) {
      const k = Math.min(39, Math.max(0, Math.floor((new Date(c.quand).getTime() - debut) / pas)));
      b[k] += 1;
    }
    return b;
  }, [visibles, maintenant, duree]);
  const max = Math.max(1, ...barres);
  const dateLog = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  };

  return (
    <div className="sb-journal v2-arrivee">
      <h1 className="v2-sr">Activité</h1>
      <aside className="sb-journal-filtres" aria-label="Filtres">
        <div className="sb-journal-groupe">
          <p>Période</p>
          {PERIODES.map((p) => (
            <label key={p.cle} className="sb-journal-option">
              <input type="radio" name="periode" checked={periode === p.cle} onChange={() => setPeriode(p.cle)} />
              <span>{p.libelle}</span>
              <span />
            </label>
          ))}
        </div>
        <div className="sb-journal-groupe">
          <p>Type</p>
          {COLONNES.map((c) => (
            <label key={c.cle} className="sb-journal-option">
              <input type="checkbox" checked={types.includes(c.cle)} onChange={(e) => setTypes((t) => (e.target.checked ? [...t, c.cle] : t.filter((x) => x !== c.cle)))} />
              <span>{TYPE[c.cle]}</span>
              <span>{dansPeriode ? compte((x) => x.colonne === c.cle) : ""}</span>
            </label>
          ))}
        </div>
        <div className="sb-journal-groupe">
          <p>Module</p>
          {lesModules.map((m) => (
            <label key={m} className="sb-journal-option">
              <input type="checkbox" checked={!modules || modules.includes(m)} onChange={(e) => setModules((t) => { const base = t ?? lesModules; return e.target.checked ? [...base, m] : base.filter((x) => x !== m); })} />
              <span>{libelleModule(m)}</span>
              <span>{compte((x) => x.module === m)}</span>
            </label>
          ))}
          {!lesModules.length ? <span className="sb-journal-option">—</span> : null}
        </div>
        <div className="sb-journal-groupe">
          <p>Source</p>
          <span className="sb-journal-option">{source === "exemple" ? "Données d'exemple" : "Base réelle"}</span>
        </div>
      </aside>

      <div className="sb-journal-principal">
        <label className="sb-journal-barre">
          <Search width={16} height={16} strokeWidth={1.5} aria-hidden="true" />
          <span className="v2-sr">Filtrer les événements</span>
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Filtrer par fournisseur, référence, demande, état…" />
          {recherche ? (
            <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome v2-btn--icone" onClick={() => setRecherche("")} aria-label="Effacer le filtre">
              <X width={14} height={14} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        {erreur ? (
          <div style={{ padding: 16 }}>
            <Note teinte="rouge" role="alert">
              <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
            </Note>
          </div>
        ) : null}
        <div className="sb-journal-histo" role="img" aria-label={`${visibles.length} événements sur la période`}>
          {barres.map((n, i) => (
            <span key={i} data-vide={n ? undefined : ""} style={{ height: n ? `${Math.max(8, (n / max) * 100)}%` : "1px" }} />
          ))}
        </div>
        <div className="sb-conseil-corps">
          <div className="sb-journal-table">
            {!dansPeriode ? (
              <div style={{ padding: 16, display: "grid", gap: 12 }}>
                {[0, 1, 2, 3].map((k) => (
                  <Squelette key={k} hauteur={16} />
                ))}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Module</th>
                    <th scope="col">Événement</th>
                    <th scope="col">Montant</th>
                    <th scope="col">État</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((c) => (
                    <tr
                      key={c.id}
                      aria-selected={c.id === choisie}
                      tabIndex={0}
                      onClick={() => setChoisie(c.id === choisie ? null : c.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setChoisie(c.id === choisie ? null : c.id);
                        }
                      }}
                    >
                      <td className="sb-mono">{dateLog(c.quand)}</td>
                      <td>{TYPE[c.colonne]}</td>
                      <td>{libelleModule(c.module)}</td>
                      <td title={c.complet}>{c.titre}</td>
                      <td className="sb-mono">{c.somme !== null ? montant(c.somme, c.devise) : "—"}</td>
                      <td>{c.etat ? <Badge teinte={c.etat.teinte}>{c.etat.libelle}</Badge> : c.colonne === "a_valider" ? <Badge teinte="ambre">En attente</Badge> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {dansPeriode && !visibles.length ? (
              <div className="sb-conseil-vide">
                <Search width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
                <p style={{ margin: 0 }}>Aucun événement</p>
                <span>Rien ne correspond à ces filtres sur la période.</span>
              </div>
            ) : null}
          </div>
          {carte ? (
            <aside className="sb-volet-detail" aria-label="Détail de l'événement">
              <div className="sb-volet-detail-tete">
                <span>{TYPE[carte.colonne]}</span>
                <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome v2-btn--icone" onClick={() => setChoisie(null)} aria-label="Fermer le détail">
                  <X width={14} height={14} aria-hidden="true" />
                </button>
              </div>
              <div className="sb-volet-detail-corps">
                <h3>Événement</h3>
                <p className="sb-texte--fort">{carte.complet}</p>
                <h3>Date</h3>
                <p className="v2-mono">{dateHeure(carte.quand)}</p>
                <h3>Module</h3>
                <p>{libelleModule(carte.module)}</p>
                {carte.somme !== null ? (
                  <>
                    <h3>Montant</h3>
                    <p>{montant(carte.somme, carte.devise)}</p>
                  </>
                ) : null}
                {carte.par ? (
                  <>
                    <h3>Demandé par</h3>
                    <p>{carte.par}</p>
                  </>
                ) : null}
                {carte.etat ? (
                  <>
                    <h3>État</h3>
                    <Badge teinte={carte.etat.teinte}>{carte.etat.libelle}</Badge>
                  </>
                ) : null}
                <Link href={carte.lien} className="v2-btn" style={{ width: "fit-content" }}>
                  Ouvrir
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
