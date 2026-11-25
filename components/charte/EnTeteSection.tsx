import type { ReactNode } from "react";
import Pastille from "./Pastille";

/* L'en-tête de section de l'accueil : pastille, titre en deux tons (la suite
   en gris #84877f), chapô gris. `cote` : le chapô à droite, calé en bas
   (sur une seule colonne sous 1400 px) ; `pile` : le chapô sous le titre ;
   `centre` : tout centré (bandeau d'appel, rare ailleurs).
   `niveau={1}` pour le titre de la page (cotes du h1 de l'accueil).
   `haut` : 85 px au-dessus au lieu de 72, pour la première section. */
type Props = {
  pastille?: ReactNode;
  titre: ReactNode;
  suite?: ReactNode;
  chapo?: ReactNode;
  disposition?: "cote" | "pile" | "centre";
  niveau?: 1 | 2;
  haut?: boolean;
  actions?: ReactNode;
  filet?: boolean;
  className?: string;
};

export default function EnTeteSection({
  pastille,
  titre,
  suite,
  chapo,
  disposition = "cote",
  niveau = 2,
  haut = false,
  actions,
  filet = true,
  className = "",
}: Props) {
  const Titre = niveau === 1 ? "h1" : "h2";
  const titreClasses = `ch-titre ${niveau === 1 ? "ch-titre--page" : ""}`;
  const tete = (
    <>
      {pastille && <Pastille>{pastille}</Pastille>}
      <Titre className={titreClasses}>
        {titre}
        {suite && (
          <>
            <br />
            <span>{suite}</span>
          </>
        )}
      </Titre>
    </>
  );
  const classes = `ch-intro ${disposition === "cote" ? "ch-intro--cote" : ""} ${disposition === "centre" ? "ch-intro--centre" : ""} ${haut ? "ch-intro--haut" : ""} ${className}`;
  return (
    <header
      className={classes}
      style={filet ? undefined : { borderBottom: 0 }}
      data-gutter-guide={filet ? "bottom" : undefined}
    >
      {disposition === "cote" ? (
        <>
          <div>
            {tete}
            {actions && <div className="ch-actions">{actions}</div>}
          </div>
          {chapo && <p className="ch-chapo">{chapo}</p>}
        </>
      ) : (
        <>
          <div>{tete}</div>
          {chapo && <p className="ch-chapo">{chapo}</p>}
          {actions && <div className="ch-actions">{actions}</div>}
        </>
      )}
    </header>
  );
}
