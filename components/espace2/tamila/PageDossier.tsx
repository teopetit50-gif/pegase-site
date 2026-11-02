"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — la page d'un dossier (02/11/2026) : copie 1:1 de la page d'une
   Initiative de Linear (releves/linear-initiative.md). Seul le contenu change.

   En-tête : « Initiatives › nom » → « Dossiers › référence · intitulé » ;
   « … » : les gestes du dossier (B18 : exporter, clôturer, annuler la
   clôture, convertir l'audit ; B36 : membre, muraille ; L11 agenda, L12
   bordereau, L17 journal) ; « + » : ajouter (partie, délai, date fixée,
   audience, avis, pièce, pièce attendue, expertise, temps).
   Onglets Overview · Activity · Projects → Vue d'ensemble · Procédure ·
   Pièces · Honoraires · Conformité (DECOUPAGES.md § TAMILA).
   Vue d'ensemble : tuile, intitulé, résumé (RG, matière, juridiction),
   « Properties » (statut, mode, responsable, date clé), « Resources »
   (archives d'export), « Latest update » → la prochaine échéance et les
   décisions en attente (G9, G20), « Description » → les parties, puis le
   tableau « Projects » → les échéances (délais, audiences).
   Les autres onglets : le même tableau, groupé (In Progress / Planned →
   Délais, Audiences…), chaque ligne s'ouvre dans le volet (« Initiative
   details », ⌘ I) avec ses propriétés et ses gestes.
   Gestes : ceux de l'écran d'avant, à l'identique. Les composants de
   components/espace/tamila (DossierTamila, HonorairesTamila,
   ConformiteTamila, AttentesTamila, ExpertiseTamila, AnalysesTamila)
   tournent sans leurs cartes (`rendu`) : ils lisent, écrivent et ouvrent
   leurs fenêtres ; le dessin est celui de Linear. Un geste sans fenêtre
   qui écrit (retirer, lever, annuler une clôture, convertir, noter une
   étape, demander une lecture…) passe ici par une confirmation.
   Le dossier est lu une fois (useTamila().ouvrir : consultation, journal,
   clé) et gardé par le layout tant que l'onglet du navigateur vit.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DossierTamila, { type ApiDossier } from "@/components/espace/tamila/DossierTamila";
import HonorairesTamila, { MODES_HONORAIRES, MODES_REGLEMENT, NATURES_TEMPS, type ApiHonoraires } from "@/components/espace/tamila/HonorairesTamila";
import ConformiteTamila, { ACTIVITES, type ApiConformite } from "@/components/espace/tamila/ConformiteTamila";
import AttentesTamila, { type ApiAttentes } from "@/components/espace/tamila/AttentesTamila";
import ExpertiseTamila, { type ApiExpertise } from "@/components/espace/tamila/ExpertiseTamila";
import AnalysesTamila, { STATUTS_LECTURE, type ApiAnalyses } from "@/components/espace/tamila/AnalysesTamila";
import { TYPES_ANALYSE, libelleType } from "@/components/espace/tamila/analyses";
import * as portes from "@/components/espace/tamila/portes";
import {
  ACTES, NATURES_AUDIENCE, PROCEDURES, QUALITES, RAISONS, ROLES_CABINET, ROLES_DOSSIER, ROLES_PROCEDURE, STATUTS_AUDIENCE, STATUTS_AVIS, STATUTS_DELAI, STATUTS_DOSSIER, TYPES_AVIS,
  delaiCourt, joursAvant, libelleMatiere, libelleTerritoire, RESIDENCES,
} from "@/components/espace/tamila/regles";
import type { DossierComplet } from "@/components/espace/tamila/types";
import { RACINE } from "@/components/espace2/modules";
import { Avatar, TamCarte, TamMenu, type OptionMenu } from "./TamCadre";
import { TamIcone, type NomTamIcone } from "./TamIcone";
import { TamFenetre } from "./TamFenetre";
import { dateCourte, dateLongue, prioriteDe } from "./echeances";
import { copier, exporterCsv, useMemoire } from "./navigateur";
import { useTamila } from "./donnees";
import "./tam-liste.css";
import "./tam-initiative.css";

type Onglet = "apercu" | "procedure" | "pieces" | "honoraires" | "conformite";
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "apercu", libelle: "Vue d'ensemble" },
  { cle: "procedure", libelle: "Procédure" },
  { cle: "pieces", libelle: "Pièces" },
  { cle: "honoraires", libelle: "Honoraires" },
  { cle: "conformite", libelle: "Conformité" },
];

type Geste = { libelle: string; faire: () => void; confirmer?: string; danger?: boolean; desactive?: boolean; principal?: boolean };
type Details = { titre: string; props: [string, React.ReactNode][]; gestes: Geste[]; note?: string };
type Ligne = {
  cle: string;
  icone: NomTamIcone;
  couleur?: string;
  nom: string;
  sante?: { icone: NomTamIcone; couleur?: string; titre: string };
  priorite?: NomTamIcone;
  lead?: string | null;
  date?: { texte: string; retard?: boolean } | null;
  statut?: { texte: string; icone?: NomTamIcone; couleur?: string };
  details: Details;
};
type Groupe = { cle: string; titre: string; lignes: Ligne[]; plus?: Geste; vide?: string };
type Section = { cle: string; titre: string; groupes: Groupe[]; actions?: Geste[] };

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const duree = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
const VERT = "lch(67.2 64.37 141.95)";
const ROUGE = "lch(58% 73 29)";
const JAUNE = "lch(80 90 85)";

/* ——— le tableau « Projects » de Linear ——— */
/* les en-têtes de colonne de Linear trient les lignes de chaque groupe (tri gardé dans l'adresse : ?tri=) */
type Tri = "nom" | "sante" | "priorite" | "lead" | "date" | "statut";
const TRIS: { cle: Tri; libelle: string; col: string }[] = [
  { cle: "nom", libelle: "Nom", col: "titre" },
  { cle: "sante", libelle: "État", col: "sante" },
  { cle: "priorite", libelle: "Priorité", col: "priorite" },
  { cle: "lead", libelle: "Qui", col: "lead" },
  { cle: "date", libelle: "Date", col: "date" },
  { cle: "statut", libelle: "Statut", col: "statut" },
];
const valeurTri = (l: Ligne, tri: Tri): string => {
  switch (tri) {
    case "nom":
      return l.nom.toLowerCase();
    case "sante":
      return l.sante?.titre ?? "~";
    case "priorite":
      return l.priorite === "Priority0" || !l.priorite ? "9" : l.priorite.slice(-1);
    case "lead":
      return l.lead ?? "~";
    case "date":
      return l.date?.texte ?? "~";
    default:
      return l.statut?.texte ?? "~";
  }
};
function trier(lignes: Ligne[], tri: Tri | null) {
  return tri ? [...lignes].sort((a, b) => valeurTri(a, tri).localeCompare(valeurTri(b, tri), "fr", { numeric: true })) : lignes;
}

