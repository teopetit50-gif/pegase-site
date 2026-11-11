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
  /* le menu « Nos offres », colonne « Pour votre métier » : UNE ligne de
     40 signes au plus sous le métier (25/09, Teo : « quand même une ligne
     descriptive par métier »). Au-delà, elle passe sur deux lignes et le
     panneau redevient chargé. */
  ligne: string;
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
export type Offre = "CASHD" | "OFFLOAD" | "REPUT" | "FILED";
export const PAGE_OFFRE: Record<Offre, string> = {
  CASHD: "/offres/relances-impayes",
  OFFLOAD: "/offres/nouvelles-affaires",
  REPUT: "/offres/demandes-clients",
  FILED: "/offres/factures-fournisseurs",
};

export const SECTEURS: Secteur[] = [
  {
    slug: "btp",
    metier: "BTP",
    saas: "Daliro",
    /* 11/11/2026 — brief daliro-v2 : du premier appel au décompte final */
    texte: "Chaque chantier suivi du premier appel au décompte final.",
    ligne: "De l'appel au décompte final",
    detail:
      "Daliro prend l'appel et dicte le devis, vérifie le marché ligne à ligne, confirme les passages à J-2, lit ce que le terrain envoie déjà (photos, vocaux, mails), chiffre chaque travail hors marché et le fait signer avant l'ouvrage, cale les livraisons sur la pose, prépare la situation de fin de mois et suit la réception.",
    apercu:
      "Chaque matin, le conducteur de travaux, le chef d'équipe et le bureau reçoivent chacun leur liste : l'avenant à faire signer, le sous-traitant à relancer, la livraison à décaler, la situation à relire.",
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
    ligne: "Chaque fait relié à sa pièce",
    detail:
      "Tamila lit chaque pièce du dossier, y compris scannée ou manuscrite, et rattache chaque fait à la page qui le fonde. L'avocat reçoit une chronologie sourcée, les contradictions entre pièces et un bordereau rapproché des conclusions.",
    apercu:
      "Avant la première audience, l'associé sait quelles pièces ont été communiquées la veille, quels honoraires forfaitaires sont dépassés et quels dossiers sont sans diligence depuis trente jours.",
    combine: [
      { offre: "CASHD", raison: "Les notes d'honoraires échues suivies et relancées, chaque envoi validé par le cabinet." },
      { offre: "REPUT", raison: "Les demandes des nouveaux clients qualifiées et le premier rendez-vous proposé, à toute heure." },
    ],
  },
  {
    slug: "architectes",
    metier: "Architectes",
    saas: "Lorani",
    texte: "Les plans, le CCTP et la DPGF sont croisés avant le permis.",
    ligne: "Plans, CCTP et DPGF croisés",
    detail:
      "Lorani croise chaque planche avec les autres planches, le cahier des clauses techniques (CCTP) et la décomposition des prix (DPGF), puis relève chaque incohérence avec la planche et l'article concernés. L'architecte arbitre avant le dépôt du permis ou la consultation des entreprises.",
    apercu:
      "Quatre contrôles suivent la mission de maîtrise d'œuvre, du permis à la réception : le permis et le DCE, l'analyse des offres, le visa des documents d'exécution et les situations de travaux.",
    combine: [
      { offre: "CASHD", raison: "Les honoraires de chaque phase suivis et relancés à l'échéance, après votre validation." },
      { offre: "REPUT", raison: "Les demandes de projet qualifiées avant le premier rendez-vous, à toute heure." },
    ],
  },
  {
    slug: "location-automobile",
    metier: "Loueurs automobiles",
    saas: "Tavaro",
    /* 11/11/2026 — brief tavaro-v2 : du départ au retour, et jusqu'à la sortie de flotte */
    texte: "Chaque véhicule suivi du départ au retour, et jusqu'à la sortie de flotte.",
    ligne: "Du départ au retour, jusqu'à la sortie de flotte",
    detail:
      "Tavaro suit chaque véhicule du départ au retour et jusqu'à la sortie de flotte : l'état des lieux de départ qui fait foi, le retour comparé photo par photo et chiffré sur votre barème, la facture suivie jusqu'au règlement, les amendes désignées dans le délai, l'entretien et la revente décidés sur le dossier du véhicule.",
    apercu:
      "Avant l'ouverture du comptoir, chaque agence reçoit sa page : les restitutions à facturer, les véhicules à remettre en location avant le prochain départ et l'entretien placé hors des réservations.",
    combine: [
      { offre: "REPUT", raison: "Les demandes de réservation traitées à toute heure, y compris agence fermée." },
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
    /* 11/11/2026 — brief tiroma-v2 : le patient suivi de la demande au dernier soin */
    texte: "Chaque patient suivi de sa demande de rendez-vous au dernier soin de son plan.",
    ligne: "De la demande de rendez-vous au dernier soin",
    detail:
      "Tiroma lit l'agenda, les plans de traitement et les devis signés de votre logiciel, en lecture seule, et suit chaque patient de sa demande au dernier soin : le rappel, le créneau et son remplaçant, la veille du rendez-vous, le plan signé jusqu'au dernier règlement.",
    apercu:
      "Avant le premier patient, le titulaire reçoit trois listes : les créneaux libérés avec leurs patients, les plans signés sans rendez-vous et les fauteuils qui tournent à vide.",
    combine: [
      { offre: "REPUT", raison: "Les demandes de rendez-vous des patients traitées à toute heure, hors des heures du secrétariat." },
      { offre: "CASHD", raison: "Les devis de soins restés sans réponse relancés, chaque envoi validé par le cabinet." },
    ],
  },
  /* 04/11/2026 — Ostelo, NOM DE TRAVAIL, le logiciel des hôtels (page
     app/secteurs/hotellerie/, copiée de la page BTP). Signe PROVISOIRE
     (public/logos/ostelo-mark.png, monogramme « O » au format des logos de
     Teo) : à remplacer par le vrai, sans toucher au code. Capture
     public/apercus-secteurs/hotellerie.png prise sur la page le 04/11. */
  {
    slug: "hotellerie",
    metier: "Hôtels",
    saas: "Ostelo",
    /* 11/11/2026 — brief ostelo-v2 : de la demande au dernier euro encaissé */
    texte: "Chaque séjour suivi de la demande au dernier euro encaissé.",
    ligne: "De la demande au dernier euro encaissé",
    detail:
      "Ostelo répond à la demande à toute heure dans la langue du client, lit la réservation d'où qu'elle vienne, prépare l'avant-séjour, tient les extras sur la note, vérifie le départ, puis contrôle la commission de la plateforme, la carte virtuelle, l'avis et le retour de l'ancien client.",
    apercu:
      "Chaque matin, la réception trouve le travail de la nuit fait : les demandes traitées, les chambres annulées reprises, les extras à vérifier avant les départs.",
    combine: [
      { offre: "CASHD", raison: "Les acomptes et les factures des séminaires et des entreprises relancés à l'échéance, après votre validation." },
      { offre: "FILED", raison: "Les factures de la blanchisserie, des fournisseurs et de l'énergie lues, contrôlées, transmises à la comptabilité." },
    ],
  },
  /* 25/09 (soir) — Varelo, NOM DE TRAVAIL, le produit des grands groupes :
     toutes les sociétés d'un groupe, pôle par pôle, direction par
     direction. C'était Namolu, pour les seuls groupes de distribution
     (slug « distribution », redirigé ici par next.config.ts) ; Teo l'a
     renommé et élargi le 25/09. Signe PROVISOIRE
     (public/logos/varelo-{mark,lockup}.png, monogramme « V » au format des
     logos de Teo) : à remplacer par le vrai, sans toucher au code. */
  {
    slug: "groupes",
    metier: "Grands groupes",
    saas: "Varelo",
    /* 26/09 — l'accent passe sur la centralisation de l'IA du groupe
       (voir components/secteurs/groupes/textes.ts). */
    /* 11/11/2026 — brief varelo-v3 : le plan du groupe et ses agents */
    texte: "Le plan de tout le groupe, rempli en lecture seule, et des agents qui proposent une action que vous validez.",
    ligne: "Le plan du groupe et ses agents",
    detail:
      "Varelo dessine le plan du groupe, une fiche par société, client, fournisseur, contrat et site, avec les liens entre elles et les codes de chaque logiciel rattachés ; il le remplit en lecture seule depuis les logiciels et les tableurs de chaque société, et des agents le lisent en continu pour proposer une action, avec la fiche, le calcul et la pièce, que la direction concernée accepte, corrige ou refuse. En trois jours sur les vraies données, un premier cas d'usage tourne.",
    apercu:
      "Un ingénieur vient trois jours sur un pôle de trois ou quatre sociétés : le plan se remplit, la direction valide les rapprochements, et le troisième soir un cas d'usage tourne sur les vraies données.",
    combine: [
      { offre: "FILED", raison: "Les factures fournisseurs de chaque société lues, contrôlées, transmises à sa comptabilité." },
      { offre: "CASHD", raison: "Les encours clients de chaque société suivis et relancés selon les règles du groupe." },
    ],
  },
];

export const secteur = (slug: string) => SECTEURS.find((s) => s.slug === slug);
