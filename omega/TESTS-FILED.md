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
| F0 | lib/produits/capacites/factures.ts:55, :61, :83 | aucune (témoin) — MCD-2026-1001, HT 780,00 / TVA 8,5 % 66,30 / TTC 846,30 | lue, contrôlée, proposée à la validation sans arrêt | lu 780,00/66,30/846,30 (exact) · bloquée · 1 bloquant/1 attention · {fournisseur.a_confirmer, identite.registre} | juste sur la lecture et les montants ; « sans arrêt » **pas testable** avec un SIREN fictif (arrêt registre attendu, contrat § 1 r. 5) — voir Q9, Q11 | 1
| F1 | lib/produits/capacites/factures.ts:58 | SIREN 912345629 à clé Luhn fausse (Quincaillerie du Moule, fictive) | arrêt « identité », motif lisible, rien de comptabilisé | lu 780,00/66,30/846,30 · bloquée · 1/3 · {identite.siren, identite.tva_intracom, tva.numero, fournisseur.a_confirmer} | **juste** (arrêt identité, motifs lisibles, rien de comptabilisé) | 1
| F2a | lib/produits/capacites/factures.ts:57 | aucune — pose l'IBAN …4560 340 de Béton Archipel (BAR-2026-0501) | lue, aucun arrêt, IBAN retenu pour le fournisseur | lu 780,00/66,30/846,30 · bloquée · 2/0 · IBAN lu · {fournisseur.a_confirmer, identite.registre} | juste sur la lecture et l'IBAN ; 2/0 contre 1/1 pour F0 dans la même situation (Q9) | 1
| F2b | lib/produits/capacites/factures.ts:57 | même fournisseur, IBAN changé en …6540 309 (BAR-2026-0502) | alerte « changement d'IBAN », validation par une personne | lu 780,00/66,30/846,30 · bloquée · 3/0 · IBAN lu · {doublon.probable, fournisseur.a_confirmer, identite.registre} — **aucune anomalie IBAN** | **écart** TFILED-02 | 1
| F3 | lib/produits/capacites/factures.ts:135-136 ; :44 | TVA 19 % (HT 780 / TVA 148,20 / TTC 928,20, cohérent) | passe sans arrêt si HT/TVA/TTC tombent juste (le site fait foi, réponse Q3) — divergence notée : le brief attendait un arrêt « TVA » | lu 780,00/148,20/928,20 (exact) · bloquée · 2/1 · {fournisseur.a_confirmer, identite.registre, **tva.taux**} | **écart** TFILED-03 (au sens du site, qui fait foi ; conforme au brief) — sous réserve Q9 | 1
| F4a | lib/produits/capacites/factures.ts:56 ; :139-140 | doublon de F0 régénéré (autres octets, même contenu, autre nom) | écartée comme doublon, reste consultable, pas de seconde facture | lu identique à F0 · **écartée** · doublon oui · {doublon.exact, …} | **juste** (écartée, reste consultable, pas de seconde facture) | 1
| F4b | lib/produits/capacites/factures.ts:56 | même numéro que F0, ciment 9,84 € au lieu de 9,80 → TTC 848,47 | signalée, pas écartée en silence (aucune promesse explicite du site : à défaut, « pas couvert ») | lu 782,00/66,47/848,47 (exact) · bloquée (pas écartée) · {**doublon.exact**, …} | signalée, pas écartée : conforme au brief ; **écart de motif** TFILED-04 | 1
| F5 | lib/produits/capacites/factures.ts:55 ; :127-128 | TTC imprimé 856,30 au lieu de 846,30 (écart 10 €) | arrêt « montant » (seuil promis : 5 centimes) | lu 780,00/66,30/856,30 (TTC imprimé) · bloquée · 2/1 · {montant.coherence, …} | **juste** (arrêt montant) | 1
| F6 | — (BANDEAU « Avoir », lib/produits/factures.ts:76) | avoir MCD-AV-2026-0042, −108,50 TTC, sans facture d'origine citée | retenu jusqu'à rapprochement (promesse du brief, rien d'écrit sur le site) | nature **avoir** · lu 100,00/8,50/108,50 · bloquée · 1/2 · {avoir.origine, …} | pas de promesse — retenu avec motif lisible, conforme au brief (pas « pas couvert » : il ne passe pas sans bruit) | 1
| F7 | — (BANDEAU « Relevé », lib/produits/factures.ts:77) | relevé d'heures d'intérim (39 h, aucun montant) déposé comme facture | reconnu comme non-facture, pas comptabilisé ; à défaut au moins « champs manquants / total nul » (:61, :147-148) | état **classe**, nature **autre** · aucun montant, aucune facture | pas de promesse — reconnu comme non-facture, conforme au brief | 1
| F8 | lib/produits/capacites/factures.ts:44 ; :135-136 | aucune — 3 taux : exo art. 295 300,00 / 8,5 % 490,00 → 41,65 / 2,1 % 200,00 → 4,20 ; TTC 1 035,85 | lue avec la ventilation exacte, aucun arrêt | lu 990,00/45,85/1 035,85 (exact) · bloquée · 1/1 · {fournisseur.a_confirmer, identite.registre} — aucun arrêt TVA | **juste** sur les totaux et l'absence d'arrêt propre ; ventilation par taux **non lue** (pas relayée, Q10) | 1
| F9 | — (aucune ligne trouvée) | facturée à « SOCIÉTÉ TIERCE BTP SARL » au lieu du client banc | arrêt « destinataire » (promesse du brief seulement) | lu 780,00/66,30/846,30 · bloquée · 2/1 · {doublon.probable, …} — **aucune anomalie destinataire** | **pas couvert** TFILED-05 (promesse manquante du site, à Teo) | 1
| F10 | lib/produits/capacites/factures.ts:155-156 (cas inverse) | date d'émission 30/11/2026 (J+40) | arrêt ou avertissement « date » | lu 780,00/66,30/846,30 · bloquée · 2/1 · {**date.future**, …} | pas de promesse — arrêt « date », conforme au brief | 1
| F11 | lib/produits/capacites/factures.ts:31 ; :143-144 | deux factures dans un PDF (MCD-2026-1011 846,30 + MCD-2026-1012 265,83) | anomalie explicite (l. 143-144 : « pas de découpage automatique ») — jamais une facture de 1 112,13 ni classée sur la première | **découpé en deux pièces** : MCD-2026-1011 780,00/66,30/846,30 et MCD-2026-1012 245,00/20,83/265,83 (exacts, document « F11_deux_factures-p2.pdf ») · chacune bloquée (registre ; 1ʳᵉ + doublon.probable) | **juste** contre `:31` ; le texte du site `:143-144` dit le contraire — constat TFILED-06 | 1
| F12 | lib/produits/capacites/factures.ts:57 | IBAN masqué « FR76 **** **** 0146 » (4 derniers = IBAN connu de MCD) | aucune alerte « changement d'IBAN » sur un IBAN masqué dont la fin colle (:57) ; « IBAN à compléter / aucun virement » = pas de promesse (Q6) | lu 780,00/66,30/846,30 · bloquée · 2/2 · IBAN lu **non** · {iban.masque, doublon.probable, …} — aucune alerte changement d'IBAN | **juste** pour `:57` ; « IBAN à compléter » relevé (iban.masque) conforme au brief | 1
| R | lib/produits/capacites/factures.ts:56 ; GUIDE-DEPOT « Bon à savoir » | rejeu des 15 fichiers à l'identique | zéro nouvelle facture, zéro nouvel arrêt, journal qui dit ce qui s'est passé | passe 2 (20 h 08 Z, mêmes octets, dossier p2/) : 15 fichiers en état **doublon**, motif « Même fichier que la pièce R2026-0000NN, reçue le 21/10/2026 : écartée, elle rest… » (NN 01→15), aucune facture créée | **juste** (idempotence ; le motif dit ce qui s'est passé) | 1

## Écarts

Format : `TFILED-nn · cas · reproduction exacte · réponse brute · écran`.

**TFILED-01 · observation (requalifiée par le coordinateur) · limite d'accès du testeur, pas défaut produit**
Les quatre portes de lecture données (`filed_pieces_en_cours`, `filed_etat_comptabilisation`, `filed_etat_paiement`,
`filed_etat_reprise`, client `dddddddd-…00f1`, sous le gérant `eeeeeeee-…01f1`, lecture seule) ne rendent qu'un agrégat :
`[{categorie: "bloquees", nombre: 14, montant_ttc: 10813.55}]`, comptabilisation vide, paiement `null`, reprise `[[]]`.
Le détail par pièce n'est lisible qu'à l'écran `/espace2` ; il m'a été **relayé brut par le coordinateur** (21/10, 20 h 10).
L'écart de 629,30 € entre l'agrégat et les TTC imprimés s'explique par le relais : F4a écartée (846,30), F7 hors facture,
avoir F6 compté positif (+108,50 au lieu de −108,50) : 11 442,85 − 846,30 + 2 × 108,50 = 10 813,55. **Le moteur compte l'avoir
F6 en positif dans les montants bloqués** (lu 100,00/8,50/108,50, nature avoir) : observation à confirmer, voir Q10.

Reproduction commune à TFILED-02 à 06 : les 15 PDF de `omega/testeur-filed/pieces/` (commit 4d9e5eee), déposés par le
coordinateur via le dépôt par lot (GUIDE-DEPOT) sur `banc-test-filed`, le 21/10 à 20 h 06 Z, dans l'ordre de `serie1.sql`.
Lecture par le coordinateur à l'écran ou en lecture seule, relayée brute ; lignes citées ci-dessous telles quelles.

**TFILED-02 · F2b · changement d'IBAN non signalé** (`capacites/factures.ts:57`)
- Déposé : `F2a_iban_pose.pdf` (Béton Archipel, SIREN 912345634, IBAN `FR76 9999 9000 0100 0123 4560 340`), puis `F2b_iban_change.pdf`
  (même fournisseur, n° BAR-2026-0502, IBAN `FR76 9999 9000 0100 0987 6540 309`).
- Réponse brute : `F2b · integre · facture · BAR-2026-0502 · 780.00/66.30/846.30 · bloquee · 3/0 · non · oui · {doublon.probable, fournisseur.a_confirmer, identite.registre}`.
- Attendu : alerte « changement de coordonnées bancaires ». Aucune anomalie `iban.*`. Réserve : le fournisseur est
  `a_confirmer`, et le site dit « chez un fournisseur **connu** ». Si « connu » veut dire « confirmé », il faut le refaire après
  confirmation de BAR (Q11). Sinon, l'écart tient.

**TFILED-03 · F3 · un taux de 19 % cohérent est arrêté** (`capacites/factures.ts:135-136`, le site fait foi selon Q3)
- Déposé : `F3_tva_19.pdf`, MCD-2026-1003, HT 780,00, TVA 19 % 148,20, TTC 928,20 (cohérent).
- Réponse brute : `F3 · integre · facture · MCD-2026-1003 · 780.00/148.20/928.20 · bloquee · 2/1 · non · oui · {fournisseur.a_confirmer, identite.registre, tva.taux}`.
- Le site promet qu'un taux exotique qui tombe juste passe. Le moteur pose `tva.taux`. Comparé à F0 (1/1, même base), F3 a
  **un bloquant de plus** : `tva.taux` est donc vraisemblablement bloquant. À confirmer (Q9). S'il n'est qu'une « attention »,
  le verdict devient juste. Le brief attendait cet arrêt : la divergence brief/site est déjà remontée.

**TFILED-04 · F4b · motif « doublon.exact » sur une pièce dont le montant diffère**
- Déposé : `F4b_meme_numero_2eur.pdf`, même n° que F0 (MCD-2026-1001), ciment à 9,84 € au lieu de 9,80 €, TTC 848,47.
- Réponse brute : `F4b · integre · facture · MCD-2026-1001 · 782.00/66.47/848.47 · bloquee · 2/1 · non · oui · {doublon.exact, fournisseur.a_confirmer, identite.registre}`.
- Le comportement est bon : signalée, pas écartée, montants lus exacts. Le motif dit « exact » alors que les montants diffèrent
  de 2,17 € TTC. Un comptable qui lit « doublon exact » écarte la pièce, et elle se perd. Écart de motif (contrat § 3).

**TFILED-05 · F9 · facture adressée à une autre société : rien ne le relève** (pas couvert)
- Déposé : `F9_autre_destinataire.pdf`, facturée à « SOCIÉTÉ TIERCE BTP SARL, 97200 Fort-de-France » au lieu de « banc-test-filed ».
- Réponse brute : `F9 · integre · facture · MCD-2026-1009 · 780.00/66.30/846.30 · bloquee · 2/1 · non · oui · {doublon.probable, fournisseur.a_confirmer, identite.registre}`.
- Aucune anomalie `destinataire`. Les arrêts présents viennent d'ailleurs (registre, doublon probable). Avec un fournisseur
  confirmé et un montant unique, la pièce entrerait. Aucune ligne du site ne le promet : c'est une **promesse manquante, à
  remonter à Teo** (Q6 corrigée).

**TFILED-06 · F11 · le moteur découpe, le site dit qu'il ne découpe pas** (constat sur le site, pas sur le moteur)
- Déposé : `F11_deux_factures.pdf` (2 pages : MCD-2026-1011 TTC 846,30, MCD-2026-1012 TTC 265,83).
- Réponse brute : deux pièces, `MCD-2026-1011 · 780.00/66.30/846.30` et, document « F11_deux_factures-p2.pdf », `MCD-2026-1012 · 245.00/20.83/265.83`.
- `capacites/factures.ts:31` (« découpé pièce par pièce », atteste false) est tenu. `:143-144` dit « la pièce part en anomalie… le
  découpage automatique n'existe pas encore » : le texte public est en retard sur le moteur. C'est à Teo d'en décider : les pages
  sont gelées (règle du 06/10).

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

- **Q9** — Pour chaque pièce, quelles anomalies sont **bloquantes** et lesquelles sont de simple « attention » ? Il faut le
  savoir pour TFILED-03 (est-ce `tva.taux` qui bloque ?) et pour la ligne `:151-152` (est-ce `fournisseur.a_confirmer` qui
  bloque ? Le site promet qu'une pièce d'un fournisseur inconnu est classée avec le nom lu). Il faut aussi l'expliquer : F0
  donne 1/1, F2a donne 2/0 dans la même situation.
- **Q10** — F8 : la ventilation lue par taux (exo 300,00 ; 2,1 % 200,00 → 4,20 ; 8,5 % 490,00 → 41,65). F6 : le signe de l'avoir
  (lu +108,50) et la façon dont il compte dans l'agrégat « bloquées ».
- **Q11** — Feu vert pour une série 1b sur le SIREN public d'une société réelle, avec des montants inventés : témoin F0, F2a/F2b, F3.
  Et la confirmation, par le gérant à l'écran, d'un fournisseur avant F2b, pour tester `:57` « chez un fournisseur connu ».
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

**Arrêt 5 — 21/10/2026, 20 h 25** (remplace les arrêts précédents)
- Fait : série 1, passes 1 et 2, jouée par dépôt par lot ; verdicts posés au niveau 1. Juste : F1, F4a, F5, F8 (totaux), F11 (contre la l. 31), F12, rejeu. Écarts : TFILED-02, 03, 04. Pas couvert : TFILED-05. Constat sur le site : TFILED-06.
- En cours : rien.
- Prochain pas : série 1b, si le coordinateur la valide. Un témoin et F2/F3 sur un fournisseur dont le SIREN est public et réel, montants inventés, pour lever l'arrêt registre et tester « sans arrêt » ; F2b rejoué après confirmation du fournisseur. Ensuite la série 2 (validation, export).
- Questions : Q9 (quelles anomalies sont bloquantes, pièce par pièce), Q10 (ventilation TVA de F8 ; signe de l'avoir F6), Q11 (feu vert pour 1b et pour la confirmation d'un fournisseur).
- SHA d'arrêt : voir le commit « T-FILED série 1 : verdicts » sur `testeur-filed`.
