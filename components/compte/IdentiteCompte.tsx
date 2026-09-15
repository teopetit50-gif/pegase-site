/* ══════════════════════════════════════════════════════════════════════
   IdentiteCompte — l'identité en tête de « Mon compte » (03/09/2026,
   refondue le 14/09 matin, puis le 14/09 soir)

   Depuis le 14/09 soir la page est en RÉGLAGES (CompteVue : en-tête,
   tuiles, menu latéral) et l'identité ouvre l'en-tête : la pastille
   d'initiales (or de la charte, encre noire — le blanc sur or clair
   tombe sous AA, règle du monde .resa), le titre de la page « Mon
   compte » (revue n° 8 : la page porte le nom de l'icône du header qui y
   mène), et dessous le prénom, le nom, l'entreprise, l'e-mail. Tout vient
   des user_metadata (lib/compte, utilisateurDepuis) : un profil vide
   montre la première lettre de l'e-mail et « Profil à compléter » — la
   section « Profil » invite à le remplir.

   ⚠ 15/09 — PLUS APPELÉ. Depuis que « Mon compte » est un tableau de
   bord pleine page, l'en-tête de page n'existe plus : la pastille
   d'initiales est dans la barre du haut, l'entreprise dans l'en-tête de
   la barre latérale, et le nom complet dans la section Profil. Le
   fichier reste au dépôt comme les autres orphelins de la page
   (glass-account-card, les .cp-* de mise en page dans globals.css), à
   nettoyer dans une passe dédiée. Ne pas le rebrancher sans relire
   CompteTableau : il ferait doublon avec le fil d'Ariane.
   ══════════════════════════════════════════════════════════════════════ */

import { initiales, nomAffiche, type Utilisateur } from "@/lib/compte";

export default function IdentiteCompte({ utilisateur }: { utilisateur: Utilisateur }) {
  const nom = nomAffiche(utilisateur);
  const aNom = nom !== utilisateur.email;

  return (
    <div className="cpt-identite">
      <span className="cpt-avatar" aria-hidden="true">
        {initiales(utilisateur)}
      </span>
      <div className="min-w-0">
        <h1 id="cpt-titre-page" className="cpt-titre">
          Mon compte
        </h1>
        <div className="cpt-identite-detail">
          <span className="cpt-identite-nom">{aNom ? nom : "Profil à compléter"}</span>
          {utilisateur.entreprise ? (
            <>
              <span className="cpt-identite-sep" aria-hidden="true">
                ·
              </span>
              <span>{utilisateur.entreprise}</span>
            </>
          ) : null}
          <span className="cpt-identite-sep" aria-hidden="true">
            ·
          </span>
          <span className="break-all">{utilisateur.email}</span>
        </div>
      </div>
    </div>
  );
}
