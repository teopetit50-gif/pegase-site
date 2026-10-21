# T-FILED — tests en boîte noire du moteur FILED (factures fournisseurs)

Brief posé par la session bureau de Teo, 21/10/2026. Contrat : `omega/CONTRAT-TESTEUR.md`.
Branche : `testeur-filed`. Client banc : `banc-test-filed` (créé par le coordinateur).

## Ce que tu lis

- Promesses : `lib/produits/capacites/factures.ts` (catalogue, cas limites, échelle) et
  `lib/produits/factures.ts` (la page).
- Guides : `omega/GUIDE-DEPOT.md` (comment un client dépose), `omega/GUIDE-GMAIL.md`,
  `omega/GUIDE-LOGICIELS-COMPTABLES.md` (ce que la sortie comptable promet).
- Écran : `app/espace2/filed` sur la recette (pièces, fournisseurs, validations, comptabilité).
- Banc de l'ouvrier, pour savoir comment une pièce entre : `omega/recette-a3/relecture-*.mjs`
  et, sur `worker-a4`, `omega/banc/` (fichiers de banc seulement).

Une pièce entre par le **dépôt** (GUIDE-DEPOT) ou par la porte de dépôt de pièce que le
coordinateur te donne. Elle est lue par le lecteur (IA) : chaque lecture coûte quelques
centimes, plafond par client et par jour. Ne dépose pas cent pièces : une série de douze,
jouée deux fois, suffit à une promesse.

## Le jeu d'essai de départ

Factures de **matériaux de construction, façon Guadeloupe** (TVA 8,5 % / 2,1 % / exonération
art. 295, octroi de mer, chantier nommé). Fournisseurs fictifs, ou sociétés réelles dont seul
le SIREN public sert (dis lequel des deux tu as pris). PDF simples, générés par toi, tous sur
le même gabarit : seule l'erreur change d'un cas à l'autre.

| Cas | Erreur volontaire | Ce que le site promet (à vérifier dans `factures.ts`) |
|---|---|---|
| F0 | aucune — le témoin | lue, contrôlée, proposée à la validation sans arrêt |
| F1 | SIREN à clé fausse | arrêt « identité », motif lisible, rien de comptabilisé |
| F2 | IBAN différent de celui déjà connu du fournisseur (deux pièces : la première pose l'IBAN, la seconde le change) | alerte « changement d'IBAN », validation par une personne |
| F3 | TVA à 19 % facturée par un fournisseur établi en France | arrêt « TVA », libellé qui dit *pourquoi* |
| F4a | doublon exact de F0 (même numéro, même fournisseur, même montant) | écartée comme doublon, pas de seconde facture |
| F4b | même numéro que F0, montant à 2 € près | signalée, pas écartée en silence |
| F5 | total TTC ≠ HT + TVA | arrêt « montant » |
| F6 | avoir qui ne cite aucune facture d'origine | avoir retenu jusqu'à rapprochement |
| F7 | un relevé d'heures d'intérim déposé comme facture | reconnu comme autre chose qu'une facture, pas comptabilisé comme telle |
| F8 | facture à trois taux (exo / 8,5 / 2,1) sur trois lignes — **juste**, mais piège | lue avec la ventilation exacte, aucun arrêt |
| F9 | facture adressée à une autre société que le client banc | arrêt « destinataire » |
| F10 | date de facture dans le futur (J+40) | arrêt ou avertissement « date », à relever |
| F11 | deux factures dans un seul PDF | découpage en deux pièces, ou arrêt explicite — jamais une seule facture avec le total des deux |
| F12 | IBAN partiellement masqué sur la pièce (« FR76 **** **** 1234 ») | pas d'« IBAN absent » ; IBAN à compléter, aucun virement noté |

Après la série : rejoue-la **à l'identique**. Attendu : zéro nouvelle facture (doublons
exacts), zéro nouvel arrêt, et un journal qui dit ce qui s'est passé.

Deuxième série, si la première est propre : le circuit de validation (deux approbations
au-delà d'un seuil, délégation datée, saisie et approbation par deux personnes distinctes —
`factures.ts` le promet), puis la sortie comptable (export CSV lisible par un expert-comptable :
comptes 401 / 44566 / 512, FEC).

