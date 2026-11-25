import type { ReactNode } from "react";

/* Une section de la vitrine : le conteneur de 1920 px aux marges de
   32 / 52 / 72 px, et dedans un bloc dont le FILET BAS sépare les sections
   (elles sont jointives, comme sur l'accueil). `filet="aucun"` pour la
   dernière avant le pied, ou un bandeau d'appel. */
export default function Section({
  children,
  id,
  filet = "bas",
  className = "",
  blocClassName = "",
}: {
  children: ReactNode;
  id?: string;
  filet?: "bas" | "aucun";
  className?: string;
  blocClassName?: string;
}) {
  return (
    <section id={id} className={`ch-section ${className}`}>
      <div
        className={`ch-bloc ${filet === "aucun" ? "ch-bloc--sans-filet" : ""} ${blocClassName}`}
        data-gutter-guide={filet === "aucun" ? undefined : "bottom"}
      >
        {children}
      </div>
    </section>
  );
}
