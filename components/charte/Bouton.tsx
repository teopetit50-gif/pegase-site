import Link from "next/link";
import type { ReactNode } from "react";

/* LE bouton de la vitrine. Un seul dessin, le blanc (Teo, 25/11 : « le
   bouton gris, mets-le comme le blanc, partout ») : 46 px, rayon 10,
   liseré rgba(0,0,0,.1), encre #121212, 16 px gras. `icone` : le chevron
   des boutons d'accompagnement, ou le calendrier des boutons d'audit. */
export function Chevron() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" focusable="false">
      <path d="M9 6.5 13.5 11 9 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Calendrier() {
  return (
    <svg viewBox="0 0 17 20" fill="currentColor" aria-hidden="true" width="17" height="20">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.6 1a1 1 0 0 1 1 1v.9h5.8V2a1 1 0 1 1 2 0v.9h.5A3.1 3.1 0 0 1 17 6v9.9A3.1 3.1 0 0 1 13.9 19H3.1A3.1 3.1 0 0 1 0 15.9V6a3.1 3.1 0 0 1 3.1-3.1h.5V2a1 1 0 0 1 1-1ZM2 8.6v7.3c0 .6.5 1.1 1.1 1.1h10.8c.6 0 1.1-.5 1.1-1.1V8.6H2Zm9.6 2.2a1 1 0 0 1 .1 1.4l-3.2 3.6a1 1 0 0 1-1.5 0l-1.6-1.7a1 1 0 0 1 1.5-1.4l.8.9 2.5-2.7a1 1 0 0 1 1.4-.1Z"
      />
    </svg>
  );
}

type Props = {
  href: string;
  children: ReactNode;
  icone?: "chevron" | "calendrier";
  plein?: boolean;
  className?: string;
};

export default function Bouton({ href, children, icone, plein = false, className = "" }: Props) {
  const classes = `ch-btn ${icone === "chevron" ? "ch-btn--chevron" : ""} ${plein ? "ch-btn--plein" : ""} ${className}`;
  const contenu = (
    <>
      {icone === "calendrier" && <Calendrier />}
      {children}
      {icone === "chevron" && <Chevron />}
    </>
  );
  if (/^(https?:|mailto:|tel:)/.test(href)) {
    return (
      <a href={href} className={classes}>
        {contenu}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {contenu}
    </Link>
  );
}
