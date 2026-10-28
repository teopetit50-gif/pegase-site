"use client";

/* ══════════════════════════════════════════════════════════════════════
   La liste des workflows de Plain (« Workflows »), au 1:1 — 28/10/2026

   Les briques partagées des pages « Contrôles et fraude » (FILED),
   « Garde-fous » (OFFLOAD) et « Urgences et escalade » (REPUT) : nos règles
   et nos contrôles y jouent le rôle des workflows :
     · la tête (icône, titre 24, boutons de la tête des fils et un bouton primaire),
     · les onglets (nos vraies catégories), le bouton Filtres (F) et la recherche,
     · le tableau : Ordre · Nom · Déclencheur · Créée · Modifiée par · Dernier déclenchement · ···,
       en-têtes triables (le tri vit dans l'adresse), une ligne ouvre la carte au milieu,
     · l'état vide de Plain, le menu « ··· » d'une ligne.
   Le carrousel « Featured templates » n'est pas repris : aucune de ces pages
   n'a de préréglage réel. Mesures : ./plain-workflows.css (relevé
   scratchpad/releve-plain-workflows.md). Les boutons de tête, le menu
   Filtres et ses options viennent de ./ListeFils.tsx (pf-*), sans y toucher.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
/* lin.css porte les jetons --lin-* (clair et sombre) : sans lui, aucun bord ni fond ne se calcule */
import "./lin.css";
import "./plain-fils.css";
import "./plain-workflows.css";
import { IconeFiltres, MenuPlain } from "./ListeFils";
import type { Option } from "./Lin";

/* ——— les icônes de Plain, redessinées ——— */
export const IconeRegles = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path
      d="M15 6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2h-1a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2h-1a3 3 0 0 1-3-3v-2H9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2h2V9a3 3 0 0 1 3-3zm2 2h3V6h-3zM7 11H4v2h3zm10 7h3v-2h-3z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);
const IconeLoupe = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="m18.9 20.3-5.6-5.6q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.887T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5a6.1 6.1 0 0 1-1.3 3.8l5.625 5.625a.92.92 0 0 1 .275.675q0 .4-.3.7a.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275M9.5 14q1.875 0 3.188-1.312Q14 11.375 14 9.5t-1.312-3.187T9.5 5 6.313 6.313 5 9.5t1.313 3.188T9.5 14"
      fill="currentColor"
    />
  </svg>
);
const IconeTri = ({ sens }: { sens: "asc" | "desc" }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" data-sens={sens}>
    <path
      d="M6.73 10.488q.3.3.725.287.425-.012.725-.312l2.825-2.825v11.15q0 .424.287.712.288.288.713.288.424 0 .712-.288a.97.97 0 0 0 .288-.712V7.638l2.85 2.85q.3.3.712.3.413 0 .713-.3t.3-.713-.3-.712l-4.575-4.575a.9.9 0 0 0-.325-.213 1.1 1.1 0 0 0-.375-.062q-.2 0-.375.062a.9.9 0 0 0-.325.213L6.73 9.063q-.3.3-.3.712t.3.713"
      fill="currentColor"
    />
  </svg>
);
const IconePoignee = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M8 20q-.824 0-1.412-.587A1.93 1.93 0 0 1 6 18q0-.824.588-1.413A1.93 1.93 0 0 1 8 16q.825 0 1.412.587Q10 17.176 10 18q0 .824-.588 1.413A1.93 1.93 0 0 1 8 20m7 0q-.825 0-1.412-.587A1.93 1.93 0 0 1 13 18q0-.824.588-1.413A1.93 1.93 0 0 1 15 16q.824 0 1.413.587Q17 17.176 17 18q0 .824-.587 1.413A1.93 1.93 0 0 1 15 20m-7-6q-.824 0-1.412-.588A1.93 1.93 0 0 1 6 12q0-.825.588-1.412A1.93 1.93 0 0 1 8 10q.825 0 1.412.588Q10 11.175 10 12t-.588 1.412A1.93 1.93 0 0 1 8 14m7 0q-.825 0-1.412-.588A1.93 1.93 0 0 1 13 12q0-.825.588-1.412A1.93 1.93 0 0 1 15 10q.824 0 1.413.588Q17 11.175 17 12t-.587 1.412A1.93 1.93 0 0 1 15 14M8 8q-.824 0-1.412-.588A1.93 1.93 0 0 1 6 6q0-.825.588-1.412A1.93 1.93 0 0 1 8 4q.825 0 1.412.588Q10 5.175 10 6t-.588 1.412A1.93 1.93 0 0 1 8 8m7 0q-.825 0-1.412-.588A1.93 1.93 0 0 1 13 6q0-.825.588-1.412A1.93 1.93 0 0 1 15 4q.824 0 1.413.588Q17 5.175 17 6t-.587 1.412A1.93 1.93 0 0 1 15 8"
      fill="currentColor"
    />
  </svg>
);
const IconePoints = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path
      d="M6 14q-.824 0-1.412-.588A1.93 1.93 0 0 1 4 12q0-.825.588-1.412A1.93 1.93 0 0 1 6 10q.824 0 1.412.588Q8 11.175 8 12t-.588 1.412A1.93 1.93 0 0 1 6 14m6 0q-.825 0-1.412-.588A1.93 1.93 0 0 1 10 12q0-.825.588-1.412A1.93 1.93 0 0 1 12 10q.825 0 1.412.588Q14 11.175 14 12t-.588 1.412A1.93 1.93 0 0 1 12 14m6 0q-.825 0-1.413-.588A1.93 1.93 0 0 1 16 12q0-.825.587-1.412A1.93 1.93 0 0 1 18 10q.824 0 1.413.588Q20 11.175 20 12t-.587 1.412A1.93 1.93 0 0 1 18 14"
      fill="currentColor"
    />
  </svg>
);
export const IconePlus18 = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1" fill="currentColor" />
  </svg>
);

