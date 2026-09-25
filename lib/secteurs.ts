/* ══════════════════════════════════════════════════════════════════════════
   Les secteurs — un SaaS vertical par métier (24/09/2026).

   Chaque /secteurs/<slug> est une vraie page de ce site, rapatriée du site
   du SaaS à la manière de CASHD (/offres/relances-impayes) : entête et pied
   d'Omega, monde blanc, pleine largeur (app/secteurs/<slug>/, méthode dans
   app/secteurs/RAPATRIEMENT.md). Le premier parti — afficher le site Vercel
   du SaaS dans un cadre — a été refusé par Teo le 24/09 au soir (« ça
   redirige vers un truc à part ») ; la route à cadre est supprimée.

   Ajouter un secteur = une ligne ici, sa page rapatriée, son signe
   (public/logos/<nom>-mark.png) et sa capture (public/apercus-secteurs/).
   Le menu et la page d'ensemble lisent cette table.

   Noms choisis par Teo le 24/09 : Daliro (ex-ChantierOS), Tamila
   (ex-CabinetOS), Lorani (ex-DossierOS), Tavaro (ex-RentalOS) ; Tiroma
   (ex-FauteuilOS, dossier dentaire-site) est un nom provisoire. Les dossiers
   OMEGA/<ancien>-site et les projets Vercel gardent l'ancien nom.
   Aucun prix, aucun chiffre de traction : le prix s'estime, l'audit le fixe.
   ══════════════════════════════════════════════════════════════════════ */

export type Secteur = {
  slug: string;
  /* le métier, tel qu'il s'affiche dans le menu et sur la page d'ensemble */
  metier: string;
  saas: string;
  /* une ligne, 40 à 60 signes : la décision que le SaaS prend chaque matin
     (cartes de /offres, #metiers) */
  texte: string;
  /* /secteurs, carte du métier : deux phrases, ce qu'il lit → ce qu'il
     prépare → ce qui reste au client. Tout est repris du site du SaaS. */
  detail: string;
  /* /secteurs, carte d'aperçu : ce que le client reçoit, et quand */
  apercu: string;
  /* 25/09 (Teo) — les offres pour toute entreprise qu'un client de ce
     métier prend le plus souvent avec son logiciel. Lu par le bloc « Se
     combine avec » en bas de chaque page métier (components/secteurs/
     SeCombine.tsx). Chaque raison dit ce que l'offre fait POUR CE MÉTIER,
     avec les mots de sa page produit : rien qu'elle ne fasse déjà. */
  combine: { offre: Offre; raison: string }[];
};

/* Les quatre offres pour toute entreprise, et leur page produit. */
export type Offre = "CASHD" | "RELOAD" | "FRONTD" | "FILED";
export const PAGE_OFFRE: Record<Offre, string> = {
  CASHD: "/offres/relances-impayes",
  RELOAD: "/offres/nouvelles-affaires",
  FRONTD: "/offres/demandes-clients",
  FILED: "/offres/factures-fournisseurs",
};

