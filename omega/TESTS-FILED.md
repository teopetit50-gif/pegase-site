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
| F0 | lib/produits/capacites/factures.ts:55, :61, :83 | aucune (témoin) — MCD-2026-1001, HT 780,00 / TVA 8,5 % 66,30 / TTC 846,30 | lue, contrôlée, proposée à la validation sans arrêt | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| F1 | lib/produits/capacites/factures.ts:58 | SIREN 912345629 à clé Luhn fausse (Quincaillerie du Moule, fictive) | arrêt « identité », motif lisible, rien de comptabilisé | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| F2a | lib/produits/capacites/factures.ts:57 | aucune — pose l'IBAN …4560 340 de Béton Archipel (BAR-2026-0501) | lue, aucun arrêt, IBAN retenu pour le fournisseur | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| F2b | lib/produits/capacites/factures.ts:57 | même fournisseur, IBAN changé en …6540 309 (BAR-2026-0502) | alerte « changement d'IBAN », validation par une personne | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| F3 | lib/produits/capacites/factures.ts:135-136 ; :44 | TVA 19 % (HT 780 / TVA 148,20 / TTC 928,20, cohérent) | passe sans arrêt si HT/TVA/TTC tombent juste (le site fait foi, réponse Q3) — divergence notée : le brief attendait un arrêt « TVA » | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| F4a | lib/produits/capacites/factures.ts:56 ; :139-140 | doublon de F0 régénéré (autres octets, même contenu, autre nom) | écartée comme doublon, reste consultable, pas de seconde facture | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| F4b | lib/produits/capacites/factures.ts:56 | même numéro que F0, ciment 9,84 € au lieu de 9,80 → TTC 848,47 | signalée, pas écartée en silence (aucune promesse explicite du site : à défaut, « pas couvert ») | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | **pas de promesse** → « pas couvert » s'il passe sans bruit (Q6 corrigée) | 1 (en attente)
| F5 | lib/produits/capacites/factures.ts:55 ; :127-128 | TTC imprimé 856,30 au lieu de 846,30 (écart 10 €) | arrêt « montant » (seuil promis : 5 centimes) | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| F6 | — (BANDEAU « Avoir », lib/produits/factures.ts:76) | avoir MCD-AV-2026-0042, −108,50 TTC, sans facture d'origine citée | retenu jusqu'à rapprochement (promesse du brief, rien d'écrit sur le site) | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | **pas de promesse** → « pas couvert » s'il passe sans bruit (Q6 corrigée) | 1 (en attente)
| F7 | — (BANDEAU « Relevé », lib/produits/factures.ts:77) | relevé d'heures d'intérim (39 h, aucun montant) déposé comme facture | reconnu comme non-facture, pas comptabilisé ; à défaut au moins « champs manquants / total nul » (:61, :147-148) | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | **pas de promesse** → « pas couvert » s'il passe sans bruit (Q6 corrigée) | 1 (en attente)
| F8 | lib/produits/capacites/factures.ts:44 ; :135-136 | aucune — 3 taux : exo art. 295 300,00 / 8,5 % 490,00 → 41,65 / 2,1 % 200,00 → 4,20 ; TTC 1 035,85 | lue avec la ventilation exacte, aucun arrêt | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| F9 | — (aucune ligne trouvée) | facturée à « SOCIÉTÉ TIERCE BTP SARL » au lieu du client banc | arrêt « destinataire » (promesse du brief seulement) | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | **pas de promesse** → « pas couvert » s'il passe sans bruit (Q6 corrigée) | 1 (en attente)
| F10 | lib/produits/capacites/factures.ts:155-156 (cas inverse) | date d'émission 30/11/2026 (J+40) | arrêt ou avertissement « date » | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | **pas de promesse** → « pas couvert » s'il passe sans bruit (Q6 corrigée) | 1 (en attente)
| F11 | lib/produits/capacites/factures.ts:31 ; :143-144 | deux factures dans un PDF (MCD-2026-1011 846,30 + MCD-2026-1012 265,83) | anomalie explicite (l. 143-144 : « pas de découpage automatique ») — jamais une facture de 1 112,13 ni classée sur la première | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| F12 | lib/produits/capacites/factures.ts:57 | IBAN masqué « FR76 **** **** 0146 » (4 derniers = IBAN connu de MCD) | aucune alerte « changement d'IBAN » sur un IBAN masqué dont la fin colle (:57) ; « IBAN à compléter / aucun virement » = pas de promesse (Q6) | passe 1 lue (20 h 08 Z) : **non lisible par pièce** par les portes données — voir TFILED-01 | — | 1 (en attente)
| R | lib/produits/capacites/factures.ts:56 ; GUIDE-DEPOT « Bon à savoir » | rejeu des 15 fichiers à l'identique | zéro nouvelle facture, zéro nouvel arrêt, journal qui dit ce qui s'est passé | à jouer | — | — |

## Écarts

Format : `TFILED-nn · cas · reproduction exacte · réponse brute · écran`.

**TFILED-01 · toute la série · aucune porte de lecture ne donne l'état d'une pièce** (constat, pas un défaut du moteur)
- Reproduction : passe 1 déposée par le coordinateur via le dépôt par lot (15 PDF de `omega/testeur-filed/pieces/`, 20 h 06 Z,
  lecteur fini 20 h 08 Z). Lecture sur la recette, transaction `read only`, rôle `authenticated`, `sub` = gérant
  `eeeeeeee-0000-4000-8000-0000000001f1` :
  `select * from public.filed_pieces_en_cours('dddddddd-0000-4000-8000-0000000000f1', null)` et `filed_etat_comptabilisation`,
  `filed_etat_paiement`, `filed_etat_reprise` sur le même client.
- Réponse brute : `pieces_en_cours = [{categorie: "bloquees", libelle: "Bloquées par un contrôle", nombre: 14, montant_ttc: 10813.55}]` ;
  `comptabilisation = [{reservee: false, comptables: [], separation: false}]` ; `paiement = null` ; `reprise = [[]]`.
- Ce qu'on ne peut pas lire : le motif d'arrêt, les montants lus, la ventilation TVA, l'IBAN retenu ou l'alerte, le doublon, le journal,
  **pièce par pièce**. Le site promet pourtant qu'une pièce bloquée « vous est signalée » (`factures.ts:283`) et qu'il y a « un journal de
  tout ce qui a été lu » (`factures.ts:239`). Sans écran ni porte par pièce, aucun verdict n'est rendable.
- Ce que l'agrégat dit déjà (sans verdict) : 14 pièces bloquées sur 16 documents (dont 15 à l'état « integre » selon le coordinateur). Le jeu
  compte au moins 4 cas qui devraient passer (F0, F2a, F3 au sens du site, F8) : au moins 2 d'entre eux sont donc arrêtés. Cause possible et
  **attendue** par le contrat (§ 1, règle 5) : le contrôle « registre » sur les SIREN fictifs. Seul le motif par pièce départagera.
