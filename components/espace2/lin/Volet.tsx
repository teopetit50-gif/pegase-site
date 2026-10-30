"use client";

/* ══════════════════════════════════════════════════════════════════════
   Une partie dense d'une fiche, en liste et volet (30/10/2026)

   Les onglets d'une fiche (Terrain, Argent… d'un chantier DALIRO) montraient
   les cartes de l'écran d'avant : tableaux de 6 à 9 colonnes, cellules sur
   quatre lignes, gestes empilés. Ici, rien de neuf : la liste groupée de
   « My issues » de Linear (./linear-my-issues.css, préfixe lmi-), une ligne
   de 44 par élément avec trois ou quatre faits, et le détail de l'élément
   choisi dans le volet de 400 de la page d'une Initiative
   (./linear-initiative.css, cartes lit-carte, rangées « libellé / valeur »
   de 36 sur 90). Les gestes vivent dans le détail.

   La page (la fiche) fournit le contexte : l'endroit du volet où le détail
   se pose, l'élément choisi, et de quoi le changer. Sans contexte (l'écran
   de /espace), les composants qui s'en servent gardent leur dessin d'avant.
   ══════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import "./linear-initiative.css";
import "./linear-my-issues.css";
import "./volet-parties.css";

export type Volet = {
  /* l'endroit du volet où le détail se pose */
  cible: HTMLElement | null;
  /* la clé de l'élément choisi (« passage:<id> », « commande:<id> »…) */
  choisie: string | null;
  choisir: (cle: string | null) => void;
};

export const VoletContexte = createContext<Volet | null>(null);
export const useVolet = () => useContext(VoletContexte);

/* Le volet d'une page qui n'en avait pas (la page d'un projet LORANI…) : l'élément choisi, l'endroit
   où son détail se pose, Échap qui le referme, et `vue` (la partie montrée) qui le referme en changeant. */
export function useVoletPage(vue: string) {
  const [choisie, setChoisie] = useState<string | null>(null);
  const [cible, setCible] = useState<HTMLElement | null>(null);
  const [vueVue, setVueVue] = useState(vue);
  if (vueVue !== vue) {
    setVueVue(vue);
    setChoisie(null);
  }
  useEffect(() => {
    if (choisie === null) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[role='dialog']")) return;
      setChoisie(null);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [choisie]);
  const contexte = useMemo<Volet>(() => ({ cible, choisie, choisir: setChoisie }), [cible, choisie]);
  return { contexte, ouvert: choisie !== null, setCible };
}

/* les teintes de l'écran d'avant (ui.tsx) dans celles du gabarit */
export type TeinteLin = "vert" | "jaune" | "rouge" | "bleu" | "gris";
export const teinte = (t: string | undefined | null): TeinteLin => (t === "ambre" ? "jaune" : t === "vert" || t === "rouge" || t === "bleu" ? t : "gris");

/* ——— une partie : le titre 18/500 de la section « Projects », ses gestes à droite ——— */
export function Partie({ id, titre, compte, gestes, avis, children }: { id?: string; titre: string; compte?: string | null; gestes?: ReactNode; avis?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="lvp-partie" aria-label={titre}>
      <div className="lit-lots-tete">
        <h3 className="lit-lots-titre">
          {titre}
          {compte ? <span className="lvp-compte">{compte}</span> : null}
        </h3>
        {gestes ? <div className="lvp-gestes">{gestes}</div> : null}
      </div>
      {avis ? <div className="lvp-avis">{avis}</div> : null}
      {children}
    </section>
  );
}

/* ——— la liste et ses groupes : en-tête de 36 en retrait de 8, replier 20, nom 13/500, compte ——— */
export function Liste({ children }: { children: ReactNode }) {
  return <ul className="lmi-liste lvp-liste">{children}</ul>;
}

export function Groupe({ nom, compte, precision, icone, children }: { nom: string; compte?: number; precision?: string | null; icone?: ReactNode; children: ReactNode }) {
  const [replie, setReplie] = useState(false);
  return (
    <li className="lmi-groupe">
      <div className="lmi-groupe-tete">
        <button type="button" className="lmi-groupe-replier" aria-expanded={!replie} aria-label={replie ? `Déplier : ${nom}` : `Replier : ${nom}`} onClick={() => setReplie(!replie)}>
          <ChevronDown aria-hidden="true" />
        </button>
        {icone ? <span className="lmi-groupe-icone" aria-hidden="true">{icone}</span> : null}
        <span className="lmi-groupe-nom">{nom}</span>
        {compte !== undefined ? <span className="lmi-groupe-compte">{compte}</span> : null}
        {precision ? <span className="lmi-groupe-precision">{precision}</span> : null}
      </div>
      {replie ? null : <ul className="lmi-lignes">{children}</ul>}
    </li>
  );
}

/* ——— une ligne de 44 : icône · identifiant · titre et précision · pastilles · date ———
   Toute la ligne choisit l'élément ; un second clic le referme. */
export function Ligne({ cle, libelle, icone, id, titre, second, droite, date, dateTitre }: {
  cle: string;
  libelle: string;
  icone?: ReactNode;
  id?: ReactNode;
  titre: ReactNode;
  second?: ReactNode;
  droite?: ReactNode;
  date?: ReactNode;
  dateTitre?: string;
}) {
  const v = useVolet();
  const choisie = v?.choisie === cle;
  return (
    <li className="lmi-ligne lvp-ligne" data-choisie={choisie ? "" : undefined}>
      <button type="button" className="lmi-ligne-lien" aria-pressed={choisie} aria-label={libelle} onClick={() => v?.choisir(choisie ? null : cle)} />
      <span className="lmi-icone" aria-hidden="true">{icone}</span>
      <span className="lmi-id">{id}</span>
      <span className="lmi-titre">
        <span className="lmi-titre-texte">{titre}</span>
        {second ? <span className="lmi-titre-second">{second}</span> : null}
      </span>
      <span className="lmi-droite">{droite}</span>
      <span className="lmi-date" title={dateTitre}>{date}</span>
    </li>
  );
}

export function Pilule({ teinte: t, icone, title, children }: { teinte?: TeinteLin; icone?: ReactNode; title?: string; children: ReactNode }) {
  return (
    <span className="lmi-pilule" data-teinte={t} title={title}>
      {icone}
      {children}
    </span>
  );
}

/* un point de couleur de 8 devant une pastille ou un libellé */
export function Point({ teinte: t }: { teinte: TeinteLin }) {
  return <span className="lvp-point" data-teinte={t} aria-hidden="true" />;
}

/* ——— le détail de l'élément choisi, posé dans le volet ——— */
export function Detail({ cle, titre, sous, children }: { cle: string; titre: string; sous?: ReactNode; children: ReactNode }) {
  const v = useVolet();
  /* moins large, le volet passe au-dessus de la page : le détail qui s'ouvre hors de l'écran y est amené */
  const amener = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight - 120) el.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, []);
  if (!v || v.choisie !== cle || !v.cible) return null;
  return createPortal(
    <section ref={amener} className="lit-carte lvp-detail" aria-label={titre}>
      <div className="lvp-detail-tete">
        <h2 className="lvp-detail-titre">{titre}</h2>
        <button type="button" className="lit-rond lit-rond--24" aria-label="Fermer le détail" title="Fermer (Échap)" onClick={() => v.choisir(null)}>
          <X aria-hidden="true" />
        </button>
      </div>
      {sous ? <p className="lvp-detail-sous">{sous}</p> : null}
      {children}
    </section>,
    v.cible,
  );
}

