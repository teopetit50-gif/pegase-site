/* ══════════════════════════════════════════════════════════════════════
   Les « portées » du nouvel espace (06/10/2026, session C1)

   Comme le tableau de bord de référence : une portée ORGANISATION (ses
   onglets : vue d'ensemble, validations, point du matin, activité,
   réglages) et, en dessous, une portée par MODULE (la carte « projet »,
   avec ses propres onglets). Les écrans pas encore redessinés renvoient
   vers leur écran actuel, sous /espace.
   ══════════════════════════════════════════════════════════════════════ */

import type { LucideIcon } from "lucide-react";
import { Building, CarFront, FileText, FolderLock, HandCoins, HardHat, MessageSquareText, Smile, Stamp, UserMinus } from "lucide-react";

export const RACINE = "/espace2";

export type Onglet = { libelle: string; href: string; exact?: boolean };

export const ONGLETS_ORGANISATION: Onglet[] = [
  { libelle: "Vue d'ensemble", href: RACINE, exact: true },
  { libelle: "À valider", href: `${RACINE}/validations` },
  { libelle: "Point du matin", href: `${RACINE}/point` },
  { libelle: "Activité", href: `${RACINE}/activite` },
  { libelle: "Réglages", href: `${RACINE}/reglages` },
];

export type ModuleV2 = {
  cle: string;
  nom: string;
  libelle: string;
  description: string;
  icone: LucideIcon;
  /* l'écran actuel, sous /espace */
  ancien: string;
  /* redessiné dans ce palier */
  pret: boolean;
  onglets: Onglet[];
};

const m = (cle: string, nom: string, libelle: string, description: string, icone: LucideIcon, onglets?: Onglet[], pret = false): ModuleV2 => ({
  cle,
  nom,
  libelle,
  description,
  icone,
  ancien: `/espace/${cle}?ancien=1`,
  pret,
  onglets: onglets ?? [{ libelle: "Vue d'ensemble", href: `${RACINE}/${cle}`, exact: true }],
});

export const MODULES: ModuleV2[] = [
  m(
    "filed",
    "FILED",
    "Documents reçus",
    "Factures lues, contrôlées et mises à payer",
    FileText,
    [
      { libelle: "Documents reçus", href: `${RACINE}/filed`, exact: true },
      { libelle: "Boîte de réception", href: `${RACINE}/filed/boite` },
      { libelle: "À payer", href: `${RACINE}/filed/a-payer` },
      { libelle: "Fournisseurs", href: `${RACINE}/filed/fournisseurs` },
      { libelle: "Comptabilité", href: `${RACINE}/filed/comptabilite` },
    ],
    true,
  ),
  m("reput", "REPUT", "Demandes clients", "Demandes reçues et réponses préparées", MessageSquareText),
  m("varelo", "VARELO", "Référentiel du groupe", "Sociétés, lots et objets du groupe", Building),
  m("tavaro", "TAVARO", "Location", "Contrats, retours et barèmes", CarFront),
  m("lorani", "LORANI", "Permis", "Demandes de permis et délais d'instruction", Stamp),
  m("tiroma", "TIROMA", "Cabinet dentaire", "Créneaux, fauteuils et liste d'attente", Smile),
  m("tamila", "TAMILA", "Dossiers du cabinet", "Dossiers chiffrés et pièces", FolderLock),
  m("daliro", "DALIRO", "Chantiers", "Chantiers, envois et accords", HardHat),
];

/* les modules annoncés, sans écran encore : une place dans la navigation, sans lien */
export const MODULES_A_VENIR: { cle: string; nom: string; libelle: string; icone: LucideIcon }[] = [
  { cle: "cashd", nom: "CASHD", libelle: "Relances d'impayés", icone: HandCoins },
  { cle: "offload", nom: "OFFLOAD", libelle: "Clients qui décrochent", icone: UserMinus },
];

export const moduleDe = (cle: string | undefined) => MODULES.find((x) => x.cle === cle);

/* la portée de la route : l'organisation, ou un module */
export function porteeDe(chemin: string): ModuleV2 | null {
  const seg = chemin.slice(RACINE.length).split("/").filter(Boolean)[0];
  return moduleDe(seg) ?? null;
}

/* le titre de la page, au centre de la barre du haut */
export function titreDe(chemin: string): string {
  const portee = porteeDe(chemin);
  /* un module sans sous-pages porte son nom ; avec, le nom de la sous-page */
  const onglets = portee ? (portee.onglets.length > 1 ? portee.onglets : []) : ONGLETS_ORGANISATION;
  return onglets.find((o) => o.href === chemin)?.libelle ?? portee?.libelle ?? "Espace client";
}
