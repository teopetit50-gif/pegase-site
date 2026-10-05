# CHAMPS-LECTURE — ce que le lecteur rend, module par module

Référentiel unique des noms de champs écrits par l'ouvrier LECTEUR dans
`pieces_valeurs.champ`, à lire par l'écran (A3) et par les moteurs métier
(A4 FILED, puis les autres). **Ces noms sont la seule forme valide** : pas de
`facture.numero`, pas de `totaux.ttc`, pas de `paiement.iban`. La source de
vérité est `omega/functions/lecteur/schemas/facture.ts`, relu contre
`private.filed_integrer_facture` et `private.filed_valeurs` le 05/10/2026.

Règle de forme d'un nom de champ : `^[a-z][a-z0-9_.]{1,79}$` (contrainte
`pieces_valeurs_champ_check`). Minuscules, point pour les sous-objets.

## Une valeur lue, telle qu'elle se présente

Chaque ligne de `pieces_valeurs` porte :

| Colonne | Sens |
|---|---|
| `champ` | le nom ci-dessous, exact |
| `valeur` | jsonb : nombre, texte, booléen ou tableau selon le type du champ |
| `texte` | la citation **exacte** du document d'où vient la valeur (ex. « Total TTC : 1 481,28 € ») ; absente pour un tableau |
| `page` | la page citée (1 = première) ; absente pour une valeur issue d'un XML |
| `boite` | `{x, y, l, h}` en fractions de la page, origine en haut à gauche ; exacte sur un PDF natif (position des mots), « estimée » par le modèle en lecture visuelle, absente sinon |
| `source` | `ia` (Claude), `xml` (Factur-X / UBL), `regle`, `tableur`, `humain` (saisie à l'écran) |
| `confiance` | 0 à 1, confiance déclarée par la source |
| `verifiee` | voir ci-dessous |
| `controle` | une phrase qui dit pourquoi la valeur est vérifiée ou non (« citation retrouvée page 1 », « citation introuvable page 2 », « clé SIREN invalide »…) |

### Ce que « verifiee » veut dire

`verifiee = true` seulement si **toutes** ces conditions tiennent :

1. la valeur entre dans le type attendu (une date est une date valide en `AAAA-MM-JJ`, un montant est un nombre, une mention un booléen) ;
2. la citation `texte` est **retrouvée mot pour mot dans le texte de la page citée** (comparaison sans accents, sans casse, tolérante aux espaces : « 1 481,28 » vaut « 1481,28 ») ;
3. les règles de forme du champ tiennent : clé Luhn du SIREN et du SIRET, clé du numéro de TVA français, forme de l'IBAN, code pays sur deux lettres, devise sur trois.

Pour une valeur `xml`, la citation est la balise elle-même : `verifiee` est vraie par construction, sauf identifiant à clé fausse. Pour les tableaux (`lignes`, `tva.ventilation`), `verifiee` est vraie si chaque libellé (ou chaque montant de TVA) se retrouve sur sa page.

Conséquences côté métier (FILED) : le fournisseur n'est **reconnu** que sur un SIREN / SIRET / numéro de TVA vérifié (ou saisi par une personne) ; `numero`, `date`, `montant_ht`, `montant_tva`, `montant_ttc` non vérifiés sont listés « à vérifier sur la pièce » et la pièce est en statut `a_verifier` plutôt que `lue`. L'écran doit donc montrer `verifiee`, `controle` et la citation, et proposer la correction humaine (`source = humain`, qui prime sur tout).

## Statuts de la pièce (`pieces.statut`) après lecture

| Statut | Quand |
|---|---|
| `lue` | type facture ou avoir, et les six champs clés (`numero`, `date`, `montant_ht`, `montant_tva`, `montant_ttc`, `fournisseur.nom`) vérifiés |
| `a_verifier` | au moins un champ clé manquant ou non vérifié ; `motif` les liste |
| `a_classer` | type `autre` ou confiance sur le type < 0,6 ; une personne tranche |
| `rejetee` | format de fichier non pris en charge (ou pièce refusée par une règle) |
| `echec` | illisible, vide, fichier absent du dépôt ; `motif` explique |

`pieces.type_piece` ∈ `facture`, `avoir`, `bon_commande`, `bon_livraison`, `devis`, `releve`, `contrat`, `attestation_assurance`, `autre`. `pieces.methode` ∈ `natif`, `ocr`, `mixte`, `xml`, `tableur` ; `pieces_pages.methode` ∈ `natif`, `ocr`, `ocr_manuscrit`, `vision`.

## Module FILED — facture et avoir (en service)

« Clé » = compte pour le statut `lue`. « Obligatoire » = sans lui FILED ne peut pas intégrer la facture ; les autres sont rendus quand le document les porte, jamais inventés.

### En-tête

| Champ | Type de `valeur` | Clé | Description | Exemple de `valeur` |
|---|---|---|---|---|
| `numero` | texte (≤ 60) | oui | numéro de la facture ou de l'avoir, tel qu'imprimé | `"F-2026-0417"` |
| `date` | texte `AAAA-MM-JJ` | oui | date d'émission | `"2026-03-12"` |
| `echeance` | texte `AAAA-MM-JJ` | | date d'échéance de paiement | `"2026-04-11"` |
| `devise` | texte ISO 4217 | | `EUR` si rien n'est dit | `"EUR"` |
| `montant_ht` | nombre | oui | total hors taxes du document | `1234.4` |
| `montant_tva` | nombre | oui | total de TVA | `246.88` |
| `montant_ttc` | nombre | oui | total toutes taxes comprises | `1481.28` |
| `net_a_payer` | nombre | | net à payer s'il diffère du TTC (acompte déduit, retenue) | `1481.28` |
| `montant_prepaye` | nombre | | acompte ou montant déjà réglé | `500` |
| `type_code` | texte (≤ 10) | | code UNTDID 1001 s'il est imprimé (380 facture, 381 avoir) | `"380"` |
| `cadre_facturation` | texte (≤ 10) | | cadre de facturation (B1, S1…) s'il est imprimé | `"B1"` |

Sur un **avoir**, les montants sont rendus avec le signe du document (souvent négatif) ; FILED les range en valeur absolue, le sens étant dans la nature `avoir`.

### Fournisseur (l'émetteur)

| Champ | Type | Clé | Description | Exemple |
|---|---|---|---|---|
| `fournisseur.nom` | texte (≤ 200) | oui | raison sociale | `"ATELIERS BRINDILLE SAS"` |
| `fournisseur.siren` | texte, 9 chiffres | | SIREN (clé Luhn vérifiée) | `"812345676"` |
| `fournisseur.siret` | texte, 14 chiffres | | SIRET (clé Luhn vérifiée) | `"81234567600031"` |
| `fournisseur.tva` | texte | | numéro de TVA intracommunautaire, sans espaces, majuscules (clé FR vérifiée) | `"FR19812345676"` |
| `fournisseur.id_legal` | texte (≤ 60) | | identifiant légal d'un émetteur étranger sans SIREN ni TVA | `"HRB 12345"` |
| `fournisseur.pays` | texte, 2 lettres | | pays ISO | `"FR"` |
| `fournisseur.iban` | texte | | IBAN de règlement, sans espaces, majuscules | `"FR7630006000011234567890189"` |

### Acheteur (le destinataire)

| Champ | Type | Clé | Description | Exemple |
|---|---|---|---|---|
| `acheteur.nom` | texte (≤ 200) | | raison sociale | `"SOGEXAL BÂTIMENT"` |
| `acheteur.siren` | texte, 9 chiffres | | | `"908765431"` |
| `acheteur.siret` | texte, 14 chiffres | | | |
| `acheteur.tva` | texte | | | `"FR..."` |
| `acheteur.pays` | texte, 2 lettres | | | `"FR"` |
| `acheteur.reference` | texte (≤ 100) | | référence acheteur, code client, service exécutant | `"SERVICE-TECH"` |

### Références

| Champ | Type | Description | Exemple |
|---|---|---|---|
| `commande.reference` | texte (≤ 100) | numéro du bon de commande rappelé sur la facture | `"BC-7781"` |
| `livraison.reference` | texte (≤ 100) | numéro du bon de livraison rappelé | `"BL-2031"` |
| `livraison.date` | texte `AAAA-MM-JJ` | date de livraison ou de prestation | `"2026-03-02"` |
| `contrat.reference` | texte (≤ 100) | référence du contrat ou de l'abonnement | `"ABO-12"` |
| `facture_origine.reference` | texte (≤ 100) | avoir : numéro de la facture d'origine | `"F-2026-0417"` |
| `facture_origine.date` | texte `AAAA-MM-JJ` | avoir : date de la facture d'origine | `"2026-03-12"` |

### Mentions

| Champ | Type | Description |
|---|---|---|
| `mention.autoliquidation` | booléen | la pièce porte « autoliquidation » (TVA due par le preneur) |
| `mention.franchise_293b` | booléen | la pièce porte « TVA non applicable, art. 293 B du CGI » |

Si le lecteur ne les rend pas, FILED les détecte lui-même par expression régulière dans le texte des pages.

### Tableaux

**`lignes`** : une seule valeur par pièce, `valeur` est un **tableau jsonb**, un objet par ligne du document, dans l'ordre (5 000 au plus). `page` = page de la première ligne. Colonnes d'un objet :

| Colonne | Type | Description |
|---|---|---|
| `numero` | texte (≤ 60) | numéro de ligne imprimé |
| `reference_vendeur` | texte (≤ 100) | référence article du fournisseur |
| `reference_acheteur` | texte (≤ 100) | référence article de l'acheteur |
| `gtin` | texte (≤ 40) | code EAN / GTIN |
| `designation` | texte (≤ 500) | libellé, tel qu'imprimé |
| `quantite` | nombre | |
| `unite` | texte (≤ 20) | unité (H, M2, C62…) |
| `prix_unitaire` | nombre | prix unitaire net HT |
| `prix_brut` | nombre | prix unitaire brut avant remise |
| `remise` | nombre | remise de ligne |
| `montant` | nombre | **montant HT de la ligne** |
| `taux_tva` | nombre | en pourcentage (20, 10, 5.5, 2.1, 0) |
| `categorie_tva` | texte (≤ 5) | catégorie UNTDID 5305 (S, Z, E, AE, K, G, O) si imprimée |
| `commande_ligne` | texte (≤ 60) | numéro de ligne de commande |

Exemple : `[{"designation":"Pose de cloisons placo","quantite":12,"prix_unitaire":85,"montant":1020,"taux_tva":20}]`

**`tva.ventilation`** : une seule valeur par pièce, tableau d'objets `{categorie, taux, base, montant, motif}` (un par taux). `motif` = motif d'exonération imprimé, s'il y en a un.

Exemple : `[{"taux":20,"base":1234.4,"montant":246.88}]`

### Résultat du travail (`travaux.resultat`, pour les tableaux de bord)

`{"pages": n, "valeurs": n, "statut": "lue", "type_piece": "facture", "methode": "natif", "modele": "claude-sonnet-5-5", "tokens_entree": n, "tokens_sortie": n, "appels_ia": n, "cout_eur": 0.0145, "decoupage": [{"pages":[1,2]}, {"pages":[3,4]}]}`. `decoupage` n'est présent que si le fichier contenait plusieurs documents ; seul le premier est lu comme la pièce.

## Autres types de pièce FILED (lus avec le même schéma)

`bon_commande`, `bon_livraison`, `devis`, `releve`, `contrat`, `attestation_assurance` : le lecteur rend les mêmes noms quand ils ont un sens (`numero`, `date`, `fournisseur.*`, `acheteur.*`, `montant_*`, `lignes`, `commande.reference`, `livraison.date`…). Le statut est `lue` dès qu'au moins une valeur est vérifiée. Les champs propres à ces natures (dates de validité d'un devis, période d'un relevé, garanties d'une attestation) ne sont **pas encore** rendus : à définir avec A4 quand les moteurs correspondants les liront.

