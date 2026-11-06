"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — Équipes (05/11/2026). Teo, la veille de l'audit de Corail BTP :
   « pour la page Équipes, change le design, je n'aime pas du tout ».
   Référence choisie par Teo : Linear, liste des Initiatives. Styles : la
   copie 1:1 déjà relevée pour Tavaro (tav-initiatives.css → ./dal-
   initiatives.css, préfixe dal-in-), sans mesure nouvelle.

   Une ligne par intervenant (nos équipes, sous-traitants, fournisseurs, le
   conducteur de travaux), tous chantiers confondus :
     Nom          le nom ; dessous le corps d'état et les chantiers
     Statut       En cours (sur chantier aujourd'hui) · Planifié · Terminé
     Priorité     urgent si un passage à venir est décliné ou sans réponse,
                  haute s'il attend encore sa réponse
     Prochain     la date du prochain passage
     Chantiers    combien de chantiers il touche
     Santé        vert : attestation de vigilance à jour et rien en souffrance ;
                  rouge : attestation à renouveler, passage décliné ou sans réponse
     Passages     combien de passages, faits et à venir
   Un clic ouvre ses passages (l'ancienne vue, onglet « Passages » :
   absences, remplaçants, calendrier, export), filtrés sur lui.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Passage, Tableau, Tiers } from "@/components/espace/daliro/types";
import { RACINE } from "../modules";
import { DalCarte, DalMenu, type OptionMenu } from "./DalCadre";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import { useDaliro } from "./donnees";
import { exporterCsv } from "./navigateur";
import "./dal-ticket.css";
import "./dal-initiatives.css";