export const SECTEURS: Secteur[] = [
  {
    slug: "btp",
    metier: "BTP",
    saas: "Daliro",
    texte: "Les travaux supplémentaires sont chiffrés et signés avant exécution.",
    detail:
      "Daliro relève dans les photos et les vocaux de vos équipes les travaux absents du marché, puis les chiffre sur vos prix unitaires. Vous obtenez l'accord écrit du client avant que l'ouvrage soit refermé.",
    apercu:
      "Avant le départ sur chantier, le conducteur de travaux reçoit trois listes par chantier : les travaux à facturer, les sous-traitants à confirmer à J-2 et les livraisons à caler sur le planning.",
    combine: [
      { offre: "CASHD", raison: "Les situations et les factures échues relancées selon vos règles, après votre validation." },
      { offre: "FILED", raison: "Les factures des fournisseurs et des sous-traitants lues, contrôlées, transmises à la comptabilité." },
    ],
  },
  {
    slug: "avocats",
    metier: "Cabinets d'avocats",
    saas: "Tamila",
    texte: "Chaque fait renvoie à la pièce et à la page qui le fondent.",
    detail:
      "Tamila lit chaque pièce du dossier, y compris scannée ou manuscrite, et rattache chaque fait à la page qui le fonde. L'avocat reçoit une chronologie sourcée, les contradictions entre pièces et un bordereau rapproché des conclusions.",
    apercu:
      "Avant la première audience, l'associé sait quelles pièces ont été communiquées la veille, quels honoraires forfaitaires sont dépassés et quels dossiers sont sans diligence depuis trente jours.",
    combine: [
      { offre: "CASHD", raison: "Les notes d'honoraires échues suivies et relancées, chaque envoi validé par le cabinet." },
      { offre: "FRONTD", raison: "Les demandes des nouveaux clients qualifiées et le premier rendez-vous proposé, à toute heure." },
    ],
  },
  {
    slug: "architectes",
    metier: "Architectes",
    saas: "Lorani",
    texte: "Les plans, le CCTP et la DPGF sont croisés avant le permis.",
    detail:
      "Lorani croise chaque planche avec les autres planches, le cahier des clauses techniques (CCTP) et la décomposition des prix (DPGF), puis relève chaque incohérence avec la planche et l'article concernés. L'architecte arbitre avant le dépôt du permis ou la consultation des entreprises.",
    apercu:
      "Quatre contrôles suivent la mission de maîtrise d'œuvre, du permis à la réception : le permis et le DCE, l'analyse des offres, le visa des documents d'exécution et les situations de travaux.",
    combine: [
      { offre: "CASHD", raison: "Les honoraires de chaque phase suivis et relancés à l'échéance, après votre validation." },
      { offre: "FRONTD", raison: "Les demandes de projet qualifiées avant le premier rendez-vous, à toute heure." },
    ],
  },
  {
    slug: "location-automobile",
    metier: "Loueurs automobiles",
    saas: "Tavaro",
    texte: "Chaque restitution est chiffrée sur votre barème, preuves jointes.",
    detail:
      "Tavaro rapproche les photos de restitution de l'état des lieux de départ, puis chiffre le carburant, le retard et les dommages selon votre barème de remise en état. Chaque facture part avec ses preuves datées, après validation de l'agence.",
    apercu:
      "Avant l'ouverture du comptoir, chaque agence reçoit sa page : les restitutions à facturer, les véhicules à remettre en location avant le prochain départ et l'entretien placé hors des réservations.",
    combine: [
      { offre: "FRONTD", raison: "Les demandes de réservation traitées à toute heure, y compris agence fermée." },
      { offre: "CASHD", raison: "Les factures de restitution échues relancées selon vos règles, après votre validation." },
    ],
  },
  /* 24/09 (soir) — Tiroma, NOM PROVISOIRE (dossier OMEGA/dentaire-site,
     projet Vercel tiroma-site). Pas encore de logo officiel : les masques
     public/logos/tiroma-mark.png (512 × 512) et tiroma-lockup.png sont
     PROVISOIRES, tirés du monogramme « T » que dessine la source (carré
     arrondi à 28 %, « T » semi-gras à 0,62 em, police du site), au format
     des logos de Teo (masque alpha, RVB noir). À remplacer dès que le vrai
     logo existe ; aucun code à toucher, les noms de fichiers suffisent. */
  {
    slug: "dentaire",
    metier: "Cabinets dentaires",
    saas: "Tiroma",
    texte: "Les créneaux libérés sont repris et les plans signés planifiés.",
    detail:
      "Tiroma lit l'agenda, les plans de traitement et les devis signés de votre logiciel, en lecture seule. Chaque créneau libéré arrive avec les patients qui peuvent le prendre, et l'assistante appelle dans l'ordre.",
    apercu:
      "Avant le premier patient, le titulaire reçoit trois listes : les créneaux libérés avec leurs patients, les plans signés sans rendez-vous et les fauteuils qui tournent à vide.",
    combine: [
      { offre: "FRONTD", raison: "Les demandes de rendez-vous des patients traitées à toute heure, hors des heures du secrétariat." },
      { offre: "CASHD", raison: "Les devis de soins restés sans réponse relancés, chaque envoi validé par le cabinet." },
    ],
  },
  /* 24/09 (soir) — Namolu, NOM DE TRAVAIL (rapports
     plans-et-decisions/secteurs/groupes-*-2026-09.md : un produit, trois
     modules, pour les groupes de distribution d'outre-mer). Décalque de
     toolio.com. Signe PROVISOIRE (public/logos/namolu-{mark,lockup}.png,
     monogramme « N » au format des logos de Teo) : à remplacer par le vrai,
     sans toucher au code. */
  {
    slug: "distribution",
    metier: "Groupes de distribution",
    saas: "Namolu",
    texte: "Conteneurs, transferts entre îles et démarque, chaque matin.",
    detail:
      "Namolu lit les ventes, les stocks et les conteneurs en mer de votre groupe, magasin par magasin et île par île. La direction des achats reçoit ce qu'il faut commander, faire venir par avion, transférer ou démarquer, et décide.",
    apercu:
      "Chaque matin à 7 h, la direction des achats reçoit trois listes : le prochain conteneur à compléter, les articles à faire venir par avion et le stock à transférer ou à démarquer.",
    combine: [
      { offre: "FILED", raison: "Les factures des fournisseurs et des transitaires lues, contrôlées, transmises à la comptabilité." },
      { offre: "CASHD", raison: "Les échéances des comptes professionnels suivies et relancées selon vos règles." },
    ],
  },
];

export const secteur = (slug: string) => SECTEURS.find((s) => s.slug === slug);