## À venir — autres modules (proposition, à confirmer avec chaque moteur)

Même contrat : noms en minuscules à points, `texte` + `page` + `verifiee` sur chaque valeur, dates en `AAAA-MM-JJ`, montants en nombre. Rien de tout cela n'est encore rendu ; ce sont les noms que je prévois, pour que les écrans et moteurs ne partent pas sur d'autres.

### Tavaro — contrat (de location, de prestation)

| Champ | Type | Description |
|---|---|---|
| `contrat.reference` | texte | numéro ou référence du contrat |
| `contrat.objet` | texte | objet en une ligne |
| `contrat.date_signature` | date | |
| `contrat.date_debut` / `contrat.date_fin` | date | période |
| `contrat.duree_mois` | nombre | |
| `contrat.reconduction` | booléen | tacite reconduction |
| `contrat.preavis_jours` | nombre | |
| `bailleur.nom`, `bailleur.siren` / `preneur.nom`, `preneur.siren` | texte | les parties (ou `prestataire.*` / `client.*` pour une prestation) |
| `loyer.montant_ht`, `loyer.montant_ttc`, `loyer.periodicite` | nombre, nombre, texte (`mensuel`, `trimestriel`, `annuel`) | |
| `depot_garantie.montant` | nombre | |
| `indexation.indice` | texte | ILC, ILAT, ICC… |
| `bien.adresse`, `bien.surface_m2` | texte, nombre | |

