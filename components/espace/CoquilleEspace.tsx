/* ══════════════════════════════════════════════════════════════════════
   La coquille des écrans client — /espace/validations, /espace/filed,
   /espace/point (05/10/2026, session A3)

   Posée par app/espace/layout.tsx (depuis le lot 19, 05/10) autour des
   trois écrans — avant, chaque page la posait elle-même. Elle porte :
     · PageShell + PageMotion — la même enveloppe que /installation ;
     · le monde `.resa` (globals.css) et sa déclinaison `.esp`
       (components/espace/espace.css) ;
     · la barre : titre de l'espace, navigation entre les trois écrans,
       identité de la personne connectée, interrupteur de source.

   Sans session, l'espace reste visible SUR L'EXEMPLE : rien sur le site ne
   renvoie vers une page de connexion (décision Teo du 15/09) — l'identité
   dit « Non connecté », l'interrupteur de source est gris.
   ══════════════════════════════════════════════════════════════════════ */

import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import type { Utilisateur } from "@/lib/compte";
import { BasculeSource, SourceFournisseur } from "./source";
import NavigationEspace from "./NavigationEspace";
import type { EcranEspace } from "./ecrans";
import "./espace.css";

function initiales(u: Utilisateur): string {
  const p = (u.prenom ?? "").trim().charAt(0);
  const n = (u.nom ?? "").trim().charAt(0);
  const i = `${p}${n}`.toUpperCase();
  return i || u.email.charAt(0).toUpperCase();
}

export default function CoquilleEspace({
  ecran,
  utilisateur,
  children,
}: {
  /* l'écran actif ; sans lui, la navigation le lit dans la route */
  ecran?: EcranEspace;
  utilisateur: Utilisateur | null;
  children: React.ReactNode;
}) {
  const nom = utilisateur
    ? [utilisateur.prenom, utilisateur.nom].filter(Boolean).join(" ") || utilisateur.email
    : null;
  return (
    <PageShell>
      <PageMotion />
      <div className="resa esp">
        <SourceFournisseur connecte={!!utilisateur}>
          <header className="esp-barre">
            <div className="esp-barre-int">
              <div className="esp-marque">
                <span className="esp-marque-nom">Espace client</span>
                <span className="esp-marque-sous">{utilisateur?.entreprise ?? "Omega"}</span>
              </div>
              <NavigationEspace ecran={ecran} />
              <div className="esp-barre-droite">
                <BasculeSource />
                <div className="esp-identite" title={utilisateur?.email ?? "Non connecté"}>
                  <span className="esp-avatar" aria-hidden="true">
                    {utilisateur ? initiales(utilisateur) : "•"}
                  </span>
                  <span className="esp-identite-texte">
                    <span className="esp-identite-nom">{nom ?? "Non connecté"}</span>
                    <span className="esp-identite-sous">
                      {utilisateur ? utilisateur.email : "exemple seulement"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </header>
          <div className="esp-corps">{children}</div>
        </SourceFournisseur>
      </div>
    </PageShell>
  );
}
