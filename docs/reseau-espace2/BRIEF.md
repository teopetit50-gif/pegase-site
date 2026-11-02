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

*Mis à jour le 02/11/2026 par la session d'intégration
(branche `reseau-espace2/integration`).*

| Page | Branche d'origine | État |
|---|---|---|
| Socle (navigation, titres, palette, `source.ts`, `membres.ts`) | `claude/brave-turing-1vhu5x` | Fusionné. |
| **Fil** | `claude/brave-turing-1vhu5x` | Fusionné. Schéma visé : `schema-fil.sql` (non appliqué). |
| **Membres** | `claude/exciting-darwin-65rwta` | Fusionné. Schéma visé : `schema-membres.sql` (non appliqué). |
| **Messages** | `claude/sharp-hopper-hnyhb6` | Fusionné. Schéma visé : `schema-messages.sql` (non appliqué). |
| **Opportunités** | `claude/beautiful-gates-h31nkp` | Fusionné. Schéma visé : `schema-opportunites.sql` (non appliqué). |

### L'intégration

- **Fusion.** Partie de `main` 6ee8ee7, quatre merges normaux dans l'ordre
  Fil → Membres → Messages → Opportunités. Un seul conflit, celui qui était
  attendu : `source.ts`, ajouté par chaque branche. La version de la
  branche Fil est gardée (`reseauEnExemple` et `RESEAU_VIDE`). Les trois
  bouchons TEMPORAIRE avaient la même signature. `membres.ts` est
  identique partout (blob 18a9854e).
- **Contrôles.** `npx tsc --noEmit` passe. `npx eslint` passe sur
  `app/espace2/reseau`, `components/espace2/reseau`, `Coquille.tsx`,
  `modules.ts` et `Palette.tsx`, avec un seul avertissement, déjà présent
  sur `main` (`LogoClient` inutilisé dans `Coquille.tsx`). `npm run build`
  passe.
- **Recette** (`node outils/recette-reseau.mjs <base> [captures] [reelle]`).
  Six adresses : Fil, Membres, fiche `atelier-moko`, Messages, Messages
  `?a=atelier-moko`, Opportunités. Chacune à 390, 768, 1024, 1440 et
  1700 px, en sombre et en clair, sur un `next start`. Sans session,
  Espace 2 montre l'exemple. Résultat : **60 / 60** sans erreur de
  console, sans débordement horizontal, l'entrée Réseau allumée (dans le
  tiroir sous 768 px), et l'exemple signalé une seule fois, par le ruban
  de la barre du haut.
  - La **base réelle** n'existe que pour un compte connecté
    (`SourceFournisseur connecte`). Elle a donc été recettée sur un
    `next dev` où `connecte` était forcé à vrai par un correctif local,
    jamais commité, à 1440 et 390, en sombre et en clair : **24 / 24**.
    Les six adresses montrent l'état vide commun, sans ruban et sans
    aucun des 12 membres. Les seules erreurs de console relevées sont des
    401 de la coquille (tables validations et FILED lues sans jeton). Le
    Réseau ne lit aucune table.
- **Raccords faits.**
  - Un seul état vide, `reseau-vide.tsx` : titre et texte de
    `RESEAU_VIDE`, une phrase propre à la page, le même bouton « Voir les
    données d'exemple ». La fiche garde en plus « Retour à l'annuaire ».
    Avant, il y avait quatre textes, trois tailles d'icône et trois
    boutons différents.
  - L'en-tête d'Opportunités reprend celui de Membres : surtitre « Réseau
    Omega », titre 22/29, même chapeau.
- **Vérifié sans rien changer.**
  - « Vous » est `useOrganisation()` sur les quatre pages. CAMA n'est
    écrit en dur nulle part, sauf dans des commentaires.
  - « Écrire » sur une fiche mène à `/espace2/reseau/messages?a=<slug>`,
    y compris pour un membre sans conversation (`nauti-sable` ouvre une
    conversation neuve).
  - Mènent à la fiche du membre : les auteurs du Fil et de ses réponses,
    l'en-tête, « Voir la fiche », les auteurs et les mentions des
    Messages, les membres des cartes d'Opportunités.
  - Les quatre CSS sont étanches. Chaque sélecteur porte son préfixe
    (`rf-`, `rm-`, `ms-`, `op-`), aucun autre fichier n'en définit, et
    aucune règle ne vise une classe `v2-` hors de son préfixe. `ms-` ne
    recoupe aucune utilitaire Tailwind (`ms-1`…).
- **Captures** : `captures/`, 23 vues légères (960 px de large) — chaque
  adresse à 1440 en sombre et en clair et à 390 en sombre, plus l'état
  vide en base réelle à 1440. Les vues en base réelle viennent du
  `next dev` : la pastille « N » en bas à gauche est l'indicateur de
  développement de Next, absent en production.

### Ce qui jure encore

- Le Fil et les Messages n'ont pas d'en-tête visible : le fil de Circle
  et Slack n'en ont pas, et c'est leur composition. Membres et
  Opportunités en ont un, désormais le même.
- L'état vide du Fil tient dans la colonne du fil (moins large, décalé à
  gauche). Celui des Messages est centré dans une page étroite. Même
  contenu, mais pas la même largeur.
- Opportunités occupe toute la largeur (kanban). Membres reste dans la
  page de 1248 px.
- Dans la liste des Messages, le nom d'un interlocuteur ouvre la
  conversation, pas la fiche. La fiche est à un clic, depuis l'en-tête de
  la conversation.

### Défaut trouvé hors du réseau (déjà sur `main`)

Sous 768 px, refermer le tiroir de navigation efface `data-v2-theme` de
`<html>` : en sombre, toute page d'Espace 2 repasse en clair jusqu'au
rechargement (vu aussi sur `/espace2/contacts`). La cause : la copie de
`BarreLaterale` montée dans le tiroir appelle `useTheme()`
(`components/espace2/theme.ts`), dont le nettoyage retire le thème au
démontage. Non corrigé ici, puisque ce n'est pas un raccord du réseau.

### Avant une mise en production (décision de Teo)

- Relire la prévisualisation Vercel de la PR, en particulier en sombre à
  390.
- Décider du défaut de thème du tiroir ci-dessus (il touche tout Espace
  2).
- Le réseau n'a encore aucune table. En production, un client connecté en
  « Base réelle » voit l'état vide, un visiteur sans compte voit l'exemple
  (ruban « Données d'exemple »). Appliquer les `schema-*.sql` est une
  décision séparée, qui demande l'accord de Teo.
- Les gestes restent en état local : publier, répondre, « Je peux aider »,
  envoyer un message, accepter une opportunité. « Je peux aider » pourrait
  maintenant ouvrir une conversation dans Messages (pas fait : ce n'est pas
  un raccord demandé).
