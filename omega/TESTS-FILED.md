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
| F0 | lib/produits/capacites/factures.ts:55, :61, :83 | aucune (témoin) — MCD-2026-1001, HT 780,00 / TVA 8,5 % 66,30 / TTC 846,30 | lue, contrôlée, proposée à la validation sans arrêt | lu 780,00/66,30/846,30 (exact) · bloquée · 1 bloquant/1 attention · {fournisseur.a_confirmer, identite.registre} | juste sur la lecture et les montants ; bloquée par `fournisseur.a_confirmer` **B** et `identite.registre` **B** (VIES) → « sans arrêt » non atteint, voir TFILED-07 ; à refaire en 1b après confirmation | 1
| F1 | lib/produits/capacites/factures.ts:58 | SIREN 912345629 à clé Luhn fausse (Quincaillerie du Moule, fictive) | arrêt « identité », motif lisible, rien de comptabilisé | lu 780,00/66,30/846,30 · bloquée · 1/3 · {identite.siren, identite.tva_intracom, tva.numero, fournisseur.a_confirmer} ; **gravités (Q9)** : seul `fournisseur.a_confirmer` est bloquant, les trois `identite.*`/`tva.numero` ne sont qu'en **attention** ; **après confirmation du fournisseur (20 h 29 Z)** : statut **`a_valider`**, aucun bloquant | **écart** TFILED-11 (verdict « juste » du 21/10 20 h 25 **retiré** : l'arrêt ne tenait qu'à `fournisseur.a_confirmer`) | 1
| F2a | lib/produits/capacites/factures.ts:57 | aucune — pose l'IBAN …4560 340 de Béton Archipel (BAR-2026-0501) | lue, aucun arrêt, IBAN retenu pour le fournisseur | lu 780,00/66,30/846,30 · bloquée · 2/0 · IBAN lu · {fournisseur.a_confirmer, identite.registre} | juste sur la lecture et l'IBAN ; mêmes arrêts B que F0 (Q9 lève la différence 1/1 vs 2/0) | 1
| F2b | lib/produits/capacites/factures.ts:57 | même fournisseur, IBAN changé en …6540 309 (BAR-2026-0502) | alerte « changement d'IBAN », validation par une personne | lu 780,00/66,30/846,30 · bloquée · 3/0 · IBAN lu · {doublon.probable, fournisseur.a_confirmer, identite.registre} — **aucune anomalie IBAN** ; **1b** (fournisseur confirmé, contrôle relancé par le coordinateur) : `B · iban.nouveau · « Nouvel IBAN (FR76 •••• 0309) pour ce fournisseur : une personne le vérifie auprès de lui avant tout paiement. »` | **juste** en 1b pour un fournisseur confirmé (`:57` « fournisseur connu ») ; TFILED-02 requalifié, avec réserve | 1
| F3 | lib/produits/capacites/factures.ts:135-136 ; :44 | TVA 19 % (HT 780 / TVA 148,20 / TTC 928,20, cohérent) | passe sans arrêt si HT/TVA/TTC tombent juste (le site fait foi, réponse Q3) — divergence notée : le brief attendait un arrêt « TVA » | lu 780,00/148,20/928,20 (exact) · bloquée · 2/1 · {fournisseur.a_confirmer, identite.registre, **tva.taux**} ; **après a4_71** (contrôle relancé à 20 h 19 Z) : `attention · tva.taux · « … cohérent avec les montants (base × taux = TVA) : taux inhabituel, à vérifier, sans arrêter la facture. »` ; seul bloquant restant : `identite.registre` | **juste** après a4_71 — TFILED-03 corrigé | 1
| F4a | lib/produits/capacites/factures.ts:56 ; :139-140 | doublon de F0 régénéré (autres octets, même contenu, autre nom) | écartée comme doublon, reste consultable, pas de seconde facture | lu identique à F0 · **écartée** · doublon oui · {doublon.exact, …} | **juste** (écartée, reste consultable, pas de seconde facture) | 1
| F4b | lib/produits/capacites/factures.ts:56 | même numéro que F0, ciment 9,84 € au lieu de 9,80 → TTC 848,47 | signalée, pas écartée en silence (aucune promesse explicite du site : à défaut, « pas couvert ») | lu 782,00/66,47/848,47 (exact) · bloquée (pas écartée) · {**doublon.exact**, …} ; **après a4_72** : `bloquant · doublon.numero · « Même numéro que la pièce R2026-000001, pour un montant de 848,47 € au lieu de 846,30 € : un numéro ne sert qu'une fois. La pièce n'est pas écartée : une personne tranche (avoir, facture rectificative, erreur de numéro). »` ; `doublon.exact · ok · « Pas un doublon exact… »` | **juste** après a4_72 — TFILED-04 corrigé (motif juste, pièce non écartée) | 1
| F5 | lib/produits/capacites/factures.ts:55 ; :127-128 | TTC imprimé 856,30 au lieu de 846,30 (écart 10 €) | arrêt « montant » (seuil promis : 5 centimes) | lu 780,00/66,30/856,30 (TTC imprimé) · bloquée · 2/1 · {montant.coherence, …} | **juste** (arrêt montant) | 1
| F6 | — (BANDEAU « Avoir », lib/produits/factures.ts:76) | avoir MCD-AV-2026-0042, −108,50 TTC, sans facture d'origine citée | retenu jusqu'à rapprochement (promesse du brief, rien d'écrit sur le site) | nature **avoir** · lu 100,00/8,50/108,50 · bloquée · 1/2 · {avoir.origine, …} | pas de promesse. `avoir.origine` n'est qu'une **attention** (Q9) : l'avoir n'est retenu que par les arrêts fournisseur/registre. Sans eux, il passerait sans rapprochement → **pas couvert** probable, à vérifier en 1b | 1
| F7 | — (BANDEAU « Relevé », lib/produits/factures.ts:77) | relevé d'heures d'intérim (39 h, aucun montant) déposé comme facture | reconnu comme non-facture, pas comptabilisé ; à défaut au moins « champs manquants / total nul » (:61, :147-148) | état **classe**, nature **autre** · aucun montant, aucune facture | pas de promesse — reconnu comme non-facture, conforme au brief | 1
| F8 | lib/produits/capacites/factures.ts:44 ; :135-136 | aucune — 3 taux : exo art. 295 300,00 / 8,5 % 490,00 → 41,65 / 2,1 % 200,00 → 4,20 ; TTC 1 035,85 | lue avec la ventilation exacte, aucun arrêt | lu 990,00/45,85/1 035,85 (exact) · bloquée · 1/1 · {fournisseur.a_confirmer, identite.registre} — aucun arrêt TVA | **juste** : totaux exacts, ventilation lue exacte (exo 300 ; 8,5 % 490 ; 2,1 % 200 ; TVA 45,85), aucun arrêt TVA (Q10) | 1
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
- **Requalifié en série 1b** (21/10, 20 h 45) : Béton Archipel est confirmé en gérant, puis le coordinateur relance le contrôle serveur
  sur la facture F2b existante (`4fb3f16d-…`) → `bloquee`. Il pose `B · iban.nouveau · « Nouvel IBAN (FR76 •••• 0309) pour ce
  fournisseur : une personne le vérifie auprès de lui avant tout paiement. »`, et `fournisseur.a_confirmer` disparaît. La promesse `:57`
  est **tenue pour un fournisseur connu** : ce n'est plus un écart.
- Réserves : (1) l'alerte n'a paru qu'après un contrôle relancé à la main par le coordinateur. À la réception, un fournisseur pas encore
  confirmé ne reçoit aucune alerte IBAN, mais il est de toute façon bloqué par `a_confirmer` (voir TFILED-07). (2) **Observation** :
  après ce contrôle, Béton Archipel a **2 IBAN connus**. Il faudra vérifier qu'une 3ᵉ pièce portant l'IBAN `…0309`, avant la vérification
  humaine, déclenche encore l'alerte et ne passe pas comme un IBAN « connu ». Proposé pour la série 2.

**TFILED-03 · F3 · ✅ CORRIGÉ par a4_71, revérifié le 21/10 à 20 h 19 Z (contrôle relancé) · un taux de 19 % cohérent est arrêté** (`capacites/factures.ts:135-136`, le site fait foi selon Q3)
- Déposé : `F3_tva_19.pdf`, MCD-2026-1003, HT 780,00, TVA 19 % 148,20, TTC 928,20 (cohérent).
- Réponse brute : `F3 · integre · facture · MCD-2026-1003 · 780.00/148.20/928.20 · bloquee · 2/1 · non · oui · {fournisseur.a_confirmer, identite.registre, tva.taux}`.
- Le site promet qu'un taux exotique qui tombe juste passe. Le moteur pose `tva.taux`. Comparé à F0 (1/1, même base), F3 a
  **un bloquant de plus** : `tva.taux` est donc vraisemblablement bloquant. À confirmer (Q9). S'il n'est qu'une « attention »,
  le verdict devient juste. Le brief attendait cet arrêt : la divergence brief/site est déjà remontée.

**TFILED-04 · F4b · ✅ CORRIGÉ par a4_72, revérifié le 21/10 à 20 h 19 Z (contrôle relancé) · motif « doublon.exact » sur une pièce dont le montant diffère**
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

**TFILED-07 · F0 et toutes les pièces · une facture d'un fournisseur inconnu est bloquée, pas classée** (`capacites/factures.ts:151-152`)
- Déposé : n'importe quelle pièce de la série, par exemple `F0_temoin.pdf` (Matériaux Caraïbes Distribution, fournisseur jamais vu par le client banc).
- Réponse brute (Q9, relayée) : `F0 : fournisseur.a_confirmer B ; identite.registre B`. `fournisseur.a_confirmer` est **bloquant** sur les 16 pièces.
- Le site promet : « Le fournisseur n'existe pas encore dans votre comptabilité. La pièce est classée avec le nom lu sur la facture,
  et c'est votre comptabilité qui crée la fiche. » Le moteur arrête la pièce jusqu'à ce que le fournisseur soit confirmé. Ce
  comportement peut être voulu, puisqu'il protège le contrôle IBAN, mais il contredit la ligne publique. C'est au coordinateur de
  trancher entre lot correctif et correction du site.
- Observation annexe : sur F4a, `identite.registre` est seulement en **attention** (« pas encore confirmé par VIES »), alors qu'il est
  **bloquant** sur les 15 autres pièces pour le même fournisseur. La gravité dépend du moment de la réponse VIES.

**TFILED-09 · D1, D2 · refus de délégation par un message brut de contrainte** (socle, table `delegations`, A5 ; remonté à Teo)
- En gérant, `insert into public.delegations (client_id, delegant, delegataire, entite_id, module, debut, fin, motif)` avec
  `fin null` → `ERROR 23502: null value in column "fin" … violates not-null constraint`. Avec `debut 2026-10-29` et `fin 2026-10-22`
  → `ERROR 23514: … violates check constraint "delegations_periode"`.
- Le refus est juste (`:71`), mais le motif n'est pas lisible par un client, alors que les autres portes répondent en français clair.

**TFILED-10 · D3 · les dates de délégation sont en minuit UTC, pas à l'heure du client** (socle, A5 ; remonté à Teo)
- Insertion validée, `debut 2026-10-22`, `fin 2026-10-29` → stocké `2026-10-22 00:00:00+00` / `2026-10-29 00:00:00+00`.
- Pour un client en Guadeloupe (UTC−4), la délégation commence le 21/10 à 20 h et s'éteint le **28/10 à 20 h**, heure locale. Le
  site dit qu'elle « s'éteint à la date prévue » (`capacites/factures.ts:177`).
- Ligne de délégation de test laissée sur le banc (22/10 → 29/10, motif « T-FILED D3 … »).

**TFILED-08 · ✅ CORRIGÉ par a4_73, revérifié le 21/10 à 20 h 29 Z** · confirmer un fournisseur ne relançait pas le contrôle de ses factures
- Constat d'origine (série 1b) : après `filed_confirmer_fournisseur` sur Béton Archipel, F2b gardait ses anciens contrôles. Il a fallu
  une relance manuelle par le coordinateur pour voir `iban.nouveau`.
- Revérification : en gérant, `select public.filed_confirmer_fournisseur('e5ee6419-edf8-4719-924a-cdaa6e31564f', 'T-FILED TFILED-08 :
  revérification après a4_73')` → `1`. Sans relance manuelle, F1 est recontrôlée à `2026-10-21 20:29:00.58Z`, avec
  `fournisseur.a_confirmer · ok · « Fournisseur connu. »`. Le déclencheur fonctionne.

**TFILED-11 · ✅ CORRIGÉ par a4_74, revérifié le 21/10 à 20 h 40 Z (contrôle relancé par le coordinateur) · F1 · une facture au SIREN à clé fausse arrive à la validation dès que le fournisseur est confirmé** (`capacites/factures.ts:58`)
- Après a4_74, les lignes brutes sont : `bloquant · identite.siren · « SIREN lu (912345629) : clé de contrôle fausse ; aucune entreprise ne peut porter ce numéro. Erreur de lecture ou fausse facture… »` ; `bloquant · identite.tva_intracom · « … bâti sur le SIREN 912345629, dont la clé de contrôle est fausse ; ce numéro ne peut pas exister… »` ; `bloquant · identite.registre · « Registre non interrogé : le SIREN lu (912345629) a une clé de contrôle fausse… une personne vérifie ce fournisseur avant tout paiement. »` ; `attention · tva.numero · ok · « Numéro de TVA présent sur la pièce (FR24912345629)… »`. Les trois défauts constatés sont corrigés (clé de Luhn, paradoxe du registre, message contradictoire). **Juste.** La suite est en TFILED-14.
- Constat d'origine :
- Déposé : `F1_siren_cle_fausse.pdf` (Quincaillerie du Moule, SIREN imprimé `912345629`, dont la clé de Luhn est fausse, ce que le
  coordinateur a vérifié ; TVA `FR24912345629` imprimée dans l'en-tête). Puis, en gérant,
  `filed_confirmer_fournisseur('e5ee6419-…', …)` → `1`.
- Réponse brute (relayée, contrôle du 20:29:00.58Z) : statut **`a_valider`** (il était `bloquee`) ;
  `attention · identite.siren · « SIREN lu (912345629) mais non vérifié par le lecteur : à confirmer sur la pièce. »` ;
  `attention · identite.tva_intracom · « Numéro de TVA lu (FR24912345629) mais non vérifié par le lecteur : à confirmer sur la pièce. »` ;
  `attention · tva.numero · « Numéro de TVA du fournisseur absent de la facture : mention obligatoire… »`. Aucun bloquant.
- Le site promet : « Le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement. » En pratique :
  1. **La clé de contrôle n'est pas vérifiée.** Aucun message ne dit que `912345629` est un SIREN impossible, ce que l'algorithme de
     Luhn tranche sans aucun tiers.
  2. **Effet paradoxal** : les SIREN fictifs *valides* (MCD, BAR) restent bloqués par `identite.registre` (VIES), alors que le SIREN
     *invalide* n'est pas soumis au registre (Q9) et passe. Une fausse facture au SIREN mal formé franchit donc plus facilement les
     contrôles qu'une facture au SIREN bien formé.
  3. **Message contradictoire** : `tva.numero` dit « absent de la facture » alors que `identite.tva_intracom` cite le numéro lu sur la pièce.
- Le verdict « juste » posé sur F1 en série 1 est **retiré** : l'arrêt ne tenait qu'à `fournisseur.a_confirmer`, et les contrôles
  `identite.*` n'étaient qu'en attention.
- F1 sera **rebloquée** après le correctif : le circuit joué sur elle (ci-dessous) ne se rejoue pas tel quel.

**TFILED-14 · ✅ CORRIGÉ par a4_75, revérifié le 21/10 à 20 h 56 Z** — contrôle relancé à 20:55:43Z (relayé) : F1 « bloquee », validation
caduque (« Bloquant(s) apparu(s) après la validation : identite.registre, identite.siren, identite.tva_intracom. »), alerte levée.
Lecture par mes portes (gérant, transaction annulée) : `filed_pieces_en_cours` → **`bloquees 15 / 11 432,00 €`** (= 10 585,70 + 846,30 :
F1 est de nouveau comptée) ; `filed_exporter_ecritures(…, 'sage')` → `0` écriture. **Juste.** Le cas d'une facture déjà réglée ou
comptabilisée (alerte critique, pas défaite) n'est **pas testable** sur le banc, faute de paiement et d'écriture. Constat d'origine :
**TFILED-14 · F1 · une facture déjà validée garde son statut quand un nouveau contrôle y trouve trois bloquants** (`capacites/factures.ts:108`,
« Aucune ne se règle en classant la pièce quand même » ; `:61` ; message du contrôle « une personne vérifie ce fournisseur avant tout paiement »)
- État de départ : F1 est **`validee`** depuis C1 et TFILED-13 (exécution à 20:32:00Z). Le coordinateur relance le contrôle à 20:40:37Z,
  après a4_74 : trois **bloquants** sont posés (`identite.siren`, `identite.tva_intracom`, `identite.registre`, cités en TFILED-11), et la
  fonction rend **« validee »**.
- Lecture par les portes (gérant, 20 h 42 Z, transaction annulée) : `filed_exporter_ecritures(…, 'sage')` → `lignes 0, ecritures 0` ;
  `filed_pieces_en_cours` → `bloquees 14 / 10 585,70 €` seulement, sans F1 et sans catégorie « validées » ; `filed_etat_comptabilisation`
  → `comptables []` ; `filed_etat_paiement` → `null`.
- Ce qui est tenu : F1 n'entre pas dans l'export comptable (`:283`), et rien n'est payable, puisqu'aucun paiement n'est branché sur le banc.
- Ce qui ne l'est pas : la facture reste « validee » avec trois bloquants. Elle **n'est comptée nulle part** parmi les pièces bloquées,
  donc personne ne la voit. Le message promet « une personne vérifie… avant tout paiement », mais aucun état ne le porte : ni retour en
  « bloquee », ni nouvelle demande. Sur un client dont le paiement est branché, rien de ce que je vois n'empêche le règlement.
- Attendu (contrat § 3 : le site ne dit pas explicitement ce que devient une pièce validée puis contredite) : soit la facture repasse
  « bloquee », soit elle est signalée, comptée et exclue du paiement. Je le classe **écart**, au niveau 1. Ce qu'il advient du paiement
  reste **pas testable sans tiers**, faute d'un réglage d'envoi sur le banc.

**TFILED-12 · F1 · le déposant approuve seul sa propre facture** (`capacites/factures.ts:74`, « Celui qui saisit et celui qui approuve
ne peuvent pas être la même personne » ; carte « Des rôles et des délégations », `:177`)
- Pièce déposée par le dépôt du **gérant** `eeeeeeee-…01f1` (le coordinateur confirme que le déposant est le gérant). Après TFILED-11,
  F1 est `a_valider`, avec la demande `7b4464be-1f83-4d6e-a3d5-eadce0d95126` (`filed.valider_facture`, 1 approbation requise).
- En gérant, transaction validée (20 h 31 Z) : `insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values ('7b4464be-…', 'dddddddd-0000-4000-8000-0000000000f1', auth.uid(), 'approuve', 'T-FILED C1 : …') returning …` → accepté,
  `{decision: "approuve", user_id: "eeeeeeee-…01f1"}`.
- Résultat (Q18, relayé) : la demande est **« approuvee »** (`decide_le 20:31:12Z`) sur la seule approbation du déposant
  (`au_nom_de null`, `delegation null`), sans refus ni message. La promesse n'est pas tenue.
- **Faits relevés par le coordinateur** (20 h 52 Z) : la règle existe dans le socle (« Celui qui a saisi la pièce ne l'approuve pas : une
  autre personne décide. »), et elle lit `payload.saisi_par` de la demande. Pour F1, venue par le dépôt par lot, on a `depose_par = null`
  et la source « connecteur », et la demande `7b4464be` porte `saisi_par = []`. Le contrôle n'avait personne à exclure. Le contrôle
  n'est donc pas en défaut : une pièce venue du dépôt **n'a pas de saisisseur**, et l'ouvreur du dépôt n'est pas tracé comme
  déposant. **TFILED-12 reste un écart, à décision de Teo.**
- Réserve, à trancher par Teo : « déposer » vaut-il « saisir » ? Pour une pièce lue par le moteur, le déposant est la seule personne
  qui l'a fait entrer. Si ce n'est pas lui que vise `:74`, alors `:74` ne vise personne dans FILED.

**TFILED-13 · ✅ CLOS, juste · F1 · une décision approuvée n'est pas appliquée à la facture** : l'exécution est différée d'environ 1 minute. La demande passe « executee » à 20:32:00Z (`motif_echec null`), par la tâche de fond qui tourne chaque minute, et F1 devient **`validee`**. Ma lecture avait eu lieu juste avant ce passage. Constat d'origine :
- Après TFILED-12 : `execute_le null`, `motif_echec null`, et la facture reste **`a_valider`**. La porte `filed_pieces_en_cours` la
  montre toujours « En attente d'approbation » (1 pièce, 846,30 €). Le coordinateur regarde si l'exécution est différée ou en panne.
  Verdict suspendu.

### Série 1b — 21/10, 20 h 40 (portes d'écriture, en gérant `eeeeeeee-…01f1`, client banc seulement)

1. `select public.filed_lever_anomalie('a46345d2-c631-4af3-b713-4bd52b70541e', 'identite.registre', 'T-FILED 1b : …')` (facture F0)
   → refus : `ERROR 22023: Cette anomalie ne se lève pas d'un motif : elle se corrige, ou se décide par la file.` La transaction est
   annulée, rien n'est écrit. Le refus est juste et dit pourquoi. Conséquence : le témoin F0 ne peut atteindre la validation « sans
   arrêt » qu'avec un SIREN que VIES reconnaît, ou par une décision de la file, à l'écran, que je n'ai pas. Le cas F0 « sans
   arrêt » reste **pas testable sans tiers** (écran ou SIREN réel, refusé en Q11).
2. `filed_confirmer_fournisseur('dc84c929-…' /* Béton Archipel */, 'T-FILED 1b : …')` → `2`. Puis
   `filed_confirmer_fournisseur('538937d9-…' /* MCD */, 'T-FILED 1b : …')` → `11`. Lecture de l'agrégat juste après :
   `bloquees 14, 10813.55` (inchangé : le registre bloque encore toutes les pièces).
3. Redéposer F2b n'aurait servi à rien (mêmes octets, donc doublon de fichier). Le coordinateur a plutôt relancé le contrôle sur la facture F2b → `iban.nouveau` bloquant. TFILED-02 est requalifié juste, avec réserve (voir Écarts).
4. Témoin F0 « sans arrêt » : **pas testable sans tiers**, le coordinateur est d'accord.

### Série 2 — préparation (21/10, 21 h)

Feu vert du coordinateur (Q13) : banc seulement, mode essai, aucun envoi réel possible. Les portes de la série 2 :
`filed_regler_circuit` (en gérant) ; insertion dans `approbations` (sous le valideur) ; insertion dans `delegations` (sous le
gérant) ; `filed_exporter_ecritures`, `filed_exporter_tableau`, `filed_exporter_fec`. Réserve 2 de TFILED-02 : l'IBAN `…0309` est
seulement « proposé », jamais tenu pour bon (vérifié par le coordinateur). La réserve 1 devient **TFILED-08** (A4).

- **F2c** (`pieces/F2c_iban_propose_non_valide.pdf`) : Béton Archipel, BAR-2026-0503 du 20/10/2026, 6 m³ × 95,00 = HT 570,00,
  TVA 8,5 % 48,45, TTC 618,45, IBAN `…0309`. Attendu (`:57`) : `iban.nouveau` encore posé (l'IBAN n'a pas été décidé), pas de
  doublon probable (montant différent). À déposer par le coordinateur.
- **E1, essais d'export** (gérant, `filed_exporter_ecritures`) :
  - `p_format 'csv'` → `ERROR 22023: Format inconnu : pennylane, sage, cegid ou quickbooks.`, refus lisible. Le brief parlait d'un
    « export CSV » ; le site promet seulement « le format qu'elle utilise déjà » (`factures.ts:275`). Ce n'est donc pas un écart.
  - `p_format 'sage'` et `'pennylane'`, avec `p_entite null` → `ERROR 22023: Société introuvable dans cette organisation.` Contrairement
    au dépôt, `null` ne vaut pas ici « entité principale » (Q14).
- Attendu de l'export, avant de le jouer : **aucune** des 15 pièces bloquées ni la pièce écartée ne doit y figurer (`factures.ts:283`,
  « Rien n'entre en silence dans votre comptabilité »).
- **E2** (21/10, 21 h 05, gérant, entité `fba91a52-9d22-445e-ba6b-0590b3c205be`) : `filed_exporter_ecritures(client, entité, 'sage')`
  et `'pennylane'` → `{mode: "nouvelles", lignes: 0, ecritures: 0, fichiers: [], total_debit: 0, total_credit: 0, envoi: null}` pour
  les deux formats. **Juste** (`factures.ts:283`) : aucune pièce bloquée ni écartée n'entre dans l'export. Niveau 1.
- **E3** `filed_exporter_fec(client, entité)` → `ERROR 55000: La société n'a pas de SIREN : le fichier des écritures comptables est
  nommé d'après lui.` Le refus est juste et lisible (le nom légal du FEC porte le SIREN). Le FEC n'est **pas testable** sur ce banc
  sans SIREN, ni sans écriture à exporter.
- **Circuit de validation des factures** (`capacites/factures.ts:69-74`) : **pas testable sans tiers**, confirmé par le
  coordinateur (Q14 c). Aucune demande d'approbation de facture n'existe, puisque toutes les factures sont arrêtées avant le circuit
  par le registre (VIES). Restent testables : la décision sur l'IBAN `…0309` (demande `f363b16f-…`, `filed.valider_iban`) et la
  validation fournisseur (`7fb25997-…`). Je les joue **après** la lecture de F2c, pour ne pas fausser son contrôle IBAN.
- Plan V1 (après F2c) : (1) le gérant tente d'approuver `f363b16f` ; attendu `:74`, refus si c'est lui qui a saisi (le dépôt est fait
  en gérant). (2) Le valideur **rejette** `f363b16f` avec le commentaire « IBAN non confirmé par appel au fournisseur » ; attendu
  `:73`, le commentaire et le motif restent attachés, et l'IBAN `…0309` n'est pas tenu pour bon. Je préfère un rejet à une approbation,
  qui rendrait l'IBAN « valide » (avertissement du coordinateur).
- **F2c** (déposée à 20 h 19 Z, ligne relayée) : `integre · facture · BAR-2026-0503 · TTC 618,45 · bloquee` ; `bloquant · iban.nouveau · « Nouvel
  IBAN (FR76 •••• 0309) pour ce fournisseur : une personne le vérifie auprès de lui avant tout paiement. »` ; `doublon.probable · ok` ;
  `identite.registre` bloquant (VIES). **Juste** (`:57`) : un IBAN seulement « proposé » n'est pas tenu pour connu. La réserve 2 de
  TFILED-02 est levée. Niveau 1.
- **V1a** (21/10, 21 h 20) : en **gérant** `…01f1`, `insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values ('f363b16f-…', client, auth.uid(), 'approuve', 'T-FILED V1 : tentative du gérant (annulée)') returning …` → **accepté** :
  `{decision: "approuve", user_id: "eeeeeeee-…01f1"}`. Transaction **annulée** (`rollback`), donc rien n'est décidé. Limite : un
  contrôle différé au `commit` ne se voit pas ainsi. Verdict sur `:74` en attente (Q15). Si le gérant est celui qui a « saisi » la
  demande (le dépôt est fait sous son identité), c'est un **écart** : le socle laisse la même personne saisir et approuver.
- **V1b** (21/10, 21 h 21) : en **valideur** `…02f1`, même insert avec `decision 'rejete'` et le commentaire « T-FILED V1 : IBAN …0309 non
  confirmé par appel au fournisseur (banc, données fictives) » → accepté et **validé (`commit`)** : `{decision: "rejete", user_id:
  "eeeeeeee-…02f1", commentaire: "…"}`. Effets à relire (Q15) : statut de la demande, état de l'IBAN `…0309`, et si les anomalies
  `iban.nouveau` de F2b et F2c restent ouvertes, le motif de refus attaché aux factures (`:73`).
- **Qualification de V1** (Q15, relayé par le coordinateur, 20 h 21 Z) :
  - Demande `f363b16f` : `demandeur_type = systeme`, `demandeur_id null`, `roles_autorises = gerant, admin, valideur`,
    `exige_commentaire = false`. L'IBAN a été proposé par le moteur, personne ne l'a saisi. **V1a : `:74` pas testable sur cette
    demande** (pas de saisie humaine). **Observation** pour Teo : le gérant, déposant de F2c, peut approuver l'IBAN tiré de sa propre
    pièce. Reste à trancher si « déposer » vaut « saisir » au sens de `:74`.
  - **V1b : juste.** La demande est « rejetee » (20:20:40Z), avec une seule approbation, celle du valideur, commentaire compris. L'IBAN
    `…0309` est « refuse », avec mon commentaire pour motif ; `…0340` reste « valide ». Les factures sont **recontrôlées d'elles-mêmes**
    (20:21:00Z) : F2b et F2c passent de `iban.nouveau` à `iban.refuse` (« IBAN déjà refusé pour ce fournisseur (FR76 •••• 0309) : ne pas
    payer, alerter. »), et F2a affiche `iban.nouveau ok` (« IBAN connu et validé »). Toutes restent bloquées. Le contraste avec
    TFILED-08 est noté : la décision sur l'IBAN relance le contrôle, la confirmation du fournisseur ne le relance pas.
  - **Observation `:73`** : le commentaire du valideur est attaché à l'IBAN, pas aux factures. Les factures ne montrent que le message
    du contrôle. `:73` vise le circuit des factures, qui n'est pas testable ici : je le garde en observation, sans en faire un écart.
- **D1 à D3, délégation datée** (`:71`), préparés : en gérant, insertion dans `delegations` (gérant → valideur, module `filed`, entité
  principale). D1 sans date de fin et D2 avec une fin antérieure au début, tous deux attendus refusés, joués en transaction annulée.
  D3, du 22/10 au 29/10 avec un motif, attendu accepté. **Non joués** : à 21 h 25, la recette rend deux fois `Connection terminated
  due to connection timeout` (redémarrage ? cf. constat du 19/10). Je n'insiste pas.
  Cause, selon le coordinateur : il avait lancé la suite CASHD complète, qui a fait redémarrer la recette à 20 h 22 Z. Elle répond de
  nouveau depuis 20 h 23 Z.
- **D1 rejoué** (21/10, 20 h 24 Z, gérant, transaction annulée) : `insert into public.delegations (…) values (auth.uid(), 'eeeeeeee-…02f1',
  'fba91a52-…', 'filed', '2026-10-22', null, '…')` → `ERROR 42501: On ne délègue qu'à un membre de l'organisation : cette personne n'en fait
  pas partie.` Le refus arrive **avant** le contrôle de la date de fin. Le valideur du banc n'est pas « membre de l'organisation », alors
  qu'il peut décider une demande (V1b). C'est soit un trou dans le montage du banc, soit une incohérence du socle : Q16. Tant que le
  banc n'a pas un second membre, D1 à D3 ne sont **pas testables**.
- **Q16 réglée** : mon insert omettait `client_id`, l'erreur venait de moi et pas du banc. Rejoué avec `client_id = 'dddddddd-…00f1'`
  (gérant → valideur, entité `fba91a52-…`, module `filed`) :
  - **D1**, sans date de fin, transaction annulée → `ERROR 23502: null value in column "fin" of relation "delegations" violates not-null
    constraint`. **Juste** (`:71`) : pas de délégation sans fin. Observation : le message est brut, c'est une contrainte et non un texte
    destiné au client → **TFILED-09**.
  - **D2**, fin (22/10) antérieure au début (29/10), transaction annulée → `ERROR 23514: … violates check constraint "delegations_periode"`.
    **Juste**, avec la même observation sur le message.
  - **D3**, du 22/10 au 29/10, motif « T-FILED D3 : absence fictive du gérant, banc », validée (`commit`) → `{debut: "2026-10-22
    00:00:00+00", fin: "2026-10-29 00:00:00+00", motif: "…"}`. **Juste** pour la pose. **Observation** : les dates sont stockées en
    minuit **UTC**. Pour un client en Guadeloupe (UTC−4), une délégation « jusqu'au 29/10 » s'éteint le 28/10 à 20 h, heure locale, et elle
    commence le 21/10 à 20 h (`:177` « s'éteint à la date prévue »). L'extinction réelle et l'usage de la délégation, c'est-à-dire une
    approbation par le délégataire, ne sont **pas testables** (fuseau → **TFILED-10**) : il faudrait attendre la date et avoir une facture dans le circuit.
- Pour info : A4 a livré TFILED-08 (a4_73), mais le correctif n'est **pas encore posé** sur la recette. À revérifier quand il le sera.

### Circuit de validation sur F1 (Q17 : feu vert, banc seulement, rien n'est branché vers l'extérieur)
- **C0** (20 h 31 Z, gérant) : `filed_regler_circuit('dddddddd-…00f1', 'fba91a52-…', null, 500, null, 2, '{gerant,valideur}')` →
  `81295f9e-87fa-4e00-ab6d-ab60b41b380a`.
- Demande de F1 (relayée) : `7b4464be-…`, `en_attente`, **`approbations_requises = 1`**, 846,30 €, `regle_id null`, créée à 20:29:00Z,
  donc **avant** C0. Le nouveau seuil n'est pas reporté sur une demande ouverte. **Observation** (`:70`) : le site ne dit pas si un
  seuil s'applique aux demandes en cours. Le seuil de double approbation n'est **pas testable** sur le banc : il faudrait une demande
  neuve, et aucune facture n'entre dans le circuit à cause du registre.
- **C1** (gérant = déposant) : approbation acceptée, demande approuvée → **TFILED-12** ; exécution différée d'environ 1 min, puis F1 `validee` à 20:32:00Z → TFILED-13 clos, juste.
- **C2** (valideur) : impossible, puisque la demande est close après C1.

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

**Réponses du coordinateur (21/10, 20 h 12)** : Q9, la gravité par pièce est reportée dans le tableau et dans TFILED-07. Q10, la
ventilation de F8 est exacte, l'avoir F6 est enregistré en positif. Q11, **non** au SIREN d'une société réelle ; on lève les arrêts
par les portes `public.filed_confirmer_fournisseur(uuid, text)` et `public.filed_lever_anomalie(uuid, text, text)`, en gérant.

- **Q12** — Pour la série 1b : l'uuid du fournisseur Béton Archipel et celui de Matériaux Caraïbes Distribution, l'uuid de la
  pièce F0 (ou de sa facture), et le sens des paramètres `text` des deux portes (motif ? code d'anomalie ?). Aucune porte de
  lecture qu'on m'a donnée ne rend ces uuid.
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

**Arrêt 14 — 21/10/2026, 20 h 57 Z**
- Fait : séries 1, 1b et 2, au niveau 1. Corrigés et revérifiés : TFILED-03, 04, 08, 11 et 14. Clos justes : TFILED-02 et 13. Écart ouvert : **TFILED-12** (à décision de Teo : l'ouvreur du dépôt compte-t-il comme saisisseur ?). Remontés à Teo : TFILED-05, 06, 07, 09 et 10. Pas testable : F0 « sans arrêt », le FEC, le seuil de double approbation, l'usage réel d'une délégation, le paiement, une facture comptabilisée puis contredite.
- En cours : rien.
- Prochain pas : aucun sur ce banc. Une nouvelle série demande un SIREN connu de VIES, l'écran, ou le niveau 2 (relecture des pièces NOBAT de l'ouvrier, sur instruction du coordinateur).
- Questions : à Teo, TFILED-12 et TFILED-05, 06, 07, 09, 10 (via le coordinateur).
- SHA d'arrêt : voir le commit « T-FILED : TFILED-14 corrigé, arrêt 14 » sur `testeur-filed`.
