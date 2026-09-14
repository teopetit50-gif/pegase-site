import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
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
        <section data-monde="clair" className="r-wrap pb-16 pt-12 sm:pb-24 sm:pt-14">
          {/* 11/09 — la page était alignée à gauche sur toute la largeur :
              un titre de 56 px, un chapô de quatre lignes, et la moitié
              droite de l'écran vide. Une porte de connexion n'a pas de
              contenu à étaler, elle a un formulaire à présenter. On reprend
              la disposition de la porte de FRONTD — colonne centrée,
              entête court, une seule carte — mais avec le vocabulaire du
              monde clair du site, sans rien décalquer. */}
          <div className="mx-auto w-full max-w-[600px]">
            <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--r-faible)]">
              Un système Omega
            </p>
            {/* 02/09 (Teo : « je vois se connecter mais pas créer un compte »)
                — le titre nomme les deux, et le module ouvre sur deux portes. */}
            <h1 className="r-h3 mt-3 text-center">Se connecter ou créer un compte</h1>
            <p className="r-lead mx-auto mt-4 max-w-[46ch] text-center">
              Un seul compte pour tout Omega. Vous y retrouvez votre demande, votre créneau et,
              une fois l&apos;installation faite, l&apos;accès à votre cockpit.
            </p>

            <div className="mt-8">
              {sp.erreur === "lien" ? (
                <p className="rv-erreur mb-4">
                  Ce lien de connexion n&apos;est plus valable. Connectez-vous ci-dessous, ou
                  demandez un code.
                </p>
              ) : null}
              <div className="r-carte !p-6 sm:!p-8">
                <ConnexionPleinePage suite={suite} mode={mode} />
              </div>
              {/* Le détail du code ne sert qu'à la première visite : il se lit
                  mieux sous le formulaire, quand la question se pose, qu'en
                  quatrième ligne d'un chapô qu'on traverse pour arriver aux
                  champs. */}
              <p className="r-note mt-5 text-center">
                Première visite&nbsp;? Choisissez « Je crée mon compte »&nbsp;: un code reçu par
                e-mail prouve votre adresse, puis vous choisissez votre mot de passe.
              </p>
              <p className="r-note mt-2 text-center">
                Votre adresse ne sert qu&apos;à vous reconnaître et à vous joindre pour votre
                installation — voir{" "}
                <Link href="/vos-donnees" className="underline underline-offset-2">
                  où vont vos données
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
