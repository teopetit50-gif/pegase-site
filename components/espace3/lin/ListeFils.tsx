"use client";

/* ══════════════════════════════════════════════════════════════════════
   La liste des fils de Plain (« All threads »), au 1:1 — 28/10/2026

   Les briques partagées des pages « Litiges et pauses » et « Devis sans
   réponse » (CASHD), « Boîte de réception » et « Refusées » (FILED) :
     · la tête (icône, titre, boutons de 34 avec raccourci clavier « F » / « V »),
     · les onglets d'état (Todo · Snoozed · All statuses chez Plain),
     · les sections (titre, compteur, description, un geste à droite),
     · les lignes (poignée, icône d'état, client, référence + titre + aperçu,
       priorité, étiquettes, heure, assigné),
     · l'état vide, les menus Filtres et Affichage.
   Mesures : ./plain-fils.css (relevé scratchpad/releve-plain-fils.md).

   Les onglets et les filtres vivent dans l'adresse (replace, même route) ;
   ouvrir une ligne pose ?id= et la page ouvre sa carte au milieu
   (./CarteCentrale.tsx). ↑/↓ passent d'une ligne à l'autre, Entrée ouvre,
   Échap ferme ; F et V ouvrent les menus.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, GripVertical, X } from "lucide-react";
import "./plain-fils.css";

/* ——— les icônes de Plain, 18 px, redessinées (anneau « Todo », horloge « Snoozed », coche « Done », bulle, calendrier, personne) ——— */
const svg18 = (titre: string | undefined, className: string | undefined, enfants: React.ReactNode) => (
  <svg className={className} viewBox="0 0 24 24" width="18" height="18" role={titre ? "img" : undefined} aria-label={titre} aria-hidden={titre ? undefined : true}>
    {enfants}
  </svg>
);
export const IconeAnneau = ({ titre, className }: { titre?: string; className?: string }) =>
  svg18(titre, className, <path d="M12 18.3a6.3 6.3 0 1 0 0-12.6 6.3 6.3 0 0 0 0 12.6m0 2.7a9 9 0 1 0 0-18 9 9 0 0 0 0 18" fill="currentColor" fillRule="evenodd" />);
export const IconeHorloge = ({ titre, className }: { titre?: string; className?: string }) =>
  svg18(
    titre,
    className,
    <>
      <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18m0-2.4a6.6 6.6 0 1 0 0-13.2 6.6 6.6 0 0 0 0 13.2" fill="currentColor" fillRule="evenodd" />
      <path d="M12 7.4c.5 0 .9.4.9.9v3.3l2.2 1.3a.9.9 0 1 1-.9 1.56l-2.65-1.55a.9.9 0 0 1-.45-.78V8.3c0-.5.4-.9.9-.9" fill="currentColor" />
    </>,
  );
export const IconeCoche = ({ titre, className }: { titre?: string; className?: string }) =>
  svg18(
    titre,
    className,
    <>
      <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18m0-2.4a6.6 6.6 0 1 0 0-13.2 6.6 6.6 0 0 0 0 13.2" fill="currentColor" fillRule="evenodd" />
      <path d="m8.3 12.2 2.4 2.3 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>,
  );
export const IconeCroix = ({ titre, className }: { titre?: string; className?: string }) =>
  svg18(
    titre,
    className,
    <>
      <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18m0-2.4a6.6 6.6 0 1 0 0-13.2 6.6 6.6 0 0 0 0 13.2" fill="currentColor" fillRule="evenodd" />
      <path d="m9.4 9.4 5.2 5.2m0-5.2-5.2 5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>,
  );
