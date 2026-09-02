"use client";

/* ══════════════════════════════════════════════════════════════════════
   Partage — un objet qui VOYAGE d'une page à l'autre (01/09/2026)

   Même `nom` des deux côtés de la navigation, et le navigateur anime la
   géométrie de l'un vers l'autre pendant que le reste de la page sort :
   la pastille « Prix publics » de la carte /commencer se pose au-dessus
   du titre de /tarifs ; le cadre bordeaux devient le hero de /modeles.
   Un seul élément monté par nom dans toute l'application.

   `share` est la classe CSS de la paire (::view-transition-group(.x)…),
   c'est là que vivent durée et fondu (globals.css). `default="none"` :
   hors appariement, l'élément sort et entre avec sa page, sans fondu à
   part. `href` rend un <Link> — un composant n'est pas sérialisable de
   RSC vers client, on passe la chaîne.
   ══════════════════════════════════════════════════════════════════════ */

import { ViewTransition, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import Link from "next/link";

type Props = {
  nom: string;
  share: string;
  href?: string;
  as?: "span" | "div";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "style">;

export default function Partage({
  nom,
  share,
  href,
  as = "span",
  className,
  style,
  children,
  ...rest
}: Props) {
  const enfant = href ? (
    <Link href={href} className={className} style={style} {...rest}>
      {children}
    </Link>
  ) : as === "div" ? (
    <div className={className} style={style} {...rest}>
      {children}
    </div>
  ) : (
    <span className={className} style={style} {...rest}>
      {children}
    </span>
  );

  return (
    <ViewTransition name={nom} share={share} default="none">
      {enfant}
    </ViewTransition>
  );
}
