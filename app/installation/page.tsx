import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import PriseDeCreneau from "@/components/reservation/PriseDeCreneau";
import { POSTES } from "@/lib/paliers";

/* ══════════════════════════════════════════════════════════════════════
   /installation — réserver la réunion d'installation (28/08/2026)

   L'atterrissage du parcours « la grille » : le visiteur a choisi ses
   postes sur /tarifs (?postes=cashd,frontd,…), il bloque ici son créneau
   de réglage — 45 min en visio, OAuth et branchements faits ensemble.
   C'est la conversion du modèle arrêté les 27-28/08 : pas de paiement en
   ligne (pas encore de compte pro), la réunion EST l'engagement.

   Page volontairement distincte de /reserver (les audits) : autre
   parcours, autre récapitulatif, autre suite — on n'audite pas, on met
   en route.

   Sans postes valides dans l'URL, retour à la grille : le prix dépend du
   choix, on ne devine pas à la place du visiteur.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Réserver l'installation | Omega.AI",
  description:
    "Choisissez votre créneau : 45 minutes en visio pour brancher vos postes sur vos outils — mail, tableur, WhatsApp. Sans paiement en ligne, sans engagement de durée.",
};

export default async function InstallationPage({
  searchParams,
}: {
  searchParams: Promise<{ postes?: string }>;
}) {
  const sp = await searchParams;
  const demandes = (sp.postes ?? "").split(",").map((x) => x.trim());
  const postes = POSTES.filter((p) => demandes.includes(p.id)).map((p) => p.id);
  if (!postes.length) redirect("/tarifs");

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <section data-monde="clair" className="r-wrap pb-16 pt-12 sm:pb-24 sm:pt-14">
          <h1 className="r-h2 max-w-[20ch]">Réservez votre installation</h1>
          <p className="r-lead mt-5 max-w-[58ch]">
            45 minutes en visio, écran partagé : on branche vos postes sur vos outils, on règle le
            ton et les délais avec vous, et le système démarre sous votre œil. Rien à préparer,
            rien à payer aujourd&apos;hui.
          </p>
          <div className="mt-10">
            <PriseDeCreneau parcours="installation" postes={postes} />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
