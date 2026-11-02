# Refonte des pages métiers : les règles de Teo (01/11/2026)

À lire AVANT toute chose par chaque session qui touche à une sous-page métier de `/espace2`
(Daliro, Lorani, Tamila, Tavaro, Tiroma, Varelo). Elles priment sur tout autre document de ce dossier
(`DECOUPAGES.md` compris) et ne se négocient pas.

## Règle 1 — On recopie des pages qui existent, on n'invente rien

Chaque sous-page est la copie d'UNE page réelle d'un SaaS de la liste ci-dessous. Seul le contenu change
(les données et les gestes du métier). Aucun dessin inventé, aucune pile de cartes de l'ancien écran
« habillée » ou montée telle quelle : les anciennes cartes sont réécrites dans les briques de la page de
référence. Dans un même métier, deux sous-pages ne prennent pas la même référence.

SaaS autorisés : **Linear**, **Plain**, **Attio**, **Cal.com** (et Plane en dernier recours).
SaaS interdits : **Notion (Notion Calendar compris), Vercel, Pylon, Twenty**.

## Règle 2 — Remplir la page de référence AVANT de la copier

Une page de référence vide ou presque ne se relève pas. Avant tout relevé, la remplir abondamment de faux
contenu (inventé, peu importe lequel) dans le compte de Teo, jusqu'à ce que chaque élément de la page soit
visible : lignes nombreuses, plusieurs groupes, états variés (en cours, fini, en retard, urgent…), étiquettes,
personnes assignées, dates, commentaires, propriétés remplies, volet ouvert, menus, filtres actifs.
C'est seulement quand la page est bien remplie qu'on la relève et qu'on l'incorpore.

Garde-fous pendant le remplissage :
- uniquement des personnes, entreprises et adresses fictives, adresses courriel en `@example.com` ;
- ne jamais envoyer un message, un courriel, une diffusion ni une invitation à quelqu'un ;
- ne rien supprimer ni modifier de ce que Teo a lui-même créé ;
- noter dans le relevé ce qui a été créé (pour pouvoir le retrouver ou l'effacer plus tard) ;
- si une connexion est demandée : ne rien saisir, écrire « BLOCAGE CONNEXION : <site> » et prévenir.

## Règle 3 — Une copie 1:1, point par point, lettre par lettre

Pas de copie à 80 %. Tout est pareil : structure, ordre des éléments, grilles, largeurs, hauteurs de ligne,
espacements, polices, graisses, tailles, interlignage, couleurs (thème sombre et clair), bordures, rayons,
ombres, icônes (même dessin, même taille), états de survol, de focus, de sélection, barre du haut, filtres,
menus, volets, raccourcis clavier, animations, comportement aux différentes largeurs.

- Tout se lit au style calculé (`getComputedStyle`, skill `methode-site`), rien ne s'estime.
- La preuve se fait par comparaison : capture de la référence et capture de notre page à la même taille de
  fenêtre et avec un contenu de même longueur, côte à côte et en superposition. Chaque écart est corrigé ou
  écrit noir sur blanc avec sa raison (seul motif admis : un geste du métier qui n'existe pas dans la référence).
- On prend le temps qu'il faut. Une sous-page n'est finie que quand la comparaison ne montre plus d'écart.

## Les pages de référence validées (01/11/2026)

| Page | Lien | Sous-pages |
|---|---|---|
| Linear, accueil d'une équipe | https://linear.app/omegaaii/team/OME/overview | Daliro vue d'ensemble · Tavaro vue d'ensemble · Varelo Ce matin |
| Linear, Projects (liste et Timeline) | https://linear.app/omegaaii/projects/all | Daliro Chantiers (Timeline) · Lorani vue d'ensemble |
| Linear, page d'une Initiative | https://linear.app/omegaaii/initiative/residence-les-tilleuls-c37131c236b4/overview | Daliro fiche chantier · Lorani projet · Tamila dossier |
| Linear, liste des Initiatives | https://linear.app/omegaaii/initiatives | Tavaro Réseau et flotte · Varelo Groupe |
| Linear, page d'un ticket | https://linear.app/omegaaii/issue/OME-19 | Lorani permis · Tavaro contrat |
| Linear, Triage | https://linear.app/omegaaii/team/OME/triage | Daliro À ranger · Tamila Arrivées · Tavaro Amendes |
| Linear, My issues | https://linear.app/omegaaii/my-issues/assigned | Daliro À faire · Tamila vue d'ensemble · Tiroma Aujourd'hui |
| Linear, Inbox | https://linear.app/omegaaii/inbox | Lorani Courrier · Tavaro Retours à facturer |
| Linear, Board | https://linear.app/omegaaii/team/OME/all (vue Board) | Daliro Avenants · Tavaro Parc et atelier · Tiroma Plans et devis · Varelo Opérations |
| Linear, Settings › Labels et Templates | https://linear.app/omegaaii/settings/issue-labels | Daliro Réglages · Tavaro Réglages |
| Linear, Settings › Team | https://linear.app/omegaaii/settings/teams/OME | Lorani Réglages · Tamila Réglages · Tiroma Réglages |
| Linear, Settings › Integrations | https://linear.app/omegaaii/settings/integrations | Varelo Sources et structure |
| Plain, Tenants | https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/tenants/ | Tamila Honoraires · Varelo Contrats |
| Plain, Tasks | https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/tasks/ | Tamila Conformité · Tavaro Incidents |
| Plain, Insights | menu Insights de Plain | Tamila Pilotage · Tiroma Pilotage · Varelo Finance |
| Plain, Threads | menu Threads de Plain | Tiroma Créneaux et appels |
| Attio, liste People et fiche d'un contact | https://app.attio.com | Daliro Annuaire · Lorani Honoraires et temps · Varelo Référentiel |
| Cal.com, Availability | https://app.cal.com/availability | Daliro Équipes |
| Cal.com, Bookings | https://app.cal.com/bookings/upcoming | Tiroma Fauteuils |

## L'ordre de travail

1. Une seule session « références » remplit chaque page ci-dessus (règle 2), puis la relève en entier
   (règle 3) dans `releves/<saas>-<page>.md` avec ses captures (thème sombre et clair, 390 et 1440, volet et
   menus ouverts). Un relevé existant fait sur une page trop vide est refait.
2. Ensuite seulement, les sessions métiers construisent leurs sous-pages à partir de ces relevés et prouvent
   l'identité par comparaison de captures.
