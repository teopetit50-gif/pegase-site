/* Mise en page commune aux pages secteurs : elle ne rend rien de plus que
   la page, elle charge seulement les arrondis communs (25/09/2026, Teo :
   l'arrondi des cartes de l'accueil partout). Voir arrondis.css.
   <MetierAudit> précoche le métier dans le formulaire d'audit. */
import type { ReactNode } from "react";
import "./arrondis.css";
import MetierAudit from "./MetierAudit";

export default function SecteursLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MetierAudit />
      {children}
    </>
  );
}
