/* ══════════════════════════════════════════════════════════════════════
   SectionCompte — une section de « Mon compte », avec son en-tête coloré
   (03/09/2026)

   Demande Teo du 03/09 : « rend plus pro, ajoute de la couleur, sépare
   les segments un par un ». Chaque segment de /compte devient UNE carte
   blanche, et chaque carte porte un en-tête teinté : une tuile d'icône,
   un kicker en capitales dans la même teinte, le titre en r-h4. Une
   teinte par segment — orange (abonnement, la couleur charte), bleu
   (rendez-vous), bordeaux (site — la carte bordeaux-or de /commencer),
   violet (profil), gris (sécurité). Les couples fond/texte sont dans
   globals.css (.cp-section[data-teinte]) ; ils tiennent tous le
   contraste 4,5:1 sur leur fond doux.

   Pas de « use client » : le composant n'a ni état ni gestionnaire, il se
   rend côté serveur dans la page ET peut être importé par un composant
   client (la carte d'abonnement, par exemple) — il n'importe rien de
   réservé au serveur.

   `icone` : un composant lucide (CreditCard, CalendarDays…), rendu ici à
   la taille de la tuile ; un élément déjà construit (<Icone />) passe
   aussi, pour l'appelant qui préfère régler l'icône lui-même.
   ══════════════════════════════════════════════════════════════════════ */

import { isValidElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type TeinteSection = "orange" | "bleu" | "bordeaux" | "violet" | "neutre";

export type SectionCompteProps = {
  teinte: TeinteSection;
  icone: LucideIcon | ReactNode;
  kicker: string;
  titre: string;
  /* ancre de la section (#abonnement, #profil…) — facultative */
  id?: string;
  /* un élément à droite de l'en-tête (un compteur, un bouton) */
  droite?: ReactNode;
  children: ReactNode;
};

export default function SectionCompte({ teinte, icone, kicker, titre, id, droite, children }: SectionCompteProps) {
  /* un élément React est rendu tel quel ; sinon c'est un composant lucide
     (un objet forwardRef — `typeof` ne suffit pas, d'où isValidElement) */
  const Icone = isValidElement(icone) ? null : (icone as LucideIcon);

  return (
    <section id={id} className="cp-section" data-teinte={teinte} aria-labelledby={id ? `${id}-titre` : undefined}>
      <header className="cp-tete">
        <span className="cp-tuile" aria-hidden="true">
          {Icone ? <Icone size={20} strokeWidth={2} /> : (icone as ReactNode)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="cp-kicker">{kicker}</div>
          <h2 id={id ? `${id}-titre` : undefined} className="r-h4 cp-titre">
            {titre}
          </h2>
        </div>
        {droite ? <div className="shrink-0 self-center">{droite}</div> : null}
      </header>
      <div className="cp-corps">{children}</div>
    </section>
  );
}
