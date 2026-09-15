/* ══════════════════════════════════════════════════════════════════════
   /modeles — le catalogue des modèles de sites proposés aux clients
   (03/08/2026 — vague 2 : 7 modèles → 22 ; 06/08/2026 — 22 → 21, AssetX
   retiré pour provenance et licence inconnues, motif détaillé à sa place
   dans la liste)

   Les visuels sont les CAPTURES RÉELLES des templates achetés par Teo,
   prises sur ses déploiements. Depuis la vague 2, on ne capture plus
   seulement l'accueil : le script suit les liens de navigation de chaque
   site et capture aussi ses pages internes (tarifs, à propos, blog,
   contact…). C'est ce que Teo a demandé — montrer qu'un modèle, ce n'est
   pas une page d'accueil, c'est un site complet.

   Capture : Brave headless en CDP, 1440×1080 en ×2, bandeaux de démo
   retirés du DOM avant la prise, réduction à 1200 px et JPEG 82 (36 Mo de
   PNG → 8,8 Mo, sans perte visible à la taille où ces images s'affichent).
   Script réutilisable : `scripts-capture-modeles.mjs` à la racine — on y
   ajoute une URL et on relance.

   ⚠ DEUX ENTRÉES NE SONT PAS DES SITES VITRINES, et sont libellées comme
   telles plutôt que maquillées : Summit est une interface d'application
   (fils de discussion, espace membre) et Material Kit est la page de
   présentation d'une bibliothèque de composants. Elles restent au
   catalogue parce qu'elles répondent à un besoin réel — un espace client,
   un stock de pages toutes faites — mais les vendre comme des vitrines
   serait faux.

   ⚠ TOUS ces templates sont rédigés en anglais et parlent de logiciel. On
   ne peut donc pas les étiqueter « le modèle BTP » : la capture montrerait
   « The AI CRM that closes deals while you sleep » sous une étiquette
   maçonnerie. Ils sont présentés pour ce qu'ils sont — des partis pris de
   design — avec, pour chacun, le type d'entreprise à qui il va bien. Le
   contenu est réécrit en français au métier du client pendant l'audit.
   ══════════════════════════════════════════════════════════════════════ */

export type Modele = {
  /* clé React, ancre, et racine du nom de fichier des captures */
  slug: string;
  /* nom du template tel qu'acheté — sa référence si Teo doit le retrouver */
  nom: string;
  /* le parti pris visuel, en trois mots */
  style: string;
  /* à qui il va bien, en clair */
  pour: string;
  /* ce que la vitrine capte et renvoie aux moteurs */
  capte: string;
  /* démo live — déploiement réel, la carte est cliquable dessus */
  demo: string;
  /* fond posé pendant le chargement de l'image */
  theme: "sombre" | "clair";
  /* suffixes des captures disponibles : "" = accueil, "-2" = page interne…
     Non contigus pour certains modèles : les pages internes identiques à
     l'accueil (sites d'une seule page, dont les liens ne sont que des
     ancres) ont été supprimées après comparaison des empreintes. */
  pages: string[];
  /* posé quand l'entrée n'est pas un site vitrine — affiché sur la carte */
  reserve?: string;
  /* rangement du catalogue — voir CATEGORIES plus bas */
  cat: "chantier" | "rendezvous" | "cabinet" | "produit";
};

