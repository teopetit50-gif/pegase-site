"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le gabarit des pages SaaS (28/10/2026) : les briques des pages « Projects »
   de Linear, au 1:1 (relevé : ./lin.css). Chaque SaaS (CASHD, FILED, REPUT,
   OFFLOAD) remplit les mêmes briques avec ses données : la page se lit et
   s'utilise partout de la même façon.

   Les barres de priorité sont redessinées ici aux mêmes mesures ; les
   autres icônes viennent de lucide.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, MoreHorizontal } from "lucide-react";
import "./lin.css";

/* la priorité, 16 px : 0 aucune (trois tirets), 1 à 3 barres, 4 urgente */
export function IconePriorite({ niveau, titre }: { niveau: 0 | 1 | 2 | 3 | 4; titre: string }) {
  return (
    <svg className="lin-prio" viewBox="0 0 16 16" role="img" aria-label={titre}>
      <title>{titre}</title>
      {niveau === 0 ? (
        <>
          <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" fill="currentColor" opacity="0.9" />
          <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" fill="currentColor" opacity="0.9" />
          <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" fill="currentColor" opacity="0.9" />
        </>
      ) : niveau === 4 ? (
        <>
          <rect x="1" y="1" width="14" height="14" rx="3" fill="currentColor" />
          <path d="M8 4.2v4.6" stroke="var(--lin-fond)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="11.3" r="0.95" fill="var(--lin-fond)" />
        </>
      ) : (
        [0, 1, 2].map((i) => <rect key={i} x={1.5 + i * 5} y={10 - i * 4} width="3" height={4 + i * 4} rx="1" fill="currentColor" opacity={i < niveau ? 1 : 0.4} />)
      )}
    </svg>
  );
}

/* un menu qui se ferme au clic dehors et à Échap */
export function Menu({ bouton, children, largeur }: { bouton: (ouvert: boolean, basculer: () => void) => React.ReactNode; children: (fermer: () => void) => React.ReactNode; largeur?: number }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);
  return (
    <div className="lin-ancre" ref={ref}>
      {bouton(ouvert, () => setOuvert((v) => !v))}
      {ouvert ? (
        <div className="lin-menu" role="dialog" style={largeur ? { minWidth: largeur } : undefined}>
          {children(() => setOuvert(false))}
        </div>
      ) : null}
    </div>
  );
}

