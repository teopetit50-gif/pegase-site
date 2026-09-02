import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import CommandeSite from "@/components/site/CommandeSite";
import { MODELES } from "@/components/modeles/donnees";
import { utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /site/commande — commander son site (02/09/2026)

   L'atterrissage de « Commander mon site » (/tarifs/site) et de
   « Commander avec ce modèle » (une carte de /modeles, ?modele=<slug>).
   Le tunnel lui-même — modèle, compte, brief, paiement — vit dans
   components/site/CommandeSite.tsx ; cette page lit ce qui vient du
   serveur : la session (cookies, jeton vérifié par getClaims) et le
   modèle pré-choisi, vérifié contre le catalogue — un slug inconnu est
   simplement ignoré, on ne devine pas à la place du visiteur.

   Une commande est un achat : elle exige un compte. Mais on ne renvoie
   PAS vers /connexion — le module propose la connexion à sa deuxième
   étape, sans quitter la page ni perdre le modèle choisi (même parti que
   /installation). Le proxy rafraîchit la session sur /site/* pour que
   le jeton lu ici soit à jour.

   Hors sitemap, noindex, disallow dans robots : une étape de parcours,
   pas une porte d'entrée. force-dynamic : la page dépend des cookies et
   ne doit jamais être mise en cache.
   ══════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commander mon site | Omega.AI",
  description:
    "Choisissez votre modèle, déposez votre brief : votre site catalogue à 990 € TTC, contenu réécrit à votre métier, mis en ligne sous votre nom.",
  robots: { index: false, follow: false },
};

export default async function CommandeSitePage({
  searchParams,
}: {
  searchParams: Promise<{ modele?: string }>;
}) {
  const sp = await searchParams;
  const demande = (sp.modele ?? "").trim();
  const modeleInitial = MODELES.some((m) => m.slug === demande) ? demande : undefined;

  const utilisateur = await utilisateurCourant();

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <section data-monde="clair" className="r-wrap pb-16 pt-12 sm:pb-24 sm:pt-14">
          <h1 className="r-h2 max-w-[20ch]">Commandez votre site</h1>
          <p className="r-lead mt-5 max-w-[58ch]">
            Un modèle, votre brief, et on écrit tout à votre métier. Le prix est celui de la
            page&nbsp;: 990&nbsp;€ TTC, une fois — rien à payer en ligne aujourd&apos;hui, on vous
            appelle pour régler et lancer la production.
          </p>
          <div className="mt-10">
            <CommandeSite utilisateur={utilisateur} modeleInitial={modeleInitial} />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
