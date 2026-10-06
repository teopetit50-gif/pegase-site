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

### Une ligne par champ, jamais deux (règle commune à tous les modules)

Le lecteur écrit **au plus une ligne de `pieces_valeurs` par `(piece_id, champ)`**. Un champ qui porte plusieurs
éléments (une liste : `pieces` de Lorani ; un tableau d'objets : `lignes` et `tva.ventilation` de FILED) est **une
seule ligne dont `valeur` est un tableau jsonb**, dans l'ordre du document : `["PCMI 3", "PCMI 6"]`, jamais deux
lignes `pieces`. Raisons : la correction humaine (`source = humain`) remplace le champ entier, la vérification porte
élément par élément sur la page citée, et un lecteur SQL lit `valeur` avec `jsonb_array_elements_text` (côté socle :
`jsonb_typeof(valeur) = 'array'`, et non une chaîne `valeur #>> '{}'`). Un champ non liste n'a jamais de tableau.

### Ce que « verifiee » veut dire

`verifiee = true` seulement si **toutes** ces conditions tiennent :

1. la valeur entre dans le type attendu (une date est une date valide en `AAAA-MM-JJ`, un montant est un nombre, une mention un booléen) ;
2. la citation `texte` est **retrouvée mot pour mot dans le texte de la page citée** (comparaison sans accents, sans casse, tolérante aux espaces : « 1 481,28 » vaut « 1481,28 ») ;
3. les règles de forme du champ tiennent : clé Luhn du SIREN et du SIRET, clé du numéro de TVA français, forme de l'IBAN, code pays sur deux lettres, devise sur trois.

Pour une valeur `xml`, la citation est la balise elle-même : `verifiee` est vraie par construction, sauf identifiant à clé fausse. **Factur-X (PDF/A-3 avec XML joint)** : le XML fait foi ; les valeurs clés (`numero`, `date`, `echeance`, montants, `net_a_payer`, `fournisseur.siren/siret/tva/iban`, `commande.reference`) sont recherchées dans le texte natif du PDF. Retrouvées, elles reçoivent `page` et `boite` (« concorde avec le PDF page n ») ; introuvables, `controle` dit « non retrouvée dans le PDF visible (le XML fait foi) » et le `motif` de la pièce les liste, sans changer la valeur ni `verifiee`. La provenance est `source = xml`, confiance 1 (la contrainte `pieces_valeurs_source_check` n'admet pas d'autre nom pour le « structuré »). UBL et CII purs, Factur-X MINIMUM, BASIC, EN16931 : tous lus sans IA. Pour les tableaux (`lignes`, `tva.ventilation`), `verifiee` est vraie si chaque libellé (ou chaque montant de TVA) se retrouve sur sa page.

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

**Nature d'une facture électronique (XML)** : `avoir` si la racine est un UBL `CreditNote` ou si le code UNTDID 1001 (`type_code`) est un code d'avoir (381, 261, 262, 296, 308, 396, 420, 458, 502, 503, 532, 81, 83) ; une **facture rectificative 384** est un `avoir` si son total TTC est négatif, une `facture` sinon (son `type_code` reste 384, `facture_origine.*` quand le XML cite la facture corrigée). `cadre_facturation` (B1, S1, M1…) est lu dans le contexte du document (CII `BusinessProcessSpecifiedDocumentContextParameter/ID`, UBL `ProfileID`) seulement s'il a cette forme.

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

## Module Lorani — urbanisme (en service)

Six types, plus `lorani_courrier_autre`, tels que `private.lorani_propositions` les attend (B5, `omega/modules/lorani/CHAMPS-LECTURE-LORANI.md`). Le lecteur choisit la table des types selon `pieces.module` (`omega/functions/lecteur/schemas/modules.ts`) ; une pièce Lorani d'un autre type (une facture, une photo) part en `a_classer`. `numero_dossier` est attendu sur tous les types. Les dates sont en `AAAA-MM-JJ`, les boîtes en fractions de page avec `y` depuis le haut.

| `type_piece` | Ce que c'est | Champs | Clés (tous vérifiés → `lue`) |
|---|---|---|---|
| `lorani_recepisse_depot` | récépissé de dépôt d'une demande d'autorisation, remis par la mairie, **ou accusé de réception / d'enregistrement électronique (ARE / AEE) du guichet numérique**, qui en tient lieu (L.112-11 CRPA, R*423-3 CU) : `date_depot` = la date de réception qu'il indique | `numero_dossier`, `date_depot`, `type_autorisation`, `commune`, `demandeur` | `date_depot` |
| `lorani_lettre_delai` | lettre notifiant ou modifiant le délai d'instruction | `numero_dossier`, `delai_mois`, `date_lettre`, `motif_majoration` | `delai_mois` |
| `lorani_demande_pieces` | demande de pièces complémentaires | `numero_dossier`, `date_lettre`, `pieces`, `delai_reponse_mois` | `date_lettre`, `pieces` |
| `lorani_arrete` | arrêté du maire ou du préfet | `numero_dossier`, `decision`, `date_decision`, `prescriptions`, `date_notification` | `decision`, `date_decision` |
| `lorani_certificat_tacite` | certificat de décision tacite acquise | `numero_dossier`, `date_tacite`, `date_certificat` | `date_tacite` |
| `lorani_constat_affichage` | constat d'affichage par commissaire de justice | `numero_dossier`, `date_constat`, `passage`, `commissaire` | `date_constat` |
| `lorani_courrier_autre` | autre courrier de la mairie (avis de commission, information ; un ARE / AEE est un récépissé, pas un autre courrier) | `numero_dossier`, `date_lettre` | aucune : `lue` même sans date |

Les clés sont les champs « obligatoires » de la fiche de B5 ; `numero_dossier` est rendu partout où il est écrit, sans être une clé.

| Champ | Type de `valeur` | Description | Exemple |
|---|---|---|---|
| `numero_dossier` | texte (≤ 60) | numéro de dossier tel qu'imprimé | `"PC 069 123 26 A0042"` |
| `date_depot` | texte `AAAA-MM-JJ` | date de dépôt en mairie | `"2026-09-14"` |
| `delai_mois` | nombre entier, 1 à 24 | délai d'instruction notifié ; hors bornes → non vérifié | `3` |
| `date_lettre` | texte `AAAA-MM-JJ` | date du courrier | `"2026-10-02"` |
| `pieces` | tableau de textes (**une seule ligne**, voir « Une ligne par champ ») | les pièces demandées, telles qu'imprimées, dans l'ordre de la lettre ; vérifié si chaque élément se retrouve sur la page | `["PC5", "PC 8"]` |
| `decision` | texte parmi `accorde`, `refuse`, `non_opposition`, `opposition`, `sursis` | une forme approchante (« Accordé », « non-opposition ») est ramenée à la valeur admise | `"accorde"` |
| `date_decision` | texte `AAAA-MM-JJ` | date de l'arrêté | `"2026-11-20"` |
| `date_tacite` | texte `AAAA-MM-JJ` | date d'acquisition de la décision tacite | `"2026-11-15"` |
| `date_constat` | texte `AAAA-MM-JJ` | date du constat | `"2026-12-10"` |
| `passage` | nombre entier, 1 à 3 | numéro du passage de l'huissier | `2` |
| `type_autorisation` | texte parmi `pc`, `pcmi`, `pa`, `pd`, `dp` | nature de la demande (« PCMI » ramené à `pcmi`) | `"pcmi"` |
| `commune` | texte (≤ 120) | commune de dépôt, telle qu'écrite | `"Saint-Herblain"` |
| `demandeur` | texte (≤ 200) | demandeur, tel qu'écrit | `"SCI LES TILLEULS"` |
| `motif_majoration` | texte (≤ 300) | motif de la majoration du délai | `"avis de l'architecte des Bâtiments de France"` |
| `delai_reponse_mois` | nombre entier, 1 à 12 | délai pour fournir les pièces, s'il est écrit | `3` |
| `prescriptions` | texte (≤ 1000) | prescriptions de l'arrêté | |
| `date_notification` | texte `AAAA-MM-JJ` | date de notification de l'arrêté | |
| `date_certificat` | texte `AAAA-MM-JJ` | date du certificat tacite | |
| `commissaire` | texte (≤ 200) | commissaire de justice ou son étude | |

Pas de `lignes` ni de `tva.ventilation` pour ce module.

## Module Tamila — avis RPVA des cabinets d'avocats (lecture par le coffre serveur)

Dix types d'avis, un par valeur de `tamila_avis.type_avis`, plus `tamila_piece_autre`, conformes à la fiche de B4 (`omega/modules/tamila/CHAMPS-LECTURE-TAMILA.md`, worker-b4 66ec6fb), et des champs qui portent **le nom exact des clés de `p_valeurs`** de `public.tamila_avis_lu(p_client, p_dossier, p_piece, p_type, p_valeurs, p_confiance, p_rg_concorde)` (B4, `omega/SOCLE-EXTRAITS-TAMILA.sql`) : celui qui applique une lecture passe `type_piece` en `p_type` et l'objet `{champ: valeur}` des valeurs vérifiées en `p_valeurs`, `p_confiance = 'modele'`. `numero_rg` n'est pas lu par `tamila_avis_lu` : il sert à calculer `p_rg_concorde` contre le n° RG du dossier, qui est chiffré (le lecteur ne le voit pas, la comparaison se fait là où la clé du dossier est déballée).

**Limite actuelle** : les pièces déposées par `tamila_deposer_piece` sont chiffrées (`chiffrement = dossier:v1`) Pour un cabinet à **coffre serveur** (`tamila-coffre`, b4_05, fournisseur `scaleway`), le lecteur demande la clé de la pièce au coffre (`action: cle_piece`, clé de service), déchiffre le fichier **en mémoire** et le lit comme une pièce en clair (`travaux.resultat.dechiffree = true`) ; la clé est effacée dès le déchiffrement, ni elle ni le clair ne sont journalisés. **La lecture d'une pièce chiffrée est rendue chiffrée** (règle d'`enregistrer_lecture`) : `pieces_pages.texte` vide et `texte_chiffre` = le texte de la page ; `pieces_valeurs.valeur` = null et `chiffre` = le JSON UTF-8 `{"valeur", "texte", "boite", "controle"}` (clés absentes omises) ; les deux au format Tamila `01 ‖ nonce 12 ‖ chiffré ‖ étiquette 16` (AES-256-GCM, clé du dossier), en base64 dans `p_resultat`. Restent en clair : `champ`, `page`, `source`, `confiance`, `verifiee`, `type_piece`, et un `motif` ramené aux phrases du lecteur (noms de champs seulement). L'écran rouvre ces chiffrés avec la clé du dossier. **Passerelle avis RPVA (b4_08)** : après l'enregistrement, pour une pièce lue ou à vérifier dont le type est un avis, le lecteur appelle `tamila_dossier_pour_lecteur`, déchiffre en mémoire le n° RG du dossier, calcule la concordance avec `numero_rg` lu, puis `tamila_avis_du_lecteur` avec les seules valeurs vérifiées que `tamila_avis_lu` lit ; `travaux.resultat.avis_rpva` dit `pose`, `deja`, `date_absente`, `pas_un_avis` ou `erreur` (la lecture reste, l'avis est alors à saisir). Coffre `local` ou absent : le lecteur clôt le travail sans télécharger (`finir_travail {"ignore": "chiffree_sans_coffre"}`, sans reprise) et la pièce reste `recue`. Coffre indisponible → `COFFRE_INDISPONIBLE`, repris ; coffre qui refuse → `COFFRE_REFUSE`, clé qui n'ouvre pas le fichier → `CHIFFRE_ILLISIBLE`, tous deux sans reprise. La table sert dès qu'une pièce Tamila arrive en clair (`pieces.module = 'tamila'`, sans chiffrement) ou que le coffre existe.

| `type_piece` | Ce que c'est | Champs | Clés (toutes vérifiées → `lue`) |
|---|---|---|---|
| `rpva_declaration_appel` | avis d'enregistrement (ou notification) d'une déclaration d'appel | `numero_rg`, `date_avis`, `partie_visee` | `date_avis` |
| `rpva_avis_902` | avis d'avoir à signifier la déclaration d'appel (art. 902) | `numero_rg`, `date_avis` | `date_avis` |
| `rpva_avis_fixation` | avis de fixation à bref délai (art. 906) | `numero_rg`, `date_avis`, `date_audience`, `date_cloture_previsible` | `date_avis` |
| `rpva_conclusions` | notification de conclusions entre avocats | `numero_rg`, `date_avis`, `partie_visee`, `rang` | `date_avis`, `partie_visee` |
| `rpva_appel_incident` | conclusions portant appel incident ou provoqué | `numero_rg`, `date_avis` | `date_avis` |
| `rpva_intervention` | intervention forcée ou volontaire | `numero_rg`, `date_avis`, `partie_visee` (`intervenant`) | `date_avis` |
| `rpva_ordonnance_mee` | ordonnance ou avis du conseiller de la mise en état | `numero_rg`, `date_avis`, `date_limite`, `date_cloture_previsible` | `date_avis` |
| `rpva_avis_audience` | avis fixant ou renvoyant une audience | `numero_rg`, `date_avis`, `date_audience`, `date_cloture_previsible` | `date_avis`, `date_audience` |
| `rpva_accuse_depot` | accusé de réception RPVA d'un dépôt du cabinet | `numero_rg`, `date_avis`, `depose_le` | `date_avis`, `depose_le` |
| `rpva_interruption` | avis d'un événement interruptif d'instance | `numero_rg`, `date_avis` | `date_avis` |
| `tamila_piece_autre` | toute autre pièce du dossier (jugement, conclusions elles-mêmes, bordereau, pièce adverse, courrier) | `date_piece` | aucune : `lue` même sans date |

| Champ | Type de `valeur` | Description | Exemple |
|---|---|---|---|
| `numero_rg` | texte (≤ 30) | n° RG tel qu'imprimé | `"26/04512"` |
| `date_avis` | texte `AAAA-MM-JJ` | date de l'avis, de la notification ou de l'ordonnance | `"2026-10-02"` |
| `date_audience` | texte `AAAA-MM-JJTHH:MM`, ou `AAAA-MM-JJ` si l'heure n'est pas imprimée | **heure locale de la cour, sans fuseau** : `tamila_avis_lu` pose le fuseau du territoire, et lit une date seule comme « heure inconnue » ; un fuseau ou un `Z` rendu par le modèle → non retenu | `"2027-02-04T09:30"` |
| `date_cloture_previsible` | texte `AAAA-MM-JJ` | clôture prévisible | `"2027-01-21"` |
| `date_limite` | texte `AAAA-MM-JJ` | date limite fixée par le conseiller de la mise en état | `"2026-12-15"` |
| `partie_visee` | texte parmi `appelant`, `intime`, `intervenant` | conclusions : la partie qui conclut ; déclaration d'appel : la qualité de la partie défendue par l'avocat destinataire ; « Intimé », « l'intimée » ramenés à `intime` | `"intime"` |
| `rang` | nombre entier, 1 à 99 | rang des conclusions (1 = premières) | `2` |
| `depose_le` | comme `date_audience` | date et heure du dépôt accusé | `"2026-10-03T16:12"` |
| `date_piece` | texte `AAAA-MM-JJ` | date portée sur une autre pièce du dossier | `"2026-06-12"` |

Aucun nom de partie, d'avocat adverse ni l'intitulé de l'affaire n'entre dans `valeurs` (ils sont chiffrés en base) : aucun champ ne les porte.

Pas de `lignes` ni de `tva.ventilation` pour ce module.

## Ajouter un module : la table des types

Un module déclare dans `omega/functions/lecteur/schemas/<module>.ts` sa présentation (ce que le modèle lit), ses types (`type`, description, champs, clés) et ses champs (`texte`, `nombre`, `entier` borné, `date`, `dateheure` locale, `booleen`, `choix` avec valeurs admises, `liste`), puis s'inscrit dans `SCHEMAS_PAR_MODULE`. Le schéma d'outil, la consigne de Claude, le typage des valeurs et les règles de statut en découlent. Un module sans schéma propre est lu avec la table FILED.

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

## Comment faire évoluer ce référentiel

Un nouveau champ se déclare d'abord dans `schemas/facture.ts` (ou le schéma du module), avec son type, sa description et sa longueur maximale ; ce fichier est relu ici. Un moteur qui a besoin d'un champ absent le demande à A1 par le coordinateur, avec le nom souhaité au format ci-dessus.