export const IconeBulle = ({ titre, className }: { titre?: string; className?: string }) =>
  svg18(
    titre,
    className,
    <path
      d="M6.34 5.792C4.94 6.955 4 8.756 4 11.38c0 2.002.55 3.515 1.41 4.627.46.594.73 1.5.324 2.367q-.204.435-.423.826c-.086.155-.088.402.033.615a.43.43 0 0 0 .152.167c.027.015.05.021.095.012 1.226-.245 2.547-.69 3.667-1.364a1.6 1.6 0 0 1 1.158-.19c.5.095 1.038.148 1.584.148 2.344 0 4.235-.774 5.502-1.924C18.76 15.52 19.5 13.95 19.5 12.2s-.74-3.32-2.002-4.464C16.231 6.586 14.34 5.812 12 5.812c-2.265 0-4.252.73-5.66-.02M12 4c2.74 0 5.13.91 6.84 2.464C20.558 8.025 21.5 10.15 21.5 12.2c0 2.05-.942 4.175-2.66 5.736C17.13 19.49 14.74 20.4 12 20.4a9 9 0 0 1-1.63-.148c-1.32.76-2.83 1.26-4.21 1.535-1.13.225-2.09-.46-2.49-1.23-.37-.71-.34-1.6.06-2.32.08-.15.16-.31.24-.48C2.74 16.26 2 14.34 2 11.38 2 7.95 3.32 5.57 5.26 4.14 7.09 2.79 9.5 2.1 12 4"
      fill="currentColor"
    />,
  );
export const IconeCalendrier18 = ({ titre, className }: { titre?: string; className?: string }) =>
  svg18(
    titre,
    className,
    <path
      d="M8 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1m10 8H6v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1z"
      fill="currentColor"
      fillRule="evenodd"
    />,
  );
export const IconePersonne = ({ titre, className }: { titre?: string; className?: string }) =>
  svg18(
    titre,
    className,
    <>
      <circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2.2" />
      <path d="M4.8 20c.6-3.6 3.5-5.6 7.2-5.6s6.6 2 7.2 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 2.2" />
    </>,
  );
export const IconeFils = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path
      d="M15.446 4H4.18A1.18 1.18 0 0 0 3 5.18v8.194c0 .592.48 1.072 1.072 1.072 1.224 0 2.22.982 2.24 2.201l2.465-1.776a2.25 2.25 0 0 1 1.316-.425h5.353a1.18 1.18 0 0 0 1.18-1.18V5.18A1.18 1.18 0 0 0 15.446 4M4.18 2h11.266a3.18 3.18 0 0 1 3.18 3.18v8.086a3.18 3.18 0 0 1-3.18 3.18h-5.353a.25.25 0 0 0-.146.047l-3.3 2.378c-1.08.778-2.59.006-2.59-1.326V16.44A3.07 3.07 0 0 1 1 13.374V5.18A3.18 3.18 0 0 1 4.18 2m16.3 6.8a1 1 0 0 1 1 1v6.6a3.18 3.18 0 0 1-3.18 3.18h-4.36a.25.25 0 0 0-.146.047l-2.8 2.02a1 1 0 1 1-1.17-1.623l2.8-2.02a2.25 2.25 0 0 1 1.316-.424h4.36a1.18 1.18 0 0 0 1.18-1.18V9.8a1 1 0 0 1 1-1"
      fill="currentColor"
    />
  </svg>
);
export const IconeFiltres = ({ className }: { className?: string }) =>
  svg18(
    undefined,
    className,
    <path
      d="M3 6.5a1 1 0 0 1 1-1h3.3a3 3 0 0 1 5.4 0H20a1 1 0 1 1 0 2h-7.3a3 3 0 0 1-5.4 0H4a1 1 0 0 1-1-1m7-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2M3 17.5a1 1 0 0 1 1-1h8.3a3 3 0 0 1 5.4 0H20a1 1 0 1 1 0 2h-2.3a3 3 0 0 1-5.4 0H4a1 1 0 0 1-1-1m12-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
      fill="currentColor"
      fillRule="evenodd"
    />,
  );
export const IconeAffichage = ({ className }: { className?: string }) =>
  svg18(undefined, className, <path d="M4 4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 2h16v9H4zm3 13a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2z" fill="currentColor" fillRule="evenodd" />);
