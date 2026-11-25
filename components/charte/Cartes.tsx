import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/* Les grilles de cartes jointives de l'accueil : pas d'espace entre les
   cartes, des filets ; dans chaque carte, une scène arrondie (#eeeee8,
   rayon 12), puis un h3 de 22 px, un texte gris et un lien souligné.
   2, 3 ou 4 colonnes ; 3 et 4 passent à 2 sous 1000 px, tout passe à 1 sous 760. */
export function GrilleCartes({ children, colonnes = 2 }: { children: ReactNode; colonnes?: 1 | 2 | 3 | 4 }) {
  return (
    <div className="ch-grille" data-colonnes={colonnes} style={{ "--ch-colonnes": colonnes } as CSSProperties}>
      {children}
    </div>
  );
}

export function Scene({
  children,
  trame = false,
  basse = false,
  className = "",
  style,
}: {
  children?: ReactNode;
  trame?: boolean;
  basse?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`ch-scene ${trame ? "ch-scene--trame" : ""} ${basse ? "ch-scene--basse" : ""} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Carte({
  titre,
  texte,
  lien,
  scene,
  children,
}: {
  titre?: ReactNode;
  texte?: ReactNode;
  lien?: { href: string; label: string };
  scene?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="ch-carte">
      {scene}
      {(titre || texte || lien || children) && (
        <div className="ch-carte-texte">
          {titre && <h3>{titre}</h3>}
          {texte && <p>{texte}</p>}
          {children}
          {lien && (
            <Link href={lien.href} className="ch-lien">
              {lien.label}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
