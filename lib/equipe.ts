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

   ⚠️  LES TROIS DESCRIPTIFS SONT DES BROUILLONS (14/09, Teo : « fais un
   descriptif aussi de qui on est, genre ce qu'on a fait »). Ceux d'Henri et
   de Vincent sont tirés de la capture que Teo a collée le 12/09 — donc de
   leur propre page, pas d'une source vérifiée ici. Le sien est bâti sur la
   seule phrase qu'il en a dite : « j'ai travaillé en finance ». Trois
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
  /* le descriptif, deux à trois lignes. Affiché sous le rôle dans la
     mosaïque depuis le 14/09, et par la grille de fiches. */
  bio?: string;
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
    bio: "Passé par Microsoft puis DocuSign, où son métier était de faire adopter des logiciels dans de grandes organisations. Ce qui décide qu'un outil serve vraiment, il l'a vu de près.",
    photo: "/equipe/henri.jpg",
  },
  {
    cle: "vincent",
    prenom: "Vincent",
    nom: "Karmalecki",
    role: "CTO & Co-fondateur",
    bio: "Ingénieur en intelligence artificielle, passé par Salesforce puis Databricks comme ingénieur avant-vente. C'est lui qui conçoit les systèmes, et qui les tient quand ils passent en production.",
    photo: "/equipe/vincent.jpg",
  },
  {
    cle: "teo",
    prenom: "Teo",
    nom: "Karczewski",
    role: "Co-fondateur",
    bio: "Il vient de la finance, où rien ne se décide sans avoir vérifié le chiffre. Chez Omega, c'est lui qui fait les audits, installe les systèmes et décroche quand vous appelez.",
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
export const EQUIPE_TITRE = "L'équipe qui installe est celle qui répond.";
export const EQUIPE_CHAPO =
  "Omega n'est pas une agence à étages. La personne qui fait votre audit est celle qui installe vos systèmes, et celle que vous avez au téléphone six mois plus tard.";
/* La ligne de pied, sous la liste des noms. Chaque terme est vérifiable. */
export const EQUIPE_PIED =
  "Conçu et développé en France.";
