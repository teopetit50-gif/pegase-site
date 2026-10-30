/* ══════════════════════════════════════════════════════════════════════
   Les briques des pages de /espace3 (30/10/2026)

   En-tête de page, rangée de chiffres, carte, barres horizontales, courbe
   et tableau : dessinés avec les jetons de /espace2 (--v2-*), dans
   ./espace3.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

export function Tete({ titre, sous, actions }: { titre: string; sous?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="e3-tete">
      <div>
        <h1>{titre}</h1>
        {sous ? <p>{sous}</p> : null}
      </div>
      {actions ? <div className="e3-tete-actions">{actions}</div> : null}
    </div>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="v2-page v2-arrivee e3-page">{children}</div>;
}

export type TeinteE3 = "vert" | "rouge" | "ambre" | "bleu" | "gris";

export function Tendance({ v, inverse, suffixe = "%" }: { v: number; inverse?: boolean; suffixe?: string }) {
  const bon = inverse ? v < 0 : v > 0;
  const t = v === 0 ? "gris" : bon ? "vert" : "rouge";
  const Fl = v >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="e3-tendance" data-teinte={t}>
      {v !== 0 ? <Fl width={12} height={12} aria-hidden="true" /> : null}
      {v > 0 ? "+" : ""}
      {v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
      {suffixe === "%" ? " %" : suffixe}
    </span>
  );
}

export function Kpis({ children, colonnes = 4 }: { children: React.ReactNode; colonnes?: number }) {
  return (
    <div className="e3-kpis" style={{ "--e3-col": colonnes } as React.CSSProperties}>
      {children}
    </div>
  );
}

export function Kpi({ libelle, valeur, sous, teinte, href }: { libelle: string; valeur: React.ReactNode; sous?: React.ReactNode; teinte?: TeinteE3; href?: string }) {
  const corps = (
    <>
      <span className="e3-kpi-libelle">
        {teinte ? <span className="v2-point" data-teinte={teinte} aria-hidden="true" /> : null}
        {libelle}
      </span>
      <span className="e3-kpi-valeur">{valeur}</span>
      {sous ? <span className="e3-kpi-sous">{sous}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className="e3-kpi e3-kpi--lien">
      {corps}
    </Link>
  ) : (
    <div className="e3-kpi">{corps}</div>
  );
}

export function Carte({ titre, sous, lien, actions, children, plein }: { titre: string; sous?: React.ReactNode; lien?: { href: string; texte: string }; actions?: React.ReactNode; children: React.ReactNode; plein?: boolean }) {
  return (
    <section className="v2-carte e3-carte" data-plein={plein ? "" : undefined}>
      <div className="e3-carte-tete">
        <div>
          <h2 className="v2-h2">{titre}</h2>
          {sous ? <p className="e3-carte-sous">{sous}</p> : null}
        </div>
        {actions}
        {lien ? (
          <Link href={lien.href} className="e3-lien">
            {lien.texte} <ArrowRight width={14} height={14} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="e3-carte-corps">{children}</div>
    </section>
  );
}

export function Grille({ children, modele = "deux" }: { children: React.ReactNode; modele?: "deux" | "large" | "trois" }) {
  return <div className={`e3-grille e3-grille--${modele}`}>{children}</div>;
}

export type Barre = { libelle: React.ReactNode; valeur: number; texte: string; sous?: React.ReactNode; teinte?: TeinteE3; couleur?: string };

export function Barres({ lignes, max }: { lignes: Barre[]; max?: number }) {
  const m = max ?? Math.max(1, ...lignes.map((l) => l.valeur));
  return (
    <ul className="e3-barres">
      {lignes.map((l, i) => (
        <li key={i}>
          <div className="e3-barres-tete">
            <span className="e3-barres-libelle">{l.libelle}</span>
            <span className="e3-barres-valeur">{l.texte}</span>
          </div>
          <div className="e3-barres-rail">
            <span data-teinte={l.teinte} style={{ width: `${Math.max(1.5, (l.valeur / m) * 100)}%`, background: l.couleur }} />
          </div>
          {l.sous ? <div className="e3-barres-sous">{l.sous}</div> : null}
        </li>
      ))}
    </ul>
  );
}

/* une courbe en aire ; `comparaison` : la même période l'an passé, en pointillés */
export function Courbe({ valeurs, comparaison, format, debut, fin, hauteur = 180, barres }: { valeurs: number[]; comparaison?: number[]; format: (n: number) => string; debut: string; fin: string; hauteur?: number; barres?: boolean }) {
  const L = 600;
  const H = hauteur;
  const tout = [...valeurs, ...(comparaison ?? [])];
  const mini = barres ? 0 : Math.min(...tout) * 0.96;
  const maxi = Math.max(...tout) * 1.02;
  const y = (v: number) => H - ((v - mini) / Math.max(1, maxi - mini)) * H;
  const x = (i: number, n: number) => (i / Math.max(1, n - 1)) * L;
  const trace = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i, vs.length)},${y(v)}`).join(" ");
  const largeur = L / valeurs.length;
  return (
    <figure className="e3-courbe">
      <div className="e3-courbe-axe-y" aria-hidden="true">
        <span>{format(maxi)}</span>
        <span>{format((maxi + mini) / 2)}</span>
        <span>{format(mini)}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block", overflow: "visible" }} role="img" aria-label={`Dernière valeur : ${format(valeurs[valeurs.length - 1])}`}>
          <defs>
            <linearGradient id="e3-degrade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--v2-blue-700)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--v2-blue-700)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((p) => (
            <line key={p} x1="0" x2={L} y1={H * p} y2={H * p} stroke="var(--v2-a-300, var(--v2-a-400))" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {barres ? (
            valeurs.map((v, i) => <rect key={i} x={i * largeur + largeur * 0.18} width={largeur * 0.64} y={y(v)} height={H - y(v)} rx="2" fill="var(--v2-blue-700)" opacity={i === valeurs.length - 1 ? 1 : 0.7} />)
          ) : (
            <>
              {comparaison ? <path d={trace(comparaison)} fill="none" stroke="var(--v2-gray-700)" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" /> : null}
              <path d={`${trace(valeurs)} L${L},${H} L0,${H} Z`} fill="url(#e3-degrade)" />
              <path d={trace(valeurs)} fill="none" stroke="var(--v2-blue-700)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
        <div className="e3-courbe-axe-x" aria-hidden="true">
          <span>{debut}</span>
          <span>{fin}</span>
        </div>
      </div>
    </figure>
  );
}

export function Tableau({ colonnes, children }: { colonnes: { libelle: string; num?: boolean }[]; children: React.ReactNode }) {
  return (
    <div className="v2-tableau-cadre e3-tableau-cadre">
      <table className="v2-tableau e3-tableau">
        <thead>
          <tr>
            {colonnes.map((c) => (
              <th key={c.libelle} scope="col" className={c.num ? "v2-num" : undefined}>
                {c.libelle}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Pastille({ teinte = "gris", children }: { teinte?: TeinteE3; children: React.ReactNode }) {
  return (
    <span className="v2-badge" data-teinte={teinte === "gris" ? undefined : teinte}>
      {children}
    </span>
  );
}

export function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="e3-liste">{children}</ul>;
}

export function Ligne({ teinte, titre, sous, fin, href }: { teinte?: TeinteE3; titre: React.ReactNode; sous?: React.ReactNode; fin?: React.ReactNode; href?: string }) {
  return (
    <li className="e3-ligne">
      {teinte ? <span className="v2-point" data-teinte={teinte} aria-hidden="true" /> : null}
      <span className="e3-ligne-texte">
        {href ? <Link href={href}>{titre}</Link> : <span>{titre}</span>}
        {sous ? <small>{sous}</small> : null}
      </span>
      {fin ? <span className="e3-ligne-fin">{fin}</span> : null}
    </li>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="e3-note">{children}</p>;
}
