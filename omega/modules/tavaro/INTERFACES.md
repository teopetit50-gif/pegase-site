# TAVARO — contrats d'interface avec les fournisseurs

Migration `b2_16_interfaces_tiers.sql` (et `b2_14_peages.sql` pour l'import des péages). Session B2, 11/10/2026.

Tavaro pose ici tout ce qui ne dépend pas du fournisseur :
- les tables ;
- les portes que le fournisseur appelle ;
- les travaux que l'ouvrier du fournisseur prend.

Le fournisseur reste à choisir (par Teo). Quand il est choisi, il reste un seul morceau à écrire : l'**ouvrier**, une fonction Edge sur le modèle de `tavaro-pdf`. Il traduit l'API du fournisseur vers ces portes, et ses webhooks vers ces portes.

Règles communes :
- **Les portes des fournisseurs sont au service seul.** Elles sont accordées à `service_role`, jamais à `authenticated`. L'ouvrier les appelle avec la clé de service, après avoir vérifié la signature du webhook du fournisseur. Aucun secret n'est en base.
- **Chaque message est idempotent.** Rejouer un webhook ne crée rien de plus et ne défait rien (un événement hors d'ordre est seulement noté).
- **Toutes les heures sont des `timestamptz` ISO 8601 avec fuseau.** Tous les montants sont en euros, en nombres décimaux.
- **Une erreur de forme lève le code `22023`.** L'ouvrier la journalise et ne la rejoue pas.

## 1. Assistance (module 04) — fournisseur de voix et dépanneurs

**Ce que l'agence règle** (dans l'écran) : la grille `loc_poser_grille_assistance(p_lignes)`.
- Réservée à la direction.
- Une ligne par type d'incident : `panne`, `accident`, `cle_perdue`, `crevaison`, `batterie`, `carburant`, `vol` ou `autre`.
- Pour chaque type, l'action :
  - `depanneuse` ;
  - `vehicule_remplacement` ;
  - `serrurier` ;
  - `conseil` ;
  - `transfert_humain`.
- Avec chaque action : le prestataire, son téléphone, le délai cible et les consignes.

**L'appel arrive.** L'ouvrier appelle `public.loc_assistance_ouvrir(p_client uuid, p_appel jsonb)` :

```json
{ "fournisseur": "nom-du-fournisseur", "fournisseur_reference": "id-de-l-appel",
  "canal": "telephone|sms|messagerie|web", "appelant_telephone": "+33612345678",
  "immatriculation": "GA-123-BC", "type_incident": "panne",
  "description": "…", "position": "A6, sortie 12" }
```

Ce que Tavaro fait :
1. Il retrouve le contrat ouvert par le numéro de l'appelant (les 9 derniers chiffres), sinon par la plaque à l'heure de l'appel.
2. Il applique la grille.
3. Il lève une alerte à l'agence (critique pour un accident ou un vol).

La réponse, que l'assistant lit pour la suite de l'appel :

```json
{ "incident": "uuid", "deja": false, "contrat": "C-2026-0001", "vehicule": "GA-123-BC",
  "action": "depanneuse", "prestataire": "…", "prestataire_telephone": "…",
  "delai_cible_min": 45, "consignes": "…", "transferer": false }
```

`transferer = true` (pas de grille, pas de contrat retrouvé, ou action `transfert_humain`) : l'assistant passe l'appel à une personne de l'agence.

**La suite.** L'ouvrier appelle `public.loc_assistance_evenement(p_incident uuid, p_evenement jsonb)` avec un `type` parmi :

| Type | Champs |
|---|---|
| `missionne` | `prestataire`, `arrivee_estimee_le` |
| `arrivee_estimee` | `arrivee_estimee_le` |
| `transcription` | `resume`, `transcription` (50 000 caractères au plus ; jamais copiée au journal) |
| `transfere` | `motif`, `resume` — alerte critique à l'agence |
| `clos` | `resume` |

L'agence clôt l'incident avec `loc_clore_incident(incident, note, ouvrir_sinistre)`. Elle peut ouvrir le dossier de sinistre depuis l'incident (b2_15).

**À choisir.** Un fournisseur de voix capable de :
- répondre 24 h/24 ;
- appeler un webhook à l'ouverture et lire la réponse en cours d'appel ;
- transférer l'appel.

Il faut aussi les dépanneurs du loueur, ou son contrat d'assistance constructeur.

## 2. Relevés constructeur (module 19) — agrégateur de données véhicule

**L'ouvrier pousse les relevés** : `public.loc_enregistrer_releves_constructeur(p_client uuid, p_source text, p_lignes jsonb)`.

```json
[{ "vin": "VF1…", "immatriculation": "GA-123-BC", "lu_le": "2026-10-05T11:20:00+02:00",
   "km": 12640, "carburant_pct": 62.5, "batterie_pct": null, "autonomie_km": 410, "reference": "id-agregateur" }]
```

- Le véhicule est retrouvé par le numéro de série (`vin`), sinon par la plaque.
- Les véhicules inconnus sont comptés, pas créés.
- C'est idempotent sur (véhicule, `lu_le`, source).
- Réponse : `{ "releves": n, "vehicules_inconnus": n }`.

**L'agence lit** `loc_releve_au_retour(contrat)` :
- le relevé le plus proche du retour, à deux heures près ;
- le carburant en huitièmes ;
- l'écart avec l'état des lieux de retour (`ecart_km`, `ecart_carburant_8`).

Sans relevé, le message dit pourquoi.

**À choisir.** Un agrégateur multi-marques qui :
- lit le kilométrage et la jauge ;
- couvre les marques de la flotte du premier loueur ;
- facture par véhicule connecté.

Il faut aussi le consentement du loueur, propriétaire des véhicules.

## 3. Caution — prestataire de paiement

**L'agence** :
- `loc_demander_preautorisation(contrat, montant?)` au départ (montant par défaut : le dépôt du contrat). Une seule caution en cours par contrat.
- `loc_capturer_caution(caution, facture, montant, motif)`, réservée à la direction ou à un valideur. La capture se fait sur une facture du contrat. Elle ne dépasse jamais ni la préautorisation ni la facture. Le motif est obligatoire.
- `loc_liberer_caution(caution)` libère la caution, ou ce qu'il en reste après une capture.

**Chaque action dépose un travail** `tavaro.caution` dans `public.travaux`. L'ouvrier du prestataire le prend.

```json
{ "caution": "uuid", "action": "preautoriser|capturer|liberer",
  "montant_eur": 500, "reference_externe": "pi_…" }
```

La clé du travail vaut `tavaro:caution:<caution>:<action>`, une seule par action.

**Le prestataire répond**, par l'ouvrier ou par son webhook : `public.loc_caution_evenement(p_caution uuid, p_evenement jsonb)`.

```json
{ "type": "preautorisee|capturee|liberee|expiree|echec", "prestataire": "…",
  "reference_externe": "pi_…", "expire_le": "…", "montant_eur": 250, "erreur": "…" }
```

| Statut avant | Événement | Statut après |
|---|---|---|
| demandee | preautorisee | preautorisee |
| capture_demandee | capturee | capturee (alerte : marquer la facture réglée) |
| liberation_demandee ou preautorisee | liberee | liberee |
| preautorisee, capture_demandee ou liberation_demandee | expiree | expiree (alerte) |
| demandee ou liberation_demandee | echec | echec (alerte) |
| capture_demandee | echec | preautorisee (alerte ; la préautorisation reste) |
| autre | tout | inchangé, événement noté « ignoré » |

**À choisir.** Un prestataire qui fait l'empreinte de carte avec capture différée et accepte des préautorisations de 7 jours ou plus. Une location plus longue demande une nouvelle préautorisation.

Il faut aussi le compte marchand du loueur. Le loueur encaisse, pas Omega.

## 4. Péages en flux libre (module 13) — compte flotte

Pas d'ouvrier obligatoire : l'agence importe l'export du compte flotte avec `loc_enregistrer_passages(p_lignes, 'import')`.

```json
[{ "operateur": "Sanef", "reference": "id-passage", "passe_le": "…", "immatriculation": "GA-123-BC",
   "montant_eur": 3.60, "portique": "A13 Boulay", "classe": "1", "payer_avant": "…" }]
```

- C'est idempotent sur (opérateur, référence).
- Le passage est rapproché du contrat par la plaque et l'heure.
- L'échéance de paiement est de 72 heures par défaut.

Un ouvrier pourra appeler la même porte quand l'opérateur ouvrira une API au compte flotte. Le paiement se fait chez l'opérateur : Tavaro garde la référence (`loc_payer_passage`) puis refacture (`loc_refacturer_peages`).
