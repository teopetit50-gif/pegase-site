"use client";

/* Réseau Omega, page Membres — les petites briques partagées par la liste,
   la fiche et le panneau : l'avatar d'initiales (le rond gris de Contacts,
   pas de carré de couleur), le badge vérifié et son infobulle (d'où vient
   le chiffre, sur quelle période), l'état vide de la base réelle. Le style
   est dans membres.css, sur les jetons --lin-* du kit des moteurs. */

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Timer, Users } from "lucide-react";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import { ReseauVide } from "./reseau-vide";
import type { BadgeLu } from "./membres-donnees";

export function initialesDe(nom: string): string {
  return nom
    .split(/[\s-]+/)
    .filter((m) => /^\p{L}/u.test(m))
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join("");
}

/** Les initiales dans un rond gris : 16 dans une ligne, 24 dans une liste, 36 en tête de fiche. */
export function Avatar({ nom, taille = 16 }: { nom: string; taille?: 16 | 24 | 36 }) {
  return (
    <span className="rm-avatar" data-taille={taille} aria-hidden="true">
      {initialesDe(nom)}
    </span>
  );
}

/** L'infobulle d'un badge : au survol et au focus, et au toucher (un appui l'ouvre, un autre la ferme). */
export function Infobulle({ etiquette, children, contenu, classe = "rm-bulle-declencheur" }: { etiquette: string; children: React.ReactNode; contenu: React.ReactNode; classe?: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <TooltipTrigger isOpen={ouvert} onOpenChange={setOuvert} delay={250} closeDelay={100} shouldCloseOnPress={false}>
      <Button className={classe} aria-label={etiquette} onPress={() => setOuvert((o) => !o)}>
        {children}
      </Button>
      <Tooltip className="v2-jetons rm-bulle" placement="bottom start" offset={6} crossOffset={-4}>
        {contenu}
      </Tooltip>
    </TooltipTrigger>
  );
}

export function ContenuBulle({ badge }: { badge: BadgeLu }) {
  return (
    <>
      <strong>{badge.phrase}</strong>
      <span>{badge.chiffre}.</span>
      <span>{badge.source}</span>
    </>
  );
}

export const IconeBadge = ({ cle }: { cle: BadgeLu["cle"] }) =>
  cle === "bonPayeur" ? <BadgeCheck width={16} height={16} strokeWidth={1.7} aria-hidden="true" /> : <Timer width={16} height={16} strokeWidth={1.7} aria-hidden="true" />;

/** Le badge court d'une ligne de la liste (« 24 j », « 35 min ») : la phrase entière est dans l'infobulle. */
export function BadgeCourt({ badge }: { badge: BadgeLu }) {
  return (
    <Infobulle etiquette={`${badge.phrase}. D'où vient ce chiffre ?`} contenu={<ContenuBulle badge={badge} />} classe="rm-badge-court">
      <IconeBadge cle={badge.cle} />
      <span>{badge.court}</span>
    </Infobulle>
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