## Niveau 2 (plus tard, avec le coordinateur)

Les vraies pièces NOBAT sont dans le banc de l'ouvrier, pas dans le tien. Quand le
coordinateur te le dit, tu relis **ses** résultats sur ces pièces (par l'écran et les portes de
lecture) et tu notes, ligne par ligne, si ce que FILED a fait correspond à ce que la pièce
montre. Tu ne les redéposes pas.

## Résultats

| Cas | Promesse (fichier:ligne) | Erreur volontaire | Attendu | Ce que FILED a fait | Verdict | Niveau |
|---|---|---|---|---|---|---|
| F0 | lib/produits/capacites/factures.ts:55, :61, :83 | aucune (témoin) — MCD-2026-1001, HT 780,00 / TVA 8,5 % 66,30 / TTC 846,30 | lue, contrôlée, proposée à la validation sans arrêt | à jouer | — | — |
| F1 | lib/produits/capacites/factures.ts:58 | SIREN 912345629 à clé Luhn fausse (Quincaillerie du Moule, fictive) | arrêt « identité », motif lisible, rien de comptabilisé | à jouer | — | — |
| F2a | lib/produits/capacites/factures.ts:57 | aucune — pose l'IBAN …4560 340 de Béton Archipel (BAR-2026-0501) | lue, aucun arrêt, IBAN retenu pour le fournisseur | à jouer | — | — |
| F2b | lib/produits/capacites/factures.ts:57 | même fournisseur, IBAN changé en …6540 309 (BAR-2026-0502) | alerte « changement d'IBAN », validation par une personne | à jouer | — | — |
| F3 | lib/produits/capacites/factures.ts:135-136 ; :44 | TVA 19 % (HT 780 / TVA 148,20 / TTC 928,20, cohérent) | **contradiction** : le brief attend un arrêt « TVA » ; le site (l. 135-136) promet qu'« un taux exotique passe s'il tombe juste ». Voir Q3. | à jouer | — | — |
| F4a | lib/produits/capacites/factures.ts:56 ; :139-140 | doublon de F0 régénéré (autres octets, même contenu, autre nom) | écartée comme doublon, reste consultable, pas de seconde facture | à jouer | — | — |
| F4b | lib/produits/capacites/factures.ts:56 | même numéro que F0, ciment 9,84 € au lieu de 9,80 → TTC 848,47 | signalée, pas écartée en silence (aucune promesse explicite du site : à défaut, « pas couvert ») | à jouer | — | — |
| F5 | lib/produits/capacites/factures.ts:55 ; :127-128 | TTC imprimé 856,30 au lieu de 846,30 (écart 10 €) | arrêt « montant » (seuil promis : 5 centimes) | à jouer | — | — |
| F6 | — (BANDEAU « Avoir », lib/produits/factures.ts:76) | avoir MCD-AV-2026-0042, −108,50 TTC, sans facture d'origine citée | retenu jusqu'à rapprochement (promesse du brief, rien d'écrit sur le site) | à jouer | — | — |
| F7 | — (BANDEAU « Relevé », lib/produits/factures.ts:77) | relevé d'heures d'intérim (39 h, aucun montant) déposé comme facture | reconnu comme non-facture, pas comptabilisé ; à défaut au moins « champs manquants / total nul » (:61, :147-148) | à jouer | — | — |
| F8 | lib/produits/capacites/factures.ts:44 ; :135-136 | aucune — 3 taux : exo art. 295 300,00 / 8,5 % 490,00 → 41,65 / 2,1 % 200,00 → 4,20 ; TTC 1 035,85 | lue avec la ventilation exacte, aucun arrêt | à jouer | — | — |
| F9 | — (aucune ligne trouvée) | facturée à « SOCIÉTÉ TIERCE BTP SARL » au lieu du client banc | arrêt « destinataire » (promesse du brief seulement) | à jouer | — | — |
| F10 | lib/produits/capacites/factures.ts:155-156 (cas inverse) | date d'émission 30/11/2026 (J+40) | arrêt ou avertissement « date » | à jouer | — | — |
| F11 | lib/produits/capacites/factures.ts:31 ; :143-144 | deux factures dans un PDF (MCD-2026-1011 846,30 + MCD-2026-1012 265,83) | anomalie explicite (l. 143-144 : « pas de découpage automatique ») — jamais une facture de 1 112,13 ni classée sur la première | à jouer | — | — |
| F12 | lib/produits/capacites/factures.ts:57 | IBAN masqué « FR76 **** **** 0146 » (4 derniers = IBAN connu de MCD) | pas d'« IBAN absent » ni d'alerte changement ; IBAN à compléter, aucun virement noté | à jouer | — | — |
| R | lib/produits/capacites/factures.ts:56 ; GUIDE-DEPOT « Bon à savoir » | rejeu des 15 fichiers à l'identique | zéro nouvelle facture, zéro nouvel arrêt, journal qui dit ce qui s'est passé | à jouer | — | — |

## Écarts

(aucun encore — format : `TFILED-01 · cas · reproduction exacte · réponse brute · écran`)

### Jeu d'essai série 1 (prêt, pas encore joué)

- Générateur : `omega/testeur-filed/generer_pieces.py` → `omega/testeur-filed/pieces/*.pdf` (15 fichiers, même gabarit).
- **Tout est fictif** : quatre fournisseurs inventés (SIREN 91234561-8, 91234562-9 à clé fausse,
  91234563-4, 91234564-2 — clé Luhn calculée, aucun contrôle de registre : un arrêt « registre » sur
  ces quatre SIREN est donc *attendu*), IBAN sur le code banque 99999 (inexistant), intérimaire fictif.
- Ordre de jeu : F0, F2a, puis F1, F3, F4a, F4b, F5, F6, F7, F8, F9, F10, F11, F12, F2b ; puis rejeu à l'identique.
- Client facturé sur les pièces : « BANC TEST FILED SAS, Zone d'essai, lot 0, 97122 Baie-Mahault » (voir Q4).

## Questions au coordinateur

Rien n'est joué tant que Q1 et Q2 n'ont pas de réponse : le jeu d'essai est prêt et attend.

- **Q1** — La porte de dépôt d'une pièce pour `banc-test-filed` (identifiant du client banc, et soit
  l'adresse de dépôt WebDAV + identifiant `depot-…`/mot de passe, soit la RPC `public.*` à appeler).
  Cette session n'a **aucune clé de la recette** : la clé de service ou les identifiants doivent m'être
  donnés par le canal que tu choisis (pas dans ce fichier).
- **Q2** — Un compte « gérant » et un compte « valideur » du client banc pour l'écran `app/espace2/filed`,
  et l'origine à viser (URL de la recette de l'écran).
