import { Compass, MapPin, Users, Workflow, type LucideIcon } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   Un pictogramme par format d'audit, par ID de formule (lib/reservation.ts)
   — les trois de l'équipe (cadrage / process / atelier) et les trois de
   l'indépendant (diagnostic / complet / site), pour que les composants
   tiennent quel que soit le profil affiché.

   Le fichier existe pour que <FormulesGrille> (serveur) et
   <ComparerFormats> (client) partagent la table sans que le second tire
   le premier — et tout ce qu'il importe — dans le paquet du navigateur.
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
