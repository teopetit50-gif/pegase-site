import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import FormulesGrille from "@/components/reservation/FormulesGrille";
import TableauFormats from "@/components/reservation/TableauFormats";
import UnSeulAudit from "@/components/reservation/UnSeulAudit";
import Protocole from "@/components/reservation/Protocole";
import AppelCreneau from "@/components/reservation/AppelCreneau";
import FaqAudit from "@/components/reservation/FaqAudit";
import { FAQ, lienContact } from "@/lib/reservation";
import { MODELES } from "@/components/modeles/donnees";
import { POSTES } from "@/lib/paliers";
import {
  ModeleRetenu,
  SiteRetenu,
  EstimationRetenue,
} from "@/components/reservation/ModeleUrl";

/* ══════════════════════════════════════════════════════════════════════
   /reserver-un-audit — « Réserver un audit » (26/07/2026)

   Quatrième page de référence demandée par Teo : la page tarifs de Qonto
   (qonto.com/en/pricing, profil « solo », facturation annuelle). Mêmes
   sections dans le même ordre, mêmes proportions, même typographie —
   relevé au computed style sur viewport 1280, tokens dans le bloc `.resa`
   de globals.css.

   Ce qui change : le SUJET. On ne compare pas des abonnements, on fait
   choisir un format d'audit et réserver un créneau. Textes, formats et
   chiffres sont ceux de Omega.

   Deux emplacements de la référence n'ont PAS d'équivalent honnête ici et
   ont été remplacés plutôt que meublés (règle refs-qonto/NOTES-DESIGN.md,
   « aucun chiffre de preuve sociale inventé, aucun avis client ») :
     · la colonne « Loved & trusted by +600,000 businesses » + note
       Trustpilot → les deux faits qui décident vraiment (c'est gratuit,
       c'est finançable par le Chèque TIC) ;
     · le carrousel de témoignages clients → les engagements du protocole
       d'audit, cités tels qu'ils sont tenus.

   16/09/2026 — DEUX SECTIONS SUPPRIMÉES (Teo : « supprime ces deux
   sections »). Le déroulé en trois temps (« Comment se passe l'audit »,
   #deroule) et les compléments (« Compléter votre audit », #complements)
   ne sont plus sur la page. Rien ne pointait sur leurs ancres — vérifié
   par grep avant la coupe.

   Dans la foulée, la page est ENTIÈREMENT CLAIRE. Le comparatif était la
   dernière bande sombre ; une fois seul de son espèce au milieu de sept
   sections claires, il ne faisait plus un rythme mais un trou (Teo :
   « trop sombre cette section »). Il repasse dans le monde clair — le
   détail du retournement est en tête de ComparerFormats.css. Le rythme
   est désormais porté par les fonds de bande (#f5f5f5 de `.resa` ↔
   `.r-blanc`) et par les cartes, comme sur la référence Qonto.
   `.resa .r-nuit` reste écrit dans globals.css : plus rien ne le porte
   sur cette page, mais c'est la gamme de référence si on y remet un jour
   une bande sombre.
   Le texte des compléments est retiré de lib/reservation.ts avec eux ;
   les trois temps se relisent dans l'historique (commit f40e687).

   27/09/2026 — TOUT CE QUI SUIT LA PREMIÈRE SECTION EST REFAIT EN
   COMPOSANTS (Teo : « la page audit est mal faite ; il n'y a que la
   première section qui ne doit pas être touchée, après refais tout
   proprement avec des composants » — skill methode-site, composants
   repris de 21st.dev, registres ouverts lus le jour même) :
     · comparatif      → <TableauFormats>  (@7ovr comparison-3)
     · simulateur      → <CalculCout>      (@radu pricing-slider-loops) —
                          REMPLACÉ le même jour par <UnSeulAudit>
                          (Tailark integrations-5), voir plus bas
     · engagements     → <Protocole>       (Aceternity feature-section-
                                            with-hover-effects)
     · appel final     → <AppelCreneau>    (efferd cta-3)
     · FAQ             → <QuestionsAudit>  (@tommyjepsen faq-section) —
                          REMPLACÉ le même jour par <FaqAudit>
                          (@preetsuthar17 faq-block : recherche, thèmes,
                          réponses numérotées, liens) — Teo : « trouves-en
                          un plus détaillé et pro »
   Le bandeau d'orientation, qui faisait une section à lui seul, se range
   au pied du tableau. Les fonds alternent désormais d'une section à
   l'autre (gris de `.resa`, puis blanc, puis gris…) au lieu de deux
   bandes grises de suite. <FormulesGrille>, la première section, est
   importée ici directement : l'assembleur <Formules> ne portait plus
   qu'elle. Les détails de chaque reprise sont en tête de chaque
   composant.

   27/09/2026, après-midi — LE SIMULATEUR SORT, ET LA PAGE A SA VERSION
   MOBILE. Teo, sur capture : « remplace cette section complet, je veux
   pas de comparateur », puis « oublie pas de faire la version mobile de
   la page ». À sa place, <UnSeulAudit> : ce qu'un seul audit passe en
   revue — les quatre systèmes et le sur-mesure autour d'Omega, avec la
   ligne du menu de chacun et un lien vers sa page ; rien à régler. Pour
   le téléphone : sections à 48 px de marge (le barème relevé sur
   scale.com le 16/09 dit 40 à 48, elles en avaient 64), titres de
   section tous à 24 px, articles du protocole compactés. Une barre de
   réservation flottante a été posée puis RETIRÉE le même jour : Teo avait
   fait retirer la même de l'accueil le 16/09 (commentaire en tête de
   app/page.tsx) — ne pas la remettre sans lui demander.

   27/09/2026, fin d'après-midi — le bandeau sous les cartes de formats
   (« Gratuit, sans engagement | Chèque TIC ») et sa note deviennent
   <GarantiesAudit>, dans <FormulesGrille> (Teo : « change ça par un
   component plus pro »).

   Le chrome reste celui du site : header caméléon (les sections claires
   portent data-monde="clair") et footer sombre hérités de PageShell.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/reserver-un-audit" },
  title: "Réserver un audit | Omega.AI",
  description:
    "Trois formats d'audit, gratuits à partir du cadrage de 45 minutes, pour mesurer ce que votre processus le plus coûteux représente. Sans engagement.",
};


/* ══════════════════════════════════════════════════════════════════════
   15/09/2026 — ?modele=<slug> EST ENFIN LU, ET LA PAGE RESTE STATIQUE.

   « Choisir ce modèle » (les cartes de /modeles et le mur de
   /tarifs/site) menait ici depuis le 14/09 avec le modèle en paramètre,
   « pour le jour où le formulaire le lira ». Personne ne le lisait : la
   page l'ignorait, ses boutons repartaient sur /reserver sans lui, et le
   choix se perdait — ces boutons valaient « Réserver un audit ».

   Il est maintenant annoncé en tête de page et repart avec chaque bouton
   de réservation, jusqu'au message de la demande (voir PriseDeCreneau).

   La première version lisait `searchParams` : la page passait en ƒ,
   rendue à chaque visite pour une ligne de rappel. Elle est revenue en ○
   le jour même — le paramètre se lit au montage, côté client
   (components/reservation/ModeleUrl.tsx), et le serveur ne fournit que
   la table slug → nom pour que rien d'inventé ne s'affiche. C'est cette
   table, et elle seule, qui vérifie le slug. */
