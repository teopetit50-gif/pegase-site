"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'éditeur de workflow de Plain, au 1:1 — 28/10/2026 (2e vague)

   Les briques partagées de « Circuit de validation » (FILED) :
     · la barre du haut (← retour, nom, badge d'état, ⋯, boutons, bascule du panneau),
     · le canevas pointillé : blocs absolus (pastille + titre, rangées, puces,
       poignées), liens bézier mesurés sur les poignées, déplacement à la
       souris, zoom (molette avec ⌘/Ctrl, boutons), mini-carte, raccourcis,
     · le panneau de droite : en-tête, onglets, recherche, groupes
       d'éléments, lignes d'exécution, fiche, étapes, et les briques du
       panneau « Configurer » (sections, champs, cartes de condition, encart).
   Mesures : ./plain-editeur.css (relevé scratchpad/releve-plain-editeur.md).

   Rien ne se construit ici par glisser-déposer : les blocs viennent des
   données de la page (règles, délégations), le panneau liste ce qui existe.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Info, Keyboard, Maximize, Minus, PanelRight, Plus, Search, Shuffle } from "lucide-react";
import "./plain-editeur.css";

/* ——— modèle ——— */
export type TeintePE = "vert" | "jaune" | "indigo" | "gris";
export type NoeudPE = {
  id: string;
  teinte: TeintePE;
  icone: React.ReactNode;
  titre: string;
  colonne: number;
  rangee: number;
  /* le corps : des rangées (Rangee, RangeeAction, RangeeSinon, Condition) qui posent leurs propres poignées de sortie */
  corps: React.ReactNode;
  /* une poignée d'entrée au milieu du bloc (tout bloc sauf le déclencheur) */
  entree?: boolean;
  /* une poignée de sortie au milieu du bloc (déclencheur, action) : sa clé */
  sortie?: string;
  /* le libellé lu par un lecteur d'écran */
  libelle?: string;
  /* le bloc attend quelqu'un : un halo ambre qui respire (la Carte, « Vous ») */
  alerte?: boolean;
  /* posé au milieu de la hauteur du dessin, hors rangées (la Carte : « Vous », où tous les agents convergent) */
  centre?: boolean;
};
/* flux : le nombre de points qui courent sur le lien (0 à 3) — la Carte montre ce qui passe */
export type LienPE = { de: string; sortie: string; vers: string; flux?: number };
export type Vue = { x: number; y: number; k: number };

const LARGEUR_BLOC = 308;
const PAS_COLONNE = 408;
const MARGE = 40;
const ECART_RANGEE = 60;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;

/* ——— les petites briques des blocs ——— */
export function Pastille({ teinte, children }: { teinte: TeintePE; children: React.ReactNode }) {
  return (
    <span className="pe-pastille" data-teinte={teinte} aria-hidden="true">
      {children}
    </span>
  );
}
export function Poignee({ cote, cle }: { cote: "entree" | "sortie"; cle: string }) {
  return <span className="pe-poignee" data-cote={cote} data-poignee={cle} aria-hidden="true" />;
}
export function Puce({ icone, children }: { icone?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="pe-puce">
      {icone}
      {children}
    </span>
  );
}
export function Op({ children }: { children: React.ReactNode }) {
  return <span className="pe-op">{children}</span>;
}
export function Rangee({ children, sortie }: { children: React.ReactNode; sortie?: string }) {
  return (
    <div className="pe-rangee">
      {children}
      {sortie ? <Poignee cote="sortie" cle={sortie} /> : null}
    </div>
  );
}
export function RangeeAction({ icone, children }: { icone?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pe-rangee pe-rangee--action">
      {icone}
      <span>{children}</span>
    </div>
  );
}
export function RangeeSinon({ children, sortie }: { children: React.ReactNode; sortie?: string }) {
  return (
    <div className="pe-rangee pe-rangee--sinon">
      <span>{children}</span>
      {sortie ? <Poignee cote="sortie" cle={sortie} /> : null}
    </div>
  );
}
/* la rangée « If » : un libellé 12/600, puis des lignes de puces ; chaque ligne est un tableau de puces / opérateurs */
export function Condition({ libelle, lignes, sortie }: { libelle: string; lignes: React.ReactNode[]; sortie?: string }) {
  return (
    <div className="pe-condition">
      <span className="pe-condition-libelle">{libelle}</span>
      <div className="pe-condition-lignes">
        {lignes.map((l, i) => (
          <div className="pe-condition-ligne" key={i}>
            {l}
          </div>
        ))}
      </div>
      {sortie ? <Poignee cote="sortie" cle={sortie} /> : null}
    </div>
  );
}

