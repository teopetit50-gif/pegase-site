import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import PriseDeCreneau from "@/components/reservation/PriseDeCreneau";
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

   15/09 (matin, ANNULÉ LE SOIR) — le créneau s'est réservé AVEC UN COMPTE
   pendant une journée : la page lisait la session côté serveur, passait
   l'utilisateur au module, et le module exigeait une connexion avant
   l'envoi. Teo, le soir : « le but c'est d'avoir un site qui redirige vers
   un audit, pas plus — pas de truc de connexion ». Réserver un audit ne
   demande donc plus que des coordonnées.

   La lecture de session (`utilisateurCourant()`) part avec le verrou :
   sans lui, le module ignore l'utilisateur qu'on lui passe. VÉRIFIÉ après
   coup : la route reste marquée dynamique (ƒ) au build — c'est
   `searchParams` qui la tient, pas les cookies, et elle l'était donc déjà
   avant le verrou. On retire un appel inutile, pas une lenteur.
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
  /* 15/09, dernière passe — LE MESSAGE NE PORTE PLUS DE MONTANT. Il
     annonçait « estimation 1 869 € par mois, à confirmer » : c'était le
     dernier endroit où un tarif sortait du site, et il arrivait sous les
     yeux du visiteur juste avant le rendez-vous, comme s'il venait de
     nous. `prixPourVolume` ne sert plus ici qu'à savoir si le volume
     tient dans le cadre standard. */
  const dansLeCadre = piecesEstimees ? prixPourVolume(piecesEstimees) !== null : false;
  const estimation = (() => {
    if (!postesEstimes.length && !piecesEstimees) return undefined;
    const bouts: string[] = [];
    if (postesEstimes.length) {
      bouts.push(`postes visés : ${postesEstimes.map((p) => p.system).join(", ")}`);
    }
    if (piecesEstimees) {
      bouts.push(`${piecesEstimees.toLocaleString("fr-FR")} pièces par mois`);
    }
    if (piecesEstimees && !dansLeCadre) {
      bouts.push("volume au-delà du cadre standard, le devis sort de l'audit");
    }
    return `Estimation faite sur le site — ${bouts.join(" · ")}.`;
  })();

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
            />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
