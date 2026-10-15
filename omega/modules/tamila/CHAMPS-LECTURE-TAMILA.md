# Ce que le lecteur doit rendre pour TAMILA — les avis RPVA des cabinets d'avocats

> Écrit par B4 le 06/10/2026 pour la table des types du lecteur (A1), sur le modèle de
> `omega/modules/lorani/CHAMPS-LECTURE-LORANI.md`. Source : `omega/SOCLE-EXTRAITS-TAMILA.sql`
> (`private.tamila_avis_lu`, `private.tamila_appliquer_avis`, CHECK de `tamila_avis`) et la migration
> `b4_01_tamila_deposer_piece.sql`.

## Avant tout : aujourd'hui, le lecteur ne peut rien lire de Tamila

Toute pièce d'un dossier Tamila est **chiffrée dans le navigateur** avec la clé du dossier
(`pieces.chiffrement = 'dossier:v1'`, format `01 ‖ nonce 12 ‖ chiffré ‖ étiquette 16`, AES-256-GCM). La porte
`tamila_deposer_piece` refuse une pièce en clair. Le lecteur n'a pas la clé : il rend
`CHIFFREMENT_NON_PRIS_EN_CHARGE`, et c'est la bonne réponse **tant qu'il n'y a pas de coffre** (KMS Scaleway et
ouvrier `tamila-coffre`, décision de Teo, NOTES-B4). Recommandation à A1 : pour `chiffrement = 'dossier:v1'`,
`finir_travail` avec `{"ignore": "chiffree_sans_coffre"}` plutôt qu'un `echouer_travail` repris sans fin.

La table ci-dessous est donc **le contrat pour le jour où le coffre déballe la clé** : elle peut entrer dès
maintenant dans la table des types du lecteur (elle ne coûte rien), mais aucune pièce Tamila n'y arrivera avant.

Une pièce Tamila se reconnaît à `pieces.module = 'tamila'` et `objet_type = 'tamila_dossier'` ; `type_piece` du
dépôt, quand l'avocat l'a donné, est une indication. Les pièces d'un dossier `attente` restent `a_rattacher` et
partent à la lecture à l'ouverture du dossier.

## Règles communes

Celles du contrat (omega/CONTRAT-OUVRIER.md, § 2) : `champ` en `^[a-z][a-z0-9_.]{1,79}$`, `valeur` au format
canonique, `texte` = la citation telle qu'écrite, `verifiee = true` seulement si la citation est retrouvée sur la
page, `boite` en fractions.