export const IconePlus = ({ className }: { className?: string }) =>
  svg18(undefined, className, <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1" fill="currentColor" />);

/* la priorité de Plain : trois barres (Low 1, Normal 2, High 3), un rond plein d'alerte (Urgent 4), rien (0) */
export type Priorite = 0 | 1 | 2 | 3 | 4;
export const PRIORITES: Record<Priorite, string> = { 0: "Aucune", 1: "Basse", 2: "Normale", 3: "Haute", 4: "Urgente" };
export function IconePrioriteFil({ niveau, titre }: { niveau: Priorite; titre?: string }) {
  return (
    <svg className="pf-prio" data-niveau={niveau} viewBox="0 0 18 18" width="18" height="18" role={titre ? "img" : undefined} aria-label={titre} aria-hidden={titre ? undefined : true}>
      {niveau === 4 ? (
        <>
          <circle cx="9" cy="9" r="7" fill="currentColor" />
          <path d="M9 5.2v4.6" stroke="var(--lin-fond)" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="9" cy="12.6" r="1" fill="var(--lin-fond)" />
        </>
      ) : (
        [4, 8, 12].map((y, i) => <rect key={y} x="3" y={y} width="12" height="2" rx="0.5" data-eteinte={3 - i <= niveau ? undefined : ""} />)
      )}
    </svg>
  );
}

/* ——— le bouton de la tête ——— */
export function BoutonPlain({
  icone,
  children,
  raccourci,
  n,
  actif,
  href,
  onClick,
  libelle,
  ouvert,
  boutonRef,
}: {
  icone: React.ReactNode;
  children: React.ReactNode;
  raccourci?: string;
  n?: number;
  actif?: boolean;
  href?: string;
  onClick?: () => void;
  libelle?: string;
  ouvert?: boolean;
  boutonRef?: React.Ref<HTMLButtonElement>;
}) {
  const contenu = (
    <>
      {icone}
      <span className="pf-btn-libelle">{children}</span>
      {n ? <span className="pf-btn-n">{n}</span> : null}
      {raccourci ? <kbd className="pf-kbd">{raccourci}</kbd> : null}
    </>
  );
  if (href)
    return (
      <Link href={href} className="pf-btn" aria-label={libelle} data-actif={actif ? "" : undefined}>
        {contenu}
      </Link>
    );
  return (
    <button ref={boutonRef} type="button" className="pf-btn" aria-label={libelle} aria-expanded={ouvert} aria-haspopup={ouvert === undefined ? undefined : "menu"} data-actif={actif ? "" : undefined} onClick={onClick}>
      {contenu}
    </button>
  );
}

/* ——— un menu de la tête (Filtres, Affichage) : s'ouvre au clic et au raccourci, se ferme dehors et à Échap ——— */
export function MenuPlain({
  icone,
  libelle,
  raccourci,
  n,
  large,
  children,
}: {
  icone: React.ReactNode;
  libelle: string;
  raccourci?: string;
  n?: number;
  large?: boolean;
  children: (fermer: () => void) => React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
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
  useEffect(() => {
    if (!raccourci) return;
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)))) return;
      if (document.querySelector(".v2-voile")) return;
      if (e.key.toLowerCase() === raccourci.toLowerCase()) {
        /* pris avant le cadre du dashboard (F y ouvre la palette) : sur ces pages, F est le menu Filtres, comme chez Plain ; ⌘K garde la palette */
        e.preventDefault();
        e.stopPropagation();
        setOuvert(true);
      }
    };
    window.addEventListener("keydown", touche, true);
    return () => window.removeEventListener("keydown", touche, true);
  }, [raccourci]);
  return (
    <div className="pf-ancre" ref={ref}>
      <BoutonPlain boutonRef={bouton} icone={icone} raccourci={raccourci} n={n} actif={!!n} ouvert={ouvert} onClick={() => setOuvert((v) => !v)}>
        {libelle}
      </BoutonPlain>
      {ouvert ? (
        <div className={large ? "pf-menu pf-menu--large" : "pf-menu"} role="menu" aria-label={libelle} id={id}>
          {children(() => setOuvert(false))}
        </div>
      ) : null}
    </div>
  );
}