### Lorani — avis et arrêté (courriers d'administration)

| Champ | Type | Description |
|---|---|---|
| `avis.type` | texte | `mise_en_demeure`, `avis_imposition`, `arrete`, `notification`… |
| `avis.reference` | texte | numéro de dossier ou d'avis |
| `avis.date` | date | date du courrier |
| `avis.date_limite` | date | date limite de réponse ou de paiement |
| `avis.delai_jours` | nombre | |
| `emetteur.nom`, `emetteur.service` | texte | administration et service |
| `destinataire.nom`, `destinataire.siren` | texte | |
| `montant.du`, `montant.majoration`, `montant.total` | nombre | |
| `arrete.numero`, `arrete.date_effet`, `arrete.objet` | texte, date, texte | pour un arrêté |
| `voie_recours.delai_jours`, `voie_recours.juridiction` | nombre, texte | |

### Tamila — ordonnance (pièces chiffrées : hors vague 1 du lecteur)

Les pièces Tamila sont chiffrées sous la clé du dossier (`chiffrement = dossier:v1`) : le lecteur les reporte aujourd'hui (`CHIFFREMENT_NON_PRIS_EN_CHARGE`). Noms prévus pour le jour où la lecture chiffrée existe :

| Champ | Type | Description |
|---|---|---|
| `ordonnance.date` | date | |
| `ordonnance.numero` | texte | |
| `prescripteur.nom`, `prescripteur.rpps`, `prescripteur.specialite` | texte | |
| `patient.nom`, `patient.date_naissance` | texte, date | chiffrés, jamais en clair |
| `prescription[]` | tableau | `{designation, posologie, duree_jours, quantite, renouvellements, ald}` |
| `mention.ald`, `mention.non_substituable` | booléen | |

## Comment faire évoluer ce référentiel

Un nouveau champ se déclare d'abord dans `schemas/facture.ts` (ou le schéma du module), avec son type, sa description et sa longueur maximale ; ce fichier est relu ici. Un moteur qui a besoin d'un champ absent le demande à A1 par le coordinateur, avec le nom souhaité au format ci-dessus.