function Tableau({ section, choix, choisir, avecTete, tri, poserTri, selection, cocher }: { section: Section; choix: string | null; choisir: (cle: string) => void; avecTete: boolean; tri: Tri | null; poserTri: (t: Tri | null) => void; selection: Set<string>; cocher: (cle: string) => void }) {
  const [replies, setReplies] = useState<Record<string, boolean>>({});
  return (
    <div className={`tam-table${selection.size ? " tam-selection" : ""}`} role="table" aria-label={section.titre}>
      {avecTete ? (
        <div className="tam-table-tete" role="row">
          {TRIS.map((x) => (
            <button key={x.cle} type="button" className="tam-tri" data-col={x.col} style={{ gridColumn: x.col }} aria-pressed={tri === x.cle} title={`Trier par ${x.libelle.toLowerCase()}`} onClick={() => poserTri(tri === x.cle ? null : x.cle)}>
              {x.libelle}
              {tri === x.cle ? <TamIcone nom="Chevron" taille={12} style={{ transform: "rotate(90deg)" }} /> : null}
            </button>
          ))}
        </div>
      ) : null}
      {section.groupes.map((g) => (
        <div key={g.cle} role="rowgroup" style={{ display: "contents" }}>
          <div className="tam-table-groupe" role="row">
            <div className="tam-table-groupe-titre">
              <button type="button" className="tam-replier" aria-expanded={!replies[g.cle]} aria-label={replies[g.cle] ? "Déplier le groupe" : "Replier le groupe"} onClick={() => setReplies((r) => ({ ...r, [g.cle]: !r[g.cle] }))}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M5 6.5h6L8 10.5z" />
                </svg>
              </button>
              <h4>
                {g.titre} {g.lignes.length ? `· ${g.lignes.length}` : ""}
              </h4>
              {g.plus ? (
                <span className="tam-plus-groupe">
                  <button type="button" className="tam-rond" aria-label={g.plus.libelle} title={g.plus.libelle} disabled={g.plus.desactive} onClick={g.plus.faire}>
                    <TamIcone nom="Plus" />
                  </button>
                </span>
              ) : null}
            </div>
          </div>
          {replies[g.cle] ? null : g.lignes.length ? (
            trier(g.lignes, tri).map((l) => (
              <div key={l.cle} role="row" tabIndex={0} className="tam-table-ligne" aria-current={choix === l.cle} onClick={() => choisir(l.cle)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), choisir(l.cle))}>
                <button
                  type="button"
                  className="tam-case"
                  aria-pressed={selection.has(l.cle)}
                  aria-label={`Sélectionner ${l.nom}`}
                  style={{ gridColumn: "case" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    cocher(l.cle);
                  }}
                />
                <span className="tam-table-nom">
                  <span className="tam-table-icone" style={l.couleur ? { color: l.couleur } : undefined}>
                    <TamIcone nom={l.icone} />
                  </span>
                  <span>{l.nom}</span>
                </span>
                <span className="tam-table-cellule" data-col="sante" title={l.sante?.titre}>
                  {l.sante ? <TamIcone nom={l.sante.icone} style={l.sante.couleur ? { color: l.sante.couleur } : undefined} /> : null}
                </span>
                <span className="tam-table-cellule" data-col="priorite">
                  {l.priorite ? (
                    <span className="tam-ini-pilule" style={l.priorite === "Priority1" ? { color: "var(--tam-urgent)" } : undefined}>
                      <TamIcone nom={l.priorite} style={l.priorite === "Priority1" ? { color: "var(--tam-urgent)" } : undefined} />
                    </span>
                  ) : null}
                </span>
                <span className="tam-table-cellule" data-col="lead">
                  {l.lead !== undefined ? <Avatar nom={l.lead} taille={16} /> : null}
                </span>
                <span className="tam-table-cellule" data-col="date">
                  {l.date ? (
                    <span className="tam-ini-pilule">
                      <TamIcone nom={l.date.retard ? "CrossedOutCalendar" : "Calendar"} style={l.date.retard ? { color: ROUGE } : undefined} />
                      {l.date.texte}
                    </span>
                  ) : null}
                </span>
                <span className="tam-table-cellule" data-col="statut">
                  {l.statut ? (
                    <span className="tam-ini-pilule">
                      <TamIcone nom={l.statut.icone ?? "IssueStatusStarted"} style={l.statut.couleur ? { color: l.statut.couleur } : undefined} />
                      <span>{l.statut.texte}</span>
                    </span>
                  ) : null}
                </span>
              </div>
            ))
          ) : (
            <p className="tam-table-vide">{g.vide ?? "Rien pour l'instant."}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ——— la mise en page : en-tête, onglets, zone, volet ——— */
function Mise({ complet, api, onglet, haut, sections, menuPlus, fait, erreur }: { complet: DossierComplet; api: ApiDossier; onglet: Onglet; haut?: React.ReactNode; sections: Section[]; menuPlus: OptionMenu[]; fait?: string | null; erreur?: string | null }) {
  const t = useTamila();
  const chemin = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [volet, setVolet] = useState<boolean | null>(null);
  const [confirme, setConfirme] = useState<Geste | null>(null);
  const favoris = useMemoire("favoris");
  const suivis = useMemoire("suivis");
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const tri = (TRIS.find((x) => x.cle === params.get("tri"))?.cle ?? null) as Tri | null;
  const poserTri = (x: Tri | null) => {
    const q = new URLSearchParams(params.toString());
    if (x) q.set("tri", x);
    else q.delete("tri");
    router.replace(`${chemin}${q.size ? `?${q}` : ""}`, { scroll: false });
  };
  const cocher = (cle: string) =>
    setSelection((x) => {
      const n = new Set(x);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });
  const favori = favoris.a(`dossier:${complet.dossier.id}`);
  const suivi = suivis.a(`dossier:${complet.dossier.id}`);
  const choix = params.get("choix");
  const d = complet.dossier;
  const clair = complet.clair;
  const lignes = sections.flatMap((s) => s.groupes.flatMap((g) => g.lignes));
  const choisie = lignes.find((l) => l.cle === choix) ?? null;
  const voletOuvert = volet ?? !!choisie;
  const aller = (o: Onglet, c: string | null = null) => {
    const q = new URLSearchParams();
    if (o !== "apercu") q.set("onglet", o);
    if (c) q.set("choix", c);
    const t0 = params.get("tri");
    if (t0) q.set("tri", t0);
    router.replace(`${chemin}${q.size ? `?${q}` : ""}`, { scroll: false });
  };
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        setVolet((v) => !(v ?? !!choisie));
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [choisie]);
  const geste = (g: Geste) => (g.confirmer ? setConfirme(g) : g.faire());
  const s = STATUTS_DOSSIER[d.statut];

  const actions: OptionMenu[] = [
    { libelle: "Exporter le dossier…", icone: "Archive", action: () => api.ouvrir({ type: "export" }), desactive: !["attente", "ouvert", "audit", "clos"].includes(d.statut) },
    ...(["ouvert", "audit"].includes(d.statut) && !d.demande_cloture_id ? [{ libelle: "Clôturer le dossier…", icone: "Lock" as NomTamIcone, action: () => api.ouvrir({ type: "cloture" }), desactive: !api.peutGerer }] : []),
    ...(d.statut === "clos" && api.gerant
      ? [{ libelle: "Annuler la clôture…", icone: "Refresh" as NomTamIcone, action: () => setConfirme({ libelle: "Annuler la clôture", confirmer: "Le dossier est rouvert au statut d'avant ; l'effacement programmé est retiré.", faire: () => void api.simple(() => portes.annulerCloture(d.id), () => ({ ...complet, dossier: { ...d, statut: d.statut_avant_cloture ?? "ouvert", clos_le: null, demande_cloture_id: null, statut_avant_cloture: null, effacement_prevu_le: null } }), "La clôture est annulée : le dossier est rouvert.") }) }]
      : []),
    ...(d.statut === "audit" && api.gerant
      ? [{ libelle: "Convertir l'audit en dossier…", icone: "Refresh" as NomTamIcone, action: () => setConfirme({ libelle: "Convertir l'audit en dossier", confirmer: "L'audit devient un dossier ordinaire : plus d'effacement programmé.", faire: () => void api.simple(() => portes.convertirAudit(d.id), () => ({ ...complet, dossier: { ...d, statut: "ouvert", effacement_prevu_le: null } }), "L'audit devient un dossier ordinaire : plus d'effacement programmé.") }) }]
      : []),
    "sep",
    { libelle: "Ajouter une personne au dossier…", icone: "Members", action: () => api.ouvrir({ type: "membre" }), desactive: !api.peutGerer },
    { libelle: "Poser une muraille…", icone: "Shield", action: () => api.ouvrir({ type: "muraille" }), desactive: !api.gerant || !["attente", "ouvert", "audit"].includes(d.statut) },
    "sep",
    { libelle: "Agenda des audiences (.ics)", icone: "Calendar", action: api.exporterAgenda, desactive: !complet.audiences.some((a) => a.statut === "prevue") },
    { libelle: "Dossier de faits", icone: "Book", href: `${RACINE}/tamila/dossiers/${d.id}/faits` },
    { libelle: "Bordereau de pièces", icone: "Page", action: api.bordereau, desactive: !complet.pieces.length || !api.clairLisible },
    { libelle: "Journal des accès (CSV)", icone: "Policy", action: api.exporterJournal, desactive: !complet.lectures.length },
  ];

  return (
    <TamCarte>
      <div className="tam-tete">
        <div className="tam-ligne1">
          <nav className="tam-ini-fil" aria-label="Fil">
            <Link href={`${RACINE}/tamila?vue=dossiers`}>Dossiers</Link>
            <span className="tam-ini-sep" aria-hidden="true">
              ›
            </span>
            <span className="tam-ini-nom">
              <TamIcone nom="Briefcase" />
              <h2>{clair ? `${clair.reference} · ${clair.intitule}` : "Dossier chiffré"}</h2>
            </span>
          </nav>
          <button type="button" className="tam-rond" aria-pressed={favori} aria-label={favori ? "Désépingler le dossier" : "Épingler le dossier"} title={favori ? "Désépingler (le dossier quitte « Épinglés » de la vue d'ensemble)" : "Épingler en tête de la vue d'ensemble"} onClick={() => favoris.basculer(`dossier:${d.id}`)}>
            <TamIcone nom={favori ? "Favorite" : "Etoile"} />
          </button>
          <TamMenu libelle="Actions du dossier" options={actions} />
          <div className="tam-pousse" />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button type="button" className="tam-rond tam-rond--petit" aria-label="Copier l'adresse de la page" title="Copier l'adresse de la page" onClick={() => void navigator.clipboard?.writeText(window.location.href)}>
              <TamIcone nom="LienUrl" />
            </button>
            <button type="button" className="tam-rond" aria-pressed={suivi} aria-label={suivi ? "Ne plus suivre le dossier" : "Suivre le dossier"} title={suivi ? "Ne plus suivre (ses avis ne remontent plus en tête des Arrivées)" : "Suivre : ses avis reçus passent en tête des Arrivées, marqués « suivi »"} onClick={() => suivis.basculer(`dossier:${d.id}`)} style={suivi ? { color: "var(--tam-violet)" } : undefined}>
              <TamIcone nom="Subscribe" />
            </button>
            <TamMenu libelle="Ajouter" icone="Plus" alignement="droite" options={menuPlus} />
          </div>
        </div>
        <div className="tam-ligne2">
          <div className="tam-ini-onglets" role="tablist" aria-label="Parties du dossier">
            {ONGLETS.map((o) => (
              <button key={o.cle} type="button" role="tab" aria-selected={onglet === o.cle} className="tam-onglet" onClick={() => aller(o.cle)}>
                {o.libelle}
              </button>
            ))}
            <button type="button" className="tam-rond" aria-label="Agenda des audiences (.ics)" title="Agenda des audiences (.ics)" onClick={api.exporterAgenda} disabled={!complet.audiences.some((a) => a.statut === "prevue")}>
              <TamIcone nom="CustomView" />
            </button>
          </div>
          <div className="tam-pousse" />
          <button type="button" className="tam-rond tam-rond--plein" aria-label={voletOuvert ? "Fermer les détails du dossier" : "Ouvrir les détails du dossier"} aria-expanded={voletOuvert} aria-keyshortcuts="Meta+I" title="Détails (⌘ I)" onClick={() => setVolet(!voletOuvert)}>
            <TamIcone nom="Volet" />
          </button>
        </div>
      </div>
      <div className="tam-ini-corps">
        <div className="tam-ini-zone">
          {fait || erreur ? (
            <p className="tam-bandeau" role={erreur ? "alert" : "status"} style={{ maxWidth: 805, margin: "16px auto 0" }}>
              {erreur ?? fait}
            </p>
          ) : null}
          {haut ? <div className="tam-ini-colonne">{haut}</div> : null}
          {sections.map((sec, i) => (
            <section key={sec.cle} className={`tam-ini-section${!haut && i === 0 ? " tam-ini-section--haut" : ""}`} aria-label={sec.titre}>
              <div className="tam-ini-section-tete">
                <h3>{sec.titre}</h3>
                {(sec.actions ?? []).map((a) => (
                  <button key={a.libelle} type="button" className="tam-ini-bulle" disabled={a.desactive} onClick={() => geste(a)}>
                    {a.libelle}
                  </button>
                ))}
                {i === 0 ? (
                  <>
                    <TamMenu
                      libelle="Affichage"
                      icone="Affichage"
                      alignement="droite"
                      classe="tam-rond tam-rond--plein"
                      options={[
                        ...TRIS.map((x) => ({ libelle: `Trier par ${x.libelle.toLowerCase()}${tri === x.cle ? " ✓" : ""}`, icone: "Affichage" as NomTamIcone, action: () => poserTri(x.cle) })),
                        "sep" as const,
                        { libelle: "Ordre d'origine", icone: "Refresh" as NomTamIcone, action: () => poserTri(null), desactive: !tri },
                        { libelle: "Exporter le tableau (CSV)", icone: "Spreadsheet" as NomTamIcone, action: () => exporterCsv(`dossier-${sec.cle}`, [["Groupe", "Nom", "État", "Qui", "Date", "Statut"], ...sec.groupes.flatMap((g) => g.lignes.map((l) => [g.titre, l.nom, l.sante?.titre ?? "", l.lead ?? "", l.date?.texte ?? "", l.statut?.texte ?? ""]))]) },
                      ]}
                    />
                    <TamMenu libelle="Ajouter" icone="Plus" alignement="droite" classe="tam-rond tam-rond--plein" options={menuPlus} />
                  </>
                ) : null}
              </div>
              <Tableau section={sec} choix={choix} choisir={(c) => aller(onglet, c === choix ? null : c)} avecTete={i === 0} tri={tri} poserTri={poserTri} selection={selection} cocher={cocher} />
            </section>
          ))}
        </div>
        {voletOuvert ? (
          <aside className="tam-ini-volet" aria-label="Détails du dossier">
            {choisie ? (
              <div className="tam-volet-carte">
                <div className="tam-volet-titre">{choisie.details.titre}</div>
                {choisie.details.props.map(([k, v], i) => (
                  <div key={i} className="tam-ini-prop">
                    <span>{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
                {choisie.details.note ? <p className="tam-evenement-volet">{choisie.details.note}</p> : null}
                {choisie.details.gestes.length ? (
                  <div className="tam-ini-gestes">
                    {choisie.details.gestes.map((g) => (
                      <button key={g.libelle} type="button" className={`tam-bouton${g.principal ? " tam-bouton--principal" : ""}${g.danger ? " tam-bouton--danger" : ""}`} disabled={g.desactive || api.envoi} onClick={() => geste(g)}>
                        {g.libelle}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="tam-volet-carte">
              <div className="tam-volet-titre">Propriétés</div>
              <div className="tam-ini-prop">
                <span>Statut</span>
                <span>{s.libelle}</span>
              </div>
              <div className="tam-ini-prop">
                <span>Responsable</span>
                <span>
                  <Avatar nom={d.responsable_id ? t.nomDe(d.responsable_id) : null} />
                  {d.responsable_id ? t.nomDe(d.responsable_id) : "Aucun"}
                </span>
              </div>
              <div className="tam-ini-prop">
                <span>Matière</span>
                <span>{libelleMatiere(d.matiere)}</span>
              </div>
              <div className="tam-ini-prop">
                <span>Juridiction</span>
                <span>{d.juridiction ?? "—"}</span>
              </div>
              <div className="tam-ini-prop">
                <span>Siège</span>
                <span>{libelleTerritoire(d.territoire)}</span>
              </div>
              <div className="tam-ini-prop">
                <span>Ouvert le</span>
                <span>{d.ouvert_le ? dateLongue(d.ouvert_le) : "—"}</span>
              </div>
              {d.audit_fin_le ? (
                <div className="tam-ini-prop">
                  <span>Fin d&apos;audit</span>
                  <span>{dateLongue(d.audit_fin_le)}</span>
                </div>
              ) : null}
              {d.clos_le ? (
                <div className="tam-ini-prop">
                  <span>Clos le</span>
                  <span>{dateLongue(d.clos_le)}</span>
                </div>
              ) : null}
              {d.effacement_prevu_le ? (
                <div className="tam-ini-prop">
                  <span>Effacement</span>
                  <span style={{ color: ROUGE }}>{dateLongue(d.effacement_prevu_le)}</span>
                </div>
              ) : null}
              <div className="tam-ini-prop">
                <span>Clé</span>
                <span data-vide={complet.cle ? undefined : ""}>{complet.cle ? `Active · ${complet.cle.fournisseur === "scaleway" ? "coffre" : "phrase"}` : t.source === "exemple" ? "Exemple" : "Fermée"}</span>
              </div>
            </div>
            <div className="tam-volet-carte">
              <div className="tam-volet-titre" style={{ justifyContent: "space-between" }}>
                Activité
                <button type="button" className="tam-ini-bulle" style={{ height: 24, background: "transparent" }} onClick={api.exporterJournal} disabled={!complet.lectures.length}>
                  Exporter
                </button>
              </div>
              {complet.lectures.slice(0, 5).map((l, i) => (
                <p key={i} className="tam-evenement-volet">
                  <Avatar nom={t.nomDe(l.user_id)} taille={16} />
                  <span>
                    <b>{t.nomDe(l.user_id)}</b> {l.contexte === "export" ? "a demandé un export" : l.contexte === "export.telechargement" ? "a téléchargé l'archive" : "a consulté le dossier"} · {dateCourte(l.lu_le)}
                  </span>
                </p>
              ))}
              {!complet.lectures.length ? <p className="tam-evenement-volet">Aucune lecture enregistrée.</p> : null}
            </div>
          </aside>
        ) : null}
      </div>
      {selection.size ? (
        <div className="tam-barre-selection" role="toolbar" aria-label="Actions sur la sélection">
          <span>
            {selection.size} sélectionnée{selection.size > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="tam-bouton"
            onClick={() =>
              void copier(
                lignes
                  .filter((l) => selection.has(l.cle))
                  .map((l) => `- ${l.nom}${l.date ? ` · ${l.date.texte}` : ""}${l.statut ? ` · ${l.statut.texte}` : ""}`)
                  .join("\n"),
              ).then((ok) => setMessage(ok ? "Sélection copiée pour l'assistant." : "Le presse-papier a refusé la copie."))
            }
          >
            Copier pour l&apos;assistant
          </button>
          <button type="button" className="tam-bouton" onClick={() => exporterCsv(`dossier-${clair?.reference ?? "selection"}`, [["Nom", "État", "Qui", "Date", "Statut"], ...lignes.filter((l) => selection.has(l.cle)).map((l) => [l.nom, l.sante?.titre ?? "", l.lead ?? "", l.date?.texte ?? "", l.statut?.texte ?? ""])])}>
            Exporter (CSV)
          </button>
          <button type="button" className="tam-rond" aria-label="Tout désélectionner" onClick={() => setSelection(new Set())}>
            <TamIcone nom="StatusCanceled" />
          </button>
        </div>
      ) : null}
      {message ? (
        <p className="tam-barre-selection" role="status" style={{ bottom: selection.size ? 76 : 24 }}>
          {message}
          <button type="button" className="tam-rond" aria-label="Fermer" onClick={() => setMessage(null)}>
            <TamIcone nom="StatusCanceled" />
          </button>
        </p>
      ) : null}
      <TamFenetre
        titre={confirme?.libelle ?? ""}
        sous={confirme?.confirmer}
        ouverte={!!confirme}
        fermer={() => setConfirme(null)}
        pied={
          <button
            type="button"
            className={`tam-bouton ${confirme?.danger ? "tam-bouton--danger" : "tam-bouton--principal"}`}
            onClick={() => {
              confirme?.faire();
              setConfirme(null);
            }}
          >
            {confirme?.libelle}
          </button>
        }
      >
        <p className="tam-note">Le geste est enregistré dès que vous confirmez.</p>
      </TamFenetre>
    </TamCarte>
  );
}

/* ——— la page ——— */
export default function PageDossier({ id }: { id: string }) {
  const t = useTamila();
  const params = useSearchParams();
  const o = params.get("onglet");
  const onglet: Onglet = ONGLETS.some((x) => x.cle === o) ? (o as Onglet) : "apercu";
  const { ouvrir } = t;
  useEffect(() => {
    ouvrir(id);
  }, [id, ouvrir]);
  const ligne = t.lignes.find((x) => x.dossier.id === id) ?? null;
  const complet = t.complet(id);
  const cle = t.cle(id);

  const evenementsTemps = useMemo(() => (complet ? { audiences: complet.audiences, delais: complet.delais, avis: complet.avis } : { audiences: [], delais: [], avis: [] }), [complet]);

  if (!complet) {
    return (
      <TamCarte>
        <div className="tam-tete">
          <div className="tam-ligne1">
            <nav className="tam-ini-fil">
              <Link href={`${RACINE}/tamila?vue=dossiers`}>Dossiers</Link>
              <span className="tam-ini-sep">›</span>
              <span className="tam-ini-nom">
                <h2>{ligne?.clair?.reference ?? "Dossier"}</h2>
              </span>
            </nav>
          </div>
        </div>
        <p className="tam-vide-liste" style={{ padding: "64px 48px" }}>
          {t.pret && !ligne ? "Ce dossier n'existe pas ou n'est pas dans votre vue." : t.enLecture(id) || !t.pret ? "Lecture du dossier (la consultation est tracée au journal des accès)…" : t.erreur ?? "Lecture du dossier…"}
        </p>
      </TamCarte>
    );
  }

  const d = complet.dossier;
  const onLocal = (c: DossierComplet) => t.remplacerLocal(c);
  const relire = () => t.relireDossier(id);

  return (
    <DossierTamila
      key={d.id}
      complet={complet}
      source={t.source}
      moi={t.moi}
      personnes={t.personnes}
      regles={t.regles}
      reglages={t.reglages}
      cle={cle}
      clientId={t.clientId}
      onLocal={onLocal}
      relire={relire}
      referenceDe={t.referenceDe}
      rendu={(api) => {
        const nomPartie = (pid: string) => complet.partiesClair[pid]?.nom ?? "nom chiffré";
        const avecCle = t.source === "exemple" || !!cle;
        const menuPlus: OptionMenu[] = [
          { libelle: "Partie…", icone: "Users", action: () => api.ouvrir({ type: "partie" }), desactive: !api.peutEcrire || !avecCle },
          { libelle: complet.appel ? "Modifier l'appel…" : "Déclarer l'appel…", icone: "Judge", action: () => api.ouvrir({ type: "appel" }, complet.appel ? { introduit: complet.appel.introduit_le, role: complet.appel.role_client, procedure: complet.appel.procedure, territoire: complet.appel.territoire } : undefined), desactive: !api.peutEcrire },
          { libelle: "Délai de procédure…", icone: "Hourglass", action: () => api.ouvrir({ type: "delai_regle" }), desactive: !api.peutEcrire || !complet.appel },
          { libelle: "Date fixée par le juge…", icone: "Calendar", action: () => api.ouvrir({ type: "delai_date" }), desactive: !api.peutEcrire },
          { libelle: "Audience…", icone: "Clock", action: () => api.ouvrir({ type: "audience" }, { juridiction: d.juridiction ?? "" }), desactive: !api.peutEcrire },
          { libelle: "Avis RPVA…", icone: "Email", action: () => api.ouvrir({ type: "avis" }), desactive: !api.peutEcrire || !["ouvert", "audit"].includes(d.statut) },
          { libelle: "Pièce…", icone: "Attachment", action: () => api.ouvrir({ type: "piece" }), desactive: !api.peutEcrire || !avecCle },
        ];

        /* ——— les échéances : délais et audiences (B20, B21) ——— */
        const delais = [...complet.delais].sort((a, b) => (delaiCourt(a) === delaiCourt(b) ? a.echeance_retenue.localeCompare(b.echeance_retenue) : delaiCourt(a) ? -1 : 1));
        const ligneDelai = (x: (typeof delais)[number]): Ligne => {
          const st = STATUTS_DELAI[x.statut];
          const court = delaiCourt(x);
          const j = joursAvant(x.echeance_retenue);
          const dem = complet.demandes.find((y) => y.id === x.demande_id) ?? null;
          const regle = api.regleDe(x.regle_code);
          const gestes: Geste[] = [];
          if (court && api.peutEcrire) {
            if (x.statut !== "confirme" && dem) gestes.push({ libelle: "Confirmer", principal: true, desactive: !api.avocat || !api.peutDecider(dem), faire: () => api.ouvrir({ type: "confirmer", delai: x, demande: dem }, { decision: "approuve" }) });
            gestes.push({ libelle: "Corriger la date", desactive: !api.avocat, faire: () => api.ouvrir({ type: "corriger", delai: x }, { echeance: x.echeance_retenue }) });
            if (x.nature === "regle" && (regle?.interruptible ?? true) && x.statut !== "interrompu") gestes.push({ libelle: "Interrompre", desactive: !api.avocat, faire: () => api.ouvrir({ type: "interrompre", delai: x }) });
            gestes.push({ libelle: "Acte déposé", desactive: !api.avocat, faire: () => api.ouvrir({ type: "acte", delai: x }) });
            gestes.push({ libelle: "Annuler", desactive: !api.avocat, faire: () => api.ouvrir({ type: "annuler", delai: x }) });
          }
          return {
            cle: `delai:${x.id}`,
            icone: "Hourglass",
            nom: `${ACTES[x.acte]}${regle ? ` (art. ${regle.article})` : x.nature === "date_fixee" ? " (date fixée)" : ""}`,
            sante: court ? (j < 0 ? { icone: "Alert", couleur: ROUGE, titre: "Échéance dépassée" } : x.statut === "a_confirmer" ? { icone: "Alert", couleur: JAUNE, titre: "À confirmer" } : { icone: "Resolved", couleur: VERT, titre: "Dans les temps" }) : undefined,
            priorite: court ? prioriteDe(x.echeance_retenue).icone : "Priority0",
            lead: x.responsable_id ? t.nomDe(x.responsable_id) : null,
            date: { texte: dateCourte(x.echeance_retenue), retard: court && j < 0 },
            statut: { texte: court ? (j < 0 ? `J+${-j}` : `J-${j}`) : st.libelle, icone: x.statut === "a_confirmer" ? "IssueStatusTodo" : court ? "IssueStatusStarted" : "IssueStatusDone", couleur: court && x.statut !== "a_confirmer" ? JAUNE : undefined },
            details: {
              titre: ACTES[x.acte],
              props: [
                ["Statut", st.libelle],
                ["Échéance", dateLongue(x.echeance_retenue)],
                ...(x.calcul?.detail ? ([["Calcul", x.calcul.detail]] as [string, string][]) : []),
                ...(regle ? ([["Règle", `${regle.libelle_court} (art. ${regle.article}) · sanction : ${regle.sanction}`]] as [string, string][]) : []),
                ...(x.raisons.length ? ([["À vérifier", x.raisons.map((r) => RAISONS[r] ?? r).join(" ; ")]] as [string, string][]) : []),
                ...(x.confirme_le ? ([["Confirmé", `${dateCourte(x.confirme_le)} par ${t.nomDe(x.confirme_par)}`]] as [string, string][]) : []),
                ...(x.acte_depose_le ? ([["Acte déposé", dateLongue(x.acte_depose_le)]] as [string, string][]) : []),
                ...(x.motif_correction ? ([["Correction", x.motif_correction]] as [string, string][]) : []),
              ],
              gestes,
            },
          };
        };
        const audiences = [...complet.audiences].sort((a, b) => a.date_heure.localeCompare(b.date_heure));
        const ligneAudience = (a: (typeof audiences)[number]): Ligne => {
          const st = STATUTS_AUDIENCE[a.statut];
          const prevue = a.statut === "prevue";
          return {
            cle: `audience:${a.id}`,
            icone: "Judge",
            nom: `${NATURES_AUDIENCE[a.nature]}${a.chambre ? ` · ${a.chambre}` : ""}`,
            sante: prevue ? { icone: "Resolved", couleur: VERT, titre: "Prévue" } : undefined,
            priorite: prevue ? prioriteDe(a.date_heure).icone : "Priority0",
            lead: a.avocat_id ? t.nomDe(a.avocat_id) : null,
            date: { texte: dateCourte(a.date_heure) },
            statut: { texte: st.libelle, icone: prevue ? "IssueStatusTodo" : "IssueStatusDone" },
            details: {
              titre: NATURES_AUDIENCE[a.nature],
              props: [
                ["Date", a.heure_connue ? new Date(a.date_heure).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : dateLongue(a.date_heure)],
                ["Juridiction", [a.juridiction, a.chambre].filter(Boolean).join(" · ") || "—"],
                ["Plaide", t.nomDe(a.avocat_id)],
                ["Statut", st.libelle],
                ["Source", a.source === "avis" ? "Venue d'un avis RPVA" : "Saisie"],
              ],
              gestes: prevue && api.peutEcrire ? [{ libelle: "Renvoyer, tenue ou annulée", faire: () => api.ouvrir({ type: "renvoyer", audience: a }, { statut: "renvoyee" }) }] : [],
            },
          };
        };
        const groupesEcheances: Groupe[] = [
          { cle: "delais", titre: "Délais de procédure", lignes: delais.map(ligneDelai), plus: { libelle: "Poser un délai", faire: () => api.ouvrir({ type: "delai_regle" }), desactive: !api.peutEcrire || !complet.appel }, vide: complet.appel ? "Aucun délai." : "Déclarez d'abord l'appel : sa date fixe le régime." },
          { cle: "audiences", titre: "Audiences", lignes: audiences.map(ligneAudience), plus: { libelle: "Ajouter une audience", faire: () => api.ouvrir({ type: "audience" }, { juridiction: d.juridiction ?? "" }), desactive: !api.peutEcrire }, vide: "Aucune audience." },
        ];

        /* ——— les parties (B19) ——— */
        const ligneParties: Ligne[] = complet.parties.map((p) => ({
          cle: `partie:${p.id}`,
          icone: p.qualite === "client" ? "CurrentUser" : p.qualite === "adverse" ? "Users" : "Members",
          nom: api.partiesLisibles ? nomPartie(p.id) : "Nom lisible après une lecture tracée",
          lead: undefined,
          statut: { texte: QUALITES[p.qualite], icone: p.qualite === "client" ? "IssueStatusStarted" : "IssueStatusTodo" },
          details: {
            titre: api.partiesLisibles ? nomPartie(p.id) : "Partie",
            props: [
              ["Qualité", QUALITES[p.qualite]],
              ["Rôle", p.role_procedure ? ROLES_PROCEDURE[p.role_procedure] : "—"],
              ["Demeure", RESIDENCES.find((r) => r.code === p.residence)?.libelle ?? p.residence],
              ["Courriels", complet.partiesClair[p.id]?.courriels ?? "—"],
            ],
            gestes: api.peutEcrire
              ? [
                  { libelle: "Résidence", faire: () => api.ouvrir({ type: "residence", partie: p }, { residence: p.residence }) },
                  { libelle: "Retirer", danger: true, confirmer: `« ${nomPartie(p.id)} » sort du dossier.`, faire: () => void api.simple(() => portes.retirerPartie(p.id), () => ({ ...complet, parties: complet.parties.filter((x) => x.id !== p.id) }), "La partie est retirée.") },
                ]
              : [],
          },
        }));

        /* ——— la vue d'ensemble ——— */
        if (onglet === "apercu") {
          const prochain = delais.find(delaiCourt) ?? null;
          const audience = audiences.find((a) => a.statut === "prevue" && joursAvant(a.date_heure) >= 0) ?? null;
          const decisions = complet.demandes.filter((x) => x.statut === "en_attente" && x.type_action !== "confirmer_delai");
          const j = prochain ? joursAvant(prochain.echeance_retenue) : null;
          const sante = !prochain ? { texte: "Aucun délai en cours", ton: "vert" } : j! < 0 ? { texte: "En retard", ton: "rouge" } : prochain.statut === "a_confirmer" ? { texte: "À confirmer", ton: "jaune" } : { texte: "Dans les temps", ton: "vert" };
          const exportsPrets = complet.exports.filter((x) => x.statut === "pret");
          const haut = (
            <>
              <div className="tam-ini-tuile">
                <TamIcone nom="Briefcase" taille={24} />
              </div>
              <h1 className="tam-ini-titre">{complet.clair?.intitule ?? "Intitulé chiffré"}</h1>
              <p className="tam-ini-resume">{[complet.clair?.numero_rg ? `RG ${complet.clair.numero_rg}` : null, libelleMatiere(d.matiere), d.mode === "dommage_corporel" ? "Dommage corporel" : "Contentieux", d.juridiction].filter(Boolean).join(" · ")}</p>
              <div className="tam-ini-rangee">
                <h3>Propriétés</h3>
                <div className="tam-ini-pilules">
                  <span className="tam-ini-pilule">
                    <TamIcone nom={d.statut === "clos" ? "IssueStatusDone" : d.statut === "attente" ? "IssueStatusTriage" : "IssueStatusStarted"} style={{ color: d.statut === "clos" ? "var(--tam-fait)" : d.statut === "attente" ? "var(--tam-triage)" : JAUNE }} />
                    {STATUTS_DOSSIER[d.statut].libelle}
                  </span>
                  <span className="tam-ini-pilule">
                    <TamIcone nom={prochain ? prioriteDe(prochain.echeance_retenue).icone : "Priority0"} />
                    {prochain ? prioriteDe(prochain.echeance_retenue).libelle : "Aucune échéance"}
                  </span>
                  <span className="tam-ini-pilule">
                    <Avatar nom={d.responsable_id ? t.nomDe(d.responsable_id) : null} />
                    {d.responsable_id ? t.nomDe(d.responsable_id) : "Responsable"}
                  </span>
                  <span className="tam-ini-pilule">
                    <TamIcone nom="Calendar" />
                    {d.effacement_prevu_le ? `Effacé le ${dateCourte(d.effacement_prevu_le)}` : d.audit_fin_le ? `Audit jusqu'au ${dateCourte(d.audit_fin_le)}` : complet.appel?.cloture_previsible_le ? `Clôture le ${dateCourte(complet.appel.cloture_previsible_le)}` : `Ouvert le ${dateCourte(d.ouvert_le ?? d.cree_le)}`}
                  </span>
                  <TamMenu libelle="Plus de propriétés" options={menuPlus} />
                </div>
              </div>
              <div className="tam-ini-rangee">
                <h3>Ressources</h3>
                <div className="tam-ini-pilules">
                  {exportsPrets.map((x) => (
                    <button key={x.id} type="button" className="tam-ini-pilule" onClick={() => void api.telecharger(x)}>
                      <TamIcone nom="LienUrl" />
                      Archive du {dateCourte(x.pret_le ?? x.cree_le)} <TamIcone nom="Fleche" taille={12} />
                    </button>
                  ))}
                  {!exportsPrets.length ? (
                    <span className="tam-ini-pilule" data-vide="">
                      <TamIcone nom="LienUrl" />
                      Aucune archive prête
                    </span>
                  ) : null}
                  <button type="button" className="tam-rond" aria-label="Exporter le dossier" title="Exporter le dossier" onClick={() => api.ouvrir({ type: "export" })} disabled={!["attente", "ouvert", "audit", "clos"].includes(d.statut)}>
                    <TamIcone nom="Plus" />
                  </button>
                </div>
              </div>
              <div className="tam-ini-maj">
                <div className="tam-ini-maj-tete">
                  <h3>Prochaine échéance</h3>
                  <button type="button" className="tam-nouveau" onClick={() => api.ouvrir({ type: "delai_regle" })} disabled={!api.peutEcrire || !complet.appel}>
                    <TamIcone nom="Write" />
                    <span className="tam-nouveau-libelle">Délai</span>
                  </button>
                </div>
                <div className="tam-ini-maj-meta">
                  <span className="tam-ini-sante" data-ton={sante.ton}>
                    <TamIcone nom={sante.ton === "vert" ? "Resolved" : "Alert"} />
                    {sante.texte}
                  </span>
                  <Avatar nom={prochain?.responsable_id ? t.nomDe(prochain.responsable_id) : null} />
                  <span>{prochain?.responsable_id ? t.nomDe(prochain.responsable_id) : t.nomDe(d.responsable_id)}</span>
                  <span>{prochain && j !== null ? (j < 0 ? `${-j} jours de retard` : `dans ${j} jours`) : ""}</span>
                </div>
                <p className="tam-ini-texte">
                  {prochain ? `${ACTES[prochain.acte]} avant le ${dateLongue(prochain.echeance_retenue)}${prochain.statut === "a_confirmer" ? " — délai calculé, à confirmer par un avocat." : "."}` : "Aucun délai de procédure en cours."}
                  {audience ? `\nAudience (${NATURES_AUDIENCE[audience.nature].toLowerCase()}) le ${dateLongue(audience.date_heure)}${audience.chambre ? `, ${audience.chambre}` : ""}.` : ""}
                  {decisions.map((x) => `\nDécision en attente : ${x.resume}.`).join("")}
                </p>
                <div className="tam-ini-actions">
                  {/* les deux boutons de la carte « Latest update » de Linear (commentaires, réaction) */}
                  <button
                    type="button"
                    className="tam-ini-bulle"
                    title="Copier pour l'assistant : un résumé en clair du dossier"
                    aria-label="Copier pour l'assistant"
                    onClick={() =>
                      void copier(
                        [
                          `Dossier ${complet.clair?.reference ?? ""} — ${complet.clair?.intitule ?? ""}`,
                          [complet.clair?.numero_rg ? `RG ${complet.clair.numero_rg}` : null, libelleMatiere(d.matiere), d.juridiction].filter(Boolean).join(" · "),
                          `Statut : ${STATUTS_DOSSIER[d.statut].libelle} ; responsable : ${t.nomDe(d.responsable_id)}`,
                          ...delais.filter(delaiCourt).map((x) => `Délai : ${ACTES[x.acte]} avant le ${dateLongue(x.echeance_retenue)} (${STATUTS_DELAI[x.statut].libelle})`),
                          ...audiences.filter((a) => a.statut === "prevue").map((a) => `Audience : ${NATURES_AUDIENCE[a.nature]} le ${dateLongue(a.date_heure)}`),
                        ].join("\n"),
                      )
                    }
                  >
                    <TamIcone nom="Comment" />
                  </button>
                  <button type="button" className="tam-rond" title="Copier l'adresse de cette page" aria-label="Copier l'adresse de cette page" onClick={() => void copier(window.location.href)}>
                    <TamIcone nom="LienUrl" />
                  </button>
                  {prochain && prochain.statut === "a_confirmer" ? (() => {
                    const dem = complet.demandes.find((y) => y.id === prochain.demande_id) ?? null;
                    return dem ? (
                      <button type="button" className="tam-ini-bulle" disabled={!api.avocat || !api.peutDecider(dem)} onClick={() => api.ouvrir({ type: "confirmer", delai: prochain, demande: dem }, { decision: "approuve" })}>
                        <TamIcone nom="Resolved" /> Confirmer le délai
                      </button>
                    ) : null;
                  })() : null}
                  {prochain && api.peutEcrire ? (
                    <button type="button" className="tam-ini-bulle" disabled={!api.avocat} onClick={() => api.ouvrir({ type: "acte", delai: prochain })}>
                      <TamIcone nom="Signature" /> Acte déposé
                    </button>
                  ) : null}
                  {decisions.map((x) => (
                    <span key={x.id} style={{ display: "contents" }}>
                      <button type="button" className="tam-ini-bulle" disabled={!api.peutDecider(x)} onClick={() => api.ouvrir({ type: "decider", demande: x }, { decision: "approuve" })}>
                        <TamIcone nom="Resolved" /> Approuver
                      </button>
                      <button type="button" className="tam-ini-bulle" disabled={!api.peutDecider(x)} onClick={() => api.ouvrir({ type: "decider", demande: x }, { decision: "rejete" })}>
                        <TamIcone nom="StatusCanceled" /> Refuser
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="tam-ini-desc">
                <h3>Parties</h3>
                <div className="tam-ini-desc-texte">
                  {api.partiesLisibles ? (
                    complet.parties.length ? (
                      complet.parties.map((p) => (
                        <p key={p.id}>
                          <b>{QUALITES[p.qualite]}</b> : {nomPartie(p.id)}
                          {p.role_procedure ? `, ${ROLES_PROCEDURE[p.role_procedure].toLowerCase()}` : ""} — demeure : {RESIDENCES.find((r) => r.code === p.residence)?.libelle ?? p.residence}.
                        </p>
                      ))
                    ) : (
                      <p>Aucune partie : le bouton « + » de l&apos;en-tête en ajoute une ; chaque nom est chiffré dans votre navigateur.</p>
                    )
                  ) : (
                    <p>Les parties se lisent après une lecture tracée du dossier.</p>
                  )}
                </div>
              </div>
            </>
          );
          return <Mise complet={complet} api={api} onglet={onglet} haut={haut} menuPlus={menuPlus} fait={api.fait} erreur={api.erreur} sections={[{ cle: "echeances", titre: "Échéances", groupes: groupesEcheances }]} />;
        }

        /* ——— Procédure : appel, délais, audiences, avis RPVA (B35), expertise (B24) ——— */
        if (onglet === "procedure") {
          const appel = complet.appel;
          const ligneAppel: Ligne[] = appel
            ? [
                {
                  cle: "appel",
                  icone: "Judge",
                  nom: `Appel introduit le ${dateCourte(appel.introduit_le)} — ${PROCEDURES[appel.procedure as keyof typeof PROCEDURES] ?? appel.procedure}`,
                  lead: d.responsable_id ? t.nomDe(d.responsable_id) : null,
                  date: { texte: dateCourte(appel.introduit_le) },
                  statut: { texte: appel.regime === "cpc" ? "CPC 2024" : "CPC 2017", icone: "IssueStatusStarted", couleur: JAUNE },
                  details: {
                    titre: "L'appel",
                    props: [
                      ["Introduit le", dateLongue(appel.introduit_le)],
                      ["Régime", appel.regime === "cpc" ? "Décret 2023-1391 (depuis le 1er septembre 2024)" : "Régime antérieur"],
                      ["Procédure", PROCEDURES[appel.procedure as keyof typeof PROCEDURES] ?? appel.procedure],
                      ["Client", ROLES_PROCEDURE[appel.role_client as keyof typeof ROLES_PROCEDURE] ?? appel.role_client],
                      ["Cour", libelleTerritoire(appel.territoire)],
                      ["Clôture", appel.cloture_previsible_le ? dateLongue(appel.cloture_previsible_le) : "—"],
                    ],
                    gestes: api.peutEcrire ? [{ libelle: "Modifier l'appel", faire: () => api.ouvrir({ type: "appel" }, { introduit: appel.introduit_le, role: appel.role_client, procedure: appel.procedure, territoire: appel.territoire }) }] : [],
                  },
                },
              ]
            : [];
          const lignesAvis: Ligne[] = complet.avis.map((a) => ({
            cle: `avis:${a.id}`,
            icone: "Email",
            nom: TYPES_AVIS[a.type_avis] ?? a.type_avis,
            sante: a.rg_concorde === false ? { icone: "Alert", couleur: ROUGE, titre: "Le n° RG ne concorde pas" } : undefined,
            date: { texte: dateCourte(a.date_avis) },
            statut: { texte: STATUTS_AVIS[a.statut]?.libelle ?? a.statut, icone: a.statut === "applique" ? "IssueStatusDone" : "IssueStatusTodo" },
            details: {
              titre: TYPES_AVIS[a.type_avis] ?? "Avis RPVA",
              props: [
                ["Reçu le", dateLongue(a.date_avis)],
                ["Statut", STATUTS_AVIS[a.statut]?.libelle ?? a.statut],
                ["Confiance", a.confiance === "saisie" ? "Saisi" : a.confiance === "gabarit" ? "Lu (gabarit)" : "Proposé par le modèle"],
                ...(a.effet ? ([["Effet", a.effet]] as [string, string][]) : []),
                ...(a.date_audience ? ([["Audience", dateLongue(a.date_audience)]] as [string, string][]) : []),
                ...(a.date_limite ? ([["Date limite", dateLongue(a.date_limite)]] as [string, string][]) : []),
              ],
              gestes: [],
            },
          }));
          return (
            <ExpertiseTamila
              dossier={d}
              source={t.source}
              peutEcrire={api.peutEcrire}
              rendu={(ex: ApiExpertise) => {
                const lignesEx: Ligne[] = ex.liste.map((x) => ({
                  cle: `expertise:${x.id}`,
                  icone: "Report",
                  nom: `Expertise ${x.mission === "judiciaire" ? "judiciaire" : "amiable"}${x.ordonnee_le ? ` ordonnée le ${dateCourte(x.ordonnee_le)}` : ""}`,
                  sante: ex.etapes.some((e) => ex.etat(x, e)?.teinte === "rouge") ? { icone: "Alert", couleur: ROUGE, titre: "Étape en retard" } : { icone: "Resolved", couleur: VERT, titre: "À jour" },
                  date: x.rapport_attendu_le ? { texte: dateCourte(x.rapport_attendu_le) } : null,
                  statut: { texte: x.statut === "en_cours" ? "En cours" : x.statut === "deposee" ? "Rapport déposé" : "Abandonnée", icone: x.statut === "en_cours" ? "IssueStatusStarted" : "IssueStatusDone", couleur: x.statut === "en_cours" ? JAUNE : undefined },
                  details: {
                    titre: "Expertise",
                    props: ex.etapes.map((e) => [e.libelle.replace(/ reçu$| versée$| adressés$/, ""), ex.etat(x, e)?.texte ?? "—"] as [string, string]),
                    gestes:
                      ex.peutEcrire && x.statut === "en_cours"
                        ? [
                            { libelle: "Dates", faire: () => ex.ouvrir(x) },
                            ...ex.etapes.filter((e) => !x[e.fait]).map((e) => ({ libelle: e.libelle, confirmer: `${e.libelle}, noté à la date du jour.`, faire: () => void ex.noter(x, e) })),
                          ]
                        : [],
                  },
                }));
                return (
                  <Mise
                    complet={complet}
                    api={api}
                    onglet={onglet}
                    menuPlus={menuPlus}
                    fait={ex.fait ?? api.fait}
                    erreur={ex.erreur ?? api.erreur}
                    sections={[
                      {
                        cle: "procedure",
                        titre: "Procédure",
                        groupes: [
                          { cle: "appel", titre: "Appel", lignes: ligneAppel, plus: { libelle: appel ? "Modifier l'appel" : "Déclarer l'appel", faire: () => api.ouvrir({ type: "appel" }), desactive: !api.peutEcrire }, vide: "L'appel n'est pas déclaré." },
                          ...groupesEcheances,
                          { cle: "avis", titre: "Avis RPVA", lignes: lignesAvis, plus: { libelle: "Saisir un avis", faire: () => api.ouvrir({ type: "avis" }), desactive: !api.peutEcrire || !["ouvert", "audit"].includes(d.statut) }, vide: "Aucun avis." },
                          { cle: "expertise", titre: "Expertise", lignes: lignesEx, plus: { libelle: "Expertise ordonnée", faire: () => ex.ouvrir(null), desactive: !ex.peutEcrire }, vide: ex.chargee ? "Aucune expertise." : "Lecture…" },
                        ],
                      },
                    ]}
                  />
                );
              }}
            />
          );
        }

        /* ——— Pièces : pièces (B28), pièces attendues (B22), lectures (B26) ——— */
        if (onglet === "pieces") {
          const LECTURE: Record<string, string> = { lue: "Lue", a_rattacher: "Attend l'ouverture", en_lecture: "En lecture", echec: "Échec", rejetee: "Rejetée", a_verifier: "À vérifier", recue: "Reçue" };
          const lignesPieces: Ligne[] = complet.pieces.map((p) => ({
            cle: `piece:${p.id}`,
            icone: "PdfFile",
            nom: p.nom_fichier,
            sante: p.statut === "echec" || p.statut === "rejetee" ? { icone: "Alert", couleur: ROUGE, titre: LECTURE[p.statut] } : undefined,
            lead: p.depose_par ? t.nomDe(p.depose_par) : null,
            date: { texte: dateCourte(p.recue_le) },
            statut: { texte: LECTURE[p.statut] ?? p.statut, icone: p.statut === "lue" ? "IssueStatusDone" : "IssueStatusTodo" },
            details: {
              titre: p.nom_fichier,
              props: [
                ["Statut", LECTURE[p.statut] ?? p.statut],
                ["Nature", p.type_piece ? (TYPES_AVIS[p.type_piece as keyof typeof TYPES_AVIS] ?? p.type_piece) : "—"],
                ["Déposée", `${dateLongue(p.recue_le)} par ${t.nomDe(p.depose_par)}`],
                ["Taille", `${Math.round(p.octets / 1024)} Ko${p.chiffrement ? " · chiffrée" : ""}`],
                ...(p.motif ? ([["Motif", p.motif === "CHIFFREMENT_NON_PRIS_EN_CHARGE" ? "Le lecteur ne lit pas encore les pièces chiffrées" : p.motif]] as [string, string][]) : []),
              ],
              gestes: [],
            },
          }));
          return (
            <AttentesTamila
              dossier={d}
              source={t.source}
              cle={cle}
              peutEcrire={api.peutEcrire}
              rendu={(at: ApiAttentes) => (
                <AnalysesTamila
                  dossier={d}
                  source={t.source}
                  cle={cle}
                  pieces={complet.pieces}
                  clair={complet.clair}
                  peutDemander={api.peutEcrire && api.avocat}
                  auCoffre={complet.cle?.fournisseur === "scaleway"}
                  rendu={(an: ApiAnalyses) => {
                    const DE: Record<string, string> = { client: "Du client", confrere: "Du confrère", tiers: "D'un tiers" };
                    const lignesAt: Ligne[] = at.liste
                      .filter((a) => a.statut === "attendue")
                      .map((a) => {
                        const due = !!a.relance_le && joursAvant(a.relance_le) <= 0;
                        return {
                          cle: `attente:${a.id}`,
                          icone: "Hourglass",
                          nom: at.objets[a.id] ?? "objet chiffré",
                          sante: due ? { icone: "Alert", couleur: ROUGE, titre: "Relance due" } : undefined,
                          date: a.relance_le ? { texte: dateCourte(a.relance_le), retard: due } : null,
                          statut: { texte: DE[a.de], icone: "IssueStatusTodo" },
                          details: {
                            titre: at.objets[a.id] ?? "Pièce attendue",
                            props: [
                              ["De", DE[a.de]],
                              ["Demandée le", dateLongue(a.demandee_le)],
                              ["Relance", a.relance_le ? (due ? "Due" : `Le ${dateLongue(a.relance_le)}`) : "—"],
                              ["Relances", String(a.relances)],
                            ],
                            gestes: at.peutEcrire
                              ? [
                                  { libelle: "Reçue", confirmer: "La pièce est notée reçue.", faire: () => void at.noter(a, "recue") },
                                  { libelle: "Relancée", confirmer: "Relance notée ; la prochaine dans sept jours.", faire: () => void at.noter(a, "relancee") },
                                  { libelle: "Abandonner", danger: true, confirmer: "L'attente est abandonnée.", faire: () => void at.noter(a, "abandon") },
                                ]
                              : [],
                          },
                        };
                      });
                    const lignesLectures: Ligne[] = an.liste.map((a) => ({
                      cle: `lecture:${a.id}`,
                      icone: "Book",
                      nom: libelleType(a.type),
                      sante: a.comptes?.critique ? { icone: "Alert", couleur: ROUGE, titre: `${a.comptes.critique} critique(s)` } : undefined,
                      date: { texte: dateCourte(a.demandee_le) },
                      statut: { texte: STATUTS_LECTURE[a.statut].libelle, icone: a.statut === "finie" ? "IssueStatusDone" : "IssueStatusStarted" },
                      details: {
                        titre: libelleType(a.type),
                        props: [
                          ["Statut", STATUTS_LECTURE[a.statut].libelle],
                          ["Demandée le", dateLongue(a.demandee_le)],
                          ["Pièces", `${a.pieces.length}${a.pieces_non_lues?.length ? `, ${a.pieces_non_lues.length} non lue(s)` : ""}`],
                          ...(a.comptes?.attention ? ([["À vérifier", String(a.comptes.attention)]] as [string, string][]) : []),
                          ...(a.motif ? ([["Motif", a.motif]] as [string, string][]) : []),
                        ],
                        gestes: a.statut === "finie" || a.statut === "partielle" ? [{ libelle: "Lire", principal: true, faire: () => void an.lire(a) }] : [],
                      },
                    }));
                    const peutLire = !an.envoi && an.peutDemander && an.vivant && (t.source === "exemple" || an.auCoffre);
                    return (
                      <Mise
                        complet={complet}
                        api={api}
                        onglet={onglet}
                        menuPlus={[...menuPlus, "sep", { libelle: "Pièce attendue…", icone: "Hourglass", action: at.demander, desactive: !at.peutEcrire || (t.source === "reelle" && !cle) }]}
                        fait={at.fait ?? an.fait ?? api.fait}
                        erreur={at.erreur ?? an.erreur ?? api.erreur}
                        sections={[
                          {
                            cle: "pieces",
                            titre: "Pièces",
                            actions: [{ libelle: "Bordereau", faire: api.bordereau, desactive: !complet.pieces.length || !api.clairLisible }],
                            groupes: [
                              { cle: "pieces", titre: "Pièces du dossier", lignes: lignesPieces, plus: { libelle: "Déposer une pièce", faire: () => api.ouvrir({ type: "piece" }), desactive: !api.peutEcrire || !avecCle }, vide: "Aucune pièce. Chaque pièce est chiffrée dans votre navigateur avec la clé du dossier avant de partir." },
                              { cle: "attentes", titre: "Pièces attendues", lignes: lignesAt, plus: { libelle: "Demander une pièce", faire: at.demander, desactive: !at.peutEcrire || (t.source === "reelle" && !cle) }, vide: at.chargee ? "Rien n'est attendu du client, du confrère ou d'un tiers." : "Lecture…" },
                            ],
                          },
                          {
                            cle: "lectures",
                            titre: "Lectures du dossier",
                            actions: (Object.keys(TYPES_ANALYSE) as portes.TypeAnalyse[]).map((k) => ({
                              libelle: TYPES_ANALYSE[k].libelle,
                              desactive: !peutLire,
                              confirmer: `${TYPES_ANALYSE[k].aide} Le lecteur lit les pièces chiffrées au coffre ; une lecture longue a un coût.`,
                              faire: () => void an.demander(k),
                            })),
                            groupes: [{ cle: "lectures", titre: "Lectures demandées", lignes: lignesLectures, vide: t.source === "reelle" && !an.auCoffre ? "La clé de ce dossier est sous la phrase du cabinet : les lectures longues demandent le coffre à clés." : "Aucune lecture demandée." }],
                          },
                        ]}
                      />
                    );
                  }}
                />
              )}
            />
          );
        }

        /* ——— Honoraires (B30-B32) ——— */
        if (onglet === "honoraires") {
          const peutGererAvocat = api.peutGerer && api.avocat;
          const peutEncaisser = peutGererAvocat || (api.associe && !complet.murailles.some((m) => m.user_id === t.moi?.user_id && !m.leve_le));
          const clientNom = (() => {
            const p = complet.parties.find((x) => x.qualite === "client");
            return p ? (complet.partiesClair[p.id]?.nom ?? null) : null;
          })();
          return (
            <HonorairesTamila
              dossier={d}
              source={t.source}
              moi={t.moi}
              personnes={t.personnes}
              pieces={complet.pieces}
              cle={cle}
              peutEcrire={api.peutEcrire}
              peutGerer={peutGererAvocat}
              peutEncaisser={peutEncaisser}
              clientId={t.clientId}
              gerant={api.gerant}
              entete={t.reglages?.facture_entete ?? {}}
              clair={complet.clair}
              clientNom={clientNom}
              evenements={evenementsTemps}
              rendu={(h: ApiHonoraires) => {
                const c = h.h?.convention ?? null;
                const lConv: Ligne[] = c
                  ? [
                      {
                        cle: "convention",
                        icone: "Signature",
                        nom: `${MODES_HONORAIRES[c.mode]}${c.taux_horaire_cents ? ` · ${euros(c.taux_horaire_cents)} / h` : ""}${c.forfait_cents ? ` · forfait ${euros(c.forfait_cents)}` : ""}`,
                        sante: c.statut === "signee" ? { icone: "Resolved", couleur: VERT, titre: "Signée" } : { icone: "Alert", couleur: JAUNE, titre: "À signer" },
                        date: c.signee_le ? { texte: dateCourte(c.signee_le) } : null,
                        statut: { texte: c.statut === "signee" ? "Signée" : c.urgence ? "Urgence" : "Proposée", icone: c.statut === "signee" ? "IssueStatusDone" : "IssueStatusTodo" },
                        details: {
                          titre: "Convention d'honoraires",
                          props: [
                            ["Mode", MODES_HONORAIRES[c.mode]],
                            ["Taux", c.taux_horaire_cents ? `${euros(c.taux_horaire_cents)} HT / h` : "—"],
                            ["Forfait", c.forfait_cents ? euros(c.forfait_cents) : "—"],
                            ["Résultat", c.complement_resultat_pct ? `${c.complement_resultat_pct} %` : "—"],
                            ["TVA", `${c.taux_tva} %`],
                            ...(h.forfait?.pct !== null && h.forfait?.pct !== undefined ? ([["Forfait consommé", `${h.forfait.pct} %`]] as [string, string][]) : []),
                          ],
                          gestes: [
                            ...(c.statut === "proposee" && h.peutGerer ? [{ libelle: "Enregistrer la signature", principal: true, faire: () => h.ouvrir({ type: "signer", convention: c }) }] : []),
                            ...(h.peutGerer && h.forfait ? [{ libelle: "Temps prévu du forfait", faire: () => h.ouvrir({ type: "forfait" }, { heures_prevues: h.forfait?.prevues ? String(h.forfait.prevues / 60).replace(".", ",") : "" }) }] : []),
                            ...(h.peutGerer ? [{ libelle: "Nouvelle convention", faire: () => h.ouvrir({ type: "convention" }) }] : []),
                          ],
                        },
                      },
                    ]
                  : [];
                const lProps: Ligne[] = h.propositions.slice(0, 5).map((p) => ({
                  cle: `proposition:${p.origine}`,
                  icone: "Clock",
                  nom: p.libelle,
                  date: { texte: dateCourte(p.jour) },
                  statut: { texte: duree(p.minutes), icone: "IssueStatusTodo" },
                  details: {
                    titre: "Proposé à la saisie",
                    props: [
                      ["Événement", p.libelle],
                      ["Durée", duree(p.minutes)],
                      ["Nature", NATURES_TEMPS[p.nature]],
                    ],
                    gestes: [
                      { libelle: "Saisir", principal: true, faire: () => h.saisirProposition(p) },
                      { libelle: "Ignorer", confirmer: `« ${p.libelle} » ne vous sera plus proposé.`, faire: () => void h.ignorer(p) },
                    ],
                  },
                }));
                const lTemps: Ligne[] = (h.h?.temps ?? [])
                  .filter((x) => x.statut !== "annule")
                  .map((x) => ({
                    cle: `temps:${x.id}`,
                    icone: "Clock",
                    nom: h.descriptions[x.id] ?? (x.description_chiffree ? "description chiffrée" : NATURES_TEMPS[x.nature]),
                    lead: t.nomDe(x.user_id),
                    date: { texte: dateCourte(x.jour) },
                    statut: { texte: duree(x.minutes), icone: x.statut === "facture" ? "IssueStatusDone" : "IssueStatusStarted", couleur: x.statut === "facture" ? undefined : JAUNE },
                    details: {
                      titre: NATURES_TEMPS[x.nature],
                      props: [
                        ["Jour", dateLongue(x.jour)],
                        ["Durée", duree(x.minutes)],
                        ["Par", t.nomDe(x.user_id)],
                        ["Facturable", x.facturable ? "Oui" : "Non"],
                        ["Statut", x.statut === "facture" ? "Facturé" : "Saisi"],
                      ],
                      gestes: x.statut === "saisi" && (x.user_id === t.moi?.user_id || h.peutGerer) && h.peutEcrire ? [{ libelle: "Annuler", danger: true, confirmer: "Le temps est annulé.", faire: () => void h.annulerTemps(x) }] : [],
                    },
                  }));
                const lProvisions: Ligne[] = (h.h?.provisions ?? []).map((p) => ({
                  cle: `provision:${p.id}`,
                  icone: "Euro",
                  nom: `Provision de ${euros(p.montant_ttc_cents)} TTC`,
                  date: { texte: dateCourte(p.recue_le ?? p.demandee_le) },
                  statut: { texte: p.statut === "recue" ? "Reçue" : p.statut === "demandee" ? "Demandée" : "Annulée", icone: p.statut === "recue" ? "IssueStatusDone" : "IssueStatusTodo" },
                  details: {
                    titre: "Provision",
                    props: [
                      ["Montant", `${euros(p.montant_ttc_cents)} TTC`],
                      ["Demandée", dateLongue(p.demandee_le)],
                      ["Reçue", p.recue_le ? `${dateLongue(p.recue_le)}${p.mode_reglement ? ` · ${MODES_REGLEMENT[p.mode_reglement]}` : ""}` : "—"],
                    ],
                    gestes: p.statut === "demandee" && h.peutEncaisser ? [{ libelle: "Reçue", principal: true, faire: () => h.ouvrir({ type: "recue", provision: p }) }] : [],
                  },
                }));
                const lFactures: Ligne[] = (h.h?.factures ?? []).map((f) => ({
                  cle: `facture:${f.id}`,
                  icone: "Page",
                  nom: `${f.nature === "compte_definitif" ? "Compte détaillé définitif" : "Facture"} ${f.numero} · ${euros(f.total_ttc_cents)} TTC`,
                  sante: f.statut === "emise" && joursAvant(f.emise_le) < -30 ? { icone: "Alert", couleur: ROUGE, titre: "Impayée depuis plus de 30 jours" } : undefined,
                  date: { texte: dateCourte(f.emise_le) },
                  statut: { texte: f.statut === "payee" ? "Payée" : f.statut === "annulee" ? "Annulée" : `Reste ${euros(f.reste_du_cents)}`, icone: f.statut === "payee" ? "IssueStatusDone" : f.statut === "annulee" ? "StatusCanceled" : "IssueStatusStarted", couleur: f.statut === "emise" ? JAUNE : undefined },
                  details: {
                    titre: `Facture ${f.numero}`,
                    props: [
                      ["Émise le", dateLongue(f.emise_le)],
                      ["HT", euros(f.total_ht_cents)],
                      ["TVA", euros(f.tva_cents)],
                      ["TTC", euros(f.total_ttc_cents)],
                      ["Provisions", euros(f.provisions_imputees_cents)],
                      ["Reste dû", euros(f.reste_du_cents)],
                    ],
                    gestes: [
                      ...(f.statut !== "annulee" ? [{ libelle: "Imprimer", faire: () => h.imprimer(f) }] : []),
                      ...(f.statut === "emise" && h.peutEncaisser ? [{ libelle: "Payée", principal: true, faire: () => h.ouvrir({ type: "payee", facture: f }) }] : []),
                      ...(f.statut === "emise" && h.peutGerer ? [{ libelle: "Annuler", danger: true, faire: () => h.ouvrir({ type: "annuler_facture", facture: f }) }] : []),
                    ],
                  },
                }));
                const r = h.resume;
                return (
                  <Mise
                    complet={complet}
                    api={api}
                    onglet={onglet}
                    menuPlus={[...menuPlus, "sep", { libelle: "Temps…", icone: "Clock", action: () => h.ouvrir({ type: "temps" }), desactive: !h.peutEcrire || !h.h }]}
                    fait={h.fait ?? api.fait}
                    erreur={h.erreur ?? api.erreur}
                    sections={[
                      {
                        cle: "honoraires",
                        titre: r ? `Honoraires · ${euros(r.aFacturerHt)} HT à facturer (${duree(r.minutes)})` : "Honoraires",
                        actions: [
                          { libelle: "Saisir du temps", desactive: !h.peutEcrire || !h.h, faire: () => h.ouvrir({ type: "temps" }) },
                          { libelle: "Provision", desactive: !h.peutGerer || !h.h, faire: () => h.ouvrir({ type: "provision" }) },
                          { libelle: "Facturer", desactive: !h.peutGerer || !r?.peutFacturer, faire: () => h.ouvrir({ type: "facturer" }) },
                        ],
                        groupes: [
                          { cle: "convention", titre: r?.sansConvention ? "Convention · pas de convention signée depuis plus de 15 jours" : "Convention", lignes: lConv, plus: { libelle: "Poser la convention", faire: () => h.ouvrir({ type: "convention" }), desactive: !h.peutGerer || !h.h }, vide: h.chargee ? "Aucune convention." : "Lecture…" },
                          { cle: "propositions", titre: "Proposé à la saisie", lignes: lProps, vide: "Rien à proposer." },
                          { cle: "temps", titre: "Temps passé", lignes: lTemps, plus: { libelle: "Saisir du temps", faire: () => h.ouvrir({ type: "temps" }), desactive: !h.peutEcrire || !h.h }, vide: "Aucun temps saisi." },
                          { cle: "provisions", titre: `Provisions${r ? ` · ${euros(r.provisionsDispo)} disponibles` : ""}`, lignes: lProvisions, vide: "Aucune provision." },
                          { cle: "factures", titre: `Factures${r ? ` · ${euros(r.resteDu)} restant dus` : ""}`, lignes: lFactures, vide: "Aucune facture." },
                        ],
                      },
                    ]}
                  />
                );
              }}
            />
          );
        }

        /* ——— Conformité : conflits et vigilance d'abord (RIN art. 4), parties, qui voit, exports, journal ——— */
        return (
          <ConformiteTamila
            dossier={d}
            source={t.source}
            clientId={t.clientId}
            parties={complet.parties}
            partiesClair={complet.partiesClair}
            pieces={complet.pieces}
            peutEcrire={api.peutEcrire}
            peutGerer={api.peutGerer && api.avocat}
            gerant={api.gerant}
            referenceDe={t.referenceDe}
            rendu={(cf: ApiConformite) => {
              const v = cf.conf?.vigilance ?? null;
              const lConflits: Ligne[] = cf.resultats.map((r) => ({
                cle: `controle:${r.controle.controle}`,
                icone: "Users",
                nom: r.nom,
                sante: r.controle.conflits ? { icone: "Alert", couleur: ROUGE, titre: "Conflit" } : { icone: "Resolved", couleur: VERT, titre: "Aucun conflit" },
                statut: { texte: r.decision ? "Décidé" : r.controle.conflits ? "Conflit" : r.controle.correspondances ? "Déjà connu" : "Aucune correspondance", icone: r.decision ? "IssueStatusDone" : "IssueStatusTodo" },
                details: {
                  titre: r.nom,
                  props: [
                    ["Correspondances", String(r.controle.correspondances)],
                    ["Conflits", String(r.controle.conflits)],
                    ["Hors vue", String(r.controle.hors_vue)],
                    ["Dossiers", r.controle.trouves.map((x) => (x.dossier ? (t.referenceDe(x.dossier) ?? "dossier chiffré") : "effacé")).join(", ") || "—"],
                  ],
                  gestes: !r.decision && cf.peutGerer ? [{ libelle: "Décider", principal: true, faire: () => cf.decider(r) }] : [],
                },
              }));
              const lVig: Ligne[] = cf.conf
                ? [
                    {
                      cle: "vigilance",
                      icone: "Shield",
                      nom: v ? (v.assujetti ? `Assujetti : ${v.activite ? ACTIVITES[v.activite] : "activité à préciser"}` : "Non assujetti") : "Vigilance LCB-FT à faire",
                      sante: cf.conf.vigilance_a_faire ? { icone: "Alert", couleur: JAUNE, titre: "À faire" } : { icone: "Resolved", couleur: VERT, titre: "Faite" },
                      date: v?.revue_le ? { texte: dateCourte(v.revue_le) } : null,
                      statut: { texte: v?.risque ? `Risque ${v.risque}` : v ? "Revue" : "À faire", icone: v ? "IssueStatusDone" : "IssueStatusTodo" },
                      details: {
                        titre: "Vigilance LCB-FT",
                        props: [
                          ["Assujetti", v ? (v.assujetti ? "Oui" : "Non") : "—"],
                          ["Activité", v?.activite ? ACTIVITES[v.activite] : "—"],
                          ["Identification", v?.identification_le ? dateLongue(v.identification_le) : "—"],
                          ["Bénéficiaire", v?.beneficiaire_effectif_le ? dateLongue(v.beneficiaire_effectif_le) : "—"],
                          ["Risque", v?.risque ?? "—"],
                        ],
                        gestes: cf.peutGerer ? [{ libelle: "Vigilance LCB-FT", principal: true, faire: cf.vigilance }] : [],
                      },
                    },
                  ]
                : [];
              const lMembres: Ligne[] = complet.membres.map((m) => ({
                cle: `membre:${m.id}`,
                icone: "CurrentUser",
                nom: t.nomDe(m.user_id),
                lead: t.nomDe(m.user_id),
                date: m.jusqu_au ? { texte: `jusqu'au ${dateCourte(m.jusqu_au)}` } : { texte: dateCourte(m.ajoute_le) },
                statut: { texte: ROLES_DOSSIER[m.role_dossier], icone: "IssueStatusStarted" },
                details: {
                  titre: t.nomDe(m.user_id),
                  props: [
                    ["Rôle", ROLES_DOSSIER[m.role_dossier]],
                    ["Au cabinet", ROLES_CABINET[t.personnes.find((p) => p.user_id === m.user_id)?.role ?? "lecteur"]],
                    ["Entré le", dateLongue(m.ajoute_le)],
                    ["Jusqu'au", m.jusqu_au ? dateLongue(m.jusqu_au) : "—"],
                  ],
                  gestes:
                    api.peutGerer || m.user_id === t.moi?.user_id
                      ? [{ libelle: "Retirer", danger: true, confirmer: `${t.nomDe(m.user_id)} sort du dossier.`, faire: () => void api.simple(() => portes.retirerMembre(d.id, m.user_id), () => ({ ...complet, membres: complet.membres.filter((x) => x.id !== m.id) }), `${t.nomDe(m.user_id)} sort du dossier.`) }]
                      : [],
                },
              }));
              const lMurailles: Ligne[] = complet.murailles.map((m) => ({
                cle: `muraille:${m.id}`,
                icone: "Lock",
                nom: t.nomDe(m.user_id),
                sante: m.leve_le ? undefined : { icone: "Lock", couleur: ROUGE, titre: "En place" },
                date: { texte: dateCourte(m.pose_le) },
                statut: { texte: m.leve_le ? "Levée" : m.demande_levee_id ? "Levée demandée" : "En place", icone: m.leve_le ? "IssueStatusDone" : "IssueStatusTodo" },
                details: {
                  titre: "Muraille",
                  props: [
                    ["Personne", t.nomDe(m.user_id)],
                    ["Posée", `${dateLongue(m.pose_le)} par ${t.nomDe(m.pose_par)}`],
                    ["Levée", m.leve_le ? `${dateLongue(m.leve_le)} par ${t.nomDe(m.leve_par)}` : "—"],
                    ["Motif", m.motif_chiffre ? "Motif chiffré, lu par les associés" : "Sans motif"],
                  ],
                  gestes:
                    !m.leve_le && !m.demande_levee_id && api.gerant && m.user_id !== t.moi?.user_id
                      ? [
                          {
                            libelle: "Demander la levée",
                            confirmer: "La levée est demandée : un gérant la décide.",
                            faire: () =>
                              void api.simple(
                                () => portes.demanderLeveeMuraille(m.id),
                                () => ({ ...complet, murailles: complet.murailles.map((x) => (x.id === m.id ? { ...x, demande_levee_id: "demande" } : x)), demandes: [...complet.demandes, { id: crypto.randomUUID(), type_action: "lever_muraille", objet_id: d.id, resume: "Levée d'une muraille sur un dossier", payload: { muraille_id: m.id }, statut: "en_attente", cree_le: new Date().toISOString(), roles_autorises: ["gerant"] }] }),
                                "La levée est demandée : un gérant la décide.",
                              ),
                          },
                        ]
                      : [],
                },
              }));
              const EXPORT: Record<string, string> = { pret: "Prêt", a_preparer: "En préparation", echec: "Échec", expire: "Expiré" };
              const lExports: Ligne[] = complet.exports.map((x) => ({
                cle: `export:${x.id}`,
                icone: "Archive",
                nom: `Archive demandée le ${dateCourte(x.cree_le)}`,
                lead: t.nomDe(x.demande_par),
                date: x.expire_le ? { texte: `jusqu'au ${dateCourte(x.expire_le)}` } : null,
                statut: { texte: EXPORT[x.statut] ?? x.statut, icone: x.statut === "pret" ? "IssueStatusDone" : "IssueStatusStarted" },
                details: {
                  titre: "Export du dossier",
                  props: [
                    ["Statut", EXPORT[x.statut] ?? x.statut],
                    ["Taille", x.octets ? `${Math.round(x.octets / 1048576)} Mo` : "—"],
                    ["Disponible", x.expire_le ? `jusqu'au ${dateLongue(x.expire_le)}` : "—"],
                    ["Téléchargé", `${x.telechargements} fois`],
                    ["Empreinte", x.empreinte_manifeste ? `${x.empreinte_manifeste.slice(0, 16)}…` : "—"],
                  ],
                  note: `Archive conservée ${t.reglages?.conservation_exports_jours ?? 7} jours, puis purgée. Le téléchargement est tracé.`,
                  gestes: x.statut === "pret" ? [{ libelle: "Télécharger l'archive", principal: true, faire: () => void api.telecharger(x) }] : [],
                },
              }));
              const lJournal: Ligne[] = [
                {
                  cle: "journal",
                  icone: "Policy",
                  nom: `${complet.lectures.length} lecture${complet.lectures.length > 1 ? "s" : ""} au journal des accès`,
                  date: complet.lectures[0] ? { texte: dateCourte(complet.lectures[0].lu_le) } : null,
                  statut: { texte: "Tracé", icone: "IssueStatusDone" },
                  details: {
                    titre: "Journal des accès",
                    props: complet.lectures.slice(0, 30).map((l) => [new Date(l.lu_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }), `${t.nomDe(l.user_id)} · ${l.contexte === "export" ? "export" : l.contexte === "export.telechargement" ? "téléchargement" : "consultation"}`] as [string, string]),
                    gestes: [{ libelle: "Exporter (CSV)", faire: api.exporterJournal, desactive: !complet.lectures.length }],
                  },
                },
              ];
              const bandeaux = [
                cf.conf && !cf.conf.index ? "Le cabinet n'a pas encore de clé d'index : le gérant la crée dans les réglages, une fois." : null,
                cf.conf?.conflits_sans_decision ? `${cf.conf.conflits_sans_decision} conflit(s) d'intérêts sans décision (RIN art. 4).` : null,
                cf.jamaisIndexees ? `${cf.jamaisIndexees} partie(s) jamais contrôlée(s).` : null,
              ].filter(Boolean);
              return (
                <Mise
                  complet={complet}
                  api={api}
                  onglet={onglet}
                  menuPlus={menuPlus}
                  fait={cf.fait ?? api.fait}
                  erreur={cf.erreur ?? api.erreur ?? (bandeaux.length ? bandeaux.join(" ") : null)}
                  sections={[
                    {
                      cle: "conformite",
                      titre: "Conformité",
                      actions: [
                        { libelle: "Contrôler les conflits", desactive: !cf.conf?.index || !cf.nomsLisibles || cf.envoi, faire: () => void cf.controler() },
                        { libelle: "Vigilance LCB-FT", desactive: !cf.peutGerer || !cf.conf, faire: cf.vigilance },
                        ...(cf.conf && !cf.conf.index && cf.gerant ? [{ libelle: "Créer la clé d'index", confirmer: "La clé d'index du cabinet est créée une fois pour toutes.", faire: () => void cf.creerIndex() }] : []),
                      ],
                      groupes: [
                        { cle: "conflits", titre: "Conflits d'intérêts", lignes: lConflits, vide: cf.conf?.dernier_controle ? `Dernier contrôle le ${dateCourte(cf.conf.dernier_controle.le)} : ${cf.conf.dernier_controle.conflits} conflit(s).` : "Aucun contrôle dans cette séance : « Contrôler les conflits » compare les parties à tout le cabinet." },
                        { cle: "vigilance", titre: "Vigilance LCB-FT", lignes: lVig, vide: cf.chargee ? "La conformité n'est pas installée sur cette base." : "Lecture…" },
                        { cle: "parties", titre: "Parties", lignes: ligneParties, plus: { libelle: "Ajouter une partie", faire: () => api.ouvrir({ type: "partie" }), desactive: !api.peutEcrire || !avecCle }, vide: api.partiesLisibles ? "Aucune partie." : "Les parties se lisent après une lecture tracée." },
                        { cle: "membres", titre: "Qui voit le dossier (les associés voient tous les dossiers, sauf muraille)", lignes: lMembres, plus: { libelle: "Ajouter une personne", faire: () => api.ouvrir({ type: "membre" }), desactive: !api.peutGerer } },
                        { cle: "murailles", titre: "Murailles", lignes: lMurailles, plus: { libelle: "Poser une muraille", faire: () => api.ouvrir({ type: "muraille" }), desactive: !api.gerant || !["attente", "ouvert", "audit"].includes(d.statut) }, vide: "Aucune muraille." },
                        { cle: "exports", titre: `Exports (archive conservée ${t.reglages?.conservation_exports_jours ?? 7} jours, puis purgée)`, lignes: lExports, plus: { libelle: "Exporter le dossier", faire: () => api.ouvrir({ type: "export" }), desactive: !["attente", "ouvert", "audit", "clos"].includes(d.statut) }, vide: "Aucun export." },
                        { cle: "journal", titre: "Journal des accès", lignes: lJournal },
                      ],
                    },
                  ]}
                />
              );
            }}
          />
        );
      }}
    />
  );
}
