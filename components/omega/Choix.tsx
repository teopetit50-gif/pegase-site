"use client";

/* Le menu de choix du pilotage (09/10/2026), à la place des <select>
   natifs : leur liste s'ouvrait avec le menu du système (fond gris, coche
   d'Apple), hors du dessin du tableau de bord — retour de Teo. Même
   popover et mêmes lignes que les menus ⌃⌄ (v2-popover, v2-menu-item),
   la coche sur l'option choisie, le clavier de react-aria.

   Quatre formes de bouton, pour garder l'allure de ce qu'il remplace :
     · « bouton »   : un filtre de la barre (v2-val-bouton) ;
     · « pastille » : un statut à pastille de couleur (om-choix) ;
     · « champ »    : un champ de formulaire (v2-champ) ;
     · « fiche »    : un champ de la fiche contact (om-fiche-champ). */

import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";
import { Check, ChevronDown } from "lucide-react";

export type OptionChoix = string | { cle: string; libelle: string };
const TOUS = "__tous__";

export default function Choix({
  valeur,
  options,
  onChange,
  etiquette,
  forme = "champ",
  icone,
  vide,
  teinte,
  actif,
  classe,
  largeur,
}: {
  valeur: string;
  options: OptionChoix[];
  onChange: (v: string) => void;
  etiquette: string;
  forme?: "bouton" | "pastille" | "champ" | "fiche";
  icone?: React.ReactNode;
  /* une première option « toutes » qui vaut "" */
  vide?: string;
  teinte?: string;
  actif?: boolean;
  classe?: string;
  largeur?: number;
}) {
  const liste = [...(vide !== undefined ? [{ cle: "", libelle: vide }] : []), ...options.map((o) => (typeof o === "string" ? { cle: o, libelle: o } : o))];
  const choisi = liste.find((o) => o.cle === valeur);
  const classeBouton = { bouton: "v2-val-bouton", pastille: "om-choix", champ: "v2-champ om-choix-champ", fiche: "om-choix-fiche" }[forme];
  return (
    <MenuTrigger>
      <Button className={`${classeBouton}${classe ? ` ${classe}` : ""}`} aria-label={`${etiquette} : ${choisi?.libelle ?? valeur}`} data-teinte={teinte} data-actif={actif ? "" : undefined}>
        {icone}
        <span className="om-choix-libelle">{choisi?.libelle ?? (valeur || vide)}</span>
        {forme === "pastille" ? null : <ChevronDown width={14} height={14} aria-hidden="true" className="v2-val-bouton-chevron" />}
      </Button>
      <Popover placement="bottom start" offset={6} className="v2-jetons v2-popover om-choix-popover" style={{ minWidth: largeur ?? "var(--trigger-width)" }}>
        <Menu className="v2-menu" aria-label={etiquette} onAction={(k) => onChange(k === TOUS ? "" : String(k))}>
          {liste.map((o) => (
            <MenuItem key={o.cle || TOUS} id={o.cle || TOUS} textValue={o.libelle} className="v2-menu-item">
              <span>{o.libelle}</span>
              <span className="v2-menu-item-suffixe">{o.cle === valeur ? <Check width={14} height={14} aria-hidden="true" /> : null}</span>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
