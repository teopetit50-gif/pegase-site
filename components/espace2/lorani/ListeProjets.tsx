"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace2/lorani/projets — tous les projets de l'agence (04/11/2026)

   Teo : « pour arriver aux pages d'un projet, j'ai dû passer par une
   question puis "Ouvrir le chantier" ; on ne les retrouve nulle part ».
   Une liste au dessin des pages SaaS (« Documents » de FILED) : la barre
   de titre de 44, une ligne de 48 par projet — sa tuile, son nom, sa
   référence et sa commune, la phase, le nombre de permis, le chef de
   projet, la prochaine date. Une ligne ouvre la page du projet.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NATURES_PROJET, PHASES, prochaineDate } from "@/components/espace/lorani/etats";
import type { Projet } from "@/components/espace/lorani/types";
import { RACINE } from "../modules";
import { useLorani } from "./donnees";
import { IconeSprite } from "./lor-icones";
import type { NomIcone } from "./lor-sprite";
import "@/components/espace/espace.css";
import "./lor.css";
import "./lor-liste-projets.css";

const BASE = `${RACINE}/lorani`;
const ICONE_NATURE: Record<Projet["nature"], { nom: NomIcone; couleur: string }> = {
  maison_individuelle: { nom: "Home", couleur: "lch(67.969% 19.321 31.72)" },
  logement_collectif: { nom: "Project", couleur: "#26b5ce" },
  erp: { nom: "Education", couleur: "#eb5757" },
  igh: { nom: "Project", couleur: "lch(48% 59.31 288.43)" },
  tertiaire: { nom: "Briefcase", couleur: "lch(67.969% 62.082 61.651)" },
  autre: { nom: "Project", couleur: "lch(80% 90 85)" },
};
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const court = (iso: string) => fmtCourt.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
const jourIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export default function ListeProjets() {
  const { pret, erreur, dossier, nommer } = useLorani();
  const auj = jourIso();
  const lignes = dossier.projets
    .map((pr) => {
      const permis = dossier.permis.filter((p) => p.projet_id === pr.id);
      const dates = permis.map(prochaineDate).filter((d): d is string => !!d).sort();
      const chef = dossier.membres.find((m) => m.projet_id === pr.id && m.role_projet === "chef_projet");
      return { pr, permis: permis.length, chef: chef ? nommer(chef.user_id) : null, date: dates.find((d) => d >= auj) ?? dates[0] ?? null };
    })
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.pr.nom.localeCompare(b.pr.nom, "fr"));

  return (
    <div className="lor lor-lp">
      <h1 className="v2-sr">Projets</h1>
      <header className="lor-lp-tete">
        <span className="lor-lp-titre">Projets</span>
        <span className="lor-lp-compte">{lignes.length}</span>
      </header>
      {erreur ? (
        <p className="lor-lp-vide" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : !pret ? (
        <p className="lor-lp-vide" role="status">
          Lecture des projets…
        </p>
      ) : !lignes.length ? (
        <p className="lor-lp-vide">Aucun projet : ouvrez-en un depuis la Vue d&apos;ensemble, avec son premier permis.</p>
      ) : (
        <div className="lor-lp-tableau" role="table" aria-label="Projets de l'agence">
          <div className="lor-lp-grille lor-lp-entetes" role="row">
            <span role="columnheader">Projet</span>
            <span role="columnheader" className="lor-lp-c-phase">Phase</span>
            <span role="columnheader" className="lor-lp-c-n">Permis</span>
            <span role="columnheader" className="lor-lp-c-chef">Chef de projet</span>
            <span role="columnheader" className="lor-lp-c-date">Prochaine date</span>
            <span aria-hidden="true" />
          </div>
          {lignes.map(({ pr, permis, chef, date }) => {
            const nature = ICONE_NATURE[pr.nature] ?? ICONE_NATURE.autre;
            const lieu = [pr.reference ? `Réf. ${pr.reference}` : null, pr.commune].filter(Boolean).join(" · ");
            return (
              <Link key={pr.id} href={`${BASE}/projets/${encodeURIComponent(pr.id)}`} className="lor-lp-grille lor-lp-ligne" role="row">
                <span className="lor-lp-projet" role="cell">
                  <span className="lor-lp-tuile" style={{ "--lor-lp-tuile": nature.couleur } as React.CSSProperties} title={NATURES_PROJET[pr.nature]}>
                    <IconeSprite nom={nature.nom} couleur={nature.couleur} />
                  </span>
                  <span className="lor-lp-nom">{pr.nom}</span>
                  {lieu ? <span className="lor-lp-lieu">{lieu}</span> : null}
                </span>
                <span role="cell" className="lor-lp-c-phase lor-lp-sourd">{PHASES[pr.phase]}</span>
                <span role="cell" className="lor-lp-c-n">{permis ? <>{permis}<span className="lor-lp-mobile"> permis</span></> : <span className="lor-lp-sourd">—</span>}</span>
                <span role="cell" className="lor-lp-c-chef">{chef ?? <span className="lor-lp-sourd">Personne</span>}</span>
                <span role="cell" className="lor-lp-c-date" data-passe={date && date < auj ? "" : undefined}>{date ? court(date) : <span className="lor-lp-sourd">—</span>}</span>
                <ChevronRight className="lor-lp-chevron" width={16} height={16} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
