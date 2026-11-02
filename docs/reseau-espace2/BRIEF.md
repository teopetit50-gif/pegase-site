# Réseau Omega dans Espace 2 — le brief commun

*Mis au propre le 02/11/2026 par la session « socle + Fil ». Ce brief vaut
pour les quatre pages ; chaque session tient à jour sa ligne de la section
« État ».*

## Le projet

Le **Réseau Omega** met en relation les entreprises clientes d'Omega
(agence d'automatisation pour PME, en Guadeloupe et en Martinique). Il ressemble au
chat de Bloomberg : un outil de travail réservé au réseau. C'est une rubrique
d'**Espace 2** (`/espace2`, servi sur omegaai.fr/espace2), avec quatre pages :

| Page | Adresse | Contenu | Composition de référence |
|---|---|---|---|
| **Fil** | `/espace2/reseau` | Demandes et alertes terrain | Fil public de Circle (`community.circle.so/feed`) |
| **Membres** | `/espace2/reseau/membres` (fiche : `/membres/<slug>`) | Annuaire vérifié. Des badges prouvés par les vraies données, montrés seulement avec l'accord du membre | pappers.be |
| **Messages** | `/espace2/reseau/messages` | Messages privés, salons par île et par secteur | slack.com |
| **Opportunités** | `/espace2/reseau/opportunites` | Mises en relation tirées des données, groupements de marchés publics, achats groupés | Attio |

Quatre sessions construisent chacune une page en parallèle, sur sa propre
branche. Une intégration vient ensuite.

## La règle d'harmonie (décision de Teo)

Une première version avait été faite par erreur dans `pegase-dashboard`.
Chaque page y recopiait sa référence 1:1, et les quatre styles collés côte à
côte juraient. **On harmonise** :

- chaque page reprend la **composition** de sa référence : disposition,
  hiérarchie, densité, comportements. On la relève dans un navigateur piloté,
  au style calculé, sans créer de compte ni se connecter ;
- elle s'habille **entièrement** avec le système d'Espace 2 :
  - les jetons `--v2-*` de `components/espace2/espace2.css` (couleurs
    Supabase, accent bleu, filets, rayons de 6 / 8 px, aucune ombre portée) ;
  - les classes et composants existants : `v2-btn`, `v2-carte`, `v2-champ`,
    `v2-badge`, `MenuDeroulant`, `Vide`…, dans `components/espace2/ui.tsx` ;
  - la police d'Espace 2 ;
- aucune couleur, police ni rayon ne vient de la référence ;
- le **mode sombre** d'Espace 2 (thème par défaut) marche sur chaque page.

## Règles communes

1. **« Vous », c'est toujours l'organisation connectée** : `useOrganisation()`
   (`components/espace2/organisation.ts`, posé par `Coquille.tsx`), « CAMA »
   en données d'exemple. Ce n'est jamais un des 12 membres.
2. **Exemple ou réel.** Les pages lisent la source d'Espace 2 par
   `useSource()` (`components/espace/source.tsx`), réglée par la bascule
   « Données d'exemple / Base réelle » du menu de l'organisation. Elles la
   passent ensuite à la règle commune :

   ```ts
   import { reseauEnExemple, RESEAU_VIDE } from "@/components/espace2/reseau/source";
   const { source } = useSource();
   if (!reseauEnExemple(source)) { /* état vide : RESEAU_VIDE.titre, RESEAU_VIDE.texte */ }
   ```

   - En **exemple**, on montre les 12 membres fictifs (`membres.ts`) et le
     contenu de démonstration.
   - En **réel**, on montre un état vide honnête (« Le réseau ouvre
     bientôt »), **jamais** les faux membres : le réseau n'a encore aucune
     table.
3. **Les données de démonstration ne sont marquées qu'une fois.** Le ruban
   « Données d'exemple » de la barre du haut (`RubanSource`, `Coquille.tsx`)
   s'en charge déjà. On n'ajoute pas de bandeau.
4. **`components/espace2/reseau/membres.ts`** est identique dans les quatre
   branches et ne se modifie pas dans une seule page.
5. **Aucune écriture en base, aucune migration appliquée.** Chaque page
   rédige son schéma visé dans `docs/reseau-espace2/schema-<page>.sql`.
6. **Pas de push sur `main`** (exception voulue par Teo à la règle de
   `CLAUDE.md`). On pousse sa branche et on ouvre une PR en brouillon. Les
   commits se font chemin par chemin, jamais avec `git add -A`, `git add .`
   ni `-a`.
7. On ne touche qu'à **ses** fichiers. La navigation (`Coquille.tsx`),
   les titres (`modules.ts`) et la palette (`Palette.tsx`) appartiennent à
   la session « socle + Fil ».
8. On lit `CLAUDE.md` et `AGENTS.md`. Next.js 16 a des changements cassants :
   la doc se trouve dans `node_modules/next/dist/docs/`.

## Le socle (posé par la session « socle + Fil »)

- **Navigation.** Une section « Réseau » dans le rail, avec l'icône
  `Network` et son propre groupe sous Travail et Fiches. Son volet porte le
  titre « Réseau · Entre clients Omega » et quatre pages : Fil, Membres,
  Messages, Opportunités. Toute adresse sous `/espace2/reseau` allume la
  section.
- **Titres.** `ONGLETS_RESEAU` est dans `components/espace2/modules.ts`.
  `titreDe()` donne le titre de l'onglet dans la barre du haut, sous-pages
  comprises : `/reseau/membres/<slug>` affiche « Membres ».
- **Palette (⌘K).** Une section « Réseau Omega » avec les quatre pages.
- **Règle exemple / réel.** `components/espace2/reseau/source.ts`, avec
  `reseauEnExemple(source: string): boolean` et le texte commun
  `RESEAU_VIDE`. Une source inconnue vaut la base réelle : dans le doute,
  on ne montre rien de fictif.

## État

| Page | Branche | État |
|---|---|---|
| Socle (navigation, titres, palette, `source.ts`, `membres.ts`) | `claude/brave-turing-1vhu5x` | Fait. Recette aux cinq largeurs, en clair et en sombre. |
| **Fil** | `claude/brave-turing-1vhu5x` | Fait : demandes avec réponses et « Je peux aider », alertes terrain épinglables, filtres par type, île et secteur gardés dans l'adresse, composeur en état local, côté « Le réseau » au-delà de 1040 px de colonne, état vide en base réelle. Schéma visé : `schema-fil.sql`. |
| Membres | (autre session) | En cours. |
| Messages | (autre session) | En cours. |
| Opportunités | (autre session) | En cours. |

### Ce qui reste pour l'intégration

- La fiche `/espace2/reseau/membres/<slug>`, vers laquelle mène l'auteur
  d'une publication du Fil, est construite par la session Membres. Avant la
  fusion, ce lien aboutit à une 404.
- Le Fil ne fait encore rien en base réelle : il attend les tables de
  `schema-fil.sql` et l'accord de Teo.
- « Je peux aider » prévient l'auteur seulement dans la page (un toast).
  Une fois Messages fusionné, ce geste pourra ouvrir une conversation.
