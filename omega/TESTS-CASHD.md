# T-CASHD — tests en boîte noire du moteur CASHD (relances des impayés)

Brief posé par la session bureau de Teo, 21/10/2026. Contrat : `omega/CONTRAT-TESTEUR.md`.
Branche : `testeur-cashd`. Client banc : `banc-test-cashd` (créé par le coordinateur).

## Ce que tu lis

- Promesses : `lib/produits/capacites/relances.ts` (catalogue, cas limites, échelle) et
  `lib/produits/relances.ts` (la page). Les paliers (rappel, relance ferme, mise en demeure ;
  devis), ce qui suspend, ce qui coupe, « un message par compte et par jour », « rien ne part
  sans validation » : tout y est.
- Écran : `app/espace2/cashd` sur la recette (débiteurs, relances, envois, trésorerie).
- Banc de l'ouvrier, pour savoir comment les factures entrent : `omega/recette-c2/banc_cashd.sql`
  et, sur `worker-c2`, `omega/banc/cashd_*.sql` (fichiers de banc seulement).

**CASHD ne lit pas de PDF.** Il prend un **export du logiciel de facturation** (factures émises,
échéances, règlements), déposé par la porte d'import. Ton jeu d'essai est donc un fichier de
données (SQL ou export), pas des pièces.

Attention : l'ouvrier C2 fabrique de son côté, ce même jour, un jeu d'essai « façon NOBAT »
(1 juste + 5 fautives). Tu ne le lis pas et tu ne l'attends pas : tu fais le tien. Si vos deux
jeux trouvent des choses différentes, c'est justement l'intérêt.

## Le jeu d'essai de départ

Le client banc est un **négoce de matériaux BTP en Guadeloupe** qui facture des entreprises
**fictives** (TVA 8,5 % / 2,1 % / exonérée, octroi de mer, chantier nommé). Six à douze
factures sur le même gabarit ; seule l'erreur change.

| Cas | Erreur volontaire | Ce que le site promet (à vérifier dans `relances.ts`) |
|---|---|---|
| C0 | aucune — le témoin, échue depuis 8 jours | rappel palier 1 préparé, **à valider**, rien d'envoyé |
| C1 | numéro de facture en doublon avec C0 | signalé ; une seule créance, pas deux relances |
| C2 | total ≠ somme des lignes | signalé ; pas de relance sur un montant faux |
| C3 | échéance antérieure à la date d'émission | signalé ; palier calculé sur une base saine ou facture retenue |
| C4 | client sans adresse de relance | suspendue « pas d'adresse », visible à l'écran |
| C5 | règlement partiel reçu, non lettré | pas de relance tant que le règlement n'est pas lettré ; reste dû juste après lettrage |
| C6 | avoir qui vise une facture inconnue | retenu, signalé, jamais imputé au hasard |
| C7 | même règlement importé deux fois | un seul règlement, pas de « trop-perçu » fantôme |
| C8 | compte passé en litige **entre** deux paliers | la relance en attente passe `annulée`, aucune suivante |
| C9 | devis accepté puis facturé | relance de devis coupée, la facture suit son propre cycle |
| C10 | facture réglée mais toujours présente dans l'export suivant | coupée, aucune relance |
| C11 | reste dû sous le seuil réglé | suspendue, pas de relance pour 3 € |
| C12 | deux factures du même compte échues le même jour | **un** message, qui porte les deux |
| C13 | facture échue depuis 35 jours, jamais relancée avant | aucun palier sauté : rappel d'abord, puis ferme, cinq jours d'écart au moins |

Après la série : rejoue l'import **à l'identique**. Attendu : zéro doublon, zéro nouvelle relance.

Puis le passage du lendemain (le coordinateur te dit comment déclencher « le matin » sans
attendre 7 h Paris) : la relance ferme remplace le rappel encore en attente, « un message par
compte et par jour » tient, la mise en demeure exige un commentaire.

Deuxième série : les textes (ton, vocabulaire du bâtiment, moyens de règlement, échéancier
proposé), lus à l'écran sur chaque relance préparée : sont-ils ceux que la page promet ?

## Niveau 2 (plus tard)

Un premier export réel (logiciel de facturation d'un client pilote), avec le coordinateur.
Pas avant.

## Résultats

| Cas | Promesse (fichier:ligne) | Erreur volontaire | Attendu | Ce que CASHD a fait | Verdict | Niveau |
|---|---|---|---|---|---|---|
| | | | | | | |

## Écarts

(aucun encore — format : `TCASHD-01 · cas · reproduction exacte · réponse brute · écran`)

## Questions au coordinateur

- La porte d'import pour `banc-test-cashd` et le format exact qu'elle attend.
- Comment déclencher le passage du matin à la demande sur la recette.
- Un compte « gérant » du client banc pour l'écran.

## REPRISE

(à remplir à chaque arrêt : fait / en cours / prochain pas / questions / SHA)
