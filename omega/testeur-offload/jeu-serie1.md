# T-OFFLOAD — jeu d'essai, série 1 (préparé le 21/10/2026, pas encore joué)

Client banc : `banc-test-offload` (identifiant à recevoir du coordinateur). Recette `ygwbgpowzlbdaajlsqkn` seulement.
Tout est fictif : raisons sociales « … Fictif/Fictive … », courriels en `.example.invalid`, le seul
numéro (O9) est dans la plage ARCEP réservée à la fiction (`06 39 98 xx xx`). Mode `essai`.

Société cliente simulée : maintenance de climatisation en Guadeloupe. Douze comptes, même gabarit
(entretien 450 € HT le 14 ou le 20 de chaque mois depuis juillet 2025), seul le cas change.

## Fichiers

- `comptes.csv` : référentiel (compte, raison sociale, contact, courriel, SMS, accord du contact).
- `releve.csv` : historique d'achats (compte, date, référence, libellé, montant HT) — les trois
  colonnes que la FAQ demande (`lib/produits/reprise.ts:389`) plus référence et libellé.

## Pièces en plus du relevé (à déposer par les portes qu'on me donnera)

| Cas | Pièce | Valeur |
|---|---|---|
| O1 | litige CASHD | posé par le coordinateur sur O1 avant la détection |
| O4 | commande arrivée | réf. CMD-O4-01, compresseur, 1 240 € HT, arrivée le 11/10/2026, non retirée ; délai de retrait réglé à **7 jours** |
| O6 | relance passée | message OFFLOAD (ou relance tracée) le 11/09/2026, il y a 40 jours |
| O8 | geste | « exclure » puis « suivre » : 1) sans motif, 2) motif « Suivi direct par le commercial (fictif) » |
| O10 | contrat | CT-O10, entretien annuel, reconduction tacite, échéance 20/12/2026 (J+60) |
| O12 | personne | « Contact fictif O12 » : demande d'effacement après la détection |

## Événements joués pendant la série (après l'ouverture des reprises)

| Cas | Événement |
|---|---|
| O7 | ligne `O7,2026-10-22,F-9007,Entretien climatisation (fictif),450` déposée pendant que la reprise attend |
| O11 | ligne `O11,2026-10-22,F-9011,Remplacement unité (fictif),1000` déposée après l'ouverture |

## Ordre de jeu

1. Réglages : délai de silence (laisser celui par défaut, le noter), délai de retrait 7 j, mode essai.
2. Dépôt `comptes.csv`, `releve.csv`, pièces O4/O6/O10 ; litige O1 posé par le coordinateur.
3. Détection à la demande. Lecture par les portes de lecture + écran `espace2/offload`.
4. Événements O7, O11 ; gestes O8 ; effacement O12. Relecture.
5. **Rejeu à l'identique** de 2 et 3 : un signal par compte et par jour au plus, aucune seconde reprise.
