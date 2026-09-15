import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import PriseDeCreneau from "@/components/reservation/PriseDeCreneau";
import { utilisateurCourant } from "@/lib/supabase/server";
import { MODELES } from "@/components/modeles/donnees";
import { POSTES, prixPourVolume } from "@/lib/paliers";

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
  searchParams: Promise<{
    formule?: string;
    modele?: string;
    postes?: string;
    pieces?: string;
  }>;
}) {
  const sp = await searchParams;
  /* 15/09/2026 — le modèle de site choisi sur /modeles traverse
     /reserver-un-audit et arrive ici. Vérifié contre MODELES comme sur
     /site/commande : un slug inventé est ignoré. Il ne devient PAS une
     colonne de la demande (reserver_audit n'a que ses sept valeurs) : il
     s'écrit en tête du message, où le visiteur le voit et peut le
     corriger. */
  const demandeModele = (sp.modele ?? "").trim();
  const modeleNom = MODELES.find((m) => m.slug === demandeModele)?.nom;
  /* ══════════════════════════════════════════════════════════════════
     15/09/2026 (Teo) — L'ESTIMATION DE /tarifs ARRIVE ICI, EN PHRASE.

     « Ce n'est pas un SaaS ; le calculateur, c'est juste un chiffre qui va
     nous servir à être déjà calés pendant l'audit. » Les postes visés et
     le volume déclaré traversent /reserver-un-audit et atterrissent dans
     le message de la demande : l'entretien commence sur les chiffres du
     visiteur au lieu de les redemander.

     LE PRIX NE VIENT PAS DE L'URL — il se RECALCULE ici, sur le volume,
     avec la même fonction que la grille. Un montant transporté en
     paramètre se réécrirait dans la barre d'adresse, et on l'aurait
     ensuite sous les yeux en rendez-vous comme s'il venait de nous.

     Et ce n'est PAS une somme due : la demande d'audit ne fige aucun prix
     (reserver_audit ne le fait que pour le parcours installation). C'est
     une estimation écrite noir sur blanc, que le visiteur voit dans le
     message et peut corriger avant d'envoyer. */
  const postesEstimes = POSTES.filter((p) =>
    (sp.postes ?? "").split(",").map((x) => x.trim()).includes(p.id),
  );
  const piecesBrut = Number.parseInt(sp.pieces ?? "", 10);
  const piecesEstimees = Number.isFinite(piecesBrut) && piecesBrut > 0 ? piecesBrut : 0;
  const prixEstime = piecesEstimees ? prixPourVolume(piecesEstimees) : null;
  const estimation = (() => {
    if (!postesEstimes.length && !piecesEstimees) return undefined;
    const bouts: string[] = [];
    if (postesEstimes.length) {
      bouts.push(`postes visés : ${postesEstimes.map((p) => p.system).join(", ")}`);
    }
    if (piecesEstimees) {
      bouts.push(`${piecesEstimees.toLocaleString("fr-FR")} pièces par mois`);
    }
    if (prixEstime !== null) {
      bouts.push(`estimation ${prixEstime.toLocaleString("fr-FR")} € par mois, à confirmer`);
    } else if (piecesEstimees) {
      bouts.push("volume au-delà de la grille publique, le prix sort de l'audit");
    }
    return `Estimation faite sur le site — ${bouts.join(" · ")}.`;
  })();

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
            <PriseDeCreneau
              parcours="audit"
              formuleInitiale={sp.formule}
              modeleNom={modeleNom}
              estimation={estimation}
              utilisateur={utilisateur}
            />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
