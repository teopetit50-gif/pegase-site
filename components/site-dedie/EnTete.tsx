import { MARQUE_SITE } from "@/components/espace2/portail";
import BarreDaliro from "./entetes/Daliro";
import BarreLorani from "./entetes/Lorani";
import BarreTamila from "./entetes/Tamila";
import BarreTavaro from "./entetes/Tavaro";
import BarreTiroma from "./entetes/Tiroma";
import BarreVarelo from "./entetes/Varelo";

/* ══════════════════════════════════════════════════════════════════════
   L'en-tête d'un site dédié à un logiciel (10/11/2026)

   Teo : « Daliro est un SaaS à part entière. Rien à voir avec Omega » ;
   puis : « pour la barre du haut tu dois aller récupérer la barre du haut
   du site modèle de base, car on a copié le design, et ça doit pas
   renvoyer vers une page quand on clique dessus mais vers la section
   correspondante ». Sur un déploiement portant NEXT_PUBLIC_PORTAIL,
   app/layout.tsx rend ici la barre du logiciel (entetes/<Logiciel>.tsx,
   chacune portée de l'en-tête de son site source) à la place de
   components/Header.tsx. Toutes partagent `viewTransitionName:
   "site-header"` : la barre est épinglée pendant les transitions de page
   (globals.css, ::view-transition-*(site-header)).
   ══════════════════════════════════════════════════════════════════════ */
const BARRES = {
  daliro: BarreDaliro,
  lorani: BarreLorani,
  tamila: BarreTamila,
  tavaro: BarreTavaro,
  tiroma: BarreTiroma,
  varelo: BarreVarelo,
} as const;

export default function EnTete() {
  if (!MARQUE_SITE) return null;
  const Barre = BARRES[MARQUE_SITE.cle];
  return <Barre />;
}
