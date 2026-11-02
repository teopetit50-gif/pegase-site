# LORANI — sous-pages et pages de référence (en cours, 02/11/2026, reprise dans le cloud)

| Sous-page | Route | Référence | Relevé | État |
|---|---|---|---|---|
| Vue d'ensemble | `/espace2/lorani` | Linear, Projects (liste) | `linear-projects.md` | écrite (`VueEnsemble.tsx`, `lor-projets.css`) ; superposée à 13 lignes en sombre, clair et 390 (`comparaisons/lorani/vue-*`) |
| Permis | `/espace2/lorani/permis/[id]` | Linear, page d'un ticket | `linear-ticket.md` | écrite (`PagePermis.tsx`, `lor-ticket.css`) ; superposée en sombre, clair, 1024 et 390 (`comparaisons/lorani/permis-*`) ; écarts ci-dessous |
| Projet | `/espace2/lorani/projets/[id]` | Linear, page d'une Initiative | `linear-initiative.md` | écrite (`PageProjet.tsx`, `lor-initiative.css`) ; superposée en sombre, clair et 390 (`comparaisons/lorani/projet-*`) ; écarts ci-dessous |
| Courrier à ranger | `/espace2/lorani/courrier` | Linear, Inbox | `linear-inbox.md` | écrite (`Courrier.tsx`, `lor-inbox.css`) ; superposée en sombre, clair et 390 (`comparaisons/lorani/courrier-*`) ; écarts ci-dessous |
| Réglages | `/espace2/lorani/reglages` | Linear, Settings › Team | `linear-team-settings.md` | refaite aux jetons et icônes de Linear (`Reglages.tsx`, `lor-reglages.css`) ; superposée en sombre, clair et 390 (`comparaisons/lorani/reglages-*`) |
| Honoraires et temps | `/espace2/lorani/honoraires` | Attio, People + fiche | `attio-people.md` (après import, 02/11) | écrite (`Honoraires.tsx`, `lor-attio.css`) ; liste et fiche superposées en sombre et clair, liste à 390 (`comparaisons/lorani/honoraires-*`) ; écarts ci-dessous |

## Fichiers communs (préfixe lor-, propres à Lorani)

