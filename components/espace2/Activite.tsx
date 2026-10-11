"use client";

/* ══════════════════════════════════════════════════════════════════════
   Activité — en colonnes, à la manière d'Attio (11/10/2026)

   Demande de Teo, maquette à l'appui : trois colonnes — Documents reçus,
   À valider, Décisions — chacune avec son compte, ses cartes (titre,
   montant et état, module, moment) et son « Voir tout ». Au-dessus, la
   barre : tri, module, période, recherche, colonnes ou liste. La finition
   est celle d'Attio, déjà posée sur Notes : filets d'un pixel, boutons de
   26 px à coins de 6 px, cartes à coins de 8 px, survols discrets.

   Mêmes sources qu'avant (./donnees) : l'exemple, ou la base réelle.
   ══════════════════════════════════════════════════════════════════════ */

import "./notes.css";
import "./activite.css";
import { createElement, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, CalendarDays, Check, ChevronDown, ChevronRight, CircleCheck, Clock3, Columns3, FileText, LayoutGrid, List, Search, X, type LucideIcon } from "lucide-react";
import { dateHeure, libelleModule, montant } from "@/components/espace/format";
import { etatDocument } from "@/components/espace/filed/etats";
import { nomPersonne } from "@/components/espace/exemples/socle";
import { useSource } from "@/components/espace/source";
import { ItemMenu, MenuDeroulant, Note, Squelette, teinte, type Teinte } from "./ui";
import { ecrireStockage, useStockage } from "./Collection";
import { useDonnees, type Donnees } from "./donnees";
import { STATUTS_DEMANDE } from "./evenements";
import { MODULES, RACINE } from "./modules";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const CLE_VUE = "espace2-activite-vue";
const MINUTE = 60_000;
const HEURE = 3_600_000;
const JOUR = 86_400_000;
/* au-delà, la colonne se replie : « N de plus » la déplie */
const LIMITE = 5;

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
const ICONES = Object.fromEntries(COLONNES.map((c) => [c.cle, c.icone])) as Record<Cle, LucideIcon>;
const TYPE: Record<Cle, string> = { recus: "Document reçu", a_valider: "À valider", decisions: "Décision" };

type Tri = "recent" | "ancien" | "montant";
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "recent", libelle: "Plus récent en premier" },
  { cle: "ancien", libelle: "Plus ancien en premier" },
  { cle: "montant", libelle: "Montant le plus élevé" },
];

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
const iconeModule = (cle: string): LucideIcon => MODULES.find((m) => m.cle === cle)?.icone ?? LayoutGrid;

