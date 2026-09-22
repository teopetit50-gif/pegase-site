/* ══════════════════════════════════════════════════════════════════════
   L'ÉQUIPE — la source unique de la section « qui est derrière » (accueil)

   Lue par components/ui/team-showcase.tsx (la mosaïque de l'accueil) et par
   components/apropos/Equipe.tsx (la grille de fiches, écrite le 30/07 et
   aujourd'hui sans page qui l'appelle). Ajouter quelqu'un ici le fait
   apparaître aux deux endroits : la mosaïque s'adapte au nombre réel de
   fiches, de 1 à 8.

   ⚠️  LES NOMS NE S'INVENTENT PAS. La version du 30/07 ne portait que la
   fiche de Teo, avec cette note : une équipe fictive illustrée de portraits
   d'inconnus, ce ne sont pas des avis de démonstration, ce sont des
   personnes réelles dont on utiliserait le visage. La règle tient. Les
   trois fiches ci-dessous ont été données par Teo le 12/09/2026, noms et
   rôles compris ; rien n'a été déduit ni complété.

   22/09/2026 — RÉÉCRITURE (Teo : « trop amateur »). Mêmes faits, aucun
   ajout : registre grands comptes, verbes de responsabilité, plus de
   « faisait adopter » ni de « en hedge fund » (rendu par « fonds
   d'investissement », terme générique et exact). Le chapô ne répète plus
   le titre : il dit d'où viennent les trois associés.

   ⚠️  LES TROIS DESCRIPTIFS ÉTAIENT DES BROUILLONS (14/09, Teo : « fais un
   descriptif aussi de qui on est, genre ce qu'on a fait »). Ceux d'Henri et
   de Vincent sont tirés de la capture que Teo a collée le 12/09 — donc de
   leur propre page, pas d'une source vérifiée ici. Le sien tient de lui :
   « j'ai travaillé en finance » (14/09), précisé le 15/09 en « des sociétés
   en finance, genre hedge fund ». D'où « en hedge fund », au singulier
   générique et sans nommer de maison : aucune n'a été donnée, et on
   n'invente pas un employeur. Trois
   arbitrages à connaître avant de les relire :
   · AUCUN CHIFFRE. La capture annonçait « 80 000+ abonnés » ; un chiffre
     d'audience posé sur omegaai.fr devient une affirmation d'Omega, et la
     règle maison interdit d'écrire une traction qu'on ne peut pas prouver.
     Si Teo le confirme, il se remet en une ligne.
   · AUCUNE DURÉE inventée (« douze ans chez… ») — rien ne les donne.
   · Les anciens employeurs sont nommés parce que ce sont des faits de
     parcours, pas notre outillage. La règle « ne jamais nommer nos outils »
     ne porte pas sur eux, mais la confusion est possible : la phrase doit
     rester lisible comme un CV, jamais comme une pile technique.

   ⚠️  DEUX CHOSES À CONFIRMER, toutes deux d'un mot :
   1. Le rôle de Teo — « Co-fondateur » est posé par cohérence avec les deux
      autres (« CEO & Fondateur », « CTO & Co-fondateur »), pas parce qu'il
      l'a dit.
   2. La quatrième fiche, annoncée le 12/09 (« on verra pour le dernier
      après »). Une ligne de plus ici suffit : la mosaïque passe d'elle-même
      à deux tuiles dans sa première colonne.

   LES PHOTOS vivent dans /public/equipe/, cadrage portrait serré (800 × 850
   environ, le rapport des tuiles est 31/33). Tant qu'un fichier n'est pas
   déposé, la tuile rend les INITIALES — la page ne se troue pas et aucune
   image cassée n'apparaît, y compris si le chemin est annoncé ici avant que
   le fichier n'existe (l'`onError` de la tuile retombe sur le monogramme).
   ══════════════════════════════════════════════════════════════════════ */

export type Membre = {
  cle: string;
  prenom: string;
  /* le nom de famille, affiché à la suite du prénom dans la mosaïque */
  nom?: string;
  role: string;
  /* le descriptif, deux à trois lignes. Affiché par la grille de fiches de
     /a-propos, où c'est le sujet de la page. */
  bio?: string;
  /* 16/09/2026 — la même en une ligne, servie par la mosaïque de l'ACCUEIL.
     Les trois bios y pesaient 550 signes à elles seules, au milieu d'une
     page dégraissée sur le budget de scale.com. /a-propos garde les
     longues : là-bas, l'équipe est le sujet. */
  bioCourte?: string;
  /* chemin dans /public — sans photo, la tuile affiche les initiales */
  photo?: string;
  /* lien optionnel révélé au survol (profil, page perso). Aucun n'est posé
     pour l'instant : ils viendront avec les URL exactes, jamais devinées. */
  lien?: { label: string; href: string };
};

export const MEMBRES: Membre[] = [
  {
    cle: "henri",
    prenom: "Henri",
    nom: "Guichané",
    role: "CEO & Fondateur",
    bio: "Ancien de Microsoft et de DocuSign, où il accompagnait le déploiement de logiciels auprès de grandes organisations. Il dirige Omega et porte la relation avec chaque client, de la première réunion au suivi.",
    bioCourte:
      "Ancien de Microsoft et de DocuSign, où il accompagnait le déploiement de logiciels auprès de grandes organisations. Il dirige Omega et la relation client.",
    photo: "/equipe/henri.jpg",
  },
  {
    cle: "vincent",
    prenom: "Vincent",
    nom: "Karmalecki",
    role: "CTO & Co-fondateur",
    bio: "Ingénieur en intelligence artificielle, ancien ingénieur avant-vente chez Salesforce puis Databricks. Il conçoit l'architecture des systèmes, en assure la mise en production et en garantit la tenue dans le temps.",
    bioCourte:
      "Ingénieur en intelligence artificielle, ancien de Salesforce et de Databricks. Il conçoit l'architecture des systèmes et en assure la mise en production.",
    photo: "/equipe/vincent.jpg",
  },
  {
    cle: "teo",
    prenom: "Teo",
    nom: "Karczewski",
    role: "Co-fondateur",
    bio: "Issu de la finance, où il a travaillé pour des fonds d'investissement. Il conduit les audits, arbitre les mises en production et supervise l'exploitation des systèmes installés.",
    bioCourte:
      "Issu de la finance, où il a travaillé pour des fonds d'investissement. Il conduit les audits et supervise l'exploitation des systèmes installés.",
    photo: "/equipe/teo.jpg",
  },
];

/* ——— les textes de la section ———
   Le sourcil porte le drapeau (components/ui/drapeau.tsx) : conception en
   France, assistance en français, droit français. Ce qu'elle ne dit PAS, et
   ne doit pas dire : « hébergé en France » (nos données vivent à Francfort).
   Et on ne nomme JAMAIS la région : le produit se vend comme français, pas
   comme guadeloupéen (Teo, 15/09). */
export const EQUIPE_SURTITRE = "ÉQUIPE FRANÇAISE";
export const EQUIPE_TITRE = "Un interlocuteur unique, de l'audit à l'exploitation.";
/* 16/09/2026 — trois lignes de chapô ramenées à une : sur l'accueil, c'était
   le seul texte de section qui n'avait pas de version courte. Budget relevé
   sur scale.com : un chapô de section y tient en 17 à 38 signes. */
export const EQUIPE_CHAPO =
  "Trois associés, issus du logiciel d'entreprise, de l'ingénierie IA et de la finance.";
/* La ligne de pied, sous la liste des noms. Chaque terme est vérifiable. */
export const EQUIPE_PIED =
  "Conçu et développé en France.";