- Le total bloqué (10 813,55 €) ne correspond à aucune combinaison simple des TTC imprimés (total imprimé des 16 : 11 442,85 €, écart 629,30 €) :
  au moins une pièce a été lue avec un autre montant que celui imprimé. Impossible de dire laquelle sans lecture par pièce.

### Jeu d'essai série 1 (prêt, pas encore joué)

- Générateur : `omega/testeur-filed/generer_pieces.py` → `omega/testeur-filed/pieces/*.pdf` (15 fichiers, même gabarit).
- **Tout est fictif** : quatre fournisseurs inventés (SIREN 91234561-8, 91234562-9 à clé fausse,
  91234563-4, 91234564-2 — clé Luhn calculée, aucun contrôle de registre : un arrêt « registre » sur
  ces quatre SIREN est donc *attendu*), IBAN sur le code banque 99999 (inexistant), intérimaire fictif.
- Ordre de jeu : F0, F2a, puis F1, F3, F4a, F4b, F5, F6, F7, F8, F9, F10, F11, F12, F2b ; puis rejeu à l'identique.
- Client facturé sur les pièces : « banc-test-filed, Zone d'essai, lot 0, 97122 Baie-Mahault » (raison sociale de Q4 ; pièces régénérées le 21/10 à 19 h 20, sha256 à jour dans serie1.sql).

## Questions au coordinateur

**Réponse du coordinateur (21/10, 19 h 12)** : client banc `dddddddd-0000-4000-8000-0000000000f1` (entité principale GP),
porte `public.filed_deposer_piece(...)`, fichier préalablement dans le stockage ; comptes écran demandés au bureau.
Cette session ne peut pas téléverser dans le stockage → les appels sont écrits dans
`omega/testeur-filed/serie1.sql` (15 pièces × 2 passes, sha256 et tailles calculés), **à jouer par le coordinateur**.

**Réponses du coordinateur (21/10, 19 h 16)** : Q1, pas de clé pour cette session ; le dépôt des PDF dans le stockage est demandé
au bureau (il les dépose depuis la branche, ou il donne l'accès Supabase à cette session). La série F est en attente. Q2, gérant
`eeeeeeee-0000-4000-8000-0000000001f1`, valideur `eeeeeeee-0000-4000-8000-0000000002f1` ; leurs mots de passe pour l'écran sont
demandés au bureau. Q3, le site fait foi. Q4, raison sociale « banc-test-filed », territoire GP. Q5, lecture en SELECT seul, sous
l'identité du gérant (RLS), sur `filed_documents`, `filed_factures` et `pieces_valeurs`. Q6, on note « pas de promesse », sans verdict.

- **Q7** — Le bucket et le préfixe de chemin que FILED lit (j'ai mis `<client>/testeur-filed/p<passe>/<fichier>.pdf`),
  la valeur attendue de `p_source`, et s'il faut l'uuid de l'entité principale dans `p_entite`.


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

**Arrêt 4 — 21/10/2026, 20 h 15** (remplace les arrêts précédents)
- Fait : contrat, brief, promesses (`capacites/factures.ts`, `factures.ts`), GUIDE-DEPOT, GUIDE-LOGICIELS-COMPTABLES lus ; jeu d'essai série 1 généré (15 PDF) ; attendus écrits avant jeu.
- En cours : passe 1 déposée et lue par le moteur ; passe 2 déposée à 20 h 08 Z, lecture en cours. Lecture par pièce impossible (TFILED-01).
- Prochain pas : relire les portes après la passe 2 (comparer l'agrégat : attendu 14 bloquées inchangé) ; rendre les verdicts par pièce dès qu'une porte par pièce ou l'écran existe.
- Questions : **Q8** : une porte de lecture par pièce (motif d'arrêt, montants, TVA, IBAN, doublon) ou les mots de passe de l'écran pour le gérant et le valideur. Q7 est répondue (bucket omega-clients, source depot, entité null). Q6 est corrigée : un cas qui passe sans bruit se note « pas couvert », c'est une promesse qui manque au site.
- SHA d'arrêt : voir le commit « T-FILED série 1 : jeu d'essai prêt » sur `testeur-filed`.
