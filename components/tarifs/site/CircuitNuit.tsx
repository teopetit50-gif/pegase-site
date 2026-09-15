import { cn } from "@/lib/cn";
import "./CircuitNuit.css";

/* ══════════════════════════════════════════════════════════════════════
   <CircuitNuit> — la carte sombre « Ce qui suit le clic » (14/09/2026)
   Colonne droite de la section 5 de /tarifs/site, dans la bande `.o-nuit`.

   ORIGINE. « Border Beam » de Magic UI (magicui.design/r/border-beam) :
   un carré en dégradé, posé en absolu dans un conteneur `relative`, qui
   parcourt le bord arrondi en boucle grâce à `offset-path: rect(0 auto
   auto 0 round Npx)` et à une animation de `offset-distance` de 0 à 100 %.
   Un masque à deux calques (`mask-clip: padding-box, border-box` +
   `mask-composite: intersect`) ne laisse voir du carré que la portion qui
   tombe sur le liseré du conteneur.

   POURQUOI ICI. La carte disait déjà les trois temps du circuit, mais
   elle était strictement immobile dans une bande noire immobile : rien à
   sa droite ne bougeait, et l'argument de la section — « chaque demande
   ENTRE dans le circuit » — se lisait comme une liste de promesses. Un
   point clair qui fait le tour du cadre toutes les neuf secondes donne à
   la carte ce que la colonne de gauche affirme : quelque chose tourne, en
   continu, même quand personne ne regarde. C'est un signe de vie, pas un
   néon — la lueur ne mesure qu'un pixel et sa tête est à 90 % de blanc.

   CE QUI EST JETÉ de la source, et pourquoi :
   1. Le violet et l'orange (#9c40ff, #ffaa40) : aucune couleur dans le
      parc. Le dégradé va du blanc au transparent, et l'opacité tombe à
      40 % dès le tiers de la traîne.
   2. `motion/react` et le composant client : la course est une seule
      propriété animée en boucle linéaire, sans état, sans écoute, sans
      mesure — un `@keyframes` la fait aussi bien. La carte reste donc un
      composant SERVEUR : rien à hydrater, rien à envoyer au navigateur,
      et le faisceau tourne même avant que le JavaScript soit arrivé.
      `prefers-reduced-motion` s'éteint alors dans la feuille, sans
      `matchMedia` ni rendu conditionnel — donc sans risque d'hydratation.
   3. Le masque `mask-composite: intersect` sur deux calques : la carte a
      un fond PLEIN (#18181b). Un cache opaque posé à 1 px du bord fait le
      même anneau, sans dépendre d'une propriété dont les préfixes et les
      mots-clés divergent encore entre moteurs. Le fond du cache doit
      rester exactement celui de la carte — les deux valeurs sont
      écrites en clair, côte à côte, dans la feuille.
   4. Les dix props (`size`, `duration`, `delay`, `colorFrom`, `colorTo`,
      `reverse`, `initialOffset`, `borderWidth`, `transition`, `style`) :
      un seul faisceau, réglé une fois. Tout ce qui se réglait par prop est
      une valeur de la feuille, là où se règle le reste de la charte.
   5. `round ${size}px` (le rayon du chemin calé sur la taille du point,
      soit 50 px pour un cadre à 20) : le chemin suit ici le rayon RÉEL de
      la boîte de remplissage, 19 px. Sans cela le point coupe le coin et
      quitte l'anneau quatre fois par tour.
   6. `cn` de `@/lib/utils` : ici c'est `@/lib/cn`.

   ÉCARTS ASSUMÉS :
   · Les trois temps passent de <ul> à <ol> : ils sont ordonnés, et les
     numéros lus « 01, 02, 03 » doublonneraient l'énumération — ils sont
     donc décoratifs (aria-hidden) et la liste porte seule l'ordre.
   · Un rail vertical de 1 px à 12 % relie les trois numéros. Il tient à
     390 px parce que la colonne des numéros est une boîte FIXE de 22 px
     (chiffres tabulaires de la classe `num`) : le rail se pose à son
     milieu, 11 px, et sa course se déduit de la hauteur du numéro — aucun
     nombre magique qui dépendrait du nombre de lignes du texte.
   · Le faisceau est masqué tant que `offset-path: rect()` n'est pas
     reconnu (@supports) : un point clair immobile dans un coin se lirait
     comme une avarie, pas comme un décor.
   · La carte garde `data-reveal` : son entrée reste celle de la page
     (GSAP, PageMotion), il n'y a pas de seconde mécanique d'apparition.
   ══════════════════════════════════════════════════════════════════════ */

/* Les quatre lignes de la bande nuit. 15/09 : une quatrième est ajoutée —
   ce que le site ENREGISTRE, et non plus seulement ce qu'il déclenche. */
const CIRCUIT: [string, string][] = [
  ["01", "Accusé de réception en deux minutes, sous votre signature."],
  ["02", "Devis relancé à J+3 et J+7, facture suivie jusqu'au règlement."],
  ["03", "Avis demandé une fois la commande livrée, jamais avant."],
  ["04", "Chaque semaine, ce qu'on a cherché chez vous sans le trouver."],
];

export default function CircuitNuit({ className }: { className?: string }) {
  return (
    <div data-reveal className={cn("cn-carte", className)}>
      {/* le faisceau : décor pur, jamais annoncé ni cliquable */}
      <span className="cn-faisceau" aria-hidden="true">
        <span className="cn-faisceau-point" />
      </span>

      <div className="cn-corps">
        <p className="cn-intitule">Ce que le site fait après le clic</p>
        <ol className="cn-liste">
          {CIRCUIT.map(([n, t]) => (
            <li key={n} className="cn-etape">
              <span className="cn-num num" aria-hidden="true">
                {n}
              </span>
              <span className="cn-texte o-body">{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
