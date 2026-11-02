"use client";

/* Réseau Omega, page Membres — les petites briques partagées par la liste,
   la fiche et le panneau : le monogramme, le badge vérifié et son
   infobulle (d'où vient le chiffre, sur quelle période), l'état vide de la
   base réelle. Le style est dans membres.css, sur les jetons --v2-*. */

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Info, Users } from "lucide-react";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import { ReseauVide } from "./reseau-vide";
import type { BadgeLu } from "./membres-donnees";

/** Les initiales du nom dans une tuile neutre (aucun logo : les membres n'en déposent pas encore). */
export function Monogramme({ nom, taille = 32 }: { nom: string; taille?: 32 | 48 }) {
  const initiales = nom
    .split(/[\s-]+/)
    .filter((m) => /^\p{L}/u.test(m))
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join("");
  return (
    <span className="rm-monogramme" data-taille={taille} aria-hidden="true">
      {initiales}
    </span>
  );
}

/** L'infobulle d'un badge : au survol et au focus, et au toucher (un appui l'ouvre, un autre la ferme). */
export function Infobulle({ etiquette, children, contenu }: { etiquette: string; children: React.ReactNode; contenu: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <TooltipTrigger isOpen={ouvert} onOpenChange={setOuvert} delay={250} closeDelay={100} shouldCloseOnPress={false}>
      <Button className="rm-bulle-declencheur" aria-label={etiquette} onPress={() => setOuvert((o) => !o)}>
        {children}
      </Button>
      <Tooltip className="v2-jetons rm-bulle" placement="bottom start" offset={6} crossOffset={-4}>
        {contenu}
      </Tooltip>
    </TooltipTrigger>
  );
}

function ContenuBulle({ badge }: { badge: BadgeLu }) {
  return (
    <>
      <strong>{badge.chiffre}</strong>
      <span>{badge.source}</span>
    </>
  );
}

/** Le badge compact des cartes de la liste. */
export function BadgeVerifie({ badge }: { badge: BadgeLu }) {
  return (
    <Infobulle etiquette={`${badge.phrase}. D'où vient ce chiffre ?`} contenu={<ContenuBulle badge={badge} />}>
      <span className="rm-badge">
        <BadgeCheck width={14} height={14} strokeWidth={1.8} aria-hidden="true" />
        {badge.phrase}
      </span>
    </Infobulle>
  );
}

/** La ligne d'un badge dans la fiche : la phrase, puis le bouton « i » qui dit d'où vient le chiffre. */
export function LigneBadge({ badge }: { badge: BadgeLu }) {
  return (
    <li className="rm-ligne-badge">
      <BadgeCheck className="rm-ligne-badge-icone" width={16} height={16} strokeWidth={1.8} aria-hidden="true" />
      <div className="rm-ligne-badge-texte">
        <span className="rm-ligne-badge-phrase">
          {badge.phrase}
          <Infobulle etiquette={`D'où vient « ${badge.phrase} » ?`} contenu={<ContenuBulle badge={badge} />}>
            <span className="rm-bulle-i">
              <Info width={14} height={14} aria-hidden="true" />
            </span>
          </Infobulle>
        </span>
        <small>Vérifié par la donnée · {badge.nom} · 12 mois</small>
      </div>
    </li>
  );
}

/** En base réelle : le réseau n'a encore aucune table, donc aucun membre — jamais les membres d'exemple. */
export function ReseauFerme({ retour }: { retour?: boolean }) {
  return (
    <ReseauVide
      icone={Users}
      page="L'annuaire y montrera les entreprises qui le rejoignent ; vous choisirez champ par champ ce que vous y montrez."
      autreAction={
        retour ? (
          <Link href="/espace2/reseau/membres" className="v2-btn v2-btn--fantome">
            Retour à l&apos;annuaire
          </Link>
        ) : undefined
      }
    />
  );
}
