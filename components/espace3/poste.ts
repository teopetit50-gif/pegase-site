"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le poste affiché dans /espace3 (30/10/2026)

   Deux postes, choisis dans la barre du haut à la place du module : le CEO
   du groupe et la direction marketing. Le choix est gardé dans ce
   navigateur. Une page propre à un poste (les campagnes, la trésorerie…)
   impose son poste : on y arrive toujours avec la bonne navigation.
   ══════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import { Building2, Coins, Crown, Database, FileWarning, Home, Megaphone, PenLine, Shield, Sparkles, Star, Target, Users, Waypoints } from "lucide-react";

export const RACINE = "/espace3";

export type Poste = "ceo" | "marketing";

export const POSTES: Record<Poste, { nom: string; libelle: string; personne: string; icone: typeof Crown }> = {
  ceo: { nom: "CEO", libelle: "Président du groupe", personne: "Le Président", icone: Crown },
  marketing: { nom: "MARKETING", libelle: "Direction marketing du groupe", personne: "Mme Rosan", icone: Megaphone },
};

const CLE = "espace3.poste";
const abonnes = new Set<() => void>();

const lire = (): Poste => {
  try {
    return localStorage.getItem(CLE) === "marketing" ? "marketing" : "ceo";
  } catch {
    return "ceo";
  }
};

export function ecrirePoste(p: Poste) {
  try {
    localStorage.setItem(CLE, p);
  } catch {
    /* navigation privée : le choix vaut pour la visite */
  }
  memoire = p;
  abonnes.forEach((f) => f());
}

let memoire: Poste | null = null;

const abonner = (f: () => void) => {
  abonnes.add(f);
  return () => abonnes.delete(f);
};

export function usePosteChoisi(): Poste {
  return useSyncExternalStore(abonner, () => memoire ?? (memoire = lire()), () => "ceo");
}

/* la navigation de chaque poste : des sections (une icône dans le rail), chacune ses pages */
export type Page = { libelle: string; href: string; exact?: boolean; compteur?: number };
export type Section = { cle: string; titre: string; icone: typeof Crown; groupes: { titre: string; pages: Page[] }[] };

export const NAVIGATION: Record<Poste, Section[]> = {
  ceo: [
    {
      cle: "accueil",
      titre: "Accueil",
      icone: Home,
      groupes: [
        {
          titre: "Le groupe",
          pages: [
            { libelle: "Le groupe ce matin", href: RACINE, exact: true },
            { libelle: "Le groupe sur une page", href: `${RACINE}/groupe` },
            { libelle: "Décisions à prendre", href: `${RACINE}/decisions`, compteur: 3 },
          ],
        },
      ],
    },
    {
      cle: "argent",
      titre: "Argent",
      icone: Coins,
      groupes: [{ titre: "Argent du groupe", pages: [{ libelle: "Trésorerie et encours", href: `${RACINE}/argent` }] }],
    },
    {
      cle: "echeances",
      titre: "Échéances",
      icone: FileWarning,
      groupes: [{ titre: "Échéances et risques", pages: [{ libelle: "Contrats, baux, reportings", href: `${RACINE}/echeances` }] }],
    },
    {
      cle: "directions",
      titre: "Directions",
      icone: Building2,
      groupes: [{ titre: "Les directions", pages: [{ libelle: "Qui suit quoi", href: `${RACINE}/directions` }] }],
    },
    {
      cle: "ia",
      titre: "Données et IA",
      icone: Database,
      groupes: [
        {
          titre: "Le coffre du groupe",
          pages: [
            { libelle: "Demander au groupe", href: `${RACINE}/demander` },
            { libelle: "Sources et référentiel", href: `${RACINE}/coffre` },
          ],
        },
        {
          titre: "Pilotage de l'IA",
          pages: [
            { libelle: "Consommation et coûts", href: `${RACINE}/consommation` },
            { libelle: "Gouvernance et journal", href: `${RACINE}/gouvernance` },
          ],
        },
      ],
    },
    {
      cle: "systemes",
      titre: "Omega dans le groupe",
      icone: Waypoints,
      groupes: [{ titre: "Omega dans le groupe", pages: [{ libelle: "Systèmes par société", href: `${RACINE}/systemes` }] }],
    },
  ],
  marketing: [
    {
      cle: "accueil",
      titre: "Accueil",
      icone: Home,
      groupes: [
        {
          titre: "Le marketing",
          pages: [
            { libelle: "Le marketing ce matin", href: RACINE, exact: true },
            { libelle: "Décisions à prendre", href: `${RACINE}/decisions`, compteur: 3 },
          ],
        },
      ],
    },
    {
      cle: "campagnes",
      titre: "Campagnes",
      icone: Target,
      groupes: [{ titre: "Campagnes", pages: [{ libelle: "Toutes les campagnes", href: `${RACINE}/campagnes` }] }],
    },
    {
      cle: "clients",
      titre: "Clients",
      icone: Users,
      groupes: [{ titre: "Clients du groupe", pages: [{ libelle: "Base unifiée et segments", href: `${RACINE}/clients` }] }],
    },
    {
      cle: "reputation",
      titre: "Avis et demandes",
      icone: Star,
      groupes: [{ titre: "Avis et demandes", pages: [{ libelle: "Par enseigne", href: `${RACINE}/avis` }] }],
    },
    {
      cle: "contenus",
      titre: "Contenus",
      icone: PenLine,
      groupes: [{ titre: "Contenus", pages: [{ libelle: "À valider et programmés", href: `${RACINE}/contenus`, compteur: 4 }] }],
    },
    {
      cle: "ia",
      titre: "IA du marketing",
      icone: Sparkles,
      groupes: [
        {
          titre: "IA du marketing",
          pages: [
            { libelle: "Demander au groupe", href: `${RACINE}/demander` },
            { libelle: "Consommation et coûts", href: `${RACINE}/consommation` },
          ],
        },
      ],
    },
  ],
};

export const REGLAGES: Section = {
  cle: "reglages",
  titre: "Accès",
  icone: Shield,
  groupes: [{ titre: "Accès", pages: [{ libelle: "Équipe et périmètres", href: `${RACINE}/equipe` }] }],
};

/* les pages qui n'existent que pour un poste */
const PROPRES: Record<string, Poste> = {
  groupe: "ceo",
  argent: "ceo",
  echeances: "ceo",
  directions: "ceo",
  coffre: "ceo",
  gouvernance: "ceo",
  systemes: "ceo",
  societe: "ceo",
  campagnes: "marketing",
  clients: "marketing",
  avis: "marketing",
  contenus: "marketing",
};

export function posteImpose(chemin: string): Poste | null {
  const seg = chemin.replace(RACINE, "").split("/")[1] ?? "";
  return PROPRES[seg] ?? null;
}

export const TITRES: Record<string, string> = {
  "": "Accueil",
  groupe: "Le groupe sur une page",
  decisions: "Décisions à prendre",
  argent: "Trésorerie et encours",
  echeances: "Échéances et risques",
  directions: "Les directions",
  demander: "Demander au groupe",
  coffre: "Le coffre du groupe",
  consommation: "Consommation et coûts de l'IA",
  gouvernance: "Gouvernance et journal",
  systemes: "Omega dans le groupe",
  equipe: "Équipe et périmètres",
  campagnes: "Campagnes",
  clients: "Clients du groupe",
  avis: "Avis et demandes",
  contenus: "Contenus",
  societe: "Fiche société",
};

