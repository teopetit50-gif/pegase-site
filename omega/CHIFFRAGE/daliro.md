# Chiffrage DALIRO — ce que la page /secteurs/btp promet, et ce qu'il reste à construire

B6, 06/10/2026. La page a été lue sur `main` à c0494b4 (la vitrine de 15 h 55) : `app/secteurs/btp/page.tsx` et
`components/secteurs/btp/*`. Aucun fichier du site public n'a été modifié. Les numéros de ligne sont ceux de c0494b4.

## Synthèse

1. **Par état** — sur 52 promesses : A (prouvé en vrai) 5 · B (construit, testé sur la recette) 18 · C (partiel) 24 ·
   D (pas construit) 3 · T (tiers ou service humain) 2. Plusieurs C dépendent aussi d'un tiers (WhatsApp, transcription).
2. **Jours → B** : ≈ 27 jours de travail (25,5 dans le tableau + 1,5 pour la fiche « fournisseur » ; dont environ 2 côté A1 pour la lecture), concentrés sur la comparaison
   photo/vocal ↔ marché avec chiffrage automatique (4 j), l'import du devis (3 j), le réordonnancement météo (3 j),
   l'assistant « questions » de la démo (3 j) et le relevé d'audit (2 j).
3. **Jours B → A** : ≈ 18,5 jours (18 + 0,5), presque tout en essai sur un vrai chantier (un pilote de deux semaines en couvre l'essentiel).
4. **Tiers et achats (Teo)** : WhatsApp Business (Meta : comptes, numéro, modèles, secrets `META_*`) ; transcription
   des vocaux (payée à l'usage, en attente de Teo) ; lecture IA des photos (coût par image, via A1) ; SMS (crédits Brevo) ;
   vérifier que les données restent dans l'UE (région Supabase ; fonctions Vercel sans région posée = États-Unis par défaut).
   Gratuits : MET Norway (météo), Brevo courriel déjà payé. Services humains : assistance, formation, interlocuteur, point mensuel.
5. **Pour UNE première entreprise réelle** : WhatsApp branché (T) ; la transcription des vocaux (T) ; le devis saisi
   par Omega à l'installation (faisable aujourd'hui) ou importé (3 j) ; la comparaison au marché et le chiffrage
   automatique (4 j) ; les fonctions fermées par formule et le quota de comptes (1,5 j) ; l'accord permanent J-2
   (décision de Teo) ; six phrases de la page à corriger. Puis deux semaines de pilote.
6. **Avis honnête** : le bureau (marché, avenants, signature sur place, situations, réception, J-2, recalage, appro,
   météo, point du matin) est solide et testé (≈ 1 100 assertions vertes). En vrai, seuls le J-2 par courriel et
   l'alerte météo sont prouvés. La promesse de tête, « repère dans les photos et les vocaux et chiffre sur vos
   prix », est **partielle** : sans WhatsApp, sans transcription et sans comparaison au marché, elle ne tient pas
   encore. C'est elle qui vend la page ; je ne la présenterais pas à un client avant le pilote.

## Les promesses, une par une

État : **A** prouvé en vrai · **B** construit et testé sur la recette (test) · **C** partiel · **D** pas construit ·
**T** tiers, compte, achat de Teo ou service humain. Jours : de l'état actuel à B, puis de B à A, en jours de travail.
Fichiers : `textes.ts` = `components/secteurs/btp/textes.ts`, `Fonctions.tsx` = `components/secteurs/btp/Fonctions.tsx`, etc.

### Héros et description

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours →B / →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 1 | « Daliro repère ces travaux dans les photos et les vocaux de vos équipes » | textes.ts:38 ; page.tsx:69 | C | b6_24 (fil du chantier, rangement), b6_24b + lecteur.media d'A1 (test b6_19) | Messages réels : WhatsApp pas branché ; vocaux non transcrits ; le lecteur ne reçoit pas les lignes du marché, donc il ne sait pas ce qui est « hors devis ». | 2 / 2 | WhatsApp Business (Meta) ; transcription à l'usage ; lecture IA par photo (A1) |
| 2 | « les chiffre sur vos prix unitaires » | textes.ts:38 | C | Chiffrage MANUEL d'un avenant sur prix validés : b6_01, écrit en vrai depuis l'écran sur la recette (06/10) | Automatique : la lecture ouvre un avenant brouillon (objet, quantité) SANS prix ; il faut rapprocher l'ouvrage lu d'une ligne ou d'un prix unitaire du marché. | 2 / 1 | — |
| 3 | « et prépare l'avenant, que le client signe avant l'exécution » | textes.ts:38 | B | b6_01 (avenant, validation), b6_20 signature sur place (test b6_14, 19) | Une signature réelle sur un téléphone, avec un vrai client. | 0 / 0,5 | — |
| 4 | « Il confirme aussi vos sous-traitants deux jours avant leur passage. » | textes.ts:38 | A (courriel) | J-2 réel le 06/10 : envoi Brevo 02:33 Z, remis 02:33:05 Z (NOTES-B6) ; réponse OUI/NON lue : b6_07 (test b6_03) | SMS et WhatsApp (tiers) ; une réponse réelle reçue puis lue ; chaque J-2 passe par « À valider » tant que Teo n'a pas donné l'accord permanent. | 0 / 1 | Crédits SMS Brevo ; WhatsApp (Meta) |

### Fonctionnalités (Fonctions.tsx)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours →B / →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 5 | « Avant le départ sur chantier, Daliro a comparé les photos et les vocaux de la veille au marché et au planning. Le conducteur de travaux sait déjà quel avenant faire signer, quel sous-traitant relancer et quelle livraison décaler. » | Fonctions.tsx:40 | C | Point du matin (b6_15, b6_18, b6_19, b6_21, b6_22, b6_23 ; test b6_09) : avenants à relancer, J-2, retards, météo, livraisons | La comparaison au marché (n° 1). La remise réelle du point du matin Daliro (courriel) n'est pas prouvée. | 0 (compté au n° 1) / 1 | — |
| 6 | « Chaque sous-traitant reçoit une demande de confirmation deux jours avant son passage. S'il ne répond pas, vous êtes prévenu le soir même et vous avez une journée pour le remplacer. » | Fonctions.tsx:40 | C | b6_02 : demande à J-2, cron 17 h ; alerte « sans réponse » avec remplaçants | L'alerte part la VEILLE du passage à 17 h : il reste une soirée et un matin, pas une journée. Soit une alerte le soir de J-2, soit corriger la phrase. | 0,5 / 0,5 | — |
| 7 | « Quand un chef d'équipe signale un imprévu dans un vocal de vingt secondes, Daliro identifie l'ouvrage concerné, le chiffre sur vos prix unitaires et prépare l'avenant. » | Fonctions.tsx:40 | C | = n° 1 et 2 ; avenant brouillon depuis un message : b6_24b | Transcription des vocaux (Teo ne la paie pas avant WhatsApp) ; chiffrage automatique. | 0 (n° 1, 2) / 0,5 | Transcription |
| 8 | « … si ces changements ou augmentations n'ont pas été autorisés par écrit. » — Code civil, article 1793 | Fonctions.tsx:40 | A | Texte de l'article 1793 (marchés à forfait), cité exactement | — | 0 / 0 | — |
| 9 | Démonstration : « Qu'est-ce qui n'est pas au devis chez Lefèvre », « Préparer la réunion de chantier », « Résumer la visite » | Fonctions.tsx:40 | D | La fonction « questions » est listée dans les formules du socle (`btp_fonctions_de`), rien ne la réalise | Un assistant qui répond sur le chantier (marché, fil, avenants, planning). | 3 / 1 | Coût du modèle de langage à l'usage |

### Chiffres (Chiffres.tsx)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours →B / →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 10 | « J-2 » · « Sous-traitants confirmés » | Chiffres.tsx:24 | A | = n° 4 | — | 0 / 0 | — |
| 11 | « 7 h » · « Vos trois listes du matin » | Chiffres.tsx:24 | B | Point du matin déposé dès 5 h (b6_15, cron toutes les 30 min) | La remise réelle (n° 5). | 0 / 0 (n° 5) | — |
| 12 | « 0 » · « Logiciel à remplacer » | Chiffres.tsx:24 | C | Rien n'est à remplacer, MAIS le devis se saisit ligne à ligne dans Daliro | L'import du devis (n° 44). | 0 (n° 44) / 0 | — |
| 13 | « 1 clic » · « Pour signer un avenant » | Chiffres.tsx:24 | C | b6_20 : un clic côté bureau pour préparer le lien ; le client saisit son nom, coche « lu et approuvé » et trace sa signature | Phrase à corriger (« en une minute », par exemple) : la signature demande plus d'un clic, et c'est voulu. | 0 / 0 | — |
| 14 | « Vos équipes n'ont aucune application à installer » · « Les chefs d'équipe continuent d'envoyer leurs photos et leurs vocaux par WhatsApp, SMS ou courriel. Daliro lit ces messages là où ils arrivent. » | Chiffres.tsx:24 | C | Réception du socle (A2) → btp_messages (b6_24) ; aucune application, c'est vrai | WhatsApp (tiers) ; SMS entrant (un numéro qui reçoit) ; un courriel réel reçu et rangé. | 0 / 0,5 | WhatsApp (Meta) ; numéro SMS entrant |
| 15 | « Daliro les repère dans les photos et les vocaux, puis les chiffre sur vos prix. » | Chiffres.tsx:24 | C | = n° 1, 2 | = n° 1, 2 | 0 / 0 | — |
| 16 | « Ils confirment leur passage à J-2. Si l'un d'eux ne répond pas, des remplaçants vous sont proposés. » | Chiffres.tsx:24 | B | b6_02 `btp_proposer_remplacants` (même corps d'état, département, vigilance à jour) ; test b6_02 | Un cas réel sans réponse. | 0 / 0,5 | — |
| 17 | « Chaque livraison est calée sur le devis et le planning, et les retours de matériel sont suivis. » | Chiffres.tsx:24 | B | b6_22, b6_23 (tests b6_16, b6_17) ; recette-appro verte | Un chantier réel avec commandes. | 0 / 1 | — |
| 18 | « Daliro le mesure sur les photos de la semaine pour établir la situation de travaux. » | Chiffres.tsx:24 | C | Situations b6_12 (test b6_07) ; avancement lu dans les photos b6_25 (test b6_21, posé le 06/10) | A1 doit rendre la nature « avancement » (ouvrage, lot, pourcentage) ; aujourd'hui la proposition reste vide sur le vrai flux. | 1 (A1) / 1 | Lecture IA par photo |

### Métiers (Metiers.tsx)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours →B / →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 19 | « Un linteau à reprendre apparaît sur une photo du mardi, et l'avenant est signé avant que le mur soit refermé. » | Metiers.tsx:27 | C | = n° 1 à 3 | = n° 1, 2 | 0 / 0 | — |
| 20 | « Quand le client ajoute un point d'eau pendant la visite, le vocal du chef d'équipe devient une ligne d'avenant. » | Metiers.tsx:27 | C | = n° 7 | Transcription | 0 / 0 | Transcription |
| 21 | « Comme le plaquiste a pris du retard, l'électricien est prévenu à J-2 et ne se déplace pas pour rien. » | Metiers.tsx:27 | C | Recalage b6_19 (test b6_13) : les dates aval bougent et la confirmation J-2 repart à la nouvelle date | Aucun message « votre passage est décalé » n'est envoyé à l'aval au moment du recalage. | 1 / 0,5 | — |
| 22 | « Les fenêtres sont livrées le jour de la pose, ce qui évite trois jours de stockage sous la pluie. » | Metiers.tsx:27 | C | b6_23 : « livrer le » = VEILLE ouvrée de la pose | Règle et page se contredisent (veille ici, « jour de la pose » ici, « début de la pose » aux formules) : trancher puis aligner. | 0,25 / 0 | — |
| 23 | « Les reprises demandées à la réception sont photographiées, et celles qui ne figuraient pas au devis sont chiffrées à part. » | Metiers.tsx:27 | C | Réception et réserves b6_13 (test b6_08), pièce jointe possible | Le tri réserve « au devis » / « hors devis » et l'avenant né d'une réserve. | 1 / 0,5 | — |
| 24 | « Quand un sous-traitant ne confirme pas son passage, deux remplaçants sont proposés le soir même. » | Metiers.tsx:27 | B | = n° 16 (jusqu'à cinq remplaçants, alerte de 17 h) | = n° 16 | 0 / 0 | — |
| 25 | « Quand trois jours de pluie sont annoncés, l'ordre des chantiers de la semaine est reproposé avant le départ des équipes. » | Metiers.tsx:27 | C | Alerte météo PROUVÉE EN VRAI (MET Norway, banc, 06/10 : « pluie 15 mm (seuil 5) … décalez ou protégez ») | Aucun nouvel ordre n'est proposé : il faut permuter les passages extérieurs et intérieurs d'une semaine, entre chantiers et par équipe. | 3 / 1 | MET Norway gratuit |
| 26 | « Comme la chape ne figurait pas au devis, les douze mètres carrés sont chiffrés au prix unitaire et le client signe sur son téléphone. » | Metiers.tsx:27 | C | = n° 2, 3 | = n° 2 | 0 / 0 | — |
| 27 | « Un conducteur de travaux suit huit chantiers ouverts et reçoit chaque matin trois listes au lieu de quarante messages. » | Metiers.tsx:27 | B | = n° 11 | = n° 5 | 0 / 0 | — |

### Formules (textes.ts, `FORMULES`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours →B / →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 28 | « Lecture des photos et vocaux » — « Daliro lit ce que vos équipes envoient déjà par WhatsApp, SMS ou courriel. » | textes.ts:158 | C | = n° 1, 14 | = n° 1, 14 | 0 / 0 | = n° 1 |
| 29 | « Avenants chiffrés sur vos prix » — « Chaque avenant est chiffré avec les prix unitaires de vos devis. » | textes.ts:159 | A (manuel) | b6_01 : prix validés, écriture réelle depuis l'écran sur la recette | Automatique : n° 2 | 0 / 0 | — |
| 30 | « Signature sur place » — « Le client signe sur le téléphone du chef d'équipe. » | textes.ts:160 | B | = n° 3 | = n° 3 | 0 / 0 | — |
| 31 | « Chantiers ouverts » : 5 / 20 / sur mesure | textes.ts:161 | B | Quota du socle compté sous verrou à l'ouverture d'un chantier ; contrainte formule ↔ quota | — | 0 / 0 | — |
| 32 | « Relance des avenants non signés » — « Un avenant non signé reste dans la liste du matin jusqu'à sa signature. » | textes.ts:162 | B | b6_18 (test b6_12) : attention, puis critique à 14 jours | Un cas réel. | 0 / 0,5 | — |
| 33 | « Confirmation à J-2 » — « Chaque intervenant confirme son passage deux jours avant. » | textes.ts:165 | A (courriel) | = n° 4 | = n° 4 | 0 / 0 | = n° 4 |
| 34 | « Remplaçants proposés » — « … des remplaçants tirés de votre annuaire. » | textes.ts:166 | B | = n° 16 | = n° 16 | 0 / 0 | — |
| 35 | « Ordre des lots recalé » — « Quand un lot prend du retard, Daliro recale les lots suivants. » | textes.ts:167 | B | b6_19 (test b6_13) : il propose, une personne applique | Un cas réel. | 0 / 0,5 | — |
| 36 | « Alerte météo » — « Quand de la pluie ou du gel est annoncé, Daliro propose un nouvel ordre d'intervention pour la semaine. » | textes.ts:168 | C | Alerte A (n° 25) | Nouvel ordre : n° 25 | 0 (n° 25) / 0 | — |
| 37 | « Annuaire des sous-traitants » — « L'annuaire réunit vos intervenants, leurs lots et leurs disponibilités. » | textes.ts:169 | C | Tiers, intervenants, équipes, corps d'état, vigilance (socle) | Les DISPONIBILITÉS : rien ne les porte (le n° 16 exclut seulement ceux qui ont décliné). | 1,5 / 0,5 | — |
| 38 | « Liste cadencée depuis le devis » — « Daliro reprend les quantités du devis et les dates du planning. » | textes.ts:172 | B | b6_23 `btp_preparer_liste` (test b6_17) | = n° 17 | 0 / 0 | — |
| 39 | « Livraisons calées sur la pose » — « Chaque livraison est proposée pour le début de la pose, ce qui limite le stockage sur site. » | textes.ts:173 | B | b6_22, b6_23 (veille ouvrée) | = n° 22 | 0 / 0 | — |
| 40 | « Suivi des retours » — « Daliro suit le matériel qui reste sur le chantier et doit repartir. » | textes.ts:174 | B | b6_23 `btp_noter_retour` (test b6_17) | = n° 17 | 0 / 0 | — |
| 41 | « Bons de livraison rapprochés » — « Chaque bon de livraison est comparé à la commande. » | textes.ts:175 | B (saisie) | b6_23 `btp_recevoir` : quantité saisie, comparée à la commande (manquant, conforme, excédent) | Lire le bon depuis sa photo (via A1), sans saisie. | 2 / 1 | Lecture IA par photo |
| 42 | « Avancement lu dans les photos » — « Les photos de la semaine servent de base à la situation de fin de mois. » | textes.ts:176 | C | = n° 18 | = n° 18 | 0 / 0 | — |
| 43 | « Comptes bureau » : 2 / 5 / sur mesure | textes.ts:179 | C | Le quota est enregistré (`quota_comptes_bureau`), mais rien ne le compte à l'invitation | Le contrôle à l'ajout d'un compte. | 0,5 / 0 | — |
| 44 | « Installation par Omega » — « Nous raccordons vos devis, votre planning et les messages de vos équipes. » | textes.ts:186 | C | Planning : import tableur `btp_importer_passages` (B) ; messages : n° 14 | DEVIS : pas d'import ; saisie ligne à ligne. Import CSV/Excel (1,5 j), puis PDF par A1 (1,5 j). | 3 / 1 | WhatsApp (n° 14) |
| 45 | « Rôles et droits » — « Vous décidez qui valide un avenant et qui voit les prix. » | textes.ts:181 | B | Rôles du socle, voir les prix, valideurs, deux personnes (test b6_02 garde-fous) | — | 0 / 0 | — |
| 46 | « Journal des validations » — « Le journal garde la trace de chaque validation, avec son auteur et son heure. » | textes.ts:182 | B | `private.journaliser` à chaque porte ; validation DAF réelle du J-2 le 06/10 | Le montrer au client (écran du journal) et le relire en vrai. | 0 / 0,5 | — |
| 47 | Fonctions ouvertes ou fermées selon la formule (cases ✓ / ✗ du tableau) | textes.ts:157-190 | C | `btp_fonctions_de` liste les fonctions par formule, mais seule la météo la consulte | Fermer remplaçants, ordre des lots, relance, appro, retours, bons, situations, rôles selon la formule. | 1 / 0 | — |
| 48 | « Données dans l'Union européenne » — « Vos données sont hébergées dans l'Union européenne. » | textes.ts:183 ; FAQ textes.ts:216 | T | À vérifier : région du projet Supabase (non lue par B6) ; `vercel.json` ne fixe aucune région, donc les fonctions serveur tournent aux États-Unis par défaut ; fournisseur du lecteur IA (A1) | Fixer la région Vercel (fichier partagé, coordinateur) ; confirmer Supabase et le lecteur. | 0,25 / 0 | — |
| 49 | « Assistance en français » · « Formation des chefs d'équipe » (« sur le chantier, avec vos équipes ») · « Interlocuteur dédié » | textes.ts:187, 189, 190 | T | Services humains | Qui, quand, à quel prix (Teo). | — | Temps humain |
| 50 | « Point mensuel » — « Chaque mois, nous rapprochons les travaux repérés des travaux facturés. » | textes.ts:188 | D | Les données existent (avenants, situations, factures rattachées b6_03) ; aucun relevé | Un relevé mensuel « repéré / signé / facturé / perdu ». | 1,5 / 0,5 | Temps humain pour le point |

### Questions fréquentes (textes.ts, `FAQ`)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours →B / →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 51 | « Daliro ne signe rien à votre place et n'envoie aucun avenant sans votre accord. La paie, la comptabilité et l'établissement des devis restent dans vos outils actuels. » | textes.ts:204 | B | Toute signature passe par une personne (b6_01, b6_20) ; tout envoi par « À valider » (J-2 réel du 06/10 validé par la DAF) | — | 0 / 0 | — |
| 52 | « Daliro lit vos devis là où ils sont, depuis votre logiciel ou un export. » · « Nous examinons les devis, le planning et les échanges d'un ou deux chantiers en cours. Vous repartez avec ce que nous y avons relevé » | textes.ts:202, 215 ; Appel.tsx:28 | D | Pas d'import de devis (n° 44) ; pas de relevé d'audit | Import du devis (n° 44, compté) ; import d'un export WhatsApp (.zip) dans le fil, puis le relevé d'audit. | 2 / 1 | — |

Les autres phrases de la FAQ et de l'appel reprennent des promesses déjà comptées : 201 (n° 5), 203 (n° 14),
207 (n° 1, 2), 208 (n° 8), 209 (n° 6, 16), 210 (n° 36), 211 (n° 38, 39), 214 (prix fixé à l'audit : démarche
commerciale, T). Deux phrases sont vraies par construction : « Daliro lit vos fichiers sans jamais les modifier »
(216, les pièces sont des copies en lecture) et « conçu et développé en France par Omega » (217, fait sur l'entreprise).

Les quatre fiches du héros (textes.ts:63-116) sont des données d'exemple : les noms sont fictifs, mais ce n'est écrit
nulle part sur la page. Une seule action n'est pas construite : « Fournisseur a accepté le décalage » (textes.ts:100).
Aucun message ne part vers un fournisseur ; il faudrait 1,5 j →B et 0,5 j →A, plus un canal. Les autres fiches
renvoient aux n° 2, 16, 21, 22 et 18.

## Phrases à corriger sur la page (sans code)

1. « vous avez une journée pour le remplacer » (n° 6) : c'est la veille à 17 h.
2. « 1 clic pour signer un avenant » (n° 13) : la signature demande nom, case et tracé.
3. « livrées le jour de la pose » / « pour le début de la pose » (n° 22, 39) : la règle construite est la veille ouvrée.
4. « leurs disponibilités » (n° 37) : pas construit.
5. « propose un nouvel ordre d'intervention pour la semaine » (n° 25, 36) : aujourd'hui, c'est une alerte par passage.
6. « hébergées dans l'Union européenne » (n° 48) : à confirmer avant de l'affirmer.
