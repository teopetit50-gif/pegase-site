"use client";

/* ══════════════════════════════════════════════════════════════════════
   /connexion — l'enveloppe client du module de connexion (02/09/2026)

   Le même ConnexionInline que le parcours installation, posé seul dans une
   carte.

   15/09 — LES DEUX PORTES ONT DISPARU (« J'ai déjà un compte » / « Je crée
   mon compte »), et avec elles ?mode=creation : cette page ne fait plus que
   CONNECTER. Décision Teo : plus d'inscription libre, tout mène à l'audit.
   Un compte créé ici n'était rattaché à rien — « Mon compte » lui proposait
   un abonnement vide. Le compte s'ouvre désormais au moment de réserver
   (audit ou installation), et la page d'arrivée a alors quelque chose à
   montrer. Voir la prop `sansCreation` du module. Une fois
   connecté — session ouverte ET mot de passe défini : navigation COMPLÈTE
   vers `suite` (pas router.push) — la session vient d'être écrite dans
   les cookies par le navigateur, et la page d'arrivée (/compte,
   force-dynamic) doit être rendue par le serveur avec ces cookies-là,
   sans passer par le cache client du routeur.
   ══════════════════════════════════════════════════════════════════════ */

import ConnexionInline, { type ModeConnexion } from "@/components/compte/ConnexionInline";

export default function ConnexionPleinePage({
  suite,
  mode = "connexion",
}: {
  suite: string;
  mode?: ModeConnexion;
}) {
  return (
    <ConnexionInline
      modeInitial={mode}
      sansCreation
      /* La carte est posée par la page elle-même : le module n'a pas à en
         poser une seconde à l'intérieur. */
      cadre={false}
      /* 14/09 — peau auth-section-1 : boutons pleine largeur, rangées
         empilées (voir la prop). */
      empile
      onConnecte={() => {
        window.location.assign(suite);
      }}
    />
  );
}