/* ——— le bouton primaire de la tête (« Add workflow ») ——— */
export function BoutonPrimaire({ icone, children, href, onClick, disabled }: { icone?: React.ReactNode; children: React.ReactNode; href?: string; onClick?: () => void; disabled?: boolean }) {
  const contenu = (
    <>
      {icone ?? <IconePlus18 />}
      {children}
    </>
  );
  if (href)
    return (
      <Link href={href} className="pw-primaire">
        {contenu}
      </Link>
    );
  return (
    <button type="button" className="pw-primaire" onClick={onClick} disabled={disabled}>
      {contenu}
    </button>
  );
}

/* ——— le menu « ··· » d'une ligne ——— */
export function MenuLigne({ options, titre = "Plus d'actions" }: { options: Option[]; titre?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [haut, setHaut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const routeur = useRouter();
  const id = useId();
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOuvert(false);
        bouton.current?.focus();
      }
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche, true);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche, true);
    };
  }, [ouvert]);
  const ouvrir = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = bouton.current?.getBoundingClientRect();
    setHaut(!!r && window.innerHeight - r.bottom < 48 * options.length + 16);
    setOuvert((v) => !v);
  };
  return (
    <div className="pw-ancre" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button ref={bouton} type="button" className="pw-plus" aria-label={titre} aria-haspopup="menu" aria-expanded={ouvert} aria-controls={ouvert ? id : undefined} onClick={ouvrir}>
        <IconePoints />
      </button>
      {ouvert ? (
        <div className="pw-menu" role="menu" aria-label={titre} id={id} data-haut={haut ? "" : undefined}>
          {options.map((o) => (
            <button
              key={o.cle}
              type="button"
              className="pw-option"
              role="menuitem"
              data-danger={o.cle.startsWith("retirer") || o.cle.startsWith("supprimer") ? "" : undefined}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOuvert(false);
                if (o.href) routeur.push(o.href);
                else o.action?.();
              }}
            >
              {o.icone}
              <span>{o.libelle}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ——— une ligne ——— */
export type Qui = { nom: string; lettre?: string; icone?: React.ReactNode; couleur?: string; quand?: string | null; iso?: string | null };
export type Regle = {
  id: string;
  href: string;
  ordre: number;
  nom: string;
  /* l'état, à côté du nom : rien quand la règle est active */
  etat?: { libelle: string; teinte?: "orange"; cle?: "desactivee" | "attente" } | null;
  declencheur: string;
  creee: Qui | null;
  modifiee: Qui | null;
  dernier: { texte: string; iso?: string | null; urgence?: boolean } | null;
  options?: Option[];
};
export type TriRegles = { cle: "ordre" | "nom" | "creee" | "modifiee" | "dernier"; sens: "asc" | "desc" };

const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#d96466", "#bb87fc", "#c9a227", "#95a2b3"];
export const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];

function CelluleQui({ qui, className }: { qui: Qui | null; className: string }) {
  if (!qui)
    return (
      <span className={className}>
        <span className="pw-quand">—</span>
      </span>
    );
  return (
    <span className={className}>
      <span className="pw-avatar" data-icone={qui.icone ? "" : undefined} style={qui.couleur ? ({ "--pw-avatar": qui.couleur } as React.CSSProperties) : undefined} title={qui.nom} aria-hidden="true">
        {qui.icone ?? qui.lettre ?? qui.nom.slice(0, 1)}
      </span>
      <span className="pw-qui">
        {qui.nom}
        {qui.quand ? (
          <span>
            {" · "}
            {qui.iso ? <time dateTime={qui.iso}>{qui.quand}</time> : qui.quand}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function LigneRegle({ regle, actif }: { regle: Regle; actif: boolean }) {
  return (
    <li className="pw-ligne pw-grille" data-actif={actif ? "" : undefined} data-etat={regle.etat?.cle}>
      {/* comme chez Plain, le lien couvre la ligne ; le « ··· » reste au-dessus */}
      <Link href={regle.href} replace scroll={false} className="pw-ligne-lien" data-regle={regle.id} aria-label={regle.nom} aria-current={actif ? "true" : undefined} />
      <>
        <span className="pw-c-ordre">
          <span className="pw-poignee" aria-hidden="true">
            <IconePoignee />
          </span>
          <span className="pw-ordre">{regle.ordre}</span>
        </span>
        <span className="pw-c-nom">
          <span className="pw-nom">{regle.nom}</span>
          {regle.etat ? (
            <span className="pw-etat" data-teinte={regle.etat.teinte}>
              {regle.etat.libelle}
            </span>
          ) : null}
        </span>
        <span className="pw-c-badge">
          <span className="pw-badge">{regle.declencheur}</span>
        </span>
        <CelluleQui qui={regle.creee} className="pw-c-qui pw-c-creee" />
        <CelluleQui qui={regle.modifiee} className="pw-c-qui pw-c-modifiee" />
        <span className="pw-c-quand pw-c-dernier" data-urgence={regle.dernier?.urgence ? "" : undefined}>
          {regle.dernier ? regle.dernier.iso ? <time dateTime={regle.dernier.iso}>{regle.dernier.texte}</time> : regle.dernier.texte : "—"}
        </span>
        <span className="pw-c-plus">{regle.options?.length ? <MenuLigne options={regle.options} /> : null}</span>
      </>
    </li>
  );
}

/* ——— la page ——— */
export type OngletRegles = { cle: string; libelle: string; n?: number; href: string };

const COLONNES: { cle: TriRegles["cle"] | "declencheur"; libelle: string; classe: string }[] = [
  { cle: "ordre", libelle: "Ordre", classe: "pw-th-ordre" },
  { cle: "nom", libelle: "Nom", classe: "pw-th-nom" },
  { cle: "declencheur", libelle: "Déclencheur", classe: "pw-th-declencheur" },
  { cle: "creee", libelle: "Créée", classe: "pw-th-creee" },
  { cle: "modifiee", libelle: "Modifiée par", classe: "pw-th-modifiee" },
  { cle: "dernier", libelle: "Dernier déclenchement", classe: "pw-th-dernier" },
];

const valeurTri = (r: Regle, cle: TriRegles["cle"]) => (cle === "ordre" ? r.ordre : cle === "nom" ? r.nom : cle === "creee" ? (r.creee?.iso ?? "") : cle === "modifiee" ? (r.modifiee?.iso ?? "") : (r.dernier?.iso ?? ""));

export function trierRegles(regles: Regle[], tri: TriRegles): Regle[] {
  const s = tri.sens === "asc" ? 1 : -1;
  return [...regles].sort((a, b) => {
    const va = valeurTri(a, tri.cle);
    const vb = valeurTri(b, tri.cle);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * s;
    return String(va).localeCompare(String(vb), "fr") * s || a.ordre - b.ordre;
  });
}

export function ListeRegles({
  titre,
  icone,
  actions,
  principal,
  onglets,
  ongletActif,
  recherche,
  filtres,
  nFiltres,
  note,
  regles,
  tri,
  lienTri,
  colonnes,
  idOuvert,
  vide,
  chargement,
  children,
}: {
  titre: string;
  icone?: React.ReactNode;
  /* les boutons de tête (pf-btn) posés avant le bouton primaire */
  actions?: React.ReactNode;
  principal?: React.ReactNode;
  onglets: OngletRegles[];
  ongletActif: string;
  recherche?: { valeur: string; onChange: (v: string) => void; placeholder: string; libelle: string };
  filtres?: (fermer: () => void) => React.ReactNode;
  nFiltres?: number;
  note?: React.ReactNode;
  regles: Regle[];
  tri: TriRegles;
  lienTri: (cle: TriRegles["cle"]) => string;
  colonnes?: Partial<Record<TriRegles["cle"] | "declencheur", string>>;
  idOuvert: string | null;
  vide: { titre: string; texte: string; geste?: React.ReactNode };
  chargement?: boolean;
  children?: React.ReactNode;
}) {
  const routeur = useRouter();
  const ordre = regles;

  /* ↑/↓ d'une ligne à l'autre, Entrée ouvre (le lien), comme sur la liste des fils */
  const aller = useCallback((href: string) => routeur.replace(href, { scroll: false }), [routeur]);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".pf-menu, .pw-menu, .v2-voile")) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (!ordre.length) return;
      e.preventDefault();
      const courant = (document.activeElement as HTMLElement | null)?.closest?.("[data-regle]")?.getAttribute("data-regle") ?? idOuvert;
      let i = ordre.findIndex((f) => f.id === courant);
      if (i < 0) i = e.key === "ArrowDown" ? 0 : ordre.length - 1;
      else i = e.key === "ArrowDown" ? Math.min(ordre.length - 1, i + 1) : Math.max(0, i - 1);
      const suivant = ordre[i];
      document.querySelector<HTMLElement>(`[data-regle="${CSS.escape(suivant.id)}"]`)?.focus();
      if (idOuvert && suivant.id !== idOuvert) aller(suivant.href);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordre.map((f) => f.id).join("|"), idOuvert, aller]);
  /* à la fermeture de la carte, le focus revient sur la ligne */
  const derniere = useRef<string | null>(null);
  useEffect(() => {
    if (idOuvert) {
      derniere.current = idOuvert;
      return;
    }
    const avant = derniere.current;
    derniere.current = null;
    if (avant) window.setTimeout(() => document.querySelector<HTMLElement>(`[data-regle="${CSS.escape(avant)}"]`)?.focus(), 0);
  }, [idOuvert]);

  return (
    <div className="lin pw">
      <h1 className="v2-sr">{titre}</h1>
      <header className="pw-tete">
        <div className="pw-titre">
          <span className="pw-titre-icone">{icone ?? <IconeRegles />}</span>
          <span className="pw-h1" aria-hidden="true">
            {titre}
          </span>
        </div>
        <div className="pw-actions">
          {actions}
          {principal}
        </div>
      </header>
      <div className="pw-rangee">
        <nav className="pw-onglets" aria-label="Catégorie">
          {onglets.map((o) => (
            <Link key={o.cle} href={o.href} replace scroll={false} className="pw-onglet" data-actif={o.cle === ongletActif ? "" : undefined} aria-current={o.cle === ongletActif ? "page" : undefined}>
              {o.libelle}
              {o.n !== undefined ? <span className="pw-onglet-n">{o.n}</span> : null}
            </Link>
          ))}
        </nav>
        {filtres ? (
          <div className="pw-rangee-droite">
            <MenuPlain icone={<IconeFiltres />} libelle="Filtres" raccourci="F" n={nFiltres || undefined}>
              {filtres}
            </MenuPlain>
          </div>
        ) : null}
      </div>
      {recherche ? (
        <div className="pw-recherche">
          <IconeLoupe />
          <input className="pw-champ" type="search" value={recherche.valeur} onChange={(e) => recherche.onChange(e.target.value)} placeholder={recherche.placeholder} aria-label={recherche.libelle} />
        </div>
      ) : null}
      {note ? (
        <p className="pw-note" role="alert">
          {note}
        </p>
      ) : null}
      <section className="pw-tableau" aria-label={titre}>
        {chargement ? (
          <div className="pw-vide" aria-busy="true">
            <div className="pw-vide-corps">
              <div className="pw-vide-texte">
                <strong>Lecture…</strong>
                <p>La base répond dans un instant.</p>
              </div>
            </div>
          </div>
        ) : regles.length === 0 ? (
          <div className="pw-vide">
            <div className="pw-vide-corps">
              <div className="pw-vide-icone" aria-hidden="true">
                <IconeRegles />
              </div>
              <div className="pw-vide-texte">
                <strong>{vide.titre}</strong>
                <p>{vide.texte}</p>
              </div>
              {vide.geste}
            </div>
          </div>
        ) : (
          <>
            <div className="pw-en-tete pw-grille" role="row">
              {COLONNES.map((c) => {
                const triable = c.cle !== "declencheur";
                const actif = triable && tri.cle === c.cle;
                return (
                  <div key={c.cle} className={`pw-th ${c.classe}`} role="columnheader" aria-sort={actif ? (tri.sens === "asc" ? "ascending" : "descending") : undefined}>
                    {triable ? <Link href={lienTri(c.cle as TriRegles["cle"])} replace scroll={false} className="pw-th-bouton" aria-label={`Trier par ${(colonnes?.[c.cle] ?? c.libelle).toLowerCase()}`} /> : null}
                    <span className="pw-th-contenu">
                      {colonnes?.[c.cle] ?? c.libelle}
                      {actif ? <IconeTri sens={tri.sens} /> : null}
                    </span>
                  </div>
                );
              })}
              <div className="pw-th" role="columnheader" aria-label="Actions" />
            </div>
            <ul className="pw-lignes">
              {regles.map((r) => (
                <LigneRegle key={r.id} regle={r} actif={r.id === idOuvert} />
              ))}
            </ul>
          </>
        )}
      </section>
      {children}
    </div>
  );
}

/* le tri lu dans l'adresse (?tri=nom&sens=desc) et le lien qui le change : un clic sur la colonne déjà
   triée inverse le sens, comme chez Plain */
export function triDepuis(params: { get: (k: string) => string | null }, defaut: TriRegles["cle"] = "ordre"): TriRegles {
  const cle = (["ordre", "nom", "creee", "modifiee", "dernier"].includes(params.get("tri") ?? "") ? params.get("tri") : defaut) as TriRegles["cle"];
  return { cle, sens: params.get("sens") === "desc" ? "desc" : "asc" };
}
export const poserTri = (p: URLSearchParams, courant: TriRegles, cle: TriRegles["cle"], defaut: TriRegles["cle"] = "ordre") => {
  const sens = courant.cle === cle && courant.sens === "asc" ? "desc" : "asc";
  if (cle === defaut) p.delete("tri");
  else p.set("tri", cle);
  if (sens === "desc") p.set("sens", "desc");
  else p.delete("sens");
};
