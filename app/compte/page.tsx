import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { COCKPIT_URL } from "@/lib/supabase/config";

/* ══════════════════════════════════════════════════════════════════════
   /compte — RETIRÉE DU SITE, redirige vers l'espace client (15/09/2026)

   Teo : « le but c'est d'avoir un site qui redirige vers un audit, pas
   plus ». Après quatre formes successives de cette page en deux jours, le
   constat qui les explique toutes : elle n'avait pas de matière. Quatre
   faits, deux listes, et un écran de tableau de bord à remplir avec —
   alors que le tableau de bord EXISTE, c'est app.omegaai.fr, et qu'il a
   déjà les factures, les relances et les réglages autour.

   TOUT CE QUE CETTE PAGE FAISAIT VIT DÉSORMAIS DANS LE COCKPIT :
     · abonnement, moyen de paiement, changement de formule, résiliation
       → /espace/profil (carte « Abonnement et facturation », et le
         composant AbonnementActions qui porte les trois gestes) ;
     · profil professionnel → /espace/profil, carte « Entreprise » (le même
       formulaire écrivait déjà les mêmes user_metadata) ;
     · mot de passe → /compte/mot-de-passe du cockpit ;
     · rendez-vous, et enregistrement du moyen de paiement AVANT
       l'installation → /compte du cockpit, la page de qui n'a pas encore
       d'espace rattaché. C'est la destination de cette redirection, et
       elle renvoie elle-même sur /espace dès qu'un espace existe.

   CE QUI NE PART PAS AILLEURS : les « commandes de site ». La table
   `commandes_site` n'a jamais eu une seule ligne ; le bloc n'affichait en
   pratique qu'une phrase de vente (« le site catalogue est à 990 € TTC »)
   qui a sa place sur /tarifs/site, pas dans le compte d'un client.

   LA ROUTE RESTE, elle ne se supprime pas : les e-mails envoyés depuis
   septembre portent des liens vers omegaai.fr/compte, et le proxy
   (lib/supabase/proxy.ts) demande toujours une session avant d'y entrer —
   un visiteur déconnecté passe donc par /connexion puis revient ici, où
   la redirection l'emmène. La session est partagée entre omegaai.fr et
   app.omegaai.fr (même cookie de domaine) : il n'a pas à se reconnecter.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/compte" },
  title: "Mon compte | Omega.AI",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ComptePage() {
  redirect(`${COCKPIT_URL}/compte`);
}