export function Rangees({ children }: { children: ReactNode }) {
  return <dl className="lvp-rangees">{children}</dl>;
}

export function Rangee({ libelle, teinte: t, children }: { libelle: string; teinte?: TeinteLin; children: ReactNode }) {
  return (
    <div>
      <dt>{libelle}</dt>
      <dd data-teinte={t}>{children}</dd>
    </div>
  );
}

/* un paragraphe du détail (une citation, un motif, une explication) */
export function Texte({ citation, children }: { citation?: boolean; children: ReactNode }) {
  return <p className={citation ? "lvp-texte lvp-texte--citation" : "lvp-texte"}>{children}</p>;
}

/* une sous-liste du détail (lignes d'un avenant, livraisons…) : intitulé à gauche, valeur à droite */
export function SousListe({ titre, children }: { titre?: string; children: ReactNode }) {
  return (
    <div className="lvp-sous">
      {titre ? <h3 className="lvp-sous-titre">{titre}</h3> : null}
      <ul className="lvp-sous-liste">{children}</ul>
    </div>
  );
}

export function SousLigne({ titre, second, valeur, teinte: t }: { titre: ReactNode; second?: ReactNode; valeur?: ReactNode; teinte?: TeinteLin }) {
  return (
    <li data-teinte={t}>
      <span className="lvp-sous-gauche">
        <span className="lvp-sous-texte">{titre}</span>
        {second ? <span className="lvp-sous-second">{second}</span> : null}
      </span>
      {valeur !== undefined ? <span className="lvp-sous-valeur">{valeur}</span> : null}
    </li>
  );
}

/* les gestes du détail : pastilles de 28, rayon plein (les boutons du volet de Linear) */
export function Gestes({ children }: { children: ReactNode }) {
  return <div className="lvp-gestes-detail">{children}</div>;
}

export function Bouton({ fort, icone, children, ...props }: { fort?: boolean; icone?: ReactNode; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="lvp-bouton" data-fort={fort ? "" : undefined} {...props}>
      {icone}
      {children}
    </button>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return <p className="lvp-vide">{children}</p>;
}

/* « 3 nov. » : la date courte d'une colonne de 60 ; l'année quand elle n'est pas celle d'aujourd'hui */
export function jourCourt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  const memeAnnee = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("fr-FR", memeAnnee ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "2-digit" });
}

/* « 3 → 5 nov. » : une période sur la même colonne */
export function periodeCourte(debut: string, fin: string | null | undefined): string {
  if (!fin || fin === debut) return jourCourt(debut);
  const a = jourCourt(debut);
  const b = jourCourt(fin);
  const [ja, ...ma] = a.split(" ");
  const [jb, ...mb] = b.split(" ");
  return ma.join(" ") === mb.join(" ") ? `${ja} → ${jb} ${mb.join(" ")}` : `${a} → ${b}`;
}
