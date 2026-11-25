import type { ReactNode } from "react";
import Pastille from "./Pastille";

/* Le bandeau d'appel de fin de page, centré, sans le halo de l'accueil. */
export default function Appel({
  pastille,
  titre,
  suite,
  chapo,
  actions,
}: {
  pastille?: ReactNode;
  titre: ReactNode;
  suite?: ReactNode;
  chapo?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="ch-section">
      <div className="ch-bloc ch-appel" data-gutter-guide="bottom">
        {pastille && <Pastille>{pastille}</Pastille>}
        <h2 className="ch-titre">
          {titre}
          {suite && (
            <>
              <br />
              <span>{suite}</span>
            </>
          )}
        </h2>
        {chapo && <p className="ch-chapo">{chapo}</p>}
        {actions && <div className="ch-actions">{actions}</div>}
      </div>
    </section>
  );
}