/* une option de menu : icône, libellé, compteur, coche quand elle est posée */
export function OptionPlain({ icone, children, n, actif, onClick, chevron }: { icone?: React.ReactNode; children: React.ReactNode; n?: number; actif?: boolean; onClick: () => void; chevron?: boolean }) {
  return (
    <button type="button" className="pf-option" role="menuitemcheckbox" aria-checked={actif} onClick={onClick}>
      {icone ? <span className="pf-option-icone">{icone}</span> : null}
      <span className="pf-option-libelle">{children}</span>
      {n !== undefined ? <span className="pf-option-n">{n}</span> : null}
      {actif ? <Check className="pf-option-coche" aria-hidden="true" /> : chevron ? <ChevronDown className="pf-option-chevron" aria-hidden="true" /> : null}
    </button>
  );
}

/* un champ à choix du menu Affichage (« Sort by » de Plain) */
export function ChampPlain<T extends string>({ valeur, options, onChange, libelle }: { valeur: T; options: { cle: T; libelle: string }[]; onChange: (v: T) => void; libelle: string }) {
  return (
    <span className="pf-champ">
      {options.find((o) => o.cle === valeur)?.libelle}
      <ChevronDown aria-hidden="true" />
      <select aria-label={libelle} value={valeur} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.cle} value={o.cle}>
            {o.libelle}
          </option>
        ))}
      </select>
    </span>
  );
}

/* ——— les onglets d'état ——— */
export type OngletFil = { cle: string; libelle: string; icone?: React.ReactNode; teinte?: "bleu" | "orange"; n?: number; href: string };
export type FiltrePose = { cle: string; libelle: string; icone?: React.ReactNode; href: string };

/* ——— une ligne ——— */
export type Fil = {
  id: string;
  href: string;
  /* l'icône d'état (18) à gauche ; bleu = à traiter */
  etat: React.ReactNode;
  etatTeinte?: "bleu" | "orange";
  avatar: { lettre?: string; icone?: React.ReactNode; couleur?: string; titre?: string };
  client: string;
  contact?: string | null;
  badge?: { texte: string; teinte?: "orange" } | null;
  ref: string;
  titre: string;
  apercu?: string | null;
  priorite: Priorite;
  etiquettes?: React.ReactNode;
  heure: { texte: string; iso?: string; icone?: "bulle" | "calendrier" | "horloge"; urgence?: boolean };
  qui?: { lettre: string; icone?: React.ReactNode; couleur?: string; titre: string } | null;
};

const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#d96466", "#bb87fc", "#c9a227", "#95a2b3"];
/* une couleur par identifiant, stable (la même que les autres pages du gabarit) */
export const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
export const initialesDe = (nom: string) => {
  const mots = nom
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (mots.length > 1 ? mots[0][0] + mots[1][0] : (mots[0] ?? "?").slice(0, 1)).toUpperCase();
};

const ICONES_HEURE = { bulle: IconeBulle, calendrier: IconeCalendrier18, horloge: IconeHorloge };