export const MODELES: Modele[] = [
  {
    slug: "proactiv",
    cat: "chantier",
    nom: "Proactiv",
    style: "Sombre, frontal, très affirmé",
    pour: "Bâtiment, travaux publics, industrie — peser dès la première page",
    capte: "les demandes de devis, avec la nature du chantier, le délai, et la relance qui suit",
    demo: "https://proactiv-aceternity.vercel.app",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "schedule",
    cat: "rendezvous",
    nom: "Schedule",
    style: "Clair, orange, tourné mobile",
    pour: "Après-vente, services, réseaux de points de vente — tout ce qui se réserve",
    capte: "les prises de rendez-vous, les rappels avant séance, les créneaux les plus demandés",
    demo: "https://schedule-template-aceternity.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "kinto",
    cat: "rendezvous",
    nom: "Kinto",
    style: "Clair, serif chaleureux, élégant",
    pour: "Hôtellerie, résidences, bien-être, enseignes de standing",
    capte: "les réservations, les demandes de séjour, et ce que la clientèle réclame le plus souvent",
    demo: "https://kinto-nextjs-template.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "hive",
    cat: "chantier",
    nom: "Hive",
    style: "Noir profond, titre géant, galerie",
    pour: "Agence, production, événementiel, réception haut de gamme",
    capte: "les demandes de projet, le budget annoncé, et la relance jusqu'à la réponse",
    demo: "https://hive-nextjs-template.vercel.app",
    theme: "sombre",
    pages: ["", "-2"],
  },
  {
    slug: "studio",
    cat: "chantier",
    nom: "Studio",
    style: "Noir et blanc, typo large, très dessiné",
    pour: "Architecture, maîtrise d'œuvre, studio de création",
    capte: "les demandes de projet, avec surface et budget, jusqu'au rendez-vous posé",
    demo: "https://studio.tailwindui.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "originx",
    cat: "chantier",
    nom: "OriginX",
    style: "Gris très clair, corail, volumes 3D",
    pour: "Agence, société de services, direction du développement",
    capte: "les demandes de mission, leur page d'origine, et la relance des devis sans réponse",
    demo: "https://originx.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "sonic",
    cat: "rendezvous",
    nom: "Sonic",
    style: "Clair, épuré, le produit en grand",
    pour: "Distribution, showroom, concession, réseau de magasins",
    capte: "les commandes, les disponibilités demandées, et les références réclamées que vous ne référencez pas",
    demo: "https://sonic-nextjs-template.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "fincash",
    cat: "cabinet",
    nom: "Fincash",
    style: "Noir et vert citron, application en scène",
    pour: "Courtage, assurance, gestion de patrimoine, services financiers",
    capte: "les demandes de rendez-vous, les simulations lancées, et celles restées en plan",
    demo: "https://fincash.demos.tailgrids.com",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "aspect",
    cat: "cabinet",
    nom: "Aspect",
    style: "Sombre, sobre, chiffres au centre",
    pour: "Comptabilité, conseil, assurance, gestion",
    capte: "les demandes de mission qualifiées, et les rappels programmés sans y penser",
    demo: "https://aspect-nextjs-template.vercel.app/",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "flux",
    cat: "cabinet",
    nom: "Flux",
    style: "Clair, premium, matière et relief",
    pour: "Services aux entreprises, conseil, prestation à forte valeur",
    capte: "les prises de contact, les demandes de rappel, et le suivi jusqu'à la réponse",
    demo: "https://flux-nextjs-template.vercel.app/?banner=false",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "gray",
    cat: "cabinet",
    nom: "Gray",
    style: "Blanc, gris, sobre et premium",
    pour: "Société de conseil, direction qui vend d'abord du sérieux",
    capte: "les demandes de démonstration, le rendez-vous posé, et la relance quand il ne l'est pas",
    demo: "https://preview.cruip.com/gray/",
    theme: "clair",
    pages: ["", "-3", "-4"],
  },
  {
    slug: "streamline",
    cat: "cabinet",
    nom: "Streamline",
    style: "Blanc, minimal, presque nu",
    pour: "Conseil, stratégie, direction — quand le texte doit primer",
    capte: "les prises de contact, les demandes d'information, et ce qui a été lu juste avant",
    demo: "https://streamline-nextjs-template.vercel.app",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "folio",
    cat: "chantier",
    nom: "Folio",
    style: "Sombre, dense, technique",
    pour: "Bureau d'études, ingénierie, industrie",
    capte: "les demandes d'étude et de chiffrage, pièce jointe et délai compris",
    demo: "https://folio-topaz-delta.vercel.app/",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  /* 06/08/2026 — AssetX RETIRÉ du catalogue. Toutes les autres démos du
     catalogue sont celles de leur éditeur (Cruip pour Flux et Gray, Magic UI
     pour Sage, KokonutUI Pro pour Postly, ruixen.ui pour Folio, shadcnblocks,
     TailGrids, Tailwind Plus, Aceternity, KeenThemes, Creative Tim). Celle
     d'AssetX — assetx-ivory.vercel.app — ne porte aucune attribution
     d'éditeur et n'a pu être rattachée à aucun catalogue : ni 21st.dev (ses
     48 modèles ont été comparés un à un sur l'URL de démo), ni la recherche
     sur le texte du gabarit. Provenance inconnue veut dire licence inconnue,
     et les licences lues ce jour-là (Tailwind Plus, shadcnblocks) interdisent
     toutes de « redistribuer le composant en dehors d'un End Product » — ce
     qu'est exactement une copie nue publiée sans contenu client.
     Pour le remettre : rétablir ce bloc, remettre "assetx" à la place de
     "sage" dans MUR, et repasser les compteurs de /modeles à vingt-deux. Les
     captures sont toujours dans public/. Voir OMEGA/commercial/
     grille-prix-sites.md §4. */
  {
    slug: "synthai",
    cat: "produit",
    nom: "SynthAI",
    style: "Clair, sobre, structure complète",
    pour: "Éditeur, société de services, prestataire technique",
    capte: "les demandes de devis, leur page d'origine, et la relance jusqu'à la signature",
    demo: "https://synthai.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "saasspace",
    cat: "produit",
    nom: "SaaSSpace",
    style: "Clair, carré, très lisible",
    pour: "Éditeur, plateforme, groupe à plusieurs offres",
    capte: "les inscriptions, les demandes d'essai, et les offres regardées avant de choisir",
    demo: "https://saasspace.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "aispace",
    cat: "produit",
    nom: "AISpace",
    style: "Clair, bleu franc, orienté produit",
    pour: "Services numériques, informatique, intégration",
    capte: "les demandes de mission, leur origine, et les rappels programmés",
    demo: "https://aispace.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "appspace",
    cat: "rendezvous",
    nom: "AppSpace",
    style: "Clair, bleu, application mobile en scène",
    pour: "Service à la demande, livraison, réservation, application",
    capte: "les inscriptions, les demandes de rappel, et les créneaux les plus pris",
    demo: "https://appspace.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-3", "-4"],
  },
  {
    slug: "template07",
    cat: "produit",
    nom: "Postly",
    style: "Noir, bleu électrique, produit en scène",
    pour: "Communication, marque, agence social media",
    capte: "les demandes de devis, leur origine, et la relance des propositions sans réponse",
    demo: "https://template-07-saas.vercel.app",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "sage",
    cat: "produit",
    nom: "Sage",
    style: "Noir, page unique, droit au but",
    pour: "Lancement d'offre, campagne, opération ponctuelle",
    capte: "les inscriptions, les demandes d'accès, et le rendement de chaque campagne",
    demo: "https://startup-template-sage.vercel.app",
    theme: "sombre",
    pages: ["", "-2", "-3"],
  },
  {
    slug: "summit",
    cat: "produit",
    nom: "Summit",
    style: "Interface claire, colonnes, fils de discussion",
    pour: "Espace membre, extranet client, plateforme d'échange",
    capte: "les comptes, les fils de discussion, et les demandes déposées par vos clients",
    demo: "https://summit-nextjs.keenthemes.com",
    theme: "clair",
    pages: [""],
    reserve: "Interface d'application, pas un site vitrine",
  },
  {
    slug: "materialkit",
    cat: "produit",
    nom: "Material Kit",
    style: "Bibliothèque de blocs et de pages",
    pour: "Quand il faut beaucoup de pages — 41 gabarits déjà dessinés",
    capte: "selon les pages retenues",
    demo: "https://demos.creative-tim.com/material-kit-pro-react/#/presentation",
    theme: "sombre",
    pages: ["", "-3", "-4"],
    reserve: "Bibliothèque de composants, pas un site prêt à poser",
  },
  /* ══ vague 3 — 15/09/2026 ══════════════════════════════════════════
     Les 42 templates PAYANTS de 21st.dev que Teo a achetés et qui
     n'étaient pas encore au catalogue. Comme pour les vagues 1 et 2, la
     `demo` est le déploiement de l'ÉDITEUR — jamais une copie republiée
     par nous : les licences lues au 06/08 (Tailwind Plus, shadcnblocks)
     interdisent de redistribuer un gabarit hors d'un End Product, et un
     lien vers la démo de l'auteur ne redistribue rien.

     Trois provenances de démo, toutes vérifiées en HTTP 200 le 15/09 :
     les hébergements 21st (`*.21st.app`), les aperçus nextjsshop
     (`*.nextjsshop-preview.workers.dev` — l'URL `nextjsshop.com/.../preview`
     ne rend QUE la coquille du marchand, l'iframe porte la vraie adresse),
     et les démos maison des éditeurs (Cruip, shadcnblocks, MagicUI,
     Aceternity).

     ⚠ 11 de ces entrées ne sont pas des sites vitrines — 3 boutiques en
     ligne, 4 portfolios, une documentation, un blog, une galerie de liens,
     un tableau de bord. Teo a tranché le 15/09 : elles entrent au même
     rang que les autres, sans mention de réserve. Leur ligne `pour` dit
     quand même ce qu'elles sont, pour qu'un client sache ce qu'il regarde.
     ══════════════════════════════════════════════════════════════════ */
  {
    slug: "northstar",
    cat: "chantier",
    nom: "Northstar",
    style: "Clair, net, promesse en gros titre",
    pour: "Éditeur, intégrateur, société de services — livré en quatre langues",
    capte: "les demandes de mission, la langue du visiteur, et la relance jusqu'au rendez-vous",
    demo: "https://daliagency-anonymized.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-4"],
  },
  {
    slug: "vertex",
    cat: "produit",
    nom: "Vertex",
    style: "Clair, ordonné, tableau comparatif",
    pour: "Prestataire technique, logiciel métier, bureau d'études",
    capte: "les demandes de devis, l'offre regardée avant de choisir, et la relance des propositions",
    demo: "https://vertex-one-lovat.vercel.app",
    theme: "clair",
    pages: ["", "-2"],
  },
  {
    slug: "saleshook",
    cat: "chantier",
    nom: "SalesHookAI",
    style: "Clair, violet, preuve par les partenaires",
    pour: "Artisans, dépannage, sociétés d'intervention — le seul gabarit dont le texte parle déjà de ces métiers",
    capte: "les demandes d'intervention, l'urgence annoncée, et le rappel tant que personne n'a répondu",
    demo: "https://saleshookai-landing-page-2-v1.21st.app",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "qronos",
    cat: "produit",
    nom: "Qronos",
    style: "Sombre, contrasté, produit en scène",
    pour: "Éditeur, plateforme, société d'exploitation",
    capte: "les demandes d'essai, les offres comparées, et la relance des dossiers sans suite",
    demo: "https://qronos-ai-agent-scheduler-template-v1.21st.app",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "pulse",
    cat: "cabinet",
    nom: "Pulse AI",
    style: "Bleu franc, dégradé, seize pages déjà dessinées",
    pour: "Entreprise qui a beaucoup à dire — blog, prix, contact, pages de compte fournis",
    capte: "les inscriptions, les demandes de contact, et la page qui les a déclenchées",
    demo: "https://pulse-ai-one-ashy.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "intellune",
    cat: "produit",
    nom: "Intellune",
    style: "Clair, courbes et logos animés",
    pour: "Société de services, intégrateur, éditeur",
    capte: "les demandes de démonstration, leur origine, et les rappels programmés",
    demo: "https://intellune-ruixen-com.vercel.app",
    theme: "clair",
    pages: ["", "-2", "-4"],
  },
  {
    slug: "nguyen",
    cat: "produit",
    nom: "Nguyen",
    style: "Clair, bleu ciel, vidéo en vitrine",
    pour: "Éditeur, plateforme d'équipe, outil interne vendu au dehors",
    capte: "les demandes d'accès, la vidéo regardée jusqu'au bout, et la relance",
    demo: "https://nguyen-ai-workspace-saas-landing-page-v1.21st.app",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "guild",
    cat: "produit",
    nom: "Guild",
    style: "Clair, cartes flottantes, accent violet",
    pour: "Lancement d'offre, opération ponctuelle, produit qui s'annonce",
    capte: "les inscriptions, le rendement de chaque campagne, et les demandes restées en l'air",
    demo: "https://guild-landing-kit-qa-v1.21st.app",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "smileflow",
    cat: "rendezvous",
    nom: "SmileFlow",
    style: "Clair, rassurant, cabinet de soins",
    pour: "Cabinet dentaire, praticien, centre de soins — écrit pour un métier de santé",
    capte: "les demandes de rendez-vous, le motif annoncé, et les rappels avant séance",
    demo: "https://smileflow-premium-next-js-16-dental-practice-templ-v1.21st.app",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "personalkit",
    cat: "cabinet",
    nom: "Personal Site Kit",
    style: "Une page, menu au clavier, très sobre",
    pour: "Indépendant, consultant, dirigeant qui se présente lui-même",
    capte: "les prises de contact, le sujet posé, et le rappel programmé",
    demo: "https://personal-site-kit-v2.21st.app",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "t3code",
    cat: "produit",
    nom: "T3Code",
    style: "Sombre cinématique, relief animé",
    pour: "Éditeur, marque technique, lancement qui doit impressionner",
    capte: "les demandes d'accès, leur page d'origine, et la relance jusqu'à la réponse",
    demo: "https://t3code-cinematic-dark-saas-landing-page-template-v2.21st.app",
    theme: "sombre",
    pages: ["", "-2"],
  },
  {
    slug: "evolv",
    cat: "produit",
    nom: "Evolv-Ai",
    style: "Sombre, flux et étapes",
    pour: "Société de services, exploitation, prestataire de traitement",
    capte: "les demandes de devis, l'étape où le visiteur s'arrête, et la relance",
    demo: "https://evolv-ai.nextjsshop-preview.workers.dev/",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "agentai",
    cat: "produit",
    nom: "Agent-AI",
    style: "Sombre, chiffres, tourné vente",
    pour: "Direction commerciale, réseau de vente, éditeur d'outils commerciaux",
    capte: "les demandes de démonstration, le volume annoncé, et les rappels programmés",
    demo: "https://agent-ai.nextjsshop-preview.workers.dev/",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "mosa",
    cat: "produit",
    nom: "Mosa AI",
    style: "Sombre, conversation en scène",
    pour: "Éditeur, service d'assistance, plateforme d'échange",
    capte: "les demandes d'essai, les questions posées avant de s'inscrire, et la relance",
    demo: "https://mosa-ai.nextjsshop-preview.workers.dev/",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "deo",
    cat: "produit",
    nom: "Deo-Ecommerce",
    style: "Boutique en ligne, horlogerie, très soigné",
    pour: "Commerce de détail, marque, vente en ligne de produits à forte valeur",
    capte: "les commandes, les paniers laissés en route, et les produits regardés sans être achetés",
    demo: "https://deo-ecommerce.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "cypon",
    cat: "produit",
    nom: "Cypon-Analytics",
    style: "Clair, mesures en temps réel",
    pour: "Éditeur, plateforme, direction qui pilote par les chiffres",
    capte: "les demandes d'essai, les pages qui convertissent, et la relance des comptes inactifs",
    demo: "https://cypon-analytics.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "bookmark",
    cat: "chantier",
    nom: "Bookmark Design",
    style: "Galerie de références, très visuel",
    pour: "Annuaire, sélection, catalogue d'inspiration, réseau de partenaires",
    capte: "les demandes d'inscription au catalogue, ce qui est cherché, et ce qui ne se trouve pas",
    demo: "https://bookmarkdesign.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-3", "-4"],
  },
  {
    slug: "shopnext",
    cat: "produit",
    nom: "Ecommerce Template",
    style: "Boutique en ligne, tournée conversion",
    pour: "Commerce de détail, marque, réseau de magasins qui vend aussi en ligne",
    capte: "les commandes, les paniers laissés, et les demandes hors catalogue signalées au responsable",
    demo: "https://ecommerce-template.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "omegatpl",
    cat: "chantier",
    nom: "Omega (nextjsshop)",
    style: "Clair, illustration au trait, chiffres en avant",
    pour: "Agence, société de conseil, studio — le travail se prouve en réalisations",
    capte: "les demandes de projet, le budget annoncé, et la relance jusqu'à la réponse",
    demo: "https://omega.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-3", "-4"],
  },
  {
    slug: "nexflow",
    cat: "produit",
    nom: "Nexflow",
    style: "Clair, grand panneau sombre, logos connus",
    pour: "Éditeur, qualité, industrie, bureau de contrôle",
    capte: "les demandes de devis, la nature du besoin, et la relance des propositions sans réponse",
    demo: "https://nexflow.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "anox",
    cat: "chantier",
    nom: "Anox",
    style: "Studio de refonte, très dessiné",
    pour: "Studio, agence, prestataire de refonte et de migration",
    capte: "les demandes de refonte, le site existant, et le rendez-vous posé",
    demo: "https://anox.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "nexuscloud",
    cat: "produit",
    nom: "Nexuscloud",
    style: "Infrastructure, sobre, technique",
    pour: "Hébergeur, infogérance, services informatiques, opérateur",
    capte: "les demandes de mission, le volume annoncé, et les rappels programmés",
    demo: "https://zensend.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-3"],
  },
  {
    slug: "aceai",
    cat: "produit",
    nom: "Aceai",
    style: "Clair rosé, messagerie d'équipe en scène",
    pour: "Éditeur, outil d'équipe, service en ligne",
    capte: "les inscriptions, les demandes d'essai, et les offres regardées avant de choisir",
    demo: "https://aceai.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "fleetops",
    cat: "produit",
    nom: "FleetOps",
    style: "Tableaux de bord, flotte et tournées",
    pour: "Transport, logistique, location de véhicules, gestion de parc",
    capte: "les demandes de devis, la taille du parc annoncée, et la relance",
    demo: "https://fleetops.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "bookify",
    cat: "produit",
    nom: "Bookify",
    style: "Gris clair, couverture en vitrine, sobre",
    pour: "Librairie, édition, formation, vente de contenu",
    capte: "les commandes, les paniers laissés, et ce qui est cherché sans être trouvé",
    demo: "https://bookify.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "thinkscope",
    cat: "cabinet",
    nom: "ThinkScope",
    style: "Clair, analyse et méthode",
    pour: "Conseil, études, recherche, cabinet d'expertise",
    capte: "les demandes d'entretien, le sujet posé, et le rappel programmé",
    demo: "https://thinkcope.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "deepflow",
    cat: "produit",
    nom: "Deepflow",
    style: "Sombre, produit technique en scène",
    pour: "Éditeur, société de données, prestataire d'intégration",
    capte: "les demandes de devis, leur page d'origine, et la relance des dossiers sans suite",
    demo: "https://deepflow.nextjsshop-preview.workers.dev/",
    theme: "sombre",
    pages: [""],
  },
  {
    slug: "persofolio",
    cat: "cabinet",
    nom: "Personal-Portfolio",
    style: "Portfolio, articles, très sobre",
    pour: "Indépendant, profil technique, expert qui publie",
    capte: "les prises de contact, l'article qui les a amenées, et le rappel programmé",
    demo: "https://personalportfolio.nextjsshop-preview.workers.dev/",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "connectsphere",
    cat: "rendezvous",
    nom: "ConnectSphere",
    style: "Application mobile en scène",
    pour: "Service à la demande, livraison, réservation, application",
    capte: "les inscriptions, les demandes de rappel, et les créneaux les plus pris",
    demo: "https://connectsphere.nextjsshop-preview.workers.dev/",
    theme: "sombre",
    pages: ["", "-2", "-3"],
  },
  {
    slug: "devfolio",
    cat: "cabinet",
    nom: "DevFolio",
    style: "Une page, expérience et réalisations",
    pour: "Indépendant, consultant, profil qui se vend sur ses références",
    capte: "les prises de contact, la réalisation regardée, et le rappel programmé",
    demo: "https://preview.cruip.com/devfolio/",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "openpro",
    cat: "produit",
    nom: "Open PRO",
    style: "Sombre et net, logiciel",
    pour: "Éditeur, jeune société, produit technique",
    capte: "les demandes d'essai, les offres comparées, et la relance",
    demo: "https://preview.cruip.com/open-pro/",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "docs",
    cat: "produit",
    nom: "Docs",
    style: "Documentation, sommaire, recherche",
    pour: "Éditeur, service technique, base de connaissance ouverte aux clients",
    capte: "ce qui est cherché sans être trouvé, les pages qui bloquent, et les demandes d'aide",
    demo: "https://preview.cruip.com/docs/",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "simple",
    cat: "produit",
    nom: "Simple",
    style: "Clair et simple, une seule idée",
    pour: "Lancement d'offre, campagne, opération ponctuelle",
    capte: "les inscriptions, le rendement de chaque campagne, et les demandes d'accès",
    demo: "https://preview.cruip.com/simple/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "meridian",
    cat: "produit",
    nom: "Meridian",
    style: "Sombre, console, animation d'ouverture",
    pour: "Éditeur d'outils, prestataire technique, société de supervision",
    capte: "les demandes d'essai, les pages de documentation les plus lues, et la relance",
    demo: "https://meridian-nextjs-template.vercel.app/",
    theme: "sombre",
    pages: [""],
  },
  {
    slug: "lumen",
    cat: "cabinet",
    nom: "Lumen",
    style: "Lumineux, toutes les pages du socle",
    pour: "Éditeur, société de services, entreprise qui veut un site complet d'emblée",
    capte: "les demandes de devis, leur origine, et la relance des propositions sans réponse",
    demo: "https://lumen-nextjs-template.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "metafi",
    cat: "cabinet",
    nom: "Metafi",
    style: "Sobre, marketing sophistiqué",
    pour: "Finance, conseil, assurance, marque qui vend du sérieux",
    capte: "les demandes d'entretien, le sujet posé, et le rendez-vous posé",
    demo: "https://metafi-nextjs-template.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "skyagent",
    cat: "produit",
    nom: "AI Agent Template",
    style: "Clair, automatisation en scène",
    pour: "Éditeur, société d'automatisation, prestataire de traitement",
    capte: "les demandes de démonstration, le besoin décrit, et la relance",
    demo: "https://agent-magicui.vercel.app/",
    theme: "clair",
    pages: ["", "-3"],
  },
  {
    slug: "blogmagic",
    cat: "produit",
    nom: "Blog Template",
    style: "Blog, articles, sommaire",
    pour: "Marque qui publie, média, direction de la communication",
    capte: "les abonnements, les articles qui ramènent des demandes, et la relance des lecteurs",
    demo: "https://blog-magicui.vercel.app/",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "minimalfolio",
    cat: "cabinet",
    nom: "Minimal Portfolio",
    style: "Minimaliste centré, micro-interactions",
    pour: "Indépendant, créatif, profil qui se vend sur la forme",
    capte: "les prises de contact, la réalisation regardée, et le rappel programmé",
    demo: "https://minimal-portfolio-website-template.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "nodus",
    cat: "produit",
    nom: "Nodus",
    style: "Clair, minimal, très moderne",
    pour: "Éditeur, jeune société technique, plateforme",
    capte: "les demandes d'accès, leur page d'origine, et les rappels programmés",
    demo: "https://notus-agent-marketing-template.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "lume",
    cat: "produit",
    nom: "Lume",
    style: "Clair, photo en vis-à-vis, paliers de prix",
    pour: "Éditeur, plateforme à plusieurs offres, groupe à plusieurs marques",
    capte: "les inscriptions, le palier regardé avant de choisir, et la relance",
    demo: "https://template-lume.vercel.app/",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "daliagents",
    cat: "chantier",
    nom: "Dali Agents",
    style: "Rouge cinématique, très affirmé",
    pour: "Agence, studio, production, événementiel",
    capte: "les demandes de projet, le budget annoncé, et la relance jusqu'à la réponse",
    demo: "https://red.daliagents.com/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  /* ══ vague 3 bis — les modèles inclus dans l'abonnement 21st ═══════
     21st.dev en donne 45 avec le plan ; on n'en retient que les 20 qui
     sont des SITES D'ENTREPRISE. Écartés : les tableaux de bord admin
     (CoreUI, Berry, MaterialM, Modernize, MaterialPro), les portfolios
     personnels, les bibliothèques de composants (orb-ui, AI Elements,
     Notus), et surtout les six dont la « démo » est le site de PRODUCTION
     d'un tiers (pixelpoint.io, schdesign.hu, studiomojave.com,
     open-agents.dev, p.isera.dev) — envoyer un client sur l'agence de
     quelqu'un d'autre n'est pas une démonstration.
     ══════════════════════════════════════════════════════════════════ */
  {
    slug: "outline",
    cat: "produit",
    nom: "Outline",
    style: "Éditorial, clair, tableaux comparatifs",
    pour: "Éditeur, service en ligne, produit qui se compare à un concurrent",
    capte: "les demandes d'essai, le concurrent regardé, et la relance",
    demo: "https://21st-outline-preview.vercel.app",
    theme: "clair",
    pages: ["", "-3", "-4"],
  },
  {
    slug: "aura",
    cat: "chantier",
    nom: "AURA",
    style: "Agence créative, mouvement très expressif",
    pour: "Agence, production, événementiel, création",
    capte: "les demandes de projet, la réalisation qui a accroché, et le rendez-vous posé",
    demo: "https://21st-aura-svelte-preview-jdpo1k26v-larsen3.vercel.app",
    theme: "sombre",
    pages: [""],
  },
  {
    slug: "mobilesaas",
    cat: "rendezvous",
    nom: "Mobile SaaS",
    style: "Application mobile, pensé téléphone d'abord",
    pour: "Service à la demande, application, réseau de points de vente",
    capte: "les inscriptions, les demandes de rappel, et les créneaux les plus pris",
    demo: "https://mobile-saas-template-v1.21st.app",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "homeguardian",
    cat: "rendezvous",
    nom: "HomeGuardian",
    style: "Clair, sécurité de la maison",
    pour: "Alarme, domotique, télésurveillance, installateur — métier reconnaissable d'emblée",
    capte: "les demandes d'installation, l'adresse du chantier, et le rendez-vous de visite",
    demo: "https://homeguardian-v1.21st.app",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "studiova",
    cat: "chantier",
    nom: "Studiova",
    style: "Agence classique, cinq pages complètes",
    pour: "Agence, PME de services, entreprise généraliste",
    capte: "les demandes de devis, leur objet, et la relance jusqu'à la réponse",
    demo: "https://studiova-agency-business-bootstrap-template-v2.21st.app",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "launchui",
    cat: "produit",
    nom: "Launch UI",
    style: "Lancement, blocs nets, sans bavardage",
    pour: "Lancement d'offre, produit, campagne",
    capte: "les inscriptions, les demandes d'accès, et le rendement de chaque campagne",
    demo: "https://launch-ui-v1.21st.app",
    theme: "sombre",
    pages: [""],
  },
  {
    slug: "saascn",
    cat: "produit",
    nom: "SaasCN",
    style: "Logiciel, documentation et blog fournis",
    pour: "Éditeur, service technique, société qui documente ce qu'elle vend",
    capte: "les demandes d'essai, les pages de documentation les plus lues, et la relance",
    demo: "https://saas-landing.techwithanirudh.com/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "chatdeck",
    cat: "produit",
    nom: "ChatDeck",
    style: "Clair, produit en scène, prix et FAQ",
    pour: "Éditeur, plateforme, service d'assistance",
    capte: "les demandes d'essai, les questions posées avant l'inscription, et la relance",
    demo: "https://chatdeck-v1.21st.app",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "payload",
    cat: "produit",
    nom: "Payload",
    style: "Grille architecturale sombre, effet de verre",
    pour: "Éditeur, prestataire technique, société d'ingénierie",
    capte: "les demandes de mission, leur origine, et les rappels programmés",
    demo: "https://payload-marketing-v1.21st.app",
    theme: "sombre",
    pages: [""],
  },
  {
    slug: "vetra",
    cat: "produit",
    nom: "Vetra",
    style: "Sombre animé, gestion de projet en scène",
    pour: "Éditeur, outil d'équipe, société de services",
    capte: "les demandes de démonstration, la taille d'équipe annoncée, et la relance",
    demo: "https://vetra-app.vercel.app/",
    theme: "sombre",
    pages: [""],
  },
  {
    slug: "luro",
    cat: "produit",
    nom: "Luro AI",
    style: "Réseaux sociaux, mesures, mouvement soigné",
    pour: "Communication, agence social media, marque qui publie",
    capte: "les demandes de devis, leur origine, et la relance des propositions sans réponse",
    demo: "https://luro.heyshreyas.com/",
    theme: "sombre",
    pages: [""],
  },
  {
    slug: "saaslanding",
    cat: "produit",
    nom: "SaaS Landing",
    style: "Sombre, grille de fonctions et prix",
    pour: "Éditeur, plateforme, produit en ligne",
    capte: "les inscriptions, les offres regardées avant de choisir, et la relance",
    demo: "https://saas-landing-template-v1.21st.app",
    theme: "sombre",
    pages: [""],
  },
  {
    slug: "nexacore",
    cat: "chantier",
    nom: "NexaCore",
    style: "Violet profond, vidéo plein écran, cartes en relief",
    pour: "Industrie, infrastructure, groupe, exploitation technique",
    capte: "les demandes de projet, le site concerné, et le rendez-vous posé",
    demo: "https://hirael.com/embed/templates/nexacore",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "asme",
    cat: "chantier",
    nom: "Asme",
    style: "Sombre, verre dépoli, vidéo en fondu",
    pour: "Marque, enseigne haut de gamme, réception soignée",
    capte: "les demandes de contact, la page d'origine, et la relance jusqu'à la réponse",
    demo: "https://hirael.com/embed/templates/asme",
    theme: "sombre",
    pages: [""],
  },
  {
    slug: "velorah",
    cat: "rendezvous",
    nom: "Velorah",
    style: "Clair, ciel pastel, très évocateur",
    pour: "Concession, marque de véhicules, équipement de loisir",
    capte: "les demandes d'essai, le modèle regardé, et le créneau de rendez-vous",
    demo: "https://hirael.com/embed/templates/velorah",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "rivr",
    cat: "cabinet",
    nom: "Rivr",
    style: "Cartes de verre, chiffres, mise en pavés",
    pour: "Finance, courtage, gestion, société d'investissement",
    capte: "les demandes d'entretien, le montant annoncé, et le rappel programmé",
    demo: "https://hirael.com/embed/templates/rivr",
    theme: "clair",
    pages: ["", "-2"],
  },
  {
    slug: "usdhalo",
    cat: "cabinet",
    nom: "USD Halo",
    style: "Fintech premium, bandeau de marques",
    pour: "Finance, paiement, assurance, groupe qui rassure par ses références",
    capte: "les demandes d'entretien, les références regardées, et le rendez-vous posé",
    demo: "https://hirael.com/embed/templates/usd-halo",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "mindloop",
    cat: "produit",
    nom: "Mindloop",
    style: "Monochrome sombre, inscription en ligne",
    pour: "Média, lettre d'information, direction de la communication",
    capte: "les abonnements, les sujets qui ramènent des lecteurs, et la relance",
    demo: "https://hirael.com/embed/templates/mindloop",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "agencylanding",
    cat: "chantier",
    nom: "Agency Landing",
    style: "Lumineux, fond animé, réalisations",
    pour: "Agence, studio, création, communication",
    capte: "les demandes de projet, la réalisation qui a accroché, et le rendez-vous posé",
    demo: "https://hirael.com/embed/templates/agency-landing",
    theme: "clair",
    pages: [""],
  },
  {
    slug: "creativestudio",
    cat: "chantier",
    nom: "Creative Studio",
    style: "Sombre cinématique, révélations au défilement",
    pour: "Production, studio, événementiel, création",
    capte: "les demandes de projet, le budget annoncé, et la relance jusqu'à la réponse",
    demo: "https://hirael.com/embed/templates/creative-studio",
    theme: "sombre",
    pages: [""],
  },
];