const BASE = `${RACINE}/daliro`;
type Genre = "equipe" | "sous_traitant" | "fournisseur" | "conducteur";
type Teinte = "jaune" | "gris" | "violet" | "rouge";
type Ligne = {
  cle: string;
  genre: Genre;
  nom: string;
  resume: string;
  icone: NomDalIcone;
  statut: { libelle: string; icone: NomDalIcone; teinte: Teinte };
  priorite: "urgent" | "haute" | "aucune";
  prochain: string | null;
  chantiers: number;
  sante: "vert" | "rouge" | "aucune";
  passages: number;
  tiers: Tiers | null;
};
const ONGLETS = [
  { cle: "tous", libelle: "Tous" },
  { cle: "sous_traitant", libelle: "Sous-traitants" },
  { cle: "equipe", libelle: "Nos équipes" },
  { cle: "fournisseur", libelle: "Fournisseurs" },
] as const;
type Onglet = (typeof ONGLETS)[number]["cle"];
const TRIS = [
  { cle: "nom", libelle: "Nom" },
  { cle: "prochain", libelle: "Prochain passage" },
  { cle: "priorite", libelle: "Priorité" },
  { cle: "sante", libelle: "Santé" },
] as const;
type Tri = (typeof TRIS)[number]["cle"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const court = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function lignesDe(tableaux: Tableau[], auj: string): Ligne[] {
  const tiers = new Map<string, Tiers>();
  for (const t of tableaux) for (const x of t.tiers) tiers.set(x.id, x);
  const acc = new Map<string, { nom: string; genre: Genre; tiers: Tiers | null; ps: { p: Passage; t: Tableau }[] }>();
  for (const t of tableaux)
    for (const p of t.passages) {
      if (p.statut === "annule") continue;
      const cle = p.tiers_id ? `t:${p.tiers_id}` : p.equipe_id ? `e:${p.equipe_id}` : null;
      if (!cle) continue;
      const x = p.tiers_id ? (tiers.get(p.tiers_id) ?? null) : null;
      const genre: Genre = x ? (x.roles.includes("fournisseur") && !x.roles.includes("sous_traitant") ? "fournisseur" : "sous_traitant") : /conducteur/i.test(p.intervenant_nom ?? "") ? "conducteur" : "equipe";
      const e = acc.get(cle) ?? { nom: p.intervenant_nom ?? p.intervenant_lu ?? "Intervenant", genre, tiers: x, ps: [] };
      e.ps.push({ p, t });
      acc.set(cle, e);
    }
  return [...acc.entries()].map(([cle, e]) => {
    const prevus = e.ps.filter(({ p }) => p.statut === "prevu" && p.fin >= auj);
    const enCours = prevus.filter(({ p }) => p.debut <= auj);
    const prochain = prevus.map(({ p }) => p.debut).filter((d) => d > auj).sort()[0] ?? null;
    const souffrance = prevus.some(({ p }) => p.confirmation === "declinee" || p.confirmation === "sans_reponse");
    const attend = prevus.some(({ p }) => p.confirmation === "demandee");
    const vig = e.tiers?.vigilance ?? null;
    const vigOk = vig === "a_jour";
    const vigKo = vig === "a_renouveler" || vig === "echue" || vig === "absente";
    const noms = [...new Set(e.ps.map(({ t }) => t.chantier.nom))];
    const corps = e.tiers?.corps_etat?.[0] ?? (e.genre === "conducteur" ? "rendez-vous de chantier" : e.genre === "equipe" ? "équipe de pose" : null);
    return {
      cle,
      genre: e.genre,
      nom: e.nom,
      resume: [corps ? corps.charAt(0).toUpperCase() + corps.slice(1) : null, noms.slice(0, 2).join(", ") + (noms.length > 2 ? ` et ${noms.length - 2} autre${noms.length > 3 ? "s" : ""}` : "")].filter(Boolean).join(" · "),
      icone: e.genre === "fournisseur" ? "Box" : e.genre === "conducteur" ? "Calendar" : e.genre === "equipe" ? "Team" : "Wrench",
      statut: enCours.length
        ? { libelle: "En cours", icone: "IssueStatusStarted", teinte: "jaune" }
        : prochain
          ? { libelle: "Planifié", icone: "IssueStatusTodo", teinte: "gris" }
          : { libelle: "Terminé", icone: "IssueStatusDone", teinte: "violet" },
      priorite: souffrance ? "urgent" : attend ? "haute" : "aucune",
      prochain,
      chantiers: noms.length,
      sante: souffrance || vigKo ? "rouge" : vigOk || e.genre === "equipe" || e.genre === "conducteur" ? "vert" : "aucune",
      passages: e.ps.length,
      tiers: e.tiers,
    } satisfies Ligne;
  });
}

export default function EquipesListe() {
  const { liste, tableau } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const onglet = (ONGLETS.some((o) => o.cle === params.get("onglet")) ? params.get("onglet") : "tous") as Onglet;
  const tri = (TRIS.some((t) => t.cle === params.get("tri")) ? params.get("tri") : "prochain") as Tri;
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [auj] = useState(() => iso(new Date()));
  const tableaux = useMemo(() => liste.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t), [liste, tableau]);
  const toutes = useMemo(() => lignesDe(tableaux, auj), [tableaux, auj]);
  const lignes = useMemo(() => {
    const l = toutes.filter((x) => onglet === "tous" || x.genre === onglet || (onglet === "equipe" && x.genre === "conducteur"));
    const rang = { urgent: 0, haute: 1, aucune: 2 } as const;
    const sr = { rouge: 0, aucune: 1, vert: 2 } as const;
    return [...l].sort((a, b) =>
      tri === "nom" ? a.nom.localeCompare(b.nom, "fr") : tri === "priorite" ? rang[a.priorite] - rang[b.priorite] || a.nom.localeCompare(b.nom, "fr") : tri === "sante" ? sr[a.sante] - sr[b.sante] || a.nom.localeCompare(b.nom, "fr") : (a.prochain ?? "9999").localeCompare(b.prochain ?? "9999"),
    );
  }, [toutes, onglet, tri]);
  const adresse = (m: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(m)) if (v === null) q.delete(k);
    else q.set(k, v);
    const s = q.toString();
    return `${BASE}/equipes${s ? `?${s}` : ""}`;
  };
  const exporter = (ls: Ligne[]) =>
    exporterCsv(
      "equipes",
      ["Intervenant", "Type", "Statut", "Priorité", "Prochain passage", "Chantiers", "Passages", "Vigilance"],
      ls.map((l) => [l.nom, l.genre, l.statut.libelle, l.priorite, l.prochain ?? "", l.chantiers, l.passages, l.tiers?.vigilance ?? ""]),
    );
  const cochees = lignes.filter((l) => coches.has(l.cle));
  const nbUrgent = toutes.filter((l) => l.priorite === "urgent").length;
  const options: OptionMenu[] = [
    ...TRIS.map((x) => ({ libelle: `Trier par ${x.libelle.toLowerCase()}`, icone: (tri === x.cle ? "IssueStatusDone" : "Filtre") as NomDalIcone, href: adresse({ tri: x.cle }) })),
    "sep",
    { libelle: "Exporter la liste (CSV)", icone: "Spreadsheet", action: () => exporter(lignes) },
  ];

  return (
    <DalCarte>
      <h1 className="v2-sr">Équipes</h1>
      <header className="dal-tete">
        <div className="dal-ligne1 dal-in-ligne1">
          <span className="dal-in-page">Équipes</span>
          <span className="dal-pousse" />
          <Link className="dal-in-nouveau" href={`${BASE}/equipes?vue=passages`}>
            <DalIcone nom="Calendar" taille={14} />
            <span>Passages et absences</span>
          </Link>
        </div>
        <nav className="dal-ligne2 dal-in-ligne2" aria-label="Intervenants">
          <span className="dal-in-onglets">
            {ONGLETS.map((x) => (
              <Link key={x.cle} href={adresse({ onglet: x.cle === "tous" ? null : x.cle })} scroll={false} className="dal-onglet dal-in-onglet" aria-current={onglet === x.cle ? "page" : undefined}>
                {x.libelle}
              </Link>
            ))}
          </span>
          <span className="dal-pousse" />
          <DalMenu libelle="Options d'affichage : trier les lignes" icone="Affichage" alignement="droite" options={options} />
          <Link href={`${BASE}/annuaire`} className="dal-rond dal-rond--plein" aria-label="Annuaire" title="Annuaire">
            <DalIcone nom="Users" />
          </Link>
        </nav>
      </header>
      <div className="dal-defile">
        <div className="dal-in-entete">
          <span />
          <span />
          <Link href={adresse({ tri: "nom" })} scroll={false} className="dal-in-col dal-in-tri" aria-current={tri === "nom" ? "true" : undefined}>
            Nom
          </Link>
          <span className="dal-in-col">Statut</span>
          <Link href={adresse({ tri: "priorite" })} scroll={false} className="dal-in-col dal-in-tri" aria-current={tri === "priorite" ? "true" : undefined}>
            Priorité
          </Link>
          <span className="dal-in-col">Resp.</span>
          <Link href={adresse({ tri: "prochain" })} scroll={false} className="dal-in-col dal-in-tri" aria-current={tri === "prochain" ? "true" : undefined}>
            Prochain
          </Link>
          <span className="dal-in-col">Chantiers</span>
          <Link href={adresse({ tri: "sante" })} scroll={false} className="dal-in-col dal-in-tri" aria-current={tri === "sante" ? "true" : undefined}>
            Santé
          </Link>
          <span className="dal-in-col">Passages</span>
        </div>
        <p className="dal-in-avis">
          {toutes.length} intervenants sur vos chantiers · {nbUrgent} avec un passage décliné ou sans réponse · confirmations demandées à J-2.
        </p>
        <ul className="dal-in-lignes">
          {lignes.map((l) => (
            <li key={l.cle} className="dal-in-li" data-coche={coches.has(l.cle) || undefined}>
              <input
                type="checkbox"
                className="dal-in-coche"
                aria-label={`Sélectionner ${l.nom}`}
                checked={coches.has(l.cle)}
                onChange={(e) =>
                  setCoches((c) => {
                    const n = new Set(c);
                    if (e.target.checked) n.add(l.cle);
                    else n.delete(l.cle);
                    return n;
                  })
                }
              />
              <button type="button" className="dal-in-ligne" onClick={() => routeur.push(`${BASE}/equipes?vue=passages&intervenant=${encodeURIComponent(l.cle)}`)}>
                <span className="dal-in-case" aria-hidden="true" />
                <span className="dal-in-titre">
                  <span className="dal-in-icone">
                    <DalIcone nom={l.icone} />
                  </span>
                  <span className="dal-in-textes">
                    <span className="dal-in-nom">{l.nom}</span>
                    <span className="dal-in-resume">{l.resume}</span>
                  </span>
                </span>
                <span className="dal-in-statut" data-teinte={l.statut.teinte}>
                  <DalIcone nom={l.statut.icone} />
                  <span>{l.statut.libelle}</span>
                </span>
                <span className="dal-in-prio" data-prio={l.priorite}>
                  <DalIcone nom={l.priorite === "urgent" ? "Priority1" : l.priorite === "haute" ? "Priority2" : "Priority0"} />
                </span>
                <span className="dal-in-owner" aria-hidden="true" />
                <span className="dal-in-cible">{l.prochain ? court(l.prochain) : ""}</span>
                <span className="dal-in-projets">
                  <DalIcone nom="Project" />
                  <span>{l.chantiers}</span>
                </span>
                <span className="dal-in-sante" data-sante={l.sante}>
                  <span />
                </span>
                <span className="dal-in-actifs">{l.passages}</span>
              </button>
            </li>
          ))}
        </ul>
        {cochees.length ? (
          <div className="dal-in-barre" role="toolbar" aria-label="Actions sur la sélection">
            <span>
              {cochees.length} sélectionné{cochees.length > 1 ? "s" : ""}
            </span>
            <button type="button" className="dal-in-barre-bouton" onClick={() => exporter(cochees)}>
              <DalIcone nom="Spreadsheet" taille={14} />
              <span>Exporter (CSV)</span>
            </button>
            <button type="button" className="dal-in-barre-bouton" onClick={() => setCoches(new Set())}>
              <span>Annuler</span>
            </button>
          </div>
        ) : null}
      </div>
    </DalCarte>
  );
}
