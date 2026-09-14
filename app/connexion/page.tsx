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
   /connexion — entrer dans son compte, ou le créer (02/09/2026)

   La porte du compte client. Décision Teo du 02/09, révisée l'après-midi :
   le quotidien se fait par e-mail + MOT DE PASSE ; le code à six chiffres
   ne sert qu'à prouver l'adresse (création, mot de passe oublié,
   secours). Deux portes claires en tête du module : « J'ai déjà un
   compte » et « Je crée mon compte » — ?mode=creation ouvre directement
   la seconde. Même monde visuel que la réservation (.resa).

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
  title: "Se connecter ou créer un compte | Omega.AI",
  description: "Votre adresse e-mail et votre mot de passe. Retrouvez votre demande, votre créneau et votre cockpit.",
  robots: { index: false, follow: false },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; erreur?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const suite = suiteSure(sp.suite);
  const mode = sp.mode === "creation" ? "creation" : "connexion";

  const utilisateur = await utilisateurCourant();
  if (utilisateur) redirect(suite);

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <AuthSectionOne
          titre="Se connecter ou créer un compte"
          sousTitre="Votre demande, votre créneau, votre cockpit."
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
          <ConnexionPleinePage suite={suite} mode={mode} />
          {/* Le détail du code ne sert qu'à la première visite : il se lit
              mieux sous le formulaire, quand la question se pose. */}
          <p className="r-note mt-6">
            Première visite&nbsp;? Choisissez « Je crée mon compte »&nbsp;: un code reçu par
            e-mail prouve votre adresse, puis vous choisissez votre mot de passe.
          </p>
          <p className="r-note mt-3">
            Votre adresse ne sert qu&apos;à vous reconnaître et à vous joindre pour votre
            installation — voir{" "}
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