/* chemin d'une capture — les fichiers vivent dans public/modeles/ */
export const capture = (m: Modele, i = 0) => `/modeles/${m.slug}${m.pages[i] ?? ""}.jpg`;

/* ——— rangement du catalogue (03/08, Teo : « range les design et site par
   catégorie […] tu mets 3 et un bouton voir plus ») ———

   Vingt-deux cartes d'affilée, c'est un mur qu'on scrolle sans jamais
   choisir. Rangées par USAGE, on lit trois exemples par famille et on
   déplie seulement celle qui nous concerne.

   Le classement se fait sur ce que le site doit FAIRE, jamais sur le
   métier : ces templates sont génériques, un même design sert un maçon et
   un architecte. « Vous montrez ce que vous réalisez » est vrai pour les
   deux ; « modèle BTP » ne l'aurait été pour aucun. */
export const CATEGORIES = [
  {
    cle: "chantier" as const,
    titre: "Vous montrez ce que vous réalisez",
    pour: "Bâtiment, ingénierie, industrie, création : le travail se voit, donc il se prouve en images.",
  },
  {
    cle: "rendezvous" as const,
    titre: "Vos clients réservent",
    pour: "Réseaux, concessions, après-vente : un créneau, une visite, une commande.",
  },
  {
    cle: "cabinet" as const,
    titre: "Vous vendez votre expertise",
    pour: "Conseil, finance, assurance, comptabilité : c'est le sérieux qui décide, pas la photo.",
  },
  {
    cle: "produit" as const,
    titre: "Vous vendez un service en ligne",
    pour: "Plateforme, espace client, extranet, et les catalogues fournis en pages toutes faites.",
  },
];