- **Dates** : `AAAA-MM-JJ`. **Date et heure** (audience, dépôt) : `AAAA-MM-JJTHH:MM`, **heure locale de la cour**
  (le socle la convertit avec le fuseau du territoire de l'appel ; une valeur de 10 caractères = heure inconnue).
  Ne jamais rendre de décalage (`+02:00`) ni de `Z`.
- **`type_piece` = le code de l'avis, tel quel** : c'est la valeur que le socle attend dans `p_type` de
  `tamila_avis_lu`. Dix codes, aucun autre.
- **`numero_rg`** est rendu sur chaque avis qui en porte un (tel qu'écrit, ex. `26/04512`). Le socle ne le compare
  pas lui-même (le n° RG du dossier est chiffré) : la comparaison se fait avec la clé déballée et donne
  `p_rg_concorde`. **Un RG différent met l'avis en `a_verifier` et lève une alerte critique** ; un RG absent laisse
  `rg_non_verifie` sur les délais posés.
- **Confiance** : un avis reconnu par un gabarit fixe (message e-barreau à libellé constant) → `gabarit` ; type
  proposé par le modèle → `modele` (le socle ajoute `type_propose_par_modele` aux délais et lève une alerte
  « avis sans gabarit »). Une saisie à l'écran est toujours `saisie`.
- **Ne jamais rendre** dans `valeurs` le nom d'une partie, d'un avocat adverse ou l'intitulé de l'affaire : ils
  sont chiffrés en base et ne doivent pas apparaître en clair dans `valeurs` (le mot sentinelle du test 11 les
  cherche dans vingt tables). Le texte des pages reste dans `pages`, comme pour tout module.

## Les dix avis

| `type_piece` | L'avis (RPVA / e-barreau) | Champs attendus (`valeur`) | Ce que le socle en fait |
|---|---|---|---|
| `rpva_declaration_appel` | Déclaration d'appel enregistrée au greffe de la cour (récépissé ou notification) | `date_avis` (date de la déclaration, **obligatoire**) ; `partie_visee` ∈ `appelant`, `intime` (le rôle du client du cabinet) ; `numero_rg` | crée l'appel s'il manque, pose les délais de l'événement `declaration_appel` (art. 908 pour l'appelant…), à confirmer |
| `rpva_avis_902` | Avis du greffe d'avoir à signifier la déclaration d'appel (art. 902, intimé non constitué) | `date_avis` (**obligatoire**) ; `numero_rg` | délais de `avis_signifier_declaration` |
| `rpva_avis_fixation` | Avis de fixation à bref délai (art. 906) | `date_avis` (**obligatoire**) ; `date_audience` (date et heure si écrites) ; `numero_rg` | oriente l'appel en bref délai, délais de `avis_fixation_bref_delai`, audience de plaidoiries |
| `rpva_ordonnance_mee` | Ordonnance ou avis du conseiller de la mise en état fixant un calendrier | `date_avis` (**obligatoire**) ; `date_limite` (date fixée par le juge pour conclure) ; `date_cloture_previsible` ; `numero_rg` | oriente l'appel en mise en état, pose la date fixée (source `ordonnance`), clôture prévisible |
| `rpva_conclusions` | Notification de conclusions par un confrère | `date_avis` (date de la notification, **obligatoire**) ; `partie_visee` ∈ `appelant`, `intime`, `intervenant` (la partie **qui conclut**) ; `rang` (1 pour les premières conclusions, 2, 3…) ; `numero_rg` | si l'appelant notifie ses premières conclusions à un client intimé : délai de l'art. 909 ; rang absent → `rang_a_verifier` |
| `rpva_appel_incident` | Notification d'un appel incident | `date_avis` (**obligatoire**) ; `numero_rg` | délais de `notification_appel_incident` |
| `rpva_intervention` | Notification d'une intervention (forcée ou volontaire) | `date_avis` (**obligatoire**) ; `partie_visee` = `intervenant` ; `numero_rg` | délais de l'intervention selon le rôle du client |
| `rpva_avis_audience` | Avis d'audience (mise en état, plaidoiries, renvoi) | `date_avis` (**obligatoire**) ; `date_audience` (**obligatoire en pratique**, date et heure si écrites) ; `numero_rg` | ajoute l'audience au dossier |
| `rpva_accuse_depot` | Accusé de dépôt RPVA d'un acte du cabinet (conclusions, déclaration) | `date_avis` (**obligatoire**) ; `depose_le` (date et heure du dépôt, **obligatoire**) ; `numero_rg` | avis `a_rattacher` + alerte : l'avocat le rattache au délai qu'il éteint |
| `rpva_interruption` | Acte ou décision interrompant les délais (art. 915-3 : radiation, sursis, demande d'aide juridictionnelle…) | `date_avis` (**obligatoire**) ; `numero_rg` | interrompt les délais interruptibles du dossier (point de départ à préciser) |

`date_avis` est la date **portée sur l'avis** (pas celle de sa réception) : c'est le point de départ des délais.
Sans elle, le socle refuse l'avis (« La date de l'avis est nécessaire »), il faut donc rendre `a_verifier` plutôt
que deviner.

## Ce qui n'est pas un avis

Une pièce du dossier qui n'est aucun des dix (jugement de première instance, conclusions adverses elles-mêmes,
bordereau, courrier du client, pièce adverse) se rend `lue` avec `type_piece = 'tamila_piece_autre'` et, si elle
porte une date, `date_piece` ; le socle n'en tire rien, l'écran la montre dans la carte « Pièces ». Un document
illisible ou vide se rend `a_classer` avec son motif.

## Exemple attendu

L'avis d'audience du scénario (NOTES-B4 § 1, étape 9), une fois déchiffré :

```json
{"statut": "lue", "type_piece": "rpva_avis_audience", "confiance_type": 0.95, "methode": "natif", "nb_pages": 1,
 "valeurs": [
   {"champ": "date_avis", "valeur": "2026-10-02", "texte": "Paris, le 2 octobre 2026", "page": 1, "verifiee": true, "source": "ia", "confiance": 0.97},
   {"champ": "date_audience", "valeur": "2027-02-04T09:30", "texte": "audience du jeudi 4 février 2027 à 9 h 30", "page": 1, "verifiee": true, "source": "ia", "confiance": 0.96},
   {"champ": "numero_rg", "valeur": "26/04512", "texte": "N° RG 26/04512", "page": 1, "verifiee": true, "source": "ia", "confiance": 0.98}
 ]}
```

## Ce qui manque côté socle (B4, à venir)

Il n'existe pas encore de passerelle « pièce lue → `tamila_avis_lu` » (Lorani a `private.lorani_lectures_passage`
sur le genre `lorani.piece_lue`) : aujourd'hui les avis se saisissent à l'écran (confiance `saisie`). Elle viendra
avec le coffre, puisqu'elle doit déchiffrer le n° RG du dossier pour calculer `p_rg_concorde`. La table ci-dessus
est déjà le format qu'elle lira : `type_piece` → `p_type`, les `valeurs` vérifiées → `p_valeurs`
(`{"date_avis": …, "date_audience": …, "date_limite": …, "date_cloture_previsible": …, "partie_visee": …,
"rang": …, "depose_le": …}`).