/* ——— les briques du panneau ——— */
export function Badge({ teinte, petit, children }: { teinte?: "vert" | "ambre" | "rouge" | "gris" | "bleu"; petit?: boolean; children: React.ReactNode }) {
  return (
    <span className={petit ? "pe-badge pe-badge--petit" : "pe-badge"} data-teinte={teinte && teinte !== "bleu" ? teinte : undefined}>
      {children}
    </span>
  );
}
export function Onglets<T extends string>({ onglets, actif, changer, libelle }: { onglets: { cle: T; libelle: string; n?: number }[]; actif: T; changer: (c: T) => void; libelle: string }) {
  return (
    <div className="pe-onglets" role="tablist" aria-label={libelle}>
      {onglets.map((o) => (
        <button key={o.cle} type="button" role="tab" className="pe-onglet" aria-selected={o.cle === actif} onClick={() => changer(o.cle)}>
          <span className="pe-onglet-libelle">
            <span>{o.libelle}</span>
            <span aria-hidden="true">{o.libelle}</span>
          </span>
          {o.n ? <span className="pe-onglet-n">{o.n}</span> : null}
        </button>
      ))}
    </div>
  );
}
export function PanneauTete({ retour, titre, leger, droite }: { retour?: () => void; titre: React.ReactNode; leger?: boolean; droite?: React.ReactNode }) {
  return (
    <div className="pe-panneau-tete">
      <div className="pe-panneau-tete-gauche">
        {retour ? (
          <button type="button" className="pe-icone" aria-label="Retour" onClick={retour}>
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : null}
        <span className={leger ? "pe-panneau-titre pe-panneau-titre--leger" : "pe-panneau-titre"}>{titre}</span>
      </div>
      {droite}
    </div>
  );
}
export function Recherche({ valeur, changer, placeholder, libelle }: { valeur: string; changer: (v: string) => void; placeholder: string; libelle: string }) {
  return (
    <div className="pe-recherche">
      <Search aria-hidden="true" />
      <input type="search" value={valeur} onChange={(e) => changer(e.target.value)} placeholder={placeholder} aria-label={libelle} />
    </div>
  );
}
export function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="pe-groupe">
      <span className="pe-groupe-titre">{titre}</span>
      {children}
    </div>
  );
}
export function ElementPanneau({
  teinte,
  icone,
  children,
  chip,
  aide,
  actif,
  onClick,
}: {
  teinte: TeintePE;
  icone: React.ReactNode;
  children: React.ReactNode;
  chip?: React.ReactNode;
  aide?: string;
  actif?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="pe-element">
      <button type="button" className="pe-element-btn" aria-pressed={actif} onClick={onClick} title={aide}>
        <Pastille teinte={teinte}>{icone}</Pastille>
        <span className="pe-element-nom">{children}</span>
        {chip}
      </button>
      {aide ? (
        <span className="pe-element-info">
          <Info aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}
export function LigneExecution({ date, sous, badge, onClick }: { date: string; sous?: string; badge: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="pe-execution" onClick={onClick}>
      <span className="pe-execution-date">
        {date}
        {sous ? <span className="pe-execution-sous">{sous}</span> : null}
      </span>
      <span className="pe-execution-droite">
        {badge}
        <ChevronRight aria-hidden="true" />
      </span>
    </button>
  );
}
export function Fiche({ lignes }: { lignes: { libelle: string; valeur: React.ReactNode }[] }) {
  return (
    <dl className="pe-fiche">
      {lignes.map((l) => (
        <div key={l.libelle} style={{ display: "contents" }}>
          <dt>{l.libelle}</dt>
          <dd>{l.valeur}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Etape({
  teinte,
  icone,
  titre,
  badge,
  duree,
  quand,
  children,
}: {
  teinte: TeintePE;
  icone: React.ReactNode;
  titre: string;
  badge?: React.ReactNode;
  duree?: string;
  quand?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="pe-etape">
      <Pastille teinte={teinte}>{icone}</Pastille>
      <div className="pe-etape-colonne">
        <span className="pe-etape-titre">{titre}</span>
        {badge || duree || quand ? (
          <div className="pe-etape-badges">
            <span className="pe-etape-badges-gauche">
              {badge}
              {duree ? <span>{duree}</span> : null}
            </span>
            {quand ? <span>{quand}</span> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
export function Section({ titre, texte, gris, espace, children }: { titre: string; texte?: string; gris?: boolean; espace?: boolean; children?: React.ReactNode }) {
  return (
    <section className={espace ? "pe-section pe-section--espace" : "pe-section"} aria-label={titre}>
      <div className="pe-section-tete">
        <span className={gris ? "pe-section-titre pe-section-titre--gris" : "pe-section-titre"}>{titre}</span>
        {texte ? <p className="pe-section-texte">{texte}</p> : null}
      </div>
      {children}
    </section>
  );
}
/* le champ-sélecteur de Plain : ici une valeur lue (pas de porte pour la changer), le chevron reste pour le dessin */
export function Champ({ icone, children, gris, haut }: { icone?: React.ReactNode; children: React.ReactNode; gris?: boolean; haut?: boolean }) {
  return (
    <div className={haut ? "pe-champ pe-champ--32" : "pe-champ"} data-gris={gris ? "" : undefined}>
      {icone ? <span className="pe-champ-icone">{icone}</span> : null}
      <span className="pe-champ-valeur">{children}</span>
      <span className="pe-champ-chevron" aria-hidden="true">
        <ChevronDown />
      </span>
    </div>
  );
}
export function CarteCondition({ libelle, aide, children }: { libelle: string; aide?: string; children: React.ReactNode }) {
  return (
    <div className="pe-carte">
      <div className="pe-carte-tete">
        <span className="pe-carte-libelle" title={aide}>
          {libelle}
          {aide ? <Info aria-hidden="true" /> : null}
        </span>
      </div>
      {children}
    </div>
  );
}
export function Ou({ children }: { children: React.ReactNode }) {
  return (
    <span className="pe-ou">
      {children}
      <ChevronDown aria-hidden="true" />
    </span>
  );
}
export function Encart({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="pe-encart">
      <Info aria-hidden="true" />
      <div>
        <span className="pe-encart-titre">{titre}</span>
        <p>{children}</p>
      </div>
    </div>
  );
}

/* ——— l'éditeur ——— */
export type PoigneeEditeur = { centrer: (id: string) => void; ajuster: () => void };

type Props = {
  titre: string;
  retour: string;
  badge?: { libelle: string; teinte?: "vert" | "ambre" | "rouge" | "gris" | "bleu" };
  /* à droite de la barre, avant la bascule du panneau (⋯, boutons) */
  actions?: React.ReactNode;
  noeuds: NoeudPE[];
  liens: LienPE[];
  selection: string | null;
  choisir: (id: string | null) => void;
  /* les blocs qui ne répondent pas à la recherche, atténués */
  eteints?: ReadonlySet<string>;
  panneau: React.ReactNode;
  vide?: { titre: string; texte: string };
  /* une carte posée en haut à gauche du canevas, hors zoom (la Carte : les chiffres de la période) */
  entete?: React.ReactNode;
  /* ajuster le dessin à la fenêtre au premier rendu, sur toutes les largeurs */
  ajusterAuDepart?: boolean;
  /* l'écart entre deux colonnes (408 chez Plain) ; la Carte, à quatre colonnes, les resserre */
  pasColonne?: number;
  /* le panneau fermé à l'ouverture : il s'ouvre au premier bloc choisi (la Carte laisse toute la place au dessin) */
  panneauFerme?: boolean;
  /* la mini-carte en bas à droite (par défaut) ; la Carte, ajustée à la fenêtre, s'en passe */
  miniCarte?: boolean;
};

export const EditeurPlain = forwardRef<PoigneeEditeur, Props>(function EditeurPlain({ titre, retour, badge, actions, noeuds, liens, selection, choisir, eteints, panneau, vide, entete, ajusterAuDepart, pasColonne = PAS_COLONNE, panneauFerme, miniCarte = true }, ref) {
  /* null : « auto » — fermé sur un écran large, ouvert sur un téléphone (où il est, sous le canevas, la version qui se lit) ; le CSS tranche, le serveur et le navigateur rendent la même chose */
  const [choixPanneau, setChoixPanneau] = useState<boolean | null>(panneauFerme ? null : true);
  const panneauOuvert = choixPanneau ?? false;
  /* un bloc choisi ouvre le panneau, qui le détaille */
  const [selectionVue, setSelectionVue] = useState(selection);
  if (selection !== selectionVue) {
    setSelectionVue(selection);
    if (selection) setChoixPanneau(true);
  }
  const enteteRef = useRef<HTMLDivElement>(null);
  const [vue, setVue] = useState<Vue>({ x: 0, y: 0, k: 1 });
  const [hauteurs, setHauteurs] = useState<Record<string, number>>({});
  const [chemins, setChemins] = useState<{ cle: string; d: string; actif: boolean; flux: number }[]>([]);
  const [raccourcis, setRaccourcis] = useState(false);
  const canevas = useRef<HTMLDivElement>(null);
  const vueRef = useRef<HTMLDivElement>(null);
  const blocs = useRef(new Map<string, HTMLButtonElement>());
  const idRaccourcis = useId();

  /* positions : colonnes à 408, rangées empilées sur la plus haute de chaque rangée + 60 */
  const positions = useMemo(() => {
    const parRangee = new Map<number, number>();
    for (const n of noeuds) if (!n.centre) parRangee.set(n.rangee, Math.max(parRangee.get(n.rangee) ?? 0, hauteurs[n.id] ?? 96));
    const rangees = Array.from(parRangee.keys()).sort((a, b) => a - b);
    const y = new Map<number, number>();
    let cumul = MARGE;
    for (const r of rangees) {
      y.set(r, cumul);
      cumul += (parRangee.get(r) ?? 96) + ECART_RANGEE;
    }
    const p = new Map<string, { x: number; y: number; h: number }>();
    const hauteurTotale = Math.max(0, cumul - ECART_RANGEE - MARGE);
    for (const n of noeuds) {
      const h = hauteurs[n.id] ?? 96;
      p.set(n.id, { x: MARGE + n.colonne * pasColonne, y: n.centre ? MARGE + Math.max(0, (hauteurTotale - h) / 2) : (y.get(n.rangee) ?? MARGE), h });
    }
    return p;
  }, [noeuds, hauteurs, pasColonne]);

  const bornes = useMemo(() => {
    if (!noeuds.length) return { x: 0, y: 0, w: 0, h: 0 };
    let x1 = Infinity,
      y1 = Infinity,
      x2 = -Infinity,
      y2 = -Infinity;
    for (const n of noeuds) {
      const p = positions.get(n.id)!;
      x1 = Math.min(x1, p.x);
      y1 = Math.min(y1, p.y);
      x2 = Math.max(x2, p.x + LARGEUR_BLOC);
      y2 = Math.max(y2, p.y + p.h);
    }
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }, [noeuds, positions]);

  /* mesure des blocs : un ResizeObserver sur chacun, les rangées se calent sur le plus haut */
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      const suivant: Record<string, number> = {};
      for (const [id, el] of blocs.current) suivant[id] = el.offsetHeight;
      setHauteurs((avant) => (Object.keys(suivant).length === Object.keys(avant).length && Object.entries(suivant).every(([k, v]) => avant[k] === v) ? avant : suivant));
    });
    for (const el of blocs.current.values()) ro.observe(el);
    return () => ro.disconnect();
  }, [noeuds]);

  /* les liens, mesurés sur les poignées (coordonnées du canevas, hors zoom), à la frame suivante */
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      const vp = vueRef.current;
      if (!vp) return;
      const base = vp.getBoundingClientRect();
      const centre = (el: Element | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: (r.left + r.width / 2 - base.left) / vue.k, y: (r.top + r.height / 2 - base.top) / vue.k };
      };
      const suivant: { cle: string; d: string; actif: boolean; flux: number }[] = [];
      for (const l of liens) {
        const de = blocs.current.get(l.de);
        const vers = blocs.current.get(l.vers);
        if (!de || !vers) continue;
        const a = centre(de.querySelector(`[data-poignee="${CSS.escape(l.sortie)}"]`));
        const b = centre(vers.querySelector('[data-poignee="entree"]'));
        if (!a || !b) continue;
        const dx = Math.max(24, Math.abs(b.x - a.x) / 2);
        suivant.push({ cle: `${l.de}:${l.sortie}>${l.vers}`, d: `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`, actif: selection === l.de || selection === l.vers, flux: Math.max(0, Math.min(3, l.flux ?? 0)) });
      }
      setChemins((avant) => (avant.length === suivant.length && avant.every((c, i) => c.d === suivant[i].d && c.actif === suivant[i].actif && c.cle === suivant[i].cle && c.flux === suivant[i].flux) ? avant : suivant));
    });
    return () => cancelAnimationFrame(id);
  }, [liens, positions, vue.k, selection, noeuds]);

  /* zoom autour d'un point du canevas (coordonnées écran relatives au canevas) */
  const zoomer = useCallback((facteur: number, px?: number, py?: number) => {
    setVue((v) => {
      const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * facteur));
      const el = canevas.current;
      const cx = px ?? (el ? el.clientWidth / 2 : 0);
      const cy = py ?? (el ? el.clientHeight / 2 : 0);
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });
  }, []);

  const ajuster = useCallback(() => {
    const el = canevas.current;
    if (!el || !bornes.w) return;
    /* la carte d'en-tête (s'il y en a une, et qu'elle se voit) garde sa place au-dessus du dessin */
    const haut = enteteRef.current?.offsetHeight ? enteteRef.current.offsetHeight + 15 : 0;
    const W = el.clientWidth;
    const H = el.clientHeight - haut;
    const k = Math.min(1, (W - 2 * MARGE) / bornes.w, (H - 2 * MARGE) / bornes.h, ZOOM_MAX);
    setVue({ k, x: (W - bornes.w * k) / 2 - bornes.x * k, y: haut + (H - bornes.h * k) / 2 - bornes.y * k });
  }, [bornes]);

  const centrer = useCallback(
    (id: string) => {
      const el = canevas.current;
      const p = positions.get(id);
      if (!el || !p) return;
      setVue((v) => ({ k: v.k, x: el.clientWidth / 2 - (p.x + LARGEUR_BLOC / 2) * v.k, y: el.clientHeight / 2 - (p.y + p.h / 2) * v.k }));
    },
    [positions],
  );

  useImperativeHandle(ref, () => ({ centrer, ajuster }), [centrer, ajuster]);

  /* sur un écran étroit (téléphone, panneau dessous), le circuit s'ajuste une fois à la fenêtre ; ailleurs il reste à l'échelle 1, comme chez Plain */
  const ajusteUneFois = useRef(false);
  useEffect(() => {
    if (ajusteUneFois.current || !bornes.w || !Object.keys(hauteurs).length) return;
    ajusteUneFois.current = true;
    if (ajusterAuDepart || window.matchMedia("(max-width: 899px)").matches) ajuster();
  }, [bornes, hauteurs, ajuster, ajusterAuDepart]);

  /* molette : déplacement ; avec ⌘ / Ctrl (ou pincement) : zoom autour du curseur */
  useEffect(() => {
    const el = canevas.current;
    if (!el) return;
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomer(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      else setVue((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener("wheel", molette, { passive: false });
    return () => el.removeEventListener("wheel", molette);
  }, [zoomer]);

  /* glisser le fond : déplacement ; un clic sans mouvement désélectionne */
  const glisse = useRef<{ x: number; y: number; vx: number; vy: number; bouge: boolean } | null>(null);
  const [enGlisse, setEnGlisse] = useState(false);
  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".pe-bloc, .pe-commandes, .pe-minicarte, .pe-raccourcis, .pe-vide, .pe-entete")) return;
    if (e.button !== 0) return;
    glisse.current = { x: e.clientX, y: e.clientY, vx: vue.x, vy: vue.y, bouge: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = glisse.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.bouge && Math.hypot(dx, dy) < 3) return;
    if (!g.bouge) {
      g.bouge = true;
      setEnGlisse(true);
    }
    setVue((v) => ({ ...v, x: g.vx + dx, y: g.vy + dy }));
  };
  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = glisse.current;
    glisse.current = null;
    setEnGlisse(false);
    if (g && !g.bouge) {
      choisir(null);
      setRaccourcis(false);
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const clavier = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "+" || e.key === "=") zoomer(1.2);
    else if (e.key === "-") zoomer(1 / 1.2);
    else if (e.key === "0") ajuster();
    else if (e.key === "Escape") {
      choisir(null);
      setRaccourcis(false);
    } else return;
    e.preventDefault();
  };

  /* la mini-carte : tout le circuit + la fenêtre visible, à l'échelle dans 200 × 150 */
  const [taille, setTaille] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = canevas.current;
    if (!el) return;
    const mesurer = () => setTaille({ w: el.clientWidth, h: el.clientHeight });
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mini = useMemo(() => {
    const fen = { x: -vue.x / vue.k, y: -vue.y / vue.k, w: taille.w / vue.k, h: taille.h / vue.k };
    const x1 = Math.min(bornes.x, fen.x);
    const y1 = Math.min(bornes.y, fen.y);
    const x2 = Math.max(bornes.x + bornes.w, fen.x + fen.w);
    const y2 = Math.max(bornes.y + bornes.h, fen.y + fen.h);
    const w = Math.max(1, x2 - x1);
    const h = Math.max(1, y2 - y1);
    const s = Math.min(180 / w, 130 / h);
    const ox = (200 - w * s) / 2 - x1 * s;
    const oy = (150 - h * s) / 2 - y1 * s;
    return { s, ox, oy, fen };
  }, [vue, taille, bornes]);
  const clicMini = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left - 1 - mini.ox) / mini.s;
    const fy = (e.clientY - r.top - 1 - mini.oy) / mini.s;
    setVue((v) => ({ k: v.k, x: taille.w / 2 - fx * v.k, y: taille.h / 2 - fy * v.k }));
  };

  return (
    <div className="lin pe" data-panneau={choixPanneau === null ? "auto" : choixPanneau ? "ouvert" : "ferme"}>
      <h1 className="v2-sr">{titre}</h1>
      <header className="pe-barre">
        <div className="pe-barre-gauche">
          <Link href={retour} className="pe-icone" aria-label="Retour">
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div className="pe-nom-groupe">
            <span className="pe-nom" aria-hidden="true">
              {titre}
            </span>
            {badge ? <Badge teinte={badge.teinte}>{badge.libelle}</Badge> : null}
          </div>
        </div>
        <div className="pe-barre-droite">
          {actions}
          <button type="button" className="pe-icone" aria-label={panneauOuvert ? "Masquer le panneau" : "Afficher le panneau"} aria-pressed={panneauOuvert} onClick={() => setChoixPanneau(!(choixPanneau ?? window.matchMedia("(max-width: 899px)").matches))}>
            <PanelRight aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        className="pe-canevas"
        ref={canevas}
        tabIndex={0}
        role="group"
        aria-label="Le circuit, bloc par bloc"
        data-glisse={enGlisse ? "" : undefined}
        style={{ "--pe-bg-x": `${vue.x}px`, "--pe-bg-y": `${vue.y}px`, backgroundSize: `${20 * vue.k}px ${20 * vue.k}px` } as React.CSSProperties}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onKeyDown={clavier}
      >
        <div className="pe-vue" ref={vueRef} style={{ transform: `translate(${vue.x}px, ${vue.y}px) scale(${vue.k})` }}>
          <svg className="pe-liens" aria-hidden="true">
            {chemins.map((c) => (
              <path key={c.cle} className="pe-lien" d={c.d} data-actif={c.actif ? "" : undefined} />
            ))}
            {/* les points qui courent : décalés sur la durée du trajet, cachés si l'on a demandé moins d'animation */}
            {chemins.flatMap((c) =>
              Array.from({ length: c.flux }, (_, i) => (
                <circle key={`${c.cle}#${i}:${c.d}`} className="pe-flux" r={3.5}>
                  <animateMotion dur="2.8s" begin={`${(i * 2.8) / c.flux}s`} repeatCount="indefinite" path={c.d} />
                </circle>
              )),
            )}
          </svg>
          {noeuds.map((n) => {
            const p = positions.get(n.id)!;
            return (
              <button
                key={n.id}
                type="button"
                className="pe-bloc"
                ref={(el) => {
                  if (el) blocs.current.set(n.id, el);
                  else blocs.current.delete(n.id);
                }}
                style={{ left: p.x, top: p.y }}
                aria-pressed={selection === n.id}
                aria-label={n.libelle ?? n.titre}
                data-eteint={eteints?.has(n.id) ? "" : undefined}
                data-alerte={n.alerte ? "" : undefined}
                onClick={() => choisir(selection === n.id ? null : n.id)}
              >
                <span className="pe-bloc-titre">
                  <Pastille teinte={n.teinte}>{n.icone}</Pastille>
                  <span className="pe-bloc-nom">{n.titre}</span>
                </span>
                <span className="pe-bloc-corps">{n.corps}</span>
                {n.entree ? <Poignee cote="entree" cle="entree" /> : null}
                {n.sortie ? <Poignee cote="sortie" cle={n.sortie} /> : null}
              </button>
            );
          })}
        </div>

        {entete ? (
          <div className="pe-entete" ref={enteteRef}>
            {entete}
          </div>
        ) : null}

        {!noeuds.length && vide ? (
          <div className="pe-vide" role="status">
            <strong>{vide.titre}</strong>
            <p>{vide.texte}</p>
          </div>
        ) : null}

        <div className="pe-commandes" role="toolbar" aria-label="Zoom">
          <button type="button" className="pe-commande" aria-label="Agrandir" onClick={() => zoomer(1.2)}>
            <Plus aria-hidden="true" />
          </button>
          <button type="button" className="pe-commande" aria-label="Réduire" onClick={() => zoomer(1 / 1.2)}>
            <Minus aria-hidden="true" />
          </button>
          <button type="button" className="pe-commande" aria-label="Ajuster à la fenêtre" onClick={ajuster}>
            <Maximize aria-hidden="true" />
          </button>
          <button type="button" className="pe-commande" aria-label="Remettre en place" onClick={() => setVue({ x: 0, y: 0, k: 1 })}>
            <Shuffle aria-hidden="true" />
          </button>
          <button type="button" className="pe-commande" aria-label="Raccourcis clavier" aria-expanded={raccourcis} aria-controls={idRaccourcis} onClick={() => setRaccourcis((v) => !v)}>
            <Keyboard aria-hidden="true" />
          </button>
        </div>
        {raccourcis ? (
          <div className="pe-raccourcis" id={idRaccourcis} role="dialog" aria-label="Raccourcis clavier">
            <dl>
              <dt>
                <kbd className="pe-kbd">+</kbd> <kbd className="pe-kbd">−</kbd>
              </dt>
              <dd>Agrandir, réduire</dd>
              <dt>
                <kbd className="pe-kbd">0</kbd>
              </dt>
              <dd>Ajuster à la fenêtre</dd>
              <dt>
                <kbd className="pe-kbd">⌘</kbd> molette
              </dt>
              <dd>Zoomer sous le curseur</dd>
              <dt>
                <kbd className="pe-kbd">Échap</kbd>
              </dt>
              <dd>Fermer le bloc ouvert</dd>
            </dl>
          </div>
        ) : null}

        {miniCarte ? (
          <div className="pe-minicarte" role="img" aria-label="Mini-carte du circuit" onClick={clicMini}>
            <svg viewBox="0 0 200 150">
              {noeuds.map((n) => {
                const p = positions.get(n.id)!;
                return <rect key={n.id} className="pe-minicarte-bloc" x={mini.ox + p.x * mini.s} y={mini.oy + p.y * mini.s} width={LARGEUR_BLOC * mini.s} height={p.h * mini.s} rx={2} />;
              })}
              <path
                className="pe-minicarte-masque"
                fillRule="evenodd"
                d={`M-2,-2 h204 v154 h-204 z M${mini.ox + mini.fen.x * mini.s},${mini.oy + mini.fen.y * mini.s} h${mini.fen.w * mini.s} v${mini.fen.h * mini.s} h${-mini.fen.w * mini.s} z`}
              />
            </svg>
          </div>
        ) : null}
      </div>

      <aside className="pe-panneau" aria-label="Panneau">
        {panneau}
      </aside>
    </div>
  );
});
