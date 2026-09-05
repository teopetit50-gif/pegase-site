import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import PriseDeCreneau from "@/components/reservation/PriseDeCreneau";
import { POSTES, lirePeriodicite } from "@/lib/paliers";
import { utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /installation — réserver la réunion d'installation (28/08/2026)

   L'atterrissage du parcours « la grille » : le visiteur a choisi ses
   postes sur /tarifs (?postes=cashd,frontd,…), il bloque ici son créneau
   de réglage — 45 min en visio, OAuth et branchements faits ensemble.
   C'est la conversion du modèle arrêté les 27-28/08 : pas de paiement en
   ligne (pas encore de compte pro), la réunion EST l'engagement.
   → 05/09 (demande des associés) : le client ENREGISTRE son moyen de
   paiement — carte ou prélèvement SEPA, via Stripe — juste après la
   réservation, sur l'écran final du module ; rien n'est débité avant la
   fin de l'installation, le premier prélèvement part le jour de la mise
   en service. Le chapô et la description ne disent plus « rien à payer
   aujourd'hui » ni « sans paiement en ligne ».

   Page volontairement distincte de /reserver (les audits) : autre
   parcours, autre récapitulatif, autre suite — on n'audite pas, on met
   en route.

   Sans postes valides dans l'URL, retour à la grille : le prix dépend du
   choix, on ne devine pas à la place du visiteur.

   02/09 — le compte client. La réservation d'une installation exige
   d'être connecté (décision Teo : le compte donne l'identité, la demande
   lui est rattachée). La page lit la session côté serveur (cookies,
   jeton vérifié) et la passe au module : connecté, le formulaire s'ouvre
   directement ; sinon, le module propose la connexion par code à
   l'étape des coordonnées, sans quitter la page ni perdre le créneau.
   La page était déjà dynamique (searchParams) — lire les cookies ne
   change rien à son coût.

   02/09 (soir) — la formule annuelle : `?periodicite=annuel` arrive de la
   grille à côté de `postes=` ; tout autre valeur (absente, inconnue) vaut
   mensuel. La page ne fait que la lire et la passer au module, qui la
   garde MODIFIABLE dans son récapitulatif (décision Teo).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Réserver l'installation | Omega.AI",
  description:
    "Choisissez votre créneau : 45 minutes en visio pour brancher vos postes sur vos outils — mail, tableur, WhatsApp. Vous enregistrez votre moyen de paiement à la réservation ; rien n'est débité avant la fin de l'installation.",
};

export default async function InstallationPage({
  searchParams,
}: {
  searchParams: Promise<{ postes?: string; periodicite?: string }>;
}) {
  const sp = await searchParams;
  const demandes = (sp.postes ?? "").split(",").map((x) => x.trim());
  const postes = POSTES.filter((p) => demandes.includes(p.id)).map((p) => p.id);
  if (!postes.length) redirect("/tarifs");
  const periodicite = lirePeriodicite(sp.periodicite);

  const utilisateur = await utilisateurCourant();

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <section data-monde="clair" className="r-wrap pb-16 pt-12 sm:pb-24 sm:pt-14">
          <h1 className="r-h2 max-w-[20ch]">Réservez votre installation</h1>
          <p className="r-lead mt-5 max-w-[58ch]">
            45 minutes en visio, écran partagé : on branche vos postes sur vos outils, on règle le
            ton et les délais avec vous, et le système démarre sous votre œil. Rien à préparer.
            Vous enregistrez votre moyen de paiement — carte ou prélèvement SEPA — à la
            réservation&nbsp;; rien n&apos;est débité avant la fin de l&apos;installation.
          </p>
          <div className="mt-10">
            <PriseDeCreneau
              parcours="installation"
              postes={postes}
              periodicite={periodicite}
              utilisateur={utilisateur}
            />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
