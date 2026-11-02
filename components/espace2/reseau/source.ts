/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega — la règle commune « exemple ou réel » (02/11/2026)

   Les quatre pages du réseau (Fil, Membres, Messages, Opportunités) lisent
   la source d'Espace 2 (useSource(), components/espace/source.tsx : la
   bascule « Données d'exemple / Base réelle » du menu de l'organisation)
   et la passent ici :

     · en EXEMPLE, elles montrent les 12 membres fictifs (membres.ts) et
       leur contenu de démonstration ;
     · en BASE RÉELLE, un état vide honnête. Le réseau n'a encore aucune
       table : rien de fictif ne doit passer pour un vrai membre.

   Le jour où les tables existent (docs/reseau-espace2/schema-*.sql), la
   base réelle lira ces tables ; la règle restera ici, au même nom.
   ══════════════════════════════════════════════════════════════════════ */

/** Vrai quand la page du réseau doit montrer ses données de démonstration. */
export function reseauEnExemple(source: string): boolean {
  /* une source inconnue vaut la base réelle : dans le doute, rien de fictif */
  return source === "exemple";
}

/** Le texte de l'état vide en base réelle, le même sur les quatre pages. */
export const RESEAU_VIDE = {
  titre: "Le réseau ouvre bientôt",
  texte: "Le Réseau Omega mettra en relation les entreprises clientes d'Omega, en Guadeloupe et en Martinique. Aucune entreprise n'y est encore inscrite : rien n'est partagé tant que vous n'avez pas donné votre accord.",
} as const;
