# TAMILA — les pages de référence (30/10/2026)

Contrat : `docs/refonte-metiers/tamila.md` (B, G, L, E). Découpage : `DECOUPAGES.md` § TAMILA.
Une référence par sous-page, jamais deux fois dans Tamila. Toutes avaient déjà un relevé au
`getComputedStyle` (29/10, dossier `releves/`) et un gabarit décalqué dans `components/espace2/lin/` :
aucune page nouvelle n'a été ouverte sur linear.app ou app.plain.com, donc aucune connexion, aucune
donnée touchée. Une référence reprise d'un autre métier est permise (consigne du 30/10).

| Sous-page | Route | Référence (URL exacte) | Relevé | Gabarit | Ce qui a été remplacé |
|---|---|---|---|---|---|
| Vue d'ensemble | `/espace2/tamila` (`?filtre=`, `?vue=echeances`) | Linear, My issues — https://linear.app/omegaaii/my-issues/assigned | `releves/linear-my-issues.md` | `lin/linear-my-issues.css` (lmi-) | B1 (« + » et menu « … »), B2-B6 (ligne d'avis sous les onglets), B9 (les cinq compteurs → onglets avec leur nombre), B10 (lignes groupées par rang, même tri) ; nouvel onglet Échéances : délais, audiences, expertises, relances réunis (§ 8.3-7, E11-E14) |
| Arrivées | `/espace2/tamila/arrivees` (`?avis=`) | Linear, Triage — https://linear.app/omegaaii/team/OME/triage | `releves/linear-triage.md` | `lin/linear-triage.css` (ltr-) | B7, B8, G7, G8 : la carte « Avis RPVA à rattacher » devient la liste du Triage et l'avis ouvert à droite ; les deux fenêtres gardées |
| Dossier | `/espace2/tamila/dossiers/[id]` (`?onglet=`, `?partie=`) | Linear, page d'une Initiative — https://linear.app/omegaaii/initiative/residence-les-tilleuls-c37131c236b4/overview | `releves/linear-initiative.md` | `lin/linear-initiative.css` (lit-) | B11-B39 : la pile de 14 cartes devient quatre onglets (Procédure, Pièces, Honoraires, Conformité) et une partie à la fois ; B18 dans le volet ; conflits avant les parties, lectures après les pièces (§ 8.4-3, 8.4-5) |
| Honoraires du cabinet | `/espace2/tamila/honoraires` (`?filtre=`) | Plain, Tenants — https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/tenants/ | `releves/plain-tenants.md` | `lin/FicheClient.tsx` ListeClients, `lin/plain-clients.css` (pc-) | B12, L5-L7 : la fenêtre devient une page ; filtres dans le menu Filtres, export dans le bouton plein, totaux sous le tableau ; recherche ajoutée (brique de la référence) |
| Pilotage | `/espace2/tamila/pilotage` (`?vue=`) | Plain, Insights › Reporting — https://app.plain.com (Insights, relevé du 28/10, `scratchpad/plain-rapports/releve-plain.md`) | relevé en tête de `lin/plain-rapports.css` | `lin/Rapports.tsx`, `lin/plain-rapports.css` (rap-) | B13, L8 : la fenêtre devient une page ; cinq cartes à grand chiffre puis une section par vue ; coût de revient dans « Actions » |
| Conformité du cabinet | `/espace2/tamila/conformite` (`?vue=`, `?tache=`) | Plain, Tasks — https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/tasks/ | `releves/plain-tasks.md` | `lin/plain-tasks.css` (pta-) | Vues nouvelles demandées par le découpage : conflits sans décision et vigilance (E7), temps proposé (E4), journaux des accès ; les gestes restent dans le dossier, le panneau y mène |
| Réglages | `/espace2/tamila/reglages` | Linear, Settings › Team — https://linear.app/omegaaii/settings/teams/OME | `releves/linear-team-settings.md` | `lin/linear-team-settings.css` (lts-) | B3/G1, B14/G3-G4, B15, G57 (clé d'index, sortie de la carte Conflits), G56 (en-tête des factures, sorti de l'aperçu d'une facture) ; confirmation ajoutée à G1 et G57 |

## Ce qui n'a pas bougé

- Portes (`components/espace/tamila/portes.ts`) : aucune ligne modifiée, aucune migration.
- L'écran d'avant sous `/espace2/tamila?ancien=1` (le fournisseur du layout s'y tait).
- La bascule Exemple / Réel : `useSource`, mêmes jeux d'exemple.
- Les cartes du dossier sont celles de `DossierTamila` (même code, mêmes fenêtres), montées par onglet grâce à
  la nouvelle prop `cartes` ; sans elle, l'écran d'avant est identique.

## Écarts assumés

- **Le trousseau** vit dans `components/espace2/tamila/donnees.tsx`, posé par `app/espace2/tamila/layout.tsx` :
  changer de sous-page ne redéballe rien. Seule la page d'un dossier l'ouvre (consultation, journal, clé).
- **Journal des accès du cabinet** : la porte `tamila_journal_acces` ne lit qu'un dossier et trace sa propre
  lecture ; la page Conformité liste les dossiers et mène à chaque journal plutôt que de tous les ouvrir.
- **Conflits du cabinet** : une lecture `tamila_conformite` par dossier vivant (porte `stable`, sans trace).
- **Temps proposé** : calculé sur les délais et audiences du cabinet ; les avis RPVA d'un dossier n'y entrent
  qu'en exemple (le cabinet ne lit pas leur type). Le dossier, onglet Honoraires, reste la liste complète.
- **Fenêtres** : les formulaires gardent le `Dialog` de l'écran d'avant (comme Lorani et Daliro).

## Reste à faire

- Dessiner pour de bon les cartes du dossier dans les briques de l'Initiative (aujourd'hui : cartes d'avant
  habillées, une partie à la fois), comme le note le deuxième passage de Daliro.
- Recette visuelle locale aux cinq largeurs : non faite sur ce poste (disque à 759 Mo libres), faite sur
  l'aperçu Vercel de la branche.