export function LigneFil({ fil, actif }: { fil: Fil; actif: boolean }) {
  const Heure = ICONES_HEURE[fil.heure.icone ?? "bulle"];
  return (
    <li>
      <Link href={fil.href} replace scroll={false} className="pf-ligne" data-fil={fil.id} data-actif={actif ? "" : undefined} aria-current={actif ? "true" : undefined}>
        <span className="pf-c-poignee" aria-hidden="true">
          <span className="pf-poignee">
            <GripVertical />
          </span>
        </span>
        <span className="pf-c-etat" data-teinte={fil.etatTeinte}>
          {fil.etat}
        </span>
        <span className="pf-c-client">
          <span
            className="pf-avatar"
            data-icone={fil.avatar.icone ? "" : undefined}
            style={fil.avatar.couleur ? ({ "--pf-avatar": fil.avatar.couleur } as React.CSSProperties) : undefined}
            title={fil.avatar.titre}
            aria-hidden="true"
          >
            {fil.avatar.icone ?? fil.avatar.lettre}
          </span>
          <span className="pf-client">
            <b>{fil.client}</b>
            {fil.contact ? <span>{fil.contact}</span> : null}
          </span>
          {fil.badge ? (
            <span className="pf-badge" data-teinte={fil.badge.teinte}>
              {fil.badge.texte}
            </span>
          ) : null}
        </span>
        <span className="pf-c-titre">
          <span className="pf-ref">{fil.ref}</span>
          <span className="pf-titre-fil">{fil.titre}</span>
          {fil.apercu ? <span className="pf-apercu">{fil.apercu}</span> : null}
        </span>
        <span className="pf-c-prio" title={`Priorité ${PRIORITES[fil.priorite].toLowerCase()}`}>
          <IconePrioriteFil niveau={fil.priorite} />
          <span>{PRIORITES[fil.priorite]}</span>
        </span>
        <span className="pf-c-etiquettes">{fil.etiquettes}</span>
        <span className="pf-c-heure" data-urgence={fil.heure.urgence ? "" : undefined}>
          <Heure />
          {fil.heure.iso ? <time dateTime={fil.heure.iso}>{fil.heure.texte}</time> : <span>{fil.heure.texte}</span>}
        </span>
        <span className="pf-c-qui">
          <span className="pf-qui" title={fil.qui ? fil.qui.titre : "Non assigné"} aria-hidden="true">
            {fil.qui ? (
              <span className="pf-qui-avatar" data-icone={fil.qui.icone ? "" : undefined} style={fil.qui.couleur ? ({ "--pf-avatar": fil.qui.couleur } as React.CSSProperties) : undefined}>
                {fil.qui.icone ?? fil.qui.lettre}
              </span>
            ) : (
              <IconePersonne />
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

/* ——— une section de lignes ——— */
export type SectionFils = { cle: string; titre: string; icone?: React.ReactNode; n?: number; description?: string; droite?: React.ReactNode; fils: Fil[] };

/* ——— la page ——— */
export function ListeFils({
  titre,
  icone,
  actions,
  onglets,
  ongletActif,
  filtresPoses,
  note,
  sections,
  idOuvert,
  vide,
  chargement,
  children,
}: {
  titre: string;
  icone?: React.ReactNode;
  actions?: React.ReactNode;
  onglets: OngletFil[];
  ongletActif: string;
  filtresPoses?: FiltrePose[];
  note?: React.ReactNode;
  sections: SectionFils[];
  idOuvert: string | null;
  vide: { titre: string; texte: string; geste?: React.ReactNode };
  chargement?: boolean;
  children?: React.ReactNode;
}) {
  const routeur = useRouter();
  const total = sections.reduce((n, s) => n + s.fils.length, 0);
  const ordre = sections.flatMap((s) => s.fils);

  /* ↑/↓ d'une ligne à l'autre, Entrée ouvre (le lien), Échap referme ce qui est ouvert */
  const aller = useCallback((href: string) => routeur.replace(href, { scroll: false }), [routeur]);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".pf-menu, .v2-voile")) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (!ordre.length) return;
      e.preventDefault();
      const courant = (document.activeElement as HTMLElement | null)?.closest?.("[data-fil]")?.getAttribute("data-fil") ?? idOuvert;
      let i = ordre.findIndex((f) => f.id === courant);
      if (i < 0) i = e.key === "ArrowDown" ? 0 : ordre.length - 1;
      else i = e.key === "ArrowDown" ? Math.min(ordre.length - 1, i + 1) : Math.max(0, i - 1);
      const suivant = ordre[i];
      document.querySelector<HTMLElement>(`[data-fil="${CSS.escape(suivant.id)}"]`)?.focus();
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
    if (avant) window.setTimeout(() => document.querySelector<HTMLElement>(`[data-fil="${CSS.escape(avant)}"]`)?.focus(), 0);
  }, [idOuvert]);

  return (
    <div className="lin pf">
      <h1 className="v2-sr">{titre}</h1>
      <header className="pf-tete">
        <div className="pf-titre">
          <span className="pf-titre-icone">{icone ?? <IconeFils />}</span>
          <span className="pf-h1" aria-hidden="true">
            {titre}
          </span>
        </div>
        <div className="pf-actions">{actions}</div>
      </header>
      <div className="pf-onglets-rangee">
        <nav className="pf-onglets" aria-label="État">
          {onglets.map((o) => (
            <Link key={o.cle} href={o.href} replace scroll={false} className="pf-onglet" data-actif={o.cle === ongletActif ? "" : undefined} aria-current={o.cle === ongletActif ? "page" : undefined}>
              <span className="pf-onglet-contenu">
                {o.icone ? (
                  <span className="pf-onglet-icone" data-teinte={o.teinte}>
                    {o.icone}
                  </span>
                ) : null}
                <span className="pf-onglet-libelle">{o.libelle}</span>
                {o.n !== undefined ? <span className="pf-onglet-n">{o.n}</span> : null}
              </span>
            </Link>
          ))}
        </nav>
        {filtresPoses?.length ? (
          <div className="pf-filtres-poses" aria-label="Filtres posés">
            {filtresPoses.map((f) => (
              <Link key={f.cle} href={f.href} replace scroll={false} className="pf-onglet pf-onglet--filtre" title="Retirer ce filtre">
                <span className="pf-onglet-contenu">
                  {f.icone ? <span className="pf-onglet-icone">{f.icone}</span> : null}
                  <span className="pf-onglet-libelle">{f.libelle}</span>
                </span>
                <span className="pf-onglet-x">
                  <X aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      {note ? (
        <p className="pf-note" role="alert">
          {note}
        </p>
      ) : null}
      {chargement ? (
        <div className="pf-vide" aria-busy="true">
          <div className="pf-vide-carte">
            <strong>Lecture…</strong>
            <p>La base répond dans un instant.</p>
          </div>
        </div>
      ) : total === 0 ? (
        <div className="pf-vide">
          <div className="pf-vide-carte">
            <strong>{vide.titre}</strong>
            <p>{vide.texte}</p>
            {vide.geste}
          </div>
        </div>
      ) : (
        sections
          .filter((s) => s.fils.length)
          .map((s) => (
            <section key={s.cle} aria-label={s.titre}>
              <div className="pf-section-tete">
                <div className="pf-section-ligne">
                  <div>
                    <div className="pf-section-titre">
                      {s.icone ?? <IconeFils />}
                      <h2>{s.titre}</h2>
                      <span className="pf-section-n">{s.n ?? s.fils.length}</span>
                    </div>
                    {s.description ? <p className="pf-section-desc">{s.description}</p> : null}
                  </div>
                  {s.droite ? <div className="pf-section-droite">{s.droite}</div> : null}
                </div>
              </div>
              <ul className="pf-lignes">
                {s.fils.map((f) => (
                  <LigneFil key={f.id} fil={f} actif={f.id === idOuvert} />
                ))}
              </ul>
            </section>
          ))
      )}
      {children}
    </div>
  );
}

/* l'adresse courante modifiée (onglet, filtre, ligne ouverte), toujours sur la même route */
export function useAdresse(chemin: string, params: { toString: () => string }) {
  return useCallback(
    (modif: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(params.toString());
      modif(p);
      const qs = p.toString().replace(/%3A/gi, ":");
      return qs ? `${chemin}?${qs}` : chemin;
    },
    [chemin, params],
  );
}
