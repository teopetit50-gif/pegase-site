import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import AuthSectionOne from "@/components/ui/auth-section-1";
import ConnexionPleinePage from "@/components/compte/ConnexionPleinePage";
import { suiteSure } from "@/lib/compte";
import { utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /connexion — entrer dans son compte (02/09/2026)

   La porte du compte client. Décision Teo du 02/09, révisée l'après-midi :
   le quotidien se fait par e-mail + MOT DE PASSE ; le code à six chiffres
   ne sert qu'à prouver l'adresse (mot de passe oublié, secours). Même
   monde visuel que la réservation (.resa).

   15/09 — PLUS D'INSCRIPTION LIBRE. Décision Teo : « je veux plus qu'on
   puisse s'inscrire, on fait tout pour rediriger vers un audit ». Les deux
   portes en tête du module sont retirées, et ?mode=creation — qui ouvrait
   la création — RENVOIE sur /reserver-un-audit : les liens et les favoris
   qui le portent encore arrivent au bon endroit, pas sur une page morte.

   Pourquoi : un compte créé ici n'était rattaché à aucun client. Il ouvrait
   « Mon compte » sur un abonnement vide et un « Choisissez vos postes » —
   le vocabulaire du prix public servi à tout le monde, y compris à une
   direction qui vient de recevoir le site. Le compte naît désormais au
   moment de RÉSERVER, audit ou installation : à ce moment-là il y a une
   demande derrière lui, et « Mon compte » a quelque chose à montrer.

   14/09 — nouvelle peau, collée par Teo : « auth-section-1 » (solaceui).
   Deux panneaux : la carte du formulaire à gauche, un panneau noir au
   nuancier animé à droite. La coque est components/ui/auth-section-1 ;
   le module de connexion est LE MÊME qu'avant (ConnexionInline, partagé
   avec le parcours installation et « Mon compte »), passé en `empile`
   pour que ses boutons prennent toute la largeur comme le Submit de la
   référence. Le chapô d'avant (« Un seul compte pour tout Omega… ») se
   partage entre les deux panneaux : le grand titre du panneau noir dit
   « un seul compte pour tout Omega », le sous-titre de la carte dit ce
   qu'on y retrouve. Les deux notes (première visite, où vont vos
   données) restent sous le formulaire, à la place des conditions de la
   référence.

   ?suite= : où revenir ensuite — filtré par suiteSure (un chemin du site,
   jamais une URL externe). Déjà connecté : on n'affiche rien, on renvoie
   directement vers `suite` ou /compte.

   ?erreur=lien : un lien de confirmation (/auth/confirm) invalide ou
   expiré — on le dit, et on propose le code.

   Page privée : hors sitemap, noindex. Dynamique par nature (elle lit les
   cookies de session).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Se connecter | Omega.AI",
  description: "Accédez à votre compte Omega.AI : votre audit, votre installation et votre espace client.",
  robots: { index: false, follow: false },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; erreur?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const suite = suiteSure(sp.suite);
  /* 15/09 — la création ne s'ouvre plus ici : ?mode=creation mène là où le
     compte s'ouvre vraiment. */
  if (sp.mode === "creation") redirect("/reserver-un-audit");

  const utilisateur = await utilisateurCourant();
  if (utilisateur) redirect(suite);

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <AuthSectionOne
          /* 15/09 — la peau ne dit plus « Se connecter » : le module le dit
             déjà, deux lignes plus bas, et le mode peut changer (code,
             mot de passe oublié). Elle nomme la destination. */
          titre="Votre compte"
          sousTitre="Votre audit, votre installation, votre espace client."
          panneauTitre={
            <>
              Un seul compte
              <br />
              pour tout Omega.
            </>
          }
          lien={{ href: "/vos-donnees", libelle: "Où vont vos données" }}
        >
          {sp.erreur === "lien" ? (
            <p className="rv-erreur mt-8" role="alert">
              Ce lien de connexion n&apos;est plus valable. Connectez-vous ci-dessous, ou
              demandez un code.
            </p>
          ) : null}
          <ConnexionPleinePage suite={suite} />
          {/* 15/09 — la note « Première visite ? Choisissez Créer un
              compte » est retirée : le module dit déjà, juste sous le
              bouton, où le compte s'ouvre. Deux fois la même phrase à
              trois centimètres d'écart, c'est ce qu'on a passé la
              journée à enlever ailleurs. */}
          <p className="r-note mt-6">
            Votre adresse ne sert qu&apos;à vous reconnaître et à vous joindre pour votre
            rendez-vous, voir{" "}
            <Link href="/vos-donnees" className="underline underline-offset-2">
              où vont vos données
            </Link>
            .
          </p>
        </AuthSectionOne>
      </div>
    </PageShell>
  );
}
