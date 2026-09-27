import { Compass, MapPin, Users, Workflow, type LucideIcon } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   Un pictogramme par format d'audit, par ID de formule (lib/reservation.ts)
   — les trois de l'équipe (cadrage / process / atelier) et les trois de
   l'indépendant (diagnostic / complet / site), pour que les composants
   tiennent quel que soit le profil affiché.

   Le fichier existe pour que <FormulesGrille> et <TableauFormats> (le
   tableau des formats, 27/09) partagent la table sans s'importer l'un
   l'autre. Il est né le 15/09 pour que le comparatif d'alors, un
   composant CLIENT, ne tire pas <FormulesGrille> et tout ce qu'il
   importe dans le paquet du navigateur.
   ══════════════════════════════════════════════════════════════════════ */
export const ICONES_FORMAT: Record<string, LucideIcon> = {
  cadrage: Compass,
  process: Workflow,
  atelier: Users,
  diagnostic: Compass,
  complet: Workflow,
  site: MapPin,
};

export const ICONE_DEFAUT = Compass;
