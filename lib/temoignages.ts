/* ══════════════════════════════════════════════════════════════════════
   TÉMOIGNAGES ET AVIS — le seul fichier à remplir

   ⛔  ÉTAT ACTUEL : CONTENU DE DÉMONSTRATION — NE PAS METTRE EN LIGNE  ⛔

   Tout ce qui suit est du remplissage de maquette, posé le 29/07/2026 à la
   demande de Teo pour juger le rendu de la page en local. Les entreprises,
   les personnes, les citations et les notes N'EXISTENT PAS. Aucun de ces
   éléments ne doit partir en production : un avis client nommé est lu comme
   une affirmation de fait, et un faux avis sur un site commercial est une
   pratique commerciale trompeuse (Code de la consommation art. L.121-2,
   directive Omnibus) — sans compter refs-qonto/NOTES-DESIGN.md qui interdit
   déjà « aucun chiffre de preuve sociale inventé ».

   AVANT LE PROCHAIN `vercel --prod` : remplacer chaque entrée par un vrai
   avis, ou vider les trois tableaux. Vides, les sections disparaissent
   proprement et la page reste publiable — c'est le comportement par défaut,
   il est câblé et testé.

   TEO : c'est ICI et nulle part ailleurs que tu colles tes vrais avis.
     1. NOTES      — tes moyennes publiques (Google, Trustpilot, Pages Jaunes…)
     2. SPOTLIGHT  — 2 à 3 citations fortes, avec nom + rôle + entreprise
     3. HISTOIRES  — une carte par client, avec photo si tu en as
   ══════════════════════════════════════════════════════════════════════ */

/* ——— 1 · LES NOTES ———
   Équivalent des « 4.7 on App Store / 4.7 on Play Store / 4.8 on Trustpilot »
   de Qonto. Laisse vide tant que tu n'as pas de moyenne PUBLIQUE et
   vérifiable : la bande sombre retombe alors sur les trois repères factuels
   du site (12 moteurs / 30 min / 24 h), qui sont déjà en place.

   Exemple une fois rempli :
     { note: "4,9", sur: "Google", detail: "17 avis" },
*/
export type Note = { note: string; sur: string; detail?: string };

/* 01/08 — tableaux vidés : les avis de démonstration étaient partis en prod.
   Les sections de preuve sont invisibles tant que c'est vide. Colle ici tes
   vrais avis uniquement. */
export const NOTES: Note[] = [];

/* ——— 2 · LE CARROUSEL DE CITATIONS ———
   Équivalent du « Customer story spotlight » de Qonto (1 sur 3).

   RÈGLE : une citation ne se met ici que si la personne l'a réellement dite
   ET accepté qu'elle soit publiée avec son nom. Si tu as l'accord mais pas
   la formulation exacte, écris ce qu'elle t'a dit — pas ce que tu aurais
   aimé qu'elle dise.

   Exemple une fois rempli :
     {
       cle: "carmo",
       citation: "On a arrêté de courir après les factures. PAYD relance tout seul et je vois ce qui rentre le matin.",
       nom: "Jean-Marc Sainte-Rose",
       role: "Gérant",
       entreprise: "CARMO Toyota",
       secteur: "Garage — Baie-Mahault",
       moteur: "PAYD",
     },
*/
export type Citation = {
  cle: string;
  citation: string;
  nom: string;
  role: string;
  entreprise: string;
  secteur?: string;
  moteur?: string;
};

/* ⛔ DÉMO — personnes et citations inventées, à remplacer ou vider */
export const SPOTLIGHT: Citation[] = [];

/* ——— 3 · LES CARTES HISTOIRES ———
   Équivalent de la grille « Explore their experiences » de Qonto, avec son
   sélecteur par type de client.

   `profil` doit valoir l'une des clés de PROFILS ci-dessous — c'est lui qui
   range la carte sous le bon onglet. `photo` est un chemin dans /public
   (ex. "/photos/carmo.jpg") ; sans photo, la carte affiche un aplat teinté,
   elle ne casse pas.

   Exemple une fois rempli :
     {
       cle: "carmo",
       profil: "artisans",
       titre: "CARMO ne court plus après ses factures",
       resume: "Le garage encaissait à 45 jours. PAYD relance à J+3, J+7 et J+21 — sans qu'un envoi parte sans validation.",
       taille: "3 salariés",
       secteur: "Garage automobile",
       moteur: "PAYD",
       photo: "/photos/payd.jpg",
     },
*/
export type Histoire = {
  cle: string;
  profil: string;
  titre: string;
  resume: string;
  taille?: string;
  secteur?: string;
  moteur?: string;
  photo?: string;
};

/* ⛔ DÉMO — entreprises et récits inventés, à remplacer ou vider */
export const HISTOIRES: Histoire[] = [];

/* ——— Les onglets du sélecteur ———
   Adapte les libellés à ta clientèle réelle. Un onglet sans aucune histoire
   n'est pas affiché, donc tu peux en laisser en réserve. */
export const PROFILS: { cle: string; label: string }[] = [
  { cle: "artisans", label: "Artisans & garages" },
  { cle: "commerces", label: "Commerces & restauration" },
  { cle: "liberales", label: "Professions libérales" },
];

/* Vrai dès qu'au moins un avis est renseigné — utilisé par la page pour
   décider d'afficher ou non les sections de preuve. */
export const A_DES_AVIS =
  NOTES.length > 0 || SPOTLIGHT.length > 0 || HISTOIRES.length > 0;

/* ——— Garde-fou de mise en ligne ———
   Passer DEMO à false le jour où les vrais avis sont posés. Tant qu'il vaut
   true, chaque build imprime un avertissement dans la sortie (locale ET dans
   les logs de build Vercel) : impossible de mettre en ligne sans l'avoir vu
   passer. Ce n'est pas un blocage — c'est un rappel qui ne s'oublie pas.

   Quand tu remplis : remplace les entrées des trois tableaux, puis mets
   DEMO à false. Si tu préfères publier sans avis pour l'instant, vide
   simplement les trois tableaux : les sections disparaissent d'elles-mêmes. */
export const DEMO = false;

if (DEMO && A_DES_AVIS && typeof window === "undefined") {
  console.warn(
    "\n⛔  OMEGA — /contact contient des AVIS DE DÉMONSTRATION (lib/temoignages.ts).\n" +
      "    Entreprises, personnes, citations et notes sont inventées.\n" +
      "    Avant toute mise en ligne publique : remplacer par de vrais avis,\n" +
      "    ou vider NOTES / SPOTLIGHT / HISTOIRES, puis passer DEMO à false.\n"
  );
}