- `components/espace2/lorani/lor.css` : jetons Linear sombre ET clair (règle 3 du 01/11 ; remplace pour Lorani les couleurs « dashboard » de `lin/lin.css`), boutons ronds, pastille de vue, menu de Linear (Add filter).
- `lor-sprite.ts` (346 symboles → sous-ensemble utilisé, tels quels), `lor-icones.tsx` (icônes en ligne recopiées du DOM de Linear : santé, priorité, statut hexagone, calendrier, jalon, courbe, boutons d'en-tête, flèche de tri).

## Méthode de superposition utilisée

Le cadre de l'espace 2 (barre 48, rail, sous-menu ; `main` à x 304) n'est pas celui de Linear : on compare la carte. Fenêtre émulée **1491 × 932** (dans le cloud : 1492 × 904, `outils/lor-capture.mjs`, sans tuiles : l'échelle 1 est native) pour que `main` fasse 1187 de large comme la carte de Linear ; quatre tuiles 800×500 à l'échelle 1 (transform sur `<html>`, origines (304,48) (691,48) (304,403) (691,403)), recollées en 1187×855 et comparées à `1440-reel-*.png` découpée en (245,9,1187,855). Écart assumé : le cadre de l'espace 2 (commun, hors périmètre).

## Linear, page d'un ticket — mesures prises en direct le 02/11 (sombre)

- En-tête 44 (p 0 12 0 8, filet 0.5) ; fil : a (r 6, p 2 4, m −2 −4) → h2 13/500 t2, « OME-19 » inline-flex m-right 5.6 ; étoile et « … » 28 ; à droite boutons texte 28 (p 0 10 0 8, icône 14 m-right 6, 12/500 t2) gap 6.
- Barre d'outils absolue top 43.5, 44 de haut, p 8 12 8 0 : ronds 28 pleins gap 6 (lien, ID, branche) + bouton double 56.5 (r 9999 0 0 9999 / 0 9999 9999 0, séparateur 0.5×20 m 4 0).
- Corps : grille `1fr minmax(0,80ch) minmax(0, clamp(280px, 26.087cqw + 66.087px, 400px)) 1fr`, column-gap `clamp(16px, 8.696cqw - 55.304px, 56px)` (667.5 + 375.7 à 1187).
- Colonne : p-top 21.75, p-left 14 ; titre m 32 0 8, p 6 0, 24/600/32 ls −0.16 ; description m-bottom 10 (p 10 14 16, m 0 −14), 15/450/24 ls −0.1 ; réactions + trombone 28 (m 0 0 14 −6).
- Sous-tickets (m-left −6) : en-tête 32 (p 0 8 4 0, m-bottom 4) : bouton repli 24 (p 0 12 0 6, triangle 14 m-right 3, « Sub-issues » 12/500 t3) gap 8, jauge 14 + « 0/5 » 12/450 gap 6 ; à droite ronds pleins 28 (affichage, +) gap 6. Lignes 36, grille `[indent] 0 [checkbox] 22 [status] 16 [title] 1fr [end-padding] 6`, gap 8 ; case opacity 0 ; statut 14 ; titre 13/500 t1, gap 8 ; avatar « non assigné » 18 m-right 3.
- Filet 0.5 lch(18.48 1.48 272), m 16 0 18. « Activity » h3 15/600/23 t1 ; « Unsubscribe » 32 (p 0 12, 12/500 t3) ; abonnés 32.
- Événement : m-top 16 ; ligne r 8 p 5 0 ; avatar 14 dans pastille 36×18 (p 2 11, fond carte) ; texte 12/450/16.8 t3 ; « · » 600.
- Carte commentaire : m 0 −8, p-bottom 18 ; bg lch(9.232 0.85 272), bd 0.5 lch(16.793 1.93 272), r 8, ombre lch(0 0 0/.3) 0 .5px 1px 1px ; tête p 16 gap 6 : avatar 18 gap 9, auteur 13/500 t1, date 13/450 lch(63.304 1.425 272) gap 8 ; boutons au survol 28 ; corps 15/450/24 ls −0.1 lch(90.826 1.425 272) ; pied : filet 0.5, form p 11 16, avatar 18 m 3 9 0 0.
- Formulaire « Leave a comment » : r 8 p 12 16, mêmes fond et bord.
- Propriétés : p-top 21.75 + 51 ; sections p 0 0 10 4, m-bottom 20 ; h3 13/500 t3 p 0 8 ; liste p 8 2 2, gap 4 ; pilule 28 (r 9999, p 0 10 0 6, gap 6, icône 16 ou 14, 13/500 t2 ; vide = t3).
- SVG des boutons (étoile, …, Accept, Decline, Duplicate, ClockOutline, lien, ID, branche, prompt, chevron, réaction, trombone, triangle, +) : relevés dans le DOM le 02/11 ; à reprendre de `linear-commun` ou du relevé quand ils y sont.

## Outils de la reprise dans le cloud (02/11)

- `outils/lor-capture.mjs` : capture Playwright (chromium headless, échelle 1, `colorScheme` sombre ou clair). Fenêtre **1492 × 904** : la carte de l'espace 2 (x 304, y 48) a alors la taille de celle de Linear (1188 × 856 à x 244, y 8).
- `outils/lor-superpose.py` : découpe les deux cartes au même cadre, écrit `<nom>-cote.png` (référence | nôtre) et `<nom>-diff.png` (différence ×3), compte les pixels en écart.
- `outils/lor-mesure.mjs` : rectangles et styles calculés d'une sous-page, depuis le coin de la carte, pour se lire contre le relevé.
- `outils/lor-icones-linear.py` + `.json` → `components/espace2/lorani/lor-icones-linear.ts` : les icônes absentes des relevés (Accept, Decline, Copy issue ID, branche, Copy as prompt, chevron, triangle, réaction, flèche d'envoi, statuts d'un ticket), recopiées du bundle public de Linear (static.linear.app) en suivant les import/export depuis le module de la page (`IssueDetailsPaneSidebar`).
- `outils/lor-sprite.py` : ajoute des symboles du sprite à `lor-sprite.ts` (ClockOutline, Starred).

## Permis → Linear, page d'un ticket (OME-19)

Données : le permis d'exemple « PCMI Maison Lemoine » (5 étapes au calendrier comme les 5 sous-tickets d'OME-19, 3 dates lues à confirmer comme les 3 commentaires).
Mesures relues au DOM (`lor-mesure.mjs`) contre le relevé : titre à x 62 / y 97.75 de la carte, colonne 668 + propriétés 376 à x 764, gap 48, sous-tickets à x 56 en lignes de 36, filet à 16/18, carte de commentaire à x 54 (m 0 −8), « Properties » à y 116.8 → toutes au demi-pixel du relevé.
Comparaisons : `permis-1440-sombre-*`, `permis-1440-clair-*`, `permis-390-sombre-*`, `permis-390-clair-*` (cote + diff). Les pixels en écart viennent du contenu (titre, description et étapes plus longs, dates dans les lignes, plus d'événements), pas de la géométrie : zones superposées une à une (en-tête, colonne, sous-tickets, activité, carte de commentaire) au pixel près.

Correspondances : Sub-issues → étapes du calendrier (statut : fait/passé = Done, à venir = Todo, en cours/en retard = In Progress, à confirmer = Triage, en attente = Backlog) ; Accept/Decline → la première chose qui attend un membre (décision implicite : Confirmer / Saisir la décision ; date lue : Confirmer / Écarter) ; Snooze → échéances et rappels ; « … » → Régime, saisies, projet, dépôt de courrier, écran d'avant ; barre d'outils → copier le lien, le numéro, la référence du projet, « Saisir ce qui est arrivé » et son menu ; commentaires → décision implicite et dates lues (pied « Leave a reply… » = Confirmer, Decline = Écarter) ; « Leave a comment… » → déposer un courrier ; Properties → état, urgence, chef de projet, quatre dates ; Labels → régime ; Project → projet ; deux sections du même dessin : Échéances, Recours.

Écarts restants, avec leur raison :
- Pas d'étoile (Add to favorites) dans l'en-tête : l'espace 2 n'a pas de favoris, un bouton sans effet serait un faux geste.
- Pas de « Mark as duplicate » : un permis n'a pas de doublon.
- Lignes de sous-tickets : une date à droite (la date de l'étape) à la place de l'avatar d'assigné ; « Unsubscribe » devient « Rappels au chef de projet » (à qui partent les rappels) : gestes et données du métier.
- Deux sections de propriétés de plus (Échéances, Recours) : blocs B15 et B16 de l'inventaire, sans place dans la référence.
- Les fenêtres de saisie (F7-F13) sont celles de l'espace 2 (Dialog commun), pas celles de Linear, qui n'en a pas l'équivalent.

## Projet → Linear, page d'une Initiative (Résidence Les Tilleuls)

Données : le projet d'exemple « Surélévation Dubois » (contrôles, pièces, PLU, permis).
Mesures relues au DOM contre le relevé : onglets à y 52 (8 sous la ligne 1 et non 12 : position mesurée des onglets), défilement à y 88 (p 0 48), colonne 805 centrée, tuile 36 à y 152, titre m-top 12, rangées Properties / Resources (libellé sur 81, pilules 28), carte « Latest update » débordant de 16, Description, section Projects 963 centrée et tableau 1001 (m-left −28) aux colonnes de Linear ; volet ⌘ I de 400 (cartes 388 à x 792, rangées 36, libellé sur 90, segments 28, lignes de 42).
Comparaisons : `projet-1440-sombre-*`, `projet-1440-clair-*`, `projet-390-sombre-*`, `projet-390-clair-*`. Les pixels en écart viennent du contenu (résumé plus long, carte « Dernier point » d'une ligne, description plus courte : la section Permis remonte).

Correspondances : fil « Initiatives › Résidence » → « Permis › projet » (icône de la nature) ; « … » → nouveau permis, courrier, dossier daté, nouveau projet, honoraires, écran d'avant ; copier le lien ; « + » → permis, courrier, membre, lot, intervenant (F2-F6) ; onglets Overview · Activity · Projects → Vue d'ensemble · Activité · Permis, puis les vues du dossier (Équipe, Urbanisme, Contrôle, Consultation, Chantier, Réception, Assurances : les parties de ProjetCarte en liste, titre 18/500 de la section Projects, lignes de Linear, détail dans le volet) et Honoraires ; Properties → nature (santé du permis le plus pressé), phase, chef de projet, prochaine date, « … » (marché, territoire, ouverture, réception) ; Resources → règlement de la zone du PLU, dossier daté, « + » courrier ; Latest update → dernier compte rendu, sinon le point de Lorani sur le permis le plus pressé (« Update » → Compte rendu, bulle → points en suspens) ; Description → nature, marché, territoire, zone du PLU, pièces exigées ; Projects → les permis du projet groupés par santé (À confirmer, Pièces à fournir…), colonnes Santé, Urgence, Chef, Prochaine date, Avancement ; volet ⌘ I → Propriétés, Avancement (Santé | État | Chefs), Activité.

Écarts restants, avec leur raison :
- Pas d'étoile ni de cloche (Notifications) dans l'en-tête, pas de « Add new view » : l'espace 2 n'a ni favoris, ni abonnement par projet, ni vues personnelles.
- Onglet « Permis » en liste et non en Timeline : la frise d'un projet n'a que ses permis (une à trois barres) ; la liste est celle que Linear montre à 390.
- Les vues du dossier (Équipe…Assurances) gardent les briques de liste de `components/espace2/lin` (My issues de Linear, partagées) recolorées aux jetons de Linear par un pont de variables (`lor-in-pont`) ; elles n'ont pas d'équivalent dans la page d'une Initiative, qui n'a qu'une section Projects.
- Pas de bouton « réaction » dans la carte « Latest update » ; « Update » ouvre la vue Chantier (le compte rendu se rédige là, F29).
- Le composeur de l'onglet Activité dépose un courrier (F3) : Lorani n'a pas de commentaires sur un projet.

## Courrier à ranger → Linear, Inbox

Données : les deux éléments à traiter de l'exemple (une date lue, une décision implicite) et, avec le bouton d'archives (`?traites=1`), les dates lues déjà confirmées ou écartées en lignes « lues » (comme les 6 notifications lues de la capture).
Mesures relues au DOM : liste de 400 et filet droit ; en-tête 44 (titre à x 18) ; lignes de 55 à y 52, fond de survol en retrait de 8 ; avatar 32 à x 16 ; textes à x 60 ; pastille non lue à y 67-75 (capture : 68-75) ; ligne 1 de 17, ligne 2 de 16 ; état vide : illustration de Linear (EmptyInboxIcon, 105 × 100) et compte, centrés sur la hauteur.
Comparaisons : `courrier-1440-sombre-*`, `courrier-1440-clair-*`, `courrier-390-sombre-*`, `courrier-390-clair-*`. Les pixels en écart viennent du nombre de lignes (2 à traiter + 5 traitées contre 5 + 6) et de leurs textes.

Correspondances : notification non lue → courrier à traiter (date lue à confirmer : statut Triage ; à ranger : Backlog ; lecture à vérifier : In Progress ; illisible : Canceled) ; « You asked to be reminded… » → ce qu'il faut faire ; priorité → urgence de la prochaine date du permis ; heure → âge de la lecture ; avatar rappel → icône du sprite selon la nature de la date (dépôt, délai, demande de pièces, décision, affichage, courrier) sur le même fond violet ; archives → courriers traités ; Filter → À confirmer / À ranger / Tous ; Display → afficher les traités ; « … » → déposer un courrier sur un projet ; ticket ouvert à droite → le courrier ouvert (titre, pilules, lecture et citations), Accept / Decline → Confirmer / Écarter (F7, F8), décision implicite : Confirmer (F9) / Saisir la décision (page du permis).

Écarts restants, avec leur raison :
- Le courrier ouvert n'a pas la barre d'outils (copier le lien, l'identifiant, la branche) ni la colonne d'activité du ticket : un courrier n'a pas de page propre, ses liens mènent au permis et au projet (pilules).
- Pas de « Snooze » ni d'archivage d'une notification : un courrier se traite (confirmer, écarter) ou se saisit à la main, il ne se met pas de côté.

## Réglages → Linear, Settings › Team (Omega)

La page existait déjà sur Settings › Team (29/10) mais avec les couleurs « dashboard » de `lin/lin.css` et des icônes Lucide. Reprise le 02/11 : feuille propre `lor-reglages.css` (préfixe lor-rg-), jetons de Linear (`lor.css` + cartes, anneaux, cases et textes seconds relevés en sombre et clair), icônes du sprite de Linear (Members, Brick, Users, Page, Gears, Judge, Euro, Signature, Stopwatch, Calendar, Shield, Project), chevrons de Linear.
Mesures relues au DOM, égales au relevé : lien retour à x 9, y 11 ; colonne 640 à x 274 ; titre à y 65 ; première carte à y 157 ; h3 « Permis » à y 400 ; rangées de 65. À 390 : colonne à 22, rangées p 16 10.67, texte sur plusieurs lignes, 24 entre sections (capture `390-clair`).
Comparaisons : `reglages-1440-sombre-*`, `reglages-1440-clair-*`, `reglages-390-sombre-*`, `reglages-390-clair-*`. Écarts : le contenu (sections Permis, Contrôle, Honoraires, Chantier, Assurances à la place d'Issues / Workflow / AI / Team hierarchy).

Écarts restants, avec leur raison :
- Pas de « Danger zone » (Leave / Retire / Delete) ni de rangée verrouillée « Available on Business » : aucun geste de ce genre sur un projet ; supprimer un projet n'existe pas dans Lorani.
- La barre latérale des réglages de Linear n'a pas d'équivalent : c'est le cadre de l'espace 2 (rail et sous-menu communs).
- L'équipe, les lots et les intervenants mènent à la vue « Équipe » de la page du projet (`?partie=equipe`).

## Honoraires et temps → Attio, liste People et fiche d'un contact

Données : le projet « Maison Lemoine » (6 éléments de mission, temps saisis) ; fiche de l'élément « Dossier de permis ».
Les captures d'Attio sont prises barre latérale repliée (zone de 1440 × 900 à x 0) : la superposition se fait avec une fenêtre de 1744 × 948 (carte de l'espace 2 de 1440 × 900 à x 304, y 48).
Mesures du relevé reprises : en-tête 49 ; barre de vue 48 (boutons de 28 à x 12) ; barre de tri 49 ; grille en-têtes 40, lignes 36, colonnes 250 · 215 · 288 · 310 · 250, case 16 r 6, pastille de lien r 10 avec avatar 16 ; pied 36 ; fiche : panneau gauche 432, nom 18/600/24, détails en lignes de 32 (libellé 12/500 a.63), cartes « Highlights » 3 × 2 de 86, listes cerclées à lignes de 31 ; jetons d'Attio sombre et clair (#101112 / #fff, filets #1b1c1f / #eeeff1, second a.60 / a.63, discret a.45 / a.50, bleu #266df0).
Comparaisons : `honoraires-liste-1440-{sombre,clair}-*`, `honoraires-fiche-1440-{sombre,clair}-*`, `honoraires-liste-390-{sombre,clair}-*` (la référence à 390 est rendue au double, ramenée à 390 × 844). À 390, comme Attio, pas de mise en page mobile : la grille garde ses colonnes et défile.

Correspondances : People → éléments de mission du projet ; vue « Recently Contacted People ⌄ » → le projet (menu des projets et de leurs honoraires) ; View settings → Affichage (colonne Taux réalisé) ; Import / Export → Ajouter ⌄ (un élément de mission, F22) ; New Person → Saisir du temps (F23) ; Sorted by → trié par phase ; Filter → état des éléments ; Connection strength → Temps passé (pastille : à venir gris, en cours ou achevé bleu, à surveiller orange, dépassé rouge, facturé vert, les couleurs d'Attio) ; colonnes Honoraires HT, État, Taux réalisé ; « count » → nombre d'éléments et totaux. Fiche : Compose email / Add to list → Saisir du temps / Marquer achevé ou facturé (G44, G45, confirmation) / Ouvrir le projet ; Record Details → Détails ; Lists → Projet ; Highlights → En bref (temps, consommation, honoraires, taux, état, facturation) ; Activity → temps saisis ; Notes → Temps ; Tasks → Appel d'honoraires (coche → Marquer facturé).

Écarts restants, avec leur raison :
- Les icônes d'Attio ne sont ni dans le relevé ni dans son code chargé sans compte (app.attio.com/web-assets) : celles de la page sont tracées au trait de 1.25 aux mêmes tailles (16, 12) ; à remplacer par les tracés d'Attio dès qu'un relevé d'icônes existe.
- Pas d'onglets Emails, Calls, Company, Files ni de colonne « + Add column » / « + Add calculation » : un élément de mission n'a ni courriels, ni appels, ni pièces ; les colonnes et les totaux sont fixés.
- Pas de « Share », « Ask Attio », ni d'étoile et de crayon sur la fiche : sans équivalent dans Lorani ; l'en-tête porte un lien vers le projet.
- L'avis « 80 % des heures prévues » / « dépassé » (B27) est à droite de la barre de tri : sans place dans la référence.

## Vue d'ensemble → Linear, Projects (liste « All projects »), fin de la superposition (02/11, cloud)

Treize lignes comme la capture de référence : sept projets d'agence en phase d'études, sans permis encore, ajoutés aux données d'exemple (`components/espace/lorani/exemples.ts` : Extension Rolland, Local commercial Part-Dieu, Groupe scolaire Jean-Moulin, Villa Bellevue, Immeuble Les Alizés, Rénovation école Bois-Joli, Hangar Morne-Rouge) ; ils s'affichent comme le prévoyait déjà la page (B5 : lignes à 0 %, « Sans permis · phase »). Ils apparaissent aussi dans l'écran d'avant (`?ancien=1`), dans « Projets sans permis ».
Comparaisons : `vue-1440-sombre-*`, `vue-1440-clair-*`, `vue-390-sombre-*`, `vue-390-clair-*` : lignes, colonnes, en-têtes et icônes superposés ligne à ligne ; écarts de contenu seulement (noms, jalons, santé « Sans permis » au lieu de « No updates », pas de courbe sur les lignes à 0 %).

## Boutons de la référence et leur utilité (02/11/2026, décision de Teo : « trouve une utilité aux boutons »)

Chaque bouton de Linear ou d'Attio est dessiné et fait une chose réelle ; aucun bouton mort. Ordre de préférence : un geste qui existe déjà (portes inchangées, aucune migration), sinon le navigateur (`components/espace2/lorani/lor-local.ts` : `espace2:favoris:lorani`, `espace2:suivis:lorani`, `espace2:reportes:lorani` ; export CSV ; presse-papier). Un geste qui écrit en base ou retire quelque chose passe par une confirmation. Les cases cochées ouvrent la barre d'actions groupées commune (`lor-selection.tsx`).

| Page | Bouton de la référence | Ce qu'il fait | Par quoi |
|---|---|---|---|
| Vue d'ensemble | cases à cocher (clic ou « x ») | sélection ; barre : Épingler, Désépingler, Suivre, Reporter (demain, trois jours, lundi), Exporter en CSV | navigateur |
| Vue d'ensemble | (étoile des pages) | section « Épinglés » en tête de la liste | navigateur (`favoris`) |
| Vue d'ensemble | Display options | tri, permis clos, reportés affichés ou masqués, « Exporter la liste affichée (CSV) » | navigateur |
| Vue d'ensemble | Add view (calques) · Filter · Open sidebar · New project | filtre par famille · menu des familles · volet de répartition · F1 | existants |
| Permis | étoile « Add to favorites » | Épingler le permis en tête de la vue d'ensemble | navigateur |
| Permis | Mark as duplicate | Dupliquer : ouvre la fenêtre d'un nouveau permis sur le même projet (F2, `?nouveau=permis`) | porte existante (ouvrirPermis) |
| Permis | Snooze | Reporter : le permis quitte la vue d'ensemble jusqu'à la date choisie (demain, trois jours, lundi, un mois, date) | navigateur (`reportes`) |
| Permis | Unsubscribe / Subscribe (Activité) | Suivre : ses courriers passent en tête du Courrier, marqués « suivi » | navigateur (`suivis`) |
| Permis | Copy as prompt · Choose coding tool | Copier pour l'assistant (le permis en clair : état, dates, calendrier, à confirmer) · menu : copier, saisies F10/F11 | presse-papier · portes existantes |
| Permis | Accept / Decline · Copy URL · Copy ID · Copy branch · « … » · réaction · trombone · Leave a comment | Confirmer / Écarter (F7-F10) · lien · numéro · référence du projet · options · ouvrir le Courrier · déposer un courrier · déposer un courrier | existants |
| Projet | étoile | Épingler le projet en tête de la vue d'ensemble | navigateur |
| Projet | cloche « Notifications » | Suivre le projet : ses courriers en tête du Courrier | navigateur |
| Projet | Add new view (calques) | Nouvelle vue : les permis d'une santé dans la vue d'ensemble (`?famille=`) | adresse |
| Projet | cases du tableau Projects | sélection ; barre : Épingler, Suivre, Reporter, Exporter en CSV | navigateur |
| Projet | réaction (Latest update) | Copier le dernier point | presse-papier |
| Projet | Copy page URL · « + » · « … » · « + » d'un groupe · Display options · ⌘ I | lien · F2-F6 · options · F2 · grouper par santé · volet de détails | existants |
| Courrier | Snooze (courrier ouvert) | Reporter le courrier : il quitte la liste jusqu'à sa date ; « n reportés : les afficher » | navigateur |
| Courrier | cloche (courrier ouvert) | Suivre le permis ou le projet du courrier | navigateur |
| Courrier | Open archive · Filter · Display · « … » | courriers traités · À confirmer / À ranger / Tous · traités · déposer sur un projet | existants |
| Réglages | Danger zone (Leave / Retire / Delete) | Exporter le dossier daté · Oublier les épingles, suivis et reports du projet (confirmation, la base n'est pas touchée) · Ouvrir l'écran d'avant | dossierDate · navigateur · adresse |
| Honoraires | cases d'Attio | sélection (et « tout sélectionner ») ; barre : Épingler, Exporter en CSV, Marquer achevé (confirmation, changerHonoraire) | navigateur · porte existante |
| Honoraires | Import / Export | « Ajouter / Exporter » : un élément (F22) ; la liste affichée en CSV | porte existante · navigateur |
| Honoraires | + Add column | réaffiche la colonne « Taux réalisé » (masquable dans Affichage) | navigateur |
| Honoraires | + Add calculation | somme, moyenne ou décompte de la colonne sur les lignes affichées (clic pour changer) | calcul dans le navigateur |
| Honoraires | étoile de la fiche | Épingler l'élément en tête de la grille | navigateur |

Restent sans équivalent, dits ici : le crayon de la fiche d'Attio (aucune porte ne modifie l'intitulé ni le montant d'un élément : un crayon qui ne ferait que copier tromperait) ; les rangées verrouillées « Available on Business » de Settings › Team (offre commerciale de Linear, sans objet). Épingles, suivis et reports sont propres au navigateur (ni partagés entre appareils ni entre membres) : c'est écrit dans le titre de chaque bouton.

## Second chantier : promesses du site comblées dans les pages existantes (PAGES-MANQUANTES.md, 02/11)

- **Courrier à ranger, « Courriels du guichet »** (b5_11 ; E10 sans dossier reconnu, E11 sans pièce jointe) : groupe sous la liste, lu par la porte existante de la boîte de réception (`components/espace/filed/receptions.ts` : `chargerBoite("toutes")`, filtré sur `module = lorani`) ; ouvert à droite (expéditeur, date, corps, pièces) ; gestes : Déposer sur un projet (F3 sur le projet choisi, le courriel passe « lu » par `marquerReception`), Écarter (confirmation, `marquerReception(…, "ecartee")`). Deux courriels fictifs dans l'exemple.
- **Courrier à ranger, situations lues à ranger** (b5_14, E18) : une pièce `lorani_situation_travaux` « à vérifier » est libellée « Situation de travaux à ranger » et mène au chantier du projet (« Situation reçue », F25).
- **Projet, onglet Activité, vue « Registre daté »** (`?vue=registre`) : les lignes de `lignesDossier` (dossier-date.ts) par mois, avec rubrique, lot, état, décideur et pièce ; « Exporter le dossier daté » (registre PDF et Excel). Promesses « Registre daté des visas », « Dossier de défense décennale ».
- **Projet, Chantier, « Bordereau des visas »** : PDF VSO · VAO · refus · à viser, par lot et par date, fabriqué dans le navigateur (`bordereau-visas.ts`, outil Mise / ecrirePdf des rapports).
- **Projet, Chantier, révision BT** (b5_34) : la formule de chaque marché est affichée quand elle est saisie (index, mois zéro, partie fixe) ; sinon « aucune formule de révision saisie ».

Manques, faute de porte (portes inchangées, aucune migration) :
- **Révision BT complète** : la lecture des situations (`chargerDossier`) ne prend pas leur colonne `revision` (In, I0, coefficient, montant révisé), rien ne lit `lorani_ref_index`, et aucune porte n'écrit la formule d'un marché (`poserMarche` ne la prend pas). Il faut ajouter `revision` à la lecture des situations et une porte « formule de révision du marché ».
- **Situations lues non rangées sans statut « à vérifier »** : la lecture des situations ne charge pas `piece_id` ; une situation lue mais restée au statut « lue » ne se distingue pas d'une situation rangée. Il faut `piece_id` dans la lecture.
