import "./EtapesAudit.css";

/* ══════════════════════════════════════════════════════════════════════
   <EtapesAudit> — « Comment se passe l'audit », rail numéroté
   (15/09/2026)

   REMPLACE <DerouleAudit>, le volet collant du 14/09 (Aceternity
   « sticky scroll reveal »), que Teo a refusé de visu : « j'aime pas,
   change cette section ». Le reproche se lit sur la capture — pour trois
   temps, le bloc mangeait trois écrans de haut, une carte seule à gauche
   et un sommaire de 340 px perdu à droite. Le geste était juste, la
   composition était vide.

   ORIGINE. `ravikatiyar162/how-it-works` (21st.dev) : un rail horizontal
   de pastilles numérotées reliées par un filet, et sous chaque pastille
   la carte de son étape. Tout est lu d'un coup, la suite est dite par le
   rail, et la section tient dans un écran. Seule la COMPOSITION est
   reprise : le code de la référence n'est pas public (sa page ne publie
   que la démo), et son monde est noir à icônes — ici tout est réécrit
   dans le vocabulaire de `.resa`.

   CE QUI EST JETÉ DE LA RÉFÉRENCE.
   1. Le monde sombre (#0a0a0a, cartes #141414) : `.resa` est clair, quasi
      monochrome. Cartes blanches sur le #f5f5f5 de la page.
   2. Les icônes en tête de carte : la page s'interdit le meublage
      (en-tête de page.tsx, « remplacés plutôt que meublés »). Une icône
      « écoute » ou « carte » n'aurait rien dit de plus que le titre.
   3. Les listes à puces sous chaque texte : nos trois temps sont des
      paragraphes tenus, pas des arguments à cocher.

   ÉCARTS ASSUMÉS.
   · UNE SEULE liste. Le rail et les cartes pourraient être deux `<ol>`
     côte à côte — un lecteur d'écran lirait alors les trois étapes deux
     fois. Chaque `<li>` porte donc son nœud ET sa carte, et s'étale sur
     les deux rangées de la grille par `grid-template-rows: subgrid`
     (même montage que les cartes de /tarifs) : les trois pastilles
     s'alignent au pixel et les trois cartes font la même hauteur, sans
     une ligne de JavaScript.
   · Le nœud est `aria-hidden` : le chiffre de la pastille ne dit rien de
     plus que le « Étape 1 » déjà lu dans la carte, et les deux filets
     sont du dessin.
   · Les filets débordent de la moitié de la gouttière (marges négatives
     de 16 px pour un `column-gap` de 32) : c'est ce qui les fait se
     rejoindre d'une colonne à l'autre, au lieu de s'arrêter à chaque
     bord. Les deux extrémités du rail sont posées en `visibility:hidden`
     et non retirées — elles gardent la pastille centrée sur sa colonne.
   · AUCUN état, AUCUN client : composant serveur, rien à hydrater. Le
     seul mouvement est le `[data-reveal]` de la page, qui fait entrer les
     trois cartes en cascade (stagger 0.07 dans PageMotion) — il est posé
     sur la CARTE et non sur le `<li>`, pour ne pas déplacer la colonne de
     la sous-grille pendant son `y: 26 → 0`.
   · Sous 1024 px : une colonne, les filets disparaissent, la pastille
     reste au-dessus de sa carte. Trois cartes empilées sous un titre
     « Comment se passe l'audit » se lisent déjà comme une suite ; un rail
     vertical n'aurait ajouté qu'un trait.
   ══════════════════════════════════════════════════════════════════════ */

export type Temps = { etape: string; titre: string; texte: string };

export default function EtapesAudit({
  temps,
  className,
}: {
  temps: Temps[];
  className?: string;
}) {
  return (
    <ol className={className ? `eta ${className}` : "eta"}>
      {temps.map((t, i) => (
        <li key={t.etape} className="eta-temps">
          <div className="eta-noeud" aria-hidden="true">
            <span
              className="eta-trait"
              data-bout={i === 0 ? "oui" : undefined}
            />
            <span className="eta-pastille">{i + 1}</span>
            <span
              className="eta-trait"
              data-bout={i === temps.length - 1 ? "oui" : undefined}
            />
          </div>

          {/* [data-reveal] sur la CARTE : le <li> est une cellule de la
              sous-grille, on ne le translate pas */}
          <article data-reveal className="eta-carte">
            <p className="eta-etape">{t.etape}</p>
            <h3 className="r-h4 eta-titre">{t.titre}</h3>
            <p className="eta-texte">{t.texte}</p>
          </article>
        </li>
      ))}
    </ol>
  );
}
