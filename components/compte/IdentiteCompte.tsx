/* ══════════════════════════════════════════════════════════════════════
   IdentiteCompte — l'identité en tête de « Mon compte » (03/09/2026,
   refondue le 14/09)

   Depuis le 14/09 la page tient dans une carte de verre (components/ui/
   glass-account-card.tsx) et l'en-tête est UNE ligne : la pastille
   d'initiales (or de la charte, encre noire — le blanc sur or clair
   tombe sous AA, règle du monde .resa), le titre de la page « Mon
   compte » (revue n° 8 : la page porte le nom de l'icône du header qui y
   mène), et dessous le prénom, le nom, l'entreprise, l'e-mail. Tout vient
   des user_metadata (lib/compte, utilisateurDepuis) : un profil vide
   montre la première lettre de l'e-mail et « Profil à compléter » — le
   panneau « Profil professionnel » invite à le remplir.

   Composant serveur : rien à cliquer ici, « Se déconnecter » est posé par
   la carte à droite.
   ══════════════════════════════════════════════════════════════════════ */

import { initiales, nomAffiche, type Utilisateur } from "@/lib/compte";

export default function IdentiteCompte({ utilisateur }: { utilisateur: Utilisateur }) {
  const nom = nomAffiche(utilisateur);
  const aNom = nom !== utilisateur.email;

  return (
    <div className="cp-identite">
      <span className="cp-avatar" aria-hidden="true">
        {initiales(utilisateur)}
      </span>
      <div className="min-w-0">
        <h1 id="cp-titre-page" className="cp-titre-page">
          Mon compte
        </h1>
        <div className="cp-identite-detail">
          <span className="cp-identite-nom">{aNom ? nom : "Profil à compléter"}</span>
          {utilisateur.entreprise ? (
            <>
              <span className="cp-identite-sep" aria-hidden="true">
                ·
              </span>
              <span>{utilisateur.entreprise}</span>
            </>
          ) : null}
          <span className="cp-identite-sep" aria-hidden="true">
            ·
          </span>
          <span className="break-all">{utilisateur.email}</span>
        </div>
      </div>
    </div>
  );
}