const NOMS_MODELES: Record<string, string> = Object.fromEntries(
  MODELES.map((m) => [m.slug, m.nom]),
);

/* 15/09/2026 — les noms des quatre postes, fournis par le SERVEUR au
   rappel d'estimation. Même raison que pour les modèles : la vérification
   se fait côté client, mais la table des noms n'a pas à entrer dans le
   paquet d'une page d'entrée — ici elle est minuscule, et le motif reste
   le même d'un rappel à l'autre. */
const NOMS_POSTES: Record<string, string> = Object.fromEntries(
  POSTES.map((p) => [p.id, `${p.system} · ${p.nom}`]),
);

export default function ReserverUnAuditPage() {
  return (
    <PageShell>
      {/* couche motion commune : lenis + reveals GSAP */}
      <PageMotion />

      <div className="resa">
        {/* ═══ 0 — ce que le visiteur apporte : le modèle de site retenu,
               et l'estimation faite sur /tarifs ═══ */}
        <ModeleRetenu noms={NOMS_MODELES} />
        <SiteRetenu />
        <EstimationRetenue noms={NOMS_POSTES} />

        {/* ═══ 1 — titre, trois formats, financement : INCHANGÉE (Teo,
               27/09 : « la première section ne doit pas être touchée ») ═══ */}
        <FormulesGrille />

        {/* ═══ 2 — comparatif, et l'orientation à son pied ═══ */}
        <TableauFormats />

        {/* ═══ 3 — ce qu'un seul audit passe en revue (remplace le
               simulateur, 27/09) ═══ */}
        <UnSeulAudit />

        {/* ═══ 4 — protocole d'audit (emplacement des témoignages de la
               référence) ═══ */}
        <Protocole />

        {/* ═══ 5 — appel final ═══ */}
        <AppelCreneau />

        {/* ═══ 6 — FAQ : recherche, thèmes, liens (27/09, second passage) ═══ */}
        <FaqAudit questions={FAQ} contact={lienContact("avant")} />
      </div>
    </PageShell>
  );
}