- **Q3** — F3 : le brief attend un arrêt « TVA » pour 19 % ; `capacites/factures.ts:135-136` promet le
  contraire (un taux exotique cohérent passe). Laquelle des deux est la promesse ? Je note pour l'instant
  le site comme attendu, et le brief comme écart possible *du site*.
- **Q4** — Raison sociale et adresse du client banc, pour que F0 soit bien « adressée au client » et que
  F9 ne soit la seule à porter une erreur de destinataire. À défaut, j'utilise « BANC TEST FILED SAS ».
- **Q5** — Une porte de lecture du résultat (statut, motif d'arrêt, ventilation TVA, IBAN retenu,
  journal) par pièce, autre que l'écran ? Sinon je lis tout à l'écran.
- **Q6** — F4b, F6, F7, F9, F10, F12 n'ont pas de ligne du site qui les promette : je les joue avec
  l'attendu du brief et je classerai « pas couvert » s'ils passent sans bruit. D'accord ?

## REPRISE

**Arrêt 1 — 21/10/2026**
- Fait : contrat, brief, promesses (`capacites/factures.ts`, `factures.ts`), GUIDE-DEPOT, GUIDE-LOGICIELS-COMPTABLES lus ; jeu d'essai série 1 généré (15 PDF) ; attendus écrits avant jeu.
- En cours : rien — aucun dépôt fait.
- Prochain pas : jouer F0 → F2b dans l'ordre ci-dessus, lire, remplir le tableau, puis rejeu.
- Questions : Q1 et Q2 bloquantes ; Q3–Q6 à trancher avant de rendre les verdicts.
- SHA d'arrêt : voir le commit « T-FILED série 1 : jeu d'essai prêt » sur `testeur-filed`.
