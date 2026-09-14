/* ══════════════════════════════════════════════════════════════════════
   GlassAccountCard / GlassPanel — la carte de verre de « Mon compte »
   (14/09/2026)

   Demande Teo : « refais toute la section Mon compte, elle n'est
   utilisable que quand on défile ; je veux que tout soit sur une page,
   donc en largeur ». Le modèle est la « Glass Account Settings Card »
   (shadcn) qu'il a collée : UNE grande carte translucide, arrondie à
   24 px, avec un en-tête (pilule, titre, description, badge) et une
   grille de sous-panneaux à 16 px — tout se voit d'un coup, la page
   s'organise en colonnes plutôt qu'en pile.

   Ce qu'on a gardé de la référence : la carte de verre (fond blanc à
   82 %, flou d'arrière-plan, filet fin), les panneaux en verre plus
   léger, l'en-tête sur une ligne, le badge d'état à droite. Ce qu'on
   n'a PAS repris : ses primitives shadcn (Badge, Button, Switch, Label —
   le site a ses .r-btn et .cp-pastille), et framer-motion — l'entrée
   est la cascade d'Arrivee ([data-arrivee], components/Arrivee.tsx),
   comme sur toutes les pages du site ; un second fondu par-dessus
   ferait l'effet deux fois.

   Deux composants, sans état ni « use client » : ils se rendent côté
   serveur dans la page. Les styles sont dans globals.css sous .resa,
   préfixe .cp- (cp-verre, cp-panneau…) — un thème scopé, pas des
   utilitaires, comme le reste du monde clair.

   GlassPanel : `zone` est l'aire de la grille (grid-template-areas de
   .cp-grille) — abo, cockpit, rdv, cmd, profil, secu. `bande` : le
   panneau se couche en BANDEAU (en-tête et corps sur la même ligne) —
   c'est le profil, dont le résumé tient sur une ligne en pleine largeur
   et qui, en panneau, coûtait un rang entier à la carte. `teinte` colore la
   tuile d'icône (les couples fond/texte de l'ancienne SectionCompte,
   tous ≥ 4,5:1). `icone` : un composant lucide, ou un élément déjà
   construit.
   ══════════════════════════════════════════════════════════════════════ */

import { isValidElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type TeintePanneau = "orange" | "bleu" | "bordeaux" | "violet" | "neutre" | "vert";
export type ZonePanneau = "abo" | "cockpit" | "rdv" | "cmd" | "profil" | "secu";

export function GlassAccountCard({
  identite,
  droite,
  children,
}: {
  /* l'identité en tête (avatar, titre de page, ligne de détail) */
  identite: ReactNode;
  /* à droite de l'en-tête : badge d'état, sortie */
  droite?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="cp-verre" data-arrivee="bloc" aria-labelledby="cp-titre-page">
      <header className="cp-verre-tete">
        {identite}
        {droite ? <div className="cp-verre-droite">{droite}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function GlassPanel({
  zone,
  teinte,
  icone,
  titre,
  sous,
  droite,
  bande,
  children,
}: {
  zone: ZonePanneau;
  teinte: TeintePanneau;
  icone: LucideIcon | ReactNode;
  titre: string;
  /* une ligne sous le titre, 13 px — facultative */
  sous?: ReactNode;
  /* un élément à droite de l'en-tête (un compteur) */
  droite?: ReactNode;
  /* couché en bandeau : voir l'en-tête */
  bande?: boolean;
  children: ReactNode;
}) {
  /* un élément React est rendu tel quel ; sinon c'est un composant lucide
     (un objet forwardRef — `typeof` ne suffit pas, d'où isValidElement) */
  const Icone = isValidElement(icone) ? null : (icone as LucideIcon);
  const idTitre = `cp-${zone}-titre`;

  return (
    <section
      id={zone}
      className={`cp-panneau${bande ? " cp-panneau--bande" : ""}`}
      data-zone={zone}
      data-teinte={teinte}
      aria-labelledby={idTitre}
    >
      <header className="cp-panneau-tete">
        <span className="cp-tuile" aria-hidden="true">
          {Icone ? <Icone size={18} strokeWidth={2} /> : (icone as ReactNode)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={idTitre} className="cp-panneau-titre">
            {titre}
          </h2>
          {sous ? <p className="cp-panneau-sous">{sous}</p> : null}
        </div>
        {droite ? <div className="shrink-0">{droite}</div> : null}
      </header>
      <div className="cp-panneau-corps">{children}</div>
    </section>
  );
}
