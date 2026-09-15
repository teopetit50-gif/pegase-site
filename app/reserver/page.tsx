import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import PriseDeCreneau from "@/components/reservation/PriseDeCreneau";
import { utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /reserver — bloquer un créneau d'audit (28/08/2026)

   La destination de TOUS les boutons « Réserver ce créneau » du site
   (lib/reservation.ts, lienReservation). Avant : un lien WhatsApp vers le
   numéro du desk avec un message pré-rempli. Désormais : le calendrier —
   le visiteur voit les créneaux réellement libres, en bloque un, et le
   rendez-vous apparaît dans l'agenda du cockpit. WhatsApp reste la voie
   de secours si l'agenda ne répond pas.

   Les deux formats sur place (site, atelier) n'ont pas de calendrier :
   le module bascule en demande de devis — même formulaire, sans créneau.

   Distinct de /installation (parcours grille /tarifs) : ici on mesure,
   là-bas on met en route.

   15/09 — LE CRÉNEAU SE RÉSERVE AVEC UN COMPTE, comme l'installation.
   Décision Teo : plus d'inscription libre sur le site, tout mène à
   l'audit — le compte naît donc ICI, et le rendez-vous lui est rattaché
   (reserver_audit pose auth.uid()). Sans ça, l'audit n'apparaissait dans
   aucun « Mon compte » : la demande partait anonyme. La session est lue
   côté serveur et passée au module, comme /installation, pour que la
   personne déjà connectée ne voie pas passer un formulaire de connexion.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Réserver un créneau | Omega.AI",
  description:
    "Choisissez votre format d'audit et votre créneau dans les disponibilités réelles, en visioconférence, en heure de Guadeloupe. Confirmation le jour même.",
};

export default async function ReserverPage({
  searchParams,
}: {
  searchParams: Promise<{ formule?: string }>;
}) {
  const sp = await searchParams;
  const utilisateur = await utilisateurCourant();

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <section data-monde="clair" className="r-wrap pb-16 pt-12 sm:pb-24 sm:pt-14">
          <h1 className="r-h2 max-w-[20ch]">Réservez votre créneau</h1>
          <p className="r-lead mt-5 max-w-[58ch]">
            L&apos;agenda montre les créneaux réellement libres. Vous en bloquez un, il est à vous —
            et l&apos;entretien se termine à l&apos;heure annoncée.
          </p>
          <div className="mt-10">
            <PriseDeCreneau parcours="audit" formuleInitiale={sp.formule} utilisateur={utilisateur} />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