/* un choix dans un menu, habillé comme les listes déroulantes de Linear */
export function Choix<T extends string>({ valeur, options, onChange, libelle }: { valeur: T; options: { cle: T; libelle: string }[]; onChange: (v: T) => void; libelle: string }) {
  return (
    <span className="lin-select">
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

/* ——— le menu d'options d'une pastille (demande de Teo, 28/10) ———
   Le bouton est la pastille de Linear (sans cadre, le fond n'apparaît qu'au
   survol ; 28 de haut, icône 16, texte 13/500), relevée le 28/10 ;
   le panneau est le menu « Change status… » de Linear : un champ pour
   filtrer, puis les options (icône, libellé, coche, chiffre). Flèches et
   Entrée pour choisir, un chiffre choisit directement, Échap referme. */
export type Option = {
  cle: string;
  libelle: string;
  icone?: React.ReactNode;
  meta?: string;
  coche?: boolean;
  href?: string;
  action?: () => void;
};

/* raccourci : la touche qui ouvre le menu hors d'un champ (affichée dans l'en-tête, comme « P then S » sur Linear) */
export function MenuOptions({
  declencheur,
  titre,
  options,
  teinte,
  largeur = 252,
  aDroite,
  plat,
  libelle,
  raccourci,
  rond,
}: {
  declencheur: React.ReactNode;
  titre: string;
  options: Option[];
  teinte?: string;
  largeur?: number;
  aDroite?: boolean;
  plat?: boolean;
  libelle?: string;
  raccourci?: string;
  /* le bouton rond de 28 des têtes de la boîte (« Display options » de Linear) */
  rond?: boolean;
}) {
  const routeur = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const [actif, setActif] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const visibles = options.filter((o) => !q || `${o.libelle} ${o.meta ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const fermer = () => {
    setOuvert(false);
    setQ("");
    setActif(0);
  };
  const choisir = (o: Option | undefined) => {
    if (!o) return;
    fermer();
    if (o.action) o.action();
    else if (o.href) routeur.push(o.href, { scroll: false });
  };
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fermer();
    };
    document.addEventListener("mousedown", clic);
    return () => document.removeEventListener("mousedown", clic);
  }, [ouvert]);
  useEffect(() => {
    if (!raccourci) return;
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)))) return;
      if (e.key.toLowerCase() === raccourci.toLowerCase()) {
        e.preventDefault();
        setOuvert(true);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [raccourci]);
  const touche = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      fermer();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActif((i) => Math.min(visibles.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choisir(visibles[actif]);
    } else if (/^[1-9]$/.test(e.key) && !q) {
      e.preventDefault();
      choisir(visibles[Number(e.key) - 1]);
    }
  };
  return (
    <div className="lin-ancre" ref={ref}>
      <button
        type="button"
        className={rond ? "lin-rond" : plat ? "lin-valeur" : "lin-puce lin-declencheur"}
        data-teinte={teinte}
        aria-label={libelle}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        onClick={() => (ouvert ? fermer() : setOuvert(true))}
      >
        {declencheur}
      </button>
      {ouvert ? (
        <div className="lin-menu lin-menu--options" data-cote={plat && !aDroite ? "gauche" : aDroite ? "droite" : undefined} style={{ width: largeur }} onKeyDown={touche}>
          <div className="lin-menu-tete">
            <input
              className="lin-menu-saisie"
              autoFocus
              placeholder={titre}
              aria-label={titre}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActif(0);
              }}
            />
            {raccourci ? <kbd className="lin-kbd">{raccourci.toUpperCase()}</kbd> : null}
          </div>
          <ul className="lin-options" role="listbox" aria-label={titre}>
            {visibles.length ? (
              visibles.map((o, i) => (
                <li key={o.cle} role="option" aria-selected={i === actif}>
                  <button type="button" className="lin-option" data-actif={i === actif ? "" : undefined} onMouseEnter={() => setActif(i)} onClick={() => choisir(o)}>
                    {o.icone ? <span className="lin-option-icone">{o.icone}</span> : null}
                    <span className="lin-option-libelle">{o.libelle}</span>
                    {o.meta ? <span className="lin-option-meta">{o.meta}</span> : null}
                    {o.coche ? <Check className="lin-option-coche" width={14} height={14} aria-label="actuel" /> : null}
                    {i < 9 && !q ? <span className="lin-option-chiffre">{i + 1}</span> : null}
                  </button>
                </li>
              ))
            ) : (
              <li className="lin-options-vide">Aucun résultat</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* le « ··· » d'une ligne de carte : un menu d'actions, ouvert vers la gauche */
export function MenuActions({ titre, options, rond, aGauche }: { titre: string; options: Option[]; rond?: boolean; aGauche?: boolean }) {
  return <MenuOptions plat={!rond} rond={rond} aDroite={!aGauche} libelle={titre} titre={titre} declencheur={<MoreHorizontal width={14} height={14} aria-hidden="true" />} options={options} largeur={240} />;
}

/* les éléments épinglés d'une boîte (l'étoile « Add to favorites » de Linear) : propres à ce
   navigateur, rangés en tête de liste. Rien n'est envoyé au serveur. */
export function useEpingles(cle: string): [Set<string>, (id: string) => void] {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lu après le montage : le rendu du serveur ne connaît pas ce navigateur
      setIds(new Set(JSON.parse(localStorage.getItem(`lin-epingles:${cle}`) ?? "[]") as string[]));
    } catch {
      /* stockage indisponible : rien d'épinglé */
    }
  }, [cle]);
  const basculer = (id: string) =>
    setIds((avant) => {
      const apres = new Set(avant);
      if (apres.has(id)) apres.delete(id);
      else apres.add(id);
      try {
        localStorage.setItem(`lin-epingles:${cle}`, JSON.stringify([...apres]));
      } catch {
        /* stockage indisponible : l'épingle vaut pour cette visite */
      }
      return apres;
    });
  return [ids, basculer];
}

/* une carte de la colonne de droite : son titre et sa flèche « ▾ » la replient, comme sur Linear */
export function CarteDroite({ titre, action, children }: { titre: string; action?: React.ReactNode; children: React.ReactNode }) {
  const [ouverte, setOuverte] = useState(true);
  return (
    <section className="lin-carte-droite" data-fermee={ouverte ? undefined : ""}>
      <h3>
        <button type="button" className="lin-carte-titre" aria-expanded={ouverte} onClick={() => setOuverte((v) => !v)}>
          {titre}
          <svg className="lin-carte-fleche" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
          </svg>
        </button>
        {action}
      </h3>
      {ouverte ? <div className="lin-carte-corps">{children}</div> : null}
    </section>
  );
}

/* le graphique de la carte « Encours » : la même courbe que la Vue d'ensemble
   (components/espace2/Accueil.tsx, « Courbe ») — demande de Teo du 28/10, « regarde
   comment on les a faites sur la vue d'ensemble ». Courbes lissées (Catmull-Rom → Bézier)
   qui passent par chaque point, axe des montants à gauche, lignes de repère fines,
   aire en dégradé bleu sous la série principale, trait de 2 qui se dessine, axe du bas
   en HTML. Mêmes classes que la Vue d'ensemble (v2-va-courbe, v2-va-axe, v2-trace). */
export type Serie = { cle: string; teinte: "gris" | "jaune" | "bleu"; valeurs: number[]; aire?: boolean };
const kEuros = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10} k€` : `${Math.round(v)} €`);
export function GraphiqueProgres({ etiquettes, series, libelle, hauteur = 160 }: { etiquettes: string[]; series: Serie[]; libelle: string; hauteur?: number }) {
  const L = 600;
  const H = hauteur;
  const n = etiquettes.length;
  const brut = Math.max(1, ...series.flatMap((s) => s.valeurs));
  const pas = Math.pow(10, Math.floor(Math.log10(brut)));
  const max = Math.ceil(brut / pas) * pas;
  const lisse = (valeurs: number[]) => {
    const pts = valeurs.map((v, i) => [(i / Math.max(1, n - 1)) * L, H - (v / max) * H] as const);
    let ligne = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i],
        p1 = pts[i],
        p2 = pts[i + 1],
        p3 = pts[i + 2] ?? p2;
      const c1y = Math.min(H, p1[1] + (p2[1] - p0[1]) / 6),
        c2y = Math.min(H, p2[1] - (p3[1] - p1[1]) / 6);
      ligne += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
    }
    return ligne;
  };
  const couleur = { gris: "var(--lin-graph-gris)", jaune: "var(--lin-graph-jaune)", bleu: "var(--lin-graph-bleu)" };
  return (
    <figure className="v2-va-courbe lin-courbe">
      <div className="v2-va-axe-y" aria-hidden="true" style={{ height: H }}>
        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <span key={p}>{kEuros(max * p)}</span>
        ))}
      </div>
      <div style={{ minWidth: 0 }}>
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block", overflow: "visible" }} role="img" aria-label={libelle}>
          <defs>
            <linearGradient id="lin-degrade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--lin-graph-bleu)" stopOpacity="0.4" />
              <stop offset="1" stopColor="var(--lin-graph-bleu)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1="0" x2={L} y1={H * p} y2={H * p} stroke="var(--v2-a-300, var(--v2-a-400))" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {series
            .filter((s) => s.aire)
            .map((s) => (
              <path key={`${s.cle}-aire`} d={`${lisse(s.valeurs)} L${L},${H} L0,${H} Z`} fill="url(#lin-degrade)" />
            ))}
          {series.map((s) => (
            <path key={s.cle} d={lisse(s.valeurs)} pathLength={1} className="v2-trace" fill="none" stroke={couleur[s.teinte]} strokeWidth={s.aire ? 2 : 1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="v2-va-axe">
          {etiquettes.map((e, i) => (
            <span key={e} style={{ left: `${(i / Math.max(1, n - 1)) * 100}%` }}>
              {e}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/* le surlignage qui glisse d'une ligne à l'autre dans la liste d'une boîte (style « vivant » choisi
   par Teo le 28/10/2026) : posé en dernier enfant d'un ul.lin-boite-lignes, il suit le pointeur,
   revient sur la ligne ouverte quand le pointeur sort, et disparaît s'il n'y en a pas. Le fond de
   survol propre à chaque ligne est coupé tant qu'il est là (data-glisse sur la liste). */
export function Surlignage() {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const bloc = ref.current;
    const liste = bloc?.parentElement;
    if (!bloc || !liste) return;
    liste.setAttribute("data-glisse", "");
    let survolee: HTMLElement | null = null;
    const poser = (ligne: HTMLElement | null) => {
      if (!ligne) {
        bloc.style.opacity = "0";
        return;
      }
      /* offsetTop plutôt que la position à l'écran : les lignes glissent encore pendant leur entrée */
      const premiere = bloc.style.opacity !== "1";
      if (premiere) bloc.style.transition = "none";
      let haut = 0;
      for (let n: HTMLElement | null = ligne; n && n !== liste; n = n.offsetParent as HTMLElement | null) haut += n.offsetTop;
      bloc.style.transform = `translateY(${haut}px)`;
      bloc.style.height = `${ligne.offsetHeight}px`;
      bloc.style.opacity = "1";
      if (premiere) {
        void bloc.offsetHeight;
        bloc.style.transition = "";
      }
    };
    const ouverte = () => liste.querySelector<HTMLElement>(".lin-boite-ligne[data-actif]");
    const dessus = (e: PointerEvent) => {
      const l = (e.target as HTMLElement).closest<HTMLElement>(".lin-boite-ligne");
      if (l && l !== survolee) {
        survolee = l;
        poser(l);
      }
    };
    const sortie = () => {
      survolee = null;
      poser(ouverte());
    };
    const suivi = new MutationObserver(() => {
      if (!survolee) poser(ouverte());
    });
    liste.addEventListener("pointerover", dessus);
    liste.addEventListener("pointerleave", sortie);
    suivi.observe(liste, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-actif"] });
    poser(ouverte());
    return () => {
      liste.removeAttribute("data-glisse");
      liste.removeEventListener("pointerover", dessus);
      liste.removeEventListener("pointerleave", sortie);
      suivi.disconnect();
    };
  }, []);
  return <li ref={ref} className="lin-boite-surlignage" aria-hidden="true" />;
}
