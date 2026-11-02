# LORANI — sous-pages et pages de référence (en cours, 02/11/2026, reprise dans le cloud)

| Sous-page | Route | Référence | Relevé | État |
|---|---|---|---|---|
| Vue d'ensemble | `/espace2/lorani` | Linear, Projects (liste) | `linear-projects.md` | écrite (`VueEnsemble.tsx`, `lor-projets.css`) ; superposition 1 faite en sombre : géométrie alignée (en-tête, colonnes, lignes) ; restent : capture avec 13 lignes, clair, 390 |
| Permis | `/espace2/lorani/permis/[id]` | Linear, page d'un ticket | `linear-ticket.md` | écrite (`PagePermis.tsx`, `lor-ticket.css`) ; superposée en sombre, clair, 1024 et 390 (`comparaisons/lorani/permis-*`) ; écarts ci-dessous |
| Projet | `/espace2/lorani/projets/[id]` | Linear, page d'une Initiative | `linear-initiative.md` | à faire |
| Courrier à ranger | `/espace2/lorani/courrier` | Linear, Inbox | `linear-inbox.md` | à faire |
| Réglages | `/espace2/lorani/reglages` | Linear, Settings › Team | `linear-team-settings.md` | à faire |
| Honoraires et temps | `/espace2/lorani/honoraires` | Attio, People + fiche | `attio-people.md` | en dernier (relevé Attio refait) |

## Fichiers communs (préfixe lor-, propres à Lorani)

- `components/espace2/lorani/lor.css` : jetons Linear sombre ET clair (règle 3 du 01/11 ; remplace pour Lorani les couleurs « dashboard » de `lin/lin.css`), boutons ronds, pastille de vue, menu de Linear (Add filter).
- `lor-sprite.ts` (346 symboles → sous-ensemble utilisé, tels quels), `lor-icones.tsx` (icônes en ligne recopiées du DOM de Linear : santé, priorité, statut hexagone, calendrier, jalon, courbe, boutons d'en-tête, flèche de tri).

## Méthode de superposition utilisée

Le cadre de l'espace 2 (barre 48, rail, sous-menu ; `main` à x 304) n'est pas celui de Linear : on compare la carte. Fenêtre émulée **1491 × 932** pour que `main` fasse 1187 de large comme la carte de Linear ; quatre tuiles 800×500 à l'échelle 1 (transform sur `<html>`, origines (304,48) (691,48) (304,403) (691,403)), recollées en 1187×855 et comparées à `1440-reel-*.png` découpée en (245,9,1187,855). Écart assumé : le cadre de l'espace 2 (commun, hors périmètre).

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