/* le moment, au plus court : « À l'instant », « Il y a 12 min », « Il y a 2 h », « Hier », « 3 oct. » */
function moment(iso: string, maintenant: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const ecart = maintenant - t;
  if (ecart < MINUTE) return "À l'instant";
  if (ecart < HEURE) return `Il y a ${Math.floor(ecart / MINUTE)} min`;
  const jour = new Date(maintenant);
  jour.setHours(0, 0, 0, 0);
  if (t >= jour.getTime()) return `Il y a ${Math.floor(ecart / HEURE)} h`;
  if (t >= jour.getTime() - JOUR) return "Hier";
  const d = new Date(t);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: d.getFullYear() === jour.getFullYear() ? undefined : "numeric" });
}

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
  const [maintenant] = useState(() => Date.now());
  const [tri, setTri] = useState<Tri>("recent");
  const [periode, setPeriode] = useState<Periode>("7j");
  const [module, setModule] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [deplies, setDeplies] = useState<Record<Cle, boolean>>({ recus: false, a_valider: false, decisions: false });
  const vue = useStockage(CLE_VUE) === "liste" ? "liste" : "colonnes";
  const choisirVue = (v: "colonnes" | "liste") => ecrireStockage(CLE_VUE, v);

  const toutes = useMemo(() => (donnees ? cartes(donnees) : []), [donnees]);
  const modules = useMemo(() => Array.from(new Set(toutes.map((c) => c.module))).sort((a, b) => libelleModule(a).localeCompare(libelleModule(b), "fr")), [toutes]);

  const visibles = useMemo(() => {
    const duree = PERIODES.find((p) => p.cle === periode)?.duree ?? Infinity;
    const q = sansAccents(recherche.trim());
    const l = toutes.filter(
      (c) =>
        (!module || c.module === module) &&
        maintenant - new Date(c.quand).getTime() <= duree &&
        (!q || sansAccents(`${c.texte} ${libelleModule(c.module)}`).includes(q)),
    );
    return l.sort((a, b) => {
      if (tri === "montant") return (b.somme ?? -Infinity) - (a.somme ?? -Infinity) || b.quand.localeCompare(a.quand);
      return tri === "ancien" ? a.quand.localeCompare(b.quand) : b.quand.localeCompare(a.quand);
    });
  }, [toutes, module, periode, recherche, tri, maintenant]);

  const parColonne = (cle: Cle) => visibles.filter((c) => c.colonne === cle);
  const filtre = !!recherche.trim() || !!module;
  const libellePeriode = PERIODES.find((p) => p.cle === periode)?.libelle ?? "";
  const coche = (actif: boolean) => (actif ? <Check width={16} height={16} aria-label="choisi" /> : null);

  return (
    <div className="no-page ac-page v2-arrivee">
      <h1 className="v2-sr">Activité</h1>

      <div className="no-barre">
        <div className="ac-barre-gauche">
          <MenuDeroulant
            etiquette="Trier"
            classe="no-bouton"
            placement="bottom start"
            largeur={240}
            declencheur={
              <>
                <ArrowUpDown {...I} />
                {TRIS.find((t) => t.cle === tri)?.libelle}
                <ChevronDown {...I} />
              </>
            }
          >
            {TRIS.map((t) => (
              <ItemMenu key={t.cle} id={t.cle} onAction={() => setTri(t.cle)} suffixe={coche(tri === t.cle)}>
                {t.libelle}
              </ItemMenu>
            ))}
          </MenuDeroulant>
          <MenuDeroulant
            etiquette="Filtrer par module"
            classe="no-bouton"
            placement="bottom start"
            largeur={220}
            declencheur={
              <>
                <LayoutGrid {...I} />
                {module ? libelleModule(module) : "Tous les modules"}
                <ChevronDown {...I} />
              </>
            }
          >
            <ItemMenu id="tous" onAction={() => setModule(null)} suffixe={coche(!module)}>
              Tous les modules
            </ItemMenu>
            {modules.map((m) => (
              <ItemMenu key={m} id={m} textValue={libelleModule(m)} onAction={() => setModule(m)} suffixe={coche(module === m)}>
                {libelleModule(m)}
              </ItemMenu>
            ))}
          </MenuDeroulant>
          <MenuDeroulant
            etiquette="Période"
            classe="no-bouton"
            placement="bottom start"
            largeur={220}
            declencheur={
              <>
                <CalendarDays {...I} />
                {libellePeriode}
                <ChevronDown {...I} />
              </>
            }
          >
            {PERIODES.map((p) => (
              <ItemMenu key={p.cle} id={p.cle} onAction={() => setPeriode(p.cle)} suffixe={coche(periode === p.cle)}>
                {p.libelle}
              </ItemMenu>
            ))}
          </MenuDeroulant>
        </div>

        <div className="no-barre-droite">
          <label className="ac-recherche">
            <Search {...I} width={14} height={14} />
            <span className="v2-sr">Rechercher dans l&apos;activité</span>
            <input type="search" value={recherche} placeholder="Rechercher" autoComplete="off" spellCheck={false} onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setRecherche("")} />
            {recherche ? (
              <button type="button" className="ac-effacer" aria-label="Effacer la recherche" onClick={() => setRecherche("")}>
                <X width={12} height={12} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <div className="no-bascule" role="group" aria-label="Affichage">
            <button type="button" aria-pressed={vue === "colonnes"} aria-label="Vue en colonnes" title="Vue en colonnes" onClick={() => choisirVue("colonnes")}>
              <Columns3 {...I} width={14} height={14} />
            </button>
            <button type="button" aria-pressed={vue === "liste"} aria-label="Vue en liste" title="Vue en liste" onClick={() => choisirVue("liste")}>
              <List {...I} width={14} height={14} />
            </button>
          </div>
        </div>
      </div>

      {erreur ? (
        <div className="ac-alerte">
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        </div>
      ) : null}

      {vue === "colonnes" ? (
        <div className="ac-tableau">
          {COLONNES.map((col) => {
            const liste = parColonne(col.cle);
            const montrees = deplies[col.cle] ? liste : liste.slice(0, LIMITE);
            const reste = liste.length - montrees.length;
            const Icone = col.icone;
            return (
              <section key={col.cle} className="ac-colonne" aria-labelledby={`ac-${col.cle}`} data-colonne={col.cle}>
                <header className="ac-colonne-tete">
                  <Icone {...I} />
                  <h2 id={`ac-${col.cle}`}>{col.titre}</h2>
                  {col.cle === "a_valider" && liste.length ? <span className="ac-led" title="En attente d'une décision" /> : null}
                  {donnees ? <span className="no-compte">{liste.length}</span> : null}
                </header>

                {!donnees ? (
                  <ul className="ac-cartes" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="ac-carte ac-carte--squelette">
                        <Squelette largeur="70%" hauteur={14} />
                        <Squelette largeur="45%" hauteur={12} />
                        <Squelette largeur="100%" hauteur={12} />
                      </li>
                    ))}
                  </ul>
                ) : liste.length ? (
                  <ul className="ac-cartes">
                    {montrees.map((c) => (
                      <CarteActivite key={c.id} c={c} maintenant={maintenant} />
                    ))}
                  </ul>
                ) : (
                  <p className="ac-vide">{filtre ? "Aucun résultat avec ces filtres" : `${col.vide} sur cette période`}</p>
                )}

                {donnees ? (
                  <div className="ac-colonne-pied">
                    <Link href={col.tout} className="ac-voir" aria-label={col.libelleTout}>
                      Voir tout
                    </Link>
                    {reste > 0 || deplies[col.cle] ? (
                      <button type="button" className="ac-voir" aria-expanded={deplies[col.cle]} onClick={() => setDeplies((d) => ({ ...d, [col.cle]: !d[col.cle] }))}>
                        {deplies[col.cle] ? "Réduire" : `${reste} de plus`}
                        <ChevronDown {...I} width={14} height={14} className="ac-voir-chevron" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : !donnees ? (
        <div className="ac-liste" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="ac-ligne ac-ligne--squelette">
              <Squelette largeur="40%" hauteur={14} />
            </div>
          ))}
        </div>
      ) : visibles.length ? (
        <ul className="ac-liste">
          {visibles.map((c) => {
            return (
              <li key={c.id} className="ac-ligne" data-colonne={c.colonne}>
                <Link href={c.lien} title={c.complet}>
                  <span className="ac-type" aria-hidden="true">
                    {createElement(ICONES[c.colonne], { ...I, width: 14, height: 14 })}
                  </span>
                  <span className="ac-ligne-titre">
                    <strong>{c.titre}</strong>
                    <Meta c={c} />
                  </span>
                  <span className="ac-ligne-type">{TYPE[c.colonne]}</span>
                  <Module cle={c.module} />
                  <time dateTime={c.quand} title={dateHeure(c.quand)}>
                    {moment(c.quand, maintenant)}
                  </time>
                  <ChevronRight {...I} width={14} height={14} className="ac-chevron" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ac-vide ac-vide--liste">{filtre ? "Aucun résultat avec ces filtres" : "Rien ne s'est passé sur cette période"}</p>
      )}

      {source === "exemple" ? <p className="no-gris ac-mention">Données de démonstration</p> : null}
    </div>
  );
}

function Module({ cle }: { cle: string }) {
  return (
    <span className="ac-module">
      {createElement(iconeModule(cle), { ...I, width: 14, height: 14 })}
      {libelleModule(cle)}
    </span>
  );
}

function Meta({ c }: { c: Carte }) {
  return (
    <span className="ac-meta">
      {c.colonne === "decisions" && c.etat ? (
        <span className="ac-etat">
          <span className="v2-point" data-teinte={c.etat.teinte} aria-hidden="true" />
          {c.etat.libelle}
        </span>
      ) : null}
      {c.somme !== null ? <span className="ac-somme">{montant(c.somme, c.devise)}</span> : null}
      {c.colonne === "recus" && c.etat ? (
        <span className="ac-etat">
          <span className="v2-point" data-teinte={c.etat.teinte} aria-hidden="true" />
          {c.etat.libelle}
        </span>
      ) : null}
      {c.par ? <span>Demandée par {c.par}</span> : null}
    </span>
  );
}

function CarteActivite({ c, maintenant }: { c: Carte; maintenant: number }) {
  return (
    <li className="ac-carte" data-colonne={c.colonne}>
      <Link href={c.lien} className="ac-carte-lien" title={c.complet}>
        <span className="ac-carte-haut">
          <strong className="ac-carte-titre">{c.titre}</strong>
          <ChevronRight {...I} width={14} height={14} className="ac-chevron" />
        </span>
        <Meta c={c} />
        <span className="ac-carte-pied">
          <Module cle={c.module} />
          <time dateTime={c.quand} title={dateHeure(c.quand)}>
            {moment(c.quand, maintenant)}
          </time>
        </span>
      </Link>
    </li>
  );
}
