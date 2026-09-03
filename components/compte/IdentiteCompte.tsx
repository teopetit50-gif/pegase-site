/* ══════════════════════════════════════════════════════════════════════
   IdentiteCompte — la ligne d'identité en tête de « Mon compte »
   (03/09/2026)

   Sous le titre : une pastille d'initiales (or de la charte, encre
   noire — le blanc sur or clair tombe sous AA, règle du monde .resa), le
   prénom et le nom, l'entreprise, l'e-mail. Tout vient des user_metadata
   (lib/compte, utilisateurDepuis) : un profil vide montre la première
   lettre de l'e-mail et l'adresse seule — la carte « Profil
   professionnel » plus bas invite à le remplir.

   Composant serveur : rien à cliquer ici, « Se déconnecter » est posé par
   la page à côté.
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
        <div className="cp-identite-nom">{aNom ? nom : "Profil à compléter"}</div>
        <div className="cp-identite-detail">
          {utilisateur.entreprise ? (
            <>
              <span>{utilisateur.entreprise}</span>
              <span className="cp-identite-sep" aria-hidden="true">
                ·
              </span>
            </>
          ) : null}
          <span className="break-all">{utilisateur.email}</span>
        </div>
      </div>
    </div>
  );
}
