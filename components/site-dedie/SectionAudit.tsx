import FormulaireAudit from "@/components/site-dedie/FormulaireAudit";
import { MARQUE_SITE } from "@/components/espace2/portail";

/* ══════════════════════════════════════════════════════════════════════
   La section « Réserver un audit » d'un site dédié (10/11/2026, refaite
   le 11/11)

   Teo : « je veux pas qu'il y ait de page d'audit, ça doit être juste un
   site vitrine sans page pour la partie audit : tu dois faire la section
   (prix en audit) et mettre un composant pour remplir le truc d'audit
   dans la page directement ». La page /reserver-un-audit d'Omega n'existe
   plus sur un site dédié (next.config.ts la renvoie ici) : la dernière
   section de la page, `#audit`, où mènent tous les boutons « Réserver un
   audit » (LIEN_AUDIT, components/espace2/portail.ts).

   11/11 — « ça renvoie toujours vers le même composant qu'avant. Alors que
   ça, c'était à changer. Pour tous les SaaS. » La première version posait
   le formulaire de la page d'audit d'Omega (FormulaireFormat, dix champs)
   dans une carte, les formats en liste à gauche. Elle est remplacée par le
   dessin « book a demo » des sites SaaS : le format en trois cartes, le
   calendrier et les heures, quatre champs (FormulaireAudit.tsx). Plus
   aucun style de reserver.css ici.

   Rendue par components/secteurs/SeCombine.tsx, à la place du bloc
   « Se combine avec » d'Omega. Le secteur envoyé à la réservation est celui
   du site (SECTEUR_RESERVATION), jamais demandé au visiteur.
   ══════════════════════════════════════════════════════════════════════ */

/* le métier du site → la valeur de SECTEURS (lib/creneaux) qu'attend la fonction de réservation */
const SECTEUR_RESERVATION: Record<string, string> = {
  btp: "btp",
  architectes: "archi",
  avocats: "avocats",
  dentaire: "dentaire",
  "location-automobile": "location",
  groupes: "groupe",
};

export default function SectionAudit() {
  if (!MARQUE_SITE) return null;
  const secteur = SECTEUR_RESERVATION[MARQUE_SITE.secteur] ?? "autre";
  return (
    <section
      id="audit"
      data-monde="clair"
      aria-labelledby="audit-titre"
      className="scroll-mt-16 border-t border-[#e3e3e3] bg-white text-[#0a0a0a] sm:scroll-mt-[72px]"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 md:py-24">
        <div className="max-w-2xl">
          <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.18em] text-[#616161]">Réserver un audit</p>
          <h2 id="audit-titre" className="text-balance text-[32px] font-medium leading-[1.1] tracking-tight sm:text-[40px]">
            Choisissez un format, un jour, une heure.
          </h2>
          <p className="mt-4 text-[17px] leading-[1.55] text-[#616161]">
            Nous mesurons ce que votre processus le plus coûteux représente avant de recommander quoi que ce soit. Gratuit et sans
            engagement à partir du cadrage de 45 minutes.
          </p>
        </div>
        <FormulaireAudit secteur={secteur} />
      </div>
    </section>
  );
}