export const parCategorie = (cle: Modele["cat"]) => MODELES.filter((m) => m.cat === cle);

/* ——— composition du collage du hero ———
   Six colonnes de deux : douze vignettes prises dans le catalogue,
   choisies pour que le mur alterne sombre et clair et qu'aucune colonne ne
   soit monochrome. Ce ne sont que des accueils — les pages internes n'ont
   rien à faire dans un collage, elles se ressemblent trop d'un site à
   l'autre pour donner de la variété.

   06/08 — « sage » remplace « assetx », retiré du catalogue. Même thème
   sombre, donc la colonne 2 reste mixte face à « flux » qui est clair.

   15/09 — la vague 3 fait passer le catalogue de 21 à 83 modèles, et ce
   collage n'est PAS refait : les douze vignettes sont choisies une à une
   pour qu'aucune colonne ne soit monochrome, et les remplacer au hasard
   casserait l'alternance sans rien gagner. À reprendre quand on voudra
   mettre la vague 3 en avant — candidats sombres : t3code, asme, qronos,
   creativestudio ; candidats clairs : smileflow, guild, nexacore. */
export const MUR: string[][] = [
  ["proactiv", "kinto"],
  ["flux", "sage"],
  ["hive", "sonic"],
  ["originx", "fincash"],
  ["studio", "aspect"],
  ["gray", "template07"],
];

export const parSlug = (slug: string) => MODELES.find((m) => m.slug === slug)!;
