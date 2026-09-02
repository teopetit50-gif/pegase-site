"use client";

/* ══════════════════════════════════════════════════════════════════════
   /connexion — l'enveloppe client du module de connexion (02/09/2026)

   Le même ConnexionInline que le parcours installation, posé seul dans une
   carte, avec les deux portes en tête (« J'ai déjà un compte » / « Je crée
   mon compte ») ; ?mode=creation pré-sélectionne la seconde. Une fois
   connecté — session ouverte ET mot de passe défini : navigation COMPLÈTE
   vers `suite` (pas router.push) — la session vient d'être écrite dans
   les cookies par le navigateur, et la page d'arrivée (/compte,
   force-dynamic) doit être rendue par le serveur avec ces cookies-là,
   sans passer par le cache client du routeur.
   ══════════════════════════════════════════════════════════════════════ */

import ConnexionInline, { type ModeConnexion } from "@/components/compte/ConnexionInline";

export default function ConnexionPleinePage({ suite, mode }: { suite: string; mode: ModeConnexion }) {
  return (
    <ConnexionInline
      modeInitial={mode}
      portes
      onConnecte={() => {
        window.location.assign(suite);
      }}
    />
  );
}
