"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega — l'état vide commun des quatre pages en base réelle
   (02/11/2026, intégration des branches Fil, Membres, Messages et
   Opportunités)

   Chaque page avait écrit le sien : même titre, mais quatre textes, trois
   tailles d'icône et trois boutons différents (« Voir les données
   d'exemple », « Voir l'exemple », rien). Ils passent tous par ici : le
   titre et le texte de RESEAU_VIDE (source.ts), une phrase propre à la
   page, et le même bouton pour revenir à l'exemple. La base réelle
   n'existe que pour un compte connecté (components/espace/source.tsx) :
   le bouton est donc toujours utile là où cet état s'affiche.
   ══════════════════════════════════════════════════════════════════════ */

import type { ComponentType, ReactNode, SVGProps } from "react";
import { useSource } from "@/components/espace/source";
import { Vide } from "../ui";
import { RESEAU_VIDE } from "./source";

export function ReseauVide({
  icone: Icone,
  page,
  autreAction,
}: {
  /** l'icône de la page (lucide), dessinée à la même taille partout */
  icone: ComponentType<SVGProps<SVGSVGElement>>;
  /** une phrase : ce que la page montrera quand le réseau ouvrira */
  page: string;
  /** un second geste propre à la page (ex. le retour à l'annuaire) */
  autreAction?: ReactNode;
}) {
  const { changer } = useSource();
  return (
    <Vide
      icone={<Icone width={20} height={20} strokeWidth={1.6} aria-hidden="true" />}
      titre={RESEAU_VIDE.titre}
      action={
        /* .v2-vide est une grille : les deux gestes tiennent sur une ligne dans .v2-actions */
        <div className="v2-actions">
          <button type="button" className="v2-btn" onClick={() => changer("exemple")}>
            Voir les données d&apos;exemple
          </button>
          {autreAction}
        </div>
      }
    >
      {RESEAU_VIDE.texte} {page}
    </Vide>
  );
}
