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
| **Fil** | `/espace2/reseau` | Demandes et alertes terrain | Pages publiques de Circle : le fil, un espace, une publication et ses commentaires |
| **Membres** | `/espace2/reseau/membres` (fiche : `/membres/<slug>`) | Annuaire vérifié. Des badges prouvés par les vraies données, montrés seulement avec l'accord du membre | pappers.be |
| **Messages** | `/espace2/reseau/messages` | Messages privés, salons par île et par secteur | Zulip (`chat.zulip.org`, vue publique ; `zulip.com/help`), à la place de slack.com depuis la reprise du 02/11 |
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
| **Fil** | `claude/brave-turing-1vhu5x` | Fusionné, puis **repris le 02/11 au soir** sur la branche (à réintégrer ; `origin/reseau-espace2/integration` d78fe64 fusionnée d'abord, `reseau-vide.tsx` gardé). Contenu relevé sur trois pages publiques de Circle, sans compte : le fil `https://community.circle.so/feed`, un espace `https://community.circle.so/c/product-updates` et une publication avec ses commentaires `https://community.circle.so/c/product-updates/october-2026-release`. Gardé, dans l'ordre de Circle : titre, auteur (nom, étiquettes de membre → badges vérifiés, date, ligne de présentation → secteur et commune), texte coupé avec « Voir plus », résumé des réactions → « X et Y peuvent aider », nombre de réponses, actions (Like → « Je peux aider », épingle sur les alertes), et la page d'une publication (`?pub=`) : « Retour au fil », texte entier, champ de réponse AVANT les réponses (« Post a comment »), puis chaque réponse avec son menu « … » (Voir la fiche, Écrire à → `/espace2/reseau/messages?a=<slug>`). Aucune autre référence nécessaire. Habillage : celui des moteurs, kit `components/espace2/lin/` et le fil d'activité de Linear déjà posé sur Activité (`linear-pulse.css`) : barre du titre de 44 avec « … » et Filtrer, pastilles de 28 Tout / Demandes / Alertes terrain et filtres posés, composeur, cartes de mise à jour avec le bloc des propriétés (Membre, Lieu ou Où, Quand, Badges), cartes de commentaire pour les réponses, panneau de droite de 400 (Propriétés, Îles, Le réseau, Arrivés en octobre ; pour une publication ouverte : Publication, Peuvent aider). tsc, eslint et build verts ; `recette-reseau.mjs` 60/60 ; `?pub=` aux cinq largeurs, sombre et clair, sans débordement ; base réelle vérifiée (état vide commun). Schéma visé : `schema-fil.sql` (non appliqué). |
| **Membres** | `claude/exciting-darwin-65rwta` | Fusionné, puis **repris le 02/11** (à refusionner). Contenu relevé sur les pages publiques de pappers.be : résultats `https://www.pappers.be/fr/search?q=menuiserie` (champs de la carte, filtres et « Ajouter un filtre » par familles, « Réinitialiser », état « Aucune entreprise trouvée… » avec « Supprimer tous les filtres » / « Annuler le dernier filtre ») et fiche `https://www.pappers.be/fr/company/menuiserie-brahy-0444482209` (en-tête et faits, puis Informations, Activité, Finances → badges, Prospecter dans ce secteur, Informations de contact ; « Accès restreint » → « Non montré par le membre »). Aucune autre référence nécessaire. Habillage : celui des moteurs, kit `components/espace2/lin/` (liste « Projects » de Linear comme Entreprises, page d'un projet comme les tableaux de bord FILED, CASHD, REPUT et OFFLOAD, panneau Détails pour « Ce que je montre au réseau »). tsc, eslint et build verts ; `recette-reseau.mjs` 60/60 ; base réelle vérifiée (état vide commun, aucun membre d'exemple). Schéma visé : `schema-membres.sql` (non appliqué). |
| **Messages** | `claude/sharp-hopper-hnyhb6` | Fusionné, puis **repris le 02/11 au soir** sur la branche (à réintégrer). Slack abandonné (Teo : « pas Slack »). Contenu relevé sur les pages publiques de Zulip, sans compte : la vue publique [chat.zulip.org](https://chat.zulip.org/) (« Recent conversations » : colonnes canal, conversation, participants, heure, filtres ; barre de gauche : vues, dossiers de canaux, sujets du canal ouvert, filtre) et un canal ouvert sur un sujet [chat.zulip.org/#narrow/channel/101-design](https://chat.zulip.org/#narrow/channel/101-design) (barre « canal › sujet », messages, composeur) ; pour ce que la vue publique cache, l'aide publique : [direct-messages](https://zulip.com/help/direct-messages), [recent-conversations](https://zulip.com/help/recent-conversations), [introduction-to-topics](https://zulip.com/help/introduction-to-topics), [emoji-reactions](https://zulip.com/help/emoji-reactions), [mention-a-user-or-group](https://zulip.com/help/mention-a-user-or-group), [status-and-availability](https://zulip.com/help/status-and-availability). Le modèle change : une conversation est un **sujet dans un salon** (`?salon=<id>&sujet=<id>`) ou un **message privé** (`?a=<slug>`), plus de fils de réponse ; vue d'arrivée « Conversations récentes » (`?vue=recentes`). Habillage : celui des moteurs, kit `components/espace2/lin/` : la boîte de REPUT › Base de connaissances et de CASHD › Débiteurs (`lin-boite`, liste à gauche, lignes de 55), la fiche ouverte au gabarit d'un ticket Linear (`lin-ticket` : titre 24/600, « Messages » à la place d'« Activité », `lin-ticket-composeur`, colonne de droite en pilules), jetons `--lin-*` en sombre et en clair. `ReseauVide` gardé en base réelle. Schéma visé revu : `schema-messages.sql` (table `reseau_sujets`, non appliqué). |
| **Opportunités** | `claude/beautiful-gates-h31nkp` | Fusionné, puis **repris le 02/11 au soir** sur la branche (à réintégrer). DA des moteurs : kit `components/espace2/lin/`, au plus près d'OFFLOAD › Affaires en plan (barre du titre de 44 px, boutons ronds à examiner / Filtrer / Affichage, onglets, colonnes de Linear, carte ouverte au milieu `CarteCentrale` en `?id=`) ; « Ce que le réseau vous a apporté » devient un onglet (`?vue=apports`). Contenu repris des pages publiques d'Attio : [kanban views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-kanban-views), [create and view records](https://attio.com/help/reference/managing-your-data/records/create-and-view-records), [configure record pages](https://attio.com/help/reference/managing-your-data/records/configure-record-pages), [standard objects, Deals](https://attio.com/help/reference/managing-your-data/objects/manage-standard-objects), [funnel report](https://attio.com/help/reference/managing-your-data/dashboard-and-reports/set-up-a-funnel-report), et le kanban de [attio.com](https://attio.com/). L'en-tête aligné sur Membres (surtitre, titre 22/29) est retiré : la page prend la barre du titre des moteurs. `ReseauVide` est gardé en base réelle. Schéma visé : `schema-opportunites.sql` (non appliqué). |

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
  - L'en-tête d'Opportunités reprenait celui de Membres (surtitre,
    titre 22/29). C'est caduc depuis la reprise du 02/11 au soir : la page
    prend la barre du titre des moteurs.
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

*Mis à jour le 02/11 au soir, après la réintégration des quatre
reprises : Opportunités (59835427), Membres (a4f27808), Messages
(bcb9e135) et Fil (94f944b4). Mis en ligne sur omegaai.fr le même soir,
avec l'accord de Teo.*

- Les quatre pages ont la DA des moteurs (kit `lin/`, barre du titre de
  44 px, panneau de droite) et s'appuient sur des pages publiques de leur
  référence : Circle (Fil), pappers.be (Membres), Zulip (Messages, à la
  place de Slack), Attio (Opportunités).
- Dans le Fil, « X peut aider » nomme des membres sans lien vers leur
  fiche ; les auteurs et le panneau de droite y mènent.
- Dans « Conversations récentes » (Messages), les participants ne mènent
  pas à la fiche ; une fois la conversation ouverte, l'interlocuteur y
  mène.

### Défaut trouvé hors du réseau (déjà sur `main`)

Sous 768 px, refermer le tiroir de navigation efface `data-v2-theme` de
`<html>` : en sombre, toute page d'Espace 2 repasse en clair jusqu'au
rechargement (vu aussi sur `/espace2/contacts`). La cause : la copie de
`BarreLaterale` montée dans le tiroir appelle `useTheme()`
(`components/espace2/theme.ts`), dont le nettoyage retire le thème au
démontage. Non corrigé ici, puisque ce n'est pas un raccord du réseau.

### Après la mise en ligne (02/11 au soir)

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
